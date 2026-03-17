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

  console.log('🚀 Aplicando patch na tabela services...');

  const columns = [
    { name: 'category', def: 'VARCHAR(100) DEFAULT "Geral"' },
    { name: 'cost', def: 'DECIMAL(10,2) DEFAULT 0' },
    { name: 'color', def: 'VARCHAR(20) DEFAULT "#6366f1"' },
    { name: 'modality', def: 'VARCHAR(50) DEFAULT "presencial"' }
  ];

  for (const col of columns) {
    try {
      // Tentar sem IF NOT EXISTS primeiro, e ignorar se já existir
      await conn.query(`ALTER TABLE services ADD COLUMN ${col.name} ${col.def}`);
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
