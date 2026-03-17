const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config(); // Tenta no diretório atual
require('dotenv').config({ path: path.join(__dirname, '.env') }); // Tenta na mesma pasta do script
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') }); // Tenta se estiver na raiz

async function patch() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('🚀 Iniciando atualização do banco de dados...');

  const patches = [
    {
      table: 'patients',
      columns: [
        { name: 'phone2', type: 'VARCHAR(50)', after: 'phone' },
        { name: 'marital_status', type: 'VARCHAR(100)', after: 'rg' },
        { name: 'education', type: 'VARCHAR(100)', after: 'marital_status' },
        { name: 'profession', type: 'VARCHAR(100)', after: 'education' },
        { name: 'nationality', type: 'VARCHAR(100)', after: 'profession' },
        { name: 'naturality', type: 'VARCHAR(100)', after: 'nationality' },
        { name: 'has_children', type: 'BOOLEAN DEFAULT FALSE', after: 'naturality' },
        { name: 'children_count', type: 'INT DEFAULT 0', after: 'has_children' },
        { name: 'minor_children_count', type: 'INT DEFAULT 0', after: 'children_count' },
        { name: 'spouse_name', type: 'VARCHAR(255)', after: 'minor_children_count' },
        { name: 'family_contact', type: 'VARCHAR(255)', after: 'spouse_name' },
        { name: 'emergency_contact', type: 'VARCHAR(255)', after: 'family_contact' },
        { name: 'photo_url', type: 'VARCHAR(500)', after: 'diagnosis' }
      ]
    },
    {
      table: 'appointments',
      columns: [
        { name: 'modality', type: "VARCHAR(50) DEFAULT 'presencial'", after: 'status' },
        { name: 'type', type: "VARCHAR(50) DEFAULT 'consulta'", after: 'modality' },
        { name: 'duration_minutes', type: 'INT DEFAULT 50', after: 'type' },
        { name: 'meeting_url', type: 'VARCHAR(500)', after: 'duration_minutes' },
        { name: 'recurrence_rule', type: 'VARCHAR(255)', after: 'meeting_url' },
        { name: 'recurrence_id', type: 'INT', after: 'recurrence_rule' },
        { name: 'comanda_id', type: 'INT', after: 'recurrence_id' },
        { name: 'reschedule_reason', type: 'TEXT', after: 'comanda_id' }
      ]
    },
    {
      table: 'comandas',
      columns: [
        { name: 'description', type: 'TEXT', after: 'professional_id' },
        { name: 'sessions_total', type: 'INT DEFAULT 0', after: 'total' },
        { name: 'sessions_used', type: 'INT DEFAULT 0', after: 'sessions_total' },
        { name: 'service_id', type: 'INT', after: 'patient_id' },
        { name: 'financial_transaction_id', type: 'INT', after: 'service_id' }
      ]
    }
  ];

  for (const patch of patches) {
    console.log(`\nVerificando tabela: ${patch.table}...`);
    const [columns] = await conn.query(`SHOW COLUMNS FROM ${patch.table}`);
    const existingColumns = columns.map(c => c.Field.toLowerCase());

    for (const col of patch.columns) {
      if (!existingColumns.includes(col.name.toLowerCase())) {
        try {
          const query = `ALTER TABLE ${patch.table} ADD COLUMN ${col.name} ${col.type} AFTER ${col.after}`;
          await conn.query(query);
          console.log(`✅ [${patch.table}] Coluna adicionada: ${col.name}`);
        } catch (err) {
          console.error(`❌ [${patch.table}] Erro ao adicionar ${col.name}:`, err.message);
        }
      } else {
        console.log(`ℹ️ [${patch.table}] Coluna já existe: ${col.name}`);
      }
    }
  }

  console.log('\n✨ Banco de dados atualizado com sucesso!');
  await conn.end();
}

patch().catch(err => {
  console.error('❌ Erro crítico:', err);
  process.exit(1);
});
