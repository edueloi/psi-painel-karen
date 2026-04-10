/**
 * migrate_fix_livrocaixa_comanda_id.js
 *
 * Corrige dois problemas com financial_transactions criadas via comandas:
 *
 * 1) Transações de Livro Caixa que estão com comanda_id setado indevidamente.
 *    O lançamento do Livro Caixa deve ser identificado APENAS via comandas.livrocaixa_tx_id.
 *    Ter comanda_id causa "Recebido: R$X" fantasma na comanda ao criar.
 *
 * 2) Transações duplicadas criadas pelo POST /payments antigo (uma por pagamento,
 *    com comanda_id setado). Essas aparecem no Livro Caixa como entradas extras.
 *    Agora os pagamentos ficam apenas em comanda_payments — as financial_transactions
 *    duplicadas devem ser removidas.
 *
 * Rodar na VPS:
 *   node backend/migrate_fix_livrocaixa_comanda_id.js
 */

const db = require('./db');

async function run() {
  console.log('🔄 Iniciando correção de financial_transactions de comandas...\n');

  // ── PASSO 1: Limpar comanda_id do lançamento livrocaixa ─────────────────────
  console.log('Passo 1: Removendo comanda_id indevido do lançamento Livro Caixa...');
  const [lcRows] = await db.query(`
    SELECT ft.id as tx_id, c.id as comanda_id
    FROM financial_transactions ft
    JOIN comandas c ON c.livrocaixa_tx_id = ft.id
    WHERE ft.comanda_id IS NOT NULL
      AND ft.comanda_id = c.id
  `);

  if (lcRows.length === 0) {
    console.log('  ✅ Nenhuma transação livrocaixa precisa de correção.');
  } else {
    for (const row of lcRows) {
      await db.query('UPDATE financial_transactions SET comanda_id = NULL WHERE id = ?', [row.tx_id]);
      console.log(`  ✅ tx #${row.tx_id} (comanda #${row.comanda_id}): comanda_id removido`);
    }
    console.log(`  Total: ${lcRows.length} corrigida(s).`);
  }

  // ── PASSO 2: Remover financial_transactions duplicadas de pagamentos ─────────
  console.log('\nPasso 2: Removendo financial_transactions duplicadas de pagamentos individuais...');

  // São as transactions com comanda_id setado que NÃO são o livrocaixa_tx_id da comanda
  // (ou seja: criadas pelo POST /payments antigo, uma por pagamento)
  const [dupRows] = await db.query(`
    SELECT ft.id as tx_id, ft.comanda_id, ft.amount, ft.date
    FROM financial_transactions ft
    JOIN comandas c ON c.id = ft.comanda_id
    WHERE ft.comanda_id IS NOT NULL
      AND (c.livrocaixa_tx_id IS NULL OR c.livrocaixa_tx_id != ft.id)
      AND ft.type = 'income'
  `);

  if (dupRows.length === 0) {
    console.log('  ✅ Nenhuma transação duplicada encontrada.');
  } else {
    console.log(`  Encontradas ${dupRows.length} transação(ões) duplicada(s) para remover...`);
    for (const row of dupRows) {
      await db.query('DELETE FROM financial_transactions WHERE id = ?', [row.tx_id]);
      console.log(`  🗑️  tx #${row.tx_id} (comanda #${row.comanda_id}, R$ ${row.amount}, ${row.date}): removida`);
    }
    console.log(`  Total: ${dupRows.length} removida(s).`);
  }

  console.log('\n✅ Migração concluída.');
  process.exit(0);
}

run().catch((e) => {
  console.error('❌ Falha na migração:', e.message);
  process.exit(1);
});
