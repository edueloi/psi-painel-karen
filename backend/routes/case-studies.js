const express = require('express');
const router = express.Router();
const db = require('../db');
const { ensureStatements } = require('../utils/schemaMigrate');

// Garante colunas extras e ajustes nas tabelas (aditivo: nunca remove nem altera dados existentes)
ensureStatements([
  // cards
  'ALTER TABLE case_study_cards ADD COLUMN patient_id INT NULL',
  'ALTER TABLE case_study_cards ADD COLUMN description TEXT NULL',
  'ALTER TABLE case_study_cards ADD COLUMN tags_json TEXT NULL',
  'ALTER TABLE case_study_cards ADD COLUMN details_json TEXT NULL',
  'ALTER TABLE case_study_cards MODIFY COLUMN title VARCHAR(255) NULL',
  'ALTER TABLE case_study_cards ADD COLUMN priority ENUM("low","medium","high","urgent") DEFAULT "medium"',
  'ALTER TABLE case_study_cards ADD COLUMN due_date DATE NULL',
  'ALTER TABLE case_study_cards ADD COLUMN card_type VARCHAR(50) NULL',
  'ALTER TABLE case_study_cards ADD COLUMN assignee VARCHAR(255) NULL',
  'ALTER TABLE case_study_cards ADD COLUMN amount DECIMAL(10,2) NULL',
  'ALTER TABLE case_study_cards ADD COLUMN color VARCHAR(20) NULL',
  'ALTER TABLE case_study_cards ADD COLUMN links_json LONGTEXT NULL',
  'ALTER TABLE case_study_cards ADD COLUMN checklist_json LONGTEXT NULL',
  // boards
  'ALTER TABLE case_study_boards ADD COLUMN board_type VARCHAR(50) DEFAULT "geral"',
  'ALTER TABLE case_study_boards ADD COLUMN color VARCHAR(50) NULL',
  'ALTER TABLE case_study_boards ADD COLUMN icon VARCHAR(40) NULL',
  'ALTER TABLE case_study_boards ADD COLUMN archived TINYINT(1) NOT NULL DEFAULT 0',
  'ALTER TABLE case_study_columns ADD COLUMN color VARCHAR(20) NULL',
], 'case-studies');

const BOARD_TYPES = ['geral', 'clinico', 'projeto', 'financeiro', 'atividade', 'funil', 'documentos', 'branco'];

// Colunas padrão por tipo de quadro: [titulo, posicao, cor]
const DEFAULT_COLUMNS = {
  geral:       [['A Fazer', 0, '#94a3b8'], ['Em Progresso', 1, '#3b82f6'], ['Concluído', 2, '#10b981']],
  clinico:     [['Avaliação', 0, '#f59e0b'], ['Em Acompanhamento', 1, '#3b82f6'], ['Alta/Encerrado', 2, '#10b981']],
  projeto:     [['Backlog', 0, '#94a3b8'], ['Em Andamento', 1, '#3b82f6'], ['Revisão', 2, '#8b5cf6'], ['Entregue', 3, '#10b981']],
  financeiro:  [['A Receber', 0, '#f59e0b'], ['Recebido', 1, '#10b981'], ['A Pagar', 2, '#ef4444'], ['Pago', 3, '#14b8a6']],
  atividade:   [['Planejado', 0, '#94a3b8'], ['Em Execução', 1, '#3b82f6'], ['Finalizado', 2, '#10b981']],
  funil:       [['Captação', 0, '#94a3b8'], ['Primeira sessão', 1, '#3b82f6'], ['Ativo', 2, '#10b981'], ['Pausado', 3, '#f59e0b'], ['Alta', 4, '#8b5cf6']],
  documentos:  [['A preparar', 0, '#94a3b8'], ['Enviado', 1, '#3b82f6'], ['Aguardando assinatura', 2, '#f59e0b'], ['Concluído', 3, '#10b981']],
  branco:      [['Coluna 1', 0, '#94a3b8']],
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
// aceita hex (#rrggbb) e as classes legadas (bg-slate-400); qualquer outra coisa vira null
const cleanColor = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const v = String(value).trim();
  return HEX_RE.test(v) || /^bg-[a-z]+-\d{2,3}$/.test(v) ? v : null;
};
const toJson = (value) => (value === undefined ? undefined : value === null ? null : JSON.stringify(value));

async function boardOwned(boardId, tenantId) {
  const [rows] = await db.query('SELECT id FROM case_study_boards WHERE id = ? AND tenant_id = ?', [boardId, tenantId]);
  return rows.length > 0;
}
async function cardOwned(cardId, tenantId) {
  const [rows] = await db.query(
    `SELECT c.id FROM case_study_cards c
     JOIN case_study_boards b ON b.id = c.board_id
     WHERE c.id = ? AND b.tenant_id = ?`,
    [cardId, tenantId]
  );
  return rows.length > 0;
}
// O paciente vinculado precisa ser do mesmo tenant
async function patientAllowed(patientId, tenantId) {
  if (!patientId) return true;
  const [rows] = await db.query('SELECT id FROM patients WHERE id = ? AND tenant_id = ?', [patientId, tenantId]);
  return rows.length > 0;
}
const CARD_SELECT = `SELECT c.*, p.name AS patient_name
       FROM case_study_cards c
       LEFT JOIN patients p ON p.id = c.patient_id`;

// GET /case-studies/boards
router.get('/boards', async (req, res) => {
  try {
    const [boards] = await db.query(
      `SELECT b.*,
              (SELECT COUNT(*) FROM case_study_columns col WHERE col.board_id = b.id) AS column_count,
              (SELECT COUNT(*) FROM case_study_cards c WHERE c.board_id = b.id)       AS card_count
       FROM case_study_boards b
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
      'SELECT * FROM case_study_columns WHERE board_id = ? ORDER BY position, id',
      [board.id]
    );

    for (const col of columns) {
      const [cards] = await db.query(
        `${CARD_SELECT}
         WHERE c.column_id = ?
         ORDER BY c.position, c.id`,
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
    const { title, description, board_type, color, icon, columns } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ error: 'Título é obrigatório' });

    const type = BOARD_TYPES.includes(board_type) ? board_type : 'geral';
    const [result] = await db.query(
      'INSERT INTO case_study_boards (tenant_id, title, description, created_by, board_type, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.tenant_id, String(title).trim(), description || null, req.user.id, type, cleanColor(color) || null, icon ? String(icon).slice(0, 40) : null]
    );

    // Colunas enviadas pelo cliente (editadas antes de criar) ou padrão do tipo
    let cols = DEFAULT_COLUMNS[type];
    if (Array.isArray(columns) && columns.length > 0) {
      cols = columns
        .filter((c) => c && String(c.title || '').trim())
        .slice(0, 20)
        .map((c, i) => [String(c.title).trim().slice(0, 255), i, cleanColor(c.color) || null]);
    }
    if (!cols || cols.length === 0) cols = DEFAULT_COLUMNS.geral;
    for (const [colTitle, position, colColor] of cols) {
      await db.query(
        'INSERT INTO case_study_columns (board_id, title, position, color) VALUES (?, ?, ?, ?)',
        [result.insertId, colTitle, position, colColor]
      );
    }

    const [board] = await db.query('SELECT * FROM case_study_boards WHERE id = ?', [result.insertId]);
    res.status(201).json(board[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar board' });
  }
});

// PUT /case-studies/boards/:id  (editar nome, descrição, cor e ícone)
router.put('/boards/:id', async (req, res) => {
  try {
    if (!(await boardOwned(req.params.id, req.user.tenant_id))) return res.status(404).json({ error: 'Board não encontrado' });
    const { title, description, color, icon } = req.body;
    const sets = [];
    const params = [];
    if (title !== undefined) {
      if (!String(title).trim()) return res.status(400).json({ error: 'Título é obrigatório' });
      sets.push('title = ?'); params.push(String(title).trim());
    }
    if (description !== undefined) { sets.push('description = ?'); params.push(description || null); }
    if (color !== undefined) { sets.push('color = ?'); params.push(cleanColor(color) || null); }
    if (icon !== undefined) { sets.push('icon = ?'); params.push(icon ? String(icon).slice(0, 40) : null); }
    if (sets.length > 0) {
      await db.query(`UPDATE case_study_boards SET ${sets.join(', ')} WHERE id = ? AND tenant_id = ?`, [...params, req.params.id, req.user.tenant_id]);
    }
    const [board] = await db.query('SELECT * FROM case_study_boards WHERE id = ?', [req.params.id]);
    res.json(board[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar board' });
  }
});

// PATCH /case-studies/boards/:id/archive  { archived: boolean }
router.patch('/boards/:id/archive', async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE case_study_boards SET archived = ? WHERE id = ? AND tenant_id = ?',
      [req.body.archived ? 1 : 0, req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Board não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao arquivar board' });
  }
});

// POST /case-studies/boards/:id/duplicate  (copia estrutura; cartões só com { with_cards: true })
router.post('/boards/:id/duplicate', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM case_study_boards WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Board não encontrado' });
    const src = rows[0];
    const [created] = await db.query(
      'INSERT INTO case_study_boards (tenant_id, title, description, created_by, board_type, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.tenant_id, `${src.title} (cópia)`.slice(0, 255), src.description, req.user.id, src.board_type || 'geral', src.color || null, src.icon || null]
    );
    const newId = created.insertId;
    const [cols] = await db.query('SELECT * FROM case_study_columns WHERE board_id = ? ORDER BY position, id', [src.id]);
    for (const col of cols) {
      const [nc] = await db.query(
        'INSERT INTO case_study_columns (board_id, title, position, color) VALUES (?, ?, ?, ?)',
        [newId, col.title, col.position, col.color || null]
      );
      if (req.body.with_cards) {
        const [cards] = await db.query('SELECT * FROM case_study_cards WHERE column_id = ? ORDER BY position, id', [col.id]);
        for (const c of cards) {
          await db.query(
            `INSERT INTO case_study_cards
               (board_id, column_id, patient_id, title, description, tags_json, details_json, position, priority, due_date, card_type, assignee, amount, color, links_json, checklist_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [newId, nc.insertId, c.patient_id, c.title, c.description, c.tags_json, c.details_json, c.position, c.priority, c.due_date, c.card_type, c.assignee, c.amount, c.color, c.links_json, c.checklist_json]
          );
        }
      }
    }
    const [board] = await db.query('SELECT * FROM case_study_boards WHERE id = ?', [newId]);
    res.status(201).json(board[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao duplicar board' });
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
    if (!(await boardOwned(req.params.boardId, req.user.tenant_id))) return res.status(404).json({ error: 'Board não encontrado' });
    const { title, color } = req.body;
    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    const [maxPos] = await db.query(
      'SELECT MAX(position) as max FROM case_study_columns WHERE board_id = ?',
      [req.params.boardId]
    );
    const position = (maxPos[0].max === null || maxPos[0].max === undefined ? -1 : maxPos[0].max) + 1;

    const [result] = await db.query(
      'INSERT INTO case_study_columns (board_id, title, position, color) VALUES (?, ?, ?, ?)',
      [req.params.boardId, title, position, cleanColor(color) || null]
    );

    const [col] = await db.query('SELECT * FROM case_study_columns WHERE id = ?', [result.insertId]);
    res.status(201).json(col[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar coluna' });
  }
});

// PUT /case-studies/boards/:boardId/columns-order  { ids: [colId, ...] }
router.put('/boards/:boardId/columns-order', async (req, res) => {
  try {
    if (!(await boardOwned(req.params.boardId, req.user.tenant_id))) return res.status(404).json({ error: 'Board não encontrado' });
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    for (let i = 0; i < ids.length; i++) {
      await db.query('UPDATE case_study_columns SET position = ? WHERE id = ? AND board_id = ?', [i, ids[i], req.params.boardId]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao reordenar colunas' });
  }
});

// PUT /case-studies/boards/:boardId/columns/:columnId
router.put('/boards/:boardId/columns/:columnId', async (req, res) => {
  try {
    if (!(await boardOwned(req.params.boardId, req.user.tenant_id))) return res.status(404).json({ error: 'Board não encontrado' });
    const { title, position, color } = req.body;

    await db.query(
      'UPDATE case_study_columns SET title = COALESCE(?, title), position = COALESCE(?, position), color = COALESCE(?, color) WHERE id = ? AND board_id = ?',
      [title || null, position ?? null, cleanColor(color) || null, req.params.columnId, req.params.boardId]
    );

    const [col] = await db.query('SELECT * FROM case_study_columns WHERE id = ?', [req.params.columnId]);
    res.json(col[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar coluna' });
  }
});

// POST /case-studies/boards/:boardId/columns/:columnId/apply-color  { color: '#rrggbb' | null }
router.post('/boards/:boardId/columns/:columnId/apply-color', async (req, res) => {
  try {
    if (!(await boardOwned(req.params.boardId, req.user.tenant_id))) return res.status(404).json({ error: 'Board não encontrado' });
    const color = cleanColor(req.body.color);
    await db.query(
      'UPDATE case_study_cards SET color = ? WHERE column_id = ? AND board_id = ?',
      [color || null, req.params.columnId, req.params.boardId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao aplicar cor' });
  }
});

// DELETE /case-studies/boards/:boardId/columns/:columnId
router.delete('/boards/:boardId/columns/:columnId', async (req, res) => {
  try {
    if (!(await boardOwned(req.params.boardId, req.user.tenant_id))) return res.status(404).json({ error: 'Board não encontrado' });
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
    if (!(await boardOwned(req.params.boardId, req.user.tenant_id))) return res.status(404).json({ error: 'Board não encontrado' });
    const { column_id, patient_id, title, description, tags, details, sort_order, priority, due_date, card_type, assignee, amount, color, links, checklist } = req.body;
    if (!column_id || !title) {
      return res.status(400).json({ error: 'Coluna e título são obrigatórios' });
    }
    const [colRows] = await db.query('SELECT id FROM case_study_columns WHERE id = ? AND board_id = ?', [column_id, req.params.boardId]);
    if (colRows.length === 0) return res.status(400).json({ error: 'Coluna inválida' });
    if (!(await patientAllowed(patient_id, req.user.tenant_id))) return res.status(400).json({ error: 'Paciente inválido' });

    const [maxPos] = await db.query(
      'SELECT MAX(position) as max FROM case_study_cards WHERE column_id = ?',
      [column_id]
    );
    const position = sort_order !== undefined ? sort_order : ((maxPos[0].max || 0) + 1);

    const [result] = await db.query(
      `INSERT INTO case_study_cards
         (board_id, column_id, patient_id, title, description, tags_json, details_json, position, priority, due_date, card_type, assignee, amount, color, links_json, checklist_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.boardId, column_id, patient_id || null,
        title, description || null,
        tags ? JSON.stringify(tags) : null,
        details ? JSON.stringify(details) : null,
        position, ['low', 'medium', 'high', 'urgent'].includes(priority) ? priority : 'medium',
        due_date || null, card_type || null,
        assignee || null, amount || null,
        cleanColor(color) || null,
        links ? JSON.stringify(links) : null,
        checklist ? JSON.stringify(checklist) : null,
      ]
    );

    const [card] = await db.query(`${CARD_SELECT} WHERE c.id = ?`, [result.insertId]);
    res.status(201).json(card[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar card' });
  }
});

// PUT /case-studies/cards/:cardId  (atualiza só os campos enviados)
router.put('/cards/:cardId', async (req, res) => {
  try {
    if (!(await cardOwned(req.params.cardId, req.user.tenant_id))) return res.status(404).json({ error: 'Card não encontrado' });
    const b = req.body;
    const sets = [];
    const params = [];
    const set = (col, val) => { sets.push(`${col} = ?`); params.push(val); };

    if (b.patient_id !== undefined) {
      if (!(await patientAllowed(b.patient_id, req.user.tenant_id))) return res.status(400).json({ error: 'Paciente inválido' });
      set('patient_id', b.patient_id || null);
    }
    if (b.title) set('title', b.title);
    if (b.description !== undefined) set('description', b.description || null);
    if (b.tags !== undefined) set('tags_json', toJson(b.tags));
    if (b.details !== undefined) set('details_json', toJson(b.details));
    if (b.links !== undefined) set('links_json', toJson(b.links));
    if (b.checklist !== undefined) set('checklist_json', toJson(b.checklist));
    if (b.column_id) {
      const [colRows] = await db.query(
        `SELECT col.id FROM case_study_columns col
         JOIN case_study_cards c ON c.board_id = col.board_id
         WHERE col.id = ? AND c.id = ?`,
        [b.column_id, req.params.cardId]
      );
      if (colRows.length === 0) return res.status(400).json({ error: 'Coluna inválida' });
      set('column_id', b.column_id);
    }
    if (b.sort_order !== undefined && b.sort_order !== null) set('position', b.sort_order);
    if (['low', 'medium', 'high', 'urgent'].includes(b.priority)) set('priority', b.priority);
    if (b.due_date !== undefined) set('due_date', b.due_date || null);
    if (b.card_type) set('card_type', b.card_type);
    if (b.assignee !== undefined) set('assignee', b.assignee || null);
    if (b.amount !== undefined) set('amount', b.amount === '' || b.amount === null ? null : b.amount);
    if (b.color !== undefined) set('color', cleanColor(b.color) || null);

    if (sets.length > 0) {
      await db.query(`UPDATE case_study_cards SET ${sets.join(', ')} WHERE id = ?`, [...params, req.params.cardId]);
    }

    const [card] = await db.query(`${CARD_SELECT} WHERE c.id = ?`, [req.params.cardId]);
    res.json(card[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar card' });
  }
});

// PATCH /case-studies/cards/:cardId/move
router.patch('/cards/:cardId/move', async (req, res) => {
  try {
    if (!(await cardOwned(req.params.cardId, req.user.tenant_id))) return res.status(404).json({ error: 'Card não encontrado' });
    const { column_id, sort_order } = req.body;
    const [colRows] = await db.query(
      `SELECT col.id FROM case_study_columns col
       JOIN case_study_cards c ON c.board_id = col.board_id
       WHERE col.id = ? AND c.id = ?`,
      [column_id, req.params.cardId]
    );
    if (colRows.length === 0) return res.status(400).json({ error: 'Coluna inválida' });

    await db.query(
      'UPDATE case_study_cards SET column_id = ?, position = ? WHERE id = ?',
      [column_id, sort_order || 0, req.params.cardId]
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
    if (!(await cardOwned(req.params.cardId, req.user.tenant_id))) return res.status(404).json({ error: 'Card não encontrado' });
    await db.query('DELETE FROM case_study_cards WHERE id = ?', [req.params.cardId]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar card' });
  }
});

module.exports = router;
