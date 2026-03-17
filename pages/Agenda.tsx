import React, { useState, useEffect, useMemo } from 'react';
import { api, API_BASE_URL } from '../services/api';
import { Appointment, Service, Patient, User } from '../types';
import { 
    ChevronLeft, ChevronRight, Clock, Plus, Video, MapPin, 
    Calendar as CalendarIcon, CalendarDays, CalendarRange, X, Check, Repeat, Trash2, User as UserIcon, 
    DollarSign, Package, Layers, Loader2, Briefcase, FileText, UserCheck, Ban, Link2, Search,
    Filter, LayoutGrid, List as ListIcon, ExternalLink, Sparkles, CheckCircle2, AlertCircle,
    ArrowUpRight, Info,
    Edit3, Download, Upload, FileDown, FileUp,
    Activity,
    AlignLeft,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Modal } from '../components/UI/Modal';
import { Button } from '../components/UI/Button';
import { Input, Select, TextArea, Combobox } from '../components/UI/Input';

const recurrenceOptions = [
    { label: 'Não Repete', freq: '', interval: 1, count: 1 },
    { label: 'Semanal (Total 4 sessões)', freq: 'WEEKLY', interval: 1, count: 4 },
    { label: 'Semanal (Total 8 sessões)', freq: 'WEEKLY', interval: 1, count: 8 },
    { label: 'Semanal (Total 12 sessões)', freq: 'WEEKLY', interval: 1, count: 12 },
    { label: 'Quinzenal (Total 2 sessões)', freq: 'DAILY', interval: 15, count: 2 },
    { label: 'Quinzenal (Total 4 sessões)', freq: 'DAILY', interval: 15, count: 4 },
    { label: 'Mensal (Total 3 sessões)', freq: 'MONTHLY', interval: 1, count: 3 },
    { label: 'Mensal (Total 6 sessões)', freq: 'MONTHLY', interval: 1, count: 6 },
    { label: 'Personalizado...', freq: 'CUSTOM', interval: 1, count: 1 },
];

export const Agenda: React.FC = () => {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
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
  const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState(false);
  const [isRecurrenceConfigOpen, setIsRecurrenceConfigOpen] = useState(false);
  const [tempRecurrence, setTempRecurrence] = useState({
      freq: '',
      interval: 1,
      endType: 'count' as 'count' | 'until',
      endValue: 1 as number | string
  });
  const [patientComandas, setPatientComandas] = useState<any[]>([]);
  const [isNewComandaModalOpen, setIsNewComandaModalOpen] = useState(false);
  const [newComandaData, setNewComandaData] = useState({
      type: 'normal' as 'normal' | 'package',
      description: '',
      date: new Date().toISOString().slice(0, 10),
      value: '',
      sessions: 1
  });

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
      is_all_day: false,
      reschedule_reason: '',
      comanda_id: ''
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
          label: 'Feriado/Bloqueio', 
          chip: 'bg-slate-900 text-white border-slate-800 shadow-xl', 
          solid: 'bg-slate-900', 
          dot: 'bg-slate-900', 
          event: 'bg-slate-900/95 text-white border-none shadow-2xl backdrop-blur-sm ring-1 ring-white/10' 
      },
  } as const;

  const statusMeta = {
      scheduled: { label: 'Agendado', chip: 'bg-slate-100/50 text-slate-500 border-slate-200/30', dot: 'bg-slate-400' },
      confirmed: { label: 'Confirmado', chip: 'bg-emerald-50/50 text-emerald-700 border-emerald-100/50', dot: 'bg-emerald-500' },
      completed: { label: 'Realizado', chip: 'bg-indigo-50/50 text-indigo-700 border-indigo-100/50', dot: 'bg-indigo-500' },
      cancelled: { label: 'Cancelado', chip: 'bg-rose-50/50 text-rose-700 border-rose-100/50', dot: 'bg-rose-500' },
      'no-show': { label: 'Faltou', chip: 'bg-amber-50/50 text-amber-700 border-amber-100/50', dot: 'bg-amber-500' },
  } as const;

  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();
  const addDays = (date: Date, days: number) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
  const startOfWeek = (date: Date) => { const d = startOfDay(date); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return d; };
  const endOfWeek = (date: Date) => addDays(startOfWeek(date), 6);
  const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);
  };

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
        const [apts, pts, srvs, pkgs, pros] = await Promise.all([
            api.get<any[]>('/appointments'),
            api.get<any[]>('/patients'),
            api.get<Service[]>('/services'),
            api.get<any[]>('/packages'),
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
        setPackages(pkgs || []);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    const fetchComandas = async () => {
        if (!formData.patient_id || isNaN(parseInt(formData.patient_id))) {
            setPatientComandas([]);
            return;
        }
        try {
            const data = await api.get<any[]>(`/finance/comandas/patient/${formData.patient_id}`);
            setPatientComandas(data || []);
        } catch (err) {
            console.error('Erro ao buscar comandas:', err);
            setPatientComandas([]);
        }
    };
    fetchComandas();
  }, [formData.patient_id]);

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
        recurrence_enabled: false,
        reschedule_reason: '',
        comanda_id: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (apt: Appointment) => {
    setFormData({
        ...apt,
        appointment_date: toLocalISO(apt.start),
        psychologist_id: apt.professional_id || apt.psychologist_id,
        reschedule_reason: apt.reschedule_reason || '',
        comanda_id: apt.comanda_id || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
        const isPackage = String(formData.service_id).startsWith('pkg_');
        const cleanServiceId = isPackage ? formData.service_id.replace('pkg_', '') : formData.service_id;

        const payload = {
            ...formData,
            start_time: formData.appointment_date,
            professional_id: formData.psychologist_id || formData.professional_id,
            service_id: isPackage ? null : cleanServiceId,
            package_id: isPackage ? cleanServiceId : null
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

        // NOVO FLOW: Informa que a comanda foi gerada mas não redireciona (conforme pedido: "por debaixo dos panos")
        if (savedAppointment.comanda_id) {
            pushToast('success', 'Agendamento e Comanda gerada com sucesso!');
            fetchData();
            setIsModalOpen(false);
            return;
        }

        fetchData();
        setIsModalOpen(false);
        pushToast('success', 'Agenda atualizada com sucesso.');
    } catch (e: any) {
        pushToast('error', 'Erro ao salvar agendamento.');
    }
  };

  const handleCreateComanda = async () => {
    if (!formData.patient_id) {
        pushToast('error', 'Selecione um paciente primeiro.');
        return;
    }
    try {
        const payload = {
            patient_id: formData.patient_id,
            professional_id: formData.psychologist_id || formData.professional_id,
            description: newComandaData.description || (newComandaData.type === 'package' ? 'Pacote de Sessões' : 'Sessão Avulsa'),
            status: 'open',
            items: [{
                name: newComandaData.description || 'Sessão',
                price: parseFloat(newComandaData.value) || 0,
                qty: newComandaData.type === 'package' ? newComandaData.sessions : 1,
                value: parseFloat(newComandaData.value) || 0
            }],
            sessions_total: newComandaData.type === 'package' ? newComandaData.sessions : 1,
            sessions_used: 0,
            notes: 'Criado via Agenda'
        };

        const result = await api.post<any>('/finance/comandas', payload);
        setPatientComandas(prev => [result, ...prev]);
        setFormData(prev => ({ ...prev, comanda_id: result.id }));
        setIsNewComandaModalOpen(false);
        pushToast('success', 'Comanda criada e vinculada!');
    } catch (err) {
        console.error(err);
        pushToast('error', 'Erro ao criar comanda.');
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
          <div className="flex items-center gap-2">
              <button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="bg-white hover:bg-slate-50 text-slate-600 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-all active:scale-95 shadow-sm"
              >
                  <Upload size={14} className="text-indigo-500" /> Importar
              </button>
              <button 
                  onClick={handleExport}
                  className="bg-white hover:bg-slate-50 text-slate-600 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-all active:scale-95 shadow-sm"
              >
                  <Download size={14} className="text-emerald-500" /> Exportar
              </button>
              <button 
                  onClick={() => openNewModal()} 
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-100 transition-all active:scale-95"
              >
                  <Plus size={14} /> Novo Agendamento
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
      <div className="bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center">
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
                                        const st = statusMeta[apt.status as keyof typeof statusMeta || 'scheduled'];

                                        return (
                                            <button 
                                                key={apt.id} 
                                                onClick={(e) => { e.stopPropagation(); openEditModal(apt); }} 
                                                className={`absolute left-2 right-2 rounded-[1.25rem] p-4 border shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all overflow-hidden text-left group z-10 flex flex-col gap-2 ${typeMeta[apt.type].event} glass-effect`} 
                                                style={{ top: top + 4, height: Math.max(height - 8, 40) }}
                                            >
                                                <div className="flex flex-col h-full relative z-10">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div className="flex flex-col flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                                                 {apt.type === 'bloqueio' ? (
                                                                     <span className="text-[10px] font-black text-white leading-none flex items-center gap-1.5 uppercase tracking-tighter">
                                                                        <Ban size={10} className="text-white/50" /> {apt.title || 'Agenda Bloqueada'}
                                                                     </span>
                                                                 ) : (
                                                                     <span className="text-[10px] font-black text-slate-800 leading-none truncate">
                                                                        {apt.patient_name || apt.title || (apt.type === 'pessoal' ? 'Evento Pessoal' : 'Consulta')}
                                                                     </span>
                                                                 )}
                                                                 {st && apt.type === 'consulta' && (
                                                                     <div className={`w-1.5 h-1.5 rounded-full ${st.dot} animate-pulse`}></div>
                                                                 )}
                                                             </div>
                                                             {apt.professional_name && (
                                                                 <span className={`text-[8px] font-bold truncate mb-1.5 opacity-80 uppercase tracking-widest flex items-center gap-1 ${apt.type === 'bloqueio' ? 'text-white/60' : 'text-slate-400'}`}>
                                                                     <UserIcon size={8} className={apt.type === 'bloqueio' ? 'text-white/40' : 'text-indigo-400'}/> {apt.professional_name}
                                                                 </span>
                                                             )}
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-[8px] font-black opacity-50 uppercase tracking-widest tabular-nums flex items-center gap-1 bg-white/50 px-1.5 py-0.5 rounded-md">
                                                                    <Clock size={8}/> {apt.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                {apt.modality === 'online' && (
                                                                    <div className="flex items-center gap-1 text-indigo-500 font-black text-[7px] uppercase tracking-tighter bg-indigo-100/50 px-1.5 py-0.5 rounded-md border border-indigo-200/50">
                                                                        <Video size={8}/> Online
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="p-1.5 bg-white/50 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm border border-white/50">
                                                            <ArrowUpRight size={12}/>
                                                        </div>
                                                    </div>
                                                    
                                                    {height > 60 && (
                                                        <div className="mt-auto flex items-center justify-between">
                                                            <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border border-current opacity-60`}>
                                                                {statusMeta[apt.status || 'scheduled'].label}
                                                            </div>
                                                            <div className="h-6 w-6 rounded-lg overflow-hidden border-2 border-white shadow-md ring-1 ring-slate-100 group-hover:rotate-12 transition-transform">
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
                                                <div className={`absolute -right-4 -bottom-4 w-20 h-20 opacity-[0.03] rounded-full pointer-events-none group-hover:opacity-10 transition-opacity ${typeMeta[apt.type].solid} blur-xl`}></div>
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
          maxWidth="max-w-4xl"
          footer={
            <div className="flex flex-col sm:flex-row w-full justify-between items-center gap-4">
              {formData.id ? (
                <Button 
                  variant="danger" 
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="h-10 w-full sm:w-10 p-0 rounded-lg shadow-sm flex items-center justify-center"
                >
                  <Trash2 size={18}/>
                  <span className="sm:hidden ml-2 text-xs font-semibold">Excluir Agendamento</span>
                </Button>
              ) : <div className="hidden sm:block" />}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-xs font-semibold h-10 px-6 rounded-lg">
                  Descartar
                </Button>
                <Button 
                  onClick={handleSave} 
                  className="px-6 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm text-xs font-semibold transition-all transform active:scale-95 w-full sm:w-auto"
                >
                  <CheckCircle2 size={16} className="mr-2" />
                  {formData.id ? 'Atualizar' : 'Confirmar'} Agendamento
                </Button>
              </div>
            </div>
          }
      >
          <div className="space-y-8 py-2">
              {/* TYPE SELECTOR */}
              <div className="bg-slate-50 p-1.5 rounded-xl flex flex-col sm:flex-row border border-slate-200/50 shadow-sm gap-1">
                   {[
                       { id: 'consulta', label: 'Consulta', icon: <Briefcase size={14}/>, color: 'text-indigo-600 bg-white shadow-sm border-indigo-100' },
                       { id: 'pessoal', label: 'Evento Pessoal', icon: <UserIcon size={14}/>, color: 'text-amber-500 bg-white shadow-sm border-amber-100' },
                       { id: 'bloqueio', label: 'Bloqueio Agenda', icon: <Ban size={14}/>, color: 'text-slate-900 bg-white shadow-sm border-slate-300' }
                   ].map(t => (
                       <button 
                         key={t.id} 
                         type="button"
                         onClick={() => setFormData({...formData, type: t.id})} 
                         className={`flex-1 py-1.5 px-4 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 border border-transparent ${formData.type === t.id ? t.color : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/30'}`}
                       >
                           {t.icon}
                           {t.label}
                       </button>
                   ))}
               </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* LEFT COLUMN: IDENTIFICATION */}
                  <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Identificação</h4>
                      </div>

                      {formData.type === 'consulta' ? (
                        <>
                          <div className="space-y-2">
                              {/* PAZIENTE COMBOBOX */}
                              <Combobox 
                                label="Paciente" 
                                options={patients.map(p => ({ id: p.id, label: p.full_name }))}
                                value={formData.patient_id || ''} 
                                icon={<UserIcon size={18} className="text-indigo-400" />}
                                placeholder="Pesquisar ou adicionar paciente..."
                                allowCustom={true}
                                onChange={(val) => setFormData({...formData, patient_id: val})}
                              />
                          </div>

                          {/* COMANDA LINKAGE SECTION */}
                          {formData.patient_id && !isNaN(parseInt(formData.patient_id)) && (
                            <div className="animate-fadeIn">
                                {formData.comanda_id ? (
                                    <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg shadow-sm border border-indigo-200 text-indigo-500">
                                                <DollarSign size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Comanda Vinculada</p>
                                                <p className="text-xs font-bold text-slate-700">
                                                    {patientComandas.find(c => c.id === formData.comanda_id)?.description || 'Carregando...'}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({...formData, comanda_id: ''})}
                                            className="text-[10px] font-bold text-indigo-400 hover:text-rose-500 uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100 mr-2"
                                        >
                                            Remover Comanda
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {patientComandas.length > 0 ? (
                                            <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200/50">
                                                <div className="flex items-center gap-2 mb-3 text-orange-600">
                                                    <Info size={14} />
                                                    <p className="text-[10px] font-bold uppercase tracking-wider">Comanda aberta disponível. Vincule abaixo:</p>
                                                </div>
                                                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {patientComandas.map(c => (
                                                        <button 
                                                            key={c.id}
                                                            type="button"
                                                            onClick={() => setFormData({...formData, comanda_id: c.id})}
                                                            className="w-full flex items-center justify-between p-2.5 bg-white hover:bg-orange-50 border border-slate-100 hover:border-orange-200 rounded-lg transition-all group shadow-sm"
                                                        >
                                                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide group-hover:text-orange-600 transition-colors">{c.description}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-medium text-slate-400">{c.sessions_used}/{c.sessions_total} sessões</span>
                                                                <ChevronRight size={14} className="text-orange-400 group-hover:translate-x-0.5 transition-transform" />
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => setIsNewComandaModalOpen(true)}
                                                    className="w-full mt-3 py-2 border border-orange-200 rounded-lg text-[10px] font-bold text-orange-600 hover:bg-orange-100/50 transition-all uppercase tracking-widest"
                                                >
                                                    CRIAR NOVA COMANDA
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end">
                                                <button 
                                                    type="button"
                                                    onClick={() => setIsNewComandaModalOpen(true)}
                                                    className="px-3 py-1.5 border border-orange-200 rounded-lg text-[10px] font-bold text-orange-600 hover:bg-orange-50 transition-all uppercase tracking-wider shadow-sm"
                                                >
                                                    NOVA COMANDA
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                          )}

                          <div className="space-y-2 pt-2">
                               <Select 
                                 label="Serviço ou Pacote" 
                                 icon={<Package size={18} className="text-emerald-400" />}
                                 value={formData.service_id || ''} 
                                 onChange={e => {
                                   const val = e.target.value;
                                   const isPkg = val.startsWith('pkg_');
                                   const id = isPkg ? val.replace('pkg_', '') : val;
                                   
                                   let duration = formData.duration_minutes;
                                   if (isPkg) {
                                       const pkg = packages.find(p => String(p.id) === id);
                                       const firstItem = pkg?.items?.[0];
                                       if (firstItem) {
                                           const srvObj = services.find(s => String(s.id) === String(isPkg ? firstItem.serviceId : id));
                                           if (srvObj) duration = srvObj.duration;
                                       }
                                   } else {
                                       const srv = services.find(s => String(s.id) === id);
                                       if (srv) duration = srv.duration;
                                   }

                                   setFormData({...formData, service_id: val, duration_minutes: duration});
                                 }}
                               >
                                   <option value="">Selecionar...</option>
                                   <optgroup label="Serviços Individuais">
                                     {services.map(s => <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.price)}</option>)}
                                   </optgroup>
                                   <optgroup label="Pacotes">
                                     {packages.map(p => <option key={`pkg_${p.id}`} value={`pkg_${p.id}`}>{p.name} - {formatCurrency(p.totalPrice)} ({p.items?.length || 0} itens)</option>)}
                                   </optgroup>
                               </Select>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2">
                            <Input 
                              label="Título do Evento / Motivo do Bloqueio" 
                              placeholder="Ex: Supervisão Clínica ou Almoço" 
                              icon={<Activity size={18} className="text-amber-400" />}
                              value={formData.title || ''} 
                              onChange={e => setFormData({...formData, title: e.target.value})}
                            />
                        </div>
                      )}

                      {formData.type === 'consulta' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Modalidade</label>
                                <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200/60">
                                    <button 
                                      type="button"
                                      onClick={() => setFormData({...formData, modality: 'presencial'})} 
                                      className={`flex-1 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all ${formData.modality === 'presencial' ? 'bg-white shadow-sm text-indigo-600 border border-indigo-100' : 'text-slate-400 border border-transparent'}`}
                                    >
                                      Presencial
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => setFormData({...formData, modality: 'online'})} 
                                      className={`flex-1 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all ${formData.modality === 'online' ? 'bg-white shadow-sm text-indigo-600 border border-indigo-100' : 'text-slate-400 border border-transparent'}`}
                                    >
                                      Online
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Select 
                                  label="Status" 
                                  value={formData.status} 
                                  onChange={e => setFormData({...formData, status: e.target.value})}
                                >
                                    {Object.entries(statusMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </Select>
                            </div>
                        </div>
                       )}
                  </div>

                  {/* RIGHT COLUMN: TIME & RECURRENCE */}
                  <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Horário e Repetição</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Input 
                          label="Data" 
                          type="date" 
                          icon={<CalendarDays size={16} className="text-slate-400" />}
                          value={formData.appointment_date.slice(0, 10)} 
                          onChange={e => setFormData({...formData, appointment_date: `${e.target.value}T${formData.appointment_date.slice(11, 16)}`})}
                        />
                        <Input 
                          label="Hora" 
                          type="time" 
                          icon={<Clock size={16} className="text-slate-400" />}
                          value={formData.appointment_date.slice(11, 16)} 
                          onChange={e => setFormData({...formData, appointment_date: `${formData.appointment_date.slice(0, 10)}T${e.target.value}`})}
                        />
                        <Input 
                          label="Duração (min)" 
                          type="number" 
                          icon={<Layers size={16} className="text-slate-400" />}
                          value={formData.duration_minutes} 
                          onChange={e => setFormData({...formData, duration_minutes: Number(e.target.value)})}
                        />
                      </div>
                      
                      {/* END TIME PREVIEW */}
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 shadow-sm">
                          <div className="p-2 bg-white rounded-lg text-indigo-500 border border-slate-100 shadow-sm">
                              <Clock size={16}/>
                          </div>
                          <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Término Previsto</p>
                              <p className="text-sm font-black text-indigo-700 tabular-nums">
                                  {(() => {
                                      try {
                                          const start = new Date(formData.appointment_date);
                                          const end = new Date(start.getTime() + formData.duration_minutes * 60000);
                                          return end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 'h';
                                      } catch { return '--:--'; }
                                  })()}
                              </p>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                          <Combobox 
                            label="Profissional Responsável" 
                            options={professionals.map(p => ({ id: p.id, label: p.name }))}
                            value={formData.psychologist_id || formData.professional_id || ''} 
                            icon={<UserCheck size={18} className="text-indigo-400" />}
                            placeholder="Buscar..."
                            allowCustom={true}
                            onChange={(val) => setFormData({...formData, psychologist_id: val, professional_id: val})}
                          />
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                  <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200 text-indigo-500">
                                      <Repeat size={14} />
                                  </div>
                                  <div>
                                      <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider leading-none mb-1">Repetição Fixa</p>
                                      <p className="text-[10px] font-medium text-slate-400">Marque sessões recorrentes</p>
                                  </div>
                              </div>
                              <button 
                                type="button"
                                onClick={() => setIsRecurrenceModalOpen(true)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-indigo-600 uppercase text-[10px] hover:bg-slate-100 transition-all shadow-sm group/btn"
                              >
                                {formData.recurrence_rule ? (
                                    <>
                                        {recurrenceOptions.find(o => o.freq === formData.recurrence_freq && o.interval === formData.recurrence_interval)?.label || 'Personalizado'}
                                        <div className="w-1 h-3 bg-indigo-200 rounded-full mx-1"></div>
                                        {formData.recurrence_count ? `${formData.recurrence_count}x` : formData.recurrence_end_date ? 'Até data' : ''}
                                    </>
                                ) : 'Não Repete'}
                                <ChevronRight size={10} className="group-hover/btn:translate-x-0.5 transition-transform" />
                              </button>
                          </div>
                      </div>
                  </div>
              </div>

              {formData.type === 'consulta' && formData.modality === 'online' && (
                  <div className="bg-slate-900 p-5 rounded-3xl text-white animate-slideIn flex items-center gap-5 shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-white/10 shadow-inner">
                          <Video size={24}/>
                      </div>
                      <div className="flex-1">
                          <label className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-1.5 block">Link da Sala Virtual</label>
                          <input 
                            placeholder="Link do Google Meet, Zoom ou Internal Room..." 
                            value={formData.meeting_url || ''} 
                            onChange={e => setFormData({...formData, meeting_url: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white placeholder:text-slate-500 outline-none focus:bg-white/10 focus:border-indigo-500 transition-all"
                          />
                      </div>
                  </div>
              )}
              
              <div className="space-y-3">
                  <div className="flex items-center gap-2 ml-1">
                      <div className="w-1.5 h-4 bg-slate-400 rounded-full"></div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Observações e Histórico</h4>
                  </div>
                  <TextArea 
                    placeholder="Adicione detalhes sobre o atendimento, queixas iniciais ou avisos importantes..." 
                    value={formData.notes || ''} 
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="min-h-[100px] !rounded-xl border-slate-200 shadow-sm"
                  />
              </div>

              {formData.id && (
                <div className="bg-amber-50/30 p-5 rounded-3xl border border-dashed border-amber-200/50 flex flex-col gap-3">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">Motivo da Alteração / Reagendamento</p>
                    <TextArea 
                        placeholder="Por que este atendimento foi alterado? (Opcional)" 
                        value={formData.reschedule_reason || ''} 
                        onChange={e => setFormData({...formData, reschedule_reason: e.target.value})}
                        className="!bg-transparent !border-none !p-0 min-h-[60px] text-amber-700 placeholder:text-amber-300"
                    />
                </div>
              )}
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
           <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl border border-white/20 transform animate-bounceIn">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-100 shadow-lg shadow-rose-500/10">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Remover Atendimento?</h3>
              <p className="text-[12px] font-bold text-slate-400 mb-8 leading-relaxed">Deseja remover este compromisso permanentemente? Esta ação não pode ser desfeita.</p>
              <div className="flex flex-col gap-3">
                 <button onClick={async () => { await api.delete(`/appointments/${formData.id}`); fetchData(); setIsModalOpen(false); setIsDeleteModalOpen(false); pushToast('success', 'Agendamento removido.'); }} className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 transition-all active:scale-95">REMOVER SESSÃO</button>
                 <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-3 text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest transition-all">MANTER NA AGENDA</button>
              </div>
           </div>
        </div>
      )}
      {/* RECURRENCE SELECTION MODAL */}
      <Modal 
        isOpen={isRecurrenceModalOpen} 
        onClose={() => setIsRecurrenceModalOpen(false)}
        title="Seleção Atual"
        subtitle="Escolha uma opção abaixo para mudar a seleção"
        maxWidth="md"
      >
        <div className="space-y-1">
            <div className="flex items-center gap-3 p-4 mb-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <div className="p-2 bg-white rounded-lg text-indigo-500 shadow-sm border border-indigo-200">
                    <Repeat size={18} />
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Opção Atual</p>
                    <p className="font-bold text-indigo-900">
                        {formData.recurrence_rule ? (
                            recurrenceOptions.find(o => o.freq === formData.recurrence_freq && o.interval === formData.recurrence_interval)?.label || 'Personalizado'
                        ) : 'Não Repete'}
                    </p>
                </div>
            </div>

            <p className="text-[10px] font-bold text-indigo-500 mb-4 px-2 italic leading-relaxed">
               Dica: Escolha repetição semanal caso queira que sempre caia no mesmo dia da semana
            </p>

            <div className="max-h-[350px] overflow-y-auto pr-2 space-y-1 custom-scrollbar">
                {recurrenceOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                          if (opt.freq === 'CUSTOM') {
                              setTempRecurrence({
                                  freq: 'WEEKLY',
                                  interval: 1,
                                  endType: 'count',
                                  endValue: 4
                              });
                              setIsRecurrenceModalOpen(false);
                              setIsRecurrenceConfigOpen(true);
                          } else if (opt.freq) {
                              setFormData({
                                  ...formData,
                                  recurrence_rule: 'custom',
                                  recurrence_freq: opt.freq,
                                  recurrence_interval: opt.interval,
                                  recurrence_count: (opt as any).count || 1,
                                  recurrence_end_date: ''
                              });
                              setIsRecurrenceModalOpen(false);
                          } else {
                              setFormData({
                                  ...formData,
                                  recurrence_rule: null,
                                  recurrence_freq: '',
                                  recurrence_interval: 1,
                                  recurrence_count: '',
                                  recurrence_end_date: ''
                              });
                              setIsRecurrenceModalOpen(false);
                          }
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
                    >
                        <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{opt.label}</span>
                        <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-all" />
                    </button>
                ))}
            </div>
        </div>
      </Modal>

      {/* RECURRENCE CONFIG MODAL */}
      <Modal
        isOpen={isRecurrenceConfigOpen}
        onClose={() => setIsRecurrenceConfigOpen(false)}
        title="Configurar Repetição"
        subtitle="Defina como este agendamento irá se repetir"
        maxWidth="max-w-md"
        footer={(
            <div className="flex justify-end gap-2 w-full sm:w-auto">
                <Button variant="ghost" onClick={() => { setIsRecurrenceConfigOpen(false); setIsRecurrenceModalOpen(true); }} className="text-xs font-semibold h-10 px-6">VOLTAR</Button>
                <Button 
                    variant="primary" 
                    className="!bg-indigo-600 hover:!bg-indigo-700 !text-white h-10 px-8 text-xs font-semibold rounded-lg"
                    onClick={() => {
                        setFormData({
                            ...formData,
                            recurrence_rule: 'custom',
                            recurrence_freq: tempRecurrence.freq,
                            recurrence_interval: tempRecurrence.interval,
                            recurrence_count: tempRecurrence.endType === 'count' ? tempRecurrence.endValue : '',
                            recurrence_end_date: tempRecurrence.endType === 'until' ? tempRecurrence.endValue : ''
                        });
                        setIsRecurrenceConfigOpen(false);
                    }}
                >
                    SALVAR
                </Button>
            </div>
        )}
      >
          <div className="space-y-6 py-2">
              <Select 
                label="Repetir frequência" 
                value={tempRecurrence.freq} 
                onChange={e => setTempRecurrence({...tempRecurrence, freq: e.target.value})}
              >
                  <option value="DAILY">Diariamente</option>
                  <option value="WEEKLY">Semanalmente</option>
                  <option value="MONTHLY">Mensalmente</option>
                  <option value="YEARLY">Anualmente</option>
              </Select>

              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="A cada"
                  type="number"
                  value={tempRecurrence.interval}
                  onChange={e => setTempRecurrence({...tempRecurrence, interval: parseInt(e.target.value) || 1})}
                />
                <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Unidade</label>
                    <div className="flex items-center h-10 px-4 bg-slate-50 border border-slate-200/60 rounded-lg text-sm font-semibold text-slate-500">
                        {tempRecurrence.freq === 'DAILY' ? 'Dia(s)' : tempRecurrence.freq === 'WEEKLY' ? 'Semana(s)' : tempRecurrence.freq === 'MONTHLY' ? 'Mês(es)' : 'Ano(s)'}
                    </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Terminar em</label>
                  <div className="flex gap-3">
                      <button 
                          type="button"
                          onClick={() => setTempRecurrence({...tempRecurrence, endType: 'count'})}
                          className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${tempRecurrence.endType === 'count' ? 'border-indigo-600 bg-indigo-50/30 text-indigo-600' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                      >
                          <span className="text-[10px] font-bold uppercase">Por vezes</span>
                          <div className="flex items-center gap-2">
                            <input 
                                className="w-10 bg-white border border-slate-200 rounded px-1 text-center font-bold text-slate-700 outline-none"
                                value={tempRecurrence.endType === 'count' ? tempRecurrence.endValue : ''}
                                onChange={e => setTempRecurrence({...tempRecurrence, endValue: parseInt(e.target.value) || 1, endType: 'count'})}
                                disabled={tempRecurrence.endType !== 'count'}
                            />
                            <span className="text-[10px] font-medium opacity-60">vezes</span>
                          </div>
                      </button>

                      <button 
                          type="button"
                          onClick={() => setTempRecurrence({...tempRecurrence, endType: 'until'})}
                          className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${tempRecurrence.endType === 'until' ? 'border-indigo-600 bg-indigo-50/30 text-indigo-600' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                      >
                          <span className="text-[10px] font-bold uppercase">Por Data</span>
                          <input 
                            type="date"
                            className="bg-transparent text-[10px] font-bold outline-none uppercase"
                            value={tempRecurrence.endType === 'until' ? String(tempRecurrence.endValue) : ''}
                            onChange={e => setTempRecurrence({...tempRecurrence, endValue: e.target.value, endType: 'until'})}
                            disabled={tempRecurrence.endType !== 'until'}
                          />
                      </button>
                  </div>
              </div>
          </div>
      </Modal>


      {/* CREATE COMANDA MODAL */}
      <Modal
        isOpen={isNewComandaModalOpen}
        onClose={() => setIsNewComandaModalOpen(false)}
        title="Nova Comanda"
        subtitle="Crie uma nova comanda financeira para o paciente"
        maxWidth="max-w-md"
        footer={(
            <div className="flex gap-2 w-full">
                <Button variant="ghost" onClick={() => setIsNewComandaModalOpen(false)} className="flex-1 h-10 text-xs font-semibold">Fechar</Button>
                <Button 
                    onClick={handleCreateComanda}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-10 text-xs font-semibold shadow-sm"
                >
                    Criar Comanda
                </Button>
            </div>
        )}
      >
        <div className="space-y-4 py-1">
            <div className="bg-slate-50 p-1 rounded-xl flex border border-slate-200/60 shadow-sm gap-1">
                <button 
                    onClick={() => setNewComandaData({...newComandaData, type: 'normal'})}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-2 ${newComandaData.type === 'normal' ? 'bg-white shadow-sm text-indigo-600 border border-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <div className={`w-2.5 h-2.5 rounded-full border-2 ${newComandaData.type === 'normal' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`} />
                    COMANDA NORMAL
                </button>
                <button 
                    onClick={() => setNewComandaData({...newComandaData, type: 'package'})}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-2 ${newComandaData.type === 'package' ? 'bg-white shadow-sm text-indigo-600 border border-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <div className={`w-2.5 h-2.5 rounded-full border-2 ${newComandaData.type === 'package' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`} />
                    COMANDA PACOTE
                </button>
            </div>

            <div className="space-y-3 pt-2">
                <Input 
                    label="Descrição" 
                    placeholder="Ex: Psicoterapia Individual ou Pacote 4 sessões" 
                    value={newComandaData.description}
                    onChange={e => setNewComandaData({...newComandaData, description: e.target.value})}
                />

                <Input 
                    label="Data" 
                    type="date"
                    value={newComandaData.date}
                    onChange={e => setNewComandaData({...newComandaData, date: e.target.value})}
                />

                <Input 
                    label="Valor Total" 
                    type="number"
                    placeholder="R$ 0,00"
                    icon={<DollarSign size={16} className="text-emerald-500" />}
                    value={newComandaData.value}
                    onChange={e => setNewComandaData({...newComandaData, value: e.target.value})}
                />

                {newComandaData.type === 'package' && (
                    <Input 
                        label="Sessões Permitidas" 
                        type="number"
                        placeholder="Ex: 4"
                        value={newComandaData.sessions}
                        onChange={e => setNewComandaData({...newComandaData, sessions: parseInt(e.target.value) || 1})}
                    />
                )}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col gap-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Valor Total:</span>
                    <span className="text-slate-700">{formatCurrency(Number(newComandaData.value) || 0)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Total Líquido:</span>
                    <span className="text-indigo-600 text-lg font-bold">{formatCurrency(Number(newComandaData.value) || 0)}</span>
                </div>
            </div>
        </div>
      </Modal>

    </div>
  );
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};
