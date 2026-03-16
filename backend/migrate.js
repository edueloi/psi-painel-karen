/**
 * Migração do banco de dados PsiFlux
 * Execute: node migrate.js
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  console.log('🚀 Iniciando migração...');

  // Criar banco se não existir
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'psiflux'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${process.env.DB_NAME || 'psiflux'}\``);

  // ---- DROP tabelas antigas (schema novo) ----
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  const oldTables = [
    'message_templates','uploads','doc_templates','doc_categories',
    'financial_transactions','comandas','form_responses','forms',
    'case_study_cards','case_study_columns','case_study_boards',
    'clinical_tools','pei_abc','pei_goal_history','pei_goals','pei',
    'medical_records','virtual_rooms','appointments','services',
    'patients','users','tenants','plans','master_permission_profiles'
  ];
  for (const table of oldTables) {
    await conn.query(`DROP TABLE IF EXISTS \`${table}\``);
  }
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('   Tabelas antigas removidas, criando novo schema...');

  // ---- MASTER PERMISSION PROFILES ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS master_permission_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      role ENUM('super_admin','vendedor','suporte','visualizador','financeiro') NOT NULL DEFAULT 'suporte',
      description TEXT,
      permissions JSON,
      access_token VARCHAR(255) UNIQUE,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- PLANS ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      max_users INT DEFAULT 5,
      max_patients INT DEFAULT 100,
      features TEXT,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- TENANTS ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      cnpj_cpf VARCHAR(20),
      phone VARCHAR(50),
      plan_id INT,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- USERS ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('super_admin','admin','professional','receptionist','viewer') DEFAULT 'professional',
      specialty VARCHAR(255),
      crp VARCHAR(50),
      phone VARCHAR(50),
      avatar_url VARCHAR(500),
      active BOOLEAN DEFAULT true,
      permission_profile_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_email_tenant (email, tenant_id),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_profile_id) REFERENCES master_permission_profiles(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- PATIENTS ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS patients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      phone2 VARCHAR(50),
      birth_date DATE,
      cpf VARCHAR(20),
      rg VARCHAR(30),
      marital_status VARCHAR(100),
      education VARCHAR(100),
      profession VARCHAR(100),
      nationality VARCHAR(100),
      naturality VARCHAR(100),
      has_children BOOLEAN DEFAULT false,
      children_count INT DEFAULT 0,
      minor_children_count INT DEFAULT 0,
      spouse_name VARCHAR(255),
      family_contact VARCHAR(255),
      emergency_contact VARCHAR(255),
      gender VARCHAR(30),
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(50),
      zip_code VARCHAR(20),
      notes TEXT,
      status ENUM('active','inactive','waiting') DEFAULT 'active',
      responsible_professional_id INT,
      responsible_name VARCHAR(255),
      responsible_phone VARCHAR(50),
      health_plan VARCHAR(255),
      diagnosis TEXT,
      photo_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- SERVICES ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) DEFAULT 0,
      duration INT DEFAULT 60,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- APPOINTMENTS ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      patient_id INT,
      professional_id INT,
      service_id INT,
      title VARCHAR(255),
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status ENUM('scheduled','confirmed','completed','cancelled','no_show') DEFAULT 'scheduled',
      notes TEXT,
      room_id INT,
      color VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
      FOREIGN KEY (professional_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- VIRTUAL ROOMS ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS virtual_rooms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      title VARCHAR(200) NULL,
      description TEXT NULL,
      host_id INT NOT NULL,
      status ENUM('waiting','active','ended') DEFAULT 'waiting',
      max_participants INT DEFAULT 10,
      hash VARCHAR(100) UNIQUE,
      code VARCHAR(64) NULL,
      scheduled_start DATETIME NULL,
      scheduled_end DATETIME NULL,
      patient_id INT NULL,
      professional_id INT NULL,
      appointment_id INT NULL,
      provider VARCHAR(32) NULL DEFAULT 'interno',
      link VARCHAR(512) NULL,
      expiration_date DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (host_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- MEDICAL RECORDS ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS medical_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      patient_id INT NOT NULL,
      professional_id INT NOT NULL,
      appointment_id INT,
      content LONGTEXT,
      type VARCHAR(100) DEFAULT 'session',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (professional_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- PEI ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS pei (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      patient_id INT NOT NULL,
      professional_id INT NOT NULL,
      title VARCHAR(255),
      description TEXT,
      start_date DATE,
      end_date DATE,
      status ENUM('active','completed','paused') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS pei_goals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pei_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status ENUM('pending','in_progress','completed') DEFAULT 'pending',
      target_date DATE,
      area VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pei_id) REFERENCES pei(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS pei_goal_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      goal_id INT NOT NULL,
      date DATE NOT NULL,
      result VARCHAR(100),
      notes TEXT,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (goal_id) REFERENCES pei_goals(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS pei_abc (
      id INT AUTO_INCREMENT PRIMARY KEY,
      pei_id INT NOT NULL,
      antecedent TEXT,
      behavior TEXT,
      consequence TEXT,
      date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pei_id) REFERENCES pei(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- CLINICAL TOOLS ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS clinical_tools (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      patient_id INT NOT NULL,
      professional_id INT NOT NULL,
      scope_key VARCHAR(255) NOT NULL,
      tool_type VARCHAR(100) NOT NULL,
      data LONGTEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_scope_tool (scope_key, tool_type),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- CASE STUDIES ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS case_study_boards (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      patient_id INT,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS case_study_columns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      board_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      position INT DEFAULT 0,
      color VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (board_id) REFERENCES case_study_boards(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS case_study_cards (
      id INT AUTO_INCREMENT PRIMARY KEY,
      board_id INT NOT NULL,
      column_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      position INT DEFAULT 0,
      labels TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (board_id) REFERENCES case_study_boards(id) ON DELETE CASCADE,
      FOREIGN KEY (column_id) REFERENCES case_study_columns(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- FORMS ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS forms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      fields LONGTEXT,
      is_public BOOLEAN DEFAULT false,
      hash VARCHAR(100) UNIQUE,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS form_responses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      form_id INT NOT NULL,
      patient_id INT,
      respondent_name VARCHAR(255),
      respondent_email VARCHAR(255),
      data LONGTEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- PRODUCTS ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) DEFAULT 0,
      stock INT DEFAULT 0,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- COMANDAS ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS comandas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      patient_id INT,
      professional_id INT,
      total DECIMAL(10,2) DEFAULT 0,
      discount DECIMAL(10,2) DEFAULT 0,
      status ENUM('open','closed','cancelled') DEFAULT 'open',
      payment_method VARCHAR(100),
      items LONGTEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- FINANCEIRO ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS financial_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      type ENUM('income','expense') NOT NULL,
      category VARCHAR(100),
      description VARCHAR(255),
      amount DECIMAL(10,2) NOT NULL,
      date DATE NOT NULL,
      patient_id INT,
      appointment_id INT,
      comanda_id INT,
      payment_method VARCHAR(100),
      status ENUM('pending','paid','cancelled') DEFAULT 'paid',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- DOC GENERATOR ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS doc_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS doc_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      category_id INT,
      title VARCHAR(255) NOT NULL,
      content LONGTEXT,
      variables TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES doc_categories(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- MESSAGE TEMPLATES ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS message_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      content TEXT,
      channel ENUM('whatsapp','email','sms') DEFAULT 'whatsapp',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- UPLOADS ----
  await conn.query(`
    CREATE TABLE IF NOT EXISTS uploads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      patient_id INT,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255),
      mime_type VARCHAR(100),
      size INT,
      url VARCHAR(500),
      uploaded_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // ---- Adicionar colunas que podem estar faltando em tabelas existentes ----
  const alterStatements = [
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan ENUM('basic','pro','enterprise') DEFAULT 'pro'",
    "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty VARCHAR(255)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS crp VARCHAR(50)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS rg VARCHAR(30)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender VARCHAR(30)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS city VARCHAR(100)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS state VARCHAR(50)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS responsible_name VARCHAR(255)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS responsible_phone VARCHAR(50)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS health_plan VARCHAR(255)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS diagnosis TEXT",
  ];

  for (const stmt of alterStatements) {
    try {
      await conn.query(stmt);
    } catch (e) {
      // Ignorar erros de ALTER (coluna já existe em versões sem IF NOT EXISTS)
    }
  }

  // Garantir que todos os tenants existentes tenham um slug
  const [tenantsWithoutSlug] = await conn.query("SELECT id, name FROM tenants WHERE slug IS NULL OR slug = ''");
  for (const t of tenantsWithoutSlug) {
    const slug = t.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `tenant-${t.id}`;
    await conn.query('UPDATE tenants SET slug = ? WHERE id = ?', [slug, t.id]);
  }

  // ---- SEED: planos padrão ----
  const [existingPlans] = await conn.query('SELECT id FROM plans LIMIT 1');
  let basicPlanId, proPlanId, enterprisePlanId;
  if (existingPlans.length === 0) {
    const basicFeatures = JSON.stringify(['agenda','pacientes','prontuario','formularios']);
    const proFeatures = JSON.stringify(['agenda','pacientes','prontuario','formularios','salas_virtuais','pei','ferramentas_clinicas','estudos_de_caso','financeiro','documentos']);
    const entFeatures = JSON.stringify(['agenda','pacientes','prontuario','formularios','salas_virtuais','pei','ferramentas_clinicas','estudos_de_caso','financeiro','documentos','relatorios','api_acesso','suporte_prioritario']);

    const [r1] = await conn.query('INSERT INTO plans (name, description, price, max_users, max_patients, features) VALUES (?, ?, ?, ?, ?, ?)',
      ['Básico', 'Ideal para profissionais autônomos', 79.90, 2, 50, basicFeatures]);
    basicPlanId = r1.insertId;

    const [r2] = await conn.query('INSERT INTO plans (name, description, price, max_users, max_patients, features) VALUES (?, ?, ?, ?, ?, ?)',
      ['Pro', 'Para clínicas em crescimento', 149.90, 10, 500, proFeatures]);
    proPlanId = r2.insertId;

    const [r3] = await conn.query('INSERT INTO plans (name, description, price, max_users, max_patients, features) VALUES (?, ?, ?, ?, ?, ?)',
      ['Enterprise', 'Sem limites, suporte dedicado', 299.90, 999, 99999, entFeatures]);
    enterprisePlanId = r3.insertId;

    console.log('✅ Planos criados: Básico, Pro, Enterprise');
  } else {
    const [plans] = await conn.query('SELECT id FROM plans ORDER BY id LIMIT 3');
    basicPlanId = plans[0]?.id;
    proPlanId = plans[1]?.id || plans[0]?.id;
    enterprisePlanId = plans[2]?.id || plans[0]?.id;
  }

  // ---- SEED: tenant e usuário admin padrão ----
  const [tenants] = await conn.query('SELECT id FROM tenants WHERE slug = ?', ['default']);
  if (tenants.length === 0) {
    const [tenantResult] = await conn.query(
      'INSERT INTO tenants (name, slug, plan_id) VALUES (?, ?, ?)',
      ['Clínica PsiFlux', 'default', proPlanId]
    );
    const tenantId = tenantResult.insertId;

    const hashedPassword = await bcrypt.hash('admin123', 10);
    await conn.query(
      'INSERT INTO users (tenant_id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [tenantId, 'Administrador', 'admin@psiflux.com', hashedPassword, 'admin']
    );

    // Super admin — tenant_id 0 (não pertence a nenhum tenant real)
    const superHash = await bcrypt.hash('super123', 10);
    await conn.query(
      'INSERT INTO users (tenant_id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [tenantId, 'Super Admin', 'super@psiflux.com', superHash, 'super_admin']
    );

    console.log('✅ Seed criado:');
    console.log('   Admin:      admin@psiflux.com / admin123');
    console.log('   SuperAdmin: super@psiflux.com / super123');
  }

  console.log('✅ Migração concluída com sucesso!');
  await conn.end();
}

migrate().catch(err => {
  console.error('❌ Erro na migração:', err);
  process.exit(1);
});
