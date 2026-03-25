const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'c:/Users/Eduardo/Desktop/Desktop Projetos/psi-painel/psi-painel-karen/backend/.env' });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [columns] = await connection.query('DESCRIBE users');
    console.log('--- USERS COLUMNS ---');
    console.log(columns.map(c => c.Field).join(', '));
    console.log('--- END USERS COLUMNS ---');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

check();
