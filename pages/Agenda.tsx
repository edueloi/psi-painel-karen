
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Appointment, Service, Patient, User } from '../types';
import { 
    ChevronLeft, ChevronRight, Clock, Plus, Video, MapPin, 
    Calendar as CalendarIcon, CalendarDays, CalendarRange, X, Check, Repeat, Trash2, User as UserIcon, 
    DollarSign, Package, Layers, Loader2, Briefcase, FileText, UserCheck, Ban, Link2
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
  const startHour = 0;
  const endHour = 23;
  const hourHeight = 56;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  const typeMeta = {
      consulta: { label: 'Consulta', chip: 'bg-indigo-50 text-indigo-700 border-indigo-100', solid: 'bg-indigo-600', dot: 'bg-indigo-500', event: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      pessoal: { label: 'Pessoal', chip: 'bg-amber-50 text-amber-700 border-amber-100', solid: 'bg-amber-500', dot: 'bg-amber-500', event: 'bg-amber-50 text-amber-700 border-amber-200' },
      bloqueio: { label: 'Bloqueio', chip: 'bg-slate-100 text-slate-600 border-slate-200', solid: 'bg-slate-500', dot: 'bg-slate-500', event: 'bg-slate-100 text-slate-600 border-slate-200' },
  } as const;
  const statusMeta = {
      scheduled: { label: 'Agendado', chip: 'bg-slate-100 text-slate-600 border-slate-200' },
      confirmed: { label: 'Confirmado', chip: 'bg-blue-50 text-blue-700 border-blue-100' },
      completed: { label: 'Concluido', chip: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
      cancelled: { label: 'Cancelado', chip: 'bg-rose-50 text-rose-700 border-rose-100' },
      'no-show': { label: 'Faltou', chip: 'bg-amber-50 text-amber-700 border-amber-100' }
  } as const;

  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  const addDays = (date: Date, days: number) => {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d;
  };
  const startOfWeek = (date: Date) => {
      const d = startOfDay(date);
      const day = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - day);
      return d;
  };
  const endOfWeek = (date: Date) => addDays(startOfWeek(date), 6);
  const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const monthDays: Date[] = [];
  for (let d = new Date(calendarStart); d <= calendarEnd; d = addDays(d, 1)) {
      monthDays.push(new Date(d));
  }

  const filteredAppointments = useMemo(() => {
      let filtered = appointments;
      if (filterPatientId) {
          filtered = filtered.filter((a: any) => {
              const pid = String(a.patient_id ?? a.patientId ?? '');
              return pid && pid === String(filterPatientId);
          });
      }
      if (filterProfessionalId) {
          filtered = filtered.filter((a: any) => {
              const pid = String(a.psychologist_id ?? a.psychologistId ?? '');
              return pid && pid === String(filterProfessionalId);
          });
      }
      if (filterStatus) {
          filtered = filtered.filter((a: any) => (a.status || 'scheduled') === filterStatus);
      }
      return filtered;
  }, [appointments, filterPatientId, filterProfessionalId, filterStatus]);

  const getAppointmentsForDay = (date: Date) => filteredAppointments.filter(a => isSameDay(a.start, date));
  const getRangeLabel = () => {
      if (view === 'month') {
          return currentDate.toLocaleString(locale, { month: 'long', year: 'numeric' });
      }
      if (view === 'week') {
          const start = weekDays[0];
          const end = weekDays[6];
          const startLabel = start.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
          const endLabel = end.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
          return `${startLabel} - ${endLabel}`;
      }
      return currentDate.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };

  const handleNavigate = (direction: number) => {
      const d = new Date(currentDate);
      if (view === 'day') d.setDate(d.getDate() + direction);
      if (view === 'week') d.setDate(d.getDate() + direction * 7);
      if (view === 'month') d.setMonth(d.getMonth() + direction);
      setCurrentDate(d);
  };

  const visibleDays = view === 'day' ? [currentDate] : weekDays;
  const gridHeight = hours.length * hourHeight;
  const formatDateTimeInput = (date: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const parseRecurrenceRule = (value: any) => {
      if (!value) return null;
      if (typeof value === 'string') {
          try {
              return JSON.parse(value);
          } catch {
              return null;
          }
      }
      if (typeof value === 'object') return value;
      return null;
  };
  const getDisplayTitle = (apt: Appointment) => {
      if (apt.type === 'consulta') return apt.patient_name || apt.patient_name_text || apt.patientName || apt.title || typeMeta.consulta.label;
      return apt.title || typeMeta[apt.type].label;
  };
  const getBlockStyle = (apt: Appointment) => {
      const totalMinutes = hours.length * 60;
      const startMinutes = (apt.start.getHours() * 60 + apt.start.getMinutes()) - startHour * 60;
      const endMinutes = (apt.end.getHours() * 60 + apt.end.getMinutes()) - startHour * 60;
      const clampedStart = Math.max(0, startMinutes);
      const clampedEnd = Math.min(totalMinutes, Math.max(clampedStart + 30, endMinutes));
      return {
          top: (clampedStart / 60) * hourHeight,
          height: ((clampedEnd - clampedStart) / 60) * hourHeight
      };
  };
  const layoutDayEvents = (items: Appointment[]) => {
      const sorted = [...items].sort((a, b) => a.start.getTime() - b.start.getTime());
      const placed: Array<{ apt: Appointment; col: number }> = [];
      const active: Array<{ end: number; col: number }> = [];

      for (const apt of sorted) {
          const start = apt.start.getTime();
          active.sort((a, b) => a.end - b.end);
          while (active.length && active[0].end <= start) {
              active.shift();
          }
          const used = new Set(active.map(a => a.col));
          let col = 0;
          while (used.has(col)) col += 1;
          active.push({ end: apt.end.getTime(), col });
          placed.push({ apt, col });
      }

      return placed.map(({ apt, col }) => {
          const overlapCols = placed
              .filter(p => p.apt.start < apt.end && p.apt.end > apt.start)
              .map(p => p.col);
          const maxCol = overlapCols.length ? Math.max(...overlapCols) : col;
          const columns = maxCol + 1;
          const width = 100 / columns;
          return { apt, col, width, left: col * width };
      });
  };
  const getPatientById = (id?: string) => patients.find(p => String(p.id) === String(id));
  const getProfessionalById = (id?: string) => professionals.find(p => String(p.id) === String(id));
  const getServiceById = (id?: string) => services.find(s => String(s.id) === String(id));
  const pushToast = (type: 'success' | 'error', message: string) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts(prev => [...prev, { id, type, message }]);
      window.setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
      }, 3200);
  };
  const recurrenceWeekdays = [
      { value: 'MO', label: 'Seg' },
      { value: 'TU', label: 'Ter' },
      { value: 'WE', label: 'Qua' },
      { value: 'TH', label: 'Qui' },
      { value: 'FR', label: 'Sex' },
      { value: 'SA', label: 'Sab' },
      { value: 'SU', label: 'Dom' }
  ];

  const fetchData = async () => {
      setIsLoading(true);
      try {
          const [apts, pts, srvs, pros] = await Promise.all([
              api.get<any[]>('/appointments'),
              api.get<any[]>('/patients'),
              api.get<Service[]>('/services'),
              api.get<any[]>('/users') // Profissionais são usuários
          ]);
          
          setAppointments(apts.map(a => {
              const start = new Date(a.appointment_date);
              const end = new Date(start.getTime() + (a.duration_minutes || 50) * 60000);
              const type = a.type || 'consulta';
              const patientName = a.patient_name || a.patientName;
              const title = a.title || patientName || (type === 'bloqueio' ? 'Bloqueio' : type === 'pessoal' ? 'Pessoal' : 'Consulta');
              const recurrenceRule = parseRecurrenceRule(a.recurrence_rule);
              return {
                  ...a,
                  start,
                  end,
                  type,
                  title,
                  modality: a.modality || 'presencial',
                  status: a.status || 'scheduled',
                  meeting_url: a.meeting_url || '',
                  recurrence_rule: recurrenceRule,
                  recurrence_end_date: a.recurrence_end_date || null,
                  recurrence_count: a.recurrence_count ?? null,
                  parent_appointment_id: a.parent_appointment_id ?? null,
                  recurrence_index: a.recurrence_index ?? null
              };
          }));
          setPatients(pts);
          setProfessionals(pros.filter(p => p.role !== 'secretario'));
          setServices(srvs);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
      fetchData();
  }, []);

  useEffect(() => {
      const patientId = searchParams.get('patient_id');
      if (!patientId || hasPrefilled) return;
      setFormData((prev: any) => ({
          ...prev,
          type: 'consulta',
          patient_id: patientId
      }));
      setIsModalOpen(true);
      setHasPrefilled(true);
  }, [searchParams, hasPrefilled]);

  useEffect(() => {
      const patientId = searchParams.get('patient_id');
      setFilterPatientId(patientId ? String(patientId) : null);
  }, [searchParams]);

  const openNewModal = () => {
      setFormData({
          type: 'consulta',
          modality: 'presencial',
          appointment_date: formatDateTimeInput(new Date()),
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
      setApplyToSeries(false);
      setDeleteSeries(false);
      setIsModalOpen(true);
  };

  const openEditModal = (apt: Appointment) => {
      const rule = apt.recurrence_rule || null;
      setFormData({
          ...apt,
          type: apt.type || 'consulta',
          title: apt.title || '',
          appointment_date: formatDateTimeInput(apt.start),
          status: apt.status || 'scheduled',
          meeting_url: apt.meeting_url || '',
          patient_name_text: apt.patient_name_text || '',
          professional_name_text: apt.professional_name_text || '',
          recurrence_enabled: Boolean(rule),
          recurrence_freq: rule?.freq || '',
          recurrence_interval: rule?.interval || 1,
          recurrence_weekdays: rule?.byWeekday || [],
          recurrence_rule: rule,
          recurrence_end_date: apt.recurrence_end_date || '',
          recurrence_count: apt.recurrence_count ?? ''
      });
      setApplyToSeries(false);
      setDeleteSeries(false);
      setIsModalOpen(true);
  };

  const handleSave = async () => {
      try {
          const recurrenceRule = formData.recurrence_enabled && formData.recurrence_freq
              ? {
                  freq: formData.recurrence_freq,
                  interval: Number(formData.recurrence_interval) || 1,
                  byWeekday: formData.recurrence_freq === 'weekly' ? formData.recurrence_weekdays || [] : []
              }
              : null;
          const resolvedTitle = (formData.title || '').trim()
              || (formData.type === 'consulta'
                  ? (formData.patient_name_text || getPatientById(formData.patient_id)?.full_name || 'Consulta')
                  : (formData.type === 'pessoal' ? 'Pessoal' : 'Bloqueio'));
          const payload = {
              patient_id: formData.patient_id || null,
              patient_name_text: formData.patient_id ? null : (formData.patient_name_text || null),
              psychologist_id: formData.psychologist_id || null,
              professional_name_text: formData.psychologist_id ? null : (formData.professional_name_text || null),
              service_id: formData.type === 'consulta' ? formData.service_id || null : null,
              appointment_date: formData.appointment_date,
              duration_minutes: formData.duration_minutes,
              status: formData.status || 'scheduled',
              modality: formData.type === 'consulta' ? formData.modality : 'presencial',
              notes: formData.notes,
              type: formData.type,
              title: resolvedTitle,
              meeting_url: formData.meeting_url || null,
              recurrence_rule: recurrenceRule,
              recurrence_end_date: recurrenceRule ? (formData.recurrence_end_date || null) : null,
              recurrence_count: recurrenceRule ? (formData.recurrence_count ? Number(formData.recurrence_count) : null) : null
          };

          if (formData.id) {
              const updatePayload = {
                  ...payload,
                  ...(applyToSeries ? { apply_to_series: 'all' } : {})
              };
              await api.put(`/appointments/${formData.id}`, updatePayload);
          } else {
              await api.post('/appointments', payload);
          }
          const targetDate = new Date(formData.appointment_date);
          if (!Number.isNaN(targetDate.getTime())) {
              setCurrentDate(targetDate);
          }
          if (!payload.patient_id && filterPatientId) {
              setFilterPatientId(null);
          }
          if (!payload.psychologist_id && filterProfessionalId) {
              setFilterProfessionalId(null);
          }
          fetchData();
          setIsModalOpen(false);
          pushToast('success', 'Agendamento salvo com sucesso.');
      } catch (e: any) {
          pushToast('error', e.message || 'Erro ao salvar agendamento');
      }
  };

  const handleDelete = async () => {
      const suffix = deleteSeries ? '?delete_series=1' : '';
      await api.delete(`/appointments/${formData.id}${suffix}`);
      fetchData();
      setIsModalOpen(false);
      setIsDeleteModalOpen(false);
      pushToast('success', 'Agendamento removido.');
  };

  return (
      <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden font-sans animate-fadeIn relative">
          {toasts.length > 0 && (
              <div className="fixed top-6 right-6 z-[200] space-y-3">
                  {toasts.map(t => (
                      <div
                        key={t.id}
                        className={`px-4 py-3 rounded-2xl shadow-xl border text-sm font-bold ${t.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}
                      >
                          {t.message}
                      </div>
                  ))}
              </div>
          )}
          {isLoading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
                  <Loader2 className="animate-spin text-indigo-600 mb-2" size={40} />
                  <p className="text-xs font-bold text-indigo-600">Sincronizando Agenda...</p>
              </div>
          )}
          <div className="flex flex-col gap-4 p-6 border-b border-slate-100 bg-white z-20">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                      <h2 className="text-2xl font-display font-bold text-slate-800 capitalize">
                        {getRangeLabel()}
                      </h2>
                      <div className="flex bg-slate-100 rounded-xl p-1 shadow-inner border border-slate-200">
                          <button onClick={() => handleNavigate(-1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronLeft size={20}/></button>
                          <button onClick={() => setCurrentDate(new Date())} className="px-4 text-xs font-extrabold text-slate-700 uppercase">Hoje</button>
                          <button onClick={() => handleNavigate(1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronRight size={20}/></button>
                      </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                      <div className="flex bg-slate-100 rounded-xl p-1 shadow-inner border border-slate-200">
                          <button onClick={() => setView('day')} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${view === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                              <CalendarIcon size={16}/> Dia
                          </button>
                          <button onClick={() => setView('week')} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${view === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                              <CalendarRange size={16}/> Semana
                          </button>
                          <button onClick={() => setView('month')} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${view === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                              <CalendarDays size={16}/> Mes
                          </button>
                      </div>
                      <button onClick={openNewModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95">
                          <Plus size={20} /> Novo Atendimento
                      </button>
                  </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase text-slate-400">
                  <span className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${typeMeta.consulta.dot}`}></span> Consulta</span>
                  <span className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${typeMeta.pessoal.dot}`}></span> Pessoal/Particular</span>
                  <span className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${typeMeta.bloqueio.dot}`}></span> Bloqueio</span>
                  <span className="flex items-center gap-2"><Video size={12}/> Online</span>
                  <span className="flex items-center gap-2"><MapPin size={12}/> Presencial</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                  <select
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600"
                    value={filterPatientId || ''}
                    onChange={(e) => setFilterPatientId(e.target.value || null)}
                  >
                      <option value="">Todos os pacientes</option>
                      {patients.map(p => (
                          <option key={p.id} value={String(p.id)}>{p.full_name}</option>
                      ))}
                  </select>
                  <select
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600"
                    value={filterProfessionalId || ''}
                    onChange={(e) => setFilterProfessionalId(e.target.value || null)}
                  >
                      <option value="">Todos os profissionais</option>
                      {professionals.map(p => (
                          <option key={p.id} value={String(p.id)}>{p.name}</option>
                      ))}
                  </select>
                  <select
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600"
                    value={filterStatus || ''}
                    onChange={(e) => setFilterStatus(e.target.value || null)}
                  >
                      <option value="">Todos os status</option>
                      {Object.entries(statusMeta).map(([key, value]) => (
                          <option key={key} value={key}>{value.label}</option>
                      ))}
                  </select>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/30 relative p-4">
              <div className="max-w-6xl mx-auto space-y-6 pb-20">
                  {view === 'month' ? (
                      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                              {weekDays.map(day => (
                                  <div key={day.toISOString()} className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                      {day.toLocaleDateString(locale, { weekday: 'short' })}
                                  </div>
                              ))}
                          </div>
                          <div className="grid grid-cols-7">
                              {monthDays.map(day => {
                                  const dayAppointments = getAppointmentsForDay(day).sort((a, b) => a.start.getTime() - b.start.getTime());
                                  const isToday = isSameDay(day, new Date());
                                  const inMonth = day.getMonth() === currentDate.getMonth();
                                  return (
                                      <button
                                          type="button"
                                          key={day.toISOString()}
                                          onClick={() => { setCurrentDate(day); setView('day'); }}
                                          className={`min-h-[120px] p-3 border-b border-r border-slate-100 text-left hover:bg-slate-50/60 transition-colors ${inMonth ? 'bg-white' : 'bg-slate-50/40'}`}
                                      >
                                          <div className="flex items-center justify-between">
                                              <span className={`text-sm font-bold ${inMonth ? 'text-slate-800' : 'text-slate-400'}`}>{day.getDate()}</span>
                                              {isToday && <span className="text-[10px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-full">Hoje</span>}
                                          </div>
                                          <div className="mt-2 space-y-1">
                                              {dayAppointments.slice(0, 3).map(apt => (
                                                  <div key={apt.id} className={`text-[10px] font-bold px-2 py-1 rounded-md border ${typeMeta[apt.type].chip} truncate`}>
                                                      {apt.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {getDisplayTitle(apt)}
                                                      {apt.status && (
                                                          <span className={`ml-2 px-1.5 py-0.5 rounded-full border ${statusMeta[apt.status || 'scheduled'].chip}`}>
                                                              {statusMeta[apt.status || 'scheduled'].label}
                                                          </span>
                                                      )}
                                                  </div>
                                              ))}
                                              {dayAppointments.length > 3 && (
                                                  <div className="text-[10px] text-slate-400 font-bold">+{dayAppointments.length - 3} mais</div>
                                              )}
                                          </div>
                                      </button>
                                  );
                              })}
                          </div>
                      </div>
                  ) : (
                      <>
                          <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                              <div className="grid bg-slate-50 border-b border-slate-200" style={{ gridTemplateColumns: view === 'day' ? '72px minmax(0,1fr)' : '72px repeat(7, minmax(0,1fr))' }}>
                                  <div className="p-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Hora</div>
                                  {visibleDays.map(day => (
                                      <button
                                          type="button"
                                          key={day.toISOString()}
                                          onClick={() => { setCurrentDate(day); setView('day'); }}
                                          className={`p-3 text-left text-xs font-bold border-l border-slate-200 transition-colors ${isSameDay(day, new Date()) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                                      >
                                          <div className="text-[10px] uppercase tracking-widest">{day.toLocaleDateString(locale, { weekday: 'short' })}</div>
                                          <div className="text-sm">{day.toLocaleDateString(locale, { day: '2-digit', month: 'short' })}</div>
                                      </button>
                                  ))}
                              </div>
                              <div className="grid" style={{ gridTemplateColumns: view === 'day' ? '72px minmax(0,1fr)' : '72px repeat(7, minmax(0,1fr))' }}>
                                  <div className="bg-white">
                                      {hours.map(hour => (
                                          <div key={hour} className="h-[56px] pr-3 text-[10px] text-slate-400 flex items-start justify-end pt-2 border-b border-slate-100">
                                              {String(hour).padStart(2, '0')}:00
                                          </div>
                                      ))}
                                  </div>
                                  {visibleDays.map(day => {
                                      const dayAppointments = getAppointmentsForDay(day);
                                      const layout = layoutDayEvents(dayAppointments);
                                      return (
                                          <div key={day.toISOString()} className="relative border-l border-slate-100" style={{ height: gridHeight }}>
                                              {hours.map(hour => (
                                                  <div key={hour} className="h-[56px] border-b border-slate-100"></div>
                                              ))}
                                              {layout.map(({ apt, width, left }) => {
                                                  const blockStyle = getBlockStyle(apt);
                                                  return (
                                                      <button
                                                          type="button"
                                                          key={apt.id}
                                                          onClick={() => openEditModal(apt)}
                                                          style={{ top: blockStyle.top, height: blockStyle.height, left: `calc(${left}% + 6px)`, width: `calc(${width}% - 12px)` }}
                                                          className={`absolute rounded-lg px-2 py-1.5 text-left border-l-4 shadow-sm hover:shadow-md transition-all ${typeMeta[apt.type].event}`}
                                                      >
                                                          <div className="text-[10px] font-semibold uppercase opacity-80">
                                                              {apt.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {apt.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                          </div>
                                                          <div className="text-xs font-semibold truncate">{getDisplayTitle(apt)}</div>
                                                          <div className="text-[10px] opacity-80 flex items-center gap-2 flex-wrap">
                                                              <span>{apt.type === 'consulta' ? (apt.modality === 'online' ? 'Online' : 'Presencial') : typeMeta[apt.type].label}</span>
                                                              <span>- {apt.duration_minutes || 50} min</span>
                                                              {apt.recurrence_rule && (
                                                                  <span className="inline-flex items-center gap-1"><Repeat size={12}/> Recorrente</span>
                                                              )}
                                                          </div>
                                                          <div className="text-[10px] opacity-80 flex items-center gap-2 flex-wrap mt-1">
                                                              <span className={`px-2 py-0.5 rounded-full border ${statusMeta[apt.status || 'scheduled'].chip}`}>{statusMeta[apt.status || 'scheduled'].label}</span>
                                                              <span className="inline-flex items-center gap-1"><UserCheck size={12}/> {apt.psychologist_name || apt.psychologistName}</span>
                                                              {apt.service_name && (
                                                                  <span className="inline-flex items-center gap-1"><Briefcase size={12}/> {apt.service_name}</span>
                                                              )}
                                                              {apt.meeting_url && (
                                                                  <span className="inline-flex items-center gap-1"><Link2 size={12}/> Link</span>
                                                              )}
                                                          </div>
                                                      </button>
                                                  );
                                              })}
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>

                          <div className="md:hidden space-y-4">
                              {visibleDays.map(day => {
                                  const dayAppointments = getAppointmentsForDay(day).sort((a, b) => a.start.getTime() - b.start.getTime());
                                  return (
                                      <div key={day.toISOString()} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                          <div className={`px-4 py-3 border-b border-slate-100 text-sm font-bold ${isSameDay(day, new Date()) ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-600'}`}>
                                              {day.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long' })}
                                          </div>
                                          <div className="p-4 space-y-3">
                                              {dayAppointments.map(apt => (
                                                  <button
                                                      type="button"
                                                      key={apt.id}
                                                      onClick={() => openEditModal(apt)}
                                                      className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all"
                                                  >
                                                      <div className="flex items-center justify-between">
                                                          <div>
                                                              <div className="text-sm font-bold text-slate-800 truncate">{getDisplayTitle(apt)}</div>
                                                              <div className="text-[10px] text-slate-400 font-bold">
                                                                  {apt.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {apt.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                              </div>
                                                          </div>
                                                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${typeMeta[apt.type].chip}`}>{typeMeta[apt.type].label}</span>
                                                      </div>
                                                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500">
                                                          <span className="inline-flex items-center gap-1"><UserCheck size={12}/> {apt.psychologist_name || apt.psychologistName}</span>
                                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${statusMeta[apt.status || 'scheduled'].chip}`}>{statusMeta[apt.status || 'scheduled'].label}</span>
                                                          {apt.service_name && (
                                                              <span className="inline-flex items-center gap-1"><Briefcase size={12}/> {apt.service_name}</span>
                                                          )}
                                                          {apt.recurrence_rule && (
                                                              <span className="inline-flex items-center gap-1"><Repeat size={12}/> Recorrente</span>
                                                          )}
                                                      </div>
                                                  </button>
                                              ))}
                                              {dayAppointments.length === 0 && (
                                                  <div className="text-center text-xs text-slate-400 py-8">Sem compromissos</div>
                                              )}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </>
                  )}

                  {view !== 'month' && visibleDays.every(day => getAppointmentsForDay(day).length === 0) && !isLoading && (
                      <div className="py-16 text-center text-slate-400 flex flex-col items-center animate-fadeIn">
                          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <CalendarIcon size={40} className="opacity-20"/>
                          </div>
                          <p className="text-lg font-medium">Agenda livre</p>
                          <p className="text-sm">Clique em "+" para criar um compromisso.</p>
                      </div>
                  )}
              </div>
          </div>

          {/* MODAL AGENDAMENTO */}
          {isModalOpen && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fadeIn">
                  <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
                      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                                  <CalendarIcon size={18} />
                              </div>
                              <div>
                                  <h3 className="text-base font-semibold text-slate-800">{formData.id ? 'Editar Sessao' : 'Novo Agendamento'}</h3>
                                  <p className="text-xs text-slate-500">
                                      {new Date(formData.appointment_date).toLocaleString(locale, { dateStyle: 'full', timeStyle: 'short' })}
                                  </p>
                              </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                              <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200">
                                  {view === 'day' ? 'Dia' : view === 'week' ? 'Semana' : 'Mes'}
                              </span>
                              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200 transition-all">
                                  <X size={16}/>
                              </button>
                          </div>
                      </div>
                      
                      <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar bg-white">
    <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Tipo de compromisso</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                        onClick={() => setFormData({ ...formData, type: 'consulta' })}
                        className={`py-3 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${formData.type === 'consulta' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Briefcase size={18}/> Consulta
                    </button>
                    <button
                        onClick={() => setFormData({ ...formData, type: 'pessoal' })}
                        className={`py-3 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${formData.type === 'pessoal' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <UserIcon size={18}/> Pessoal/Particular
                    </button>
                    <button
                        onClick={() => setFormData({ ...formData, type: 'bloqueio' })}
                        className={`py-3 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${formData.type === 'bloqueio' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Ban size={18}/> Bloqueio
                    </button>
                </div>
            </div>

            {formData.type !== 'consulta' && (
              <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Titulo</label>
                  <input
                    type="text"
                    className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700"
                    value={formData.title || ''}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Supervisao, estudo, particular"
                  />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {formData.type === 'consulta' && (
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t('agenda.patient')}</label>
                    {patients.length === 0 && (
                        <div className="text-[11px] font-bold text-rose-500">Nenhum paciente carregado.</div>
                    )}
                    <div className="relative">
                        <select
                          className="w-full p-4 pl-12 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700 bg-white appearance-none"
                          value={formData.patient_id || ''}
                          onChange={e => setFormData({...formData, patient_id: e.target.value, patient_name_text: ''})}
                        >
                            <option value="">Selecione o paciente...</option>
                            {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                        </select>
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    </div>
                    <input
                      type="text"
                      className="w-full p-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700"
                      placeholder="Paciente livre (nao cadastrado)"
                      value={formData.patient_name_text || ''}
                      onChange={(e) => setFormData({ ...formData, patient_name_text: e.target.value, patient_id: '' })}
                    />
                </div>
              )}

              <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t('agenda.professional')}</label>
                  {professionals.length === 0 && (
                      <div className="text-[11px] font-bold text-rose-500">Nenhum profissional carregado.</div>
                  )}
                  <div className="relative">
                      <select
                        className="w-full p-4 pl-12 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700 bg-white appearance-none"
                        value={formData.psychologist_id || ''}
                        onChange={e => setFormData({...formData, psychologist_id: e.target.value, professional_name_text: ''})}
                      >
                          <option value="">Selecione o psicologo...</option>
                          {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  </div>
                  <input
                    type="text"
                    className="w-full p-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700"
                    placeholder="Profissional livre (nao cadastrado)"
                    value={formData.professional_name_text || ''}
                    onChange={(e) => setFormData({ ...formData, professional_name_text: e.target.value, psychologist_id: '' })}
                  />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="text-[10px] font-bold uppercase text-slate-400 mb-2">Paciente</div>
                    {getPatientById(formData.patient_id) ? (
                        <>
                            <div className="text-sm font-bold text-slate-800">{getPatientById(formData.patient_id)?.full_name}</div>
                            <div className="text-xs text-slate-500">{getPatientById(formData.patient_id)?.email || 'Sem email'}</div>
                            <div className="text-xs text-slate-500">{getPatientById(formData.patient_id)?.whatsapp || getPatientById(formData.patient_id)?.phone || 'Sem contato'}</div>
                        </>
                    ) : formData.patient_name_text ? (
                        <>
                            <div className="text-sm font-bold text-slate-800">{formData.patient_name_text}</div>
                            <div className="text-xs text-slate-500">Paciente livre</div>
                        </>
                    ) : (
                        <div className="text-xs text-slate-400">Nenhum paciente vinculado</div>
                    )}
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="text-[10px] font-bold uppercase text-slate-400 mb-2">Profissional</div>
                    {getProfessionalById(formData.psychologist_id) ? (
                        <>
                            <div className="text-sm font-bold text-slate-800">{getProfessionalById(formData.psychologist_id)?.name}</div>
                            <div className="text-xs text-slate-500">{getProfessionalById(formData.psychologist_id)?.email || 'Sem email'}</div>
                            <div className="text-xs text-slate-500 capitalize">{getProfessionalById(formData.psychologist_id)?.role}</div>
                        </>
                    ) : formData.professional_name_text ? (
                        <>
                            <div className="text-sm font-bold text-slate-800">{formData.professional_name_text}</div>
                            <div className="text-xs text-slate-500">Profissional livre</div>
                        </>
                    ) : (
                        <div className="text-xs text-slate-400">Selecione um profissional</div>
                    )}
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="text-[10px] font-bold uppercase text-slate-400 mb-2">Servico</div>
                    {getServiceById(formData.service_id) ? (
                        <>
                            <div className="text-sm font-bold text-slate-800">{getServiceById(formData.service_id)?.name}</div>
                            <div className="text-xs text-slate-500">Duracao: {getServiceById(formData.service_id)?.duration || 50} min</div>
                            <div className="text-xs text-slate-500">R$ {getServiceById(formData.service_id)?.price}</div>
                        </>
                    ) : (
                        <div className="text-xs text-slate-400">Sem servico vinculado</div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Data e hora</label>
                    <input
                      type="datetime-local"
                      className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-bold text-slate-700"
                      value={formData.appointment_date}
                      onChange={e => setFormData({...formData, appointment_date: e.target.value})}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Duracao (minutos)</label>
                    <div className="relative">
                      <input
                          type="number"
                          className="w-full p-4 pl-12 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-bold text-slate-700"
                          value={formData.duration_minutes}
                          onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                      />
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Status</label>
                    <select
                      className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700"
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                    >
                        {Object.entries(statusMeta).map(([key, value]) => (
                            <option key={key} value={key}>{value.label}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Link da sessao</label>
                    <div className="relative">
                        <input
                          type="text"
                          className="w-full p-4 pl-12 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700"
                          value={formData.meeting_url || ''}
                          onChange={e => setFormData({ ...formData, meeting_url: e.target.value })}
                          placeholder="https://..."
                        />
                        <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    </div>
                </div>
            </div>

            {formData.type === 'consulta' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t('agenda.service')}</label>
                  <div className="relative">
                      <select
                        className="w-full p-4 pl-12 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700 appearance-none"
                        value={formData.service_id}
                        onChange={e => setFormData({...formData, service_id: e.target.value})}
                      >
                          <option value="">Selecione um servico...</option>
                          {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                      </select>
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  </div>
              </div>

              <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Modalidade</label>
                  <div className="flex gap-4">
                      <button onClick={() => setFormData({...formData, modality: 'presencial'})} className={`flex-1 py-4 rounded-2xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${formData.modality === 'presencial' ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}>
                          <MapPin size={18}/> {t('agenda.presential')}
                      </button>
                      <button onClick={() => setFormData({...formData, modality: 'online'})} className={`flex-1 py-4 rounded-2xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${formData.modality === 'online' ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}>
                          <Video size={18}/> {t('agenda.online')}
                      </button>
                  </div>
              </div>
            </div>
            )}

            <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Recorrencia</div>
                        <p className="text-xs text-slate-400">Agende repeticoes semanais, mensais ou diarias.</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <input
                          type="checkbox"
                          checked={Boolean(formData.recurrence_enabled)}
                          onChange={(e) => setFormData({ ...formData, recurrence_enabled: e.target.checked })}
                          disabled={Boolean(formData.id)}
                        />
                        Ativar
                    </label>
                </div>

                {formData.recurrence_enabled && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Frequencia</label>
                                <select
                                  className="w-full p-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700"
                                  value={formData.recurrence_freq}
                                  onChange={(e) => setFormData({ ...formData, recurrence_freq: e.target.value })}
                                  disabled={Boolean(formData.id)}
                                >
                                    <option value="">Selecione...</option>
                                    <option value="daily">Diaria</option>
                                    <option value="weekly">Semanal</option>
                                    <option value="monthly">Mensal</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Intervalo</label>
                                <input
                                  type="number"
                                  className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700"
                                  value={formData.recurrence_interval}
                                  onChange={(e) => setFormData({ ...formData, recurrence_interval: Number(e.target.value) })}
                                  disabled={Boolean(formData.id)}
                                />
                            </div>
                        </div>

                        {formData.recurrence_freq === 'weekly' && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Dias da semana</label>
                                <div className="flex flex-wrap gap-2">
                                    {recurrenceWeekdays.map(day => (
                                        <button
                                          key={day.value}
                                          type="button"
                                          onClick={() => {
                                              const current = formData.recurrence_weekdays || [];
                                              const exists = current.includes(day.value);
                                              const next = exists ? current.filter((d: string) => d !== day.value) : [...current, day.value];
                                              setFormData({ ...formData, recurrence_weekdays: next });
                                          }}
                                          disabled={Boolean(formData.id)}
                                          className={`px-3 py-1.5 rounded-full text-xs font-bold border ${formData.recurrence_weekdays?.includes(day.value) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Encerrar em</label>
                                <input
                                  type="date"
                                  className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700"
                                  value={formData.recurrence_end_date || ''}
                                  onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                                  disabled={Boolean(formData.id)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Quantidade</label>
                                <input
                                  type="number"
                                  className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700"
                                  value={formData.recurrence_count || ''}
                                  onChange={(e) => setFormData({ ...formData, recurrence_count: e.target.value })}
                                  disabled={Boolean(formData.id)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {formData.id && formData.recurrence_enabled && (
                    <p className="text-xs text-slate-400">
                        Para alterar a recorrencia, crie um novo agendamento.
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t('agenda.notes')}</label>
                <div className="relative">
                    <textarea
                      className="w-full p-4 pl-12 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700 resize-none h-24"
                      value={formData.notes || ''}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      placeholder="Informacoes relevantes para o agendamento..."
                    />
                    <FileText className="absolute left-4 top-4 text-slate-400" size={20} />
                </div>
            </div>
        <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase text-slate-500">Resumo</div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta[formData.status || 'scheduled'].chip}`}>
                        {statusMeta[formData.status || 'scheduled'].label}
                    </span>
                </div>
                <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                        <span>{formData.title || getDisplayTitle(formData)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${typeMeta[formData.type].chip}`}>
                            {typeMeta[formData.type].label}
                        </span>
                    </div>
                    <div className="text-xs text-slate-500">
                        {new Date(formData.appointment_date).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs text-slate-500">
                        <div className="flex items-center gap-2"><Clock size={14}/> {formData.duration_minutes || 50} min</div>
                        <div className="flex items-center gap-2"><UserCheck size={14}/> {getProfessionalById(formData.psychologist_id)?.name || formData.professional_name_text || 'Sem profissional'}</div>
                        <div className="flex items-center gap-2"><UserIcon size={14}/> {getPatientById(formData.patient_id)?.full_name || formData.patient_name_text || 'Sem paciente'}</div>
                        {formData.meeting_url && <div className="flex items-center gap-2"><Link2 size={14}/> Link definido</div>}
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-[11px] font-semibold uppercase text-slate-500 mb-2">Timeline do dia</div>
                <div className="space-y-3 text-xs text-slate-600">
                    {getAppointmentsForDay(new Date(formData.appointment_date)).slice(0, 5).map(apt => (
                        <div key={apt.id} className="flex items-center justify-between">
                            <span>{apt.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="truncate max-w-[160px]">{getDisplayTitle(apt)}</span>
                        </div>
                    ))}
                    {getAppointmentsForDay(new Date(formData.appointment_date)).length === 0 && (
                        <div className="text-slate-400">Sem outros eventos no dia.</div>
                    )}
                </div>
            </div>
        </div>
    </div>
</div>

<div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-wrap items-center gap-3">
                          {formData.id && (formData.parent_appointment_id || formData.recurrence_rule) && (
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                  <input
                                    type="checkbox"
                                    checked={applyToSeries}
                                    onChange={(e) => setApplyToSeries(e.target.checked)}
                                  />
                                  Aplicar alteracoes na serie
                              </label>
                          )}
                          {formData.id && (
                              <div className="flex items-center gap-3 ml-auto">
                                  {(formData.parent_appointment_id || formData.recurrence_rule) && (
                                      <label className="flex items-center gap-2 text-xs font-bold text-red-500">
                                          <input
                                            type="checkbox"
                                            checked={deleteSeries}
                                            onChange={(e) => setDeleteSeries(e.target.checked)}
                                          />
                                          Excluir serie
                                      </label>
                                  )}
                                  <button onClick={() => setIsDeleteModalOpen(true)} className="px-3 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors border border-red-200" title="Excluir Agendamento">
                                      <Trash2 size={18}/>
                                  </button>
                              </div>
                          )}
                          <button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg shadow-sm transition-all">
                              {formData.id ? 'Salvar Alteracoes' : 'Confirmar Atendimento'}
                          </button>
                      </div>
                  </div>
              </div>
          )}
          {isDeleteModalOpen && (
              <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                  <div className="bg-white w-full max-w-sm rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-slate-800">Excluir agendamento</h4>
                          <button onClick={() => setIsDeleteModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                              <X size={16} />
                          </button>
                      </div>
                      <div className="p-5 space-y-3 text-sm text-slate-600">
                          <p>Deseja realmente excluir este agendamento?</p>
                          {(formData.parent_appointment_id || formData.recurrence_rule) && (
                              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                  <input
                                    type="checkbox"
                                    checked={deleteSeries}
                                    onChange={(e) => setDeleteSeries(e.target.checked)}
                                  />
                                  Excluir toda a serie
                              </label>
                          )}
                      </div>
                      <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
                          <button onClick={() => setIsDeleteModalOpen(false)} className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
                              Cancelar
                          </button>
                          <button onClick={handleDelete} className="px-3 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg">
                              Excluir
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );
};

