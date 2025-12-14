
import React, { useState, useEffect, useMemo } from 'react';
import { MOCK_APPOINTMENTS, MOCK_PATIENTS, MOCK_USERS } from '../constants';
import { Appointment, AppointmentType, AppointmentModality, UserRole, AppointmentStatus } from '../types';
import { 
  ChevronLeft, ChevronRight, Clock, Plus, Video, MapPin, 
  Calendar as CalendarIcon, MoreVertical, X, Check, Lock, User, Link as LinkIcon, 
  Search, ExternalLink, Filter, Repeat, AlertCircle, Trash2, Edit3, CheckCircle,
  AlignLeft, Palette, ChevronDown, ListOrdered, CalendarDays
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'day' | 'week' | 'month';

// Constants for grid rendering
const START_HOUR = 7;
const END_HOUR = 20;
const HOURS_COUNT = END_HOUR - START_HOUR + 1;
const PIXELS_PER_HOUR = 96; // Height of one hour slot

export const Agenda: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
  
  // Filters
  const [selectedProfessional, setSelectedProfessional] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'general' | 'details'>('general');
  const [selectedSlot, setSelectedSlot] = useState<{start: Date, end: Date} | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Partial<Appointment>>({});

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

  const handleToday = () => setCurrentDate(new Date());

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
        recurrence: 'none',
        recurrenceEndType: 'count', // Default to count
        recurrenceEndValue: 1 // Default to 1 (itself)
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
      
      // Determine title if not set
      let finalTitle = editingAppointment.title;
      if (editingAppointment.type === 'consulta' && editingAppointment.patientName) {
          finalTitle = editingAppointment.patientName; // Simplified logic
      } else if (editingAppointment.type === 'bloqueio') {
          finalTitle = 'Bloqueio';
      } else if (!finalTitle) {
          finalTitle = 'Sem título';
      }

      const psych = MOCK_USERS.find(u => u.id === editingAppointment.psychologistId) || MOCK_USERS[0];
      const recurrenceGroupId = Math.random().toString(36).substr(2, 9);

      // --- RECURRENCE LOGIC ---
      const newAppointments: Appointment[] = [];
      const isRecurring = editingAppointment.recurrence && editingAppointment.recurrence !== 'none';
      
      let loopCount = 0;
      let targetDate = new Date(editingAppointment.start);
      let durationMinutes = (editingAppointment.end.getTime() - editingAppointment.start.getTime()) / (1000 * 60);

      // Limits
      const maxOccurrences = isRecurring && editingAppointment.recurrenceEndType === 'count' ? Number(editingAppointment.recurrenceEndValue) : 1;
      const endDateLimit = isRecurring && editingAppointment.recurrenceEndType === 'date' ? new Date(editingAppointment.recurrenceEndValue as string) : null;

      // Always create at least one (the original)
      // If recurrenceEndType is 'count', loop maxOccurrences times
      // If recurrenceEndType is 'date', loop until targetDate > endDateLimit
      
      while (true) {
          // Break condition based on Count
          if (editingAppointment.recurrenceEndType === 'count' && loopCount >= maxOccurrences) break;
          // Break condition based on Date
          if (editingAppointment.recurrenceEndType === 'date' && endDateLimit && targetDate > endDateLimit) break;
          // Safety break
          if (!isRecurring && loopCount >= 1) break;
          if (loopCount > 52) break; // Hard limit for demo to prevent infinite loops

          const aptStart = new Date(targetDate);
          const aptEnd = new Date(targetDate);
          aptEnd.setMinutes(aptStart.getMinutes() + durationMinutes);

          const newApt: Appointment = {
              ...editingAppointment,
              id: editingAppointment.id && loopCount === 0 ? editingAppointment.id : Math.random().toString(36).substr(2, 9), // Keep ID for edit of single, new ID for series
              title: finalTitle,
              psychologistId: psych.id,
              psychologistName: psych.name,
              status: editingAppointment.status || 'scheduled',
              type: editingAppointment.type || 'consulta',
              modality: editingAppointment.modality || 'presencial',
              start: aptStart,
              end: aptEnd,
              recurrenceGroupId: isRecurring ? (editingAppointment.recurrenceGroupId || recurrenceGroupId) : undefined
          } as Appointment;

          newAppointments.push(newApt);

          // Increment Date for next loop
          loopCount++;
          if (!isRecurring) break;

          if (editingAppointment.recurrence === 'weekly') {
              targetDate.setDate(targetDate.getDate() + 7);
          } else if (editingAppointment.recurrence === 'biweekly') {
              targetDate.setDate(targetDate.getDate() + 14);
          } else if (editingAppointment.recurrence === 'monthly') {
              targetDate.setMonth(targetDate.getMonth() + 1);
          }
      }

      if (editingAppointment.id && !isRecurring) {
          // Editing a single existing appointment without creating recurrence
          setAppointments(prev => prev.map(a => a.id === newAppointments[0].id ? newAppointments[0] : a));
      } else {
          // Creating new or multiple
          setAppointments(prev => [...prev, ...newAppointments]);
      }
      setIsModalOpen(false);
  };

  const handleDelete = () => {
      if(window.confirm('Tem certeza que deseja cancelar/excluir este agendamento?')) {
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

      // Color logic based on status/type
      let bgColor = 'bg-indigo-100 border-indigo-200 text-indigo-800';
      
      if (apt.status === 'completed') bgColor = 'bg-slate-100 border-slate-200 text-slate-500 line-through decoration-slate-400';
      else if (apt.status === 'confirmed') bgColor = 'bg-emerald-100 border-emerald-200 text-emerald-800';
      else if (apt.status === 'cancelled') bgColor = 'bg-red-50 border-red-100 text-red-400';
      else if (apt.type === 'bloqueio') bgColor = 'bg-gray-100 border-gray-200 text-gray-500 diagonal-stripes';
      else if (apt.modality === 'online') bgColor = 'bg-sky-100 border-sky-200 text-sky-800';
      
      // Override with custom color if set
      const style = {
          top: `${top}px`,
          height: `${Math.max(height, 24)}px`, // Minimum height
          backgroundColor: apt.color ? `${apt.color}20` : undefined, // 20% opacity hex
          borderColor: apt.color,
          color: apt.color
      };

      return { style, className: `absolute left-1 right-1 rounded-lg border-l-4 px-2 py-1 text-xs shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group z-10 ${!apt.color ? bgColor : ''}` };
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-[24px] shadow-2xl shadow-indigo-100/50 border border-slate-200 overflow-hidden font-sans animate-fadeIn">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col xl:flex-row items-center justify-between p-4 border-b border-slate-200 gap-4 bg-white z-20">
        
        {/* Left: Date Nav */}
        <div className="flex items-center gap-4 w-full xl:w-auto">
          <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200 shadow-sm">
            <button onClick={handlePrev} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 hover:text-indigo-600 transition-all"><ChevronLeft size={18} /></button>
            <button onClick={handleToday} className="px-4 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-indigo-600">Hoje</button>
            <button onClick={handleNext} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 hover:text-indigo-600 transition-all"><ChevronRight size={18} /></button>
          </div>
          <h2 className="text-xl font-display font-bold text-slate-800 capitalize min-w-[180px]">
             {currentDate.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', { month: 'long', year: 'numeric' })}
          </h2>
        </div>

        {/* Center: Professional Filter */}
        <div className="relative group w-full md:w-64 xl:w-72">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <User size={16} />
            </div>
            <select 
                value={selectedProfessional}
                onChange={(e) => setSelectedProfessional(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all cursor-pointer appearance-none"
            >
                <option value="all">Todos os Profissionais</option>
                {MOCK_USERS.filter(u => u.role === UserRole.PSYCHOLOGIST).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                ))}
            </select>
            <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Right: View Modes & Action */}
        <div className="flex items-center gap-3 w-full xl:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 flex-1 xl:flex-none justify-center">
                {['day', 'week', 'month'].map(v => (
                    <button 
                        key={v}
                        onClick={() => setView(v as ViewMode)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${view === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {t(`agenda.${v}`)}
                    </button>
                ))}
            </div>
            
            <button 
                onClick={() => {
                    const now = new Date();
                    now.setMinutes(0);
                    handleSlotClick(now, now.getHours());
                }}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white w-10 h-10 xl:w-auto xl:h-auto xl:px-5 xl:py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
            >
                <Plus size={20} /> <span className="hidden xl:inline">{t('agenda.schedule')}</span>
            </button>
        </div>
      </div>

      {/* --- CALENDAR BODY --- */}
      <div className="flex-1 overflow-y-auto relative bg-white scroll-smooth custom-scrollbar">
        
        {/* WEEK & DAY VIEW */}
        {(view === 'week' || view === 'day') && (
            <div className="flex min-h-[1000px] relative">
                
                {/* Time Axis */}
                <div className="w-16 flex-shrink-0 border-r border-slate-100 bg-white sticky left-0 z-20">
                    <div className="h-14 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-30"></div>
                    {hours.map(hour => (
                    <div key={hour} className="text-xs font-bold text-slate-400 text-right pr-3 relative" style={{ height: `${PIXELS_PER_HOUR}px` }}>
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
                            <div className={`h-14 border-b border-slate-100 sticky top-0 z-20 flex flex-col items-center justify-center transition-colors ${isToday ? 'bg-indigo-50/80 backdrop-blur-sm' : 'bg-white/90 backdrop-blur-sm'}`}>
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
                                        <div 
                                            key={apt.id}
                                            className={className}
                                            style={style}
                                            onClick={(e) => handleEventClick(e, apt)}
                                        >
                                            <div className="font-bold truncate leading-tight text-[11px] mb-0.5">{apt.title}</div>
                                            <div className="flex items-center gap-1 opacity-80 text-[10px]">
                                                {apt.modality === 'online' ? <Video size={10} /> : <MapPin size={10} />}
                                                <span>{apt.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {apt.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            {/* Status Indicator */}
                                            {apt.status === 'confirmed' && <div className="absolute top-1 right-1 text-emerald-600"><CheckCircle size={12} /></div>}
                                            {/* Recurrence Indicator */}
                                            {apt.recurrenceGroupId && <div className="absolute bottom-1 right-1 text-indigo-600"><Repeat size={10} /></div>}
                                        </div>
                                    );
                                })}

                                {/* Current Time Line */}
                                {isToday && (
                                    <div 
                                        className="absolute left-0 right-0 border-t-2 border-red-500 z-30 pointer-events-none flex items-center"
                                        style={{ top: `${(new Date().getHours() - START_HOUR + new Date().getMinutes()/60) * PIXELS_PER_HOUR}px` }}
                                    >
                                        <div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );})}
                </div>
            </div>
        )}

        {/* MONTH VIEW */}
        {view === 'month' && (
            <div className="p-4 h-full">
               <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-2xl overflow-hidden h-full">
                  {weekDays.map(d => <div key={d} className="bg-slate-50 text-center font-bold text-slate-400 uppercase text-xs py-2">{d}</div>)}
                  
                  {Array.from({length: 42}, (_, i) => {
                      const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                      d.setDate(d.getDate() - d.getDay() + i);
                      const isToday = d.toDateString() === new Date().toDateString();
                      const isCurrentMonth = d.getMonth() === currentDate.getMonth();
                      const dayEvents = getDayEvents(d);

                      return (
                          <div 
                            key={i} 
                            className={`bg-white p-2 min-h-[100px] flex flex-col transition-colors hover:bg-slate-50 cursor-pointer ${!isCurrentMonth ? 'bg-slate-50/30' : ''}`}
                            onClick={() => { setCurrentDate(d); setView('day'); }}
                          >
                              <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 self-end ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>
                                  {d.getDate()}
                              </div>
                              <div className="space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                                  {dayEvents.map(ev => (
                                      <div key={ev.id} className="text-[9px] font-bold px-1.5 py-0.5 rounded truncate border-l-2 border-indigo-500 bg-indigo-50 text-indigo-700">
                                          {ev.title}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      );
                  })}
               </div>
            </div>
        )}
      </div>

      {/* --- APPOINTMENT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white w-full max-w-[550px] rounded-[28px] shadow-2xl animate-[slideUpFade_0.3s_ease-out] overflow-hidden flex flex-col max-h-[90vh] font-sans">
                
                {/* Header */}
                <div className="px-8 pt-8 pb-2 flex justify-between items-center bg-white">
                    <h3 className="text-xl font-display font-bold text-slate-800 tracking-tight">
                        {editingAppointment.id ? 'Editar Agendamento' : 'Novo Agendamento'}
                    </h3>
                    <button 
                        onClick={() => setIsModalOpen(false)} 
                        className="p-2 -mr-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-8 border-b border-slate-100">
                    <button 
                        onClick={() => setModalTab('general')} 
                        className={`pb-3 mr-6 text-sm font-bold border-b-2 transition-all ${modalTab === 'general' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Geral
                    </button>
                    <button 
                        onClick={() => setModalTab('details')} 
                        className={`pb-3 text-sm font-bold border-b-2 transition-all ${modalTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Detalhes & Notas
                    </button>
                </div>
                
                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
                    
                    {modalTab === 'general' ? (
                        <>
                            {/* Type Toggle */}
                            <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                                {['consulta', 'bloqueio', 'pessoal'].map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => setEditingAppointment({...editingAppointment, type: t as AppointmentType})}
                                        className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wide rounded-lg transition-all ${editingAppointment.type === t ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {t === 'consulta' ? 'Consulta' : t === 'bloqueio' ? 'Bloqueio' : 'Pessoal'}
                                    </button>
                                ))}
                            </div>

                            {/* Patient Search */}
                            {editingAppointment.type === 'consulta' && (
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('agenda.patient')}</label>
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                        <select 
                                            value={editingAppointment.patientId || ''}
                                            onChange={(e) => {
                                                const p = MOCK_PATIENTS.find(pat => pat.id === e.target.value);
                                                setEditingAppointment({...editingAppointment, patientId: p?.id, patientName: p?.name, title: p?.name});
                                            }}
                                            className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 font-medium text-slate-700 appearance-none transition-all cursor-pointer text-sm"
                                        >
                                            <option value="">Selecione um paciente...</option>
                                            {MOCK_PATIENTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                    </div>
                                </div>
                            )}

                            {/* Title (if not patient) */}
                            {editingAppointment.type !== 'consulta' && (
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Título</label>
                                    <div className="relative group">
                                        <AlignLeft className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                        <input 
                                            type="text" 
                                            value={editingAppointment.title || ''}
                                            onChange={(e) => setEditingAppointment({...editingAppointment, title: e.target.value})}
                                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 font-medium transition-all text-sm"
                                            placeholder="Ex: Almoço, Reunião..."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Date Only - Full Width */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('agenda.date')}</label>
                                <div className="relative group">
                                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                    <input 
                                        type="date" 
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 font-medium text-slate-700 transition-all cursor-pointer text-sm"
                                        value={editingAppointment.start?.toISOString().split('T')[0]}
                                        onChange={(e) => {
                                            const d = new Date(e.target.value);
                                            // Preserve time
                                            if (editingAppointment.start) {
                                                d.setHours(editingAppointment.start.getHours());
                                                d.setMinutes(editingAppointment.start.getMinutes());
                                            }
                                            
                                            // Update End Date as well to keep same day
                                            let newEnd = editingAppointment.end ? new Date(editingAppointment.end) : new Date(d);
                                            if (editingAppointment.end) {
                                                newEnd = new Date(d);
                                                newEnd.setHours(editingAppointment.end.getHours());
                                                newEnd.setMinutes(editingAppointment.end.getMinutes());
                                            }

                                            setEditingAppointment({...editingAppointment, start: d, end: newEnd});
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Time Row - Start & End */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Início</label>
                                    <div className="relative group">
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                        <input 
                                            type="time" 
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 font-medium text-slate-700 transition-all text-sm"
                                            value={editingAppointment.start?.toTimeString().slice(0,5)}
                                            onChange={(e) => {
                                                const [h, m] = e.target.value.split(':').map(Number);
                                                const d = new Date(editingAppointment.start!);
                                                d.setHours(h, m);
                                                setEditingAppointment({...editingAppointment, start: d});
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fim</label>
                                    <div className="relative group">
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                        <input 
                                            type="time" 
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 font-medium text-slate-700 transition-all text-sm"
                                            value={editingAppointment.end?.toTimeString().slice(0,5)}
                                            onChange={(e) => {
                                                const [h, m] = e.target.value.split(':').map(Number);
                                                const d = new Date(editingAppointment.end!);
                                                d.setHours(h, m);
                                                setEditingAppointment({...editingAppointment, end: d});
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Status & Modality */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                                    <div className="relative group">
                                        <select 
                                            value={editingAppointment.status} 
                                            onChange={(e) => setEditingAppointment({...editingAppointment, status: e.target.value as any})}
                                            className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 appearance-none outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all cursor-pointer text-sm"
                                        >
                                            <option value="scheduled">Agendado</option>
                                            <option value="confirmed">Confirmado</option>
                                            <option value="completed">Realizado</option>
                                            <option value="cancelled">Cancelado</option>
                                            <option value="no-show">Não compareceu</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('agenda.modality')}</label>
                                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                                        <button onClick={() => setEditingAppointment({...editingAppointment, modality: 'presencial'})} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${editingAppointment.modality === 'presencial' ? 'bg-white text-indigo-700 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}><MapPin size={14} /> Presencial</button>
                                        <button onClick={() => setEditingAppointment({...editingAppointment, modality: 'online'})} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${editingAppointment.modality === 'online' ? 'bg-white text-indigo-700 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}><Video size={14} /> Online</button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Color Picker */}
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Palette size={14} /> Cor do Evento</label>
                                <div className="flex gap-3">
                                    {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#64748b'].map(color => (
                                        <button 
                                            key={color} 
                                            onClick={() => setEditingAppointment({...editingAppointment, color})}
                                            className={`w-10 h-10 rounded-full transition-all flex items-center justify-center relative ${editingAppointment.color === color ? 'scale-110 shadow-md ring-2 ring-offset-2 ring-slate-200' : 'hover:scale-105'}`}
                                            style={{ backgroundColor: color }}
                                        >
                                            {editingAppointment.color === color && <Check className="text-white drop-shadow-md" size={16} strokeWidth={3} />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Recurrence Configuration */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Padrão de Repetição</label>
                                    <div className="relative group">
                                        <Repeat className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                        <select 
                                            value={editingAppointment.recurrence || 'none'}
                                            onChange={(e) => setEditingAppointment({...editingAppointment, recurrence: e.target.value as any})}
                                            className="w-full pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-xl outline-none font-medium text-slate-700 appearance-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all cursor-pointer text-sm"
                                        >
                                            <option value="none">Não se repete</option>
                                            <option value="weekly">Semanalmente</option>
                                            <option value="biweekly">Quinzenalmente</option>
                                            <option value="monthly">Mensalmente</option>
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                    </div>
                                </div>

                                {/* Conditional Recurrence Settings */}
                                {editingAppointment.recurrence && editingAppointment.recurrence !== 'none' && (
                                    <div className="grid grid-cols-2 gap-4 animate-[fadeIn_0.3s_ease-out]">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Termina em</label>
                                            <select 
                                                value={editingAppointment.recurrenceEndType || 'count'}
                                                onChange={(e) => setEditingAppointment({...editingAppointment, recurrenceEndType: e.target.value as any, recurrenceEndValue: e.target.value === 'count' ? 10 : new Date().toISOString().split('T')[0]})}
                                                className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none font-medium text-slate-700 text-sm"
                                            >
                                                <option value="count">Quantidade de vezes</option>
                                                <option value="date">Data específica</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                {editingAppointment.recurrenceEndType === 'date' ? 'Data Final' : 'Ocorrências'}
                                            </label>
                                            <div className="relative">
                                                {editingAppointment.recurrenceEndType === 'date' ? (
                                                    <>
                                                        <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input 
                                                            type="date"
                                                            value={editingAppointment.recurrenceEndValue as string || ''}
                                                            onChange={(e) => setEditingAppointment({...editingAppointment, recurrenceEndValue: e.target.value})}
                                                            className="w-full pl-9 p-3 bg-white border border-slate-200 rounded-xl outline-none font-medium text-slate-700 text-sm"
                                                        />
                                                    </>
                                                ) : (
                                                    <>
                                                        <ListOrdered size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input 
                                                            type="number"
                                                            min="1"
                                                            max="52"
                                                            value={editingAppointment.recurrenceEndValue as number || 1}
                                                            onChange={(e) => setEditingAppointment({...editingAppointment, recurrenceEndValue: parseInt(e.target.value)})}
                                                            className="w-full pl-9 p-3 bg-white border border-slate-200 rounded-xl outline-none font-medium text-slate-700 text-sm"
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Observações Internas</label>
                                <textarea 
                                    value={editingAppointment.notes || ''}
                                    onChange={(e) => setEditingAppointment({...editingAppointment, notes: e.target.value})}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 resize-none h-32 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all text-sm leading-relaxed"
                                    placeholder="Detalhes sobre a sessão..."
                                />
                            </div>

                            {/* Online Link */}
                            {editingAppointment.modality === 'online' && (
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Link da Videochamada</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1 group">
                                            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={18} />
                                            <input 
                                                type="text" 
                                                value={editingAppointment.meetingUrl || ''}
                                                onChange={(e) => setEditingAppointment({...editingAppointment, meetingUrl: e.target.value})}
                                                className="w-full pl-12 pr-4 py-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl outline-none font-medium text-emerald-800 placeholder:text-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition-all text-sm"
                                                placeholder="https://meet..."
                                            />
                                        </div>
                                        <button className="p-3.5 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-200 transition-colors" title="Gerar Link">
                                            <Video size={20} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-white flex justify-between gap-4">
                    {editingAppointment.id ? (
                        <button onClick={handleDelete} className="p-3.5 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 transition-colors shadow-sm"><Trash2 size={20} /></button>
                    ) : <div></div>}
                    
                    <div className="flex gap-3">
                        <button onClick={() => setIsModalOpen(false)} className="px-6 py-3.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-sm">Cancelar</button>
                        <button onClick={handleSave} className="px-8 py-3.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm">
                            <Check size={18} strokeWidth={3} /> Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
