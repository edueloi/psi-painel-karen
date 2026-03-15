const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /case-studies/boards
router.get('/boards', async (req, res) => {
  try {
    const [boards] = await db.query(
      `SELECT b.*, u.name as created_by_name, p.name as patient_name
       FROM case_study_boards b
       LEFT JOIN users u ON u.id = b.created_by
       LEFT JOIN patients p ON p.id = b.patient_id
       WHERE b.tenant_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.tenant_id]
    );
    res.json(boards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar boards' });
  }
});

// GET /case-studies/boards/:boardId
router.get('/boards/:boardId', async (req, res) => {
  try {
    const [boards] = await db.query(
      'SELECT * FROM case_study_boards WHERE id = ? AND tenant_id = ?',
      [req.params.boardId, req.user.tenant_id]
    );
    if (boards.length === 0) return res.status(404).json({ error: 'Board não encontrado' });

    const board = boards[0];

    const [columns] = await db.query(
      'SELECT * FROM case_study_columns WHERE board_id = ? ORDER BY position',
      [board.id]
    );

    for (const col of columns) {
      const [cards] = await db.query(
        'SELECT * FROM case_study_cards WHERE column_id = ? ORDER BY position',
        [col.id]
      );
      col.cards = cards;
    }

    board.columns = columns;
    res.json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar board' });
  }
});

// POST /case-studies/boards
router.post('/boards', async (req, res) => {
  try {
    const { title, description, patient_id } = req.body;
    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    const [result] = await db.query(
      'INSERT INTO case_study_boards (tenant_id, title, description, patient_id, created_by) VALUES (?, ?, ?, ?, ?)',
      [req.user.tenant_id, title, description || null, patient_id || null, req.user.id]
    );

    // Criar colunas padrão
    await db.query(
      'INSERT INTO case_study_columns (board_id, title, position) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)',
      [result.insertId, 'A Fazer', 0, result.insertId, 'Em Progresso', 1, result.insertId, 'Concluído', 2]
    );

    const [board] = await db.query('SELECT * FROM case_study_boards WHERE id = ?', [result.insertId]);
    res.status(201).json(board[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar board' });
  }
});

// DELETE /case-studies/boards/:id
router.delete('/boards/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM case_study_boards WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Board não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar board' });
  }
});

// POST /case-studies/boards/:boardId/columns
router.post('/boards/:boardId/columns', async (req, res) => {
  try {
    const { title, color } = req.body;
    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    const [maxPos] = await db.query(
      'SELECT MAX(position) as max FROM case_study_columns WHERE board_id = ?',
      [req.params.boardId]
    );
    const position = (maxPos[0].max || 0) + 1;

    const [result] = await db.query(
      'INSERT INTO case_study_columns (board_id, title, position, color) VALUES (?, ?, ?, ?)',
      [req.params.boardId, title, position, color || null]
    );

    const [col] = await db.query('SELECT * FROM case_study_columns WHERE id = ?', [result.insertId]);
    res.status(201).json(col[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar coluna' });
  }
});

// PUT /case-studies/boards/:boardId/columns/:columnId
router.put('/boards/:boardId/columns/:columnId', async (req, res) => {
  try {
    const { title, position, color } = req.body;

    await db.query(
      'UPDATE case_study_columns SET title = COALESCE(?, title), position = COALESCE(?, position), color = COALESCE(?, color) WHERE id = ? AND board_id = ?',
      [title, position, color, req.params.columnId, req.params.boardId]
    );

    const [col] = await db.query('SELECT * FROM case_study_columns WHERE id = ?', [req.params.columnId]);
    res.json(col[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar coluna' });
  }
});

// DELETE /case-studies/boards/:boardId/columns/:columnId
router.delete('/boards/:boardId/columns/:columnId', async (req, res) => {
  try {
    await db.query('DELETE FROM case_study_columns WHERE id = ? AND board_id = ?', [req.params.columnId, req.params.boardId]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar coluna' });
  }
});

// POST /case-studies/boards/:boardId/cards
router.post('/boards/:boardId/cards', async (req, res) => {
  try {
    const { column_id, title, content, labels } = req.body;
    if (!column_id || !title) return res.status(400).json({ error: 'Coluna e título são obrigatórios' });

    const [maxPos] = await db.query(
      'SELECT MAX(position) as max FROM case_study_cards WHERE column_id = ?',
      [column_id]
    );
    const position = (maxPos[0].max || 0) + 1;

    const [result] = await db.query(
      'INSERT INTO case_study_cards (board_id, column_id, title, content, position, labels) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.boardId, column_id, title, content || null, position, labels ? JSON.stringify(labels) : null]
    );

    const [card] = await db.query('SELECT * FROM case_study_cards WHERE id = ?', [result.insertId]);
    res.status(201).json(card[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar card' });
  }
});

// PUT /case-studies/cards/:cardId
router.put('/cards/:cardId', async (req, res) => {
  try {
    const { title, content, column_id, position, labels } = req.body;

    await db.query(
      `UPDATE case_study_cards SET
        title = COALESCE(?, title),
        content = COALESCE(?, content),
        column_id = COALESCE(?, column_id),
        position = COALESCE(?, position),
        labels = COALESCE(?, labels)
       WHERE id = ?`,
      [title, content, column_id, position, labels ? JSON.stringify(labels) : undefined, req.params.cardId]
    );

    const [card] = await db.query('SELECT * FROM case_study_cards WHERE id = ?', [req.params.cardId]);
    res.json(card[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar card' });
  }
});

// PATCH /case-studies/cards/:cardId/move - Mover card entre colunas
router.patch('/cards/:cardId/move', async (req, res) => {
  try {
    const { column_id, position } = req.body;

    await db.query(
      'UPDATE case_study_cards SET column_id = ?, position = ? WHERE id = ?',
      [column_id, position || 0, req.params.cardId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao mover card' });
  }
});

// DELETE /case-studies/cards/:cardId
router.delete('/cards/:cardId', async (req, res) => {
  try {
    await db.query('DELETE FROM case_study_cards WHERE id = ?', [req.params.cardId]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar card' });
  }
});

module.exports = router;
