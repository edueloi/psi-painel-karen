const db = require('./db');

async function patch() {
  console.log('🚀 Iniciando atualização das tabelas usando pool do sistema...');

  try {
    // 1. Atualizar doc_templates
    console.log('Verificando doc_templates...');
    const [docTemplateCols] = await db.query('SHOW COLUMNS FROM doc_templates');
    const existingDocCols = docTemplateCols.map(c => c.Field.toLowerCase());

    const docPatches = [
      { name: 'doc_type', type: 'VARCHAR(50)', after: 'title' },
      { name: 'template_body', type: 'LONGTEXT', after: 'doc_type' },
      { name: 'header_logo_url', type: 'VARCHAR(500)', after: 'template_body' },
      { name: 'footer_logo_url', type: 'VARCHAR(500)', after: 'header_logo_url' },
      { name: 'signature_name', type: 'VARCHAR(100)', after: 'footer_logo_url' },
      { name: 'signature_crp', type: 'VARCHAR(50)', after: 'signature_name' }
    ];

    for (const col of docPatches) {
      if (!existingDocCols.includes(col.name.toLowerCase())) {
        try {
          await db.query(`ALTER TABLE doc_templates ADD COLUMN ${col.name} ${col.type} AFTER ${col.after}`);
          console.log(`✅ [doc_templates] Coluna adicionada: ${col.name}`);
        } catch (err) {
          console.error(`❌ [doc_templates] Erro ao adicionar ${col.name}:`, err.message);
        }
      }
    }

    // 2. Criar system_alerts
    console.log('\nCriando tabela system_alerts...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        is_dismissed BOOLEAN DEFAULT false,
        link VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tenant_dismissed (tenant_id, is_dismissed)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Tabela system_alerts pronta.');

    // 3. Criar doc_instances (se não existir)
    console.log('\nCriando tabela doc_instances...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS doc_instances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        patient_id INT,
        template_id INT,
        title VARCHAR(255),
        rendered_html LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tenant (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Tabela doc_instances pronta.');

    console.log('\n✨ Atualização concluída com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro crítico:', err);
    process.exit(1);
  }
}

patch();
