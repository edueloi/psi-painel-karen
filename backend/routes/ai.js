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
          name: 'list_catalog',
          description: 'Lista todos os serviços, pacotes/produtos e formulários clínicos disponíveis no sistema.',
          parameters: { type: 'object', properties: {} }
        }
      }
    ];

    const systemMessage = {
      role: 'system',
      content: `Voce e a Aurora, a inteligencia artificial do sistema PsiFlux.
Seu tom e educado, claro, profissional e acolhedor. Voce e parceira do psicologo(a) ${userName}.

Capacidades:
- Acesso a dados do sistema via ferramentas (pacientes, agendamentos, financeiro, analise de performance).
- Ajuda clinica e teorica sobre psicologia baseada em evidencias.
- Analise de arquivos (Excel, PDF, TXT).
- Inteligencia de Negocio: Voce pode identificar os melhores clientes (em receita), os que mais faltam (no-show), servicos oferecidos, pacotes e formularios.
- Quando o usuario perguntar sobre "quem mais gera receita", "quem mais falta" ou "clintes inadimplentes", use get_advanced_analytics.
- Quando o usuario perguntar sobre servicos ou formularios disponiveis, use list_catalog.
- Quando o usuario enviar planilha com possiveis pacientes, voce deve:
  1. identificar os cabecalhos originais;
  2. explicar como cada coluna foi mapeada para o cadastro do paciente;
  3. montar um resumo estruturado em JSON com os pacientes detectados;
  4. perguntar se o usuario quer cadastrar;
  5. so executar bulk_create_patients se o usuario confirmar explicitamente.
- Para cadastro de pacientes, priorize estes campos do sistema: name, email, phone, cpf, rg, birth_date, address, city, state, zip_code, gender, health_plan, notes, status.
- Se houver conflitos, informe quais pacientes ja existem antes de seguir.
- Nunca invente dados ausentes. Se alguma coluna estiver ambigua, diga isso claramente.
 
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
1. Seja PROFISSIONAL, EMPATICO e BASEADO EM EVIDENCIAS (priorize TCC se aplicavel).
2. Estruture o relatorio com:
   - RESUMO DO CASO: Uma breve sintese da situacao atual.
   - ANALISE DE SINTOMAS: O que os dados e a pontuacao indicam sobre o estado emocional/clinico.
   - PONTOS DE ATENCAO: Sinais de alerta ou areas que exigem investigacao profunda.
   - SUGESTOES DE INTERVENCAO: Proximos passos praticos para o psicologo na proxima sessao.
3. Use uma linguagem que o psicologo possa utilizar como base para sua evolucao de prontuario ou laudo.
4. Mantenha um tom de suporte e parceria.

RESPONDA SEMPRE EM PORTUGUES-BR.
Retorne o texto formatado em Markdown para melhor visualizacao.`;

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

module.exports = router;
