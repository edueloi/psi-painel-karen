const express = require('express');
const router = express.Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');

const multer = require('multer');
const ExcelJS = require('exceljs');
const xlsx = require('xlsx');

const memoryUpload = multer({ storage: multer.memoryStorage() });

// GET /services
router.get('/', async (req, res) => {
  try {
    const [services] = await db.query(
      'SELECT * FROM services WHERE tenant_id = ? ORDER BY name',
      [req.user.tenant_id]
    );
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar serviços' });
  }
});

// GET /services/export-template
router.get('/export-template', async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Dados para Importar');
  
  worksheet.columns = [
    { header: 'Nome', key: 'name', width: 30 },
    { header: 'Categoria', key: 'category', width: 20 },
    { header: 'Preço/Valor', key: 'price', width: 15 },
    { header: 'Duração (min)', key: 'duration', width: 15 },
    { header: 'Custo Profissional', key: 'cost', width: 20 },
    { header: 'Modalidade', key: 'modality', width: 15 },
    { header: 'Descrição', key: 'description', width: 40 }
  ];

  // Estilo do cabeçalho
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.alignment = { horizontal: 'center' };
  });

  worksheet.addRow({
    name: 'Psicoterapia Individual',
    category: 'Geral',
    price: 150.00,
    duration: 50,
    cost: 50.00,
    modality: 'presencial',
    description: 'Sessão de terapia individual presencial'
  });

  worksheet.autoFilter = 'A1:G1';

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=modelo_importacao_servicos.xlsx');
  await workbook.xlsx.write(res);
  res.end();
});

// GET /services/export
router.get('/export', async (req, res) => {
  try {
    const [services] = await db.query('SELECT * FROM services WHERE tenant_id = ? ORDER BY name', [req.user.tenant_id]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Serviços');

    worksheet.columns = [
      { header: 'Nome', key: 'name', width: 30 },
      { header: 'Categoria', key: 'category', width: 20 },
      { header: 'Preço/Valor', key: 'price', width: 15 },
      { header: 'Duração (min)', key: 'duration', width: 15 },
      { header: 'Custo Profissional', key: 'cost', width: 20 },
      { header: 'Modalidade', key: 'modality', width: 15 },
      { header: 'Descrição', key: 'description', width: 40 },
      { header: 'Ativo', key: 'active', width: 10 }
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    });

    services.forEach(s => {
      worksheet.addRow({
        name: s.name,
        category: s.category,
        price: s.price,
        duration: s.duration,
        cost: s.cost,
        modality: s.modality,
        description: s.description,
        active: s.active ? 'Sim' : 'Não'
      });
    });

    worksheet.autoFilter = 'A1:H1';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=servicos_exportados.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao exportar serviços' });
  }
});

// POST /services/import
router.post('/import', memoryUpload.single('file'), async (req, res) => {
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

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = findValue(row, 'Nome', 'Serviço', 'Atendimento');
        
        if (!name || String(name).toLowerCase().includes('exemplo')) continue;

        try {
            const [result] = await db.query(
                `INSERT INTO services (
                    tenant_id, name, category, price, duration, cost, modality, description
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    req.user.tenant_id,
                    name,
                    findValue(row, 'Categoria', 'Grupo') || 'Geral',
                    parseFloat(findValue(row, 'Preço', 'Valor', 'Preço/Valor')) || 0,
                    parseInt(findValue(row, 'Duração', 'Minutos')) || 50,
                    parseFloat(findValue(row, 'Custo', 'Custo Profissional')) || 0,
                    findValue(row, 'Modalidade', 'Tipo') || 'presencial',
                    findValue(row, 'Descrição', 'Obs', 'Observação')
                ]
            );
            imported.push({ id: result.insertId, name });
        } catch (e) {
            errors.push(`Linha ${i + 2}: ${e.message}`);
        }
    }

    res.json({
        message: `${imported.length} serviços importados com sucesso`,
        importedLength: imported.length,
        errors
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao importar serviços' });
  }
});

// GET /services/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM services WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Serviço não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar serviço' });
  }
});

// POST /services
router.post('/', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { name, description, price, duration, category, cost, color, modality } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const [result] = await db.query(
      'INSERT INTO services (tenant_id, name, description, price, duration, category, cost, color, modality) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.tenant_id, name, description || null, price || 0, duration || 60, category || 'Geral', cost || 0, color || '#6366f1', modality || 'presencial']
    );

    const [service] = await db.query('SELECT * FROM services WHERE id = ?', [result.insertId]);
    res.status(201).json(service[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar serviço' });
  }
});

// GET /services/:id/history
router.get('/:id/history', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM service_history WHERE tenant_id = ? AND entity_type = "service" AND entity_id = ? ORDER BY created_at DESC LIMIT 100',
      [req.user.tenant_id, req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// PUT /services/:id
router.put('/:id', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { name, description, price, duration, category, cost, color, modality, active } = req.body;

    // Fetch current before update
    const [current] = await db.query('SELECT * FROM services WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    const old = current[0];

    await db.query(
      `UPDATE services SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        duration = COALESCE(?, duration),
        category = COALESCE(?, category),
        cost = COALESCE(?, cost),
        color = COALESCE(?, color),
        modality = COALESCE(?, modality),
        active = COALESCE(?, active)
       WHERE id = ? AND tenant_id = ?`,
      [name, description, price, duration, category, cost, color, modality, active !== undefined ? active : undefined, req.params.id, req.user.tenant_id]
    );

    const [updated] = await db.query('SELECT * FROM services WHERE id = ?', [req.params.id]);

    // Record history for changed fields
    const fieldsToTrack = [
      { field: 'name', label: 'name' },
      { field: 'price', label: 'price', numeric: true },
      { field: 'cost', label: 'cost', numeric: true },
    ];
    try {
      for (const { field, numeric } of fieldsToTrack) {
        const newVal = req.body[field];
        if (newVal === undefined || newVal === null) continue;
        const oldVal = old?.[field];
        const oldStr = oldVal !== undefined && oldVal !== null ? String(oldVal) : null;
        const newStr = String(newVal);
        if (oldStr === newStr) continue; // no change
        let changePct = null;
        if (numeric) {
          const o = parseFloat(oldVal) || 0;
          const n = parseFloat(newVal) || 0;
          changePct = o > 0 ? ((n - o) / o) * 100 : null;
        }
        await db.query(
          'INSERT INTO service_history (tenant_id, entity_type, entity_id, changed_by_id, changed_by_name, field, old_value, new_value, change_pct) VALUES (?, "service", ?, ?, ?, ?, ?, ?, ?)',
          [req.user.tenant_id, req.params.id, req.user.id, req.user.name || req.user.email, field, oldStr, newStr, changePct]
        );
      }
    } catch (histErr) { console.error('History insert error:', histErr.message); }

    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
});

// DELETE /services/:id
router.delete('/:id', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM services WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Serviço não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar serviço' });
  }
});

module.exports = router;
