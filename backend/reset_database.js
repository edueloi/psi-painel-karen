const mysql = require('mysql2/promise');
require('dotenv').config();

const oldTables = [
  'message_templates','uploads','doc_templates','doc_categories',
  'financial_transactions','comandas','form_responses','forms',
  'case_study_cards','case_study_columns','case_study_boards',
  'clinical_tools','pei_abc','pei_goal_history','pei_goals','pei',
  'medical_records','virtual_rooms','appointments','services',
  'patients','users','tenants','plans','master_permission_profiles'
];

async function resetDatabase() {
  if (process.env.ALLOW_DESTRUCTIVE_MIGRATION !== 'true') {
    console.error('Reset destrutivo bloqueado. Defina ALLOW_DESTRUCTIVE_MIGRATION=true para continuar.');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const dbName = process.env.DB_NAME || 'psiflux';

  console.log('Iniciando reset destrutivo do banco ' + dbName + '...');
  await conn.query('CREATE DATABASE IF NOT EXISTS '+ dbName +' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await conn.query('USE '+ dbName +'');
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');

  for (const table of oldTables) {
    await conn.query('DROP TABLE IF EXISTS '+ table +'');
  }

  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  await conn.end();
  console.log('Reset destrutivo concluido. Execute node migrate.js em seguida.');
}

resetDatabase().catch(err => {
  console.error('Erro ao resetar banco:', err);
  process.exit(1);
});