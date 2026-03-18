const mysql = require('mysql2/promise');
require('dotenv').config();

async function patch() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('Patching comandas table for discount support...');
    
    const dbName = process.env.DB_NAME;

    async function addColumn(tableName, colName, colDefinition) {
      const [cols] = await conn.query(
        `SELECT COLUMN_NAME FROM information_schema.columns 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [dbName, tableName, colName]
      );
      if (cols.length === 0) {
        console.log(`Adding column ${colName} to ${tableName}...`);
        await conn.query(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colDefinition}`);
      }
    }

    await addColumn('comandas', 'discount_type', "ENUM('percentage', 'fixed') DEFAULT 'fixed'");
    await addColumn('comandas', 'discount_value', "DECIMAL(10,2) DEFAULT 0");
    await addColumn('comandas', 'total_net', "DECIMAL(10,2) DEFAULT 0");

    console.log('✅ Patch applied!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await conn.end();
  }
}

patch();
