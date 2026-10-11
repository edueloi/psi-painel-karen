// Registro de acesso a documentos entregues (protocolo de recebimento). Somente inserção na trilha;
// os contadores em document_deliveries são agregados da própria trilha.
const db = require('../db');
const integrity = require('./documentIntegrity');

async function recordDeliveryEvent(delivery, type, ip, userAgent) {
  const ipHash = integrity.hashIp(ip);
  const ua = integrity.summarizeUa(userAgent);
  await db.query(
    'INSERT INTO document_delivery_events (tenant_id, delivery_id, doc_instance_id, event_type, ip_hash, ua) VALUES (?, ?, ?, ?, ?, ?)',
    [delivery.tenant_id, delivery.id, delivery.doc_instance_id, type, ipHash, ua]
  );
  if (type === 'view') {
    await db.query(
      `UPDATE document_deliveries SET view_count = view_count + 1, first_viewed_at = COALESCE(first_viewed_at, NOW()),
              last_viewed_at = NOW(), last_ip_hash = ?, last_ua = ? WHERE id = ? AND tenant_id = ?`,
      [ipHash, ua, delivery.id, delivery.tenant_id]
    );
  } else {
    await db.query(
      `UPDATE document_deliveries SET download_count = download_count + 1, first_downloaded_at = COALESCE(first_downloaded_at, NOW()),
              last_ip_hash = ?, last_ua = ? WHERE id = ? AND tenant_id = ?`,
      [ipHash, ua, delivery.id, delivery.tenant_id]
    );
  }
}

/** Entrega do canal "portal" para o documento (cria sob demanda quando o paciente abre pelo portal). */
async function ensurePortalDelivery(tenantId, patientId, docId) {
  const [found] = await db.query(
    "SELECT * FROM document_deliveries WHERE tenant_id = ? AND doc_instance_id = ? AND patient_id = ? AND channel = 'portal' ORDER BY id ASC LIMIT 1",
    [tenantId, docId, patientId]
  );
  if (found[0]) return found[0];
  const { tokenHash } = integrity.newDeliveryToken();
  const [r] = await db.query(
    "INSERT INTO document_deliveries (tenant_id, doc_instance_id, patient_id, channel, token_hash, created_by, expires_at) VALUES (?, ?, ?, 'portal', ?, NULL, ?)",
    [tenantId, docId, patientId, tokenHash, integrity.tokenExpiry(3650)]
  );
  const [row] = await db.query('SELECT * FROM document_deliveries WHERE id = ?', [r.insertId]);
  return row[0];
}

module.exports = { recordDeliveryEvent, ensurePortalDelivery };
