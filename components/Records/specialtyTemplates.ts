import type { LucideIcon } from 'lucide-react';
import {
  MessageSquare, Wrench, TrendingUp, ListChecks, ShieldAlert, ClipboardList, History,
  Brain, Lightbulb, Gauge, Send, FileCheck, Pill, Stethoscope, HeartPulse, Activity, Microscope, Target,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   Modelos de Avaliação / Evolução por especialidade.
   Os dados ficam em `ai_organized_content._estruturado` (JSON do registro),
   e cada campo com `legacy` também alimenta as chaves antigas (motivo_consulta,
   contexto_relevante...), então exportação, IA e registros antigos continuam funcionando.
═══════════════════════════════════════════════════════════════ */

export type SpecialtyId = 'psicologia' | 'psiquiatria' | 'medicina' | 'outros';
export type RecordKind = 'Evolucao' | 'Avaliacao';
export type FieldType = 'text' | 'textarea' | 'select' | 'multi' | 'date' | 'number' | 'rows' | 'goals' | 'followups';

export interface RowColumn { key: string; label: string; placeholder?: string }
export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  options?: string[];
  columns?: RowColumn[];
  rowsAddLabel?: string;
  /** Chave legada (ai_organized_content) que também recebe o texto deste campo. */
  legacy?: LegacyKey;
  /** Ocupa a linha inteira do grid. */
  full?: boolean;
  rows?: number;
  /** Campo exibido somente quando a função retorna true (ex.: detalhes de risco). */
  showIf?: (values: StructuredValues) => boolean;
  /** Campo principal da seção: define quando a seção conta como completa. */
  core?: boolean;
  /** Texto da opção vazia em selects (ex.: "Não avaliado"). */
  emptyLabel?: string;
}
export interface SectionDef {
  id: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  notice?: string;
  fields: FieldDef[];
}
export interface SpecialtyTemplate {
  id: SpecialtyId;
  label: string;
  description: string;
  evaluation: SectionDef[];
  evolution: SectionDef[];
}

export type LegacyKey =
  | 'motivo_consulta' | 'contexto_relevante' | 'observacoes_clinicas' | 'intervencoes_realizadas'
  | 'evolucao_resposta' | 'plano_terapeutico' | 'encaminhamentos' | 'observacao_complementar';

export type StructuredValues = Record<string, any>;
export interface StructuredPayload {
  v: 1;
  kind: RecordKind;
  template: SpecialtyId;
  values: StructuredValues;
  updated_at: string;
  /** Resumo de 1 parágrafo gerado a partir dos campos (sem IA), usado na lista/timeline. */
  resumo?: string;
  /** Metadados da sessão que não têm coluna própria. */
  meta?: { duracao_min?: number; modalidade?: string; agendamento_id?: string; ocorrencia?: string; falta_pendente?: boolean; proxima_reavaliacao?: string };
  /** Campos preenchidos por IA e ainda não confirmados/editados pelo profissional. */
  ai_fields?: string[];
  /** Origem (rótulos das fontes) de cada campo sugerido por IA. */
  ai_sources?: Record<string, string[]>;
}

/* ── Opções reutilizáveis ─────────────────────────────── */
export const HUMOR_OPTIONS = ['Positivo', 'Neutro', 'Negativo', 'Oscilante/misto', 'Não avaliado'] as const;
/** Valores antigos (escala de 5 pontos) são só traduzidos na leitura; o registro salvo não é reescrito. */
const HUMOR_LEGACY: Record<string, string> = { 'muito mal': 'Negativo', 'mal': 'Negativo', 'neutro': 'Neutro', 'bem': 'Positivo', 'muito bem': 'Positivo', 'muito_mal': 'Negativo', 'muito_bem': 'Positivo' };
export const normalizeHumor = (v: any): string => {
  const raw = String(v ?? '').trim();
  if (!raw) return '';
  return HUMOR_LEGACY[raw.toLowerCase()] || raw;
};
export const HUMOR_COLOR: Record<string, 'danger' | 'warning' | 'default' | 'info' | 'success'> = {
  'Positivo': 'success', 'Neutro': 'default', 'Negativo': 'warning', 'Oscilante/misto': 'info', 'Não avaliado': 'default',
};
export const MODALIDADES = ['individual', 'casal', 'familiar', 'grupo', 'online', 'presencial'];

const RISCO_OPTIONS = [
  'Sem indicação de risco', 'Ideação passiva', 'Ideação ativa sem plano', 'Ideação com plano',
  'Autolesão sem intenção suicida', 'Risco a terceiros', 'Risco não avaliado',
];
const ADESAO_OPTIONS = ['Boa', 'Parcial', 'Baixa', 'Não se aplica'];
const SIM_NAO = ['Sim', 'Não', 'Não avaliado'];
const ENCAMINHAMENTOS = [
  'Psiquiatria', 'Psicologia', 'Neurologia', 'Clínica médica', 'Neuropsicologia', 'Fonoaudiologia',
  'Terapia ocupacional', 'Nutrição', 'Assistência social', 'Serviço de urgência/CAPS', 'Grupo terapêutico',
];
const INSTRUMENT_COLS: RowColumn[] = [
  { key: 'nome', label: 'Instrumento / escala', placeholder: 'Ex.: PHQ-9, BDI-II, WISC-V' },
  { key: 'data', label: 'Data', placeholder: 'dd/mm/aaaa' },
  { key: 'resultado', label: 'Resultado / escore', placeholder: 'Ex.: 14 (moderado)' },
  { key: 'interpretacao', label: 'Interpretação', placeholder: 'Leitura clínica' },
];
const CID_COLS: RowColumn[] = [
  { key: 'codigo', label: 'CID', placeholder: 'Ex.: F32.1' },
  { key: 'descricao', label: 'Hipótese / diagnóstico', placeholder: 'Descrição' },
  { key: 'status', label: 'Situação', placeholder: 'Hipótese, confirmado, em investigação' },
];
const MEDS_COLS: RowColumn[] = [
  { key: 'nome', label: 'Medicamento', placeholder: 'Nome / princípio ativo' },
  { key: 'posologia', label: 'Dose e posologia', placeholder: 'Ex.: 50 mg, 1x ao dia' },
  { key: 'tempo', label: 'Tempo de uso', placeholder: 'Ex.: 6 meses' },
  { key: 'efeitos', label: 'Efeitos adversos / adesão', placeholder: 'Relato do paciente' },
];

const F = {
  text: (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type: 'text', ...extra }),
  area: (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type: 'textarea', full: true, ...extra }),
  select: (key: string, label: string, options: string[], extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type: 'select', options, ...extra }),
  multi: (key: string, label: string, options: string[], extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type: 'multi', options, full: true, ...extra }),
  rows: (key: string, label: string, columns: RowColumn[], extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type: 'rows', columns, full: true, ...extra }),
};

/* ── Seções compartilhadas ─────────────────────────────── */
const sharedSupport = (legacy: LegacyKey = 'observacao_complementar'): SectionDef => ({
  id: 'risco', label: 'Riscos', icon: ShieldAlert,
  description: 'Registre a avaliação de risco e a conduta adotada.',
  fields: [
    F.select('risco_suicida', 'Risco suicida / autolesão', RISCO_OPTIONS),
    F.select('risco_terceiros', 'Risco a terceiros', SIM_NAO),
    F.area('risco_fatores', 'Fatores de risco e proteção', { rows: 3, legacy }),
    F.area('risco_conduta', 'Conduta / plano de segurança', { rows: 3, legacy }),
  ],
});

const encaminhamentosSection = (): SectionDef => ({
  id: 'encaminhamentos', label: 'Encaminhamentos', icon: Send,
  description: 'Destino e justificativa dos encaminhamentos indicados.',
  fields: [
    F.multi('encaminhamentos', 'Encaminhar para', ENCAMINHAMENTOS, { legacy: 'encaminhamentos' }),
    F.area('encaminhamentos_obs', 'Justificativa e observações', { rows: 3, legacy: 'encaminhamentos' }),
  ],
});

/* ── Evolução de sessão (psicologia): seções completas ─────────── */
export const RISCO_TRIAGEM = [
  { key: 'ideacao', label: 'Ideação suicida' },
  { key: 'autolesao', label: 'Autolesão' },
  { key: 'heteroagressao', label: 'Heteroagressão' },
  { key: 'vulnerabilidade', label: 'Vulnerabilidade (violência, abuso, negligência, desamparo)' },
] as const;
const RISCO_TRIAGEM_OPTIONS = ['Sem indícios', 'Presente'];
export const FOLLOWUP_STATUS = ['Feita', 'Parcial', 'Não feita'] as const;
export const ABORDAGENS = [
  'TCC', 'Psicanálise', 'Humanista / ACP', 'Gestalt-terapia', 'ACT', 'Terapia sistêmica', 'Terapia do esquema', 'DBT', 'Psicodrama', 'Integrativa',
];
const anyRiskPresent = (v: StructuredValues) => RISCO_TRIAGEM.some(r => v[`risco_${r.key}`] === 'Presente');

function psicologiaEvolution(): SectionDef[] {
  return [
    {
      id: 'sessao', label: 'Sessão', icon: MessageSquare,
      description: 'Tema trabalhado, humor e relato do paciente.',
      fields: [
        F.text('tema', 'Tema da sessão', { legacy: 'motivo_consulta', placeholder: 'Ex.: conflito no trabalho, luto...', core: true }),
        F.select('humor', 'Humor no início da sessão', [...HUMOR_OPTIONS], { core: true }),
        F.area('relato', 'Relato e conteúdo da sessão', { legacy: 'contexto_relevante', rows: 7, placeholder: 'O que foi trazido e o que aconteceu na sessão.', core: true }),
      ],
    },
    {
      id: 'estado', label: 'Estado clínico', icon: HeartPulse,
      description: 'Observações do profissional durante a sessão. Marque só o que foi observado.',
      fields: [
        F.multi('afeto', 'Afeto / humor observado', ['Eutímico', 'Ansioso', 'Deprimido', 'Irritável', 'Lábil', 'Embotado', 'Expansivo', 'Apático', 'Choroso', 'Angustiado'], { legacy: 'observacoes_clinicas', core: true }),
        F.multi('aparencia', 'Aparência e comportamento', ['Cuidada', 'Descuidada', 'Colaborativo', 'Participativo', 'Retraído', 'Inquieto / agitado', 'Lentificado', 'Defensivo', 'Emocionado'], { legacy: 'observacoes_clinicas' }),
        F.multi('pensamento', 'Pensamento', ['Organizado', 'Coerente', 'Acelerado', 'Lentificado', 'Ruminativo', 'Desorganizado', 'Pensamentos intrusivos', 'Ideias de culpa', 'Ideias de desvalia', 'Preocupações excessivas'], { legacy: 'observacoes_clinicas' }),
        F.multi('sono_energia', 'Sono, apetite e energia', ['Sono preservado', 'Insônia', 'Sono excessivo', 'Apetite preservado', 'Apetite reduzido', 'Apetite aumentado', 'Energia preservada', 'Energia reduzida', 'Fadiga'], { legacy: 'observacoes_clinicas' }),
        F.area('queixas_novas', 'Queixas novas desde a última sessão', { legacy: 'observacoes_clinicas', rows: 3 }),
        F.area('estado_obs', 'Complemento do estado clínico', { legacy: 'observacoes_clinicas', rows: 3 }),
      ],
    },
    {
      id: 'intervencoes', label: 'Intervenções', icon: Wrench,
      description: 'O que foi feito na sessão e a qual objetivo do plano se relaciona.',
      fields: [
        F.multi('abordagem', 'Abordagem', ABORDAGENS, { legacy: 'intervencoes_realizadas' }),
        F.multi('intervencoes', 'Intervenções realizadas', [
          'Psicoeducação', 'Escuta e acolhimento', 'Validação emocional', 'Reestruturação cognitiva', 'Registro de pensamentos', 'Ativação comportamental',
          'Exposição', 'Treino de habilidades', 'Role-play', 'Técnica de relaxamento/respiração', 'Mindfulness', 'Interpretação',
          'Associação livre', 'Manejo de crise', 'Prevenção de recaída', 'Orientação a familiares',
        ], { legacy: 'intervencoes_realizadas', core: true }),
        F.text('tecnica', 'Técnica específica (livre)', { legacy: 'intervencoes_realizadas', placeholder: 'Ex.: cadeira vazia, linha da vida...', full: true }),
        F.area('intervencoes_obs', 'Detalhes das intervenções', { legacy: 'intervencoes_realizadas', rows: 3 }),
        { key: 'objetivos', label: 'Objetivo do plano relacionado', type: 'goals', full: true, legacy: 'plano_terapeutico' },
      ],
    },
    {
      id: 'resposta', label: 'Resposta e engajamento', icon: TrendingUp,
      fields: [
        F.area('resposta', 'Resposta do paciente às intervenções', { legacy: 'evolucao_resposta', rows: 4, core: true }),
        F.select('adesao', 'Engajamento / adesão', ADESAO_OPTIONS, { core: true }),
        F.area('avancos', 'Avanços e insights observados', { legacy: 'evolucao_resposta', rows: 3 }),
      ],
    },
    {
      id: 'tarefas', label: 'Tarefas', icon: ListChecks,
      description: 'Retorno das tarefas da sessão anterior e novas combinadas.',
      fields: [
        { key: 'tarefas_retorno', label: 'Retorno das tarefas anteriores', type: 'followups', full: true, legacy: 'evolucao_resposta' },
        F.area('tarefas', 'Novas tarefas combinadas', { legacy: 'plano_terapeutico', rows: 3, core: true }),
      ],
    },
    {
      id: 'plano', label: 'Plano e próxima sessão', icon: Target,
      fields: [
        F.area('proxima', 'Plano para a próxima sessão', { legacy: 'plano_terapeutico', rows: 3, core: true }),
        F.text('proxima_foco', 'Foco sugerido', { legacy: 'plano_terapeutico', placeholder: 'Ex.: retomar exposição gradual' }),
        { key: 'proxima_data', label: 'Data sugerida', type: 'date', legacy: 'plano_terapeutico' },
      ],
    },
    {
      id: 'risco', label: 'Risco e segurança', icon: ShieldAlert,
      description: 'Triagem de risco: marque conforme o que foi avaliado. "Não avaliado" significa que o tema não foi abordado.',
      fields: [
        ...RISCO_TRIAGEM.flatMap(r => ([
          F.select(`risco_${r.key}`, r.label, RISCO_TRIAGEM_OPTIONS, { legacy: 'observacoes_clinicas', emptyLabel: 'Não avaliado', core: true }),
          F.text(`risco_${r.key}_detalhe`, `${r.label}: detalhes`, { legacy: 'observacoes_clinicas', full: true, showIf: (v: StructuredValues) => v[`risco_${r.key}`] === 'Presente', placeholder: 'Descreva o que foi relatado/observado.' }),
        ])),
        F.select('risco_suicida', 'Risco (registro do modelo anterior)', RISCO_OPTIONS, { showIf: (v: StructuredValues) => isFilled(v.risco_suicida) }),
        F.area('risco_obs', 'Conduta e plano de segurança', { legacy: 'observacoes_clinicas', rows: 3, showIf: (v: StructuredValues) => anyRiskPresent(v) || isFilled(v.risco_obs) }),
      ],
    },
    {
      id: 'observacoes', label: 'Observações', icon: ClipboardList,
      fields: [
        F.area('observacoes', 'Observações clínicas', { legacy: 'observacao_complementar', rows: 4, core: true }),
      ],
    },
  ];
}

/* ══════════════ PSICOLOGIA (padrão) ══════════════ */
const PSICOLOGIA: SpecialtyTemplate = {
  id: 'psicologia',
  label: 'Psicologia',
  description: 'Queixa, formulação de caso, exame do estado mental, instrumentos e conclusão clínica.',
  evaluation: [
    {
      id: 'queixa', label: 'Queixa e demanda', icon: MessageSquare,
      description: 'O que traz o paciente e o que ele espera do processo.',
      fields: [
        F.area('queixa_principal', 'Queixa principal', { legacy: 'motivo_consulta', rows: 4, placeholder: 'Nas palavras do paciente, sempre que possível.' }),
        F.area('demanda', 'Demanda e expectativas', { legacy: 'motivo_consulta', rows: 3 }),
        F.text('inicio_curso', 'Início e curso dos sintomas', { placeholder: 'Ex.: há 8 meses, piora progressiva' }),
        F.text('encaminhador', 'Quem encaminhou / como chegou', {}),
      ],
    },
    {
      id: 'historia', label: 'História relevante', icon: History,
      description: 'Dados do desenvolvimento, familiares, sociais e de saúde úteis ao caso.',
      fields: [
        F.area('historia_pessoal', 'História pessoal e do desenvolvimento', { legacy: 'contexto_relevante', rows: 4 }),
        F.area('historia_familiar', 'Contexto familiar e relacional', { legacy: 'contexto_relevante', rows: 3 }),
        F.area('historia_saude', 'Saúde física e mental, tratamentos prévios, medicações', { legacy: 'contexto_relevante', rows: 3 }),
        F.area('historia_social', 'Trabalho, estudo e rede de apoio', { legacy: 'contexto_relevante', rows: 3 }),
      ],
    },
    {
      id: 'formulacao', label: 'Hipóteses e formulação', icon: Lightbulb,
      description: 'Compreensão do caso a partir dos dados coletados até aqui.',
      notice: 'Hipóteses diagnósticas não são conclusões: mantenha-as como hipóteses até que o processo avaliativo seja concluído.',
      fields: [
        F.area('hipoteses', 'Hipóteses diagnósticas / compreensão do caso', { legacy: 'observacoes_clinicas', rows: 4 }),
        F.area('fator_predisponente', 'Fatores predisponentes', { legacy: 'observacoes_clinicas', rows: 3, full: false }),
        F.area('fator_precipitante', 'Fatores precipitantes', { legacy: 'observacoes_clinicas', rows: 3, full: false }),
        F.area('fator_mantenedor', 'Fatores mantenedores', { legacy: 'observacoes_clinicas', rows: 3, full: false }),
        F.area('fator_protetivo', 'Fatores protetivos e recursos', { legacy: 'observacoes_clinicas', rows: 3, full: false }),
      ],
    },
    {
      id: 'exame', label: 'Estado mental', icon: Brain,
      description: 'Observações do exame do estado mental durante a avaliação.',
      fields: [
        F.text('em_aparencia', 'Aparência e comportamento'),
        F.text('em_atitude', 'Atitude durante o contato'),
        F.text('em_humor', 'Humor e afeto'),
        F.text('em_pensamento', 'Pensamento (curso, forma e conteúdo)'),
        F.text('em_percepcao', 'Sensopercepção'),
        F.text('em_cognicao', 'Orientação, atenção e memória'),
        F.text('em_insight', 'Insight e juízo crítico'),
        F.area('em_obs', 'Observações adicionais', { legacy: 'observacoes_clinicas', rows: 3 }),
      ],
    },
    {
      id: 'instrumentos', label: 'Instrumentos', icon: Gauge,
      description: 'Escalas, inventários e testes aplicados, com resultados e leitura clínica.',
      fields: [
        F.rows('instrumentos', 'Instrumentos aplicados', INSTRUMENT_COLS, { legacy: 'evolucao_resposta', rowsAddLabel: 'Adicionar instrumento' }),
        F.area('instrumentos_sintese', 'Síntese da integração dos resultados', { legacy: 'evolucao_resposta', rows: 3 }),
      ],
    },
    sharedSupport(),
    {
      id: 'conclusao', label: 'Conclusão', icon: FileCheck,
      description: 'Impressão clínica e orientações decorrentes da avaliação.',
      fields: [
        F.area('impressao', 'Impressão clínica / conclusão', { legacy: 'observacao_complementar', rows: 5 }),
        F.area('conduta', 'Conduta e plano de acompanhamento', { legacy: 'plano_terapeutico', rows: 3 }),
        F.area('devolutiva', 'Devolutiva ao paciente', { legacy: 'observacao_complementar', rows: 3 }),
      ],
    },
    encaminhamentosSection(),
  ],
  evolution: psicologiaEvolution(),
};

/* ══════════════ PSIQUIATRIA ══════════════ */
const PSIQUIATRIA: SpecialtyTemplate = {
  id: 'psiquiatria',
  label: 'Psiquiatria',
  description: 'HDA, antecedentes, medicações, exame psíquico detalhado, CID, risco suicida e conduta.',
  evaluation: [
    {
      id: 'queixa', label: 'Queixa e HDA', icon: MessageSquare,
      description: 'Queixa principal e história da doença atual.',
      fields: [
        F.area('queixa_principal', 'Queixa principal', { legacy: 'motivo_consulta', rows: 3 }),
        F.area('hda', 'História da doença atual (HDA)', { legacy: 'contexto_relevante', rows: 7 }),
        F.text('inicio_curso', 'Início, curso e fatores desencadeantes'),
        F.text('internacoes', 'Internações e atendimentos de urgência'),
      ],
    },
    {
      id: 'antecedentes', label: 'Antecedentes', icon: History,
      fields: [
        F.area('ant_psiq', 'Antecedentes psiquiátricos pessoais', { legacy: 'contexto_relevante', rows: 3 }),
        F.area('ant_fam', 'Antecedentes familiares (psiquiátricos e clínicos)', { legacy: 'contexto_relevante', rows: 3 }),
        F.area('ant_clin', 'Antecedentes clínicos, cirúrgicos e alergias', { legacy: 'contexto_relevante', rows: 3 }),
        F.area('substancias', 'Uso de álcool, tabaco e outras substâncias', { legacy: 'contexto_relevante', rows: 3 }),
        F.area('hist_social', 'História pessoal, social e ocupacional', { legacy: 'contexto_relevante', rows: 3 }),
      ],
    },
    {
      id: 'medicacoes', label: 'Medicações', icon: Pill,
      description: 'Medicações em uso e prévias, posologia e efeitos adversos.',
      fields: [
        F.rows('meds_uso', 'Medicações em uso', MEDS_COLS, { legacy: 'observacoes_clinicas', rowsAddLabel: 'Adicionar medicamento' }),
        F.area('meds_previas', 'Medicações prévias e resposta (eficácia, tolerância)', { legacy: 'observacoes_clinicas', rows: 3 }),
        F.area('efeitos_adversos', 'Efeitos adversos relatados ou observados', { legacy: 'observacoes_clinicas', rows: 3 }),
      ],
    },
    {
      id: 'exame', label: 'Exame psíquico', icon: Brain,
      description: 'Exame do estado mental detalhado.',
      fields: [
        F.text('ep_aparencia', 'Aparência e cuidados pessoais'),
        F.text('ep_atitude', 'Atitude e psicomotricidade'),
        F.text('ep_consciencia', 'Consciência e orientação'),
        F.text('ep_atencao', 'Atenção e memória'),
        F.text('ep_humor', 'Humor e afeto'),
        F.text('ep_pensamento', 'Pensamento: curso, forma e conteúdo'),
        F.text('ep_percepcao', 'Sensopercepção (alucinações, ilusões)'),
        F.text('ep_linguagem', 'Linguagem'),
        F.text('ep_volicao', 'Volição, sono e apetite'),
        F.text('ep_juizo', 'Juízo crítico e insight'),
        F.area('ep_obs', 'Síntese do exame psíquico', { legacy: 'observacoes_clinicas', rows: 3 }),
      ],
    },
    {
      id: 'risco', label: 'Risco suicida', icon: ShieldAlert,
      description: 'Avaliação estruturada de risco.',
      fields: [
        F.select('risco_suicida', 'Risco suicida', RISCO_OPTIONS),
        F.select('tentativas_previas', 'Tentativas prévias', SIM_NAO),
        F.select('risco_terceiros', 'Risco a terceiros', SIM_NAO),
        F.area('risco_fatores', 'Fatores de risco e de proteção', { legacy: 'observacao_complementar', rows: 3 }),
        F.area('risco_conduta', 'Conduta de segurança adotada', { legacy: 'observacao_complementar', rows: 3 }),
      ],
    },
    {
      id: 'hipoteses', label: 'Diagnóstico (CID)', icon: Stethoscope,
      notice: 'Registre como hipótese até que os critérios diagnósticos estejam plenamente atendidos.',
      fields: [
        F.rows('cid', 'Hipóteses e diagnósticos (CID-10 / CID-11)', CID_COLS, { legacy: 'observacoes_clinicas', rowsAddLabel: 'Adicionar CID' }),
        F.area('diag_diferencial', 'Diagnóstico diferencial e raciocínio clínico', { legacy: 'observacoes_clinicas', rows: 4 }),
      ],
    },
    {
      id: 'instrumentos', label: 'Escalas e exames', icon: Gauge,
      fields: [
        F.rows('instrumentos', 'Escalas aplicadas', INSTRUMENT_COLS, { legacy: 'evolucao_resposta', rowsAddLabel: 'Adicionar escala' }),
        F.area('exames_comp', 'Exames complementares (laboratoriais e de imagem)', { legacy: 'evolucao_resposta', rows: 3 }),
      ],
    },
    {
      id: 'conduta', label: 'Conduta e prescrição', icon: ClipboardList,
      fields: [
        F.area('conduta', 'Conduta', { legacy: 'plano_terapeutico', rows: 4 }),
        F.area('prescricao', 'Prescrição (medicamento, dose, posologia, duração)', { legacy: 'plano_terapeutico', rows: 4 }),
        F.area('exames_solicitados', 'Exames solicitados', { legacy: 'plano_terapeutico', rows: 3 }),
        F.text('retorno', 'Retorno previsto', { legacy: 'plano_terapeutico', placeholder: 'Ex.: 30 dias' }),
      ],
    },
    encaminhamentosSection(),
  ],
  evolution: [
    {
      id: 'sessao', label: 'Consulta', icon: MessageSquare,
      fields: [
        F.text('tema', 'Motivo do retorno', { legacy: 'motivo_consulta' }),
        F.select('humor', 'Humor referido', [...HUMOR_OPTIONS]),
        F.area('relato', 'Evolução desde a última consulta', { legacy: 'contexto_relevante', rows: 6 }),
        F.text('sono_apetite', 'Sono, apetite e energia'),
      ],
    },
    {
      id: 'medicacao', label: 'Medicação', icon: Pill,
      fields: [
        F.rows('meds_uso', 'Medicações em uso', MEDS_COLS, { legacy: 'intervencoes_realizadas', rowsAddLabel: 'Adicionar medicamento' }),
        F.select('adesao', 'Adesão ao tratamento', ADESAO_OPTIONS),
        F.area('efeitos_adversos', 'Efeitos adversos', { legacy: 'evolucao_resposta', rows: 3 }),
      ],
    },
    {
      id: 'exame', label: 'Exame psíquico', icon: Brain,
      fields: [F.area('exame_psiquico', 'Exame psíquico atual', { legacy: 'observacoes_clinicas', rows: 5 })],
    },
    {
      id: 'conduta', label: 'Conduta', icon: ClipboardList,
      fields: [
        F.area('conduta', 'Conduta (manutenção, ajuste, suspensão)', { legacy: 'plano_terapeutico', rows: 4 }),
        F.area('prescricao', 'Prescrição', { legacy: 'plano_terapeutico', rows: 3 }),
        F.area('exames_solicitados', 'Exames solicitados', { legacy: 'plano_terapeutico', rows: 2 }),
        { key: 'objetivos', label: 'Objetivos do plano trabalhados', type: 'goals', full: true, legacy: 'plano_terapeutico' },
        F.text('proxima', 'Retorno / próxima consulta', { legacy: 'plano_terapeutico' }),
      ],
    },
    {
      id: 'risco', label: 'Risco e observações', icon: ShieldAlert,
      fields: [
        F.select('risco_suicida', 'Risco suicida', RISCO_OPTIONS),
        F.area('risco_obs', 'Conduta frente ao risco', { legacy: 'observacoes_clinicas', rows: 3 }),
        F.area('observacoes', 'Observações', { legacy: 'observacao_complementar', rows: 3 }),
      ],
    },
  ],
};

/* ══════════════ MEDICINA GERAL / CLÍNICA ══════════════ */
const MEDICINA: SpecialtyTemplate = {
  id: 'medicina',
  label: 'Medicina geral / clínica',
  description: 'Queixa principal, HDA, antecedentes, exame físico, hipóteses diagnósticas e conduta.',
  evaluation: [
    {
      id: 'queixa', label: 'Queixa e HDA', icon: MessageSquare,
      fields: [
        F.area('queixa_principal', 'Queixa principal', { legacy: 'motivo_consulta', rows: 3 }),
        F.area('hda', 'História da doença atual (HDA)', { legacy: 'contexto_relevante', rows: 6 }),
        F.area('revisao_sistemas', 'Interrogatório sobre os diversos aparelhos', { legacy: 'contexto_relevante', rows: 4 }),
      ],
    },
    {
      id: 'antecedentes', label: 'Antecedentes', icon: History,
      fields: [
        F.area('ant_pessoais', 'Antecedentes pessoais (doenças, cirurgias, internações)', { legacy: 'contexto_relevante', rows: 3 }),
        F.area('ant_familiares', 'Antecedentes familiares', { legacy: 'contexto_relevante', rows: 3 }),
        F.area('habitos', 'Hábitos e estilo de vida', { legacy: 'contexto_relevante', rows: 3 }),
        F.text('alergias', 'Alergias'),
        F.rows('meds_uso', 'Medicações em uso', MEDS_COLS, { legacy: 'contexto_relevante', rowsAddLabel: 'Adicionar medicamento' }),
      ],
    },
    {
      id: 'exame', label: 'Exame físico', icon: HeartPulse,
      fields: [
        F.text('pa', 'Pressão arterial (mmHg)'), F.text('fc', 'Freq. cardíaca (bpm)'), F.text('fr', 'Freq. respiratória (irpm)'),
        F.text('temp', 'Temperatura (°C)'), F.text('spo2', 'SpO2 (%)'), F.text('peso_altura', 'Peso (kg) / altura (cm)'),
        F.area('exame_fisico', 'Exame físico geral e segmentar', { legacy: 'observacoes_clinicas', rows: 6 }),
      ],
    },
    {
      id: 'exames', label: 'Exames complementares', icon: Microscope,
      fields: [
        F.rows('exames_previos', 'Exames e resultados', [
          { key: 'nome', label: 'Exame' }, { key: 'data', label: 'Data' }, { key: 'resultado', label: 'Resultado' },
        ], { legacy: 'evolucao_resposta', rowsAddLabel: 'Adicionar exame' }),
        F.area('exames_obs', 'Comentários', { legacy: 'evolucao_resposta', rows: 3 }),
      ],
    },
    {
      id: 'hipoteses', label: 'Hipóteses diagnósticas', icon: Stethoscope,
      notice: 'Hipóteses diagnósticas não são conclusões: registre a situação (hipótese, em investigação ou confirmado).',
      fields: [
        F.rows('cid', 'Hipóteses e diagnósticos (CID)', CID_COLS, { legacy: 'observacoes_clinicas', rowsAddLabel: 'Adicionar CID' }),
        F.area('raciocinio', 'Raciocínio clínico', { legacy: 'observacoes_clinicas', rows: 4 }),
      ],
    },
    {
      id: 'conduta', label: 'Conduta e prescrição', icon: ClipboardList,
      fields: [
        F.area('conduta', 'Conduta', { legacy: 'plano_terapeutico', rows: 4 }),
        F.area('prescricao', 'Prescrição', { legacy: 'plano_terapeutico', rows: 4 }),
        F.area('exames_solicitados', 'Exames solicitados', { legacy: 'plano_terapeutico', rows: 3 }),
        F.area('orientacoes', 'Orientações ao paciente', { legacy: 'observacao_complementar', rows: 3 }),
        F.text('retorno', 'Retorno', { legacy: 'plano_terapeutico' }),
      ],
    },
    encaminhamentosSection(),
  ],
  evolution: [
    {
      id: 'subjetivo', label: 'Subjetivo (S)', icon: MessageSquare,
      fields: [
        F.text('tema', 'Motivo da consulta', { legacy: 'motivo_consulta' }),
        F.select('humor', 'Estado geral referido', [...HUMOR_OPTIONS]),
        F.area('relato', 'Queixas e evolução relatadas', { legacy: 'contexto_relevante', rows: 6 }),
      ],
    },
    {
      id: 'objetivo', label: 'Objetivo (O)', icon: Activity,
      fields: [
        F.text('pa', 'PA (mmHg)'), F.text('fc', 'FC (bpm)'), F.text('temp', 'Temperatura (°C)'), F.text('spo2', 'SpO2 (%)'),
        F.area('exame_fisico', 'Exame físico e resultados de exames', { legacy: 'observacoes_clinicas', rows: 5 }),
      ],
    },
    {
      id: 'avaliacao', label: 'Avaliação (A)', icon: Stethoscope,
      fields: [
        F.area('avaliacao', 'Avaliação e hipóteses', { legacy: 'evolucao_resposta', rows: 4 }),
        F.select('adesao', 'Adesão ao tratamento', ADESAO_OPTIONS),
      ],
    },
    {
      id: 'plano', label: 'Plano (P)', icon: ClipboardList,
      fields: [
        F.area('conduta', 'Conduta', { legacy: 'plano_terapeutico', rows: 3 }),
        F.area('prescricao', 'Prescrição', { legacy: 'plano_terapeutico', rows: 3 }),
        F.area('exames_solicitados', 'Exames solicitados', { legacy: 'plano_terapeutico', rows: 2 }),
        { key: 'objetivos', label: 'Objetivos do plano trabalhados', type: 'goals', full: true, legacy: 'plano_terapeutico' },
        F.text('proxima', 'Retorno', { legacy: 'plano_terapeutico' }),
      ],
    },
    {
      id: 'risco', label: 'Risco e observações', icon: ShieldAlert,
      fields: [
        F.select('risco_suicida', 'Risco', RISCO_OPTIONS),
        F.area('observacoes', 'Observações', { legacy: 'observacao_complementar', rows: 3 }),
      ],
    },
  ],
};

/* ══════════════ OUTROS (Fono, TO, Nutrição, Neuropsicologia...) ══════════════ */
const OUTROS: SpecialtyTemplate = {
  id: 'outros',
  label: 'Outras áreas de saúde',
  description: 'Fonoaudiologia, terapia ocupacional, nutrição, neuropsicologia e outras: seções genéricas.',
  evaluation: [
    {
      id: 'queixa', label: 'Queixa e demanda', icon: MessageSquare,
      fields: [
        F.area('queixa_principal', 'Queixa / demanda principal', { legacy: 'motivo_consulta', rows: 4 }),
        F.text('area_atuacao', 'Área de atuação da avaliação', { placeholder: 'Ex.: linguagem, motricidade, hábitos alimentares' }),
        F.text('encaminhador', 'Quem encaminhou'),
      ],
    },
    {
      id: 'historia', label: 'Histórico', icon: History,
      fields: [
        F.area('historia', 'Histórico relevante (desenvolvimento, saúde, escola/trabalho)', { legacy: 'contexto_relevante', rows: 5 }),
        F.area('tratamentos', 'Tratamentos e acompanhamentos anteriores', { legacy: 'contexto_relevante', rows: 3 }),
      ],
    },
    {
      id: 'avaliacao', label: 'Avaliação específica', icon: Microscope,
      description: 'Procedimentos e observações próprios da sua área.',
      fields: [
        F.area('observacao', 'Observações da avaliação', { legacy: 'observacoes_clinicas', rows: 6 }),
        F.rows('instrumentos', 'Instrumentos, testes e medidas', INSTRUMENT_COLS, { legacy: 'evolucao_resposta', rowsAddLabel: 'Adicionar instrumento' }),
      ],
    },
    {
      id: 'formulacao', label: 'Hipóteses e análise', icon: Lightbulb,
      notice: 'Hipóteses não são conclusões: descreva a análise funcional e o que ainda precisa ser investigado.',
      fields: [
        F.area('hipoteses', 'Hipóteses e análise funcional', { legacy: 'observacoes_clinicas', rows: 4 }),
        F.area('fatores', 'Fatores facilitadores e barreiras', { legacy: 'observacoes_clinicas', rows: 3 }),
      ],
    },
    sharedSupport(),
    {
      id: 'conclusao', label: 'Conclusão e conduta', icon: FileCheck,
      fields: [
        F.area('impressao', 'Conclusão / impressão profissional', { legacy: 'observacao_complementar', rows: 4 }),
        F.area('objetivos', 'Objetivos terapêuticos e conduta', { legacy: 'plano_terapeutico', rows: 4 }),
        F.text('frequencia', 'Frequência de atendimento sugerida', { legacy: 'plano_terapeutico' }),
      ],
    },
    encaminhamentosSection(),
  ],
  evolution: [
    {
      id: 'sessao', label: 'Atendimento', icon: MessageSquare,
      fields: [
        F.text('tema', 'Foco do atendimento', { legacy: 'motivo_consulta' }),
        F.select('humor', 'Disposição no atendimento', [...HUMOR_OPTIONS]),
        F.area('relato', 'Descrição do atendimento', { legacy: 'contexto_relevante', rows: 6 }),
      ],
    },
    {
      id: 'intervencoes', label: 'Procedimentos', icon: Wrench,
      fields: [
        F.multi('intervencoes', 'Procedimentos / técnicas utilizados', [
          'Orientação ao paciente', 'Orientação à família', 'Exercício dirigido', 'Atividade funcional', 'Reavaliação',
          'Treino de habilidades', 'Plano alimentar / ajuste', 'Estimulação cognitiva',
        ], { legacy: 'intervencoes_realizadas' }),
        F.area('intervencoes_obs', 'Detalhes', { legacy: 'intervencoes_realizadas', rows: 3 }),
      ],
    },
    {
      id: 'resposta', label: 'Resposta', icon: TrendingUp,
      fields: [
        F.area('resposta', 'Resposta e evolução do paciente', { legacy: 'evolucao_resposta', rows: 4 }),
        F.select('adesao', 'Engajamento / adesão', ADESAO_OPTIONS),
      ],
    },
    {
      id: 'plano', label: 'Metas e próximo passo', icon: Target,
      fields: [
        { key: 'objetivos', label: 'Objetivos do plano trabalhados', type: 'goals', full: true, legacy: 'plano_terapeutico' },
        F.area('tarefas', 'Orientações e tarefas para casa', { legacy: 'plano_terapeutico', rows: 3 }),
        F.area('proxima', 'Plano para o próximo atendimento', { legacy: 'plano_terapeutico', rows: 3 }),
      ],
    },
    {
      id: 'risco', label: 'Risco e observações', icon: ShieldAlert,
      fields: [
        F.select('risco_suicida', 'Risco', RISCO_OPTIONS),
        F.area('observacoes', 'Observações', { legacy: 'observacao_complementar', rows: 3 }),
      ],
    },
  ],
};

export const SPECIALTY_TEMPLATES: Record<SpecialtyId, SpecialtyTemplate> = {
  psicologia: PSICOLOGIA, psiquiatria: PSIQUIATRIA, medicina: MEDICINA, outros: OUTROS,
};
export const SPECIALTY_OPTIONS: { value: SpecialtyId; label: string }[] =
  (Object.values(SPECIALTY_TEMPLATES)).map(t => ({ value: t.id, label: t.label }));
/** Modelo usado quando não há especialidade definida (comportamento anterior). */
export const DEFAULT_SPECIALTY: SpecialtyId = 'psicologia';

export const getSections = (spec: SpecialtyId, kind: RecordKind): SectionDef[] =>
  (SPECIALTY_TEMPLATES[spec] || SPECIALTY_TEMPLATES[DEFAULT_SPECIALTY])[kind === 'Avaliacao' ? 'evaluation' : 'evolution'];

/* ── Detecção da especialidade do profissional ─────────── */
const norm = (s?: string | null) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Retorna null quando o perfil não permite concluir (o prontuário oferece o seletor de modelo). */
export function detectSpecialty(u?: { areaSlug?: string | null; areaName?: string | null; specialty?: string; doesPsychotherapy?: boolean; canPrescribeMedication?: boolean } | null): SpecialtyId | null {
  if (!u) return null;
  const slug = norm(u.areaSlug);
  if (slug) {
    if (slug === 'psiquiatra') return 'psiquiatria';
    if (slug === 'psicologo' || slug === 'psicanalista') return 'psicologia';
    if (['neurologista', 'medico-familia', 'geriatra'].includes(slug)) return 'medicina';
    return 'outros';
  }
  const text = norm(`${u.areaName || ''} ${u.specialty || ''}`);
  if (text.trim()) {
    if (/psiquiatr/.test(text)) return 'psiquiatria';
    if (/psicolog|psicanalis|terapeuta cognitiv|tcc/.test(text)) return 'psicologia';
    if (/medic|clinic|neurolog|geriatr|pediatr|cardiolog|endocrin/.test(text)) return 'medicina';
    return 'outros';
  }
  if (u.doesPsychotherapy) return 'psicologia';
  return null;
}

/* ── Serialização ──────────────────────────────────────── */
const isFilled = (v: any): boolean => {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.some(isFilled);
  if (typeof v === 'object') {
    // Linha de retorno de tarefa: o texto da tarefa vem pré-carregado, só conta quando há retorno.
    if ('tarefa' in v) return isFilled((v as any).status) || isFilled((v as any).comentario);
    return Object.values(v).some(isFilled);
  }
  return true;
};
export const hasValue = isFilled;
export const hasAnyValue = (values: StructuredValues | null | undefined) => !!values && Object.values(values).some(isFilled);

export function fieldToText(f: FieldDef, v: any): string {
  if (!isFilled(v)) return '';
  if (f.key === 'humor') return normalizeHumor(v);
  if (f.type === 'multi' || f.type === 'goals') return (v as string[]).filter(Boolean).join(', ');
  if (f.type === 'followups') {
    return (v as { tarefa?: string; status?: string; comentario?: string }[])
      .filter(isFilled)
      .map(r => `${r.tarefa || 'Tarefa'}: ${[r.status, r.comentario].filter(Boolean).join(' — ')}`)
      .join('\n');
  }
  if (f.type === 'rows') {
    return (v as Record<string, string>[])
      .filter(isFilled)
      .map(r => (f.columns || []).map(c => r[c.key]).filter(Boolean).join(' — '))
      .join('\n');
  }
  return String(v).trim();
}

/** Converte os valores estruturados nas chaves antigas (usadas por exportação, IA e viewer antigo). */
export function compileLegacy(sections: SectionDef[], values: StructuredValues): Partial<Record<LegacyKey, string>> {
  const buckets: Partial<Record<LegacyKey, { label: string; text: string }[]>> = {};
  sections.forEach(s => s.fields.forEach(f => {
    if (!f.legacy) return;
    const text = fieldToText(f, values[f.key]);
    if (!text) return;
    (buckets[f.legacy] = buckets[f.legacy] || []).push({ label: f.label, text });
  }));
  const out: Partial<Record<LegacyKey, string>> = {};
  (Object.keys(buckets) as LegacyKey[]).forEach(k => {
    const items = buckets[k]!;
    out[k] = items.length === 1 ? items[0].text : items.map(i => `${i.label}: ${i.text}`).join('\n');
  });
  return out;
}

/* ── Progresso por seção ───────────────────────────────── */
export type SectionStatus = 'empty' | 'partial' | 'done';
const visibleFields = (s: SectionDef, values: StructuredValues) => s.fields.filter(f => !f.showIf || f.showIf(values));
export function sectionStatus(s: SectionDef, values: StructuredValues): SectionStatus {
  const vis = visibleFields(s, values);
  const core = vis.filter(f => f.core);
  const base = core.length ? core : vis;
  const any = vis.some(f => isFilled(values[f.key]));
  if (!any) return 'empty';
  return base.every(f => isFilled(values[f.key])) ? 'done' : 'partial';
}
/** 0–100: seção completa vale 1, parcial 0,5. */
export function overallProgress(sections: SectionDef[], values: StructuredValues): number {
  if (!sections.length) return 0;
  const pts = sections.reduce((acc, s) => {
    const st = sectionStatus(s, values);
    return acc + (st === 'done' ? 1 : st === 'partial' ? 0.5 : 0);
  }, 0);
  return Math.round((pts / sections.length) * 100);
}

/** Converte a nota 1–5 do diário de humor no rótulo de humor da evolução. */
export const humorFromScore = (score?: number | string | null): string => {
  const n = Math.round(Number(score));
  if (!(n >= 1 && n <= 5)) return '';
  return n <= 2 ? 'Negativo' : n === 3 ? 'Neutro' : 'Positivo';
};

/** Separa um texto de tarefas (uma por linha, ;, • ou -) em itens. */
export const splitTasks = (text?: string | null): string[] =>
  String(text || '').split(/\r?\n|;|•/).map(t => t.replace(/^\s*[-*\d.)]+\s+/, '').trim()).filter(Boolean);

/** Resumo de 1 parágrafo montado só com os campos preenchidos (sem IA). */
export function buildResumo(values: StructuredValues): string {
  const list = (v: any) => (Array.isArray(v) ? v.filter(Boolean) : []);
  const parts: string[] = [];
  const clip = (t: string, n: number) => { const s = t.replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n).replace(/[\s,;:.-]+\S*$/, '') + '…' : s; };
  const sent = (t: string) => (/[.!?…]$/.test(t) ? t : `${t}.`);
  if (values.tema) parts.push(sent(`Tema: ${clip(String(values.tema), 90)}`));
  if (values.humor) parts.push(`Humor inicial ${normalizeHumor(values.humor).toLowerCase()}.`);
  if (values.relato) parts.push(sent(clip(String(values.relato), 220)));
  const estado = [...list(values.afeto), ...list(values.aparencia)].slice(0, 4);
  if (estado.length) parts.push(`Observado: ${estado.join(', ').toLowerCase()}.`);
  const intervs = list(values.intervencoes);
  if (intervs.length) parts.push(`Intervenções: ${intervs.slice(0, 4).join(', ').toLowerCase()}${intervs.length > 4 ? ` e outras ${intervs.length - 4}` : ''}.`);
  if (values.resposta) parts.push(sent(`Resposta: ${clip(String(values.resposta), 120)}`));
  const presentes = RISCO_TRIAGEM.filter(r => values[`risco_${r.key}`] === 'Presente').map(r => r.label.split(' (')[0].toLowerCase());
  if (presentes.length) parts.push(`Atenção ao risco: ${presentes.join(', ')}.`);
  if (values.proxima) parts.push(sent(`Próxima sessão: ${clip(String(values.proxima), 110)}`));
  return parts.join(' ').trim();
}

export function parseStructured(raw?: string | null): StructuredPayload | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    const s = obj?._estruturado;
    if (s && typeof s === 'object' && s.values) return s as StructuredPayload;
  } catch { /* registro antigo ou inválido */ }
  return null;
}
