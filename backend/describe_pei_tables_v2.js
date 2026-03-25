const db = require('./db');

async function describePeiTables() {
  const tables = ['pei', 'pei_goals', 'pei_goal_history', 'pei_abc', 'pei_sensory'];
  for (const table of tables) {
    process.stdout.write(`\n--- TABLE: ${table} ---\n`);
    try {
      const [rows] = await db.query(`DESCRIBE ${table}`);
      rows.forEach(r => {
        process.stdout.write(`${r.Field} | ${r.Type} | ${r.Null} | ${r.Key} | ${r.Default} | ${r.Extra}\n`);
      });
    } catch (err) {
      process.stdout.write(`Error checking '${table}': ${err.message}\n`);
    }
  }
  process.exit(0);
}

describePeiTables();
