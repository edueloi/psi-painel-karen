const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

async function patch() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('🚀 Criando tabela system_alerts...');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS system_alerts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      type ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
      is_read BOOLEAN DEFAULT false,
      link VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('✨ Tabela system_alerts criada com sucesso!');
  await conn.end();
}

patch().catch(err => {
  console.error('❌ Erro crítico:', err);
  process.exit(1);
});
