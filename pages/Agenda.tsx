import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Appointment, Service, Patient, User } from '../types';
import { 
    ChevronLeft, ChevronRight, Clock, Plus, Video, MapPin, 
    Calendar as CalendarIcon, CalendarDays, CalendarRange, X, Check, Repeat, Trash2, User as UserIcon, 
    DollarSign, Package, Layers, Loader2, Briefcase, FileText, UserCheck, Ban, Link2, Search,
    Filter, LayoutGrid, List as ListIcon, ExternalLink, Sparkles, CheckCircle2, AlertCircle,
    ArrowUpRight, Info,
    Edit3
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSearchParams } from 'react-router-dom';

export const Agenda: React.FC = () => {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [filterPatientId, setFilterPatientId] = useState<string | null>(null);
  const [filterProfessionalId, setFilterProfessionalId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [applyToSeries, setApplyToSeries] = useState(false);
  const [deleteSeries, setDeleteSeries] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; type: 'success' | 'error'; message: string }[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [formData, setFormData] = useState<any>({
      type: 'consulta',
      modality: 'presencial',
      appointment_date: new Date().toISOString().slice(0, 16),
      duration_minutes: 50,
      title: '',
      service_id: '',
      patient_id: '',
      patient_name_text: '',
      psychologist_id: '',
      professional_name_text: '',
      notes: '',
      status: 'scheduled',
      meeting_url: '',
      recurrence_enabled: false,
      recurrence_freq: '',
      recurrence_interval: 1,
      recurrence_weekdays: [],
      recurrence_rule: null,
      recurrence_end_date: '',
      recurrence_count: ''
  });

  const locale = language === 'pt' ? 'pt-BR' : 'en-US';
  const startHour = 6;
  const endHour = 22;
  const hourHeight = 70;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  const typeMeta = {
      consulta: { label: 'Consulta', chip: 'bg-indigo-50 text-indigo-700 border-indigo-100', solid: 'bg-indigo-600', dot: 'bg-indigo-500', event: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:border-indigo-400' },
      pessoal: { label: 'Pessoal', chip: 'bg-amber-50 text-amber-700 border-amber-100', solid: 'bg-amber-500', dot: 'bg-amber-500', event: 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400' },
      bloqueio: { label: 'Bloqueio', chip: 'bg-slate-100 text-slate-600 border-slate-200', solid: 'bg-slate-500', dot: 'bg-slate-500', event: 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-400' },
  } as const;

  const statusMeta = {
      scheduled: { label: 'Agendado', chip: 'bg-slate-100 text-slate-600 border-slate-200' },
      confirmed: { label: 'Confirmado', chip: 'bg-blue-50 text-blue-700 border-blue-100' },
      completed: { label: 'Concluído', chip: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
      cancelled: { label: 'Cancelado', chip: 'bg-rose-50 text-rose-700 border-rose-100' },
      'no-show': { label: 'Faltou', chip: 'bg-amber-50 text-amber-700 border-amber-100' }
  } as const;

  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();
  const addDays = (date: Date, days: number) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
  const startOfWeek = (date: Date) => { const d = startOfDay(date); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return d; };
  const endOfWeek = (date: Date) => addDays(startOfWeek(date), 6);
  const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const monthDays: Date[] = [];
  for (let d = new Date(calendarStart); d <= calendarEnd; d = addDays(d, 1)) { monthDays.push(new Date(d)); }

  const fetchData = async () => {
    setIsLoading(true);
    try {
        const [apts, pts, srvs, pros] = await Promise.all([
            api.get<any[]>('/appointments'),
            api.get<any[]>('/patients'),
            api.get<Service[]>('/services'),
            api.get<any[]>('/users')
        ]);
        
        setAppointments(apts.map(a => {
            const start = new Date(a.appointment_date);
            const end = new Date(start.getTime() + (a.duration_minutes || 50) * 60000);
            return {
                ...a,
                start,
                end,
                type: a.type || 'consulta',
                status: a.status || 'scheduled',
                professional_id: a.professional_id || a.psychologist_id
            };
        }));
        setPatients(pts || []);
        setProfessionals(pros?.filter(p => p.role !== 'secretario') || []);
        setServices(srvs || []);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredAppointments = useMemo(() => {
    let filtered = appointments;
    if (filterPatientId) filtered = filtered.filter(a => String(a.patient_id || '') === String(filterPatientId));
    if (filterProfessionalId) filtered = filtered.filter(a => String(a.professional_id || '') === String(filterProfessionalId));
    if (filterStatus) filtered = filtered.filter(a => (a.status || 'scheduled') === filterStatus);
    return filtered;
  }, [appointments, filterPatientId, filterProfessionalId, filterStatus]);

  const getAppointmentsForDay = (date: Date) => filteredAppointments.filter(a => isSameDay(a.start, date));

  const stats = useMemo(() => {
    const today = getAppointmentsForDay(new Date());
    return {
      todayCount: today.length,
      confirmedCount: today.filter(a => a.status === 'confirmed').length,
      onlineCount: today.filter(a => a.modality === 'online').length
    };
  }, [filteredAppointments]);

  const handleNavigate = (direction: number) => {
    const d = new Date(currentDate);
    if (view === 'day') d.setDate(d.getDate() + direction);
    if (view === 'week') d.setDate(d.getDate() + direction * 7);
    if (view === 'month') d.setMonth(d.getMonth() + direction);
    setCurrentDate(d);
  };

  const getRangeLabel = () => {
    if (view === 'month') return currentDate.toLocaleString(locale, { month: 'long', year: 'numeric' });
    if (view === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      return `${start.toLocaleDateString(locale, { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };

  const openNewModal = (date?: Date) => {
    const initialDate = date || new Date();
    setFormData({
        type: 'consulta',
        modality: 'presencial',
        appointment_date: initialDate.toISOString().slice(0, 16),
        duration_minutes: 50,
        title: '',
        service_id: '',
        patient_id: '',
        psychologist_id: '',
        notes: '',
        status: 'scheduled',
        meeting_url: '',
        recurrence_enabled: false
    });
    setIsModalOpen(true);
  };

  const openEditModal = (apt: Appointment) => {
    setFormData({
        ...apt,
        appointment_date: new Date(apt.start).toISOString().slice(0, 16),
        psychologist_id: apt.professional_id || apt.psychologist_id
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
        const payload = {
            ...formData,
            start_time: formData.appointment_date,
            professional_id: formData.psychologist_id || formData.professional_id
        };
        if (formData.id) {
            await api.put(`/appointments/${formData.id}`, payload);
        } else {
            await api.post('/appointments', payload);
        }
        fetchData();
        setIsModalOpen(false);
        pushToast('success', 'Agenda atualizada com sucesso.');
    } catch (e: any) {
        pushToast('error', 'Erro ao salvar agendamento.');
    }
  };

  const pushToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans pb-24">
      {/* TOASTS */}
      <div className="fixed top-6 right-6 z-[200] space-y-3">
          {toasts.map(t => (
              <div key={t.id} className={`px-6 py-4 rounded-[1.5rem] shadow-2xl border font-black text-xs uppercase tracking-widest animate-slideIn ${t.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-rose-600 text-white border-rose-500'}`}>
                  {t.message}
              </div>
          ))}
      </div>

      {/* HEADER HERO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100 shadow-sm"><CalendarIcon size={20}/></div>
                  {t('agenda.title')}
              </h1>
              <p className="text-slate-400 text-xs mt-1 font-bold">{t('agenda.subtitle') || 'Organize sua rotina clínica e compromissos'}</p>
          </div>
          <button 
              onClick={() => openNewModal()} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
              <Plus size={18} /> Novo Agendamento
          </button>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <CalendarRange size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sessões hoje</p>
                  <p className="text-xl font-black text-slate-800">{stats.todayCount}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <UserCheck size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-500">Confirmados</p>
                  <p className="text-xl font-black text-slate-800">{stats.confirmedCount}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-amber-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <Video size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-amber-500">Online hoje</p>
                  <p className="text-xl font-black text-slate-800">{stats.onlineCount}</p>
              </div>
          </div>
      </div>

      {/* FILTERS & NAVIGATION BAR */}
      <div className="bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center sticky top-4 z-40 backdrop-blur-md bg-white/90">
          <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] shadow-inner border border-slate-200">
                  <button onClick={() => handleNavigate(-1)} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-indigo-600"><ChevronLeft size={20}/></button>
                  <button onClick={() => setCurrentDate(new Date())} className="px-4 text-[10px] font-black text-slate-700 uppercase tracking-widest underline decoration-indigo-300 underline-offset-4">Hoje</button>
                  <button onClick={() => handleNavigate(1)} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-indigo-600"><ChevronRight size={20}/></button>
              </div>
              <h2 className="text-base font-black text-slate-800 truncate px-2">{getRangeLabel()}</h2>
          </div>

          <div className="flex gap-3 w-full lg:w-auto overflow-x-auto no-scrollbar py-1">
              <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem]">
                  <button onClick={() => setView('day')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Dia</button>
                  <button onClick={() => setView('week')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Semana</button>
                  <button onClick={() => setView('month')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Mês</button>
              </div>
              
              <div className="flex gap-2">
                <select className="bg-white border border-slate-200 rounded-2xl px-4 py-2 text-[10px] font-black text-slate-600 uppercase tracking-wider outline-none focus:border-indigo-400 max-w-[150px]" value={filterStatus || ''} onChange={e => setFilterStatus(e.target.value || null)}>
                    <option value="">Status</option>
                    {Object.entries(statusMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select className="bg-white border border-slate-200 rounded-2xl px-4 py-2 text-[10px] font-black text-slate-600 uppercase tracking-wider outline-none focus:border-indigo-400 max-w-[150px]" value={filterProfessionalId || ''} onChange={e => setFilterProfessionalId(e.target.value || null)}>
                    <option value="">Profissional</option>
                    {professionals.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                </select>
              </div>
          </div>
      </div>

      {/* CALENDAR CONTENT */}
      {view === 'month' ? (
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden animate-fadeIn">
              <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map(day => (
                      <div key={day} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{day}</div>
                  ))}
              </div>
              <div className="grid grid-cols-7">
                  {monthDays.map(day => {
                      const dayApts = getAppointmentsForDay(day);
                      const isToday = isSameDay(day, new Date());
                      const inMonth = day.getMonth() === currentDate.getMonth();
                      return (
                          <div key={day.toISOString()} className={`min-h-[140px] p-4 border-b border-r border-slate-50 relative group transition-colors ${inMonth ? 'bg-white' : 'bg-slate-50/30'}`}>
                              <div className="flex justify-between mb-3">
                                  <span className={`text-sm font-black ${isToday ? 'text-indigo-600' : inMonth ? 'text-slate-800' : 'text-slate-300'}`}>{day.getDate()}</span>
                                  {isToday && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}
                              </div>
                              <div className="space-y-1.5">
                                  {dayApts.slice(0, 3).map(apt => (
                                      <button key={apt.id} onClick={() => openEditModal(apt)} className={`w-full text-left p-1.5 rounded-lg border text-[9px] font-bold truncate transition-all hover:scale-[1.02] ${typeMeta[apt.type].chip}`}>
                                          {apt.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {apt.patient_name || apt.title}
                                      </button>
                                  ))}
                                  {dayApts.length > 3 && <p className="text-[9px] font-black text-slate-300 text-center">+ {dayApts.length - 3} mais</p>}
                              </div>
                              <button onClick={() => openNewModal(day)} className="absolute bottom-2 right-2 p-1.5 bg-indigo-50 text-indigo-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={14}/></button>
                          </div>
                      );
                  })}
              </div>
          </div>
      ) : (
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex animate-fadeIn relative custom-scrollbar">
              <div className="w-20 bg-slate-50/50 border-r border-slate-100 flex-shrink-0">
                  <div className="h-16 border-b border-slate-100"></div>
                  {hours.map(h => (
                      <div key={h} className="h-[70px] flex items-start justify-center pt-2">
                          <span className="text-[10px] font-black text-slate-300 tabular-nums">{String(h).padStart(2, '0')}:00</span>
                      </div>
                  ))}
              </div>
              <div className="flex-1 overflow-x-auto no-scrollbar">
                  <div className="flex min-w-full" style={{ width: view === 'day' ? '100%' : '140%' }}>
                      {(view === 'day' ? [currentDate] : weekDays).map(day => (
                          <div key={day.toISOString()} className="flex-1 border-r border-slate-50 relative min-w-[150px]">
                              <div className={`h-16 border-b border-slate-100 flex flex-col items-center justify-center gap-1 ${isSameDay(day, new Date()) ? 'bg-indigo-50/30' : ''}`}>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{day.toLocaleDateString(locale, { weekday: 'short' })}</span>
                                  <span className={`text-sm font-black ${isSameDay(day, new Date()) ? 'text-indigo-600' : 'text-slate-800'}`}>{day.getDate()}</span>
                              </div>
                              <div className="relative" style={{ height: hours.length * 70 }}>
                                  {hours.map(h => <div key={h} className="h-[70px] border-b border-slate-50/50"></div>)}
                                  {getAppointmentsForDay(day).map(apt => {
                                      const startMin = (apt.start.getHours() * 60 + apt.start.getMinutes()) - (startHour * 60);
                                      const durMin = (apt.end.getTime() - apt.start.getTime()) / 60000;
                                      return (
                                          <button key={apt.id} onClick={() => openEditModal(apt)} className={`absolute left-1 right-2 rounded-2xl p-3 border-l-4 shadow-sm hover:shadow-xl transition-all overflow-hidden text-left group z-10 ${typeMeta[apt.type].event}`} style={{ top: (startMin/60) * 70 + 4, height: (durMin/60) * 70 - 8 }}>
                                              <div className="flex flex-col h-full">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-[9px] font-black opacity-60 uppercase tracking-tighter tabular-nums">{apt.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    {apt.modality === 'online' && <Video size={10} className="text-indigo-400"/>}
                                                </div>
                                                <h4 className="text-[11px] font-black text-slate-800 leading-tight truncate px-0.5">{apt.patient_name || apt.title}</h4>
                                                <div className="mt-auto flex items-center justify-between">
                                                    <div className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter border ${statusMeta[apt.status || 'scheduled'].chip}`}>
                                                        {statusMeta[apt.status || 'scheduled'].label}
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ArrowUpRight size={12} className="text-indigo-400"/>
                                                    </div>
                                                </div>
                                              </div>
                                          </button>
                                      );
                                  })}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* APPOINTMENT MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
              <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/20">
                  <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-indigo-600 text-white rounded-[1.8rem] flex items-center justify-center shadow-xl shadow-indigo-100">
                          {formData.id ? <Edit3 size={28} /> : <Plus size={32} />}
                        </div>
                        <div>
                          <h3 className="text-3xl font-black text-slate-800 tracking-tighter leading-none mb-1">{formData.id ? 'Editar Sessão' : 'Novo Agendamento'}</h3>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{new Date(formData.appointment_date).toLocaleDateString(locale, { dateStyle: 'full' })}</p>
                        </div>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="p-4 bg-white hover:bg-slate-50 rounded-2xl text-slate-400 shadow-sm ring-1 ring-slate-200 transition-all active:scale-95"><X size={24} /></button>
                  </div>
                  
                  <div className="p-12 overflow-y-auto custom-scrollbar flex-1 bg-white">
                      <div className="space-y-12">
                          {/* TYPE SELECTOR */}
                          <div className="space-y-4">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Natureza do Agendamento</label>
                              <div className="bg-slate-50 p-2 rounded-[2.2rem] flex border border-slate-100 shadow-inner">
                                  {['consulta', 'pessoal', 'bloqueio'].map(t => (
                                      <button key={t} onClick={() => setFormData({...formData, type: t})} className={`flex-1 py-5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${formData.type === t ? 'bg-white shadow-xl text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                          {t === 'consulta' ? <Briefcase size={18}/> : t === 'pessoal' ? <UserIcon size={18}/> : <Ban size={18}/>}
                                          {t}
                                      </button>
                                  ))}
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                              {/* PRIMARY DATA */}
                              <div className="space-y-8">
                                  {formData.type === 'consulta' ? (
                                    <div className="space-y-8">
                                        <div className="space-y-3">
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Paciente</label>
                                            <div className="relative group">
                                                <select className="w-full p-5 pl-14 rounded-[1.8rem] border-2 border-slate-100 bg-slate-50 outline-none font-black text-slate-700 text-lg focus:bg-white focus:border-indigo-400 transition-all appearance-none cursor-pointer" value={formData.patient_id || ''} onChange={e => setFormData({...formData, patient_id: e.target.value})}>
                                                    <option value="">Selecionar paciente...</option>
                                                    {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                                                </select>
                                                <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" size={24} />
                                                <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 rotate-90 pointer-events-none" size={20} />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Serviço / Atendimento</label>
                                            <div className="relative group">
                                                <select className="w-full p-5 pl-14 rounded-[1.8rem] border-2 border-slate-100 bg-slate-50 outline-none font-black text-slate-700 text-lg focus:bg-white focus:border-indigo-400 transition-all appearance-none cursor-pointer" value={formData.service_id || ''} onChange={e => setFormData({...formData, service_id: e.target.value})}>
                                                    <option value="">Tipo de atendimento...</option>
                                                    {services.map(s => <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.price)}</option>)}
                                                </select>
                                                <Package className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" size={24} />
                                            </div>
                                        </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Título do Evento</label>
                                        <input type="text" className="w-full p-5 rounded-[1.8rem] border-2 border-slate-100 bg-slate-50 outline-none font-black text-slate-700 text-2xl focus:bg-white focus:border-indigo-400 transition-all" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Supervisão Clínica" />
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-6">
                                      <div className="space-y-3">
                                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Modalidade</label>
                                          <div className="flex bg-slate-50 p-1.5 rounded-[1.5rem] border border-slate-100">
                                              <button onClick={() => setFormData({...formData, modality: 'presencial'})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.modality === 'presencial' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>Presencial</button>
                                              <button onClick={() => setFormData({...formData, modality: 'online'})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.modality === 'online' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>Online</button>
                                          </div>
                                      </div>
                                      <div className="space-y-3">
                                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
                                          <select className="w-full p-4 rounded-[1.5rem] border-2 border-slate-100 bg-slate-50 outline-none font-black text-slate-600 text-[10px] uppercase tracking-widest focus:bg-white focus:border-indigo-400 transition-all cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                              {Object.entries(statusMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                          </select>
                                      </div>
                                  </div>
                              </div>

                              {/* TIME & PROFESSIONAL */}
                              <div className="space-y-8">
                                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                                      <div className="space-y-3">
                                          <label className="block text-[11px] font-black text-indigo-900/40 uppercase tracking-widest px-1">Início da Sessão</label>
                                          <div className="relative group">
                                            <Clock className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400" size={24} />
                                            <input type="datetime-local" className="w-full p-5 pl-14 rounded-[1.8rem] border-2 border-indigo-100/50 bg-white outline-none font-black text-indigo-700 text-lg focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all tabular-nums" value={formData.appointment_date} onChange={e => setFormData({...formData, appointment_date: e.target.value})} />
                                          </div>
                                      </div>
                                      <div className="space-y-3">
                                          <label className="block text-[11px] font-black text-indigo-900/40 uppercase tracking-widest px-1">Profissional Responsável</label>
                                          <div className="relative group">
                                            <UserCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" size={24} />
                                            <select className="w-full p-5 pl-14 rounded-[1.8rem] border-2 border-white bg-white/60 outline-none font-black text-slate-700 text-lg focus:bg-white focus:border-indigo-400 transition-all appearance-none cursor-pointer" value={formData.psychologist_id || ''} onChange={e => setFormData({...formData, psychologist_id: e.target.value})}>
                                                <option value="">Selecionar profissional...</option>
                                                {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <div className="space-y-3">
                                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Observações do Atendimento</label>
                                      <textarea className="w-full p-6 rounded-[1.8rem] border-2 border-slate-100 bg-slate-50 outline-none font-bold text-slate-600 text-sm focus:bg-white focus:border-indigo-400 transition-all min-h-[120px] resize-none" value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Ex: Paciente relatou ansiedade leve sobre o novo emprego..."></textarea>
                                  </div>
                              </div>
                          </div>
                          
                          {formData.modality === 'online' && (
                              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-8 rounded-[2.5rem] text-white animate-slideIn flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-indigo-200">
                                  <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[1.8rem] border border-white/20 flex items-center justify-center">
                                      <Video size={36}/>
                                  </div>
                                  <div className="flex-1 space-y-3">
                                      <h4 className="text-xl font-black tracking-tight uppercase tracking-widest">Sessão por Vídeo</h4>
                                      <div className="relative flex-1">
                                          <Link2 className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-200" size={20} />
                                          <input type="text" className="w-full p-4 pl-14 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl outline-none text-white font-bold text-sm placeholder:text-indigo-200" placeholder="https://meet.google.com/..." value={formData.meeting_url || ''} onChange={e => setFormData({...formData, meeting_url: e.target.value})} />
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="p-10 border-t border-slate-50 bg-slate-50/30 flex justify-between items-center px-14 pb-14">
                      {formData.id ? (
                        <button onClick={() => setIsDeleteModalOpen(true)} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm border border-rose-100"><Trash2 size={24}/></button>
                      ) : <div className="w-10"></div>}
                      <div className="flex gap-6">
                        <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">DESCARTAR</button>
                        <button onClick={handleSave} className="px-14 py-4 bg-indigo-600 hover:bg-slate-800 text-white rounded-[1.8rem] shadow-2xl shadow-indigo-600/30 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-3 transform active:scale-95">
                            <CheckCircle2 size={24} /> {formData.id ? 'ATUALIZAR' : 'CONFIRMAR'} AGENDAMENTO
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* DELETE CONFIRM */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
           <div className="bg-white rounded-[3rem] p-12 max-w-sm w-full text-center shadow-2xl border border-white/20 transform animate-bounceIn">
              <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-rose-100 shadow-lg">
                <AlertCircle size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Remover Atendimento?</h3>
              <p className="text-sm font-bold text-slate-400 mb-10 leading-relaxed">Deseja remover este compromisso permanentemente? Esta ação não pode ser desfeita.</p>
              <div className="flex flex-col gap-4">
                 <button onClick={async () => { await api.delete(`/appointments/${formData.id}`); fetchData(); setIsModalOpen(false); setIsDeleteModalOpen(false); pushToast('success', 'Agendamento removido.'); }} className="w-full py-5 bg-rose-500 hover:bg-rose-600 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest shadow-xl transition-all">REMOVER SESSÃO</button>
                 <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-4 text-slate-400 hover:text-slate-600 text-[11px] font-black uppercase tracking-widest transition-all">MANTER NA AGENDA</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};
