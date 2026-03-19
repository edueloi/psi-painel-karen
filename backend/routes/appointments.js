const express = require('express');
const router = express.Router();
const multer = require('multer');
const ExcelJS = require('exceljs');
const xlsx = require('xlsx');
const db = require('../db');
const { sendMail, templates } = require('../services/emailService');

const memoryUpload = multer({ storage: multer.memoryStorage() });

async function ensureSchema() {
  const tableCols = [
    { table: 'appointments', sql: 'ALTER TABLE appointments ADD COLUMN package_id INT NULL' },
    { table: 'appointments', sql: 'ALTER TABLE appointments ADD COLUMN comanda_id INT NULL' },
    { table: 'appointments', sql: 'ALTER TABLE appointments ADD COLUMN recurrence_rule VARCHAR(500) NULL' },
    { table: 'appointments', sql: 'ALTER TABLE appointments MODIFY COLUMN recurrence_rule VARCHAR(500) NULL' },
    { table: 'appointments', sql: 'ALTER TABLE appointments ADD COLUMN duration_minutes INT NULL DEFAULT 60' },
    { table: 'appointments', sql: 'ALTER TABLE appointments ADD COLUMN room_id VARCHAR(50) NULL' },
    { table: 'appointments', sql: 'ALTER TABLE appointments ADD COLUMN reschedule_reason TEXT NULL' },
    { table: 'services', sql: 'ALTER TABLE services ADD COLUMN category VARCHAR(100) NULL' },
    // Comandas table schema
    { table: 'comandas', sql: `
      CREATE TABLE IF NOT EXISTS comandas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        patient_id INT NULL,
        professional_id INT NULL,
        service_id INT NULL,
        package_id INT NULL,
        appointment_id INT NULL,
        description TEXT NULL,
        total DECIMAL(10,2) DEFAULT 0,
        sessions_total INT DEFAULT 1,
        sessions_used INT DEFAULT 0,
        items LONGTEXT NULL,
        notes TEXT NULL,
        status ENUM('open', 'closed', 'cancelled') DEFAULT 'open',
        start_date DATETIME NULL,
        duration_minutes INT DEFAULT 60,
        financial_transaction_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tenant (tenant_id),
        INDEX idx_patient (patient_id)
      )
    `},
    { table: 'comandas', sql: 'ALTER TABLE comandas ADD COLUMN sessions_total INT NULL DEFAULT 1' },
    { table: 'comandas', sql: 'ALTER TABLE comandas ADD COLUMN sessions_used INT NULL DEFAULT 0' },
    { table: 'comandas', sql: 'ALTER TABLE comandas ADD COLUMN total DECIMAL(10,2) NULL' },
    { table: 'comandas', sql: 'ALTER TABLE comandas ADD COLUMN items LONGTEXT NULL' },
    { table: 'comandas', sql: 'ALTER TABLE comandas ADD COLUMN notes TEXT NULL' },
    { table: 'comandas', sql: 'ALTER TABLE comandas ADD COLUMN start_date DATETIME NULL' },
    { table: 'comandas', sql: 'ALTER TABLE comandas ADD COLUMN duration_minutes INT NULL DEFAULT 60' },
  ];
  for (const item of tableCols) {
    try { 
      await db.query(item.sql); 
    } catch (e) { 
      if (e.code !== 'ER_DUP_FIELDNAME' && !e.message.includes('Duplicate column') && !e.message.includes('already exists')) {
        console.warn('Migration warning:', e.message);
      }
    }
  }
}

let schemaReady = false;
async function withSchema() {
  if (!schemaReady) {
    await ensureSchema();
    schemaReady = true;
  }
}

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
        await withSchema();
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
    await withSchema();
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
    await withSchema();
    const { 
      patient_id, professional_id, psychologist_id, service_id, package_id, title,
      start_time, appointment_date, duration_minutes, notes, color,
      status, modality, type, meeting_url, 
      recurrence_freq, recurrence_interval, recurrence_count, recurrence_end_date,
      comanda_id
    } = req.body;

    const createdIds = [];
    const actualStartTime = start_time || appointment_date;

    if (!actualStartTime) {
      return res.status(400).json({ error: 'Data de início é obrigatória' });
    }

    const start = new Date(actualStartTime);
    const duration = parseInt(duration_minutes) || 50;
    
    let finalPatientId = patient_id || null;
    let finalProfId = professional_id || psychologist_id || null;

    // Se o patient_id não for numérico, assume que é um NOME e cria o paciente
    if (finalPatientId && isNaN(parseInt(finalPatientId))) {
        const [pRes] = await db.query(
            'INSERT INTO patients (tenant_id, name) VALUES (?, ?)',
            [req.user.tenant_id, finalPatientId]
        );
        finalPatientId = pRes.insertId;
    }

    // Se o professional_id não for numérico, assume que é um NOME e cria o profissional (user)
    if (finalProfId && isNaN(parseInt(finalProfId))) {
        const [uRes] = await db.query(
            'INSERT INTO users (tenant_id, name, email, role, password) VALUES (?, ?, ?, ?, ?)',
            [
                req.user.tenant_id, 
                finalProfId, 
                `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}@psiflux.com.br`, 
                'professional',
                'p@ssword123'
            ]
        );
        finalProfId = uRes.insertId;
    }

    const finalProfessionalId = finalProfId;
    
    // Padrão de repetição
    const freq = recurrence_freq || null;
    const interval = parseInt(recurrence_interval) || 1;
    let count = parseInt(recurrence_count) || 1;
    const until = recurrence_end_date ? new Date(recurrence_end_date) : null;

    if (freq && (!count || count <= 0)) {
        count = 12; // Default if freq is set but no limit or 0
    }

    for (let i = 0; i < count; i++) {
        const currentStart = new Date(start);
        
        if (freq === 'DAILY') currentStart.setDate(start.getDate() + (i * interval));
        else if (freq === 'WEEKLY') currentStart.setDate(start.getDate() + (i * 7 * interval));
        else if (freq === 'MONTHLY') currentStart.setMonth(start.getMonth() + (i * interval));
        else if (freq === 'YEARLY') currentStart.setFullYear(start.getFullYear() + (i * interval));
        else if (i > 0) break;

        // Se passar da data limite, para
        if (until && currentStart > until) break;

        const currentEnd = new Date(currentStart.getTime() + duration * 60000);
        
        const formattedStart = currentStart.toISOString().slice(0, 19).replace('T', ' ');
        const formattedEnd = currentEnd.toISOString().slice(0, 19).replace('T', ' ');

        const [result] = await db.query(
          `INSERT INTO appointments (
            tenant_id, patient_id, professional_id, service_id, package_id, title, 
            start_time, end_time, status, notes, color,
            modality, type, duration_minutes, meeting_url, recurrence_rule, comanda_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.tenant_id, 
            finalPatientId, 
            finalProfessionalId, 
            service_id || null,
            package_id || null,
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
            freq ? JSON.stringify({ freq, interval, count, until }) : null,
            comanda_id || null
          ]
        );
        createdIds.push(result.insertId);
    }

    if (createdIds.length === 0) {
        return res.status(500).json({ error: 'Nenhum agendamento foi gerado. Verifique os parâmetros de repetição.' });
    }

    // 3. Comanda agora é vinculada manualmente pelo frontend
    const comandaId = comanda_id || null;

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

    // Dispara email de novo agendamento em background (não bloqueia a resposta)
    setImmediate(async () => {
      try {
        const apt = created[0];
        if (!apt || apt.type !== 'consulta') return;
        // Busca email do profissional
        const [[prof]] = await db.query('SELECT email FROM users WHERE id = ? LIMIT 1', [apt.professional_id]).catch(() => [[null]]);
        const target = prof?.email;
        if (!target) return;
        const startDate = new Date(apt.start_time);
        const html = templates.newAppointment({
          patientName: apt.patient_name || 'Paciente',
          date: startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          time: startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          type: apt.type,
          modality: apt.modality,
          professional: apt.professional_name,
        });
        await sendMail(target, `📅 Novo agendamento — ${apt.patient_name}`, html);
      } catch (e) { /* silencioso */ }
    });
  } catch (err) {
    console.error('Erro ao criar agendamento:', err);
    res.status(500).json({ error: 'Erro ao criar agendamento', details: err.message });
  }
});

// Helper: normaliza status do frontend para o ENUM do banco
function normalizeStatus(s) {
  if (!s) return 'scheduled';
  // Frontend manda 'no-show', banco espera 'no_show'
  if (s === 'no-show') return 'no_show';
  const valid = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
  return valid.includes(s) ? s : 'scheduled';
}

// PUT /appointments/:id/status  (chamado por handleUpdateAppointmentStatus)
router.put('/:id/status', async (req, res) => {
  try {
    await withSchema();
    const { status, notes } = req.body;
    const dbStatus = normalizeStatus(status);

    const [existing] = await db.query(
      'SELECT id, comanda_id FROM appointments WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });

    await db.query(
      'UPDATE appointments SET status = ?, notes = COALESCE(?, notes) WHERE id = ? AND tenant_id = ?',
      [dbStatus, notes || null, req.params.id, req.user.tenant_id]
    );

    // Contabiliza faltou/cancelado na comanda: incrementa sessions_used
    const comandaId = existing[0].comanda_id;
    if (comandaId && (dbStatus === 'no_show' || dbStatus === 'cancelled')) {
      try {
        await db.query(
          'UPDATE comandas SET sessions_used = LEAST(sessions_used + 1, sessions_total) WHERE id = ? AND tenant_id = ?',
          [comandaId, req.user.tenant_id]
        );
      } catch (e) { /* ignora se comanda não existe */ }
    }

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
    console.error('Erro ao atualizar status:', err);
    res.status(500).json({ error: 'Erro ao atualizar status', details: err.message });
  }
});

// PUT /appointments/:id
router.put('/:id', async (req, res) => {
  try {
    await withSchema();
    const {
      patient_id, professional_id, psychologist_id, service_id, package_id, title,
      start_time, end_time, status, notes, color,
      modality, type, duration_minutes, meeting_url,
      reschedule_reason, comanda_id
    } = req.body;

    const [existing] = await db.query(
      'SELECT id, status as old_status, comanda_id as old_comanda FROM appointments WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });

    const dbStatus = normalizeStatus(status);
    const oldStatus = existing[0].old_status;

    let formattedStart = null;
    let formattedEnd = null;

    if (start_time) {
      const startDate = new Date(start_time);
      formattedStart = startDate.toISOString().slice(0, 19).replace('T', ' ');

      // Recalcula end_time com base no start_time + duration quando end_time não é enviado
      if (!end_time) {
        const dur = parseInt(duration_minutes) || 50;
        const endDate = new Date(startDate.getTime() + dur * 60000);
        formattedEnd = endDate.toISOString().slice(0, 19).replace('T', ' ');
      }
    }

    if (end_time) {
      formattedEnd = new Date(end_time).toISOString().slice(0, 19).replace('T', ' ');
    }

    const finalProfessionalId = professional_id || psychologist_id || null;
    const finalComandaId = comanda_id || existing[0].old_comanda || null;

    await db.query(
      `UPDATE appointments SET
        patient_id = ?,
        professional_id = ?,
        service_id = ?,
        package_id = ?,
        title = ?,
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        status = ?,
        notes = ?,
        color = ?,
        modality = ?,
        type = ?,
        duration_minutes = ?,
        meeting_url = ?,
        reschedule_reason = ?,
        comanda_id = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        patient_id || null,
        finalProfessionalId,
        service_id || null,
        package_id || null,
        title || null,
        formattedStart,
        formattedEnd,
        dbStatus,
        notes || null,
        color || null,
        modality || 'presencial',
        type || 'consulta',
        parseInt(duration_minutes) || 50,
        meeting_url || null,
        reschedule_reason || null,
        finalComandaId,
        req.params.id,
        req.user.tenant_id
      ]
    );

    // Se status mudou para faltou/cancelado e há comanda, incrementa sessions_used
    const statusChanged = dbStatus !== oldStatus;
    if (statusChanged && finalComandaId && (dbStatus === 'no_show' || dbStatus === 'cancelled')) {
      try {
        await db.query(
          'UPDATE comandas SET sessions_used = LEAST(sessions_used + 1, sessions_total) WHERE id = ? AND tenant_id = ?',
          [finalComandaId, req.user.tenant_id]
        );
      } catch (e) { /* ignora */ }
    }

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
    console.error('Erro ao atualizar agendamento:', err);
    res.status(500).json({ error: 'Erro ao atualizar agendamento', details: err.message });
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
