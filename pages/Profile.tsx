import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { api, getStaticUrl } from '../services/api';
import {
  PageWrapper, SectionTitle, ContentCard, PanelCard, FormRow, StatGrid, StatCard,
  Tabs, Alert, Badge, EmptyState, Switch, Modal, Button, IconButton, Input, Textarea, Select, Combobox,
} from '../components/UI';
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
  ArrowLeft,
  Check,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Calendar as AvailabilityCalendar } from '../components/UI/Calendar';
import { maskPhoneBR, maskCpf, maskCpfCnpj } from '../src/lib/masks';
import { getPublicBaseUrl } from '../src/lib/publicLinks';

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

interface ProfessionalArea {
  id: number;
  name: string;
  category: string;
  registry_label: string | null;
  registry_mask: string | null;
}

function applyRegistryMask(raw: string, mask?: string | null): string {
  if (!mask) return raw;
  const digits = raw.replace(/[^A-Za-z0-9]/g, '');
  let result = '';
  let di = 0;
  for (let i = 0; i < mask.length && di < digits.length; i++) {
    if (mask[i] === '0') {
      result += digits[di];
      di++;
    } else {
      result += mask[i];
    }
  }
  // Alguns conselhos regionais emitem registros com mais dígitos do que o
  // padrão da máscara prevê — em vez de travar, os dígitos excedentes são
  // anexados ao final para não impedir o usuário de digitar o número real.
  if (di < digits.length) {
    result += digits.slice(di);
  }
  return result;
}

const buildHolidayPresets = (year: number): ClosedDatePreset[] => [
  { date: year + '-01-01', label: 'Ano Novo', buttonLabel: 'Ano Novo ' + year },
  { date: year + '-04-21', label: 'Tiradentes', buttonLabel: 'Tiradentes ' + year },
  { date: year + '-05-01', label: 'Dia do Trabalho', buttonLabel: 'Dia do Trabalho ' + year },
  { date: year + '-09-07', label: 'Independencia', buttonLabel: 'Independencia ' + year },
  { date: year + '-11-02', label: 'Finados', buttonLabel: 'Finados ' + year },
  { date: year + '-12-25', label: 'Natal', buttonLabel: 'Natal ' + year },
];

type ProfileTab = 'info' | 'schedule' | 'closed' | 'clinic' | 'external' | 'content' | 'blocks' | 'faq' | 'theme';

const PROFILE_TABS = [
  { id: 'info', label: 'Dados pessoais', icon: User },
  { id: 'schedule', label: 'Minha agenda', icon: CalendarIcon },
  { id: 'closed', label: 'Bloqueios', icon: Lock },
  { id: 'clinic', label: 'Clínica', icon: Building2 },
  { id: 'external', label: 'Página externa', icon: Globe },
  { id: 'content', label: 'Textos do site', icon: Layout },
  { id: 'blocks', label: 'Proposta e passos', icon: Award },
  { id: 'faq', label: 'Especialidades e FAQ', icon: Info },
  { id: 'theme', label: 'Tema', icon: ImageIcon },
] as const;

const SITE_TAB_IDS: readonly string[] = ['external', 'content', 'blocks', 'faq', 'theme'];

export const Profile: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { updateUser, hasPermission } = useAuth();

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
    professionalAreaId: '' as string | number,
    registryNumber: '',
    areaName: '',
    registryLabel: '',
    registryMask: '',
    companyName: '',
    address: '',
    bio: '',
    waitingRoomMessage: '',
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

  // A rota "Meu Site" (menu próprio) abre este mesmo componente já direto na
  // aba "Página Externa", escondendo as demais — evita duplicar toda a lógica
  // de load/save do perfil (compartilhada por todas as abas) num arquivo novo.
  const isMySiteRoute = window.location.pathname === '/meu-site';
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => {
    if (isMySiteRoute) return 'external';
    const tab = new URLSearchParams(window.location.search).get('tab');
    return tab === 'schedule' ? 'schedule' : tab === 'external' ? 'external' : 'info';
  });

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
    { key: 'hero_title',   label: 'Qual seria o título de impacto da sua página? (opcional)',               placeholder: 'Ex: Apoio Psicológico de Confiança. Ou deixe em branco para a Bia criar.' },
    { key: 'faq',          label: 'Liste 3 dúvidas frequentes dos seus pacientes (uma por linha).',         placeholder: 'Ex:\nQual o valor da sessão?\nVocê atende online?\nPreciso de encaminhamento?' },
  ];

  const [areas, setAreas] = useState<ProfessionalArea[]>([]);
  const [areasLoading, setAreasLoading] = useState(true);

  useEffect(() => {
    api.get<ProfessionalArea[]>('/professional-areas')
      .then(data => setAreas(Array.isArray(data) ? data : []))
      .catch(() => setAreas([]))
      .finally(() => setAreasLoading(false));
  }, []);

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
            phone: data.phone ? maskPhoneBR(data.phone) : '',
            crp: data.crp || '',
            specialty: data.specialty || '',
            professionalAreaId: data.professional_area_id || '',
            registryNumber: data.registry_number || data.crp || '',
            areaName: data.area_name || '',
            registryLabel: data.registry_label || 'CRP',
            registryMask: data.registry_mask || '',
            companyName: data.company_name || data.companyName || '',
            address: data.address || '',
            bio: data.bio || '',
            waitingRoomMessage: data.waiting_room_message || data.waitingRoomMessage || '',
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
            cpf: data.cpf ? maskCpfCnpj(data.cpf) : '',
            cnpj: data.cnpj ? maskCpfCnpj(data.cnpj) : '',
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
      pushToast('success', 'Bia montou sua página! Revise e salve as alterações.');
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
        professional_area_id: user.professionalAreaId || null,
        registry_number: user.registryNumber,
        company_name: user.companyName,
        address: user.address,
        bio: user.bio,
        waiting_room_message: user.waitingRoomMessage,
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

  const tabItems = PROFILE_TABS
    .filter(tab => !isMySiteRoute || SITE_TAB_IDS.includes(tab.id))
    .map(tab => (tab.id === 'closed' && sortedClosedDates.length > 0 ? { ...tab, badge: sortedClosedDates.length } : tab));

  const updateTheme = (patch: Record<string, any>) => setUser(p => ({ ...p, profile_theme: { ...p.profile_theme, ...patch } }));
  const themeText = (key: string) => ((user.profile_theme as any)[key] as string) || '';

  const pickTrajectory = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = e => onTrajectoryPick((e.target as HTMLInputElement).files?.[0]);
    input.click();
  };

  const addBlockedDate = () => {
    if (!customDateInput) return;
    addClosedDatePreset({ date: customDateInput, label: customLabelInput || 'Folga' });
    setCustomDateInput('');
    setCustomLabelInput('');
  };

  const dropzone = 'relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center transition-colors hover:border-primary-300 hover:bg-primary-50/40';

  return (
    <PageWrapper className="animate-fadeIn font-sans">
      <div className="space-y-4">
        <div>
          <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/')}>Voltar</Button>
        </div>

        <SectionTitle
          icon={User}
          title="Meu Perfil"
          description="Gerencie suas informações pessoais, profissionais e configurações de conta."
        />

        {/* Cabeçalho do perfil */}
        <ContentCard padding="none" className="overflow-hidden">
          <div className="relative h-24 sm:h-32 w-full bg-primary-600">
            {user.coverUrl && <img src={getStaticUrl(user.coverUrl)} alt="Cover" className="h-full w-full object-cover" />}
            <div className="absolute right-3 top-3">
              <Button variant="outline" size="xs" iconLeft={<Camera size={14} />} onClick={() => coverInputRef.current?.click()}>
                Alterar capa
              </Button>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => onCoverPick(e.target.files?.[0])} />
            </div>
          </div>

          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <div className="relative -mt-10 h-14 w-14 shrink-0 sm:-mt-12 sm:h-16 sm:w-16">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-primary-50">
                {user.avatarUrl ? (
                  <img src={getStaticUrl(user.avatarUrl)} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-base font-medium text-primary-700">{initials}</span>
                )}
              </div>
              <IconButton
                variant="primary"
                size="xs"
                aria-label="Alterar foto de perfil"
                className="absolute -bottom-1 -right-1"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera size={14} />
              </IconButton>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e => onAvatarPick(e.target.files?.[0])} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-medium text-slate-900 sm:text-lg">{user.name || 'Seu Nome'}</h2>
                <Badge color="success" dot size="sm">Ativo</Badge>
                <Badge color="primary" size="sm">PREMIUM</Badge>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><Stethoscope size={14} className="text-primary-600" /> {user.specialty || 'Especialidade'}</span>
                <span className="flex items-center gap-1.5"><Shield size={14} className="text-primary-600" /> CRP {user.crp || '-'}</span>
              </div>
            </div>
          </div>
        </ContentCard>

        {/* Seções (na rota "Meu Site" só as abas da página externa fazem sentido) */}
        <Tabs<ProfileTab> items={tabItems} value={activeTab} onChange={setActiveTab} label="Seções do perfil">
          {activeTab === 'info' && (
            <div className="space-y-3">
              <PanelCard icon={Info} title="Sobre você" description="Dados usados em documentos, agenda e página pública.">
                <div className="space-y-3">
                  <FormRow>
                    <ProfileInput label="Nome Completo" icon={<User size={14} />} value={user.name} onChange={v => setUser(p => ({ ...p, name: v }))} />
                    <ProfileInput label="E-mail Profissional" icon={<Mail size={14} />} value={user.email} onChange={v => setUser(p => ({ ...p, email: v }))} />
                    <ProfileInput
                      label="Telefone / WhatsApp"
                      icon={<Phone size={14} />}
                      value={user.phone}
                      onChange={v => setUser(p => ({ ...p, phone: maskPhoneBR(v) }))}
                    />
                    <Combobox
                      label="Área de Atuação"
                      icon={<Stethoscope size={14} />}
                      options={areas.map(a => ({ value: String(a.id), label: a.name, group: a.category }))}
                      value={user.professionalAreaId ? String(user.professionalAreaId) : ''}
                      onChange={v => {
                        const idStr = Array.isArray(v) ? v[0] : v;
                        const area = areas.find(a => String(a.id) === idStr);
                        setUser(p => ({
                          ...p,
                          professionalAreaId: idStr || '',
                          specialty: area?.name || p.specialty,
                          areaName: area?.name || '',
                          registryLabel: area?.registry_label || 'CRP',
                          registryMask: area?.registry_mask || '',
                        }));
                      }}
                      placeholder={areasLoading ? 'Carregando áreas…' : 'Selecione sua área'}
                      disabled={areasLoading}
                    />
                    <ProfileInput
                      label="CPF"
                      icon={<Shield size={14} />}
                      value={user.cpf}
                      onChange={v => setUser(p => ({ ...p, cpf: maskCpf(v) }))}
                    />
                    <ProfileInput
                      label="CNPJ"
                      icon={<Building2 size={14} />}
                      value={user.cnpj}
                      onChange={v => setUser(p => ({ ...p, cnpj: maskCpfCnpj(v) }))}
                    />
                  </FormRow>
                  <Textarea
                    label="Breve Biografia / Perfil"
                    value={user.bio}
                    onChange={e => setUser(p => ({ ...p, bio: e.target.value }))}
                    rows={4}
                    maxLength={500}
                    placeholder="Conte um pouco sobre sua formação e experiência..."
                  />
                </div>
              </PanelCard>

              <PanelCard icon={Lock} title="Segurança e ajuda">
                <div className="space-y-3">
                  <Alert variant="info">Sua conta está protegida com criptografia de ponta a ponta.</Alert>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" iconLeft={<Lock size={14} />} onClick={() => navigate('/privacidade')}>Alterar senha</Button>
                    <Button variant="outline" size="sm" iconRight={<ExternalLink size={14} />} onClick={() => navigate('/ajuda')}>Abrir Central de Ajuda</Button>
                  </div>
                </div>
              </PanelCard>

              <PanelCard icon={Check} title="Dicas de perfil" description="Complete estes itens para um perfil mais confiável.">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <CheckItem label="Foto de perfil de alta qualidade" checked={!!user.avatarUrl} />
                  <CheckItem label="Biografia detalhada" checked={user.bio.length > 50} />
                  <CheckItem label="Agenda de horários configurada" checked={schedule.some(d => d.active)} />
                  <CheckItem label="Folgas e datas especiais definidas" checked={sortedClosedDates.length > 0} />
                  <CheckItem label="Endereço da clínica preenchido" checked={!!user.address} />
                </div>
              </PanelCard>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-3">
              <StatGrid cols={3}>
                <StatCard icon={CalendarIcon} title="Dias ativos" value={activeDaysCount + '/7'} description="Dias com atendimento" />
                <StatCard icon={Clock} title="Janela base" value={scheduleRangeLabel} description="Abertura — encerramento" color="success" />
                <StatCard
                  icon={Lock}
                  title="Bloqueios"
                  value={String(sortedClosedDates.length)}
                  description={nextClosedDate ? 'Próx: ' + nextClosedDate.date.slice(5).split('-').reverse().join('/') : 'Nenhum ainda'}
                  color="warning"
                />
              </StatGrid>

              <PanelCard
                icon={CalendarIcon}
                title="Rotina semanal"
                description="Defina horários e intervalos por dia da semana. Templates rápidos aplicam um padrão de uma vez."
                action={
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <Button onClick={() => applySchedulePreset(DEFAULT_SCHEDULE)} variant="outline" size="xs">Seg – Sex</Button>
                    <Button onClick={() => applySchedulePreset(SATURDAY_SCHEDULE)} variant="outline" size="xs">Seg – Sáb</Button>
                    <Button onClick={clearBreaks} variant="softDanger" size="xs">Sem intervalos</Button>
                  </div>
                }
              >
                <div className="space-y-2">
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
              </PanelCard>
            </div>
          )}

          {activeTab === 'closed' && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <PanelCard
                icon={Lock}
                title="Dias bloqueados"
                description="Clique em um dia para bloquear ou liberar. Reflete na agenda."
                action={
                  <div className="flex lg:justify-end">
                    <Button onClick={clearClosedDates} disabled={sortedClosedDates.length === 0} variant="softDanger" size="xs">Limpar tudo</Button>
                  </div>
                }
              >
                <div className="space-y-3">
                  <AvailabilityCalendar
                    blockedDates={sortedClosedDates.map((item) => item.date)}
                    onDateToggle={toggleClosedDate}
                  />

                  {/* Holiday presets */}
                  <div className="border-t border-slate-100 pt-3">
                    <p className="mb-2 text-xs font-medium text-slate-600">Feriados rápidos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {holidayPresets.map((preset) => {
                        const active = sortedClosedDates.some((item) => item.date === preset.date);
                        return (
                          <Button
                            key={preset.date}
                            size="xs"
                            variant={active ? 'primary' : 'outline'}
                            onClick={() => addClosedDatePreset({ date: preset.date, label: preset.label })}
                          >
                            {preset.buttonLabel}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Adicionar data específica manualmente */}
                  <div className="border-t border-slate-100 pt-3">
                    <p className="mb-2 text-xs font-medium text-slate-600">Adicionar data específica</p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <Input
                        type="date"
                        size="sm"
                        value={customDateInput}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={e => setCustomDateInput(e.target.value)}
                        wrapperClassName="sm:w-40 shrink-0"
                      />
                      <Input
                        size="sm"
                        value={customLabelInput}
                        onChange={e => setCustomLabelInput(e.target.value)}
                        placeholder="Motivo (Férias, Congresso...)"
                        wrapperClassName="flex-1"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && customDateInput) addBlockedDate();
                        }}
                      />
                      <Button type="button" disabled={!customDateInput} onClick={addBlockedDate} variant="primary" size="sm" iconLeft={<Plus size={14} />}>
                        Bloquear
                      </Button>
                    </div>
                  </div>
                </div>
              </PanelCard>

              <PanelCard
                icon={CalendarIcon}
                title="Lista de bloqueios"
                description="Nomeie cada bloqueio para identificação"
                action={sortedClosedDates.length > 0 ? <div className="flex lg:justify-end"><Badge color="warning" size="sm">{sortedClosedDates.length} bloq.</Badge></div> : undefined}
              >
                {sortedClosedDates.length === 0 ? (
                  <EmptyState icon={CalendarIcon} title="Nenhum bloqueio" description="Use o calendário ao lado para bloquear dias." />
                ) : (
                  <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
                    {sortedClosedDates.map((item) => {
                      const isPast = item.date < todayIso;
                      return (
                        <div key={item.date}
                          className={`flex items-center gap-3 rounded-lg border p-2.5 transition-all ${isPast ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-red-100 bg-red-50/40'}`}>
                          <div className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg font-medium leading-none ${isPast ? 'bg-slate-200 text-slate-500' : 'bg-red-500 text-white'}`}>
                            <span className="text-[11px]">{['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][parseInt(item.date.split('-')[1]) - 1]}</span>
                            <span className="text-sm leading-tight">{item.date.split('-')[2]}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <Input
                              size="sm"
                              value={item.label}
                              onChange={e => updateClosedDate(item.date, { label: e.target.value })}
                              placeholder="Motivo (Natal, Férias...)"
                              aria-label="Motivo do bloqueio"
                            />
                            <p className="mt-0.5 text-[11px] text-slate-500">{formatClosedDate(item.date)}{isPast ? ' · passado' : ''}</p>
                          </div>
                          <IconButton variant="ghost" size="sm" aria-label="Remover bloqueio" onClick={() => toggleClosedDate(item.date)}>
                            <X size={14} />
                          </IconButton>
                        </div>
                      );
                    })}
                  </div>
                )}
              </PanelCard>
            </div>
          )}

          {activeTab === 'clinic' && (
            <div className="space-y-3">
              <PanelCard icon={ImageIcon} title="Identidade visual" description="Logomarca e imagem de capa usadas em documentos e na página pública.">
                <FormRow>
                  <div className="space-y-1">
                    <span className="ds-label">Logomarca oficial</span>
                    <button type="button" className={`${dropzone} h-36 w-full p-3`} onClick={() => logoInputRef.current?.click()}>
                      {user.clinicLogoUrl ? (
                        <img src={getStaticUrl(user.clinicLogoUrl)} alt="Logo" className="h-full w-full object-contain" />
                      ) : (
                        <span className="flex flex-col items-center gap-2 text-slate-400">
                          <ImageIcon size={24} />
                          <span className="text-xs">Anexar logo</span>
                        </span>
                      )}
                    </button>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => onLogoPick(e.target.files?.[0])} />
                  </div>

                  <div className="space-y-1">
                    <span className="ds-label">Imagem de capa / banner</span>
                    <button type="button" className={`${dropzone} h-36 w-full`} onClick={() => coverInputRef.current?.click()}>
                      {user.coverUrl ? (
                        <img src={getStaticUrl(user.coverUrl)} alt="Cover" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex flex-col items-center gap-2 text-slate-400">
                          <ImageIcon size={24} />
                          <span className="text-xs">Anexar capa</span>
                        </span>
                      )}
                    </button>
                  </div>
                </FormRow>
              </PanelCard>

              <PanelCard icon={Building2} title="Dados da clínica">
                <div className="space-y-3">
                  <FormRow>
                    <ProfileInput label="Razão Social / Nome Fantasia" icon={<Building2 size={14} />} value={user.companyName} onChange={v => setUser(p => ({ ...p, companyName: v }))} />
                    <ProfileInput
                      label={`Registro Profissional (${user.registryLabel || 'CRP'})`}
                      icon={<Shield size={14} />}
                      value={user.registryNumber}
                      onChange={v => {
                        const masked = applyRegistryMask(v, user.registryMask);
                        setUser(p => ({ ...p, registryNumber: masked, crp: masked }));
                      }}
                    />
                  </FormRow>
                  <ProfileInput label="Endereço Físico Completo" icon={<MapPin size={14} />} value={user.address} onChange={v => setUser(p => ({ ...p, address: v }))} />
                  <Textarea
                    label="Mensagem da sala de espera (opcional)"
                    value={user.waitingRoomMessage}
                    onChange={e => setUser(p => ({ ...p, waitingRoomMessage: e.target.value }))}
                    rows={2}
                    maxLength={500}
                    placeholder="Exibida ao paciente enquanto ele aguarda você admitir na videochamada..."
                  />
                </div>
              </PanelCard>
            </div>
          )}

          {activeTab === 'external' && (
            <div className="space-y-3">
              <PanelCard
                icon={Globe}
                title="Sua vitrine digital"
                description="Crie uma página profissional pública para usar na sua bio do Instagram ou anúncios."
                action={
                  <div className="flex items-center gap-2 lg:justify-end">
                    <span className="text-xs text-slate-500">{user.public_profile_enabled ? 'Página visível' : 'Página oculta'}</span>
                    <Switch
                      checked={!!user.public_profile_enabled}
                      aria-label="Ativar página pública"
                      onCheckedChange={() => setUser(p => ({ ...p, public_profile_enabled: !p.public_profile_enabled }))}
                    />
                  </div>
                }
              >
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600">Seu link personalizado</p>
                  <div className="flex items-start gap-2">
                    <Input
                      addonLeft={<span className="whitespace-nowrap text-[11px]">{getPublicBaseUrl().replace('https://', '')}/p/</span>}
                      value={user.public_slug}
                      onChange={e => {
                        const val = e.target.value
                          .toLowerCase()
                          .normalize("NFD").replace(/[̀-ͯ]/g, "")
                          .replace(/[^a-z0-9]/g, '-')
                          .replace(/-+/g, '-');
                        setUser(p => ({ ...p, public_slug: val }));
                      }}
                      placeholder="ex-meu-nome"
                      wrapperClassName="flex-1"
                      className="font-medium text-primary-700"
                    />
                    {user.public_slug && (
                      <IconButton
                        variant="outline"
                        size="md"
                        aria-label="Copiar link"
                        title="Copiar link"
                        onClick={() => {
                          navigator.clipboard.writeText(`${getPublicBaseUrl()}/p/${user.public_slug}`);
                          pushToast('success', 'Link copiado!');
                        }}
                      >
                        <Copy size={14} />
                      </IconButton>
                    )}
                    <a
                      href={`/p/${user.public_slug}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Visualizar"
                      aria-label="Visualizar página pública"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </PanelCard>

              <PanelCard
                icon={Globe}
                title="Links de redes sociais"
                action={
                  <div className="flex lg:justify-end">
                    <Button
                      onClick={() => setUser(p => ({ ...p, social_links: [...p.social_links, { platform: 'Instagram', url: '' }] }))}
                      variant="outline"
                      size="xs"
                      iconLeft={<Plus size={14} />}
                    >
                      Adicionar link
                    </Button>
                  </div>
                }
              >
                {user.social_links.length === 0 ? (
                  <EmptyState icon={Globe} title="Nenhum link adicionado" description="Adicione Instagram, WhatsApp, LinkedIn e outros." />
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {user.social_links.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
                        <Select
                          size="sm"
                          aria-label="Plataforma"
                          wrapperClassName="w-32 shrink-0"
                          value={link.platform}
                          onChange={e => {
                            const newLinks = [...user.social_links];
                            newLinks[idx].platform = e.target.value;
                            setUser(p => ({ ...p, social_links: newLinks }));
                          }}
                        >
                          {['Instagram', 'WhatsApp', 'LinkedIn', 'Facebook', 'TikTok', 'YouTube', 'Site', 'Threads'].map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </Select>
                        <Input
                          size="sm"
                          aria-label="URL ou usuário"
                          wrapperClassName="flex-1"
                          value={link.url}
                          onChange={e => {
                            const newLinks = [...user.social_links];
                            newLinks[idx].url = e.target.value;
                            setUser(p => ({ ...p, social_links: newLinks }));
                          }}
                          placeholder="URL ou @usuário"
                        />
                        <IconButton
                          variant="ghost"
                          size="sm"
                          aria-label="Remover link"
                          onClick={() => setUser(p => ({ ...p, social_links: p.social_links.filter((_, i) => i !== idx) }))}
                        >
                          <X size={14} />
                        </IconButton>
                      </div>
                    ))}
                  </div>
                )}
              </PanelCard>

              {/* Aurora Builder */}
              {hasPermission('access_ai_features') && (
                <PanelCard icon={Sparkles} title="Bia monta sua página por você" description="Responda perguntas rápidas e a IA preenche o conteúdo automaticamente."
                  action={
                    <div className="flex lg:justify-end">
                      <Button
                        onClick={() => { setAuroraOpen(true); setAuroraStep(0); setAuroraAnswers({}); }}
                        variant="primary"
                        size="sm"
                        iconLeft={<Sparkles size={14} />}
                      >
                        Gerar com IA
                      </Button>
                    </div>
                  }
                >
                  <p className="text-xs text-slate-500">O conteúdo gerado pode ser revisado e editado nas abas de textos, blocos e FAQ antes de salvar.</p>
                </PanelCard>
              )}
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-3">
              <PanelCard icon={Layout} title="Textos principais" description="Conteúdo estratégico exibido no topo da página pública.">
                <FormRow>
                  <Input
                    label="Seu nome na página pública"
                    value={themeText('public_name')}
                    onChange={e => updateTheme({ public_name: e.target.value })}
                    placeholder="Ex: Dr. Eduardo Eloi"
                  />
                  <Input
                    label="Título de impacto (Hero)"
                    value={themeText('hero_title')}
                    onChange={e => updateTheme({ hero_title: e.target.value })}
                    placeholder="Ex: Apoio Psicológico de Confiança"
                  />
                  <Input
                    label="Resumo das especialidades"
                    wrapperClassName="md:col-span-2"
                    value={themeText('specialties_summary')}
                    onChange={e => updateTheme({ specialties_summary: e.target.value })}
                    placeholder="Ex: Especialidades focadas no seu desenvolvimento..."
                  />
                  <Input
                    label="Anos de experiência"
                    value={themeText('experience_years')}
                    onChange={e => updateTheme({ experience_years: e.target.value })}
                    placeholder="Ex: 8+"
                  />
                  <Input
                    label="Clientes/vidas atendidas"
                    value={themeText('patients_count')}
                    onChange={e => updateTheme({ patients_count: e.target.value })}
                    placeholder="Ex: +100"
                  />
                </FormRow>
              </PanelCard>

              <PanelCard icon={Camera} title="Foto da trajetória / bio" description='Aparece na seção "Trajetória Profissional". Use uma foto do consultório ou sua em ambiente profissional.'>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <button type="button" className={`${dropzone} h-40 w-full shrink-0 sm:w-48`} onClick={pickTrajectory}>
                    {user.profile_theme.trajectory_url ? (
                      <img src={getStaticUrl(user.profile_theme.trajectory_url)} alt="Trajetória" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex flex-col items-center gap-2 text-slate-400">
                        <Camera size={24} />
                        <span className="text-xs">Anexar foto da trajetória</span>
                      </span>
                    )}
                  </button>
                  {user.profile_theme.trajectory_url && (
                    <Button onClick={() => updateTheme({ trajectory_url: '' })} variant="softDanger" size="sm">Remover foto</Button>
                  )}
                </div>
              </PanelCard>

              <PanelCard icon={User} title="Gênero profissional" description='Ajusta seu título automaticamente para "Psicólogo" ou "Psicóloga" na página pública.'>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'female', label: 'Feminino (Psicóloga)' },
                    { id: 'male', label: 'Masculino (Psicólogo)' },
                    { id: 'other', label: 'Outro (Psicólogo(a))' }
                  ].map(g => (
                    <Button
                      key={g.id}
                      onClick={() => setUser(p => ({ ...p, gender: g.id as any }))}
                      variant={user.gender === g.id ? 'primary' : 'outline'}
                      size="sm"
                    >
                      {g.label}
                    </Button>
                  ))}
                </div>
              </PanelCard>
            </div>
          )}

          {activeTab === 'blocks' && (
            <div className="space-y-3">
              <PanelCard icon={Award} title="Cartões de proposta de valor" description="Três cartões de destaque na página pública.">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {[1, 2, 3].map(num => (
                    <div key={num} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <Input
                        label={`Título Card ${num}`}
                        value={themeText(`prop_${num}_title`)}
                        onChange={e => updateTheme({ [`prop_${num}_title`]: e.target.value })}
                        placeholder={`Título do Card ${num}`}
                      />
                      <Textarea
                        label={`Descrição Card ${num}`}
                        value={themeText(`prop_${num}_desc`)}
                        onChange={e => updateTheme({ [`prop_${num}_desc`]: e.target.value })}
                        rows={2}
                        placeholder={`Descrição breve do Card ${num}`}
                      />
                    </div>
                  ))}
                </div>
              </PanelCard>

              <PanelCard icon={ChevronRight} title="Como funciona" description="Título da seção e três passos.">
                <div className="space-y-3">
                  <Input
                    label="Título da seção de passos"
                    value={themeText('steps_title')}
                    onChange={e => updateTheme({ steps_title: e.target.value })}
                    placeholder="Ex: Dê o primeiro passo hoje."
                  />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {[1, 2, 3].map(num => (
                      <div key={num} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <Input
                          label={`Passo ${num} — Título`}
                          value={themeText(`step_${num}_title`)}
                          onChange={e => updateTheme({ [`step_${num}_title`]: e.target.value })}
                          placeholder={`Título do Passo ${num}`}
                        />
                        <Textarea
                          label={`Passo ${num} — Descrição`}
                          value={themeText(`step_${num}_desc`)}
                          onChange={e => updateTheme({ [`step_${num}_desc`]: e.target.value })}
                          rows={2}
                          placeholder={`Descrição do Passo ${num}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </PanelCard>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-3">
              <PanelCard
                icon={Stethoscope}
                title="Especialidades em cartão"
                action={
                  <div className="flex lg:justify-end">
                    <Button
                      onClick={() => updateTheme({ specialties_list: [...(user.profile_theme.specialties_list || []), ''] })}
                      variant="outline"
                      size="xs"
                      iconLeft={<Plus size={14} />}
                    >
                      Adicionar item
                    </Button>
                  </div>
                }
              >
                {(user.profile_theme.specialties_list || []).length === 0 ? (
                  <EmptyState icon={Stethoscope} title="Nenhuma especialidade" description="Adicione itens para exibir como cartões." />
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {(user.profile_theme.specialties_list || []).map((s, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          size="sm"
                          wrapperClassName="flex-1"
                          aria-label={`Especialidade ${idx + 1}`}
                          value={s}
                          onChange={e => {
                            const newList = [...user.profile_theme.specialties_list];
                            newList[idx] = e.target.value;
                            updateTheme({ specialties_list: newList });
                          }}
                          placeholder={`Especialidade ${idx + 1}...`}
                        />
                        <IconButton variant="ghost" size="sm" aria-label="Remover especialidade" onClick={() => {
                          const newList = [...user.profile_theme.specialties_list];
                          newList.splice(idx, 1);
                          updateTheme({ specialties_list: newList });
                        }}>
                          <X size={14} />
                        </IconButton>
                      </div>
                    ))}
                  </div>
                )}
              </PanelCard>

              <PanelCard
                icon={Info}
                title="Perguntas frequentes (FAQ)"
                action={
                  <div className="flex lg:justify-end">
                    <Button
                      onClick={() => updateTheme({ faq: [...(user.profile_theme.faq || []), { question: '', answer: '' }] })}
                      variant="outline"
                      size="xs"
                      iconLeft={<Plus size={14} />}
                    >
                      Adicionar pergunta
                    </Button>
                  </div>
                }
              >
                {(user.profile_theme.faq || []).length === 0 ? (
                  <EmptyState icon={Info} title="Nenhuma pergunta" description="Responda as dúvidas mais comuns dos seus pacientes." />
                ) : (
                  <div className="space-y-2">
                    {(user.profile_theme.faq || []).map((f, idx) => (
                      <div key={idx} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex-1 space-y-2">
                          <Input
                            size="sm"
                            aria-label="Pergunta"
                            value={f.question}
                            onChange={e => {
                              const newFaq = [...user.profile_theme.faq];
                              newFaq[idx].question = e.target.value;
                              updateTheme({ faq: newFaq });
                            }}
                            placeholder="Pergunta (Ex: Qual o valor da sessão?)"
                          />
                          <Textarea
                            aria-label="Resposta"
                            rows={2}
                            value={f.answer}
                            onChange={e => {
                              const newFaq = [...user.profile_theme.faq];
                              newFaq[idx].answer = e.target.value;
                              updateTheme({ faq: newFaq });
                            }}
                            placeholder="Resposta detalhada..."
                          />
                        </div>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          aria-label="Remover pergunta"
                          onClick={() => {
                            const newFaq = [...user.profile_theme.faq];
                            newFaq.splice(idx, 1);
                            updateTheme({ faq: newFaq });
                          }}
                        >
                          <X size={14} />
                        </IconButton>
                      </div>
                    ))}
                  </div>
                )}
              </PanelCard>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-3">
              <PanelCard icon={Layout} title="Tema da página" description="Cor principal e layout da página pública.">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-600">Cor principal</p>
                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5">
                      <input
                        type="color"
                        aria-label="Cor principal da página"
                        value={user.profile_theme.primaryColor}
                        onChange={e => updateTheme({ primaryColor: e.target.value })}
                        className="h-9 w-9 cursor-pointer rounded-lg border-none bg-transparent"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-700">{user.profile_theme.primaryColor}</span>
                        <span className="text-[11px] text-slate-500">Clique para alterar</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-600">Layout da página</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {[
                        {
                          id: 'modern',
                          label: 'Moderno',
                          desc: 'Limpo e profissional',
                          preview: (
                            <div className="flex h-16 w-full flex-col overflow-hidden rounded-lg border border-slate-100 bg-white">
                              <div className="h-4 w-full bg-indigo-600" />
                              <div className="flex flex-1 gap-1 p-1.5">
                                <div className="w-1/2 rounded bg-slate-100" />
                                <div className="w-1/3 rounded bg-indigo-100" />
                              </div>
                            </div>
                          ),
                        },
                        {
                          id: 'dark',
                          label: 'Escuro',
                          desc: 'Elegante e sofisticado',
                          preview: (
                            <div className="flex h-16 w-full flex-col overflow-hidden rounded-lg bg-slate-900">
                              <div className="flex h-4 w-full items-center gap-1 bg-slate-700 px-2">
                                <div className="h-1.5 w-8 rounded-full bg-indigo-400" />
                              </div>
                              <div className="flex flex-1 gap-1 p-1.5">
                                <div className="w-1/2 rounded bg-slate-700" />
                                <div className="w-1/3 rounded bg-indigo-800" />
                              </div>
                            </div>
                          ),
                        },
                        {
                          id: 'marble',
                          label: 'Natural',
                          desc: 'Acolhedor e humano',
                          preview: (
                            <div className="flex h-16 w-full flex-col overflow-hidden rounded-lg" style={{ background: 'linear-gradient(135deg, #FDFBF7 60%, #E6F4F1)' }}>
                              <div className="h-4 w-full" style={{ background: 'linear-gradient(90deg, #5EAAA8, #4F7CAC)' }} />
                              <div className="flex flex-1 gap-1 p-1.5">
                                <div className="w-1/2 rounded" style={{ background: '#E6F0EE' }} />
                                <div className="w-1/3 rounded" style={{ background: '#C9E4DE' }} />
                              </div>
                            </div>
                          ),
                        },
                      ].map(l => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => updateTheme({ layout: l.id })}
                          className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-all ${
                            user.profile_theme.layout === l.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          {l.preview}
                          <span className={`text-xs font-medium ${user.profile_theme.layout === l.id ? 'text-primary-700' : 'text-slate-600'}`}>
                            {l.label}
                          </span>
                          <span className="text-[11px] text-slate-500">{l.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </PanelCard>

              <PanelCard icon={Layout} title="Seções visíveis" description="Escolha o que aparece na página pública.">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    { id: 'show_trajectory', label: 'Trajetória/Bio' },
                    { id: 'show_specialties', label: 'Especialidades' },
                    { id: 'show_faq', label: 'Perguntas (FAQ)' },
                    { id: 'show_schedule', label: 'Agenda Semanal' },
                    { id: 'show_map', label: 'Mapa/Localização' },
                  ].map(s => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <span className="text-xs font-medium text-slate-700">{s.label}</span>
                      <Switch
                        aria-label={s.label}
                        checked={!!user.profile_theme[s.id as keyof typeof user.profile_theme]}
                        onCheckedChange={() => updateTheme({ [s.id]: !user.profile_theme[s.id as keyof typeof user.profile_theme] })}
                      />
                    </div>
                  ))}
                </div>
              </PanelCard>
            </div>
          )}
        </Tabs>

        {/* Barra de salvar fixa (única) */}
        <div className="sticky bottom-0 z-10 -mx-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4 lg:-mx-5 lg:px-5 xl:-mx-6 xl:px-6">
          <Button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            variant={saveStatus === 'saved' ? 'success' : 'primary'}
            size="sm"
            loading={saveStatus === 'saving'}
            loadingText="Salvando..."
            iconLeft={saveStatus === 'saved' ? <Award size={14} /> : <Save size={14} />}
          >
            {saveStatus === 'saved' ? 'Salvo!' : 'Salvar perfil'}
          </Button>
        </div>
      </div>

      {/* Aurora Modal */}
      <Modal
        isOpen={auroraOpen}
        onClose={() => setAuroraOpen(false)}
        title="Bia — Construtor de Perfil"
        subtitle={`Passo ${auroraStep + 1} de ${AURORA_QUESTIONS.length}`}
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <Button
              onClick={() => auroraStep > 0 ? setAuroraStep(s => s - 1) : setAuroraOpen(false)}
              variant="outline"
              size="sm"
            >
              {auroraStep > 0 ? '← Voltar' : 'Cancelar'}
            </Button>

            <div className="flex items-center gap-2">
              <div className="mr-2 hidden gap-1 sm:flex">
                {AURORA_QUESTIONS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Ir para o passo ${i + 1}`}
                    onClick={() => setAuroraStep(i)}
                    className={`h-1.5 rounded-full transition-all ${i === auroraStep ? 'w-4 bg-primary-600' : i < auroraStep ? 'w-1.5 bg-primary-300' : 'w-1.5 bg-slate-200'}`}
                  />
                ))}
              </div>

              {auroraStep < AURORA_QUESTIONS.length - 1 ? (
                <Button onClick={() => setAuroraStep(s => s + 1)} variant="primary" size="sm">
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
                  iconLeft={<Sparkles size={14} />}
                >
                  Gerar perfil
                </Button>
              )}
            </div>
          </div>
        }
      >
        {/* Progress bar */}
        <div className="mb-4 h-1 w-full bg-primary-50">
          <div
            className="h-full rounded-r-full bg-primary-600 transition-all duration-500"
            style={{ width: `${((auroraStep + 1) / AURORA_QUESTIONS.length) * 100}%` }}
          />
        </div>

        {/* Question Content */}
        <div className="space-y-2">
          <Textarea
            key={auroraStep}
            autoFocus
            label={AURORA_QUESTIONS[auroraStep].label}
            hint="Opcional — pule se preferir"
            value={auroraAnswers[AURORA_QUESTIONS[auroraStep].key] || ''}
            onChange={e => setAuroraAnswers(prev => ({ ...prev, [AURORA_QUESTIONS[auroraStep].key]: e.target.value }))}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                if (auroraStep < AURORA_QUESTIONS.length - 1) setAuroraStep(s => s + 1);
                else handleAuroraGenerate();
              }
            }}
            rows={4}
            placeholder={AURORA_QUESTIONS[auroraStep].placeholder}
          />
          <p className="text-right text-[11px] text-slate-400">Ctrl+Enter para avançar</p>
        </div>
      </Modal>

      {/* TOASTS */}
      <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 rounded-lg border px-4 py-3 animate-slideIn ${t.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-red-100 bg-red-50 text-red-700'}`}>
            <span className="text-xs font-medium">{t.message}</span>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
};

/* --- UI COMPONENTS --- */

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
    <div className={day.active ? 'rounded-lg border border-emerald-100 bg-emerald-50/30 p-3' : 'rounded-lg border border-slate-200 bg-slate-50 p-3'}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <IconButton
            variant={day.active ? 'success' : 'outline'}
            size="sm"
            aria-label={day.active ? 'Fechar dia' : 'Liberar dia'}
            onClick={onToggle}
          >
            <ChevronRight size={14} className={day.active ? 'rotate-90 transition-transform' : 'transition-transform'} />
          </IconButton>

          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-medium text-slate-800">{t('days.' + day.dayKey)}</p>
              <Badge size="sm" color={day.active ? 'success' : 'default'}>{day.active ? 'Disponível' : 'Fechado'}</Badge>
            </div>
            <p className="text-[11px] text-slate-500">{summary}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TimeInput value={day.start} onChange={v => onUpdate({ start: v })} disabled={!day.active} label="Início" />
          <span className="text-[11px] text-slate-400">às</span>
          <TimeInput value={day.end} onChange={v => onUpdate({ end: v })} disabled={!day.active} label="Fim" />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {day.active && (
            <Button onClick={addBreak} variant="outline" size="xs" iconLeft={<Plus size={14} />} title="Adicionar intervalo">
              Intervalo
            </Button>
          )}
          <Button onClick={onCopyToAll} variant="outline" size="xs" iconLeft={<Copy size={14} />} title="Repetir este horário">
            Repetir
          </Button>
          <Button onClick={onToggle} variant={day.active ? 'secondary' : 'outline'} size="xs">
            {day.active ? 'Fechar' : 'Liberar'}
          </Button>
        </div>
      </div>

      {day.active && day.breaks.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-emerald-100 pt-3">
          {day.breaks.map((b, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                  <Clock size={14} />
                </div>
                <p className="text-xs font-medium text-slate-600">
                  {day.breaks.length > 1 ? `Intervalo ${i + 1}` : 'Intervalo'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <TimeInput value={b.start} onChange={v => updateBreak(i, 'start', v)} disabled={!day.active} label="Início do intervalo" />
                <span className="text-[11px] text-slate-400">às</span>
                <TimeInput value={b.end} onChange={v => updateBreak(i, 'end', v)} disabled={!day.active} label="Fim do intervalo" />
                <IconButton variant="ghost" size="sm" aria-label="Remover intervalo" onClick={() => removeBreak(i)}>
                  <X size={14} />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function TimeInput({ value, onChange, disabled, label }: { value: string; onChange: (v: string) => void; disabled?: boolean; label: string }) {
  return (
    <Input
      type="time"
      size="sm"
      aria-label={label}
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      wrapperClassName="w-28"
    />
  );
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
        checked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'
      }`}>
        {checked && <Check size={12} />}
      </div>
      <span className={`text-xs ${checked ? 'text-slate-700' : 'text-slate-500'}`}>
        {label}
      </span>
    </div>
  );
}
