/**
 * Monta o `ClinicalDocModel` (usado pelo PDF e pelo Word) a partir dos registros e dados coletados.
 * Não decide permissões: o chamador informa `mode` e as mesmas regras de antes valem
 * (campo restrito só entra em "restricted_only", que não traz extras).
 */
import {
  getSections, parseStructured, compileLegacy, fieldToText, hasValue,
  type SectionDef, type StructuredValues, type SpecialtyId, type RecordKind,
} from '../specialtyTemplates';
import {
  ensurePlanV2, SECTIONS as PLAN_SECTIONS, AREA_LABEL, STRATEGY_LABEL, BARRIER_LABEL, PLAN_STATUS_OPTIONS,
  OBJECTIVE_STATUS, PRIORITY_OPTIONS, STRATEGY_STATUS, TASK_STATUS, MARK_LABEL, type TheraPlan, type Opt,
} from '../../Plan/model';
import {
  clean, fmtDateBR, type Block, type ClinicalDocModel, type ClinicInfo, type DocSection, type DocVariant, type ProfessionalInfo,
} from './clinicalDocument';

export type ExportMode = 'standard' | 'full' | 'no_restricted' | 'restricted_only';

export interface ExportRecord {
  id: string; title: string; record_type: string; status?: string;
  content?: string; draft_content?: string; ai_organized_content?: string; restricted_content?: string;
  appointment_type?: string; start_time?: string; end_time?: string; created_at: string;
  tags?: string[]; professional_name?: string;
}
export interface ExportInstrument { name: string; date?: string; fields: { label: string; value: string }[] }
export interface ExportAttachment { name: string; detail?: string }
export interface ExportAnamnesisSend { title?: string; date?: string; responses: Record<string, any> }
export interface ExportMood { date?: string; score?: number | string; emotions?: any; note?: string }

export interface ExportInput {
  mode: ExportMode;
  clinic: ClinicInfo;
  professional: ProfessionalInfo;
  /** Paciente já mesclado (lista + ficha completa). */
  patient: Record<string, any> & { full_name: string };
  records: ExportRecord[];
  moods: ExportMood[];
  instruments: ExportInstrument[];
  attachments: ExportAttachment[];
  anamnesisSends: ExportAnamnesisSend[];
  anamnesisLabels: Record<string, string>;
  typeLabels: Record<string, string>;
  emittedAt?: Date;
}

/* ───────────── Utilitários ───────────── */
const has = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== '';
const text = (v: unknown) => clean(v);

/** Interpreta 'YYYY-MM-DD...' sem deslocar fuso; demais formatos via Date. */
export function parseDate(d?: string | null): Date | null {
  if (!d) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|T00:00:00(?:\.0+)?(?:Z)?$)/.exec(String(d));
  const dt = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) : new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}
export const fmtD = (d?: string | null) => { const dt = parseDate(d); return dt ? fmtDateBR(dt) : ''; };
const dayKey = (d?: string | null) => { const dt = parseDate(d); return dt ? `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}` : ''; };
const ts = (d?: string | null) => parseDate(d)?.getTime() || 0;
const byDateAsc = <T extends { created_at: string }>(a: T, b: T) => ts(a.created_at) - ts(b.created_at);

function ageOf(birth?: string | null): string {
  const b = parseDate(birth); if (!b) return '';
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age >= 0 && age < 130 ? `${age} anos` : '';
}

function truncate(s: string, n: number): string {
  const t = clean(s);
  if (t.length <= n) return t;
  const cut = t.slice(0, n);
  const sp = cut.lastIndexOf(' ');
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:.-]+$/, '') + '...';
}

function safeJson(raw?: string | null): any {
  if (!raw) return null;
  try { const o = JSON.parse(raw); return o && typeof o === 'object' ? o : null; } catch { return null; }
}

const optLabel = (opts: Opt[], v: string) => opts.find(o => o.value === v)?.label || (v ? v.replace(/_/g, ' ') : '');

const LEGACY_FIELDS: [string, string][] = [
  ['motivo_consulta', 'Motivo da consulta'], ['contexto_relevante', 'Contexto relevante'], ['observacoes_clinicas', 'Observações clínicas'],
  ['intervencoes_realizadas', 'Intervenções realizadas'], ['evolucao_resposta', 'Evolução / resposta'], ['plano_terapeutico', 'Plano terapêutico / próximos passos'],
  ['encaminhamentos', 'Encaminhamentos'], ['observacao_complementar', 'Observação complementar'],
];

/* ───────────── Blocos a partir de seções estruturadas ───────────── */
function structuredBlocks(sections: SectionDef[], values: StructuredValues): Block[] {
  const out: Block[] = [];
  sections.forEach(s => {
    const fields = s.fields.filter(f => hasValue(values[f.key]));
    if (!fields.length) return;
    out.push({ t: 'sub', text: s.label });
    fields.forEach(f => {
      if (f.type === 'rows' && f.columns) {
        const rows = (values[f.key] as Record<string, string>[]).filter(r => r && Object.values(r).some(has))
          .map(r => f.columns!.map(c => text(r[c.key])));
        if (rows.length) { out.push({ t: 'p', text: f.label + ':' }); out.push({ t: 'table', head: f.columns.map(c => c.label), rows }); }
      } else {
        const t = fieldToText(f, values[f.key]);
        if (t) out.push({ t: 'field', label: f.label, text: t });
      }
    });
  });
  return out;
}

/** Ocorrência de falta (uma evolução por data): mostra ocorrência e motivo antes do conteúdo clínico, se houver. */
const ABSENCE_FIELDS: [string, string][] = [
  ['ocorrencia', 'Ocorrência'], ['falta_motivo', 'Motivo da falta'], ['falta_motivo_texto', 'Complemento do motivo'], ['falta_avisou', 'Avisou antes?'],
  ['falta_avisou_quando', 'Quando avisou'], ['falta_contato', 'Contato realizado pela clínica'], ['falta_contato_obs', 'Observação do contato'],
  ['falta_reposicao', 'Reposição / remarcação sugerida'], ['falta_cobrar', 'Cobrar a sessão?'], ['falta_obs', 'Observação clínica da falta'],
];
function absenceBlocks(values: StructuredValues): Block[] {
  const oc = String(values?.ocorrencia || '');
  if (!oc || oc === 'Sessão realizada') return [];
  const out: Block[] = [{ t: 'sub', text: oc.startsWith('Falta') ? 'Falta' : 'Ocorrência da sessão' }];
  ABSENCE_FIELDS.forEach(([k, label]) => { if (has(values[k])) out.push({ t: 'field', label, text: String(values[k]) }); });
  if (oc.startsWith('Falta') && !has(values.falta_motivo)) out.push({ t: 'field', label: 'Motivo da falta', text: 'Não informado (pendente de preenchimento)' });
  return out;
}

/** Corpo de um registro (estruturado, legado ou texto livre). */
function recordBody(r: ExportRecord): Block[] {
  const org = safeJson(r.ai_organized_content);
  const st = parseStructured(r.ai_organized_content);
  const kind: RecordKind | null = st?.kind === 'Avaliacao' ? 'Avaliacao' : st?.kind === 'Evolucao' ? 'Evolucao' : null;
  if (st && kind) {
    const blocks = [...(kind === 'Evolucao' ? absenceBlocks(st.values || {}) : []), ...structuredBlocks(getSections((st.template || 'psicologia') as SpecialtyId, kind), st.values || {})];
    if (blocks.length) return blocks;
  }
  if (org) {
    const blocks: Block[] = [];
    LEGACY_FIELDS.forEach(([k, label]) => { if (has(org[k]) && typeof org[k] !== 'object') blocks.push({ t: 'field', label, text: String(org[k]) }); });
    if (blocks.length) return blocks;
  }
  return markdownBlocks(r.content || r.draft_content || '');
}

/** Rótulos amigáveis das perguntas de anamnese (preenchido por buildClinicalDocModel). */
let exportLabels: Record<string, string> = {};
const humanizeKey = (k: string) => {
  const raw = (exportLabels[k] || k).replace(/_/g, ' ').trim();
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : raw;
};

/**
 * Conteúdo salvo como markdown (ex.: respostas de anamnese convertidas em texto) vira blocos de documento:
 * '**chave**: valor' → pares rótulo/valor com nome legível; '#' e '---' deixam de aparecer como símbolos.
 */
function markdownBlocks(raw: string): Block[] {
  const src = String(raw || '').split('\r\n').join('\n').trim();
  if (!src) return [];
  const pairRe = /\*\*([^*\n]+?)\*\*\s*:?\s*([^*]*?)(?=\s*\*\*|$)/g;
  const pairs: { label: string; value: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = pairRe.exec(src))) {
    const label = m[1].replace(/:\s*$/, '').trim();
    const value = m[2].replace(/\s*---\s*$/, '').replace(/\s+/g, ' ').trim();
    if (label) pairs.push({ label: humanizeKey(label), value: value || 'Não informado' });
  }
  const stripped = (x: string) => x.replace(/^#{1,6}\s*/gm, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\s*-{3,}\s*$/gm, '').trim();
  if (pairs.length >= 2) {
    // texto antes do primeiro par (título repetido) é descartado; o registro já tem o próprio título
    return [{ t: 'kv', pairs: pairs.map(p => ({ ...p, full: p.value.length > 60 })) }];
  }
  const clean1 = text(stripped(src));
  return clean1 ? [{ t: 'p', text: clean1 }] : [];
}

function restrictedBlocks(r: ExportRecord): Block[] {
  const t = text(r.restricted_content);
  return t ? [{ t: 'sub', text: 'Anotação restrita (uso exclusivo do profissional)' }, { t: 'p', text: t }] : [];
}

/** Resumo curto em linguagem corrida para o Resumo Clínico. */
function legacyOf(r: ExportRecord): Record<string, string> {
  const st = parseStructured(r.ai_organized_content);
  if (st && (st.kind === 'Avaliacao' || st.kind === 'Evolucao')) {
    return compileLegacy(getSections((st.template || 'psicologia') as SpecialtyId, st.kind), st.values || {}) as Record<string, string>;
  }
  const org = safeJson(r.ai_organized_content) || {};
  const out: Record<string, string> = {};
  LEGACY_FIELDS.forEach(([k]) => { if (has(org[k]) && typeof org[k] !== 'object') out[k] = String(org[k]); });
  return out;
}

/* ───────────── Plano terapêutico ───────────── */
function planOf(r: ExportRecord): TheraPlan | null {
  const org = safeJson(r.ai_organized_content);
  if (!org) return null;
  try { return ensurePlanV2(org as TheraPlan); } catch { return null; }
}

function planBlocks(plan: TheraPlan): Block[] {
  const v2 = plan.v2; const out: Block[] = [];
  if (!v2) return out;
  const secTitle = (id: string) => PLAN_SECTIONS.find(s => s.id === id)?.label || id;
  const mark = (id: keyof typeof v2.marks) => (v2.marks?.[id] ? MARK_LABEL[v2.marks[id] as string] || '' : '');
  const objLabel = (id: string) => { const o = v2.objectives.find(x => x.id === id); return o ? truncate(o.description, 70) : ''; };
  const ov = v2.overview;

  const ovFields: Block[] = [];
  if (has(ov.general_objective)) ovFields.push({ t: 'field', label: 'Objetivo geral', text: ov.general_objective });
  if (has(ov.status)) ovFields.push({ t: 'field', label: 'Situação do plano', text: optLabel(PLAN_STATUS_OPTIONS, ov.status) });
  if (has(ov.start_date)) ovFields.push({ t: 'field', label: 'Início', text: fmtD(ov.start_date) });
  if (has(ov.review_date)) ovFields.push({ t: 'field', label: 'Próxima revisão', text: fmtD(ov.review_date) });
  const areas = [...(ov.focus_areas || []).map(a => AREA_LABEL[a] || a), ov.focus_other].filter(has);
  if (areas.length) ovFields.push({ t: 'field', label: 'Áreas de foco', text: areas.join(', ') });
  const prios = (ov.priorities || []).map(p => text(p.text)).filter(Boolean);
  if (prios.length) { ovFields.push({ t: 'sub', text: 'Prioridades' }); ovFields.push({ t: 'bullets', items: prios }); }
  if (has(ov.rationale)) ovFields.push({ t: 'field', label: 'Justificativa clínica', text: ov.rationale });
  if (ovFields.length || mark('overview' as any)) out.push({ t: 'sub', text: secTitle('overview') }, ...(ovFields.length ? ovFields : [{ t: 'note', text: mark('overview' as any) } as Block]));

  if (v2.objectives.length) {
    out.push({ t: 'sub', text: secTitle('objectives') }, {
      t: 'table', head: ['Objetivo', 'Área', 'Prioridade', 'Situação', 'Indicadores / evidências'], widths: [4, 1.8, 1.4, 1.6, 3.4],
      rows: v2.objectives.map(o => [o.description, o.area ? (AREA_LABEL[o.area] || o.area) : '', optLabel(PRIORITY_OPTIONS, o.priority), optLabel(OBJECTIVE_STATUS, o.status),
        [o.indicators, o.evidence, o.criterion ? `Critério: ${o.criterion}` : ''].filter(has).join(' | ')]),
    });
  } else if (mark('objectives' as any)) out.push({ t: 'sub', text: secTitle('objectives') }, { t: 'note', text: mark('objectives' as any) });

  if (v2.strategies.length) {
    out.push({ t: 'sub', text: secTitle('strategies') }, {
      t: 'table', head: ['Estratégia', 'Objetivo vinculado', 'Situação', 'Justificativa / resultados'], widths: [2.4, 2.6, 1.4, 4],
      rows: v2.strategies.map(s => [s.type === 'outras' && has(s.type_other) ? s.type_other : (STRATEGY_LABEL[s.type] || s.type), objLabel(s.objective_id), optLabel(STRATEGY_STATUS, s.status),
        [s.rationale, s.results ? `Resultados: ${s.results}` : ''].filter(has).join(' | ')]),
    });
  } else if (mark('strategies' as any)) out.push({ t: 'sub', text: secTitle('strategies') }, { t: 'note', text: mark('strategies' as any) });

  if (v2.tasks.length) {
    out.push({ t: 'sub', text: secTitle('tasks') }, {
      t: 'table', head: ['Atividade', 'Objetivo', 'Prazo', 'Situação', 'Dificuldades / resultado'], widths: [3.2, 2.4, 1.6, 1.5, 3],
      rows: v2.tasks.map(t => [[t.activity, t.instructions].filter(has).join(' - '), objLabel(t.objective_id), fmtD(t.due), optLabel(TASK_STATUS, t.status), [t.difficulties, t.result].filter(has).join(' | ')]),
    });
  } else if (mark('tasks' as any)) out.push({ t: 'sub', text: secTitle('tasks') }, { t: 'note', text: mark('tasks' as any) });

  if (v2.indicators.length) {
    out.push({ t: 'sub', text: secTitle('indicators') }, {
      t: 'table', head: ['Indicador', 'Tipo', 'Linha de base', 'Registros'], widths: [3, 1.4, 2, 4.4],
      rows: v2.indicators.map(i => [[i.name, i.definition].filter(has).join(' - '), i.kind || '', [i.baseline, i.unit].filter(has).join(' '),
        (i.records || []).map(rc => `${fmtD(rc.date)}: ${rc.value}${rc.note ? ` (${rc.note})` : ''}`).join('; ')]),
    });
  } else if (mark('indicators' as any)) out.push({ t: 'sub', text: secTitle('indicators') }, { t: 'note', text: mark('indicators' as any) });

  if (v2.barriers.length || has(v2.barriers_notes)) {
    out.push({ t: 'sub', text: secTitle('barriers') });
    if (v2.barriers.length) out.push({
      t: 'table', head: ['Tipo', 'Contexto', 'Estratégia de manejo'], widths: [2, 4, 4],
      rows: v2.barriers.map(b => [b.type === 'outras' && has(b.other) ? b.other : (BARRIER_LABEL[b.type] || b.type), b.context, b.strategy]),
    });
    if (has(v2.barriers_notes)) out.push({ t: 'field', label: 'Observações', text: v2.barriers_notes });
  } else if (mark('barriers' as any)) out.push({ t: 'sub', text: secTitle('barriers') }, { t: 'note', text: mark('barriers' as any) });

  if (v2.reviews.length) {
    out.push({ t: 'sub', text: secTitle('reviews') }, {
      t: 'table', head: ['Data', 'Evidências', 'Ajustes', 'Justificativa'], widths: [1.2, 3.4, 3.4, 3],
      rows: v2.reviews.map(rv => [fmtD(rv.date), rv.evidence,
        [rv.strategies_kept && `Mantidas: ${rv.strategies_kept}`, rv.strategies_modified && `Modificadas: ${rv.strategies_modified}`, rv.new_objectives && `Novos objetivos: ${rv.new_objectives}`, rv.closed_objectives && `Encerrados: ${rv.closed_objectives}`].filter(Boolean).join(' | '),
        rv.justification]),
    });
  } else if (mark('reviews' as any)) out.push({ t: 'sub', text: secTitle('reviews') }, { t: 'note', text: mark('reviews' as any) });

  const dis = v2.discharge;
  const disF: [string, string][] = [['Critérios de alta', dis.criteria], ['Já alcançado', dis.achieved], ['O que falta', dis.remaining], ['Prevenção de recaída', dis.relapse_prevention], ['Continuidade do cuidado', dis.continuity], ['Encaminhamentos', dis.referrals]];
  if (disF.some(([, v]) => has(v))) { out.push({ t: 'sub', text: secTitle('discharge') }); disF.forEach(([l, v]) => has(v) && out.push({ t: 'field', label: l, text: v })); }
  else if (mark('discharge' as any)) out.push({ t: 'sub', text: secTitle('discharge') }, { t: 'note', text: mark('discharge' as any) });

  const par = v2.participation;
  const parF: [string, string][] = [['Plano discutido com o paciente', par.discussed], ['Preferências do paciente', par.preferences], ['Acordos', par.agreements], ['Divergências', par.divergences], ['Barreiras percebidas pelo paciente', par.perceived_barriers], ['Ajustes combinados', par.adjustments]];
  if (parF.some(([, v]) => has(v))) { out.push({ t: 'sub', text: secTitle('participation') }); parF.forEach(([l, v]) => has(v) && out.push({ t: 'field', label: l, text: v })); }
  else if (mark('participation' as any)) out.push({ t: 'sub', text: secTitle('participation') }, { t: 'note', text: mark('participation' as any) });

  if (has(v2.notes)) out.push({ t: 'sub', text: secTitle('notes') }, { t: 'p', text: v2.notes });
  return out;
}

/* ───────────── Identificação ───────────── */
function identification(p: ExportInput['patient'], emitted: Date): ClinicalDocModel['identification'] {
  const birth = fmtD(p.birth_date);
  const age = ageOf(p.birth_date);
  const resp = [p.responsible_name, p.responsible_phone].filter(has).join(' - ');
  const rows: ClinicalDocModel['identification'] = [
    { label: 'Nome', value: text(p.full_name), full: true },
    { label: 'Nascimento', value: [birth, age && `(${age})`].filter(Boolean).join(' ') },
    { label: 'CPF', value: text(p.cpf) },
    { label: 'Telefone', value: text(p.phone || p.whatsapp) },
    { label: 'E-mail', value: text(p.email) },
    { label: 'Convênio', value: text(p.health_plan) },
    { label: 'Responsável', value: text(resp) },
    { label: 'Emissão', value: fmtDateBR(emitted) },
  ];
  return rows;
}

const CADASTRAL: [string, string, boolean?][] = [
  ['full_name', 'Nome completo', true], ['birth_date', 'Nascimento'], ['cpf', 'CPF'], ['rg', 'RG'], ['gender', 'Gênero'], ['marital_status', 'Estado civil'],
  ['education', 'Escolaridade'], ['profession', 'Profissão'], ['nationality', 'Nacionalidade'], ['naturality', 'Naturalidade'], ['children_count', 'Filhos'],
  ['spouse_name', 'Cônjuge'], ['phone', 'Telefone'], ['phone2', 'Telefone 2'], ['whatsapp', 'WhatsApp'], ['email', 'E-mail'],
  ['address', 'Endereço', true], ['city', 'Cidade'], ['state', 'Estado'], ['zip_code', 'CEP'],
  ['family_contact', 'Contato familiar'], ['emergency_contact', 'Contato de emergência'], ['responsible_name', 'Responsável'], ['responsible_phone', 'Tel. responsável'],
  ['health_plan', 'Convênio / plano', true], ['diagnosis', 'Diagnóstico', true], ['notes', 'Observações cadastrais', true], ['status', 'Situação'],
];

/* ───────────── Montagem ───────────── */
export function buildClinicalDocModel(inp: ExportInput): ClinicalDocModel {
  exportLabels = inp.anamnesisLabels || {};
  const { mode, patient, typeLabels } = inp;
  const emitted = inp.emittedAt || new Date();
  const includeRestricted = mode === 'restricted_only';
  const recs = [...inp.records].sort(byDateAsc);
  const variant: DocVariant = mode === 'standard' ? 'summary' : mode === 'full' ? 'full' : mode === 'no_restricted' ? 'shared' : 'restricted';

  const dates = recs.map(r => parseDate(r.created_at)).filter(Boolean) as Date[];
  const period = dates.length ? (fmtDateBR(dates[0]) === fmtDateBR(dates[dates.length - 1]) ? fmtDateBR(dates[0]) : `${fmtDateBR(dates[0])} a ${fmtDateBR(dates[dates.length - 1])}`) : '';
  const countLabel = `${recs.length} ${recs.length === 1 ? 'registro' : 'registros'}`;

  const base: Omit<ClinicalDocModel, 'sections' | 'title' | 'cover' | 'toc' | 'confidentialityTerm'> = {
    variant, clinic: inp.clinic, professional: inp.professional, patientName: text(patient.full_name),
    identification: identification(patient, emitted), emittedAt: emitted,
  };

  const evolutions = recs.filter(r => r.record_type === 'Evolucao');
  const moodByDay = new Map<string, ExportMood[]>();
  inp.moods.forEach(mo => { const k = dayKey(mo.date); if (k) moodByDay.set(k, [...(moodByDay.get(k) || []), mo]); });
  const moodText = (mo: ExportMood) => {
    const emo = mo.emotions ? (Array.isArray(mo.emotions) ? mo.emotions.join(', ') : String(mo.emotions).replace(/[\[\]"]/g, '')) : '';
    return [has(mo.score) ? `nota ${mo.score}/5` : '', emo, mo.note || ''].filter(has).join(' - ');
  };

  /* ═════ Anotações Restritas ═════ */
  if (variant === 'restricted') {
    const sections: DocSection[] = [];
    const blocks: Block[] = [];
    recs.filter(r => has(r.restricted_content)).forEach(r => {
      blocks.push({ t: 'h3', text: r.title, meta: [fmtD(r.created_at), typeLabels[r.record_type] || r.record_type].filter(Boolean).join('  -  ') });
      blocks.push({ t: 'p', text: r.restricted_content || '' });
    });
    if (blocks.length) sections.push({ title: 'Anotações restritas', blocks });
    return {
      ...base, title: 'Anotações Restritas', stamp: 'RESTRITO', subtitle: [period && `Período: ${period}`, countLabel].filter(Boolean).join('   -   '),
      banner: 'Uso interno autorizado', cover: false, toc: false, confidentialityTerm: true, sections,
    };
  }

  /* ═════ Resumo Clínico ═════ */
  if (variant === 'summary') {
    const sections: DocSection[] = [];
    const aval = recs.filter(r => r.record_type === 'Avaliacao');
    const anam = recs.filter(r => r.record_type === 'Anamnese');
    const lastAval = aval[aval.length - 1];
    const lastLegacy = lastAval ? legacyOf(lastAval) : {};

    // 1. Queixa e demanda
    const qb: Block[] = [];
    const answeredQueixa = (() => {
      const s = inp.anamnesisSends[inp.anamnesisSends.length - 1];
      const v = s?.responses?.queixa_principal || s?.responses?.motivo_busca;
      return has(v) ? String(v) : '';
    })();
    const firstEvoLegacy = evolutions.length ? legacyOf(evolutions[0]) : {};
    const queixa = lastLegacy.motivo_consulta || answeredQueixa || firstEvoLegacy.motivo_consulta || '';
    if (has(queixa)) qb.push({ t: 'p', text: truncate(queixa, 600) });
    if (has(lastLegacy.contexto_relevante)) qb.push({ t: 'field', label: 'Contexto relevante', text: truncate(lastLegacy.contexto_relevante, 380) });
    if (qb.length) sections.push({ title: 'Queixa e demanda', blocks: qb });

    // 2. Hipóteses e formulação
    const hb: Block[] = [];
    if (has(lastLegacy.observacoes_clinicas)) hb.push({ t: 'p', text: truncate(lastLegacy.observacoes_clinicas, 650) });
    if (has(lastLegacy.observacao_complementar)) hb.push({ t: 'field', label: 'Impressão clínica', text: truncate(lastLegacy.observacao_complementar, 380) });
    if (hb.length) {
      hb.push({ t: 'note', text: 'Hipóteses e formulações são provisórias e não constituem conclusão diagnóstica até a finalização do processo avaliativo.' });
      sections.push({ title: 'Hipóteses e formulação', blocks: hb });
    }

    // 3. Plano atual
    const plans = recs.filter(r => r.record_type === 'Plano').map(r => ({ r, p: planOf(r) })).filter(x => x.p);
    const cur = plans[plans.length - 1]?.p;
    if (cur?.v2) {
      const v2 = cur.v2; const pb: Block[] = [];
      const goal = v2.overview.general_objective || cur.summary;
      if (has(goal)) pb.push({ t: 'field', label: 'Objetivo geral', text: goal });
      if (has(v2.overview.status)) pb.push({ t: 'field', label: 'Situação do plano', text: optLabel(PLAN_STATUS_OPTIONS, v2.overview.status) });
      if (has(v2.overview.review_date)) pb.push({ t: 'field', label: 'Próxima revisão', text: fmtD(v2.overview.review_date) });
      const active = v2.objectives.filter(o => ['nao_iniciado', 'em_andamento', 'revisado'].includes(o.status) && has(o.description));
      if (active.length) {
        pb.push({ t: 'sub', text: 'Objetivos ativos' });
        pb.push({ t: 'table', head: ['Objetivo', 'Prioridade', 'Situação'], widths: [6, 1.4, 1.8], rows: active.map(o => [o.description, optLabel(PRIORITY_OPTIONS, o.priority), optLabel(OBJECTIVE_STATUS, o.status)]) });
      }
      if (pb.length) sections.push({ title: 'Plano terapêutico atual', blocks: pb });
    }

    // 4. Últimas evoluções
    const last = evolutions.slice(-5);
    if (last.length) {
      const eb: Block[] = [];
      last.forEach(r => {
        const l = legacyOf(r);
        const body = [l.motivo_consulta && `Tema: ${l.motivo_consulta}`, l.contexto_relevante, l.evolucao_resposta && `Resposta: ${l.evolucao_resposta}`].filter(has).join(' ')
          || text(r.content || r.draft_content);
        const n = evolutions.indexOf(r) + 1;
        eb.push({ t: 'h3', text: `Sessão ${n} - ${fmtD(r.created_at)}`, meta: [r.appointment_type, r.start_time && `${r.start_time}${r.end_time ? ` - ${r.end_time}` : ''}`].filter(has).join('  -  ') });
        if (has(body)) eb.push({ t: 'p', text: truncate(body, 300) });
      });
      sections.push({ title: `Últimas evoluções (${last.length} de ${evolutions.length})`, blocks: eb });
    }

    // 5. Conduta e próximos passos
    const cb: Block[] = [];
    const lastEvo = evolutions[evolutions.length - 1];
    const lastL = lastEvo ? legacyOf(lastEvo) : {};
    if (has(lastL.plano_terapeutico)) cb.push({ t: 'field', label: 'Conduta / próxima sessão', text: truncate(lastL.plano_terapeutico, 450) });
    else if (has(lastLegacy.plano_terapeutico)) cb.push({ t: 'field', label: 'Conduta e acompanhamento', text: truncate(lastLegacy.plano_terapeutico, 450) });
    const enc = lastL.encaminhamentos || lastLegacy.encaminhamentos;
    if (has(enc)) cb.push({ t: 'field', label: 'Encaminhamentos', text: truncate(enc, 300) });
    if (cb.length) sections.push({ title: 'Conduta e próximos passos', blocks: cb });

    return {
      ...base, title: 'Resumo Clínico', subtitle: [period && `Período: ${period}`, countLabel].filter(Boolean).join('   -   '),
      cover: false, toc: false, confidentialityTerm: false, sections,
    };
  }

  /* ═════ Prontuário Completo / Versão Compartilhada ═════ */
  const sections: DocSection[] = [];
  const recMeta = (r: ExportRecord) => [fmtD(r.created_at), r.status].filter(has).join('  -  ');
  const withRestricted = (r: ExportRecord, b: Block[]) => includeRestricted ? [...b, ...restrictedBlocks(r)] : b;

  // 1. Identificação e dados cadastrais
  {
    const pairs = CADASTRAL.map(([k, label, full]) => {
      let v = patient[k];
      if (k === 'birth_date') { const b = fmtD(v); v = [b, ageOf(v) && `(${ageOf(v)})`].filter(Boolean).join(' '); }
      return { label, value: has(v) ? (typeof v === 'string' ? text(v) : String(v)) : '', full };
    }).filter(p => has(p.value));
    if (pairs.length) sections.push({ title: 'Identificação e dados cadastrais', blocks: [{ t: 'kv', pairs }] });
  }

  // 2. Anamnese
  {
    const blocks: Block[] = [];
    recs.filter(r => r.record_type === 'Anamnese').forEach(r => {
      const body = withRestricted(r, recordBody(r));
      if (!body.length) return;
      blocks.push({ t: 'h3', text: r.title, meta: recMeta(r) }, ...body);
    });
    inp.anamnesisSends.forEach(s => {
      const rows = Object.entries(s.responses || {}).filter(([, v]) => has(Array.isArray(v) ? v.join('') : v))
        .map(([k, v]) => [inp.anamnesisLabels[k] || humanizeKey(k), Array.isArray(v) ? v.join(', ') : typeof v === 'number' ? `${v}/10` : String(v)]);
      if (!rows.length) return;
      blocks.push({ t: 'h3', text: s.title || 'Anamnese respondida pelo paciente', meta: s.date ? `Respondida em ${fmtD(s.date)}` : '' });
      blocks.push({ t: 'table', head: ['Pergunta', 'Resposta'], rows, widths: [3, 5] });
    });
    if (blocks.length) sections.push({ title: 'Anamnese', blocks });
  }

  // 3. Avaliação clínica
  {
    const blocks: Block[] = [];
    recs.filter(r => r.record_type === 'Avaliacao').forEach((r, i) => {
      const body = withRestricted(r, recordBody(r));
      if (!body.length) return;
      blocks.push({ t: 'h3', text: `Avaliação ${i + 1} - ${r.title}`, meta: recMeta(r) }, ...body);
    });
    if (blocks.length) { blocks.push({ t: 'note', text: 'Hipóteses e formulações são provisórias e não constituem conclusão diagnóstica até a finalização do processo avaliativo.' }); sections.push({ title: 'Avaliação clínica', blocks }); }
  }

  // 4. Plano terapêutico
  {
    const blocks: Block[] = [];
    recs.filter(r => r.record_type === 'Plano').forEach((r, i, arr) => {
      const plan = planOf(r);
      let body: Block[] = plan ? planBlocks(plan) : [];
      if (!body.length) { const c = text(r.content || r.draft_content); if (c) body = [{ t: 'p', text: c }]; }
      body = withRestricted(r, body);
      if (!body.length) return;
      blocks.push({ t: 'h3', text: arr.length > 1 ? `Plano ${i + 1} - ${r.title}` : r.title, meta: recMeta(r) }, ...body);
    });
    if (blocks.length) sections.push({ title: 'Plano terapêutico', blocks });
  }

  // 5. Evolução das sessões
  {
    const blocks: Block[] = [];
    evolutions.forEach((r, i) => {
      const body = withRestricted(r, recordBody(r));
      const moods = moodByDay.get(dayKey(r.created_at)) || [];
      const meta = [fmtD(r.created_at), r.appointment_type, r.start_time && `${r.start_time}${r.end_time ? ` - ${r.end_time}` : ''}`, r.status].filter(has).join('  -  ');
      const extra: Block[] = [];
      if (moods.length) extra.push({ t: 'field', label: 'Humor registrado', text: moods.map(moodText).join('; ') });
      if (r.tags && r.tags.length) extra.push({ t: 'field', label: 'Marcadores', text: r.tags.join(', ') });
      if (!body.length && !extra.length) return;
      blocks.push({ t: 'h3', text: `Sessão ${i + 1}${r.title ? ` - ${r.title}` : ''}`, meta }, ...body, ...extra);
    });
    if (blocks.length) sections.push({ title: 'Evolução das sessões', blocks });
  }

  // 6. Instrumentos e escalas
  {
    const rows = inp.instruments.map(i => [i.name, fmtD(i.date), i.fields.map(f => `${f.label}: ${f.value}`).join(' | ')]);
    if (rows.length) sections.push({ title: 'Instrumentos e escalas aplicados', blocks: [{ t: 'table', head: ['Instrumento', 'Data', 'Resultado'], rows, widths: [2.4, 1.2, 5.6] }] });
  }

  // 7. Documentos emitidos
  {
    const blocks: Block[] = [];
    recs.filter(r => ['Relatorio', 'Atestado', 'Encaminhamento'].includes(r.record_type)).forEach(r => {
      const body = withRestricted(r, text(r.content || r.draft_content) ? [{ t: 'p', text: text(r.content || r.draft_content) }] : recordBody(r));
      blocks.push({ t: 'h3', text: `${typeLabels[r.record_type] || r.record_type} - ${r.title}`, meta: recMeta(r) }, ...(body.length ? body : [{ t: 'note', text: 'Documento sem conteúdo textual registrado.' } as Block]));
    });
    if (blocks.length) sections.push({ title: 'Documentos emitidos', blocks });
  }

  // 8. Anexos
  if (inp.attachments.length) {
    sections.push({ title: 'Anexos e documentos', blocks: [{ t: 'table', head: ['Arquivo', 'Origem / data'], rows: inp.attachments.map(a => [a.name, a.detail || '']), widths: [5, 4] }] });
  }

  // 9. Linha do tempo e humor
  {
    type Row = { ts: number; cells: string[] };
    const rows: Row[] = [];
    evolutions.forEach((r, i) => {
      const l = legacyOf(r);
      const moods = moodByDay.get(dayKey(r.created_at)) || [];
      rows.push({
        ts: ts(r.created_at),
        cells: [fmtD(r.created_at), `Sessão ${i + 1}`, moods.length ? moods.map(mo => has(mo.score) ? `${mo.score}/5` : '').filter(Boolean).join(', ') : '', r.appointment_type || '',
          truncate(l.motivo_consulta || l.contexto_relevante || text(r.content || r.draft_content) || r.title || '', 110)],
      });
    });
    const evoDays = new Set(evolutions.map(r => dayKey(r.created_at)));
    inp.moods.forEach(mo => {
      if (evoDays.has(dayKey(mo.date))) return;
      rows.push({ ts: ts(mo.date), cells: [fmtD(mo.date), 'Registro de humor', has(mo.score) ? `${mo.score}/5` : '', '', truncate(moodText({ ...mo, score: undefined }), 110)] });
    });
    rows.sort((a, b) => a.ts - b.ts);
    if (rows.length) {
      sections.push({
        title: 'Linha do tempo e humor por sessão',
        blocks: [{ t: 'note', text: 'Humor: nota de 1 a 5 registrada pelo paciente na data indicada.' },
          { t: 'table', head: ['Data', 'Atendimento', 'Humor', 'Modalidade', 'Tema / resumo'], rows: rows.map(r => r.cells), widths: [1.2, 1.7, 1, 1.5, 4.6] }],
      });
    }
  }

  return {
    ...base,
    title: 'Prontuário Clínico',
    subtitle: undefined,
    banner: variant === 'shared' ? 'Versão compartilhada' : undefined,
    cover: true, toc: true, confidentialityTerm: true, sections,
    coverFacts: [
      { label: 'Nascimento', value: [fmtD(patient.birth_date), ageOf(patient.birth_date) && `(${ageOf(patient.birth_date)})`].filter(Boolean).join(' ') },
      { label: 'CPF', value: text(patient.cpf) },
      { label: 'Período dos registros', value: period },
      { label: 'Nº de registros', value: String(recs.length) },
      { label: 'Data de emissão', value: fmtDateBR(emitted) },
      { label: 'Profissional responsável', value: [inp.professional.name, inp.professional.registry].filter(has).join(' - ') },
      ...(variant === 'shared' ? [{ label: 'Observação', value: 'Contém apenas campos públicos/compartilhados; anotações restritas foram omitidas.' }] : []),
    ],
  };
}
