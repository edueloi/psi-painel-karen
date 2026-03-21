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

// Configuração do Multer para salvamento em disco
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// POST /uploads - Upload direto de arquivo
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { patient_id, category, title } = req.body;
    const file_url = `/uploads-static/${req.file.filename}`;

    let insertId;
    try {
      // Tenta inserir com professional_id
      const [result] = await db.query(
        `INSERT INTO uploads (tenant_id, patient_id, professional_id, file_name, file_url, file_type, file_size, category, title)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.tenant_id,
          patient_id || null,
          req.user.id,
          req.file.originalname,
          file_url,
          req.file.mimetype,
          req.file.size,
          category || 'Geral',
          title || req.file.originalname
        ]
      );
      insertId = result.insertId;
    } catch (insertErr) {
      // Fallback: sem professional_id (caso coluna não exista ou tenha FK inválida)
      console.error('Upload insert com professional_id falhou, tentando sem:', insertErr.sqlMessage || insertErr.message);
      const [result2] = await db.query(
        `INSERT INTO uploads (tenant_id, patient_id, file_name, file_url, file_type, file_size, category, title)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.tenant_id,
          patient_id || null,
          req.file.originalname,
          file_url,
          req.file.mimetype,
          req.file.size,
          category || 'Geral',
          title || req.file.originalname
        ]
      );
      insertId = result2.insertId;
    }

    res.status(201).json({
      id: insertId,
      file_name: req.file.originalname,
      file_url: file_url,
      category: category || 'Geral',
      title: title || req.file.originalname,
      date: new Date()
    });
  } catch (err) {
    console.error('Erro no upload:', err.sqlMessage || err.message, err);
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
        title: u.title || u.file_name,
        file_name: u.file_name,
        file_url: u.file_url,
        date: u.created_at,
        size: u.file_size ? (u.file_size / 1024 / 1024).toFixed(2) + ' MB' : '0 MB',
        type: u.file_type?.includes('pdf') ? 'pdf' : u.file_type?.includes('image') ? 'image' : 'doc',
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
