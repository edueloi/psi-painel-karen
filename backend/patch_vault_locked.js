const db = require('./db');

async function patch() {
  try {
    const [foldersCols] = await db.query("SHOW COLUMNS FROM vault_folders LIKE 'is_locked'");
    if (foldersCols.length === 0) {
      await db.query("ALTER TABLE vault_folders ADD COLUMN is_locked BOOLEAN DEFAULT TRUE");
    }

    const [docsCols] = await db.query("SHOW COLUMNS FROM vault_documents LIKE 'is_locked'");
    if (docsCols.length === 0) {
      await db.query("ALTER TABLE vault_documents ADD COLUMN is_locked BOOLEAN DEFAULT TRUE");
    }

    console.log("Vault tables locked columns patched!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

patch();
