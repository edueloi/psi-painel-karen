const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const db = require('../db');

// Configuração da OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Funções Internas (Tools) ---

async function listPatients(tenantId) {
  const [rows] = await db.query('SELECT id, name, phone, email, status FROM patients WHERE tenant_id = ?', [tenantId]);
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
  if (!start_time || !end_time) return { error: 'Início e fim são obrigatórios' };

  const [result] = await db.query(
    `INSERT INTO appointments (tenant_id, patient_id, title, start_time, end_time, notes, status) 
     VALUES (?, ?, ?, ?, ?, ?, 'confirmado')`,
    [tenantId, patient_id || null, title || 'Consulta', start_time, end_time, notes || null]
  );
  return { id: result.insertId, status: 'success', message: 'Agendamento criado com sucesso' };
}

// --- Rota Principal ---

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const tenantId = req.user.tenant_id;
    const userName = req.user.name || 'Psicólogo(a)';

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
            properties: {
              patient_id: { type: 'number', description: 'O ID do paciente' }
            },
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
              end_time: { type: 'string', description: 'Fim (ISO 8601)' },
              notes: { type: 'string', description: 'Observações' }
            },
            required: ['start_time', 'end_time']
          }
        }
      }
    ];

    const systemMessage = {
      role: 'system',
      content: `Você é a Aurora, a Inteligência Artificial avançada do sistema "PsiFlux".
Seu tom é extremamente educado, empático, profissional e acolhedor. Você é uma parceira do psicólogo(a) ${userName}.

Capacidades:
- Você tem acesso aos dados do sistema (pacientes e agenda) através de ferramentas.
- Você pode ajudar com dúvidas clínicas e teóricas sobre psicologia baseado em evidências.
- Você sabe a data e hora atual do sistema.
- Se o usuário perguntar sobre agendamentos de hoje, amanhã ou ontem, use a data atual para calcular e chame list_appointments.
- Sempre confirme os detalhes antes de realizar ações importantes.

Data/Hora Atual: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
Hoje é: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}

Responda sempre em Português-BR. Se não puder fazer algo, explique educadamente.`
    };

    let chatMessages = [systemMessage, ...messages];

    let response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: chatMessages,
      tools,
      tool_choice: 'auto',
    });

    let assistantMessage = response.choices[0].message;

    // Lida com Chamadas de Ferramentas
    if (assistantMessage.tool_calls) {
      chatMessages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let result;

        console.log(`Aurora Tool Call: ${functionName}`, args);

        if (functionName === 'list_patients') {
          result = await listPatients(tenantId);
        } else if (functionName === 'get_patient_details') {
          result = await getPatientDetails(tenantId, args.patient_id);
        } else if (functionName === 'list_appointments') {
          result = await listAppointments(tenantId, args.start_date, args.end_date);
        } else if (functionName === 'create_appointment') {
          result = await createAppointment(tenantId, args);
        }

        chatMessages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: JSON.stringify(result),
        });
      }

      // Segunda chamada para gerar a resposta final
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
