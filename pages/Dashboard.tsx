import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { Appointment, Patient } from '../types';
import {
  Award,
  Banknote,
  Book,
  Calendar,
  Camera,
  CheckCircle,
  CheckCircle2,
  Circle,
  Clock,
  Coffee,
  CreditCard,
  Eye,
  EyeOff,
  Facebook,
  Film,
  Gift,
  Github,
  Globe,
  Headphones,
  Heart,
  Image as ImageIcon,
  Instagram,
  Layers,
  Link as LinkIcon,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Mic,
  MonitorPlay,
  Music,
  Phone,
  Plus,
  Send,
  Settings,
  Shield,
  ShoppingCart,
  Smile,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Twitter,
  UserCheck,
  Users,
  Video,
  Youtube,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  ModalFooter,
  PageWrapper,
  PanelCard,
  SectionTitle,
  StatCard,
  StatGrid,
} from '../components/UI';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface Shortcut {
  id: string;
  title: string;
  url: string;
  icon: string;
  color: string;
  isSystem?: boolean;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

type UpcomingFilter = 'hoje' | 'semana' | 'mes' | 'todos';

type ShortcutIconOption = {
  id: string;
  icon: React.ElementType;
  color: string;
};

type AppointmentApiResponse = Omit<Appointment, 'start' | 'end'> &
  Partial<Pick<Appointment, 'start' | 'end'>> & {
    start?: string | Date;
    end?: string | Date;
    start_time?: string | Date;
    appointment_date?: string | Date;
  };

const UPCOMING_FILTER_LABELS: Record<UpcomingFilter, string> = {
  hoje: 'Hoje',
  semana: 'Semana',
  mes: 'Mês',
  todos: 'Todos',
};

const SHORTCUT_COLOR_OPTIONS = [
  'bg-slate-500',
  'bg-slate-800',
  'bg-red-500',
  'bg-red-600',
  'bg-orange-500',
  'bg-orange-600',
  'bg-amber-500',
  'bg-amber-600',
  'bg-yellow-400',
  'bg-yellow-500',
  'bg-lime-500',
  'bg-lime-600',
  'bg-green-500',
  'bg-green-600',
  'bg-emerald-500',
  'bg-emerald-600',
  'bg-teal-500',
  'bg-teal-600',
  'bg-cyan-500',
  'bg-cyan-600',
  'bg-sky-500',
  'bg-sky-600',
  'bg-blue-500',
  'bg-blue-600',
  'bg-blue-700',
  'bg-indigo-500',
  'bg-indigo-600',
  'bg-violet-500',
  'bg-violet-600',
  'bg-purple-500',
  'bg-purple-600',
  'bg-fuchsia-500',
  'bg-fuchsia-600',
  'bg-pink-500',
  'bg-pink-600',
  'bg-rose-500',
  'bg-rose-600',
];

const SHORTCUT_ICON_OPTIONS: ShortcutIconOption[] = [
  { id: 'link', icon: LinkIcon, color: 'bg-slate-500' },
  { id: 'globe', icon: Globe, color: 'bg-blue-500' },
  { id: 'facebook', icon: Facebook, color: 'bg-indigo-600' },
  { id: 'instagram', icon: Instagram, color: 'bg-pink-600' },
  { id: 'linkedin', icon: Linkedin, color: 'bg-blue-700' },
  { id: 'twitter', icon: Twitter, color: 'bg-sky-500' },
  { id: 'youtube', icon: Youtube, color: 'bg-red-600' },
  { id: 'github', icon: Github, color: 'bg-slate-800' },
  { id: 'mail', icon: Mail, color: 'bg-amber-500' },
  { id: 'phone', icon: Phone, color: 'bg-emerald-600' },
  { id: 'whatsapp', icon: MessageCircle, color: 'bg-emerald-500' },
  { id: 'calendar', icon: Calendar, color: 'bg-violet-500' },
  { id: 'briefcase', icon: Users, color: 'bg-amber-700' },
  { id: 'book', icon: Book, color: 'bg-indigo-500' },
  { id: 'video', icon: MonitorPlay, color: 'bg-rose-500' },
  { id: 'chart', icon: TrendingUp, color: 'bg-teal-500' },
  { id: 'coffee', icon: Coffee, color: 'bg-amber-600' },
  { id: 'heart', icon: Heart, color: 'bg-rose-600' },
  { id: 'star', icon: Star, color: 'bg-yellow-500' },
  { id: 'shield', icon: Shield, color: 'bg-slate-700' },
  { id: 'music', icon: Music, color: 'bg-purple-600' },
  { id: 'camera', icon: Camera, color: 'bg-slate-600' },
  { id: 'image', icon: ImageIcon, color: 'bg-fuchsia-500' },
  { id: 'mic', icon: Mic, color: 'bg-indigo-400' },
  { id: 'headphones', icon: Headphones, color: 'bg-violet-600' },
  { id: 'film', icon: Film, color: 'bg-red-500' },
  { id: 'mappin', icon: MapPin, color: 'bg-red-600' },
  { id: 'cart', icon: ShoppingCart, color: 'bg-orange-500' },
  { id: 'card', icon: CreditCard, color: 'bg-emerald-600' },
  { id: 'money', icon: Banknote, color: 'bg-emerald-500' },
  { id: 'gift', icon: Gift, color: 'bg-pink-500' },
  { id: 'award', icon: Award, color: 'bg-amber-400' },
  { id: 'zap', icon: Zap, color: 'bg-yellow-400' },
  { id: 'smile', icon: Smile, color: 'bg-sky-400' },
];

const shortcutIconMap = SHORTCUT_ICON_OPTIONS.reduce<Record<string, React.ElementType>>(
  (acc, option) => {
    acc[option.id] = option.icon;
    return acc;
  },
  {}
);

const ratio = (value: number, total: number) => (total === 0 ? 0 : Math.round((value / total) * 100));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

function renderShortcutIcon(iconName: string, size = 18) {
  const Icon = shortcutIconMap[iconName] || LinkIcon;
  return <Icon size={size} />;
}

function renderAppointmentStatus(status?: string) {
  if (status === 'confirmed') {
    return <Badge color="success">Confirmado</Badge>;
  }

  if (status === 'scheduled') {
    return <Badge color="warning">Agendado</Badge>;
  }

  if (status === 'completed') {
    return <Badge color="info">Finalizado</Badge>;
  }

  return null;
}

export const Dashboard: React.FC = () => {
  const { t, language } = useLanguage();
  const { user, updateUser } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [upcomingFilter, setUpcomingFilter] = useState<UpcomingFilter>('todos');
  const [showFinance, setShowFinance] = useState(false);
  const [financeData, setFinanceData] = useState({ current: 0, percentage: 0 });
  const [isAddShortcutOpen, setIsAddShortcutOpen] = useState(false);
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null);
  const [newShortcut, setNewShortcut] = useState<Partial<Shortcut>>({
    title: '',
    url: '',
    icon: 'link',
    color: 'bg-indigo-500',
  });
  const [isSavingShortcut, setIsSavingShortcut] = useState(false);
  const [newTodo, setNewTodo] = useState('');

  const now = useMemo(() => new Date(), []);

  const defaultShortcuts: Shortcut[] = useMemo(
    () => [
      {
        id: 'crp',
        title: 'Portal CFP',
        url: 'https://site.cfp.org.br/',
        icon: 'globe',
        color: 'bg-blue-600',
        isSystem: true,
      },
      {
        id: 'spotify',
        title: 'Playlist Relax',
        url: 'https://open.spotify.com/genre/focus-page',
        icon: 'music',
        color: 'bg-emerald-500',
        isSystem: true,
      },
    ],
    []
  );

  const customShortcuts = Array.isArray(user?.uiPreferences?.dashboard_shortcuts)
    ? user.uiPreferences.dashboard_shortcuts
    : [];

  const todosList: TodoItem[] = Array.isArray(user?.uiPreferences?.dashboard_todos)
    ? user.uiPreferences.dashboard_todos
    : [];

  const allShortcuts = [...defaultShortcuts, ...customShortcuts];

  const fetchData = async () => {
    setIsLoading(true);

    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const lastMonthDate = new Date(now);
    lastMonthDate.setMonth(now.getMonth() - 1);
    const lastMonth = lastMonthDate.getMonth() + 1;
    const lastMonthYear = lastMonthDate.getFullYear();

    try {
      const [patientsRes, appointmentsRes, currentSum, lastSum] = await Promise.all([
        api.get<Patient[]>('/patients').catch(() => []),
        api.get<AppointmentApiResponse[]>('/appointments').catch(() => []),
        api
          .get<any>('/finance/summary', {
            month: currentMonth.toString(),
            year: currentYear.toString(),
          })
          .catch(() => null),
        api
          .get<any>('/finance/summary', {
            month: lastMonth.toString(),
            year: lastMonthYear.toString(),
          })
          .catch(() => null),
      ]);

      setPatients(Array.isArray(patientsRes) ? patientsRes : []);
      setAppointments(
        (Array.isArray(appointmentsRes) ? appointmentsRes : []).map((appointment) => {
          const rawStart = appointment.start_time || appointment.appointment_date || appointment.start;
          const startDate = rawStart ? new Date(rawStart) : new Date(Number.NaN);

          return {
            ...appointment,
            start: startDate,
            end: new Date(startDate.getTime() + (appointment.duration_minutes || 50) * 60000),
            patient_name: appointment.patient_name || appointment.patientName || 'Consulta',
          };
        })
      );

      const currentIncome = currentSum?.income || 0;
      const lastIncome = lastSum?.income || 0;

      let percentage = 0;
      if (lastIncome > 0) {
        percentage = Math.round(((currentIncome - lastIncome) / lastIncome) * 100);
      } else if (currentIncome > 0) {
        percentage = 100;
      }

      setFinanceData({ current: currentIncome, percentage });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const startOfDay = useMemo(() => {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [now]);

  const endOfDay = useMemo(() => {
    const date = new Date(now);
    date.setHours(23, 59, 59, 999);
    return date;
  }, [now]);

  const endOfWeek = useMemo(() => {
    const date = new Date(startOfDay);
    date.setDate(date.getDate() + 7);
    return date;
  }, [startOfDay]);

  const startOfMonth = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now]);

  const endOfMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    [now]
  );

  const activeConsultas = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          appointment.type === 'consulta' &&
          appointment.status !== 'cancelled' &&
          appointment.status !== 'no-show'
      ),
    [appointments]
  );

  const todaysAppointments = useMemo(
    () => activeConsultas.filter((appointment) => appointment.start >= startOfDay && appointment.start <= endOfDay),
    [activeConsultas, endOfDay, startOfDay]
  );

  const monthAppointments = useMemo(
    () =>
      activeConsultas.filter(
        (appointment) => appointment.start >= startOfMonth && appointment.start <= endOfMonth
      ),
    [activeConsultas, endOfMonth, startOfMonth]
  );

  const upcomingAll = useMemo(
    () =>
      appointments
        .filter(
          (appointment) =>
            appointment.start >= now &&
            appointment.type === 'consulta' &&
            appointment.status !== 'cancelled' &&
            appointment.status !== 'no-show'
        )
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [appointments, now]
  );

  const upcomingFiltered = useMemo(() => {
    switch (upcomingFilter) {
      case 'hoje':
        return upcomingAll.filter((appointment) => appointment.start <= endOfDay);
      case 'semana':
        return upcomingAll.filter((appointment) => appointment.start <= endOfWeek);
      case 'mes':
        return upcomingAll.filter((appointment) => appointment.start <= endOfMonth);
      default:
        return upcomingAll;
    }
  }, [endOfDay, endOfMonth, endOfWeek, upcomingAll, upcomingFilter]);

  const statusCounts = useMemo(
    () =>
      appointments.reduce((acc, appointment) => {
        const status = appointment.status || 'scheduled';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    [appointments]
  );

  const typeCounts = useMemo(
    () =>
      appointments.reduce((acc, appointment) => {
        const type = appointment.type || 'consulta';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    [appointments]
  );

  const modalityCounts = useMemo(
    () =>
      appointments.reduce((acc, appointment) => {
        const modality = appointment.modality || 'presencial';
        acc[modality] = (acc[modality] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    [appointments]
  );

  const appointmentsByDayOfWeek = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    appointments.forEach((appointment) => {
      if (
        appointment.type === 'consulta' &&
        appointment.start >= thirtyDaysAgo &&
        appointment.start <= now
      ) {
        counts[appointment.start.getDay()] += 1;
      }
    });

    return days.map((day, index) => ({
      day,
      atendimentos: counts[index],
    }));
  }, [appointments, now]);

  const statusPieData = useMemo(() => {
    const map: Record<string, { label: string; color: string }> = {
      completed: { label: 'Finalizado', color: '#4f8d67' },
      confirmed: { label: 'Confirmado', color: '#2a74ac' },
      scheduled: { label: 'Agendado', color: '#d9a21b' },
      cancelled: { label: 'Cancelado', color: '#aa403d' },
      'no-show': { label: 'Falta', color: '#94a3b8' },
    };

    return Object.entries(statusCounts)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => ({
        name: map[key]?.label || key,
        value,
        color: map[key]?.color || '#94a3b8',
      }));
  }, [statusCounts]);

  const birthdays = useMemo(() => {
    const list = patients
      .filter((patient) => patient.status === 'ativo' || patient.status === 'active')
      .map((patient) => {
        const dateStr = patient.birth_date || patient.birthDate;
        if (!dateStr) {
          return null;
        }

        const birthDate = new Date(dateStr);
        if (Number.isNaN(birthDate.getTime())) {
          return null;
        }

        const nextBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        if (nextBirthday < startOfDay) {
          nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
        }

        return { patient, next: nextBirthday };
      })
      .filter(Boolean) as Array<{ patient: Patient; next: Date }>;

    list.sort((a, b) => a.next.getTime() - b.next.getTime());
    return list.slice(0, 5);
  }, [now, patients, startOfDay]);

  const totalAppointments = appointments.length;
  const totalConsultas =
    (statusCounts.completed || 0) +
    (statusCounts.confirmed || 0) +
    (statusCounts.scheduled || 0) +
    (statusCounts['no-show'] || 0) +
    (statusCounts.cancelled || 0);
  const confirmedRate =
    totalConsultas === 0
      ? 0
      : Math.round(
          (((statusCounts.confirmed || 0) + (statusCounts.completed || 0)) / totalConsultas) * 100
        );

  const pendingTodosCount = todosList.filter((todo) => !todo.completed).length;
  const nextAppointment = upcomingAll[0];
  const nextAppointmentTime = nextAppointment?.start
    ? nextAppointment.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  const isNextToday = nextAppointment?.start
    ? nextAppointment.start.getDate() === now.getDate() &&
      nextAppointment.start.getMonth() === now.getMonth() &&
      nextAppointment.start.getFullYear() === now.getFullYear()
    : false;

  const insightMessage = useMemo(() => {
    if (isLoading) {
      return 'Sincronizando os indicadores do consultório.';
    }

    if (!nextAppointment) {
      return 'A agenda está livre no momento. Use o período para revisar prontuários e organizar o dia.';
    }

    if (isNextToday) {
      if (pendingTodosCount > 0) {
        return `Seu próximo atendimento é com ${nextAppointment.patient_name} às ${nextAppointmentTime}. Você ainda tem ${pendingTodosCount} tarefa${pendingTodosCount > 1 ? 's' : ''} pendente${pendingTodosCount > 1 ? 's' : ''} hoje.`;
      }

      return `Seu próximo atendimento é com ${nextAppointment.patient_name} às ${nextAppointmentTime}. A rotina do dia está organizada.`;
    }

    return `O próximo atendimento será com ${nextAppointment.patient_name}. Aproveite a janela atual para avançar nas rotinas internas.`;
  }, [isLoading, isNextToday, nextAppointment, nextAppointmentTime, pendingTodosCount]);

  const formattedDate = now.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const greetingName = user?.name ? user.name.split(' ')[0] : 'Profissional';
  const greeting =
    now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  const openNewShortcutModal = () => {
    setEditingShortcutId(null);
    setNewShortcut({ title: '', url: '', icon: 'link', color: 'bg-indigo-500' });
    setIsAddShortcutOpen(true);
  };

  const closeShortcutModal = () => {
    setIsAddShortcutOpen(false);
    setEditingShortcutId(null);
  };

  const handleSaveShortcut = async () => {
    if (!newShortcut.title || !newShortcut.url || !user?.uiPreferences) {
      return;
    }

    setIsSavingShortcut(true);

    try {
      let newList = [...customShortcuts];

      if (editingShortcutId) {
        newList = newList.map((shortcut) =>
          shortcut.id === editingShortcutId
            ? {
                ...shortcut,
                title: newShortcut.title!,
                url: newShortcut.url!.startsWith('http')
                  ? newShortcut.url!
                  : `https://${newShortcut.url}`,
                icon: newShortcut.icon || 'link',
                color: newShortcut.color || 'bg-indigo-500',
              }
            : shortcut
        );
      } else {
        newList.push({
          id: `custom-${Date.now()}`,
          title: newShortcut.title,
          url: newShortcut.url.startsWith('http') ? newShortcut.url : `https://${newShortcut.url}`,
          icon: newShortcut.icon || 'link',
          color: newShortcut.color || 'bg-indigo-500',
          isSystem: false,
        });
      }

      const newPreferences = {
        ...user.uiPreferences,
        dashboard_shortcuts: newList,
      };

      await api.patch('/profile/preferences', { ui_preferences: newPreferences });
      if (updateUser) {
        updateUser({ uiPreferences: newPreferences });
      }

      pushToast(
        'success',
        editingShortcutId
          ? 'Acesso rápido atualizado com sucesso.'
          : 'Novo acesso rápido adicionado.'
      );

      closeShortcutModal();
      setNewShortcut({ title: '', url: '', icon: 'link', color: 'bg-indigo-500' });
    } catch (error) {
      console.error(error);
      pushToast('error', 'Não foi possível salvar esse acesso rápido.');
    } finally {
      setIsSavingShortcut(false);
    }
  };

  const openEditShortcut = (shortcut: Shortcut, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setEditingShortcutId(shortcut.id);
    setNewShortcut({
      title: shortcut.title,
      url: shortcut.url,
      icon: shortcut.icon,
      color: shortcut.color || 'bg-indigo-500',
    });
    setIsAddShortcutOpen(true);
  };

  const handleRemoveShortcut = async (id: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user?.uiPreferences) {
      return;
    }

    try {
      const newList = customShortcuts.filter((shortcut: Shortcut) => shortcut.id !== id);
      const newPreferences = { ...user.uiPreferences, dashboard_shortcuts: newList };

      await api.patch('/profile/preferences', { ui_preferences: newPreferences });
      if (updateUser) {
        updateUser({ uiPreferences: newPreferences });
      }

      pushToast('success', 'Acesso rápido removido com sucesso.');
    } catch (error) {
      console.error(error);
      pushToast('error', 'Ocorreu um erro ao excluir esse acesso.');
    }
  };

  const handleSaveTodo = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!newTodo.trim() || !user?.uiPreferences) {
      return;
    }

    try {
      const added: TodoItem = {
        id: `todo-${Date.now()}`,
        text: newTodo.trim(),
        completed: false,
      };

      const updated = [added, ...todosList];
      const newPreferences = { ...user.uiPreferences, dashboard_todos: updated };

      await api.patch('/profile/preferences', { ui_preferences: newPreferences });
      if (updateUser) {
        updateUser({ uiPreferences: newPreferences });
      }

      setNewTodo('');
    } catch (error) {
      console.error(error);
      pushToast('error', 'Não foi possível salvar a tarefa.');
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    if (!user?.uiPreferences) {
      return;
    }

    try {
      const updated = todosList
        .map((todo) => (todo.id === id ? { ...todo, completed } : todo))
        .sort((a, b) => Number(a.completed) - Number(b.completed));

      const newPreferences = { ...user.uiPreferences, dashboard_todos: updated };
      await api.patch('/profile/preferences', { ui_preferences: newPreferences });

      if (updateUser) {
        updateUser({ uiPreferences: newPreferences });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveTodo = async (id: string) => {
    if (!user?.uiPreferences) {
      return;
    }

    try {
      const updated = todosList.filter((todo) => todo.id !== id);
      const newPreferences = { ...user.uiPreferences, dashboard_todos: updated };

      await api.patch('/profile/preferences', { ui_preferences: newPreferences });
      if (updateUser) {
        updateUser({ uiPreferences: newPreferences });
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <PageWrapper mobileBottomPad={false} className="space-y-4 sm:space-y-6 !px-0 !pt-0 !pb-0">
      <SectionTitle
        title="Dashboard"
        description="Visão geral da agenda, indicadores e rotinas da clínica."
        icon={Sparkles}
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              size="md"
              fullWidth
              iconLeft={<Calendar size={16} />}
              onClick={() => navigate('/agenda')}
            >
              Ver agenda
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              iconLeft={<Plus size={16} />}
              onClick={() => navigate('/pacientes')}
            >
              {t('patients.new')}
            </Button>
          </div>
        }
      />

      <PanelCard
        className="overflow-hidden border-[#1f496d]/10 bg-gradient-to-br from-[#143a59] via-[#295b85] to-[#2a74ac] text-white shadow-[0_24px_60px_rgba(20,58,89,0.22)]"
        contentClassName="relative p-5 sm:p-6 lg:p-8"
      >
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_60%)]" />
        <div className="pointer-events-none absolute -right-12 top-0 h-48 w-48 rounded-full bg-cyan-300/15 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex w-fit items-center rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-sm backdrop-blur-sm">
              {formattedDate}
            </span>

            <div className="space-y-2">
              <h2 className="font-display text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                {greeting}, {greetingName}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
                Sua clínica está pronta para o dia. Você tem {todaysAppointments.length}{' '}
                atendimento{todaysAppointments.length === 1 ? '' : 's'} programado
                {todaysAppointments.length === 1 ? '' : 's'} para hoje.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                  <Sparkles size={18} className="text-cyan-100" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/90">
                    Insights do dia
                  </p>
                  <p className="text-sm leading-relaxed text-white/90">{insightMessage}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px]">
            <div className="rounded-[1.5rem] border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/90">
                Próximo atendimento
              </p>
              <p className="mt-2 text-base font-black leading-tight text-white">
                {nextAppointment?.patient_name || 'Agenda livre'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/75">
                {nextAppointment
                  ? `${nextAppointment.start.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
                      day: '2-digit',
                      month: 'short',
                    })} às ${nextAppointmentTime}`
                  : 'Sem novas consultas marcadas por enquanto.'}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/90">
                Pendências
              </p>
              <p className="mt-2 text-3xl font-black leading-none text-white">{pendingTodosCount}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/75">
                {pendingTodosCount === 0
                  ? 'Sua lista está em dia.'
                  : `${pendingTodosCount} tarefa${pendingTodosCount === 1 ? '' : 's'} aguardando ação.`}
              </p>
            </div>
          </div>
        </div>
      </PanelCard>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
        <div className="space-y-4 sm:space-y-6">
          <StatGrid cols={4}>
            <StatCard
              title={t('dashboard.totalPatients')}
              value={isLoading ? '-' : patients.length}
              icon={Users}
              color="info"
              description="Pacientes cadastrados"
              delay={0}
            />
            <StatCard
              title="Atendimentos hoje"
              value={isLoading ? '-' : todaysAppointments.length}
              icon={Clock}
              color="purple"
              description="Consultas previstas para hoje"
              delay={0.04}
            />
            <StatCard
              title="Atendimentos no mês"
              value={isLoading ? '-' : monthAppointments.length}
              icon={Calendar}
              color="default"
              description="Rotina acumulada no mês"
              delay={0.08}
            />
            <StatCard
              title="Taxa de conclusão"
              value={isLoading ? '-' : `${confirmedRate}%`}
              icon={CheckCircle}
              color="success"
              description="Confirmados e finalizados"
              delay={0.12}
            />
          </StatGrid>

          <PanelCard
            title="Próximos atendimentos"
            description="Agenda filtrada para acompanhamento rápido do dia e das próximas janelas."
            icon={Calendar}
            iconWrapClassName="border-sky-100 bg-sky-50"
            iconClassName="text-sky-600"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(UPCOMING_FILTER_LABELS) as UpcomingFilter[]).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setUpcomingFilter(filter)}
                      className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide transition-colors ${
                        upcomingFilter === filter
                          ? 'border-[#295b85] bg-[#295b85] text-white'
                          : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
                      }`}
                    >
                      {UPCOMING_FILTER_LABELS[filter]}
                    </button>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  iconLeft={<Calendar size={14} />}
                  onClick={() => navigate('/agenda')}
                >
                  Agenda
                </Button>
              </div>
            }
            contentClassName="p-0"
          >
            {isLoading ? (
              <div className="space-y-3 p-4 sm:p-6">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="flex animate-pulse flex-col gap-3 rounded-2xl border border-zinc-100 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="h-12 w-20 rounded-2xl bg-zinc-100" />
                    <div className="space-y-2 sm:flex-1">
                      <div className="h-4 w-40 rounded bg-zinc-100" />
                      <div className="h-3 w-32 rounded bg-zinc-50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingFiltered.length === 0 ? (
              <div className="p-4 sm:p-6">
                <EmptyState
                  title="Nenhum atendimento encontrado"
                  description={`Não há consultas ${
                    upcomingFilter === 'hoje'
                      ? 'para hoje'
                      : upcomingFilter === 'semana'
                        ? 'para esta semana'
                        : upcomingFilter === 'mes'
                          ? 'para este mês'
                          : 'futuras'
                  }.`}
                  icon={Calendar}
                />
              </div>
            ) : (
              <div className="max-h-[460px] divide-y divide-zinc-100 overflow-y-auto">
                {upcomingFiltered.slice(0, 10).map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-zinc-50/70 sm:px-6 sm:py-5 lg:flex-row lg:items-center"
                  >
                    <div className="flex w-full items-center gap-3 lg:w-[122px] lg:flex-none">
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-sky-700">
                        <span className="text-[11px] font-black uppercase">
                          {appointment.start.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                        <span className="text-[10px] font-bold text-sky-600">
                          {appointment.start.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="lg:hidden">
                        {renderAppointmentStatus(appointment.status)}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="truncate text-sm font-black text-zinc-900 sm:text-base">
                          {appointment.patient_name || 'Consulta'}
                        </h4>
                        <div className="hidden lg:block">{renderAppointmentStatus(appointment.status)}</div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge color="info">{appointment.type || 'consulta'}</Badge>
                        <Badge color="teal">{appointment.modality || 'presencial'}</Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/pacientes?search=${encodeURIComponent(appointment.patient_name || '')}`)
                        }
                        className="text-xs font-bold text-[#295b85] transition-colors hover:text-[#143a59]"
                      >
                        Ver paciente
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/agenda?appointmentId=${appointment.id}`)}
                        className="text-xs font-bold text-zinc-500 transition-colors hover:text-zinc-900"
                      >
                        Abrir agenda
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <PanelCard
              title="Atendimentos nos últimos 30 dias"
              description="Distribuição por dia da semana para leitura rápida do fluxo."
              icon={TrendingUp}
              iconWrapClassName="border-cyan-100 bg-cyan-50"
              iconClassName="text-cyan-600"
            >
              {isLoading ? (
                <div className="flex h-[220px] items-center justify-center">
                  <Loader2 className="animate-spin text-zinc-300" />
                </div>
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={appointmentsByDayOfWeek} barSize={24}>
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis hide allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          fontSize: 11,
                          borderRadius: 14,
                          border: '1px solid #e4e4e7',
                          boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
                        }}
                        formatter={(value: number) => [value, 'Atendimentos']}
                      />
                      <Bar dataKey="atendimentos" fill="#2a74ac" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </PanelCard>

            <PanelCard
              title="Status dos atendimentos"
              description="Leitura consolidada da operação atual."
              icon={UserCheck}
              iconWrapClassName="border-emerald-100 bg-emerald-50"
              iconClassName="text-emerald-600"
            >
              {isLoading ? (
                <div className="flex h-[220px] items-center justify-center">
                  <Loader2 className="animate-spin text-zinc-300" />
                </div>
              ) : statusPieData.length === 0 ? (
                <EmptyState
                  title="Sem dados para exibir"
                  description="Ainda não há atendimentos suficientes para o gráfico de status."
                  icon={UserCheck}
                  className="h-[220px]"
                />
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          fontSize: 11,
                          borderRadius: 14,
                          border: '1px solid #e4e4e7',
                          boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
                        }}
                        formatter={(value: number, name: string) => [value, name]}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </PanelCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PanelCard
              title="Tipos de atendimento"
              description={`${totalAppointments} registro${totalAppointments === 1 ? '' : 's'} na base atual.`}
              icon={Layers}
              iconWrapClassName="border-indigo-100 bg-indigo-50"
              iconClassName="text-indigo-600"
            >
              <div className="space-y-4">
                {['consulta', 'pessoal', 'bloqueio'].map((type) => (
                  <div key={type} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs font-bold text-zinc-600">
                      <span className="uppercase">{type}</span>
                      <span>{typeCounts[type] || 0}</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100">
                      <div
                        className="h-2 rounded-full bg-[#295b85] transition-[width]"
                        style={{ width: `${ratio(typeCounts[type] || 0, totalAppointments)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>

            <PanelCard
              title="Modalidades"
              description={`${totalAppointments} registro${totalAppointments === 1 ? '' : 's'} na base atual.`}
              icon={Video}
              iconWrapClassName="border-emerald-100 bg-emerald-50"
              iconClassName="text-emerald-600"
            >
              <div className="space-y-4">
                {['presencial', 'online'].map((modality) => (
                  <div key={modality} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs font-bold text-zinc-600">
                      <span className="uppercase">{modality}</span>
                      <span>{modalityCounts[modality] || 0}</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100">
                      <div
                        className="h-2 rounded-full bg-[#4f8d67] transition-[width]"
                        style={{ width: `${ratio(modalityCounts[modality] || 0, totalAppointments)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </PanelCard>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <PanelCard
            title="Financeiro do mês"
            description="Comparativo de entradas em relação ao mês anterior."
            icon={Banknote}
            iconWrapClassName="border-emerald-200 bg-emerald-50"
            iconClassName="text-emerald-600"
            className="border-[#143a59]/10 bg-[#0f172a] text-white"
            headerClassName="border-[#1e293b] [&_h3]:text-white [&_p]:text-slate-300"
            action={
              <button
                type="button"
                onClick={() => setShowFinance((current) => !current)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                {showFinance ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            contentClassName="space-y-4"
          >
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Entradas acumuladas
              </p>
              {isLoading ? (
                <div className="h-10 w-40 animate-pulse rounded-2xl bg-slate-800" />
              ) : (
                <p className="text-3xl font-black tracking-tight text-white">
                  {showFinance ? formatCurrency(financeData.current) : 'R$ ••••••'}
                </p>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-300">Variação mensal</span>
                {isLoading ? (
                  <div className="h-6 w-16 animate-pulse rounded-full bg-slate-800" />
                ) : (
                  <Badge
                    color={financeData.percentage >= 0 ? 'success' : 'danger'}
                    className="border-none"
                  >
                    {financeData.percentage >= 0 ? '+' : ''}
                    {financeData.percentage}%
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Leitura rápida para acompanhar se a curva do mês está acelerando ou retraindo.
              </p>
            </div>
          </PanelCard>

          <PanelCard
            title="Aniversários"
            description="Pacientes ativos com datas mais próximas."
            icon={Sparkles}
            iconWrapClassName="border-amber-100 bg-amber-50"
            iconClassName="text-amber-600"
          >
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex animate-pulse items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-zinc-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded bg-zinc-100" />
                      <div className="h-3 w-20 rounded bg-zinc-50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : birthdays.length === 0 ? (
              <EmptyState
                title="Sem aniversários próximos"
                description="Assim que houver pacientes com aniversários próximos, eles aparecerão aqui."
                icon={Sparkles}
              />
            ) : (
              <div className="space-y-3">
                {birthdays.map(({ patient, next }) => {
                  const birthDate = new Date(patient.birth_date || patient.birthDate || '');
                  const age = Number.isNaN(birthDate.getTime())
                    ? null
                    : now.getFullYear() - birthDate.getFullYear();
                  const isToday =
                    next.getDate() === now.getDate() &&
                    next.getMonth() === now.getMonth() &&
                    next.getFullYear() === now.getFullYear();
                  const phone = (patient.whatsapp || patient.phone || '').replace(/\D/g, '');

                  const handleSendBirthdayMessage = () => {
                    const message = `Olá ${
                      patient.full_name || patient.name
                    }, parabéns pelo seu aniversário! Desejo muita saúde, paz e realizações. Um grande abraço!`;
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                  };

                  return (
                    <div
                      key={patient.id}
                      className={`flex items-center justify-between gap-3 rounded-[1.5rem] border p-3.5 transition-colors ${
                        isToday
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-zinc-100 bg-zinc-50/80 hover:bg-white'
                      }`}
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl text-xs font-black ${
                            isToday
                              ? 'bg-amber-200 text-amber-800'
                              : 'border border-zinc-100 bg-white text-zinc-500'
                          }`}
                        >
                          <span>{String(next.getDate()).padStart(2, '0')}</span>
                          <span>{String(next.getMonth() + 1).padStart(2, '0')}</span>
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-zinc-900">
                            {patient.full_name || patient.name}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {age !== null && <Badge color="default">{age} anos</Badge>}
                            {isToday && <Badge color="primary">Hoje</Badge>}
                          </div>
                        </div>
                      </div>

                      {phone && (
                        <button
                          type="button"
                          onClick={handleSendBirthdayMessage}
                          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors ${
                            isToday
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'border border-emerald-100 bg-white text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title="Mandar mensagem"
                        >
                          <Send size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </PanelCard>

          <PanelCard
            title="Tarefas diárias"
            description="Checklist rápido para organização operacional."
            icon={CheckCircle2}
            iconWrapClassName="border-indigo-100 bg-indigo-50"
            iconClassName="text-indigo-600"
            action={<Badge color="info">{pendingTodosCount} pendente{pendingTodosCount === 1 ? '' : 's'}</Badge>}
            contentClassName="space-y-4"
          >
            <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {todosList.length === 0 ? (
                <EmptyState
                  title="Sua lista está vazia"
                  description="Adicione tarefas do dia para centralizar o acompanhamento aqui."
                  icon={CheckCircle2}
                />
              ) : (
                todosList.map((todo) => (
                  <div
                    key={todo.id}
                    className="group flex items-start gap-3 rounded-[1.5rem] border border-zinc-100 bg-zinc-50/70 p-3.5 transition-colors hover:bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTodo(todo.id, !todo.completed)}
                      className="mt-0.5 shrink-0 text-zinc-300 transition-transform hover:scale-105"
                    >
                      {todo.completed ? (
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      ) : (
                        <Circle size={18} className="text-zinc-300" />
                      )}
                    </button>

                    <p
                      className={`flex-1 text-sm leading-relaxed ${
                        todo.completed ? 'text-zinc-400 line-through' : 'font-medium text-zinc-700'
                      }`}
                    >
                      {todo.text}
                    </p>

                    <button
                      type="button"
                      onClick={() => handleRemoveTodo(todo.id)}
                      className="shrink-0 text-zinc-300 opacity-100 transition-colors hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSaveTodo} className="space-y-3 border-t border-zinc-100 pt-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={newTodo}
                  onChange={(event) => setNewTodo(event.target.value)}
                  placeholder="O que você não pode esquecer hoje?"
                  wrapperClassName="flex-1"
                />
                <Button type="submit" iconLeft={<Plus size={14} />} disabled={!newTodo.trim()}>
                  Adicionar
                </Button>
              </div>
            </form>
          </PanelCard>

          <PanelCard
            title="Acessos rápidos"
            description="Links de apoio usados na operação do consultório."
            icon={Globe}
            iconWrapClassName="border-sky-100 bg-sky-50"
            iconClassName="text-sky-600"
            action={
              <Button variant="ghost" size="sm" iconLeft={<Plus size={14} />} onClick={openNewShortcutModal}>
                Novo
              </Button>
            }
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {allShortcuts.map((shortcut) => (
                <a
                  key={shortcut.id}
                  href={shortcut.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/shortcut relative flex min-h-[118px] flex-col items-center justify-center rounded-[1.5rem] border border-zinc-100 bg-zinc-50/70 p-3 text-center transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                >
                  {!shortcut.isSystem && (
                    <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover/shortcut:opacity-100">
                      <button
                        type="button"
                        onClick={(event) => openEditShortcut(shortcut, event)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-zinc-500 shadow-sm transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                        title="Editar"
                      >
                        <Settings size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => handleRemoveShortcut(shortcut.id, event)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-zinc-500 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}

                  <div
                    className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm ${shortcut.color}`}
                  >
                    {renderShortcutIcon(shortcut.icon, 18)}
                  </div>
                  <span className="line-clamp-2 text-xs font-black leading-snug text-zinc-700">
                    {shortcut.title}
                  </span>
                </a>
              ))}
            </div>
          </PanelCard>
        </div>
      </div>

      <Modal
        isOpen={isAddShortcutOpen}
        onClose={closeShortcutModal}
        title={editingShortcutId ? 'Editar Acesso Rápido' : 'Novo Acesso Rápido'}
        size="sm"
        footer={
          <ModalFooter>
            <Button variant="ghost" onClick={closeShortcutModal}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveShortcut} loading={isSavingShortcut}>
              Salvar
            </Button>
          </ModalFooter>
        }
      >
        <div className="space-y-4 py-2">
          <Input
            label="Nome do acesso"
            placeholder="Ex: Meu site, artigos..."
            value={newShortcut.title || ''}
            onChange={(event) =>
              setNewShortcut((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
          />

          <Input
            label="Link (URL)"
            placeholder="exemplo.com.br"
            value={newShortcut.url || ''}
            onChange={(event) =>
              setNewShortcut((current) => ({
                ...current,
                url: event.target.value,
              }))
            }
          />

          <div className="space-y-2">
            <span className="block text-xs font-bold text-zinc-600">Selecione o ícone</span>
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto p-1">
              {SHORTCUT_ICON_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = newShortcut.icon === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setNewShortcut((current) => ({
                        ...current,
                        icon: option.id,
                        color: option.color,
                      }))
                    }
                    className={`flex items-center justify-center rounded-xl border-2 p-3 transition-all ${
                      isActive
                        ? 'scale-105 border-[#295b85] bg-[#edf5fb] text-[#295b85] shadow-sm'
                        : 'border-zinc-100 bg-white text-zinc-400 hover:border-zinc-300 hover:bg-zinc-50'
                    }`}
                    title={option.id}
                  >
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-bold text-zinc-600">Cor do círculo</span>
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto p-1">
              {SHORTCUT_COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() =>
                    setNewShortcut((current) => ({
                      ...current,
                      color,
                    }))
                  }
                  className={`h-8 w-8 rounded-full border-2 shadow-sm transition-transform hover:scale-105 ${
                    newShortcut.color === color ? 'border-zinc-800 scale-110' : 'border-transparent'
                  } ${color}`}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
};
