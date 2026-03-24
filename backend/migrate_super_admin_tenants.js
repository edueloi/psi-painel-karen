const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('🚀 Iniciando migração das tabelas de parceiros (Super Admin)...');

  try {
    // 1. Add expiration_date to tenants
    const [cols] = await db.query('DESCRIBE tenants');
    const hasExpiresAt = cols.find(c => c.Field === 'expires_at');
    const hasStatus = cols.find(c => c.Field === 'status');

    if (!hasExpiresAt) {
      await db.query('ALTER TABLE tenants ADD COLUMN expires_at DATETIME AFTER phone');
      // Set a default for existing ones: 30 days from creation
      await db.query('UPDATE tenants SET expires_at = DATE_ADD(created_at, INTERVAL 30 DAY) WHERE expires_at IS NULL');
      console.log('✅ Coluna [expires_at] adicionada.');
    }

    if (!hasStatus) {
      await db.query("ALTER TABLE tenants ADD COLUMN status ENUM('active', 'blocked', 'expired') DEFAULT 'active' AFTER expires_at");
      console.log('✅ Coluna [status] adicionada.');
    }

    // 2. Add last_billing_date (optional, for history)
    const hasLastBilling = cols.find(c => c.Field === 'last_billing_at');
    if (!hasLastBilling) {
      await db.query('ALTER TABLE tenants ADD COLUMN last_billing_at DATETIME AFTER status');
      console.log('✅ Coluna [last_billing_at] adicionada.');
    }

    console.log('🚀 Migração concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração:', err);
  } finally {
    await db.end();
    process.exit(0);
  }
}

migrate();
