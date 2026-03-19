const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/.env' });

async function patch() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'psiflux',
  });

  console.log('🚀 Aplicando patch de WhatsApp no tenants...');

  try {
    await conn.query('ALTER TABLE tenants ADD COLUMN whatsapp_instance VARCHAR(255) NULL');
    console.log('✅ Coluna whatsapp_instance adicionada.');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('⚠️  Coluna whatsapp_instance já existe.');
    else throw e;
  }

  try {
    await conn.query('ALTER TABLE tenants ADD COLUMN whatsapp_status VARCHAR(50) DEFAULT "disconnected"');
    console.log('✅ Coluna whatsapp_status adicionada.');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('⚠️  Coluna whatsapp_status já existe.');
    else throw e;
  }

  try {
    await conn.query('ALTER TABLE tenants ADD COLUMN whatsapp_phone VARCHAR(50) NULL');
    console.log('✅ Coluna whatsapp_phone adicionada.');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') console.log('⚠️  Coluna whatsapp_phone já existe.');
    else throw e;
  }

  console.log('✅ Patch concluído!');
  await conn.end();
}

patch().catch(console.error);
