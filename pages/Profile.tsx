import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { api, getStaticUrl } from '../services/api';
import { PageHeader } from '../components/UI/PageHeader';
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
  Copy,
  Sparkles,
  Loader2,
  ChevronDown,
  CheckCircle,
  Monitor
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
  const navigate = useNavigate();
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
    public_slug: '',
    public_profile_enabled: false,
    social_links: [] as { platform: string; url: string }[],
    profile_theme: { 
      primaryColor: '#4F46E5', 
      layout: 'modern',
      hero_title: '',
      specialties_summary: '',
      specialties_list: [] as string[],
      experience_years: '',
      patients_count: '',
      faq: [] as { question: string; answer: string }[],
      show_faq: true,
      show_schedule: true,
      show_map: true,
      show_trajectory: true,
      show_specialties: true,
      public_name: '',
      prop_1_title: '', prop_1_desc: '',
      prop_2_title: '', prop_2_desc: '',
      prop_3_title: '', prop_3_desc: '',
      steps_title: '',
      step_1_title: '', step_1_desc: '',
      step_2_title: '', step_2_desc: '',
      step_3_title: '', step_3_desc: '',
    },
    gender: 'female' as 'male' | 'female' | 'other'
  });

  const [toasts, setToasts] = useState<{ id: number; type: 'success' | 'error'; message: string }[]>([]);

  const pushToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeTab, setActiveTab] = useState<'info' | 'schedule' | 'clinic' | 'external'>('info');

  // Aurora profile builder
  const [auroraOpen, setAuroraOpen] = useState(false);
  const [auroraStep, setAuroraStep] = useState(0);
  const [auroraLoading, setAuroraLoading] = useState(false);
  const [auroraAnswers, setAuroraAnswers] = useState<Record<string, string>>({});
  const AURORA_QUESTIONS = [
    { key: 'name',         label: 'Qual é o seu nome profissional?',                                          placeholder: 'Ex: Dra. Karen Gomes' },
    { key: 'specialty',    label: 'Qual é a sua especialidade principal?',                                   placeholder: 'Ex: Psicologia Clínica, Terapia Cognitivo-Comportamental...' },
    { key: 'experience',   label: 'Quantos anos de experiência você tem?',                                   placeholder: 'Ex: 8, mais de 10, 3...' },
    { key: 'patients',     label: 'Quantas pessoas você já atendeu (aproximadamente)?',                      placeholder: 'Ex: +100, mais de 200...' },
    { key: 'bio',          label: 'Descreva brevemente sua abordagem e diferenciais como profissional.',     placeholder: 'Fale sobre sua filosofia de trabalho, método, o que te diferencia...' },
    { key: 'specialties',  label: 'Liste suas áreas de atuação (separadas por vírgula).',                   placeholder: 'Ex: Ansiedade, Depressão, Luto, Relacionamentos...' },
    { key: 'hero_title',   label: 'Qual seria o título de impacto da sua página? (opcional)',               placeholder: 'Ex: Apoio Psicológico de Confiança. Ou deixe em branco para a Aurora criar.' },
    { key: 'faq',          label: 'Liste 3 dúvidas frequentes dos seus pacientes (uma por linha).',         placeholder: 'Ex:\nQual o valor da sessão?\nVocê atende online?\nPreciso de encaminhamento?' },
  ];

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
            public_slug: data.public_slug || '',
            public_profile_enabled: !!data.public_profile_enabled,
            social_links: data.social_links || [],
            profile_theme: {
              primaryColor: data.profile_theme?.primaryColor || '#4F46E5',
              layout: data.profile_theme?.layout || 'modern',
              hero_title: data.profile_theme?.hero_title || '',
              specialties_summary: data.profile_theme?.specialties_summary || '',
              specialties_list: data.profile_theme?.specialties_list || [],
              experience_years: data.profile_theme?.experience_years || '',
              patients_count: data.profile_theme?.patients_count || '',
              faq: data.profile_theme?.faq || [],
              show_faq: data.profile_theme?.show_faq !== false,
              show_schedule: data.profile_theme?.show_schedule !== false,
              show_map: data.profile_theme?.show_map !== false,
              show_trajectory: data.profile_theme?.show_trajectory !== false,
              show_specialties: data.profile_theme?.show_specialties !== false,
              public_name: data.profile_theme?.public_name || '',
              prop_1_title: data.profile_theme?.prop_1_title || '',
              prop_1_desc: data.profile_theme?.prop_1_desc || '',
              prop_2_title: data.profile_theme?.prop_2_title || '',
              prop_2_desc: data.profile_theme?.prop_2_desc || '',
              prop_3_title: data.profile_theme?.prop_3_title || '',
              prop_3_desc: data.profile_theme?.prop_3_desc || '',
              steps_title: data.profile_theme?.steps_title || '',
              step_1_title: data.profile_theme?.step_1_title || '',
              step_1_desc: data.profile_theme?.step_1_desc || '',
              step_2_title: data.profile_theme?.step_2_title || '',
              step_2_desc: data.profile_theme?.step_2_desc || '',
              step_3_title: data.profile_theme?.step_3_title || '',
              step_3_desc: data.profile_theme?.step_3_desc || '',
            },
            gender: data.gender || 'female'
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

  const handleAuroraGenerate = async () => {
    setAuroraLoading(true);
    try {
      const prompt = `Você é um especialista em marketing para profissionais de saúde mental. Com base nas informações abaixo, gere o conteúdo completo para uma página profissional pública de um psicólogo. Responda SOMENTE em JSON válido, sem markdown.

Dados fornecidos:
- Nome: ${auroraAnswers.name || user.name}
- Especialidade: ${auroraAnswers.specialty || user.specialty}
- Anos de experiência: ${auroraAnswers.experience}
- Pacientes atendidos: ${auroraAnswers.patients}
- Sobre/Bio: ${auroraAnswers.bio || user.bio}
- Áreas de atuação: ${auroraAnswers.specialties}
- Título desejado: ${auroraAnswers.hero_title || 'Gere um título impactante'}
- Dúvidas frequentes: ${auroraAnswers.faq}

Gere o seguinte JSON:
{
  "hero_title": "título de impacto para hero (máx 7 palavras)",
  "specialties_summary": "frase curta descrevendo especialidades (máx 12 palavras)",
  "experience_years": "texto de anos de experiência (ex: 8+)",
  "patients_count": "texto de pacientes (ex: +100)",
  "specialties_list": ["área1", "área2", "área3", "área4", "área5"],
  "prop_1_title": "título do card de proposta 1",
  "prop_1_desc": "descrição curta do card 1 (2 frases)",
  "prop_2_title": "título do card de proposta 2",
  "prop_2_desc": "descrição curta do card 2 (2 frases)",
  "prop_3_title": "título do card de proposta 3",
  "prop_3_desc": "descrição curta do card 3 (2 frases)",
  "steps_title": "título da seção 'como funciona' (ex: Dê o primeiro passo hoje.)",
  "step_1_title": "título do passo 1",
  "step_1_desc": "descrição do passo 1",
  "step_2_title": "título do passo 2",
  "step_2_desc": "descrição do passo 2",
  "step_3_title": "título do passo 3",
  "step_3_desc": "descrição do passo 3",
  "faq": [
    {"question": "pergunta 1", "answer": "resposta 1"},
    {"question": "pergunta 2", "answer": "resposta 2"},
    {"question": "pergunta 3", "answer": "resposta 3"}
  ]
}`;

      const result: any = await api.post('/profile/generate-aurora', {
        system: 'Você é especialista em marketing para psicólogos. Responda APENAS em JSON válido sem markdown.',
        prompt,
        max_tokens: 2000,
        temperature: 0.8,
      });

      const text = result.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON inválido retornado pela IA');
      const generated = JSON.parse(jsonMatch[0]);

      setUser(prev => ({
        ...prev,
        profile_theme: {
          ...prev.profile_theme,
          ...generated,
          public_name: auroraAnswers.name || prev.profile_theme.public_name,
        }
      }));

      setAuroraOpen(false);
      setAuroraStep(0);
      setAuroraAnswers({});
      pushToast('success', 'Aurora montou sua página! Revise e salve as alterações.');
    } catch (e: any) {
      pushToast('error', 'Erro ao gerar conteúdo. Tente novamente.');
    } finally {
      setAuroraLoading(false);
    }
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
        public_slug: user.public_slug,
        public_profile_enabled: user.public_profile_enabled,
        social_links: user.social_links,
        profile_theme: user.profile_theme,
        gender: user.gender,
      });

      setSaveStatus('saved');
      pushToast('success', 'Perfil atualizado com sucesso!');
      updateUser({ 
        name: user.name, 
        email: user.email,
        avatarUrl: user.avatarUrl
      });
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: any) {
      setSaveStatus('idle');
      const msg = err.response?.data?.error || 'Não foi possível salvar os dados. Tente novamente mais tarde.';
      pushToast('error', msg);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] px-6 pt-6 pb-24 animate-fadeIn font-sans space-y-6">
      <PageHeader
        icon={<User />}
        title="Meu Perfil"
        subtitle="Gerencie suas informações pessoais, profissionais e configurações de conta."
        showBackButton
        onBackClick={() => navigate('/')}
        containerClassName="mb-12"
      />

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
        <div className="mx-auto -mt-32 relative z-10 px-6">
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
                { id: 'external', label: 'Página Externa', icon: <Globe size={16} /> },
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
      <div className="mx-auto mt-8">
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

            {activeTab === 'external' && (
              <div className="space-y-6">
                <Card 
                  title="Sua Vitrine Digital" 
                  icon={<Globe className="text-pink-500" />}
                  subtitle="Crie uma página profissional pública para usar na sua bio do Instagram ou anúncios."
                >
                  <div className="space-y-8">
                    {/* Ativação */}
                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                      <div>
                        <h4 className="text-sm font-black text-slate-800">Status da Página</h4>
                        <p className="text-[10px] font-bold text-slate-400">Ative para que seu perfil seja visível publicamente.</p>
                      </div>
                      <button
                        onClick={() => setUser(p => ({ ...p, public_profile_enabled: !p.public_profile_enabled }))}
                        className={`w-14 h-8 rounded-full relative transition-all duration-300 ${user.public_profile_enabled ? 'bg-emerald-500 shadow-lg shadow-emerald-100' : 'bg-slate-200'}`}
                      >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${user.public_profile_enabled ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    {/* Slug / Link */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Seu Link Personalizado</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center h-14 bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden group focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-400 transition-all">
                          <span className="pl-4 pr-1 text-slate-400 text-xs font-bold whitespace-nowrap">psiflux.com.br/p/</span>
                          <input
                            type="text"
                            value={user.public_slug}
                            onChange={e => {
                              const val = e.target.value
                                .toLowerCase()
                                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
                                .replace(/[^a-z0-9]/g, '-') // remove special chars/dots/spaces
                                .replace(/-+/g, '-'); // collapse multiple hyphens
                              setUser(p => ({ ...p, public_slug: val }));
                            }}
                            className="flex-1 h-full bg-transparent border-none outline-none text-sm font-black text-indigo-600 placeholder:text-slate-300"
                            placeholder="ex-meu-nome"
                          />
                        </div>
                        {user.public_slug && (
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(`https://psiflux.com.br/p/${user.public_slug}`);
                              pushToast('success', 'Link copiado!');
                            }}
                            className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all"
                            title="Copiar link"
                          >
                            <Copy size={20} />
                          </button>
                        )}
                        <a 
                          href={`/p/${user.public_slug}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-4 bg-slate-800 text-white rounded-2xl hover:bg-slate-700 transition-all"
                          title="Visualizar"
                        >
                          <ExternalLink size={20} />
                        </a>
                      </div>
                    </div>

                    {/* Social Links */}
                    <div className="space-y-4 pt-4 border-t border-slate-50">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Links de Redes Sociais</label>
                        <button 
                          onClick={() => setUser(p => ({ ...p, social_links: [...p.social_links, { platform: 'Instagram', url: '' }] }))}
                          className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 hover:text-indigo-700 transition-all"
                        >
                          <Plus size={14} /> ADICIONAR LINK
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {user.social_links.map((link, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-3 bg-white border border-slate-100 rounded-[1.5rem] group hover:border-indigo-200 transition-all shadow-sm">
                            <select
                              value={link.platform}
                              onChange={e => {
                                const newLinks = [...user.social_links];
                                newLinks[idx].platform = e.target.value;
                                setUser(p => ({ ...p, social_links: newLinks }));
                              }}
                              className="h-10 bg-slate-50 border-none rounded-xl text-[10px] font-black text-slate-600 focus:ring-0"
                            >
                              {['Instagram', 'WhatsApp', 'LinkedIn', 'Facebook', 'TikTok', 'YouTube', 'Site', 'Threads'].map(p => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={link.url}
                              onChange={e => {
                                const newLinks = [...user.social_links];
                                newLinks[idx].url = e.target.value;
                                setUser(p => ({ ...p, social_links: newLinks }));
                              }}
                              className="flex-1 h-10 bg-transparent border-none outline-none text-xs font-bold text-slate-700 placeholder:text-slate-300"
                              placeholder="URL ou @usuário"
                            />
                            <button
                              onClick={() => setUser(p => ({ ...p, social_links: p.social_links.filter((_, i) => i !== idx) }))}
                              className="p-2 text-slate-300 hover:text-red-500 transition-all"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                      {user.social_links.length === 0 && (
                        <div className="text-center py-8 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                          <p className="text-[10px] font-black text-slate-400">NENHUM LINK ADICIONADO</p>
                        </div>
                      )}
                    </div>

                    {/* Aurora Builder */}
                    <div className="pt-8 border-t border-slate-100">
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
                          <Sparkles size={22} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-slate-800 text-sm">Aurora monta sua página por você</p>
                          <p className="text-xs text-slate-500 mt-0.5">Responda algumas perguntas rápidas e a IA preenche todo o conteúdo automaticamente.</p>
                        </div>
                        <button
                          onClick={() => { setAuroraOpen(true); setAuroraStep(0); setAuroraAnswers({}); }}
                          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-200 shrink-0 active:scale-95"
                        >
                          <Sparkles size={13} /> Gerar com IA
                        </button>
                      </div>
                    </div>

                    {/* Site Content Management */}
                    <div className="pt-8 border-t border-slate-100">
                      <div className="flex items-center gap-2 mb-6">
                        <div className="w-1.5 h-6 rounded-full bg-indigo-500"></div>
                        <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Conteúdo Estratégico do Site</h4>
                      </div>

                      <div className="space-y-2 mb-6">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Seu Nome na Página Pública</label>
                         <input 
                           type="text"
                           value={user.profile_theme.public_name || ''}
                           onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, public_name: e.target.value } }))}
                           className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all"
                           placeholder="Ex: Dr. Eduardo Eloi"
                         />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Título de Impacto (Hero)</label>
                           <input 
                             type="text"
                             value={user.profile_theme.hero_title || ''}
                             onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, hero_title: e.target.value } }))}
                             className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all"
                             placeholder="Ex: Apoio Psicológico de Confiança"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Resumo das Especialidades</label>
                           <input 
                             type="text"
                             value={user.profile_theme.specialties_summary || ''}
                             onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, specialties_summary: e.target.value } }))}
                             className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all"
                             placeholder="Ex: Especialidades focadas no seu desenvolvimento..."
                           />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Anos de Experiência</label>
                           <input 
                             type="text"
                             value={user.profile_theme.experience_years || ''}
                             onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, experience_years: e.target.value } }))}
                             className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all"
                             placeholder="Ex: 8+"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Clientes/Vidas Atendidas</label>
                           <input 
                             type="text"
                             value={user.profile_theme.patients_count || ''}
                             onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, patients_count: e.target.value } }))}
                             className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all"
                             placeholder="Ex: +100"
                           />
                        </div>
                      </div>

                      {/* Cartões de Proposta de Valor */}
                      <div className="pt-8 border-t border-slate-100 mb-8">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-1.5 h-6 rounded-full bg-rose-500"></div>
                            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Cartões de Proposta de Valor (3 Cards)</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {[1, 2, 3].map(num => (
                            <div key={num} className="space-y-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Título Card {num}</label>
                                  <input 
                                    type="text"
                                    value={(user.profile_theme as any)[`prop_${num}_title`] || ''}
                                    onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, [`prop_${num}_title`]: e.target.value } }))}
                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 transition-all"
                                    placeholder={`Título do Card ${num}`}
                                  />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Descrição Card {num}</label>
                                  <textarea 
                                    value={(user.profile_theme as any)[`prop_${num}_desc`] || ''}
                                    onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, [`prop_${num}_desc`]: e.target.value } }))}
                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 transition-all resize-none"
                                    rows={3}
                                    placeholder={`Descrição breve do Card ${num}`}
                                  />
                               </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Seção de Passos / Como Funciona */}
                      <div className="pt-8 border-t border-slate-100 mb-8">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-1.5 h-6 rounded-full bg-amber-500"></div>
                            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Seção: Como Funciona (Título + 3 Passos)</h4>
                        </div>
                        <div className="space-y-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Título da Seção de Passos</label>
                              <input 
                                type="text"
                                value={user.profile_theme.steps_title || ''}
                                onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, steps_title: e.target.value } }))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 transition-all"
                                placeholder="Ex: Dê o primeiro passo hoje."
                              />
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {[1, 2, 3].map(num => (
                                <div key={num} className="space-y-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Passo {num} - Título</label>
                                    <input 
                                      type="text"
                                      value={(user.profile_theme as any)[`step_${num}_title`] || ''}
                                      onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, [`step_${num}_title`]: e.target.value } }))}
                                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 transition-all"
                                      placeholder={`Título do Passo ${num}`}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Passo {num} - Descrição</label>
                                    <textarea 
                                      value={(user.profile_theme as any)[`step_${num}_desc`] || ''}
                                      onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, [`step_${num}_desc`]: e.target.value } }))}
                                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 transition-all resize-none"
                                      rows={2}
                                      placeholder={`Descrição do Passo ${num}`}
                                    />
                                  </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      </div>

                      {/* Section Visibility Toggles */}
                      <div className="pt-8 border-t border-slate-100 mb-8">
                        <div className="flex items-center gap-2 mb-6">
                          <div className="w-1.5 h-6 rounded-full bg-emerald-500"></div>
                          <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Configuração de Seções do Site</h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {[
                            { id: 'show_trajectory', label: 'Trajetória/Bio' },
                            { id: 'show_specialties', label: 'Especialidades' },
                            { id: 'show_faq', label: 'Perguntas (FAQ)' },
                            { id: 'show_schedule', label: 'Agenda Semanal' },
                            { id: 'show_map', label: 'Mapa/Localização' },
                          ].map(s => (
                            <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                               <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{s.label}</span>
                               <button 
                                 onClick={() => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, [s.id]: !p.profile_theme[s.id as keyof typeof p.profile_theme] } }))}
                                 className={`w-10 h-6 rounded-full transition-all relative ${user.profile_theme[s.id as keyof typeof user.profile_theme] ? 'bg-indigo-600' : 'bg-slate-300'}`}
                               >
                                 <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${user.profile_theme[s.id as keyof typeof user.profile_theme] ? 'left-5' : 'left-1'}`} />
                               </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Specialties Tags Editor */}
                      <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialidades em Cartão</label>
                          <button 
                            onClick={() => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, specialties_list: [...(p.profile_theme.specialties_list || []), ''] } }))}
                            className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 hover:text-indigo-700 transition-all"
                          >
                            <Plus size={14} /> ADICIONAR ITEM
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {(user.profile_theme.specialties_list || []).map((s, idx) => (
                            <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                              <input 
                                type="text"
                                value={s}
                                onChange={e => {
                                  const newList = [...user.profile_theme.specialties_list];
                                  newList[idx] = e.target.value;
                                  setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, specialties_list: newList } }));
                                }}
                                className="flex-1 bg-transparent border-none outline-none text-[11px] font-bold text-slate-700 placeholder:text-slate-300"
                                placeholder={`Especialidade ${idx + 1}...`}
                              />
                              <button onClick={() => {
                                const newList = [...user.profile_theme.specialties_list];
                                newList.splice(idx, 1);
                                setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, specialties_list: newList } }));
                              }} className="text-slate-300 hover:text-red-500 transition-all">
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* FAQ Manager */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Perguntas Frequentes (FAQ)</label>
                          <button 
                            onClick={() => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, faq: [...(p.profile_theme.faq || []), { question: '', answer: '' }] } }))}
                            className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 hover:text-indigo-700 transition-all"
                          >
                            <Plus size={14} /> ADICIONAR PERGUNTA
                          </button>
                        </div>

                        <div className="space-y-3">
                          {(user.profile_theme.faq || []).map((f, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col gap-3 relative group">
                              <button
                                onClick={() => {
                                  const newFaq = [...user.profile_theme.faq];
                                  newFaq.splice(idx, 1);
                                  setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, faq: newFaq } }));
                                }}
                                className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <X size={20} />
                              </button>
                              <input 
                                type="text"
                                value={f.question}
                                onChange={e => {
                                  const newFaq = [...user.profile_theme.faq];
                                  newFaq[idx].question = e.target.value;
                                  setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, faq: newFaq } }));
                                }}
                                className="bg-transparent border-none outline-none text-sm font-black text-slate-800 placeholder:text-slate-400"
                                placeholder="Pergunta (Ex: Qual o valor da sessão?)"
                              />
                              <textarea 
                                value={f.answer}
                                onChange={e => {
                                  const newFaq = [...user.profile_theme.faq];
                                  newFaq[idx].answer = e.target.value;
                                  setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, faq: newFaq } }));
                                }}
                                className="bg-transparent border-none outline-none text-xs font-bold text-slate-500 placeholder:text-slate-400 min-h-[60px] resize-none"
                                placeholder="Resposta detalhada..."
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Gênero e Título */}
                    <div className="pt-6 border-t border-slate-100">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1 mb-4">Gênero Profissional</label>
                      <p className="text-[10px] text-slate-400 font-bold mb-4 px-1">Isso ajustará seu título automaticamente para "Psicólogo" ou "Psicóloga" na página pública.</p>
                      <div className="flex gap-3">
                        {[
                          { id: 'female', label: 'Feminino (Psicóloga)' },
                          { id: 'male', label: 'Masculino (Psicólogo)' },
                          { id: 'other', label: 'Outro (Psicólogo(a))' }
                        ].map(g => (
                          <button
                            key={g.id}
                            onClick={() => setUser(p => ({ ...p, gender: g.id as any }))}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border-2 ${
                              user.gender === g.id 
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                              : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tema */}
                    <div className="pt-6 border-t border-slate-100">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1 mb-6">Personalização do Tema</label>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <div className="flex items-center gap-2">
                             <div className="w-1.5 h-4 rounded-full bg-indigo-500"></div>
                             <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Cor Principal</p>
                           </div>
                           <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                             <input 
                              type="color" 
                              value={user.profile_theme.primaryColor}
                              onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, primaryColor: e.target.value } }))}
                              className="w-12 h-12 rounded-xl cursor-pointer border-none bg-transparent"
                             />
                             <div className="flex flex-col">
                               <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">{user.profile_theme.primaryColor}</span>
                               <span className="text-[9px] font-bold text-slate-400 uppercase">Clique para alterar</span>
                             </div>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <div className="flex items-center gap-2">
                             <div className="w-1.5 h-4 rounded-full bg-indigo-500"></div>
                             <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Layout da Página</p>
                           </div>
                           <div className="grid grid-cols-3 gap-3">
                             {[
                               {
                                 id: 'modern',
                                 label: 'Moderno',
                                 desc: 'Limpo e profissional',
                                 preview: (
                                   <div className="w-full h-16 rounded-xl bg-white border border-slate-100 overflow-hidden shadow-sm flex flex-col">
                                     <div className="h-4 bg-indigo-600 w-full" />
                                     <div className="flex-1 flex gap-1 p-1.5">
                                       <div className="w-1/2 bg-slate-100 rounded" />
                                       <div className="w-1/3 bg-indigo-100 rounded" />
                                     </div>
                                   </div>
                                 ),
                               },
                               {
                                 id: 'dark',
                                 label: 'Escuro',
                                 desc: 'Elegante e sofisticado',
                                 preview: (
                                   <div className="w-full h-16 rounded-xl bg-slate-900 overflow-hidden flex flex-col shadow-sm">
                                     <div className="h-4 bg-slate-700 w-full flex items-center px-2 gap-1">
                                       <div className="w-8 h-1.5 bg-indigo-400 rounded-full" />
                                     </div>
                                     <div className="flex-1 flex gap-1 p-1.5">
                                       <div className="w-1/2 bg-slate-700 rounded" />
                                       <div className="w-1/3 bg-indigo-800 rounded" />
                                     </div>
                                   </div>
                                 ),
                               },
                               {
                                 id: 'marble',
                                 label: 'Natural',
                                 desc: 'Acolhedor e humano',
                                 preview: (
                                   <div className="w-full h-16 rounded-xl overflow-hidden shadow-sm flex flex-col" style={{ background: 'linear-gradient(135deg, #FDFBF7 60%, #E6F4F1)' }}>
                                     <div className="h-4 w-full" style={{ background: 'linear-gradient(90deg, #5EAAA8, #4F7CAC)' }} />
                                     <div className="flex-1 flex gap-1 p-1.5">
                                       <div className="w-1/2 rounded" style={{ background: '#E6F0EE' }} />
                                       <div className="w-1/3 rounded" style={{ background: '#C9E4DE' }} />
                                     </div>
                                   </div>
                                 ),
                               },
                             ].map(l => (
                               <button
                                 key={l.id}
                                 onClick={() => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, layout: l.id } }))}
                                 className={`group relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                                   user.profile_theme.layout === l.id
                                   ? 'border-indigo-600 bg-indigo-50/50'
                                   : 'border-slate-100 bg-white hover:border-slate-200'
                                 }`}
                               >
                                 {l.preview}
                                 <span className={`text-[10px] font-black uppercase tracking-tight ${user.profile_theme.layout === l.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                                   {l.label}
                                 </span>
                                 <span className="text-[9px] text-slate-400 font-bold">{l.desc}</span>
                                 {user.profile_theme.layout === l.id && (
                                   <div className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center border-2 border-white">
                                     <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                   </div>
                                 )}
                               </button>
                             ))}
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
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
                 <button 
                   onClick={() => navigate('/privacidade')}
                   className="w-full py-3 bg-white text-indigo-600 rounded-2xl text-xs font-black shadow-lg hover:bg-slate-50 transition-colors"
                 >
                   ALTERAR SENHA
                 </button>
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
              <button 
                onClick={() => navigate('/ajuda')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl text-xs font-black transition-all"
              >
                Abrir Central de Ajuda <ExternalLink size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* Aurora Modal */}
      {auroraOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setAuroraOpen(false); }}>
          <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-sm">Aurora — Construtor de Perfil</p>
                <p className="text-indigo-200 text-[10px] font-bold mt-0.5">Passo {auroraStep + 1} de {AURORA_QUESTIONS.length}</p>
              </div>
              <button onClick={() => setAuroraOpen(false)} className="text-white/60 hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-indigo-100">
              <div
                className="h-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${((auroraStep + 1) / AURORA_QUESTIONS.length) * 100}%` }}
              />
            </div>

            {/* Question */}
            <div className="p-8">
              <label className="block text-sm font-black text-slate-800 mb-1 leading-snug">
                {AURORA_QUESTIONS[auroraStep].label}
              </label>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-5">
                Opcional — pule se preferir
              </p>
              <textarea
                key={auroraStep}
                autoFocus
                value={auroraAnswers[AURORA_QUESTIONS[auroraStep].key] || ''}
                onChange={e => setAuroraAnswers(prev => ({ ...prev, [AURORA_QUESTIONS[auroraStep].key]: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    if (auroraStep < AURORA_QUESTIONS.length - 1) setAuroraStep(s => s + 1);
                    else handleAuroraGenerate();
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold text-slate-700 placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all resize-none"
                rows={4}
                placeholder={AURORA_QUESTIONS[auroraStep].placeholder}
              />
              <p className="text-[9px] text-slate-300 font-bold mt-2 text-right">Ctrl+Enter para avançar</p>
            </div>

            {/* Footer */}
            <div className="px-8 pb-8 flex items-center justify-between gap-3">
              <button
                onClick={() => auroraStep > 0 ? setAuroraStep(s => s - 1) : setAuroraOpen(false)}
                className="flex items-center gap-2 px-5 py-2.5 text-slate-500 hover:text-slate-700 text-xs font-black rounded-xl transition-all border border-slate-200 hover:border-slate-300 bg-white"
              >
                {auroraStep > 0 ? '← Voltar' : 'Cancelar'}
              </button>

              <div className="flex items-center gap-2">
                {/* Step dots */}
                <div className="flex gap-1 mr-2">
                  {AURORA_QUESTIONS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setAuroraStep(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === auroraStep ? 'bg-indigo-600 w-4' : i < auroraStep ? 'bg-indigo-300' : 'bg-slate-200'}`}
                    />
                  ))}
                </div>

                {auroraStep < AURORA_QUESTIONS.length - 1 ? (
                  <button
                    onClick={() => setAuroraStep(s => s + 1)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-200 active:scale-95"
                  >
                    Próximo →
                  </button>
                ) : (
                  <button
                    onClick={handleAuroraGenerate}
                    disabled={auroraLoading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-indigo-200 active:scale-95 disabled:opacity-60"
                  >
                    {auroraLoading ? (
                      <><Loader2 size={13} className="animate-spin" /> Gerando...</>
                    ) : (
                      <><Sparkles size={13} /> Gerar Perfil</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
