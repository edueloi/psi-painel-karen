const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
};

const forms = [
  {
    title: 'Inventário de Ansiedade de Beck (BAI)',
    description: 'Instrumento de autoavaliação para medir a gravidade da ansiedade clínica. Responda pensando em como você se sentiu na última semana.',
    category: 'TCC',
    is_public: 1,
    is_global: 1,
    questions: [
      { text: 'Dormência ou formigamento', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Sentir ondas de calor', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Tremores nas pernas', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Incapaz de relaxar', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Medo de que o pior aconteça', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Tontura ou vertigem', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Palpitação ou aceleração do coração', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Instabilidade', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Aterrorizado(a)', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Nervosismo', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Sensação de sufocamento', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Tremores nas mãos', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Trêmulo(a)', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Medo de perder o controle', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Dificuldade de respirar', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Medo de morrer', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Assustado(a)', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Indigestão ou desconforto abdominal', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Desmaio', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Rosto ruborizado', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] },
      { text: 'Suor (não devido ao calor)', type: 'radio', required: true, options: [{label: 'Não', value: 0}, {label: 'Levemente', value: 1}, {label: 'Moderadamente', value: 2}, {label: 'Severamente', value: 3}] }
    ],
    interpretations: [
      { minScore: 0, maxScore: 10, resultTitle: 'Grau Mínimo', description: 'Nível de ansiedade dentro da normalidade.', color: 'emerald' },
      { minScore: 11, maxScore: 19, resultTitle: 'Ansiedade Leve', description: 'Sintomas de ansiedade presentes, mas em nível leve.', color: 'sky' },
      { minScore: 20, maxScore: 30, resultTitle: 'Ansiedade Moderada', description: 'Nível de ansiedade moderado, requer atenção clínica.', color: 'amber' },
      { minScore: 31, maxScore: 63, resultTitle: 'Ansiedade Severa', description: 'Nível elevado de ansiedade, recomendável acompanhamento imediato.', color: 'rose' }
    ]
  },
  {
    title: 'Escala de Autoavaliação para TDAH (ASRS-18)',
    description: 'Protocolo para rastreamento de sintomas de Transtorno do Déficit de Atenção/Hiperatividade em adultos, baseado nos critérios do DSM.',
    category: 'TCC',
    is_public: 1,
    is_global: 1,
    questions: [
      { text: 'Com que frequência você comete erros por falta de atenção quando tem de trabalhar num projeto chato ou difícil?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Com que frequência você tem dificuldade para manter a atenção quando está fazendo um trabalho chato ou repetitivo?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Com que frequência você tem dificuldade para se concentrar no que as pessoas dizem, mesmo quando elas estão falando diretamente com você?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Com que frequência você deixa um projeto pela metade depois de já ter feito as partes mais difíceis?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Com que frequência você tem dificuldade para fazer um trabalho que exige organização?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Quando você precisa fazer algo que exige muita concentração, com que frequência você evita ou adia o início?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Com que frequência você coloca as coisas fora do lugar ou tem dificuldade de encontrar as coisas em casa ou no trabalho?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Com que frequência você se distrai com atividades ou barulho a sua volta?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Com que frequência você tem dificuldade para lembrar de compromissos ou obrigações?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Com que frequência você fica se mexendo na cadeira ou balançando as mãos ou os pés quando precisa ficar sentado(a) por muito tempo?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Com que frequência você se levanta da cadeira em reuniões ou em outras situações onde deveria ficar sentado(a)?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Com que frequência você se sente inquieto(a) ou agitado(a)?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Com que frequência você tem dificuldade para sossegar e relaxar quando tem tempo livre para você?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Com que frequência você se pega falando demais em situações sociais?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Com que frequência você tem dificuldade para esperar nas situações onde cada um tem a sua vez?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Quando você está conversando, com que frequência você se pega terminando as frases das pessoas antes delas?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Com que frequência você interrompe os outros quando eles estão ocupados?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Com que frequência você se sente ativo(a) demais e necessitando fazer coisas, como se estivesse "com um motor ligado"?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Com que frequência os sintomas acima prejudicam sua vida profissional ou acadêmica?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] },
      { text: 'Com que frequência os sintomas acima prejudicam seus relacionamentos sociais ou familiares?', type: 'radio', required: true, options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 1}, {label: 'Algumas vezes', value: 2}, {label: 'Frequentemente', value: 3}, {label: 'Muito frequentemente', value: 4}] }
    ],
    interpretations: [
      { minScore: 0, maxScore: 24, resultTitle: 'Baixa Probabilidade', description: 'Sintomas dentro da normalidade para a população geral.', color: 'emerald' },
      { minScore: 25, maxScore: 39, resultTitle: 'Probabilidade Moderada', description: 'Presença de alguns sintomas significativos. Recomenda-se acompanhamento clínico.', color: 'amber' },
      { minScore: 40, maxScore: 80, resultTitle: 'Alta Probabilidade', description: 'Forte indicação de sintomas de TDAH. Recomendável investigação diagnóstica profunda.', color: 'rose' }
    ]
  }
];

async function addForms() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    for (const f of forms) {
      // Check if already exists
      const [existing] = await connection.query('SELECT id FROM forms WHERE title = ? AND is_global = 1', [f.title]);
      if (existing.length > 0) {
        console.log(`Pulando: ${f.title} (Já existe)`);
        continue;
      }

      const hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const [result] = await connection.query(
        'INSERT INTO forms (tenant_id, title, description, category, fields, is_public, is_global, hash, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [1, f.title, f.description, f.category, '[]', 1, 1, hash.substring(0, 16), 1]
      );

      const formId = result.insertId;

      // Questions
      for (const q of f.questions) {
        await connection.query(
          'INSERT INTO form_questions (form_id, question_text, question_type, is_required, options_json) VALUES (?, ?, ?, ?, ?)',
          [formId, q.text, q.type, q.required ? 1 : 0, JSON.stringify(q.options)]
        );
      }

      // Interpretations
      for (const i of f.interpretations) {
        await connection.query(
          'INSERT INTO form_interpretations (form_id, min_score, max_score, result_title, description, color) VALUES (?, ?, ?, ?, ?, ?)',
          [formId, i.minScore, i.maxScore, i.resultTitle, i.description, i.color]
        );
      }

      console.log(`Adicionado: ${f.title}`);
    }
  } catch (err) {
    console.error('Erro ao adicionar formulários:', err);
  } finally {
    await connection.end();
  }
}

addForms();
