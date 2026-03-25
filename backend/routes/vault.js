const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');

// Config do Vault / Master Hash
router.get('/config', async (req, res) => {
  try {
    // Nós agora usamos a senha do usuário logado, então a resposta sempre será true.
    res.json({ hasMasterPassword: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao verificar configuração do cofre' });
  }
});

router.post('/config/verify', async (req, res) => {
  try {
    const { password } = req.body;
    
    // Buscar o hash da senha de LOGIN do usuário
    const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const hash = rows[0]?.password;
    
    if (!hash) return res.status(400).json({ error: 'Usuário sem senha configurada.' });

    const isValid = await bcrypt.compare(password, hash);
    if (!isValid) return res.status(401).json({ error: 'Credenciais inválidas. Use sua senha de login.' });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao verificar senha' });
  }
});


// Folders
router.get('/folders', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM vault_folders WHERE tenant_id = ? ORDER BY name ASC', [req.user.tenant_id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar pastas' });
  }
});

router.post('/folders', async (req, res) => {
  try {
    const { name, is_locked } = req.body;
    const secureLocked = typeof is_locked === 'boolean' ? is_locked : true;
    const [result] = await db.query(
      'INSERT INTO vault_folders (tenant_id, name, is_locked) VALUES (?, ?, ?)', 
      [req.user.tenant_id, name, secureLocked]
    );
    res.status(201).json({ id: result.insertId, name, is_locked: secureLocked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar pasta' });
  }
});

router.put('/folders/:id', async (req, res) => {
  try {
    const { name, is_locked } = req.body;
    const secureLocked = typeof is_locked === 'boolean' ? is_locked : true;
    await db.query(
      'UPDATE vault_folders SET name = ?, is_locked = ? WHERE id = ? AND tenant_id = ?',
      [name, secureLocked, req.params.id, req.user.tenant_id]
    );
    res.json({ id: req.params.id, name, is_locked: secureLocked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar pasta' });
  }
});

router.delete('/folders/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM vault_folders WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir pasta' });
  }
});

// Documents
router.get('/documents', async (req, res) => {
  try {
    const { folder_id } = req.query;
    let query = 'SELECT id, folder_id, title, is_locked, created_at, updated_at FROM vault_documents WHERE tenant_id = ?';
    let params = [req.user.tenant_id];

    if (folder_id) {
      if (folder_id === 'null' || folder_id === '') {
        query += ' AND folder_id IS NULL';
      } else {
        query += ' AND folder_id = ?';
        params.push(folder_id);
      }
    }
    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar documentos' });
  }
});

router.get('/documents/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM vault_documents WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Documento não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar documento' });
  }
});

router.post('/documents', async (req, res) => {
  try {
    const { folder_id, title, content, is_locked } = req.body;
    const secureLocked = typeof is_locked === 'boolean' ? is_locked : true;
    const [result] = await db.query(
      'INSERT INTO vault_documents (tenant_id, folder_id, title, content, is_locked) VALUES (?, ?, ?, ?, ?)',
      [req.user.tenant_id, folder_id || null, title, content, secureLocked]
    );
    res.status(201).json({ id: result.insertId, folder_id, title, content, is_locked: secureLocked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar documento' });
  }
});

router.put('/documents/:id', async (req, res) => {
  try {
    const { folder_id, title, content, is_locked } = req.body;
    const secureLocked = typeof is_locked === 'boolean' ? is_locked : true;
    await db.query(
      'UPDATE vault_documents SET folder_id = ?, title = ?, content = ?, is_locked = ? WHERE id = ? AND tenant_id = ?',
      [folder_id || null, title, content, secureLocked, req.params.id, req.user.tenant_id]
    );
    res.json({ id: req.params.id, folder_id, title, content, is_locked: secureLocked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar documento' });
  }
});

router.delete('/documents/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM vault_documents WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir documento' });
  }
});

module.exports = router;
