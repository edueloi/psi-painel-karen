const mysql = require('mysql2/promise');
async function test() {
    console.log("Iniciando...");
    const conn = await mysql.createConnection({ host: '127.0.0.1', user: 'root', database: 'psiflux' });
    console.log("Conectado");
    
    // Testa com strings explícitas
    const start_time = '2026-05-21 11:00:00'; // 08:00 local (assuming UTC in DB)
    const end_time = '2026-05-21 13:50:00';   // 10:50 local
    
    const formattedStart = '2026-05-21 18:00:00'; // 15:00 local
    const formattedEnd = '2026-05-21 18:50:00';   // 15:50 local
    
    const [rows] = await conn.query(
        `SELECT ? < ? AS cond1, ? > ? AS cond2`,
        [start_time, formattedEnd, end_time, formattedStart]
    );
    console.log("Teste MySQL direto:", rows);
    process.exit(0);
}
test().catch(console.error);
