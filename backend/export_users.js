const fs = require('fs');
const db = require('./db');
db.query('SELECT id, name, schedule FROM users').then(([r]) => {
  fs.writeFileSync('users_schedule.json', JSON.stringify(r, null, 2));
  console.log('Written to users_schedule.json');
  process.exit(0);
});
