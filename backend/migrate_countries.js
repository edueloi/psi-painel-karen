const db = require('./db');
async function migrate() {
  try {
    console.log('--- Iniciando Migração de Países ---');
    await db.query('ALTER TABLE patients ADD COLUMN phone_country VARCHAR(10) DEFAULT "BR" AFTER phone');
    await db.query('ALTER TABLE patients ADD COLUMN phone2_country VARCHAR(10) DEFAULT "BR" AFTER phone2');
    console.log('✅ Colunas phone_country e phone2_country adicionadas.');
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN') {
      console.log('⚠️ Colunas já existem.');
      process.exit(0);
    }
    console.error('❌ Erro na migração:', err.message);
    process.exit(1);
  }
}
migrate();
