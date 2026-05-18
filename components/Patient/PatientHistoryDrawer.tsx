import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, DollarSign, FileText, FolderOpen, StickyNote,
  Loader2, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp,
  TrendingDown, Boxes, BrainCircuit, History, Info, ClipboardList, Radar
} from 'lucide-react';
import { Patient } from '../../types';
import { api, getStaticUrl } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Badge, EmptyState, FilterLineSegmented } from '../UI';
import { ActionDrawer } from '../UI/ActionDrawer';

interface TimelineItem {
  id: string;
  type: 'appointment' | 'finance' | 'record' | 'document' | 'note' | 'comanda' | 'pei' | 'tool' | 'form' | string;
  date: string;
  title: string;
  subtitle?: string;
  status?: string;
  notes?: string;
  preview?: string;
  amount?: number;
  financeType?: 'income' | 'expense';
  reschedule_reason?: string;
  link_form_id?: number;
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
    forms: number;
    disc: number;
  };
}

interface Props {
  patient: Patient | null;
  onClose: () => void;
}

const typeConfig: Record<string, any> = {
  appointment: { label: 'Consulta', icon: <Calendar size={16} />, bg: 'bg-indigo-100', text: 'text-indigo-600' },
  finance: { label: 'Financeiro', icon: <DollarSign size={16} />, bg: 'bg-emerald-100', text: 'text-emerald-600' },
  record: { label: 'Prontuário', icon: <FileText size={16} />, bg: 'bg-blue-100', text: 'text-blue-600' },
  document: { label: 'Documento', icon: <FolderOpen size={16} />, bg: 'bg-amber-100', text: 'text-amber-600' },
  note: { label: 'Anotação', icon: <StickyNote size={16} />, bg: 'bg-violet-100', text: 'text-violet-600' },
  comanda: { label: 'Comanda', icon: <Boxes size={16} />, bg: 'bg-orange-100', text: 'text-orange-600' },
  pei: { label: 'PEI', icon: <BrainCircuit size={16} />, bg: 'bg-emerald-100', text: 'text-emerald-600' },
  tool: { label: 'Avaliação', icon: <Boxes size={16} />, bg: 'bg-sky-100', text: 'text-sky-600' },
  form: { label: 'Formulário', icon: <ClipboardList size={16} />, bg: 'bg-rose-100', text: 'text-rose-600' },
  disc: { label: 'DISC', icon: <Radar size={16} />, bg: 'bg-purple-100', text: 'text-purple-600' },
};

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  scheduled: { label: 'Agendado', icon: <Clock size={12} />, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  confirmed: { label: 'Confirmado', icon: <CheckCircle size={12} />, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  completed: { label: 'Realizado', icon: <CheckCircle size={12} />, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  cancelled: { label: 'Cancelado', icon: <XCircle size={12} />, color: 'text-red-700 bg-red-50 border-red-200' },
  'no-show': { label: 'Faltou', icon: <AlertCircle size={12} />, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  paid: { label: 'Pago', icon: <CheckCircle size={12} />, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  pending: { label: 'Pendente', icon: <Clock size={12} />, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  open: { label: 'Aberta', icon: <Clock size={12} />, color: 'text-orange-700 bg-orange-50 border-orange-200' },
  closed: { label: 'Fechada', icon: <CheckCircle size={12} />, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
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

const FILTER_OPTIONS = (t: any) => [
  { id: 'all', label: t('common.all') },
  { id: 'appointment', label: t('nav.agenda') },
  { id: 'record', label: t('nav.records') },
  { id: 'form', label: 'Formulários' },
  { id: 'pei', label: 'PEI' },
  { id: 'comanda', label: t('nav.comandas') },
  { id: 'finance', label: t('nav.finance') },
  { id: 'tool', label: t('nav.tools') },
  { id: 'document', label: t('nav.documents') },
  { id: 'note', label: 'Anotações' },
  { id: 'disc', label: 'DISC' },
];

export const PatientHistoryDrawer: React.FC<Props> = ({ patient, onClose }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
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
      .catch(() => setData({ timeline: [], counts: { appointments: 0, transactions: 0, comandas: 0, records: 0, events: 0, documents: 0, notes: 0, pei: 0, tools: 0, forms: 0, disc: 0 } }))
      .finally(() => setLoading(false));
  }, [patient?.id]);

  const isOpen = !!patient;
  const filtered = data?.timeline.filter((i: TimelineItem) => filter === 'all' || i.type === filter) || [];
  const grouped = groupByMonth(filtered);

  return (
    <ActionDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={patient?.full_name || t('patients.history')}
      subtitle={t('patients.history')}
      size="lg"
      mobileBehavior="full-screen"
      bodyClassName="bg-slate-50 px-4 py-4 sm:px-6 sm:py-6"
    >
      <div className="space-y-4">
        {patient && (
          <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-100 text-lg font-bold text-indigo-600">
              {patient.photo_url ? (
                <img src={getStaticUrl(patient.photo_url)} alt={patient.full_name} className="h-full w-full object-cover" />
              ) : (
                (patient.full_name || '?').charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-800">{patient.full_name}</p>
              <button
                onClick={() => { navigate(`/pacientes/${patient.id}`); onClose(); }}
                className="mt-0.5 block text-[10px] font-bold text-indigo-500 hover:text-indigo-700 hover:underline"
              >
                Ver perfil completo →
              </button>
            </div>
          </div>
        )}

        {/* Estatísticas (Stats Grid) */}
        {data && (
          <div className="grid grid-cols-2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm sm:grid-cols-5">
            {[
              { label: t('nav.agenda'), value: data.counts.appointments, color: 'text-indigo-600', icon: <Calendar size={14}/> },
              { label: t('nav.records'), value: data.counts.records, color: 'text-blue-600', icon: <FileText size={14}/> },
              { label: 'Documentos', value: data.counts.documents || 0, color: 'text-amber-600', icon: <FolderOpen size={14}/> },
              { label: t('nav.comandas'), value: data.counts.comandas, color: 'text-orange-600', icon: <Boxes size={14}/> },
              { label: 'Formulários', value: data.counts.forms || 0, color: 'text-rose-600', icon: <ClipboardList size={14}/> },
            ].map((s, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center border-b border-r border-slate-100 px-3 py-4 text-center transition-colors last:border-r-0 hover:bg-slate-50 sm:border-b-0">
                <div className={`flex items-center justify-center gap-2 text-base font-black ${s.color}`}>
                  {s.icon} <span>{s.value}</span>
                </div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filtros (Scroll Horizontal) */}
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-sm custom-scrollbar">
          <FilterLineSegmented<string>
            value={filter}
            onChange={setFilter}
            options={FILTER_OPTIONS(t).map(f => ({ value: f.id, label: f.label }))}
            size="sm"
            className="min-w-max"
          />
        </div>

        {/* Conteúdo da Linha do Tempo (Timeline) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
              <Loader2 size={32} className="animate-spin text-indigo-500" />
              <p className="text-sm font-medium">A carregar histórico...</p>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={History}
              title="Sem registros"
              description="Não existem eventos nesta categoria para este paciente."
            />
          ) : (
            <div className="space-y-8 pb-10">
              {Object.entries(grouped).map(([month, items]) => (
                <div key={month} className="relative">
                  {/* Cabeçalho do Mês */}
                  <div className="flex items-center gap-3 mb-6">
                    <span className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-full text-xs font-semibold shadow-sm">
                        {month}
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  {/* Eventos do Mês */}
                  <div className="space-y-6 relative pl-4 sm:pl-8">
                    {/* Linha Vertical da Timeline */}
                    <div className="absolute left-[27px] sm:left-[43px] top-4 bottom-0 w-0.5 bg-slate-200 rounded-full" />

                    {items.map((item: any) => {
                      const cfg = typeConfig[item.type] || typeConfig.note;
                      const st = item.status ? statusConfig[item.status] : null;
                      const isClickable = (item.type === 'form' && item.link_form_id) || item.type === 'disc';

                      return (
                        <div key={item.id} className="relative pl-10 sm:pl-12 group">
                          {/* Ícone Redondo */}
                          <div className={`absolute left-0 top-3 w-8 h-8 rounded-xl ${cfg.bg} ${cfg.text} flex items-center justify-center border-2 border-white shadow-sm z-10 transition-transform group-hover:scale-110`}>
                            {cfg.icon}
                          </div>

                          {/* Cartão de Conteúdo */}
                          <div
                            className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all group/card ${isClickable ? 'cursor-pointer hover:border-rose-300' : ''}`}
                            onClick={isClickable ? () => {
                              onClose();
                              if (item.type === 'disc') {
                                navigate(`/disc?patientId=${patient?.id}`);
                              } else {
                                const responseDate = item.date ? item.date.slice(0, 10) : '';
                                navigate(`/formularios/${item.link_form_id}/respostas?patientId=${patient?.id}${responseDate ? `&dateFrom=${responseDate}` : ''}`);
                              }
                            } : undefined}
                          >
                            <div className="flex flex-col gap-4">
                              
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h5 className="text-sm font-extrabold text-slate-900 group-hover/card:text-indigo-600 transition-colors">{item.title}</h5>
                                    <div className="flex items-center gap-1.5">
                                      {st && (
                                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${st.color}`}>
                                          {st.icon} {st.label}
                                        </span>
                                      )}
                                      <Badge color="default" size="sm">#{cfg.label}</Badge>
                                    </div>
                                  </div>
                                  
                                  {item.subtitle && (
                                    <p className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest">{item.subtitle}</p>
                                  )}
                                </div>

                                <div className="shrink-0 text-right">
                                    <div className="text-xs font-black text-slate-800 uppercase tracking-tighter">{formatTime(item.date)}</div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(item.date)}</div>
                                </div>
                              </div>

                              {item.preview && (
                                <div className="text-[13px] text-slate-600 bg-slate-50/50 p-4 rounded-xl border border-slate-100/50 leading-relaxed font-medium">
                                  {item.preview.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
                                </div>
                              )}

                              {item.amount != null && (
                                <div className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor da Operação</span>
                                  <div className={`text-sm font-black ${item.financeType === 'income' ? 'text-emerald-600' : 'text-rose-600'} flex items-center gap-1.5`}>
                                    {item.financeType === 'income' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    {formatMoney(item.amount)}
                                  </div>
                                </div>
                              )}
                              
                              {item.notes && (
                                <p className="text-[10px] font-bold text-slate-400 italic flex items-start gap-2 bg-slate-50/30 p-2 rounded-lg">
                                    <Info size={12} className="shrink-0 mt-0.5 text-indigo-400"/> 
                                    <span>{item.notes}</span>
                                </p>
                              )}

                              {item.reschedule_reason && (
                                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 border-dashed">
                                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5">Motivo do Reagendamento</p>
                                  <p className="text-xs font-bold text-amber-700 leading-relaxed italic opacity-80">{item.reschedule_reason}</p>
                                </div>
                              )}

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
      </div>
    </ActionDrawer>
  );
};
