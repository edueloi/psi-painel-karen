import React, { useEffect, useState } from 'react';
import {
  X, Calendar, DollarSign, FileText, FolderOpen, StickyNote,
  Loader2, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp,
  TrendingDown, ChevronRight
} from 'lucide-react';
import { Patient } from '../../types';
import { api } from '../../services/api';

interface TimelineItem {
  id: string;
  type: 'appointment' | 'finance' | 'record' | 'document' | 'note';
  date: string;
  title: string;
  subtitle?: string;
  status?: string;
  notes?: string;
  preview?: string;
  amount?: number;
  financeType?: 'income' | 'expense';
}

interface HistoryData {
  timeline: TimelineItem[];
  counts: {
    appointments: number;
    transactions: number;
    records: number;
    documents: number;
    notes: number;
  };
}

interface Props {
  patient: Patient | null;
  onClose: () => void;
}

const typeConfig = {
  appointment: {
    label: 'Consulta',
    icon: <Calendar size={14} />,
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500',
  },
  finance: {
    label: 'Financeiro',
    icon: <DollarSign size={14} />,
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  record: {
    label: 'Prontuário',
    icon: <FileText size={14} />,
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  document: {
    label: 'Documento',
    icon: <FolderOpen size={14} />,
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  note: {
    label: 'Anotação',
    icon: <StickyNote size={14} />,
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'border-violet-200',
    dot: 'bg-violet-500',
  },
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  scheduled: { label: 'Agendado', icon: <Clock size={10} />, color: 'text-indigo-600 bg-indigo-50' },
  confirmed: { label: 'Confirmado', icon: <CheckCircle size={10} />, color: 'text-blue-600 bg-blue-50' },
  completed: { label: 'Realizado', icon: <CheckCircle size={10} />, color: 'text-emerald-600 bg-emerald-50' },
  cancelled: { label: 'Cancelado', icon: <XCircle size={10} />, color: 'text-red-500 bg-red-50' },
  'no-show': { label: 'Faltou', icon: <AlertCircle size={10} />, color: 'text-amber-600 bg-amber-50' },
  paid: { label: 'Pago', icon: <CheckCircle size={10} />, color: 'text-emerald-600 bg-emerald-50' },
  pending: { label: 'Pendente', icon: <Clock size={10} />, color: 'text-amber-600 bg-amber-50' },
};

const formatDate = (raw: string) => {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (raw: string) => {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const formatMoney = (v?: number) => {
  if (v == null) return '';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const groupByMonth = (items: TimelineItem[]) => {
  const groups: Record<string, TimelineItem[]> = {};
  for (const item of items) {
    const d = new Date(item.date);
    const key = isNaN(d.getTime()) ? 'Sem data' : d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
};

const FILTER_OPTIONS = [
  { id: 'all', label: 'Tudo' },
  { id: 'appointment', label: 'Consultas' },
  { id: 'finance', label: 'Financeiro' },
  { id: 'record', label: 'Prontuários' },
  { id: 'document', label: 'Documentos' },
  { id: 'note', label: 'Anotações' },
];

export const PatientHistoryDrawer: React.FC<Props> = ({ patient, onClose }) => {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!patient) return;
    setData(null);
    setFilter('all');
    setLoading(true);
    api.get<HistoryData>(`/patients/${patient.id}/history`)
      .then(setData)
      .catch(() => setData({ timeline: [], counts: { appointments: 0, transactions: 0, records: 0, documents: 0, notes: 0 } }))
      .finally(() => setLoading(false));
  }, [patient?.id]);

  const isOpen = !!patient;
  const filtered = data?.timeline.filter(i => filter === 'all' || i.type === filter) ?? [];
  const grouped = groupByMonth(filtered);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[80] bg-black/30 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`
        fixed top-0 right-0 z-[90] h-full w-full sm:w-[42%] min-w-[320px] max-w-[600px]
        bg-white shadow-2xl flex flex-col
        transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold text-base">
              {(patient?.full_name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="text-white">
              <div className="text-sm font-bold truncate max-w-[200px]">{patient?.full_name}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Histórico completo</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Stats row */}
        {data && (
          <div className="grid grid-cols-5 border-b border-slate-100 shrink-0">
            {[
              { label: 'Consultas', value: data.counts.appointments, color: 'text-indigo-600' },
              { label: 'Pagamentos', value: data.counts.transactions, color: 'text-emerald-600' },
              { label: 'Prontuários', value: data.counts.records, color: 'text-blue-600' },
              { label: 'Documentos', value: data.counts.documents, color: 'text-amber-600' },
              { label: 'Notas', value: data.counts.notes, color: 'text-violet-600' },
            ].map(s => (
              <div key={s.label} className="py-3 text-center border-r border-slate-100 last:border-r-0">
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex gap-1 overflow-x-auto no-scrollbar shrink-0 bg-slate-50/60">
          {FILTER_OPTIONS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                filter === f.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Carregando histórico...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                <Clock size={24} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-500">Nenhum registro encontrado</p>
              <p className="text-xs text-slate-400 mt-1">Este paciente ainda não tem histórico nesta categoria.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([month, items]) => (
                <div key={month}>
                  {/* Month separator */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest capitalize">{month}</div>
                    <div className="flex-1 h-px bg-slate-100" />
                    <div className="text-[10px] text-slate-300 font-medium">{items.length}</div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2 relative">
                    {/* Timeline line */}
                    <div className="absolute left-[15px] top-4 bottom-2 w-px bg-slate-100" />

                    {items.map(item => {
                      const cfg = typeConfig[item.type];
                      const st = item.status ? statusConfig[item.status] : null;
                      return (
                        <div key={item.id} className="flex gap-3 relative">
                          {/* Dot */}
                          <div className={`w-8 h-8 rounded-xl ${cfg.bg} ${cfg.text} flex items-center justify-center shrink-0 border ${cfg.border} relative z-10 shadow-sm`}>
                            {cfg.icon}
                          </div>
                          {/* Content */}
                          <div className="flex-1 bg-white border border-slate-100 rounded-xl p-3 hover:border-slate-200 transition-colors min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-slate-800">{item.title}</span>
                                  {st && (
                                    <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${st.color}`}>
                                      {st.icon} {st.label}
                                    </span>
                                  )}
                                </div>
                                {item.subtitle && (
                                  <div className="text-[11px] text-slate-400 mt-0.5 truncate">{item.subtitle}</div>
                                )}
                                {item.preview && (
                                  <div className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2 italic">
                                    {item.preview}…
                                  </div>
                                )}
                                {item.notes && (
                                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic">{item.notes}</div>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                {item.amount != null && (
                                  <div className={`text-xs font-bold ${item.financeType === 'income' ? 'text-emerald-600' : 'text-red-500'} flex items-center gap-0.5 justify-end`}>
                                    {item.financeType === 'income' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                    {formatMoney(item.amount)}
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(item.date)}</div>
                                <div className="text-[10px] text-slate-300">{formatTime(item.date)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0">
          <p className="text-[10px] text-slate-400 text-center">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            {filter !== 'all' ? ` em "${FILTER_OPTIONS.find(f => f.id === filter)?.label}"` : ' no total'}
          </p>
        </div>
      </div>
    </>
  );
};
