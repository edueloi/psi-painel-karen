// Helpers compartilhados para users.closed_dates (férias, feriados, folgas e bloqueios de horário).
//
// Formato de cada entrada (todos os campos além de `date` são opcionais — entradas antigas
// { date, label } continuam válidas e significam "dia inteiro"):
//   { date:'YYYY-MM-DD', label, type:'ferias'|'feriado_nacional'|'feriado_local'|'facultativo'|'folga'|'recesso'|'outro',
//     allDay:true|false, from:'HH:mm', to:'HH:mm',            // allDay=false bloqueia só [from, to)
//     groupId, groupStart, groupEnd,                           // período de vários dias exibido como um item
//     source:'manual'|'auto', year }

const TYPES = ['ferias', 'feriado_nacional', 'feriado_local', 'facultativo', 'folga', 'recesso', 'outro'];
const SOURCES = ['manual', 'auto'];
const MAX_ITEMS = 1500;
const MAX_LABEL = 120;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseClosed(raw) {
  if (!raw) return [];
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

function isValidDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function toMinutes(hhmm) {
  if (typeof hhmm !== 'string') return NaN;
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

function entryDate(e) {
  if (typeof e === 'string') return e.slice(0, 10);
  return e && e.date ? String(e.date).slice(0, 10) : '';
}

// Entrada parcial = allDay === false com from/to válidos e from < to. Qualquer outra coisa é dia inteiro.
function partialRange(e) {
  if (!e || typeof e !== 'object' || e.allDay !== false) return null;
  const start = toMinutes(e.from);
  const end = toMinutes(e.to);
  if (isNaN(start) || isNaN(end) || start >= end) return null;
  return { start, end };
}

function isAllDayEntry(e) {
  return !partialRange(e);
}

// Primeira entrada de dia inteiro para a data (ou null).
function findClosedDay(closed, dateISO) {
  const list = parseClosed(closed);
  for (const e of list) {
    if (entryDate(e) === dateISO && isAllDayEntry(e)) return typeof e === 'string' ? { date: e, label: '' } : e;
  }
  return null;
}

function isDayClosed(closed, dateISO) {
  return !!findClosedDay(closed, dateISO);
}

// Intervalos parciais bloqueados em um dia: [{ from, to, start, end, label, type }]
function blockedIntervals(closed, dateISO) {
  const out = [];
  for (const e of parseClosed(closed)) {
    if (entryDate(e) !== dateISO) continue;
    const r = partialRange(e);
    if (!r) continue;
    out.push({ from: e.from, to: e.to, start: r.start, end: r.end, label: e.label || '', type: e.type || 'outro' });
  }
  return out.sort((a, b) => a.start - b.start);
}

// Retorna o bloqueio (dia inteiro ou intervalo) que intersecta [startMin, endMin) em dateISO, ou null.
function findBlock(closed, dateISO, startMin, endMin) {
  const whole = findClosedDay(closed, dateISO);
  if (whole) return { allDay: true, label: whole.label || '', entry: whole };
  for (const b of blockedIntervals(closed, dateISO)) {
    if (startMin < b.end && endMin > b.start) return { allDay: false, label: b.label, from: b.from, to: b.to };
  }
  return null;
}

// Valida e normaliza o array vindo do cliente. Retorna { items, errors }.
function sanitizeClosedDates(input) {
  const errors = [];
  if (!Array.isArray(input)) return { items: [], errors: ['Datas bloqueadas inválidas.'] };
  if (input.length > MAX_ITEMS) errors.push(`Limite de ${MAX_ITEMS} bloqueios excedido.`);
  const seen = new Set();
  const items = [];
  for (const raw of input.slice(0, MAX_ITEMS)) {
    const e = typeof raw === 'string' ? { date: raw } : raw;
    if (!e || typeof e !== 'object') continue;
    const date = String(e.date || '').slice(0, 10);
    if (!isValidDate(date)) { errors.push(`Data inválida: ${String(e.date).slice(0, 20)}`); continue; }
    const label = String(e.label == null ? '' : e.label).trim().slice(0, MAX_LABEL);
    const item = { date, label };
    if (e.type !== undefined && e.type !== null) item.type = TYPES.includes(e.type) ? e.type : 'outro';
    if (e.allDay === false) {
      if (!TIME_RE.test(String(e.from)) || !TIME_RE.test(String(e.to)) || toMinutes(e.from) >= toMinutes(e.to)) {
        errors.push(`Horário inválido em ${date}: o início deve ser anterior ao fim.`);
        continue;
      }
      item.allDay = false; item.from = e.from; item.to = e.to;
    } else if (e.allDay === true) {
      item.allDay = true;
    }
    if (e.groupId) {
      item.groupId = String(e.groupId).slice(0, 64);
      if (isValidDate(String(e.groupStart))) item.groupStart = e.groupStart;
      if (isValidDate(String(e.groupEnd))) item.groupEnd = e.groupEnd;
    }
    if (e.source !== undefined && SOURCES.includes(e.source)) item.source = e.source;
    const year = parseInt(e.year, 10);
    if (year >= 1900 && year <= 2200) item.year = year;
    const key = `${date}|${item.allDay === false ? item.from : ''}|${item.allDay === false ? item.to : ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  items.sort((a, b) => a.date.localeCompare(b.date) || String(a.from || '').localeCompare(String(b.from || '')));
  return { items, errors };
}

module.exports = {
  TYPES, MAX_ITEMS, MAX_LABEL,
  parseClosed, isValidDate, toMinutes, partialRange,
  isDayClosed, findClosedDay, blockedIntervals, findBlock, sanitizeClosedDates,
};
