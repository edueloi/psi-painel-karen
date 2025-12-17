
import React, { useState, useEffect, useMemo } from 'react';
import { MOCK_APPOINTMENTS, MOCK_PATIENTS, MOCK_USERS, MOCK_SERVICES, MOCK_PACKAGES } from '../constants';
import { Appointment, AppointmentType, UserRole } from '../types';
import { 
  ChevronLeft, ChevronRight, Clock, Plus, Video, MapPin, 
  Calendar as CalendarIcon, X, Check, Repeat, Trash2, Palette, 
  ChevronDown, ListOrdered, CalendarDays, User, Filter, AlignLeft,
  DollarSign, Briefcase, Lock, UserCircle, Tag, Layers, AlertCircle, ArrowRight
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'day' | 'week' | 'month';

// Constants for grid rendering
const START_HOUR = 7;
const END_HOUR = 20;
const HOURS_COUNT = END_HOUR - START_HOUR + 1;
const PIXELS_PER_HOUR = 96; 

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const Agenda: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  // Auto-switch to 'day' view on mobile
  const [view, setView] = useState<ViewMode>(window.innerWidth < 768 ? 'day' : 'week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
  
  // Filters
  const [selectedProfessional, setSelectedProfessional] = useState<string>('all');

  // --- MODAL STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'details' | 'financial' | 'recurrence'>('details');
  
  // Form State
  const [formData, setFormData] = useState<{
      id?: string;
      title: string;
      patientId: string;
      type: 'consulta' | 'pessoal' | 'bloqueio';
      modality: 'presencial' | 'online';
      start: string; // YYYY-MM-DDTHH:mm
      duration: number; // minutes
      serviceId: string;
      packageId: string;
      value: number;
      discount: number;
      notes: string;
      color: string;
      // Recurrence
      isRecurrent: boolean;
      frequency: 'weekly' | 'biweekly' | 'monthly';
      occurrences: number;
  }>({
      title: '',
      patientId: '',
      type: 'consulta',
      modality: 'presencial',
      start: new Date().toISOString().slice(0, 16),
      duration: 50,
      serviceId: '',
      packageId: '',
      value: 0,
      discount: 0,
      notes: '',
      color: '#6366f1',
      isRecurrent: false,
      frequency: 'weekly',
      occurrences: 1
  });

  // Generated Appointments Preview (for recurrence)
  const [previewDates, setPreviewDates] = useState<Date[]>([]);

  // Responsive listener
  useEffect(() => {
      const handleResize = () => {
          if (window.innerWidth < 768 && view === 'week') {
              setView('day');
          }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, [view]);

  // Recurrence Calculation Effect
  useEffect(() => {
      if (!formData.start) return;
      const baseDate = new Date(formData.start);
      const dates: Date[] = [baseDate];

      if (formData.isRecurrent && formData.occurrences > 1) {
          for (let i = 1; i < formData.occurrences; i++) {
              const nextDate = new Date(baseDate);
              if (formData.frequency === 'weekly') {
                  nextDate.setDate(baseDate.getDate() + (i * 7));
              } else if (formData.frequency === 'biweekly') {
                  nextDate.setDate(baseDate.getDate() + (i * 14));
              } else if (formData.frequency === 'monthly') {
                  nextDate.setMonth(baseDate.getMonth() + i);
              }
              dates.push(nextDate);
          }
      }
      setPreviewDates(dates);
  }, [formData.start, formData.isRecurrent, formData.frequency, formData.occurrences]);

  // Financial Auto-fill Effect
  useEffect(() => {
      if (formData.type === 'consulta') {
          if (formData.serviceId) {
              const service = MOCK_SERVICES.find(s => s.id === formData.serviceId);
              if (service) {
                  setFormData(prev => ({ ...prev, value: service.price, duration: service.duration, color: service.color }));
              }
          } else if (formData.packageId) {
              const pkg = MOCK_PACKAGES.find(p => p.id === formData.packageId);
              if (pkg) {
                  // Logic: Divide package price by items or just set total (simplified here)
                  setFormData(prev => ({ ...prev, value: pkg.totalPrice, notes: `Pacote: ${pkg.name}` }));
              }
          }
      }
  }, [formData.serviceId, formData.packageId]);


  // Localization Helpers
  const weekDays = language === 'pt' 
    ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // --- Date Logic ---
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const currentWeekStart = getStartOfWeek(currentDate);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: HOURS_COUNT }, (_, i) => i + START_HOUR);

  // --- Filtering ---
  const filteredAppointments = useMemo(() => {
      return appointments.filter(apt => 
          selectedProfessional === 'all' || apt.psychologistId === selectedProfessional
      );
  }, [appointments, selectedProfessional]);

  const getDayEvents = (date: Date) => {
    return filteredAppointments.filter(a => 
      a.start.getDate() === date.getDate() && 
      a.start.getMonth() === date.getMonth() && 
      a.start.getFullYear() === date.getFullYear()
    );
  };

  // --- Navigation Handlers ---
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') newDate.setDate(newDate.getDate() - 1);
    if (view === 'week') newDate.setDate(newDate.getDate() - 7);
    if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') newDate.setDate(newDate.getDate() + 1);
    if (view === 'week') newDate.setDate(newDate.getDate() + 7);
    if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
      setCurrentDate(new Date());
      if (window.innerWidth < 768) setView('day');
  };

  // --- Appointment Logic ---
  const handleSlotClick = (date: Date, hour: number) => {
    const start = new Date(date);
    start.setHours(hour, 0, 0, 0);
    
    // Reset Form
    setFormData({
        title: '',
        patientId: '',
        type: 'consulta',
        modality: 'presencial',
        start: start.toISOString().slice(0, 16), // datetime-local format
        duration: 50,
        serviceId: '',
        packageId: '',
        value: 0,
        discount: 0,
        notes: '',
        color: '#6366f1',
        isRecurrent: false,
        frequency: 'weekly',
        occurrences: 1
    });
    setModalStep('details');
    setIsModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, apt: Appointment) => {
      e.stopPropagation();
      
      setFormData({
          id: apt.id,
          title: apt.title,
          patientId: apt.patientId || '',
          type: apt.type,
          modality: apt.modality,
          start: apt.start.toISOString().slice(0, 16),
          duration: (apt.end.getTime() - apt.start.getTime()) / 60000,
          serviceId: '', // Would need to store this in Appointment type
          packageId: '',
          value: 0, // Would come from backend
          discount: 0,
          notes: apt.notes || '',
          color: apt.color || '#6366f1',
          isRecurrent: false,
          frequency: 'weekly',
          occurrences: 1
      });
      setModalStep('details');
      setIsModalOpen(true);
  };

  const handleSave = () => {
      // Create appointments based on recurrence
      const newAppointments: Appointment[] = previewDates.map((date, index) => {
          const end = new Date(date.getTime() + formData.duration * 60000);
          
          let finalTitle = formData.title;
          const patient = MOCK_PATIENTS.find(p => p.id === formData.patientId);
          
          if (formData.type === 'consulta' && patient) {
              finalTitle = `${patient.name}`;
              if (formData.occurrences > 1) finalTitle += ` (${index + 1}/${formData.occurrences})`;
          } else if (formData.type === 'bloqueio') {
              finalTitle = 'Bloqueio / Ausência';
          } else if (formData.type === 'pessoal' && !finalTitle) {
              finalTitle = 'Compromisso Pessoal';
          }

          // In real app: Create a Comanda here if Service is selected

          return {
              id: formData.id && index === 0 ? formData.id : Math.random().toString(36).substr(2, 9),
              title: finalTitle,
              start: date,
              end: end,
              patientId: formData.patientId,
              patientName: patient?.name,
              psychologistId: MOCK_USERS[0].id, // Mock current user
              psychologistName: MOCK_USERS[0].name,
              status: 'scheduled',
              type: formData.type,
              modality: formData.modality,
              color: formData.color,
              notes: formData.notes
          };
      });

      // Update State
      if (formData.id) {
          // Editing existing: Remove old one (simplified logic, usually would ask to update series)
          setAppointments(prev => [...prev.filter(a => a.id !== formData.id), ...newAppointments]);
      } else {
          // Creating new
          setAppointments(prev => [...prev, ...newAppointments]);
      }

      setIsModalOpen(false);
  };

  const handleDelete = () => {
      if(window.confirm('Excluir agendamento?')) {
          setAppointments(prev => prev.filter(a => a.id !== formData.id));
          setIsModalOpen(false);
      }
  };

  // --- Render Helpers ---
  const getEventStyle = (apt: Appointment) => {
      const startMinutes = (apt.start.getHours() - START_HOUR) * 60 + apt.start.getMinutes();
      const durationMinutes = (apt.end.getTime() - apt.start.getTime()) / (1000 * 60);
      
      const top = (startMinutes / 60) * PIXELS_PER_HOUR;
      const height = (durationMinutes / 60) * PIXELS_PER_HOUR;

      const style = {
          top: `${top}px`,
          height: `${Math.max(height, 28)}px`,
          backgroundColor: apt.color ? `${apt.color}15` : '#6366f115',
          borderLeftColor: apt.color || '#6366f1',
          color: '#1e293b'
      };

      return { style, className: `absolute left-1 right-1 rounded-r-lg border-l-4 px-2 py-1 text-xs shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group z-10 hover:brightness-95 hover:z-20` };
  };

  const renderCurrentTimeLine = () => {
      const now = new Date();
      if (now.getDate() !== currentDate.getDate() && view === 'day') return null;
      if (view === 'week' && (now < currentWeekStart || now > new Date(new Date(currentWeekStart).setDate(currentWeekStart.getDate()+6)))) return null;

      const top = ((now.getHours() - START_HOUR) * 60 + now.getMinutes()) / 60 * PIXELS_PER_HOUR;
      
      if (top < 0 || top > HOURS_COUNT * PIXELS_PER_HOUR) return null;

      return (
          <div className="absolute left-0 right-0 border-t-2 border-red-500 z-30 pointer-events-none flex items-center" style={{ top: `${top}px` }}>
              <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5 shadow-sm"></div>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-[24px] shadow-xl border border-slate-200 overflow-hidden font-sans animate-fadeIn relative">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col xl:flex-row items-center justify-between p-4 border-b border-slate-100 gap-4 bg-white z-20">
        <div className="flex items-center gap-4 w-full xl:w-auto">
          <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200 shadow-sm">
            <button onClick={handlePrev} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 hover:text-indigo-600 transition-all"><ChevronLeft size={18} /></button>
            <button onClick={handleToday} className="px-4 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-indigo-600">Hoje</button>
            <button onClick={handleNext} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 hover:text-indigo-600 transition-all"><ChevronRight size={18} /></button>
          </div>
          <h2 className="text-lg md:text-xl font-display font-bold text-slate-800 capitalize min-w-[150px] text-center md:text-left">
             {currentDate.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', { month: 'long', year: 'numeric' })}
          </h2>
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto no-scrollbar">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 flex-1 xl:flex-none justify-center min-w-max">
                <button onClick={() => setView('day')} className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${view === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{t('agenda.day')}</button>
                <button onClick={() => setView('week')} className={`hidden md:block px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${view === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{t('agenda.week')}</button>
                <button onClick={() => setView('month')} className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${view === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{t('agenda.month')}</button>
            </div>
            
            <button 
                onClick={() => {
                    const now = new Date();
                    now.setMinutes(0);
                    handleSlotClick(now, now.getHours());
                }}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 md:px-5 md:py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all shrink-0"
            >
                <Plus size={20} /> <span className="hidden md:inline">{t('agenda.schedule')}</span>
            </button>
        </div>
      </div>

      {/* --- CALENDAR BODY --- */}
      <div className="flex-1 overflow-y-auto relative bg-white scroll-smooth custom-scrollbar">
        
        {/* MOBILE DAY LIST VIEW */}
        {view === 'day' && window.innerWidth < 768 ? (
            <div className="p-4 space-y-4">
                <div className="text-center mb-4">
                    <div className="inline-block bg-indigo-50 text-indigo-700 px-4 py-1 rounded-full text-sm font-bold capitalize">
                        {currentDate.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'long', day: 'numeric' })}
                    </div>
                </div>
                
                {getDayEvents(currentDate).sort((a,b) => a.start.getTime() - b.start.getTime()).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-50">
                        <CalendarIcon size={48} className="mb-2" />
                        <p>Sem agendamentos</p>
                    </div>
                ) : (
                    getDayEvents(currentDate).sort((a,b) => a.start.getTime() - b.start.getTime()).map(apt => (
                        <div 
                            key={apt.id} 
                            onClick={(e) => handleEventClick(e, apt)}
                            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4 hover:border-indigo-200 transition-all cursor-pointer"
                        >
                            <div className="flex flex-col items-center justify-center px-2 border-r border-slate-100">
                                <span className="text-sm font-bold text-slate-800">{apt.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                <span className="text-xs text-slate-400">{apt.end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-slate-800">{apt.title}</h4>
                                    {apt.modality === 'online' && <Video size={14} className="text-blue-500" />}
                                </div>
                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: apt.color || '#ccc' }}></span>
                                    {apt.type === 'consulta' ? 'Consulta' : apt.type === 'pessoal' ? 'Pessoal' : 'Bloqueio'}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        ) : (
            // DESKTOP GRID VIEW (Day & Week)
            (view === 'week' || view === 'day') && (
                <div className="flex min-h-[1000px] relative">
                    {/* Time Axis */}
                    <div className="w-14 flex-shrink-0 border-r border-slate-100 bg-white sticky left-0 z-20">
                        <div className="h-14 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-30"></div>
                        {hours.map(hour => (
                        <div key={hour} className="text-[10px] font-bold text-slate-400 text-right pr-2 relative" style={{ height: `${PIXELS_PER_HOUR}px` }}>
                            <span className="-translate-y-1/2 block pt-2">{hour}:00</span>
                        </div>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="flex-1 flex min-w-[600px] relative">
                        {/* Horizontal Guidelines */}
                        <div className="absolute inset-0 z-0 pointer-events-none flex flex-col pt-14">
                            {hours.map(h => (
                                <div key={h} className="border-b border-slate-50 w-full" style={{ height: `${PIXELS_PER_HOUR}px` }}></div>
                            ))}
                        </div>

                        {(view === 'day' ? [currentDate] : weekDates).map((date, idx) => {
                            const isToday = date.toDateString() === new Date().toDateString();
                            const dayEvents = getDayEvents(date);
                            
                            return (
                            <div key={idx} className="flex-1 border-r border-slate-100 last:border-r-0 min-w-[140px] relative group bg-transparent z-10">
                                {/* Header */}
                                <div className={`h-14 border-b border-slate-100 sticky top-0 z-20 flex flex-col items-center justify-center transition-colors ${isToday ? 'bg-indigo-50/90 backdrop-blur-sm border-indigo-100' : 'bg-white/95 backdrop-blur-sm'}`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {weekDays[date.getDay()]}
                                    </span>
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-lg font-bold mt-0.5 ${isToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-300' : 'text-slate-700'}`}>
                                        {date.getDate()}
                                    </div>
                                </div>
                                
                                {/* Clickable Slots */}
                                <div className="relative h-full">
                                    {hours.map(h => (
                                        <div 
                                            key={h} 
                                            className="absolute w-full hover:bg-indigo-50/30 transition-colors cursor-pointer z-0"
                                            style={{ top: `${(h - START_HOUR) * PIXELS_PER_HOUR}px`, height: `${PIXELS_PER_HOUR}px` }}
                                            onClick={() => handleSlotClick(date, h)}
                                        ></div>
                                    ))}

                                    {/* Events */}
                                    {dayEvents.map(apt => {
                                        const { style, className } = getEventStyle(apt);
                                        return (
                                            <div key={apt.id} className={className} style={style} onClick={(e) => handleEventClick(e, apt)}>
                                                <div className="font-bold truncate leading-tight text-[11px] mb-0.5">{apt.title}</div>
                                                <div className="flex items-center gap-1 opacity-80 text-[10px]">
                                                    {apt.modality === 'online' ? <Video size={10} /> : <MapPin size={10} />}
                                                    <span>{apt.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Current Time Line (Only for Today) */}
                                    {isToday && renderCurrentTimeLine()}
                                </div>
                            </div>
                        );})}
                    </div>
                </div>
            )
        )}

        {/* MONTH VIEW */}
        {view === 'month' && (
            <div className="p-4 h-full overflow-y-auto">
               <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  {weekDays.map(d => <div key={d} className="bg-slate-50 text-center font-bold text-slate-400 uppercase text-xs py-3">{d}</div>)}
                  
                  {Array.from({length: 42}, (_, i) => {
                      const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                      d.setDate(d.getDate() - d.getDay() + i);
                      const isToday = d.toDateString() === new Date().toDateString();
                      const isCurrentMonth = d.getMonth() === currentDate.getMonth();
                      const dayEvents = getDayEvents(d);
                      const MAX_EVENTS_DISPLAY = 3;

                      return (
                          <div 
                            key={i} 
                            className={`bg-white p-2 min-h-[120px] flex flex-col transition-colors hover:bg-slate-50 border-t border-slate-50 ${!isCurrentMonth ? 'bg-slate-50/30' : ''}`}
                            onClick={(e) => { 
                                if(e.target === e.currentTarget || (e.target as HTMLElement).tagName !== 'BUTTON') {
                                    setCurrentDate(d); setView('day'); 
                                }
                            }}
                          >
                              <div className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1 self-end ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>
                                  {d.getDate()}
                              </div>
                              <div className="space-y-1 flex-1 overflow-hidden">
                                  {dayEvents.slice(0, MAX_EVENTS_DISPLAY).map(ev => (
                                      <button 
                                        key={ev.id} 
                                        onClick={(e) => handleEventClick(e, ev)}
                                        className="w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate flex items-center gap-1 hover:brightness-95" 
                                        style={{ backgroundColor: ev.color ? `${ev.color}20` : '#f1f5f9', color: ev.color || '#475569' }}
                                      >
                                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ev.color || '#94a3b8' }}></div>
                                          {ev.title}
                                      </button>
                                  ))}
                                  {dayEvents.length > MAX_EVENTS_DISPLAY && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setCurrentDate(d); setView('day'); }}
                                        className="w-full text-center text-[10px] font-bold text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded py-0.5 transition-colors"
                                      >
                                          + {dayEvents.length - MAX_EVENTS_DISPLAY} mais
                                      </button>
                                  )}
                              </div>
                          </div>
                      );
                  })}
               </div>
            </div>
        )}
      </div>

      {/* --- POWERFUL APPOINTMENT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[24px] shadow-2xl animate-[slideUpFade_0.3s_ease-out] overflow-hidden flex flex-col md:flex-row">
                
                {/* LEFT: FORM BUILDER */}
                <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
                    <div className="p-6 border-b border-slate-200 bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-display font-bold text-slate-800">
                                {formData.id ? 'Editar Agendamento' : 'Novo Agendamento'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
                        </div>
                        
                        {/* Type Toggle */}
                        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                            {[
                                { id: 'consulta', label: 'Consulta', icon: <UserCircle size={16} /> },
                                { id: 'pessoal', label: 'Pessoal', icon: <User size={16} /> },
                                { id: 'bloqueio', label: 'Bloqueio', icon: <Lock size={16} /> }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setFormData({...formData, type: t.id as any})}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all ${formData.type === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {t.icon} {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                        
                        {/* GENERAL INFO */}
                        <section className="space-y-4">
                            {formData.type === 'consulta' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Paciente</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full p-3 pl-10 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700 appearance-none"
                                            value={formData.patientId}
                                            onChange={e => setFormData({...formData, patientId: e.target.value})}
                                        >
                                            <option value="">Selecione o paciente...</option>
                                            {MOCK_PATIENTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    </div>
                                </div>
                            )}

                            {(formData.type === 'pessoal' || formData.type === 'bloqueio') && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Título / Motivo</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
                                        placeholder="Ex: Almoço, Reunião, Dentista..."
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Data e Hora</label>
                                    <input 
                                        type="datetime-local" 
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-sm"
                                        value={formData.start}
                                        onChange={e => setFormData({...formData, start: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duração (min)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" step="5"
                                            className="w-full p-3 pl-10 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-sm"
                                            value={formData.duration}
                                            onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})}
                                        />
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 items-center">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Modalidade</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => setFormData({...formData, modality: 'presencial'})} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${formData.modality === 'presencial' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>Presencial</button>
                                        <button onClick={() => setFormData({...formData, modality: 'online'})} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${formData.modality === 'online' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}>Online</button>
                                    </div>
                                </div>
                                <div className="w-16">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cor</label>
                                    <input type="color" className="w-full h-10 rounded-lg cursor-pointer border-0 p-0" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
                                </div>
                            </div>
                        </section>

                        {/* FINANCIAL SECTION (Only for Consulta) */}
                        {formData.type === 'consulta' && (
                            <section className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                                <h4 className="font-bold text-slate-700 flex items-center gap-2 text-sm"><DollarSign size={16} className="text-emerald-500"/> Financeiro & Serviços</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Serviço</label>
                                        <select 
                                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                            value={formData.serviceId}
                                            onChange={e => setFormData({...formData, serviceId: e.target.value, packageId: ''})}
                                        >
                                            <option value="">Selecione...</option>
                                            {MOCK_SERVICES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Pacote</label>
                                        <select 
                                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                            value={formData.packageId}
                                            onChange={e => setFormData({...formData, packageId: e.target.value, serviceId: ''})}
                                        >
                                            <option value="">Selecione...</option>
                                            {MOCK_PACKAGES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-lg">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor (R$)</label>
                                        <input type="number" className="w-full bg-transparent font-bold text-slate-700 outline-none" value={formData.value} onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} />
                                    </div>
                                    <div className="w-px h-8 bg-slate-200"></div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Desconto (R$)</label>
                                        <input type="number" className="w-full bg-transparent font-bold text-rose-500 outline-none" value={formData.discount} onChange={e => setFormData({...formData, discount: parseFloat(e.target.value)})} />
                                    </div>
                                    <div className="w-px h-8 bg-slate-200"></div>
                                    <div className="flex-1 text-right">
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Total</label>
                                        <span className="font-bold text-emerald-600 text-lg">{formatCurrency(Math.max(0, formData.value - formData.discount))}</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 italic">* Isso gerará automaticamente uma comanda financeira.</p>
                            </section>
                        )}

                        {/* RECURRENCE SECTION */}
                        <section className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-indigo-900 flex items-center gap-2 text-sm"><Repeat size={16}/> Repetição</h4>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={formData.isRecurrent} onChange={e => setFormData({...formData, isRecurrent: e.target.checked})} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            {formData.isRecurrent && (
                                <div className="grid grid-cols-2 gap-4 animate-[fadeIn_0.3s_ease-out]">
                                    <div>
                                        <label className="block text-xs font-bold text-indigo-400 uppercase mb-1">Frequência</label>
                                        <select 
                                            className="w-full p-2 bg-white border border-indigo-200 rounded-lg text-sm"
                                            value={formData.frequency}
                                            onChange={e => setFormData({...formData, frequency: e.target.value as any})}
                                        >
                                            <option value="weekly">Semanal</option>
                                            <option value="biweekly">Quinzenal</option>
                                            <option value="monthly">Mensal</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-indigo-400 uppercase mb-1">Ocorrências</label>
                                        <input 
                                            type="number" min="2" max="50"
                                            className="w-full p-2 bg-white border border-indigo-200 rounded-lg text-sm"
                                            value={formData.occurrences}
                                            onChange={e => setFormData({...formData, occurrences: parseInt(e.target.value)})}
                                        />
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* NOTES */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Observações</label>
                            <textarea 
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm resize-none h-20"
                                placeholder="Detalhes adicionais..."
                                value={formData.notes}
                                onChange={e => setFormData({...formData, notes: e.target.value})}
                            />
                        </div>

                    </div>
                </div>

                {/* RIGHT: SUMMARY PANEL */}
                <div className="w-full md:w-80 bg-slate-900 text-white flex flex-col shrink-0">
                    <div className="p-6 border-b border-slate-700">
                        <h4 className="font-display font-bold text-lg flex items-center gap-2"><Layers size={18} className="text-indigo-400" /> Resumo</h4>
                    </div>
                    
                    <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">O quê</p>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: formData.color }}></div>
                                <span className="font-bold text-lg capitalize">{formData.type}</span>
                            </div>
                            <p className="text-sm text-slate-400">{formData.modality}</p>
                        </div>

                        {formData.type === 'consulta' && (
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Para quem</p>
                                <p className="font-medium">{MOCK_PATIENTS.find(p => p.id === formData.patientId)?.name || 'Selecione um paciente'}</p>
                            </div>
                        )}

                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Quando</p>
                            <p className="font-medium text-indigo-300">{new Date(formData.start).toLocaleDateString()} às {new Date(formData.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            <p className="text-xs text-slate-400">{formData.duration} minutos</p>
                        </div>

                        {formData.isRecurrent && (
                            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><Repeat size={10} /> Recorrência</p>
                                <p className="text-sm font-medium mb-1">{formData.occurrences} sessões ({formData.frequency === 'weekly' ? 'Semanal' : formData.frequency === 'biweekly' ? 'Quinzenal' : 'Mensal'})</p>
                                <div className="space-y-1 mt-2 max-h-32 overflow-y-auto pr-1">
                                    {previewDates.map((d, i) => (
                                        <div key={i} className="flex justify-between text-xs text-slate-400">
                                            <span>#{i+1}</span>
                                            <span>{d.toLocaleDateString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {formData.type === 'consulta' && (
                            <div className="pt-4 border-t border-slate-700">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase">Valor Total</p>
                                        <p className="text-xs text-slate-400">Previsto</p>
                                    </div>
                                    <div className="text-2xl font-bold text-emerald-400">
                                        {formatCurrency((Math.max(0, formData.value - formData.discount)) * (formData.isRecurrent ? formData.occurrences : 1))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-slate-800 border-t border-slate-700 flex gap-3">
                        {formData.id && (
                            <button onClick={handleDelete} className="p-3 bg-slate-700 text-red-400 rounded-xl hover:bg-slate-600 transition-colors">
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button 
                            onClick={handleSave}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-900/50 transition-all flex items-center justify-center gap-2"
                        >
                            <Check size={18} /> Confirmar
                        </button>
                    </div>
                </div>

            </div>
        </div>
      )}
    </div>
  );
};
