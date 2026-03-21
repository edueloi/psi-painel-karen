const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const DISC_OPTIONS_MAP = { 'Nunca': 1, 'Raramente': 2, 'Às vezes': 3, 'Frequentemente': 4, 'Quase sempre': 5 };
const DISC_BLOCKS = {
  D: ['q1','q2','q3','q4','q5','q6','q7','q8'],
  I: ['q9','q10','q11','q12','q13','q14','q15'],
  S: ['q16','q17','q18','q19','q20','q21','q22'],
  C: ['q23','q24','q25','q26','q27','q28','q29','q30'],
};

async function ensureDiscAnalysisTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS disc_analysis (
      id INT AUTO_INCREMENT PRIMARY KEY,
      form_response_id INT NOT NULL,
      tenant_id INT NOT NULL,
      aurora_analysis TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_response (form_response_id)
    )
  `);
}
ensureDiscAnalysisTable().catch(e => console.warn('disc_analysis table:', e.message));

function computeScores(answers) {
  const blocks = { D: [], I: [], S: [], C: [] };
  for (const [block, ids] of Object.entries(DISC_BLOCKS)) {
    for (const id of ids) {
      const raw = answers[id];
      const val = DISC_OPTIONS_MAP[raw] ?? parseFloat(raw);
      if (!isNaN(val)) blocks[block].push(val);
    }
  }
  const avg = arr => arr.length > 0 ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : 0;
  return { score_d: avg(blocks.D), score_i: avg(blocks.I), score_s: avg(blocks.S), score_c: avg(blocks.C) };
}

// GET /disc/form — retorna o formulário DISC do tenant (hash para compartilhar)
router.get('/form', authMiddleware, async (req, res) => {
  try {
    const [forms] = await db.query(
      `SELECT id, title, hash FROM forms
       WHERE tenant_id = ? AND (title LIKE '%DISC%' OR title LIKE '%Autoconhecimento Comportamental%')
       ORDER BY id ASC LIMIT 1`,
      [req.user.tenant_id]
    );
    if (forms.length) return res.json(forms[0]);
    // Fallback: form com questões DISC (block property)
    const [byBlock] = await db.query(
      `SELECT id, title, hash FROM forms WHERE tenant_id = ? AND fields LIKE '%"block"%' LIMIT 1`,
      [req.user.tenant_id]
    );
    res.json(byBlock[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /disc — lista avaliações DISC do tenant
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { patient_id } = req.query;

    // Descobre o form_id do DISC para este tenant
    // Tenta pelo título com DISC, depois pelo título padrão do DEFAULT_FORMS, depois pela estrutura (bloco D/I/S/C)
    let discFormId = null;
    const [byTitle] = await db.query(
      `SELECT id FROM forms WHERE tenant_id = ? AND (title LIKE '%DISC%' OR title LIKE '%Autoconhecimento Comportamental%') ORDER BY id ASC LIMIT 1`,
      [req.user.tenant_id]
    );
    if (byTitle.length) {
      discFormId = byTitle[0].id;
    } else {
      // Fallback: procura form com questão tendo "block" nos campos JSON
      const [allForms] = await db.query(
        `SELECT id, fields FROM forms WHERE tenant_id = ? AND fields LIKE '%"block"%' LIMIT 1`,
        [req.user.tenant_id]
      );
      if (allForms.length) discFormId = allForms[0].id;
    }
    if (!discFormId) return res.json([]);

    let sql = `
      SELECT fr.id, fr.patient_id, fr.respondent_name, fr.respondent_email,
             fr.data, fr.score, fr.created_at,
             p.name as patient_name
      FROM form_responses fr
      LEFT JOIN patients p ON p.id = fr.patient_id
      WHERE fr.form_id = ?
    `;
    const params = [discFormId];

    if (patient_id) {
      sql += ' AND fr.patient_id = ?';
      params.push(patient_id);
    }

    sql += ' ORDER BY fr.created_at DESC';

    const [rows] = await db.query(sql, params);

    // Busca análises Aurora separadamente (tabela pode não existir ainda)
    const analysisMap = {};
    try {
      if (rows.length > 0) {
        const ids = rows.map(r => r.id);
        const [daRows] = await db.query(
          `SELECT form_response_id, aurora_analysis, notes FROM disc_analysis WHERE form_response_id IN (?)`,
          [ids]
        );
        daRows.forEach(da => { analysisMap[da.form_response_id] = da; });
      }
    } catch (_) {}

    const results = rows.map(row => {
      let answers = {};
      try {
        const parsed = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        answers = parsed?.answers || parsed || {};
      } catch (_) {}
      const scores = computeScores(answers);
      const da = analysisMap[row.id] || {};
      return {
        id: row.id,
        patient_id: row.patient_id,
        patient_name: row.patient_name || row.respondent_name || 'Anônimo',
        respondent_name: row.respondent_name,
        respondent_email: row.respondent_email,
        answers,
        score_total: row.score || 0,
        score_d: scores.score_d,
        score_i: scores.score_i,
        score_s: scores.score_s,
        score_c: scores.score_c,
        aurora_analysis: da.aurora_analysis || null,
        notes: da.notes || null,
        created_at: row.created_at,
      };
    });

    res.json(results);
  } catch (err) {
    console.error('GET /disc error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /disc/:id/aurora — salva análise Aurora
router.patch('/:id/aurora', authMiddleware, async (req, res) => {
  try {
    const { analysis, notes } = req.body;
    await db.query(
      `INSERT INTO disc_analysis (form_response_id, tenant_id, aurora_analysis, notes)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE aurora_analysis = VALUES(aurora_analysis), notes = COALESCE(VALUES(notes), notes)`,
      [req.params.id, req.user.tenant_id, analysis || null, notes || null]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /disc/:id — deleta avaliação
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Verifica se pertence ao tenant via form
    const [rows] = await db.query(
      `SELECT fr.id FROM form_responses fr
       JOIN forms f ON f.id = fr.form_id
       WHERE fr.id = ? AND f.tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Não encontrado' });

    await db.query('DELETE FROM disc_analysis WHERE form_response_id = ?', [req.params.id]);
    await db.query('DELETE FROM form_responses WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
