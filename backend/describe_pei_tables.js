const db = require('./db');

async function describePeiTables() {
  const tables = ['pei', 'pei_goals', 'pei_goal_history', 'pei_abc', 'pei_sensory'];
  for (const table of tables) {
    console.log(`\n--- TABLE: ${table} ---`);
    try {
      const [rows] = await db.query(`DESCRIBE ${table}`);
      console.table(rows);
    } catch (err) {
      console.error(`Error describing '${table}':`, err.message);
    }
  }
  process.exit(0);
}

describePeiTables();
