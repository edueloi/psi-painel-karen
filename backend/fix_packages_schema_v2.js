const mysql = require('mysql2/promise');
require('dotenv').config();

async function patch_schema() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'psiflux'
  });

  try {
    const dbName = process.env.DB_NAME || 'psiflux';

    async function addOrModifyColumn(tableName, colName, colDefinition) {
      const [cols] = await conn.query(
        `SELECT COLUMN_NAME FROM information_schema.columns 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [dbName, tableName, colName]
      );

      if (cols.length === 0) {
        console.log(`Adding column ${colName} to ${tableName}...`);
        await conn.query(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colDefinition}`);
      } else {
        console.log(`Modifying column ${colName} in ${tableName}...`);
        await conn.query(`ALTER TABLE ${tableName} MODIFY COLUMN ${colName} ${colDefinition}`);
      }
    }

    console.log('Relaxing packages table constraints and adding missing columns...');

    // Adiciona colunas que podem estar faltando
    await addOrModifyColumn('packages', 'price', 'DECIMAL(10,2) DEFAULT NULL');
    await addOrModifyColumn('packages', 'totalPrice', 'DECIMAL(10,2) DEFAULT 0.00');
    await addOrModifyColumn('packages', 'sessions_count', 'INT DEFAULT NULL');
    await addOrModifyColumn('packages', 'discountType', "ENUM('percentage','fixed') DEFAULT 'percentage'");
    await addOrModifyColumn('packages', 'discountValue', 'DECIMAL(10,2) DEFAULT 0.00');

    console.log('✅ Schema updated successfully!');
  } catch (err) {
    console.error('❌ Error patching schema:', err.message);
  } finally {
    await conn.end();
  }
}

patch_schema();
