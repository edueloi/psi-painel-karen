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

  const dbName = process.env.DB_NAME || 'psiflux';

  async function addColumn(tableName, colName, colDefinition) {
    try {
      const [cols] = await conn.query(
        `SELECT COLUMN_NAME FROM information_schema.columns 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [dbName, tableName, colName]
      );

      if (cols.length === 0) {
        console.log(`   Adicionando coluna ${colName} em ${tableName}...`);
        await conn.query(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colDefinition}`);
      }
    } catch (e) {
      console.log(`   Erro ao processar coluna ${colName}: ${e.message}`);
    }
  }

  // Atualizar Produtos
  await addColumn('products', 'category', "VARCHAR(100) DEFAULT 'Geral'");
  await addColumn('products', 'cost', "DECIMAL(10,2) DEFAULT 0");
  await addColumn('products', 'minStock', "INT DEFAULT 5");
  await addColumn('products', 'brand', "VARCHAR(100)");
  await addColumn('products', 'type', "ENUM('physical','digital') DEFAULT 'physical'");
  await addColumn('products', 'imageUrl', "VARCHAR(500)");
  await addColumn('products', 'expirationDate', "DATE");
  await addColumn('products', 'barcode', "VARCHAR(100)");
  await addColumn('products', 'salesCount', "INT DEFAULT 0");
  await addColumn('appointments', 'package_id', "INT");

  // Atualizar Serviços
  await addColumn('services', 'category', "VARCHAR(100) DEFAULT 'Geral'");
  await addColumn('services', 'cost', "DECIMAL(10,2) DEFAULT 0");
  await addColumn('services', 'color', "VARCHAR(20) DEFAULT '#6366f1'");
  await addColumn('services', 'modality', "ENUM('online','presencial','geral') DEFAULT 'presencial'");

  // Atualizar Pacotes (caso a tabela já exista com esquema antigo)
  await addColumn('packages', 'discountType', "ENUM('percentage','fixed') DEFAULT 'percentage'");
  await addColumn('packages', 'discountValue', "DECIMAL(10,2) DEFAULT 0");
  await addColumn('packages', 'totalPrice', "DECIMAL(10,2) DEFAULT 0");

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

  // Atualizar Comandas
  await addColumn('comandas', 'service_id', "INT");
  await addColumn('comandas', 'package_id', "INT");
  await addColumn('comandas', 'description', "TEXT");
  await addColumn('comandas', 'sessions_total', "INT DEFAULT 1");
  await addColumn('comandas', 'sessions_used', "INT DEFAULT 0");

  console.log('✅ Banco de dados atualizado!');
  await conn.close();
}

patch().catch(console.error);
