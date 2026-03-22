const express = require('express');
const router = express.Router();
const multer = require('multer');
const ExcelJS = require('exceljs');
const xlsx = require('xlsx');
const db = require('../db');
const path = require('path');
const fs = require('fs');

const memoryUpload = multer({ storage: multer.memoryStorage() });

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads/photos');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'patient-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const photoUpload = multer({ 
  storage: diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Apenas imagens são permitidas'), false);
  }
});

// Normaliza status pt-BR para valores aceitos pelo banco
const normalizeStatus = (s) => {
  if (s === 'ativo') return 'active';
  if (s === 'inativo') return 'inactive';
  if (['active', 'inactive', 'waiting'].includes(s)) return s;
  return 'active';
};

// GET /patients
router.get('/', async (req, res) => {
  try {
    const { search, status, professional_id } = req.query;

    let query = 'SELECT * FROM patients WHERE tenant_id = ?';
    const params = [req.user.tenant_id];

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR cpf LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (professional_id) {
      query += ' AND responsible_professional_id = ?';
      params.push(professional_id);
    }

    query += ' ORDER BY name';

    const [patients] = await db.query(query, params);
    res.json(patients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pacientes' });
  }
});

// GET /patients/export-template
router.get('/export-template', async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Dados para Importar');
  
  worksheet.columns = [
    { header: 'Nome', key: 'name', width: 30 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Telefone', key: 'phone', width: 20 },
    { header: 'Telefone 2', key: 'phone2', width: 20 },
    { header: 'CPF', key: 'cpf', width: 20 },
    { header: 'RG', key: 'rg', width: 20 },
    { header: 'Data Nascimento', key: 'birth_date', width: 20 },
    { header: 'Gênero', key: 'gender', width: 15 },
    { header: 'Estado Civil', key: 'marital_status', width: 20 },
    { header: 'Escolaridade', key: 'education', width: 20 },
    { header: 'Profissão', key: 'profession', width: 20 },
    { header: 'Nacionalidade', key: 'nationality', width: 20 },
    { header: 'Naturalidade', key: 'naturality', width: 20 },
    { header: 'Tem Filhos?', key: 'has_children', width: 15 },
    { header: 'Qtd Filhos', key: 'children_count', width: 15 },
    { header: 'Qtd Filhos Menores', key: 'minor_children_count', width: 20 },
    { header: 'Nome Cônjuge', key: 'spouse_name', width: 30 },
    { header: 'Contato Familiar', key: 'family_contact', width: 20 },
    { header: 'Contato Emergência', key: 'emergency_contact', width: 20 },
    { header: 'Endereço', key: 'address', width: 40 },
    { header: 'Cidade', key: 'city', width: 20 },
    { header: 'Estado', key: 'state', width: 10 },
    { header: 'CEP', key: 'zip_code', width: 15 },
    { header: 'Convênio?', key: 'convenio', width: 15 },
    { header: 'Nome Convênio', key: 'health_plan', width: 25 },
    { header: 'Observação / Referência', key: 'notes', width: 40 },
    { header: 'Diagnóstico', key: 'diagnosis', width: 40 }
  ];

  // Estilo do cabeçalho
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.alignment = { horizontal: 'center' };
  });

  worksheet.addRow({
    name: 'Paciente Exemplo',
    email: 'exemplo@email.com',
    phone: '(11) 99999-9999',
    phone2: '(11) 88888-8888',
    cpf: '123.456.789-00',
    rg: '12.345.678-9',
    birth_date: '1990-05-15',
    gender: 'Masculino',
    marital_status: 'Solteiro(a)',
    education: 'Ensino Superior Completo',
    profession: 'Engenheiro',
    nationality: 'Brasileira',
    naturality: 'São Paulo',
    has_children: 'Não',
    children_count: 0,
    minor_children_count: 0,
    spouse_name: '',
    family_contact: '(11) 97777-7777',
    emergency_contact: '(11) 96666-6666',
    address: 'Rua Exemplo, 123',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '01234-567',
    convenio: 'Não',
    health_plan: '',
    notes: 'Paciente prefere atendimento vespertino',
    diagnosis: 'Ansiedade leve'
  });

  worksheet.autoFilter = 'A1:AA1';

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
    ['Nome', 'Sim', 'Nome completo do paciente'],
    ['Email', 'Não', 'exemplo@dominio.com'],
    ['Telefone', 'Não', '(00) 00000-0000 ou apenas números'],
    ['Telefone 2', 'Não', 'Segundo contato ou contato de emergência'],
    ['CPF', 'Não', '000.000.000-00 ou apenas números'],
    ['RG', 'Não', 'Apenas números e letras'],
    ['Data Nascimento', 'Não', 'AAAA-MM-DD (Ex: 1990-05-15)'],
    ['Gênero', 'Não', 'Masculino, Feminino, Outro'],
    ['Estado Civil', 'Não', 'Solteiro(a), Casado(a), etc.'],
    ['Escolaridade', 'Não', 'Ensino Médio, Superior, etc.'],
    ['Profissão', 'Não', 'Cargo ou área de atuação'],
    ['Nacionalidade', 'Não', 'Brasileira, etc.'],
    ['Naturalidade', 'Não', 'Cidade onde nasceu'],
    ['Tem Filhos?', 'Não', 'Sim ou Não'],
    ['Qtd Filhos', 'Não', 'Número total'],
    ['Qtd Filhos Menores', 'Não', 'Número de menores de idade'],
    ['Nome Cônjuge', 'Não', 'Nome completo'],
    ['Contato Familiar', 'Não', 'Telefone de um familiar'],
    ['Contato Emergência', 'Não', 'Telefone para emergências'],
    ['Endereço', 'Não', 'Rua e número'],
    ['Cidade', 'Não', 'Nome da cidade'],
    ['Estado', 'Não', 'UF (Ex: SP)'],
    ['CEP', 'Não', '00000-000'],
    ['Convênio?', 'Não', 'Sim ou Não'],
    ['Nome Convênio', 'Não', 'Nome da operadora'],
    ['Observação / Referência', 'Não', 'Qualquer informação relevante'],
    ['Diagnóstico', 'Não', 'Resumo clínico']
  ]);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=modelo_importacao_pacientes.xlsx');
  await workbook.xlsx.write(res);
  res.end();
});

// GET /patients/export
router.get('/export', async (req, res) => {
  try {
    const [patients] = await db.query('SELECT * FROM patients WHERE tenant_id = ? ORDER BY name', [req.user.tenant_id]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Pacientes');

    worksheet.columns = [
      { header: 'Nome', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Telefone', key: 'phone', width: 20 },
      { header: 'Telefone 2', key: 'phone2', width: 20 },
      { header: 'CPF', key: 'cpf', width: 20 },
      { header: 'RG', key: 'rg', width: 20 },
      { header: 'Data Nascimento', key: 'birth_date', width: 20 },
      { header: 'Gênero', key: 'gender', width: 15 },
      { header: 'Estado Civil', key: 'marital_status', width: 20 },
      { header: 'Escolaridade', key: 'education', width: 20 },
      { header: 'Profissão', key: 'profession', width: 20 },
      { header: 'Nacionalidade', key: 'nationality', width: 20 },
      { header: 'Naturalidade', key: 'naturality', width: 20 },
      { header: 'Tem Filhos?', key: 'has_children', width: 15 },
      { header: 'Qtd Filhos', key: 'children_count', width: 15 },
      { header: 'Qtd Filhos Menores', key: 'minor_children_count', width: 20 },
      { header: 'Nome Cônjuge', key: 'spouse_name', width: 30 },
      { header: 'Contato Familiar', key: 'family_contact', width: 20 },
      { header: 'Contato Emergência', key: 'emergency_contact', width: 20 },
      { header: 'Endereço', key: 'address', width: 40 },
      { header: 'Cidade', key: 'city', width: 20 },
      { header: 'Estado', key: 'state', width: 10 },
      { header: 'CEP', key: 'zip_code', width: 15 },
      { header: 'Convênio?', key: 'convenio', width: 15 },
      { header: 'Nome Convênio', key: 'health_plan', width: 25 },
      { header: 'Observação / Referência', key: 'notes', width: 40 },
      { header: 'Diagnóstico', key: 'diagnosis', width: 40 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    });

    patients.forEach(p => {
      worksheet.addRow({
        name: p.name,
        email: p.email,
        phone: p.phone,
        phone2: p.phone2,
        cpf: p.cpf,
        rg: p.rg,
        birth_date: p.birth_date ? new Date(p.birth_date).toISOString().split('T')[0] : '',
        gender: p.gender,
        marital_status: p.marital_status,
        education: p.education,
        profession: p.profession,
        nationality: p.nationality,
        naturality: p.naturality,
        has_children: p.has_children ? 'Sim' : 'Não',
        children_count: p.children_count,
        minor_children_count: p.minor_children_count,
        spouse_name: p.spouse_name,
        family_contact: p.family_contact,
        emergency_contact: p.emergency_contact,
        address: p.address,
        city: p.city,
        state: p.state,
        zip_code: p.zip_code,
        convenio: p.health_plan ? 'Sim' : 'Não',
        health_plan: p.health_plan,
        notes: p.notes,
        diagnosis: p.diagnosis,
        status: p.status === 'active' ? 'Ativo' : 'Inativo'
      });
    });

    worksheet.autoFilter = 'A1:AB1';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=pacientes_exportados.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao exportar pacientes' });
  }
});

// GET /patients/:id
router.get('/:id', async (req, res) => {
  try {
    const [patients] = await db.query(
      'SELECT * FROM patients WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (patients.length === 0) return res.status(404).json({ error: 'Paciente não encontrado' });
    res.json(patients[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar paciente' });
  }
});

// POST /patients
router.post('/', async (req, res) => {
  try {
    const {
      name, email, phone, phone2, birth_date, cpf, rg, gender,
      marital_status, education, profession, nationality, naturality,
      has_children, children_count, minor_children_count,
      spouse_name, family_contact, emergency_contact,
      address, city, state, zip_code, notes, status,
      responsible_professional_id, responsible_name,
      responsible_phone, health_plan, diagnosis
    } = req.body;

    if (cpf) {
      const [existing] = await db.query(
        'SELECT name FROM patients WHERE cpf = ? AND tenant_id = ? LIMIT 1',
        [cpf, req.user.tenant_id]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: `CPF já cadastrado para o paciente: ${existing[0].name}` });
      }
    }

    const [result] = await db.query(
      `INSERT INTO patients (
        tenant_id, name, email, phone, phone2, birth_date, cpf, rg, gender,
        marital_status, education, profession, nationality, naturality,
        has_children, children_count, minor_children_count,
        spouse_name, family_contact, emergency_contact,
        address, city, state, zip_code, notes, status,
        responsible_professional_id, responsible_name,
        responsible_phone, health_plan, diagnosis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id, name, email || null, phone || null, phone2 || null,
        birth_date || null, cpf || null, rg || null, gender || null,
        marital_status || null, education || null, profession || null,
        nationality || null, naturality || null,
        has_children ? 1 : 0, children_count || 0, minor_children_count || 0,
        spouse_name || null, family_contact || null, emergency_contact || null,
        address || null, city || null, state || null, zip_code || null,
        notes || null, normalizeStatus(status),
        responsible_professional_id || null, responsible_name || null,
        responsible_phone || null, health_plan || null, diagnosis || null
      ]
    );

    const [patient] = await db.query('SELECT * FROM patients WHERE id = ?', [result.insertId]);
    res.status(201).json(patient[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar paciente' });
  }
});

// PUT /patients/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      name, email, phone, phone2, birth_date, cpf, rg, gender,
      marital_status, education, profession, nationality, naturality,
      has_children, children_count, minor_children_count,
      spouse_name, family_contact, emergency_contact,
      address, city, state, zip_code, notes, status,
      responsible_professional_id, responsible_name,
      responsible_phone, health_plan, diagnosis
    } = req.body;

    const [existing] = await db.query(
      'SELECT * FROM patients WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Sanitizar data de nascimento para formato MySQL (YYYY-MM-DD)
    let sanitizedBirthDate = birth_date;
    if (birth_date && birth_date.includes('T')) {
      sanitizedBirthDate = birth_date.split('T')[0];
    }

    await db.query(
      `UPDATE patients SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        phone2 = COALESCE(?, phone2),
        birth_date = COALESCE(?, birth_date),
        cpf = COALESCE(?, cpf),
        rg = COALESCE(?, rg),
        gender = COALESCE(?, gender),
        marital_status = COALESCE(?, marital_status),
        education = COALESCE(?, education),
        profession = COALESCE(?, profession),
        nationality = COALESCE(?, nationality),
        naturality = COALESCE(?, naturality),
        has_children = COALESCE(?, has_children),
        children_count = COALESCE(?, children_count),
        minor_children_count = COALESCE(?, minor_children_count),
        spouse_name = COALESCE(?, spouse_name),
        family_contact = COALESCE(?, family_contact),
        emergency_contact = COALESCE(?, emergency_contact),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        zip_code = COALESCE(?, zip_code),
        notes = COALESCE(?, notes),
        status = COALESCE(?, status),
        responsible_professional_id = COALESCE(?, responsible_professional_id),
        responsible_name = COALESCE(?, responsible_name),
        responsible_phone = COALESCE(?, responsible_phone),
        health_plan = COALESCE(?, health_plan),
        diagnosis = COALESCE(?, diagnosis)
      WHERE id = ? AND tenant_id = ?`,
      [
        name ?? null, email ?? null, phone ?? null, phone2 ?? null, sanitizedBirthDate ?? null, cpf ?? null, rg ?? null, gender ?? null,
        marital_status ?? null, education ?? null, profession ?? null, nationality ?? null, naturality ?? null,
        has_children !== undefined ? (has_children ? 1 : 0) : null,
        children_count ?? null, minor_children_count ?? null,
        spouse_name ?? null, family_contact ?? null, emergency_contact ?? null,
        address ?? null, city ?? null, state ?? null, zip_code ?? null,
        notes ?? null, status ? normalizeStatus(status) : null,
        responsible_professional_id ?? null, responsible_name ?? null,
        responsible_phone ?? null, health_plan ?? null, diagnosis ?? null,
        req.params.id, req.user.tenant_id
      ]
    );

    // Registrar históricos se houver mudanças importantes
    const oldStatus = existing[0].status;
    const newStatus = status ? normalizeStatus(status) : oldStatus;
    if (oldStatus !== newStatus) {
      await db.query(
        `INSERT INTO patient_events (tenant_id, patient_id, type, title, description, old_value, new_value, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.tenant_id, req.params.id, 'status_change', 'Alteração de Status', `Status alterado de ${oldStatus} para ${newStatus}`, oldStatus, newStatus, req.user.id]
      ).catch(err => console.error('Erro ao registrar evento de status:', err.message));
    }

    if (health_plan !== undefined && existing[0].health_plan !== health_plan) {
      await db.query(
        `INSERT INTO patient_events (tenant_id, patient_id, type, title, description, old_value, new_value, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.tenant_id, req.params.id, 'plan_change', 'Alteração de Plano', `Plano/Convênio alterado para ${health_plan || 'Nenhum'}`, existing[0].health_plan, health_plan || null, req.user.id]
      ).catch(err => console.error('Erro ao registrar evento de plano:', err.message));
    }

    const [updated] = await db.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('ERRO PUT /patients/:id ->', err);
    res.status(500).json({ error: 'Erro ao atualizar paciente: ' + err.message });
  }
});

// POST /patients/:id/photo - Upload de foto
router.post('/:id/photo', photoUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma foto enviada' });

    const photo_url = `/uploads-static/photos/${req.file.filename}`;
    
    // Opcional: deletar foto antiga se existir
    const [existing] = await db.query('SELECT photo_url FROM patients WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    if (existing.length > 0 && existing[0].photo_url) {
      const oldPath = path.join(__dirname, '../public', existing[0].photo_url.replace('/uploads-static', 'uploads'));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await db.query('UPDATE patients SET photo_url = ? WHERE id = ? AND tenant_id = ?', [photo_url, req.params.id, req.user.tenant_id]);
    
    res.json({ photo_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar foto' });
  }
});

// DELETE /patients/:id/photo - Remover foto
router.delete('/:id/photo', async (req, res) => {
  try {
    const [existing] = await db.query('SELECT photo_url FROM patients WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Paciente não encontrado' });
    
    if (existing[0].photo_url) {
        const filePath = path.join(__dirname, '../public', existing[0].photo_url.replace('/uploads-static', 'uploads'));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        await db.query('UPDATE patients SET photo_url = NULL WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    }
    
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover foto' });
  }
});

// DELETE /patients/:id
router.delete('/:id', async (req, res) => {
  try {
    // Buscar foto para deletar arquivo
    const [existing] = await db.query('SELECT photo_url FROM patients WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    
    if (existing.length && existing[0].photo_url) {
      const filePath = path.join(__dirname, '../public', existing[0].photo_url.replace('/uploads-static', 'uploads'));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    const [result] = await db.query(
      'DELETE FROM patients WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Paciente não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar paciente' });
  }
});

// POST /patients/import/preview — Pré-visualiza planilha e detecta CPFs duplicados
router.post('/import/preview', memoryUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { raw: false, dateNF: 'yyyy-mm-dd' });

    const findValue = (row, ...names) => {
      const rowKeys = Object.keys(row);
      for (const name of names) {
        const key = rowKeys.find(k => k.toLowerCase().trim() === name.toLowerCase().trim());
        if (key && row[key] !== undefined && row[key] !== '') return row[key];
      }
      return null;
    };

    const preview = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = findValue(row, 'Nome', 'Nome Completo', 'Paciente');
      if (!name || String(name).toLowerCase().includes('exemplo')) continue;

      const cpf = findValue(row, 'CPF', 'Documento') || null;
      let duplicate = false;
      let existingName = null;

      if (cpf) {
        const cleanCpf = String(cpf).replace(/\D/g, '');
        const [existing] = await db.query(
          'SELECT full_name FROM patients WHERE tenant_id = ? AND REPLACE(REPLACE(REPLACE(cpf, ".", ""), "-", ""), "/", "") = ?',
          [req.user.tenant_id, cleanCpf]
        );
        if (existing.length > 0) {
          duplicate = true;
          existingName = existing[0].full_name;
        }
      }

      preview.push({
        line: i + 2,
        name,
        cpf: cpf || null,
        email: findValue(row, 'Email', 'E-mail') || null,
        phone: findValue(row, 'Telefone', 'Celular', 'WhatsApp', 'Fone') || null,
        birth_date: findValue(row, 'Data Nascimento', 'Nascimento', 'Data Nasc') || null,
        duplicate,
        existingName
      });
    }

    res.json({ preview });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao processar prévia' });
  }
});

// POST /patients/import
router.post('/import', memoryUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { raw: false, dateNF: 'yyyy-mm-dd' });

    const imported = [];
    const errors = [];
    const duplicates = [];

    // Helper para encontrar valor em colunas com nomes variados
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
        const name = findValue(row, 'Nome', 'Nome Completo', 'Paciente');

        if (!name || String(name).toLowerCase().includes('exemplo')) {
            if (!name) errors.push(`Linha ${i + 2}: Nome não encontrado`);
            continue;
        }

        // Verificar CPF duplicado antes de inserir
        const cpfRaw = findValue(row, 'CPF', 'Documento');
        if (cpfRaw) {
            const cleanCpf = String(cpfRaw).replace(/\D/g, '');
            const [existing] = await db.query(
                'SELECT full_name FROM patients WHERE tenant_id = ? AND REPLACE(REPLACE(REPLACE(cpf, ".", ""), "-", ""), "/", "") = ?',
                [req.user.tenant_id, cleanCpf]
            );
            if (existing.length > 0) {
                duplicates.push({ name, cpf: cpfRaw, existingName: existing[0].full_name });
                continue;
            }
        }

        try {
            const [result] = await db.query(
                `INSERT INTO patients (
                    tenant_id, name, email, phone, phone2, cpf, rg, birth_date, gender,
                    marital_status, education, profession, nationality, naturality,
                    has_children, children_count, minor_children_count,
                    spouse_name, family_contact, emergency_contact,
                    address, city, state, zip_code, health_plan, notes, diagnosis, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    req.user.tenant_id,
                    name,
                    findValue(row, 'Email', 'E-mail'),
                    findValue(row, 'Telefone', 'Celular', 'WhatsApp', 'Fone'),
                    findValue(row, 'Telefone 2', 'Fone 2', 'Contato'),
                    findValue(row, 'CPF', 'Documento'),
                    findValue(row, 'RG'),
                    findValue(row, 'Data Nascimento', 'Nascimento', 'Data Nasc'),
                    findValue(row, 'Gênero', 'Sexo'),
                    findValue(row, 'Estado Civil', 'Marital'),
                    findValue(row, 'Escolaridade', 'Educação'),
                    findValue(row, 'Profissão', 'Cargo'),
                    findValue(row, 'Nacionalidade'),
                    findValue(row, 'Naturalidade'),
                    String(findValue(row, 'Tem Filhos?', 'Filhos') || '').toLowerCase().includes('sim') ? 1 : 0,
                    parseInt(findValue(row, 'Qtd Filhos', 'Filhos Total')) || 0,
                    parseInt(findValue(row, 'Qtd Filhos Menores', 'Filhos Menores')) || 0,
                    findValue(row, 'Nome Cônjuge', 'Cônjuge'),
                    findValue(row, 'Contato Familiar', 'Familiar'),
                    findValue(row, 'Contato Emergência', 'Emergência'),
                    findValue(row, 'Endereço', 'Logradouro'),
                    findValue(row, 'Cidade'),
                    findValue(row, 'Estado', 'UF'),
                    findValue(row, 'CEP'),
                    String(findValue(row, 'Convênio?', 'Plano?') || '').toLowerCase().includes('sim') 
                        ? (findValue(row, 'Nome Convênio', 'Convênio', 'Plano') || 'Sim') 
                        : null,
                    findValue(row, 'Observação / Referência', 'Observação', 'Obs', 'Referência'),
                    findValue(row, 'Diagnóstico', 'Queixa'),
                    'active'
                ]
            );
            imported.push({ id: result.insertId, name });
        } catch (e) {
            errors.push(`Linha ${i + 2}: ${e.message}`);
        }
    }

    res.json({
        message: `${imported.length} pacientes importados com sucesso`,
        importedLength: imported.length,
        errors,
        duplicates
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao importar pacientes' });
  }
});

// GET /patients/:id/history — Linha do tempo completa do paciente
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;

    const safeQuery = async (sql, params) => {
      try { const [rows] = await db.query(sql, params); return rows; } catch { return []; }
    };

    const [appointments, transactions, records, documents, notes, comandas, events, peis, clinicalTools, formResponses, discResponses] = await Promise.all([
      safeQuery(
        `SELECT a.id, a.start_time as date, a.status, a.title, a.notes, a.modality,
                s.name as service_name, u.name as professional_name, a.duration_minutes,
                a.reschedule_reason
         FROM appointments a
         LEFT JOIN services s ON s.id = a.service_id
         LEFT JOIN users u ON u.id = a.professional_id
         WHERE a.patient_id = ? AND a.tenant_id = ?
         ORDER BY a.start_time DESC LIMIT 100`,
        [id, tenantId]
      ),
      safeQuery(
        `SELECT id, date, type, amount, description, category, status, payment_method
         FROM financial_transactions
         WHERE patient_id = ? AND tenant_id = ?
         ORDER BY date DESC LIMIT 100`,
        [id, tenantId]
      ),
      safeQuery(
        `SELECT r.id, r.created_at as date, r.content, u.name as professional_name, r.type
         FROM medical_records r
         LEFT JOIN users u ON u.id = r.professional_id
         WHERE r.patient_id = ? AND r.tenant_id = ?
         ORDER BY r.created_at DESC LIMIT 50`,
        [id, tenantId]
      ),
      safeQuery(
        `SELECT id, created_at as date,
                COALESCE(title, original_name, file_name, filename) as title,
                COALESCE(category, 'Documento') as category,
                COALESCE(url, file_url) as file_url,
                COALESCE(mime_type, file_type) as mime_type
         FROM uploads
         WHERE patient_id = ? AND tenant_id = ?
         ORDER BY created_at DESC LIMIT 50`,
        [id, tenantId]
      ),
      safeQuery(
        `SELECT id, created_at as date, content
         FROM notes
         WHERE patient_id = ? AND tenant_id = ?
         ORDER BY created_at DESC LIMIT 50`,
        [id, tenantId]
      ),
      safeQuery(
        `SELECT id, created_at as date, total as amount, status, description, items, payment_method
         FROM comandas
         WHERE patient_id = ? AND tenant_id = ?
         ORDER BY created_at DESC LIMIT 50`,
        [id, tenantId]
      ),
      safeQuery(
        `SELECT id, created_at as date, type, title, description
         FROM patient_events
         WHERE patient_id = ? AND tenant_id = ?
         ORDER BY created_at DESC LIMIT 50`,
        [id, tenantId]
      ),
      safeQuery(
        `SELECT id, created_at as date, title, description, start_date, end_date
         FROM pei
         WHERE patient_id = ? AND tenant_id = ?
         ORDER BY created_at DESC LIMIT 50`,
        [id, tenantId]
      ),
      safeQuery(
        `SELECT id, created_at as date, tool_type, data
         FROM clinical_tools
         WHERE patient_id = ? AND tenant_id = ?
         ORDER BY created_at DESC LIMIT 50`,
        [id, tenantId]
      ),
      safeQuery(
        `SELECT r.id, r.created_at as date, r.score, f.title as form_title, f.id as form_id
         FROM form_responses r
         JOIN forms f ON f.id = r.form_id
         WHERE r.patient_id = ? AND f.tenant_id = ?
         ORDER BY r.created_at DESC LIMIT 50`,
        [id, tenantId]
      ),
      safeQuery(
        `SELECT fr.id, fr.created_at as date, da.aurora_analysis
         FROM form_responses fr
         JOIN forms f ON f.id = fr.form_id
         LEFT JOIN disc_analysis da ON da.form_response_id = fr.id
         WHERE fr.patient_id = ? AND f.tenant_id = ? AND f.title LIKE '%DISC%'
         ORDER BY fr.created_at DESC LIMIT 20`,
        [id, tenantId]
      ),
    ]);

    const timeline = [
      ...appointments.map(a => ({
        id: `apt-${a.id}`, type: 'appointment', date: a.date,
        title: a.title || (a.modality === 'online' ? 'Sessão Online' : 'Sessão Presencial'),
        subtitle: [a.service_name, a.professional_name].filter(Boolean).join(' · '),
        status: a.status, 
        notes: a.notes,
        preview: a.duration_minutes ? `${a.duration_minutes} min` : null,
        reschedule_reason: a.reschedule_reason,
      })),
      ...transactions.map(t => ({
        id: `fin-${t.id}`, type: 'finance', date: t.date,
        title: t.description || t.category || 'Transação financeira',
        subtitle: [t.category, t.payment_method].filter(Boolean).join(' · '),
        amount: t.amount, financeType: t.type, status: t.status,
      })),
      ...records.map(r => ({
        id: `rec-${r.id}`, type: 'record', date: r.date,
        title: r.type === 'session' ? 'Evolução de Sessão' : (r.type === 'form_analysis' ? 'Análise Clínica de Formulário' : 'Prontuário'),
        subtitle: r.professional_name,
        preview: r.content ? String(r.content).slice(0, 150) : null,
      })),
      ...documents.map(d => ({
        id: `doc-${d.id}`, type: 'document', date: d.date,
        title: d.title || 'Documento',
        subtitle: d.category,
        file_url: d.file_url || null,
        mime_type: d.mime_type || null,
      })),
      ...notes.map(n => ({
        id: `note-${n.id}`, type: 'note', date: n.date,
        title: 'Anotação Interna',
        preview: n.content ? String(n.content).slice(0, 150) : null,
      })),
      ...comandas.map(c => {
        let itemsDesc = '';
        try {
          const items = typeof c.items === 'string' ? JSON.parse(c.items) : (c.items || []);
          itemsDesc = items.map(i => `${i.qty || 1}x ${i.name}`).join(', ');
        } catch (e) {}

        return {
          id: `com-${c.id}`, type: 'comanda', date: c.date,
          title: `Comanda #${c.id}`,
          subtitle: itemsDesc || c.description || 'Venda de serviços/produtos',
          amount: c.amount, status: c.status,
          notes: c.payment_method ? `Pago via ${c.payment_method}` : null
        };
      }),
      ...events.map(e => ({
        id: `ev-${e.id}`, type: e.type, date: e.date,
        title: e.title,
        subtitle: e.description,
      })),
      ...peis.map(p => ({
        id: `pei-${p.id}`, type: 'pei', date: p.date,
        title: p.title || 'Plano de Ensino Individualizado',
        subtitle: p.description ? p.description.slice(0, 100) : null,
        preview: p.start_date ? `Vigência: ${new Date(p.start_date).toLocaleDateString()} ${p.end_date ? 'até ' + new Date(p.end_date).toLocaleDateString() : ''}` : null
      })),
      ...clinicalTools.map(ct => ({
        id: `ct-${ct.id}`, type: 'tool', date: ct.date,
        title: ct.tool_type.includes('/') ? ct.tool_type.split('/')[1].toUpperCase() : 'Avaliação Clínica',
        subtitle: ct.tool_type,
      })),
      ...formResponses.map(fr => ({
        id: `fr-${fr.id}`, type: 'form', date: fr.date,
        title: fr.form_title || 'Formulário respondido',
        subtitle: fr.score != null ? `Pontuação: ${fr.score}` : null,
        link_form_id: fr.form_id,
      })),
      ...discResponses.map(dr => ({
        id: `disc-${dr.id}`, type: 'disc', date: dr.date,
        title: 'Avaliação DISC respondida',
        subtitle: dr.aurora_analysis ? 'Com análise Aurora' : null,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ timeline, counts: {
      appointments: appointments.length,
      transactions: transactions.length,
      comandas: comandas.length,
      records: records.length,
      events: events.length,
      documents: documents.length,
      notes: notes.length,
      pei: peis.length,
      tools: clinicalTools.length,
      forms: formResponses.length,
      disc: discResponses.length,
    }});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});



module.exports = router;
