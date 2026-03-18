const mysql = require('mysql2/promise');
require('dotenv').config();

async function patch_schema() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('Relaxing packages table constraints...');
    // Alterando colunas que estão causando erro 500
    await conn.query('ALTER TABLE packages MODIFY price DECIMAL(10,2) DEFAULT NULL');
    await conn.query('ALTER TABLE packages MODIFY sessions_count INT DEFAULT NULL');
    
    // Garantindo que totalPrice tenha um default
    await conn.query('ALTER TABLE packages MODIFY totalPrice DECIMAL(10,2) DEFAULT 0.00');

    console.log('Schema updated successfully!');
  } catch (err) {
    console.error('Error patching schema:', err.message);
  } finally {
    await conn.end();
  }
}

patch_schema();
