/**
 * Versão Word (docx) do documento clínico: mesma estrutura do PDF (cabeçalho/rodapé reais do Word,
 * capa e sumário simples no Prontuário Completo), Times New Roman 11 pt, sem cores fortes.
 */
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, Header, Footer, PageNumber, Table, TableRow, TableCell,
  WidthType, BorderStyle, ImageRun, HeadingLevel, PageBreak, TabStopType,
} from 'docx';
import { clean, fmtDateBR, fmtDateTimeBR, fmtLongDateBR, SECRECY_NOTICE, CONFIDENTIALITY_TERM, type Block, type ClinicalDocModel } from './clinicalDocument';

const FONT = 'Times New Roman';
const SZ = 22; // 11 pt
const GREY = '555555';
const CM = 1134; // 20 mm em twips
const CONTENT_TW = 11906 - CM * 2;

const run = (t: string, o: { bold?: boolean; italics?: boolean; size?: number; color?: string; allCaps?: boolean } = {}) =>
  new TextRun({ text: t, font: FONT, size: o.size ?? SZ, bold: o.bold, italics: o.italics, color: o.color, allCaps: o.allCaps });

const para = (t: string, o: { bold?: boolean; italics?: boolean; size?: number; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; before?: number; after?: number; keepNext?: boolean } = {}) => {
  const lines = clean(t).split('\n');
  return new Paragraph({
    alignment: o.align, keepNext: o.keepNext, spacing: { before: o.before ?? 0, after: o.after ?? 100, line: 276 },
    children: lines.flatMap((l, i) => [run(l, o), ...(i < lines.length - 1 ? [new TextRun({ break: 1, font: FONT, size: o.size ?? SZ })] : [])]),
  });
};

const thin = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
const cellBorders = { top: thin, bottom: thin, left: thin, right: thin };

function tableOf(head: string[] | null, rows: string[][], widths?: number[]): Table {
  const n = head ? head.length : Math.max(...rows.map(r => r.length));
  const fr = widths && widths.length === n ? widths : Array.from({ length: n }, () => 1);
  const sum = fr.reduce((a, b) => a + b, 0);
  const tw = fr.map(f => Math.floor((f / sum) * CONTENT_TW));
  const mk = (cells: string[], isHead: boolean) => new TableRow({
    tableHeader: isHead, cantSplit: true,
    children: cells.map((c, i) => new TableCell({
      width: { size: tw[i], type: WidthType.DXA }, borders: cellBorders, margins: { top: 50, bottom: 50, left: 80, right: 80 },
      children: [new Paragraph({ spacing: { after: 0 }, children: [run(clean(c) || '-', { size: 18, bold: isHead })] })],
    })),
  });
  return new Table({
    width: { size: CONTENT_TW, type: WidthType.DXA }, columnWidths: tw,
    rows: [...(head ? [mk(head, true)] : []), ...rows.map(r => mk(r, false))],
  });
}

function kvTable(pairs: { label: string; value: string; full?: boolean }[]): Table {
  const items = pairs.filter(p => clean(p.value));
  const LW = Math.floor(CONTENT_TW * 0.16); const VW = Math.floor((CONTENT_TW - LW * 2) / 2);
  const cell = (t: string, w: number, bold: boolean, span = 1) => new TableCell({
    width: { size: w, type: WidthType.DXA }, columnSpan: span, borders: cellBorders, margins: { top: 50, bottom: 50, left: 80, right: 80 },
    children: [new Paragraph({ spacing: { after: 0 }, children: [run(clean(t), { size: 18, bold, color: bold ? GREY : undefined })] })],
  });
  const rows: TableRow[] = []; let pend: { label: string; value: string } | null = null;
  const flush = () => { if (pend) { rows.push(new TableRow({ cantSplit: true, children: [cell(pend.label, LW, true), cell(pend.value, VW, false), cell('', LW, false), cell('', VW, false)] })); pend = null; } };
  items.forEach(p => {
    if (p.full) { flush(); rows.push(new TableRow({ cantSplit: true, children: [cell(p.label, LW, true), cell(p.value, LW + VW * 2, false, 3)] })); }
    else if (pend) { rows.push(new TableRow({ cantSplit: true, children: [cell(pend.label, LW, true), cell(pend.value, VW, false), cell(p.label, LW, true), cell(p.value, VW, false)] })); pend = null; }
    else pend = { label: p.label, value: p.value };
  });
  flush();
  return new Table({ width: { size: CONTENT_TW, type: WidthType.DXA }, columnWidths: [LW, VW, LW, VW], rows });
}

function blockToNodes(b: Block): (Paragraph | Table)[] {
  switch (b.t) {
    case 'h3':
      return [new Paragraph({
        keepNext: true, spacing: { before: 200, after: 80 }, heading: HeadingLevel.HEADING_3,
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA', space: 2 } },
        tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_TW }],
        children: [run(clean(b.text), { bold: true }), ...(b.meta ? [run('\t' + clean(b.meta), { size: 16, color: GREY })] : [])],
      })];
    case 'sub': return [para(b.text, { bold: true, before: 100, after: 60, keepNext: true })];
    case 'p': return [para(b.text)];
    case 'note': return [para(b.text, { italics: true, size: 18, color: GREY })];
    case 'field': return [new Paragraph({ spacing: { after: 100, line: 276 }, children: [run(clean(b.label) + ': ', { bold: true }), run(clean(b.text))] })];
    case 'bullets': return b.items.map(clean).filter(Boolean).map(i => new Paragraph({ spacing: { after: 40 }, indent: { left: 360, hanging: 240 }, children: [run('-  ' + i)] }));
    case 'table': return b.rows.length ? [tableOf(b.head, b.rows, b.widths), new Paragraph({ spacing: { after: 100 }, children: [] })] : [];
    case 'kv': return [kvTable(b.pairs), new Paragraph({ spacing: { after: 100 }, children: [] })];
  }
}

function base64ToBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.split(',')[1] || '';
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function logoRun(m: ClinicalDocModel, box: number): ImageRun | null {
  const l = m.clinic.logo;
  if (!l) return null;
  try {
    const r = l.width / l.height;
    const w = r >= 1 ? box : Math.round(box * r); const h = r >= 1 ? Math.round(box / r) : box;
    return new ImageRun({ type: 'png', data: base64ToBytes(l.dataUrl), transformation: { width: w, height: h } });
  } catch { return null; }
}

export async function buildClinicalDocxBlob(m: ClinicalDocModel): Promise<Blob> {
  const clinicName = clean(m.clinic.name) || 'Clínica';
  const profName = clean(m.professional.name) || 'Profissional';
  const info = [m.clinic.cnpj && `CNPJ: ${clean(m.clinic.cnpj)}`, m.clinic.phone && `Tel.: ${clean(m.clinic.phone)}`, m.clinic.email && `E-mail: ${clean(m.clinic.email)}`, m.clinic.website && clean(m.clinic.website)].filter(Boolean).join('   |   ');
  const prof = [`Responsável: ${profName}`, m.professional.registry && clean(m.professional.registry), m.professional.specialty && clean(m.professional.specialty)].filter(Boolean).join('  -  ');
  const legal = clean(m.clinic.legalName);

  const textLines: Paragraph[] = [
    new Paragraph({ spacing: { after: 20 }, children: [run(clinicName, { bold: true, size: 24 })] }),
    ...(legal && legal.toLowerCase() !== clinicName.toLowerCase() ? [new Paragraph({ spacing: { after: 0 }, children: [run(legal, { size: 15, color: GREY })] })] : []),
    ...(info ? [new Paragraph({ spacing: { after: 0 }, children: [run(info, { size: 15, color: GREY })] })] : []),
    ...(m.clinic.address ? [new Paragraph({ spacing: { after: 0 }, children: [run(clean(m.clinic.address), { size: 15, color: GREY })] })] : []),
    new Paragraph({ spacing: { after: 0 }, children: [run(prof, { size: 15, color: GREY })] }),
  ];
  const noB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const lr = logoRun(m, 56);
  const headerChildren: (Paragraph | Table)[] = [];
  const cols = lr ? [Math.floor(CONTENT_TW * 0.14), Math.floor(CONTENT_TW * 0.86)] : [CONTENT_TW];
  const headCells: TableCell[] = [];
  if (lr) headCells.push(new TableCell({ width: { size: cols[0], type: WidthType.DXA }, borders: { top: noB, bottom: noB, left: noB, right: noB }, children: [new Paragraph({ children: [lr] })] }));
  headCells.push(new TableCell({ width: { size: cols[cols.length - 1], type: WidthType.DXA }, borders: { top: noB, bottom: noB, left: noB, right: noB }, children: textLines }));
  headerChildren.push(new Table({ width: { size: CONTENT_TW, type: WidthType.DXA }, columnWidths: cols, rows: [new TableRow({ children: headCells })] }));
  if (m.stamp) headerChildren.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 40, after: 0 }, children: [run(` ${clean(m.stamp)} `, { bold: true, size: 20 })], border: { top: thin, bottom: thin, left: thin, right: thin } }));
  headerChildren.push(new Paragraph({ spacing: { after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '222222', space: 1 } }, children: [] }));

  const header = new Header({ children: headerChildren });
  const footer = new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA', space: 4 } }, spacing: { after: 0 },
        tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_TW }],
        children: [run(clinicName, { size: 14, color: GREY }), new TextRun({ text: '\tPágina ', font: FONT, size: 14, color: GREY }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 14, color: GREY }), new TextRun({ text: ' de ', font: FONT, size: 14, color: GREY }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 14, color: GREY })],
      }),
      new Paragraph({ spacing: { after: 0 }, children: [run(`Documento gerado em ${fmtDateTimeBR(m.emittedAt)} por ${profName}`, { size: 14, color: GREY })] }),
      new Paragraph({ spacing: { after: 0 }, children: [run(SECRECY_NOTICE, { size: 13, italics: true, color: GREY })] }),
    ],
  });

  const sections = m.sections.filter(s => s.blocks.length > 0);
  const body: (Paragraph | Table)[] = [];

  if (!m.cover) {
    body.push(para(m.title.toUpperCase(), { bold: true, size: 30, align: AlignmentType.CENTER, before: 120, after: 60 }));
    if (m.subtitle) body.push(para(m.subtitle, { size: 17, color: GREY, align: AlignmentType.CENTER, after: 100 }));
    if (m.banner) body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 160 }, border: { top: thin, bottom: thin, left: thin, right: thin }, children: [run(clean(m.banner).toUpperCase(), { bold: true, size: 18 })] }));
    if (m.identification.length) {
      body.push(para('IDENTIFICAÇÃO DO PACIENTE', { bold: true, before: 120, after: 80, keepNext: true }));
      body.push(kvTable(m.identification), new Paragraph({ spacing: { after: 100 }, children: [] }));
    }
  }

  sections.forEach((s, i) => {
    body.push(new Paragraph({
      heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 280, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '222222', space: 2 } },
      children: [run(`${i + 1}. ${clean(s.title).toUpperCase()}`, { bold: true, size: 23 })],
    }));
    s.blocks.forEach(b => body.push(...blockToNodes(b)));
  });
  if (!sections.length) body.push(para('Não há registros a apresentar para os critérios selecionados.', { italics: true }));

  if (m.confidentialityTerm) {
    body.push(para('TERMO DE SIGILO', { bold: true, before: 280, after: 80, keepNext: true }));
    body.push(para(CONFIDENTIALITY_TERM, { size: 20 }));
  }
  body.push(para(`Emitido em ${fmtLongDateBR(m.emittedAt)}.`, { align: AlignmentType.CENTER, before: 360, after: 480, keepNext: true }));
  body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, keepNext: true, children: [run('_______________________________________', {})] }));
  body.push(para(profName, { bold: true, align: AlignmentType.CENTER, after: 20, keepNext: true }));
  if (m.professional.registry) body.push(para(m.professional.registry, { align: AlignmentType.CENTER, after: 20, size: 20, keepNext: true }));
  if (m.professional.specialty) body.push(para(m.professional.specialty, { align: AlignmentType.CENTER, after: 0, size: 20 }));

  const page = { page: { margin: { top: CM, bottom: CM, left: CM, right: CM, header: 500, footer: 400 } } };
  const docSections: any[] = [];

  if (m.cover) {
    const cov: (Paragraph | Table)[] = [new Paragraph({ spacing: { before: 1800 }, children: [] })];
    const lg = logoRun(m, 120);
    if (lg) cov.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [lg] }));
    cov.push(para(clinicName, { bold: true, size: 34, align: AlignmentType.CENTER, after: 80 }));
    if (legal && legal.toLowerCase() !== clinicName.toLowerCase()) cov.push(para(legal, { size: 18, color: GREY, align: AlignmentType.CENTER, after: 20 }));
    if (info) cov.push(para(info, { size: 18, color: GREY, align: AlignmentType.CENTER, after: 20 }));
    if (m.clinic.address) cov.push(para(m.clinic.address, { size: 18, color: GREY, align: AlignmentType.CENTER, after: 20 }));
    cov.push(new Paragraph({ spacing: { before: 200, after: 900 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '222222', space: 1 } }, children: [] }));
    cov.push(para(m.title.toUpperCase(), { bold: true, size: 52, align: AlignmentType.CENTER, after: 120 }));
    if (m.banner) cov.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, border: { top: thin, bottom: thin, left: thin, right: thin }, children: [run(` ${clean(m.banner).toUpperCase()} `, { bold: true, size: 18 })] }));
    cov.push(para('Paciente', { align: AlignmentType.CENTER, size: 24, before: 500, after: 40 }));
    cov.push(para(m.patientName, { bold: true, size: 32, align: AlignmentType.CENTER, after: 400 }));
    cov.push(tableOf(null, (m.coverFacts || []).filter(f => clean(f.value)).map(f => [f.label, f.value]), [2, 5]));
    cov.push(new Paragraph({ children: [new PageBreak()] }));
    docSections.push({ properties: page, footers: { default: footer }, children: cov });
    if (m.toc) {
      const toc: (Paragraph | Table)[] = [para('SUMÁRIO', { bold: true, size: 30, align: AlignmentType.CENTER, after: 300 })];
      sections.forEach((s, i) => toc.push(para(`${i + 1}. ${clean(s.title)}`, { after: 120 })));
      toc.push(new Paragraph({ children: [new PageBreak()] }));
      docSections.push({ properties: page, headers: { default: header }, footers: { default: footer }, children: toc });
    }
  }
  docSections.push({ properties: page, headers: { default: header }, footers: { default: footer }, children: body });

  const doc = new Document({
    creator: profName, title: `${m.title} - ${clean(m.patientName)}`,
    styles: {
      default: { document: { run: { font: FONT, size: SZ } } },
      paragraphStyles: [
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 23, bold: true, color: '000000' } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: SZ, bold: true, color: '000000' } },
      ],
    },
    sections: docSections,
  });
  void fmtDateBR;
  return Packer.toBlob(doc);
}
