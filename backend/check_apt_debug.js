const db = require('./db');

async function check() {
    try {
        const [rows] = await db.query(
            `SELECT a.id, a.start_time, a.status, a.patient_id, a.professional_id, p.name as patient_name
             FROM appointments a
             JOIN patients p ON p.id = a.patient_id
             WHERE a.patient_id = 4
             ORDER BY a.start_time ASC`
        );
        console.log('Appointments for patient 4:');
        console.table(rows);
        
        const [[prof]] = await db.query('SELECT name FROM users WHERE id = 3');
        console.log('Professional 3:', prof.name);

        const [conflicts] = await db.query(
            `SELECT id, start_time, end_time, patient_id FROM appointments 
             WHERE professional_id = 3 AND start_time LIKE '2026-04-02%'`
        );
        console.log('Appointments for professional 3 on 2026-04-02:');
        console.table(conflicts);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
