const db = require('./db');
(async () => {
    try {
        const [rows] = await db.query(`
            SELECT id, start_time, end_time, title, TIMEDIFF(end_time, start_time) as duration
            FROM appointments
            WHERE status NOT IN ('cancelled', 'no_show')
              AND end_time IS NOT NULL
              AND TIMEDIFF(end_time, start_time) > '24:00:00'
        `);
        console.log("Long appointments:", rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
})();
