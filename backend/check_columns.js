const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'backend/.env' });

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [columns] = await conn.query('SHOW COLUMNS FROM appointments');
  columns.forEach(c => console.log(c.Field));
  await conn.end();
}

check().catch(console.error);
