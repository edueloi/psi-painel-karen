/**
 * migrate_rs_receipt.js
 * Adiciona os campos de controle de recibo Receita Saúde
 * na tabela financial_transactions.
 *
 * Rodar na VPS:
 *   node backend/migrate_rs_receipt.js
 */

const db = require('./db');

async function run() {
  console.log('🔄 Iniciando migração: campos Receita Saúde...');

  const alterations = [
    // Booleano: recibo já emitido (false por padrão)
    "ALTER TABLE financial_transactions ADD COLUMN rs_receipt_issued TINYINT(1) NOT NULL DEFAULT 0",
    // Timestamp de quando foi marcado como emitido
    "ALTER TABLE financial_transactions ADD COLUMN rs_receipt_issued_at TIMESTAMP NULL",
    // ID do usuário que marcou
    "ALTER TABLE financial_transactions ADD COLUMN rs_receipt_issued_by INT NULL",
    // Observação opcional (ex: "emitido manualmente no portal")
    "ALTER TABLE financial_transactions ADD COLUMN rs_receipt_note VARCHAR(255) NULL",
  ];

  let ok = 0;
  let skip = 0;

  for (const sql of alterations) {
    try {
      await db.query(sql);
      const col = sql.match(/ADD COLUMN (\w+)/)?.[1] ?? sql;
      console.log(`  ✅ Coluna adicionada: ${col}`);
      ok++;
    } catch (e) {
      if (
        e.code === 'ER_DUP_FIELDNAME' ||
        e.message?.includes('Duplicate column') ||
        e.message?.includes('already exists')
      ) {
        const col = sql.match(/ADD COLUMN (\w+)/)?.[1] ?? '?';
        console.log(`  ⏭️  Coluna já existe (ignorado): ${col}`);
        skip++;
      } else {
        console.error(`  ❌ Erro inesperado: ${e.message}`);
        throw e;
      }
    }
  }

  console.log(`\n✅ Migração concluída — ${ok} adicionada(s), ${skip} já existia(m).`);
  process.exit(0);
}

run().catch((e) => {
  console.error('❌ Falha na migração:', e.message);
  process.exit(1);
});
