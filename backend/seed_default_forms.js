/**
 * Seed de formulários psicológicos padrão
 * Insere os formulários padrão para todos os tenants existentes.
 *
 * Execute: node seed_default_forms.js
 *
 * Seguro para re-execução: verifica se já existe formulário com o mesmo título por tenant
 * antes de inserir, evitando duplicatas.
 */
const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

const { DEFAULT_FORMS } = require('./default_forms_data');

function generateHash() {
  return crypto.randomBytes(8).toString('hex');
}

async function seedFormsForTenant(conn, tenantId, adminUserId) {
  let created = 0;
  let skipped = 0;

  for (const form of DEFAULT_FORMS) {
    // Verifica se já existe um formulário com este título para este tenant
    const [existing] = await conn.query(
      'SELECT id FROM forms WHERE tenant_id = ? AND title = ?',
      [tenantId, form.title]
    );

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    const fields = JSON.stringify({
      questions: form.questions,
      interpretations: form.interpretations || [],
      theme: null,
    });

    const hash = generateHash();

    await conn.query(
      'INSERT INTO forms (tenant_id, title, description, fields, is_public, hash, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tenantId, form.title, form.description || null, fields, 1, hash, adminUserId]
    );

    created++;
  }

  return { created, skipped };
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'psiflux',
  });

  console.log('🚀 Iniciando seed de formulários psicológicos padrão...');
  console.log(`   Total de formulários disponíveis: ${DEFAULT_FORMS.length}`);
  console.log('');

  // Busca todos os tenants
  const [tenants] = await conn.query('SELECT id FROM tenants WHERE active = true OR active IS NULL');

  if (tenants.length === 0) {
    console.log('⚠️  Nenhum tenant encontrado. Execute a migração primeiro.');
    await conn.end();
    return;
  }

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const tenant of tenants) {
    // Busca o usuário admin do tenant para usar como created_by
    const [admins] = await conn.query(
      'SELECT id FROM users WHERE tenant_id = ? AND role IN ("admin", "professional") ORDER BY id ASC LIMIT 1',
      [tenant.id]
    );

    if (admins.length === 0) {
      console.log(`   Tenant ${tenant.id}: sem usuário admin, pulando...`);
      continue;
    }

    const adminUserId = admins[0].id;
    const { created, skipped } = await seedFormsForTenant(conn, tenant.id, adminUserId);
    totalCreated += created;
    totalSkipped += skipped;

    console.log(`   Tenant ${tenant.id}: ${created} formulários criados, ${skipped} já existiam`);
  }

  console.log('');
  console.log(`✅ Seed concluído!`);
  console.log(`   Total criados: ${totalCreated}`);
  console.log(`   Total ignorados (já existiam): ${totalSkipped}`);
  console.log('');
  console.log('📋 Formulários disponíveis:');
  DEFAULT_FORMS.forEach((f, i) => console.log(`   ${i + 1}. ${f.title}`));

  await conn.end();
}

main().catch((err) => {
  console.error('❌ Erro durante o seed:', err);
  process.exit(1);
});
