import React, { useState, useEffect } from 'react';
import { MOCK_APPOINTMENTS, MOCK_PATIENTS, MOCK_USERS } from '../constants';
import { Appointment, AppointmentType, AppointmentModality, UserRole } from '../types';
import { 
  ChevronLeft, ChevronRight, Clock, Plus, Video, MapPin, 
  Calendar as CalendarIcon, MoreVertical, X, Check, Lock, User, Link as LinkIcon, Search, ExternalLink
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'day' | 'week' | 'month';

export const Agenda: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{start: Date, end: Date} | null>(null);
  
  // New Appointment Form State
  const [formData, setFormData] = useState<Partial<Appointment>>({
    type: 'consulta',
    modality: 'presencial',
    status: 'scheduled',
    psychologistId: MOCK_USERS[0].id // Default to first doctor
  });

  const weekDays = language === 'pt' 
    ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    : language === 'es'
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calendar Logic (unchanged)
  const startHour = 8;
  const endHour = 19;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Adjust when day is sunday
    return new Date(d.setDate(diff));
  };

  const currentWeekStart = getStartOfWeek(currentDate);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

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

  const handleSlotClick = (date: Date, hour: number) => {
    const start = new Date(date);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1);
    
    setSelectedSlot({ start, end });
    setFormData({
        ...formData,
        start,
        end,
        type: 'consulta',
        modality: 'presencial',
        title: '',
        patientId: ''
    });
    setIsModalOpen(true);
  };

  const handleJoinRoom = (e: React.MouseEvent, appointmentId: string) => {
      e.stopPropagation();
      navigate(`/meeting/${appointmentId}`);
  };

  const handleSaveAppointment = () => {
    if (!formData.start || !formData.end || !formData.title) return;
    
    const psych = MOCK_USERS.find(u => u.id === formData.psychologistId);
    
    const newAppt: Appointment = {
        id: Math.random().toString(36).substr(2, 9),
        start: formData.start,
        end: formData.end,
        title: formData.type === 'bloqueio' ? 'Bloqueio' : formData.title,
        patientId: formData.patientId || '',
        patientName: formData.title,
        psychologistId: formData.psychologistId!,
        psychologistName: psych?.name || 'Profissional',
        status: 'scheduled',
        type: formData.type as AppointmentType,
        modality: formData.modality as AppointmentModality,
        meetingUrl: formData.meetingUrl,
        color: formData.type === 'bloqueio' 
            ? 'bg-slate-100 border-slate-300 text-slate-500' 
            : formData.modality === 'online' 
                ? 'bg-emerald-100 border-emerald-200 text-emerald-700'
                : 'bg-indigo-100 border-indigo-200 text-indigo-700'
    };

    setAppointments([...appointments, newAppt]);
    setIsModalOpen(false);
  };

  const generateMeetingLink = () => {
    const randomId = Math.random().toString(36).substring(7);
    setFormData(prev => ({ ...prev, meetingUrl: `https://meet.google.com/${randomId}` }));
  };

  const getDayEvents = (date: Date) => {
    return appointments.filter(a => 
      a.start.getDate() === date.getDate() && 
      a.start.getMonth() === date.getMonth() && 
      a.start.getFullYear() === date.getFullYear()
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-xl shadow-indigo-100/50 border border-slate-200 overflow-hidden font-sans animate-fadeIn">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row items-center justify-between p-4 border-b border-slate-200 gap-4 bg-white z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <CalendarIcon size={24} />
             </div>
             <h2 className="text-2xl font-display font-bold text-slate-800 capitalize">
                {currentDate.toLocaleString(language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })}
             </h2>
          </div>
          
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button onClick={handlePrev} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 hover:text-indigo-600 transition-all"><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-indigo-600">{t('agenda.today')}</button>
            <button onClick={handleNext} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 hover:text-indigo-600 transition-all"><ChevronRight size={20} /></button>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button 
                    onClick={() => setView('day')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${view === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {t('agenda.day')}
                </button>
                <button 
                    onClick={() => setView('week')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${view === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {t('agenda.week')}
                </button>
                <button 
                    onClick={() => setView('month')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${view === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {t('agenda.month')}
                </button>
            </div>
            
            <button 
                onClick={() => {
                    const now = new Date();
                    now.setMinutes(0);
                    handleSlotClick(now, now.getHours());
                }}
                className="ml-auto md:ml-0 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
            >
                <Plus size={18} /> <span className="hidden sm:inline">{t('agenda.schedule')}</span>
            </button>
        </div>
      </div>

      {/* --- CALENDAR BODY --- */}
      <div className="flex-1 overflow-y-auto relative bg-slate-50/50 scroll-smooth custom-scrollbar">
        
        {/* WEEK & DAY VIEW */}
        {(view === 'week' || view === 'day') && (
            <div className="flex min-h-[800px]">
                {/* Time Column */}
                <div className="w-16 flex-shrink-0 border-r border-slate-200 bg-white sticky left-0 z-10">
                    <div className="h-14 border-b border-slate-200 bg-slate-50"></div>
                    {hours.map(hour => (
                    <div key={hour} className="h-24 border-b border-slate-100 text-xs font-medium text-slate-400 text-right pr-3 pt-2 relative">
                        <span className="-translate-y-1/2 block">{hour}:00</span>
                    </div>
                    ))}
                </div>

                {/* Days Columns */}
                <div className="flex-1 flex min-w-[600px]">
                    {(view === 'day' ? [currentDate] : weekDates).map((date, idx) => {
                        const isToday = date.toDateString() === new Date().toDateString();
                        const dayEvents = getDayEvents(date);
                        
                        return (
                        <div key={idx} className="flex-1 border-r border-slate-200 last:border-r-0 min-w-[140px] relative group bg-white">
                            {/* Header */}
                            <div className={`h-14 border-b border-slate-200 sticky top-0 z-10 flex flex-col items-center justify-center bg-white ${isToday ? 'bg-indigo-50/50' : ''}`}>
                                <span className={`text-xs font-bold uppercase ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                                    {weekDays[date.getDay()]}
                                </span>
                                <div className={`w-8 h-8 flex items-center justify-center rounded-full text-lg font-bold mt-0.5 ${isToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-300' : 'text-slate-700'}`}>
                                    {date.getDate()}
                                </div>
                            </div>
                            
                            {/* Grid Lines */}
                            {hours.map(h => (
                                <div 
                                    key={h} 
                                    className="h-24 border-b border-slate-50 hover:bg-indigo-50/30 transition-colors cursor-pointer relative"
                                    onClick={() => handleSlotClick(date, h)}
                                >
                                    {/* Add Button on Hover */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 pointer-events-none">
                                        <Plus size={20} className="text-indigo-300" />
                                    </div>
                                </div>
                            ))}

                            {/* Current Time Indicator Line */}
                            {isToday && (
                                <div 
                                    className="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none flex items-center"
                                    style={{ top: `${(new Date().getHours() - startHour + new Date().getMinutes()/60) * 96 + 56}px` }}
                                >
                                    <div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div>
                                </div>
                            )}

                            {/* Events */}
                            {dayEvents.map(apt => {
                                const startH = apt.start.getHours() + apt.start.getMinutes()/60;
                                const endH = apt.end.getHours() + apt.end.getMinutes()/60;
                                const duration = endH - startH;
                                const top = (startH - startHour) * 96 + 56;
                                const height = duration * 96;

                                return (
                                    <div 
                                        key={apt.id}
                                        className={`absolute left-1 right-1 rounded-xl p-2.5 border shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all z-0 overflow-hidden ${apt.color} flex flex-col group/event`}
                                        style={{ top: `${top}px`, height: `${height - 4}px` }}
                                    >
                                        <div className="flex items-start justify-between mb-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 flex items-center gap-1">
                                                {apt.type === 'bloqueio' ? <Lock size={10} /> : (apt.modality === 'online' ? <Video size={10} /> : <MapPin size={10} />)}
                                                {apt.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                            {apt.modality === 'online' && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>}
                                        </div>
                                        <div className="font-bold text-sm leading-tight truncate">
                                            {apt.title}
                                        </div>
                                        {apt.psychologistName && (
                                            <div className="text-xs opacity-80 truncate mt-0.5 flex items-center gap-1">
                                                <User size={10} /> {apt.psychologistName}
                                            </div>
                                        )}
                                        
                                        {/* Join Room Button for Online Appts */}
                                        {apt.modality === 'online' && (
                                            <button 
                                                onClick={(e) => handleJoinRoom(e, apt.id)}
                                                className="absolute bottom-2 right-2 bg-emerald-500 text-white p-1.5 rounded-lg shadow-sm opacity-0 group-hover/event:opacity-100 transition-opacity hover:bg-emerald-600"
                                                title={t('agenda.join')}
                                            >
                                                <ExternalLink size={14} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );})}
                </div>
            </div>
        )}

        {/* MONTH VIEW (Simple Grid) */}
        {view === 'month' && (
            <div className="p-4">
               <div className="grid grid-cols-7 gap-4">
                  {weekDays.map(d => <div key={d} className="text-center font-bold text-slate-400 uppercase text-xs py-2">{d}</div>)}
                  
                  {Array.from({length: 35}, (_, i) => {
                      const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                      d.setDate(d.getDate() - d.getDay() + i);
                      const isToday = d.toDateString() === new Date().toDateString();
                      const isCurrentMonth = d.getMonth() === currentDate.getMonth();
                      const dayEvents = getDayEvents(d);

                      return (
                          <div 
                            key={i} 
                            className={`min-h-[120px] bg-white rounded-2xl border p-2 transition-colors ${isCurrentMonth ? 'border-slate-200' : 'bg-slate-50/50 border-slate-100 text-slate-400'}`}
                            onClick={() => { setCurrentDate(d); setView('day'); }}
                          >
                              <div className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mb-2 ${isToday ? 'bg-indigo-600 text-white' : ''}`}>
                                  {d.getDate()}
                              </div>
                              <div className="space-y-1.5">
                                  {dayEvents.map(ev => (
                                      <div key={ev.id} className={`text-[10px] font-bold px-2 py-1 rounded-md truncate border flex items-center justify-between ${ev.color}`}>
                                          <span>{ev.title}</span>
                                          {ev.modality === 'online' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
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

      {/* --- CREATE APPOINTMENT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white w-full max-w-lg rounded-[24px] shadow-2xl animate-[slideUpFade_0.3s_ease-out] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                    <h3 className="text-xl font-display font-bold text-slate-800">{t('agenda.new')}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    
                    {/* Type Selector */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button 
                            onClick={() => setFormData({...formData, type: 'consulta'})}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.type === 'consulta' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                        >
                            {t('agenda.consultation')}
                        </button>
                        <button 
                            onClick={() => setFormData({...formData, type: 'bloqueio'})}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${formData.type === 'bloqueio' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'}`}
                        >
                            {t('agenda.block')}
                        </button>
                    </div>

                    {formData.type === 'consulta' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('agenda.patient')}</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder={t('common.search')} 
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium"
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('agenda.date')}</label>
                            <input 
                                type="date" 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-600"
                                value={formData.start?.toISOString().split('T')[0]}
                                disabled
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('agenda.time')}</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="time" 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-600"
                                    value={formData.start?.toTimeString().slice(0,5)}
                                    onChange={(e) => {
                                        const [h, m] = e.target.value.split(':');
                                        const newStart = new Date(formData.start!);
                                        newStart.setHours(parseInt(h), parseInt(m));
                                        setFormData({...formData, start: newStart});
                                    }}
                                />
                                <span className="text-slate-400">-</span>
                                <input 
                                    type="time" 
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-600"
                                    value={formData.end?.toTimeString().slice(0,5)}
                                    onChange={(e) => {
                                        const [h, m] = e.target.value.split(':');
                                        const newEnd = new Date(formData.end!);
                                        newEnd.setHours(parseInt(h), parseInt(m));
                                        setFormData({...formData, end: newEnd});
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('agenda.professional')}</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select 
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none appearance-none font-medium text-slate-600 cursor-pointer focus:ring-2 focus:ring-indigo-100"
                                value={formData.psychologistId}
                                onChange={(e) => setFormData({...formData, psychologistId: e.target.value})}
                            >
                                {MOCK_USERS.filter(u => u.role === UserRole.PSYCHOLOGIST).map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                            <ChevronLeft className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 -rotate-90" size={16} />
                        </div>
                    </div>

                    {formData.type === 'consulta' && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('agenda.modality')}</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => setFormData({...formData, modality: 'presencial'})}
                                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold transition-all ${formData.modality === 'presencial' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <MapPin size={18} /> {t('agenda.presential')}
                                    </button>
                                    <button 
                                        onClick={() => setFormData({...formData, modality: 'online'})}
                                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold transition-all ${formData.modality === 'online' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <Video size={18} /> {t('agenda.online')}
                                    </button>
                                </div>
                            </div>

                            {formData.modality === 'online' && (
                                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 animate-fadeIn">
                                    <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">{t('agenda.link')}</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" size={16} />
                                            <input 
                                                type="text" 
                                                placeholder="Link..." 
                                                value={formData.meetingUrl || ''}
                                                onChange={(e) => setFormData({...formData, meetingUrl: e.target.value})}
                                                className="w-full pl-10 pr-4 py-3 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-100 outline-none text-emerald-800 placeholder:text-emerald-300 font-medium"
                                            />
                                        </div>
                                        <button 
                                            onClick={generateMeetingLink}
                                            className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm shadow-emerald-200"
                                            title={t('agenda.generateLink')}
                                        >
                                            <Video size={20} />
                                        </button>
                                    </div>
                                    <div className="mt-3 flex justify-end">
                                        <button className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1">
                                            {t('agenda.join')} <ExternalLink size={12} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 mt-auto">
                    <button 
                        onClick={() => setIsModalOpen(false)} 
                        className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                        {t('agenda.cancel')}
                    </button>
                    <button 
                        onClick={handleSaveAppointment}
                        className="px-8 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                    >
                        <Check size={18} /> {t('agenda.confirm')}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
