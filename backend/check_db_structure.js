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
    console.log('Checking tables...');
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables:', tables.map(t => Object.values(t)[0]));

    console.log('\nChecking users columns...');
    const [columns] = await connection.query('DESCRIBE users');
    console.log('Columns in users:', columns.map(c => c.Field));

    if (tables.some(t => Object.values(t)[0] === 'master_permission_profiles')) {
        console.log('\nChecking master_permission_profiles columns...');
        const [mppColumns] = await connection.query('DESCRIBE master_permission_profiles');
        console.log('Columns in master_permission_profiles:', mppColumns.map(c => c.Field));
    } else {
        console.log('\nTable master_permission_profiles DOES NOT EXIST');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

check();
