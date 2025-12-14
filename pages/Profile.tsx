import React, { useState } from 'react';
import { UserRole } from '../types';
import { 
  User, Mail, Phone, Building, Briefcase, Clock, MapPin, 
  Camera, Save, BadgeCheck, Shield, Globe, Award, Stethoscope
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Profile: React.FC = () => {
  const { t } = useLanguage();
  const [user, setUser] = useState({
    name: 'Karen Gomes',
    email: 'karen.gomes@psiclinica.com',
    role: UserRole.PSYCHOLOGIST,
    phone: '(11) 99999-8888',
    crp: '06/172315',
    specialty: 'Psicologia Clínica & Neuropsicologia',
    companyName: 'Clínica Mente Saudável',
    address: 'Av. Paulista, 1000 - Sala 42, São Paulo - SP',
    bio: 'Especialista em Terapia Cognitivo-Comportamental com foco em transtornos de ansiedade e desenvolvimento pessoal. Atuo há mais de 10 anos transformando vidas através da psicologia baseada em evidências.',
    avatarUrl: ''
  });

  // Using translation keys for day names
  const [schedule, setSchedule] = useState([
    { dayKey: 'monday', active: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { dayKey: 'tuesday', active: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { dayKey: 'wednesday', active: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { dayKey: 'thursday', active: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { dayKey: 'friday', active: true, start: '08:00', end: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
    { dayKey: 'saturday', active: false, start: '09:00', end: '13:00', lunchStart: '', lunchEnd: '' },
    { dayKey: 'sunday', active: false, start: '', end: '', lunchStart: '', lunchEnd: '' },
  ]);

  const toggleDay = (index: number) => {
    const newSchedule = [...schedule];
    newSchedule[index].active = !newSchedule[index].active;
    setSchedule(newSchedule);
  };

  const handleSave = () => {
    // Logic to save
    const btn = document.getElementById('save-btn');
    if(btn) {
        btn.innerHTML = `<span class="flex items-center gap-2">${t('profile.saved')}</span>`;
        setTimeout(() => btn.innerHTML = `<span class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg></span> ${t('profile.save')}`, 2000);
    }
  };

  return (
    <div className="animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* Cover Image Area */}
      <div className="relative h-64 w-full bg-slate-900 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-800 opacity-90"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-500 rounded-full blur-[120px] opacity-40"></div>
        <div className="absolute top-10 right-10 w-64 h-64 bg-purple-500 rounded-full blur-[100px] opacity-30"></div>
        
        {/* Cover Actions */}
        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button className="bg-black/30 hover:bg-black/50 backdrop-blur text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all border border-white/10">
                <Camera size={14} /> {t('profile.changeCover')}
            </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Left Column: Identity Card */}
            <div className="lg:w-1/3 flex-shrink-0 space-y-6">
                
                {/* Main Profile Card */}
                <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
                    <div className="p-8 flex flex-col items-center text-center">
                        <div className="relative mb-6">
                            <div className="w-40 h-40 rounded-full border-[6px] border-white shadow-2xl bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer group relative">
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                ) : (
                                    <span className="text-5xl font-bold text-indigo-300">{user.name.charAt(0)}</span>
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <Camera className="text-white w-8 h-8" />
                                </div>
                            </div>
                            <div className="absolute bottom-2 right-2 p-2 bg-emerald-500 border-4 border-white rounded-full" title={t('profile.online')}></div>
                        </div>
                        
                        <h2 className="text-2xl font-display font-bold text-slate-800 mb-1">{user.name}</h2>
                        <p className="text-slate-500 font-medium flex items-center gap-1.5 justify-center mb-4">
                            <Stethoscope size={16} className="text-indigo-500" />
                            {user.specialty}
                        </p>

                        <div className="flex flex-wrap justify-center gap-2 mb-8">
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full uppercase tracking-wide border border-slate-200">
                                CRP {user.crp}
                            </span>
                            <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full uppercase tracking-wide border border-amber-100 flex items-center gap-1">
                                <Award size={12} /> Premium
                            </span>
                        </div>

                        <div className="w-full space-y-4 text-left">
                            <div className="group flex items-center gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-sm">
                                    <Mail size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('profile.professionalEmail')}</p>
                                    <p className="text-sm font-semibold text-slate-700 truncate">{user.email}</p>
                                </div>
                            </div>

                            <div className="group flex items-center gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-sm">
                                    <Phone size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('profile.contact')}</p>
                                    <p className="text-sm font-semibold text-slate-700">{user.phone}</p>
                                </div>
                            </div>

                            <div className="group flex items-center gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-sm">
                                    <MapPin size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('profile.location')}</p>
                                    <p className="text-sm font-semibold text-slate-700 leading-snug">{user.address}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Decorative Bottom Pattern */}
                    <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
                </div>

                {/* Status Card */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                                <BadgeCheck className="text-emerald-400" size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">{t('profile.verified')}</h3>
                                <p className="text-xs text-slate-400">{t('profile.verifiedDesc')}</p>
                            </div>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5 mb-2">
                            <div className="bg-emerald-400 h-1.5 rounded-full w-full shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                        </div>
                        <p className="text-[10px] text-slate-400 text-right">{t('profile.validity')}</p>
                    </div>
                </div>
            </div>

            {/* Right Column: Forms & Settings */}
            <div className="lg:w-2/3 space-y-8 pb-10">
                
                {/* Bio & Company Section */}
                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">{t('profile.about')}</h3>
                            <p className="text-sm text-slate-500">{t('profile.publicInfo')}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 group">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-indigo-600 transition-colors">{t('profile.companyName')}</label>
                                <div className="relative">
                                    <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input 
                                        type="text" 
                                        value={user.companyName}
                                        onChange={e => setUser({...user, companyName: e.target.value})}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-slate-700 font-medium transition-all"
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2 group">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-indigo-600 transition-colors">{t('profile.registry')}</label>
                                <div className="relative">
                                    <Shield size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input 
                                        type="text" 
                                        value={user.crp}
                                        onChange={e => setUser({...user, crp: e.target.value})}
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-slate-700 font-medium transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider group-focus-within:text-indigo-600 transition-colors">{t('profile.bio')}</label>
                            <div className="relative">
                                <textarea 
                                    value={user.bio}
                                    onChange={e => setUser({...user, bio: e.target.value})}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-slate-700 font-medium transition-all resize-none h-32 leading-relaxed"
                                />
                                <div className="absolute bottom-3 right-3 text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                                    {user.bio.length} chars
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Schedule Section */}
                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                                <Clock size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{t('profile.schedule')}</h3>
                                <p className="text-sm text-slate-500">{t('profile.scheduleDesc')}</p>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            <Globe size={14} /> {t('profile.timezone')}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-12 gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center px-4 pb-2">
                            <div className="col-span-4 md:col-span-3 text-left">{t('profile.day')}</div>
                            <div className="col-span-4 md:col-span-4">{t('profile.workHours')}</div>
                            <div className="hidden md:block col-span-4">{t('profile.break')}</div>
                            <div className="col-span-4 md:col-span-1">{t('profile.status')}</div>
                        </div>

                        {schedule.map((day, index) => (
                            <div 
                                key={day.dayKey} 
                                className={`
                                    relative grid grid-cols-12 gap-4 items-center p-4 rounded-2xl border transition-all duration-300
                                    ${day.active 
                                        ? 'bg-white border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md' 
                                        : 'bg-slate-50 border-transparent opacity-60 grayscale'}
                                `}
                            >
                                {/* Day Name */}
                                <div className="col-span-4 md:col-span-3 flex items-center gap-3">
                                    <div className={`w-2 h-8 rounded-full ${day.active ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                                    <span className="font-bold text-sm text-slate-700">{t(`days.${day.dayKey}`)}</span>
                                </div>
                                
                                {/* Work Hours */}
                                <div className="col-span-4 md:col-span-4 flex items-center justify-center gap-2">
                                    <div className="relative group/time">
                                        <input type="time" disabled={!day.active} value={day.start} className="w-20 p-2 text-center text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:bg-white outline-none transition-all disabled:bg-transparent" />
                                    </div>
                                    <span className="text-slate-300 font-bold">{t('profile.to')}</span>
                                    <div className="relative group/time">
                                        <input type="time" disabled={!day.active} value={day.end} className="w-20 p-2 text-center text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 focus:bg-white outline-none transition-all disabled:bg-transparent" />
                                    </div>
                                </div>

                                {/* Lunch Hours (Hidden on Mobile) */}
                                <div className="hidden md:flex col-span-4 items-center justify-center gap-2">
                                    <input type="time" disabled={!day.active} value={day.lunchStart} className="w-16 p-1.5 text-center text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 outline-none disabled:bg-transparent" />
                                    <span className="text-slate-300">-</span>
                                    <input type="time" disabled={!day.active} value={day.lunchEnd} className="w-16 p-1.5 text-center text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:border-indigo-500 outline-none disabled:bg-transparent" />
                                </div>

                                {/* Toggle Switch */}
                                <div className="col-span-4 md:col-span-1 flex justify-end">
                                    <button 
                                        onClick={() => toggleDay(index)}
                                        className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${day.active ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${day.active ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Floating Save Bar */}
                <div className="sticky bottom-4 z-20 flex justify-end">
                    <button 
                        id="save-btn"
                        onClick={handleSave}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 hover:-translate-y-1 transition-all flex items-center gap-3 text-lg"
                    >
                        <Save size={20} /> {t('profile.save')}
                    </button>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};
