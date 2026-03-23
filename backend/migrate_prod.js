const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('🚀 Iniciando migração de banco de dados...');

  try {
    // 1. Colunas do WhatsApp na tabela tenants
    const [colsTenants] = await connection.query('SHOW COLUMNS FROM tenants');
    const tenantColNames = colsTenants.map(c => c.Field);

    if (!tenantColNames.includes('whatsapp_status')) {
      await connection.query("ALTER TABLE tenants ADD COLUMN whatsapp_status VARCHAR(20) DEFAULT 'disconnected'");
      console.log('✅ Coluna whatsapp_status adicionada.');
    }
    if (!tenantColNames.includes('whatsapp_phone')) {
      await connection.query("ALTER TABLE tenants ADD COLUMN whatsapp_phone VARCHAR(20)");
      console.log('✅ Coluna whatsapp_phone adicionada.');
    }
    if (!tenantColNames.includes('whatsapp_instance')) {
      await connection.query("ALTER TABLE tenants ADD COLUMN whatsapp_instance VARCHAR(50)");
      console.log('✅ Coluna whatsapp_instance adicionada.');
    }

    // 2. Coluna is_dismissed na tabela alerts (que vimos no log que estava faltando)
    try {
      const [colsAlerts] = await connection.query('SHOW COLUMNS FROM alerts');
      const alertsColNames = colsAlerts.map(c => c.Field);

      if (!alertsColNames.includes('is_dismissed')) {
        await connection.query('ALTER TABLE alerts ADD COLUMN is_dismissed BOOLEAN DEFAULT FALSE');
        console.log('✅ Coluna is_dismissed adicionada na tabela alerts.');
      }
    } catch (e) {
      console.warn('⚠️ Tabela alerts não encontrada ou erro, ignorando...');
    }

    console.log('🏁 Migração concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
  } finally {
    const end = connection.end();
    process.exit(0);
  }
}

migrate();
