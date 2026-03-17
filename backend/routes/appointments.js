const express = require('express');
const router = express.Router();
const multer = require('multer');
const ExcelJS = require('exceljs');
const xlsx = require('xlsx');
const db = require('../db');

const memoryUpload = multer({ storage: multer.memoryStorage() });

// GET /appointments/export-template
router.get('/export-template', async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Dados para Importar');
  
  worksheet.columns = [
    { header: 'Título', key: 'title', width: 25 },
    { header: 'ID Paciente', key: 'patient_id', width: 15 },
    { header: 'ID Profissional', key: 'professional_id', width: 15 },
    { header: 'ID Serviço', key: 'service_id', width: 15 },
    { header: 'Data Início', key: 'start_time', width: 25 },
    { header: 'Duração (min)', key: 'duration_minutes', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Modalidade', key: 'modality', width: 15 },
    { header: 'Observações', key: 'notes', width: 40 }
  ];

  // Estilo do cabeçalho
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  worksheet.addRow({
    title: 'Sessão de Psicoterapia',
    patient_id: 1,
    professional_id: 1,
    service_id: 1,
    start_time: '2024-05-20 14:00',
    duration_minutes: 50,
    status: 'scheduled',
    modality: 'presencial',
    notes: 'Primeira sessão do paciente'
  });

  worksheet.autoFilter = 'A1:I1';

  // Sheet de Instruções
  const wsInst = workbook.addWorksheet('Instruções');
  wsInst.columns = [
    { header: 'Coluna', key: 'col', width: 25 },
    { header: 'Obrigatório', key: 'req', width: 15 },
    { header: 'Formato / Descrição', key: 'desc', width: 60 }
  ];

  wsInst.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
  });

  wsInst.addRows([
    ['Título', 'Não', 'Ex: Sessão de TCC / Consulta'],
    ['ID Paciente', 'Não', 'Pegue o ID na aba "Lista de Pacientes"'],
    ['ID Profissional', 'Não', 'Pegue o ID na aba "Lista de Profissionais"'],
    ['ID Serviço', 'Não', 'Pegue o ID na aba "Lista de Serviços"'],
    ['Data Início', 'Sim', 'AAAA-MM-DD HH:MM (Ex: 2024-05-20 14:30)'],
    ['Duração (min)', 'Não', 'Padrão: 50'],
    ['Status', 'Não', 'scheduled, confirmed, completed, cancelled, no-show'],
    ['Modalidade', 'Não', 'presencial ou online'],
    ['Observações', 'Não', 'Qualquer informação relevante']
  ]);

  // Adicionar abas de referência para facilitar o preenchimento dos IDs
  try {
    const tenantId = req.user.tenant_id;
    
    // Lista de Pacientes
    const [pts] = await db.query('SELECT id, name FROM patients WHERE tenant_id = ? ORDER BY name', [tenantId]);
    const wsPts = workbook.addWorksheet('Lista de Pacientes');
    wsPts.columns = [{ header: 'ID', key: 'id', width: 10 }, { header: 'Nome', key: 'name', width: 40 }];
    wsPts.getRow(1).font = { bold: true };
    pts.forEach(p => wsPts.addRow(p));

    // Lista de Profissionais
    const [pros] = await db.query('SELECT id, name FROM users WHERE tenant_id = ? AND role != "secretario" ORDER BY name', [tenantId]);
    const wsPros = workbook.addWorksheet('Lista de Profissionais');
    wsPros.columns = [{ header: 'ID', key: 'id', width: 10 }, { header: 'Nome', key: 'name', width: 40 }];
    wsPros.getRow(1).font = { bold: true };
    pros.forEach(p => wsPros.addRow(p));

    // Lista de Serviços
    const [srvs] = await db.query('SELECT id, name FROM services WHERE tenant_id = ? ORDER BY name', [tenantId]);
    const wsSrvs = workbook.addWorksheet('Lista de Serviços');
    wsSrvs.columns = [{ header: 'ID', key: 'id', width: 10 }, { header: 'Nome', key: 'name', width: 40 }];
    wsSrvs.getRow(1).font = { bold: true };
    srvs.forEach(s => wsSrvs.addRow(s));

  } catch (err) {
    console.warn('Erro ao carregar referências para o template:', err.message);
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=modelo_importacao_agenda.xlsx');
  await workbook.xlsx.write(res);
  res.end();
});

// GET /appointments/export
router.get('/export', async (req, res) => {
  try {
    const query = `
      SELECT a.*, p.name as patient_name, u.name as professional_name, s.name as service_name
      FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      LEFT JOIN users u ON u.id = a.professional_id
      LEFT JOIN services s ON s.id = a.service_id
      WHERE a.tenant_id = ?
      ORDER BY a.start_time DESC
    `;
    const [appointments] = await db.query(query, [req.user.tenant_id]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Agenda');

    worksheet.columns = [
      { header: 'Data/Hora', key: 'date', width: 20 },
      { header: 'Título', key: 'title', width: 25 },
      { header: 'Paciente', key: 'patient', width: 25 },
      { header: 'Profissional', key: 'professional', width: 25 },
      { header: 'Serviço', key: 'service', width: 20 },
      { header: 'Duração', key: 'duration', width: 10 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Modalidade', key: 'modality', width: 15 },
      { header: 'Notas', key: 'notes', width: 40 }
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    });

    appointments.forEach(a => {
      worksheet.addRow({
        date: new Date(a.start_time).toLocaleString('pt-BR'),
        title: a.title,
        patient: a.patient_name,
        professional: a.professional_name,
        service: a.service_name,
        duration: a.duration_minutes,
        status: a.status,
        modality: a.modality,
        notes: a.notes
      });
    });

    worksheet.autoFilter = 'A1:I1';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=agenda_exportada.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao exportar agenda' });
  }
});

// POST /appointments/import
router.post('/import', memoryUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { raw: false, dateNF: 'yyyy-mm-dd HH:mm' });

    const imported = [];
    const errors = [];

    const findValue = (row, ...names) => {
      const keys = Object.keys(row);
      for (const name of names) {
        const key = keys.find(k => k.toLowerCase().trim() === name.toLowerCase().trim());
        if (key) return row[key];
      }
      return null;
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const title = findValue(row, 'Título', 'Title', 'Nome');
      const startTime = findValue(row, 'Data Início', 'Data', 'Start', 'Início');

      if (!startTime || (title && String(title).toLowerCase().includes('exemplo'))) continue;

      try {
        const rawDuration = findValue(row, 'Duração (min)', 'Duração', 'Duration');
        const duration = parseInt(rawDuration) || 50;
        const start = new Date(startTime);
        
        if (isNaN(start.getTime())) {
          errors.push(`Linha ${i + 2}: Data de início inválida (${startTime})`);
          continue;
        }

        const end = new Date(start.getTime() + duration * 60000);

        const [result] = await db.query(
          `INSERT INTO appointments (
            tenant_id, patient_id, professional_id, service_id, title,
            start_time, end_time, status, modality, type, duration_minutes, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.tenant_id,
            parseInt(findValue(row, 'ID Paciente', 'paciente_id', 'patient_id')) || null,
            parseInt(findValue(row, 'ID Profissional', 'profissional_id', 'professional_id')) || null,
            parseInt(findValue(row, 'ID Serviço', 'service_id')) || null,
            title,
            start.toISOString().slice(0, 19).replace('T', ' '),
            end.toISOString().slice(0, 19).replace('T', ' '),
            findValue(row, 'Status') || 'scheduled',
            findValue(row, 'Modalidade', 'Tipo') || 'presencial',
            findValue(row, 'Tipo Agendamento', 'type') || 'consulta',
            duration,
            findValue(row, 'Observações', 'Notes', 'Notas')
          ]
        );
        imported.push(result.insertId);
      } catch (e) {
        errors.push(`Linha ${i + 2}: ${e.message}`);
      }
    }

    res.json({ message: `${imported.length} agendamentos importados`, importedLength: imported.length, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao importar agenda' });
  }
});

// GET /appointments
router.get('/', async (req, res) => {
  try {
    const { patient_id, professional_id, start, end, status } = req.query;

    let query = `
      SELECT a.*,
        p.name as patient_name,
        u.name as professional_name,
        s.name as service_name
      FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      LEFT JOIN users u ON u.id = a.professional_id
      LEFT JOIN services s ON s.id = a.service_id
      WHERE a.tenant_id = ?
    `;
    const params = [req.user.tenant_id];

    if (patient_id) { query += ' AND a.patient_id = ?'; params.push(patient_id); }
    if (professional_id) { query += ' AND a.professional_id = ?'; params.push(professional_id); }
    if (status) { query += ' AND a.status = ?'; params.push(status); }
    if (start) { query += ' AND a.start_time >= ?'; params.push(start); }
    if (end) { query += ' AND a.start_time <= ?'; params.push(end); }

    query += ' ORDER BY a.start_time';

    const [appointments] = await db.query(query, params);
    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

// GET /appointments/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, p.name as patient_name, u.name as professional_name
       FROM appointments a
       LEFT JOIN patients p ON p.id = a.patient_id
       LEFT JOIN users u ON u.id = a.professional_id
       WHERE a.id = ? AND a.tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar agendamento' });
  }
});

// POST /appointments
router.post('/', async (req, res) => {
  try {
    const { 
      patient_id, professional_id, service_id, title, 
      start_time, end_time, notes, color, duration_minutes,
      status, modality, type, meeting_url, recurrence_rule 
    } = req.body;

    if (!start_time) {
      return res.status(400).json({ error: 'Data de início é obrigatória' });
    }

    const start = new Date(start_time);
    const duration = parseInt(duration_minutes) || 50;
    
    // Lista para guardar os IDs criados (para retorno ou log)
    const createdIds = [];
    const recurrenceCount = recurrence_rule ? 12 : 1; // Padrão de 12 repetições se tiver regra

    for (let i = 0; i < recurrenceCount; i++) {
        const currentStart = new Date(start);
        
        if (recurrence_rule === 'weekly') currentStart.setDate(start.getDate() + (i * 7));
        else if (recurrence_rule === 'biweekly') currentStart.setDate(start.getDate() + (i * 14));
        else if (recurrence_rule === 'monthly') currentStart.setMonth(start.getMonth() + i);
        else if (i > 0) break; // Só repete se houver regra válida

        const currentEnd = new Date(currentStart.getTime() + duration * 60000);
        
        const formattedStart = currentStart.toISOString().slice(0, 19).replace('T', ' ');
        const formattedEnd = currentEnd.toISOString().slice(0, 19).replace('T', ' ');

        const [result] = await db.query(
          `INSERT INTO appointments (
            tenant_id, patient_id, professional_id, service_id, title, 
            start_time, end_time, status, notes, color,
            modality, type, duration_minutes, meeting_url, recurrence_rule
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.tenant_id, 
            patient_id || null, 
            professional_id || null, 
            service_id || null,
            title || null, 
            formattedStart, 
            formattedEnd, 
            status || 'scheduled',
            notes || null, 
            color || null,
            modality || 'presencial',
            type || 'consulta',
            duration,
            meeting_url || null,
            recurrence_rule || null
          ]
        );
        createdIds.push(result.insertId);
    }

    // 3. Se for consulta com paciente, cria a COMANDA integrada
    let comandaId = null;
    if (patient_id && service_id && type === 'consulta') {
        try {
            // Busca o preço do serviço
            const [services] = await db.query('SELECT name, price FROM services WHERE id = ?', [service_id]);
            const service = services[0];
            const price = service ? service.price : 0;
            const serviceName = service ? service.name : 'Atendimento';

            const totalAmount = price * createdIds.length;
            const items = [{
                id: service_id,
                name: serviceName,
                price: price,
                qty: createdIds.length,
                value: price
            }];

            const description = createdIds.length > 1 ? `${serviceName} (${createdIds.length} sessões)` : serviceName;

            const [comandaResult] = await db.query(
                `INSERT INTO comandas (
                    tenant_id, patient_id, service_id, professional_id, 
                    description, total, sessions_total, sessions_used, items, notes, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    req.user.tenant_id, patient_id, service_id, professional_id || null,
                    description, totalAmount, createdIds.length, 0, JSON.stringify(items),
                    createdIds.length > 1 ? `Pacote recorrente gerado via Agenda` : 'Sessão individual via Agenda',
                    'open'
                ]
            );
            comandaId = comandaResult.insertId;

            // Vincula todos os agendamentos criados à comanda
            await db.query(
                'UPDATE appointments SET comanda_id = ? WHERE id IN (?)',
                [comandaId, createdIds]
            );
        } catch (comandaErr) {
            console.error('Erro ao gerar comanda automática no agendamento:', comandaErr);
        }
    }

    const [created] = await db.query(
      `SELECT a.*, p.name as patient_name, u.name as professional_name
       FROM appointments a
       LEFT JOIN patients p ON p.id = a.patient_id
       LEFT JOIN users u ON u.id = a.professional_id
       WHERE a.id = ?`,
      [createdIds[0]]
    );

    // Adiciona o comanda_id no retorno para o frontend redirecionar se necessário
    const resultData = { ...created[0], comanda_id: comandaId };
    res.status(201).json(resultData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// PUT /appointments/:id
router.put('/:id', async (req, res) => {
  try {
    const { 
      patient_id, professional_id, service_id, title, 
      start_time, end_time, status, notes, color,
      modality, type, duration_minutes, meeting_url
    } = req.body;

    const [existing] = await db.query(
      'SELECT id FROM appointments WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });

    let formattedStart = start_time;
    let formattedEnd = end_time;

    if (start_time) {
        formattedStart = new Date(start_time).toISOString().slice(0, 19).replace('T', ' ');
    }
    if (end_time) {
        formattedEnd = new Date(end_time).toISOString().slice(0, 19).replace('T', ' ');
    }

    await db.query(
      `UPDATE appointments SET
        patient_id = ?,
        professional_id = ?,
        service_id = ?,
        title = ?,
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        status = ?,
        notes = ?,
        color = ?,
        modality = ?,
        type = ?,
        duration_minutes = ?,
        meeting_url = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        patient_id || null, 
        professional_id || null, 
        service_id || null, 
        title || null, 
        formattedStart, 
        formattedEnd, 
        status || 'scheduled', 
        notes || null, 
        color || null,
        modality || 'presencial',
        type || 'consulta',
        parseInt(duration_minutes) || 50,
        meeting_url || null,
        req.params.id, 
        req.user.tenant_id
      ]
    );

    const [updated] = await db.query(
      `SELECT a.*, p.name as patient_name, u.name as professional_name
       FROM appointments a
       LEFT JOIN patients p ON p.id = a.patient_id
       LEFT JOIN users u ON u.id = a.professional_id
       WHERE a.id = ?`,
      [req.params.id]
    );

    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
});

// DELETE /appointments/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM appointments WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar agendamento' });
  }
});


module.exports = router;
