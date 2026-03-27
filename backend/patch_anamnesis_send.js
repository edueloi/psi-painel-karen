/**
 * Patch: Módulo de Envio de Anamnese para Paciente
 * Execute: node patch_anamnesis_send.js
 * Cria as tabelas necessárias para o módulo de envio seguro de anamnese ao paciente.
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/.env' });

async function patch() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'psiflux',
    multipleStatements: true,
  });

  console.log('🚀 Aplicando patch: Envio de Anamnese para Paciente...');

  // ---- ANAMNESIS SENDS ----
  // Registro de cada envio feito pela profissional
  await conn.query(`
    CREATE TABLE IF NOT EXISTS anamnesis_sends (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      patient_id INT NOT NULL,
      professional_id INT NOT NULL,
      medical_record_id INT NULL,
      title VARCHAR(255) NOT NULL,
      custom_message TEXT NULL,
      template_type ENUM('full','short') DEFAULT 'full',
      approach VARCHAR(100) NULL COMMENT 'ex: tcc, psicanálise, humanista',
      allow_resume TINYINT(1) DEFAULT 1 COMMENT 'Paciente pode continuar outra hora',
      allow_edit_after_submit TINYINT(1) DEFAULT 0 COMMENT 'Pode editar após enviar',
      notify_channels JSON NULL COMMENT '[\"link\",\"email\",\"whatsapp\"]',
      expires_at DATETIME NULL,
      reminder_hours INT NULL COMMENT 'Horas para lembrete automático',
      status ENUM('draft','sent','viewed','filling','answered','expired','cancelled') DEFAULT 'draft',
      consent_required TINYINT(1) DEFAULT 1,
      fields_config LONGTEXT NULL COMMENT 'JSON com campos/questões customizadas',
      sent_at DATETIME NULL,
      viewed_at DATETIME NULL,
      started_at DATETIME NULL,
      completed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_as_tenant (tenant_id),
      INDEX idx_as_patient (patient_id),
      INDEX idx_as_professional (professional_id),
      INDEX idx_as_status (status),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (professional_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('   ✅ Tabela anamnesis_sends criada.');

  // ---- ANAMNESIS SECURE LINKS ----
  // Link seguro por token único por envio
  await conn.query(`
    CREATE TABLE IF NOT EXISTS anamnesis_secure_links (
      id INT AUTO_INCREMENT PRIMARY KEY,
      send_id INT NOT NULL,
      token VARCHAR(128) NOT NULL UNIQUE,
      patient_id INT NOT NULL,
      professional_id INT NOT NULL,
      tenant_id INT NOT NULL,
      share_token VARCHAR(255) NOT NULL COMMENT 'shareToken do profissional para routes públicas',
      is_revoked TINYINT(1) DEFAULT 0,
      expires_at DATETIME NULL,
      opened_at DATETIME NULL,
      ip_first_open VARCHAR(45) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_asl_token (token),
      INDEX idx_asl_send (send_id),
      FOREIGN KEY (send_id) REFERENCES anamnesis_sends(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('   ✅ Tabela anamnesis_secure_links criada.');

  // ---- ANAMNESIS PATIENT RESPONSES ----
  // Respostas brutas do paciente (camada separada do prontuário)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS anamnesis_patient_responses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      send_id INT NOT NULL,
      patient_id INT NOT NULL,
      professional_id INT NOT NULL,
      tenant_id INT NOT NULL,
      answers LONGTEXT NULL COMMENT 'JSON com respostas brutas',
      progress_data LONGTEXT NULL COMMENT 'JSON com dados parciais (continuar depois)',
      clinical_alerts JSON NULL COMMENT 'Alertas clínicos detectados',
      has_critical_content TINYINT(1) DEFAULT 0,
      consent_accepted_at DATETIME NULL,
      consent_ip VARCHAR(45) NULL,
      consent_term_version VARCHAR(20) DEFAULT '1.0',
      review_status ENUM('pending','reviewing','approved','discarded') DEFAULT 'pending',
      professional_notes TEXT NULL COMMENT 'Anotações da psicóloga após revisão',
      tcc_draft LONGTEXT NULL COMMENT 'Rascunho TCC gerado pela IA',
      ai_summary LONGTEXT NULL COMMENT 'Resumo gerado pela IA',
      saved_to_record_id INT NULL COMMENT 'Se foi incorporado ao prontuário',
      submitted_at DATETIME NULL,
      last_saved_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_apr_send (send_id),
      INDEX idx_apr_patient (patient_id),
      FOREIGN KEY (send_id) REFERENCES anamnesis_sends(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('   ✅ Tabela anamnesis_patient_responses criada.');

  // ---- PATIENT CONSENT LOGS ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS patient_consent_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      send_id INT NOT NULL,
      patient_id INT NOT NULL,
      tenant_id INT NOT NULL,
      term_version VARCHAR(20) DEFAULT '1.0',
      accepted TINYINT(1) DEFAULT 1,
      ip_address VARCHAR(45) NULL,
      user_agent TEXT NULL,
      accepted_at DATETIME NOT NULL,
      FOREIGN KEY (send_id) REFERENCES anamnesis_sends(id) ON DELETE CASCADE,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('   ✅ Tabela patient_consent_logs criada.');

  // ---- ANAMNESIS REMINDER LOGS ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS anamnesis_reminder_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      send_id INT NOT NULL,
      channel ENUM('whatsapp','email','sms') DEFAULT 'whatsapp',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status ENUM('sent','failed') DEFAULT 'sent',
      FOREIGN KEY (send_id) REFERENCES anamnesis_sends(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('   ✅ Tabela anamnesis_reminder_logs criada.');

  console.log('\n✅ Patch concluído com sucesso!');
  await conn.end();
}

patch().catch(err => {
  console.error('❌ Erro no patch:', err);
  process.exit(1);
});
