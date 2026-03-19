const db = require('../db');
const { v4: uuidv4 } = require('uuid');

async function seedForms() {
  console.log('🌱 Semeando novos formulários globais...');

  const forms = [
    {
      title: 'Inventário de Habilidades de Alfabetização',
      description: 'Avaliação psicopedagógica para crianças em fase de alfabetização.',
      category: 'Psicopedagogia',
      questions: [
        { id: '1', type: 'radio', text: 'A criança reconhece as letras do alfabeto?', options: [{label: 'Sim', value: 10}, {label: 'Algumas', value: 5}, {label: 'Não', value: 0}], required: true },
        { id: '2', type: 'radio', text: 'Consegue associar sons às letras?', options: [{label: 'Frequentemente', value: 10}, {label: 'Às vezes', value: 5}, {label: 'Raramente', value: 0}], required: true },
        { id: '3', type: 'textarea', text: 'Observações sobre o traçado da letra:', options: [], required: false }
      ]
    },
    {
      title: 'Escala de Autoestima de Rosenberg',
      description: 'Instrumento clássico para avaliar a autoestima global de um indivíduo.',
      category: 'Humanista',
      questions: [
        { id: '1', type: 'radio', text: 'Sinto que sou uma pessoa de valor, pelo menos tanto quanto as outras.', options: [{label: 'Concordo Plenamente', value: 4}, {label: 'Concordo', value: 3}, {label: 'Discordo', value: 2}, {label: 'Discordo Plenamente', value: 1}], required: true },
        { id: '2', type: 'radio', text: 'Sinto que tenho várias boas qualidades.', options: [{label: 'Concordo Plenamente', value: 4}, {label: 'Concordo', value: 3}, {label: 'Discordo', value: 2}, {label: 'Discordo Plenamente', value: 1}], required: true },
        { id: '3', type: 'radio', text: 'No geral, estou satisfeito comigo mesmo.', options: [{label: 'Concordo Plenamente', value: 4}, {label: 'Concordo', value: 3}, {label: 'Discordo', value: 2}, {label: 'Discordo Plenamente', value: 1}], required: true }
      ]
    },
    {
      title: 'ASRS-18 (TDAH em Adultos)',
      description: 'Escala de Autoavaliação para TDAH em Adultos.',
      category: 'TCC',
      questions: [
        { id: '1', type: 'radio', text: 'Com que frequência você tem dificuldade para finalizar os detalhes de um projeto?', options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 0}, {label: 'Às vezes', value: 1}, {label: 'Frequentemente', value: 1}, {label: 'Muito Frequentemente', value: 1}], required: true },
        { id: '2', type: 'radio', text: 'Com que frequência você tem dificuldade para organizar as coisas quando tem uma tarefa desafiadora?', options: [{label: 'Nunca', value: 0}, {label: 'Raramente', value: 0}, {label: 'Às vezes', value: 1}, {label: 'Frequentemente', value: 1}, {label: 'Muito Frequentemente', value: 1}], required: true }
      ]
    },
    {
        title: 'Registro de Sonhos e Livre Associação',
        description: 'Material de apoio para o trabalho psicanalítico.',
        category: 'Psicanálise',
        questions: [
            { id: '1', type: 'textarea', text: 'Descreva o sonho que você teve (ou o fragmento dele):', options: [], required: true },
            { id: '2', type: 'textarea', text: 'Quais sentimentos ou pessoas vieram à sua mente enquanto escrevia?', options: [], required: false }
        ]
    },
    {
        title: 'Ficha de Inscrição: Workshop de Saúde Mental',
        description: 'Coleta de dados para organização de eventos e palestras.',
        category: 'Eventos',
        questions: [
            { id: '1', type: 'text', text: 'Nome Completo:', options: [], required: true },
            { id: '2', type: 'text', text: 'E-mail para contato:', options: [], required: true },
            { id: '3', type: 'radio', text: 'Já participou de algum evento nosso?', options: [{label: 'Sim', value: 1}, {label: 'Não', value: 0}], required: true }
        ]
    },
    {
        title: 'Anamnese Infantil Geral',
        description: 'Coleta de dados iniciais sobre o desenvolvimento da criança.',
        category: 'Anamnese',
        questions: [
          { id: '1', type: 'text', text: 'Motivo da consulta:', options: [], required: true },
          { id: '2', type: 'radio', text: 'A gestação foi planejada?', options: [{label: 'Sim', value: 0}, {label: 'Não', value: 0}], required: false },
          { id: '3', type: 'text', text: 'Com que idade a criança começou a falar?', options: [], required: false },
          { id: '4', type: 'textarea', text: 'Observações sobre o comportamento na escola:', options: [], required: false }
        ]
      },
      {
        title: 'Escala de Estresse Percebido',
        description: 'Mede o grau em que situações na vida são avaliadas como estressantes.',
        category: 'Saúde Mental',
        questions: [
          { id: '1', type: 'radio', text: 'Com que frequência você se sentiu incapaz de controlar as coisas importantes na sua vida?', options: [{label: 'Nunca', value: 0}, {label: 'Quase nunca', value: 1}, {label: 'Às vezes', value: 2}, {label: 'Quase sempre', value: 3}, {label: 'Sempre', value: 4}], required: true },
          { id: '2', type: 'radio', text: 'Com que frequência você se sentiu confiante sobre sua habilidade de lidar com seus problemas pessoais?', options: [{label: 'Nunca', value: 4}, {label: 'Quase nunca', value: 3}, {label: 'Às vezes', value: 2}, {label: 'Quase sempre', value: 1}, {label: 'Sempre', value: 0}], required: true }
        ]
      },
      {
        title: 'Triagem de Memória e Atenção',
        description: 'Triagem inicial para queixas de memória e atenção.',
        category: 'Neuropsicologia',
        questions: [
          { id: '1', type: 'radio', text: 'Esquece compromissos ou datas importantes frequentemente?', options: [{label: 'Sim', value: 1}, {label: 'Não', value: 0}], required: true },
          { id: '2', type: 'radio', text: 'Dificuldade para encontrar palavras durante uma conversa?', options: [{label: 'Sim', value: 1}, {label: 'Não', value: 0}], required: true },
          { id: '3', type: 'textarea', text: 'Descreva outras queixas de atenção/memória:', options: [], required: false }
        ]
      }
  ];

  try {
    const [users] = await db.query('SELECT id, tenant_id FROM users WHERE role = "admin" LIMIT 1');
    if (users.length === 0) {
      console.error('❌ Nenhum usuário admin encontrado.');
      process.exit(1);
    }
    const { id: adminId, tenant_id: tenantId } = users[0];

    for (const f of forms) {
      const [existing] = await db.query('SELECT id FROM forms WHERE title = ? AND is_global = true', [f.title]);
      if (existing.length > 0) {
        console.log(`⏩ Já existe: ${f.title}`);
        continue;
      }

      const hash = uuidv4().substring(0, 8);
      const fields = JSON.stringify({
        questions: f.questions,
        interpretations: [],
        theme: null,
        category: f.category
      });

      await db.query(
        'INSERT INTO forms (tenant_id, title, description, fields, is_public, is_global, hash, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [tenantId, f.title, f.description, fields, true, true, hash, adminId]
      );
      console.log(`✅ Adicionado: ${f.title}`);
    }

    console.log('🚀 Semeador concluído!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
}

seedForms();
