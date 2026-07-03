const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');
const { CONTRACT_TEMPLATES, renderContract } = require('../templates/contractTemplates');

function generateSecureToken() {
  return crypto.randomBytes(40).toString('hex');
}

async function ensureTablesExist() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS contract_sends (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL, patient_id INT NOT NULL, professional_id INT NOT NULL,
      contract_type ENUM('online','presencial') NOT NULL,
      template_version VARCHAR(20) DEFAULT '1.0',
      status ENUM('sent','viewed','signed','expired','cancelled') DEFAULT 'sent',
      sent_at DATETIME NULL, viewed_at DATETIME NULL, signed_at DATETIME NULL,
      expires_at DATETIME NULL, next_renewal_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cs_tenant (tenant_id), INDEX idx_cs_patient (patient_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await db.query(`CREATE TABLE IF NOT EXISTS contract_secure_links (
      id INT AUTO_INCREMENT PRIMARY KEY, send_id INT NOT NULL, token VARCHAR(128) NOT NULL UNIQUE,
      patient_id INT NOT NULL, tenant_id INT NOT NULL, is_revoked TINYINT(1) DEFAULT 0,
      expires_at DATETIME NULL, opened_at DATETIME NULL, ip_first_open VARCHAR(45) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_csl_token (token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await db.query(`CREATE TABLE IF NOT EXISTS contract_signatures (
      id INT AUTO_INCREMENT PRIMARY KEY, send_id INT NOT NULL, patient_id INT NOT NULL, tenant_id INT NOT NULL,
      signer_name VARCHAR(255) NOT NULL, signer_cpf VARCHAR(20) NOT NULL,
      signature_image LONGTEXT NOT NULL, rendered_html LONGTEXT NOT NULL,
      consent_ip VARCHAR(45) NULL, consent_user_agent TEXT NULL, signed_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_csig_send (send_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Agendamento de reaplicação periódica de escalas clínicas (BDI-II/BAI a cada 3 meses),
    // criado aqui pois o primeiro agendamento é disparado no momento da assinatura do contrato.
    await db.query(`CREATE TABLE IF NOT EXISTS clinical_scale_schedules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL, patient_id INT NOT NULL, professional_id INT NOT NULL,
      scale_type ENUM('bdi-ii','bai') NOT NULL,
      status ENUM('active','paused','cancelled') DEFAULT 'active',
      last_sent_at DATETIME NULL, next_due_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_css (tenant_id, patient_id, scale_type),
      INDEX idx_css_due (next_due_at, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    // Texto do contrato editável pelo profissional (um registro por tenant + modalidade).
    await db.query(`CREATE TABLE IF NOT EXISTS contract_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      contract_type ENUM('online','presencial') NOT NULL,
      title VARCHAR(255) NOT NULL,
      template_body LONGTEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by INT NULL,
      UNIQUE KEY uq_ct_tenant_type (tenant_id, contract_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch (e) {
    console.warn('[contract-send] ensureTablesExist:', e.message);
  }
}
ensureTablesExist();

// ─── TEMPLATES DO CONTRATO (editor do profissional) ───────────────────────────
// Precisam vir ANTES de "/:patientId" para não serem capturadas por esse parâmetro genérico.

// GET /contract-send/templates — retorna os 2 templates do tenant (online/presencial),
// usando o texto padrão como sugestão inicial quando o tenant ainda não personalizou.
router.get('/templates', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT contract_type, title, template_body, updated_at FROM contract_templates WHERE tenant_id = ?',
      [req.user.tenant_id]
    );
    const byType = Object.fromEntries(rows.map(r => [r.contract_type, r]));

    const result = ['online', 'presencial'].map(type => {
      const custom = byType[type];
      const fallback = CONTRACT_TEMPLATES[type];
      return {
        contract_type: type,
        title: custom?.title || fallback.title,
        template_body: custom?.template_body || fallback.body,
        is_customized: !!custom,
        updated_at: custom?.updated_at || null,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('[contract-send GET /templates]', err);
    res.status(500).json({ error: 'Erro ao buscar templates de contrato' });
  }
});

// PUT /contract-send/templates/:contractType — salva o texto editado pelo profissional
router.put('/templates/:contractType', async (req, res) => {
  try {
    const { contractType } = req.params;
    if (!CONTRACT_TEMPLATES[contractType]) return res.status(400).json({ error: 'Tipo de contrato inválido' });

    const { title, template_body } = req.body;
    if (!template_body || !template_body.trim()) return res.status(400).json({ error: 'O texto do contrato não pode ficar vazio' });

    await db.query(
      `INSERT INTO contract_templates (tenant_id, contract_type, title, template_body, updated_by)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title), template_body = VALUES(template_body), updated_by = VALUES(updated_by)`,
      [req.user.tenant_id, contractType, title || CONTRACT_TEMPLATES[contractType].title, template_body, req.user.id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[contract-send PUT /templates/:contractType]', err);
    res.status(500).json({ error: 'Erro ao salvar template de contrato' });
  }
});

// GET /contract-send/templates/:contractType/preview — renderiza com dados fictícios para visualização
router.get('/templates/:contractType/preview', async (req, res) => {
  try {
    const { contractType } = req.params;
    if (!CONTRACT_TEMPLATES[contractType]) return res.status(400).json({ error: 'Tipo de contrato inválido' });

    const rendered = await renderContract(contractType, {
      patient_name: 'João da Silva (exemplo)',
      patient_cpf: '000.000.000-00',
      patient_address: 'Rua Exemplo, 123 — Bairro, Cidade/UF',
      professional_name: req.user.name || 'Nome do(a) Profissional',
      professional_cpf: '111.111.111-11',
      professional_crp: req.user.crp || '00/00000',
      pix_key: 'chave-pix-exemplo',
      clinic_address: 'Endereço do consultório',
      session_day: 'segunda-feira',
      session_time: '18:00',
      city: 'Cidade/UF',
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    }, req.user.tenant_id);

    res.json(rendered);
  } catch (err) {
    console.error('[contract-send GET /templates/:contractType/preview]', err);
    res.status(500).json({ error: 'Erro ao gerar pré-visualização' });
  }
});

// GET /contract-send/:patientId — status do contrato mais recente do paciente
router.get('/:patientId', async (req, res) => {
  try {
    const [[send]] = await db.query(
      `SELECT s.*, l.token AS secure_token, l.is_revoked
       FROM contract_sends s
       LEFT JOIN contract_secure_links l ON l.send_id = s.id AND l.is_revoked = 0
       WHERE s.patient_id = ? AND s.tenant_id = ?
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.params.patientId, req.user.tenant_id]
    );
    if (!send) return res.json(null);

    let signature = null;
    if (send.status === 'signed') {
      const [[sig]] = await db.query(
        'SELECT signer_name, signer_cpf, signature_image, signed_at FROM contract_signatures WHERE send_id = ?',
        [send.id]
      );
      signature = sig || null;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://psiflux.com.br';
    res.json({
      ...send,
      public_link: send.secure_token ? `${frontendUrl}/f/contrato?t=${send.secure_token}` : null,
      signature,
    });
  } catch (err) {
    console.error('[contract-send GET /:patientId]', err);
    res.status(500).json({ error: 'Erro ao buscar contrato' });
  }
});

// POST /contract-send — cria novo envio de contrato para um paciente
router.post('/', async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { patient_id, contract_type } = req.body;
    if (!patient_id) return res.status(400).json({ error: 'Paciente é obrigatório' });
    if (!CONTRACT_TEMPLATES[contract_type]) return res.status(400).json({ error: 'Tipo de contrato inválido (use online ou presencial)' });

    await connection.beginTransaction();

    const [[patient]] = await connection.query(
      'SELECT id, name FROM patients WHERE id = ? AND tenant_id = ?',
      [Number(patient_id), req.user.tenant_id]
    );
    if (!patient) {
      await connection.rollback();
      return res.status(403).json({ error: 'Paciente não encontrado ou sem permissão' });
    }

    // Revoga qualquer envio pendente anterior (não assinado) para não acumular links ativos
    await connection.query(
      `UPDATE contract_sends SET status = 'cancelled' WHERE patient_id = ? AND tenant_id = ? AND status IN ('sent','viewed')`,
      [patient_id, req.user.tenant_id]
    );
    await connection.query(
      `UPDATE contract_secure_links SET is_revoked = 1 WHERE patient_id = ? AND tenant_id = ? AND is_revoked = 0`,
      [patient_id, req.user.tenant_id]
    );

    const [result] = await connection.query(
      `INSERT INTO contract_sends (tenant_id, patient_id, professional_id, contract_type, template_version, status, sent_at)
       VALUES (?, ?, ?, ?, ?, 'sent', NOW())`,
      [req.user.tenant_id, Number(patient_id), req.user.id, contract_type, CONTRACT_TEMPLATES[contract_type].version]
    );
    const sendId = result.insertId;

    const token = generateSecureToken();
    await connection.query(
      `INSERT INTO contract_secure_links (send_id, token, patient_id, tenant_id) VALUES (?, ?, ?, ?)`,
      [sendId, token, Number(patient_id), req.user.tenant_id]
    );

    await connection.commit();

    const frontendUrl = process.env.FRONTEND_URL || 'https://psiflux.com.br';
    res.status(201).json({
      id: sendId,
      patient_name: patient.name,
      contract_type,
      public_link: `${frontendUrl}/f/contrato?t=${token}`,
    });
  } catch (err) {
    await connection.rollback();
    console.error('[contract-send POST /]', err);
    res.status(500).json({ error: `Erro ao criar envio: ${err.message}` });
  } finally {
    connection.release();
  }
});

// POST /contract-send/:id/resend — revoga link antigo e gera um novo
router.post('/:id/resend', async (req, res) => {
  try {
    const [[send]] = await db.query(
      'SELECT * FROM contract_sends WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (!send) return res.status(404).json({ error: 'Envio não encontrado' });
    if (send.status === 'signed') return res.status(400).json({ error: 'Contrato já assinado' });

    await db.query('UPDATE contract_secure_links SET is_revoked = 1 WHERE send_id = ?', [req.params.id]);

    const token = generateSecureToken();
    await db.query(
      'INSERT INTO contract_secure_links (send_id, token, patient_id, tenant_id) VALUES (?, ?, ?, ?)',
      [req.params.id, token, send.patient_id, send.tenant_id]
    );
    await db.query(`UPDATE contract_sends SET status = 'sent', sent_at = NOW() WHERE id = ?`, [req.params.id]);

    const frontendUrl = process.env.FRONTEND_URL || 'https://psiflux.com.br';
    res.json({ ok: true, public_link: `${frontendUrl}/f/contrato?t=${token}` });
  } catch (err) {
    console.error('[contract-send POST /:id/resend]', err);
    res.status(500).json({ error: 'Erro ao reenviar' });
  }
});

// GET /contract-send/:patientId/scale-schedules — agendamento de reaplicação de BDI-II/BAI do paciente
router.get('/:patientId/scale-schedules', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, scale_type, status, last_sent_at, next_due_at
       FROM clinical_scale_schedules WHERE patient_id = ? AND tenant_id = ? ORDER BY scale_type`,
      [req.params.patientId, req.user.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[contract-send GET /:patientId/scale-schedules]', err);
    res.status(500).json({ error: 'Erro ao buscar agendamento de escalas' });
  }
});

// PATCH /scale-schedules/:id — pausar/retomar reaplicação periódica de uma escala
router.patch('/scale-schedules/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'paused', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    const [[schedule]] = await db.query(
      'SELECT id FROM clinical_scale_schedules WHERE id = ? AND tenant_id = ?',
      [req.params.id, req.user.tenant_id]
    );
    if (!schedule) return res.status(404).json({ error: 'Agendamento não encontrado' });

    await db.query('UPDATE clinical_scale_schedules SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[contract-send PATCH /scale-schedules/:id]', err);
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
});

module.exports = router;
