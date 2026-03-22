const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Auto-migrate ──────────────────────────────────────────────────────────────
async function ensureColumns() {
  const stmts = [
    "ALTER TABLE message_templates ADD COLUMN category VARCHAR(100) DEFAULT 'Outros'",
    "ALTER TABLE message_templates ADD COLUMN is_global TINYINT(1) DEFAULT 0",
  ];
  for (const sql of stmts) {
    try { await db.query(sql); } catch (e) { /* coluna já existe */ }
  }
  // Migra channel → category para templates existentes
  try {
    await db.query(`
      UPDATE message_templates
      SET category = CASE
        WHEN channel = 'whatsapp' THEN 'Lembrete'
        WHEN channel = 'email'    THEN 'Outros'
        WHEN channel = 'sms'      THEN 'Outros'
        ELSE 'Outros'
      END
      WHERE category IS NULL OR category = ''
    `);
  } catch (e) { /* ignorar */ }
}
ensureColumns();
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATES = [
  {
    name: 'Lembrete de Consulta',
    category: 'Lembrete',
    content: 'Olá, {{nome_paciente}}! 👋 Passando para lembrá-lo(a) da sua consulta amanhã, *{{data_agendamento}}* às *{{horario}}*.\n\nServiço: {{servico}}\n\nQualquer dúvida estamos à disposição! 😊\n— {{nome_clinica}}'
  },
  {
    name: 'Confirmação de Agendamento',
    category: 'Lembrete',
    content: 'Olá, {{nome_paciente}}! ✅ Seu agendamento foi confirmado.\n\n📅 Data: *{{data_agendamento}}*\n⏰ Horário: *{{horario}}*\n💼 Serviço: {{servico}}\n👤 Profissional: {{nome_profissional}}\n\nAté lá! — {{nome_clinica}}'
  },
  {
    name: 'Início de Tratamento',
    category: 'Lembrete',
    content: 'Olá, {{nome_paciente}}! 🌟 Ficamos felizes em iniciar este processo com você!\n\nSua primeira sessão está agendada para *{{data_agendamento}}* às *{{horario}}* com {{nome_profissional}}.\n\nQualquer dúvida, estamos à disposição! — {{nome_clinica}}'
  },
  {
    name: 'Cobrança Pendente',
    category: 'Financeiro',
    content: 'Olá, {{nome_paciente}}! 💳 Identificamos que você possui um valor pendente de *R$ {{valor_total}}*.\n\nPor favor, entre em contato para regularizar.\n\n— {{nome_clinica}}'
  },
  {
    name: 'Recibo de Pagamento',
    category: 'Financeiro',
    content: 'Olá, {{nome_paciente}}! 🎉 Confirmamos o recebimento do seu pagamento de *R$ {{valor_total}}* referente a {{servico}}.\n\nObrigado pela confiança! — {{nome_clinica}}'
  },
  {
    name: 'Parabéns pelo Aniversário',
    category: 'Aniversário',
    content: '🎂 Feliz aniversário, {{nome_paciente}}!\n\nToda a equipe da *{{nome_clinica}}* deseja a você um dia muito especial! Que este novo ciclo seja repleto de saúde, alegria e conquistas! 🎉'
  },
  {
    name: 'Cancelamento de Sessão',
    category: 'Outros',
    content: 'Olá, {{nome_paciente}}. Infelizmente precisamos cancelar sua sessão do dia *{{data_agendamento}}* às *{{horario}}*.\n\nEntraremos em contato para reagendar o mais breve possível.\n\nDesculpe o transtorno. — {{nome_clinica}}'
  },
  {
    name: 'Falta na Sessão',
    category: 'Outros',
    content: 'Olá, {{nome_paciente}}! Notamos sua ausência na sessão de hoje, *{{data_agendamento}}* às *{{horario}}*.\n\nEntre em contato para reagendar. — {{nome_clinica}}'
  },
];

// GET /messages/templates
router.get('/templates', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM message_templates WHERE tenant_id = ?';
    const params = [req.user.tenant_id];

    if (category && category !== 'Todos') {
      query += ' AND category = ?';
      params.push(category);
    }
    query += ' ORDER BY category, name';

    const [templates] = await db.query(query, params);
    res.json(templates.map(t => ({
      ...t,
      title: t.name,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar templates' });
  }
});

// GET /messages/categories - lista de categorias únicas do tenant
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT DISTINCT category FROM message_templates WHERE tenant_id = ? ORDER BY category',
      [req.user.tenant_id]
    );
    res.json(rows.map(r => r.category));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// POST /messages/seed-defaults - cria templates padrão para o tenant se não tiver nenhum
router.post('/seed-defaults', async (req, res) => {
  try {
    const [existing] = await db.query(
      'SELECT COUNT(*) as total FROM message_templates WHERE tenant_id = ?',
      [req.user.tenant_id]
    );
    if (existing[0].total > 0) {
      return res.json({ seeded: 0, message: 'Tenant já possui templates' });
    }

    let seeded = 0;
    for (const tpl of DEFAULT_TEMPLATES) {
      await db.query(
        'INSERT INTO message_templates (tenant_id, name, content, channel, category, is_global) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.tenant_id, tpl.name, tpl.content, 'whatsapp', tpl.category, 1]
      );
      seeded++;
    }

    const [templates] = await db.query(
      'SELECT * FROM message_templates WHERE tenant_id = ? ORDER BY category, name',
      [req.user.tenant_id]
    );
    res.json({ seeded, templates: templates.map(t => ({ ...t, title: t.name })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar templates padrão' });
  }
});

// POST /messages/templates
router.post('/templates', async (req, res) => {
  try {
    const { title, name, content, category, channel } = req.body;
    const finalName = title || name;
    if (!finalName || !content) return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });

    const [result] = await db.query(
      'INSERT INTO message_templates (tenant_id, name, content, channel, category) VALUES (?, ?, ?, ?, ?)',
      [req.user.tenant_id, finalName, content, channel || 'whatsapp', category || 'Outros']
    );

    const [tpl] = await db.query('SELECT * FROM message_templates WHERE id = ?', [result.insertId]);
    res.status(201).json({ ...tpl[0], title: tpl[0].name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar template' });
  }
});

// PUT /messages/templates/:id
router.put('/templates/:id', async (req, res) => {
  try {
    const { title, name, content, category, channel } = req.body;
    const finalName = title || name || null;

    await db.query(
      `UPDATE message_templates SET
        name = COALESCE(?, name),
        content = COALESCE(?, content),
        channel = COALESCE(?, channel),
        category = COALESCE(?, category)
       WHERE id = ? AND tenant_id = ?`,
      [finalName, content || null, channel || null, category || null, req.params.id, req.user.tenant_id]
    );

    const [updated] = await db.query('SELECT * FROM message_templates WHERE id = ?', [req.params.id]);
    res.json({ ...updated[0], title: updated[0].name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar template' });
  }
});

// DELETE /messages/templates/:id
router.delete('/templates/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM message_templates WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Template não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar template' });
  }
});

module.exports = router;
