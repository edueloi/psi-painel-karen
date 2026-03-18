const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    const [services] = await connection.query('DESCRIBE services');
    console.log('SERVICES FIELDS:');
    services.forEach(f => console.log(f.Field + ' - ' + f.Type + ' - ' + f.Null));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await connection.end();
  }
}

checkSchema();
