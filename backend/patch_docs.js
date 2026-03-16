const db = require('./db');

async function patch() {
  console.log('👷 Remendando banco de dados para Emissor de Documentos...');

  const commands = [
    // Categorias
    `CREATE TABLE IF NOT EXISTS doc_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Templates
    `CREATE TABLE IF NOT EXISTS doc_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      category_id INT NULL,
      title VARCHAR(255) NOT NULL,
      doc_type ENUM('laudo', 'atestado', 'receituario', 'outros') DEFAULT 'outros',
      template_body TEXT NOT NULL,
      header_logo_url VARCHAR(500) NULL,
      footer_logo_url VARCHAR(500) NULL,
      signature_name VARCHAR(255) NULL,
      signature_crp VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES doc_categories(id) ON DELETE SET NULL
    )`,

    // Instâncias (Histórico)
    `CREATE TABLE IF NOT EXISTS doc_instances (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      patient_id INT NULL,
      template_id INT NULL,
      title VARCHAR(255) NOT NULL,
      rendered_html LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
      FOREIGN KEY (template_id) REFERENCES doc_templates(id) ON DELETE SET NULL
    )`
  ];

  for (const sql of commands) {
    try {
      await db.query(sql);
      console.log('✅ Comando executado com sucesso.');
    } catch (err) {
      if (err.errno === 1060) {
        console.log('ℹ️ Coluna já existe, pulando...');
      } else {
        console.error('❌ Erro no comando:', sql, err.message);
      }
    }
  }

  // Verifica se as colunas novas existem em doc_templates (caso a tabela já existisse com menos colunas)
  const columnsToAdd = [
    { table: 'doc_templates', column: 'doc_type', type: "ENUM('laudo', 'atestado', 'receituario', 'outros') DEFAULT 'outros'" },
    { table: 'doc_templates', column: 'header_logo_url', type: 'VARCHAR(500) NULL' },
    { table: 'doc_templates', column: 'footer_logo_url', type: 'VARCHAR(500) NULL' },
    { table: 'doc_templates', column: 'signature_name', type: 'VARCHAR(255) NULL' },
    { table: 'doc_templates', column: 'signature_crp', type: 'VARCHAR(50) NULL' },
    { table: 'doc_templates', column: 'template_body', type: 'TEXT NULL' } // Renaming content if needed is harder, just add if not there
  ];

  for (const item of columnsToAdd) {
    try {
      await db.query(`ALTER TABLE ${item.table} ADD COLUMN ${item.column} ${item.type}`);
      console.log(`✅ Coluna ${item.column} adicionada em ${item.table}.`);
    } catch (e) {
      // Ignora erro de coluna duplicada
    }
  }

  console.log('🚀 Banco de dados pronto!');
  process.exit(0);
}

patch();
