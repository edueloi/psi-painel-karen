const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/.env' });

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'psiflux',
    multipleStatements: true,
  });

  console.log('🚀 Iniciando migração incremental robusta (Clinical Records & Patient Edit Fix)...');

  // Helper para adicionar coluna se não existir (MySQL < 8.0.19 fallback)
  async function addColumnIfMissing(table, column, definition) {
    const [cols] = await conn.query(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [process.env.DB_NAME || 'psiflux', table, column]
    );
    
    if (cols.length === 0) {
      console.log(`   Adicionando coluna [${column}] na tabela [${table}]...`);
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    } else {
      console.log(`   ℹ️  Coluna [${column}] já existe na tabela [${table}].`);
    }
  }

  try {
    // 1. Garantir que as tabelas base existem primeiro
    console.log('   Verificando tabelas base...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS medical_record_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        record_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_url LONGTEXT,
        file_type VARCHAR(50),
        file_size INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (record_id) REFERENCES medical_records(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // 2. Adicionar colunas em medical_records
    await addColumnIfMissing('medical_records', 'start_time', 'TIME NULL');
    await addColumnIfMissing('medical_records', 'end_time', 'TIME NULL');
    await addColumnIfMissing('medical_records', 'status', "VARCHAR(50) DEFAULT 'Rascunho'");
    await addColumnIfMissing('medical_records', 'record_type', "VARCHAR(100) DEFAULT 'Evolucao'");
    await addColumnIfMissing('medical_records', 'title', 'VARCHAR(255) NULL');
    await addColumnIfMissing('medical_records', 'tags', 'JSON NULL');

    // 3. Atualizar/Adicionar colunas em uploads
    console.log('   Atualizando campos de capacidade na tabela uploads...');
    await conn.query("ALTER TABLE uploads MODIFY COLUMN filename VARCHAR(255) NULL");
    await conn.query("ALTER TABLE uploads MODIFY COLUMN file_url LONGTEXT NULL");
    await conn.query("ALTER TABLE uploads MODIFY COLUMN url LONGTEXT NULL");
    await addColumnIfMissing('uploads', 'description', 'TEXT NULL');
    await addColumnIfMissing('uploads', 'status', "VARCHAR(20) DEFAULT 'uploaded'");

    // 4. Garantir capacidade em medical_record_attachments
    console.log('   Atualizando campos de capacidade na tabela medical_record_attachments...');
    await conn.query("ALTER TABLE medical_record_attachments MODIFY COLUMN file_url LONGTEXT NULL");

    // 5. Atualizar system_alerts
    await addColumnIfMissing('system_alerts', 'is_dismissed', 'BOOLEAN DEFAULT FALSE');

    console.log('✅ Migração incremental robusta concluída!');
  } catch (err) {
    console.error('❌ Erro durante a migração:', err.message);
  } finally {
    await conn.end();
  }
}

migrate().catch(err => {
  console.error('❌ Erro fatal na migração:', err);
  process.exit(1);
});
