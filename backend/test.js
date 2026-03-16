require('dotenv').config();
const db = require('./db');
db.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'virtual_rooms'").then(res => {
  const fs = require('fs');
  fs.writeFileSync('output.txt', res[0].map(r => r.COLUMN_NAME).join(', '));
  return db.query("SELECT * FROM virtual_rooms");
}).then(res => {
  const fs = require('fs');
  fs.appendFileSync('output.txt', '\n\n' + JSON.stringify(res[0], null, 2));
  process.exit();
}).catch(e => {
  console.error(e);
  process.exit(1);
});
