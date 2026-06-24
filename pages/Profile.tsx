import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { api, getStaticUrl } from '../services/api';
import { PageHeader } from '../components/UI/PageHeader';
import { Modal } from '../components/UI/Modal';
import { Button } from '../components/UI/Button';
import { Input, Textarea } from '../components/UI/Input';
import {
  Mail,
  Phone,
  Building2,
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
  Calendar as CalendarIcon,
  Lock,
  Layout,
  Plus,
  X,
  Copy,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Calendar as AvailabilityCalendar } from '../components/UI/Calendar';

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

type ClosedDate = {
  date: string;
  label: string;
};

type ClosedDatePreset = ClosedDate & {
  buttonLabel: string;
};

const DEFAULT_SCHEDULE: ScheduleDay[] = [
  { dayKey: 'monday', active: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
  { dayKey: 'tuesday', active: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
  { dayKey: 'wednesday', active: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
  { dayKey: 'thursday', active: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
  { dayKey: 'friday', active: true, start: '08:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] },
  { dayKey: 'saturday', active: false, start: '09:00', end: '13:00', breaks: [] },
  { dayKey: 'sunday', active: false, start: '', end: '', breaks: [] },
];

const SATURDAY_SCHEDULE: ScheduleDay[] = [
  { dayKey: 'monday', active: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
  { dayKey: 'tuesday', active: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
  { dayKey: 'wednesday', active: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
  { dayKey: 'thursday', active: true, start: '08:00', end: '18:00', breaks: [{ start: '12:00', end: '13:00' }] },
  { dayKey: 'friday', active: true, start: '08:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] },
  { dayKey: 'saturday', active: true, start: '09:00', end: '13:00', breaks: [] },
  { dayKey: 'sunday', active: false, start: '', end: '', breaks: [] },
];

const cloneSchedule = (days: ScheduleDay[]) =>
  days.map((day) => ({
    ...day,
    breaks: day.breaks.map((item) => ({ ...item })),
  }));

const sortClosedDates = (items: ClosedDate[]) =>
  [...items].sort((a, b) => a.date.localeCompare(b.date));

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
};

const formatClosedDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const buildHolidayPresets = (year: number): ClosedDatePreset[] => [
  { date: year + '-01-01', label: 'Ano Novo', buttonLabel: 'Ano Novo ' + year },
  { date: year + '-04-21', label: 'Tiradentes', buttonLabel: 'Tiradentes ' + year },
  { date: year + '-05-01', label: 'Dia do Trabalho', buttonLabel: 'Dia do Trabalho ' + year },
  { date: year + '-09-07', label: 'Independencia', buttonLabel: 'Independencia ' + year },
  { date: year + '-11-02', label: 'Finados', buttonLabel: 'Finados ' + year },
  { date: year + '-12-25', label: 'Natal', buttonLabel: 'Natal ' + year },
];

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
      trajectory_url: '',
    },
    gender: 'female' as 'male' | 'female' | 'other',
    cpf: '',
    cnpj: '',
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

  const [schedule, setSchedule] = useState<ScheduleDay[]>(() => cloneSchedule(DEFAULT_SCHEDULE));
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [customDateInput, setCustomDateInput] = useState('');
  const [customLabelInput, setCustomLabelInput] = useState('');

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
              trajectory_url: data.profile_theme?.trajectory_url || '',
            },
            gender: data.gender || 'female',
            cpf: data.cpf || '',
            cnpj: data.cnpj || '',
          });
        }

        if (data?.schedule) {
          const scheduleData = typeof data.schedule === 'string' ? JSON.parse(data.schedule) : data.schedule;
          if (Array.isArray(scheduleData)) {
            const migrated = scheduleData.map((d: any) => ({
              ...d,
              breaks: d.breaks ?? (d.lunchStart ? [{ start: d.lunchStart, end: d.lunchEnd }] : []),
            }));
            setSchedule(migrated as ScheduleDay[]);
          }
        }

        if (data?.closed_dates) {
          const closedDatesData = typeof data.closed_dates === 'string' ? JSON.parse(data.closed_dates) : data.closed_dates;
          if (Array.isArray(closedDatesData)) {
            setClosedDates(
              sortClosedDates(
                closedDatesData
                  .filter((item: any) => item && item.date)
                  .map((item: any) => ({
                    date: String(item.date),
                    label: String(item.label || 'Folga'),
                  }))
              )
            );
          }
        } else {
          setClosedDates([]);
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

  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  const activeDaysCount = useMemo(
    () => schedule.filter((day) => day.active).length,
    [schedule]
  );

  const scheduleRangeLabel = useMemo(() => {
    const activeDays = schedule.filter((day) => day.active && day.start && day.end);
    if (activeDays.length === 0) return 'Fechado';

    const starts = activeDays.map((day) => day.start).sort();
    const ends = activeDays.map((day) => day.end).sort();
    return starts[0] + ' - ' + ends[ends.length - 1];
  }, [schedule]);

  const sortedClosedDates = useMemo(
    () => sortClosedDates(closedDates),
    [closedDates]
  );

  const nextClosedDate = useMemo(
    () => sortedClosedDates.find((item) => item.date >= todayIso) || sortedClosedDates[0] || null,
    [sortedClosedDates, todayIso]
  );

  const holidayPresets = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [...buildHolidayPresets(currentYear), ...buildHolidayPresets(currentYear + 1)]
      .filter((item) => item.date >= todayIso)
      .slice(0, 8);
  }, [todayIso]);

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

  const onTrajectoryPick = async (file?: File | null) => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('image', file);
      const data = await api.request<any>('/profile/trajectory-image', {
        method: 'POST',
        body: fd,
      });
      const newUrl = data.trajectory_url || '';
      if (newUrl) {
        setUser(prev => ({ 
          ...prev, 
          profile_theme: { ...prev.profile_theme, trajectory_url: newUrl } 
        }));
      }
    } catch (err) {
      console.error("Erro ao subir imagem da trajetória:", err);
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

  const applySchedulePreset = (preset: ScheduleDay[]) => {
    setSchedule(cloneSchedule(preset));
  };

  const clearBreaks = () => {
    setSchedule((prev) => prev.map((day) => ({ ...day, breaks: [] })));
  };

  const toggleClosedDate = (date: string) => {
    setClosedDates((prev) => {
      const exists = prev.some((item) => item.date === date);
      if (exists) return prev.filter((item) => item.date !== date);
      return sortClosedDates([...prev, { date, label: 'Folga' }]);
    });
  };

  const updateClosedDate = (date: string, patch: Partial<ClosedDate>) => {
    setClosedDates((prev) =>
      sortClosedDates(
        prev.map((item) =>
          item.date === date
            ? { ...item, ...patch }
            : item
        )
      )
    );
  };

  const addClosedDatePreset = (preset: ClosedDate) => {
    setClosedDates((prev) => {
      const exists = prev.some((item) => item.date === preset.date);
      if (exists) {
        return sortClosedDates(
          prev.map((item) =>
            item.date === preset.date && (!item.label || item.label === 'Folga')
              ? { ...item, label: preset.label }
              : item
          )
        );
      }
      return sortClosedDates([...prev, preset]);
    });
  };

  const clearClosedDates = () => {
    setClosedDates([]);
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
        closed_dates: closedDates,
        public_slug: user.public_slug,
        public_profile_enabled: user.public_profile_enabled,
        social_links: user.social_links,
        profile_theme: user.profile_theme,
        gender: user.gender,
        cpf: user.cpf,
        cnpj: user.cnpj,
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
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-4 pb-20 animate-fadeIn font-sans space-y-5">
      <PageHeader
        icon={<User />}
        title="Meu Perfil"
        subtitle="Gerencie suas informações pessoais, profissionais e configurações de conta."
        showBackButton
        onBackClick={() => navigate('/')}
        containerClassName="mb-6"
      />

      {/* Header Section */}
      <div className="relative">
        {/* Cover Photo */}
        <div className="h-48 sm:h-64 w-full relative overflow-hidden">
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
        <div className="mx-auto -mt-20 relative z-10 px-4 sm:px-6">
          <div className="bg-white rounded-[2rem] p-5 sm:p-6 shadow-[0_16px_40px_rgba(0,0,0,0.07)] border border-white/50">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-4 sm:gap-6">
              {/* Avatar */}
              <div className="relative -mt-16 md:-mt-20 group">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[1.5rem] bg-white p-1.5 shadow-xl border border-slate-100 overflow-hidden">
                  <div className="w-full h-full rounded-[1.3rem] overflow-hidden bg-slate-100 flex items-center justify-center">
                    {user.avatarUrl ? (
                      <img src={getStaticUrl(user.avatarUrl)} alt="Avatar" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    ) : (
                      <span className="text-3xl font-black text-indigo-400">{initials}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-1 right-1 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg border-2 border-white transition-all transform hover:scale-110"
                >
                  <Camera size={14} />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e => onAvatarPick(e.target.files?.[0])} />
              </div>

              {/* Name and Tags */}
              <div className="flex-1 text-center md:text-left pt-1 pb-2">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-800">{user.name || "Seu Nome"}</h1>
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Ativo
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-slate-500 font-semibold text-xs">
                  <span className="flex items-center gap-1.5"><Stethoscope size={14} className="text-indigo-500" /> {user.specialty || "Especialidade"}</span>
                  <span className="flex items-center gap-1.5"><Shield size={14} className="text-violet-500" /> CRP {user.crp || "-"}</span>
                  <span className="flex items-center gap-1 font-black text-indigo-600 px-2.5 py-0.5 bg-indigo-50 rounded-lg text-[10px]">PREMIUM</span>
                </div>
              </div>

              {/* Actions Header */}
              <div className="flex flex-col items-center md:items-end gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saveStatus === 'saving'}
                  variant={saveStatus === 'saved' ? 'success' : 'primary'}
                  size="md"
                  loading={saveStatus === 'saving'}
                  loadingText="Salvando..."
                  iconLeft={saveStatus === 'saved' ? <Award size={14} /> : <Save size={14} />}
                  elevation="md"
                >
                  {saveStatus === 'saved' ? 'Salvo!' : 'Salvar Perfil'}
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1.5 mt-5 border-t border-slate-100 pt-4 overflow-x-auto no-scrollbar">
              {[
                { id: 'info', label: 'Dados Pessoais', icon: <User size={13} /> },
                { id: 'schedule', label: 'Minha Agenda', icon: <CalendarIcon size={13} /> },
                { id: 'clinic', label: 'Dados da Clínica', icon: <Building2 size={13} /> },
                { id: 'external', label: 'Página Externa', icon: <Globe size={13} /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black transition-all whitespace-nowrap ${
                    activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-slate-100'
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
      <div className="mx-auto mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-5">
            {activeTab === 'info' && (
              <div className="space-y-4">
                <Card title="Sobre você" icon={<Info className="text-indigo-500" />}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <ProfileInput label="Nome Completo" icon={<User size={16} />} value={user.name} onChange={v => setUser(p => ({ ...p, name: v }))} />
                      <ProfileInput label="E-mail Profissional" icon={<Mail size={16} />} value={user.email} onChange={v => setUser(p => ({ ...p, email: v }))} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <ProfileInput
                        label="CPF"
                        icon={<Shield size={16} />}
                        value={user.cpf}
                        onChange={v => {
                          let val = v.replace(/\D/g, '');
                          if (val.length > 11) val = val.slice(0, 11);
                          if (val.length > 9) val = `${val.slice(0,3)}.${val.slice(3,6)}.${val.slice(6,9)}-${val.slice(9)}`;
                          else if (val.length > 6) val = `${val.slice(0,3)}.${val.slice(3,6)}.${val.slice(6)}`;
                          else if (val.length > 3) val = `${val.slice(0,3)}.${val.slice(3)}`;
                          setUser(p => ({ ...p, cpf: val }));
                        }}
                      />
                      <ProfileInput
                        label="CNPJ"
                        icon={<Building2 size={16} />}
                        value={user.cnpj}
                        onChange={v => {
                          let val = v.replace(/\D/g, '');
                          if (val.length > 14) val = val.slice(0, 14);
                          if (val.length > 12) val = `${val.slice(0,2)}.${val.slice(2,5)}.${val.slice(5,8)}/${val.slice(8,12)}-${val.slice(12)}`;
                          else if (val.length > 8) val = `${val.slice(0,2)}.${val.slice(2,5)}.${val.slice(5,8)}/${val.slice(8)}`;
                          else if (val.length > 5) val = `${val.slice(0,2)}.${val.slice(2,5)}.${val.slice(5)}`;
                          else if (val.length > 2) val = `${val.slice(0,2)}.${val.slice(2)}`;
                          setUser(p => ({ ...p, cnpj: val }));
                        }}
                      />
                    </div>
                    <Textarea
                      label="Breve Biografia / Perfil"
                      value={user.bio}
                      onChange={e => setUser(p => ({ ...p, bio: e.target.value }))}
                      rows={4}
                      maxLength={500}
                      placeholder="Conte um pouco sobre sua formação e experiência..."
                      className="text-sm"
                    />
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="space-y-4">
                {/* Stats Strip */}
                <div className="grid grid-cols-3 gap-3">
                  <ScheduleInsightCard
                    icon={<CalendarIcon size={18} />}
                    label="Dias ativos"
                    value={activeDaysCount + '/7'}
                    hint="Dias com atendimento"
                    tone="indigo"
                  />
                  <ScheduleInsightCard
                    icon={<Clock size={18} />}
                    label="Janela base"
                    value={scheduleRangeLabel}
                    hint="Abertura — encerramento"
                    tone="emerald"
                  />
                  <ScheduleInsightCard
                    icon={<Lock size={18} />}
                    label="Bloqueios"
                    value={String(sortedClosedDates.length)}
                    hint={nextClosedDate ? 'Prox: ' + nextClosedDate.date.slice(5).split('-').reverse().join('/') : 'Nenhum ainda'}
                    tone="amber"
                  />
                </div>

                {/* Preset Banner */}
                <div className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">Templates rápidos</p>
                    <p className="mt-0.5 text-sm font-black text-slate-700">Aplique um padrão de horário de uma vez</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => applySchedulePreset(DEFAULT_SCHEDULE)} variant="outline" size="sm">Seg – Sex</Button>
                    <Button onClick={() => applySchedulePreset(SATURDAY_SCHEDULE)} variant="soft" size="sm">Seg – Sáb</Button>
                    <Button onClick={clearBreaks} variant="softDanger" size="sm">Sem intervalos</Button>
                  </div>
                </div>

                {/* Weekly Schedule */}
                <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-800">Rotina semanal</h4>
                      <p className="text-xs font-bold text-slate-400">Defina horários e intervalos por dia da semana</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-100">
                      {activeDaysCount} dia{activeDaysCount !== 1 ? 's' : ''} ativo{activeDaysCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-2.5">
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
                </div>

                {/* Blocked Dates Section */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Calendar Picker */}
                  <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-800">Dias bloqueados</h4>
                        <p className="text-xs font-bold leading-relaxed text-slate-400">
                          Clique em um dia para bloquear ou liberar. Reflete na agenda.
                        </p>
                      </div>
                      <Button
                        onClick={clearClosedDates}
                        disabled={sortedClosedDates.length === 0}
                        variant="softDanger"
                        size="sm"
                      >
                        Limpar tudo
                      </Button>
                    </div>
                    <AvailabilityCalendar
                      blockedDates={sortedClosedDates.map((item) => item.date)}
                      onDateToggle={toggleClosedDate}
                    />

                    {/* Holiday presets */}
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Feriados rápidos</p>
                      <div className="flex flex-wrap gap-1.5">
                        {holidayPresets.map((preset) => {
                          const active = sortedClosedDates.some((item) => item.date === preset.date);
                          return (
                            <button
                              key={preset.date}
                              onClick={() => addClosedDatePreset({ date: preset.date, label: preset.label })}
                              className={active
                                ? 'rounded-full border border-indigo-300 bg-indigo-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-sm transition-all'
                                : 'rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600'}>
                              {preset.buttonLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Adicionar data específica manualmente */}
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Adicionar data específica</p>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={customDateInput}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={e => setCustomDateInput(e.target.value)}
                          className="flex-shrink-0 w-36 h-8 rounded-[10px] border border-zinc-200 bg-zinc-50 px-3 text-xs font-bold text-zinc-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 focus:bg-white transition-all"
                        />
                        <input
                          type="text"
                          value={customLabelInput}
                          onChange={e => setCustomLabelInput(e.target.value)}
                          placeholder="Motivo (Férias, Congresso...)"
                          className="flex-1 min-w-0 h-8 rounded-[10px] border border-zinc-200 bg-zinc-50 px-3 text-xs font-bold text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 focus:bg-white transition-all"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && customDateInput) {
                              addClosedDatePreset({ date: customDateInput, label: customLabelInput || 'Folga' });
                              setCustomDateInput('');
                              setCustomLabelInput('');
                            }
                          }}
                        />
                        <Button
                          type="button"
                          disabled={!customDateInput}
                          onClick={() => {
                            if (!customDateInput) return;
                            addClosedDatePreset({ date: customDateInput, label: customLabelInput || 'Folga' });
                            setCustomDateInput('');
                            setCustomLabelInput('');
                          }}
                          variant="primary"
                          size="sm"
                          iconLeft={<Plus size={12} strokeWidth={3} />}
                        >
                          Bloquear
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Blocked dates list */}
                  <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm flex flex-col">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-800">Lista de bloqueios</h4>
                        <p className="text-xs font-bold text-slate-400">Nomeie cada bloqueio para identificação</p>
                      </div>
                      {sortedClosedDates.length > 0 && (
                        <span className="shrink-0 rounded-full bg-amber-50 border border-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-600">
                          {sortedClosedDates.length} bloq.
                        </span>
                      )}
                    </div>

                    {sortedClosedDates.length === 0 ? (
                      <div className="flex flex-1 flex-col items-center justify-center rounded-[1.6rem] border-2 border-dashed border-slate-100 bg-slate-50/60 px-6 py-10 text-center">
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                          <CalendarIcon size={24} />
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Nenhum bloqueio</p>
                        <p className="mt-1.5 text-xs font-bold text-slate-400">Use o calendário ao lado para bloquear dias</p>
                      </div>
                    ) : (
                      <div className="space-y-2 overflow-y-auto max-h-[480px] pr-1">
                        {sortedClosedDates.map((item) => {
                          const isPast = item.date < todayIso;
                          return (
                            <div key={item.date}
                              className={`group flex items-center gap-3 rounded-2xl border p-3 transition-all ${isPast ? 'border-slate-100 bg-slate-50/70 opacity-60' : 'border-rose-100 bg-rose-50/40 hover:border-rose-200'}`}>
                              {/* Date badge */}
                              <div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl font-black leading-none ${isPast ? 'bg-slate-200 text-slate-500' : 'bg-rose-500 text-white shadow-md shadow-rose-100'}`}>
                                <span className="text-[11px] uppercase tracking-wide">{['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][parseInt(item.date.split('-')[1]) - 1]}</span>
                                <span className="text-lg leading-tight">{item.date.split('-')[2]}</span>
                              </div>
                              {/* Input */}
                              <div className="min-w-0 flex-1">
                                <input
                                  type="text"
                                  value={item.label}
                                  onChange={e => updateClosedDate(item.date, { label: e.target.value })}
                                  className="w-full bg-transparent text-sm font-black text-slate-800 outline-none placeholder:text-slate-300 focus:placeholder:opacity-0"
                                  placeholder="Motivo (Natal, Férias...)"
                                />
                                <p className="text-[10px] font-bold text-slate-400">{formatClosedDate(item.date)}{isPast ? ' · passado' : ''}</p>
                              </div>
                              {/* Remove */}
                              <button onClick={() => toggleClosedDate(item.date)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-100 hover:text-rose-600">
                                <X size={14} strokeWidth={3} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'external' && (
              <div className="space-y-4">
                <Card 
                  title="Sua Vitrine Digital" 
                  icon={<Globe className="text-pink-500" />}
                  subtitle="Crie uma página profissional pública para usar na sua bio do Instagram ou anúncios."
                >
                  <div className="space-y-8">
                    {/* Ativação */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-[1.25rem] border border-slate-100">
                      <div>
                        <h4 className="text-sm font-black text-slate-800">Status da Página</h4>
                        <p className="text-[10px] font-medium text-slate-400">Ative para que seu perfil seja visível publicamente.</p>
                      </div>
                      <button
                        onClick={() => setUser(p => ({ ...p, public_profile_enabled: !p.public_profile_enabled }))}
                        className={`w-12 h-7 rounded-full relative transition-all duration-300 shrink-0 ${user.public_profile_enabled ? 'bg-emerald-500 shadow-md shadow-emerald-100' : 'bg-slate-200'}`}
                      >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${user.public_profile_enabled ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>

                    {/* Slug / Link */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Seu Link Personalizado</label>
                      <div className="flex items-center gap-2">
                        <Input
                          addonLeft={<span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">psiflux.com.br/p/</span>}
                          value={user.public_slug}
                          onChange={e => {
                            const val = e.target.value
                              .toLowerCase()
                              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                              .replace(/[^a-z0-9]/g, '-')
                              .replace(/-+/g, '-');
                            setUser(p => ({ ...p, public_slug: val }));
                          }}
                          placeholder="ex-meu-nome"
                          size="sm"
                          wrapperClassName="flex-1"
                          className="text-indigo-600 font-black"
                        />
                        {user.public_slug && (
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(`https://psiflux.com.br/p/${user.public_slug}`);
                              pushToast('success', 'Link copiado!');
                            }}
                            variant="soft"
                            size="sm"
                            iconOnly
                            title="Copiar link"
                          >
                            <Copy size={15} />
                          </Button>
                        )}
                        <a
                          href={`/p/${user.public_slug}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Visualizar"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-slate-800 text-white hover:bg-slate-700 transition-colors shrink-0"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>

                    {/* Social Links */}
                    <div className="space-y-4 pt-4 border-t border-slate-50">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Links de Redes Sociais</label>
                        <Button
                          onClick={() => setUser(p => ({ ...p, social_links: [...p.social_links, { platform: 'Instagram', url: '' }] }))}
                          variant="ghost"
                          size="xs"
                          iconLeft={<Plus size={12} />}
                        >
                          Adicionar Link
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {user.social_links.map((link, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-xl group hover:border-indigo-200 transition-all shadow-sm">
                            <select
                              value={link.platform}
                              onChange={e => {
                                const newLinks = [...user.social_links];
                                newLinks[idx].platform = e.target.value;
                                setUser(p => ({ ...p, social_links: newLinks }));
                              }}
                              className="h-7 bg-zinc-50 border border-zinc-200 rounded-lg text-[10px] font-black text-zinc-700 focus:ring-0 focus:border-amber-400 outline-none pr-1 shrink-0"
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
                              className="flex-1 h-7 bg-transparent border-none outline-none text-xs font-bold text-zinc-800 placeholder:text-zinc-400"
                              placeholder="URL ou @usuário"
                            />
                            <button
                              onClick={() => setUser(p => ({ ...p, social_links: p.social_links.filter((_, i) => i !== idx) }))}
                              className="p-1 text-slate-300 hover:text-red-500 transition-all shrink-0"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      {user.social_links.length === 0 && (
                        <div className="text-center py-6 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                          <p className="text-[10px] font-black text-slate-400">NENHUM LINK ADICIONADO</p>
                        </div>
                      )}
                    </div>

                    {/* Aurora Builder */}
                    <div className="pt-8 border-t border-slate-100">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-indigo-200">
                          <Sparkles size={18} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-slate-800 text-sm">Aurora monta sua página por você</p>
                          <p className="text-xs text-slate-500 mt-0.5">Responda perguntas rápidas e a IA preenche o conteúdo automaticamente.</p>
                        </div>
                        <Button
                          onClick={() => { setAuroraOpen(true); setAuroraStep(0); setAuroraAnswers({}); }}
                          variant="primary"
                          size="sm"
                          iconLeft={<Sparkles size={13} />}
                          elevation="sm"
                        >
                          Gerar com IA
                        </Button>
                      </div>
                    </div>

                    {/* Site Content Management */}
                    <div className="pt-8 border-t border-slate-100">
                      <div className="flex items-center gap-2 mb-6">
                        <div className="w-1.5 h-6 rounded-full bg-indigo-500"></div>
                        <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Conteúdo Estratégico do Site</h4>
                      </div>

                      <div className="mb-5">
                        <Input
                          label="Seu Nome na Página Pública"
                          value={user.profile_theme.public_name || ''}
                          onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, public_name: e.target.value } }))}
                          placeholder="Ex: Dr. Eduardo Eloi"
                          size="sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <Input
                          label="Título de Impacto (Hero)"
                          value={user.profile_theme.hero_title || ''}
                          onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, hero_title: e.target.value } }))}
                          placeholder="Ex: Apoio Psicológico de Confiança"
                          size="sm"
                        />
                        <Input
                          label="Resumo das Especialidades"
                          value={user.profile_theme.specialties_summary || ''}
                          onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, specialties_summary: e.target.value } }))}
                          placeholder="Ex: Especialidades focadas no seu desenvolvimento..."
                          size="sm"
                        />
                      </div>

                      {/* Foto da Trajetória */}
                      <div className="pt-8 border-t border-slate-100 mb-8">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-1.5 h-6 rounded-full bg-indigo-500"></div>
                            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Foto da Trajetória / Bio</h4>
                        </div>
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                          <div
                            className="relative w-full md:w-48 h-48 bg-slate-50 rounded-[1.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center group hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer overflow-hidden"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = e => onTrajectoryPick((e.target as HTMLInputElement).files?.[0]);
                              input.click();
                            }}
                          >
                             {user.profile_theme.trajectory_url ? (
                               <img src={getStaticUrl(user.profile_theme.trajectory_url)} alt="Trajetória" className="w-full h-full object-cover" />
                             ) : (
                               <div className="text-center p-6">
                                 <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mx-auto mb-3 text-slate-300 group-hover:text-indigo-500 transition-all">
                                   <Camera size={24} />
                                 </div>
                                 <p className="text-[10px] font-black text-slate-400">ANEXAR FOTO DA TRAJETÓRIA</p>
                               </div>
                             )}
                             <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-all flex items-center justify-center">
                                <div className="p-3 bg-white rounded-2xl shadow-xl scale-0 group-hover:scale-100 transition-all">
                                  <Camera size={20} className="text-indigo-600" />
                                </div>
                             </div>
                          </div>
                          <div className="flex-1 space-y-4">
                            <p className="text-xs font-bold text-slate-500 leading-relaxed">
                              Esta foto aparecerá na seção "Trajetória Profissional" da sua página pública. 
                              Recomendamos uma foto do seu consultório ou uma foto sua em ambiente profissional.
                            </p>
                            <div className="flex gap-2">
                              {user.profile_theme.trajectory_url && (
                                <Button
                                  onClick={() => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, trajectory_url: '' } }))}
                                  variant="softDanger"
                                  size="sm"
                                >
                                  Remover Foto
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <Input
                          label="Anos de Experiência"
                          value={user.profile_theme.experience_years || ''}
                          onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, experience_years: e.target.value } }))}
                          placeholder="Ex: 8+"
                          size="sm"
                        />
                        <Input
                          label="Clientes/Vidas Atendidas"
                          value={user.profile_theme.patients_count || ''}
                          onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, patients_count: e.target.value } }))}
                          placeholder="Ex: +100"
                          size="sm"
                        />
                      </div>

                      {/* Cartões de Proposta de Valor */}
                      <div className="pt-8 border-t border-slate-100 mb-8">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-1.5 h-6 rounded-full bg-rose-500"></div>
                            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Cartões de Proposta de Valor (3 Cards)</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[1, 2, 3].map(num => (
                            <div key={num} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <Input
                                label={`Título Card ${num}`}
                                value={(user.profile_theme as any)[`prop_${num}_title`] || ''}
                                onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, [`prop_${num}_title`]: e.target.value } }))}
                                placeholder={`Título do Card ${num}`}
                                size="sm"
                              />
                              <Textarea
                                label={`Descrição Card ${num}`}
                                value={(user.profile_theme as any)[`prop_${num}_desc`] || ''}
                                onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, [`prop_${num}_desc`]: e.target.value } }))}
                                rows={2}
                                placeholder={`Descrição breve do Card ${num}`}
                                className="text-xs"
                              />
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
                        <div className="space-y-4">
                          <Input
                            label="Título da Seção de Passos"
                            value={user.profile_theme.steps_title || ''}
                            onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, steps_title: e.target.value } }))}
                            placeholder="Ex: Dê o primeiro passo hoje."
                            size="sm"
                          />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[1, 2, 3].map(num => (
                              <div key={num} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <Input
                                  label={`Passo ${num} — Título`}
                                  value={(user.profile_theme as any)[`step_${num}_title`] || ''}
                                  onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, [`step_${num}_title`]: e.target.value } }))}
                                  placeholder={`Título do Passo ${num}`}
                                  size="sm"
                                />
                                <Textarea
                                  label={`Passo ${num} — Descrição`}
                                  value={(user.profile_theme as any)[`step_${num}_desc`] || ''}
                                  onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, [`step_${num}_desc`]: e.target.value } }))}
                                  rows={2}
                                  placeholder={`Descrição do Passo ${num}`}
                                  className="text-xs"
                                />
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
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                          {[
                            { id: 'show_trajectory', label: 'Trajetória/Bio' },
                            { id: 'show_specialties', label: 'Especialidades' },
                            { id: 'show_faq', label: 'Perguntas (FAQ)' },
                            { id: 'show_schedule', label: 'Agenda Semanal' },
                            { id: 'show_map', label: 'Mapa/Localização' },
                          ].map(s => (
                            <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{s.label}</span>
                              <button
                                onClick={() => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, [s.id]: !p.profile_theme[s.id as keyof typeof p.profile_theme] } }))}
                                className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${user.profile_theme[s.id as keyof typeof user.profile_theme] ? 'bg-indigo-600' : 'bg-slate-300'}`}
                              >
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${user.profile_theme[s.id as keyof typeof user.profile_theme] ? 'left-4' : 'left-0.5'}`} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Specialties Tags Editor */}
                      <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialidades em Cartão</label>
                          <Button
                            onClick={() => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, specialties_list: [...(p.profile_theme.specialties_list || []), ''] } }))}
                            variant="ghost"
                            size="xs"
                            iconLeft={<Plus size={12} />}
                          >
                            Adicionar Item
                          </Button>
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
                          <Button
                            onClick={() => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, faq: [...(p.profile_theme.faq || []), { question: '', answer: '' }] } }))}
                            variant="ghost"
                            size="xs"
                            iconLeft={<Plus size={12} />}
                          >
                            Adicionar Pergunta
                          </Button>
                        </div>

                        <div className="space-y-2.5">
                          {(user.profile_theme.faq || []).map((f, idx) => (
                            <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2.5 relative group">
                              <button
                                onClick={() => {
                                  const newFaq = [...user.profile_theme.faq];
                                  newFaq.splice(idx, 1);
                                  setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, faq: newFaq } }));
                                }}
                                className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <X size={15} />
                              </button>
                              <input
                                type="text"
                                value={f.question}
                                onChange={e => {
                                  const newFaq = [...user.profile_theme.faq];
                                  newFaq[idx].question = e.target.value;
                                  setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, faq: newFaq } }));
                                }}
                                className="bg-transparent border-none outline-none text-xs font-black text-slate-800 placeholder:text-slate-400 pr-6"
                                placeholder="Pergunta (Ex: Qual o valor da sessão?)"
                              />
                              <textarea
                                value={f.answer}
                                onChange={e => {
                                  const newFaq = [...user.profile_theme.faq];
                                  newFaq[idx].answer = e.target.value;
                                  setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, faq: newFaq } }));
                                }}
                                className="bg-transparent border-none outline-none text-[11px] font-medium text-slate-500 placeholder:text-zinc-400 min-h-[50px] resize-none"
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
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'female', label: 'Feminino (Psicóloga)' },
                          { id: 'male', label: 'Masculino (Psicólogo)' },
                          { id: 'other', label: 'Outro (Psicólogo(a))' }
                        ].map(g => (
                          <Button
                            key={g.id}
                            onClick={() => setUser(p => ({ ...p, gender: g.id as any }))}
                            variant={user.gender === g.id ? 'primary' : 'soft'}
                            size="sm"
                          >
                            {g.label}
                          </Button>
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
                           <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                             <input
                              type="color"
                              value={user.profile_theme.primaryColor}
                              onChange={e => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, primaryColor: e.target.value } }))}
                              className="w-9 h-9 rounded-lg cursor-pointer border-none bg-transparent"
                             />
                             <div className="flex flex-col">
                               <span className="text-xs font-black text-slate-700 uppercase tracking-tighter">{user.profile_theme.primaryColor}</span>
                               <span className="text-[9px] font-medium text-slate-400">Clique para alterar</span>
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
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {/* Logo Upload Area */}
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Logomarca Oficial</label>
                        <div
                          className="relative h-36 bg-slate-50 rounded-[1.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center group hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer overflow-hidden p-4"
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
                          className="relative h-36 bg-slate-50 rounded-[1.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center group hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer overflow-hidden"
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                    <ProfileInput label="Razão Social / Nome Fantasia" icon={<Building2 size={16} />} value={user.companyName} onChange={v => setUser(p => ({ ...p, companyName: v }))} />
                    <ProfileInput label="Registro Profissional (CRP/CRM)" icon={<Shield size={16} />} value={user.crp} onChange={v => setUser(p => ({ ...p, crp: v }))} />
                  </div>
                  <ProfileInput label="Endereço Físico Completo" icon={<MapPin size={16} />} value={user.address} onChange={v => setUser(p => ({ ...p, address: v }))} />
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-4">
            {/* Security Card */}
            <div className="bg-indigo-600 rounded-[1.5rem] p-5 text-white overflow-hidden relative shadow-lg shadow-indigo-100/60">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 bg-white/20 rounded-lg border border-white/20">
                    <Lock size={15} />
                  </div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-indigo-100">Segurança</h4>
                </div>
                <p className="text-xs font-medium leading-relaxed mb-4 text-indigo-100">Sua conta está protegida com criptografia de ponta a ponta.</p>
                <Button
                  onClick={() => navigate('/privacidade')}
                  variant="outline"
                  size="sm"
                  fullWidth
                  className="!bg-white !border-white/80 !text-indigo-600 hover:!bg-slate-50"
                >
                  Alterar Senha
                </Button>
              </div>
            </div>

            {/* Profile Tips */}
            <div className="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Dicas de Perfil</h4>
              <div className="space-y-3">
                <CheckItem label="Foto de perfil de alta qualidade" checked={!!user.avatarUrl} />
                <CheckItem label="Biografia detalhada" checked={user.bio.length > 50} />
                <CheckItem label="Agenda de horários configurada" checked={schedule.some(d => d.active)} />
                <CheckItem label="Folgas e datas especiais definidas" checked={sortedClosedDates.length > 0} />
                <CheckItem label="Endereço da clínica preenchido" checked={!!user.address} />
              </div>
            </div>

            {/* Support */}
            <div className="p-5 bg-slate-800 rounded-[1.5rem] text-white space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center shrink-0">
                  <Layout size={16} className="text-indigo-400" />
                </div>
                <div>
                  <h5 className="text-xs font-black">Suporte Psiflux</h5>
                  <p className="text-[10px] text-slate-400 font-medium">Precisa de ajuda?</p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/ajuda')}
                variant="primary"
                size="sm"
                fullWidth
                iconRight={<ExternalLink size={13} />}
              >
                Abrir Central de Ajuda
              </Button>
            </div>
          </div>
        </div>
      </div>


      {/* Aurora Modal */}
      <Modal
        isOpen={auroraOpen}
        onClose={() => setAuroraOpen(false)}
        title="Aurora — Construtor de Perfil"
        subtitle={`Passo ${auroraStep + 1} de ${AURORA_QUESTIONS.length}`}
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between gap-3 p-1">
            <Button
              onClick={() => auroraStep > 0 ? setAuroraStep(s => s - 1) : setAuroraOpen(false)}
              variant="soft"
              size="sm"
            >
              {auroraStep > 0 ? '← Voltar' : 'Cancelar'}
            </Button>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex gap-1 mr-2">
                {AURORA_QUESTIONS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setAuroraStep(i)}
                    className={`h-1.5 rounded-full transition-all ${i === auroraStep ? 'bg-indigo-600 w-4' : i < auroraStep ? 'bg-indigo-300 w-1.5' : 'bg-slate-200 w-1.5'}`}
                  />
                ))}
              </div>

              {auroraStep < AURORA_QUESTIONS.length - 1 ? (
                <Button
                  onClick={() => setAuroraStep(s => s + 1)}
                  variant="primary"
                  size="sm"
                  elevation="sm"
                >
                  Próximo →
                </Button>
              ) : (
                <Button
                  onClick={handleAuroraGenerate}
                  disabled={auroraLoading}
                  loading={auroraLoading}
                  loadingText="Gerando..."
                  variant="primary"
                  size="sm"
                  iconLeft={<Sparkles size={13} />}
                  elevation="sm"
                >
                  Gerar Perfil
                </Button>
              )}
            </div>
          </div>
        }
      >
        {/* Progress bar overlaying just under header */}
        <div className="h-1 bg-indigo-50 w-full mb-4">
          <div
            className="h-full bg-indigo-600 transition-all duration-500 rounded-r-full"
            style={{ width: `${((auroraStep + 1) / AURORA_QUESTIONS.length) * 100}%` }}
          />
        </div>

        {/* Question Content */}
        <div className="px-6 pb-6">
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
            className="w-full bg-zinc-50 border border-zinc-200 rounded-[10px] px-3 py-2.5 text-sm font-bold text-zinc-800 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-400 focus:bg-white transition-all resize-none"
            rows={4}
            placeholder={AURORA_QUESTIONS[auroraStep].placeholder}
          />
          <p className="text-[9px] text-slate-300 font-bold mt-2 text-right">Ctrl+Enter para avançar</p>
        </div>
      </Modal>

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
    <div className="bg-white rounded-[1.75rem] p-5 sm:p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-base font-black text-slate-800 tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs font-medium text-slate-400 mt-0.5 leading-relaxed">{subtitle}</p>}
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
    <Input
      label={label}
      iconLeft={<span className="flex items-center">{icon}</span>}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={`Digite ${label.toLowerCase()}...`}
      size="sm"
    />
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

  const breakSummary = day.breaks.length === 0
    ? 'Sem intervalos configurados'
    : day.breaks.length === 1
      ? '1 intervalo configurado'
      : day.breaks.length + ' intervalos configurados';

  const summary = day.active
    ? 'Das ' + (day.start || '--:--') + ' as ' + (day.end || '--:--') + ' - ' + breakSummary
    : 'Dia fechado para atendimento';

  return (
    <div className={day.active ? 'overflow-hidden rounded-[1.25rem] border border-emerald-100 bg-gradient-to-r from-white via-white to-emerald-50/70 p-3.5 shadow-sm transition-all' : 'overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50/90 p-3.5 transition-all'}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <button
              onClick={onToggle}
              className={day.active ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-100 transition-all hover:bg-emerald-600' : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm transition-all hover:bg-slate-100'}
            >
              <ChevronRight size={14} className={day.active ? 'rotate-90 transition-transform' : 'transition-transform'} />
            </button>

            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-black uppercase tracking-tight text-slate-800">{t('days.' + day.dayKey)}</p>
                <span className={day.active ? 'inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700' : 'inline-flex items-center rounded-full bg-slate-200 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500'}>
                  {day.active ? 'Disponível' : 'Fechado'}
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-400">{summary}</p>
            </div>
          </div>

          <div className="hidden xl:block xl:flex-1" />

          <div className="flex flex-wrap items-center gap-1.5">
            {day.active && (
              <Button onClick={addBreak} variant="soft" size="xs" iconLeft={<Plus size={11} strokeWidth={3} />} title="Adicionar intervalo">
                Intervalo
              </Button>
            )}
            <Button onClick={onCopyToAll} variant="outline" size="xs" iconLeft={<Copy size={11} strokeWidth={3} />} title="Repetir este horário">
              Repetir
            </Button>
            <Button onClick={onToggle} variant={day.active ? 'secondary' : 'soft'} size="xs">
              {day.active ? 'Fechar' : 'Liberar'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-white bg-white/90 p-3 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">Horário base</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <TimeInput value={day.start} onChange={v => onUpdate({ start: v })} disabled={!day.active} />
              <span className="px-1 text-[10px] font-black text-slate-300">às</span>
              <TimeInput value={day.end} onChange={v => onUpdate({ end: v })} disabled={!day.active} />
            </div>
          </div>

          <div className="rounded-xl border border-white bg-white/90 p-3 shadow-sm">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">Intervalos</p>
            <p className="mt-2 text-xs font-medium text-slate-500">{day.active ? breakSummary : 'Ative o dia para configurar pausas.'}</p>
          </div>
        </div>
      </div>

      {day.active && day.breaks.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-emerald-100/80 pt-3">
          {day.breaks.map((b, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border border-white bg-white/90 p-2.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <Clock size={12} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {day.breaks.length > 1 ? `Intervalo ${i + 1}` : 'Intervalo'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap">
                <TimeInput value={b.start} onChange={v => updateBreak(i, 'start', v)} disabled={!day.active} />
                <span className="px-1 text-[10px] font-black text-slate-300">às</span>
                <TimeInput value={b.end} onChange={v => updateBreak(i, 'end', v)} disabled={!day.active} />
                <button
                  onClick={() => removeBreak(i)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-500 transition-all hover:bg-rose-600 hover:text-white"
                >
                  <X size={13} strokeWidth={3} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function ScheduleInsightCard({
  icon,
  label,
  value,
  hint,
  tone = 'indigo',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone?: 'indigo' | 'emerald' | 'amber';
}) {
  const toneMap = {
    indigo: { wrap: 'bg-indigo-100 text-indigo-600', value: 'text-indigo-700' },
    emerald: { wrap: 'bg-emerald-100 text-emerald-600', value: 'text-emerald-700' },
    amber: { wrap: 'bg-amber-100 text-amber-600', value: 'text-amber-700' },
  } as const;

  const styles = toneMap[tone];

  return (
    <div className="rounded-[1.25rem] border border-slate-100 bg-white p-3.5 shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ' + styles.wrap}>{icon}</div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
          <p className={'truncate text-base font-black tracking-tight ' + styles.value}>{value}</p>
          <p className="text-[10px] font-medium leading-relaxed text-slate-400">{hint}</p>
        </div>
      </div>
    </div>
  );
}

function TimeInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <input
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={`h-7 bg-white border border-zinc-200 rounded-lg px-2 text-[11px] font-black text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-400 transition-all ${
        disabled ? 'opacity-30 cursor-not-allowed' : 'hover:border-zinc-300'
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
