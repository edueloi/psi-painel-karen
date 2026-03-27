const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');

/* ─────────────────────────────────────────────────────────────
   HELPERS
 ───────────────────────────────────────────────────────────── */

/** Gera token único seguro para o link do paciente */
function generateSecureToken() {
  return crypto.randomBytes(40).toString('hex');
}

/** Calcula status real baseado em datas e status salvo */
function resolveStatus(send) {
  if (send.status === 'cancelled') return 'cancelled';
  if (send.status === 'answered') return 'answered';
  if (send.expires_at && new Date(send.expires_at) < new Date()) return 'expired';
  return send.status;
}

/** Auto-criação segura da tabela (já existe via patch, mas protege) */
async function ensureTablesExist() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS anamnesis_sends (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL, patient_id INT NOT NULL, professional_id INT NOT NULL,
      medical_record_id INT NULL, title VARCHAR(255) NOT NULL,
      custom_message TEXT NULL, template_type ENUM('full','short') DEFAULT 'full',
      approach VARCHAR(100) NULL, allow_resume TINYINT(1) DEFAULT 1,
      allow_edit_after_submit TINYINT(1) DEFAULT 0, notify_channels JSON NULL,
      expires_at DATETIME NULL, reminder_hours INT NULL,
      status ENUM('draft','sent','viewed','filling','answered','expired','cancelled') DEFAULT 'draft',
      consent_required TINYINT(1) DEFAULT 1, fields_config LONGTEXT NULL,
      sent_at DATETIME NULL, viewed_at DATETIME NULL, started_at DATETIME NULL,
      completed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_as_tenant (tenant_id), INDEX idx_as_patient (patient_id), INDEX idx_as_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await db.query(`CREATE TABLE IF NOT EXISTS anamnesis_secure_links (
      id INT AUTO_INCREMENT PRIMARY KEY, send_id INT NOT NULL, token VARCHAR(128) NOT NULL UNIQUE,
      patient_id INT NOT NULL, professional_id INT NOT NULL, tenant_id INT NOT NULL,
      share_token VARCHAR(255) NOT NULL, is_revoked TINYINT(1) DEFAULT 0,
      expires_at DATETIME NULL, opened_at DATETIME NULL, ip_first_open VARCHAR(45) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_asl_token (token), INDEX idx_asl_send (send_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await db.query(`CREATE TABLE IF NOT EXISTS anamnesis_patient_responses (
      id INT AUTO_INCREMENT PRIMARY KEY, send_id INT NOT NULL, patient_id INT NOT NULL,
      professional_id INT NOT NULL, tenant_id INT NOT NULL, answers LONGTEXT NULL,
      progress_data LONGTEXT NULL, clinical_alerts JSON NULL, has_critical_content TINYINT(1) DEFAULT 0,
      consent_accepted_at DATETIME NULL, consent_ip VARCHAR(45) NULL,
      consent_term_version VARCHAR(20) DEFAULT '1.0',
      review_status ENUM('pending','reviewing','approved','discarded') DEFAULT 'pending',
      professional_notes TEXT NULL, tcc_draft LONGTEXT NULL, ai_summary LONGTEXT NULL,
      saved_to_record_id INT NULL, submitted_at DATETIME NULL, last_saved_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_apr_send (send_id), INDEX idx_apr_patient (patient_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await db.query(`CREATE TABLE IF NOT EXISTS patient_consent_logs (
      id INT AUTO_INCREMENT PRIMARY KEY, send_id INT NOT NULL, patient_id INT NOT NULL,
      tenant_id INT NOT NULL, term_version VARCHAR(20) DEFAULT '1.0', accepted TINYINT(1) DEFAULT 1,
      ip_address VARCHAR(45) NULL, user_agent TEXT NULL, accepted_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await db.query(`CREATE TABLE IF NOT EXISTS anamnesis_reminder_logs (
      id INT AUTO_INCREMENT PRIMARY KEY, send_id INT NOT NULL,
      channel ENUM('whatsapp','email','sms') DEFAULT 'whatsapp',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP, status ENUM('sent','failed') DEFAULT 'sent'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch (e) {
    console.warn('[anamnesis-send] ensureTablesExist:', e.message);
  }
}

ensureTablesExist();

/* ─────────────────────────────────────────────────────────────
   GET /anamnesis-send
   Lista todos os envios do tenant com filtros
 ───────────────────────────────────────────────────────────── */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { patient_id, status, professional_id } = req.query;
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
    const uid = req.user.id;

    let query = `
      SELECT s.*,
        p.name AS patient_name, p.phone AS patient_phone,
        u.name AS professional_name,
        l.token AS secure_token, l.is_revoked, l.opened_at, l.expires_at AS link_expires_at,
        r.review_status, r.has_critical_content, r.submitted_at, r.id AS response_id,
        r.ai_summary IS NOT NULL AS has_ai_summary
      FROM anamnesis_sends s
      LEFT JOIN patients p ON p.id = s.patient_id
      LEFT JOIN users u ON u.id = s.professional_id
      LEFT JOIN anamnesis_secure_links l ON l.send_id = s.id AND l.is_revoked = 0
      LEFT JOIN anamnesis_patient_responses r ON r.send_id = s.id
      WHERE s.tenant_id = ?
    `;
    const params = [req.user.tenant_id];

    if (!isAdmin) {
      query += ' AND s.professional_id = ?';
      params.push(uid);
    }
    if (patient_id) { query += ' AND s.patient_id = ?'; params.push(patient_id); }
    if (status) { query += ' AND s.status = ?'; params.push(status); }
    if (professional_id) { query += ' AND s.professional_id = ?'; params.push(professional_id); }

    query += ' ORDER BY s.created_at DESC';

    const [rows] = await db.query(query, params);

    // Atualiza status expirado em tempo real (sem salvar no DB)
    const sends = rows.map(s => ({
      ...s,
      status: resolveStatus(s),
      fields_config: (() => {
        try { return s.fields_config ? JSON.parse(s.fields_config) : null; } catch { return null; }
      })()
    }));

    res.json(sends);
  } catch (err) {
    console.error('[anamnesis-send GET /]', err);
    res.status(500).json({ error: 'Erro ao listar envios' });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /anamnesis-send
   Cria novo envio e gera link seguro
 ───────────────────────────────────────────────────────────── */
router.post('/', authMiddleware, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const {
      patient_id, medical_record_id, title, custom_message,
      template_type, approach, allow_resume, allow_edit_after_submit,
      notify_channels, expires_hours, reminder_hours,
      consent_required, fields_config
    } = req.body;

    if (!patient_id) return res.status(400).json({ error: 'Paciente é obrigatório' });
    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    await connection.beginTransaction();

    // 1. Verificar paciente pertence ao tenant
    const [[patient]] = await connection.query(
      'SELECT id, name FROM patients WHERE id = ? AND tenant_id = ?',
      [Number(patient_id), req.user.tenant_id]
    );

    if (!patient) {
      await connection.rollback();
      return res.status(403).json({ error: 'Paciente não encontrado ou sem permissão' });
    }

    // 2. Gerar shareToken do profissional para o link público
    const { generateShareToken } = require('../utils/shareToken');
    const shareToken = generateShareToken(req.user.id);

    // 3. Calcular expiração
    const expiresH = Number(expires_hours);
    let expiresAt = null;
    if (expiresH && expiresH > 0) {
      expiresAt = new Date(Date.now() + expiresH * 3600000);
    }

    // 4. Inserir registro de envio
    // Tratar medical_record_id: se for string vazia ou nulo, salva null no banco
    const recordId = (medical_record_id && String(medical_record_id).trim() !== '') ? Number(medical_record_id) : null;

    const [result] = await connection.query(
      `INSERT INTO anamnesis_sends
        (tenant_id, patient_id, professional_id, medical_record_id, title,
         custom_message, template_type, approach, allow_resume, allow_edit_after_submit,
         notify_channels, expires_at, reminder_hours, consent_required, fields_config,
         status, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', NOW())`,
      [
        Number(req.user.tenant_id), Number(patient_id), Number(req.user.id), recordId, title,
        custom_message || null, template_type || 'full', approach || null,
        allow_resume !== false ? 1 : 0,
        allow_edit_after_submit === true ? 1 : 0,
        notify_channels ? JSON.stringify(notify_channels) : null,
        expiresAt, (reminder_hours ? Number(reminder_hours) : null),
        consent_required !== false ? 1 : 0,
        fields_config ? JSON.stringify(fields_config) : null
      ]
    );

    const sendId = result.insertId;

    // 5. Gerar token seguro único
    const token = generateSecureToken();
    await connection.query(
      `INSERT INTO anamnesis_secure_links
        (send_id, token, patient_id, professional_id, tenant_id, share_token, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sendId, token, Number(patient_id), Number(req.user.id), Number(req.user.tenant_id), String(shareToken), expiresAt]
    );

    // 6. Buscar dados completos para retornar
    const [[send]] = await connection.query(
      `SELECT s.*, l.token AS secure_token, p.name AS patient_name
       FROM anamnesis_sends s
       LEFT JOIN anamnesis_secure_links l ON l.send_id = s.id
       LEFT JOIN patients p ON p.id = s.patient_id
       WHERE s.id = ?`,
      [sendId]
    );

    await connection.commit();

    if (!send) {
        throw new Error('Erro ao recuperar registro após inserção');
    }

    res.status(201).json({
      ...send,
      public_link: `${process.env.FRONTEND_URL || 'https://psiflux.com.br'}/f/anamnese?t=${token}`
    });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('[anamnesis-send POST /]', err);
    res.status(500).json({ 
      error: `Erro ao criar envio: ${err.message}${err.code ? ` (${err.code})` : ''}`
    });
  } finally {
    if (connection) connection.release();
  }
});

/* ─────────────────────────────────────────────────────────────
   GET /anamnesis-send/:id
   Envio específico com respostas
 ───────────────────────────────────────────────────────────── */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [[send]] = await db.query(
      `SELECT s.*, l.token AS secure_token, l.is_revoked, l.opened_at,
              p.name AS patient_name, p.phone AS patient_phone, p.email AS patient_email,
              u.name AS professional_name
       FROM anamnesis_sends s
       LEFT JOIN anamnesis_secure_links l ON l.send_id = s.id AND l.is_revoked = 0
       LEFT JOIN patients p ON p.id = s.patient_id
       LEFT JOIN users u ON u.id = s.professional_id
       WHERE s.id = ? AND s.tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    if (!send) return res.status(404).json({ error: 'Envio não encontrado' });

    // Respostas do paciente
    const [[response]] = await db.query(
      'SELECT * FROM anamnesis_patient_responses WHERE send_id = ?',
      [req.params.id]
    );

    // Consentimento
    const [[consent]] = await db.query(
      'SELECT * FROM patient_consent_logs WHERE send_id = ? ORDER BY accepted_at DESC LIMIT 1',
      [req.params.id]
    );

    if (response) {
      try { response.answers = JSON.parse(response.answers || 'null'); } catch {}
      try { response.tcc_draft = JSON.parse(response.tcc_draft || 'null'); } catch {}
      try { response.clinical_alerts = JSON.parse(response.clinical_alerts || '[]'); } catch {}
    }

    const publicLink = send.secure_token
      ? `${process.env.FRONTEND_URL || 'https://psiflux.com.br'}/f/anamnese?t=${send.secure_token}`
      : null;

    res.json({
      ...send,
      status: resolveStatus(send),
      fields_config: (() => { try { return JSON.parse(send.fields_config || 'null'); } catch { return null; } })(),
      response: response || null,
      consent: consent || null,
      public_link: publicLink
    });
  } catch (err) {
    console.error('[anamnesis-send GET /:id]', err);
    res.status(500).json({ error: 'Erro ao buscar envio' });
  }
});

/* ─────────────────────────────────────────────────────────────
   PUT /anamnesis-send/:id
   Atualiza envio (status, mensagem, etc.)
 ───────────────────────────────────────────────────────────── */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { status, custom_message, expires_hours, reminder_hours, title } = req.body;

    const [[existing]] = await db.query(
      'SELECT id FROM anamnesis_sends WHERE id = ? AND tenant_id = ? AND professional_id = ?',
      [req.params.id, req.user.tenant_id, req.user.id]
    );
    if (!existing) return res.status(404).json({ error: 'Envio não encontrado' });

    let expiresAt = undefined;
    if (expires_hours !== undefined) {
      expiresAt = expires_hours > 0 ? new Date(Date.now() + expires_hours * 3600000) : null;
    }

    await db.query(
      `UPDATE anamnesis_sends SET
        status = COALESCE(?, status),
        title = COALESCE(?, title),
        custom_message = COALESCE(?, custom_message),
        expires_at = COALESCE(?, expires_at),
        reminder_hours = COALESCE(?, reminder_hours),
        updated_at = NOW()
       WHERE id = ?`,
      [status || null, title || null, custom_message || null, expiresAt !== undefined ? expiresAt : null, reminder_hours || null, req.params.id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[anamnesis-send PUT /:id]', err);
    res.status(500).json({ error: 'Erro ao atualizar envio' });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /anamnesis-send/:id/cancel
   Cancela envio e revoga link
 ───────────────────────────────────────────────────────────── */
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const [[existing]] = await db.query(
      'SELECT id FROM anamnesis_sends WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (!existing) return res.status(404).json({ error: 'Envio não encontrado' });

    await db.query(
      'UPDATE anamnesis_sends SET status = ?, updated_at = NOW() WHERE id = ?',
      ['cancelled', req.params.id]
    );
    await db.query(
      'UPDATE anamnesis_secure_links SET is_revoked = 1 WHERE send_id = ?',
      [req.params.id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[anamnesis-send POST /:id/cancel]', err);
    res.status(500).json({ error: 'Erro ao cancelar envio' });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /anamnesis-send/:id/resend
   Gera novo token e reenvia
 ───────────────────────────────────────────────────────────── */
router.post('/:id/resend', authMiddleware, async (req, res) => {
  try {
    const [[send]] = await db.query(
      'SELECT s.*, u.share_token FROM anamnesis_sends s LEFT JOIN users u ON u.id = s.professional_id WHERE s.id = ? AND s.tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (!send) return res.status(404).json({ error: 'Envio não encontrado' });

    // Revogar tokens antigos
    await db.query('UPDATE anamnesis_secure_links SET is_revoked = 1 WHERE send_id = ?', [req.params.id]);

    // Gerar novo token
    const token = generateSecureToken();
    const { generateShareToken } = require('../utils/shareToken');
    const shareToken = generateShareToken(req.user.id);

    await db.query(
      'INSERT INTO anamnesis_secure_links (send_id, token, patient_id, professional_id, tenant_id, share_token, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.params.id, token, send.patient_id, send.professional_id, send.tenant_id, shareToken, send.expires_at]
    );

    await db.query(
      'UPDATE anamnesis_sends SET status = ?, sent_at = NOW() WHERE id = ?',
      ['sent', req.params.id]
    );

    const publicLink = `${process.env.FRONTEND_URL || 'https://psiflux.com.br'}/f/anamnese?t=${token}`;
    res.json({ ok: true, secure_token: token, public_link: publicLink });
  } catch (err) {
    console.error('[anamnesis-send POST /:id/resend]', err);
    res.status(500).json({ error: 'Erro ao reenviar' });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /anamnesis-send/:id/review
   Profissional revisa resposta (aprova / adiciona notas / descarta)
 ───────────────────────────────────────────────────────────── */
router.post('/:id/review', authMiddleware, async (req, res) => {
  try {
    const { review_status, professional_notes } = req.body;
    const allowed = ['reviewing', 'approved', 'discarded'];
    if (!allowed.includes(review_status)) {
      return res.status(400).json({ error: 'review_status inválido' });
    }

    const [[existingSend]] = await db.query(
      'SELECT id FROM anamnesis_sends WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (!existingSend) return res.status(404).json({ error: 'Envio não encontrado' });

    await db.query(
      'UPDATE anamnesis_patient_responses SET review_status = ?, professional_notes = COALESCE(?, professional_notes) WHERE send_id = ?',
      [review_status, professional_notes || null, req.params.id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[anamnesis-send POST /:id/review]', err);
    res.status(500).json({ error: 'Erro ao revisar resposta' });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /anamnesis-send/:id/to-record
   Converte resposta aprovada em rascunho de prontuário
 ───────────────────────────────────────────────────────────── */
router.post('/:id/to-record', authMiddleware, async (req, res) => {
  try {
    const [[send]] = await db.query(
      'SELECT s.*, p.name AS patient_name FROM anamnesis_sends s LEFT JOIN patients p ON p.id = s.patient_id WHERE s.id = ? AND s.tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (!send) return res.status(404).json({ error: 'Envio não encontrado' });

    const [[response]] = await db.query(
      'SELECT * FROM anamnesis_patient_responses WHERE send_id = ?',
      [req.params.id]
    );
    if (!response) return res.status(400).json({ error: 'Sem resposta do paciente' });

    let answers = {};
    try { answers = JSON.parse(response.answers || '{}'); } catch {}

    // Monta conteúdo de rascunho do prontuário a partir das respostas
    const answerLines = Object.entries(answers).map(([key, val]) => {
      return `**${key}**: ${Array.isArray(val) ? val.join(', ') : val}`;
    }).join('\n\n');

    const draftContent = `# Anamnese — ${send.title}\n\n**Paciente:** ${send.patient_name}\n**Respondido em:** ${new Date(response.submitted_at).toLocaleDateString('pt-BR')}\n\n---\n\n${answerLines}\n\n---\n*Este conteúdo é resposta bruta do paciente e deve ser revisado pela profissional antes de ser incorporado ao prontuário oficial.*`;

    // Criar prontuário como Rascunho
    const [result] = await db.query(
      `INSERT INTO medical_records
        (tenant_id, patient_id, professional_id, content, draft_content, record_type, title, status, ai_status, appointment_type)
       VALUES (?, ?, ?, ?, ?, 'Anamnese', ?, 'Rascunho', 'pending', 'individual')`,
      [
        req.user.tenant_id, send.patient_id, req.user.id,
        draftContent, draftContent,
        `Anamnese — ${send.patient_name} (resposta paciente)`,
      ]
    );

    const recordId = result.insertId;

    // Atualizar referência na resposta
    await db.query(
      'UPDATE anamnesis_patient_responses SET saved_to_record_id = ?, review_status = ? WHERE send_id = ?',
      [recordId, 'approved', req.params.id]
    );

    res.json({ ok: true, record_id: recordId });
  } catch (err) {
    console.error('[anamnesis-send POST /:id/to-record]', err);
    res.status(500).json({ error: 'Erro ao converter para prontuário' });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /anamnesis-send/:id/ai-summary
   Gera resumo IA das respostas do paciente
 ───────────────────────────────────────────────────────────── */
router.post('/:id/ai-summary', authMiddleware, async (req, res) => {
  try {
    const [[send]] = await db.query(
      'SELECT s.*, p.name AS patient_name FROM anamnesis_sends s LEFT JOIN patients p ON p.id = s.patient_id WHERE s.id = ? AND s.tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (!send) return res.status(404).json({ error: 'Envio não encontrado' });

    const [[response]] = await db.query(
      'SELECT * FROM anamnesis_patient_responses WHERE send_id = ?',
      [req.params.id]
    );
    if (!response) return res.status(400).json({ error: 'Sem resposta do paciente' });

    let answers = {};
    try { answers = JSON.parse(response.answers || '{}'); } catch {}

    const answersText = Object.entries(answers).map(([k, v]) =>
      `${k}: ${Array.isArray(v) ? v.join(', ') : v}`
    ).join('\n');

    const isTCC = send.approach?.toLowerCase().includes('tcc');

    const systemPrompt = isTCC
      ? `Você é uma assistente clínica especialista em TCC (Terapia Cognitivo-Comportamental).
         Analise as respostas brutas do paciente na anamnese e organize em formato clínico TCC.
         NÃO emita diagnóstico. NÃO salve automaticamente. Apresente como rascunho editável.
         Retorne SOMENTE JSON válido com: { queixa_principal, gatilhos, pensamentos_relatados,
         emocoes_predominantes, comportamentos_observaveis, esquivas, prejuizos_funcionais,
         fatores_precipitantes, fatores_mantenedores, recursos, objetivos_iniciais, alertas_clinicos, pontos_aprofundamento }`
      : `Você é uma assistente clínica de psicologia.
         Analise as respostas brutas do paciente na anamnese e gere um resumo clínico inicial.
         NÃO emita diagnóstico. NÃO salve automaticamente. Apresente como rascunho editável.
         Retorne SOMENTE JSON válido com: { resumo_demanda, sofrimento_principal, historico_relevante,
         fatores_protetores, pontos_atencao, alertas_clinicos, perguntas_aprofundamento }`;

    let summary = null;
    let tccDraft = null;

    try {
      const aiResp = await fetch(`http://localhost:${process.env.PORT || 3000}/api/ai/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.authorization },
        body: JSON.stringify({
          system: systemPrompt,
          prompt: `Paciente: ${send.patient_name}\nAbordagem: ${send.approach || 'Não especificada'}\n\nRespostas da anamnese:\n${answersText}`,
          max_tokens: 2000
        })
      });

      if (aiResp.ok) {
        const aiData = await aiResp.json();
        const raw = aiData.text || aiData.content || aiData.result || '';
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (isTCC) {
            tccDraft = parsed;
          } else {
            summary = parsed;
          }
        }
      }
    } catch (aiErr) {
      console.warn('[ai-summary] IA indisponível:', aiErr.message);
    }

    // Salvar resultado
    await db.query(
      'UPDATE anamnesis_patient_responses SET ai_summary = ?, tcc_draft = ? WHERE send_id = ?',
      [summary ? JSON.stringify(summary) : null, tccDraft ? JSON.stringify(tccDraft) : null, req.params.id]
    );

    res.json({ ok: true, summary, tcc_draft: tccDraft, is_tcc: isTCC });
  } catch (err) {
    console.error('[anamnesis-send POST /:id/ai-summary]', err);
    res.status(500).json({ error: 'Erro ao gerar resumo IA' });
  }
});

module.exports = router;
