/**
 * Migrate: adiciona coluna livrocaixa_date na tabela comandas
 *
 * Esta coluna armazena a data escolhida pelo usuário para o lançamento
 * no Livro Caixa, independente da "Data Base" da comanda (start_date).
 *
 * Rodar: node migrate_livrocaixa_date.js
 */

const db = require('./db');

async function run() {
  try {
    await db.query(`ALTER TABLE comandas ADD COLUMN livrocaixa_date DATE NULL`);
    console.log('✅ Coluna livrocaixa_date adicionada à tabela comandas.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column')) {
      console.log('ℹ️  Coluna livrocaixa_date já existe — nenhuma alteração necessária.');
    } else {
      console.error('❌ Erro ao rodar migrate:', err.message);
      process.exit(1);
    }
  } finally {
    process.exit(0);
  }
}

run();
