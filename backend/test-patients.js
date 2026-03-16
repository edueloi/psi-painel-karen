require('dotenv').config();
const db = require('./db');
db.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patients'")
  .then(res => { console.log(res[0].map(r => r.COLUMN_NAME)); process.exit(); })
  .catch(err => { console.error(err); process.exit(1); });
