
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Calendar, Clock, Copy, ArrowRight, Link as LinkIcon, Plus, History, Play } from 'lucide-react';
import { MOCK_APPOINTMENTS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

export const VirtualRooms: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState('');

  // Filter only online appointments that are scheduled
  const upcomingMeetings = MOCK_APPOINTMENTS.filter(
    app => app.modality === 'online' && app.status === 'scheduled'
  ).sort((a, b) => a.start.getTime() - b.start.getTime());

  const handleInstantMeeting = () => {
    const randomId = Math.random().toString(36).substr(2, 9);
    navigate(`/meeting/${randomId}`);
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (meetingCode.trim()) {
      navigate(`/meeting/${meetingCode}`);
    }
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-indigo-900/20 border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 opacity-90"></div>
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <Video size={14} />
                    <span>Sala Virtual</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">{t('rooms.title')}</h1>
                <p className="text-indigo-200 text-lg leading-relaxed max-w-xl">
                    {t('rooms.subtitle')}
                </p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: ACTIONS */}
          <div className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={handleInstantMeeting}
                    className="flex flex-col items-start p-6 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl shadow-lg shadow-indigo-200 text-white hover:scale-[1.02] transition-transform group"
                  >
                      <div className="p-3 bg-white/20 rounded-xl mb-4 group-hover:bg-white/30 transition-colors">
                          <Plus size={24} />
                      </div>
                      <h3 className="text-lg font-bold mb-1">{t('rooms.instant')}</h3>
                      <p className="text-indigo-100 text-sm text-left">{t('rooms.instantDesc')}</p>
                  </button>

                  <button 
                    onClick={() => navigate('/agenda')}
                    className="flex flex-col items-start p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group"
                  >
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl mb-4 group-hover:bg-indigo-100 transition-colors">
                          <Calendar size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">{t('rooms.schedule')}</h3>
                      <p className="text-slate-500 text-sm text-left">{t('rooms.scheduleDesc')}</p>
                  </button>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-700 mb-4">{t('rooms.enterCode')}</h3>
                  <form onSubmit={handleJoinByCode} className="flex gap-3">
                      <div className="relative flex-1">
                          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="text" 
                            placeholder="abc-def-ghi" 
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 font-medium text-slate-700"
                            value={meetingCode}
                            onChange={(e) => setMeetingCode(e.target.value)}
                          />
                      </div>
                      <button 
                        type="submit"
                        disabled={!meetingCode}
                        className="px-6 py-3 bg-slate-800 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                      >
                          {t('rooms.join')}
                      </button>
                  </form>
              </div>

              {/* History Preview */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2"><History size={18} /> {t('rooms.history')}</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                      {[1, 2, 3].map((i) => (
                          <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                              <div>
                                  <div className="text-sm font-bold text-slate-700">Reunião de Acompanhamento</div>
                                  <div className="text-xs text-slate-400">Ontem • 14:30</div>
                              </div>
                              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">Finalizada</span>
                          </div>
                      ))}
                  </div>
              </div>

          </div>

          {/* RIGHT: UPCOMING */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
              <div className="p-6 border-b border-slate-100">
                  <h3 className="font-display font-bold text-xl text-slate-800">{t('rooms.upcoming')}</h3>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-4">
                  {upcomingMeetings.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                          <Calendar size={48} className="opacity-20 mb-4" />
                          <p>{t('rooms.noUpcoming')}</p>
                      </div>
                  ) : (
                      upcomingMeetings.map(app => (
                          <div key={app.id} className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all bg-slate-50/50 hover:bg-white">
                              {/* Date Box */}
                              <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl w-16 h-16 shrink-0 shadow-sm">
                                  <span className="text-xs font-bold text-indigo-600 uppercase">{app.start.toLocaleString('default', { month: 'short' })}</span>
                                  <span className="text-xl font-bold text-slate-800">{app.start.getDate()}</span>
                              </div>

                              <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                      <Clock size={14} className="text-slate-400" />
                                      <span className="text-xs font-bold text-slate-500">
                                          {app.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {app.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      </span>
                                  </div>
                                  <h4 className="font-bold text-slate-800">{app.title}</h4>
                                  <p className="text-sm text-slate-500">{app.patientName}</p>
                              </div>

                              <div className="flex gap-2 w-full sm:w-auto">
                                  <button 
                                    className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    title={t('rooms.copyLink')}
                                    onClick={() => {
                                        navigator.clipboard.writeText(`https://meet.psimanager.com/${app.id}`);
                                        // Toast logic here
                                    }}
                                  >
                                      <Copy size={18} />
                                  </button>
                                  <button 
                                    onClick={() => navigate(`/meeting/${app.id}`)}
                                    className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-colors"
                                  >
                                      <Play size={16} /> {t('rooms.startNow')}
                                  </button>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};
