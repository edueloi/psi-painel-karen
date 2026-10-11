/**
 * Pontuação pura dos Inventários de Esquemas (sem React, sem rede).
 * Reproduz as fórmulas das abas "Resultado*" da planilha:
 *  - YSQ: total = soma dos 5 itens do esquema; média = total / 5; situação "ATIVADO" se média >= 3,5.
 *  - Estilos Parentais (YPI): média por esquema para MÃE e PAI (soma dos itens / nº de itens do esquema).
 *  - YAMI: frequência = média dos itens do modo.
 *  - YCI / YRAI: média de todos os itens (48 e 40).
 *  - RNE: registro de necessidades emocionais não atendidas por figura (mãe/pai/terceiro).
 *  - Resultado GERAL: síntese por domínio (YSQ + estilos parentais), modos YAMI, YCI, YRAI e RNE.
 *
 * Aceita respostas parciais: a média/situação oficial só existe quando todos os itens da subescala foram
 * respondidos (na planilha, célula em branco contaria como 0); `partialMean` mostra a média dos itens já respondidos.
 *
 * Formato das respostas (Record<string, number | string>):
 *  - escalas (ysq, yami, yci, yrai): chave = número do item ("1".."n"), valor = 1..6
 *  - ypi: "m<n>" (mãe) e "p<n>" (pai); "m_na"/"p_na" = 1 quando não teve mãe/pai
 *  - rne: "n<n>_mae" | "n<n>_pai" | "n<n>_ter" = 1; "n<n>_none" = 1 (nenhuma); "person<k>_name|age|scene" = texto
 */
import {
  DOMAINS, INSTRUMENTS, RNE_FIGURES, RNE_PERSONS, SCHEMAS, YSQ_CUTOFF,
  type Domain, type Instrument, type InstrumentId, type ModeGroup, type Subscale,
} from './instruments';

export type AnswerValue = number | string;
export type Answers = Record<string, AnswerValue>;
export type FigureId = (typeof RNE_FIGURES)[number]['id'];

/* ───────────── Chaves ───────────── */
export const answerKey = {
  scale: (n: number) => String(n),
  parent: (side: 'm' | 'p', n: number) => `${side}${n}`,
  parentNA: (side: 'm' | 'p') => `${side}_na`,
  need: (n: number, fig: FigureId) => `n${n}_${fig}`,
  needNone: (n: number) => `n${n}_none`,
  person: (k: number, f: 'name' | 'age' | 'scene') => `person${k}_${f}`,
};

const num = (v: AnswerValue | undefined): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};
const isScaleValue = (inst: Instrument, v: AnswerValue | undefined) => {
  const n = num(v);
  return n !== null && inst.scale.some(s => s.value === n);
};

/* ───────────── Progresso ───────────── */
export interface Progress { answered: number; total: number; progress: number; complete: boolean }
const mkProgress = (answered: number, total: number, complete?: boolean): Progress => ({
  answered, total, progress: total > 0 ? answered / total : 0, complete: complete ?? (total > 0 && answered >= total),
});

export const parentNA = (answers: Answers, side: 'm' | 'p') => num(answers[answerKey.parentNA(side)]) === 1;

export function needRowAnswered(answers: Answers, n: number): boolean {
  if (num(answers[answerKey.needNone(n)]) === 1) return true;
  return RNE_FIGURES.some(f => num(answers[answerKey.need(n, f.id)]) === 1);
}

export function getProgress(instrumentId: InstrumentId, answers: Answers): Progress {
  const inst = INSTRUMENTS[instrumentId];
  if (inst.responseType === 'scale') {
    const answered = inst.items.filter(it => isScaleValue(inst, answers[answerKey.scale(it.n)])).length;
    return mkProgress(answered, inst.itemCount);
  }
  if (inst.responseType === 'parents') {
    const sides: ('m' | 'p')[] = ['m', 'p'];
    const active = sides.filter(s => !parentNA(answers, s));
    const answered = active.reduce((acc, s) => acc + inst.items.filter(it => isScaleValue(inst, answers[answerKey.parent(s, it.n)])).length, 0);
    const total = active.length * inst.itemCount;
    // sem nenhuma figura parental (mãe e pai marcados como "não teve") o questionário não pode ser concluído
    return mkProgress(answered, total, active.length > 0 && answered >= total);
  }
  const answered = inst.items.filter(it => needRowAnswered(answers, it.n)).length;
  return mkProgress(answered, inst.itemCount);
}

/** O item n está respondido? (YPI: exige mãe e pai, exceto o lado marcado como "não se aplica".) */
export function isItemAnswered(instrumentId: InstrumentId, answers: Answers, n: number): boolean {
  const inst = INSTRUMENTS[instrumentId];
  if (inst.responseType === 'scale') return isScaleValue(inst, answers[answerKey.scale(n)]);
  if (inst.responseType === 'needs') return needRowAnswered(answers, n);
  return (['m', 'p'] as const).every(s => parentNA(answers, s) || isScaleValue(inst, answers[answerKey.parent(s, n)]));
}

/** Primeiro item ainda sem resposta (para "continuar de onde parou"); null se tudo respondido. */
export function firstUnansweredIndex(instrumentId: InstrumentId, answers: Answers): number | null {
  const inst = INSTRUMENTS[instrumentId];
  for (let i = 0; i < inst.items.length; i++) {
    const n = inst.items[i].n;
    if (inst.responseType === 'scale' && !isScaleValue(inst, answers[answerKey.scale(n)])) return i;
    if (inst.responseType === 'needs' && !needRowAnswered(answers, n)) return i;
    if (inst.responseType === 'parents') {
      const pending = (['m', 'p'] as const).some(s => !parentNA(answers, s) && !isScaleValue(inst, answers[answerKey.parent(s, n)]));
      if (pending) return i;
    }
  }
  return null;
}

/* ───────────── Resultados ───────────── */
export interface SubscaleScore {
  id: string;
  name: string;
  shortName?: string;
  domainId?: string;
  group?: ModeGroup;
  itemCount: number;
  answered: number;
  sum: number;
  /** Média oficial (soma / nº de itens); null enquanto a subescala não estiver completa. */
  mean: number | null;
  /** Média dos itens já respondidos (informativa, para resultados parciais). */
  partialMean: number | null;
  complete: boolean;
  /** YSQ: média >= 3,5 (aba Resultado YSQ). Sempre false nos demais instrumentos. */
  activated: boolean;
}

function scoreSubscale(inst: Instrument, sub: Subscale, read: (n: number) => number | null): SubscaleScore {
  let sum = 0; let answered = 0;
  for (const n of sub.items) {
    const v = read(n);
    if (v !== null) { sum += v; answered++; }
  }
  const itemCount = sub.items.length;
  const complete = answered === itemCount;
  const mean = complete ? sum / itemCount : null;
  return {
    id: sub.id, name: sub.name, shortName: sub.shortName, domainId: sub.domainId, group: sub.group,
    itemCount, answered, sum, mean, partialMean: answered > 0 ? sum / answered : null, complete,
    activated: inst.cutoff !== undefined && mean !== null && mean >= inst.cutoff,
  };
}

export interface ScaleScore {
  kind: 'scale';
  instrumentId: InstrumentId;
  progress: Progress;
  subscales: SubscaleScore[];
  /** YCI/YRAI: subescala única "Média geral"; nos demais, null. */
  overall: SubscaleScore | null;
  activatedIds: string[];
}
export interface ParentSide { na: boolean; subscales: SubscaleScore[] }
export interface ParentsScore { kind: 'parents'; instrumentId: 'ypi'; progress: Progress; mother: ParentSide; father: ParentSide }
export interface NeedRow {
  n: number; domainId: string; needLabel: string; schemaId?: string; schemaName?: string; text: string;
  marks: Record<FigureId, boolean>; none: boolean; answered: boolean;
}
export interface NeedsScore {
  kind: 'needs';
  instrumentId: 'rne';
  progress: Progress;
  rows: NeedRow[];
  /** Quantidade de necessidades marcadas por figura. */
  totals: Record<FigureId, number>;
  persons: { k: number; name: string; age: string; scene: string }[];
}
export type InstrumentScore = ScaleScore | ParentsScore | NeedsScore;

export function scoreInstrument(instrumentId: InstrumentId, answers: Answers): InstrumentScore {
  const inst = INSTRUMENTS[instrumentId];
  const progress = getProgress(instrumentId, answers);

  if (inst.responseType === 'scale') {
    const read = (n: number) => { const v = answers[answerKey.scale(n)]; return isScaleValue(inst, v) ? num(v) : null; };
    const subscales = inst.subscales.map(s => scoreSubscale(inst, s, read));
    const single = instrumentId === 'yci' || instrumentId === 'yrai';
    return {
      kind: 'scale', instrumentId, progress, subscales, overall: single ? subscales[0] : null,
      activatedIds: subscales.filter(s => s.activated).map(s => s.id),
    };
  }

  if (inst.responseType === 'parents') {
    const side = (s: 'm' | 'p'): ParentSide => {
      const na = parentNA(answers, s);
      const read = (n: number) => { const v = answers[answerKey.parent(s, n)]; return !na && isScaleValue(inst, v) ? num(v) : null; };
      return { na, subscales: inst.subscales.map(sub => scoreSubscale(inst, sub, read)) };
    };
    return { kind: 'parents', instrumentId: 'ypi', progress, mother: side('m'), father: side('p') };
  }

  const rows: NeedRow[] = inst.items.map(it => {
    const marks = { mae: false, pai: false, ter: false } as Record<FigureId, boolean>;
    RNE_FIGURES.forEach(f => { marks[f.id] = num(answers[answerKey.need(it.n, f.id)]) === 1; });
    const none = num(answers[answerKey.needNone(it.n)]) === 1;
    return {
      n: it.n, domainId: it.domainId || '', needLabel: it.needLabel || '', schemaId: it.schemaId, schemaName: it.schemaName, text: it.text,
      marks, none, answered: none || marks.mae || marks.pai || marks.ter,
    };
  });
  const totals = { mae: 0, pai: 0, ter: 0 } as Record<FigureId, number>;
  rows.forEach(r => RNE_FIGURES.forEach(f => { if (r.marks[f.id]) totals[f.id]++; }));
  const persons = RNE_PERSONS.map(k => ({
    k,
    name: String(answers[answerKey.person(k, 'name')] ?? ''),
    age: String(answers[answerKey.person(k, 'age')] ?? ''),
    scene: String(answers[answerKey.person(k, 'scene')] ?? ''),
  }));
  return { kind: 'needs', instrumentId: 'rne', progress, rows, totals, persons };
}

/* ───────────── Resultado GERAL ───────────── */
export interface GeneralSchemaRow {
  schemaId: string; name: string;
  ysqMean: number | null; ysqPartialMean: number | null; activated: boolean;
  mother: number | null; father: number | null;
  /** Isolamento Social não tem escala correspondente nos Estilos Parentais. */
  hasParental: boolean;
}
export interface GeneralDomain { domain: Domain; rows: GeneralSchemaRow[]; activatedCount: number; needs: NeedRow[] }
export interface GeneralResult {
  domains: GeneralDomain[];
  modes: { id: string; name: string; group?: ModeGroup; mean: number | null }[];
  yci: number | null;
  yrai: number | null;
  activatedTotal: number;
  /** Instrumentos com pelo menos uma resposta. */
  started: InstrumentId[];
  completed: InstrumentId[];
}

export function buildGeneral(all: Partial<Record<InstrumentId, Answers>>): GeneralResult {
  const sc = (id: InstrumentId) => (all[id] ? scoreInstrument(id, all[id] as Answers) : null);
  const ysq = sc('ysq') as ScaleScore | null;
  const ypi = sc('ypi') as ParentsScore | null;
  const yami = sc('yami') as ScaleScore | null;
  const yci = sc('yci') as ScaleScore | null;
  const yrai = sc('yrai') as ScaleScore | null;
  const rne = sc('rne') as NeedsScore | null;

  const domains: GeneralDomain[] = DOMAINS.map(domain => {
    const rows: GeneralSchemaRow[] = SCHEMAS.filter(s => s.domainId === domain.id).map(s => {
      const y = ysq?.subscales.find(x => x.id === s.id);
      const m = ypi?.mother.subscales.find(x => x.id === s.id);
      const p = ypi?.father.subscales.find(x => x.id === s.id);
      return {
        schemaId: s.id, name: s.name,
        ysqMean: y?.mean ?? null, ysqPartialMean: y?.partialMean ?? null, activated: !!y?.activated,
        mother: m?.mean ?? null, father: p?.mean ?? null,
        hasParental: INSTRUMENTS.ypi.subscales.some(x => x.id === s.id),
      };
    });
    return { domain, rows, activatedCount: rows.filter(r => r.activated).length, needs: rne ? rne.rows.filter(r => r.domainId === domain.id) : [] };
  });

  const progressOf = (id: InstrumentId) => (all[id] ? getProgress(id, all[id] as Answers) : null);
  const started = (Object.keys(INSTRUMENTS) as InstrumentId[]).filter(id => (progressOf(id)?.answered || 0) > 0);
  const completed = started.filter(id => progressOf(id)?.complete);

  return {
    domains,
    modes: INSTRUMENTS.yami.subscales.map(s => ({ id: s.id, name: s.name, group: s.group, mean: yami?.subscales.find(x => x.id === s.id)?.mean ?? null })),
    yci: yci?.overall?.mean ?? null,
    yrai: yrai?.overall?.mean ?? null,
    activatedTotal: domains.reduce((a, d) => a + d.activatedCount, 0),
    started, completed,
  };
}

/* ───────────── Apresentação ───────────── */
export const fmt = (v: number | null | undefined, digits = 2) => (v === null || v === undefined ? '-' : v.toFixed(digits).replace('.', ','));
export const pct = (p: Progress) => Math.round(p.progress * 100);
export const SITUATION_ACTIVE = 'ATIVADO';
export const SITUATION_INACTIVE = 'Não ativado';
export const YSQ_RULE_TEXT = `Situação "${SITUATION_ACTIVE}" quando a média do esquema (soma dos 5 itens / 5) é maior ou igual a ${String(YSQ_CUTOFF).replace('.', ',')}, conforme a planilha de referência.`;

/** Posição aproximada da média na escala de 1 a 6 (0..1) para barras. */
export const scaleFraction = (mean: number | null, max = 6) => (mean === null ? 0 : Math.max(0, Math.min(1, mean / max)));
