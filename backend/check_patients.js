const db = require('./db');
async function check() {
  try {
    const [results] = await db.query('DESCRIBE patients');
    console.log('PATIENTS FIELDS:');
    results.forEach(r => console.log(`${r.Field} - ${r.Type} - ${r.Null}`));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
