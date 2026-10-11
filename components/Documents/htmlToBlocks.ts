/**
 * Converte o HTML do editor (ou texto puro) em blocos para o gerador de PDF de documentos.
 * Preserva negrito, itálico, sublinhado, listas, alinhamentos e títulos. Sem DOM (roda em Node).
 */
export interface Run { text: string; b?: boolean; i?: boolean; u?: boolean }
export type Align = 'left' | 'center' | 'right' | 'justify';

export type DocBlock =
  | { t: 'para'; runs: Run[]; align: Align }
  | { t: 'heading'; runs: Run[]; align: Align }
  | { t: 'list'; ordered: boolean; items: Run[][] }
  | { t: 'spacer' };

const ENT: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', bull: '•', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’' };
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : m;
    }
    return ENT[e.toLowerCase()] ?? m;
  });
}

const BLOCK_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol', 'blockquote', 'tr', 'table', 'section', 'article']);
const HAS_STRUCTURE = /<\s*(p|div|br|li|ul|ol|h[1-6]|table|blockquote)\b/i;

const alignFrom = (attrs: string): Align | null => {
  const m = attrs.match(/text-align\s*:\s*(left|right|center|justify)/i) || attrs.match(/\balign\s*=\s*["']?(left|right|center|justify)/i);
  return m ? (m[1].toLowerCase() as Align) : null;
};

const sameStyle = (a: Run, b: Run) => !!a.b === !!b.b && !!a.i === !!b.i && !!a.u === !!b.u;
const pushRun = (runs: Run[], r: Run) => {
  if (!r.text) return;
  const last = runs[runs.length - 1];
  if (last && sameStyle(last, r)) last.text += r.text; else runs.push({ ...r });
};
const trimRuns = (runs: Run[]): Run[] => {
  const out = runs.map(r => ({ ...r }));
  while (out.length && !out[0].text.replace(/^\s+/, '')) out.shift();
  if (out.length) out[0].text = out[0].text.replace(/^\s+/, '');
  while (out.length && !out[out.length - 1].text.replace(/\s+$/, '')) out.pop();
  if (out.length) out[out.length - 1].text = out[out.length - 1].text.replace(/\s+$/, '');
  return out;
};
export const runsText = (runs: Run[]) => runs.map(r => r.text).join('');
const isEmptyRuns = (runs: Run[]) => !runsText(runs).replace(/\s+/g, '');

/** Texto puro: cada linha vira um parágrafo; linha vazia vira espaçamento. */
function plainTextToBlocks(text: string): DocBlock[] {
  const blocks: DocBlock[] = [];
  const lines = decodeEntities(text).replace(/\r\n?/g, '\n').split('\n');
  let prevBlank = false;
  for (const ln of lines) {
    if (!ln.trim()) { if (!prevBlank && blocks.length) blocks.push({ t: 'spacer' }); prevBlank = true; continue; }
    prevBlank = false;
    blocks.push({ t: 'para', runs: [{ text: ln.trim() }], align: 'justify' });
  }
  while (blocks.length && blocks[blocks.length - 1].t === 'spacer') blocks.pop();
  return blocks;
}

export function htmlToBlocks(input: string): DocBlock[] {
  const html = String(input || '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(style|script)[\s\S]*?<\/\1>/gi, '').replace(/<svg[\s\S]*?<\/svg>/gi, '');
  if (!html.trim()) return [];
  if (!HAS_STRUCTURE.test(html)) {
    // sem estrutura de bloco: ainda pode haver <b>/<i> inline; só trata como texto puro se não houver tags
    if (!/<[a-z][^>]*>/i.test(html)) return plainTextToBlocks(html);
  }
  const blocks: DocBlock[] = [];
  const style = { b: 0, i: 0, u: 0 };
  const alignStack: (Align | null)[] = [];
  const listStack: { ordered: boolean; items: Run[][] }[] = [];
  let runs: Run[] = [];
  let headingLevel = 0;
  let liOpen = false;
  let tdCount = 0;

  const curAlign = (): Align => {
    for (let k = alignStack.length - 1; k >= 0; k--) { const a = alignStack[k]; if (a) return a; }
    return 'justify';
  };
  const flush = (opts: { keepEmpty?: boolean } = {}) => {
    const trimmed = trimRuns(runs);
    runs = [];
    if (liOpen && listStack.length) { if (!isEmptyRuns(trimmed)) listStack[listStack.length - 1].items.push(trimmed); return; }
    if (isEmptyRuns(trimmed)) {
      if (opts.keepEmpty) { const last = blocks[blocks.length - 1]; if (last && last.t !== 'spacer') blocks.push({ t: 'spacer' }); }
      return;
    }
    blocks.push(headingLevel ? { t: 'heading', runs: trimmed, align: curAlign() === 'justify' ? 'left' : curAlign() } : { t: 'para', runs: trimmed, align: curAlign() });
  };
  const flushList = () => {
    const top = listStack.pop();
    if (top && top.items.length) blocks.push({ t: 'list', ordered: top.ordered, items: top.items });
  };

  const re = /<\/?([a-zA-Z0-9]+)([^>]*)>|([^<]+)|</g;
  let m: RegExpExecArray | null;
  const tagStack: { tag: string; align: Align | null; styleDelta: { b: number; i: number; u: number } }[] = [];
  while ((m = re.exec(html))) {
    if (m[3] !== undefined) {
      const raw = decodeEntities(m[3].replace(/\s+/g, ' '));
      if (raw) pushRun(runs, { text: raw, b: style.b > 0 || headingLevel > 0, i: style.i > 0, u: style.u > 0 });
      continue;
    }
    if (!m[1]) { pushRun(runs, { text: '<' }); continue; }
    const tag = m[1].toLowerCase();
    const closing = m[0][1] === '/';
    const attrs = m[2] || '';
    const selfClosing = /\/\s*$/.test(attrs);

    if (tag === 'br') { pushRun(runs, { text: '\n', b: style.b > 0, i: style.i > 0, u: style.u > 0 }); continue; }
    if (tag === 'hr') { flush(); blocks.push({ t: 'spacer' }); continue; }
    if (tag === 'img') continue;

    if (!closing && !selfClosing) {
      const delta = { b: 0, i: 0, u: 0 };
      if (tag === 'b' || tag === 'strong') delta.b = 1;
      if (tag === 'i' || tag === 'em') delta.i = 1;
      if (tag === 'u') delta.u = 1;
      if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(attrs)) delta.b = 1;
      if (/font-style\s*:\s*italic/i.test(attrs)) delta.i = 1;
      if (/text-decoration[^;"']*underline/i.test(attrs)) delta.u = 1;
      style.b += delta.b; style.i += delta.i; style.u += delta.u;
      const al = BLOCK_TAGS.has(tag) || tag === 'td' || tag === 'th' ? alignFrom(attrs) : null;
      tagStack.push({ tag, align: al, styleDelta: delta });
      if (BLOCK_TAGS.has(tag)) {
        if (tag === 'ul' || tag === 'ol') { flush(); listStack.push({ ordered: tag === 'ol', items: [] }); alignStack.push(al); continue; }
        if (tag === 'li') { flush(); liOpen = true; alignStack.push(al); continue; }
        flush();
        if (/^h[1-6]$/.test(tag)) headingLevel = Number(tag[1]);
        alignStack.push(al);
        if (tag === 'tr') tdCount = 0;
      } else if (tag === 'td' || tag === 'th') {
        if (tdCount++ > 0) pushRun(runs, { text: '   ' });
      }
      continue;
    }

    if (closing) {
      // desempilha até a tag correspondente
      let idx = -1;
      for (let k = tagStack.length - 1; k >= 0; k--) if (tagStack[k].tag === tag) { idx = k; break; }
      if (idx < 0) continue;
      while (tagStack.length > idx) {
        const t = tagStack.pop()!;
        style.b -= t.styleDelta.b; style.i -= t.styleDelta.i; style.u -= t.styleDelta.u;
        if (BLOCK_TAGS.has(t.tag)) {
          if (t.tag === 'li') { flush(); liOpen = false; alignStack.pop(); }
          else if (t.tag === 'ul' || t.tag === 'ol') { flush(); flushList(); alignStack.pop(); }
          else {
            flush({ keepEmpty: t.tag === 'p' || t.tag === 'div' });
            if (/^h[1-6]$/.test(t.tag)) headingLevel = 0;
            alignStack.pop();
          }
        }
      }
    }
  }
  flush();
  while (listStack.length) flushList();
  while (blocks.length && blocks[0].t === 'spacer') blocks.shift();
  while (blocks.length && blocks[blocks.length - 1].t === 'spacer') blocks.pop();
  // colapsa espaçadores consecutivos
  return blocks.filter((b, i) => !(b.t === 'spacer' && blocks[i - 1]?.t === 'spacer'));
}

/** Texto simples do bloco (para detecção de linhas de local/data e assinatura). */
export const blockText = (b: DocBlock): string =>
  b.t === 'para' || b.t === 'heading' ? runsText(b.runs).replace(/\s+/g, ' ').trim() : b.t === 'list' ? b.items.map(runsText).join(' ') : '';

const TRAILING_DATE_RE = /^[^,\n]{2,60},\s*(\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{2,4}|\d{1,2}\s+de\s+\p{L}+\s+de\s+\d{4})\s*\.?$/u;
const RULE_ONLY_RE = /^[_\-–—=.\s]{4,}$/;

/**
 * Remove do fim do corpo a linha "Cidade, data." e a linha de assinatura em branco ("______"),
 * porque o gerador já imprime local/data por extenso e a assinatura (sem duplicar).
 */
export function stripTrailingClosing(blocks: DocBlock[]): { blocks: DocBlock[]; hadDate: boolean; hadSignatureRule: boolean } {
  const out = [...blocks];
  let hadDate = false; let hadSignatureRule = false;
  for (let guard = 0; guard < 6 && out.length; guard++) {
    const last = out[out.length - 1];
    if (last.t === 'spacer') { out.pop(); continue; }
    const txt = blockText(last);
    if (last.t === 'para' && TRAILING_DATE_RE.test(txt)) { out.pop(); hadDate = true; continue; }
    if (last.t === 'para' && RULE_ONLY_RE.test(txt)) { out.pop(); hadSignatureRule = true; continue; }
    break;
  }
  return { blocks: out, hadDate, hadSignatureRule };
}

/** Texto simples (várias linhas) -> blocos de parágrafo. */
export const textToBlocks = (text: string): DocBlock[] => plainTextToBlocks(text || '');
