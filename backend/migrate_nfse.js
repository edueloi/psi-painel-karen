/**
 * migrate_nfse.js
 * Adiciona os campos fiscais de NFS-e (Sistema Nacional NFS-e) em `users`
 * e cria a tabela `nfse_invoices`.
 *
 * Rodar na VPS:
 *   node backend/migrate_nfse.js
 */

const db = require('./db');

async function run() {
  console.log('🔄 Iniciando migração: NFS-e...');

  const alterations = [
    // Dados fiscais do profissional emissor (por user, não por tenant —
    // cada psicólogo emite em seu próprio CPF/CNPJ, mesmo dentro de uma clínica
    // multi-profissional, seguindo o mesmo padrão de mercadopago_token/infinitepay_token)
    "ALTER TABLE users ADD COLUMN nfse_razao_social VARCHAR(255) NULL",
    "ALTER TABLE users ADD COLUMN nfse_inscricao_municipal VARCHAR(50) NULL",
    "ALTER TABLE users ADD COLUMN nfse_codigo_municipio VARCHAR(10) NULL",
    "ALTER TABLE users ADD COLUMN nfse_codigo_tributacao_nacional VARCHAR(20) NULL",
    "ALTER TABLE users ADD COLUMN nfse_regime_tributario VARCHAR(30) DEFAULT 'simples_nacional'",
    "ALTER TABLE users ADD COLUMN nfse_environment VARCHAR(20) DEFAULT 'homologacao'",
    "ALTER TABLE users ADD COLUMN nfse_serie INT DEFAULT 1",
    "ALTER TABLE users ADD COLUMN nfse_next_number INT DEFAULT 1",
    "ALTER TABLE users ADD COLUMN nfse_cert_path VARCHAR(500) NULL",
    "ALTER TABLE users ADD COLUMN nfse_cert_password_enc TEXT NULL",
    "ALTER TABLE users ADD COLUMN nfse_cert_uploaded_at TIMESTAMP NULL",

    `CREATE TABLE IF NOT EXISTS nfse_invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      user_id INT NOT NULL,
      financial_transaction_id INT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      environment VARCHAR(20) NOT NULL DEFAULT 'homologacao',
      serie INT NOT NULL DEFAULT 1,
      numero INT NOT NULL,
      chave_acesso VARCHAR(60) NULL,
      codigo_verificacao VARCHAR(60) NULL,
      valor_servico DECIMAL(10,2) NOT NULL,
      descricao_servico VARCHAR(1000) NULL,
      codigo_tributacao_nacional VARCHAR(20) NULL,
      authorized_at TIMESTAMP NULL,
      rejection_code VARCHAR(50) NULL,
      rejection_reason TEXT NULL,
      dps_xml_path VARCHAR(500) NULL,
      nfse_xml_path VARCHAR(500) NULL,
      nfse_pdf_path VARCHAR(500) NULL,
      attempts INT NOT NULL DEFAULT 0,
      last_attempt_at TIMESTAMP NULL,
      cancel_reason TEXT NULL,
      cancelled_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_financial_transaction (financial_transaction_id),
      UNIQUE KEY uq_chave_acesso (chave_acesso),
      KEY idx_tenant (tenant_id),
      KEY idx_status (status),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (financial_transaction_id) REFERENCES financial_transactions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ];

  let ok = 0;
  let skip = 0;

  for (const sql of alterations) {
    try {
      await db.query(sql);
      const col = sql.match(/ADD COLUMN (\w+)/)?.[1] ?? (sql.includes('CREATE TABLE') ? 'nfse_invoices (tabela)' : sql);
      console.log(`  ✅ Aplicado: ${col}`);
      ok++;
    } catch (e) {
      if (
        e.code === 'ER_DUP_FIELDNAME' ||
        e.message?.includes('Duplicate column') ||
        e.message?.includes('already exists')
      ) {
        const col = sql.match(/ADD COLUMN (\w+)/)?.[1] ?? '?';
        console.log(`  ⏭️  Já existe (ignorado): ${col}`);
        skip++;
      } else {
        console.error(`  ❌ Erro inesperado: ${e.message}`);
        throw e;
      }
    }
  }

  console.log(`\n✅ Migração concluída — ${ok} aplicada(s), ${skip} já existia(m).`);
  process.exit(0);
}

run().catch((e) => {
  console.error('❌ Falha na migração:', e.message);
  process.exit(1);
});
