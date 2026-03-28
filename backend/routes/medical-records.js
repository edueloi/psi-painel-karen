const { authMiddleware, checkPermission } = require('../middleware/auth');
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');

/* ──────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────── */
const logAudit = async (recordId, userId, tenantId, action, detail = null) => {
  try {
    await db.query(
      'INSERT INTO medical_record_audit (record_id, user_id, tenant_id, action, detail) VALUES (?, ?, ?, ?, ?)',
      [recordId, userId, tenantId, action, detail ? JSON.stringify(detail) : null]
    );
  } catch (e) { console.error('audit log error', e); }
};

const parseJson = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
};

/* ──────────────────────────────────────────────────────────
   GET /medical-records
   Suporta filtros: patient_id, professional_id, status, date_from, date_to, record_type
────────────────────────────────────────────────────────── */
// Garante coluna shared_with na tabela (migration segura)
async function ensureSharedWith() {
  try {
    await db.query("ALTER TABLE medical_records ADD COLUMN shared_with JSON NULL DEFAULT NULL");
  } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.warn('shared_with:', e.message); }
}
ensureSharedWith();

router.get('/', authMiddleware, checkPermission('view_medical_records'), async (req, res) => {
  try {
    const { patient_id, professional_id, status, date_from, date_to, record_type, my_records } = req.query;
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
    const uid = req.user.id;

    let query = `
      SELECT r.id, r.patient_id, r.professional_id, r.record_type, r.title,
             r.status, r.ai_status, r.start_time, r.end_time, r.created_at, r.tags,
             r.shared_with,
             LEFT(r.content, 300) as content,
             p.name as patient_name,
             u.name as professional_name
      FROM medical_records r
      LEFT JOIN patients p ON p.id = r.patient_id
      LEFT JOIN users u ON u.id = r.professional_id
      WHERE r.tenant_id = ?
    `;
    const params = [req.user.tenant_id];

    // Segurança de propriedade: profissionais só veem os próprios ou os compartilhados com eles
    if (!isAdmin) {
      query += ' AND (r.professional_id = ? OR JSON_CONTAINS(r.shared_with, ?, "$"))';
      params.push(uid, String(uid));
    }

    if (my_records === '1') { query += ' AND r.professional_id = ?'; params.push(uid); }
    if (patient_id) { query += ' AND r.patient_id = ?'; params.push(patient_id); }
    if (professional_id) { query += ' AND r.professional_id = ?'; params.push(professional_id); }
    if (status) { query += ' AND r.status = ?'; params.push(status); }
    if (record_type) { query += ' AND r.record_type = ?'; params.push(record_type); }
    if (date_from) { query += ' AND DATE(r.created_at) >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND DATE(r.created_at) <= ?'; params.push(date_to); }

    query += ' ORDER BY r.created_at DESC';

    const [records] = await db.query(query, params);
    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar prontuários' });
  }
});

/* ──────────────────────────────────────────────────────────
   POST /medical-records/:id/share — compartilhar com profissional
   Body: { user_id: number }
────────────────────────────────────────────────────────── */
router.post('/:id/share', authMiddleware, async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id obrigatório' });

    const [[record]] = await db.query(
      'SELECT id, professional_id, shared_with FROM medical_records WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (!record) return res.status(404).json({ error: 'Registro não encontrado' });
    if (record.professional_id !== req.user.id && !['admin','super_admin'].includes(req.user.role))
      return res.status(403).json({ error: 'Apenas o responsável pode compartilhar este registro.' });

    // Verifica se o profissional a compartilhar é do mesmo tenant
    const [[target]] = await db.query('SELECT id, name FROM users WHERE id = ? AND tenant_id = ?', [user_id, req.user.tenant_id]);
    if (!target) return res.status(404).json({ error: 'Profissional não encontrado neste sistema.' });

    let list = [];
    try { list = JSON.parse(record.shared_with || '[]'); } catch {}
    if (!list.includes(Number(user_id))) list.push(Number(user_id));

    await db.query('UPDATE medical_records SET shared_with = ? WHERE id = ?', [JSON.stringify(list), req.params.id]);
    await logAudit(req.params.id, req.user.id, req.user.tenant_id, 'updated', { action: 'shared_with', target_user: user_id });

    res.json({ ok: true, shared_with: list, target_name: target.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao compartilhar' });
  }
});

/* ──────────────────────────────────────────────────────────
   DELETE /medical-records/:id/share/:userId — revogar compartilhamento
────────────────────────────────────────────────────────── */
router.delete('/:id/share/:userId', authMiddleware, async (req, res) => {
  try {
    const [[record]] = await db.query(
      'SELECT id, professional_id, shared_with FROM medical_records WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (!record) return res.status(404).json({ error: 'Registro não encontrado' });
    if (record.professional_id !== req.user.id && !['admin','super_admin'].includes(req.user.role))
      return res.status(403).json({ error: 'Apenas o responsável pode revogar o compartilhamento.' });

    let list = [];
    try { list = JSON.parse(record.shared_with || '[]'); } catch {}
    list = list.filter(id => id !== Number(req.params.userId));

    await db.query('UPDATE medical_records SET shared_with = ? WHERE id = ?', [JSON.stringify(list), req.params.id]);
    res.json({ ok: true, shared_with: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao revogar compartilhamento' });
  }
});

/* ──────────────────────────────────────────────────────────
   GET /medical-records/stats — DEVE vir ANTES de /:id
────────────────────────────────────────────────────────── */
router.get('/stats', authMiddleware, checkPermission('view_medical_records'), async (req, res) => {
  try {
    const tid = req.user.tenant_id;
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM medical_records WHERE tenant_id = ?', [tid]);
    const [[{ thisMonth }]] = await db.query("SELECT COUNT(*) as thisMonth FROM medical_records WHERE tenant_id = ? AND MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())", [tid]);
    const [[{ approved }]] = await db.query("SELECT COUNT(*) as approved FROM medical_records WHERE tenant_id = ? AND (status = 'Aprovado' OR status = 'Finalizado')", [tid]);
    const [[{ drafts }]] = await db.query("SELECT COUNT(*) as drafts FROM medical_records WHERE tenant_id = ? AND status = 'Rascunho'", [tid]);
    const [byType] = await db.query('SELECT record_type, COUNT(*) as count FROM medical_records WHERE tenant_id = ? GROUP BY record_type ORDER BY count DESC', [tid]);
    const [byMonth] = await db.query(`SELECT DATE_FORMAT(created_at,'%Y-%m') as month, COUNT(*) as count FROM medical_records WHERE tenant_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY month ORDER BY month ASC`, [tid]);
    const [topPatients] = await db.query(`SELECT p.name as patient_name, COUNT(r.id) as count FROM medical_records r JOIN patients p ON p.id = r.patient_id WHERE r.tenant_id = ? GROUP BY r.patient_id ORDER BY count DESC LIMIT 5`, [tid]);
    res.json({ total, thisMonth, approved, drafts, byType, byMonth, topPatients });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

/* ──────────────────────────────────────────────────────────
   Prompt canônico — compartilhado pelos dois endpoints de IA
────────────────────────────────────────────────────────── */
const AI_SYSTEM_PROMPT = `Você é uma assistente de organização de prontuário psicológico.
Sua função é reorganizar o texto bruto escrito pela psicóloga em formato técnico, ético, claro, objetivo e sucinto.
Regras obrigatórias:
- Não invente fatos não informados pela psicóloga
- Não emita diagnóstico se não foi explicitamente informado
- Não use linguagem moralista, acusatória ou opinativa
- Separe o conteúdo padrão do que deve permanecer em campo restrito
- Preserve o sigilo e reduza detalhes íntimos desnecessários
- Sinalize com [REVISAR] pontos ambíguos para revisão humana
- Mantenha coerência temporal
- Padronize linguagem clínica técnica
- Diferencie fato relatado pela paciente de observação clínica do profissional
- Quando houver risco, encaminhamento ou intercorrência, destaque no campo apropriado

Retorne SOMENTE um JSON válido com esta estrutura:
{
  "motivo_consulta": "...",
  "contexto_relevante": "...",
  "observacoes_clinicas": "...",
  "intervencoes_realizadas": "...",
  "evolucao_resposta": "...",
  "plano_terapeutico": "...",
  "encaminhamentos": "...",
  "observacao_complementar": "...",
  "conteudo_restrito": "... (apenas para uso interno - não entra em exportação padrão)",
  "pontos_revisao": ["..."],
  "classificacao": "apto_padrao | necessita_revisao | manter_restrito"
}`;

/* ──────────────────────────────────────────────────────────
   POST /medical-records/organize-ai — organizar WITHOUT existing record
   (usado para novos registros ainda não salvos)
────────────────────────────────────────────────────────── */
router.post('/organize-ai', authMiddleware, async (req, res) => {
  try {
    const { draft_content, patient_context } = req.body;
    if (!draft_content) return res.status(400).json({ error: 'Rascunho vazio' });

    const organized = {
      motivo_consulta: '', contexto_relevante: draft_content,
      observacoes_clinicas: '', intervencoes_realizadas: '',
      evolucao_resposta: '', plano_terapeutico: '',
      encaminhamentos: '', observacao_complementar: '',
      conteudo_restrito: '',
      pontos_revisao: ['IA indisponível — preencha cada campo manualmente.'],
      classificacao: 'necessita_revisao'
    };

    try {
      const aiResp = await fetch(`http://localhost:${process.env.PORT || 3013}/api/ai/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.authorization },
        body: JSON.stringify({
          system: AI_SYSTEM_PROMPT,
          prompt: `Contexto do paciente: ${patient_context || 'Não informado'}\n\nRascunho da sessão:\n${draft_content}`,
          max_tokens: 2000
        })
      });
      if (aiResp.ok) {
        const aiData = await aiResp.json();
        const raw = aiData.text || aiData.content || aiData.result || '';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) Object.assign(organized, JSON.parse(jsonMatch[0]));
      }
    } catch { /* IA indisponível — retorna estrutura básica para preenchimento manual */ }

    res.json({ organized, ai_status: 'organized' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao organizar com IA' });
  }
});

/* ──────────────────────────────────────────────────────────
   POST /medical-records/log-export — registrar exportação no audit
   Chamado pelo frontend após gerar PDF/Word (geração é client-side)
────────────────────────────────────────────────────────── */
router.post('/log-export', authMiddleware, async (req, res) => {
  try {
    const { record_ids, patient_id, export_mode, export_format } = req.body;
    // Loga uma entrada de audit por registro exportado
    const ids = Array.isArray(record_ids) ? record_ids : [];
    for (const rid of ids) {
      await logAudit(rid, req.user.id, req.user.tenant_id, 'exported', {
        patient_id, export_mode, export_format
      });
    }
    res.json({ ok: true, logged: ids.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar exportação' });
  }
});

/* ──────────────────────────────────────────────────────────
   GET /medical-records/:id — registro completo
────────────────────────────────────────────────────────── */
router.get('/:id', authMiddleware, checkPermission('view_medical_records'), async (req, res) => {
  try {

    const [rows] = await db.query(
      `SELECT r.*, p.name as patient_name, u.name as professional_name, u.email as professional_email
       FROM medical_records r
       LEFT JOIN patients p ON p.id = r.patient_id
       LEFT JOIN users u ON u.id = r.professional_id
       WHERE r.id = ? AND r.tenant_id = ?`,
      [req.params.id, req.user.tenant_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Prontuário não encontrado' });
    const record = rows[0];

    const [attachments] = await db.query(
      'SELECT id, file_name, file_url, file_type, file_size FROM medical_record_attachments WHERE record_id = ?',
      [record.id]
    );
    const [versions] = await db.query(
      'SELECT id, version_number, status, created_at, content FROM medical_record_versions WHERE record_id = ? ORDER BY version_number DESC LIMIT 10',
      [record.id]
    );
    const [audit] = await db.query(
      `SELECT a.*, u.name as user_name FROM medical_record_audit a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.record_id = ? ORDER BY a.created_at DESC LIMIT 20`,
      [record.id]
    );

    record.attachments = attachments;
    record.versions = versions;
    record.audit = audit;
    record.tags = parseJson(record.tags);

    await logAudit(record.id, req.user.id, req.user.tenant_id, 'viewed');
    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar prontuário' });
  }
});

/* ──────────────────────────────────────────────────────────
   POST /medical-records — criar novo
────────────────────────────────────────────────────────── */
router.post('/', authMiddleware, checkPermission('create_medical_record'), async (req, res) => {
  try {
    const {
      patient_id, appointment_id, content, restricted_content,
      record_type, title, status, tags, start_time, end_time,
      appointment_type, attachments,
      draft_content, // rascunho bruto antes da IA
      ai_organized_content, ai_status
    } = req.body;

    if (!patient_id) return res.status(400).json({ error: 'Paciente é obrigatório' });

    // SEGURANÇA: Verificar se o paciente pertence a este tenant
    const [[patient]] = await db.query('SELECT id FROM patients WHERE id = ? AND tenant_id = ?', [patient_id, req.user.tenant_id]);
    if (!patient) return res.status(403).json({ error: 'Paciente não encontrado ou acesso negado nesta clínica.' });

    // SEGURANÇA: Se houver agendamento, verificar se ele também pertence ao tenant
    if (appointment_id) {
       const [[apt]] = await db.query('SELECT id FROM appointments WHERE id = ? AND tenant_id = ?', [appointment_id, req.user.tenant_id]);
       if (!apt) return res.status(403).json({ error: 'Agendamento não pertence a esta clínica.' });
    }

    const tagsStr = tags ? JSON.stringify(Array.isArray(tags) ? tags : []) : null;

    const [result] = await db.query(
      `INSERT INTO medical_records 
       (tenant_id, patient_id, professional_id, appointment_id,
        content, restricted_content, draft_content, ai_organized_content,
        record_type, type, title, status, ai_status, tags,
        start_time, end_time, appointment_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.tenant_id, patient_id, req.user.id, appointment_id || null,
        content || null, restricted_content || null, draft_content || null, ai_organized_content || null,
        record_type || 'Evolucao', record_type || 'Evolucao', title || null,
        status || 'Rascunho', ai_status || 'pending', tagsStr,
        start_time || null, end_time || null, appointment_type || 'individual'
      ]
    );

    const recordId = result.insertId;

    // Salvar versão inicial
    await db.query(
      'INSERT INTO medical_record_versions (record_id, version_number, content, status, created_by) VALUES (?, 1, ?, ?, ?)',
      [recordId, content || '', status || 'Rascunho', req.user.id]
    );

    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        await db.query(
          'INSERT INTO medical_record_attachments (record_id, file_name, file_url, file_type, file_size) VALUES (?, ?, ?, ?, ?)',
          [recordId, att.file_name, att.file_url, att.file_type || null, att.file_size || null]
        );
      }
    }

    await logAudit(recordId, req.user.id, req.user.tenant_id, 'created', { status, record_type });

    const [record] = await db.query('SELECT * FROM medical_records WHERE id = ?', [recordId]);
    res.status(201).json(record[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar prontuário' });
  }
});

/* ──────────────────────────────────────────────────────────
   PUT /medical-records/:id — atualizar
────────────────────────────────────────────────────────── */
router.put('/:id', authMiddleware, checkPermission('edit_medical_record'), async (req, res) => {
  try {
    const {
      content, restricted_content, draft_content, ai_organized_content,
      record_type, title, status, ai_status, tags,
      start_time, end_time, appointment_type, attachments
    } = req.body;

    const [existing] = await db.query(
      'SELECT id, version_count FROM medical_records WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Prontuário não encontrado' });

    const tagsStr = tags ? JSON.stringify(Array.isArray(tags) ? tags : []) : undefined;
    const nextVersion = (existing[0].version_count || 1) + 1;

    await db.query(
      `UPDATE medical_records SET
        content = COALESCE(?, content),
        restricted_content = COALESCE(?, restricted_content),
        draft_content = COALESCE(?, draft_content),
        ai_organized_content = COALESCE(?, ai_organized_content),
        type = COALESCE(?, type),
        record_type = COALESCE(?, record_type),
        title = COALESCE(?, title),
        status = COALESCE(?, status),
        ai_status = COALESCE(?, ai_status),
        tags = COALESCE(?, tags),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        appointment_type = COALESCE(?, appointment_type),
        version_count = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [
        content ?? null, restricted_content ?? null, draft_content ?? null, ai_organized_content ?? null,
        record_type ?? null, record_type ?? null, title ?? null,
        status ?? null, ai_status ?? null, tagsStr ?? null,
        start_time ?? null, end_time ?? null, appointment_type ?? null,
        nextVersion, req.params.id
      ]
    );

    // Salvar nova versão
    if (content !== undefined || status !== undefined) {
      await db.query(
        'INSERT INTO medical_record_versions (record_id, version_number, content, status, created_by) VALUES (?, ?, ?, ?, ?)',
        [req.params.id, nextVersion, content || '', status || 'Rascunho', req.user.id]
      );
    }

    // Sincronizar anexos
    if (attachments && Array.isArray(attachments)) {
      await db.query('DELETE FROM medical_record_attachments WHERE record_id = ?', [req.params.id]);
      for (const att of attachments) {
        await db.query(
          'INSERT INTO medical_record_attachments (record_id, file_name, file_url, file_type, file_size) VALUES (?, ?, ?, ?, ?)',
          [req.params.id, att.file_name, att.file_url, att.file_type || null, att.file_size || null]
        );
      }
    }

    await logAudit(req.params.id, req.user.id, req.user.tenant_id, 'updated', { status, ai_status });

    const [updated] = await db.query(
      `SELECT r.*, p.name as patient_name, u.name as professional_name
       FROM medical_records r
       LEFT JOIN patients p ON p.id = r.patient_id
       LEFT JOIN users u ON u.id = r.professional_id
       WHERE r.id = ?`,
      [req.params.id]
    );
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar prontuário' });
  }
});

/* ──────────────────────────────────────────────────────────
   POST /medical-records/:id/approve — aprovar registro
   Requer senha do profissional
────────────────────────────────────────────────────────── */
router.post('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Senha obrigatória para aprovação' });

    // Verificar senha
    const [[user]] = await db.query('SELECT password_hash FROM users WHERE id = ? AND tenant_id = ?', [req.user.id, req.user.tenant_id]);
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Senha incorreta' });

    const [existing] = await db.query('SELECT id FROM medical_records WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Prontuário não encontrado' });

    await db.query(
      'UPDATE medical_records SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
      ['Aprovado', req.user.id, req.params.id]
    );

    await logAudit(req.params.id, req.user.id, req.user.tenant_id, 'approved');
    res.json({ ok: true, message: 'Registro aprovado com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao aprovar prontuário' });
  }
});

/* ──────────────────────────────────────────────────────────
   POST /medical-records/:id/organize-ai — organizar com IA
────────────────────────────────────────────────────────── */
router.post('/:id/organize-ai', authMiddleware, async (req, res) => {
  try {
    const { draft_content, patient_context } = req.body;
    if (!draft_content) return res.status(400).json({ error: 'Rascunho vazio' });

    const [rows] = await db.query('SELECT * FROM medical_records WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Prontuário não encontrado' });

    let organized = {
      motivo_consulta: '',
      contexto_relevante: draft_content,
      observacoes_clinicas: '',
      intervencoes_realizadas: '',
      evolucao_resposta: '',
      plano_terapeutico: '',
      encaminhamentos: '',
      observacao_complementar: '',
      conteudo_restrito: '',
      pontos_revisao: ['IA indisponível — preencha cada campo manualmente.'],
      classificacao: 'necessita_revisao'
    };

    try {
      const aiResponse = await fetch(`http://localhost:${process.env.PORT || 3013}/api/ai/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization
        },
        body: JSON.stringify({
          system: AI_SYSTEM_PROMPT,
          prompt: `Contexto do paciente: ${patient_context || 'Não informado'}\n\nRascunho da sessão:\n${draft_content}`,
          max_tokens: 2000
        })
      });
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        try {
          const raw = aiData.text || aiData.content || aiData.result || '';
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) Object.assign(organized, JSON.parse(jsonMatch[0]));
        } catch { /* resposta da IA mal formatada — mantém fallback */ }
      }
    } catch (e) { console.warn('[organize-ai] IA indisponível:', e.message); }

    // Salvar rascunho e resultado da IA
    await db.query(
      'UPDATE medical_records SET draft_content = ?, ai_organized_content = ?, ai_status = ?, updated_at = NOW() WHERE id = ?',
      [draft_content, JSON.stringify(organized), 'organized', req.params.id]
    );

    await logAudit(req.params.id, req.user.id, req.user.tenant_id, 'ai_organized', { classification: organized.classificacao });
    res.json({ organized, ai_status: 'organized' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao organizar com IA' });
  }
});

/* ──────────────────────────────────────────────────────────
   GET /medical-records/:id/restricted — conteúdo restrito
   Requer verificação de senha
────────────────────────────────────────────────────────── */
router.post('/:id/restricted', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Senha necessária' });

    const [[user]] = await db.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Senha incorreta' });

    const [[record]] = await db.query(
      'SELECT restricted_content, ai_organized_content FROM medical_records WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (!record) return res.status(404).json({ error: 'Registro não encontrado' });

    await logAudit(req.params.id, req.user.id, req.user.tenant_id, 'restricted_accessed');
    res.json({
      restricted_content: record.restricted_content,
      ai_restricted: (() => {
        try { const j = JSON.parse(record.ai_organized_content || '{}'); return j.conteudo_restrito || null; } catch { return null; }
      })()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao acessar conteúdo restrito' });
  }
});

/* ──────────────────────────────────────────────────────────
   GET /medical-records/:id/audit — histórico de auditoria
────────────────────────────────────────────────────────── */
router.get('/:id/audit', authMiddleware, async (req, res) => {
  try {
    const [audit] = await db.query(
      `SELECT a.*, u.name as user_name FROM medical_record_audit a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.record_id = ? AND a.tenant_id = ?
       ORDER BY a.created_at DESC`,
      [req.params.id, req.user.tenant_id]
    );
    res.json(audit);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar auditoria' });
  }
});

/* ──────────────────────────────────────────────────────────
   DELETE /medical-records/:id
────────────────────────────────────────────────────────── */
router.delete('/:id', authMiddleware, checkPermission('edit_medical_record'), async (req, res) => {
  try {
    // SEGURANÇA: Verificar existência e posse primeiro
    const [[record]] = await db.query('SELECT id FROM medical_records WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    if (!record) return res.status(404).json({ error: 'Prontuário não encontrado' });

    // Só deleta dependentes se o registro for dele
    await db.query('DELETE FROM medical_record_attachments WHERE record_id = ?', [req.params.id]);
    await db.query('DELETE FROM medical_record_versions WHERE record_id = ?', [req.params.id]);
    await db.query('DELETE FROM medical_records WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    
    await logAudit(req.params.id, req.user.id, req.user.tenant_id, 'deleted');
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar prontuário' });
  }
});

/* ──────────────────────────────────────────────────────────
   PROMPT PARA SÍNTESE CLÍNICA (IA)
────────────────────────────────────────────────────────── */
const CLINICAL_SYNTHESIS_PROMPT = `Você é uma assistente de síntese clínica avançada (Aurora IA).
Sua função é integrar múltiplos dados de um paciente (Anamneses, Escalas, Outros Instrumentos) em uma FORMULAÇÃO DE CASO coesa e estruturada.
Você deve utilizar estritamente a abordagem teórica especificada pelo profissional.

Estrutura da resposta (Markdown):
1. **Síntese dos Dados Coletados** (Panorama Geral)
2. **Formulação do Caso** (Sob a ótica da abordagem clínica selecionada)
3. **Hipóteses Diagnósticas / Pontos de Atenção**
4. **Planejamento Terapêutico Sugerido**

Regras:
- Utilize terminologia técnica da abordagem selecionada.
- Seja empático, mas rigorosamente científico.
- Destaque correlações entre diferentes instrumentos.
- Sinalize lacunas de informação que necessitam de mais investigação.
`;

/* ──────────────────────────────────────────────────────────
   POST /medical-records/generate-synthesis — gerar síntese multidimensional
────────────────────────────────────────────────────────── */
router.post('/generate-synthesis', authMiddleware, async (req, res) => {
  try {
    const { patient_id, approach, sources, context } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'patient_id obrigatório' });

    // Enriquecer o contexto com dados reais do banco se as fontes foram informadas
    let enrichedContext = context || '';

    if (sources && Array.isArray(sources)) {
      for (const src of sources) {
        if (src.type === 'anamnese' && src.id) {
          // Buscar respostas reais da anamnese se o contexto não contém dados suficientes
          try {
            const [[anamData]] = await db.query(
              'SELECT responses, title FROM anamnesis_sends WHERE id = ? AND tenant_id = ?',
              [src.id, req.user.tenant_id]
            );
            if (anamData && anamData.responses) {
              const responses = typeof anamData.responses === 'string'
                ? JSON.parse(anamData.responses) : anamData.responses;
              // Se o contexto não já contém as respostas detalhadas, acrescentar
              if (!enrichedContext.includes('Motivo da busca') && !enrichedContext.includes('motivo_busca')) {
                enrichedContext += `\n\n--- DADOS COMPLETOS DA ANAMNESE (${anamData.title || 'Anamnese'}) ---\n`;
                for (const [key, value] of Object.entries(responses)) {
                  if (value && String(value).trim()) {
                    enrichedContext += `${key}: ${String(value)}\n`;
                  }
                }
              }
            }
          } catch (e) {
            console.warn('Erro ao buscar dados da anamnese para síntese:', e.message);
          }
        }
      }
    }

    if (!enrichedContext.trim()) {
      return res.status(400).json({ error: 'Nenhum dado disponível para gerar a síntese. Verifique se as fontes selecionadas possuem dados.' });
    }

    // Chamar o endpoint de IA para completar
    const aiResp = await fetch(`http://localhost:${process.env.PORT || 3013}/api/ai/complete`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': req.headers.authorization 
      },
      body: JSON.stringify({
        system: CLINICAL_SYNTHESIS_PROMPT,
        prompt: `Abordagem Selecionada: ${approach}\n\n${enrichedContext}`,
        max_tokens: 2500,
        temperature: 0.7
      })
    });

    if (!aiResp.ok) {
      const errBody = await aiResp.text().catch(() => '');
      console.error('Falha na comunicação com Aurora IA:', aiResp.status, errBody);
      return res.status(502).json({ error: 'Falha na comunicação com o serviço de IA. Tente novamente.' });
    }

    const aiData = await aiResp.json();
    const content = aiData.text || aiData.content || aiData.result || '';

    if (!content || content.length < 50) {
      console.error('IA retornou conteúdo vazio ou muito curto:', content);
      return res.status(502).json({ error: 'A IA não conseguiu gerar uma síntese válida. Tente novamente com mais dados.' });
    }

    res.json({ content });
  } catch (err) {
    console.error('Erro ao gerar síntese clínica:', err);
    res.status(500).json({ error: 'Erro ao gerar síntese clínica com IA' });
  }
});

module.exports = router;
