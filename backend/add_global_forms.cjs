const db = require('./db');
const { v4: uuidv4 } = require('uuid');

// Carregar .env manualmente se necessário
require('dotenv').config({ path: __dirname + '/.env' });

async function addGlobalForms() {
  const forms = [
    {
      title: 'Anamnese Psicopedagógica',
      category: 'Psicopedagogia',
      description: 'Coleta de dados iniciais sobre o desenvolvimento de aprendizagem, histórico escolar e queixas principais.',
      fields: JSON.stringify({
        questions: [
          { id: 'q1', type: 'text', text: 'Nome Completo da Criança', required: true },
          { id: 'q2', type: 'text', text: 'Escola e Série Atual', required: true },
          { id: 'q3', type: 'textarea', text: 'Breve histórico do nascimento e desenvolvimento motor', required: false },
          { id: 'q4', type: 'textarea', text: 'Principais dificuldades observadas na escola/em casa', required: true }
        ],
        interpretations: [],
        theme: null
      })
    },
    {
      title: 'Autoavaliação Humanista (Rogers)',
      category: 'Humanista',
      description: 'Exploração do self, congruência e tendências de crescimento pessoal baseada na Abordagem Centrada na Pessoa.',
      fields: JSON.stringify({
        questions: [
          { id: 'h1', type: 'textarea', text: 'Como você se sente em relação a quem você é hoje?', required: true },
          { id: 'h2', type: 'textarea', text: 'O que você sente que está impedindo seu crescimento?', required: false },
          { id: 'h3', type: 'radio', text: 'Você se sente aceito sem julgamentos pelas pessoas próximas?', required: true, options: [{label: 'Sempre', value: 3}, {label: 'Às vezes', value: 1}, {label: 'Raramente', value: 0}] }
        ],
        interpretations: [],
        theme: null
      })
    },
    {
      title: 'Registro de Eventos Críticos',
      category: 'Eventos',
      description: 'Monitoramento de picos de ansiedade ou crises durante o período entre sessões.',
      fields: JSON.stringify({
        questions: [
          { id: 'e1', type: 'text', text: 'Data do Evento', required: true },
          { id: 'e2', type: 'textarea', text: 'O que disparou a sensação?', required: true },
          { id: 'e3', type: 'number', text: 'Intensidade de 0 a 10', required: true }
        ],
        interpretations: [],
        theme: null
      })
    }
  ];

  for (const f of forms) {
    const hash = uuidv4().substring(0, 16);
    try {
      // Verifica se já existe um formulário global com esse título
      const [existing] = await db.query('SELECT id FROM forms WHERE title = ? AND is_global = true', [f.title]);
      if (existing.length > 0) {
        console.log(`⚠️ Modelo "${f.title}" já existe.`);
        continue;
      }

      await db.query(
        'INSERT INTO forms (tenant_id, title, description, category, fields, is_public, is_global, hash, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [1, f.title, f.description, f.category, f.fields, true, true, hash, 1]
      );
      console.log(`✅ Modelo "${f.title}" adicionado.`);
    } catch (e) {
      console.error(`❌ Erro ao inserir ${f.title}:`, e.message);
    }
  }
  console.log('✅ Processo de carga concluído!');
  process.exit(0);
}

addGlobalForms().catch(e => { console.error(e); process.exit(1); });
