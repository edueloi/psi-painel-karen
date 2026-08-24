const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');
const notificationService = require('../services/notificationService');

/** Gera token único seguro para o link do paciente */
function generateSecureToken() {
  return crypto.randomBytes(40).toString('hex');
}

async function ensureTablesExist() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS patient_registration_links (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token VARCHAR(128) NOT NULL UNIQUE,
      patient_id INT NOT NULL, professional_id INT NOT NULL, tenant_id INT NOT NULL,
      is_revoked TINYINT(1) DEFAULT 0,
      expires_at DATETIME NULL,
      opened_at DATETIME NULL,
      submitted_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_prl_token (token), INDEX idx_prl_patient (patient_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch (e) {
    console.warn('[patient-registration] ensureTablesExist:', e.message);
  }

  // Colunas de endereço "estilo portal" — mesmas usadas por patient-portal.js
  // PATCH /me. Garantidas aqui também (idempotente) para o caso de esta rota
  // rodar antes de qualquer uso do portal do paciente.
  const cols = [
    "ALTER TABLE patients ADD COLUMN street VARCHAR(255) NULL",
    "ALTER TABLE patients ADD COLUMN house_number VARCHAR(20) NULL",
    "ALTER TABLE patients ADD COLUMN neighborhood VARCHAR(100) NULL",
  ];
  for (const sql of cols) {
    try { await db.query(sql); } catch (e) { /* coluna já existe, ignorar */ }
  }
}
ensureTablesExist();

/* ─────────────────────────────────────────────────────────────
   POST /patient-registration/send
   Gera link seguro de atualização de cadastro e envia via WhatsApp
 ───────────────────────────────────────────────────────────── */
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { patient_id } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'Paciente é obrigatório' });

    const [[patient]] = await db.query(
      'SELECT id, name, phone FROM patients WHERE id = ? AND tenant_id = ?',
      [Number(patient_id), req.user.tenant_id]
    );
    if (!patient) return res.status(403).json({ error: 'Paciente não encontrado ou sem permissão' });

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600000); // 30 dias

    await db.query(
      `INSERT INTO patient_registration_links (token, patient_id, professional_id, tenant_id, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [token, Number(patient_id), Number(req.user.id), Number(req.user.tenant_id), expiresAt]
    );

    const publicLink = `${process.env.FRONTEND_URL || 'https://psiflux.com.br'}/f/cadastro?t=${token}`;
    const message = `Olá, ${patient.name}! 😊\n\nPor gentileza, atualize seu cadastro conosco clicando no link abaixo:\n${publicLink}\n\nLeva menos de 2 minutos. Qualquer dúvida, estou à disposição.`;

    const patientPhone = (patient.phone || '').replace(/\D/g, '');
    let sentViaBot = false;

    if (patientPhone.length >= 10) {
      // Só tenta enfileirar no bot se ele estiver de fato conectado — enqueue()
      // apenas insere na fila e quase nunca falha, então sem checar o status
      // real o toast diria "enviado" mesmo com o bot offline (mensagem parada
      // na fila, nunca entregue).
      const [[tenantRow]] = await db.query(
        'SELECT whatsapp_status FROM tenants WHERE id = ?',
        [req.user.tenant_id]
      );
      const botConnected = tenantRow?.whatsapp_status === 'connected';

      if (botConnected) {
        try {
          await notificationService.enqueue({
            tenant_id: Number(req.user.tenant_id),
            recipient_phone: patientPhone,
            content: message,
            scheduled_at: null,
            metadata: { type: 'patient_registration_link', token }
          });
          sentViaBot = true;
        } catch (botErr) {
          console.warn('[patient-registration] Fila indisponível, fallback para link manual:', botErr.message);
        }
      }
    }

    const whatsappUrl = patientPhone.length >= 10
      ? `https://wa.me/${patientPhone}?text=${encodeURIComponent(message)}`
      : null;

    res.status(201).json({
      ok: true,
      sent_via_bot: sentViaBot,
      public_link: publicLink,
      whatsapp_url: sentViaBot ? null : whatsappUrl,
      patient_phone: patient.phone,
    });
  } catch (err) {
    console.error('[patient-registration POST /send]', err);
    res.status(500).json({ error: 'Erro ao enviar link de cadastro' });
  }
});

module.exports = router;
