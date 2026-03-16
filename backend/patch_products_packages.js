const mysql = require('mysql2/promise');
require('dotenv').config();

async function patch() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'psiflux'
  });

  console.log('👷 Remendando banco de dados para Produtos e Pacotes...');

  // Atualizar Produtos
  const productCols = [
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Geral'",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2) DEFAULT 0",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS minStock INT DEFAULT 5",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100)",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS type ENUM('physical','digital') DEFAULT 'physical'",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS imageUrl VARCHAR(500)",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS expirationDate DATE",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100)",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS salesCount INT DEFAULT 0"
  ];

  for (const col of productCols) {
    try {
      await conn.query(col);
    } catch (e) {
      console.log(`   Nota: ${e.message}`);
    }
  }

  // Atualizar Serviços
  const serviceCols = [
    "ALTER TABLE services ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Geral'",
    "ALTER TABLE services ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2) DEFAULT 0",
    "ALTER TABLE services ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#6366f1'",
    "ALTER TABLE services ADD COLUMN IF NOT EXISTS modality ENUM('online','presencial') DEFAULT 'presencial'"
  ];

  for (const col of serviceCols) {
    try {
      await conn.query(col);
    } catch (e) {
      console.log(`   Nota: ${e.message}`);
    }
  }

  // Criar Pacotes
  await conn.query(`
    CREATE TABLE IF NOT EXISTS packages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      discountType ENUM('percentage','fixed') DEFAULT 'percentage',
      discountValue DECIMAL(10,2) DEFAULT 0,
      totalPrice DECIMAL(10,2) DEFAULT 0,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS package_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      package_id INT NOT NULL,
      service_id INT NOT NULL,
      quantity INT DEFAULT 1,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('✅ Banco de dados atualizado!');
  await conn.close();
}

patch().catch(console.error);
