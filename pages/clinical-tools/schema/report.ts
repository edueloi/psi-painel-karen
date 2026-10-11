/**
 * Relatórios dos Inventários de Esquemas: PDF sóbrio (reaproveita renderClinicalPdf, sem alterá-lo) e texto
 * resumido para anexar ao prontuário.
 */
import { api, getStaticUrl } from '../../../services/api';
import {
  renderClinicalPdf, loadLogoImage, fmtDateBR,
  type Block, type ClinicInfo, type ClinicalDocModel, type DocSection, type ProfessionalInfo,
} from '../../../components/Records/pdf/clinicalDocument';
import {
  CREDITS, DOMAINS, INSTRUMENTS, MODE_GROUP_LABEL, RNE_FIGURES, SCREENING_NOTE, YSQ_CUTOFF, domainById,
  type InstrumentId,
} from './instruments';
import {
  buildGeneral, fmt, scoreInstrument, SITUATION_ACTIVE, SITUATION_INACTIVE, YSQ_RULE_TEXT,
  type Answers, type NeedsScore, type ParentsScore, type ScaleScore,
} from './scoring';
import type { SchemaApplication } from './api';

export type ReportKind = InstrumentId | 'general';

export interface ReportContext {
  patientName: string;
  clinic: ClinicInfo;
  professional: ProfessionalInfo;
}

const ANSWERED_BY: Record<string, string> = { patient: 'Paciente (link)', professional: 'Profissional' };
const fmtD = (iso?: string | null) => { if (!iso) return '-'; const d = new Date(iso); return isNaN(d.getTime()) ? '-' : fmtDateBR(d); };

/** Cabeçalho da clínica e profissional, no mesmo critério do prontuário (GET /profile/me + usuário logado). */
export async function buildReportContext(patientName: string, user: any): Promise<Omit<ReportContext, 'patientName'>> {
  let pf: any = {};
  try { pf = (await api.get<any>('/profile/me')) || {}; } catch { /* usa só o usuário logado */ }
  const u: any = user || {};
  const pick = (...vals: any[]) => { for (const v of vals) { if (v !== undefined && v !== null && String(v).trim() !== '' && String(v) !== 'undefined' && String(v) !== 'null') return String(v).trim(); } return ''; };
  const fmtDoc = (s: string) => { const d = s.replace(/\D/g, ''); if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'); if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4'); return s; };
  const regLabel = pick(pf.registry_label) || 'CRP';
  const regNum = pick(pf.registry_number, pf.crp, u.crp);
  const registry = regNum ? (regNum.toUpperCase().startsWith(regLabel.toUpperCase()) ? regNum : `${regLabel} ${regNum}`) : '';
  const addr = [pick(pf.address, u.address), [pick(pf.city), pick(pf.state)].filter(Boolean).join(' - '), pick(pf.zip_code) && `CEP ${pick(pf.zip_code)}`].filter(Boolean).join(', ');
  const logoPath = pick(pf.clinic_logo_url, pf.clinicLogoUrl, u.clinicLogoUrl);
  const logo = logoPath ? await loadLogoImage(getStaticUrl(logoPath)) : null;
  return {
    clinic: {
      name: pick(pf.company_name, u.companyName, pf.name, u.name) || 'Clínica',
      legalName: pick(pf.legal_name, pf.razao_social, pf.corporate_name),
      cnpj: pick(pf.cnpj) ? fmtDoc(pick(pf.cnpj)) : '',
      phone: pick(pf.phone, u.phone), email: pick(pf.email, u.email), address: addr, website: pick(pf.website, pf.site), logo,
    },
    professional: { name: pick(pf.name, u.name) || 'Profissional', registry, specialty: pick(pf.area_name, pf.specialty, u.specialty, u.areaName) },
  };
}

/* ───────────── Seções ───────────── */
const tableBlock = (head: string[], rows: string[][], widths?: number[]): Block => ({ t: 'table', head, rows, widths });
const yn = (v: boolean) => (v ? 'X' : '');

function ysqSection(s: ScaleScore): Block[] {
  const rows = s.subscales.map(x => [x.name, domainById(x.domainId || '')?.name || '', `${x.answered}/${x.itemCount}`, x.complete ? String(x.sum) : '-', x.complete ? fmt(x.mean) : `${fmt(x.partialMean)}*`, !x.complete ? 'Incompleto' : x.activated ? SITUATION_ACTIVE : SITUATION_INACTIVE]);
  const blocks: Block[] = [
    { t: 'p', text: `Esquemas ativados: ${s.activatedIds.length ? s.subscales.filter(x => x.activated).map(x => `${x.name} (${fmt(x.mean)})`).join('; ') : 'nenhum esquema com média >= 3,5'}.` },
    tableBlock(['Esquema', 'Domínio', 'Itens', 'Total', 'Média', 'Situação'], rows, [34, 30, 10, 9, 10, 17]),
    { t: 'note', text: `${YSQ_RULE_TEXT} Domínios conforme a aba Resultado GERAL da planilha de referência. * Média parcial (itens respondidos).` },
  ];
  return blocks;
}
function parentsSection(s: ParentsScore): Block[] {
  const rows = INSTRUMENTS.ypi.subscales.map((x, i) => [x.name, s.mother.na ? 'n/a' : fmt(s.mother.subscales[i].mean ?? s.mother.subscales[i].partialMean), s.father.na ? 'n/a' : fmt(s.father.subscales[i].mean ?? s.father.subscales[i].partialMean)]);
  return [tableBlock(['Esquema', 'Mãe', 'Pai'], rows, [60, 20, 20]), { t: 'note', text: 'Média por esquema (soma dos itens / nº de itens), escala de 1 a 6. Sem ponto de corte na planilha.' }];
}
function modesSection(s: ScaleScore): Block[] {
  const rows = s.subscales.map(x => [x.name, x.group ? MODE_GROUP_LABEL[x.group] : '', String(x.itemCount), fmt(x.mean ?? x.partialMean) + (x.complete ? '' : '*')]);
  return [tableBlock(['Modo', 'Grupo (teórico)', 'Itens', 'Frequência (média)'], rows, [36, 38, 10, 16]), { t: 'note', text: 'Frequência = média dos itens do modo (1 a 6). Sem ponto de corte na planilha.' }];
}
function meanSection(s: ScaleScore): Block[] {
  const o = s.overall; const inst = INSTRUMENTS[s.instrumentId];
  return [
    { t: 'kv', pairs: [{ label: 'Média geral', value: fmt(o?.mean ?? o?.partialMean) }, { label: 'Soma', value: o && o.answered ? String(o.sum) : '-' }, { label: 'Itens respondidos', value: `${o?.answered ?? 0}/${inst.itemCount}` }] },
    { t: 'note', text: 'Média de todos os itens, escala de 1 a 6. Sem ponto de corte na planilha.' },
  ];
}
function needsSection(s: NeedsScore): Block[] {
  const blocks: Block[] = [];
  const persons = s.persons.filter(p => p.name || p.age || p.scene);
  if (persons.length) { blocks.push({ t: 'sub', text: 'Imagem mental - pessoas significativas' }); persons.forEach(p => blocks.push({ t: 'field', label: `Pessoa 0${p.k}`, text: [p.name, p.age && `(${p.age})`, p.scene && `- ${p.scene}`].filter(Boolean).join(' ') })); }
  DOMAINS.forEach(d => {
    blocks.push({ t: 'sub', text: `Domínio - ${d.name}` });
    blocks.push(tableBlock(['Necessidade emocional', 'Esquema associado', ...RNE_FIGURES.map(f => f.label)], s.rows.filter(r => r.domainId === d.id).map(r => [r.needLabel, r.schemaName || '', ...RNE_FIGURES.map(f => yn(r.marks[f.id]))]), [40, 38, 10, 10, 12]));
  });
  blocks.push({ t: 'note', text: `Necessidades marcadas - Mãe: ${s.totals.mae}; Pai: ${s.totals.pai}; Terceiro: ${s.totals.ter}.` });
  return blocks;
}
function generalSections(all: Partial<Record<InstrumentId, Answers>>): DocSection[] {
  const g = buildGeneral(all);
  const out: DocSection[] = [{ title: 'Síntese', blocks: [{ t: 'kv', pairs: [
    { label: 'Inventários concluídos', value: `${g.completed.length} de ${Object.keys(INSTRUMENTS).length}` },
    { label: 'Esquemas ativados (YSQ)', value: String(g.activatedTotal) },
    { label: 'YCI (média)', value: fmt(g.yci) }, { label: 'YRAI (média)', value: fmt(g.yrai) },
  ] }] }];
  g.domains.forEach(dom => {
    const blocks: Block[] = [tableBlock(['Esquema', 'YSQ (média)', 'Situação', 'Mãe', 'Pai'], dom.rows.map(r => [r.name, r.ysqMean !== null ? fmt(r.ysqMean) : r.ysqPartialMean !== null ? `${fmt(r.ysqPartialMean)}*` : '-', r.ysqMean === null ? '-' : r.activated ? SITUATION_ACTIVE : SITUATION_INACTIVE, r.hasParental ? fmt(r.mother) : 'n/a', r.hasParental ? fmt(r.father) : 'n/a']), [44, 18, 20, 14, 14])];
    if (dom.needs.length) blocks.push(tableBlock(['Necessidade (RNE)', 'Esquema', ...RNE_FIGURES.map(f => f.label)], dom.needs.map(r => [r.needLabel, r.schemaName || '', ...RNE_FIGURES.map(f => yn(r.marks[f.id]))]), [40, 38, 10, 10, 12]));
    out.push({ title: `Domínio - ${dom.domain.name}`, blocks });
  });
  out.push({ title: 'Modos esquemáticos (YAMI)', blocks: [tableBlock(['Modo', 'Frequência (média)'], g.modes.map(m => [m.name, fmt(m.mean)]), [60, 30])] });
  return out;
}

export function buildReportDoc(kind: ReportKind, answers: Partial<Record<InstrumentId, Answers>>, ctx: ReportContext, app?: Pick<SchemaApplication, 'completed_at' | 'last_saved_at' | 'answered_by' | 'last_saved_by'> | null): ClinicalDocModel {
  const sections: DocSection[] = [];
  let title: string; let subtitle: string;
  const ident: { label: string; value: string }[] = [];

  if (kind === 'general') {
    title = 'Inventários de Esquemas - Resultado Geral';
    subtitle = 'Síntese dos inventários de Jeffrey Young et al. (YSQ, Estilos Parentais, YAMI, YCI, YRAI e RNE)';
    sections.push(...generalSections(answers));
  } else {
    const inst = INSTRUMENTS[kind];
    const a = answers[kind] || {};
    const score = scoreInstrument(kind, a);
    title = `${inst.fullName}`;
    subtitle = inst.reference;
    ident.push({ label: 'Instrumento', value: inst.sheetTitle }, { label: 'Respostas', value: `${score.progress.answered} de ${score.progress.total}` });
    if (app) ident.push({ label: 'Data', value: fmtD(app.completed_at || app.last_saved_at) }, { label: 'Respondido por', value: ANSWERED_BY[app.answered_by || app.last_saved_by || ''] || '-' });
    const blocks = score.kind === 'parents' ? parentsSection(score) : score.kind === 'needs' ? needsSection(score) : kind === 'ysq' ? ysqSection(score) : kind === 'yami' ? modesSection(score) : meanSection(score);
    sections.push({ title: 'Resultado', blocks });
  }

  sections.push({ title: 'Observações', blocks: [
    { t: 'note', text: SCREENING_NOTE },
    { t: 'note', text: CREDITS },
  ] });

  return {
    variant: 'summary', title, subtitle, clinic: ctx.clinic, professional: ctx.professional, patientName: ctx.patientName,
    identification: [{ label: 'Paciente', value: ctx.patientName, full: true }, ...ident],
    emittedAt: new Date(), cover: false, toc: false, confidentialityTerm: true, sections,
  };
}

export function downloadReportPdf(kind: ReportKind, answers: Partial<Record<InstrumentId, Answers>>, ctx: ReportContext, app?: SchemaApplication | null) {
  const model = buildReportDoc(kind, answers, ctx, app);
  const base = `${ctx.patientName.replace(/[^\p{L}\p{N}]+/gu, '_')}_${kind === 'general' ? 'Esquemas_Resultado_Geral' : INSTRUMENTS[kind].name.replace(/[^\p{L}\p{N}]+/gu, '')}`;
  renderClinicalPdf(model).save(`${base}.pdf`);
}

/** Texto (markdown simples) para anexar ao prontuário. */
export function buildRecordText(kind: InstrumentId, answers: Answers, patientName: string, app: SchemaApplication): string {
  const inst = INSTRUMENTS[kind];
  const score = scoreInstrument(kind, answers);
  const lines: string[] = [
    `# ${inst.fullName}`, '',
    `**Paciente:** ${patientName}`,
    `**Referência:** ${inst.reference}`,
    `**Concluído em:** ${fmtD(app.completed_at)} - **Respondido por:** ${ANSWERED_BY[app.answered_by || ''] || 'Profissional'}`,
    `**Respostas:** ${score.progress.answered} de ${score.progress.total}`, '',
  ];
  if (score.kind === 'scale' && kind === 'ysq') {
    const act = score.subscales.filter(s => s.activated);
    lines.push(`**Esquemas ativados (média >= ${fmt(YSQ_CUTOFF, 1)}):** ${act.length ? act.map(s => `${s.name} (${fmt(s.mean)})`).join('; ') : 'nenhum'}`, '', '**Médias por esquema:**');
    DOMAINS.forEach(d => {
      lines.push(`- ${d.name}: ${score.subscales.filter(s => s.domainId === d.id).map(s => `${s.name} ${fmt(s.mean)}${s.activated ? ' [ATIVADO]' : ''}`).join('; ')}`);
    });
  } else if (score.kind === 'scale' && kind === 'yami') {
    lines.push('**Frequência média por modo (1 a 6):**', ...score.subscales.map(s => `- ${s.name}: ${fmt(s.mean)}`));
  } else if (score.kind === 'scale') {
    lines.push(`**Média geral:** ${fmt(score.overall?.mean)} (1 a 6)`);
  } else if (score.kind === 'parents') {
    lines.push('**Estilos parentais (média por esquema) - Mãe / Pai:**', ...INSTRUMENTS.ypi.subscales.map((s, i) => `- ${s.name}: ${score.mother.na ? 'n/a' : fmt(score.mother.subscales[i].mean)} / ${score.father.na ? 'n/a' : fmt(score.father.subscales[i].mean)}`));
  } else {
    lines.push('**Necessidades emocionais não atendidas:**', ...score.rows.filter(r => r.marks.mae || r.marks.pai || r.marks.ter).map(r => `- ${r.needLabel} (${r.schemaName}): ${RNE_FIGURES.filter(f => r.marks[f.id]).map(f => f.label).join(', ')}`));
  }
  lines.push('', `*${SCREENING_NOTE}*`, `*${CREDITS}*`);
  return lines.join('\n');
}
