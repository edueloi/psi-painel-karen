/**
 * migrate_nfse_toggles.js
 * Adiciona os toggles de ativação/desativação de NFS-e e Recibo Receita Saúde
 * por clínica (tenant) — cada clínica decide se quer usar essas funcionalidades.
 *
 * Rodar na VPS:
 *   node backend/migrate_nfse_toggles.js
 */

const db = require('./db');

async function run() {
  console.log('🔄 Iniciando migração: toggles NFS-e / Recibo RS...');

  const alterations = [
    "ALTER TABLE tenants ADD COLUMN nfse_enabled TINYINT(1) NOT NULL DEFAULT 0",
    "ALTER TABLE tenants ADD COLUMN rs_receipt_enabled TINYINT(1) NOT NULL DEFAULT 0",
  ];

  let ok = 0;
  let skip = 0;

  for (const sql of alterations) {
    try {
      await db.query(sql);
      const col = sql.match(/ADD COLUMN (\w+)/)?.[1] ?? sql;
      console.log(`  ✅ Aplicado: ${col}`);
      ok++;
    } catch (e) {
      if (
        e.code === 'ER_DUP_FIELDNAME' ||
        e.message?.includes('Duplicate column') ||
        e.message?.includes('already exists')
      ) {
        const col = sql.match(/ADD COLUMN (\w+)/)?.[1] ?? '?';
        console.log(`  ⏭️  Já existe (ignorado): ${col}`);
        skip++;
      } else {
        console.error(`  ❌ Erro inesperado: ${e.message}`);
        throw e;
      }
    }
  }

  console.log(`\n✅ Migração concluída — ${ok} aplicada(s), ${skip} já existia(m).`);
  process.exit(0);
}

run().catch((e) => {
  console.error('❌ Falha na migração:', e.message);
  process.exit(1);
});
