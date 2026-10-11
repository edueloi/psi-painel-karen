import type React from 'react';
import {
  ClipboardList, Brain, Rocket, Wallet, CalendarClock, Filter, FileSignature, LayoutGrid,
  User, CalendarDays, Receipt, FileText, Folder, Star, Heart, Target, Users, Briefcase, Flag, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Configuração dos Quadros: tipos, modelos, campos por tipo, paleta de cores
// e utilitários de cor. O TIPO do quadro (board_type) define colunas padrão,
// campos do cartão, totais de coluna e ações rápidas.
// ─────────────────────────────────────────────────────────────────────────────

export type BoardTypeKey =
  | 'geral' | 'clinico' | 'projeto' | 'financeiro' | 'atividade' | 'funil' | 'documentos' | 'branco';

export type LinkType = 'patient' | 'appointment' | 'comanda' | 'record';

export interface CardLink {
  type: LinkType;
  id: string;
  label: string;
  meta?: string;
  /** Paciente do vínculo (usado para abrir o prontuário). */
  patientId?: string;
}

export interface ChecklistItem { id: string; text: string; done: boolean }

export interface ColumnDraft { key: string; title: string; color: string }

export type FieldKind = 'text' | 'textarea' | 'select' | 'date' | 'datetime' | 'number' | 'money';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: readonly string[];
  placeholder?: string;
  /** Campo guardado em coluna própria do cartão; senão fica em details_json. */
  root?: 'amount' | 'due_date' | 'assignee';
  /** Mostra no corpo do cartão (linha resumida). */
  showOnCard?: boolean;
  full?: boolean;
}

export interface BoardTypeDef {
  key: BoardTypeKey;
  label: string;
  short: string;
  description: string;
  icon: LucideIcon;
  color: string;
  columns: readonly { title: string; color: string }[];
  cardNoun: string;
  cardNounPlural: string;
  newCardLabel: string;
  /** Campos extras do tipo (além dos genéricos). */
  fields: readonly FieldDef[];
  common: { priority: boolean; assignee: boolean; due: boolean; checklist: boolean; tags: boolean };
  dueLabel: string;
  assigneeLabel: string;
  descriptionLabel: string;
  patientLabel: string;
  patientRequired: boolean;
  /** Total somado no cabeçalho da coluna. */
  total: 'money' | 'hours' | null;
  /** Vínculos oferecidos no cartão. */
  links: readonly LinkType[];
  /** Ações rápidas a partir do cartão. */
  actions: readonly ('appointment' | 'comanda' | 'record' | 'patient')[];
  /** Títulos de colunas que significam "concluído" (para atraso/sugestões). */
  doneColumn?: RegExp;
  titlePlaceholder: string;
}

const TAB_NONE = { priority: false, assignee: false, due: false, checklist: false, tags: false };

export const BOARD_TYPES: Record<BoardTypeKey, BoardTypeDef> = {
  geral: {
    key: 'geral', label: 'Geral', short: 'Geral', icon: ClipboardList, color: '#3b82f6',
    description: 'Tarefas e anotações livres da clínica, com prazo, responsável e checklist.',
    columns: [{ title: 'A Fazer', color: '#94a3b8' }, { title: 'Em Progresso', color: '#3b82f6' }, { title: 'Concluído', color: '#10b981' }],
    cardNoun: 'cartão', cardNounPlural: 'cartões', newCardLabel: 'Novo cartão',
    fields: [],
    common: { priority: true, assignee: true, due: true, checklist: true, tags: true },
    dueLabel: 'Prazo', assigneeLabel: 'Responsável', descriptionLabel: 'Descrição', patientLabel: 'Paciente (opcional)', patientRequired: false,
    total: null, links: ['patient', 'appointment'], actions: ['patient'], titlePlaceholder: 'Ex: Renovar contrato do consultório',
  },
  clinico: {
    key: 'clinico', label: 'Acompanhamento clínico', short: 'Clínico', icon: Brain, color: '#8b5cf6',
    description: 'Casos por paciente: queixa, hipótese provisória, risco, abordagem e próxima sessão.',
    columns: [{ title: 'Avaliação', color: '#f59e0b' }, { title: 'Em Acompanhamento', color: '#3b82f6' }, { title: 'Alta/Encerrado', color: '#10b981' }],
    cardNoun: 'caso', cardNounPlural: 'casos', newCardLabel: 'Novo caso',
    fields: [
      { key: 'complaint', label: 'Queixa principal', kind: 'textarea', full: true },
      { key: 'hypothesis', label: 'Hipótese provisória', kind: 'textarea', placeholder: 'Hipótese de trabalho — não é diagnóstico.', full: true },
      { key: 'risk_level', label: 'Risco / alerta', kind: 'select', options: ['Baixo', 'Moderado', 'Alto'], showOnCard: true },
      { key: 'approach', label: 'Abordagem', kind: 'text', placeholder: 'Ex: TCC, Psicanálise, ACT', showOnCard: true },
      { key: 'next_session', label: 'Próxima sessão', kind: 'datetime', showOnCard: true },
    ],
    common: { priority: true, assignee: false, due: false, checklist: true, tags: true },
    dueLabel: 'Prazo', assigneeLabel: 'Responsável', descriptionLabel: 'Resumo do caso', patientLabel: 'Paciente', patientRequired: true,
    total: null, links: ['patient', 'appointment', 'record', 'comanda'], actions: ['patient', 'appointment', 'record'],
    titlePlaceholder: 'Ex: Avaliação inicial — nome do paciente',
  },
  projeto: {
    key: 'projeto', label: 'Projeto / Tarefas', short: 'Projeto', icon: Rocket, color: '#6366f1',
    description: 'Tarefas com responsável, prioridade, prazo e checklist com progresso.',
    columns: [{ title: 'Backlog', color: '#94a3b8' }, { title: 'Em Andamento', color: '#3b82f6' }, { title: 'Revisão', color: '#8b5cf6' }, { title: 'Entregue', color: '#10b981' }],
    cardNoun: 'tarefa', cardNounPlural: 'tarefas', newCardLabel: 'Nova tarefa',
    fields: [],
    common: { priority: true, assignee: true, due: true, checklist: true, tags: true },
    dueLabel: 'Prazo de entrega', assigneeLabel: 'Responsável', descriptionLabel: 'Descrição', patientLabel: 'Paciente (opcional)', patientRequired: false,
    total: null, links: ['patient'], actions: [], doneColumn: /entregue|conclu/i, titlePlaceholder: 'Ex: Entrega do relatório',
  },
  financeiro: {
    key: 'financeiro', label: 'Financeiro', short: 'Financeiro', icon: Wallet, color: '#10b981',
    description: 'Contas a receber e a pagar com valor, vencimento, situação e comanda vinculada.',
    columns: [{ title: 'A Receber', color: '#f59e0b' }, { title: 'Recebido', color: '#10b981' }, { title: 'A Pagar', color: '#ef4444' }, { title: 'Pago', color: '#14b8a6' }],
    cardNoun: 'lançamento', cardNounPlural: 'lançamentos', newCardLabel: 'Novo lançamento',
    fields: [
      { key: 'amount', root: 'amount', label: 'Valor (R$)', kind: 'money', showOnCard: true },
      { key: 'due_date', root: 'due_date', label: 'Vencimento', kind: 'date', showOnCard: true },
      { key: 'fin_status', label: 'Situação', kind: 'select', options: ['Pendente', 'Parcial', 'Pago', 'Cancelado'], showOnCard: true },
      { key: 'payment_method', label: 'Forma de pagamento', kind: 'select', options: ['PIX', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro', 'Transferência', 'Boleto', 'Outro'] },
    ],
    common: { priority: false, assignee: true, due: false, checklist: false, tags: true },
    dueLabel: 'Vencimento', assigneeLabel: 'Responsável', descriptionLabel: 'Observações', patientLabel: 'Paciente (opcional)', patientRequired: false,
    total: 'money', links: ['patient', 'comanda', 'appointment'], actions: ['comanda', 'patient'], doneColumn: /recebido|pago/i,
    titlePlaceholder: 'Ex: Mensalidade de março',
  },
  atividade: {
    key: 'atividade', label: 'Agenda / Atividades', short: 'Atividade', icon: CalendarClock, color: '#0ea5e9',
    description: 'Atividades com data e hora, duração, local ou modalidade e participantes.',
    columns: [{ title: 'Planejado', color: '#94a3b8' }, { title: 'Em Execução', color: '#3b82f6' }, { title: 'Finalizado', color: '#10b981' }],
    cardNoun: 'atividade', cardNounPlural: 'atividades', newCardLabel: 'Nova atividade',
    fields: [
      { key: 'event_at', label: 'Data e hora', kind: 'datetime', showOnCard: true },
      { key: 'duration', label: 'Duração (min)', kind: 'number', placeholder: '60', showOnCard: true },
      { key: 'modality', label: 'Modalidade', kind: 'select', options: ['Presencial', 'Online', 'Externo'], showOnCard: true },
      { key: 'location', label: 'Local ou link', kind: 'text' },
      { key: 'participants', label: 'Participantes', kind: 'text', placeholder: 'Nomes separados por vírgula', full: true },
    ],
    common: { priority: false, assignee: true, due: false, checklist: true, tags: true },
    dueLabel: 'Prazo', assigneeLabel: 'Responsável', descriptionLabel: 'Descrição', patientLabel: 'Paciente (opcional)', patientRequired: false,
    total: 'hours', links: ['patient', 'appointment'], actions: ['appointment'], doneColumn: /finaliz|conclu/i,
    titlePlaceholder: 'Ex: Supervisão em grupo',
  },
  funil: {
    key: 'funil', label: 'Funil de pacientes', short: 'Funil', icon: Filter, color: '#f59e0b',
    description: 'Captação, primeira sessão, ativo, pausado e alta, com contato, origem e próxima ação.',
    columns: [{ title: 'Captação', color: '#94a3b8' }, { title: 'Primeira sessão', color: '#3b82f6' }, { title: 'Ativo', color: '#10b981' }, { title: 'Pausado', color: '#f59e0b' }, { title: 'Alta', color: '#8b5cf6' }],
    cardNoun: 'contato', cardNounPlural: 'contatos', newCardLabel: 'Novo contato',
    fields: [
      { key: 'contact', label: 'Contato (telefone ou e-mail)', kind: 'text', showOnCard: true },
      { key: 'origin', label: 'Origem', kind: 'select', options: ['Indicação', 'Instagram', 'Google', 'Convênio', 'Site', 'Evento', 'Outro'], showOnCard: true },
      { key: 'interest', label: 'Serviço de interesse', kind: 'text', showOnCard: true },
      { key: 'amount', root: 'amount', label: 'Valor estimado (R$)', kind: 'money' },
      { key: 'contact_date', label: 'Data do contato', kind: 'date' },
      { key: 'next_action', label: 'Próxima ação', kind: 'text', placeholder: 'Ex: Ligar na quinta', showOnCard: true, full: true },
    ],
    common: { priority: false, assignee: true, due: false, checklist: false, tags: true },
    dueLabel: 'Prazo', assigneeLabel: 'Responsável', descriptionLabel: 'Observações', patientLabel: 'Paciente (se já cadastrado)', patientRequired: false,
    total: null, links: ['patient', 'appointment'], actions: ['appointment', 'patient'], titlePlaceholder: 'Nome da pessoa interessada',
  },
  documentos: {
    key: 'documentos', label: 'Documentos / Encaminhamentos', short: 'Documentos', icon: FileSignature, color: '#14b8a6',
    description: 'Documentos por paciente com tipo e status de envio ou assinatura.',
    columns: [{ title: 'A preparar', color: '#94a3b8' }, { title: 'Enviado', color: '#3b82f6' }, { title: 'Aguardando assinatura', color: '#f59e0b' }, { title: 'Concluído', color: '#10b981' }],
    cardNoun: 'documento', cardNounPlural: 'documentos', newCardLabel: 'Novo documento',
    fields: [
      { key: 'doc_type', label: 'Tipo de documento', kind: 'select', options: ['Contrato', 'Termo de consentimento', 'Laudo', 'Relatório', 'Atestado', 'Declaração', 'Encaminhamento', 'Outro'], showOnCard: true },
      { key: 'doc_status', label: 'Status', kind: 'select', options: ['Rascunho', 'Enviado', 'Aguardando assinatura', 'Assinado', 'Arquivado'], showOnCard: true },
    ],
    common: { priority: false, assignee: true, due: true, checklist: false, tags: true },
    dueLabel: 'Prazo', assigneeLabel: 'Responsável', descriptionLabel: 'Observações', patientLabel: 'Paciente', patientRequired: false,
    total: null, links: ['patient', 'record'], actions: ['patient', 'record'], doneColumn: /conclu|assinado/i, titlePlaceholder: 'Ex: Termo de consentimento — nome',
  },
  branco: {
    key: 'branco', label: 'Em branco', short: 'Em branco', icon: LayoutGrid, color: '#64748b',
    description: 'Comece do zero: defina suas próprias colunas e use cartões simples.',
    columns: [{ title: 'Coluna 1', color: '#94a3b8' }],
    cardNoun: 'cartão', cardNounPlural: 'cartões', newCardLabel: 'Novo cartão',
    fields: [],
    common: { ...TAB_NONE, priority: true, assignee: true, due: true, checklist: true, tags: true },
    dueLabel: 'Prazo', assigneeLabel: 'Responsável', descriptionLabel: 'Descrição', patientLabel: 'Paciente (opcional)', patientRequired: false,
    total: null, links: ['patient'], actions: ['patient'], titlePlaceholder: 'Título do cartão',
  },
};

export const BOARD_TYPE_ORDER: BoardTypeKey[] = ['geral', 'clinico', 'projeto', 'financeiro', 'atividade', 'funil', 'documentos', 'branco'];

export const getTypeDef = (type?: string | null): BoardTypeDef =>
  BOARD_TYPES[(type as BoardTypeKey) || 'geral'] || BOARD_TYPES.geral;

// ─── Ícones do quadro ───────────────────────────────────────────────────────
export const BOARD_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  layout: { icon: LayoutGrid, label: 'Quadro' },
  clipboard: { icon: ClipboardList, label: 'Lista' },
  brain: { icon: Brain, label: 'Clínico' },
  rocket: { icon: Rocket, label: 'Projeto' },
  wallet: { icon: Wallet, label: 'Financeiro' },
  calendar: { icon: CalendarClock, label: 'Agenda' },
  filter: { icon: Filter, label: 'Funil' },
  file: { icon: FileSignature, label: 'Documentos' },
  user: { icon: User, label: 'Pessoa' },
  users: { icon: Users, label: 'Grupo' },
  heart: { icon: Heart, label: 'Cuidado' },
  target: { icon: Target, label: 'Meta' },
  briefcase: { icon: Briefcase, label: 'Trabalho' },
  star: { icon: Star, label: 'Favorito' },
  flag: { icon: Flag, label: 'Marco' },
  zap: { icon: Zap, label: 'Rápido' },
  folder: { icon: Folder, label: 'Pasta' },
  receipt: { icon: Receipt, label: 'Recibo' },
  text: { icon: FileText, label: 'Texto' },
  day: { icon: CalendarDays, label: 'Dia' },
};

export const iconForBoard = (iconKey: string | null | undefined, type?: string | null): LucideIcon =>
  (iconKey && BOARD_ICONS[iconKey]?.icon) || getTypeDef(type).icon;

// ─── Cores ──────────────────────────────────────────────────────────────────
export const COLOR_PALETTE: readonly { hex: string; name: string }[] = [
  { hex: '#64748b', name: 'Cinza' },
  { hex: '#ef4444', name: 'Vermelho' },
  { hex: '#f97316', name: 'Laranja' },
  { hex: '#f59e0b', name: 'Âmbar' },
  { hex: '#84cc16', name: 'Lima' },
  { hex: '#10b981', name: 'Verde' },
  { hex: '#14b8a6', name: 'Turquesa' },
  { hex: '#0ea5e9', name: 'Azul-claro' },
  { hex: '#3b82f6', name: 'Azul' },
  { hex: '#8b5cf6', name: 'Violeta' },
  { hex: '#d946ef', name: 'Magenta' },
  { hex: '#ec4899', name: 'Rosa' },
];

// Cores antigas das colunas eram classes Tailwind (bg-slate-400...).
const LEGACY_COLORS: Record<string, string> = {
  'bg-slate-400': '#94a3b8', 'bg-red-500': '#ef4444', 'bg-orange-500': '#f97316', 'bg-amber-500': '#f59e0b',
  'bg-emerald-500': '#10b981', 'bg-teal-500': '#14b8a6', 'bg-cyan-500': '#06b6d4', 'bg-blue-500': '#3b82f6',
  'bg-indigo-500': '#6366f1', 'bg-violet-500': '#8b5cf6', 'bg-purple-500': '#a855f7', 'bg-pink-500': '#ec4899',
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
export const isHex = (v?: string | null): v is string => !!v && HEX_RE.test(v);

/** Converte qualquer cor salva (hex ou classe antiga) em hex; devolve fallback se inválida. */
export const resolveColor = (value?: string | null, fallback = '#94a3b8'): string => {
  if (!value) return fallback;
  if (isHex(value)) return value.toLowerCase();
  return LEGACY_COLORS[value] || fallback;
};

const channels = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16),
];

/** Mistura a cor com branco: amount = parte da cor (0 a 1). */
export const tint = (hex: string, amount: number): string => {
  const [r, g, b] = channels(hex);
  const mix = (c: number) => Math.round(255 - (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};

/**
 * Estilo do cartão inteiro tingido: fundo suave (12% da cor sobre branco, sempre claro,
 * então o texto slate-800/600 mantém contraste AA), borda e faixa lateral na cor.
 */
export const cardTintStyle = (color?: string | null): React.CSSProperties | undefined => {
  if (!color) return undefined;
  const hex = resolveColor(color);
  return { backgroundColor: tint(hex, 0.12), borderColor: tint(hex, 0.55), borderLeftColor: hex, borderLeftWidth: 4 };
};

export const newKey = () => Math.random().toString(36).slice(2, 10);

// ─── Prioridade ─────────────────────────────────────────────────────────────
export type PriorityKey = 'low' | 'medium' | 'high' | 'urgent';
export const PRIORITIES: readonly { key: PriorityKey; label: string; legacy: string; badge: 'default' | 'info' | 'warning' | 'danger' }[] = [
  { key: 'low', label: 'Baixa', legacy: 'Baixa', badge: 'default' },
  { key: 'medium', label: 'Média', legacy: 'Media', badge: 'info' },
  { key: 'high', label: 'Alta', legacy: 'Alta', badge: 'warning' },
  { key: 'urgent', label: 'Urgente', legacy: 'Urgente', badge: 'danger' },
];

/** Aceita o valor antigo (Baixa/Media/Alta/Urgente) ou a chave nova e devolve a chave. */
export const normalizePriority = (v?: string | null): PriorityKey | '' => {
  if (!v) return '';
  const found = PRIORITIES.find(p => p.key === v || p.legacy === v || p.label === v);
  return found ? found.key : '';
};

// ─── Formatação ─────────────────────────────────────────────────────────────
export const formatMoney = (v?: number | string | null) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatDate = (v?: string | null) => {
  if (!v) return '';
  const d = new Date(String(v).length <= 10 ? `${v}T12:00:00` : v);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
};

export const formatDateTime = (v?: string | null) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

/** Data (YYYY-MM-DD) anterior a hoje? */
export const isPastDate = (v?: string | null) => {
  if (!v) return false;
  const day = String(v).slice(0, 10);
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return day < iso;
};

/** Estado do formulário de cartão (em memória). */
export interface CardDraft {
  title: string;
  description: string;
  tags: string;
  patientId: string;
  patientName: string;
  color: string;
  priority: PriorityKey | '';
  assignee: string;
  due_date: string;
  amount: string;
  details: Record<string, any>;
  checklist: ChecklistItem[];
  links: CardLink[];
}

export const emptyDraft = (): CardDraft => ({
  title: '', description: '', tags: '', patientId: '', patientName: '', color: '', priority: '',
  assignee: '', due_date: '', amount: '', details: {}, checklist: [], links: [],
});
