const express = require('express');
const router = express.Router();
const db = require('../db');
const { authorize, checkPermission } = require('../middleware/auth');
const { ensureStatements } = require('../utils/schemaMigrate');
const { getFrontendUrl } = require('../utils/publicUrl');
const integrity = require('../utils/documentIntegrity');

// ── Esquema: documentos emitidos, arquivos (PDF), entregas e trilha de acesso (somente inserção) ──
ensureStatements([
  `CREATE TABLE IF NOT EXISTS doc_instances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    patient_id INT NULL,
    template_id INT NULL,
    title VARCHAR(255) NOT NULL,
    rendered_html LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  'ALTER TABLE doc_instances ADD COLUMN doc_type VARCHAR(50) NULL',
  'ALTER TABLE doc_instances ADD COLUMN content_hash CHAR(64) NULL',
  'ALTER TABLE doc_instances ADD COLUMN pdf_hash CHAR(64) NULL',
  'ALTER TABLE doc_instances ADD COLUMN version INT NOT NULL DEFAULT 1',
  'ALTER TABLE doc_instances ADD COLUMN replaces_id INT NULL',
  'ALTER TABLE doc_instances ADD COLUMN issuer_id INT NULL',
  'ALTER TABLE doc_instances ADD COLUMN issuer_name VARCHAR(255) NULL',
  "ALTER TABLE doc_instances ADD COLUMN signature_mode VARCHAR(20) NOT NULL DEFAULT 'none'",
  'ALTER TABLE doc_instances ADD COLUMN meta_json LONGTEXT NULL',
  'ALTER TABLE doc_instances ADD COLUMN signed_file_hash CHAR(64) NULL',
  'ALTER TABLE doc_instances ADD COLUMN signed_file_size INT NULL',
  'ALTER TABLE doc_instances ADD COLUMN signed_attached_at DATETIME NULL',
  'ALTER TABLE doc_instances ADD COLUMN signed_attached_by INT NULL',
  'ALTER TABLE doc_instances ADD COLUMN archived_at DATETIME NULL',
  'ALTER TABLE doc_instances ADD COLUMN archived_by INT NULL',
  `CREATE TABLE IF NOT EXISTS doc_instance_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    doc_instance_id INT NOT NULL,
    kind VARCHAR(20) NOT NULL,
    file_name VARCHAR(255) NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    size_bytes INT NOT NULL,
    sha256 CHAR(64) NOT NULL,
    data LONGBLOB NOT NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_doc_file (tenant_id, doc_instance_id, kind)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS document_deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    doc_instance_id INT NOT NULL,
    patient_id INT NULL,
    channel VARCHAR(20) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    first_viewed_at DATETIME NULL,
    last_viewed_at DATETIME NULL,
    view_count INT NOT NULL DEFAULT 0,
    first_downloaded_at DATETIME NULL,
    download_count INT NOT NULL DEFAULT 0,
    last_ip_hash VARCHAR(40) NULL,
    last_ua VARCHAR(120) NULL,
    UNIQUE KEY uq_delivery_token (token_hash),
    INDEX idx_delivery_doc (tenant_id, doc_instance_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS document_delivery_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    delivery_id INT NOT NULL,
    doc_instance_id INT NOT NULL,
    event_type VARCHAR(20) NOT NULL,
    ip_hash VARCHAR(40) NULL,
    ua VARCHAR(120) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_delivery_event (tenant_id, delivery_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
], 'doc-generator');

// Emissão/entrega de documentos: permissões existentes do projeto (qualquer uma das duas)
const anyOf = (...keys) => async (req, res, next) => {
  for (const key of keys) {
    let ok = false;
    await checkPermission(key)(req, { status: () => ({ json: () => {} }) }, () => { ok = true; });
    if (ok) return next();
  }
  res.status(403).json({ error: 'Sem permissão para esta ação' });
};
const canIssue = anyOf('manage_documents', 'view_medical_records');

// GET /doc-generator/doc-categories
router.get('/doc-categories', async (req, res) => {
  try {
    const [cats] = await db.query(
      'SELECT * FROM doc_categories WHERE tenant_id = ? ORDER BY name',
      [req.user.tenant_id]
    );
    res.json(cats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// POST /doc-generator/doc-categories
router.post('/doc-categories', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const [result] = await db.query(
      'INSERT INTO doc_categories (tenant_id, name) VALUES (?, ?)',
      [req.user.tenant_id, name]
    );

    const [cat] = await db.query('SELECT * FROM doc_categories WHERE id = ?', [result.insertId]);
    res.status(201).json(cat[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

// DELETE /doc-generator/doc-categories/:id
router.delete('/doc-categories/:id', authorize('admin', 'super_admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM doc_categories WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar categoria' });
  }
});

// GET /doc-generator/doc-templates
router.get('/doc-templates', async (req, res) => {
  try {
    const { category_id } = req.query;
    let query = `
      SELECT t.*, c.name as category_name
      FROM doc_templates t
      LEFT JOIN doc_categories c ON c.id = t.category_id
      WHERE t.tenant_id = ?
    `;
    const params = [req.user.tenant_id];

    if (category_id) { query += ' AND t.category_id = ?'; params.push(category_id); }
    query += ' ORDER BY t.title';

    const [templates] = await db.query(query, params);
    res.json(templates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar templates' });
  }
});

// GET /doc-generator/doc-templates/:id
router.get('/doc-templates/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM doc_templates WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Template não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar template' });
  }
});

// POST /doc-generator/doc-templates
router.post('/doc-templates', async (req, res) => {
  try {
    const { title, doc_type, template_body, category_id, header_logo_url, footer_logo_url, signature_name, signature_crp } = req.body;
    if (!title || !template_body) return res.status(400).json({ error: 'Título e corpo são obrigatórios' });

    const [result] = await db.query(
      'INSERT INTO doc_templates (tenant_id, title, doc_type, template_body, category_id, header_logo_url, footer_logo_url, signature_name, signature_crp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.user.tenant_id, title, doc_type || 'outros', template_body,
        category_id || null, header_logo_url || null, footer_logo_url || null,
        signature_name || null, signature_crp || null
      ]
    );

    const [tpl] = await db.query('SELECT * FROM doc_templates WHERE id = ?', [result.insertId]);
    res.status(201).json(tpl[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar template' });
  }
});

// PUT /doc-generator/doc-templates/:id
router.put('/doc-templates/:id', async (req, res) => {
  try {
    const { title, doc_type, template_body, category_id, header_logo_url, footer_logo_url, signature_name, signature_crp } = req.body;

    await db.query(
      `UPDATE doc_templates SET
        title = COALESCE(?, title),
        doc_type = ?,
        template_body = ?,
        category_id = ?,
        header_logo_url = ?,
        footer_logo_url = ?,
        signature_name = ?,
        signature_crp = ?
       WHERE id = ? AND tenant_id = ?`,
      [
        title, doc_type || 'outros', template_body,
        category_id || null, 
        header_logo_url || null, footer_logo_url || null,
        signature_name || null, signature_crp || null,
        req.params.id, req.user.tenant_id
      ]
    );

    const [updated] = await db.query('SELECT * FROM doc_templates WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar template' });
  }
});

// POST /doc-generator/doc-templates/:id/render
router.post('/doc-templates/:id/render', async (req, res) => {
  try {
    const { patient_id, data } = req.body;
    const [templates] = await db.query(
      'SELECT * FROM doc_templates WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (!templates.length) return res.status(404).json({ error: 'Template não encontrado' });
    const tpl = templates[0];

    let rendered = tpl.template_body;

    // Se houver paciente, busca dados reais para garantir placeholders
    let patientData = {};
    if (patient_id) {
      const [p] = await db.query('SELECT * FROM patients WHERE id = ? AND tenant_id = ?', [patient_id, req.user.tenant_id]);
      if (p.length) patientData = p[0];
    }

    const replacements = {
      '{{patient_name}}': data.patient_name || patientData.name || '',
      '{{nome_paciente}}': data.patient_name || patientData.name || '',
      '{{cpf_paciente}}': patientData.cpf || '',
      '{{patient_cpf}}': patientData.cpf || '',
      '{{date}}': data.date || '',
      '{{data}}': data.date || '',
      '{{city}}': data.city || '',
      '{{cidade}}': data.city || '',
      '{{professional_name}}': data.professional_name || '',
      '{{nome_profissional}}': data.professional_name || '',
      '{{professional_crp}}': data.professional_crp || '',
      '{{crp_profissional}}': data.professional_crp || '',
      '{{hora_inicio}}': data.time_start || '',
      '{{time_start}}': data.time_start || '',
      '{{hora_fim}}': data.time_end || '',
      '{{time_end}}': data.time_end || '',
      '{{valor}}': data.amount || '',
      '{{amount}}': data.amount || '',
      '{{servico}}': data.service_name || '',
      '{{service_name}}': data.service_name || '',
      '{{ano}}': data.year || '',
      '{{year}}': data.year || '',
      '{{mes_nome}}': data.month_name || '',
      '{{month_name}}': data.month_name || ''
    };

    Object.keys(replacements).forEach(key => {
      if (replacements[key] !== undefined && replacements[key] !== null) {
        rendered = rendered.split(key).join(String(replacements[key]));
      }
    });

    res.json({ rendered_html: rendered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao renderizar documento' });
  }
});

// ───────────── Documentos emitidos (doc-instances) ─────────────
// Regras: conteúdo congelado + SHA-256 na emissão; sem rota de edição (corrigir = nova versão que
// "substitui" a anterior); exclusão bloqueada por 5 anos; entregas e acessos são somente inserção.
const SIGNATURE_MODES = new Set(['none', 'simple']);
const str = (v, max) => String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
const toId = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : null; };

async function loadInstance(req, id) {
  if (!id) return null;
  const [rows] = await db.query('SELECT * FROM doc_instances WHERE id = ? AND tenant_id = ? LIMIT 1', [id, req.user.tenant_id]);
  const row = rows[0];
  if (!row) return null;
  // documentos antigos sem hash ganham hash na primeira leitura (não altera o conteúdo)
  if (!row.content_hash) {
    row.content_hash = integrity.sha256(row.rendered_html || '');
    await db.query('UPDATE doc_instances SET content_hash = ? WHERE id = ? AND tenant_id = ? AND content_hash IS NULL', [row.content_hash, row.id, row.tenant_id]);
  }
  return row;
}

async function insertFile(tenantId, docId, kind, buf, fileName, userId) {
  const sha = integrity.sha256(buf);
  await db.query(
    'INSERT INTO doc_instance_files (tenant_id, doc_instance_id, kind, file_name, mime_type, size_bytes, sha256, data, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [tenantId, docId, kind, fileName || null, 'application/pdf', buf.length, sha, buf, userId || null]
  );
  return sha;
}

const publicInstance = (r) => ({
  id: r.id, title: r.title, doc_type: r.doc_type || null, patient_id: r.patient_id, patient_name: r.patient_name || null,
  version: r.version || 1, replaces_id: r.replaces_id || null, issuer_name: r.issuer_name || null,
  issued_at: r.created_at, signature_mode: r.signature_mode || 'none',
  content_hash: r.content_hash || null, pdf_hash: r.pdf_hash || null,
  signed_file_hash: r.signed_file_hash || null, signed_file_size: r.signed_file_size || null, signed_attached_at: r.signed_attached_at || null,
  archived_at: r.archived_at || null,
  retention_until: integrity.retentionUntil(r.created_at),
  has_pdf: !!(r.has_pdf), has_signed_pdf: !!(r.signed_file_hash),
  deliveries: Number(r.deliveries || 0), views: Number(r.views || 0), downloads: Number(r.downloads || 0),
  first_viewed_at: r.first_viewed_at || null,
});

// POST /doc-generator/doc-instances — emite (congela) um documento
router.post('/doc-instances', canIssue, async (req, res) => {
  try {
    const { template_id, patient_id, rendered_html, pdf_base64, replaces_id } = req.body || {};
    const title = str(req.body?.title, 255);
    const html = typeof rendered_html === 'string' ? rendered_html : '';
    if (!title || !html.trim()) return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });
    if (html.length > 2 * 1024 * 1024) return res.status(413).json({ error: 'Documento muito grande.' });
    const tenantId = req.user.tenant_id;
    const docType = str(req.body?.doc_type, 50) || null;
    const signatureMode = SIGNATURE_MODES.has(req.body?.signature_mode) ? req.body.signature_mode : 'none';

    let patientId = null;
    if (patient_id) {
      const [p] = await db.query('SELECT id FROM patients WHERE id = ? AND tenant_id = ? LIMIT 1', [patient_id, tenantId]);
      if (!p.length) return res.status(404).json({ error: 'Paciente não encontrado.' });
      patientId = p[0].id;
    }
    let version = 1; let replacesId = null;
    if (replaces_id) {
      const prev = await loadInstance(req, toId(replaces_id));
      if (!prev) return res.status(404).json({ error: 'Documento a substituir não encontrado.' });
      replacesId = prev.id; version = (prev.version || 1) + 1;
      if (patientId === null) patientId = prev.patient_id;
    }
    let pdfBuf = null;
    if (pdf_base64) {
      try { pdfBuf = integrity.decodePdfBase64(pdf_base64); } catch (e) { return res.status(400).json({ error: e.message }); }
    }
    // metadados mínimos congelados (nunca a imagem da assinatura)
    let meta = null;
    if (req.body?.meta && typeof req.body.meta === 'object') {
      const m = req.body.meta;
      meta = {
        professional_name: str(m.professional_name, 255), professional_registry: str(m.professional_registry, 80),
        signed_at: m.signed_at ? str(m.signed_at, 40) : null, requester: str(m.requester, 120), purpose: str(m.purpose, 255),
        cid_included: m.cid_included === true, cid_basis: m.cid_included === true ? str(m.cid_basis, 40) : null,
      };
    }
    const contentHash = integrity.sha256(html);
    const [result] = await db.query(
      `INSERT INTO doc_instances (tenant_id, patient_id, template_id, title, rendered_html, doc_type, content_hash, version, replaces_id,
         issuer_id, issuer_name, signature_mode, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, patientId, toId(template_id), title, html, docType, contentHash, version, replacesId,
        req.user.id || null, str(req.user.name, 255) || null, signatureMode, meta ? JSON.stringify(meta) : null]
    );
    let pdfHash = null;
    if (pdfBuf) {
      pdfHash = await insertFile(tenantId, result.insertId, 'generated', pdfBuf, null, req.user.id);
      await db.query('UPDATE doc_instances SET pdf_hash = ? WHERE id = ? AND tenant_id = ?', [pdfHash, result.insertId, tenantId]);
    }
    res.status(201).json({ id: result.insertId, version, content_hash: contentHash, pdf_hash: pdfHash });
  } catch (err) {
    console.error('[doc-instances] emitir:', err.message);
    res.status(500).json({ error: 'Erro ao salvar histórico de documento' });
  }
});

// GET /doc-generator/doc-instances?patient_id=&limit= — documentos emitidos (sem conteúdo)
router.get('/doc-instances', canIssue, async (req, res) => {
  try {
    const params = [req.user.tenant_id];
    let where = 'd.tenant_id = ?';
    const pid = toId(req.query.patient_id);
    if (req.query.patient_id && !pid) return res.status(400).json({ error: 'Paciente inválido.' });
    if (pid) { where += ' AND d.patient_id = ?'; params.push(pid); }
    if (req.query.include_archived !== '1') where += ' AND d.archived_at IS NULL';
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 300);
    const [rows] = await db.query(
      `SELECT d.id, d.title, d.doc_type, d.patient_id, p.name AS patient_name, d.version, d.replaces_id, d.issuer_name,
              d.created_at, d.signature_mode, d.content_hash, d.pdf_hash, d.signed_file_hash, d.signed_file_size,
              d.signed_attached_at, d.archived_at,
              (d.pdf_hash IS NOT NULL) AS has_pdf,
              (SELECT COUNT(*) FROM document_deliveries x WHERE x.doc_instance_id = d.id AND x.tenant_id = d.tenant_id) AS deliveries,
              (SELECT COALESCE(SUM(x.view_count),0) FROM document_deliveries x WHERE x.doc_instance_id = d.id AND x.tenant_id = d.tenant_id) AS views,
              (SELECT COALESCE(SUM(x.download_count),0) FROM document_deliveries x WHERE x.doc_instance_id = d.id AND x.tenant_id = d.tenant_id) AS downloads,
              (SELECT MIN(x.first_viewed_at) FROM document_deliveries x WHERE x.doc_instance_id = d.id AND x.tenant_id = d.tenant_id) AS first_viewed_at
         FROM doc_instances d LEFT JOIN patients p ON p.id = d.patient_id AND p.tenant_id = d.tenant_id
        WHERE ${where} ORDER BY d.created_at DESC, d.id DESC LIMIT ${limit}`,
      params
    );
    res.json(rows.map(publicInstance));
  } catch (err) {
    console.error('[doc-instances] listar:', err.message);
    res.status(500).json({ error: 'Erro ao listar documentos emitidos' });
  }
});

// GET /doc-generator/doc-instances/:id
router.get('/doc-instances/:id', canIssue, async (req, res) => {
  try {
    const row = await loadInstance(req, toId(req.params.id));
    if (!row) return res.status(404).json({ error: 'Documento não encontrado.' });
    let patientName = null;
    if (row.patient_id) {
      const [pat] = await db.query('SELECT name FROM patients WHERE id = ? AND tenant_id = ?', [row.patient_id, row.tenant_id]);
      patientName = pat[0]?.name || null;
    }
    let meta = null; try { meta = row.meta_json ? JSON.parse(row.meta_json) : null; } catch { meta = null; }
    res.json({ ...publicInstance({ ...row, patient_name: patientName, has_pdf: !!row.pdf_hash }), rendered_html: integrity.sanitizeHtml(row.rendered_html), meta });
  } catch (err) {
    console.error('[doc-instances] obter:', err.message);
    res.status(500).json({ error: 'Erro ao buscar documento' });
  }
});

// GET /doc-generator/doc-instances/:id/file?kind=official|generated|signed — PDF (autenticado)
router.get('/doc-instances/:id/file', canIssue, async (req, res) => {
  try {
    const row = await loadInstance(req, toId(req.params.id));
    if (!row) return res.status(404).json({ error: 'Documento não encontrado.' });
    const kind = req.query.kind === 'generated' ? 'generated' : req.query.kind === 'signed' ? 'signed_external' : (row.signed_file_hash ? 'signed_external' : 'generated');
    const [files] = await db.query(
      'SELECT data, sha256 FROM doc_instance_files WHERE doc_instance_id = ? AND tenant_id = ? AND kind = ? ORDER BY id DESC LIMIT 1',
      [row.id, row.tenant_id, kind]
    );
    if (!files.length) return res.status(404).json({ error: 'Este documento não possui arquivo PDF guardado.' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="documento.pdf"');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-SHA256', files[0].sha256);
    res.send(files[0].data);
  } catch (err) {
    console.error('[doc-instances] arquivo:', err.message);
    res.status(500).json({ error: 'Erro ao buscar arquivo' });
  }
});

// POST /doc-generator/doc-instances/:id/signed-pdf — anexa PDF assinado externamente (ICP-Brasil / Gov.br)
// O sistema NÃO assina: apenas recebe o arquivo, valida que é PDF, guarda o SHA-256 e passa a tratá-lo como oficial.
router.post('/doc-instances/:id/signed-pdf', canIssue, async (req, res) => {
  try {
    const row = await loadInstance(req, toId(req.params.id));
    if (!row) return res.status(404).json({ error: 'Documento não encontrado.' });
    let buf;
    try { buf = integrity.decodePdfBase64(req.body?.pdf_base64); } catch (e) { return res.status(400).json({ error: e.message }); }
    const name = str(req.body?.file_name, 200).replace(/[^\w.\- ()]/g, '_') || 'documento-assinado.pdf';
    const sha = await insertFile(row.tenant_id, row.id, 'signed_external', buf, name, req.user.id);
    await db.query(
      `UPDATE doc_instances SET signature_mode = 'external', signed_file_hash = ?, signed_file_size = ?, signed_attached_at = NOW(), signed_attached_by = ?
        WHERE id = ? AND tenant_id = ?`,
      [sha, buf.length, req.user.id || null, row.id, row.tenant_id]
    );
    res.json({ ok: true, sha256: sha, size: buf.length });
  } catch (err) {
    console.error('[doc-instances] pdf assinado:', err.message);
    res.status(500).json({ error: 'Erro ao anexar PDF assinado' });
  }
});

// POST /doc-generator/doc-instances/:id/deliveries — cria envio com token (devolvido uma única vez)
router.post('/doc-instances/:id/deliveries', canIssue, async (req, res) => {
  try {
    const row = await loadInstance(req, toId(req.params.id));
    if (!row) return res.status(404).json({ error: 'Documento não encontrado.' });
    if (!row.patient_id) return res.status(400).json({ error: 'Vincule o documento a um paciente para enviá-lo.' });
    const [files] = await db.query('SELECT id FROM doc_instance_files WHERE doc_instance_id = ? AND tenant_id = ? LIMIT 1', [row.id, row.tenant_id]);
    if (!files.length) return res.status(400).json({ error: 'Este documento não possui PDF guardado para envio. Emita uma nova versão.' });
    const channel = ['link', 'whatsapp', 'email', 'portal'].includes(req.body?.channel) ? req.body.channel : 'link';
    const { token, tokenHash } = integrity.newDeliveryToken();
    const expires = channel === 'portal' ? integrity.tokenExpiry(3650) : integrity.tokenExpiry(req.body?.expires_days);
    const [result] = await db.query(
      `INSERT INTO document_deliveries (tenant_id, doc_instance_id, patient_id, channel, token_hash, created_by, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [row.tenant_id, row.id, row.patient_id, channel, tokenHash, req.user.id || null, expires]
    );
    const url = channel === 'portal' ? null : `${getFrontendUrl(req).replace(/\/$/, '')}/documento/${token}`;
    res.status(201).json({ id: result.insertId, channel, expires_at: expires, url });
  } catch (err) {
    console.error('[doc-instances] entrega:', err.message);
    res.status(500).json({ error: 'Erro ao registrar envio' });
  }
});

// GET /doc-generator/doc-instances/:id/deliveries — trilha (nunca expõe token)
router.get('/doc-instances/:id/deliveries', canIssue, async (req, res) => {
  try {
    const row = await loadInstance(req, toId(req.params.id));
    if (!row) return res.status(404).json({ error: 'Documento não encontrado.' });
    const [rows] = await db.query(
      `SELECT x.id, x.channel, x.created_at, x.expires_at, x.first_viewed_at, x.last_viewed_at, x.view_count,
              x.first_downloaded_at, x.download_count, u.name AS created_by_name
         FROM document_deliveries x LEFT JOIN users u ON u.id = x.created_by
        WHERE x.doc_instance_id = ? AND x.tenant_id = ? ORDER BY x.id ASC`,
      [row.id, row.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[doc-instances] trilha:', err.message);
    res.status(500).json({ error: 'Erro ao buscar trilha de entrega' });
  }
});

// POST /doc-generator/doc-instances/:id/archive
router.post('/doc-instances/:id/archive', canIssue, async (req, res) => {
  try {
    const row = await loadInstance(req, toId(req.params.id));
    if (!row) return res.status(404).json({ error: 'Documento não encontrado.' });
    await db.query('UPDATE doc_instances SET archived_at = COALESCE(archived_at, NOW()), archived_by = COALESCE(archived_by, ?) WHERE id = ? AND tenant_id = ?', [req.user.id || null, row.id, row.tenant_id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao arquivar documento' });
  }
});

// DELETE /doc-generator/doc-instances/:id — bloqueado durante o período de guarda (5 anos) e quando há protocolo
router.delete('/doc-instances/:id', canIssue, async (req, res) => {
  try {
    const row = await loadInstance(req, toId(req.params.id));
    if (!row) return res.status(404).json({ error: 'Documento não encontrado.' });
    if (integrity.isRetained(row.created_at)) {
      return res.status(409).json({
        error: `Documento emitido não pode ser excluído antes de ${integrity.retentionUntil(row.created_at).toLocaleDateString('pt-BR')} (guarda mínima de ${integrity.RETENTION_YEARS} anos). Você pode arquivá-lo.`,
        retention_until: integrity.retentionUntil(row.created_at),
      });
    }
    const [dl] = await db.query('SELECT COUNT(*) AS n FROM document_deliveries WHERE doc_instance_id = ? AND tenant_id = ?', [row.id, row.tenant_id]);
    if (Number(dl[0]?.n || 0) > 0) {
      return res.status(409).json({ error: 'O protocolo de entrega deste documento não pode ser excluído. Você pode arquivá-lo.' });
    }
    await db.query('DELETE FROM doc_instance_files WHERE doc_instance_id = ? AND tenant_id = ?', [row.id, row.tenant_id]);
    await db.query('DELETE FROM doc_instances WHERE id = ? AND tenant_id = ?', [row.id, row.tenant_id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir documento' });
  }
});

// DELETE /doc-generator/doc-templates/:id
router.delete('/doc-templates/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM doc_templates WHERE id = ? AND tenant_id = ?', [req.params.id, req.user.tenant_id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar template' });
  }
});

// POST /doc-generator/seed-defaults
router.post('/seed-defaults', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    // 1. Criar Categorias Padrão
    const categories = ['Psicologia', 'Documentos Oficiais', 'Financeiro', 'Relatórios'];
    const catMap = {};

    for (const catName of categories) {
      const [existing] = await db.query('SELECT id FROM doc_categories WHERE tenant_id = ? AND name = ?', [tenantId, catName]);
      if (existing.length > 0) {
        catMap[catName] = existing[0].id;
      } else {
        const [result] = await db.query('INSERT INTO doc_categories (tenant_id, name) VALUES (?, ?)', [tenantId, catName]);
        catMap[catName] = result.insertId;
      }
    }

    // 2. Definir Templates Padrão
    const defaultTemplates = [
      {
        title: 'Atestado Psicológico',
        category: 'Psicologia',
        doc_type: 'atestado',
        body: `Atesto para os devidos fins que o(a) Sr(a). {{patient_name}}, portador(a) do CPF {{patient_cpf}}, encontra-se em acompanhamento psicológico nesta data, no período de {{time_start}} às {{time_end}}.

O referido paciente apresenta condições que o(a) impossibilitam de exercer suas atividades laborais/escolares pelo período de _______ dia(s).

{{city}}, {{date}}.`
      },
      {
        title: 'Declaração de Comparecimento',
        category: 'Documentos Oficiais',
        doc_type: 'declaracao',
        body: `Declaro para os devidos fins que {{patient_name}}, portador(a) do CPF {{patient_cpf}}, compareceu à sessão de psicoterapia no dia {{date}}, no horário das {{time_start}} às {{time_end}}.

A presente declaração é a expressão da verdade.

{{city}}, {{date}}.`
      },
      {
        title: 'Recibo (Valor)',
        category: 'Financeiro',
        doc_type: 'recibo',
        body: `Recebi de {{patient_name}}, portador(a) do CPF {{patient_cpf}}, a importância de R$ {{amount}} ({{amount_text}}), referente aos serviços de {{service_name}} realizados no período de __________.

Damos plena quitação pelo valor recebido.

{{city}}, {{date}}.`
      },
      {
        title: 'Evolução de Prontuário',
        category: 'Relatórios',
        doc_type: 'prontuario',
        body: `Sessão realizada em: {{date}}
Horário: {{time_start}} - {{time_end}}
Paciente: {{patient_name}}

SÍNTESE DA SESSÃO:
__________________________________________________________________
__________________________________________________________________
__________________________________________________________________

OBSERVAÇÕES:
__________________________________________________________________

PLANO DE AÇÃO:
__________________________________________________________________`
      },
      {
        title: 'Ficha de Anamnese (Simplificada)',
        category: 'Relatórios',
        doc_type: 'ficha',
        body: `DADOS DO PACIENTE:
Nome: {{patient_name}}
CPF: {{patient_cpf}}
Data da Entrevista: {{date}}

QUEIXA PRINCIPAL:
__________________________________________________________________

HISTÓRICO FAMILIAR:
__________________________________________________________________

HISTÓRICO DE SAÚDE:
__________________________________________________________________

OBSERVAÇÕES CLÍNICAS:
__________________________________________________________________`
      }
    ];

    for (const tpl of defaultTemplates) {
      const [existing] = await db.query('SELECT id FROM doc_templates WHERE tenant_id = ? AND title = ?', [tenantId, tpl.title]);
      if (existing.length === 0) {
        await db.query(
          `INSERT INTO doc_templates (tenant_id, title, doc_type, template_body, category_id, signature_name, signature_crp) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [tenantId, tpl.title, tpl.doc_type, tpl.body, catMap[tpl.category], req.user.name, req.user.crp || '']
        );
      }
    }

    res.json({ message: 'Modelos padrão importados com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao importar modelos padrão' });
  }
});

module.exports = router;
