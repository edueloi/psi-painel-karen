const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Garante que a tabela uploads existe e todas as colunas necessárias existem
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS uploads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        patient_id INT,
        professional_id INT,
        file_name VARCHAR(255) NOT NULL,
        file_url VARCHAR(500),
        file_type VARCHAR(100),
        file_size INT,
        category VARCHAR(100),
        title VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    // Garante colunas adicionais que podem não existir em produção
    const cols = [
      { name: 'professional_id', def: 'INT NULL' },
      { name: 'file_size', def: 'INT NULL' },
      { name: 'category', def: "VARCHAR(100) DEFAULT 'Geral'" },
      { name: 'title', def: 'VARCHAR(255) NULL' },
    ];
    for (const col of cols) {
      await db.query(`ALTER TABLE uploads ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`).catch(() => {});
    }
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

    const { patient_id, category, title } = req.body;
    const file_url = `/uploads-static/${req.file.filename}`;

    const [result] = await db.query(
      `INSERT INTO uploads (tenant_id, patient_id, uploaded_by, professional_id, filename, original_name, file_name, url, file_url, mime_type, file_type, size, file_size, category, title)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id,
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
        category || 'Geral',
        title || req.file.originalname
      ]
    );

    res.status(201).json({
      id: result.insertId,
      file_name: req.file.originalname,
      file_url: file_url,
      category: category || 'Geral',
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
        // Se receber um DataURL aqui, salva no banco (fallback)
        await db.query(
            `INSERT INTO uploads (tenant_id, patient_id, professional_id, file_name, file_url, file_type, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.user.tenant_id, patient_id || null, req.user.id, 'Novo Arquivo', file_url, 'data-url', status || 'uploaded']
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
    const [result] = await db.query(
      'DELETE FROM uploads WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Arquivo não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar arquivo' });
  }
});

module.exports = router;
