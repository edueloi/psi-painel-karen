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
  // ── Lembretes ──────────────────────────────────────────────────────────────
  {
    name: 'Lembrete de Consulta (Amanhã)',
    category: 'Lembrete',
    content: '{{saudacao}}, {{primeiro_nome}}! 👋\n\nPassando para lembrá-lo(a) da sua consulta *amanhã*:\n\n📅 Data: *{{data_agendamento}}*\n⏰ Horário: *{{horario}}*\n💼 Serviço: {{servico}}\n\nQualquer dúvida, estamos à disposição! 😊\n— {{nome_clinica}}'
  },
  {
    name: 'Lembrete de Consulta (Hoje)',
    category: 'Lembrete',
    content: '{{saudacao}}, {{primeiro_nome}}! ⏰\n\nSua sessão de *hoje* está confirmada:\n\n🕐 Horário: *{{horario}}*\n💼 Serviço: {{servico}}\n👤 Profissional: {{nome_profissional}}\n\nTe esperamos! — {{nome_clinica}}'
  },
  {
    name: 'Confirmação de Agendamento',
    category: 'Lembrete',
    content: '{{saudacao}}, {{primeiro_nome}}! ✅\n\nSeu agendamento foi confirmado com sucesso:\n\n📅 Data: *{{data_agendamento}}*\n⏰ Horário: *{{horario}}*\n💼 Serviço: {{servico}}\n👤 Profissional: {{nome_profissional}}\n\nEm caso de imprevisto, avise-nos com antecedência.\n— {{nome_clinica}}'
  },
  {
    name: 'Reagendamento de Sessão',
    category: 'Lembrete',
    content: '{{saudacao}}, {{primeiro_nome}}! 🔄\n\nSua sessão foi *reagendada* para:\n\n📅 Nova data: *{{data_agendamento}}*\n⏰ Horário: *{{horario}}*\n\nQualquer dúvida, entre em contato!\n— {{nome_clinica}}'
  },
  {
    name: 'Início de Tratamento',
    category: 'Lembrete',
    content: '{{saudacao}}, {{primeiro_nome}}! 🌟\n\nFicamos felizes em iniciar este processo com você!\n\nSua *primeira sessão* está agendada para:\n📅 *{{data_agendamento}}* às *{{horario}}*\n👤 Com {{nome_profissional}}\n\nSe tiver qualquer dúvida antes, estamos aqui! 💙\n— {{nome_clinica}}'
  },
  {
    name: 'Sessão em 1 Hora',
    category: 'Lembrete',
    content: '{{saudacao}}, {{primeiro_nome}}! ⏳\n\nEm *1 hora* começa sua sessão de *{{servico}}* com {{nome_profissional}}.\n\n🕐 Horário: *{{horario}}*\n\nTe esperamos em breve!\n— {{nome_clinica}}'
  },
  // ── Financeiro ─────────────────────────────────────────────────────────────
  {
    name: 'Cobrança Pendente',
    category: 'Financeiro',
    content: '{{saudacao}}, {{primeiro_nome}}! 💳\n\nIdentificamos um valor *pendente* de *R$ {{valor_total}}* referente a {{servico}}.\n\nPor favor, entre em contato para regularizar.\n— {{nome_clinica}}'
  },
  {
    name: 'Confirmação de Pagamento',
    category: 'Financeiro',
    content: '{{saudacao}}, {{primeiro_nome}}! 🎉\n\nConfirmamos o recebimento do seu pagamento de *R$ {{valor_total}}* referente a {{servico}}.\n\nObrigado pela confiança! 💙\n— {{nome_clinica}}'
  },
  {
    name: 'Link de Pagamento',
    category: 'Financeiro',
    content: '{{saudacao}}, {{primeiro_nome}}! 💳\n\nSegue o link para pagamento do seu serviço de *{{servico}}* no valor de *R$ {{valor_total}}*.\n\nEm caso de dúvidas, entre em contato.\n— {{nome_clinica}}'
  },
  // ── Aniversário ────────────────────────────────────────────────────────────
  {
    name: 'Parabéns pelo Aniversário',
    category: 'Aniversário',
    content: '🎂 Feliz aniversário, {{primeiro_nome}}!\n\nToda a equipe da *{{nome_clinica}}* deseja a você um dia muito especial! Que este novo ciclo seja repleto de saúde, alegria e conquistas! 🎉🎊'
  },
  {
    name: 'Aniversário + Desconto',
    category: 'Aniversário',
    content: '🎉 Feliz aniversário, {{primeiro_nome}}!\n\nPara celebrar este dia especial, a *{{nome_clinica}}* tem um presentinho para você: um desconto especial na próxima sessão! 🎁\n\nEntre em contato para saber mais! 💙'
  },
  // ── Outros ─────────────────────────────────────────────────────────────────
  {
    name: 'Cancelamento de Sessão',
    category: 'Outros',
    content: '{{saudacao}}, {{primeiro_nome}}.\n\nInfelizmente precisamos *cancelar* sua sessão do dia *{{data_agendamento}}* às *{{horario}}*.\n\nEntraremos em contato para reagendar o mais breve possível. Desculpe o transtorno.\n— {{nome_clinica}}'
  },
  {
    name: 'Falta na Sessão',
    category: 'Outros',
    content: '{{saudacao}}, {{primeiro_nome}}! 😟\n\nNotamos sua ausência na sessão de hoje (*{{data_agendamento}}* às *{{horario}}*).\n\nEntre em contato para reagendar e manter a continuidade do seu atendimento.\n— {{nome_clinica}}'
  },
  {
    name: 'Retorno após Pausa',
    category: 'Outros',
    content: '{{saudacao}}, {{primeiro_nome}}! 😊\n\nSentimos sua falta! Gostaríamos de saber como você está e verificar se há interesse em retomar os atendimentos.\n\nEstamos à disposição sempre que precisar! 💙\n— {{nome_clinica}}'
  },
  {
    name: 'Documentos Pendentes',
    category: 'Outros',
    content: '{{saudacao}}, {{primeiro_nome}}!\n\nIdentificamos que existem *documentos pendentes* relacionados ao seu cadastro em nossa clínica.\n\nPor favor, entre em contato para regularizar.\n— {{nome_clinica}}'
  },
  {
    name: 'Pesquisa de Satisfação',
    category: 'Outros',
    content: '{{saudacao}}, {{primeiro_nome}}! 🌟\n\nSua opinião é muito importante para nós! Gostaríamos de saber como foi sua experiência com a *{{nome_clinica}}*.\n\nDe 1 a 5, como você avalia nosso atendimento?\n\nObrigado pela sua avaliação! 💙'
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

// POST /messages/seed-defaults - cria templates padrão que ainda não existem para o tenant
router.post('/seed-defaults', async (req, res) => {
  try {
    // Busca nomes já existentes para não duplicar
    const [existingRows] = await db.query(
      'SELECT name FROM message_templates WHERE tenant_id = ?',
      [req.user.tenant_id]
    );
    const existingNames = new Set(existingRows.map(r => r.name));

    let seeded = 0;
    for (const tpl of DEFAULT_TEMPLATES) {
      if (existingNames.has(tpl.name)) continue; // já existe, pula
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
