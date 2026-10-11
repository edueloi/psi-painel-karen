// Entrega pública de documento por token imprevisível (256 bits). Sem login.
// A primeira visualização e cada download viram o PROTOCOLO DE RECEBIMENTO (somente inserção em
// document_delivery_events). O token só existe em hash no banco. Nunca expõe outros dados do paciente/clínica.
const express = require('express');
const router = express.Router();
const db = require('../db');
const integrity = require('../utils/documentIntegrity');
const { recordDeliveryEvent } = require('../utils/documentDeliveryLog');

// Limite simples em memória por IP (60 req/min) — suficiente contra varredura de tokens.
const hits = new Map();
function rateLimit(req, res, next) {
  const key = integrity.hashIp(req.ip);
  const now = Date.now();
  const entry = hits.get(key) || { n: 0, reset: now + 60000 };
  if (now > entry.reset) { entry.n = 0; entry.reset = now + 60000; }
  entry.n += 1;
  hits.set(key, entry);
  if (hits.size > 5000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
  if (entry.n > 60) return res.status(429).json({ error: 'Muitas tentativas. Aguarde um minuto.' });
  next();
}

async function findDelivery(token) {
  if (!integrity.isValidTokenFormat(token)) return null;
  const [rows] = await db.query(
    `SELECT x.*, d.title, d.rendered_html, d.signature_mode, d.signed_file_hash, d.pdf_hash, d.version, d.created_at AS issued_at,
            d.archived_at
       FROM document_deliveries x
       JOIN doc_instances d ON d.id = x.doc_instance_id AND d.tenant_id = x.tenant_id
      WHERE x.token_hash = ? LIMIT 1`,
    [integrity.hashToken(token)]
  );
  return rows[0] || null;
}

const recordEvent = (req, delivery, type) => recordDeliveryEvent(delivery, type, req.ip, req.get('user-agent'));

const gone = (res) => res.status(404).json({ error: 'Link inválido ou expirado. Solicite um novo envio ao profissional.' });

// GET /public/documents/:token — metadados (+ HTML sanitizado quando não há PDF) e registro da visualização
router.get('/:token', rateLimit, async (req, res) => {
  try {
    const delivery = await findDelivery(req.params.token);
    if (!delivery || integrity.isExpired(delivery.expires_at)) return gone(res);
    await recordEvent(req, delivery, 'view');
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      title: delivery.title,
      issued_at: delivery.issued_at,
      version: delivery.version || 1,
      signature_mode: delivery.signature_mode || 'none',
      has_pdf: !!(delivery.pdf_hash || delivery.signed_file_hash),
      html: delivery.pdf_hash || delivery.signed_file_hash ? null : integrity.sanitizeHtml(delivery.rendered_html),
      expires_at: delivery.expires_at,
    });
  } catch (err) {
    console.error('[public-documents] ver:', err.message);
    res.status(500).json({ error: 'Erro ao abrir o documento.' });
  }
});

// GET /public/documents/:token/file[?download=1] — PDF oficial (assinado externamente quando houver)
router.get('/:token/file', rateLimit, async (req, res) => {
  try {
    const delivery = await findDelivery(req.params.token);
    if (!delivery || integrity.isExpired(delivery.expires_at)) return gone(res);
    const kind = delivery.signed_file_hash ? 'signed_external' : 'generated';
    const [files] = await db.query(
      'SELECT data FROM doc_instance_files WHERE doc_instance_id = ? AND tenant_id = ? AND kind = ? ORDER BY id DESC LIMIT 1',
      [delivery.doc_instance_id, delivery.tenant_id, kind]
    );
    if (!files.length) return gone(res);
    const download = req.query.download === '1';
    if (download) await recordEvent(req, delivery, 'download');
    const safeName = String(delivery.title || 'documento').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'documento';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${safeName}.pdf"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(files[0].data);
  } catch (err) {
    console.error('[public-documents] arquivo:', err.message);
    res.status(500).json({ error: 'Erro ao baixar o documento.' });
  }
});

module.exports = router;
