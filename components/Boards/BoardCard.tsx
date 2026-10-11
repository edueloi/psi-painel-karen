import React from 'react';
import { CalendarDays, ListChecks, User } from 'lucide-react';
import { Badge } from '../UI/Badge';
import { LinkChips } from './CardLinks';
import {
  BoardTypeDef, CardLink, ChecklistItem, PRIORITIES, cardTintStyle, formatDate, formatDateTime, formatMoney,
  isPastDate, normalizePriority,
} from './boardConfig';

export interface BoardCardData {
  id: string;
  columnId: string;
  title: string;
  patientId?: string;
  patientName: string;
  description: string;
  tags: string[];
  color: string;
  priority: string;
  due_date?: string;
  assignee?: string;
  amount?: number;
  details: Record<string, any>;
  checklist: ChecklistItem[];
  links: CardLink[];
  createdAt: string;
}

const PREFIX: Record<string, string> = {
  next_session: 'Próxima sessão: ',
  next_action: 'Próxima ação: ',
  event_at: '',
  contact_date: 'Contato: ',
};

/** Valor formatado de um campo do tipo (para a linha resumida do cartão). */
export const fieldDisplay = (card: BoardCardData, f: { key: string; kind: string; root?: string }): string => {
  let raw: any;
  if (f.root === 'amount') raw = card.amount;
  else if (f.root === 'due_date') raw = card.due_date;
  else if (f.root === 'assignee') raw = card.assignee;
  else raw = card.details[f.key];
  if (raw === undefined || raw === null || raw === '') return '';
  if (f.kind === 'money') return formatMoney(raw);
  if (f.kind === 'date') return formatDate(String(raw));
  if (f.kind === 'datetime') return formatDateTime(String(raw));
  if (f.key === 'duration') return `${raw} min`;
  return String(raw);
};

/** O cartão está atrasado? (prazo vencido e fora de coluna concluída / não pago) */
export const isCardOverdue = (card: BoardCardData, def: BoardTypeDef, columnTitle: string): boolean => {
  if (!card.due_date || !isPastDate(card.due_date)) return false;
  if (def.doneColumn && def.doneColumn.test(columnTitle)) return false;
  if (def.key === 'financeiro' && ['Pago', 'Cancelado'].includes(String(card.details.fin_status || ''))) return false;
  if (def.key === 'documentos' && ['Assinado', 'Arquivado'].includes(String(card.details.doc_status || ''))) return false;
  return true;
};

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  Pago: 'success', Assinado: 'success', Pendente: 'warning', Parcial: 'info', Cancelado: 'default',
  Rascunho: 'default', Enviado: 'info', 'Aguardando assinatura': 'warning', Arquivado: 'default',
  Alto: 'danger', Moderado: 'warning', Baixo: 'success',
};

interface BoardCardViewProps {
  card: BoardCardData;
  def: BoardTypeDef;
  columnTitle: string;
  menu?: React.ReactNode;
  draggable?: boolean;
  onOpen: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  dragging?: boolean;
}

export const BoardCardView: React.FC<BoardCardViewProps> = ({ card, def, columnTitle, menu, draggable = true, onOpen, onDragStart, onDragEnd, dragging }) => {
  const tintStyle = cardTintStyle(card.color);
  const overdue = isCardOverdue(card, def, columnTitle);
  const prio = normalizePriority(card.priority);
  const prioDef = PRIORITIES.find(p => p.key === prio);
  const summary = def.fields.filter(f => f.showOnCard).map(f => ({ f, text: fieldDisplay(card, f) })).filter(x => x.text);
  const badges = summary.filter(x => STATUS_BADGE[x.text] !== undefined);
  const plain = summary.filter(x => STATUS_BADGE[x.text] === undefined);
  const done = card.checklist.filter(i => i.done).length;
  const showPatient = !!card.patientName && card.patientName !== card.title;
  const isMoney = def.fields.some(f => f.kind === 'money' && f.root === 'amount') && def.key === 'financeiro';

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      aria-label={`Abrir ${def.cardNoun}: ${card.title}`}
      style={tintStyle}
      className={`group/card cursor-pointer rounded-lg border p-3 text-slate-800 transition-colors hover:border-primary-300 focus-visible:outline-primary-500 ${card.color ? '' : 'border-slate-200 bg-white'} ${overdue ? 'ring-2 ring-red-400' : ''} ${dragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-xs font-medium leading-snug text-slate-900">{card.title}</p>
        {menu}
      </div>

      {isMoney && card.amount !== undefined && (
        <p className="mt-1 text-sm font-medium text-slate-900">{formatMoney(card.amount)}</p>
      )}

      {showPatient && (
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-600"><User size={12} className="shrink-0" /><span className="truncate">{card.patientName}</span></p>
      )}

      {card.description && <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">{card.description}</p>}

      {(overdue || prioDef || badges.length > 0 || plain.length > 0 || card.tags.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {overdue && <Badge color="danger" size="sm">Atrasado</Badge>}
          {prioDef && def.common.priority && <Badge color={prioDef.badge} size="sm">{prioDef.label}</Badge>}
          {badges.map(({ f, text }) => <Badge key={f.key} color={STATUS_BADGE[text]} size="sm">{f.key === 'risk_level' ? `Risco ${text.toLowerCase()}` : text}</Badge>)}
          {plain.filter(x => x.f.root !== 'due_date' && !(isMoney && x.f.kind === 'money')).map(({ f, text }) => (
            <span key={f.key} className="inline-flex max-w-full items-center truncate rounded bg-white/70 px-1.5 py-0.5 text-[11px] text-slate-700">{PREFIX[f.key] ?? ''}{text}</span>
          ))}
          {card.tags.map(tag => <Badge key={tag} color="default" size="sm">{tag}</Badge>)}
        </div>
      )}

      {card.checklist.length > 0 && (
        <div className="mt-2">
          <div className="mb-0.5 flex items-center gap-1 text-[11px] text-slate-600"><ListChecks size={12} />{done}/{card.checklist.length}</div>
          <div className="h-1 overflow-hidden rounded-full bg-white/80" aria-hidden="true">
            <div className="h-full rounded-full bg-primary-500" style={{ width: `${(done / card.checklist.length) * 100}%` }} />
          </div>
        </div>
      )}

      {(card.links.length > 0 || card.patientId) && (
        <div className="mt-2">
          <LinkChips
            compact
            patientId={card.patientId}
            links={[...(card.patientId ? [{ type: 'patient' as const, id: card.patientId, label: card.patientName || 'Paciente' }] : []), ...card.links]}
          />
        </div>
      )}

      {(card.due_date || card.assignee) && (
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-black/5 pt-2 text-[11px]">
          {card.due_date ? (
            <span className={`flex items-center gap-1 ${overdue ? 'font-medium text-red-700' : 'text-slate-600'}`}>
              <CalendarDays size={12} />{def.key === 'financeiro' ? 'Venc. ' : ''}{formatDate(card.due_date)}
            </span>
          ) : <span />}
          {card.assignee && (
            <span title={card.assignee} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[11px] font-medium text-primary-700">
              {card.assignee.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
