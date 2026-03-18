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

  console.log('🚀 Criando tabela de Perfis de Autenticação do Tenant...');

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tenant_permission_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        permissions JSON NULL,
        is_default TINYINT(1) DEFAULT 0,
        slug VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tenant (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Tabela "tenant_permission_profiles" pronta');

    const [cols] = await conn.query('SHOW COLUMNS FROM users LIKE "tenant_profile_id"');
    if (cols.length === 0) {
      await conn.query('ALTER TABLE users ADD COLUMN tenant_profile_id INT NULL');
      console.log('✅ Coluna "tenant_profile_id" adicionada');
    }
  } catch (err) {
    console.error('❌ Erro no patch:', err);
  }

  await conn.end();
}

patch().catch(console.error);
