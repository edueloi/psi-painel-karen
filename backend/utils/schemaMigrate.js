// Auto-migração segura de colunas.
//
// Vários módulos (profile, finance, nfse, virtual-rooms...) rodavam `ALTER TABLE ... ADD COLUMN`
// ao carregar, todos em paralelo e a cada reinício. Mesmo quando a coluna já existia, cada ALTER
// pegava o lock de metadados da tabela e as migrações concorrentes se travavam entre si
// ("Deadlock found when trying to get lock"), registrando avisos e, em virtual-rooms, derrubando a
// requisição. Aqui as migrações:
//   1. rodam uma por vez (fila única compartilhada por todos os módulos);
//   2. só executam o ALTER se a coluna ainda não existe (consulta ao information_schema, com cache);
//   3. repetem com espera crescente em deadlock/lock timeout.
const db = require('../db');

let queue = Promise.resolve();
const columnCache = new Map(); // tabela (minúscula) -> Set de colunas (minúsculas)

const ADD_COLUMN_RE = /^\s*ALTER\s+TABLE\s+`?(\w+)`?\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i;
const TABLE_RE = /(?:ALTER|CREATE)\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i;
const DUPLICATE_ERRNOS = new Set([1060, 1061, 1050, 1068]); // coluna/índice/tabela já existe
const RETRY_ERRNOS = new Set([1213, 1205]); // deadlock, lock wait timeout

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadColumns(table) {
  const key = table.toLowerCase();
  if (columnCache.has(key)) return columnCache.get(key);
  const [rows] = await db.query(
    'SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [table]
  );
  const set = new Set(rows.map((row) => String(row.name).toLowerCase()));
  columnCache.set(key, set);
  return set;
}

async function runWithRetry(sql, maxTries = 6) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.query(sql);
    } catch (err) {
      if (RETRY_ERRNOS.has(err.errno) && attempt < maxTries) {
        await sleep(250 * attempt + Math.floor(Math.random() * 200));
        continue;
      }
      throw err;
    }
  }
}

function isDuplicate(err) {
  return DUPLICATE_ERRNOS.has(err.errno) || err.code === 'ER_DUP_FIELDNAME';
}

// Executa uma instrução; devolve true se rodou, false se foi dispensada (coluna já existe / duplicada).
async function applyOne(sql) {
  const add = ADD_COLUMN_RE.exec(sql);
  if (add) {
    const columns = await loadColumns(add[1]);
    if (columns.has(add[2].toLowerCase())) return false; // já existe: não toca na tabela
  }
  try {
    await runWithRetry(sql);
  } catch (err) {
    if (isDuplicate(err)) return false;
    throw err;
  }
  if (add) (await loadColumns(add[1])).add(add[2].toLowerCase());
  else {
    // MODIFY/CREATE etc. podem mudar as colunas da tabela: descarta o cache dela
    const table = TABLE_RE.exec(sql);
    if (table) columnCache.delete(table[1].toLowerCase());
  }
  return true;
}

/**
 * Executa as instruções de migração em fila, sem concorrência com as de outros módulos.
 * Por padrão nunca lança: falhas viram aviso no log. Com `strict: true` propaga a primeira falha
 * (para fluxos que dependem da coluna logo em seguida).
 */
function ensureStatements(statements, label, { strict = false } = {}) {
  const run = queue.then(async () => {
    for (const sql of statements) {
      try {
        await applyOne(sql);
      } catch (err) {
        if (strict) throw err;
        console.warn(`[schema${label ? ':' + label : ''}] ${err.message}`);
      }
    }
  });
  queue = run.catch(() => {});
  return run;
}

/** Converte ISO/Date para DATETIME do MySQL em UTC (o pool usa timezone '+00:00'). Datas puras passam direto. */
function toDbDateTime(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim();
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = { ensureStatements, toDbDateTime };
