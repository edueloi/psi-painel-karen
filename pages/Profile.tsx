import React, { useEffect, useMemo, useRef, useState } from 'react';
import { UserRole } from '../types';
import { api, getStaticUrl } from '../services/api';
import {
  Mail,
  Phone,
  Building2,
  Briefcase,
  Clock,
  MapPin,
  Camera,
  Save,
  Shield,
  Globe,
  Award,
  Stethoscope,
  Image as ImageIcon,
  User,
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  Lock,
  Layout,
  Plus,
  X,
  Copy
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

type BreakPeriod = { start: string; end: string };

type ScheduleDay = {
  dayKey: DayKey;
  active: boolean;
  start: string;
  end: string;
  breaks: BreakPeriod[];
};

export const Profile: React.FC = () => {
  const { t } = useLanguage();
  const { updateUser } = useAuth();

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState({
    name: '',
    email: '',
    role: UserRole.PSYCHOLOGIST,
    phone: '',
    crp: '',
    specialty: '',
    companyName: '',
    address: '',
    bio: '',
    avatarUrl: '',
    clinicLogoUrl: '',
    coverUrl: '',
  });

  const [toasts, setToasts] = useState<{ id: number; type: 'success' | 'error'; message: string }[]>([]);

  const pushToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeTab, setActiveTab] = useState<'info' | 'schedule' | 'clinic'>('info');

  const [schedule, setSchedule] = useState<ScheduleDay[]>([
    { dayKey: 'monday', active: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
    { dayKey: 'tuesday', active: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
    { dayKey: 'wednesday', active: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
    { dayKey: 'thursday', active: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
    { dayKey: 'friday', active: true, start: '08:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] },
    { dayKey: 'saturday', active: false, start: '09:00', end: '13:00', breaks: [] },
    { dayKey: 'sunday', active: false, start: '', end: '', breaks: [] },
  ]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await api.get<any>('/profile/me');
        if (data) {
          setUser({
            name: data.name || '',
            email: data.email || '',
            role: data.role || UserRole.PSYCHOLOGIST,
            phone: data.phone || '',
            crp: data.crp || '',
            specialty: data.specialty || '',
            companyName: data.company_name || data.companyName || '',
            address: data.address || '',
            bio: data.bio || '',
            avatarUrl: data.avatar_url || data.avatarUrl || '',
            clinicLogoUrl: data.clinic_logo_url || data.clinicLogoUrl || '',
            coverUrl: data.cover_url || data.coverUrl || '',
          });
        }

        if (data?.schedule) {
          const scheduleData = typeof data.schedule === 'string' ? JSON.parse(data.schedule) : data.schedule;
          if (Array.isArray(scheduleData)) {
            // Migrate old lunchStart/lunchEnd format to breaks array
            const migrated = scheduleData.map((d: any) => ({
              ...d,
              breaks: d.breaks ?? (d.lunchStart ? [{ start: d.lunchStart, end: d.lunchEnd }] : []),
            }));
            setSchedule(migrated as ScheduleDay[]);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
      }
    };

    loadProfile();
  }, []);

  const initials = useMemo(() => {
    if (!user.name) return 'U';
    const parts = user.name.trim().split(/\s+/);
    const a = parts[0]?.[0] ?? '';
    const b = parts[parts.length - 1]?.[0] ?? '';
    return (a + b).toUpperCase();
  }, [user.name]);

  const onAvatarPick = async (file?: File | null) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const data = await api.request<any>('/profile/avatar', {
        method: 'POST',
        body: fd,
      });
      const newAvatarUrl = data.avatar_url || data.avatarUrl || '';
      if (newAvatarUrl) {
        setUser(prev => ({ ...prev, avatarUrl: newAvatarUrl }));
        updateUser({ avatarUrl: newAvatarUrl });
      }
    } catch (err) {
      console.error("Erro ao subir avatar:", err);
    }
  };

  const onLogoPick = async (file?: File | null) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const data = await api.request<any>('/profile/logo', {
        method: 'POST',
        body: fd,
      });
      const newLogoUrl = data.logo_url || data.logoUrl || '';
      if (newLogoUrl) {
        setUser(prev => ({ ...prev, clinicLogoUrl: newLogoUrl }));
      }
    } catch (err) {
      console.error("Erro ao subir logo:", err);
    }
  };

  const onCoverPick = async (file?: File | null) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('cover', file);
      const data = await api.request<any>('/profile/cover', {
        method: 'POST',
        body: fd,
      });
      const newCoverUrl = data.cover_url || data.coverUrl || '';
      if (newCoverUrl) {
        setUser(prev => ({ ...prev, coverUrl: newCoverUrl }));
      }
    } catch (err) {
      console.error("Erro ao subir capa:", err);
    }
  };

  const toggleDay = (index: number) => {
    setSchedule(prev => prev.map((d, i) => (i === index ? { ...d, active: !d.active } : d)));
  };

  const updateDay = (index: number, patch: Partial<ScheduleDay>) => {
    setSchedule(prev => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const copyDayToAll = (index: number) => {
    const src = schedule[index];
    setSchedule(prev => prev.map((d, i) => i === index ? d : { ...d, start: src.start, end: src.end, breaks: src.breaks.map(b => ({ ...b })) }));
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await api.put('/profile/me', {
        name: user.name,
        email: user.email,
        phone: user.phone,
        crp: user.crp,
        specialty: user.specialty,
        company_name: user.companyName,
        address: user.address,
        bio: user.bio,
        avatar_url: user.avatarUrl,
        clinic_logo_url: user.clinicLogoUrl,
        cover_url: user.coverUrl,
        schedule,
      });

      setSaveStatus('saved');
      pushToast('success', 'Perfil atualizado com sucesso!');
      updateUser({ 
        name: user.name, 
        email: user.email,
        avatarUrl: user.avatarUrl
      });
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('idle');
      pushToast('error', 'Não foi possível salvar os dados. Tente novamente mais tarde.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header Section */}
      <div className="relative">
        {/* Cover Photo */}
        <div className="h-64 sm:h-80 w-full relative overflow-hidden">
          {user.coverUrl ? (
            <img src={getStaticUrl(user.coverUrl)} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-700 via-indigo-800 to-violet-900">
               <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            </div>
          )}
          <div className="absolute inset-0 bg-black/20"></div>
          
          {/* Edit Cover Action */}
          <div className="absolute top-6 right-6 flex gap-2">
            <button
               onClick={() => coverInputRef.current?.click()}
               className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white rounded-xl text-xs font-bold transition-all"
            >
              <Camera size={14} /> Alterar Capa
            </button>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => onCoverPick(e.target.files?.[0])} />
          </div>
        </div>

        {/* Profile Info Overlay Card */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-32 relative z-10">
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-white/50">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 sm:gap-8">
              {/* Avatar */}
              <div className="relative -mt-20 md:-mt-24 group">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2rem] bg-white p-2 shadow-xl border border-slate-100 overflow-hidden">
                  <div className="w-full h-full rounded-[1.6rem] overflow-hidden bg-slate-100 flex items-center justify-center">
                    {user.avatarUrl ? (
                      <img src={getStaticUrl(user.avatarUrl)} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    ) : (
                      <span className="text-4xl font-black text-indigo-400">{initials}</span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-2 right-2 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg border-4 border-white transition-all transform hover:scale-110"
                >
                  <Camera size={18} />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e => onAvatarPick(e.target.files?.[0])} />
              </div>

              {/* Name and Tags */}
              <div className="flex-1 text-center md:text-left pt-2 pb-4">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-800">{user.name || "Seu Nome"}</h1>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Ativo
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-500 font-bold text-sm">
                  <span className="flex items-center gap-1.5"><Stethoscope size={16} className="text-indigo-500" /> {user.specialty || "Especialidade"}</span>
                  <span className="flex items-center gap-1.5"><Shield size={16} className="text-violet-500" /> CRP {user.crp || "-"}</span>
                  <span className="flex items-center gap-1.5 font-black text-indigo-600 px-3 py-1 bg-indigo-50 rounded-lg">PREMIUM</span>
                </div>
              </div>

              {/* Actions Header */}
              <div className="flex flex-col items-center md:items-end gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saveStatus === 'saving'}
                  className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl shadow-xl transition-all font-black text-xs uppercase tracking-widest active:scale-95 ${
                    saveStatus === 'saved' 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-indigo-600 text-white hover:bg-slate-800'
                  }`}
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Salvando...</span>
                    </>
                  ) : saveStatus === 'saved' ? (
                    <>
                      <Award size={18} className="animate-bounce" />
                      <span>Salvo!</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>Salvar Perfil</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mt-8 border-t border-slate-100 pt-6 overflow-x-auto no-scrollbar">
              {[
                { id: 'info', label: 'Dados Pessoais', icon: <User size={16} /> },
                { id: 'schedule', label: 'Minha Agenda', icon: <Calendar size={16} /> },
                { id: 'clinic', label: 'Dados da Clínica', icon: <Building2 size={16} /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
                    activeTab === tab.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 translate-y-[-2px]' 
                    : 'bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 border border-slate-100'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-8">
            {activeTab === 'info' && (
              <div className="space-y-6">
                <Card title="Sobre você" icon={<Info className="text-indigo-500" />}>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ProfileInput label="Nome Completo" icon={<User size={16} />} value={user.name} onChange={v => setUser(p => ({ ...p, name: v }))} />
                      <ProfileInput label="E-mail Profissional" icon={<Mail size={16} />} value={user.email} onChange={v => setUser(p => ({ ...p, email: v }))} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ProfileInput 
                        label="Telefone / WhatsApp" 
                        icon={<Phone size={16} />} 
                        value={user.phone} 
                        onChange={v => {
                          let val = v.replace(/\D/g, '');
                          if (val.length > 11) val = val.slice(0, 11);
                          if (val.length > 2) val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
                          if (val.length > 9) val = `${val.slice(0, 10)}-${val.slice(10)}`;
                          setUser(p => ({ ...p, phone: val }));
                        }} 
                      />
                      <ProfileInput label="Especialidade" icon={<Stethoscope size={16} />} value={user.specialty} onChange={v => setUser(p => ({ ...p, specialty: v }))} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Breve Biografia / Perfil</label>
                      <textarea
                        value={user.bio}
                        onChange={e => setUser(p => ({ ...p, bio: e.target.value }))}
                        rows={5}
                        className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all resize-none"
                        placeholder="Conte um pouco sobre sua formação e experiência..."
                      />
                      <div className="flex justify-end mt-2 px-2">
                        <span className="text-[10px] font-bold text-slate-400">{user.bio.length} / 500</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'schedule' && (
              <Card title="Horários de Atendimento" icon={<Clock className="text-emerald-500" />} subtitle="Configure sua disponibilidade semanal para agendamentos online e presenciais.">
                <div className="space-y-3">
                  {schedule.map((day, idx) => (
                    <ScheduleRow
                      key={day.dayKey}
                      day={day}
                      t={t}
                      onToggle={() => toggleDay(idx)}
                      onUpdate={p => updateDay(idx, p)}
                      onCopyToAll={() => copyDayToAll(idx)}
                    />
                  ))}
                </div>
              </Card>
            )}

            {activeTab === 'clinic' && (
              <Card title="Identidade da Clínica" icon={<Building2 className="text-violet-500" />}>
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Logo Upload Area */}
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Logomarca Oficial</label>
                        <div 
                          className="relative h-48 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center group hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer overflow-hidden p-6"
                          onClick={() => logoInputRef.current?.click()}
                        >
                           {user.clinicLogoUrl ? (
                             <img src={getStaticUrl(user.clinicLogoUrl)} alt="Logo" className="w-full h-full object-contain" />
                           ) : (
                             <div className="text-center">
                               <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto mb-3 text-slate-300 group-hover:text-indigo-500 group-hover:scale-110 transition-all">
                                 <ImageIcon size={32} />
                               </div>
                               <p className="text-[11px] font-black text-slate-400 group-hover:text-indigo-600">ANEXAR LOGO</p>
                             </div>
                           )}
                           <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-all flex items-center justify-center">
                              <div className="p-3 bg-white rounded-2xl shadow-xl scale-0 group-hover:scale-100 transition-all">
                                <Camera size={20} className="text-indigo-600" />
                              </div>
                           </div>
                        </div>
                        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => onLogoPick(e.target.files?.[0])} />
                     </div>

                     {/* Cover Upload Area */}
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Imagem de Capa / Banner</label>
                        <div 
                          className="relative h-48 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center group hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer overflow-hidden"
                          onClick={() => coverInputRef.current?.click()}
                        >
                           {user.coverUrl ? (
                             <img src={getStaticUrl(user.coverUrl)} alt="Cover" className="w-full h-full object-cover" />
                           ) : (
                             <div className="text-center">
                               <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto mb-3 text-slate-300 group-hover:text-indigo-500 group-hover:scale-110 transition-all">
                                 <ImageIcon size={32} />
                               </div>
                               <p className="text-[11px] font-black text-slate-400 group-hover:text-indigo-600">ANEXAR CAPA</p>
                             </div>
                           )}
                           <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-all flex items-center justify-center">
                              <div className="p-3 bg-white rounded-2xl shadow-xl scale-0 group-hover:scale-100 transition-all">
                                <Camera size={20} className="text-indigo-600" />
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                    <ProfileInput label="Razão Social / Nome Fantasia" icon={<Building2 size={16} />} value={user.companyName} onChange={v => setUser(p => ({ ...p, companyName: v }))} />
                    <ProfileInput label="Registro Profissional (CRP/CRM)" icon={<Shield size={16} />} value={user.crp} onChange={v => setUser(p => ({ ...p, crp: v }))} />
                  </div>
                  <ProfileInput label="Endereço Físico Completo" icon={<MapPin size={16} />} value={user.address} onChange={v => setUser(p => ({ ...p, address: v }))} />
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-6">
            {/* Status Card */}
            <div className="bg-indigo-600 rounded-[2rem] p-6 text-white overflow-hidden relative shadow-xl shadow-indigo-100">
               <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
               <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md border border-white/20">
                      <Lock size={18} />
                    </div>
                    <h4 className="font-black text-sm uppercase tracking-wider text-indigo-100">Segurança</h4>
                 </div>
                 <p className="text-xs font-bold leading-relaxed mb-6">Sua conta está protegida com criptografia de ponta a ponta. Se precisar alterar sua senha, use o botão abaixo.</p>
                 <button className="w-full py-3 bg-white text-indigo-600 rounded-2xl text-xs font-black shadow-lg hover:bg-slate-50 transition-colors">ALTERAR SENHA</button>
               </div>
            </div>

            {/* Quick Actions / Performance summary */}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-6">
               <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Dicas de Perfil</h4>
               <div className="space-y-4">
                 <CheckItem label="Foto de perfil de alta qualidade" checked={!!user.avatarUrl} />
                 <CheckItem label="Biografia detalhada" checked={user.bio.length > 50} />
                 <CheckItem label="Agenda de horários configurada" checked={schedule.some(d => d.active)} />
                 <CheckItem label="Endereço da clínica preenchido" checked={!!user.address} />
               </div>
            </div>

            {/* Support Box */}
            <div className="p-6 bg-slate-800 rounded-[2rem] text-white space-y-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
                    <Layout size={18} className="text-indigo-400" />
                 </div>
                 <div>
                   <h5 className="text-[12px] font-black">Suporte Psiflux</h5>
                   <p className="text-[10px] text-slate-400 font-bold">Precisa de ajuda?</p>
                 </div>
              </div>
              <button className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl text-xs font-black transition-all">
                Abrir Central de Ajuda <ExternalLink size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* TOASTS */}
      <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-3">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-6 py-4 rounded-[1.5rem] shadow-2xl border animate-slideIn ${t.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            <span className="text-xs font-black uppercase tracking-widest">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* --- UI COMPONENTS --- */

interface CardProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, subtitle, icon, children }) => {
  return (
    <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center">
           {icon}
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-800 tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs font-bold text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
};

interface ProfileInputProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}

const ProfileInput: React.FC<ProfileInputProps> = ({ label, icon, value, onChange, type = 'text' }) => {
  return (
    <div className="group">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1 group-focus-within:text-indigo-600 transition-colors">{label}</label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors">
          {icon}
        </div>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all"
          placeholder={`Digite ${label.toLowerCase()}...`}
        />
      </div>
    </div>
  );
};

interface ScheduleRowProps {
  day: ScheduleDay;
  t: (k: string) => string;
  onToggle: () => void;
  onUpdate: (p: Partial<ScheduleDay>) => void;
  onCopyToAll: () => void;
}

const ScheduleRow: React.FC<ScheduleRowProps> = ({ day, t, onToggle, onUpdate, onCopyToAll }) => {
  const addBreak = () => {
    onUpdate({ breaks: [...day.breaks, { start: '12:00', end: '13:00' }] });
  };
  const removeBreak = (i: number) => {
    onUpdate({ breaks: day.breaks.filter((_, idx) => idx !== i) });
  };
  const updateBreak = (i: number, field: 'start' | 'end', v: string) => {
    onUpdate({ breaks: day.breaks.map((b, idx) => idx === i ? { ...b, [field]: v } : b) });
  };

  return (
    <div className={`p-4 rounded-[2rem] border transition-all ${
      day.active
      ? 'bg-white border-slate-100 shadow-md shadow-slate-100/50'
      : 'bg-slate-50/50 border-transparent grayscale opacity-50'
    }`}>
      {/* Top row: day label + work hours + actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
        {/* Day Label & Work Entry Group */}
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {/* Day toggle & name */}
          <div className="flex items-center gap-3 min-w-[140px]">
            <button
              onClick={onToggle}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                day.active 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                : 'bg-slate-200 text-slate-400'
              }`}
            >
              <ChevronRight size={16} className={`${day.active ? 'rotate-90' : ''} transition-transform`} />
            </button>
            <span className="text-sm font-black text-slate-700 uppercase tracking-tighter truncate">{t(`days.${day.dayKey}`)}</span>
          </div>

          {/* Work hours */}
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">Trabalho:</span>
            <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-200/50 shadow-inner">
              <TimeInput value={day.start} onChange={v => onUpdate({ start: v })} disabled={!day.active} />
              <span className="text-slate-300 font-bold">/</span>
              <TimeInput value={day.end} onChange={v => onUpdate({ end: v })} disabled={!day.active} />
            </div>
          </div>
        </div>

        {/* Spacer for desktop only */}
        <div className="hidden lg:block flex-1" />

        {/* Actions section */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            {day.active && (
              <button
                onClick={addBreak}
                title="Adicionar intervalo"
                className="flex items-center gap-1.5 text-[10px] font-black px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-all whitespace-nowrap active:scale-95"
              >
                <Plus size={12} strokeWidth={3} /> <span className="hidden sm:inline">INTERVALO</span><span className="sm:hidden">+ INT</span>
              </button>
            )}
            <button
              onClick={onCopyToAll}
              title="Repetir para todos os dias"
              className="flex items-center gap-1.5 text-[10px] font-black px-3 py-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all whitespace-nowrap active:scale-95"
            >
              <Copy size={12} strokeWidth={3} /> <span className="hidden sm:inline">REPETIR</span><span className="sm:hidden">COPIAR</span>
            </button>
          </div>
          
          <button
            onClick={onToggle}
            className={`text-[10px] font-black px-4 py-2.5 rounded-xl border transition-all whitespace-nowrap active:scale-95 ${
              day.active 
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
            }`}
          >
            {day.active ? 'DISPONÍVEL' : 'FECHADO'}
          </button>
        </div>
      </div>

      {/* Breaks list */}
      {day.active && day.breaks.length > 0 && (
        <div className="mt-4 lg:pl-[140px] flex flex-col gap-3 pt-4 lg:pt-0 border-t lg:border-none border-slate-50">
          {day.breaks.map((b, i) => (
            <div key={i} className="flex flex-wrap items-center gap-3 animate-slideDownFade">
              <div className="flex items-center gap-2 min-w-[100px]">
                <Clock size={12} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {day.breaks.length > 1 ? `Break ${i + 1}` : 'Intervalo'} :
                </span>
              </div>
              <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-200/50 shadow-inner">
                <TimeInput value={b.start} onChange={v => updateBreak(i, 'start', v)} disabled={!day.active} />
                <span className="text-slate-300 font-bold">/</span>
                <TimeInput value={b.end} onChange={v => updateBreak(i, 'end', v)} disabled={!day.active} />
              </div>
              <button
                onClick={() => removeBreak(i)}
                className="w-8 h-8 rounded-xl bg-red-50 text-red-500 hover:bg-red-600 hover:text-white flex items-center justify-center transition-all group lg:ml-2 active:scale-90"
                title="Remover intervalo"
              >
                <X size={14} strokeWidth={3} className="transition-transform group-hover:rotate-90" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function TimeInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <input 
      type="time" 
      value={value} 
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={`h-9 bg-white border border-slate-200 rounded-xl px-3 text-[11px] font-black text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all ${
        disabled ? 'opacity-30 cursor-not-allowed' : 'hover:border-slate-300'
      }`}
    />
  );
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-3 group">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${
        checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200'
      }`}>
        {checked && <ChevronRight size={12} className="rotate-[-45deg]" />}
      </div>
      <span className={`text-xs font-bold transition-colors ${checked ? 'text-slate-700' : 'text-slate-400 group-hover:text-slate-500'}`}>
        {label}
      </span>
    </div>
  );
}
