const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'psiflux',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '-03:00',
});

pool.getConnection()
  .then(conn => {
    console.log('✅ Banco de dados conectado com sucesso');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Erro ao conectar ao banco:', err.message);
    console.error('   Rode: node migrate.js para criar as tabelas');
  });

module.exports = pool;
