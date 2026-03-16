const db = require('./db');
async function check() {
  try {
    const [templates] = await db.query('SHOW COLUMNS FROM doc_templates');
    console.log('--- doc_templates ---');
    console.table(templates);
    
    try {
        const [instances] = await db.query('SHOW COLUMNS FROM doc_instances');
        console.log('--- doc_instances ---');
        console.table(instances);
    } catch(e) { console.log('doc_instances NOT FOUND'); }

    try {
        const [cats] = await db.query('SHOW COLUMNS FROM doc_categories');
        console.log('--- doc_categories ---');
        console.table(cats);
    } catch(e) { console.log('doc_categories NOT FOUND'); }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
