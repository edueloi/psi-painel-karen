const db = require('./db');

async function checkPeiTables() {
  const tables = ['pei', 'pei_goals', 'pei_goal_history', 'pei_abc', 'pei_sensory'];
  for (const table of tables) {
    try {
      const [rows] = await db.query(`SHOW TABLES LIKE '${table}'`);
      console.log(`Table '${table}': ${rows.length > 0 ? 'EXISTS' : 'NOT FOUND'}`);
    } catch (err) {
      console.error(`Error checking '${table}':`, err.message);
    }
  }
  process.exit(0);
}

checkPeiTables();
