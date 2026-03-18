const mysql = require('mysql2/promise');
require('dotenv').config();

async function runPatch() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'psiflux'
  });

  console.log('🚀 Criando tabela de comissionamento de profissionais...');

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS professional_commissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        user_id INT NOT NULL,
        service_id INT NULL,
        type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
        value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY idx_unique_rule (tenant_id, user_id, service_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ Tabela professional_commissions criada ou verificada.');

    // Add general rule '0.00' for existing users if none exists? 
    // Usually it's better to just leave empty array and assume 0.
  } catch (e) {
    console.error('❌ Erro na migration de comissões:', e.message);
  } finally {
    await conn.end();
  }
}

runPatch();
