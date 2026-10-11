/**
 * Gerador de documento clínico (PDF) — visual sóbrio de documento: papel branco, preto/cinza,
 * cabeçalho institucional e rodapé em todas as páginas, seções numeradas, assinatura ao final.
 * Não depende de React nem do restante do app: recebe um `ClinicalDocModel` já montado
 * (ver buildClinicalDocModel.ts) e devolve um jsPDF.
 */
import { jsPDF } from 'jspdf';
import type { SignatureImage } from '../../Documents/signatureImage';
import { autoSignatureSync } from '../../Documents/signatureStore';

/* ───────────── Modelo ───────────── */
export type Block =
  | { t: 'h3'; text: string; meta?: string }
  | { t: 'sub'; text: string }
  | { t: 'p'; text: string }
  | { t: 'field'; label: string; text: string }
  | { t: 'bullets'; items: string[] }
  | { t: 'table'; head: string[]; rows: string[][]; widths?: number[] }
  | { t: 'kv'; pairs: { label: string; value: string; full?: boolean }[] }
  | { t: 'note'; text: string };

export interface DocSection { title: string; blocks: Block[] }

export interface LogoImage { dataUrl: string; format: 'PNG' | 'JPEG'; width: number; height: number }

export interface ClinicInfo {
  name: string;
  legalName?: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  logo?: LogoImage | null;
}
export interface ProfessionalInfo { name: string; registry?: string; specialty?: string }

export type DocVariant = 'summary' | 'full' | 'shared' | 'restricted';

export interface ClinicalDocModel {
  variant: DocVariant;
  title: string;
  /** Linha pequena sob o título (ex.: período e nº de registros). */
  subtitle?: string;
  /** Faixa textual discreta sob o título (ex.: "Versão compartilhada"). */
  banner?: string;
  /** Selo textual no cabeçalho (ex.: "RESTRITO"). */
  stamp?: string;
  clinic: ClinicInfo;
  professional: ProfessionalInfo;
  patientName: string;
  /** Tabela de identificação do paciente (não usada na capa). */
  identification: { label: string; value: string; full?: boolean }[];
  /** Dados da capa (só quando `cover`). */
  coverFacts?: { label: string; value: string }[];
  emittedAt: Date;
  cover: boolean;
  toc: boolean;
  /** Termo de sigilo antes da assinatura. */
  confidentialityTerm: boolean;
  sections: DocSection[];
  /**
   * Assinatura eletrônica simples (imagem) acima da linha de assinatura. Omitido = usa a assinatura do perfil quando a
   * opção "inserir automaticamente" estiver ligada; null = não inserir. Sem rubrica nas outras páginas e sem carimbo.
   */
  signatureImage?: SignatureImage | null;
}

/* ───────────── Texto ───────────── */
const ALLOWED_EXTRA = new Set([0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2026, 0x20ac]);

/** Converte HTML simples em texto preservando parágrafos e listas. */
export function htmlToText(h: string): string {
  return h
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|h[1-6]|li|tr|ul|ol)\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '- ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
}

/** Texto seguro para o jsPDF (Latin-1 + pontuação WinAnsi). Nunca devolve "undefined"/"null". */
export function clean(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (/<[a-z!/][^>]*>/i.test(s)) s = htmlToText(s);
  let out = '';
  for (const ch of s.replace(/\r\n?/g, '\n').replace(/\t/g, ' ')) {
    const c = ch.codePointAt(0)!;
    if (c === 0x0a) out += '\n';
    else if (c < 0x20 || c === 0x7f) out += ' ';
    else if (c === 0xa0 || c === 0x200b) out += ' ';
    else if (c <= 0xff || ALLOWED_EXTRA.has(c)) out += ch;
    // demais caracteres (emojis, símbolos) são descartados
  }
  return out.split('\n').map(l => l.replace(/[ ]{2,}/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

const pad = (n: number) => String(n).padStart(2, '0');
export const fmtDateTimeBR = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const fmtDateBR = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const fmtLongDateBR = (d: Date) => `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;

export const SECRECY_NOTICE = 'Documento sigiloso — uso restrito a profissionais autorizados, nos termos do Código de Ética e da LGPD.';
export const CONFIDENTIALITY_TERM =
  'Este documento contém informações de saúde sujeitas a sigilo profissional e é protegido pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018) ' +
  'e pelo Código de Ética Profissional. É destinado exclusivamente ao uso por profissionais autorizados e ao titular dos dados. ' +
  'É vedada a divulgação, reprodução ou o repasse a terceiros sem consentimento do titular ou determinação legal.';

/* ───────────── Logo ───────────── */
/** Carrega uma imagem como PNG (data URL). Qualquer falha (CORS, 404, formato) devolve null. */
export async function loadLogoImage(url?: string | null, timeoutMs = 8000): Promise<LogoImage | null> {
  if (!url || typeof document === 'undefined') return null;
  try {
    const work = (async (): Promise<LogoImage | null> => {
      let src = url;
      let revoke: string | null = null;
      if (!url.startsWith('data:')) {
        try {
          const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
          if (!res.ok) throw new Error('http ' + res.status);
          src = URL.createObjectURL(await res.blob());
          revoke = src;
        } catch { src = url; }
      }
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('img'));
        i.src = src;
      });
      try {
        const w0 = img.naturalWidth || img.width; const h0 = img.naturalHeight || img.height;
        if (!w0 || !h0) return null;
        const k = Math.min(1, 480 / Math.max(w0, h0));
        const w = Math.max(1, Math.round(w0 * k)); const h = Math.max(1, Math.round(h0 * k));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(img, 0, 0, w, h);
        return { dataUrl: canvas.toDataURL('image/png'), format: 'PNG', width: w, height: h };
      } finally { if (revoke) URL.revokeObjectURL(revoke); }
    })();
    return await Promise.race([work, new Promise<null>(r => setTimeout(() => r(null), timeoutMs))]);
  } catch { return null; }
}

/* ───────────── Renderização ───────────── */
const PW = 210; const PH = 297; const M = 20; const CW = PW - M * 2;
const BOTTOM = 275;          // última linha de conteúdo
const FOOTER_RULE = 279;
const INK: [number, number, number] = [20, 20, 20];
const GREY: [number, number, number] = [95, 95, 95];
const LINE: [number, number, number] = [150, 150, 150];

interface Cell { text: string; w: number; bold?: boolean; italic?: boolean; grey?: boolean }

export function renderClinicalPdf(m: ClinicalDocModel): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: `${m.title} - ${clean(m.patientName)}`, subject: m.title, author: clean(m.professional.name), creator: clean(m.clinic.name) });

  const clinicName = clean(m.clinic.name) || 'Clínica';
  const profName = clean(m.professional.name) || 'Profissional';
  const emitted = m.emittedAt;
  let y = 0;
  let TOP = 40;

  /* ── Cabeçalho (medido uma vez, desenhado em todas as páginas) ── */
  const logo = m.clinic.logo || null;
  const LOGO_BOX = 18;
  const logoDims = (box: number) => {
    if (!logo) return { w: 0, h: 0 };
    const r = logo.width / logo.height;
    return r >= 1 ? { w: box, h: box / r } : { w: box * r, h: box };
  };
  const stampW = m.stamp ? 30 : 0;
  const textX = M + (logo ? LOGO_BOX + 4 : 0);
  const textW = CW - (logo ? LOGO_BOX + 4 : 0) - stampW;
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
  const headerLines = (): string[] => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    const out: string[] = [];
    const legal = clean(m.clinic.legalName);
    if (legal && legal.toLowerCase() !== clinicName.toLowerCase()) out.push(...doc.splitTextToSize(legal, textW));
    if (infoParts.length) out.push(...doc.splitTextToSize(infoParts.join('   |   '), textW));
    if (m.clinic.address) out.push(...doc.splitTextToSize(clean(m.clinic.address), textW));
    out.push(...doc.splitTextToSize(profParts.join('  -  '), textW));
    return out;
  };
  const hLines = headerLines();
  const HEAD_NAME_Y = 14;
  const headTextBottom = HEAD_NAME_Y + 1.5 + hLines.length * 3.3;
  const headBottom = Math.max(headTextBottom, 12 + (logo ? LOGO_BOX : 0)) + 2;
  TOP = headBottom + 9;

  const drawHeader = () => {
    if (logo) {
      const d = logoDims(LOGO_BOX);
      try { doc.addImage(logo.dataUrl, logo.format, M, 12 + (LOGO_BOX - d.h) / 2, d.w, d.h, undefined, 'FAST'); } catch { /* logo inválido: segue sem imagem */ }
    }
    doc.setTextColor(...INK);
    doc.setFont('times', 'bold'); doc.setFontSize(12);
    doc.text(doc.splitTextToSize(clinicName, textW)[0], textX, HEAD_NAME_Y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GREY);
    hLines.forEach((l, i) => doc.text(l, textX, HEAD_NAME_Y + 4.4 + i * 3.3));
    if (m.stamp) {
      doc.setDrawColor(...INK); doc.setLineWidth(0.4);
      doc.rect(PW - M - 27, 12, 27, 8);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...INK);
      doc.text(clean(m.stamp), PW - M - 13.5, 17.4, { align: 'center' });
    }
    doc.setDrawColor(...INK); doc.setLineWidth(0.35);
    doc.line(M, headBottom, PW - M, headBottom);
  };

  /* ── Rodapé ── */
  const drawFooter = (pg: number, total: number) => {
    doc.setDrawColor(...LINE); doc.setLineWidth(0.2);
    doc.line(M, FOOTER_RULE, PW - M, FOOTER_RULE);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GREY);
    const right = `Página ${pg} de ${total}`;
    const rightW = doc.getTextWidth(right);
    doc.text(doc.splitTextToSize(clinicName, CW - rightW - 4)[0], M, FOOTER_RULE + 4);
    doc.text(right, PW - M, FOOTER_RULE + 4, { align: 'right' });
    doc.text(doc.splitTextToSize(`Documento gerado em ${fmtDateTimeBR(emitted)} por ${profName}`, CW)[0], M, FOOTER_RULE + 7.6);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(6.6);
    doc.text(doc.splitTextToSize(SECRECY_NOTICE, CW), M, FOOTER_RULE + 11.2);
  };

  /* ── Primitivas de fluxo ── */
  const newPage = () => { doc.addPage(); y = TOP; };
  const ensure = (h: number) => { if (y + h > BOTTOM) newPage(); };
  const setBody = (style: 'normal' | 'bold' | 'italic' = 'normal', size = 10.5) => {
    doc.setFont('times', style); doc.setFontSize(size); doc.setTextColor(...INK);
  };
  const LH = 4.9;

  const paragraph = (text: string, indent = 0, style: 'normal' | 'bold' | 'italic' = 'normal', size = 10.5, lh = LH) => {
    const t = clean(text);
    if (!t) return;
    setBody(style, size);
    for (const para of t.split('\n')) {
      if (!para.trim()) { y += lh * 0.5; continue; }
      const lines: string[] = doc.splitTextToSize(para, CW - indent);
      lines.forEach((ln, i) => {
        ensure(i === 0 && lines.length > 1 ? lh * 2 : lh);
        setBody(style, size);
        doc.text(ln, M + indent, y);
        y += lh;
      });
      y += 1;
    }
  };

  const field = (label: string, text: string) => {
    const t = clean(text); const l = clean(label);
    if (!t) return;
    setBody('bold', 10.5);
    const lw = doc.getTextWidth(`${l}: `);
    setBody('normal', 10.5);
    if (!t.includes('\n') && lw + doc.getTextWidth(t) <= CW) {
      ensure(LH);
      setBody('bold', 10.5); doc.text(`${l}:`, M, y);
      setBody('normal', 10.5); doc.text(t, M + lw, y);
      y += LH + 1;
      return;
    }
    ensure(LH * 3);
    setBody('bold', 10.5); doc.text(`${l}:`, M, y); y += LH;
    paragraph(t, 0);
    y += 0.5;
  };

  const sub = (text: string) => {
    const t = clean(text); if (!t) return;
    ensure(LH * 3);
    y += 1;
    setBody('bold', 10); doc.text(t, M, y); y += LH + 0.6;
  };

  const h3 = (text: string, meta?: string) => {
    ensure(LH * 4);
    y += 2;
    setBody('bold', 10.5);
    const metaT = clean(meta);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const metaW = metaT ? Math.min(doc.getTextWidth(metaT), CW * 0.5) : 0;
    setBody('bold', 10.5);
    const titleLines: string[] = doc.splitTextToSize(clean(text), CW - metaW - (metaW ? 4 : 0));
    titleLines.forEach((ln, i) => { if (i > 0) ensure(LH); doc.text(ln, M, y); if (i < titleLines.length - 1) y += LH; });
    if (metaT) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GREY);
      doc.text(doc.splitTextToSize(metaT, CW * 0.5)[0], PW - M, y, { align: 'right' });
    }
    y += 1.6;
    doc.setDrawColor(...LINE); doc.setLineWidth(0.15);
    doc.line(M, y, PW - M, y);
    y += LH - 0.6;
  };

  const bullets = (items: string[]) => {
    const list = items.map(clean).filter(Boolean);
    list.forEach(it => {
      setBody('normal', 10.5);
      const lines: string[] = doc.splitTextToSize(it, CW - 5);
      lines.forEach((ln, i) => {
        ensure(i === 0 && lines.length > 1 ? LH * 2 : LH);
        setBody('normal', 10.5);
        if (i === 0) doc.text('-', M + 1, y);
        doc.text(ln, M + 5, y);
        y += LH;
      });
      y += 0.6;
    });
  };

  const note = (text: string) => paragraph(text, 0, 'italic', 9, 4.2);

  /* Tabela genérica por linhas de células */
  const PAD = 1.6; const TLH = 4;
  const drawRows = (rows: Cell[][], opts: { headRow?: Cell[]; borders?: boolean } = {}) => {
    const prep = (cells: Cell[], isHead: boolean) => {
      const wrapped = cells.map(c => {
        doc.setFont('helvetica', c.bold || isHead ? 'bold' : c.italic ? 'italic' : 'normal'); doc.setFontSize(8.5);
        const t = clean(c.text) || '-';
        return doc.splitTextToSize(t, c.w - PAD * 2) as string[];
      });
      return { cells, wrapped, h: Math.max(...wrapped.map(w => w.length), 1) * TLH + PAD * 2 };
    };
    const headP = opts.headRow ? prep(opts.headRow, true) : null;
    const maxRowH = BOTTOM - TOP - (headP ? headP.h : 0) - 2;
    const drawRow = (p: ReturnType<typeof prep>, isHead: boolean) => {
      let lines = p.wrapped; let h = p.h;
      if (h > maxRowH) { // linha maior que a página: corta o excesso
        const maxLines = Math.max(1, Math.floor((maxRowH - PAD * 2) / TLH));
        lines = p.wrapped.map(w => w.length > maxLines ? [...w.slice(0, maxLines - 1), w[maxLines - 1].replace(/\s*\S{0,3}$/, '') + '...'] : w);
        h = maxRowH;
      }
      let x = M;
      doc.setDrawColor(...LINE); doc.setLineWidth(0.15);
      p.cells.forEach((c, i) => {
        if (opts.borders !== false) doc.rect(x, y, c.w, h);
        doc.setFont('helvetica', c.bold || isHead ? 'bold' : c.italic ? 'italic' : 'normal'); doc.setFontSize(8.5);
        doc.setTextColor(...(c.grey ? GREY : INK));
        lines[i].forEach((ln, k) => doc.text(ln, x + PAD, y + PAD + 2.9 + k * TLH));
        x += c.w;
      });
      if (isHead) { doc.setDrawColor(...INK); doc.setLineWidth(0.35); doc.line(M, y + h, M + CW, y + h); }
      y += h;
    };
    if (headP) { ensure(headP.h + (rows[0] ? Math.min(prep(rows[0], false).h, 30) : 0)); drawRow(headP, true); }
    rows.forEach(r => {
      const p = prep(r, false);
      const need = Math.min(p.h, maxRowH);
      if (y + need > BOTTOM) { newPage(); if (headP) drawRow(headP, true); }
      drawRow(p, false);
    });
    y += 3;
  };

  const table = (head: string[], rows: string[][], widths?: number[]) => {
    if (!rows.length) return;
    const n = head.length;
    const fr = widths && widths.length === n ? widths : head.map(() => 1);
    const sum = fr.reduce((a, b) => a + b, 0);
    const ws = fr.map(f => (f / sum) * CW);
    drawRows(rows.map(r => r.map((t, i) => ({ text: t, w: ws[i] }))), { headRow: head.map((t, i) => ({ text: t, w: ws[i] })) });
  };

  const kv = (pairs: { label: string; value: string; full?: boolean }[]) => {
    const LW = 27; const VW = (CW - LW * 2) / 2;
    const items = pairs.filter(p => clean(p.value));
    const rows: Cell[][] = [];
    let pending: { label: string; value: string } | null = null;
    const flush = () => {
      if (!pending) return;
      rows.push([{ text: pending.label, w: LW, bold: true, grey: true }, { text: pending.value, w: VW }, { text: '', w: LW }, { text: '', w: VW }]);
      pending = null;
    };
    items.forEach(p => {
      if (p.full) {
        flush();
        rows.push([{ text: p.label, w: LW, bold: true, grey: true }, { text: p.value, w: CW - LW }]);
      } else if (pending) {
        rows.push([
          { text: pending.label, w: LW, bold: true, grey: true }, { text: pending.value, w: VW },
          { text: p.label, w: LW, bold: true, grey: true }, { text: p.value, w: VW },
        ]);
        pending = null;
      } else pending = { label: p.label, value: p.value };
    });
    flush();
    if (rows.length) drawRows(rows);
  };

  const renderBlock = (b: Block) => {
    switch (b.t) {
      case 'h3': h3(b.text, b.meta); break;
      case 'sub': sub(b.text); break;
      case 'p': paragraph(b.text); break;
      case 'field': field(b.label, b.text); break;
      case 'bullets': bullets(b.items); break;
      case 'table': table(b.head, b.rows, b.widths); break;
      case 'kv': kv(b.pairs); break;
      case 'note': note(b.text); break;
    }
  };

  const bannerBox = (text: string) => {
    ensure(12);
    doc.setDrawColor(...INK); doc.setLineWidth(0.3);
    doc.rect(M + 20, y, CW - 40, 7.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...INK);
    doc.text(clean(text).toUpperCase(), PW / 2, y + 5, { align: 'center' });
    y += 14.5;
  };

  const sections = m.sections.filter(s => s.blocks.length > 0);

  /* ── Capa ── */
  if (m.cover) {
    let cy = 52;
    if (logo) {
      const d = logoDims(34);
      try { doc.addImage(logo.dataUrl, logo.format, (PW - d.w) / 2, cy, d.w, d.h, undefined, 'FAST'); } catch { /* sem logo */ }
      cy += d.h + 8;
    }
    doc.setTextColor(...INK); doc.setFont('times', 'bold'); doc.setFontSize(17);
    (doc.splitTextToSize(clinicName, CW) as string[]).forEach(l => { doc.text(l, PW / 2, cy, { align: 'center' }); cy += 7; });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GREY);
    const cLines: string[] = [];
    const legal = clean(m.clinic.legalName);
    if (legal && legal.toLowerCase() !== clinicName.toLowerCase()) cLines.push(legal);
    if (infoParts.length) cLines.push(...doc.splitTextToSize(infoParts.join('   |   '), CW));
    if (m.clinic.address) cLines.push(...doc.splitTextToSize(clean(m.clinic.address), CW));
    cLines.forEach(l => { doc.text(l, PW / 2, cy, { align: 'center' }); cy += 4.2; });
    cy += 8;
    doc.setDrawColor(...INK); doc.setLineWidth(0.35);
    doc.line(M + 30, cy, PW - M - 30, cy);
    cy += 26;
    doc.setFont('times', 'bold'); doc.setFontSize(26); doc.setTextColor(...INK);
    doc.text(clean(m.title).toUpperCase(), PW / 2, cy, { align: 'center' });
    cy += 9;
    if (m.stamp) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text(clean(m.stamp), PW / 2, cy, { align: 'center' });
      cy += 6;
    }
    if (m.banner) {
      y = cy; bannerBox(m.banner); cy = y;
    }
    cy += 14;
    doc.setFont('times', 'normal'); doc.setFontSize(12);
    doc.text('Paciente', PW / 2, cy, { align: 'center' }); cy += 6.5;
    doc.setFont('times', 'bold'); doc.setFontSize(16);
    (doc.splitTextToSize(clean(m.patientName) || 'Paciente', CW) as string[]).forEach(l => { doc.text(l, PW / 2, cy, { align: 'center' }); cy += 7; });
    cy += 10;
    y = cy;
    const facts = (m.coverFacts || []).filter(f => clean(f.value));
    if (facts.length) {
      const LW = 42;
      const startX = M + 15;
      drawRowsAt(facts, startX, CW - 30, LW);
    }
    function drawRowsAt(rows: { label: string; value: string }[], x0: number, w: number, lw: number) {
      doc.setDrawColor(...LINE); doc.setLineWidth(0.15);
      rows.forEach(r => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
        const lines: string[] = doc.splitTextToSize(clean(r.value), w - lw - 3);
        const h = lines.length * 4.6 + 3.4;
        doc.line(x0, y + h, x0 + w, y + h);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREY);
        doc.text(clean(r.label), x0, y + 5.2);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...INK);
        lines.forEach((ln, i) => doc.text(ln, x0 + lw, y + 5.2 + i * 4.6));
        y += h;
      });
    }
  }

  /* ── Sumário (página reservada, preenchida depois) ── */
  let tocPage = 0;
  if (m.cover && m.toc) { doc.addPage(); tocPage = doc.getNumberOfPages(); }
  if (m.cover) { doc.addPage(); y = TOP; }
  else { y = TOP; }

  /* ── Título e identificação (documentos sem capa) ── */
  if (!m.cover) {
    y += 2;
    doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(...INK);
    (doc.splitTextToSize(clean(m.title).toUpperCase(), CW) as string[]).forEach(l => { doc.text(l, PW / 2, y, { align: 'center' }); y += 6.5; });
    if (m.subtitle) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GREY);
      (doc.splitTextToSize(clean(m.subtitle), CW) as string[]).forEach(l => { doc.text(l, PW / 2, y, { align: 'center' }); y += 4; });
    }
    y += 3;
    if (m.banner) bannerBox(m.banner);
    if (m.identification.length) {
      ensure(30);
      doc.setFont('times', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...INK);
      doc.text('IDENTIFICAÇÃO DO PACIENTE', M, y); y += 2.5;
      kv(m.identification);
      y += 2;
    }
  }

  /* ── Corpo ── */
  const sectionPages: number[] = [];
  sections.forEach((s, i) => {
    ensure(42);
    sectionPages[i] = doc.getNumberOfPages();
    y += 3;
    doc.setFont('times', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...INK);
    const title = `${i + 1}. ${clean(s.title).toUpperCase()}`;
    doc.text(doc.splitTextToSize(title, CW)[0], M, y);
    y += 1.8;
    doc.setDrawColor(...INK); doc.setLineWidth(0.3);
    doc.line(M, y, PW - M, y);
    y += LH + 0.5;
    s.blocks.forEach(renderBlock);
    y += 2;
  });
  if (!sections.length) paragraph('Não há registros a apresentar para os critérios selecionados.', 0, 'italic');

  /* ── Encerramento: termo de sigilo e assinatura ── */
  if (m.confidentialityTerm) {
    ensure(52);
    y += 3;
    doc.setFont('times', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...INK);
    doc.text('TERMO DE SIGILO', M, y); y += 1.8;
    doc.setDrawColor(...LINE); doc.setLineWidth(0.15); doc.line(M, y, PW - M, y); y += LH;
    paragraph(CONFIDENTIALITY_TERM, 0, 'normal', 9.5, 4.4);
  }
  const sigImg = m.signatureImage !== undefined ? m.signatureImage : autoSignatureSync();
  ensure(sigImg ? 52 : 46);
  y += 8;
  setBody('normal', 10.5);
  doc.text(`Emitido em ${fmtLongDateBR(emitted)}.`, PW / 2, y, { align: 'center' });
  y += sigImg ? 16 : 20;
  if (sigImg) {
    const r = sigImg.width / sigImg.height;
    let ih = 11; let iw = ih * r;
    if (iw > 52) { iw = 52; ih = iw / r; }
    try { doc.addImage(sigImg.dataUrl, 'PNG', PW / 2 - iw / 2, y - 1.2 - ih, iw, ih, undefined, 'FAST'); } catch { /* imagem inválida: segue sem */ }
  }
  doc.setDrawColor(...INK); doc.setLineWidth(0.3);
  doc.line(PW / 2 - 40, y, PW / 2 + 40, y);
  y += 4.6;
  setBody('bold', 10.5); doc.text(profName, PW / 2, y, { align: 'center' }); y += 4.6;
  setBody('normal', 9.5);
  if (m.professional.registry) { doc.text(clean(m.professional.registry), PW / 2, y, { align: 'center' }); y += 4.2; }
  if (m.professional.specialty) { doc.text(clean(m.professional.specialty), PW / 2, y, { align: 'center' }); y += 4.2; }
  if (sigImg) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GREY);
    doc.text(doc.splitTextToSize(`Documento assinado eletronicamente por ${profName} em ${fmtDateTimeBR(emitted)}`, CW)[0], PW / 2, y + 1, { align: 'center' });
  }

  /* ── Sumário (agora com as páginas) ── */
  if (tocPage) {
    doc.setPage(tocPage);
    let ty = TOP + 2;
    doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(...INK);
    doc.text('SUMÁRIO', PW / 2, ty, { align: 'center' });
    ty += 12;
    sections.forEach((s, i) => {
      const label = `${i + 1}. ${clean(s.title)}`;
      const pg = String(sectionPages[i] || '');
      doc.setFont('times', 'normal'); doc.setFontSize(11.5);
      const lw = doc.getTextWidth(label); const pw = doc.getTextWidth(pg);
      const dotW = doc.getTextWidth('. ');
      const dots = Math.max(0, Math.floor((CW - lw - pw - 4) / dotW));
      doc.text(label, M, ty);
      doc.text('. '.repeat(dots), M + lw + 2, ty);
      doc.text(pg, PW - M, ty, { align: 'right' });
      ty += 8;
    });
  }

  /* ── Cabeçalho e rodapé em todas as páginas ── */
  const total = doc.getNumberOfPages();
  for (let pg = 1; pg <= total; pg++) {
    doc.setPage(pg);
    if (!(m.cover && pg === 1)) drawHeader();
    drawFooter(pg, total);
  }
  return doc;
}
