const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { parseShareToken } = require('../utils/shareToken');
const { sendMail } = require('../services/emailService');

// Helper: pack questions/interpretations/theme into the fields LONGTEXT column
function packFields(body) {
  const { questions, interpretations, theme, category, fields } = body;
  if (questions !== undefined) {
    return JSON.stringify({ 
      questions: questions || [], 
      interpretations: interpretations || [], 
      theme: theme || null,
      category: category || ''
    });
  }
  // legacy: fields array
  return fields ? JSON.stringify(fields) : '[]';
}

// Helper: unpack stored fields into questions/interpretations/theme
function unpackForm(form) {
  let parsed = null;
  try { parsed = JSON.parse(form.fields || '[]'); } catch {}

  const isNewFormat = parsed && !Array.isArray(parsed) && parsed.questions;
  
  if (isNewFormat) {
    form.questions = parsed.questions || [];
    form.interpretations = parsed.interpretations || [];
    form.theme = parsed.theme || null;
    form.category = form.category || parsed.category || '';
    form.fields = [];
  } else {
    form.questions = [];
    form.interpretations = [];
    form.theme = null;
    form.category = form.category || '';
    form.fields = Array.isArray(parsed) ? parsed : [];
  }
  return form;
}

// ---- CATEGORIES ----

// GET /forms/categories
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM form_categories WHERE tenant_id = ? ORDER BY name ASC',
      [req.user.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// POST /forms/categories
router.post('/categories', authMiddleware, async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    await db.query(
      'INSERT INTO form_categories (tenant_id, name, icon, color) VALUES (?, ?, ?, ?)',
      [req.user.tenant_id, name, icon || 'FileText', color || '#4f46e5']
    );
    res.status(201).json({ message: 'Categoria criada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

// DELETE /forms/categories/:id
router.delete('/categories/:id', authMiddleware, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM form_categories WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar categoria' });
  }
});

// GET /forms
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [forms] = await db.query(
      `SELECT f.id, f.title, f.description, f.category, f.is_public, f.is_global, f.hash, f.created_at,
              u.name as created_by_name,
              COUNT(r.id) as response_count
       FROM forms f
       LEFT JOIN users u ON u.id = f.created_by
       LEFT JOIN form_responses r ON r.form_id = f.id
       WHERE f.tenant_id = ? OR f.is_global = true
       GROUP BY f.id
       ORDER BY f.created_at DESC`,
      [req.user.tenant_id]
    );
    res.json(forms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar formulários' });
  }
});

// GET /forms/responses?patient_id=X
router.get('/responses', authMiddleware, async (req, res) => {
  try {
    const { patient_id } = req.query;
    if (!patient_id) return res.json([]);
    const [rows] = await db.query(
      `SELECT r.id, r.form_id, r.created_at, f.title as form_title
       FROM form_responses r
       JOIN forms f ON f.id = r.form_id
       WHERE r.patient_id = ? AND f.tenant_id = ?
       ORDER BY r.created_at DESC`,
      [patient_id, req.user.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar respostas' });
  }
});

// GET /forms/responses/recent
router.get('/responses/recent', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const [rows] = await db.query(
      `SELECT r.id, r.form_id, r.respondent_name, r.patient_id, r.score, r.created_at, f.title as form_title
       FROM form_responses r
       JOIN forms f ON f.id = r.form_id
       WHERE f.tenant_id = ?
       ORDER BY r.created_at DESC
       LIMIT ?`,
      [req.user.tenant_id, limit]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar respostas recentes' });
  }
});

// ---- OG META TAGS para compartilhamento social (/f/:hash) ----
// Esta rota serve um HTML com OG tags para crawlers (WhatsApp, Telegram, Facebook, etc.)
// Para navegadores reais, redireciona para o frontend SPA.
router.get('/og/:hash', async (req, res) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://psiflux.com.br';
  const userId = req.query.u ? parseShareToken(req.query.u) : null;
  // Preserva ?u= na URL de redirect para o frontend
  const redirectParams = new URLSearchParams();
  if (req.query.p) redirectParams.set('p', req.query.p);
  if (req.query.u) redirectParams.set('u', req.query.u);
  const redirectQs = redirectParams.toString();
  const formUrl = `${FRONTEND_URL}/f/${req.params.hash}${redirectQs ? `?${redirectQs}` : ''}`;

  // Detectar crawlers / bots sociais
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const isCrawler = /whatsapp|telegram|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|googlebot|bingbot|embedly|vkshare|pinterest|pocket|flipboard|curl|wget/i.test(ua);

  try {
    const [forms] = await db.query(
      `SELECT f.id, f.title, f.description, f.category, f.hash,
              u.name as professional_name, u.specialty as professional_specialty,
              u.crp as professional_crp, u.company_name, u.clinic_logo_url, u.avatar_url
       FROM forms f
       LEFT JOIN users u ON u.id = COALESCE(?, f.created_by)
       WHERE f.hash = ? AND (f.is_public = true OR f.is_global = true)`,
      [userId, req.params.hash]
    );

    if (forms.length === 0) {
      return res.redirect(302, formUrl);
    }

    const form = forms[0];
    const professionalName = form.professional_name || 'Profissional';
    const specialty = form.professional_specialty || '';
    const crp = form.professional_crp || '';
    const companyName = form.company_name || 'PsiFlux';
    const formTitle = form.title || 'Formulário Clínico';
    const formDesc = form.description
      ? form.description.substring(0, 160)
      : `Formulário enviado por ${professionalName}${specialty ? ` • ${specialty}` : ''}${crp ? ` • CRP ${crp}` : ''}. Clique para responder.`;

    // Logo: preferir logo da clínica, senão avatar, senão logo padrão PsiFlux
    const logoUrl = form.clinic_logo_url
      ? (form.clinic_logo_url.startsWith('http') ? form.clinic_logo_url : `${FRONTEND_URL}${form.clinic_logo_url}`)
      : form.avatar_url
        ? (form.avatar_url.startsWith('http') ? form.avatar_url : `${FRONTEND_URL}${form.avatar_url}`)
        : `${FRONTEND_URL}/og-default.png`;

    if (!isCrawler) {
      // Navegador real — redireciona para o SPA
      return res.redirect(302, formUrl);
    }

    // Crawler — retorna HTML com OG tags completos
    const ogTitle = `${formTitle} — ${companyName}`;
    const ogDesc = formDesc;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${ogTitle}</title>
  <meta name="description" content="${ogDesc}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${formUrl}" />
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${ogDesc}" />
  <meta property="og:image" content="${logoUrl}" />
  <meta property="og:image:width" content="512" />
  <meta property="og:image:height" content="512" />
  <meta property="og:site_name" content="${companyName}" />
  <meta property="og:locale" content="pt_BR" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${ogTitle}" />
  <meta name="twitter:description" content="${ogDesc}" />
  <meta name="twitter:image" content="${logoUrl}" />

  <!-- WhatsApp só usa og: tags acima -->
  <meta http-equiv="refresh" content="0;url=${formUrl}" />
</head>
<body>
  <p>Redirecionando para o formulário...</p>
  <script>window.location.href = ${JSON.stringify(formUrl)};</script>
</body>
</html>`);
  } catch (err) {
    console.error('OG route error:', err);
    res.redirect(302, formUrl);
  }
});

// GET /forms/public/:hash
router.get('/public/:hash', async (req, res) => {
  try {
    const userId = req.query.u ? parseShareToken(req.query.u) : null;
    const [forms] = await db.query(
      `SELECT f.id, f.title, f.description, f.fields, f.category, f.hash, f.is_global, f.tenant_id,
              u.name as professional_name, u.specialty as professional_specialty,
              u.crp as professional_crp, u.company_name, u.clinic_logo_url, u.avatar_url
       FROM forms f
       LEFT JOIN users u ON u.id = COALESCE(?, f.created_by)
       WHERE f.hash = ? AND (f.is_public = true OR f.is_global = true)`,
      [userId, req.params.hash]
    );
    if (forms.length === 0) return res.status(404).json({ error: 'Formulário não encontrado' });

    const row = forms[0];
    const form = unpackForm(row);

    // Adicionar dados do paciente se tiver o ID no link
    const patientId = req.query.p;
    if (patientId) {
      try {
        const [patients] = await db.query('SELECT full_name, email, whatsapp, phone FROM patients WHERE id = ? AND tenant_id = ?', [patientId, row.tenant_id]);
        if (patients.length > 0) {
          form.patient = { 
            name: patients[0].full_name,
            email: patients[0].email,
            phone: patients[0].whatsapp || patients[0].phone
          };
        }
      } catch (err) {
        console.error('Erro ao buscar paciente para form público:', err);
      }
    }

    form.professional = {
      name: row.professional_name || '',
      specialty: row.professional_specialty || '',
      crp: row.professional_crp || '',
      company_name: row.company_name || '',
      clinic_logo_url: row.clinic_logo_url || '',
      avatar_url: row.avatar_url || '',
    };
    res.json(form);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar formulário público' });
  }
});

// POST /forms/public/:hash/responses
router.post('/public/:hash/responses', async (req, res) => {
  try {
    const { respondent_name, respondent_email, respondent_phone, patient_id, answers, score } = req.body;

    // Resolve o profissional correto via share token (?u=TOKEN)
    const shareUserId = req.query.u ? parseShareToken(req.query.u) : null;

    const [forms] = await db.query(
      `SELECT f.id, f.title, f.fields, f.tenant_id,
              COALESCE(?, f.created_by) AS resolved_user_id
       FROM forms f
       WHERE f.hash = ? AND (f.is_public = true OR f.is_global = true)`,
      [shareUserId || null, req.params.hash]
    );
    if (forms.length === 0) return res.status(404).json({ error: 'Formulário não encontrado' });

    const formId = forms[0].id;
    const formTitle = forms[0].title;
    const resolvedUserId = forms[0].resolved_user_id;

    // Busca o profissional resolvido para obter tenant_id, email e preferências
    const [users] = await db.query(
      'SELECT id, name, email, tenant_id, email_preferences FROM users WHERE id = ?',
      [resolvedUserId]
    );
    const professional = users[0] || null;
    const tenantId = professional?.tenant_id || forms[0].tenant_id;

    const data = JSON.stringify({ answers: answers || {}, respondent_phone: respondent_phone || null });

    await db.query(
      'INSERT INTO form_responses (form_id, patient_id, respondent_name, respondent_email, data, score) VALUES (?, ?, ?, ?, ?, ?)',
      [formId, patient_id || null, respondent_name || null, respondent_email || null, data, score || 0]
    );

    const now = new Date();
    const formattedDate = now.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
    const respondentLabel = respondent_name || 'Um paciente';
    const alertLink = `/formularios/${formId}/respostas`;

    // Alerta no sistema
    try {
      await db.query(
        'INSERT INTO system_alerts (tenant_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
        [
          tenantId,
          '📝 Formulário Respondido',
          `${respondentLabel} enviou uma resposta para "${formTitle}" em ${formattedDate}.`,
          'success',
          alertLink
        ]
      );
    } catch (alertErr) {
      console.error('Erro ao criar alerta de formulário:', alertErr);
    }

    // Email para o profissional (apenas se a preferência estiver ativada)
    const emailPrefs = professional?.email_preferences
      ? (typeof professional.email_preferences === 'string' ? JSON.parse(professional.email_preferences) : professional.email_preferences)
      : {};
    if (professional?.email && emailPrefs.enabled && emailPrefs.form_response) {
      try {
        // Desempacota o formulário para obter perguntas e interpretações
        let formQuestions = [];
        let formInterpretations = [];
        try {
          const rawFields = forms[0].fields;
          const parsed = rawFields ? (typeof rawFields === 'string' ? JSON.parse(rawFields) : rawFields) : null;
          if (parsed && !Array.isArray(parsed) && parsed.questions) {
            formQuestions = parsed.questions || [];
            formInterpretations = parsed.interpretations || [];
          } else if (Array.isArray(parsed)) {
            formQuestions = parsed;
          }
        } catch (_) {}

        const parsedAnswers = answers || {};

        // Encontra a interpretação pelo score
        const interpretation = score != null
          ? formInterpretations.find(i => {
              const min = i.minScore ?? i.min_score ?? 0;
              const max = i.maxScore ?? i.max_score ?? 9999;
              return score >= min && score <= max;
            })
          : null;

        // Cor da interpretação
        const interpColor = interpretation?.color || '#2563eb';
        const interpBg = interpretation?.color
          ? interpretation.color + '15'
          : '#eff6ff';

        // Gera as linhas de resposta
        const answerRows = formQuestions.map((q, idx) => {
          const rawVal = parsedAnswers[q.id];
          let displayVal = '—';
          if (rawVal !== undefined && rawVal !== null && rawVal !== '') {
            if (Array.isArray(rawVal)) {
              displayVal = rawVal.join(', ');
            } else if (typeof rawVal === 'object') {
              displayVal = JSON.stringify(rawVal);
            } else {
              // Tenta resolver label da opção
              const opt = (q.options || []).find(o => String(o.value) === String(rawVal));
              displayVal = opt ? (opt.label || opt.text || String(rawVal)) : String(rawVal);
            }
          }
          const questionText = q.text || q.label || q.question_text || `Pergunta ${idx + 1}`;
          return `<tr>
            <td style="padding:10px 14px;font-size:12px;color:#475569;border-bottom:1px solid #f1f5f9;width:55%;vertical-align:top;line-height:1.5;">${questionText}</td>
            <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#1e293b;border-bottom:1px solid #f1f5f9;vertical-align:top;line-height:1.5;">${displayVal}</td>
          </tr>`;
        }).join('');

        // Barra de progresso do score (só se tiver max definido)
        const maxScore = formInterpretations.length > 0
          ? Math.max(...formInterpretations.map(i => i.maxScore ?? i.max_score ?? 0))
          : 0;
        const scorePct = (score != null && maxScore > 0) ? Math.min(100, Math.round((score / maxScore) * 100)) : null;

        const scoreSection = score != null ? `
          <div style="margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;">📊 Pontuação Total</p>
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="background:${interpBg};border:1.5px solid ${interpColor};border-radius:16px;padding:16px 24px;text-align:center;min-width:80px;">
                <p style="margin:0;font-size:32px;font-weight:900;color:${interpColor};line-height:1;">${score}</p>
                ${maxScore > 0 ? `<p style="margin:4px 0 0;font-size:10px;color:#94a3b8;font-weight:700;">de ${maxScore}</p>` : ''}
              </div>
              ${scorePct !== null ? `
              <div style="flex:1;">
                <div style="background:#e2e8f0;border-radius:999px;height:10px;overflow:hidden;">
                  <div style="background:${interpColor};height:10px;width:${scorePct}%;border-radius:999px;"></div>
                </div>
                <p style="margin:6px 0 0;font-size:11px;color:#64748b;">${scorePct}% da pontuação máxima</p>
              </div>` : ''}
            </div>
          </div>` : '';

        const interpretationSection = interpretation ? `
          <div style="background:${interpBg};border-left:4px solid ${interpColor};border-radius:0 12px 12px 0;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:${interpColor};">🔍 Interpretação Clínica</p>
            <p style="margin:4px 0 0;font-size:16px;font-weight:900;color:#1e293b;">${interpretation.resultTitle || interpretation.label || interpretation.title || ''}</p>
            ${interpretation.description ? `<p style="margin:8px 0 0;font-size:13px;color:#475569;line-height:1.6;">${interpretation.description}</p>` : ''}
          </div>` : '';

        const answersSection = formQuestions.length > 0 ? `
          <p style="margin:0 0 12px;font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;">📋 Respostas Completas</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 14px;text-align:left;font-size:9px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;border-bottom:2px solid #e2e8f0;">Pergunta</th>
                <th style="padding:10px 14px;text-align:left;font-size:9px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;border-bottom:2px solid #e2e8f0;">Resposta</th>
              </tr>
            </thead>
            <tbody>${answerRows || '<tr><td colspan="2" style="padding:14px;text-align:center;color:#94a3b8;font-size:12px;">Sem respostas registradas</td></tr>'}</tbody>
          </table>` : '';

        const emailHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1d4ed8,#2563eb,#3b82f6);border-radius:20px 20px 0 0;padding:36px 32px;text-align:center;">
          <p style="margin:0 0 6px;font-size:10px;font-weight:900;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.55);">PsiFlux · Sistema Clínico</p>
          <h1 style="margin:0 0 6px;font-size:24px;font-weight:900;color:#fff;line-height:1.3;">📝 Formulário Respondido</h1>
          <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);">${formTitle}</p>
        </td></tr>

        <!-- Subtítulo paciente -->
        <tr><td style="background:#1e40af;padding:14px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:13px;color:rgba(255,255,255,0.9);">👤 <strong>${respondentLabel}</strong></td>
            <td style="text-align:right;font-size:12px;color:rgba(255,255,255,0.65);">🗓 ${formattedDate}</td>
          </tr></table>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
          <p style="margin:0 0 28px;font-size:15px;color:#475569;">Olá, <strong>${professional.name || 'Profissional'}</strong>! Um paciente completou um formulário e os resultados estão disponíveis abaixo.</p>

          ${scoreSection}
          ${interpretationSection}
          ${answersSection}

          <!-- CTA -->
          <div style="text-align:center;margin:28px 0 8px;">
            <a href="https://psiflux.com.br${alertLink}" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;font-weight:900;font-size:14px;padding:16px 40px;border-radius:14px;text-decoration:none;letter-spacing:0.3px;">Ver no PsiFlux →</a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 20px 20px;padding:20px 32px;text-align:center;">
          <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;font-weight:700;">Email automático gerado pelo PsiFlux.</p>
          <p style="margin:0;font-size:10px;color:#cbd5e1;">sistema@psiflux.com.br · Não responda este email.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
        await sendMail(
          professional.email,
          `📝 ${formTitle} respondido por ${respondentLabel}`,
          emailHtml
        );
      } catch (emailErr) {
        console.error('Erro ao enviar email de formulário respondido:', emailErr);
      }
    }

    res.json({ message: 'Resposta enviada com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar resposta' });
  }
});

// GET /forms/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [forms] = await db.query(
      'SELECT * FROM forms WHERE id = ? AND (tenant_id = ? OR is_global = true)',
      [req.params.id, req.user.tenant_id]
    );
    if (forms.length === 0) return res.status(404).json({ error: 'Formulário não encontrado' });

    const form = unpackForm(forms[0]);
    res.json(form);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar formulário' });
  }
});

// POST /forms
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, is_public, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Título é obrigatório' });

    const hash = uuidv4().replace(/-/g, '').substring(0, 16);
    const fieldsJson = packFields(req.body);
    const publicFlag = is_public !== undefined ? (is_public ? 1 : 0) : 1;

    const [result] = await db.query(
      'INSERT INTO forms (tenant_id, title, description, category, fields, is_public, hash, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.tenant_id, title, description || null, category || '', fieldsJson, publicFlag, hash, req.user.id]
    );

    const [form] = await db.query('SELECT * FROM forms WHERE id = ?', [result.insertId]);
    res.status(201).json(unpackForm(form[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar formulário' });
  }
});

// PUT /forms/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { title, description, is_public, category } = req.body;

    const [existing] = await db.query(
      'SELECT id FROM forms WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Formulário não encontrado' });

    const fieldsJson = packFields(req.body);
    const publicFlag = is_public !== undefined ? (is_public ? 1 : 0) : 1;

    await db.query(
      `UPDATE forms SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        fields = ?,
        is_public = ?
       WHERE id = ? AND tenant_id = ?`,
      [title, description, category, fieldsJson, publicFlag, req.params.id, req.user.tenant_id]
    );

    const [updated] = await db.query('SELECT * FROM forms WHERE id = ?', [req.params.id]);
    res.json(unpackForm(updated[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar formulário' });
  }
});

// DELETE /forms/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM forms WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Formulário não encontrado' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar formulário' });
  }
});

// POST /forms/:id/duplicate
router.post('/:id/duplicate', authMiddleware, async (req, res) => {
  try {
    const [forms] = await db.query(
      'SELECT * FROM forms WHERE id = ? AND (tenant_id = ? OR is_global = true)',
      [req.params.id, req.user.tenant_id]
    );
    if (forms.length === 0) return res.status(404).json({ error: 'Formulário não encontrado' });

    const original = forms[0];
    const newHash = uuidv4().substring(0, 8);
    const newTitle = `${original.title} (Cópia)`;

    const [result] = await db.query(
      'INSERT INTO forms (tenant_id, title, description, category, fields, is_public, is_global, hash, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.tenant_id, newTitle, original.description, original.category, original.fields, original.is_public, false, newHash, req.user.id]
    );

    const [newForm] = await db.query('SELECT * FROM forms WHERE id = ?', [result.insertId]);
    res.status(201).json(unpackForm(newForm[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao duplicar formulário' });
  }
});

// GET /forms/:id/responses
router.get('/:id/responses', authMiddleware, async (req, res) => {
  try {
    const [responses] = await db.query(
      'SELECT * FROM form_responses WHERE form_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    for (const r of responses) {
      try { r.data = JSON.parse(r.data); } catch {}
    }

    res.json(responses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar respostas' });
  }
});

module.exports = router;
