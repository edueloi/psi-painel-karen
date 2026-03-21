/**
 * Migração: cria tabela disc_analysis
 * Execute: node patch_disc_analysis.js
 */
const db = require('./db');

async function run() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS disc_analysis (
      id INT AUTO_INCREMENT PRIMARY KEY,
      form_response_id INT NOT NULL,
      tenant_id INT NOT NULL,
      aurora_analysis TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_response (form_response_id)
    )
  `);
  console.log('✅ disc_analysis criada com sucesso.');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
