const mysql = require('mysql2/promise');
require('dotenv').config();

async function patch() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'psiflux',
    multipleStatements: true,
  });

  console.log('🚀 Aplicando patch na tabela appointments...');

  const columns = [
    { name: 'package_id', def: 'INT' },
    { name: 'comanda_id', def: 'INT' },
    { name: 'recurrence_rule', def: 'VARCHAR(500)' },
    { name: 'recurrence_id', def: 'INT' },
    { name: 'reschedule_reason', def: 'TEXT' }
  ];

  for (const col of columns) {
    try {
      await conn.query(`ALTER TABLE appointments ADD COLUMN ${col.name} ${col.def}`);
      console.log(`✅ Adicionado: ${col.name}`);
    } catch (e) {
      if (e.errno === 1060 || e.message.includes('Duplicate column')) {
        console.log(`ℹ️ Column '${col.name}' already exists.`);
      } else {
        console.error(`❌ Erro ao adicionar ${col.name}:`, e.message);
      }
    }
  }

  console.log('✅ Patch concluído!');
  await conn.end();
}

patch().catch(err => {
  console.error('❌ Erro no patch:', err);
  process.exit(1);
});
