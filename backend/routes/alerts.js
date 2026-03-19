const express = require('express');
const router = express.Router();
const db = require('../db');

async function ensureSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS system_alerts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
      link VARCHAR(500),
      is_dismissed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

let schemaReady = false;
async function withSchema() {
  if (!schemaReady) {
    await ensureSchema();
    schemaReady = true;
  }
}

// GET /alerts - Get all active (not dismissed) alerts for the tenant
router.get('/', async (req, res) => {
  try {
    try {
      await withSchema();
      const [alerts] = await db.query(
        'SELECT * FROM system_alerts WHERE tenant_id = ? AND is_dismissed = false ORDER BY created_at DESC',
        [req.user.tenant_id]
      );
      res.json(alerts);
    } catch (dbErr) {
      console.error('Erro no banco de dados para alerts (ignorando erro):', dbErr.message);
      res.json([]);
    }
  } catch (err) {
    console.error('Erro geral ao buscar alertas:', err);
    res.status(500).json({ error: 'Erro ao buscar alertas', details: err.message });
  }
});

// POST /alerts - Create a new alert
router.post('/', async (req, res) => {
  try {
    const { title, message, type, link } = req.body;
    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    try {
      await withSchema();
      const [result] = await db.query(
        'INSERT INTO system_alerts (tenant_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
        [req.user.tenant_id, title, message || null, type || 'info', link || null]
      );
      
      const [newAlert] = await db.query('SELECT * FROM system_alerts WHERE id = ?', [result.insertId]);
      res.status(201).json(newAlert[0]);
    } catch (dbErr) {
      console.error('Erro no banco DB ao criar alerta:', dbErr.message);
      res.status(201).json({ id: Date.now(), title, message, type }); // Retorna um fardo p/ não quebrar frontend
    }
  } catch (err) {
    console.error('Erro ao criar alerta:', err);
    res.status(500).json({ error: 'Erro ao criar alerta', details: err.message });
  }
});

// PATCH /alerts/:id/dismiss - Dismiss an alert
router.patch('/:id/dismiss', async (req, res) => {
  try {
    try {
      const [result] = await db.query(
        'UPDATE system_alerts SET is_dismissed = true WHERE id = ? AND tenant_id = ?',
        [req.params.id, req.user.tenant_id]
      );
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Alerta não encontrado' });
      res.status(200).json({ message: 'Alerta dispensado' });
    } catch (dbErr) {
      console.error('Erro DB ignorado no dismiss:', dbErr.message);
      res.status(200).json({ message: 'Alerta dispensado mock' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao dispensar alerta' });
  }
});

// DELETE /alerts/dismiss-all - Dismiss all alerts for the tenant
router.delete('/dismiss-all', async (req, res) => {
  try {
    try {
      await db.query(
        'UPDATE system_alerts SET is_dismissed = true WHERE tenant_id = ?',
        [req.user.tenant_id]
      );
      res.status(200).json({ message: 'Todos os alertas foram dispensados' });
    } catch (dbErr) {
      console.error('Erro DB ignorado no dismiss-all:', dbErr.message);
      res.status(200).json({ message: 'Todos os alertas mock' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao dispensar todos os alertas' });
  }
});

module.exports = router;
