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

  console.log('👷 Injetando colunas de 2FA no banco de dados...');

  const dbName = process.env.DB_NAME || 'psiflux';

  async function addColumn(tableName, colName, colDefinition) {
    try {
      const [cols] = await conn.query(
        `SELECT COLUMN_NAME FROM information_schema.columns 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [dbName, tableName, colName]
      );

      if (cols.length === 0) {
        console.log(`   Adicionando coluna ${colName} em ${tableName}...`);
        await conn.query(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colDefinition}`);
      } else {
        console.log(`   Coluna ${colName} já existe.`);
      }
    } catch (e) {
      console.log(`   Erro ao processar coluna ${colName}: ${e.message}`);
    }
  }

  await addColumn('users', 'two_factor_enabled', "BOOLEAN DEFAULT false");
  await addColumn('users', 'two_factor_secret', "VARCHAR(255) NULL");

  console.log('✅ Banco de dados preparado para Autenticação de Dois Fatores!');
  await conn.close();
}

patch().catch(console.error);
