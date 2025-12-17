
import React, { useState, useEffect, useMemo } from 'react';
import { MOCK_APPOINTMENTS, MOCK_PATIENTS, MOCK_USERS } from '../constants';
import { Appointment, AppointmentType, UserRole } from '../types';
import { 
  ChevronLeft, ChevronRight, Clock, Plus, Video, MapPin, 
  Calendar as CalendarIcon, X, Check, Repeat, Trash2, Palette, ChevronDown, ListOrdered, CalendarDays, User, Filter, AlignLeft
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'day' | 'week' | 'month';

// Constants for grid rendering
const START_HOUR = 7;
const END_HOUR = 20;
const HOURS_COUNT = END_HOUR - START_HOUR + 1;
const PIXELS_PER_HOUR = 96; 

export const Agenda: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  // Auto-switch to 'day' view on mobile
  const [view, setView] = useState<ViewMode>(window.innerWidth < 768 ? 'day' : 'week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
  
  // Filters
  const [selectedProfessional, setSelectedProfessional] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'general' | 'details'>('general');
  const [editingAppointment, setEditingAppointment] = useState<Partial<Appointment>>({});

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

  // Localization Helpers
  const weekDays = language === 'pt' 
    ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    : language === 'es'
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
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
    const end = new Date(start);
    end.setHours(hour + 1);
    
    openModal({
        start,
        end,
        type: 'consulta',
        modality: 'presencial',
        status: 'scheduled',
        color: '#6366f1',
        psychologistId: selectedProfessional !== 'all' ? selectedProfessional : MOCK_USERS[0].id,
    });
  };

  const handleEventClick = (e: React.MouseEvent, apt: Appointment) => {
      e.stopPropagation();
      openModal(apt);
  };

  const openModal = (data: Partial<Appointment>) => {
      setEditingAppointment(data);
      setModalTab('general');
      setIsModalOpen(true);
  };

  const handleSave = () => {
      if (!editingAppointment.start || !editingAppointment.end) return;
      
      let finalTitle = editingAppointment.title;
      if (editingAppointment.type === 'consulta' && editingAppointment.patientName) {
          finalTitle = editingAppointment.patientName;
      } else if (editingAppointment.type === 'bloqueio') {
          finalTitle = 'Bloqueio';
      } else if (!finalTitle) {
          finalTitle = 'Agendamento';
      }

      // Default colors if not set
      let finalColor = editingAppointment.color;
      if (!finalColor) {
          if (editingAppointment.type === 'bloqueio') finalColor = '#94a3b8'; // Slate
          else if (editingAppointment.modality === 'online') finalColor = '#3b82f6'; // Blue
          else finalColor = '#6366f1'; // Indigo
      }

      const psych = MOCK_USERS.find(u => u.id === editingAppointment.psychologistId) || MOCK_USERS[0];
      
      const newApt: Appointment = {
          ...editingAppointment,
          id: editingAppointment.id || Math.random().toString(36).substr(2, 9),
          title: finalTitle,
          psychologistId: psych.id,
          psychologistName: psych.name,
          color: finalColor,
          // ... recurrence logic simplified for brevity in this refactor
      } as Appointment;

      if (editingAppointment.id) {
          setAppointments(prev => prev.map(a => a.id === newApt.id ? newApt : a));
      } else {
          setAppointments(prev => [...prev, newApt]);
      }
      setIsModalOpen(false);
  };

  const handleDelete = () => {
      if(window.confirm('Excluir agendamento?')) {
          setAppointments(prev => prev.filter(a => a.id !== editingAppointment.id));
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
      
      // If time is out of bounds
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
        
        {/* MOBILE DAY LIST VIEW (For very small screens or simple day usage) */}
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
                                    {apt.type === 'consulta' ? 'Consulta' : 'Outro'}
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

        {/* MONTH VIEW (Simplified) */}
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

                      return (
                          <div 
                            key={i} 
                            className={`bg-white p-2 min-h-[120px] flex flex-col transition-colors hover:bg-slate-50 cursor-pointer border-t border-slate-50 ${!isCurrentMonth ? 'bg-slate-50/30' : ''}`}
                            onClick={() => { setCurrentDate(d); setView('day'); }}
                          >
                              <div className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1 self-end ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>
                                  {d.getDate()}
                              </div>
                              <div className="space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                                  {dayEvents.slice(0, 4).map(ev => (
                                      <div key={ev.id} className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate flex items-center gap-1" style={{ backgroundColor: ev.color ? `${ev.color}20` : '#f1f5f9', color: ev.color || '#475569' }}>
                                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: ev.color || '#94a3b8' }}></div>
                                          {ev.title}
                                      </div>
                                  ))}
                                  {dayEvents.length > 4 && <span className="text-[10px] text-slate-400 pl-1">+ {dayEvents.length - 4} mais</span>}
                              </div>
                          </div>
                      );
                  })}
               </div>
            </div>
        )}
      </div>

      {/* --- APPOINTMENT MODAL (FULL SCREEN ON MOBILE) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white w-full md:max-w-[550px] md:rounded-[28px] rounded-t-[28px] shadow-2xl animate-[slideUpFade_0.3s_ease-out] overflow-hidden flex flex-col h-[90vh] md:h-auto md:max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <h3 className="text-lg font-bold text-slate-800">
                        {editingAppointment.id ? 'Editar Agendamento' : 'Novo Agendamento'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    {/* Basic Info Inputs */}
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Paciente / Título</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    className="w-full pl-11 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
                                    placeholder="Nome do paciente..."
                                    value={editingAppointment.title || ''}
                                    onChange={e => setEditingAppointment({...editingAppointment, title: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Data</label>
                                <input 
                                    type="date" 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-sm"
                                    value={editingAppointment.start?.toISOString().split('T')[0]}
                                    onChange={(e) => {
                                        const d = new Date(e.target.value);
                                        if (editingAppointment.start) {
                                            d.setHours(editingAppointment.start.getHours(), editingAppointment.start.getMinutes());
                                        }
                                        setEditingAppointment(prev => ({...prev, start: d, end: new Date(d.getTime() + 60*60*1000) }));
                                    }}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Hora</label>
                                <input 
                                    type="time" 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-sm"
                                    value={editingAppointment.start?.toTimeString().slice(0,5)}
                                    onChange={(e) => {
                                        const [h, m] = e.target.value.split(':').map(Number);
                                        const d = new Date(editingAppointment.start!);
                                        d.setHours(h, m);
                                        setEditingAppointment(prev => ({...prev, start: d, end: new Date(d.getTime() + 60*60*1000) }));
                                    }}
                                />
                            </div>
                        </div>

                        {/* Types */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Tipo & Modalidade</label>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setEditingAppointment({...editingAppointment, modality: 'presencial'})}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${editingAppointment.modality === 'presencial' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                    Presencial
                                </button>
                                <button 
                                    onClick={() => setEditingAppointment({...editingAppointment, modality: 'online'})}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${editingAppointment.modality === 'online' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                    Online
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50 shrink-0 safe-area-pb">
                    {editingAppointment.id && (
                        <button onClick={handleDelete} className="p-3 bg-white border border-slate-200 text-red-500 rounded-xl hover:bg-red-50">
                            <Trash2 size={20} />
                        </button>
                    )}
                    <button onClick={handleSave} className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">
                        Salvar Agendamento
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
