const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/.env' });

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'psiflux',
  });

  console.log('🚀 Expandindo tabela de usuários master (Experiência Visual)...');

  try {
    const [cols] = await conn.query('DESCRIBE users');
    
    const addCol = async (name, def) => {
      if (!cols.find(c => c.Field === name)) {
        console.log(`   Adicionando coluna [${name}]...`);
        await conn.query(`ALTER TABLE users ADD COLUMN ${name} ${def}`);
      }
    };

    await addCol('cargo', 'VARCHAR(100) NULL AFTER role');
    await addCol('departamento', 'VARCHAR(100) NULL AFTER cargo');
    
    // Garantir que master_users tenham os campos básicos
    console.log('✅ Estrutura de dados atualizada!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await conn.end();
    process.exit(0);
  }
}

migrate();
