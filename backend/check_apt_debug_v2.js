const db = require('./db');

async function check() {
    try {
        console.log('Querying for appointments at 2026-04-02 22:00:00 (UTC)...');
        const [rows] = await db.query(
            `SELECT a.id, a.start_time, a.status, a.patient_id, a.professional_id, p.name as patient_name, u.name as prof_name
             FROM appointments a
             LEFT JOIN patients p ON p.id = a.patient_id
             LEFT JOIN users u ON u.id = a.professional_id
             WHERE a.start_time = '2026-04-02 22:00:00'
             AND a.tenant_id = 2`
        );
        console.table(rows);
        
        console.log('Checking for comanda_id = 66:');
        const [comandaRows] = await db.query(
            `SELECT id, start_time, recurrence_rule FROM appointments WHERE comanda_id = 66`
        );
        console.table(comandaRows);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
