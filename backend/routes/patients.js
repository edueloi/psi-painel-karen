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

    if (!name) return res.status(404).json({ error: 'Nome é obrigatório' });

    const [result] = await db.query(
      `INSERT INTO patients (
        tenant_id, name, email, phone, phone2, birth_date, cpf, rg, gender,
        marital_status, education, profession, nationality, naturality,
        has_children, children_count, minor_children_count,
        spouse_name, family_contact, emergency_contact,
        address, city, state, zip_code, notes, status,
        responsible_professional_id, responsible_name,
        responsible_phone, health_plan, diagnosis, photo_url
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
        responsible_phone || null, health_plan || null, diagnosis || null, photo_url || null
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
      'SELECT id FROM patients WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Paciente não encontrado' });

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
        diagnosis = COALESCE(?, diagnosis),
        photo_url = COALESCE(?, photo_url)
      WHERE id = ? AND tenant_id = ?`,
      [
        name, email, phone, phone2, birth_date, cpf, rg, gender,
        marital_status, education, profession, nationality, naturality,
        has_children !== undefined ? (has_children ? 1 : 0) : undefined,
        children_count, minor_children_count,
        spouse_name, family_contact, emergency_contact,
        address, city, state, zip_code, notes, status ? normalizeStatus(status) : undefined,
        responsible_professional_id, responsible_name,
        responsible_phone, health_plan, diagnosis, photo_url,
        req.params.id, req.user.tenant_id
      ]
    );

    const [updated] = await db.query('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar paciente' });
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
        errors
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao importar pacientes' });
  }
});

module.exports = router;
