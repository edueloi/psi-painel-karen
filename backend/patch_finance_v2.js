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
  console.log('👷 Remendando módulo financeiro...');

  // Adicionando colunas de detalhamento em financial_transactions
  await addColumn('financial_transactions', 'payer_name', "VARCHAR(255)");
  await addColumn('financial_transactions', 'beneficiary_name', "VARCHAR(255)");
  await addColumn('financial_transactions', 'payer_cpf', "VARCHAR(20)");
  await addColumn('financial_transactions', 'beneficiary_cpf', "VARCHAR(20)");
  await addColumn('financial_transactions', 'observation', "TEXT");
  await addColumn('financial_transactions', 'receipt_status', "ENUM('pending', 'issued') DEFAULT 'pending'");

  // Tabela para tipos de sessão (como no PHP)
  await db.query(`
    CREATE TABLE IF NOT EXISTS session_types (
      id VARCHAR(50) PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      default_value DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('✅ Remendo financeiro concluído!');
  process.exit(0);
}

patch();
