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
    console.log('🚀 Iniciando seeding do DASS-21 como Sistema...');

    // 1. Garantir coluna is_system
    try {
      await conn.query('ALTER TABLE forms ADD COLUMN is_system BOOLEAN DEFAULT false');
      console.log('✅ Coluna is_system adicionada à tabela forms');
    } catch (e) {
      console.log('ℹ️ Coluna is_system já existe');
    }

    // 2. Tentar inserir o DASS-21
    const fields = JSON.stringify([
      { id: '1', type: 'radio', label: 'Achei difícil me acalmar', options: ['0', '1', '2', '3'] },
      { id: '2', type: 'radio', label: 'Senti minha boca seca', options: ['0', '1', '2', '3'] },
      { id: '3', type: 'radio', label: 'Não consegui vivenciar nenhum sentimento positivo', options: ['0', '1', '2', '3'] },
      { id: '4', type: 'radio', label: 'Dificuldade de respirar', options: ['0', '1', '2', '3'] }
    ]);

    const [existing] = await conn.query('SELECT id FROM forms WHERE hash = ?', ['system-dass-21']);
    
    // Pegar o primeiro usuário e tenant válidos para o seed global
    const [[{ tid, pid }]] = await conn.query('SELECT tenant_id as tid, id as pid FROM users LIMIT 1');

    if (existing.length === 0) {
      await conn.query(
        'INSERT INTO forms (tenant_id, title, description, category, fields, is_public, is_global, is_system, hash, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [tid, 'DASS-21', 'Escala de Depressão, Ansiedade e Estresse (Vignola & Tucci)', 'Assessment', fields, true, true, true, 'system-dass-21', pid]
      );
      console.log(`✅ Formulário de Sistema DASS-21 criado no Banco com vínculo ao tenant ${tid}`);
    } else {
      await conn.query(
        'UPDATE forms SET is_system = true, is_global = true WHERE hash = ?',
        ['system-dass-21']
      );
      console.log('✅ Formulário DASS-21 atualizado como Sistema');
    }

  } catch (err) {
    console.error('❌ Erro no seed:', err);
  } finally {
    await conn.end();
    process.exit();
  }
}

seed();
