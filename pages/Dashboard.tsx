import React, { useMemo, useState, useEffect } from 'react';
import { api } from '../services/api';
import { Patient, Appointment } from '../types';
import {
  Users,
  Calendar,
  Sparkles,
  Plus,
  Globe,
  Music,
  Link as LinkIcon,
  Clock,
  Video,
  CheckCircle,
  Loader2,
  Layers,
  FileText
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { AuroraAssistant } from '../components/AI/AuroraAssistant';
import { useAuth } from '../contexts/AuthContext';

interface Shortcut {
  id: string;
  title: string;
  url: string;
  icon: string;
  color: string;
  isSystem?: boolean;
}

export const Dashboard: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [shortcuts] = useState<Shortcut[]>([
    { id: 'crp', title: 'Portal CRP', url: 'https://site.cfp.org.br/', icon: 'globe', color: 'bg-blue-600', isSystem: true },
    { id: 'spotify', title: 'Playlist Relax', url: 'https://open.spotify.com/genre/focus-page', icon: 'music', color: 'bg-emerald-500', isSystem: true },
  ]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [pts, apts] = await Promise.all([
        api.get<Patient[]>('/patients'),
        api.get<any[]>('/appointments')
      ]);
      setPatients(Array.isArray(pts) ? pts : []);
      setAppointments((Array.isArray(apts) ? apts : []).map(a => ({
        ...a,
        start: new Date(a.appointment_date || a.start),
        end: new Date(new Date(a.appointment_date || a.start).getTime() + (a.duration_minutes || 50) * 60000),
        patient_name: a.patient_name || a.patientName || 'Consulta'
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const nextWeek = new Date(startOfDay);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter(a => a.start && a.start >= startOfDay)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [appointments, startOfDay]);

  const todaysAppointments = useMemo(() => {
    return appointments.filter(a => a.start >= startOfDay && a.start <= endOfDay);
  }, [appointments, startOfDay, endOfDay]);

  const weekAppointments = useMemo(() => {
    return appointments.filter(a => a.start >= startOfDay && a.start < nextWeek);
  }, [appointments, startOfDay, nextWeek]);

  const monthAppointments = useMemo(() => {
    return appointments.filter(a => a.start && a.start.getMonth() === currentMonth && a.start.getFullYear() === currentYear);
  }, [appointments, currentMonth, currentYear]);

  const statusCounts = useMemo(() => {
    return appointments.reduce((acc, a) => {
      const key = a.status || 'scheduled';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [appointments]);

  const typeCounts = useMemo(() => {
    return appointments.reduce((acc, a) => {
      const key = a.type || 'consulta';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [appointments]);

  const modalityCounts = useMemo(() => {
    return appointments.reduce((acc, a) => {
      const key = a.modality || 'presencial';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [appointments]);

  const recentPatients = useMemo(() => {
    const copy = [...patients];
    copy.sort((a, b) => {
      const ad = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
      const bd = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
      if (ad !== bd) return bd - ad;
      return (a.full_name || '').localeCompare(b.full_name || '');
    });
    return copy.slice(0, 5);
  }, [patients]);

  const birthdays = useMemo(() => {
    const list = patients
      .map(p => {
        const dateStr = p.birth_date || p.birthDate;
        if (!dateStr) return null;
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return null;
        const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
        if (next < startOfDay) next.setFullYear(next.getFullYear() + 1);
        return { patient: p, next };
      })
      .filter(Boolean) as { patient: Patient; next: Date }[];
    list.sort((a, b) => a.next.getTime() - b.next.getTime());
    return list.slice(0, 5);
  }, [patients, now, startOfDay]);

  const formattedDate = now.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  const greetingName = user?.name ? user.name.split(' ')[0] : 'Bem-vindo(a)';

  const renderIcon = (iconName: string, size = 20) => {
    if (iconName === 'globe') return <Globe size={size} />;
    if (iconName === 'music') return <Music size={size} />;
    return <LinkIcon size={size} />;
  };

  const InsightWidget = () => {
    const next = upcomingAppointments[0];
    const nextTime = next?.start ? next.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const nextLabel = next ? `${next.patient_name} - ${nextTime}` : 'Sem consultas futuras no momento.';

    return (
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-lg border border-white/20"><Sparkles size={20} className="text-yellow-300" /></div>
          <div className="flex-1">
            <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-100 mb-1">Resumo do dia</h3>
            <p className="text-base font-medium leading-relaxed">
              {isLoading ? 'Sincronizando dados...' : `Hoje: ${todaysAppointments.length} atendimentos. Proximo: ${nextLabel}`}
            </p>
          </div>
          <button onClick={() => navigate('/agenda')} className="shrink-0 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg border border-white/20">Abrir agenda</button>
        </div>
      </div>
    );
  };

  const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; hint?: string }> = ({ label, value, icon, hint }) => (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 transition-all hover:border-indigo-100">
      <div className="flex items-start justify-between">
        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">{icon}</div>
        {hint && <span className="text-[10px] font-bold text-slate-400">{hint}</span>}
      </div>
      <h3 className="text-2xl font-display font-bold text-slate-800 mt-3">{value}</h3>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">{label}</p>
    </div>
  );

  const ratio = (value: number, total: number) => total === 0 ? 0 : Math.round((value / total) * 100);

  const totalAppointments = appointments.length;

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn pb-20">
      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="font-display font-bold text-2xl md:text-3xl text-slate-900">Ola, {greetingName}</h1>
            <p className="text-slate-500 text-sm capitalize">{formattedDate}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate('/agenda')} className="flex items-center gap-2 bg-slate-900 text-white px-4 h-10 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all">
              <Calendar size={16} /> Ver agenda
            </button>
            <button onClick={() => navigate('/patients')} className="flex items-center gap-2 bg-indigo-600 text-white px-4 h-10 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700 transition-all">
              <Plus size={16} /> {t('patients.new')}
            </button>
            <button onClick={() => navigate('/records')} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 h-10 rounded-xl font-bold text-sm hover:border-indigo-200 hover:text-indigo-700 transition-all">
              <FileText size={16} /> Novo prontuario
            </button>
          </div>
        </div>
      </div>

      <InsightWidget />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('dashboard.totalPatients')} value={isLoading ? '-' : patients.length} icon={<Users size={18} />} hint="cadastros" />
        <StatCard label="Atendimentos hoje" value={isLoading ? '-' : todaysAppointments.length} icon={<Clock size={18} />} hint="dia" />
        <StatCard label="Atendimentos no mes" value={isLoading ? '-' : monthAppointments.length} icon={<Calendar size={18} />} hint="mes" />
        <StatCard label="Taxa de confirmacao" value={isLoading ? '-' : `${ratio(statusCounts.confirmed || 0, totalAppointments)}%`} icon={<CheckCircle size={18} />} hint="geral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-slate-800 flex items-center gap-2"><Calendar size={18} className="text-indigo-500" /> Proximos atendimentos</h3>
              <button onClick={() => navigate('/agenda')} className="text-[11px] font-bold text-indigo-600 hover:underline">Abrir agenda</button>
            </div>
            <div className="p-4 space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-300" /></div>
              ) : upcomingAppointments.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">Sem atendimentos futuros.</div>
              ) : upcomingAppointments.slice(0, 8).map(app => (
                <div key={app.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                  <div className="w-14 text-center">
                    <div className="text-xs font-bold text-indigo-600 uppercase">{app.start.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short' })}</div>
                    <div className="text-[11px] text-slate-500">{app.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm truncate">{app.patient_name || 'Consulta'}</h4>
                    <div className="text-[10px] font-bold text-indigo-500 uppercase">{app.type || 'consulta'} - {app.modality || 'presencial'}</div>
                  </div>
                  <button onClick={() => navigate('/agenda')} className="text-xs font-bold text-slate-400 hover:text-indigo-600">Detalhes</button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Layers size={16} className="text-indigo-500" /> Tipos de atendimento</h3>
                <span className="text-[10px] font-bold text-slate-400">{totalAppointments} total</span>
              </div>
              {['consulta', 'pessoal', 'bloqueio'].map((key) => (
                <div key={key} className="mb-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                    <span className="uppercase">{key}</span>
                    <span>{typeCounts[key] || 0}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${ratio(typeCounts[key] || 0, totalAppointments)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Video size={16} className="text-emerald-500" /> Modalidade</h3>
                <span className="text-[10px] font-bold text-slate-400">{totalAppointments} total</span>
              </div>
              {['presencial', 'online'].map((key) => (
                <div key={key} className="mb-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                    <span className="uppercase">{key}</span>
                    <span>{modalityCounts[key] || 0}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${ratio(modalityCounts[key] || 0, totalAppointments)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 text-xs uppercase tracking-wide">Pacientes recentes</h3>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-300" /></div>
            ) : recentPatients.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-6">Sem pacientes cadastrados.</div>
            ) : (
              <div className="space-y-3">
                {recentPatients.map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-700 truncate">{p.full_name}</div>
                      <div className="text-[10px] text-slate-400">{p.email || p.whatsapp || p.phone || 'Sem contato'}</div>
                    </div>
                    <button onClick={() => navigate('/patients')} className="text-xs font-bold text-indigo-600 hover:underline">Abrir</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 text-xs uppercase tracking-wide">Aniversarios</h3>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-indigo-300" /></div>
            ) : birthdays.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-6">Sem datas registradas.</div>
            ) : (
              <div className="space-y-3">
                {birthdays.map(({ patient, next }) => (
                  <div key={patient.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-700 truncate">{patient.full_name}</div>
                      <div className="text-[10px] text-slate-400">{next.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short' })}</div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-600">Em breve</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-3 text-xs uppercase tracking-wide">Acesso rapido</h3>
            <div className="grid grid-cols-2 gap-2">
              {shortcuts.map(s => (
                <a key={s.id} href={s.url} target="_blank" rel="noopener" className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-50 hover:bg-white border border-slate-100 transition-all text-center">
                  <div className={`w-8 h-8 ${s.color} rounded-full flex items-center justify-center text-white mb-1.5`}>{renderIcon(s.icon, 16)}</div>
                  <span className="text-[10px] font-bold text-slate-700">{s.title}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AuroraAssistant />
    </div>
  );
};


