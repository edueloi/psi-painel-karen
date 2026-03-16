const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const multer = require('multer');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
const db = require('../db');

// Configuração da OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configuração do Multer (em memória para rapidez)
const upload = multer({ storage: multer.memoryStorage() });

// Normaliza status pt-BR para valores aceitos pelo banco
const normalizeStatus = (s) => {
  if (s === 'ativo') return 'active';
  if (s === 'inativo') return 'inactive';
  if (['active', 'inactive', 'waiting'].includes(s)) return s;
  return 'active';
};

// --- Funções Internas (Tools) ---

async function listPatients(tenantId) {
  const [rows] = await db.query('SELECT id, name, phone, email, status, cpf FROM patients WHERE tenant_id = ?', [tenantId]);
  return rows;
}

async function getPatientDetails(tenantId, patientId) {
  const [rows] = await db.query('SELECT * FROM patients WHERE id = ? AND tenant_id = ?', [patientId, tenantId]);
  return rows[0] || { error: 'Paciente não encontrado' };
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

async function createAppointment(tenantId, data) {
  const { patient_id, title, start_time, end_time, notes } = data;
  if (!start_time) return { error: 'Início é obrigatório' };
  
  let finalEndTime = end_time;
  if (!finalEndTime) {
    // Padrão 50 minutos se não informado
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
      // Verifica se já existe por nome ou CPF
      const [existing] = await db.query(
        'SELECT id, name FROM patients WHERE (name = ? OR (cpf IS NOT NULL AND cpf = ?)) AND tenant_id = ?',
        [p.name, p.cpf || '---', tenantId]
      );

      if (existing.length > 0) {
        results.existing.push({ name: p.name, id: existing[0].id });
        continue;
      }

      const [insert] = await db.query(
        `INSERT INTO patients (tenant_id, name, email, phone, cpf, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [tenantId, p.name, p.email || null, p.phone || null, p.cpf || null, normalizeStatus(p.status)]
      );
      results.created.push({ name: p.name, id: insert.insertId });
    } catch (err) {
      results.errors.push({ name: p.name, error: err.message });
    }
  }

  return results;
}

// --- Rota Principal ---

router.post('/chat', upload.single('file'), async (req, res) => {
  try {
    let { messages } = req.body;
    if (typeof messages === 'string') messages = JSON.parse(messages);

    const tenantId = req.user.tenant_id;
    const userName = req.user.name || 'Psicólogo(a)';

    let fileContent = '';
    if (req.file) {
      const { originalname, buffer, mimetype } = req.file;
      console.log(`Aurora recebendo arquivo: ${originalname} (${mimetype})`);

      if (mimetype.includes('spreadsheet') || mimetype.includes('excel') || originalname.endsWith('.xlsx') || originalname.endsWith('.xls')) {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        fileContent = xlsx.utils.sheet_to_txt(sheet);
      } else if (mimetype === 'application/pdf') {
        const pdfData = await pdfParse(buffer);
        fileContent = pdfData.text;
      } else {
        fileContent = buffer.toString('utf-8');
      }

      // Adiciona o conteúdo do arquivo como contexto no início das mensagens ou como uma mensagem do sistema "oculta"
      messages.push({
        role: 'system',
        content: `O usuário enviou um arquivo chamado "${originalname}". Conteúdo extraído do arquivo:\n\n${fileContent.slice(0, 15000)}` // Limite para não estourar contexto
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
          description: 'Obtém detalhes completos de um paciente específico pelo ID.',
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
              start_date: { type: 'string', description: 'Data de início (YYYY-MM-DD)' },
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
              title: { type: 'string', description: 'Título da consulta' },
              start_time: { type: 'string', description: 'Início (ISO 8601)' },
              end_time: { type: 'string', description: 'Fim (ISO 8601, opcional, será calculado se omitido)' },
              notes: { type: 'string', description: 'Observações' }
            },
            required: ['start_time']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'bulk_create_patients',
          description: 'Cria vários pacientes de uma vez (útil para importação de planilhas).',
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
                    status: { type: 'string', enum: ['ativo', 'inativo'] }
                  },
                  required: ['name']
                }
              }
            },
            required: ['patients']
          }
        }
      }
    ];

    const systemMessage = {
      role: 'system',
      content: `Você é a Aurora, a Inteligência Artificial avançada do sistema "PsiFlux".
Seu tom é extremamente educado, empático, profissional e acolhedor. Você é uma parceira do psicólogo(a) ${userName}.

Capacidades:
- Acesso a dados do sistema (pacientes e agenda) via ferramentas.
- Ajuda clínica e teórica sobre psicologia baseada em evidências.
- Consciência de data e hora atual.
- Análise de arquivos (Excel, PDF, TXT): Quando o usuário enviar um arquivo, você verá o texto extraído. Analise-o e pergunte o que deseja fazer.
- Se houver dados de pacientes no arquivo, ofereça para cadastrá-los usando bulk_create_patients.
- Se houver conflitos (pacientes que já existem), informe ao usuário quais são e peça orientação (se deve pular ou se há algo a atualizar manualmente).

Data/Hora Atual: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
Hoje é: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}

Responda sempre em Português-BR.`
    };

    let chatMessages = [systemMessage, ...messages];

    let response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: chatMessages,
      tools,
      tool_choice: 'auto',
    });

    let assistantMessage = response.choices[0].message;

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
        else if (functionName === 'create_appointment') result = await createAppointment(tenantId, args);
        else if (functionName === 'bulk_create_patients') result = await bulkCreatePatients(tenantId, args.patients);

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

    res.json({ text: assistantMessage.content });
  } catch (err) {
    console.error('Erro na Aurora:', err);
    res.status(500).json({ error: 'Erro ao processar conversa com a Aurora' });
  }
});

module.exports = router;
