const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const multer = require('multer');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
const db = require('../db');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const upload = multer({ storage: multer.memoryStorage() });

const normalizeStatus = (value) => {
  const s = String(value || '').trim().toLowerCase();
  if (s === 'ativo' || s === 'active') return 'active';
  if (s === 'inativo' || s === 'inactive') return 'inactive';
  if (s === 'aguardando' || s === 'waiting') return 'waiting';
  return 'active';
};

const normalizeHeader = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

const normalizeCpf = (value) => {
  const digits = onlyDigits(value);
  return digits || null;
};

const normalizePhone = (value) => {
  const digits = onlyDigits(value);
  return digits || null;
};

const normalizeZipCode = (value) => {
  const digits = onlyDigits(value);
  return digits || null;
};

const normalizeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number') {
    const parsed = xlsx.SSF.parse_date_code(value);
    if (parsed) {
      const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
      return date.toISOString().slice(0, 10);
    }
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const [, d, m, y] = br;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
};

const headerAliases = {
  name: ['nome', 'paciente', 'nome paciente', 'nome completo', 'cliente'],
  email: ['email', 'e mail', 'correio'],
  phone: ['telefone', 'celular', 'whatsapp', 'fone', 'contato'],
  cpf: ['cpf', 'documento', 'cpf paciente'],
  rg: ['rg', 'identidade'],
  birth_date: ['data nascimento', 'nascimento', 'dt nascimento', 'data de nascimento'],
  address: ['endereco', 'logradouro', 'rua', 'endereco completo'],
  city: ['cidade', 'municipio'],
  state: ['estado', 'uf'],
  zip_code: ['cep', 'codigo postal'],
  gender: ['sexo', 'genero'],
  health_plan: ['convenio', 'plano', 'plano de saude'],
  notes: ['observacoes', 'observacao', 'notas', 'obs'],
  status: ['status', 'situacao']
};

const pickMappedValue = (row, aliases) => {
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeHeader(key);
    if (aliases.some(alias => normalized === alias || normalized.includes(alias))) {
      return value;
    }
  }
  return null;
};

function parseSpreadsheetPatients(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  const patients = rows
    .map((row) => {
      const mapped = {
        name: pickMappedValue(row, headerAliases.name),
        email: pickMappedValue(row, headerAliases.email),
        phone: pickMappedValue(row, headerAliases.phone),
        cpf: pickMappedValue(row, headerAliases.cpf),
        rg: pickMappedValue(row, headerAliases.rg),
        birth_date: pickMappedValue(row, headerAliases.birth_date),
        address: pickMappedValue(row, headerAliases.address),
        city: pickMappedValue(row, headerAliases.city),
        state: pickMappedValue(row, headerAliases.state),
        zip_code: pickMappedValue(row, headerAliases.zip_code),
        gender: pickMappedValue(row, headerAliases.gender),
        health_plan: pickMappedValue(row, headerAliases.health_plan),
        notes: pickMappedValue(row, headerAliases.notes),
        status: pickMappedValue(row, headerAliases.status),
      };

      return {
        name: String(mapped.name || '').trim(),
        email: String(mapped.email || '').trim() || null,
        phone: normalizePhone(mapped.phone),
        cpf: normalizeCpf(mapped.cpf),
        rg: String(mapped.rg || '').trim() || null,
        birth_date: normalizeDate(mapped.birth_date),
        address: String(mapped.address || '').trim() || null,
        city: String(mapped.city || '').trim() || null,
        state: String(mapped.state || '').trim().toUpperCase() || null,
        zip_code: normalizeZipCode(mapped.zip_code),
        gender: String(mapped.gender || '').trim() || null,
        health_plan: String(mapped.health_plan || '').trim() || null,
        notes: String(mapped.notes || '').trim() || null,
        status: String(mapped.status || '').trim() || 'ativo',
      };
    })
    .filter((row) => row.name);

  return {
    sheetName,
    headers: rows.length ? Object.keys(rows[0]) : [],
    totalRows: rows.length,
    patients,
  };
}

async function listPatients(tenantId) {
  const [rows] = await db.query('SELECT id, name, phone, email, status, cpf FROM patients WHERE tenant_id = ?', [tenantId]);
  return rows;
}

async function getPatientDetails(tenantId, patientId) {
  const [rows] = await db.query('SELECT * FROM patients WHERE id = ? AND tenant_id = ?', [patientId, tenantId]);
  return rows[0] || { error: 'Paciente nao encontrado' };
}

async function listAppointments(tenantId, startDate, endDate) {
  let query = `
    SELECT a.*, p.name as patient_name
    FROM appointments a
    LEFT JOIN patients p ON p.id = a.patient_id
    WHERE a.tenant_id = ?
  `;
  const params = [tenantId];
  if (startDate) { query += ' AND a.start_time >= ?'; params.push(startDate); }
  if (endDate) { query += ' AND a.start_time <= ?'; params.push(endDate); }
  query += ' ORDER BY a.start_time';
  const [rows] = await db.query(query, params);
  return rows;
}

async function getFinancialSummary(tenantId, month, year) {
  const m = month || (new Date().getMonth() + 1);
  const y = year || new Date().getFullYear();

  const [income] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions 
     WHERE tenant_id = ? AND type = 'income' AND MONTH(date) = ? AND YEAR(date) = ?`,
    [tenantId, m, y]
  );
  const [expense] = await db.query(
    `SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions 
     WHERE tenant_id = ? AND type = 'expense' AND MONTH(date) = ? AND YEAR(date) = ?`,
    [tenantId, m, y]
  );

  const [topPatient] = await db.query(
    `SELECT p.name, SUM(t.amount) as total 
     FROM financial_transactions t
     JOIN patients p ON p.id = t.patient_id
     WHERE t.tenant_id = ? AND t.type = 'income'
     GROUP BY p.id ORDER BY total DESC LIMIT 1`,
    [tenantId]
  );

  return {
    income: income[0].total,
    expense: expense[0].total,
    balance: income[0].total - expense[0].total,
    top_patient: topPatient[0] || null,
    month: m,
    year: y
  };
}

async function getAdvancedAnalytics(tenantId) {
  // Top 5 clientes que mais geraram receita
  const [topRevenue] = await db.query(`
    SELECT p.name, SUM(t.amount) as total_paid
    FROM financial_transactions t
    JOIN patients p ON p.id = t.patient_id
    WHERE t.tenant_id = ? AND t.type = 'income' AND t.status = 'paid'
    GROUP BY p.id ORDER BY total_paid DESC LIMIT 5
  `, [tenantId]);

  // Pacientes com mais faltas (no_show)
  const [absenteeism] = await db.query(`
    SELECT p.name, 
           COUNT(CASE WHEN a.status = 'no_show' THEN 1 END) as absences,
           COUNT(*) as total_sessions
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.tenant_id = ?
    GROUP BY p.id
    HAVING absences > 0
    ORDER BY absences DESC LIMIT 5
  `, [tenantId]);

  // Resumo de inadimplência (pagamentos pendentes)
  const [pendingPayments] = await db.query(`
    SELECT p.name, SUM(t.amount) as total_pending
    FROM financial_transactions t
    JOIN patients p ON p.id = t.patient_id
    WHERE t.tenant_id = ? AND t.type = 'income' AND t.status = 'pending'
    GROUP BY p.id ORDER BY total_pending DESC
  `, [tenantId]);

  return {
    top_revenue_clients: topRevenue,
    top_absentee_clients: absenteeism,
    pending_payments_by_client: pendingPayments
  };
}

async function listCatalog(tenantId) {
  const [services] = await db.query('SELECT name, price, duration FROM services WHERE tenant_id = ? AND active = true', [tenantId]);
  const [products] = await db.query('SELECT name, price, stock FROM products WHERE tenant_id = ? AND active = true', [tenantId]);
  const [forms] = await db.query('SELECT title, description FROM forms WHERE tenant_id = ?', [tenantId]);
  
  return { services, products, forms };
}

async function listPatientFormResponses(tenantId, patientId) {
  const [rows] = await db.query(
    `SELECT fr.id, f.title as form_title, fr.score, fr.created_at 
     FROM form_responses fr
     JOIN forms f ON f.id = fr.form_id
     WHERE fr.patient_id = ? AND fr.tenant_id = ? 
     ORDER BY fr.created_at DESC`,
    [patientId, tenantId]
  );
  return rows;
}

async function getFormResponse(tenantId, responseId) {
  const [rows] = await db.query(
    `SELECT fr.*, f.title as form_title 
     FROM form_responses fr
     JOIN forms f ON f.id = fr.form_id
     WHERE fr.id = ? AND fr.tenant_id = ?`,
    [responseId, tenantId]
  );
  if (!rows[0]) return { error: 'Resposta não encontrada' };
  
  let answers = {};
  try {
    const raw = rows[0].answers_json || rows[0].data;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    answers = parsed?.answers || parsed || {};
  } catch(e) {}
  
  return { ...rows[0], answers_parsed: answers };
}

async function createAppointment(tenantId, data) {
  const { patient_id, title, start_time, end_time, notes } = data;
  if (!start_time) return { error: 'Inicio e obrigatorio' };

  let finalEndTime = end_time;
  if (!finalEndTime) {
    const start = new Date(start_time);
    finalEndTime = new Date(start.getTime() + 50 * 60000).toISOString();
  }

  const [result] = await db.query(
    `INSERT INTO appointments (tenant_id, patient_id, title, start_time, end_time, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, 'scheduled')`,
    [tenantId, patient_id || null, title || 'Consulta', start_time, finalEndTime, notes || null]
  );
  return { id: result.insertId, status: 'success', message: 'Agendamento criado com sucesso' };
}

async function bulkCreatePatients(tenantId, patientsList) {
  const results = {
    created: [],
    existing: [],
    errors: []
  };

  for (const p of patientsList) {
    try {
      const [existing] = await db.query(
        'SELECT id, name FROM patients WHERE ((cpf IS NOT NULL AND cpf = ?) OR name = ?) AND tenant_id = ?',
        [p.cpf || '---', p.name, tenantId]
      );

      if (existing.length > 0) {
        results.existing.push({ name: p.name, id: existing[0].id });
        continue;
      }

      const [insert] = await db.query(
        `INSERT INTO patients (
          tenant_id, name, email, phone, birth_date, cpf, rg, gender,
          address, city, state, zip_code, notes, status, health_plan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tenantId,
          p.name,
          p.email || null,
          normalizePhone(p.phone),
          normalizeDate(p.birth_date),
          normalizeCpf(p.cpf),
          p.rg || null,
          p.gender || null,
          p.address || null,
          p.city || null,
          p.state || null,
          normalizeZipCode(p.zip_code),
          p.notes || null,
          normalizeStatus(p.status),
          p.health_plan || null,
        ]
      );
      results.created.push({ name: p.name, id: insert.insertId });
    } catch (err) {
      results.errors.push({ name: p.name, error: err.message });
    }
  }

  return results;
}

router.post('/chat', upload.single('file'), async (req, res) => {
  try {
    let { messages } = req.body;
    if (typeof messages === 'string') messages = JSON.parse(messages);

    const tenantId = req.user.tenant_id;
    const userName = req.user.name || 'Psicologo(a)';

    let fileContent = '';
    let structuredSpreadsheetData = null;

    if (req.file) {
      const { originalname, buffer, mimetype } = req.file;
      console.log(`Aurora recebendo arquivo: ${originalname} (${mimetype})`);

      if (mimetype.includes('spreadsheet') || mimetype.includes('excel') || originalname.endsWith('.xlsx') || originalname.endsWith('.xls')) {
        structuredSpreadsheetData = parseSpreadsheetPatients(buffer);
        fileContent = JSON.stringify({
          sheet_name: structuredSpreadsheetData.sheetName,
          headers: structuredSpreadsheetData.headers,
          total_rows: structuredSpreadsheetData.totalRows,
          detected_patients: structuredSpreadsheetData.patients.slice(0, 20),
        }, null, 2);
      } else if (mimetype === 'application/pdf') {
        const pdfData = await pdfParse(buffer);
        fileContent = pdfData.text;
      } else {
        fileContent = buffer.toString('utf-8');
      }

      messages.push({
        role: 'system',
        content: structuredSpreadsheetData
          ? `O usuario enviou uma planilha chamada "${originalname}". Eu ja extraI os cabecalhos e montei um JSON preliminar de pacientes. Antes de cadastrar qualquer pessoa, voce deve mostrar um resumo dos campos identificados, citar os cabecalhos originais, explicar como mapeou os dados para o cadastro de pacientes do sistema e perguntar se o usuario deseja cadastrar. So chame bulk_create_patients se o usuario confirmar explicitamente. Dados extraidos:\n\n${fileContent}`
          : `O usuario enviou um arquivo chamado "${originalname}". Conteudo extraido:\n\n${fileContent.slice(0, 15000)}`
      });
    }

    const tools = [
      {
        type: 'function',
        function: {
          name: 'list_patients',
          description: 'Lista todos os pacientes cadastrados no sistema.',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_patient_details',
          description: 'Obtem detalhes completos de um paciente especifico pelo ID.',
          parameters: {
            type: 'object',
            properties: { patient_id: { type: 'number', description: 'O ID do paciente' } },
            required: ['patient_id']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_appointments',
          description: 'Lista agendamentos em um intervalo de datas.',
          parameters: {
            type: 'object',
            properties: {
              start_date: { type: 'string', description: 'Data de inicio (YYYY-MM-DD)' },
              end_date: { type: 'string', description: 'Data de fim (YYYY-MM-DD)' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_appointment',
          description: 'Cria um novo agendamento na agenda.',
          parameters: {
            type: 'object',
            properties: {
              patient_id: { type: 'number', description: 'ID do paciente (opcional)' },
              title: { type: 'string', description: 'Titulo da consulta' },
              start_time: { type: 'string', description: 'Inicio (ISO 8601)' },
              end_time: { type: 'string', description: 'Fim (ISO 8601, opcional)' },
              notes: { type: 'string', description: 'Observacoes' }
            },
            required: ['start_time']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'bulk_create_patients',
          description: 'Cria varios pacientes de uma vez a partir de dados confirmados pelo usuario.',
          parameters: {
            type: 'object',
            properties: {
              patients: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string' },
                    phone: { type: 'string' },
                    cpf: { type: 'string' },
                    rg: { type: 'string' },
                    birth_date: { type: 'string', description: 'YYYY-MM-DD' },
                    address: { type: 'string' },
                    city: { type: 'string' },
                    state: { type: 'string' },
                    zip_code: { type: 'string' },
                    gender: { type: 'string' },
                    health_plan: { type: 'string' },
                    notes: { type: 'string' },
                    status: { type: 'string', enum: ['ativo', 'inativo', 'active', 'inactive', 'waiting'] }
                  },
                  required: ['name']
                }
              }
            },
            required: ['patients']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_financial_summary',
          description: 'Obtém um resumo financeiro do mês (receitas, despesas, saldo e melhor cliente).',
          parameters: {
            type: 'object',
            properties: {
              month: { type: 'number', description: 'O mês (1-12)' },
              year: { type: 'number', description: 'O ano (ex: 2024)' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_advanced_analytics',
          description: 'Obtém inteligência avançada sobre o negócio: melhores clientes em receita, clientes com mais faltas e pagamentos pendentes.',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_patient_form_responses',
          description: 'Lista todas as respostas de formularios de um paciente especifico.',
          parameters: {
            type: 'object',
            properties: { patient_id: { type: 'number', description: 'ID do paciente' } },
            required: ['patient_id']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_form_response',
          description: 'Obtem o conteudo detalhado de uma resposta de formulario baseada no ID da resposta.',
          parameters: {
            type: 'object',
            properties: { response_id: { type: 'number', description: 'ID da resposta do formulario' } },
            required: ['response_id']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_catalog',
          description: 'Lista todos os servicos, pacotes/produtos e formularios clinicos disponiveis no sistema.',
          parameters: { type: 'object', properties: {} }
        }
      }
    ];

    const systemMessage = {
      role: 'system',
      content: `Voce e a Aurora, a inteligencia artificial do sistema PsiFlux — plataforma completa de gestao para clinicas e consultórios de psicologia.
Seu tom e educado, claro, profissional e acolhedor. Voce e parceira do(a) ${userName}.

═══════════════════════════════════════════════════
CONHECIMENTO COMPLETO DO SISTEMA PSIFLUX
═══════════════════════════════════════════════════

── DASHBOARD ──
Visao geral da clinica: cards com total de pacientes, agendamentos do dia, receita do mes e tarefas pendentes.
Graficos de evolucao de receita, taxa de comparecimento, pacientes novos por mes.
Atalhos rapidos para novo agendamento, novo paciente e nova comanda.

── AGENDA ──
Visualizacao em dia, semana e mes. Cores diferentes por profissional ou status.
Status dos agendamentos: agendado, confirmado, em atendimento, concluido, cancelado, falta (no_show).
Bloqueio de horarios: marcar periodos como indisponivel.
Recorrencia: agendar sessoes recorrentes (semanal, quinzenal, mensal).
Lembretes automaticos via WhatsApp e e-mail (configuravel em Configuracoes > Notificacoes).
Multiagenda: se a clinica tiver varios profissionais, cada um tem sua agenda independente.
Integracao com sala virtual: ao clicar em um agendamento online, o link da videochamada e exibido.

── SALA VIRTUAL (VIDEO CONSULTA) ──
Salas de videochamada integradas ao sistema, sem necessidade de app externo.
O paciente acessa pelo link gerado pelo sistema.
O profissional inicia a sala pelo botao "Entrar na Sala" na agenda ou pelo menu Sala Virtual.
Salas podem ser agendadas ou criadas instantaneamente (sala avulsa).
Funcoes: video, audio, chat de texto, compartilhamento de tela.

── PACIENTES ──
Cadastro completo: nome, CPF, RG, data de nascimento, genero, telefone, WhatsApp, e-mail, endereco.
Campos clinicos: plano de saude, observacoes, status (ativo/inativo).
Importacao em massa via planilha .xlsx ou .csv com mapeamento inteligente de colunas.
Duplicatas detectadas automaticamente por CPF ou nome.
Historico completo: consultas realizadas, formularios respondidos, documentos, prontuarios.
Aniversariantes: filtro para ver pacientes que fazem aniversario no mes.
Exportacao de fichas em PDF.

── PRONTUARIOS (MEDICAL RECORDS) ──
Evolucoes de sessao com editor de texto rico.
Cada evolucao e assinada digitalmente pelo profissional e tem data/hora registrada.
Historico cronologico completo do paciente.
Exportacao do prontuario completo em PDF.
Acesso controlado: somente o profissional responsavel e o admin visualizam.

── FORMULARIOS ──
Criacao de formularios personalizados com varios tipos de campos (texto, multipla escolha, escala, etc).
Templates prontos: PHQ-9 (depressao), GAD-7 (ansiedade), Beck, Escala de Autoestima, entre outros.
Envio para pacientes preencherem de forma autonoma (link publico).
Pontuacao automatica e interpretacao configuravel por faixa de pontuacao.
Analise por IA (Aurora) com relatorio clinico detalhado apos o preenchimento.
Historico de respostas por paciente.

── DISC (AVALIACAO COMPORTAMENTAL) ──
Instrumento de avaliacao comportamental baseado no modelo DISC.
Fatores: D (Dominancia), I (Influencia), S (Estabilidade), C (Conformidade).
Apos o preenchimento, gera perfil detalhado com graficos de radar.
Relatorio clinico automatico pela Aurora com analise de TCC, crencas automaticas e intervencoes sugeridas.
Pode ser associado a um paciente especifico.

── ESTUDO DE CASO ──
Espaco para documentar casos clinicos complexos com estrutura organizada.
Secoes: apresentacao do caso, hipoteses diagnosticas, plano terapeutico, evolucao.
Vinculado ao paciente e ao profissional responsavel.

── DOCUMENTOS ──
Repositorio de arquivos da clinica: contratos, laudos, autorizacoes, atestados.
Upload de PDF, imagens e outros formatos.
Organizacao por paciente ou categoria.
Assinatura digital disponivel.

── NEURODENSENVOLVIMENTO ──
Modulo especializado para avaliacao e acompanhamento de pacientes com questoes de neurodesenvolvimento.
Escalas e checklists especificos (TEA, TDAH, etc).
Relatorios e evolucoes com campos adaptados.

── CAIXA DE FERRAMENTAS ──
Colecao de recursos clinicos: tecnicas terapeuticas, psicoeducacao, materiais para sessao.
Biblioteca de exercicios para prescrever aos pacientes.

── FINANCEIRO ──
Lancamento de receitas e despesas.
Categorias personalizaveis (consulta, taxa, material, etc).
Relatorios por periodo, profissional, paciente ou categoria.
Integracao com comandas: ao fechar uma comanda, o pagamento e lancado automaticamente.
Controle de inadimplencia: listar pagamentos pendentes.
Exportacao para contabilidade (CSV, PDF).
Emissao de NFS-e (nota fiscal de servico eletronico) integrada com prefeituras (configurar em Configuracoes > Fiscal).

── SERVICOS E PACOTES ──
Cadastro de servicos oferecidos pela clinica com nome, preco e duracao.
Pacotes: bundle de sessoes com desconto, controle de sessoes utilizadas/restantes.
Cada servico pode ter duracao padrao que pre-preenche a agenda.

── PRODUTOS ──
Controle de estoque de produtos vendidos pela clinica (livros, materiais, etc).
Lancamento de entradas e saidas de estoque.
Integracao com comandas.

── COMANDAS ──
Sistema de ordem de servico/fatura por atendimento.
Abre uma comanda ao iniciar o atendimento, adiciona servicos/produtos e fecha com o pagamento.
Formas de pagamento: dinheiro, cartao, PIX, convenio.
Status: aberta, fechada, cancelada.
Historico de comandas por paciente.

── PROFISSIONAIS (GESTAO DE EQUIPE) ──
Cadastro de profissionais da clinica com nome, especialidade, CRP/CRM, telefone, e-mail.
Perfis de acesso: super_admin (dono do sistema), admin (gestor da clinica), professional (psicologo), receptionist (secretaria), viewer (somente leitura).
Cada profissional tem sua agenda e seus pacientes.
Upload de foto de perfil (avatar).
Configuracao de comissao (% sobre consultas).

── MENSAGENS (WHATSAPP TEMPLATES) ──
Biblioteca de templates de mensagens para WhatsApp.
Variaveis dinamicas: {{saudacao}}, {{nome_paciente}}, {{primeiro_nome}}, {{data_agendamento}}, {{horario}}, {{servico}}, {{valor_total}}, {{nome_clinica}}, {{nome_profissional}}.
Categorias: Lembrete, Financeiro, Aniversario, Outros (personalizaveis).
Templates globais (disponiveis para todos) e templates da clinica.
Envio direto pelo sistema: abre o WhatsApp Web com a mensagem preenchida.
Visualizacao em cards ou lista com paginacao.

── CONFIGURACOES ──
Dados da Clinica: nome, CNPJ, endereco, telefone, logo.
Fiscal: dados para emissao de NFS-e.
Notificacoes: configurar lembretes automaticos (WhatsApp/e-mail, antecedencia).
Seguranca: alterar senha, autenticacao em dois fatores.
Aparencia: tema (claro/escuro/auto), cor primaria, idioma.
Fuso Horario: definir timezone da clinica.
Integrações: WhatsApp Business, Google Calendar.

── AJUDA / SUPORTE ──
Central de ajuda com FAQs organizados por modulo.
Guias e tutoriais em texto.
Chat com Aurora para tirar duvidas sobre o sistema.
Formulario de contato com o suporte.
Status do sistema em tempo real.

═══════════════════════════════════════════════════
REGRAS DE COMPORTAMENTO
═══════════════════════════════════════════════════

Capacidades com ferramentas:
- Acesso a dados reais via ferramentas (pacientes, agendamentos, financeiro, analise de performance, formularios, catalogo).
- Quando perguntar sobre receita, faltas ou inadimplencia: use get_advanced_analytics.
- Quando perguntar sobre servicos/formularios: use list_catalog.
- Para planilhas de pacientes: mostrar resumo → pedir confirmacao → so entao bulk_create_patients.
- Para relatorios de formularios: list_patient_form_responses → get_form_response → gerar analise clinica.
- Nunca invente dados. Se ambiguo, diga claramente.

Duvidas sobre o sistema:
- Use o conhecimento detalhado acima para responder perguntas sobre como usar qualquer funcionalidade.
- Seja direto e didatico: diga exatamente onde clicar, qual menu acessar, qual botao usar.
- Se a duvida for tecnica ou de suporte real, oriente o usuario a usar o formulario de contato na aba Ajuda.

Data/Hora Atual: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
Hoje e: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}

Responda sempre em Portugues-BR.`
    };

    let chatMessages = [systemMessage, ...messages];

    let response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: chatMessages,
      tools,
      tool_choice: 'auto',
    });

    let assistantMessage = response.choices[0].message;
    const actionsTaken = [];

    if (assistantMessage.tool_calls) {
      chatMessages.push(assistantMessage);
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let result;

        console.log(`Aurora Tool Call: ${functionName}`, args);
        if (functionName === 'list_patients') result = await listPatients(tenantId);
        else if (functionName === 'get_patient_details') result = await getPatientDetails(tenantId, args.patient_id);
        else if (functionName === 'list_appointments') result = await listAppointments(tenantId, args.start_date, args.end_date);
        else if (functionName === 'get_financial_summary') result = await getFinancialSummary(tenantId, args.month, args.year);
        else if (functionName === 'get_advanced_analytics') result = await getAdvancedAnalytics(tenantId);
        else if (functionName === 'list_catalog') result = await listCatalog(tenantId);
        else if (functionName === 'list_patient_form_responses') result = await listPatientFormResponses(tenantId, args.patient_id);
        else if (functionName === 'get_form_response') result = await getFormResponse(tenantId, args.response_id);
        else if (functionName === 'create_appointment') { result = await createAppointment(tenantId, args); actionsTaken.push('appointment_created'); }
        else if (functionName === 'bulk_create_patients') { result = await bulkCreatePatients(tenantId, args.patients || []); actionsTaken.push('patients_created'); }

        chatMessages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: JSON.stringify(result),
        });
      }

      response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: chatMessages,
      });
      assistantMessage = response.choices[0].message;
    }
    res.json({ text: assistantMessage.content, actions_taken: actionsTaken });
  } catch (err) {
    console.error('Erro na Aurora:', err);
    res.status(500).json({ error: 'Erro ao processar conversa com a Aurora' });
  }
});

router.post('/analyze-form', async (req, res) => {
  try {
    const { formTitle, respondentName, answers, score, interpretations, patientData } = req.body;
    
    const prompt = `Voce e a Aurora, a assistente de inteligencia artificial clinica da Psiflux.
Seu objetivo e realizar uma ANALISE CLINICA detalhada de uma resposta de formulario.

DADOS DO FORMULARIO:
- Titulo: ${formTitle}
- Respondente: ${respondentName}
- Pontuacao Obtida: ${score}
- Regras de Interpretacao: ${JSON.stringify(interpretations)}

DADOS DO PACIENTE (Historico):
${patientData ? JSON.stringify(patientData) : 'Nao fornecido'}

RESPOSTAS DETALHADAS:
${JSON.stringify(answers)}

INSTRUCOES PARA O RELATORIO:
1. Seja PROFISSIONAL, EMPATICO e BASEADO EM EVIDENCIAS.
2. Estruture o relatorio de forma limpa.
3. NAO use blocos de codigo markdown (como \`\`\`markdown).
4. Use Negritos (**texto**) para titulos de secoes.
5. Estrutura obrigatoria:
   - **SUMARIO DO CASO**
   - **ANALISE DE SINTOMAS**
   - **PONTOS DE ATENCAO**
   - **DIRETRIZES TERAPEUTICAS**
6. Retorne o texto puro, limpo e direto.

RESPONDA SEMPRE EM PORTUGUES-BR.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Voce e uma assistente clinica para psicologos altamente capacitada.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    });

    res.json({ analysis: response.choices[0].message.content });
  } catch (err) {
    console.error('Erro na analise da Aurora:', err);
    res.status(500).json({ error: 'Erro ao gerar analise clinica' });
  }
});

router.post('/analyze-disc', async (req, res) => {
  try {
    const { respondentName, patientData, scores, dominantFactor, secondFactor, dominantLabel, secondLabel, combinedKey, combinedProfile, factorDetails } = req.body;

    const prompt = `Voce e a Aurora, assistente clinica especializada em psicologia comportamental da Psiflux.
Gere um RELATORIO CLINICO DISC detalhado para uso do psicologo em consulta. Seja profissional, clinico e preciso.

DADOS DO AVALIADO:
- Nome: ${respondentName}
${patientData ? `- Dados adicionais: ${JSON.stringify(patientData)}` : ''}

SCORES DISC (escala 1.0 a 5.0):
- D (Dominancia):   ${scores.D.toFixed(2)}
- I (Influencia):   ${scores.I.toFixed(2)}
- S (Estabilidade): ${scores.S.toFixed(2)}
- C (Conformidade): ${scores.C.toFixed(2)}

PERFIL IDENTIFICADO:
- Fator dominante: ${dominantLabel} (${dominantFactor}: ${scores[dominantFactor].toFixed(2)})
- Segundo fator:   ${secondLabel} (${secondFactor}: ${scores[secondFactor].toFixed(2)})
- Perfil combinado ${combinedKey}: ${combinedProfile || 'Nao identificado'}

DETALHES DOS FATORES DOMINANTES (do sistema):
- Tendencias TCC do fator ${dominantFactor}: ${(factorDetails[dominantFactor]?.tcc || []).join(', ')}
- Crencas comuns do fator ${dominantFactor}: ${(factorDetails[dominantFactor]?.beliefs || []).join(' | ')}
- Pontos de atencao: ${(factorDetails[dominantFactor]?.attention || []).join(', ')}
- Forcas: ${(factorDetails[dominantFactor]?.strengths || []).join(', ')}

INSTRUCOES DE ESTRUTURA DO RELATORIO:
Use obrigatoriamente estas secoes com negrito (**NOME DA SECAO**):

**PERFIL COMPORTAMENTAL**
(Descreva em 3-4 frases o perfil geral da pessoa com base nos scores D/I/S/C. Relacione o perfil combinado ao contexto clinico.)

**ANALISE DO FATOR DOMINANTE**
(Analise profunda do fator mais alto: como esse padrao comportamental se manifesta, como a pessoa se sente, reage e age em situacoes cotidianas e de pressao.)

**INTERACAO DOS FATORES**
(Como os dois fatores dominantes interagem? Que tensoes ou sinergias criam no comportamento?)

**CRENCAS AUTOMATICAS ASSOCIADAS**
(Identifique as crencas cognitivas automaticas provaveis com base no perfil DISC — foque em TCC. Liste de 3 a 5.)

**PONTOS DE DESENVOLVIMENTO**
(Areas que merecem atencao terapeutica: vulnerabilidades, padroes limitantes, comportamentos a serem trabalhados em terapia.)

**INTERVENÇÕES TERAPEUTICAS SUGERIDAS**
(Tecnicas TCC, estrategias e abordagens especificas para trabalhar com esse perfil DISC em sessao.)

**SINTESE CLINICA**
(Paragrafo de conclusao clinica para o psicologo: visao geral do caso, potencial terapeutico, alertas.)

REGRAS:
- Responda SEMPRE em portugues-BR.
- Seja clinico, direto e util para o psicologo em consulta.
- NAO use blocos de codigo, NAO use markdown (triple-backtick ou ##).
- Use apenas **texto em negrito** para titulos de secoes.
- Escreva parágrafos completos, nao apenas listas.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Voce e uma psicóloga clínica especialista em avaliação comportamental DISC e Terapia Cognitivo-Comportamental. Seus relatorios sao profissionais, densos e clinicamente ricos.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.65,
      max_tokens: 1800,
    });

    res.json({ analysis: response.choices[0].message.content });
  } catch (err) {
    console.error('Erro na análise DISC Aurora:', err);
    res.status(500).json({ error: 'Erro ao gerar análise DISC' });
  }
});

// ── Aura Contábil: busca dados financeiros consolidados do tenant ─────────────
async function getFullFinancialContext(tenantId) {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear];

  // Resumo por mês/ano
  const [byMonth] = await db.query(`
    SELECT YEAR(date) as year, MONTH(date) as month,
      COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as expense,
      COUNT(*) as count
    FROM financial_transactions
    WHERE tenant_id = ? AND YEAR(date) IN (?, ?)
    GROUP BY YEAR(date), MONTH(date)
    ORDER BY year, month
  `, [tenantId, ...years]);

  // Resumo anual
  const [byYear] = await db.query(`
    SELECT YEAR(date) as year,
      COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as expense
    FROM financial_transactions
    WHERE tenant_id = ? AND YEAR(date) IN (?, ?)
    GROUP BY YEAR(date)
    ORDER BY year
  `, [tenantId, ...years]);

  // Pendentes
  const [[pending]] = await db.query(`
    SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count
    FROM financial_transactions
    WHERE tenant_id = ? AND type='income' AND status='pending'
  `, [tenantId]);

  // Categorias mais comuns
  const [topCategories] = await db.query(`
    SELECT category, COALESCE(SUM(amount),0) as total, COUNT(*) as count
    FROM financial_transactions
    WHERE tenant_id = ? AND type='income' AND YEAR(date) = ?
    GROUP BY category ORDER BY total DESC LIMIT 10
  `, [tenantId, currentYear]);

  // Maiores pagadores
  const [topPayers] = await db.query(`
    SELECT payer_name, payer_cpf, COALESCE(SUM(amount),0) as total, COUNT(*) as sessions
    FROM financial_transactions
    WHERE tenant_id = ? AND type='income' AND YEAR(date) = ?
      AND payer_name IS NOT NULL AND payer_name != ''
    GROUP BY payer_name, payer_cpf ORDER BY total DESC LIMIT 20
  `, [tenantId, currentYear]);

  const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  const monthsText = byMonth.map(m =>
    `  ${monthNames[m.month-1]}/${m.year}: Receitas R$${Number(m.income).toFixed(2)} | Despesas R$${Number(m.expense).toFixed(2)} | Saldo R$${(Number(m.income)-Number(m.expense)).toFixed(2)}`
  ).join('\n');

  const yearsText = byYear.map(y =>
    `  ${y.year}: Receitas R$${Number(y.income).toFixed(2)} | Despesas R$${Number(y.expense).toFixed(2)} | Lucro R$${(Number(y.income)-Number(y.expense)).toFixed(2)}`
  ).join('\n');

  const payersText = topPayers.map(p =>
    `  ${p.payer_name}${p.payer_cpf ? ' (CPF: '+p.payer_cpf+')' : ''}: R$${Number(p.total).toFixed(2)} em ${p.sessions} sessão(ões)`
  ).join('\n');

  const categoriesText = topCategories.map(c =>
    `  ${c.category}: R$${Number(c.total).toFixed(2)} (${c.count} lançamentos)`
  ).join('\n');

  return { monthsText, yearsText, payersText, categoriesText, pending, currentYear };
}

// POST /ai/aura-contabil — Chat especializado em contabilidade/fiscal
router.post('/aura-contabil', async (req, res) => {
  try {
    let { messages } = req.body;
    if (typeof messages === 'string') messages = JSON.parse(messages);

    const tenantId = req.user.tenant_id;
    const userName = req.user.name || 'Profissional';

    const { monthsText, yearsText, payersText, categoriesText, pending, currentYear } = await getFullFinancialContext(tenantId);

    const systemPrompt = `Voce e a Aura, assistente especializada em contabilidade e gestao fiscal para psicologos autonomos e clinicas de psicologia no Brasil.
Seu tom e profissional, preciso e educado. Voce e parceira de ${userName}.

═══════════════════════════════════════════════════
DADOS FINANCEIROS REAIS DO USUARIO (${currentYear} e ano anterior)
═══════════════════════════════════════════════════

RESUMO POR MES:
${monthsText || '  Nenhum lancamento encontrado.'}

RESUMO ANUAL:
${yearsText || '  Nenhum dado anual.'}

RECEBIMENTOS PENDENTES:
  Total pendente: R$${Number(pending.total).toFixed(2)} (${pending.count} lancamentos)

PRINCIPAIS PAGADORES (${currentYear}):
${payersText || '  Nenhum pagador identificado.'}

PRINCIPAIS CATEGORIAS DE RECEITA (${currentYear}):
${categoriesText || '  Nenhuma categoria encontrada.'}

═══════════════════════════════════════════════════
CONHECIMENTO CONTABIL E FISCAL PARA PSICOLOGA(O) AUTONOMA(O)
═══════════════════════════════════════════════════

── CARNE LEAO (DARF Mensal) ──
Psicologos autonomos que recebem de pessoas fisicas devem recolher DARF via Carne-Leao mensalmente.
Tabela progressiva de IR 2024/2025 (mensal):
  Ate R$ 2.259,20: isento
  R$ 2.259,21 a R$ 2.826,65: 7,5% (deducao R$ 169,44)
  R$ 2.826,66 a R$ 3.751,05: 15% (deducao R$ 381,44)
  R$ 3.751,06 a R$ 4.664,68: 22,5% (deducao R$ 662,77)
  Acima de R$ 4.664,68: 27,5% (deducao R$ 896,00)
Deducoes permitidas no Carne-Leao: despesas de manutencao do consultorio (aluguel, materiais, cursos), contribuicao ao INSS, dependentes (R$ 189,59/dependente/mes).
Prazo de recolhimento: ultimo dia util do mes seguinte ao mes de competencia.
Como calcular: rendimentos tributaveis do mes - deducoes = base de calculo → aplicar aliquota → subtrair parcela a deduzir.

── DECLARACAO DE AJUSTE ANUAL (IRPF) ──
Obrigatorio para quem recebeu rendimentos tributaveis acima do limite anual ou usou Carne-Leao no ano.
Livro Caixa e necessario para comprovar despesas dedutivas.
Deve informar todos os recebimentos de PF e PJ, separados por mes.

── ISS (IMPOSTO SOBRE SERVICOS) ──
Incide sobre servicos de psicologia (codigo 8.01 – servicos de saude).
Aliquota: varia por municipio, geralmente 2% a 5%.
Competencia do municipio onde esta o estabelecimento.
Nota Fiscal de Servico (NFS-e) obrigatoria para pessoas juridicas e recomendada para PF.

── INSS AUTONOMO ──
Psicologo autonomo deve contribuir ao INSS como contribuinte individual.
Aliquota sobre o salario-de-contribuicao: 20% (autonomo sem vinculo empregaticio) ou 11%/15%/20% por opcao.
Competencia mensal; DARF com codigo 1007.
Teto INSS 2025: R$ 7.786,02/mes.

── MEI E CLINICA ──
Psicologia NAO pode ser exercida como MEI (atividade vedada pelo CBO/Receita Federal).
Opcoes: autonomo (CPF), empresa individual (EIRELI/SLU), sociedade simples, S/S.
Simples Nacional pode ser opcao se constituir PJ; verificar anexo III (servicos).

── LIVRO CAIXA ──
Registro cronologico de receitas e despesas do consultorio.
Obrigatorio para autonomos que desejam deduzir despesas no IRPF.
Nao precisa ser autenticado; basta ter documentos comprobatorios.
Cada lancamento deve ter: data, descricao, valor, CPF do pagador (para NF/Carne-Leao).

── DESPESAS DEDUTIVAS PERMITIDAS ──
Despesas necessarias para a atividade: aluguel do consultorio, energia/agua/telefone proporcionais, material de escritorio, softwares profissionais (ex: PsiFlux), cursos e especializacoes, supervisao clinica, livros tecnicos, contribuicao ao CRP.
Despesas NAO dedutivas: roupas, alimentacao, transporte pessoal (exceto visitas a pacientes), reformas que valorizem o imovel.

── RETENCAO NA FONTE (PJ CONTRATANTE) ──
Quando psicologo presta servico a pessoa juridica, a PJ deve reter:
  IR na fonte: aliquota de 1,5% sobre servicos profissionais.
  INSS: 11% (limitado ao teto), retido e recolhido pela PJ.
  ISS: depende do municipio.

── DICAS PARA PLANEJAMENTO TRIBUTARIO ──
Separar receitas de PF (tributadas via Carne-Leao) e PJ (retencao na fonte).
Guardar todos os recibos e documentos por 5 anos.
Registrar CPF de cada paciente para comprovacao.
Considerar abertura de PJ se faturamento mensal superar R$ 10.000 (analise caso a caso).
Sempre buscar orientacao de contador para decisoes especificas.

═══════════════════════════════════════════════════
INSTRUCOES DE COMPORTAMENTO
═══════════════════════════════════════════════════

- Responda SEMPRE em portugues-BR.
- Use os dados financeiros reais do usuario (acima) para calcular impostos e dar orientacoes especificas.
- Quando calcular Carne-Leao, use os valores mensais reais dos dados acima.
- Seja preciso com numeros: calcule corretamente.
- Deixe claro que voce fornece orientacao informativa e que o usuario deve consultar um contador para decisoes especificas.
- Formate respostas com negritos (**texto**) para titulos e use listas quando adequado.
- NAO use blocos de codigo markdown (triple-backtick).
- Se o usuario perguntar sobre um mes especifico, use os dados do resumo por mes acima.

Data atual: ${new Date().toLocaleDateString('pt-BR')}`;

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.text || m.content }))
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: chatMessages,
      temperature: 0.4,
    });

    res.json({ text: response.choices[0].message.content });
  } catch (err) {
    console.error('Erro na Aura Contábil:', err);
    res.status(500).json({ error: 'Erro ao processar conversa contábil' });
  }
});

router.post('/save-analysis', async (req, res) => {
  try {
    const { patientId, formTitle, analysis } = req.body;
    if (!patientId || !analysis) return res.status(400).json({ error: 'Dados incompletos' });

    const finalContent = `## ANALISE DE FORMULARIO: ${formTitle}\n\n${analysis}`;

    const [result] = await db.query(
      `INSERT INTO medical_records (tenant_id, patient_id, professional_id, content, type) 
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.tenant_id, patientId, req.user.id, finalContent, 'form_analysis']
    );

    res.json({ success: true, recordId: result.insertId });
  } catch (err) {
    console.error('Erro ao salvar analise:', err);
    res.status(500).json({ error: 'Erro ao salvar analise no prontuario' });
  }
});

module.exports = router;
