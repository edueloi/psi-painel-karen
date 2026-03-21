const express = require('express');
const router = express.Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');

const multer = require('multer');
const ExcelJS = require('exceljs');
const xlsx = require('xlsx');

const memoryUpload = multer({ storage: multer.memoryStorage() });

// GET /packages
router.get('/', async (req, res) => {
  try {
    const [packages] = await db.query(
      'SELECT * FROM packages WHERE tenant_id = ? ORDER BY name',
      [req.user.tenant_id]
    );
    
    // Para cada pacote, buscar seus itens
    const fullPackages = await Promise.all(packages.map(async (pkg) => {
      const [items] = await db.query(
        'SELECT service_id as serviceId, quantity FROM package_items WHERE package_id = ?',
        [pkg.id]
      );
      return { ...pkg, items };
    }));

    res.json(fullPackages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pacotes' });
  }
});

// GET /packages/export-template
router.get('/export-template', async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Dados para Importar');
  
  worksheet.columns = [
    { header: 'Nome do Pacote', key: 'name', width: 30 },
    { header: 'Descrição', key: 'description', width: 40 },
    { header: 'Tipo Desconto (percentage/fixed)', key: 'discountType', width: 30 },
    { header: 'Valor Desconto', key: 'discountValue', width: 15 },
    { header: 'Serviços (Nome:Qtd; Nome:Qtd)', key: 'items', width: 60 }
  ];

  // Estilo do cabeçalho
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
    cell.alignment = { horizontal: 'center' };
  });

  worksheet.addRow({
    name: 'Combo Terapia Mensal',
    description: '4 sessões de terapia individual com desconto',
    discountType: 'percentage',
    discountValue: 10,
    items: 'Psicoterapia Individual:4'
  });

  worksheet.autoFilter = 'A1:E1';

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=modelo_importacao_pacotes.xlsx');
  await workbook.xlsx.write(res);
  res.end();
});

// GET /packages/export
router.get('/export', async (req, res) => {
  try {
    const [packages] = await db.query('SELECT * FROM packages WHERE tenant_id = ? ORDER BY name', [req.user.tenant_id]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pacotes');

    worksheet.columns = [
      { header: 'Nome', key: 'name', width: 30 },
      { header: 'Descrição', key: 'description', width: 40 },
      { header: 'Tipo Desconto', key: 'discountType', width: 20 },
      { header: 'Valor Desconto', key: 'discountValue', width: 15 },
      { header: 'Preço Total', key: 'totalPrice', width: 15 },
      { header: 'Serviços Incluídos', key: 'items', width: 60 }
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
    });

    for (const pkg of packages) {
      const [items] = await db.query(
        'SELECT s.name, pi.quantity FROM package_items pi JOIN services s ON s.id = pi.service_id WHERE pi.package_id = ?',
        [pkg.id]
      );
      const itemsStr = items.map(i => `${i.name}:${i.quantity}`).join('; ');

      worksheet.addRow({
        name: pkg.name,
        description: pkg.description,
        discountType: pkg.discountType,
        discountValue: pkg.discountValue,
        totalPrice: pkg.totalPrice,
        items: itemsStr
      });
    }

    worksheet.autoFilter = 'A1:F1';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=pacotes_exportados.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao exportar pacotes' });
  }
});

// POST /packages/import
router.post('/import', memoryUpload.single('file'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    const imported = [];
    const errors = [];

    const findValue = (row, ...names) => {
        const rowKeys = Object.keys(row);
        for (const name of names) {
            const normalizedName = name.toLowerCase().trim();
            const key = rowKeys.find(k => k.toLowerCase().trim() === normalizedName);
            if (key && row[key] !== undefined && row[key] !== '') return row[key];
        }
        return null;
    };

    await connection.beginTransaction();

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = findValue(row, 'Nome', 'Pacote', 'Nome do Pacote');
        
        if (!name || String(name).toLowerCase().includes('exemplo')) continue;

        try {
            const description = findValue(row, 'Descrição', 'Obs');
            const discountType = findValue(row, 'Tipo Desconto', 'Tipo') || 'percentage';
            const discountValue = parseFloat(findValue(row, 'Valor Desconto', 'Desconto')) || 0;
            const itemsStr = findValue(row, 'Serviços', 'Itens') || '';

            // Inserir pacote
            const [pkgResult] = await connection.query(
                'INSERT INTO packages (tenant_id, name, description, discountType, discountValue, totalPrice) VALUES (?, ?, ?, ?, ?, ?)',
                [req.user.tenant_id, name, description, discountType, discountValue, 0]
            );
            const packageId = pkgResult.insertId;

            let subtotal = 0;
            const serviceItems = itemsStr.split(';').map(s => s.trim()).filter(Boolean);
            
            for (const item of serviceItems) {
                const [sName, sQty] = item.split(':').map(val => val.trim());
                const qty = parseInt(sQty) || 1;
                
                // Buscar serviço por nome
                const [services] = await connection.query(
                    'SELECT id, price FROM services WHERE name = ? AND tenant_id = ?',
                    [sName, req.user.tenant_id]
                );

                if (services.length > 0) {
                    const service = services[0];
                    await connection.query(
                        'INSERT INTO package_items (package_id, service_id, quantity) VALUES (?, ?, ?)',
                        [packageId, service.id, qty]
                    );
                    subtotal += service.price * qty;
                }
            }

            // Recalcular preço total
            let totalPrice = subtotal;
            if (discountType === 'percentage') {
                totalPrice = subtotal - (subtotal * (discountValue / 100));
            } else {
                totalPrice = subtotal - discountValue;
            }
            totalPrice = Math.max(0, totalPrice);

            await connection.query('UPDATE packages SET totalPrice = ? WHERE id = ?', [totalPrice, packageId]);

            imported.push({ id: packageId, name });
        } catch (e) {
            errors.push(`Linha ${i + 2}: ${e.message}`);
        }
    }

    await connection.commit();

    res.json({
        message: `${imported.length} pacotes importados com sucesso`,
        importedLength: imported.length,
        errors
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Erro ao importar pacotes' });
  } finally {
    connection.release();
  }
});

// POST /packages
router.post('/', authorize('admin', 'super_admin'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { name, description, discountType, discountValue, totalPrice, items } = req.body;

    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    // Calcular sessões totais
    const sessions_count = items && items.length > 0 
      ? items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)
      : 0;

    // Calcular preço original (base) se não vier
    // Neste contexto, o totalPrice que vem do frontend já é o final.
    // O price original seria o somatório dos serviços.
    const originalPrice = totalPrice || 0; 

    const [result] = await connection.query(
      'INSERT INTO packages (tenant_id, name, description, discountType, discountValue, totalPrice, price, sessions_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.tenant_id, name, description || null, discountType || 'percentage', discountValue || 0, totalPrice || 0, originalPrice, sessions_count]
    );

    const packageId = result.insertId;

    if (items && items.length > 0) {
      for (const item of items) {
        await connection.query(
          'INSERT INTO package_items (package_id, service_id, quantity) VALUES (?, ?, ?)',
          [packageId, item.serviceId, item.quantity]
        );
      }
    }

    await connection.commit();

    const [newPkg] = await db.query('SELECT * FROM packages WHERE id = ?', [packageId]);
    res.status(201).json({ ...newPkg[0], items: items || [] });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar pacote' });
  } finally {
    connection.release();
  }
});

// PUT /packages/:id
router.put('/:id', authorize('admin', 'super_admin'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { name, description, discountType, discountValue, totalPrice, items, active } = req.body;

    // Calcular sessões totais se houver items no corpo
    const sessions_count = items && items.length > 0
      ? items.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0)
      : null;

    const safeDiscountType = (discountType === 'percentage' || discountType === 'fixed') ? discountType : undefined;
    const safeDiscountValue = discountValue !== undefined ? parseFloat(discountValue) || 0 : undefined;
    const safeTotalPrice = totalPrice !== undefined ? parseFloat(totalPrice) || 0 : undefined;

    await connection.query(
      `UPDATE packages SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        discountType = COALESCE(?, discountType),
        discountValue = COALESCE(?, discountValue),
        totalPrice = COALESCE(?, totalPrice),
        sessions_count = COALESCE(?, sessions_count)
       WHERE id = ? AND tenant_id = ?`,
      [name || null, description !== undefined ? description : null, safeDiscountType || null, safeDiscountValue !== undefined ? safeDiscountValue : null, safeTotalPrice !== undefined ? safeTotalPrice : null, sessions_count, req.params.id, req.user.tenant_id]
    );

    // Atualizar price (coluna legada, pode não existir em todos os ambientes)
    try {
      await connection.query(
        'UPDATE packages SET price = ? WHERE id = ? AND tenant_id = ?',
        [safeTotalPrice !== undefined ? safeTotalPrice : null, req.params.id, req.user.tenant_id]
      );
    } catch (_) { /* ignora se a coluna price não existir */ }

    if (items && Array.isArray(items)) {
      // Remover itens antigos e inserir novos (só itens com serviceId válido)
      await connection.query('DELETE FROM package_items WHERE package_id = ?', [req.params.id]);
      for (const item of items) {
        const sid = item.serviceId || item.service_id;
        if (!sid) continue; // ignora itens sem serviço vinculado
        await connection.query(
          'INSERT INTO package_items (package_id, service_id, quantity) VALUES (?, ?, ?)',
          [req.params.id, sid, parseInt(item.quantity) || 1]
        );
      }
    }

    await connection.commit();

    const [updated] = await db.query('SELECT * FROM packages WHERE id = ?', [req.params.id]);
    res.json({ ...updated[0], items: items || [] });
  } catch (err) {
    await connection.rollback();
    console.error('PUT /packages error:', err.sqlMessage || err.message, err);
    res.status(500).json({ error: 'Erro ao atualizar pacote', detail: err.sqlMessage || err.message });
  } finally {
    connection.release();
  }
});

// DELETE /packages/:id
router.delete('/:id', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM packages WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Pacote não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar pacote' });
  }
});

module.exports = router;
