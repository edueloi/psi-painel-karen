const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Garante que a tabela uploads existe e todas as colunas necessárias existem
(async () => {
  try {
    // Tabela base
    await db.query(`
      CREATE TABLE IF NOT EXISTS uploads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NULL,
        patient_id INT,
        professional_id INT,
        file_name VARCHAR(255) NOT NULL,
        file_url LONGTEXT,
        file_type VARCHAR(100),
        file_size INT,
        category VARCHAR(100) DEFAULT 'Geral',
        title VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Garante colunas de compatibilidade que o código usa no INSERT
    const cols = [
      { name: 'uploaded_by', def: 'INT NULL' },
      { name: 'filename', def: 'VARCHAR(255) NULL' },
      { name: 'original_name', def: 'VARCHAR(255) NULL' },
      { name: 'url', def: 'VARCHAR(500) NULL' },
      { name: 'mime_type', def: 'VARCHAR(100) NULL' },
      { name: 'size', def: 'INT NULL' },
      { name: 'status', def: "VARCHAR(20) DEFAULT 'uploaded'" },
      { name: 'description', def: 'TEXT NULL' }
    ];
    for (const col of cols) {
      await db.query(`ALTER TABLE uploads ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`).catch(() => {});
    }
    await db.query(`ALTER TABLE uploads MODIFY COLUMN tenant_id INT NULL`).catch(() => {});
    await db.query(`ALTER TABLE uploads MODIFY COLUMN file_url LONGTEXT NULL`).catch(() => {});
    await db.query(`ALTER TABLE uploads MODIFY COLUMN url LONGTEXT NULL`).catch(() => {});
  } catch (err) {
    console.error('Erro ao configurar tabela uploads:', err.message);
  }
})();

// Garante que o diretório de uploads existe na inicialização
const UPLOAD_DIR = path.join(__dirname, '../public/uploads');
try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); } catch (_) {}

// Configuração do Multer para salvamento em disco
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Helper para formatar categoria e descrição baseado no paciente
async function getPatientFileInfo(tenant_id, patient_id) {
  if (!patient_id) return { category: 'Geral', description: null };
  try {
    const [rows] = await db.query(
      'SELECT name, cpf, cpf_cnpj FROM patients WHERE id = ? AND tenant_id = ?',
      [patient_id, tenant_id]
    );
    if (rows.length === 0) return { category: 'Geral', description: null };
    const p = rows[0];
    const fullName = p.name || 'Paciente';
    const cpf = p.cpf || p.cpf_cnpj || null;
    
    // Formata Nome: Primeiro_Ultimo (ex: Luan_Santos)
    const parts = fullName.split(' ').filter(Boolean);
    let formattedName = parts[0];
    if (parts.length > 1) formattedName += '_' + parts[parts.length - 1];
    
    return { category: formattedName, description: cpf };
  } catch (err) {
    console.error('Erro ao buscar info do paciente para upload:', err);
    return { category: 'Geral', description: null };
  }
}

// POST /uploads - Upload direto de arquivo
router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err.code, err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Arquivo muito grande. Máximo 25MB.' });
      }
      return res.status(400).json({ error: 'Erro no envio do arquivo: ' + err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { patient_id, category: reqCategory, title } = req.body;
    const info = req.user.tenant_id ? await getPatientFileInfo(req.user.tenant_id, patient_id) : { category: 'Perfil-Master', description: 'Master Admin' };
    const file_url = `/uploads-static/${req.file.filename}`;

    const [result] = await db.query(
      `INSERT INTO uploads (tenant_id, patient_id, uploaded_by, professional_id, filename, original_name, file_name, url, file_url, mime_type, file_type, size, file_size, category, title, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id || null,
        patient_id || null,
        req.user.id,
        req.user.id,
        req.file.filename,
        req.file.originalname,
        req.file.originalname,
        file_url,
        file_url,
        req.file.mimetype,
        req.file.mimetype,
        req.file.size,
        req.file.size,
        reqCategory || info.category,
        title || req.file.originalname,
        info.description
      ]
    );

    res.status(201).json({
      id: result.insertId,
      file_name: req.file.originalname,
      file_url: file_url,
      url: file_url,
      category: reqCategory || info.category,
      title: title || req.file.originalname,
      date: new Date()
    });
  } catch (err) {
    console.error('Erro no upload:', err.sqlMessage || err.message);
    res.status(500).json({ error: 'Erro ao fazer upload', detail: err.sqlMessage || err.message });
  }
});

// Mock compatibility endpoints for old frontend logic
router.post('/request', async (req, res) => {
    // Apenas retorna um ID temporário se necessário, mas idealmente migrar frontend
    res.json({ id: Date.now() });
});

router.put('/:id/confirm', async (req, res) => {
    try {
        const { file_url, status, patient_id } = req.body;
        const { category, description } = await getPatientFileInfo(req.user.tenant_id, patient_id);
        
        // Se receber um DataURL aqui, salva no banco (fallback)
        await db.query(
            `INSERT INTO uploads (tenant_id, patient_id, professional_id, file_name, file_url, file_type, status, category, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.tenant_id, patient_id || null, req.user.id, 'Novo Arquivo', file_url, 'data-url', status || 'uploaded', category, description]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /uploads
router.get('/', async (req, res) => {
  try {
    const { patient_id } = req.query;

    let query = 'SELECT * FROM uploads WHERE tenant_id = ?';
    const params = [req.user.tenant_id];

    if (patient_id) { query += ' AND patient_id = ?'; params.push(patient_id); }
    query += ' ORDER BY created_at DESC';

    const [uploads] = await db.query(query, params);
    // Mapear campos para compatibilidade com o frontend se necessário
    const mapped = uploads.map(u => ({
        id: u.id,
        title: u.title || u.original_name || u.file_name,
        file_name: u.original_name || u.file_name,
        file_url: u.url || u.file_url,
        date: u.created_at,
        size: (u.size || u.file_size) ? ((u.size || u.file_size) / 1024 / 1024).toFixed(2) + ' MB' : '0 MB',
        type: (u.mime_type || u.file_type)?.includes('pdf') ? 'pdf' : (u.mime_type || u.file_type)?.includes('image') ? 'image' : 'doc',
        category: u.category || 'Geral'
    }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar uploads' });
  }
});

// DELETE /uploads/:id
router.delete('/:id', async (req, res) => {
  try {
    // 1. Busca o arquivo para saber o nome físico no disco antes de deletar do banco
    const [rows] = await db.query(
      'SELECT filename FROM uploads WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Arquivo não encontrado' });

    const filename = rows[0].filename;

    // 2. Deleta do banco de dados
    await db.query(
      'DELETE FROM uploads WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );

    // 3. Tenta deletar o arquivo físico (se existir)
    if (filename) {
      const filePath = path.join(UPLOAD_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[FileDelete] Arquivo físico ${filename} removido.`);
      }
    }

    res.status(204).send();
  } catch (err) {
    console.error('Erro ao deletar documento:', err);
    res.status(500).json({ error: 'Erro ao deletar arquivo' });
  }
});

module.exports = router;
