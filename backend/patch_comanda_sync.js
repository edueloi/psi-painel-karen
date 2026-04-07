const db = require('./db');
require('dotenv').config();

async function addColumn(table, column, type) {
  try {
    await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    console.log(`✅ Coluna ${column} adicionada em ${table}`);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.errno === 1060) {
      console.log(`ℹ️ Coluna ${column} já existe em ${table}`);
    } else {
      console.error(`❌ Erro ao adicionar ${column} em ${table}:`, err.message);
    }
  }
}

async function patch() {
  console.log('🚀 Iniciando patch de sincronização Comanda <-> Livro Caixa...');

  // 1. Sincronização no Livro Caixa
  await addColumn('financial_transactions', 'comanda_id', 'INT');
  await addColumn('financial_transactions', 'appointment_id', 'INT');

  // 2. Sincronização nas Comandas
  await addColumn('comandas', 'livrocaixa_tx_id', 'INT');
  await addColumn('comandas', 'sync_to_livrocaixa', 'TINYINT(1) DEFAULT 0');
  
  // 3. Sincronização nos Agendamentos
  await addColumn('appointments', 'livrocaixa_tx_id', 'INT');
  await addColumn('appointments', 'sync_to_livrocaixa', 'TINYINT(1) DEFAULT 0');

  console.log('✨ Patch de sincronização concluído!');
  process.exit(0);
}

patch().catch(err => {
  console.error('❌ Erro crítico no patch:', err);
  process.exit(1);
});
