const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/.env' });

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'psiflux',
    multipleStatements: true,
  });

  console.log('🚀 Iniciando migração incremental (Clinical Records & Patient Edit Fix)...');

  const statements = [
    // Medical Records - Time and Metadata
    "ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS start_time TIME NULL",
    "ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS end_time TIME NULL",
    "ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Rascunho'",
    "ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS record_type VARCHAR(100) DEFAULT 'Evolucao'",
    "ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS title VARCHAR(255) NULL",
    "ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS tags JSON NULL",

    // Uploads - Stability and Capacity
    "ALTER TABLE uploads MODIFY COLUMN filename VARCHAR(255) NULL",
    "ALTER TABLE uploads MODIFY COLUMN file_url LONGTEXT NULL",
    "ALTER TABLE uploads MODIFY COLUMN url LONGTEXT NULL",
    "ALTER TABLE uploads ADD COLUMN IF NOT EXISTS description TEXT NULL",
    "ALTER TABLE uploads ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'uploaded'",

    // Attachments - Capacity for Base64
    "ALTER TABLE medical_record_attachments MODIFY COLUMN file_url LONGTEXT NULL",

    // Alerts - UI State
    "ALTER TABLE system_alerts ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN DEFAULT FALSE",
    
    // Table medical_record_attachments if not exists
    `CREATE TABLE IF NOT EXISTS medical_record_attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      record_id INT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_url LONGTEXT,
      file_type VARCHAR(50),
      file_size INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (record_id) REFERENCES medical_records(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  ];

  for (const stmt of statements) {
    try {
      console.log(`   Executando: ${stmt}`);
      await conn.query(stmt);
    } catch (e) {
      console.warn(`   ⚠️  Aviso ao executar "${stmt}": ${e.message}`);
    }
  }

  console.log('✅ Migração incremental concluída!');
  await conn.end();
}

migrate().catch(err => {
  console.error('❌ Erro na migração:', err);
  process.exit(1);
});
