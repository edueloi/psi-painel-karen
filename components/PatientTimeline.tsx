import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { Loader2, RefreshCw, Clock, Filter } from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: string;
  category: string;
  title: string;
  description?: string;
  status?: string;
  professional?: string;
  icon: string;
  color: string;
  timestamp: string;
  record_id?: number;
}

const COLOR_MAP: Record<string, string> = {
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
  cyan:   'bg-cyan-100 text-cyan-700 border-cyan-200',
  emerald:'bg-emerald-100 text-emerald-700 border-emerald-200',
  blue:   'bg-blue-100 text-blue-700 border-blue-200',
  amber:  'bg-amber-100 text-amber-700 border-amber-200',
  rose:   'bg-rose-100 text-rose-700 border-rose-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  green:  'bg-green-100 text-green-700 border-green-200',
  slate:  'bg-slate-100 text-slate-600 border-slate-200',
};

const DOT_MAP: Record<string, string> = {
  indigo: 'bg-indigo-500', violet: 'bg-violet-500', cyan: 'bg-cyan-500',
  emerald: 'bg-emerald-500', blue: 'bg-blue-500', amber: 'bg-amber-500',
  rose: 'bg-rose-500', purple: 'bg-purple-500', green: 'bg-green-500',
  slate: 'bg-slate-400',
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'Todos' },
  { key: 'record', label: 'Registros' },
  { key: 'appointment', label: 'Consultas' },
  { key: 'anamnesis', label: 'Anamnese' },
  { key: 'audit', label: 'Sistema' },
];

function formatDate(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function groupByDate(events: TimelineEvent[]) {
  const groups: Record<string, TimelineEvent[]> = {};
  for (const e of events) {
    const key = new Date(e.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return groups;
}

interface PatientTimelineProps {
  patientId: string;
  patientName?: string;
}

export const PatientTimeline: React.FC<PatientTimelineProps> = ({ patientId, patientName }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const data = await api.get<{ events: TimelineEvent[] }>(`/patient-history/${patientId}`);
      setEvents(data.events || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const filtered = events.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'record') return e.type.startsWith('record_');
    if (filter === 'appointment') return e.type === 'appointment';
    if (filter === 'anamnesis') return e.type.startsWith('anamnesis_');
    if (filter === 'audit') return e.type.startsWith('audit_');
    return true;
  });

  const groups = groupByDate(filtered);
  const dateKeys = Object.keys(groups);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-indigo-500"/>
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
            Linha do Tempo
          </span>
          {!loading && (
            <span className="text-[10px] font-bold text-slate-300 bg-slate-100 px-2 py-0.5 rounded-full">
              {filtered.length} evento{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Filtro */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {FILTER_OPTIONS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${
                  filter === f.key ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={load} disabled={loading} className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/>
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
          <Loader2 size={18} className="animate-spin"/>
          <span className="text-sm">Carregando histórico...</span>
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm text-slate-400 font-medium">Nenhum evento encontrado</p>
          <p className="text-xs text-slate-300 mt-1">Os eventos aparecerão aqui conforme forem registrados</p>
        </div>
      )}

      {/* Timeline */}
      {!loading && dateKeys.map((dateKey, di) => (
        <div key={dateKey}>
          {/* Date separator */}
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-slate-100"/>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
              {dateKey}
            </span>
            <div className="h-px flex-1 bg-slate-100"/>
          </div>

          {/* Events */}
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-100"/>

            <div className="space-y-2">
              {groups[dateKey].map((ev, ei) => {
                const colorCls = COLOR_MAP[ev.color] || COLOR_MAP.slate;
                const dotCls = DOT_MAP[ev.color] || DOT_MAP.slate;

                return (
                  <div key={ev.id} className="relative flex items-start gap-3 group">
                    {/* Dot */}
                    <div className={`absolute -left-4 top-3 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${dotCls}`}/>

                    {/* Card */}
                    <div className="flex-1 bg-white border border-slate-100 rounded-xl px-3 py-2.5 hover:border-slate-200 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base leading-none shrink-0">{ev.icon}</span>
                          <div className="min-w-0">
                            <p className="text-[12px] font-black text-slate-700 leading-tight truncate">{ev.title}</p>
                            {ev.description && ev.description !== ev.title && (
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{ev.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${colorCls}`}>
                            {ev.category}
                          </span>
                          <span className="text-[10px] text-slate-300 font-mono whitespace-nowrap">
                            {formatTime(ev.timestamp)}
                          </span>
                        </div>
                      </div>
                      {ev.professional && (
                        <p className="text-[10px] text-slate-300 mt-1 truncate">
                          👤 {ev.professional}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
