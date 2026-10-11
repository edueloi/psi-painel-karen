/**
 * Variáveis dos modelos de documento ({{patient_name}}, {{amount}} ...): aliases, valor por extenso (pt-BR),
 * cidade/UF a partir do endereço e substituição que NUNCA deixa "{{ }}" vazar para o documento final.
 * Sem dependência de React/DOM (testável em Node).
 */

/* ───────────── Nomes e aliases ───────────── */
export const VARIABLE_LABELS: Record<string, string> = {
  patient_name: 'nome do paciente',
  patient_cpf: 'CPF do paciente',
  patient_address: 'endereço do paciente',
  patient_age: 'idade do paciente',
  professional_name: 'nome do profissional',
  professional_crp: 'registro profissional',
  date: 'data',
  date_long: 'data por extenso',
  time_start: 'horário de início',
  time_end: 'horário de fim',
  amount: 'valor',
  amount_text: 'valor por extenso',
  period: 'período',
  service_name: 'serviço',
  city: 'cidade',
  state: 'UF',
  city_uf: 'cidade/UF',
  year: 'ano',
  month_name: 'mês',
  clinic_name: 'nome da clínica',
  clinic_cnpj: 'CNPJ da clínica',
  clinic_phone: 'telefone da clínica',
  clinic_email: 'e-mail da clínica',
  clinic_address: 'endereço da clínica',
  signature_name: 'nome na assinatura',
  signature_crp: 'registro na assinatura',
};

const ALIASES: Record<string, string> = {
  nome_paciente: 'patient_name', paciente: 'patient_name', patient: 'patient_name',
  cpf_paciente: 'patient_cpf', cpf: 'patient_cpf', patient_document: 'patient_cpf',
  endereco_paciente: 'patient_address', idade: 'patient_age',
  nome_profissional: 'professional_name', profissional: 'professional_name',
  crp_profissional: 'professional_crp', professional_registry: 'professional_crp', registro_profissional: 'professional_crp',
  crp: 'professional_crp', registro: 'professional_crp',
  data: 'date', data_documento: 'date', data_extenso: 'date_long',
  hora_inicio: 'time_start', hora_fim: 'time_end',
  valor: 'amount', valor_extenso: 'amount_text', valor_por_extenso: 'amount_text', amount_words: 'amount_text',
  periodo: 'period', servico: 'service_name', finalidade: 'service_name',
  cidade: 'city', uf: 'state', estado: 'state', local: 'city_uf', cidade_uf: 'city_uf',
  ano: 'year', mes_nome: 'month_name', mes: 'month_name',
  clinica: 'clinic_name', nome_clinica: 'clinic_name', cnpj: 'clinic_cnpj', cnpj_clinica: 'clinic_cnpj',
  telefone_clinica: 'clinic_phone', email_clinica: 'clinic_email', endereco_clinica: 'clinic_address', endereco: 'clinic_address',
  nome_assinatura: 'signature_name', crp_assinatura: 'signature_crp',
};

export const canonicalVariable = (name: string): string => {
  const k = name.trim().toLowerCase();
  return ALIASES[k] || k;
};

/* ───────────── Valor por extenso (pt-BR) ───────────── */
const UNID = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENT = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function below1000(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const parts: string[] = [];
  const c = Math.floor(n / 100); const r = n % 100;
  if (c) parts.push(CENT[c]);
  if (r) {
    if (r < 20) parts.push(UNID[r]);
    else { const d = Math.floor(r / 10); const u = r % 10; parts.push(u ? `${DEZ[d]} e ${UNID[u]}` : DEZ[d]); }
  }
  return parts.join(' e ');
}

/** Inteiro (0 .. 999.999.999.999) por extenso. */
export function integerToWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '';
  n = Math.floor(n);
  if (n === 0) return 'zero';
  const scales: [number, string, string][] = [[1e9, 'bilhão', 'bilhões'], [1e6, 'milhão', 'milhões'], [1e3, 'mil', 'mil']];
  const chunks: { text: string; q: number }[] = [];
  let rest = n;
  for (const [div, sing, plur] of scales) {
    const q = Math.floor(rest / div);
    if (q > 0) {
      rest -= q * div;
      chunks.push({ q, text: div === 1e3 && q === 1 ? 'mil' : `${below1000(q)} ${q === 1 ? sing : plur}` });
    }
  }
  if (rest > 0) chunks.push({ q: rest, text: below1000(rest) });
  // "e" antes da última classe quando ela é < 100 ou centena exata (mil e quinhentos; um milhão e duzentos mil)
  let out = chunks[0].text;
  for (let i = 1; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    const needE = isLast && (chunks[i].q < 100 || chunks[i].q % 100 === 0);
    out += (needE ? ' e ' : ' ') + chunks[i].text;
  }
  return out;
}

/** Interpreta "1.234,56", "120", "120.50", "R$ 90,5". Devolve null se inválido. */
export function parseMoney(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).replace(/R\$/gi, '').replace(/\s/g, '');
  if (!s || !/\d/.test(s)) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export const formatMoney = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "120" -> "cento e vinte reais"; "1.250,75" -> "mil duzentos e cinquenta reais e setenta e cinco centavos". */
export function amountToWords(raw: string | number | null | undefined): string {
  const v = parseMoney(raw);
  if (v === null) return '';
  const cents = Math.round(v * 100);
  const reais = Math.floor(cents / 100); const cent = cents % 100;
  const parts: string[] = [];
  if (reais > 0 || cent === 0) {
    const big = reais >= 1e6 && reais % 1e6 === 0; // "um milhão de reais"
    parts.push(`${integerToWords(reais)}${big ? ' de' : ''} ${reais === 1 ? 'real' : 'reais'}`);
  }
  if (cent > 0) parts.push(`${integerToWords(cent)} ${cent === 1 ? 'centavo' : 'centavos'}`);
  return parts.join(' e ');
}

/* ───────────── Cidade/UF ───────────── */
const UFS = new Set(['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']);
const CEP_RE = /\b\d{2}\.?\d{3}-?\d{3}\b/g;

/** Extrai cidade/UF de um endereço livre ("Rua X, 12, Centro, Tatuí - SP, 18271-130"). Nunca devolve CEP ou número. */
export function extractCityUf(address?: string | null, cityHint?: string | null, stateHint?: string | null): { city: string; state: string } {
  const hintCity = (cityHint || '').trim(); const hintState = (stateHint || '').trim().toUpperCase();
  if (hintCity) return { city: hintCity, state: UFS.has(hintState) ? hintState : '' };
  const cleaned = String(address || '').replace(CEP_RE, ' ').replace(/\bCEP\b:?/gi, ' ').replace(/\s+/g, ' ');
  if (!cleaned.trim()) return { city: '', state: '' };
  const tokens = cleaned.split(/\s*[,;|\n]\s*|\s+[-–—]\s+|\s*\/\s*/).map(s => s.trim()).filter(Boolean);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const up = tokens[i].toUpperCase().replace(/\./g, '');
    if (UFS.has(up) && tokens[i].length <= 3 && i > 0) {
      let j = i - 1;
      while (j >= 0 && /^\d+$/.test(tokens[j])) j--;
      if (j >= 0 && /\p{L}/u.test(tokens[j])) return { city: tokens[j], state: up };
    }
    // "Tatuí SP" no mesmo segmento
    const m = tokens[i].match(/^(.*\p{L})\s+([A-Za-z]{2})$/u);
    if (m && UFS.has(m[2].toUpperCase())) return { city: m[1].trim(), state: m[2].toUpperCase() };
  }
  // sem UF: último segmento com letras que não pareça logradouro/número
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (/\p{L}/u.test(t) && !/\d/.test(t) && !/^(rua|av|avenida|travessa|alameda|rodovia|estrada|praça|praca)\b/i.test(t)) return { city: t, state: '' };
  }
  return { city: '', state: '' };
}

export const joinCityUf = (city?: string, state?: string) => [ (city || '').trim(), (state || '').trim() ].filter(Boolean).join('/');

/* ───────────── Datas ───────────── */
const MONTHS_LOWER = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const longDatePt = (d: Date) => `${d.getDate()} de ${MONTHS_LOWER[d.getMonth()]} de ${d.getFullYear()}`;
export const monthNamePt = (d: Date) => MONTHS_LOWER[d.getMonth()].replace(/^./, c => c.toUpperCase());
/** "2026-10-10" -> Date local (sem deslocamento de fuso). */
export function parseIsoDate(v?: string | null): Date | null {
  if (!v) return null;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
export const shortDatePt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

/* ───────────── Substituição ───────────── */
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const BLANK = '__________';

/** Remove as "pílulas" do editor (span contenteditable=false com svg) deixando só o texto da variável. */
export function unwrapEditorChips(html: string): string {
  return html.replace(/<span[^>]*contenteditable\s*=\s*["']?false["']?[^>]*>([\s\S]*?)<\/span>/gi, (_m, inner: string) =>
    inner.replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/<[^>]+>/g, ''));
}

const VAR_RE = /\{{2,3}\s*([A-Za-zÀ-ÿ0-9_]+)\s*\}{2,3}/g;
const PERIOD_BLANK_RE = /(per[ií]odo\s+de\s*)_{3,}/gi;

/** Nomes (canônicos) das variáveis usadas no corpo; "period" entra se houver "período de ____". */
export function extractVariables(html: string): string[] {
  const src = unwrapEditorChips(html || '');
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(VAR_RE.source, 'g');
  while ((m = re.exec(src))) set.add(canonicalVariable(m[1]));
  if (new RegExp(PERIOD_BLANK_RE.source, 'i').test(src)) set.add('period');
  return [...set];
}

/** Variáveis que podem ficar em branco sem bloquear a emissão. */
export const OPTIONAL_VARIABLES = new Set(['time_start', 'time_end', 'period']);

const V = (names: string) => String.raw`\{{2,3}\s*(?:${names})\s*\}{2,3}`;
const TIME_START = V('time_start|hora_inicio|horario_inicio');
const TIME_END = V('time_end|hora_fim|horario_fim');
const PERIOD_VAR = V('period|periodo');

/**
 * Remove do texto as frases de horário/período quando não há valor:
 *  - ', no período de {{time_start}} às {{time_end}}' e 'no horário das {{time_start}} às {{time_end}}' (com os dois vazios);
 *  - linhas inteiras como 'Horário: {{time_start}} - {{time_end}}';
 *  - ', no período de {{period}}' / 'pelo período de ____' (período vazio).
 */
function dropEmptyOptionalClauses(src: string, get: (k: string) => string): string {
  let out = src;
  if (!get('time_start') && !get('time_end')) {
    out = out.replace(new RegExp(String.raw`[,;]?\s*(?:no\s+|em\s+)?(?:per[ií]odo|hor[áa]rio)\s+(?:de|das|entre)?\s*${TIME_START}\s*(?:às|as|a|até|e|-|–)\s*${TIME_END}`, 'gi'), '');
    out = out.replace(new RegExp(String.raw`^[^\n<]*${TIME_START}[^\n<]*${TIME_END}[^\n<]*\n?`, 'gim'), '');
  }
  if (!get('period')) {
    out = out.replace(new RegExp(String.raw`[,;]?\s*(?:no\s+|pelo\s+)?per[ií]odo\s+de\s*${PERIOD_VAR}`, 'gi'), '');
    // 'período de ______' (linha em branco do modelo, sem variável)
    out = out.replace(/[,;]?[ 	]*(?:no[ 	]+|pelo[ 	]+)?per[ií]odo[ 	]+de[ 	]*_{3,}/gi, '');
  }
  return out;
}

export interface ApplyResult { html: string; missing: string[] }

/**
 * Substitui as variáveis. Valor ausente => "__________" no texto e o nome entra em `missing`
 * (a emissão deve ser bloqueada quando `missing` não estiver vazio). Aceita {{x}} e {{{x}}}.
 */
export function applyTemplateVariables(html: string, values: Record<string, string | undefined>): ApplyResult {
  const missing = new Set<string>();
  const get = (key: string) => {
    const v = values[key];
    return v === undefined || v === null ? '' : String(v).trim();
  };
  let out = unwrapEditorChips(html || '');
  // Horário e período são OPCIONAIS: sem valor, a frase correspondente some do documento (não bloqueia a emissão).
  out = dropEmptyOptionalClauses(out, get);
  out = out.replace(new RegExp(VAR_RE.source, 'g'), (_m, name: string) => {
    const key = canonicalVariable(name);
    const v = get(key);
    if (!v) {
      if (OPTIONAL_VARIABLES.has(key)) return '____';
      missing.add(key);
      return BLANK;
    }
    return escapeHtml(v);
  });
  out = out.replace(new RegExp(PERIOD_BLANK_RE.source, 'gi'), (_m, pre: string) => {
    const v = get('period');
    if (!v) return '';
    return `${pre}${escapeHtml(v)}`;
  });
  out = out.replace(/[ 	]+([.,;:])/g, '$1');
  // rede de segurança: nenhuma chave dupla/tripla pode sobrar
  out = out.replace(/\{{2,}[^{}<>]{0,60}\}{2,}/g, BLANK);
  return { html: out, missing: [...missing] };
}

export const labelOfVariable = (key: string) => VARIABLE_LABELS[key] || key.replace(/_/g, ' ');
