const db = require('./db');

async function addColumn(table, column, type) {
  try {
    await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    console.log(`✅ Coluna ${column} adicionada em ${table}`);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log(`ℹ️ Coluna ${column} já existe em ${table}`);
    } else {
      console.error(`❌ Erro ao adicionar ${column} em ${table}:`, err.message);
    }
  }
}

async function patch() {
  console.log('👷 Remendando tabela appointments...');

  await addColumn('appointments', 'comanda_id', "INT");
  await addColumn('appointments', 'recurrence_rule', "VARCHAR(50)");
  await addColumn('appointments', 'package_id', "INT"); // Just in case

  console.log('✅ Remendo da agenda concluído!');
  process.exit(0);
}

patch();
