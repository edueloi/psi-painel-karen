const db = require('./db');
(async () => {
  try {
    const [rows] = await db.query('DESCRIBE anamnesis_sends');
    const fs = require('fs');
    let out = '';
    rows.forEach(r => {
      out += `FIELD: ${r.Field} | NULL: ${r.Null} | TYPE: ${r.Type} | KEY: ${r.Key} | DEF: ${r.Default}\n`;
    });
    fs.writeFileSync('output.txt', out);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
