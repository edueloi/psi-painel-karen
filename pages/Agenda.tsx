import React, { useState, useEffect, useMemo } from 'react';
import { api, API_BASE_URL } from '../services/api';
import { Appointment, Service, Patient, User } from '../types';
import { 
    ChevronLeft, ChevronRight, Clock, Plus, Video, MapPin, 
    Calendar as CalendarIcon, CalendarDays, CalendarRange, X, Check, Repeat, Trash2, User as UserIcon, 
    DollarSign, Package, Layers, Loader2, Briefcase, FileText, UserCheck, Ban, Link2, Search,
    Filter, LayoutGrid, List as ListIcon, ExternalLink, Sparkles, CheckCircle2, AlertCircle,
    ArrowUpRight, Info,
    Edit3, Download, Upload, FileDown, FileUp
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Modal } from '../components/UI/Modal';
import { Button } from '../components/UI/Button';
import { Input, Select, TextArea } from '../components/UI/Input';

export const Agenda: React.FC = () => {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
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
      recurrence_count: '',
      is_all_day: false
  });

  const locale = language === 'pt' ? 'pt-BR' : 'en-US';
  const startHour = 6;
  const endHour = 22;
  const hourHeight = 70;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  const typeMeta = {
      consulta: { 
          label: 'Consulta', 
          chip: 'bg-indigo-50/50 text-indigo-700 border-indigo-100/50 backdrop-blur-sm', 
          solid: 'bg-indigo-600', 
          dot: 'bg-indigo-500', 
          event: 'bg-indigo-50/80 text-indigo-700 border-indigo-100 hover:border-indigo-300 hover:bg-white' 
      },
      pessoal: { 
          label: 'Pessoal', 
          chip: 'bg-amber-50/50 text-amber-700 border-amber-100/50 backdrop-blur-sm', 
          solid: 'bg-amber-500', 
          dot: 'bg-amber-500', 
          event: 'bg-amber-50/80 text-amber-700 border-amber-100 hover:border-amber-300 hover:bg-white' 
      },
      bloqueio: { 
          label: 'Bloqueio', 
          chip: 'bg-slate-100/80 text-slate-600 border-slate-300 shadow-inner', 
          solid: 'bg-slate-500', 
          dot: 'bg-slate-500', 
          event: 'bg-slate-100/90 text-slate-600 border-dashed border-slate-400 opacity-80' 
      },
  } as const;

  const statusMeta = {
      scheduled: { label: 'Agendado', chip: 'bg-slate-100/50 text-slate-500 border-slate-200/30' },
      confirmed: { label: 'Confirmado', chip: 'bg-emerald-50/50 text-emerald-700 border-emerald-100/50' },
      completed: { label: 'Concluído', chip: 'bg-blue-50/50 text-blue-700 border-blue-100/50' },
      cancelled: { label: 'Cancelado', chip: 'bg-rose-50/50 text-rose-700 border-rose-100/50' },
      'no-show': { label: 'Faltou', chip: 'bg-orange-50/50 text-orange-700 border-orange-100/50' }
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
            const start = new Date(a.start_time || a.appointment_date);
            const end = a.end_time ? new Date(a.end_time) : new Date(start.getTime() + (a.duration_minutes || 50) * 60000);
            return {
                ...a,
                start,
                end,
                type: a.type || 'consulta',
                status: a.status || 'scheduled',
                professional_id: a.professional_id || a.psychologist_id,
                duration_minutes: a.duration_minutes || 50
            };
        }));
        setPatients((pts || []).map(p => ({
            ...p,
            full_name: p.full_name || p.name || 'Sem nome'
        })));
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

  const handleDateChange = (dateStr: string) => {
    if (dateStr) {
      setCurrentDate(new Date(dateStr + 'T12:00:00'));
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/export`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('psi_token')}` }
      });
      if (!response.ok) throw new Error('Erro ao exportar');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agenda_exportada_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      pushToast('success', 'Agenda exportada com sucesso.');
    } catch (err) {
      console.error(err);
      pushToast('error', 'Erro ao exportar agenda.');
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/export-template`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('psi_token')}` }
      });
      if (!response.ok) throw new Error('Erro ao baixar modelo');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modelo_importacao_agenda.xlsx';
      a.click();
    } catch (err) {
      console.error(err);
      pushToast('error', 'Erro ao baixar modelo.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImport(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await api.request<any>('/appointments/import', {
        method: 'POST',
        body: formData
      });
      fetchData();
      pushToast('success', result.message || 'Dados importados com sucesso.');
      setIsImportModalOpen(false);
    } catch (err) {
      console.error(err);
      pushToast('error', 'Erro ao importar dados. Verifique o formato do arquivo.');
    } finally {
      setIsProcessingImport(false);
      e.target.value = '';
    }
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

  const toLocalISO = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const openNewModal = (date?: Date) => {
    const initialDate = date || new Date();
    setFormData({
        type: 'consulta',
        modality: 'presencial',
        appointment_date: toLocalISO(initialDate),
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
        appointment_date: toLocalISO(apt.start),
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

        let response;
        if (formData.id) {
            response = await api.put<Appointment>(`/appointments/${formData.id}`, payload);
        } else {
            response = await api.post<Appointment>('/appointments', payload);
        }

        const savedAppointment = response;

        // SE FOR ONLINE E NÃO TEM URL AINDA, CRIA UMA SALA VIRTUAL
        if (formData.type === 'consulta' && formData.modality === 'online' && !formData.meeting_url) {
            try {
                const roomCode = Math.random().toString(36).substr(2, 9);
                const patient = patients.find(p => String(p.id) === String(formData.patient_id));
                const titleText = `Sessão: ${patient?.full_name || 'Paciente'} - ${new Date(formData.appointment_date).toLocaleDateString()}`;
                
                const roomData = {
                    title: titleText,
                    code: roomCode,
                    patient_id: formData.patient_id,
                    professional_id: formData.psychologist_id || formData.professional_id,
                    appointment_id: savedAppointment.id,
                    scheduled_start: formData.appointment_date,
                    provider: 'interno'
                };
                
                const room = await api.post<any>('/virtual-rooms', roomData);
                const meetingUrl = `${window.location.origin}/sala/${room.code || roomCode}`;
                
                await api.put(`/appointments/${savedAppointment.id}`, {
                    ...payload,
                    meeting_url: meetingUrl
                });
            } catch (roomError) {
                console.error("Erro ao criar sala virtual:", roomError);
            }
        }

        // NOVO FLOW: Redireciona para a comanda gerada automaticamente se houver comanda_id
        if (savedAppointment.comanda_id) {
            pushToast('success', 'Agendamento e Comanda gerada automaticamente!');
            setTimeout(() => {
                navigate('/comandas', { state: { openComandaId: savedAppointment.comanda_id } });
            }, 1000);
            return;
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
              <p className="text-slate-400 text-xs mt-1 font-bold">{t('agenda.subtitle')}</p>
          </div>
          <div className="flex gap-2">
              <button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="bg-white hover:bg-slate-50 text-slate-600 px-5 py-2.5 rounded-2xl text-[10px] font-black flex items-center gap-2 border border-slate-200 transition-all active:scale-95 uppercase tracking-widest shadow-sm"
              >
                  <Upload size={16} className="text-indigo-500" /> Importar
              </button>
              <button 
                  onClick={handleExport}
                  className="bg-white hover:bg-slate-50 text-slate-600 px-5 py-2.5 rounded-2xl text-[10px] font-black flex items-center gap-2 border border-slate-200 transition-all active:scale-95 uppercase tracking-widest shadow-sm"
              >
                  <Download size={16} className="text-emerald-500" /> Exportar
              </button>
              <button 
                  onClick={() => openNewModal()} 
                  className="bg-indigo-600 hover:bg-slate-800 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95 uppercase tracking-widest"
              >
                  <Plus size={18} /> Novo Agendamento
              </button>
          </div>
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
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-center lg:justify-start">
              <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] shadow-inner border border-slate-200">
                  <button onClick={() => handleNavigate(-1)} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-indigo-600"><ChevronLeft size={20}/></button>
                  <button onClick={() => setCurrentDate(new Date())} className="px-4 text-[10px] font-black text-slate-700 uppercase tracking-widest underline decoration-indigo-300 underline-offset-4">Hoje</button>
                  <button onClick={() => handleNavigate(1)} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-indigo-600"><ChevronRight size={20}/></button>
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-800 truncate px-2">{getRangeLabel()}</h2>
                <div className="relative group">
                  <input 
                    type="date" 
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-8"
                  />
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:text-indigo-600 transition-all cursor-pointer">
                    <CalendarDays size={18} />
                  </div>
                </div>
              </div>
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
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-fadeIn relative">
        {isLoading ? (
            <div className="flex flex-col h-full animate-pulse">
                {/* Header Skeleton */}
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/30">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="py-4 flex justify-center">
                            <div className="h-2 w-12 bg-slate-200 rounded-full"></div>
                        </div>
                    ))}
                </div>
                {/* Body Skeleton */}
                <div className="grid grid-cols-7 flex-1 min-h-[600px]">
                    {Array.from({ length: 35 }).map((_, i) => (
                        <div key={i} className="p-4 border-b border-r border-slate-50 flex flex-col gap-3">
                            <div className="h-5 w-5 bg-slate-200 rounded-lg"></div>
                            <div className="space-y-2">
                                <div className="h-3 w-full bg-slate-100 rounded-md"></div>
                                <div className="h-3 w-4/5 bg-slate-100 rounded-md opacity-60"></div>
                            </div>
                        </div>
                    ))}
                </div>
                {/* Loading Overlay Spinner (Optional for extra "premium" feel) */}
                <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center z-50">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <Sparkles className="absolute -top-2 -right-2 text-amber-400 animate-pulse" size={16}/>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Sincronizando Agenda</p>
                    </div>
                </div>
            </div>
        ) : view === 'month' ? (
            <div className="flex flex-col h-full">
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/30">
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day, idx) => (
                        <div key={day} className={`py-4 text-center text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase ${idx === 5 || idx === 6 ? 'bg-slate-100/20' : ''}`}>{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 flex-1">
                    {monthDays.map((day, idx) => {
                        const dayApts = getAppointmentsForDay(day);
                        const isToday = isSameDay(day, new Date());
                        const inMonth = day.getMonth() === currentDate.getMonth();
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        
                        return (
                            <div 
                                key={day.toISOString()} 
                                className={`min-h-[120px] p-2 border-b border-r border-slate-50 transition-all group relative
                                    ${inMonth ? 'bg-white' : 'bg-slate-50/30'} 
                                    ${isWeekend ? 'bg-slate-200/5' : ''}
                                    hover:bg-indigo-50/10 cursor-alias
                                `}
                                onClick={() => openNewModal(day)}
                            >
                                <div className="flex justify-between items-start mb-2 px-1">
                                    <span className={`text-xs font-black transition-all ${isToday ? 'h-7 w-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200 -mt-1' : inMonth ? 'text-slate-800' : 'text-slate-300'}`}>
                                        {day.getDate()}
                                    </span>
                                    {dayApts.length > 0 && !isToday && <div className="h-1.5 w-1.5 rounded-full bg-indigo-400/50 mt-1"></div>}
                                </div>
                                <div className="space-y-1">
                                    {dayApts.slice(0, 3).map(apt => (
                                        <button 
                                            key={apt.id} 
                                            onClick={(e) => { e.stopPropagation(); openEditModal(apt); }} 
                                            className={`w-full text-left px-2 py-1 rounded-lg border text-[9px] font-bold truncate transition-all hover:translate-x-1 active:scale-95 shadow-sm overflow-hidden flex items-center gap-1.5 ${typeMeta[apt.type].event}`}
                                        >
                                            <div className={`w-1 h-3 rounded-full ${typeMeta[apt.type].solid}`}></div>
                                            <span className="shrink-0 opacity-50">{apt.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span className="truncate">{apt.patient_name || apt.title}</span>
                                        </button>
                                    ))}
                                    {dayApts.length > 3 && (
                                        <p className="text-[8px] font-black text-slate-400 bg-slate-100 py-0.5 rounded-lg text-center mx-1">+ {dayApts.length - 3} itens</p>
                                    )}
                                </div>
                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-50 text-indigo-600 p-1 rounded-md">
                                    <Plus size={10} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        ) : (
            <div className="flex overflow-hidden custom-scrollbar bg-white">
                {/* Time labels column */}
                <div className="w-16 flex-shrink-0 bg-slate-50/50 border-r border-slate-100 select-none">
                    <div className="h-20 border-b border-slate-100"></div>
                    {hours.map(h => (
                        <div key={h} className="h-[80px] flex items-start justify-center pt-2 group relative">
                            <span className="text-[9px] font-black text-slate-300 tabular-nums group-hover:text-indigo-400 transition-colors">{String(h).padStart(2, '0')}:00</span>
                        </div>
                    ))}
                </div>

                {/* Main scrollable area */}
                <div className="flex-1 overflow-x-auto no-scrollbar">
                    <div className="flex min-w-full relative" style={{ height: (hours.length * 80) + 80 }}>
                        {/* THE RED TIME INDICATOR (Now Line) */}
                        {isSameDay(currentDate, new Date()) && view === 'day' && (
                            <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center gap-2" 
                                style={{ top: 80 + (((new Date().getHours() + new Date().getMinutes()/60) - startHour) * 80) }}>
                                <div className="w-2 h-2 rounded-full bg-rose-500 shadow-lg shadow-rose-200 ml-[-4px]"></div>
                                <div className="h-[2px] flex-1 bg-gradient-to-r from-rose-500 to-transparent"></div>
                            </div>
                        )}

                        {(view === 'day' ? [currentDate] : weekDays).map(day => (
                            <div key={day.toISOString()} className="flex-1 border-r border-slate-50 relative min-w-[180px]">
                                {/* Header for each day */}
                                <div className={`h-20 flex flex-col items-center justify-center gap-1.5 sticky top-0 z-30 border-b border-slate-100 transition-all ${isSameDay(day, new Date()) ? 'bg-indigo-50/40 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md'}`}>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{day.toLocaleDateString(locale, { weekday: 'short' })}</span>
                                    <span className={`text-xl font-black ${isSameDay(day, new Date()) ? 'text-indigo-600' : 'text-slate-800'}`}>{day.getDate()}</span>
                                    {isSameDay(day, new Date()) && <div className="h-1 w-8 rounded-full bg-indigo-600"></div>}
                                </div>

                                {/* Hours grid */}
                                <div className="relative h-full">
                                    {hours.map(h => (
                                        <div 
                                            key={h} 
                                            className="h-[80px] border-b border-slate-50/50 hover:bg-slate-50/30 transition-colors cursor-crosshair group relative"
                                            onClick={() => {
                                                const d = new Date(day);
                                                d.setHours(h);
                                                d.setMinutes(0);
                                                openNewModal(d);
                                            }}
                                        >
                                            <div className="absolute inset-x-0 top-0 h-[1px] bg-slate-100 opacity-0 group-hover:opacity-100"></div>
                                        </div>
                                    ))}

                                    {/* APPOINTMENTS CARDS */}
                                    {getAppointmentsForDay(day)
                                        .sort((a, b) => {
                                            if (a.type === 'bloqueio' && b.type !== 'bloqueio') return -1;
                                            if (a.type !== 'bloqueio' && b.type === 'bloqueio') return 1;
                                            return 0;
                                        })
                                        .map(apt => {
                                        const startMin = (apt.start.getHours() * 60 + apt.start.getMinutes()) - (startHour * 60);
                                        const durMin = (apt.end.getTime() - apt.start.getTime()) / 60000;
                                        const top = (startMin/60) * 80;
                                        const height = (durMin/60) * 80;
                                        
                                        return (
                                            <button 
                                                key={apt.id} 
                                                onClick={(e) => { e.stopPropagation(); openEditModal(apt); }} 
                                                className={`absolute left-2 right-2 rounded-[1.25rem] p-4 border shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all overflow-hidden text-left group z-10 flex flex-col gap-2 ${typeMeta[apt.type].event}`} 
                                                style={{ top: top + 4, height: Math.max(height - 8, 40) }}
                                            >
                                                <div className="flex flex-col h-full relative z-10">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div className="flex flex-col flex-1 min-w-0">
                                                            <span className="text-[10px] font-black text-slate-800 leading-none mb-0.5 truncate">
                                                                {apt.patient_name || apt.title || (apt.type === 'bloqueio' ? 'Bloqueio' : 'Evento')}
                                                            </span>
                                                            {apt.professional_name && (
                                                                <span className="text-[8px] font-bold text-slate-400 truncate mb-1">
                                                                    {apt.professional_name}
                                                                </span>
                                                            )}
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[8px] font-black opacity-40 uppercase tracking-widest tabular-nums flex items-center gap-1">
                                                                    <Clock size={8}/> {apt.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                {apt.modality === 'online' && (
                                                                    <div className="flex items-center gap-1 text-indigo-500 font-black text-[7px] uppercase tracking-tighter bg-indigo-100/50 px-1.5 py-0.5 rounded-md border border-indigo-200/50">
                                                                        <Video size={8}/> Online
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="p-1.5 bg-white/50 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                                                            <ArrowUpRight size={12}/>
                                                        </div>
                                                    </div>
                                                    
                                                    {height > 60 && (
                                                        <div className="mt-auto flex items-center justify-between">
                                                            <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border border-current opacity-60`}>
                                                                {statusMeta[apt.status || 'scheduled'].label}
                                                            </div>
                                                            <div className="h-6 w-6 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100">
                                                                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                                                                    <UserIcon size={12}/>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Left accent line */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${typeMeta[apt.type].solid}`}></div>
                                                
                                                {/* Soft shadow accent */}
                                                <div className={`absolute -right-4 -bottom-4 w-20 h-20 opacity-[0.03] rounded-full pointer-events-none group-hover:opacity-10 transition-opacity ${typeMeta[apt.type].solid}`}></div>
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
      </div>

      {/* APPOINTMENT MODAL */}
      <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={formData.id ? 'Editar Sessão' : 'Novo Agendamento'}
          subtitle={new Date(formData.appointment_date).toLocaleDateString(locale, { dateStyle: 'full' })}
          maxWidth="max-w-3xl"
          footer={
            <div className="flex w-full justify-between items-center">
              {formData.id ? (
                <Button 
                  variant="danger" 
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="!rounded-2xl h-12 w-12 p-0"
                >
                  <Trash2 size={20}/>
                </Button>
              ) : <div />}
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="uppercase tracking-widest text-[11px]">
                  Descartar
                </Button>
                <Button 
                  onClick={handleSave} 
                  className="px-8 h-12 bg-indigo-600 hover:bg-slate-800 text-white rounded-2xl shadow-xl shadow-indigo-600/20 uppercase tracking-widest text-[11px]"
                >
                  <CheckCircle2 size={18} className="mr-2" />
                  {formData.id ? 'Atualizar' : 'Confirmar'} Agendamento
                </Button>
              </div>
            </div>
          }
      >
          <div className="space-y-6">
              {/* TYPE SELECTOR - Compact */}
              <div className="bg-slate-50 p-1 rounded-2xl flex border border-slate-100/50 shadow-inner">
                  {['consulta', 'pessoal', 'bloqueio'].map(t => (
                      <button 
                        key={t} 
                        onClick={() => setFormData({...formData, type: t})} 
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${formData.type === t ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                          {t === 'consulta' ? <Briefcase size={14}/> : t === 'pessoal' ? <UserIcon size={14}/> : <Ban size={14}/>}
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                  ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* LEFT COLUMN */}
                  <div className="space-y-5">
                      {formData.type === 'consulta' ? (
                        <>
                          <Select 
                            label="Paciente" 
                            icon={<UserIcon size={18} />}
                            value={formData.patient_id || ''} 
                            onChange={e => setFormData({...formData, patient_id: e.target.value})}
                          >
                              <option value="">Selecionar paciente...</option>
                              {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                          </Select>

                          <Select 
                            label="Serviço / Atendimento" 
                            icon={<Package size={18} />}
                            value={formData.service_id || ''} 
                            onChange={e => setFormData({...formData, service_id: e.target.value})}
                          >
                              <option value="">Tipo de atendimento...</option>
                              {services.map(s => <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.price)}</option>)}
                          </Select>
                        </>
                      ) : (
                        <Input 
                          label="Título do Evento" 
                          placeholder="Ex: Supervisão Clínica" 
                          value={formData.title || ''} 
                          onChange={e => setFormData({...formData, title: e.target.value})}
                        />
                      )}

                      <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Modalidade</label>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button 
                                  onClick={() => setFormData({...formData, modality: 'presencial'})} 
                                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${formData.modality === 'presencial' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                                >
                                  Presencial
                                </button>
                                <button 
                                  onClick={() => setFormData({...formData, modality: 'online'})} 
                                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${formData.modality === 'online' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                                >
                                  Online
                                </button>
                            </div>
                          </div>

                          <Select 
                            label="Status" 
                            value={formData.status} 
                            onChange={e => setFormData({...formData, status: e.target.value})}
                          >
                              {Object.entries(statusMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </Select>
                      </div>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <Input 
                          label="Início da Sessão" 
                          type="datetime-local" 
                          icon={<Clock size={18} />}
                          value={formData.appointment_date} 
                          onChange={e => setFormData({...formData, appointment_date: e.target.value})}
                        />
                        <Input 
                          label="Duração (min)" 
                          type="number" 
                          icon={<Clock size={18} />}
                          value={formData.duration_minutes} 
                          onChange={e => setFormData({...formData, duration_minutes: Number(e.target.value)})}
                        />
                      </div>

                      {(formData.type === 'bloqueio' || formData.type === 'pessoal') && !formData.is_all_day && (
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora de Término</span>
                              <span className="text-sm font-black text-slate-700">
                                  {(() => {
                                      try {
                                        const start = new Date(formData.appointment_date);
                                        const end = new Date(start.getTime() + (formData.duration_minutes || 50) * 60000);
                                        return end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                      } catch(e) { return '--:--'; }
                                  })()}
                              </span>
                          </div>
                      )}

                      <Select 
                        label="Profissional Responsável" 
                        icon={<UserCheck size={18} />}
                        value={formData.psychologist_id || ''} 
                        onChange={e => setFormData({...formData, psychologist_id: e.target.value})}
                      >
                          <option value="">Selecionar profissional...</option>
                          {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </Select>

                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              {formData.type === 'consulta' ? 'Repetir Agendamento' : 'Repetir Bloqueio'}
                          </label>
                          <Select 
                            variant="ghost"
                            className="!w-auto !border-none !bg-transparent !p-0 !h-auto font-black text-indigo-600 uppercase text-[10px]"
                            value={formData.recurrence_rule || ''} 
                            onChange={e => setFormData({...formData, recurrence_rule: e.target.value})}
                          >
                              <option value="">Não Repete</option>
                              <option value="weekly">Semanal</option>
                              <option value="biweekly">Quinzenal</option>
                              <option value="monthly">Mensal</option>
                          </Select>
                      </div>

                      {(formData.type === 'bloqueio' || formData.type === 'pessoal') && (
                          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dia Inteiro</label>
                              <button 
                                onClick={() => setFormData({...formData, is_all_day: !formData.is_all_day, duration_minutes: !formData.is_all_day ? 1440 : 50})}
                                className={`w-10 h-5 rounded-full transition-all relative ${formData.is_all_day ? 'bg-indigo-600' : 'bg-slate-300'}`}
                              >
                                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.is_all_day ? 'left-6' : 'left-1'}`}></div>
                              </button>
                          </div>
                      )}
                  </div>
              </div>

              {formData.modality === 'online' && (
                  <div className="bg-indigo-600 p-4 rounded-2xl text-white animate-slideIn flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                          <Video size={20}/>
                      </div>
                      <div className="flex-1">
                          <Input 
                            label="" 
                            placeholder="Link da vídeo chamada (Google Meet, Zoom...)" 
                            value={formData.meeting_url || ''} 
                            onChange={e => setFormData({...formData, meeting_url: e.target.value})}
                            className="!bg-white/10 !border-white/20 !text-white !placeholder:text-indigo-200"
                          />
                      </div>
                  </div>
              )}
              
              <TextArea 
                label="Observações do Atendimento" 
                placeholder="Ex: Paciente relatou ansiedade leve sobre o novo emprego..." 
                value={formData.notes || ''} 
                onChange={e => setFormData({...formData, notes: e.target.value})}
                className="min-h-[80px]"
              />
          </div>
      </Modal>

      {/* IMPORT MODAL */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => !isProcessingImport && setIsImportModalOpen(false)}
        title="Importar Agenda"
        subtitle="Siga o modelo para importar seus agendamentos via excel/csv"
        maxWidth="max-w-xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 flex flex-col items-center text-center group hover:border-indigo-200 transition-all">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm mb-4 border border-indigo-50 group-hover:scale-110 transition-transform">
                <FileDown size={28} />
              </div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-2">1. Baixe o Modelo</h4>
              <p className="text-[10px] font-bold text-slate-400 mb-5 leading-relaxed">
                Baixe nossa planilha modelo para preencher com seus dados corretamente.
              </p>
              <button 
                onClick={downloadTemplate}
                className="w-full py-3 bg-white hover:bg-slate-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-indigo-100 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Download size={14} /> Download Modelo
              </button>
            </div>

            <div className="bg-indigo-600 p-5 rounded-[2rem] border border-indigo-500 flex flex-col items-center text-center shadow-lg shadow-indigo-200">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-4 backdrop-blur-md">
                <Info size={28} />
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2 text-shadow-sm">Dica Importante</h4>
              <p className="text-[10px] font-bold text-indigo-100 mb-5 leading-relaxed">
                Preencha os IDs de pacientes e profissionais conforme listados no seu painel.
              </p>
              <div className="w-full py-3 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/20 backdrop-blur-md">
                Formato: .XLSX / .CSV
              </div>
            </div>
          </div>

          <div className="relative group">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleImport}
              disabled={isProcessingImport}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              id="file-upload"
            />
            <div className={`p-10 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center transition-all ${isProcessingImport ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 hover:bg-white hover:border-indigo-300 border-slate-200'}`}>
              {isProcessingImport ? (
                <>
                  <Loader2 size={32} className="text-indigo-500 animate-spin mb-4" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Importando registros...</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-indigo-200 mb-4 group-hover:scale-110 transition-transform">
                    <FileUp size={32} />
                  </div>
                  <p className="text-xs font-black text-slate-700 uppercase tracking-widest">2. Selecione seu Arquivo</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-2">Clique aqui ou arraste seu arquivo CSV</p>
                  
                  <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aguardando arquivo</span>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="flex justify-center border-t border-slate-50 pt-6">
            <button 
              onClick={() => setIsImportModalOpen(false)}
              className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-[0.2em] transition-colors flex items-center gap-2"
            >
              <X size={14}/> Cancelar e Sair
            </button>
          </div>
        </div>
      </Modal>

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
