import React, { useEffect, useState } from 'react';
import {
  X, Calendar, DollarSign, FileText, FolderOpen, StickyNote,
  Loader2, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp,
  TrendingDown, ChevronRight, Boxes, Shield, BrainCircuit, History, Info
} from 'lucide-react';
import { Patient } from '../../types';
import { api, API_BASE_URL, getStaticUrl } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface TimelineItem {
  id: string;
  type: 'appointment' | 'finance' | 'record' | 'document' | 'note' | 'comanda' | 'pei' | 'tool' | string;
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
    comandas: number;
    records: number;
    events: number;
    documents: number;
    notes: number;
    pei: number;
    tools: number;
  };
}

interface Props {
  patient: Patient | null;
  onClose: () => void;
}

const typeConfig: Record<string, any> = {
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
  comanda: {
    label: 'Comanda',
    icon: <Boxes size={14} />,
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
  },
  pei: {
    label: 'PEI',
    icon: <BrainCircuit size={14} />,
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  tool: {
    label: 'Avaliação',
    icon: <Boxes size={14} />,
    bg: 'bg-sky-50',
    text: 'text-sky-600',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
  },
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  scheduled: { label: 'Agendado', icon: <Clock size={10} />, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  confirmed: { label: 'Confirmado', icon: <CheckCircle size={10} />, color: 'text-blue-600 bg-blue-50 border-blue-100' },
  completed: { label: 'Realizado', icon: <CheckCircle size={10} />, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  cancelled: { label: 'Cancelado', icon: <XCircle size={10} />, color: 'text-red-500 bg-red-50 border-red-100' },
  'no-show': { label: 'Faltou', icon: <AlertCircle size={10} />, color: 'text-amber-600 bg-amber-50 border-amber-100' },
  paid: { label: 'Pago', icon: <CheckCircle size={10} />, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  pending: { label: 'Pendente', icon: <Clock size={10} />, color: 'text-amber-600 bg-amber-50 border-amber-100' },
  open: { label: 'Aberta', icon: <Clock size={10} />, color: 'text-orange-600 bg-orange-50 border-orange-100' },
  closed: { label: 'Fechada', icon: <CheckCircle size={10} />, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
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
  { id: 'record', label: 'Prontuários' },
  { id: 'pei', label: 'PEI' },
  { id: 'comanda', label: 'Comandas' },
  { id: 'finance', label: 'Financeiro' },
  { id: 'tool', label: 'Avaliações' },
  { id: 'document', label: 'Documentos' },
  { id: 'note', label: 'Anotações' },
];

export const PatientHistoryDrawer: React.FC<Props> = ({ patient, onClose }) => {
  const { t } = useLanguage();
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
      .catch(() => setData({ timeline: [], counts: { appointments: 0, transactions: 0, comandas: 0, records: 0, events: 0, documents: 0, notes: 0, pei: 0, tools: 0 } }))
      .finally(() => setLoading(false));
  }, [patient?.id]);

  const isOpen = !!patient;
  const filtered = data?.timeline.filter((i: TimelineItem) => filter === 'all' || i.type === filter) || [];
  const grouped = groupByMonth(filtered);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-md transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`
        fixed top-0 right-0 z-[160] h-full w-full sm:w-[45%] min-w-[340px] max-w-[700px]
        bg-white shadow-[0_0_100px_rgba(0,0,0,0.2)] flex flex-col
        transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-8 py-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[1.8rem] bg-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-100 overflow-hidden relative group">
              {patient?.photo_url ? (
                <img src={getStaticUrl(patient.photo_url)} className="w-full h-full object-cover" />
              ) : (
                (patient?.full_name || '?').charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tighter leading-none mb-1">{patient?.full_name}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('patients.history') || 'Histórico Clínico & Financeiro'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-400 transition-all active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stats Grid */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-50 shrink-0 bg-slate-50/30">
            {[
              { label: 'Sessões', value: data.counts.appointments, color: 'text-indigo-600', icon: <Calendar size={12}/> },
              { label: 'Prontuários', value: data.counts.records, color: 'text-blue-600', icon: <FileText size={12}/> },
              { label: 'Comandas', value: data.counts.comandas, color: 'text-orange-600', icon: <Boxes size={12}/> },
              { label: 'Neuro/PEI', value: (data.counts.pei || 0) + (data.counts.tools || 0), color: 'text-emerald-600', icon: <BrainCircuit size={12}/> },
            ].map(s => (
              <div key={s.label} className="py-6 px-4 text-center border-r border-slate-50 last:border-r-0 hover:bg-white transition-colors">
                <div className={`flex items-center justify-center gap-2 text-xl font-black ${s.color}`}>
                  {s.icon} {s.value}
                </div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filter Scroll */}
        <div className="px-6 py-4 border-b border-slate-50 flex gap-2 overflow-x-auto no-scrollbar shrink-0 bg-white sticky top-0 z-20">
          {FILTER_OPTIONS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                filter === f.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-300">
              <Loader2 size={40} className="animate-spin text-indigo-500" />
              <p className="text-xs font-black uppercase tracking-widest animate-pulse">Sincronizando Histórico...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center animate-fadeIn">
              <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6 border border-slate-100">
                <History size={32} className="text-slate-200" />
              </div>
              <h4 className="text-lg font-black text-slate-700 mb-1">Nada por aqui ainda</h4>
              <p className="text-xs font-bold text-slate-400 max-w-[200px] mx-auto">Este paciente ainda não possui registros nesta categoria.</p>
            </div>
          ) : (
            <div className="space-y-12 pb-24">
              {Object.entries(grouped).map(([month, items]) => (
                <div key={month} className="animate-fadeIn">
                  {/* Month Tag */}
                  <div className="flex items-center gap-4 mb-8 sticky top-0 bg-white/80 backdrop-blur-sm py-2 z-10">
                    <div className="px-5 py-2 bg-slate-800 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200">
                        {month}
                    </div>
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[10px] font-black text-slate-300">{items.length} EVENTOS</span>
                  </div>

                  {/* Verticals */}
                  <div className="space-y-4 relative pl-6">
                    {/* The Line */}
                    <div className="absolute left-[3px] top-6 bottom-0 w-1 bg-gradient-to-b from-slate-100 via-slate-50 to-transparent rounded-full" />

                    {items.map((item: any) => {
                      const cfg = typeConfig[item.type] || typeConfig.note;
                      const st = item.status ? statusConfig[item.status] : null;
                      return (
                        <div key={item.id} className="group relative">
                          <div className={`absolute -left-[30px] top-2 w-8 h-8 rounded-xl ${cfg.bg} ${cfg.text} flex items-center justify-center border-2 border-white shadow-md z-10 group-hover:scale-125 transition-all duration-300`}>
                            {cfg.icon}
                          </div>
                          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 hover:shadow-2xl hover:shadow-slate-100 hover:border-indigo-100 transition-all duration-300 cursor-pointer group-hover:-translate-y-1">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <h5 className="text-sm font-black text-slate-800 tracking-tight">{item.title}</h5>
                                  {st && (
                                    <span className={`inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${st.color}`}>
                                      {st.icon} {st.label}
                                    </span>
                                  )}
                                </div>
                                
                                {item.subtitle && (
                                  <p className="text-[11px] font-bold text-indigo-500/60 leading-tight mb-2 uppercase tracking-wide">{item.subtitle}</p>
                                )}
                                
                                {item.preview && (
                                  <div className="text-[12px] text-slate-500 font-medium leading-relaxed mb-3 line-clamp-3 bg-slate-50/50 p-3 rounded-2xl border border-dashed border-slate-200">
                                    {item.preview}
                                  </div>
                                )}
                                
                                {item.notes && (
                                  <p className="text-[10px] font-bold text-slate-400 italic flex items-center gap-1.5">
                                      <Info size={12}/> {item.notes}
                                  </p>
                                )}
                              </div>

                              <div className="text-right shrink-0">
                                {item.amount != null && (
                                  <div className={`text-sm font-black mb-1 ${item.financeType === 'income' ? 'text-emerald-500' : 'text-rose-500'} flex items-center gap-1 justify-end`}>
                                    {item.financeType === 'income' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    {formatMoney(item.amount)}
                                  </div>
                                )}
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-slate-800 uppercase tabular-nums">{formatTime(item.date)}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter tabular-nums">{formatDate(item.date)}</span>
                                </div>
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

        {/* Action Footer */}
        <div className="p-8 border-t border-slate-50 bg-white shrink-0 shadow-[0_-20px_40px_rgba(0,0,0,0.02)]">
          <button 
            onClick={onClose}
            className="w-full py-5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-[0.98]"
          >
            FECHAR HISTÓRICO
          </button>
        </div>
      </div>
    </>
  );
};
