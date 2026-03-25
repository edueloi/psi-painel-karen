const db = require('./db');

async function patch() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS vault_folders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS vault_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_id INT NOT NULL,
        folder_id INT,
        title VARCHAR(255) NOT NULL,
        content LONGTEXT,
        file_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES vault_folders(id) ON DELETE SET NULL
      )
    `);

    // Master key is encrypted string or hash stored per tenant
    const [cols] = await db.query("SHOW COLUMNS FROM tenants LIKE 'vault_master_hash'");
    if (cols.length === 0) {
      await db.query("ALTER TABLE tenants ADD COLUMN vault_master_hash VARCHAR(255) DEFAULT NULL");
    }

    console.log("Vault tables patched!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

patch();
