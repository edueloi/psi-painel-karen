/**
 * provisionForms.js
 * Garante que todos os tenants ativos tenham todos os formulários padrão (DEFAULT_FORMS).
 * Executado no startup do servidor — idempotente, não duplica formulários existentes.
 */
const crypto = require('crypto');
const db = require('../db');
const { DEFAULT_FORMS } = require('../default_forms_data');

async function provisionFormsForAllTenants() {
  try {
    const [tenants] = await db.query(
      `SELECT id FROM tenants WHERE active = true OR active IS NULL`
    );

    for (const { id: tenantId } of tenants) {
      const [[adminUser]] = await db.query(
        `SELECT id FROM users WHERE tenant_id = ? ORDER BY id ASC LIMIT 1`,
        [tenantId]
      );
      const adminId = adminUser?.id || null;

      let created = 0;
      for (const form of DEFAULT_FORMS) {
        const [existing] = await db.query(
          'SELECT id FROM forms WHERE tenant_id = ? AND title = ?',
          [tenantId, form.title]
        );
        if (existing.length > 0) continue;

        const fields = JSON.stringify({
          questions: form.questions,
          interpretations: form.interpretations || [],
          theme: null,
        });
        const hash = crypto.randomBytes(8).toString('hex');

        await db.query(
          'INSERT INTO forms (tenant_id, title, description, fields, is_public, hash, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [tenantId, form.title, form.description || null, fields, 1, hash, adminId]
        ).catch(e => console.warn(`  ⚠️  form "${form.title}":`, e.message));
        created++;
      }
      if (created > 0) console.log(`✅ provisionForms: tenant ${tenantId} — ${created} formulário(s) criado(s)`);
    }
  } catch (err) {
    console.warn('⚠️  provisionForms:', err.message);
  }
}

module.exports = { provisionFormsForAllTenants };
