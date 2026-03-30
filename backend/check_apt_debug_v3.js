const db = require('./db');

async function check() {
    try {
        console.log('Appointments for patient 4 (Ana Laura) in April 2026:');
        const [rows] = await db.query(
            `SELECT a.id, a.start_time, a.status, a.patient_id, a.professional_id, a.comanda_id, p.name as patient_name
             FROM appointments a
             JOIN patients p ON p.id = a.patient_id
             WHERE a.patient_id = 4
             AND a.start_time >= '2026-04-01' AND a.start_time <= '2026-04-30'
             ORDER BY a.start_time ASC`
        );
        console.table(rows);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
