const { checkPermission } = require('../middleware/auth');
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
    { table: 'appointments', sql: 'ALTER TABLE appointments ADD COLUMN whatsapp_reminder_professional_sent TINYINT(1) DEFAULT 0' },
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
router.get('/export-template', checkPermission('create_appointment'), async (req, res) => {
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

  try {
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=modelo_importacao_agenda.xlsx');
    res.send(buffer);
  } catch (err) {
    console.error('Erro ao gerar buffer do Excel:', err);
    res.status(500).json({ error: 'Erro ao gerar arquivo do template' });
  }
});

// GET /appointments/export
router.get('/export', checkPermission('view_agenda'), async (req, res) => {
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
      let dateStr = '';
      try {
        if (a.start_time) {
          const d = new Date(a.start_time);
          if (!isNaN(d.getTime())) {
            dateStr = d.toLocaleString('pt-BR');
          }
        }
      } catch (e) {
        dateStr = String(a.start_time || '');
      }

      worksheet.addRow({
        date: dateStr,
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

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=agenda_exportada.xlsx');
    res.send(buffer);
  } catch (err) {
    console.error('Erro ao exportar agenda:', err);
    res.status(500).json({ error: 'Erro ao exportar agenda' });
  }
});

// POST /appointments/import
router.post('/import', checkPermission('create_appointment'), memoryUpload.single('file'), async (req, res) => {
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

        const rawPId = findValue(row, 'ID Paciente', 'paciente_id', 'patient_id');
        const rawProfId = findValue(row, 'ID Profissional', 'profissional_id', 'professional_id');
        const rawSId = findValue(row, 'ID Serviço', 'service_id');

        const pId = parseInt(rawPId);
        const profId = parseInt(rawProfId);
        const sId = parseInt(rawSId);

        const [result] = await db.query(
          `INSERT INTO appointments (
            tenant_id, patient_id, professional_id, service_id, title,
            start_time, end_time, status, modality, type, duration_minutes, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.tenant_id,
            isNaN(pId) ? null : pId,
            isNaN(profId) ? null : profId,
            isNaN(sId) ? null : sId,
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
router.get('/', checkPermission('view_agenda'), async (req, res) => {
  try {
    await withSchema();
    const { patient_id, professional_id, start, end, status } = req.query;

    let query = `
      SELECT a.*,
        p.name as patient_name,
        u.name as professional_name,
        s.name as service_name,
        s.price as service_price,
        c.sessions_total as comanda_sessions_total,
        c.sessions_used as comanda_sessions_used,
        c.total as comanda_total,
        c.description as comanda_description
      FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      LEFT JOIN users u ON u.id = a.professional_id
      LEFT JOIN services s ON s.id = a.service_id
      LEFT JOIN comandas c ON c.id = a.comanda_id
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
router.get('/:id', checkPermission('view_agenda'), async (req, res) => {
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
router.post('/', checkPermission('create_appointment'), async (req, res) => {
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
    const parsedCount = parseInt(recurrence_count);
    const until = recurrence_end_date ? new Date(recurrence_end_date) : null;

    // Quando usa "Por Data" (until) sem count: usa limite alto para o loop, until vai parar
    // Quando usa "Por Vezes" (count): usa o count exato
    // "until" é exclusivo: data escolhida = último dia NÃO incluído (como o usuário espera)
    let count = (!isNaN(parsedCount) && parsedCount > 0)
      ? parsedCount
      : (until ? 365 : (freq ? 12 : 1));

    // Agendamentos só são criados via Agenda.
    // A repetição respeita exatamente o count/until definido — nunca cria duplicatas.
    // Antes de inserir cada ocorrência, verifica se já existe um agendamento para o mesmo
    // paciente + profissional + dia (mesmo horário exacto), para evitar fantasmas.
    for (let i = 0; i < count; i++) {
        const currentStart = new Date(start);

        if (freq === 'DAILY') currentStart.setDate(start.getDate() + (i * interval));
        else if (freq === 'WEEKLY') currentStart.setDate(start.getDate() + (i * 7 * interval));
        else if (freq === 'TWICE_WEEKLY') {
            // 2x por semana: sessão no dia de início + 3 dias depois, repetindo semanalmente
            // i=0→dia 0, i=1→dia+3, i=2→dia+7, i=3→dia+10, ...
            const weekIdx = Math.floor(i / 2);
            const dayOffset = i % 2 === 0 ? 0 : 3;
            currentStart.setDate(start.getDate() + (weekIdx * 7) + dayOffset);
        }
        else if (freq === 'THREE_WEEKLY') {
            // 3x por semana: dia de início, +2 dias, +4 dias, repetindo semanalmente
            // i=0→dia 0, i=1→dia+2, i=2→dia+4, i=3→dia+7, ...
            const weekIdx = Math.floor(i / 3);
            const dayOffsets = [0, 2, 4];
            currentStart.setDate(start.getDate() + (weekIdx * 7) + dayOffsets[i % 3]);
        }
        else if (freq === 'MONTHLY') currentStart.setMonth(start.getMonth() + (i * interval));
        else if (freq === 'YEARLY') currentStart.setFullYear(start.getFullYear() + (i * interval));
        else if (i > 0) break;

        // Se atingir ou passar da data limite, para (until é exclusivo)
        if (until && currentStart >= until) break;

        const formattedStart = currentStart.toISOString().slice(0, 19).replace('T', ' ');

        // Checagem anti-duplicata: se já existe agendamento para o mesmo paciente/profissional
        // no mesmo horário exato, tenta vincular/atualizar ao invés de apenas pular.
        if (finalPatientId || finalProfessionalId) {
            const [existing] = await db.query(
                `SELECT id FROM appointments
                 WHERE tenant_id = ?
                   AND start_time = ?
                   AND (patient_id = ? AND professional_id = ?)
                   AND status NOT IN ('cancelled')
                 LIMIT 1`,
                [req.user.tenant_id, formattedStart, finalPatientId || null, finalProfessionalId || null]
            );
            
            if (existing.length > 0) {
                const existingId = existing[0].id;
                console.log(`[recurrence] Atualizando agendamento existente id=${existingId} para vincular à série/comanda em ${formattedStart}`);
                
                // Atualiza o existente para "entrar na dança" da comanda e recorrência
                await db.query(
                  `UPDATE appointments SET
                    comanda_id = ?,
                    recurrence_rule = ?,
                    status = COALESCE(?, status),
                    service_id = COALESCE(?, service_id),
                    package_id = COALESCE(?, package_id),
                    modality = ?,
                    type = ?,
                    duration_minutes = ?,
                    notes = COALESCE(?, notes),
                    color = COALESCE(?, color)
                   WHERE id = ?`,
                  [
                    comanda_id || null,
                    freq ? JSON.stringify({ freq, interval, count, until }) : null,
                    status || 'scheduled',
                    service_id || null,
                    package_id || null,
                    modality || 'presencial',
                    type || 'consulta',
                    duration,
                    notes || null,
                    color || null,
                    existingId
                  ]
                );
                
                createdIds.push(existingId);
                continue; // pula para próxima data da série já tendo reaproveitado esta
            }
        }

        const currentEnd = new Date(currentStart.getTime() + duration * 60000);
        const formattedEnd = currentEnd.toISOString().slice(0, 19).replace('T', ' ');

        // Checagem de conflito de horário: mesmo profissional com período sobreposto
        // APENAS para agendamentos ÚNICOS (sem recorrência).
        // Para recorrência, o usuário escolheu explicitamente essa agenda e espera
        // que TODAS as N sessões sejam criadas — conflitos podem ser resolvidos depois.
        if (finalProfessionalId && !freq) {
            const [conflicts] = await db.query(
                `SELECT a.id,
                        u.name AS prof_name,
                        a.start_time AS raw_start,
                        a.end_time   AS raw_end
                 FROM appointments a
                 LEFT JOIN users u ON u.id = a.professional_id
                 WHERE a.tenant_id       = ?
                   AND a.professional_id = ?
                   AND a.status NOT IN ('cancelled')
                   AND a.start_time < ?
                   AND a.end_time   > ?
                 ORDER BY a.start_time
                 LIMIT 1`,
                [req.user.tenant_id, finalProfessionalId, formattedEnd, formattedStart]
            );
            if (conflicts.length > 0) {
                // Agendamento único — retorna erro ao invés de salvar
                const c = conflicts[0];
                const toISO = (v) => (v instanceof Date ? v.toISOString() : String(v));
                return res.status(409).json({
                    error: 'conflict',
                    conflict: true,
                    prof_name: c.prof_name || 'O profissional',
                    start_time: toISO(c.raw_start),
                    end_time: toISO(c.raw_end),
                });
            }
        }

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
        return res.status(400).json({ error: 'Nenhum agendamento foi criado. Já existem agendamentos neste horário para este paciente/profissional.' });
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

    // Dispara email + alerta de novo agendamento em background (não bloqueia a resposta)
    setImmediate(async () => {
      try {
        const apt = created[0];
        if (!apt || apt.type !== 'consulta') return;

        // Busca profissional com preferências
        const [[prof]] = await db.query(
          'SELECT id, email, tenant_id, email_preferences FROM users WHERE id = ? LIMIT 1',
          [apt.professional_id]
        ).catch(() => [[null]]);
        if (!prof) return;

        const tenantId = prof.tenant_id || apt.tenant_id;
        const startDate = new Date(apt.start_time);
        const dateStr = startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
        const timeStr = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

        // Cria alert no sistema (sempre, independente de email)
        await db.query(
          'INSERT INTO system_alerts (tenant_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
          [
            tenantId,
            '📅 Novo Agendamento',
            `${apt.patient_name || 'Paciente'} agendou uma consulta para ${dateStr} às ${timeStr}.`,
            'info',
            '/agenda'
          ]
        ).catch(() => {});

        // Envia email apenas se a preferência estiver ativada
        const rawPrefs = prof.email_preferences;
        const prefs = rawPrefs ? (typeof rawPrefs === 'string' ? JSON.parse(rawPrefs) : rawPrefs) : {};
        if (prof.email && prefs.enabled && prefs.new_appointment) {
          const html = templates.newAppointment({
            patientName: apt.patient_name || 'Paciente',
            date: dateStr,
            time: timeStr,
            type: apt.type,
            modality: apt.modality,
            professional: apt.professional_name,
          });
          await sendMail(prof.email, `📅 Novo agendamento — ${apt.patient_name}`, html);
        }
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
router.put('/:id/status', checkPermission('confirm_appointment'), async (req, res) => {
  try {
    await withSchema();
    const { status, notes } = req.body;
    const dbStatus = normalizeStatus(status);

    const [existing] = await db.query(
      'SELECT id, comanda_id, status as old_status FROM appointments WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });

    await db.query(
      'UPDATE appointments SET status = ?, notes = COALESCE(?, notes) WHERE id = ? AND tenant_id = ?',
      [dbStatus, notes || null, req.params.id, req.user.tenant_id]
    );

    // Faltou e Realizado consomem sessão; Cancelado e Agendado não
    const CONSUMING = ['completed', 'no_show'];
    const comandaId = existing[0].comanda_id;
    const oldStatus = existing[0].old_status;
    if (comandaId && dbStatus !== oldStatus) {
      const nowConsuming = CONSUMING.includes(dbStatus);
      const wasConsuming = CONSUMING.includes(oldStatus);
      try {
        if (nowConsuming && !wasConsuming) {
          await db.query(
            'UPDATE comandas SET sessions_used = LEAST(sessions_used + 1, sessions_total) WHERE id = ? AND tenant_id = ?',
            [comandaId, req.user.tenant_id]
          );
        } else if (!nowConsuming && wasConsuming) {
          await db.query(
            'UPDATE comandas SET sessions_used = GREATEST(sessions_used - 1, 0) WHERE id = ? AND tenant_id = ?',
            [comandaId, req.user.tenant_id]
          );
        }
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
router.put('/:id', checkPermission('edit_appointment'), async (req, res) => {
  try {
    await withSchema();
    const {
      patient_id, professional_id, psychologist_id, service_id, package_id, title,
      start_time, end_time, status, notes, color,
      modality, type, duration_minutes, meeting_url,
      reschedule_reason, comanda_id, session_fraction
    } = req.body;

    const [existing] = await db.query(
      'SELECT id, status as old_status, comanda_id as old_comanda, start_time as old_start, duration_minutes as old_duration FROM appointments WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });

    const dbStatus = normalizeStatus(status);
    const oldStatus = existing[0].old_status;

    let formattedStart = null;
    let formattedEnd = null;

    // Determina o start efetivo: novo ou mantém o do banco
    const effectiveStartRaw = start_time || existing[0].old_start;
    const effectiveDur = parseInt(duration_minutes) || existing[0].old_duration || 50;

    if (start_time) {
      formattedStart = new Date(start_time).toISOString().slice(0, 19).replace('T', ' ');
    }

    if (end_time) {
      formattedEnd = new Date(end_time).toISOString().slice(0, 19).replace('T', ' ');
    } else if (effectiveStartRaw) {
      // Sempre recalcula end_time = start + duration para garantir consistência
      const startDate = new Date(effectiveStartRaw);
      const endDate = new Date(startDate.getTime() + effectiveDur * 60000);
      formattedEnd = endDate.toISOString().slice(0, 19).replace('T', ' ');
    }

    const finalProfessionalId = professional_id || psychologist_id || null;
    const finalComandaId = comanda_id || existing[0].old_comanda || null;

    const finalFraction = (session_fraction !== undefined && session_fraction !== null)
      ? parseFloat(session_fraction) : null;

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
        comanda_id = ?,
        session_fraction = COALESCE(?, session_fraction)
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
        effectiveDur,
        meeting_url || null,
        reschedule_reason || null,
        finalComandaId,
        finalFraction,
        req.params.id,
        req.user.tenant_id
      ]
    );

    // Faltou e Realizado consomem sessão; Cancelado e Agendado não
    const CONSUMING_PUT = ['completed', 'no_show'];
    const statusChanged = dbStatus !== oldStatus;
    if (statusChanged && finalComandaId) {
      const nowConsuming = CONSUMING_PUT.includes(dbStatus);
      const wasConsuming = CONSUMING_PUT.includes(oldStatus);
      try {
        if (nowConsuming && !wasConsuming) {
          await db.query(
            'UPDATE comandas SET sessions_used = LEAST(sessions_used + 1, sessions_total) WHERE id = ? AND tenant_id = ?',
            [finalComandaId, req.user.tenant_id]
          );
        } else if (!nowConsuming && wasConsuming) {
          await db.query(
            'UPDATE comandas SET sessions_used = GREATEST(sessions_used - 1, 0) WHERE id = ? AND tenant_id = ?',
            [finalComandaId, req.user.tenant_id]
          );
        }
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
router.delete('/:id', checkPermission('delete_appointment'), async (req, res) => {
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
