const mysql = require('mysql2/promise');
require('dotenv').config();

async function patch() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'psiflux'
  });

  console.log('👷 Criando tabela de histórico de preços e valores...');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS service_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      entity_type ENUM('service','package') NOT NULL,
      entity_id INT NOT NULL,
      changed_by_id INT NULL,
      changed_by_name VARCHAR(255) NULL,
      field VARCHAR(100) NOT NULL,
      old_value TEXT NULL,
      new_value TEXT NULL,
      change_pct DECIMAL(10,4) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_entity (tenant_id, entity_type, entity_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('✅ Tabela service_history criada/verificada com sucesso!');
  await conn.close();
}

patch().catch(console.error);
