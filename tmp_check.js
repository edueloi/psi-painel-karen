const db = require('./backend/db');
db.query("SELECT id, name, role, tenant_id FROM users WHERE role = 'super_admin'")
  .then(r => {
    console.log('SUPER_ADMIN USER:', r[0]);
    if (r[0].length > 0) {
      const tid = r[0][0].tenant_id;
      return db.query("SELECT id, name, whatsapp_status FROM tenants WHERE id = ?", [tid]);
    }
    return Promise.resolve([[null]]);
  })
  .then(r => console.log('MASTER TENANT STATUS:', r[0]))
  .catch(console.error)
  .finally(() => process.exit());
