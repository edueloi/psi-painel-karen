// Migração de dados: separa 'nota_fiscal' de 'financeiro' nos planos existentes.
// Antes, a feature 'financeiro' controlava Livro Caixa + Financeiro + Nota Fiscal juntos.
// Agora Nota Fiscal tem sua própria feature key. Para não remover acesso de quem já
// pagava por isso, todo plano que já tinha 'financeiro' ganha 'nota_fiscal' também.
require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'psimanager',
  });

  const [plans] = await conn.query('SELECT id, name, features FROM plans');
  let updated = 0;
  for (const plan of plans) {
    let features = [];
    try {
      features = JSON.parse(plan.features || '[]');
    } catch {
      continue;
    }
    if (features.includes('financeiro') && !features.includes('nota_fiscal')) {
      features.push('nota_fiscal');
      await conn.query('UPDATE plans SET features = ? WHERE id = ?', [JSON.stringify(features), plan.id]);
      console.log(`Plano "${plan.name}" (id ${plan.id}): adicionado 'nota_fiscal'.`);
      updated++;
    }
  }

  console.log(`Concluído. ${updated} plano(s) atualizado(s) de ${plans.length} total.`);
  await conn.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
