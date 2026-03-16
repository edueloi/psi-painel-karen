const db = require('./db');
async function check() {
  try {
    const [templates] = await db.query('SHOW COLUMNS FROM doc_templates');
    console.log('TEMPLATES:', JSON.stringify(templates, null, 2));
    
    try {
        const [instances] = await db.query('SHOW COLUMNS FROM doc_instances');
        console.log('INSTANCES:', JSON.stringify(instances, null, 2));
    } catch(e) { console.log('INSTANCES: NOT FOUND'); }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
