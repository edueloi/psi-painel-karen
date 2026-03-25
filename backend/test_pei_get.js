const db = require('./db');

async function testPeiGet() {
  const peiId = 9;
  const tenantId = 6; // from curline: tenant_id:6
  
  try {
    console.log(`\n--- Testing GET /pei/${peiId} for Tenant ${tenantId} ---`);
    
    console.log('Querying PEI...');
    const [rows] = await db.query(
      `SELECT p.*, pt.name as patient_name, u.name as professional_name
       FROM pei p
       LEFT JOIN patients pt ON pt.id = p.patient_id
       LEFT JOIN users u ON u.id = p.professional_id
       WHERE p.id = ? AND p.tenant_id = ?`,
      [peiId, tenantId]
    );
    
    if (rows.length === 0) {
      console.log('PEI not found.');
      return;
    }
    const pei = rows[0];
    console.log('PEI found:', pei.id);

    console.log('Querying Goals...');
    const [goals] = await db.query(
      'SELECT * FROM pei_goals WHERE pei_id = ? ORDER BY created_at',
      [pei.id]
    );
    console.log('Goals found:', goals.length);

    for (const goal of goals) {
      console.log(`Querying History for Goal ${goal.id}...`);
      const [history] = await db.query(
        'SELECT * FROM pei_goal_history WHERE goal_id = ? ORDER BY date DESC',
        [goal.id]
      );
      goal.history = history;
    }

    console.log('Querying ABC...');
    const [abc] = await db.query('SELECT * FROM pei_abc WHERE pei_id = ? ORDER BY date DESC', [pei.id]);
    console.log('ABC entries:', abc.length);

    console.log('Querying Sensory...');
    const [sensory] = await db.query('SELECT * FROM pei_sensory WHERE pei_id = ?', [pei.id]);
    console.log('Sensory entry:', sensory.length > 0 ? 'exists' : 'none');

    console.log('Success!');
  } catch (err) {
    console.error('❌ SQL ERROR:', err.message);
    console.error('Full Error:', err);
  }
  process.exit(0);
}

testPeiGet();
