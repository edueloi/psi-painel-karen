const mysql = require('mysql2/promise');
require('dotenv').config({ path: __dirname + '/../.env' });

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'psiflux'
  });

  try {
    console.log('🚀 Atualizando Shema e Seeding de Ferramentas Clínicas...');

    // 1. Garantir colunas no forms
    const alterForms = [
      'ALTER TABLE forms ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false',
      'ALTER TABLE forms ADD COLUMN IF NOT EXISTS hash VARCHAR(100) UNIQUE'
    ];

    for (const stmt of alterForms) {
      try { await conn.query(stmt); } catch (e) {}
    }

    // 2. Pegar um usuário admin para vincular o seed (se necessário)
    const [[adminUser]] = await conn.query('SELECT id, tenant_id FROM users WHERE role = "admin" OR role = "super_admin" LIMIT 1');
    if (!adminUser) {
        console.error('❌ Nenhum usuário admin encontrado para realizar o seed.');
        return;
    }

    const { id: userId, tenant_id: tenantId } = adminUser;

    // 3. Seed DASS-21
    const dassFields = JSON.stringify([
      { id: '1', type: 'radio', label: 'DASS-21 Assessment', options: ['0', '1', '2', '3'] }
    ]);
    
    const [existingDass] = await conn.query('SELECT id FROM forms WHERE hash = ?', ['system-dass-21']);
    if (existingDass.length === 0) {
      await conn.query(
        'INSERT INTO forms (tenant_id, title, description, category, fields, is_public, is_global, is_system, hash, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [tenantId, 'DASS-21', 'Escala de Depressão, Ansiedade e Estresse', 'Assessment', dassFields, true, true, true, 'system-dass-21', userId]
      );
      console.log('✅ DASS-21 registrado como Form de Sistema');
    }

    // 4. Seed DISC
    const discFields = JSON.stringify([
      { id: '1', type: 'radio', label: 'Profiling DISC', options: ['1', '2', '3', '4'] }
    ]);
    const [existingDisc] = await conn.query('SELECT id FROM forms WHERE hash = ?', ['system-disc']);
    if (existingDisc.length === 0) {
      await conn.query(
        'INSERT INTO forms (tenant_id, title, description, category, fields, is_public, is_global, is_system, hash, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [tenantId, 'Análise DISC', 'Avaliação de Perfil Comportamental (Dominância, Influência, Estabilidade, Conformidade)', 'Assessment', discFields, true, true, true, 'system-disc', userId]
      );
      console.log('✅ DISC registrado como Form de Sistema');
    }

    console.log('✨ Seeding concluído com sucesso!');

  } catch (err) {
    console.error('❌ Erro no seed:', err);
  } finally {
    await conn.end();
    process.exit();
  }
}

seed();
