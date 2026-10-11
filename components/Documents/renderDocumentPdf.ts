/**
 * PDF de documento livre (recibo, atestado, declaração, encaminhamento, relatório...) na MESMA estrutura
 * sóbria do PDF do prontuário (components/Records/pdf/clinicalDocument.ts): cabeçalho institucional e rodapé
 * em todas as páginas (gerado em/por, Página X de Y, sigilo), título centralizado, identificação do paciente,
 * corpo justificado em Times, local/data por extenso e assinatura ao final.
 *
 * Não edita o gerador original: importa tipos, limpeza de texto e constantes dele. As medidas do cabeçalho e
 * do rodapé são as mesmas (mantenha-as alinhadas se o gerador clínico mudar).
 */
import { jsPDF } from 'jspdf';
import {
  clean, fmtDateTimeBR, SECRECY_NOTICE,
  type ClinicInfo, type ProfessionalInfo, type LogoImage,
} from '../Records/pdf/clinicalDocument';
import type { DocBlock, Run } from './htmlToBlocks';
import { longDatePt } from './documentVariables';

export interface DocumentModel {
  title: string;
  subtitle?: string;
  clinic: ClinicInfo;
  professional: ProfessionalInfo;
  /** Tabela de identificação (ex.: Paciente, CPF). Vazia = sem tabela. */
  identification: { label: string; value: string; full?: boolean }[];
  identificationTitle?: string;
  blocks: DocBlock[];
  /** "Tatuí/SP" (cidade/UF; nunca CEP). */
  place?: string;
  /** Data do documento (impressa por extenso ao final). */
  docDate: Date;
  /** Momento da geração (rodapé). */
  emittedAt: Date;
  /** Assinatura: por padrão usa o profissional do cabeçalho. */
  signature?: { name?: string; registry?: string; specialty?: string } | false;
  /** Logo opcional no rodapé (papel timbrado). */
  footerLogo?: LogoImage | null;
}

const PW = 210; const PH = 297; const M = 20; const CW = PW - M * 2;
const BOTTOM = 275; const FOOTER_RULE = 279;
const INK: [number, number, number] = [20, 20, 20];
const GREY: [number, number, number] = [95, 95, 95];
const LINE: [number, number, number] = [150, 150, 150];

/** Texto seguro para o jsPDF sem apagar espaços das bordas (diferente de clean(), que dá trim). */
const ALLOWED_EXTRA = new Set([0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2026, 0x20ac]);
function safeRun(s: string): string {
  let out = '';
  for (const ch of String(s ?? '').replace(/\r\n?/g, '\n').replace(/\t/g, ' ')) {
    const c = ch.codePointAt(0)!;
    if (c === 0x0a) out += '\n';
    else if (c < 0x20 || c === 0x7f || c === 0xa0 || c === 0x200b) out += ' ';
    else if (c <= 0xff || ALLOWED_EXTRA.has(c)) out += ch;
  }
  return out;
}

interface Word { text: string; b?: boolean; i?: boolean; u?: boolean; w: number; sp: boolean }
interface Line { words: Word[]; forced: boolean }

export function renderDocumentPdf(m: DocumentModel): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const clinicName = clean(m.clinic.name) || 'Clínica';
  const profName = clean(m.professional.name) || 'Profissional';
  doc.setProperties({ title: m.title, subject: m.title, author: profName, creator: clinicName });
  let y = 0;

  /* ── Cabeçalho (idêntico ao do prontuário) ── */
  const logo = m.clinic.logo || null;
  const LOGO_BOX = 18;
  const logoDims = (box: number, l: LogoImage) => { const r = l.width / l.height; return r >= 1 ? { w: box, h: box / r } : { w: box * r, h: box }; };
  const textX = M + (logo ? LOGO_BOX + 4 : 0);
  const textW = CW - (logo ? LOGO_BOX + 4 : 0);
  const infoParts = [
    m.clinic.cnpj ? `CNPJ: ${clean(m.clinic.cnpj)}` : '',
    m.clinic.phone ? `Tel.: ${clean(m.clinic.phone)}` : '',
    m.clinic.email ? `E-mail: ${clean(m.clinic.email)}` : '',
    m.clinic.website ? clean(m.clinic.website) : '',
  ].filter(Boolean);
  const profParts = [
    `Responsável: ${profName}`,
    m.professional.registry ? clean(m.professional.registry) : '',
    m.professional.specialty ? clean(m.professional.specialty) : '',
  ].filter(Boolean);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  const hLines: string[] = [];
  const legal = clean(m.clinic.legalName);
  if (legal && legal.toLowerCase() !== clinicName.toLowerCase()) hLines.push(...doc.splitTextToSize(legal, textW));
  if (infoParts.length) hLines.push(...doc.splitTextToSize(infoParts.join('   |   '), textW));
  if (m.clinic.address) hLines.push(...doc.splitTextToSize(clean(m.clinic.address), textW));
  hLines.push(...doc.splitTextToSize(profParts.join('  -  '), textW));
  const HEAD_NAME_Y = 14;
  const headBottom = Math.max(HEAD_NAME_Y + 1.5 + hLines.length * 3.3, 12 + (logo ? LOGO_BOX : 0)) + 2;
  const TOP = headBottom + 9;

  const drawHeader = () => {
    if (logo) {
      const d = logoDims(LOGO_BOX, logo);
      try { doc.addImage(logo.dataUrl, logo.format, M, 12 + (LOGO_BOX - d.h) / 2, d.w, d.h, undefined, 'FAST'); } catch { /* logo inválido */ }
    }
    doc.setTextColor(...INK);
    doc.setFont('times', 'bold'); doc.setFontSize(12);
    doc.text(doc.splitTextToSize(clinicName, textW)[0], textX, HEAD_NAME_Y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GREY);
    hLines.forEach((l, i) => doc.text(l, textX, HEAD_NAME_Y + 4.4 + i * 3.3));
    doc.setDrawColor(...INK); doc.setLineWidth(0.35);
    doc.line(M, headBottom, PW - M, headBottom);
  };

  /* ── Rodapé (idêntico ao do prontuário; logo opcional à direita) ── */
  const fLogo = m.footerLogo || null;
  const FLOGO_H = 9;
  const drawFooter = (pg: number, total: number) => {
    doc.setDrawColor(...LINE); doc.setLineWidth(0.2);
    doc.line(M, FOOTER_RULE, PW - M, FOOTER_RULE);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GREY);
    const right = `Página ${pg} de ${total}`;
    const rightW = doc.getTextWidth(right);
    doc.text(doc.splitTextToSize(clinicName, CW - rightW - 4)[0], M, FOOTER_RULE + 4);
    doc.text(right, PW - M, FOOTER_RULE + 4, { align: 'right' });
    let textWidth = CW;
    if (fLogo) {
      const d = logoDims(FLOGO_H, fLogo);
      const w = Math.min(d.w, 28); const h = d.w > 28 ? d.h * (28 / d.w) : d.h;
      try { doc.addImage(fLogo.dataUrl, fLogo.format, PW - M - w, FOOTER_RULE + 5.4, w, h, undefined, 'FAST'); } catch { /* sem logo */ }
      textWidth = CW - w - 4;
    }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GREY);
    doc.text(doc.splitTextToSize(`Documento gerado em ${fmtDateTimeBR(m.emittedAt)} por ${profName}`, textWidth)[0], M, FOOTER_RULE + 7.6);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(6.6);
    doc.text(doc.splitTextToSize(SECRECY_NOTICE, textWidth), M, FOOTER_RULE + 11.2);
  };

  /* ── Fluxo ── */
  const BODY = 11; const LH = 5.5;
  const newPage = () => { doc.addPage(); y = TOP; };
  const ensure = (h: number) => { if (y + h > BOTTOM) newPage(); };
  const fontOf = (r: { b?: boolean; i?: boolean }) => (r.b && r.i ? 'bolditalic' : r.b ? 'bold' : r.i ? 'italic' : 'normal');
  const setBody = (r: { b?: boolean; i?: boolean } = {}, size = BODY) => { doc.setFont('times', fontOf(r)); doc.setFontSize(size); doc.setTextColor(...INK); };

  /** Quebra runs em linhas medidas (palavras com estilo). */
  const layout = (runs: Run[], width: number, size = BODY): Line[] => {
    const lines: Line[] = [{ words: [], forced: false }];
    let cur = 0; let pendingSpace = false;
    const spaceW = (r: Run) => { setBody(r, size); return doc.getTextWidth(' '); };
    for (const r of runs) {
      const txt = safeRun(r.text);
      const parts = txt.split('\n');
      parts.forEach((part, pi) => {
        if (pi > 0) { lines[lines.length - 1].forced = true; lines.push({ words: [], forced: false }); cur = 0; pendingSpace = false; }
        const tokens = part.split(/( +)/);
        for (const tk of tokens) {
          if (!tk) continue;
          if (/^ +$/.test(tk)) { if (lines[lines.length - 1].words.length) pendingSpace = true; continue; }
          setBody(r, size);
          const w = doc.getTextWidth(tk);
          const line = lines[lines.length - 1];
          const sw = line.words.length && pendingSpace ? spaceW(r) : 0;
          if (line.words.length && cur + sw + w > width + 0.01) {
            lines.push({ words: [], forced: false }); cur = 0; pendingSpace = false;
            lines[lines.length - 1].words.push({ text: tk, b: r.b, i: r.i, u: r.u, w, sp: false });
            cur = w;
          } else {
            line.words.push({ text: tk, b: r.b, i: r.i, u: r.u, w, sp: line.words.length > 0 && pendingSpace });
            cur += sw + w;
          }
          pendingSpace = false;
        }
      });
    }
    return lines.filter((l, i) => l.words.length || (i < lines.length - 1));
  };

  const drawLine = (line: Line, x0: number, width: number, align: string, last: boolean, size = BODY) => {
    if (!line.words.length) return;
    const natural = line.words.reduce((s, w, i) => s + w.w + (i > 0 && w.sp ? (setBody(w, size), doc.getTextWidth(' ')) : 0), 0);
    const justify = align === 'justify' && !last && !line.forced && line.words.length > 1;
    const gaps = line.words.filter((w, i) => i > 0 && w.sp).length;
    const extra = justify && gaps ? Math.max(0, width - natural) / gaps : 0;
    let x = x0;
    if (align === 'center') x = x0 + (width - natural) / 2;
    else if (align === 'right') x = x0 + width - natural;
    line.words.forEach((w, i) => {
      if (i > 0 && w.sp) { setBody(w, size); x += doc.getTextWidth(' ') + extra; }
      setBody(w, size);
      doc.text(w.text, x, y);
      if (w.u) { doc.setDrawColor(...INK); doc.setLineWidth(0.15); doc.line(x, y + 0.8, x + w.w, y + 0.8); }
      x += w.w;
    });
  };

  const paragraph = (runs: Run[], align: string, indent = 0, hang = 0, size = BODY) => {
    const lines = layout(runs, CW - indent, size);
    lines.forEach((ln, i) => {
      ensure(i === 0 && lines.length > 1 ? LH * 2 : LH);
      const isLast = i === lines.length - 1;
      drawLine(ln, M + indent + (i === 0 ? 0 : hang), CW - indent - (i === 0 ? 0 : hang), align, isLast, size);
      y += LH;
    });
    y += 1.2;
  };

  const kv = (pairs: { label: string; value: string; full?: boolean }[]) => {
    const LW = 27; const VW = (CW - LW * 2) / 2; const PAD = 1.6; const TLH = 4;
    interface Cell { text: string; w: number; bold?: boolean; grey?: boolean }
    const rows: Cell[][] = [];
    let pending: { label: string; value: string } | null = null;
    const flush = () => { if (pending) { rows.push([{ text: pending.label, w: LW, bold: true, grey: true }, { text: pending.value, w: VW }, { text: '', w: LW }, { text: '', w: VW }]); pending = null; } };
    pairs.filter(p => clean(p.value)).forEach(p => {
      if (p.full) { flush(); rows.push([{ text: p.label, w: LW, bold: true, grey: true }, { text: p.value, w: CW - LW }]); }
      else if (pending) { rows.push([{ text: pending.label, w: LW, bold: true, grey: true }, { text: pending.value, w: VW }, { text: p.label, w: LW, bold: true, grey: true }, { text: p.value, w: VW }]); pending = null; }
      else pending = { label: p.label, value: p.value };
    });
    flush();
    rows.forEach(cells => {
      const wrapped = cells.map(c => { doc.setFont('helvetica', c.bold ? 'bold' : 'normal'); doc.setFontSize(8.5); return doc.splitTextToSize(clean(c.text) || ' ', c.w - PAD * 2) as string[]; });
      const h = Math.max(...wrapped.map(w => w.length), 1) * TLH + PAD * 2;
      ensure(h);
      let x = M;
      doc.setDrawColor(...LINE); doc.setLineWidth(0.15);
      cells.forEach((c, i) => {
        doc.rect(x, y, c.w, h);
        doc.setFont('helvetica', c.bold ? 'bold' : 'normal'); doc.setFontSize(8.5); doc.setTextColor(...(c.grey ? GREY : INK));
        wrapped[i].forEach((ln, k) => doc.text(ln, x + PAD, y + PAD + 2.9 + k * TLH));
        x += c.w;
      });
      y += h;
    });
    if (rows.length) y += 3;
  };

  /* ── Título e identificação ── */
  y = TOP + 2;
  doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(...INK);
  (doc.splitTextToSize(clean(m.title).toUpperCase(), CW) as string[]).forEach(l => { doc.text(l, PW / 2, y, { align: 'center' }); y += 6.5; });
  if (m.subtitle) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GREY);
    (doc.splitTextToSize(clean(m.subtitle), CW) as string[]).forEach(l => { doc.text(l, PW / 2, y, { align: 'center' }); y += 4; });
  }
  y += 4;
  if (m.identification.some(p => clean(p.value))) {
    ensure(24);
    doc.setFont('times', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...INK);
    doc.text(clean(m.identificationTitle || 'IDENTIFICAÇÃO DO PACIENTE'), M, y); y += 2.5;
    kv(m.identification);
    y += 3;
  }

  /* ── Corpo ── */
  m.blocks.forEach(b => {
    if (b.t === 'spacer') { y += LH * 0.6; return; }
    if (b.t === 'para') { paragraph(b.runs, b.align); return; }
    if (b.t === 'heading') { ensure(LH * 3); y += 1; paragraph(b.runs.map(r => ({ ...r, b: true })), b.align === 'justify' ? 'left' : b.align); return; }
    if (b.t === 'list') {
      b.items.forEach((it, idx) => {
        const marker = b.ordered ? `${idx + 1}.` : '-';
        const lines = layout(it, CW - 8);
        lines.forEach((ln, i) => {
          ensure(i === 0 && lines.length > 1 ? LH * 2 : LH);
          if (i === 0) { setBody(); doc.text(marker, M + 2, y); }
          drawLine(ln, M + 8, CW - 8, 'justify', i === lines.length - 1);
          y += LH;
        });
        y += 0.8;
      });
      y += 1;
    }
  });

  /* ── Local, data e assinatura ── */
  if (m.signature !== false) {
    const sig = m.signature || {};
    ensure(54);
    y += 8;
    setBody();
    const dateLine = `${m.place ? `${clean(m.place)}, ` : ''}${longDatePt(m.docDate)}.`;
    doc.text(dateLine, PW / 2, y, { align: 'center' });
    y += 20;
    doc.setDrawColor(...INK); doc.setLineWidth(0.3);
    doc.line(PW / 2 - 40, y, PW / 2 + 40, y);
    y += 4.6;
    setBody({ b: true }); doc.text(clean(sig.name) || profName, PW / 2, y, { align: 'center' }); y += 4.6;
    setBody({}, 9.5);
    const reg = clean(sig.registry !== undefined ? sig.registry : m.professional.registry);
    if (reg) { doc.text(reg, PW / 2, y, { align: 'center' }); y += 4.2; }
    const spec = clean(sig.specialty !== undefined ? sig.specialty : m.professional.specialty);
    if (spec) { doc.text(spec, PW / 2, y, { align: 'center' }); y += 4.2; }
  }

  /* ── Cabeçalho e rodapé em todas as páginas ── */
  const total = doc.getNumberOfPages();
  for (let pg = 1; pg <= total; pg++) { doc.setPage(pg); drawHeader(); drawFooter(pg, total); }
  void PH;
  return doc;
}

/* ───────────── Saída (navegador) ───────────── */
export const pdfFileName = (title: string, who?: string) =>
  `${[title, who].filter(Boolean).join(' - ').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '') || 'Documento'}.pdf`;

/** Imprime o PDF gerado (layout idêntico ao arquivo baixado) usando um iframe oculto; cai para nova aba. */
export function printPdf(doc: jsPDF): void {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  let done = false;
  const cleanup = () => { setTimeout(() => { try { iframe.remove(); URL.revokeObjectURL(url); } catch { /* ok */ } }, 60000); };
  iframe.onload = () => {
    if (done) return; done = true;
    try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch { window.open(url, '_blank'); }
    cleanup();
  };
  iframe.src = url;
  document.body.appendChild(iframe);
  // se o onload não disparar (alguns navegadores com PDF), abre em nova aba
  setTimeout(() => { if (!done) { done = true; window.open(url, '_blank'); cleanup(); } }, 4000);
}
