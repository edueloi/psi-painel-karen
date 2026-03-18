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

  console.log('🚀 Aplicando patch de permissões granulares...');

  try {
    // Check if column exists
    const [cols] = await conn.query('SHOW COLUMNS FROM users LIKE "permissions"');
    if (cols.length === 0) {
      await conn.query('ALTER TABLE users ADD COLUMN permissions JSON NULL');
      console.log('✅ Coluna "permissions" adicionada à tabela "users"');
    } else {
      console.log('ℹ️ Coluna "permissions" já existe');
    }
  } catch (err) {
    console.error('❌ Erro no patch:', err);
  }

  await conn.end();
}

patch().catch(console.error);
