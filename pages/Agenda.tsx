
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Appointment, Professional, Service } from '../types';
import { 
  ChevronLeft, ChevronRight, Clock, Plus, Video, MapPin, 
  Calendar as CalendarIcon, CalendarDays, CalendarRange, X, Check, Repeat, Trash2, User, 
  DollarSign, Package, Layers, Loader2, Briefcase, FileText, UserCheck, Ban
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSearchParams } from 'react-router-dom';

export const Agenda: React.FC = () => {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [filterPatientId, setFilterPatientId] = useState<string | null>(null);

  const [formData, setFormData] = useState<any>({
      type: 'consulta',
      modality: 'presencial',
      appointment_date: new Date().toISOString().slice(0, 16),
      duration_minutes: 50,
      title: '',
      service_id: '',
      patient_id: '',
      psychologist_id: '',
      notes: ''
  });

  const locale = language === 'pt' ? 'pt-BR' : 'en-US';
  const startHour = 7;
  const endHour = 21;
  const hourHeight = 64;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  const typeMeta = {
      consulta: { label: 'Consulta', chip: 'bg-indigo-50 text-indigo-700 border-indigo-100', solid: 'bg-indigo-600', dot: 'bg-indigo-500' },
      pessoal: { label: 'Pessoal', chip: 'bg-amber-50 text-amber-700 border-amber-100', solid: 'bg-amber-500', dot: 'bg-amber-500' },
      bloqueio: { label: 'Bloqueio', chip: 'bg-slate-100 text-slate-600 border-slate-200', solid: 'bg-slate-500', dot: 'bg-slate-500' },
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
      if (!filterPatientId) return appointments;
      return appointments.filter((a: any) => {
          const pid = String(a.patient_id ?? a.patientId ?? '');
          return pid && pid === String(filterPatientId);
      });
  }, [appointments, filterPatientId]);

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
  const getDisplayTitle = (apt: Appointment) => {
      if (apt.type === 'consulta') return apt.patient_name || apt.patientName || apt.title || typeMeta.consulta.label;
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
              return {
                  ...a,
                  start,
                  end,
                  type,
                  title,
                  modality: a.modality || 'presencial'
              };
          }));
          setPatients(pts.map(p => ({ id: p.id, name: p.full_name })));
          setProfessionals(pros.filter(p => p.role !== 'secretario').map(p => ({ id: p.id, name: p.name })));
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

  const handleSave = async () => {
      try {
          if (!formData.psychologist_id) {
              alert("Profissional e obrigatorio.");
              return;
          }
          if (formData.type === 'consulta' && !formData.patient_id) {
              alert("Paciente e obrigatorio para consulta.");
              return;
          }

          const payload = {
              patient_id: formData.type === 'consulta' ? formData.patient_id : null,
              psychologist_id: formData.psychologist_id,
              service_id: formData.type === 'consulta' ? formData.service_id || null : null,
              appointment_date: formData.appointment_date,
              duration_minutes: formData.duration_minutes,
              status: 'scheduled',
              modality: formData.type === 'consulta' ? formData.modality : 'presencial',
              notes: formData.notes,
              type: formData.type,
              title: formData.title || null
          };

          if (formData.id) {
              await api.put(`/appointments/${formData.id}`, payload);
          } else {
              await api.post('/appointments', payload);
          }
          fetchData();
          setIsModalOpen(false);
      } catch (e: any) {
          alert(e.message || 'Erro ao salvar agendamento');
      }
  };

  const handleDelete = async () => {
      if (window.confirm('Excluir este agendamento?')) {
          await api.delete(`/appointments/${formData.id}`);
          fetchData();
          setIsModalOpen(false);
      }
  };

  return (
      <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden font-sans animate-fadeIn relative">
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
                      <button onClick={() => { setFormData({ type: 'consulta', modality:'presencial', appointment_date: new Date().toISOString().slice(0,16), duration_minutes: 50, title: '', service_id: '', patient_id: '', psychologist_id: '', notes: '' }); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95">
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
                                          <div key={hour} className="h-[64px] pr-3 text-[10px] text-slate-400 flex items-start justify-end pt-2 border-b border-slate-100">
                                              {String(hour).padStart(2, '0')}:00
                                          </div>
                                      ))}
                                  </div>
                                  {visibleDays.map(day => {
                                      const dayAppointments = getAppointmentsForDay(day);
                                      return (
                                          <div key={day.toISOString()} className="relative border-l border-slate-100" style={{ height: gridHeight }}>
                                              {hours.map(hour => (
                                                  <div key={hour} className="h-[64px] border-b border-slate-100"></div>
                                              ))}
                                              {dayAppointments.map(apt => {
                                                  const blockStyle = getBlockStyle(apt);
                                                  return (
                                                      <button
                                                          type="button"
                                                          key={apt.id}
                                                          onClick={() => { setFormData({ ...apt, type: apt.type || 'consulta', title: apt.title || '', appointment_date: apt.start.toISOString().slice(0,16) }); setIsModalOpen(true); }}
                                                          style={{ top: blockStyle.top, height: blockStyle.height }}
                                                          className={`absolute left-2 right-2 rounded-xl px-3 py-2 text-left text-white shadow-md hover:shadow-lg transition-all ${typeMeta[apt.type].solid}`}
                                                      >
                                                          <div className="text-[10px] font-bold uppercase opacity-90">
                                                              {apt.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {apt.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                          </div>
                                                          <div className="text-xs font-bold truncate">{getDisplayTitle(apt)}</div>
                                                          <div className="text-[10px] opacity-80 flex items-center gap-2">
                                                              <span>{apt.type === 'consulta' ? (apt.modality === 'online' ? 'Online' : 'Presencial') : typeMeta[apt.type].label}</span>
                                                              <span>- {apt.duration_minutes || 50} min</span>
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
                                                      onClick={() => { setFormData({ ...apt, type: apt.type || 'consulta', title: apt.title || '', appointment_date: apt.start.toISOString().slice(0,16) }); setIsModalOpen(true); }}
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
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn">
                  <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100">
                      <div className="relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900"></div>
                          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.4),transparent_55%)]"></div>
                          <div className="relative p-8 flex justify-between items-center text-white">
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20">
                                      <CalendarIcon size={22} />
                                  </div>
                                  <div>
                                      <h3 className="text-2xl font-display font-bold">{formData.id ? 'Editar Sessao' : 'Novo Agendamento'}</h3>
                                      <p className="text-sm text-indigo-100">Organize consultas, bloqueios e compromissos pessoais.</p>
                                  </div>
                              </div>
                              <button onClick={() => setIsModalOpen(false)} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-all">
                                  <X size={22}/>
                              </button>
                          </div>
                      </div>
                      
                      <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar bg-gradient-to-b from-white via-white to-slate-50/60">
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Tipo de compromisso</label>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <button
                                      onClick={() => setFormData({ ...formData, type: 'consulta' })}
                                      className={`py-4 rounded-2xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${formData.type === 'consulta' ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}
                                  >
                                      <Briefcase size={18}/> Consulta
                                  </button>
                                  <button
                                      onClick={() => setFormData({ ...formData, type: 'pessoal' })}
                                      className={`py-4 rounded-2xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${formData.type === 'pessoal' ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}
                                  >
                                      <User size={18}/> Pessoal/Particular
                                  </button>
                                  <button
                                      onClick={() => setFormData({ ...formData, type: 'bloqueio' })}
                                      className={`py-4 rounded-2xl font-bold border-2 transition-all flex items-center justify-center gap-2 ${formData.type === 'bloqueio' ? 'bg-slate-100 border-slate-400 text-slate-700 shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}
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
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t('agenda.patient')} *</label>
                                  <div className="relative">
                                      <select 
                                        className="w-full p-4 pl-12 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700 bg-white appearance-none" 
                                        value={formData.patient_id || ''} 
                                        onChange={e => setFormData({...formData, patient_id: e.target.value})}
                                      >
                                          <option value="">Selecione o paciente...</option>
                                          {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                      </select>
                                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                  </div>
                              </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{t('agenda.professional')} *</label>
                                <div className="relative">
                                    <select 
                                      className="w-full p-4 pl-12 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700 bg-white appearance-none" 
                                      value={formData.psychologist_id || ''} 
                                      onChange={e => setFormData({...formData, psychologist_id: e.target.value})}
                                    >
                                        <option value="">Selecione o psicologo...</option>
                                        {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                </div>
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
                      </div>

                      <div className="p-8 border-t border-slate-100 bg-slate-50/80 flex gap-4">
                          {formData.id && (
                              <button onClick={handleDelete} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors shadow-sm border border-red-100" title="Excluir Agendamento">
                                <Trash2 size={24}/>
                              </button>
                          )}
                          <button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-95">
                              {formData.id ? 'Salvar Alteracoes' : 'Confirmar Atendimento'}
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );
};












