const mysql = require('mysql2/promise');
require('dotenv').config();

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'psiflux'
  });

  console.log('🚀 Criando perfis de acesso padrão para os tenants existentes...');

  const [tenants] = await conn.query('SELECT id FROM tenants');

  const defaultProfiles = [
    {
      name: 'Administrador',
      slug: 'admin',
      is_default: 1,
      permissions: {
        view_agenda: true, create_appointment: true, edit_appointment: true, delete_appointment: true, manage_agenda_settings: true,
        view_patients: true, create_patient: true, edit_patient: true, delete_patient: true, view_medical_records: true, manage_medical_records: true, manage_clinical_tools: true,
        view_comandas: true, create_comanda: true, edit_comanda: true, delete_comanda: true, manage_payments: true, view_financial_reports: true,
        manage_services: true, manage_professionals: true, manage_clinic_settings: true, manage_documents: true
      }
    },
    {
      name: 'Profissional Clínico',
      slug: 'professional',
      is_default: 1,
      permissions: {
        view_agenda: true, create_appointment: true, edit_appointment: true, delete_appointment: false, manage_agenda_settings: false,
        view_patients: true, create_patient: true, edit_patient: true, delete_patient: false, view_medical_records: true, manage_medical_records: true, manage_clinical_tools: true,
        view_comandas: true, create_comanda: true, edit_comanda: true, delete_comanda: false, manage_payments: false, view_financial_reports: false,
        manage_services: false, manage_professionals: false, manage_clinic_settings: false, manage_documents: true
      }
    },
    {
      name: 'Secretário(a) / Recepção',
      slug: 'receptionist',
      is_default: 1,
      permissions: {
        view_agenda: true, create_appointment: true, edit_appointment: true, delete_appointment: true, manage_agenda_settings: false,
        view_patients: true, create_patient: true, edit_patient: true, delete_patient: false, view_medical_records: false, manage_medical_records: false, manage_clinical_tools: false,
        view_comandas: true, create_comanda: true, edit_comanda: true, delete_comanda: false, manage_payments: true, view_financial_reports: false,
        manage_services: false, manage_professionals: false, manage_clinic_settings: false, manage_documents: false
      }
    },
    {
        name: 'Financeiro',
        slug: 'financial',
        is_default: 1,
        permissions: {
          view_agenda: true, create_appointment: false, edit_appointment: false, delete_appointment: false, manage_agenda_settings: false,
          view_patients: true, create_patient: false, edit_patient: false, delete_patient: false, view_medical_records: false, manage_medical_records: false, manage_clinical_tools: false,
          view_comandas: true, create_comanda: true, edit_comanda: true, delete_comanda: true, manage_payments: true, view_financial_reports: true,
          manage_services: false, manage_professionals: false, manage_clinic_settings: false, manage_documents: false
        }
    }
  ];

  for (const tenant of tenants) {
    const tenantId = tenant.id;
    for (const profile of defaultProfiles) {
      const [existing] = await conn.query('SELECT id FROM tenant_permission_profiles WHERE tenant_id = ? AND slug = ?', [tenantId, profile.slug]);
      
      let profileId;
      if (existing.length === 0) {
        const [res] = await conn.query(
          'INSERT INTO tenant_permission_profiles (tenant_id, name, permissions, is_default, slug) VALUES (?, ?, ?, ?, ?)',
          [tenantId, profile.name, JSON.stringify(profile.permissions), profile.is_default, profile.slug]
        );
        profileId = res.insertId;
        console.log(`✅ Criado perfil '${profile.name}' para tenant ${tenantId}`);
      } else {
        profileId = existing[0].id;
      }

      // Link users to these default profiles if they match role
      if (profile.slug === 'admin') {
         await conn.query(`UPDATE users SET tenant_profile_id = ? WHERE role = 'admin' AND tenant_id = ? AND tenant_profile_id IS NULL`, [profileId, tenantId]);
      } else if (profile.slug === 'professional') {
         await conn.query(`UPDATE users SET tenant_profile_id = ? WHERE role = 'professional' AND tenant_id = ? AND tenant_profile_id IS NULL`, [profileId, tenantId]);
      } else if (profile.slug === 'receptionist') {
         await conn.query(`UPDATE users SET tenant_profile_id = ? WHERE role = 'receptionist' AND tenant_id = ? AND tenant_profile_id IS NULL`, [profileId, tenantId]);
      }
    }
  }

  await conn.end();
}

seed().catch(console.error);
