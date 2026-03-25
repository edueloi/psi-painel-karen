const db = require('./db');

async function checkSensoryCols() {
  try {
    const [rows] = await db.query('DESCRIBE pei_sensory');
    console.log('Columns in pei_sensory:', rows.map(r => r.Field).join(', '));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function checkGoalHistoryCols() {
  try {
    const [rows] = await db.query('DESCRIBE pei_goal_history');
    console.log('Columns in pei_goal_history:', rows.map(r => r.Field).join(', '));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function main() {
  await checkSensoryCols();
  await checkGoalHistoryCols();
  process.exit(0);
}

main();
