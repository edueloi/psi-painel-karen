'use strict';

/**
 * botConversation.js
 * Sistema de bot conversacional para WhatsApp (master bot / super_admin)
 * Com interpretação de intenções via IA (OpenAI GPT-4o-mini)
 *
 * Integração: no whatsappService.js, dentro do onMessage do master bot:
 *   const { handleMessage } = require('./botConversation');
 *   handleMessage(tenantId, message).catch(e => console.error('[Bot]', e.message));
 */

const db = require('../db');

// ---------------------------------------------------------------------------
// IA — Interpretação de Intenção (Aurora)
// ---------------------------------------------------------------------------

let _openai = null;
function getOpenAI() {
  if (!_openai && process.env.OPENAI_API_KEY) {
    try {
      const { OpenAI } = require('openai');
      _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } catch(e) {}
  }
  return _openai;
}

/**
 * Usa IA para interpretar intenção livre do usuário e retornar a opção numérica correspondente.
 * @param {string} userText  - Texto digitado pelo usuário
 * @param {string} menuContext - Contexto do menu atual ('principal' | 'profissional')
 * @returns {Promise<{option: string|null, clarification: string|null}>}
 *   option: '1'..'7' se entendeu, null se não entendeu
 *   clarification: mensagem amigável para enviar se não entendeu ou para acompanhar a resposta
 */
async function interpretIntent(userText, menuContext) {
  const openai = getOpenAI();
  if (!openai) return { option: null, clarification: null };

  const menuMap = menuContext === 'profissional'
    ? `1=Ver agenda de hoje, 2=Ver agenda do mês, 3=Próximos agendamentos, 4=Reagendar paciente, 5=Alterar status de agendamento, 6=Agendar paciente, 7=Ver horários disponíveis, 0=Sair`
    : `0=Encerrar atendimento/sair, 1=Sou profissional (acessar sistema), 2=Sou paciente`;

  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 60,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `Você é um assistente que interpreta mensagens de WhatsApp de usuários de um sistema de psicologia.
O usuário está em um menu com as opções: ${menuMap}.
Sua tarefa: analisar o texto e retornar APENAS um JSON no formato {"option":"X"} onde X é o número da opção correspondente, ou {"option":null,"clarification":"mensagem curta e simpática perguntando o que desejam"}.
Não explique. Só retorne o JSON. Se o texto for ambíguo ou não relacionado ao menu, retorne null com uma clarification amigável em português.`
        },
        { role: 'user', content: userText }
      ]
    });

    const content = resp.choices[0]?.message?.content?.trim() || '{}';
    // Extrai JSON da resposta (às vezes vem com markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { option: null, clarification: null };
    const parsed = JSON.parse(jsonMatch[0]);
    return { option: parsed.option || null, clarification: parsed.clarification || null };
  } catch(e) {
    console.error('[Bot/AI] Erro ao interpretar intenção:', e.message);
    return { option: null, clarification: null };
  }
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const SESSION_TTL = 10 * 60 * 1000; // 10 minutos

const STATUS_LABELS = {
  scheduled:         '⏳ Agendado',
  confirmed:         '✅ Confirmado',
  rescheduled:       '🔄 Reagendado',
  completed:         '✔️ Concluído',
  cancelled:         '❌ Cancelado',
  no_show:           '🚫 Faltou',
  falta_justificada: '📋 Falta Justificada',
};

const MODALITY_LABELS = {
  presencial: 'Presencial',
  online:     'Online',
  a_definir:  'A definir',
};

const WEEKDAY_PT = {
  seg: 0, // Usaremos índice JS onde 0=Dom,1=Seg,...
  ter: 2,
  qua: 3,
  qui: 4,
  sex: 5,
  sab: 6,
  dom: 0,
};

// Mapeamento de número do dia JS (getDay) → chave pt-BR
const JS_DAY_TO_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

// ---------------------------------------------------------------------------
// Sessões em memória
// ---------------------------------------------------------------------------

/**
 * Estrutura de sessão:
 * {
 *   step: string,
 *   data: {},            // dados temporários do fluxo
 *   lastActivity: Date,
 *   professional: {},    // usuário autenticado (se for profissional)
 *   lastAppointments: [], // última lista exibida (para reagendamento/status)
 * }
 */
const sessions = new Map();

// Limpeza de sessões expiradas a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [phone, session] of sessions) {
    if (now - session.lastActivity > SESSION_TTL) {
      sessions.delete(phone);
    }
  }
}, 5 * 60 * 1000);

// ---------------------------------------------------------------------------
// Helpers gerais
// ---------------------------------------------------------------------------

function getGreeting() {
  // Horário de Brasília (UTC-3)
  const hour = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Normaliza número de telefone para chave de sessão (preserva formato @lid ou extrai dígitos) */
function formatPhone(raw) {
  const s = String(raw || '');
  // @lid é o novo formato do WhatsApp — usa o ID completo como chave de sessão
  if (s.includes('@lid')) return s;
  return s.replace('@c.us', '').replace(/\D/g, '');
}

/** Converte Date → horário BR formatado HH:MM */
function fmtTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
}

/** Converte Date → data BR formatada DD/MM/AAAA */
function fmtDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Converte Date → nome do dia da semana abreviado em pt-BR + data */
function fmtWeekdayDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  const wd = weekdays[d.toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).startsWith('Sun') ? 0
    : d.toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).startsWith('Mon') ? 1
    : d.toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).startsWith('Tue') ? 2
    : d.toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).startsWith('Wed') ? 3
    : d.toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).startsWith('Thu') ? 4
    : d.toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).startsWith('Fri') ? 5 : 6];
  return `${wd} ${fmtDate(d)}`;
}

/** Versão mais simples e robusta de weekday+date */
function fmtWeekdayDateSimple(date) {
  if (!date) return '';
  const d = new Date(date);
  // getDay() em horário local do servidor — ajustamos pelo timezone
  const brDate = new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return `${weekdays[brDate.getDay()]} ${fmtDate(d)}`;
}

/** Converte "DD/MM/AAAA" + "HH:MM" → objeto Date UTC equivalente ao horário de SP */
function parseBrDateTime(dateStr, timeStr) {
  // dateStr: DD/MM/AAAA  timeStr: HH:MM
  const [dd, mm, yyyy] = dateStr.split('/');
  const [hh, mi] = (timeStr || '00:00').split(':');
  if (!dd || !mm || !yyyy || !hh || !mi) return null;
  // Cria ISO string no timezone de SP interpretado como local
  const isoStr = `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}T${hh.padStart(2,'0')}:${mi.padStart(2,'0')}:00`;
  // Converte de America/Sao_Paulo para UTC
  const d = new Date(new Date(isoStr).toLocaleString('en-US', { timeZone: 'UTC' }));
  // Forma correta: construir a data como se fosse SP e compensar o offset
  const spOffset = -3 * 60; // -3h em minutos
  const localOffset = new Date().getTimezoneOffset(); // offset do servidor em minutos
  const base = new Date(isoStr);
  const utc = new Date(base.getTime() - (spOffset - localOffset) * 60000);
  // Validação básica
  if (isNaN(utc.getTime())) return null;
  return utc;
}

/** Converte Date para string MySQL YYYY-MM-DD HH:MM:SS (UTC) */
function toMysqlDateTime(date) {
  if (!date) return null;
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

/** Retorna a data de hoje em SP como string YYYY-MM-DD */
function todayInSP() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

/** Valida formato DD/MM/AAAA */
function isValidDateStr(str) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return false;
  const [dd, mm, yyyy] = str.split('/').map(Number);
  if (mm < 1 || mm > 12) return false;
  if (dd < 1 || dd > 31) return false;
  if (yyyy < 2020 || yyyy > 2100) return false;
  return true;
}

/** Valida formato HH:MM */
function isValidTimeStr(str) {
  if (!/^\d{2}:\d{2}$/.test(str)) return false;
  const [hh, mm] = str.split(':').map(Number);
  if (hh < 0 || hh > 23) return false;
  if (mm < 0 || mm > 59) return false;
  return true;
}

/** Formata número de telefone para exibição */
function fmtPhoneDisplay(phone) {
  if (!phone) return '';
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length === 11) return `(${clean.slice(0,2)}) ${clean.slice(2,7)}-${clean.slice(7)}`;
  if (clean.length === 10) return `(${clean.slice(0,2)}) ${clean.slice(2,6)}-${clean.slice(6)}`;
  return phone;
}

// ---------------------------------------------------------------------------
// Mensagens de menu
// ---------------------------------------------------------------------------

function menuPrincipal() {
  const greeting = getGreeting();
  return (
    `${greeting}! 😊 Bem-vindo(a) ao atendimento virtual *PsiFlux*.\n\n` +
    `Sou o assistente virtual e estou aqui para ajudar você. Por favor, me diga como posso te atender:\n\n` +
    `1️⃣ *Sou profissional* — acessar minha agenda e gerenciar atendimentos\n` +
    `2️⃣ *Sou paciente* — consultar ou agendar minha consulta\n\n` +
    `0️⃣ *Encerrar* — finalizar o atendimento\n\n` +
    `_Digite o número da opção desejada ou descreva o que precisa._`
  );
}

function menuProfissional(nome) {
  return (
    `Olá, ${nome}! 👨‍⚕️ O que deseja fazer?\n\n` +
    `1️⃣ Ver agenda de hoje\n` +
    `2️⃣ Ver agenda do mês\n` +
    `3️⃣ Próximos agendamentos\n` +
    `4️⃣ Reagendar paciente\n` +
    `5️⃣ Alterar status de agendamento\n` +
    `6️⃣ Agendar paciente\n` +
    `7️⃣ Horários disponíveis\n` +
    `0️⃣ Sair`
  );
}

// ---------------------------------------------------------------------------
// Funções de banco de dados
// ---------------------------------------------------------------------------

async function findProfessionalByDoc(doc) {
  const clean = doc.replace(/\D/g, '');
  const [rows] = await db.query(
    `SELECT id, tenant_id, name, phone, cpf, cnpj, role
     FROM users
     WHERE (cpf = ? OR cnpj = ?)
       AND role IN ('admin', 'professional')
     LIMIT 1`,
    [clean, clean]
  );
  return rows[0] || null;
}

async function getAgendaHoje(professionalId, tenantId) {
  const today = todayInSP();
  const [rows] = await db.query(
    `SELECT a.*,
       p.name as patient_name, p.phone as patient_phone,
       s.name as service_name,
       c.sessions_total, c.sessions_used
     FROM appointments a
     LEFT JOIN patients p ON p.id = a.patient_id AND p.tenant_id = a.tenant_id
     LEFT JOIN services s ON s.id = a.service_id AND s.tenant_id = a.tenant_id
     LEFT JOIN comandas c ON c.id = a.comanda_id
     WHERE a.professional_id = ?
       AND a.tenant_id = ?
       AND DATE(CONVERT_TZ(a.start_time, '+00:00', '-03:00')) = ?
       AND a.status NOT IN ('cancelled')
     ORDER BY a.start_time ASC`,
    [professionalId, tenantId, today]
  );
  return rows;
}

async function getAgendaMes(professionalId, tenantId) {
  const now = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  const brNow = new Date(now);
  const year = brNow.getFullYear();
  const month = String(brNow.getMonth() + 1).padStart(2, '0');
  const [rows] = await db.query(
    `SELECT a.*,
       p.name as patient_name,
       s.name as service_name
     FROM appointments a
     LEFT JOIN patients p ON p.id = a.patient_id AND p.tenant_id = a.tenant_id
     LEFT JOIN services s ON s.id = a.service_id AND s.tenant_id = a.tenant_id
     WHERE a.professional_id = ?
       AND a.tenant_id = ?
       AND DATE_FORMAT(CONVERT_TZ(a.start_time, '+00:00', '-03:00'), '%Y-%m') = ?
       AND a.status NOT IN ('cancelled')
     ORDER BY a.start_time ASC`,
    [professionalId, tenantId, `${year}-${month}`]
  );
  return rows;
}

async function getProximosAgendamentos(professionalId, tenantId, limit = 10) {
  const [rows] = await db.query(
    `SELECT a.*,
       p.name as patient_name, p.phone as patient_phone,
       s.name as service_name,
       c.sessions_total, c.sessions_used
     FROM appointments a
     LEFT JOIN patients p ON p.id = a.patient_id AND p.tenant_id = a.tenant_id
     LEFT JOIN services s ON s.id = a.service_id AND s.tenant_id = a.tenant_id
     LEFT JOIN comandas c ON c.id = a.comanda_id
     WHERE a.professional_id = ?
       AND a.tenant_id = ?
       AND a.start_time >= NOW()
       AND a.status NOT IN ('cancelled')
     ORDER BY a.start_time ASC
     LIMIT ?`,
    [professionalId, tenantId, limit]
  );
  return rows;
}

async function getServicos(tenantId) {
  const [rows] = await db.query(
    `SELECT id, name FROM services WHERE tenant_id = ? ORDER BY name ASC`,
    [tenantId]
  );
  return rows;
}

async function searchPacientes(tenantId, termo) {
  const like = `%${termo}%`;
  const [rows] = await db.query(
    `SELECT id, name, phone, whatsapp
     FROM patients
     WHERE tenant_id = ?
       AND name LIKE ?
     ORDER BY name ASC
     LIMIT 10`,
    [tenantId, like]
  );
  return rows;
}

async function getUserSchedule(userId) {
  const [rows] = await db.query(
    `SELECT schedule FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  if (!rows[0] || !rows[0].schedule) return null;
  try {
    return typeof rows[0].schedule === 'string'
      ? JSON.parse(rows[0].schedule)
      : rows[0].schedule;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Formatação de listas de agendamentos
// ---------------------------------------------------------------------------

function formatAgendaHoje(rows, dateLabel) {
  if (!rows || rows.length === 0) {
    return `📅 *Sua agenda de hoje — ${dateLabel}:*\n\nNenhum atendimento agendado para hoje.`;
  }
  let msg = `📅 *Sua agenda de hoje — ${dateLabel}:*\n\n`;
  rows.forEach((apt, i) => {
    const time = fmtTime(apt.start_time);
    const status = STATUS_LABELS[apt.status] || apt.status;
    if (apt.type === 'pessoal') {
      msg += `${i + 1}. ${time} — 🔒 BLOQUEADO — ${apt.title || 'Bloqueio'}\n`;
    } else {
      let sessaoInfo = '';
      if (apt.sessions_total && apt.sessions_used !== null && apt.sessions_used !== undefined) {
        sessaoInfo = ` — Sessão ${apt.sessions_used}/${apt.sessions_total}`;
      }
      const servico = apt.service_name || 'Consulta';
      msg += `${i + 1}. ${time} — ${apt.patient_name || 'Paciente'} (${servico}) — ${status}${sessaoInfo}\n`;
    }
  });
  return msg.trimEnd();
}

function formatAgendaMes(rows) {
  const now = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  const brNow = new Date(now);
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const monthLabel = `${monthNames[brNow.getMonth()]}/${brNow.getFullYear()}`;

  if (!rows || rows.length === 0) {
    return `📆 *Agenda de ${monthLabel}:*\n\nNenhum atendimento este mês.`;
  }

  // Agrupa por dia
  const byDay = {};
  for (const apt of rows) {
    const dayKey = todayInSPForDate(apt.start_time);
    if (!byDay[dayKey]) byDay[dayKey] = { atendimentos: 0, bloqueios: 0, date: apt.start_time };
    if (apt.type === 'pessoal') byDay[dayKey].bloqueios++;
    else byDay[dayKey].atendimentos++;
  }

  let msg = `📆 *Agenda de ${monthLabel}:*\n\n`;
  const days = Object.keys(byDay).sort();
  for (const day of days) {
    const info = byDay[day];
    const label = fmtWeekdayDateSimple(info.date);
    const partes = [];
    if (info.atendimentos > 0) partes.push(`${info.atendimentos} atendimento${info.atendimentos > 1 ? 's' : ''}`);
    if (info.bloqueios > 0) partes.push(`${info.bloqueios} bloqueio${info.bloqueios > 1 ? 's' : ''}`);
    msg += `${label}: ${partes.join(' + ')}\n`;
  }
  return msg.trimEnd();
}

function todayInSPForDate(date) {
  return new Date(date).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

function formatProximosAgendamentos(rows) {
  if (!rows || rows.length === 0) {
    return `🗓️ *Próximos agendamentos:*\n\nNenhum agendamento futuro encontrado.`;
  }
  let msg = `🗓️ *Próximos agendamentos:*\n\n`;
  rows.forEach((apt, i) => {
    const date = fmtDate(apt.start_time);
    const time = fmtTime(apt.start_time);
    if (apt.type === 'pessoal') {
      msg += `${i + 1}. ${date} às ${time} — 🔒 Bloqueio — ${apt.title || 'Bloqueio pessoal'}\n`;
    } else {
      const servico = apt.service_name || 'Consulta';
      msg += `${i + 1}. ${date} às ${time} — ${apt.patient_name || 'Paciente'} (${servico})\n`;
    }
  });
  return msg.trimEnd();
}

// ---------------------------------------------------------------------------
// Envio de mensagem via WPPConnect
// ---------------------------------------------------------------------------

let _wppService = null;

function getWppService() {
  if (!_wppService) {
    try {
      _wppService = require('./whatsappService');
    } catch (e) {
      console.error('[Bot] Erro ao carregar whatsappService:', e.message);
    }
  }
  return _wppService;
}

async function sendMessage(tenantId, to, text) {
  try {
    const wpp = getWppService();
    if (!wpp) return;
    const data = wpp.getTenantData(tenantId);
    if (!data || !data.client || data.status !== 'connected') return;
    // Usa o ID original se já tem @lid ou @c.us, senão converte para @c.us
    let dest;
    if (String(to).includes('@')) {
      dest = to; // preserva @lid ou @c.us original
    } else {
      const phone = String(to).replace(/\D/g, '');
      dest = `${phone}@c.us`;
    }
    await data.client.sendText(dest, text);
  } catch (e) {
    console.error('[Bot] Erro ao enviar mensagem:', e.message);
  }
}

// ---------------------------------------------------------------------------
// Fluxo principal
// ---------------------------------------------------------------------------

/**
 * Ponto de entrada principal.
 * @param {number|string} tenantId  - ID do tenant master
 * @param {object}        message   - Objeto de mensagem do WPPConnect
 */
async function handleMessage(tenantId, message) {
  try {
    // Ignora grupos, broadcasts e status
    if (message.isGroupMsg) return;
    if (message.broadcast) return;
    if (message.type === 'e2e_notification' || message.type === 'notification_template') return;
    if (!message.from || message.from === 'status@broadcast') return;

    const phone = formatPhone(message.from);
    if (!phone) return;

    const text = String(message.body || '').trim();
    if (!text) return;

    // Recupera ou cria sessão
    let session = sessions.get(phone);
    if (!session) {
      session = { step: 'menu', data: {}, lastActivity: Date.now(), professional: null, lastAppointments: [] };
      sessions.set(phone, session);
    }

    // Verifica expiração
    if (Date.now() - session.lastActivity > SESSION_TTL) {
      // Sessão expirou — reinicia
      session.step = 'menu';
      session.data = {};
      session.professional = null;
      session.lastAppointments = [];
    }
    session.lastActivity = Date.now();

    // Comandos globais: sair / menu / 0
    const textLower = text.toLowerCase();
    if (['0', 'sair', 'menu', 'voltar', 'inicio', 'início'].includes(textLower)) {
      session.step = 'menu';
      session.data = {};
      session.professional = null;
      session.lastAppointments = [];
      await sendMessage(tenantId, message.from, menuPrincipal());
      return;
    }

    // Roteamento por step
    await routeStep(tenantId, message, phone, session, text);

  } catch (e) {
    console.error('[Bot] Erro não tratado em handleMessage:', e.message, e.stack);
  }
}

async function routeStep(tenantId, message, phone, session, text) {
  switch (session.step) {

    // -----------------------------------------------------------------------
    case 'menu':
      await handleMenuPrincipal(tenantId, message, session, text);
      break;

    // -----------------------------------------------------------------------
    // Fluxo Profissional
    case 'prof_pede_doc':
      await handleProfDoc(tenantId, message, session, text);
      break;

    case 'prof_menu':
      await handleProfMenu(tenantId, message, session, text);
      break;

    // Reagendar
    case 'prof_reagendar_escolhe':
      await handleReagendar_EscolheNumero(tenantId, message, session, text);
      break;
    case 'prof_reagendar_data':
      await handleReagendar_Data(tenantId, message, session, text);
      break;
    case 'prof_reagendar_hora':
      await handleReagendar_Hora(tenantId, message, session, text);
      break;
    case 'prof_reagendar_confirma':
      await handleReagendar_Confirma(tenantId, message, session, text);
      break;

    // Alterar status
    case 'prof_status_escolhe':
      await handleStatus_EscolheNumero(tenantId, message, session, text);
      break;
    case 'prof_status_novo':
      await handleStatus_NovoStatus(tenantId, message, session, text);
      break;
    case 'prof_status_motivo':
      await handleStatus_Motivo(tenantId, message, session, text);
      break;

    // Agendar paciente
    case 'prof_agendar_nome':
      await handleAgendar_Nome(tenantId, message, session, text);
      break;
    case 'prof_agendar_escolhe_paciente':
      await handleAgendar_EscolhePaciente(tenantId, message, session, text);
      break;
    case 'prof_agendar_servico':
      await handleAgendar_Servico(tenantId, message, session, text);
      break;
    case 'prof_agendar_data':
      await handleAgendar_Data(tenantId, message, session, text);
      break;
    case 'prof_agendar_hora':
      await handleAgendar_Hora(tenantId, message, session, text);
      break;
    case 'prof_agendar_modalidade':
      await handleAgendar_Modalidade(tenantId, message, session, text);
      break;
    case 'prof_agendar_confirma':
      await handleAgendar_Confirma(tenantId, message, session, text);
      break;

    // Horários disponíveis
    case 'prof_horarios_data':
      await handleHorarios_Data(tenantId, message, session, text);
      break;

    // -----------------------------------------------------------------------
    default:
      session.step = 'menu';
      await sendMessage(tenantId, message.from, menuPrincipal());
  }
}

// ---------------------------------------------------------------------------
// Menu principal
// ---------------------------------------------------------------------------

async function handleMenuPrincipal(tenantId, message, session, text) {
  // Tenta interpretar número direto primeiro
  let option = text;

  // Se não é 0, 1 ou 2, tenta IA
  if (option !== '0' && option !== '1' && option !== '2') {
    const ai = await interpretIntent(text, 'principal');
    if (ai.option) {
      option = ai.option;
    } else {
      const reply = ai.clarification || menuPrincipal();
      await sendMessage(tenantId, message.from, reply);
      return;
    }
  }

  if (option === '0') {
    sessions.delete(message.from.toString().includes('@') ? message.from : formatPhone(message.from));
    const greeting = getGreeting();
    await sendMessage(tenantId, message.from,
      `${greeting}! 😊 Atendimento encerrado. Até a próxima!\n\n` +
      `Se precisar de mais ajuda, é só me chamar aqui novamente.`
    );
  } else if (option === '1') {
    session.step = 'prof_pede_doc';
    await sendMessage(tenantId, message.from,
      `Ótimo! 👨‍⚕️ Para acessar sua área profissional, preciso verificar sua identidade.\n\n` +
      `Por favor, informe seu *CPF ou CNPJ* (somente números):`
    );
  } else if (option === '2') {
    session.step = 'menu';
    await sendMessage(tenantId, message.from,
      `Olá, paciente! 😊\n\n` +
      `🔜 Em breve você poderá consultar e gerenciar seus agendamentos diretamente por aqui!\n\n` +
      `Por enquanto, para agendar ou tirar dúvidas, entre em contato direto com seu profissional de saúde.\n\n` +
      `0️⃣ Voltar ao menu`
    );
  } else {
    await sendMessage(tenantId, message.from, menuPrincipal());
  }
}

// ---------------------------------------------------------------------------
// Autenticação do profissional
// ---------------------------------------------------------------------------

async function handleProfDoc(tenantId, message, session, text) {
  const doc = text.replace(/\D/g, '');
  if (!doc || (doc.length !== 11 && doc.length !== 14)) {
    await sendMessage(tenantId, message.from,
      `❌ Documento inválido. Por favor, informe seu CPF (11 dígitos) ou CNPJ (14 dígitos) somente com números:`
    );
    return;
  }

  const prof = await findProfessionalByDoc(doc);
  if (!prof) {
    await sendMessage(tenantId, message.from,
      `❌ Profissional não encontrado com esse CPF/CNPJ.\n\n` +
      `Verifique o número e tente novamente, ou envie *0* para voltar ao menu.`
    );
    return;
  }

  session.professional = prof;
  session.step = 'prof_menu';
  await sendMessage(tenantId, message.from, menuProfissional(prof.name));
}

// ---------------------------------------------------------------------------
// Menu do profissional
// ---------------------------------------------------------------------------

async function handleProfMenu(tenantId, message, session, text) {
  const prof = session.professional;
  if (!prof) {
    session.step = 'menu';
    await sendMessage(tenantId, message.from, menuPrincipal());
    return;
  }

  const validOptions = ['1','2','3','4','5','6','7'];
  let option = text;

  // Se não é uma opção válida, tenta IA
  if (!validOptions.includes(option)) {
    const ai = await interpretIntent(text, 'profissional');
    if (ai.option && validOptions.includes(String(ai.option))) {
      option = String(ai.option);
      // Feedback humanizado quando a IA interpretou
      if (ai.clarification) {
        await sendMessage(tenantId, message.from, ai.clarification);
      }
    } else {
      const reply = ai.clarification ||
        `Não entendi muito bem. 😊 Por favor, escolha uma das opções:\n\n${menuProfissional(prof.name)}`;
      await sendMessage(tenantId, message.from, reply);
      return;
    }
  }

  switch (option) {
    case '1': await opcao_AgendaHoje(tenantId, message, session); break;
    case '2': await opcao_AgendaMes(tenantId, message, session); break;
    case '3': await opcao_ProximosAgendamentos(tenantId, message, session); break;
    case '4': await opcao_IniciarReagendar(tenantId, message, session); break;
    case '5': await opcao_IniciarAlterarStatus(tenantId, message, session); break;
    case '6': await opcao_IniciarAgendar(tenantId, message, session); break;
    case '7': await opcao_HorariosDisponiveis(tenantId, message, session); break;
    default:
      await sendMessage(tenantId, message.from,
        `Opção inválida. Por favor, escolha uma opção do menu:\n\n${menuProfissional(prof.name)}`
      );
  }
}

// ---------------------------------------------------------------------------
// Opção 1 — Agenda de hoje
// ---------------------------------------------------------------------------

async function opcao_AgendaHoje(tenantId, message, session) {
  const prof = session.professional;
  try {
    const rows = await getAgendaHoje(prof.id, prof.tenant_id);
    const today = todayInSP();
    const [dd, mm, yyyy] = today.split('-');
    const dateLabel = `${dd}/${mm}/${yyyy}`;
    const msg = formatAgendaHoje(rows, dateLabel);
    await sendMessage(tenantId, message.from, msg);
    await sendMessage(tenantId, message.from, `\n${menuProfissional(prof.name)}`);
  } catch (e) {
    console.error('[Bot] opcao_AgendaHoje:', e.message);
    await sendMessage(tenantId, message.from, `❌ Erro ao buscar agenda. Tente novamente.`);
  }
}

// ---------------------------------------------------------------------------
// Opção 2 — Agenda do mês
// ---------------------------------------------------------------------------

async function opcao_AgendaMes(tenantId, message, session) {
  const prof = session.professional;
  try {
    const rows = await getAgendaMes(prof.id, prof.tenant_id);
    const msg = formatAgendaMes(rows);
    await sendMessage(tenantId, message.from, msg);
    await sendMessage(tenantId, message.from, `\n${menuProfissional(prof.name)}`);
  } catch (e) {
    console.error('[Bot] opcao_AgendaMes:', e.message);
    await sendMessage(tenantId, message.from, `❌ Erro ao buscar agenda do mês. Tente novamente.`);
  }
}

// ---------------------------------------------------------------------------
// Opção 3 — Próximos agendamentos
// ---------------------------------------------------------------------------

async function opcao_ProximosAgendamentos(tenantId, message, session) {
  const prof = session.professional;
  try {
    const rows = await getProximosAgendamentos(prof.id, prof.tenant_id, 10);
    session.lastAppointments = rows;
    const msg = formatProximosAgendamentos(rows);
    await sendMessage(tenantId, message.from, msg);
    await sendMessage(tenantId, message.from, `\n${menuProfissional(prof.name)}`);
  } catch (e) {
    console.error('[Bot] opcao_ProximosAgendamentos:', e.message);
    await sendMessage(tenantId, message.from, `❌ Erro ao buscar agendamentos. Tente novamente.`);
  }
}

// ---------------------------------------------------------------------------
// Opção 4 — Reagendar
// ---------------------------------------------------------------------------

async function opcao_IniciarReagendar(tenantId, message, session) {
  const prof = session.professional;
  try {
    // Busca (ou reutiliza) a lista de próximos agendamentos
    if (!session.lastAppointments || session.lastAppointments.length === 0) {
      session.lastAppointments = await getProximosAgendamentos(prof.id, prof.tenant_id, 10);
    }

    if (session.lastAppointments.length === 0) {
      await sendMessage(tenantId, message.from, `📋 Nenhum agendamento futuro encontrado para reagendar.`);
      await sendMessage(tenantId, message.from, menuProfissional(prof.name));
      return;
    }

    const msg = formatProximosAgendamentos(session.lastAppointments);
    session.step = 'prof_reagendar_escolhe';
    await sendMessage(tenantId, message.from,
      `${msg}\n\n` +
      `📋 Qual agendamento deseja reagendar?\n` +
      `Informe o número da lista acima (ex: 1, 2, 3):`
    );
  } catch (e) {
    console.error('[Bot] opcao_IniciarReagendar:', e.message);
    await sendMessage(tenantId, message.from, `❌ Erro ao buscar agendamentos. Tente novamente.`);
    session.step = 'prof_menu';
  }
}

async function handleReagendar_EscolheNumero(tenantId, message, session, text) {
  const num = parseInt(text, 10);
  const list = session.lastAppointments || [];

  if (isNaN(num) || num < 1 || num > list.length) {
    await sendMessage(tenantId, message.from,
      `❌ Número inválido. Informe um número entre 1 e ${list.length}:`
    );
    return;
  }

  session.data.reagendar_apt = list[num - 1];
  session.step = 'prof_reagendar_data';
  await sendMessage(tenantId, message.from, `📅 Informe a nova data (ex: 15/04/2026):`);
}

async function handleReagendar_Data(tenantId, message, session, text) {
  if (!isValidDateStr(text)) {
    await sendMessage(tenantId, message.from, `❌ Formato inválido. Use DD/MM/AAAA (ex: 15/04/2026):`);
    return;
  }
  session.data.reagendar_novaData = text;
  session.step = 'prof_reagendar_hora';
  await sendMessage(tenantId, message.from, `🕒 Informe o novo horário (ex: 14:30):`);
}

async function handleReagendar_Hora(tenantId, message, session, text) {
  if (!isValidTimeStr(text)) {
    await sendMessage(tenantId, message.from, `❌ Formato inválido. Use HH:MM (ex: 14:30):`);
    return;
  }
  session.data.reagendar_novaHora = text;

  const apt = session.data.reagendar_apt;
  const nomeExibicao = apt.type === 'pessoal'
    ? (apt.title || 'Bloqueio pessoal')
    : (apt.patient_name || 'Paciente');

  const dataAtual = `${fmtDate(apt.start_time)} às ${fmtTime(apt.start_time)}`;
  const dataNova = `${session.data.reagendar_novaData} às ${session.data.reagendar_novaHora}`;

  session.step = 'prof_reagendar_confirma';
  await sendMessage(tenantId, message.from,
    `✅ Confirmar reagendamento?\n` +
    `*${nomeExibicao}* de ${dataAtual} para ${dataNova}\n\n` +
    `1️⃣ Confirmar\n` +
    `2️⃣ Cancelar`
  );
}

async function handleReagendar_Confirma(tenantId, message, session, text) {
  const prof = session.professional;
  if (text === '2') {
    session.step = 'prof_menu';
    session.data = {};
    await sendMessage(tenantId, message.from, `↩️ Reagendamento cancelado.`);
    await sendMessage(tenantId, message.from, menuProfissional(prof.name));
    return;
  }

  if (text !== '1') {
    await sendMessage(tenantId, message.from, `Por favor, responda *1* para confirmar ou *2* para cancelar.`);
    return;
  }

  try {
    const apt = session.data.reagendar_apt;
    const novaData = session.data.reagendar_novaData;
    const novaHora = session.data.reagendar_novaHora;

    // Calcula duração original
    const startOrig = new Date(apt.start_time);
    const endOrig = new Date(apt.end_time);
    const durMs = endOrig.getTime() - startOrig.getTime();

    const novoStart = parseBrDateTime(novaData, novaHora);
    if (!novoStart) {
      await sendMessage(tenantId, message.from, `❌ Erro ao interpretar a data/hora. Tente novamente.`);
      session.step = 'prof_menu';
      return;
    }
    const novoEnd = new Date(novoStart.getTime() + durMs);

    await db.query(
      `UPDATE appointments
       SET start_time = ?, end_time = ?, status = 'rescheduled'
       WHERE id = ? AND tenant_id = ?`,
      [toMysqlDateTime(novoStart), toMysqlDateTime(novoEnd), apt.id, apt.tenant_id]
    );

    session.lastAppointments = [];
    session.data = {};
    session.step = 'prof_menu';

    await sendMessage(tenantId, message.from,
      `✅ Reagendamento realizado com sucesso!\n` +
      `Nova data: *${novaData} às ${novaHora}*`
    );
    await sendMessage(tenantId, message.from, menuProfissional(prof.name));
  } catch (e) {
    console.error('[Bot] handleReagendar_Confirma:', e.message);
    await sendMessage(tenantId, message.from, `❌ Erro ao reagendar. Tente novamente.`);
    session.step = 'prof_menu';
  }
}

// ---------------------------------------------------------------------------
// Opção 5 — Alterar status
// ---------------------------------------------------------------------------

async function opcao_IniciarAlterarStatus(tenantId, message, session) {
  const prof = session.professional;
  try {
    // Busca agendamentos de hoje + próximos
    const hoje = await getAgendaHoje(prof.id, prof.tenant_id);
    const proximos = await getProximosAgendamentos(prof.id, prof.tenant_id, 7);

    // Une sem duplicar (hoje já pode estar nos próximos)
    const ids = new Set(hoje.map(a => a.id));
    const merged = [...hoje, ...proximos.filter(a => !ids.has(a.id))];

    if (merged.length === 0) {
      await sendMessage(tenantId, message.from, `📋 Nenhum agendamento encontrado para alterar status.`);
      await sendMessage(tenantId, message.from, menuProfissional(prof.name));
      return;
    }

    session.lastAppointments = merged;
    const msg = formatProximosAgendamentos(merged);
    session.step = 'prof_status_escolhe';
    await sendMessage(tenantId, message.from,
      `${msg}\n\n` +
      `📋 Qual agendamento deseja alterar o status?\n` +
      `Informe o número da lista acima:`
    );
  } catch (e) {
    console.error('[Bot] opcao_IniciarAlterarStatus:', e.message);
    await sendMessage(tenantId, message.from, `❌ Erro ao buscar agendamentos. Tente novamente.`);
    session.step = 'prof_menu';
  }
}

async function handleStatus_EscolheNumero(tenantId, message, session, text) {
  const num = parseInt(text, 10);
  const list = session.lastAppointments || [];

  if (isNaN(num) || num < 1 || num > list.length) {
    await sendMessage(tenantId, message.from,
      `❌ Número inválido. Informe um número entre 1 e ${list.length}:`
    );
    return;
  }

  session.data.status_apt = list[num - 1];
  session.step = 'prof_status_novo';
  await sendMessage(tenantId, message.from,
    `Qual o novo status?\n\n` +
    `1️⃣ Confirmado\n` +
    `2️⃣ Concluído\n` +
    `3️⃣ Faltou (não justificado)\n` +
    `4️⃣ Falta justificada\n` +
    `5️⃣ Cancelado`
  );
}

async function handleStatus_NovoStatus(tenantId, message, session, text) {
  const statusMap = {
    '1': 'confirmed',
    '2': 'completed',
    '3': 'no_show',
    '4': 'falta_justificada',
    '5': 'cancelled',
  };
  const novoStatus = statusMap[text];
  if (!novoStatus) {
    await sendMessage(tenantId, message.from,
      `❌ Opção inválida. Escolha entre 1 e 5:`
    );
    return;
  }

  session.data.status_novo = novoStatus;

  // No_show e falta_justificada pedem motivo
  if (novoStatus === 'no_show' || novoStatus === 'falta_justificada') {
    session.step = 'prof_status_motivo';
    await sendMessage(tenantId, message.from,
      `📝 Informe o motivo (ou envie *PULAR* para deixar em branco):`
    );
    return;
  }

  // Executa imediatamente
  await executarAlteracaoStatus(tenantId, message, session, null);
}

async function handleStatus_Motivo(tenantId, message, session, text) {
  const motivo = text.toUpperCase() === 'PULAR' ? null : text;
  await executarAlteracaoStatus(tenantId, message, session, motivo);
}

async function executarAlteracaoStatus(tenantId, message, session, motivo) {
  const prof = session.professional;
  try {
    const apt = session.data.status_apt;
    const novoStatus = session.data.status_novo;

    const updateFields = ['status = ?'];
    const params = [novoStatus];

    if (motivo !== null && motivo !== undefined) {
      updateFields.push('notes = CONCAT(IFNULL(notes, \'\'), ?, ?)');
      params.push('\n[Motivo falta]: ', motivo);
    }

    params.push(apt.id, apt.tenant_id);

    await db.query(
      `UPDATE appointments SET ${updateFields.join(', ')} WHERE id = ? AND tenant_id = ?`,
      params
    );

    const statusLabel = STATUS_LABELS[novoStatus] || novoStatus;
    session.data = {};
    session.lastAppointments = [];
    session.step = 'prof_menu';

    await sendMessage(tenantId, message.from,
      `✅ Status atualizado para *${statusLabel}* com sucesso!`
    );
    await sendMessage(tenantId, message.from, menuProfissional(prof.name));
  } catch (e) {
    console.error('[Bot] executarAlteracaoStatus:', e.message);
    await sendMessage(tenantId, message.from, `❌ Erro ao atualizar status. Tente novamente.`);
    session.step = 'prof_menu';
  }
}

// ---------------------------------------------------------------------------
// Opção 6 — Agendar paciente
// ---------------------------------------------------------------------------

async function opcao_IniciarAgendar(tenantId, message, session) {
  session.data = {};
  session.step = 'prof_agendar_nome';
  await sendMessage(tenantId, message.from,
    `👤 Informe o nome do paciente (ou parte do nome):`
  );
}

async function handleAgendar_Nome(tenantId, message, session, text) {
  const prof = session.professional;
  if (!text || text.length < 2) {
    await sendMessage(tenantId, message.from, `❌ Informe pelo menos 2 caracteres do nome:`);
    return;
  }

  try {
    const pacientes = await searchPacientes(prof.tenant_id, text);
    if (pacientes.length === 0) {
      await sendMessage(tenantId, message.from,
        `❌ Nenhum paciente encontrado com "${text}".\n\nTente outro nome ou envie *0* para cancelar.`
      );
      return;
    }

    session.data.agendar_pacientes_lista = pacientes;

    if (pacientes.length === 1) {
      // Seleciona automaticamente
      session.data.agendar_paciente = pacientes[0];
      session.step = 'prof_agendar_servico';
      await pedirServico(tenantId, message, session);
      return;
    }

    let msg = `Qual paciente?\n\n`;
    pacientes.forEach((p, i) => {
      const phone = fmtPhoneDisplay(p.phone || p.whatsapp || '');
      msg += `${i + 1}. ${p.name}${phone ? ` — ${phone}` : ''}\n`;
    });
    session.step = 'prof_agendar_escolhe_paciente';
    await sendMessage(tenantId, message.from, msg);
  } catch (e) {
    console.error('[Bot] handleAgendar_Nome:', e.message);
    await sendMessage(tenantId, message.from, `❌ Erro ao buscar pacientes. Tente novamente.`);
  }
}

async function handleAgendar_EscolhePaciente(tenantId, message, session, text) {
  const num = parseInt(text, 10);
  const lista = session.data.agendar_pacientes_lista || [];
  if (isNaN(num) || num < 1 || num > lista.length) {
    await sendMessage(tenantId, message.from,
      `❌ Número inválido. Informe um número entre 1 e ${lista.length}:`
    );
    return;
  }
  session.data.agendar_paciente = lista[num - 1];
  session.step = 'prof_agendar_servico';
  await pedirServico(tenantId, message, session);
}

async function pedirServico(tenantId, message, session) {
  const prof = session.professional;
  try {
    const servicos = await getServicos(prof.tenant_id);
    session.data.agendar_servicos_lista = servicos;

    if (servicos.length === 0) {
      session.data.agendar_servico = null;
      session.step = 'prof_agendar_data';
      await sendMessage(tenantId, message.from, `📅 Informe a data do agendamento (ex: 15/04/2026):`);
      return;
    }

    let msg = `🔹 Qual serviço? (ou envie *PULAR* para nenhum)\n\n`;
    servicos.forEach((s, i) => {
      msg += `${i + 1}. ${s.name}\n`;
    });
    await sendMessage(tenantId, message.from, msg);
  } catch (e) {
    console.error('[Bot] pedirServico:', e.message);
    session.data.agendar_servico = null;
    session.step = 'prof_agendar_data';
    await sendMessage(tenantId, message.from, `📅 Informe a data do agendamento (ex: 15/04/2026):`);
  }
}

async function handleAgendar_Servico(tenantId, message, session, text) {
  if (text.toUpperCase() === 'PULAR') {
    session.data.agendar_servico = null;
    session.step = 'prof_agendar_data';
    await sendMessage(tenantId, message.from, `📅 Informe a data do agendamento (ex: 15/04/2026):`);
    return;
  }

  const num = parseInt(text, 10);
  const lista = session.data.agendar_servicos_lista || [];
  if (isNaN(num) || num < 1 || num > lista.length) {
    await sendMessage(tenantId, message.from,
      `❌ Número inválido. Informe um número entre 1 e ${lista.length} ou *PULAR*:`
    );
    return;
  }
  session.data.agendar_servico = lista[num - 1];
  session.step = 'prof_agendar_data';
  await sendMessage(tenantId, message.from, `📅 Informe a data do agendamento (ex: 15/04/2026):`);
}

async function handleAgendar_Data(tenantId, message, session, text) {
  if (!isValidDateStr(text)) {
    await sendMessage(tenantId, message.from, `❌ Formato inválido. Use DD/MM/AAAA (ex: 15/04/2026):`);
    return;
  }
  session.data.agendar_data = text;
  session.step = 'prof_agendar_hora';
  await sendMessage(tenantId, message.from, `🕒 Informe o horário (ex: 14:30):`);
}

async function handleAgendar_Hora(tenantId, message, session, text) {
  if (!isValidTimeStr(text)) {
    await sendMessage(tenantId, message.from, `❌ Formato inválido. Use HH:MM (ex: 14:30):`);
    return;
  }
  session.data.agendar_hora = text;
  session.step = 'prof_agendar_modalidade';
  await sendMessage(tenantId, message.from,
    `📍 Modalidade:\n\n` +
    `1️⃣ Presencial\n` +
    `2️⃣ Online\n` +
    `3️⃣ A definir`
  );
}

async function handleAgendar_Modalidade(tenantId, message, session, text) {
  const modalMap = { '1': 'presencial', '2': 'online', '3': 'a_definir' };
  const modalidade = modalMap[text];
  if (!modalidade) {
    await sendMessage(tenantId, message.from, `❌ Opção inválida. Escolha 1, 2 ou 3:`);
    return;
  }
  session.data.agendar_modalidade = modalidade;

  // Monta confirmação
  const pac = session.data.agendar_paciente;
  const serv = session.data.agendar_servico;
  const data = session.data.agendar_data;
  const hora = session.data.agendar_hora;
  const mod = MODALITY_LABELS[modalidade] || modalidade;

  session.step = 'prof_agendar_confirma';
  await sendMessage(tenantId, message.from,
    `✅ Confirmar agendamento?\n\n` +
    `👤 Paciente: *${pac.name || pac.full_name}*\n` +
    `🔹 Serviço: *${serv ? serv.name : 'Sem serviço'}*\n` +
    `📅 Data: *${data} às ${hora}*\n` +
    `📍 Modalidade: *${mod}*\n\n` +
    `1️⃣ Confirmar\n` +
    `2️⃣ Cancelar`
  );
}

async function handleAgendar_Confirma(tenantId, message, session, text) {
  const prof = session.professional;

  if (text === '2') {
    session.step = 'prof_menu';
    session.data = {};
    await sendMessage(tenantId, message.from, `↩️ Agendamento cancelado.`);
    await sendMessage(tenantId, message.from, menuProfissional(prof.name));
    return;
  }

  if (text !== '1') {
    await sendMessage(tenantId, message.from, `Por favor, responda *1* para confirmar ou *2* para cancelar.`);
    return;
  }

  try {
    const pac     = session.data.agendar_paciente;
    const serv    = session.data.agendar_servico;
    const dataStr = session.data.agendar_data;
    const horaStr = session.data.agendar_hora;
    const modal   = session.data.agendar_modalidade;

    const startDate = parseBrDateTime(dataStr, horaStr);
    if (!startDate) {
      await sendMessage(tenantId, message.from, `❌ Erro ao interpretar data/hora. Tente novamente.`);
      session.step = 'prof_menu';
      return;
    }

    // Duração padrão: 50 minutos
    const endDate = new Date(startDate.getTime() + 50 * 60 * 1000);

    await db.query(
      `INSERT INTO appointments
         (tenant_id, professional_id, patient_id, service_id, start_time, end_time, status, type, modality, title)
       VALUES (?, ?, ?, ?, ?, ?, 'scheduled', 'consulta', ?, ?)`,
      [
        prof.tenant_id,
        prof.id,
        pac.id,
        serv ? serv.id : null,
        toMysqlDateTime(startDate),
        toMysqlDateTime(endDate),
        modal || 'a_definir',
        pac.name || pac.full_name,
      ]
    );

    session.data = {};
    session.lastAppointments = [];
    session.step = 'prof_menu';

    await sendMessage(tenantId, message.from,
      `✅ Agendamento criado com sucesso!\n` +
      `*${pac.name || pac.full_name}* em ${dataStr} às ${horaStr}`
    );
    await sendMessage(tenantId, message.from, menuProfissional(prof.name));
  } catch (e) {
    console.error('[Bot] handleAgendar_Confirma:', e.message);
    await sendMessage(tenantId, message.from, `❌ Erro ao criar agendamento. Tente novamente.`);
    session.step = 'prof_menu';
  }
}

// ---------------------------------------------------------------------------
// Opção 7 — Horários disponíveis
// ---------------------------------------------------------------------------

async function opcao_HorariosDisponiveis(tenantId, message, session) {
  session.data = {};
  session.step = 'prof_horarios_data';
  await sendMessage(tenantId, message.from, `📅 Informe a data (ex: 15/04/2026):`);
}

async function handleHorarios_Data(tenantId, message, session, text) {
  const prof = session.professional;

  if (!isValidDateStr(text)) {
    await sendMessage(tenantId, message.from, `❌ Formato inválido. Use DD/MM/AAAA (ex: 15/04/2026):`);
    return;
  }

  try {
    const [dd, mm, yyyy] = text.split('/');
    const dateISO = `${yyyy}-${mm}-${dd}`;

    // Descobre o dia da semana em SP
    const dateObj = new Date(`${dateISO}T12:00:00`); // meio-dia para evitar problemas de timezone
    const brDate  = new Date(dateObj.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const dayIndex = brDate.getDay(); // 0=Dom,...,6=Sab
    const dayKey   = JS_DAY_TO_PT[dayIndex]; // 'seg','ter',...

    // Busca schedule do profissional
    const schedule = await getUserSchedule(prof.id);

    let slots = [];
    if (schedule && schedule[dayKey] && Array.isArray(schedule[dayKey])) {
      slots = schedule[dayKey];
    }

    if (slots.length === 0) {
      session.step = 'prof_menu';
      await sendMessage(tenantId, message.from,
        `⏰ *Horários disponíveis em ${text}:*\n\nNenhum horário configurado para esse dia.`
      );
      await sendMessage(tenantId, message.from, menuProfissional(prof.name));
      return;
    }

    // Busca appointments do dia
    const [aptRows] = await db.query(
      `SELECT start_time, end_time, status
       FROM appointments
       WHERE professional_id = ?
         AND tenant_id = ?
         AND DATE(CONVERT_TZ(start_time, '+00:00', '-03:00')) = ?
         AND status NOT IN ('cancelled')`,
      [prof.id, prof.tenant_id, dateISO]
    );

    // Verifica cada slot
    let msg = `⏰ *Horários disponíveis em ${text}:*\n\n`;
    for (const slot of slots) {
      const [slotH, slotM] = slot.split(':').map(Number);
      // Cria Date representando esse horário em SP
      const slotStart = parseBrDateTime(text, slot);
      const slotEnd   = slotStart ? new Date(slotStart.getTime() + 50 * 60 * 1000) : null;

      let ocupado = false;
      if (slotStart) {
        for (const apt of aptRows) {
          const aptStart = new Date(apt.start_time);
          const aptEnd   = new Date(apt.end_time);
          // Verifica sobreposição
          if (slotStart < aptEnd && slotEnd > aptStart) {
            ocupado = true;
            break;
          }
        }
      }

      msg += `${slot} ${ocupado ? '❌ (ocupado)' : '✅'}\n`;
    }

    session.step = 'prof_menu';
    await sendMessage(tenantId, message.from, msg.trimEnd());
    await sendMessage(tenantId, message.from, menuProfissional(prof.name));
  } catch (e) {
    console.error('[Bot] handleHorarios_Data:', e.message);
    await sendMessage(tenantId, message.from, `❌ Erro ao buscar horários. Tente novamente.`);
    session.step = 'prof_menu';
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = { handleMessage };
