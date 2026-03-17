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

  console.log('👷 Atualizando modalidade dos serviços...');

  try {
    await conn.query(`ALTER TABLE services MODIFY COLUMN modality ENUM('online', 'presencial', 'geral') DEFAULT 'presencial'`);
    console.log('✅ Modalidade atualizada com sucesso!');
  } catch (e) {
    console.error('❌ Erro ao atualizar modalidade:', e.message);
  }

  await conn.close();
}

patch().catch(console.error);
