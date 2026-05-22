/**
 * fix_apt_681.js
 * Corrige agendamentos com end_time absurdamente longe do start_time
 * (resultado de bug onde end_time foi gravado com valor errado)
 *
 * Executa: node fix_apt_681.js
 */
const db = require('./db');

async function main() {
  // 1. Mostra o agendamento 681 e quaisquer outros com duração > 8h
  const [bad] = await db.query(`
    SELECT id, tenant_id, professional_id, type, status,
           start_time, end_time, duration_minutes, title,
           TIMESTAMPDIFF(MINUTE, start_time, end_time) AS actual_min
    FROM appointments
    WHERE TIMESTAMPDIFF(MINUTE, start_time, end_time) > 480
       OR id = 681
    ORDER BY actual_min DESC
    LIMIT 20
  `);

  if (bad.length === 0) {
    console.log('✅ Nenhum agendamento com duração absurda encontrado.');
    process.exit(0);
  }

  console.log(`⚠️  ${bad.length} agendamento(s) com end_time inválido:`);
  for (const a of bad) {
    console.log(`  id=${a.id} tenant=${a.tenant_id} prof=${a.professional_id} status=${a.status} type=${a.type}`);
    console.log(`     start=${a.start_time}  end=${a.end_time}  duration_minutes=${a.duration_minutes}  actual_min=${a.actual_min}`);
    console.log(`     title="${a.title}"`);
  }

  // 2. Corrige: recalcula end_time = start_time + duration_minutes
  //    Se duration_minutes for 0 ou nulo, usa 50min como padrão
  for (const a of bad) {
    const dur = Number(a.duration_minutes) || 50;
    const [res] = await db.query(`
      UPDATE appointments
      SET end_time = DATE_ADD(start_time, INTERVAL ? MINUTE)
      WHERE id = ?
    `, [dur, a.id]);
    console.log(`  ✅ id=${a.id} corrigido: end_time = start_time + ${dur}min (rows affected: ${res.affectedRows})`);
  }

  // 3. Confirma
  const [check] = await db.query(`
    SELECT id, start_time, end_time,
           TIMESTAMPDIFF(MINUTE, start_time, end_time) AS actual_min
    FROM appointments
    WHERE id IN (${bad.map(a => a.id).join(',')})
  `);
  console.log('\n📋 Estado após correção:');
  for (const a of check) {
    console.log(`  id=${a.id}  start=${a.start_time}  end=${a.end_time}  actual_min=${a.actual_min}`);
  }

  console.log('\n✅ Concluído.');
  process.exit(0);
}

main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
