const mysql = require('mysql2/promise');
async function test() {
    const conn = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'psiflux' });
    
    // Simular banco
    await conn.query('CREATE TEMPORARY TABLE appointments (id INT, start_time DATETIME, end_time DATETIME, status VARCHAR(20), professional_id INT, tenant_id INT)');
    
    // Inserir agendamento "das 08:00 às 10:50" UTC-3 -> "11:00:00 às 13:50:00" UTC
    await conn.query(`INSERT INTO appointments VALUES (1, '2026-05-21 11:00:00', '2026-05-21 13:50:00', 'scheduled', 1, 1)`);

    const formattedStart = '2026-05-21 18:00:00'; // 15:00 UTC-3
    const formattedEnd = '2026-05-21 18:50:00';   // 15:50 UTC-3

    const [conflicts] = await conn.query(
        `SELECT a.id,
                a.start_time AS raw_start,
                a.end_time   AS raw_end
         FROM appointments a
         WHERE a.tenant_id       = 1
           AND a.professional_id = 1
           AND a.status NOT IN ('cancelled', 'no_show')
           AND a.end_time IS NOT NULL
           AND a.start_time < ?
           AND a.end_time   > ?
         ORDER BY a.start_time
         LIMIT 1`,
        [formattedEnd, formattedStart]
    );

    console.log(conflicts);
    process.exit(0);
}
test().catch(console.error);
