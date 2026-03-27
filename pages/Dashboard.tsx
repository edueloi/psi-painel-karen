import React, { useMemo, useState, useEffect } from 'react';
import { api } from '../services/api';
import { Patient, Appointment } from '../types';
import {
  Users,
  Calendar,
  Sparkles,
  Plus,
  Globe,
  Music,
  Link as LinkIcon,
  Clock,
  Video,
  CheckCircle,
  Loader2,
  Layers,
  FileText,
  Send,
  TrendingUp,
  XCircle,
  UserCheck,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Github,
  Mail,
  Phone,
  MessageCircle,
  Briefcase,
  Book,
  Coffee,
  Heart,
  Settings,
  Menu,
  MonitorPlay,
  FileBarChart,
  Camera,
  Image as ImageIcon,
  Mic,
  Headphones,
  Film,
  MapPin,
  ShoppingCart,
  CreditCard,
  Banknote,
  Gift,
  Award,
  Zap,
  Smile,
  Star,
  Shield,
  Trash2,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { AuroraAssistant } from '../components/AI/AuroraAssistant';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface Shortcut {
  id: string;
  title: string;
  url: string;
  icon: string;
  color: string;
  isSystem?: boolean;
}

type UpcomingFilter = 'hoje' | 'semana' | 'mes' | 'todos';

export const Dashboard: React.FC = () => {
  const { t, language } = useLanguage();
  const { user, updateUser } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  interface TodoItem {
    id: string;
    text: string;
    completed: boolean;
  }

  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [upcomingFilter, setUpcomingFilter] = useState<UpcomingFilter>('todos');
  const [showFinance, setShowFinance] = useState(false); // Widget Financeiro oculto/visivo
  const [financeData, setFinanceData] = useState({ current: 0, percentage: 0 });

  const defaultShortcuts: Shortcut[] = [
    { id: 'crp', title: 'Portal CFP', url: 'https://site.cfp.org.br/', icon: 'globe', color: 'bg-blue-600', isSystem: true },
    { id: 'spotify', title: 'Playlist Relax', url: 'https://open.spotify.com/genre/focus-page', icon: 'music', color: 'bg-emerald-500', isSystem: true },
  ];

  const customShortcuts = Array.isArray(user?.uiPreferences?.dashboard_shortcuts) 
    ? user.uiPreferences.dashboard_shortcuts 
    : [];

  const todosList: TodoItem[] = Array.isArray(user?.uiPreferences?.dashboard_todos)
    ? user.uiPreferences.dashboard_todos
    : [];

  const allShortcuts = [...defaultShortcuts, ...customShortcuts];

  const [isAddShortcutOpen, setIsAddShortcutOpen] = useState(false);
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null);
  const [newShortcut, setNewShortcut] = useState<Partial<Shortcut>>({ title: '', url: '', icon: 'link', color: 'bg-indigo-500' });
  const [isSavingShortcut, setIsSavingShortcut] = useState(false);
  
  const [newTodo, setNewTodo] = useState('');

  const COLOR_OPTIONS = [
    'bg-slate-500', 'bg-slate-800', 'bg-red-500', 'bg-red-600',
    'bg-orange-500', 'bg-orange-600', 'bg-amber-500', 'bg-amber-600',
    'bg-yellow-400', 'bg-yellow-500', 'bg-lime-500', 'bg-lime-600',
    'bg-green-500', 'bg-green-600', 'bg-emerald-500', 'bg-emerald-600',
    'bg-teal-500', 'bg-teal-600', 'bg-cyan-500', 'bg-cyan-600',
    'bg-sky-500', 'bg-sky-600', 'bg-blue-500', 'bg-blue-600', 'bg-blue-700',
    'bg-indigo-500', 'bg-indigo-600', 'bg-violet-500', 'bg-violet-600',
    'bg-purple-500', 'bg-purple-600', 'bg-fuchsia-500', 'bg-fuchsia-600',
    'bg-pink-500', 'bg-pink-600', 'bg-rose-500', 'bg-rose-600'
  ];

  const ICON_OPTIONS = [
    { id: 'link', icon: <LinkIcon size={16}/>, color: 'bg-slate-500' },
    { id: 'globe', icon: <Globe size={16}/>, color: 'bg-blue-500' },
    { id: 'facebook', icon: <Facebook size={16}/>, color: 'bg-indigo-600' },
    { id: 'instagram', icon: <Instagram size={16}/>, color: 'bg-pink-600' },
    { id: 'linkedin', icon: <Linkedin size={16}/>, color: 'bg-blue-700' },
    { id: 'twitter', icon: <Twitter size={16}/>, color: 'bg-sky-500' },
    { id: 'youtube', icon: <Youtube size={16}/>, color: 'bg-red-600' },
    { id: 'github', icon: <Github size={16}/>, color: 'bg-slate-800' },
    { id: 'mail', icon: <Mail size={16}/>, color: 'bg-amber-500' },
    { id: 'phone', icon: <Phone size={16}/>, color: 'bg-emerald-600' },
    { id: 'whatsapp', icon: <MessageCircle size={16}/>, color: 'bg-emerald-500' },
    { id: 'calendar', icon: <Calendar size={16}/>, color: 'bg-violet-500' },
    { id: 'briefcase', icon: <Briefcase size={16}/>, color: 'bg-amber-700' },
    { id: 'book', icon: <Book size={16}/>, color: 'bg-indigo-500' },
    { id: 'video', icon: <MonitorPlay size={16}/>, color: 'bg-rose-500' },
    { id: 'chart', icon: <FileBarChart size={16}/>, color: 'bg-teal-500' },
    { id: 'coffee', icon: <Coffee size={16}/>, color: 'bg-amber-600' },
    { id: 'heart', icon: <Heart size={16}/>, color: 'bg-rose-600' },
    { id: 'star', icon: <Star size={16}/>, color: 'bg-yellow-500' },
    { id: 'shield', icon: <Shield size={16}/>, color: 'bg-slate-700' },
    { id: 'music', icon: <Music size={16}/>, color: 'bg-purple-600' },
    { id: 'camera', icon: <Camera size={16}/>, color: 'bg-slate-600' },
    { id: 'image', icon: <ImageIcon size={16}/>, color: 'bg-fuchsia-500' },
    { id: 'mic', icon: <Mic size={16}/>, color: 'bg-indigo-400' },
    { id: 'headphones', icon: <Headphones size={16}/>, color: 'bg-violet-600' },
    { id: 'film', icon: <Film size={16}/>, color: 'bg-red-500' },
    { id: 'mappin', icon: <MapPin size={16}/>, color: 'bg-red-600' },
    { id: 'cart', icon: <ShoppingCart size={16}/>, color: 'bg-orange-500' },
    { id: 'card', icon: <CreditCard size={16}/>, color: 'bg-emerald-600' },
    { id: 'money', icon: <Banknote size={16}/>, color: 'bg-emerald-500' },
    { id: 'gift', icon: <Gift size={16}/>, color: 'bg-pink-500' },
    { id: 'award', icon: <Award size={16}/>, color: 'bg-amber-400' },
    { id: 'zap', icon: <Zap size={16}/>, color: 'bg-yellow-400' },
    { id: 'smile', icon: <Smile size={16}/>, color: 'bg-sky-400' },
  ];

  const fetchData = async () => {
    setIsLoading(true);
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const lastMonthDate = new Date(now);
    lastMonthDate.setMonth(now.getMonth() - 1);
    const lastMonth = lastMonthDate.getMonth() + 1;
    const lastMonthYear = lastMonthDate.getFullYear();

    try {
      const [patientsRes, appointmentsRes, currentSum, lastSum] = await Promise.all([
        api.get<Patient[]>('/patients').catch(() => []),
        api.get<Appointment[]>('/appointments').catch(() => []),
        api.get<any>('/finance/summary', { month: currentMonth.toString(), year: currentYear.toString() }).catch(() => null),
        api.get<any>('/finance/summary', { month: lastMonth.toString(), year: lastMonthYear.toString() }).catch(() => null)
      ]);
      setPatients(Array.isArray(patientsRes) ? patientsRes : []);
      setAppointments((Array.isArray(appointmentsRes) ? appointmentsRes : []).map(a => {
        const rawStart = a.start_time || a.appointment_date || a.start;
        const startDate = rawStart ? new Date(rawStart) : new Date(NaN);
        return {
          ...a,
          start: startDate,
          end: new Date(startDate.getTime() + (a.duration_minutes || 50) * 60000),
          patient_name: a.patient_name || a.patientName || 'Consulta'
        };
      }));

      const currInc = currentSum?.income || 0;
      const lastInc = lastSum?.income || 0;
      let pct = 0;
      if (lastInc > 0) pct = Math.round(((currInc - lastInc) / lastInc) * 100);
      else if (currInc > 0) pct = 100;
      
      setFinanceData({ current: currInc, percentage: pct });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const now = useMemo(() => new Date(), []);

  const startOfDay = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [now]);

  const endOfDay = useMemo(() => {
    const d = new Date(now);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [now]);

  const endOfWeek = useMemo(() => {
    const d = new Date(startOfDay);
    d.setDate(d.getDate() + 7);
    return d;
  }, [startOfDay]);

  const startOfMonth = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, [now]);

  const endOfMonth = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }, [now]);

  // Only count consultas that are not cancelled/no-show
  const activeConsultas = useMemo(() => {
    return appointments.filter(a =>
      a.type === 'consulta' &&
      a.status !== 'cancelled' &&
      a.status !== 'no-show'
    );
  }, [appointments]);

  const todaysAppointments = useMemo(() => {
    return activeConsultas.filter(a => a.start >= startOfDay && a.start <= endOfDay);
  }, [activeConsultas, startOfDay, endOfDay]);

  const monthAppointments = useMemo(() => {
    return activeConsultas.filter(a => a.start >= startOfMonth && a.start <= endOfMonth);
  }, [activeConsultas, startOfMonth, endOfMonth]);

  // Upcoming = from now (not from start of day) – includes scheduled & confirmed
  const upcomingAll = useMemo(() => {
    return appointments
      .filter(a => a.start >= now && a.type === 'consulta' && a.status !== 'cancelled' && a.status !== 'no-show')
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [appointments, now]);

  const upcomingFiltered = useMemo(() => {
    switch (upcomingFilter) {
      case 'hoje':
        return upcomingAll.filter(a => a.start <= endOfDay);
      case 'semana':
        return upcomingAll.filter(a => a.start <= endOfWeek);
      case 'mes':
        return upcomingAll.filter(a => a.start <= endOfMonth);
      default:
        return upcomingAll;
    }
  }, [upcomingAll, upcomingFilter, endOfDay, endOfWeek, endOfMonth]);

  const statusCounts = useMemo(() => {
    return appointments.reduce((acc, a) => {
      const key = a.status || 'scheduled';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [appointments]);

  const typeCounts = useMemo(() => {
    return appointments.reduce((acc, a) => {
      const key = a.type || 'consulta';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [appointments]);

  const modalityCounts = useMemo(() => {
    return appointments.reduce((acc, a) => {
      const key = a.modality || 'presencial';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [appointments]);

  // Appointments by day of week (last 30 days)
  const appointmentsByDayOfWeek = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    appointments.forEach(a => {
      if (a.type === 'consulta' && a.start >= thirtyDaysAgo && a.start <= now) {
        counts[a.start.getDay()]++;
      }
    });
    return days.map((day, i) => ({ day, atendimentos: counts[i] }));
  }, [appointments, now]);

  // Status pie chart data
  const statusPieData = useMemo(() => {
    const map: Record<string, { label: string; color: string }> = {
      completed: { label: 'Finalizado', color: '#10b981' },
      confirmed: { label: 'Confirmado', color: '#6366f1' },
      scheduled: { label: 'Agendado', color: '#f59e0b' },
      cancelled: { label: 'Cancelado', color: '#ef4444' },
      'no-show': { label: 'Falta', color: '#94a3b8' },
    };
    return Object.entries(statusCounts)
      .filter(([, v]: [string, number]) => v > 0)
      .map(([key, value]) => ({
        name: map[key]?.label || key,
        value,
        color: map[key]?.color || '#94a3b8',
      }));
  }, [statusCounts]);


  const birthdays = useMemo(() => {
    const list = patients
      .filter(p => p.status === 'ativo' || p.status === 'active')
      .map(p => {
        const dateStr = p.birth_date || p.birthDate;
        if (!dateStr) return null;
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return null;
        const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
        if (next < startOfDay) next.setFullYear(next.getFullYear() + 1);
        return { patient: p, next };
      })
      .filter(Boolean) as { patient: Patient; next: Date }[];
    list.sort((a, b) => a.next.getTime() - b.next.getTime());
    return list.slice(0, 5);
  }, [patients, now, startOfDay]);

  const formattedDate = now.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  const greetingName = user?.name ? user.name.split(' ')[0] : 'Doutor(a)';

  const renderIcon = (iconName: string, size = 20) => {
    if (iconName === 'globe') return <Globe size={size} />;
    if (iconName === 'music') return <Music size={size} />;
    if (iconName === 'facebook') return <Facebook size={size} />;
    if (iconName === 'instagram') return <Instagram size={size} />;
    if (iconName === 'linkedin') return <Linkedin size={size} />;
    if (iconName === 'twitter') return <Twitter size={size} />;
    if (iconName === 'youtube') return <Youtube size={size} />;
    if (iconName === 'github') return <Github size={size} />;
    if (iconName === 'mail') return <Mail size={size} />;
    if (iconName === 'phone') return <Phone size={size} />;
    if (iconName === 'whatsapp') return <MessageCircle size={size} />;
    if (iconName === 'calendar') return <Calendar size={size} />;
    if (iconName === 'briefcase') return <Briefcase size={size} />;
    if (iconName === 'book') return <Book size={size} />;
    if (iconName === 'video') return <MonitorPlay size={size} />;
    if (iconName === 'chart') return <FileBarChart size={size} />;
    if (iconName === 'coffee') return <Coffee size={size} />;
    if (iconName === 'heart') return <Heart size={size} />;
    if (iconName === 'star') return <Star size={size} />;
    if (iconName === 'shield') return <Shield size={size} />;
    if (iconName === 'camera') return <Camera size={size} />;
    if (iconName === 'image') return <ImageIcon size={size} />;
    if (iconName === 'mic') return <Mic size={size} />;
    if (iconName === 'headphones') return <Headphones size={size} />;
    if (iconName === 'film') return <Film size={size} />;
    if (iconName === 'mappin') return <MapPin size={size} />;
    if (iconName === 'cart') return <ShoppingCart size={size} />;
    if (iconName === 'card') return <CreditCard size={size} />;
    if (iconName === 'money') return <Banknote size={size} />;
    if (iconName === 'gift') return <Gift size={size} />;
    if (iconName === 'award') return <Award size={size} />;
    if (iconName === 'zap') return <Zap size={size} />;
    if (iconName === 'smile') return <Smile size={size} />;
    return <LinkIcon size={size} />;
  };

  const handleSaveShortcut = async () => {
    if (!newShortcut.title || !newShortcut.url || !user?.uiPreferences) return;
    setIsSavingShortcut(true);
    try {
        let newList = [...customShortcuts];
        if (editingShortcutId) {
            // Edit existing
            newList = newList.map(s => s.id === editingShortcutId ? {
                ...s,
                title: newShortcut.title!,
                url: newShortcut.url!.startsWith('http') ? newShortcut.url! : `https://${newShortcut.url}`,
                icon: newShortcut.icon || 'link',
                color: newShortcut.color || 'bg-indigo-500'
            } : s);
        } else {
            // Add new
            const added: Shortcut = {
                id: 'custom-' + Date.now(),
                title: newShortcut.title,
                url: newShortcut.url.startsWith('http') ? newShortcut.url : `https://${newShortcut.url}`,
                icon: newShortcut.icon || 'link',
                color: newShortcut.color || 'bg-indigo-500',
                isSystem: false
            };
            newList.push(added);
        }

        const newPrefs = { ...user.uiPreferences, dashboard_shortcuts: newList };
        await api.patch('/profile/preferences', { ui_preferences: newPrefs });
        
        if (updateUser) updateUser({ uiPreferences: newPrefs });
        
        pushToast('success', editingShortcutId ? 'Acesso rápido atualizado com sucesso!' : 'Novo acesso rápido adicionado!');
        setIsAddShortcutOpen(false);
        setEditingShortcutId(null);
        setNewShortcut({ title: '', url: '', icon: 'link', color: 'bg-indigo-500' });
    } catch (e) {
        console.error(e);
        pushToast('error', 'Ops! Tivemos um erro ao salvar seu acesso rápido.');
    } finally {
        setIsSavingShortcut(false);
    }
  };

  const openEditShortcut = (shortcut: Shortcut, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingShortcutId(shortcut.id);
    setNewShortcut({ title: shortcut.title, url: shortcut.url, icon: shortcut.icon, color: shortcut.color || 'bg-indigo-500' });
    setIsAddShortcutOpen(true);
  };

  const handleRemoveShortcut = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user?.uiPreferences) return;
    try {
        const newList = customShortcuts.filter((s: Shortcut) => s.id !== id);
        const newPrefs = { ...user.uiPreferences, dashboard_shortcuts: newList };
        await api.patch('/profile/preferences', { ui_preferences: newPrefs });
        if (updateUser) updateUser({ uiPreferences: newPrefs });
        pushToast('success', 'Acesso rápido removido com sucesso!');
    } catch (err) {
        console.error(err);
        pushToast('error', 'Ocorreu um erro ao excluir esse acesso.');
    }
  };

  const handleSaveTodo = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTodo.trim() || !user?.uiPreferences) return;
    try {
       const added: TodoItem = { id: 'todo-' + Date.now(), text: newTodo.trim(), completed: false };
       const updated = [added, ...todosList]; // Novos em cima
       const newPrefs = { ...user.uiPreferences, dashboard_todos: updated };
       await api.patch('/profile/preferences', { ui_preferences: newPrefs });
       if (updateUser) updateUser({ uiPreferences: newPrefs });
       setNewTodo('');
    } catch (err) {
       console.error(err);
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    if (!user?.uiPreferences) return;
    try {
        const updated = todosList.map(t => t.id === id ? { ...t, completed } : t);
        // Opcional: mover os concluídos pro final
        updated.sort((a, b) => Number(a.completed) - Number(b.completed));

        const newPrefs = { ...user.uiPreferences, dashboard_todos: updated };
        await api.patch('/profile/preferences', { ui_preferences: newPrefs });
        if (updateUser) updateUser({ uiPreferences: newPrefs });
    } catch (err) { console.error(err); }
  };

  const handleRemoveTodo = async (id: string) => {
    if (!user?.uiPreferences) return;
    try {
        const updated = todosList.filter(t => t.id !== id);
        const newPrefs = { ...user.uiPreferences, dashboard_todos: updated };
        await api.patch('/profile/preferences', { ui_preferences: newPrefs });
        if (updateUser) updateUser({ uiPreferences: newPrefs });
    } catch (err) { console.error(err); }
  };

  // Taxa de confirmação = (confirmed + completed) / total consultas
  const totalConsultas = (statusCounts.completed || 0) + (statusCounts.confirmed || 0) + (statusCounts.scheduled || 0) + (statusCounts['no-show'] || 0) + (statusCounts.cancelled || 0);
  const confirmedRate = totalConsultas === 0 ? 0 : Math.round(((statusCounts.confirmed || 0) + (statusCounts.completed || 0)) / totalConsultas * 100);

  const ratio = (value: number, total: number) => total === 0 ? 0 : Math.round((value / total) * 100);
  const totalAppointments = appointments.length;

  const InsightWidget = () => {
    const next = upcomingAll[0];
    const nextTime = next?.start ? next.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const isNextToday = next?.start
      ? next.start.getDate() === now.getDate() && next.start.getMonth() === now.getMonth()
      : false;
    
    // Gerador de insight dinâmico (Falso IA / Premium logic)
    const generateInsight = () => {
       if (isLoading) return 'Sincronizando Aurora Insights...';
       if (!next) return 'Sem novos atendimentos na agenda hoje. Aproveite o tempo para revisar seus prontuários pendentes.';
       if (isNextToday) return `Seu próximo paciente é ${next.patient_name} às ${nextTime}. ${todosList.filter(t => !t.completed).length > 0 ? `Lembre-se de concluir suas ${todosList.filter(t => !t.completed).length} tarefas pendentes hoje.` : 'Sua lista de tarefas está em dia!'}`;
       return `Hoje o dia está limpo. O próximo atendimento será com ${next.patient_name} em breve. Boa jornada!`;
    };

    return (
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
        {/* Background glow animations */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-purple-400 transition-colors duration-1000"></div>
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-blue-300 opacity-20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-5">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
             <Sparkles size={24} className="text-yellow-300 animate-pulse" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-[11px] uppercase tracking-[0.2em] text-indigo-100 mb-1.5 flex items-center gap-2">
               Aurora Insights <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
            </h3>
            <p className="text-sm md:text-base font-medium leading-relaxed max-w-2xl text-white/90">
              {generateInsight()}
            </p>
          </div>
          <button onClick={() => navigate('/agenda')} className="shrink-0 text-[11px] uppercase tracking-widest font-black bg-white text-indigo-700 hover:bg-indigo-50 hover:scale-105 active:scale-95 px-5 h-10 rounded-xl border border-white/20 transition-all shadow-md">
             Agenda Completa
          </button>
        </div>
      </div>
    );
  };

  const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; hint?: string; onClick?: () => void }> = ({ label, value, icon, hint, onClick }) => (
    <div onClick={onClick} className={`bg-white p-5 xl:p-6 rounded-[2rem] shadow-sm border border-slate-100 transition-all hover:border-indigo-100 group flex flex-col justify-between min-w-0 ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between gap-2 overflow-hidden">
        <div className="p-3 shrink-0 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">{icon}</div>
        {hint && <span className="text-[8px] lg:text-[7px] xl:text-[9px] font-black text-slate-300 uppercase tracking-widest text-right leading-tight break-words max-w-[65%] mt-1">{hint}</span>}
      </div>
      <div>
         <h3 className="text-3xl font-black text-slate-800 mt-4 xl:mt-5 group-hover:text-indigo-600 transition-colors truncate">{value}</h3>
         <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mt-1 leading-tight break-words line-clamp-2 pr-1">{label}</p>
      </div>
    </div>
  );

  const filterLabels: Record<UpcomingFilter, string> = {
    hoje: 'Hoje',
    semana: 'Semana',
    mes: 'Mês',
    todos: 'Todos',
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn pb-20">
      {/* Header */}
      <div className="relative overflow-hidden bg-white border border-slate-100 shadow-sm rounded-[2.5rem] p-8 md:p-10 group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-20 -mt-20 opacity-40 blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-4">
                👋 {formattedDate}
            </div>
            <h1 className="font-black text-3xl md:text-4xl text-slate-900 tracking-tight">
              {now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite'}, <span className="text-indigo-600">{greetingName}</span>
            </h1>
            <p className="text-slate-400 text-sm font-bold mt-2 max-w-md leading-relaxed">Sua clínica está pronta. Você tem {todaysAppointments.length} atendimentos programados para hoje.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate('/agenda')} className="flex items-center gap-2 bg-slate-950 text-white px-6 h-12 rounded-[1.2rem] font-black text-[11px] shadow-xl hover:bg-slate-800 transition-all active:scale-95 uppercase tracking-widest">
              <Calendar size={18} /> Ver agenda
            </button>
            <button onClick={() => navigate('/pacientes')} className="flex items-center gap-2 bg-indigo-600 text-white px-6 h-12 rounded-[1.2rem] font-black text-[11px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-widest">
              <Plus size={18} /> {t('patients.new')}
            </button>
          </div>
        </div>
      </div>

      <InsightWidget />

      {/* KPI Cards & Financial Mini Widget */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* FINANCIAL MINI WIDGET (Ocupa 1 coluna tbm) */}
        <div className="bg-slate-900 overflow-hidden relative p-6 rounded-[2rem] shadow-sm border border-slate-800 transition-all group flex flex-col justify-between hidden md:flex">
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><TrendingUp size={80} /></div>
             <div className="relative z-10">
                <div className="flex items-start justify-between">
                   <div className="p-2.5 bg-white/10 rounded-xl text-emerald-400 backdrop-blur-md"><Banknote size={16} /></div>
                   <button onClick={() => setShowFinance(!showFinance)} className="text-slate-400 hover:text-white p-1">
                      {showFinance ? <EyeOff size={14}/> : <Eye size={14}/>}
                   </button>
                </div>
                {isLoading ? (
                   <div className="mt-4"><div className="h-8 w-24 bg-slate-800 rounded animate-pulse"></div></div>
                ) : (
                  <h3 className="text-2xl font-black text-white mt-4 tracking-tight flex items-end gap-1">
                     <span className="text-base text-slate-400 font-bold mb-1">R$</span> {showFinance ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(financeData.current) : '••••,••'}
                  </h3>
                )}
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 leading-tight border-b border-slate-700/50 pb-2">Entradas do Mês</p>
                <div className="flex items-center gap-1.5 mt-3">
                   {isLoading ? (
                     <div className="h-4 w-12 bg-slate-800 rounded animate-pulse"></div>
                   ) : (
                     <span className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md ${financeData.percentage >= 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
                       {financeData.percentage >= 0 ? '+' : ''}{financeData.percentage}%
                     </span>
                   )}
                   <span className="text-[10px] text-slate-500 font-medium truncate">vs. mês passado</span>
                </div>
             </div>
        </div>

        <StatCard
          label={t('dashboard.totalPatients')}
          value={isLoading ? '-' : patients.length}
          icon={<Users size={18} />}
          hint="cadastros"
          onClick={() => navigate('/pacientes')}
        />
        <StatCard
          label="Atendimentos hoje"
          value={isLoading ? '-' : todaysAppointments.length}
          icon={<Clock size={18} />}
          hint="dia"
          onClick={() => setUpcomingFilter('hoje')}
        />
        <StatCard
          label="Atendimentos no mês"
          value={isLoading ? '-' : monthAppointments.length}
          icon={<Calendar size={18} />}
          hint="mês"
          onClick={() => setUpcomingFilter('mes')}
        />
        <StatCard
          label="Taxa de conclusão"
          value={isLoading ? '-' : `${confirmedRate}%`}
          icon={<CheckCircle size={18} />}
          hint="confirmados+finalizados"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Upcoming appointments with filter */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <h3 className="font-display font-bold text-base text-slate-800 flex items-center gap-2">
                <Calendar size={18} className="text-indigo-500" /> Próximos atendimentos
              </h3>
              <div className="flex items-center gap-1.5">
                {(['hoje', 'semana', 'mes', 'todos'] as UpcomingFilter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setUpcomingFilter(f)}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide transition-all ${
                      upcomingFilter === f
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {filterLabels[f]}
                  </button>
                ))}
                <button onClick={() => navigate('/agenda')} className="ml-2 text-[11px] font-bold text-indigo-600 hover:underline">Agenda</button>
              </div>
            </div>
            <div className="p-4 space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="space-y-4 py-4">
                 <div className="h-6 w-48 bg-slate-100 rounded-lg animate-pulse mb-6"></div>
                 {[1,2,3,4].map(i => (
                    <div key={i} className="flex gap-4 items-center">
                       <div className="w-12 h-12 bg-slate-100 rounded-2xl animate-pulse shrink-0"></div>
                       <div className="space-y-2 flex-1"><div className="h-4 bg-slate-100 rounded w-1/3 animate-pulse"></div><div className="h-3 bg-slate-50 rounded w-1/4 animate-pulse"></div></div>
                    </div>
                 ))}
              </div>
            ) : upcomingFiltered.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  Sem atendimentos {upcomingFilter === 'hoje' ? 'hoje' : upcomingFilter === 'semana' ? 'esta semana' : upcomingFilter === 'mes' ? 'este mês' : 'futuros'}.
                </div>
              ) : upcomingFiltered.slice(0, 10).map(app => (
                <div key={app.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                  <div className="w-14 text-center shrink-0">
                    <div className="text-xs font-bold text-indigo-600 uppercase">{app.start.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: 'short' })}</div>
                    <div className="text-[11px] text-slate-500">{app.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm truncate">{app.patient_name || 'Consulta'}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-indigo-500 uppercase">{app.type || 'consulta'} · {app.modality || 'presencial'}</span>
                      {app.status === 'confirmed' && <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md uppercase">Confirmado</span>}
                      {app.status === 'scheduled' && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md uppercase">Agendado</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/pacientes?search=${encodeURIComponent(app.patient_name || '')}`)}
                      className="text-xs font-bold text-slate-400 hover:text-indigo-600"
                      title="Ver paciente"
                    >
                      Paciente
                    </button>
                      <button onClick={() => navigate(`/agenda?appointmentId=${app.id}`)} className="text-xs font-bold text-slate-400 hover:text-indigo-600">Agenda</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Bar chart - atendimentos por dia da semana */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm"><TrendingUp size={16} className="text-indigo-500" /> Atendimentos (últimos 30 dias)</h3>
              </div>
              {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-300" /></div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={appointmentsByDayOfWeek} barSize={22}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis hide allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      formatter={(v: any) => [v, 'Atendimentos']}
                    />
                    <Bar dataKey="atendimentos" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie chart - status */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm"><UserCheck size={16} className="text-violet-500" /> Status dos atendimentos</h3>
              </div>
              {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-300" /></div>
              ) : statusPieData.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-10">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      formatter={(v: any, name: any) => [v, name]}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Type and modality bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm"><Layers size={16} className="text-indigo-500" /> Tipos de atendimento</h3>
                <span className="text-[10px] font-bold text-slate-400">{totalAppointments} total</span>
              </div>
              {['consulta', 'pessoal', 'bloqueio'].map((key) => (
                <div key={key} className="mb-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                    <span className="uppercase">{key}</span>
                    <span>{typeCounts[key] || 0}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${ratio(typeCounts[key] || 0, totalAppointments)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm"><Video size={16} className="text-emerald-500" /> Modalidade</h3>
                <span className="text-[10px] font-bold text-slate-400">{totalAppointments} total</span>
              </div>
              {['presencial', 'online'].map((key) => (
                <div key={key} className="mb-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                    <span className="uppercase">{key}</span>
                    <span>{modalityCounts[key] || 0}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${ratio(modalityCounts[key] || 0, totalAppointments)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* SECTION: BIRTHDAYS */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-500" />
                    Aniversários
                </h3>
            </div>
            {isLoading ? (
              <div className="space-y-3 pt-4">
                {[1,2].map(i => (
                  <div key={i} className="flex gap-3 items-center">
                     <div className="w-10 h-10 bg-slate-100 rounded-xl animate-pulse"></div>
                     <div className="space-y-1.5 flex-1"><div className="h-4 w-28 bg-slate-100 rounded animate-pulse"></div><div className="h-3 w-16 bg-slate-50 rounded animate-pulse"></div></div>
                  </div>
                ))}
              </div>
            ) : birthdays.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-8 border-2 border-dashed border-slate-50 rounded-2xl">Sem aniversários próximos.</div>
            ) : (
              <div className="space-y-4">
                {birthdays.map(({ patient, next }) => {
                  const birthDate = new Date(patient.birth_date || patient.birthDate || '');
                  const age = Number.isNaN(birthDate.getTime()) ? null : now.getFullYear() - birthDate.getFullYear();
                  const isToday = next.getDate() === now.getDate() && next.getMonth() === now.getMonth();
                  const phone = (patient.whatsapp || patient.phone || '').replace(/\D/g, '');

                  const handleSendBirthdayMsg = () => {
                    const msg = `Olá ${patient.full_name || patient.name}, parabéns pelo seu aniversário! Desejo muita saúde, paz e realizações. Um grande abraço!`;
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                  };

                  return (
                    <div key={patient.id} className={`flex items-center justify-between p-3.5 rounded-2xl transition-all border ${isToday ? 'bg-amber-50 border-amber-100' : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:shadow-md'}`}>
                      <div className="min-w-0 flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs ${isToday ? 'bg-amber-200 text-amber-700' : 'bg-white text-slate-400 shadow-sm border border-slate-100'}`}>
                            {next.getDate()}/{next.getMonth() + 1}
                        </div>
                        <div className="truncate">
                          <div className="text-sm font-black text-slate-800 truncate">{patient.full_name || patient.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {age && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{age} anos</span>}
                            {isToday && <span className="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-md uppercase tracking-tighter animate-pulse">Hoje!</span>}
                          </div>
                        </div>
                      </div>

                      {phone && (
                        <button
                          onClick={handleSendBirthdayMsg}
                          className={`p-2.5 rounded-xl transition-all active:scale-95 ${isToday ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 hover:bg-amber-600' : 'text-emerald-600 bg-white border border-slate-100 hover:bg-emerald-50 hover:border-emerald-100'}`}
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
          </div>

          {/* SECTION: TO-DO LIST (Gestão Diária) */}
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col max-h-[400px]">
            <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-indigo-500" />
                    Tarefas Diárias
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{todosList.filter(t=>!t.completed).length} Pendentes</span>
            </div>
            
            <div className="flex-1 overflow-y-auto w-full custom-scrollbar pr-2 space-y-2 mb-4">
               {todosList.length === 0 ? (
                  <div className="text-center text-slate-400 text-sm py-4 border border-dashed border-slate-100 rounded-2xl">
                    Sua lista está vazia! Adicione tarefas abaixo. ✍🏼
                  </div>
               ) : (
                  todosList.map(t => (
                     <div key={t.id} className="group flex items-start gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                        <button onClick={() => toggleTodo(t.id, !t.completed)} className="mt-0.5 shrink-0 transition-all active:scale-90">
                           {t.completed ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Circle size={18} className="text-slate-300 hover:text-indigo-400" />}
                        </button>
                        <p className={`flex-1 text-sm font-medium leading-snug transition-all ${t.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                           {t.text}
                        </p>
                        <button onClick={() => handleRemoveTodo(t.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1">
                           <Trash2 size={14} />
                        </button>
                     </div>
                  ))
               )}
            </div>

            <form onSubmit={handleSaveTodo} className="relative mt-auto border-t border-slate-50 pt-3">
               <input
                 type="text"
                 placeholder="O que você não esquecer hoje?"
                 value={newTodo}
                 onChange={e => setNewTodo(e.target.value)}
                 className="w-full bg-slate-50 border border-slate-100 placeholder-slate-400 text-sm rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all text-slate-700 font-medium"
               />
               <button type="submit" disabled={!newTodo.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 mt-1.5 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg transition-colors">
                  <Plus size={14} />
               </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Acesso rápido</h3>
               <button onClick={() => { setEditingShortcutId(null); setNewShortcut({ title: '', url: '', icon: 'link', color: 'bg-indigo-500' }); setIsAddShortcutOpen(true); }} className="text-slate-400 hover:text-indigo-600 p-1.5 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors group relative" title="Adicionar Atalho">
                  <Plus size={16} />
               </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {allShortcuts.map(s => (
                <a key={s.id} href={s.url} target="_blank" rel="noopener" className="group/btn relative flex flex-col items-center justify-center p-3 rounded-lg bg-slate-50 hover:bg-white border border-slate-100 hover:border-indigo-100 transition-all text-center">
                  {!s.isSystem && (
                     <div className="absolute top-1 right-1 flex gap-1 opacity-0 pointer-events-none group-hover/btn:opacity-100 group-hover/btn:pointer-events-auto transition-all">
                       <button onClick={(e) => openEditShortcut(s, e)} className="bg-slate-200 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600 rounded-md p-1.5 shadow-sm transition-colors" title="Editar">
                         <Settings size={12} />
                       </button>
                       <button onClick={(e) => handleRemoveShortcut(s.id, e)} className="bg-slate-200 text-slate-600 hover:bg-red-500 hover:text-white rounded-md p-1.5 shadow-sm transition-colors" title="Excluir">
                         <Trash2 size={12} />
                       </button>
                     </div>
                  )}
                  <div className={`w-8 h-8 ${s.color} rounded-full flex items-center justify-center text-white mb-1.5`}>{renderIcon(s.icon, 16)}</div>
                  <span className="text-[10px] font-bold text-slate-700 truncate w-full px-1">{s.title}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AuroraAssistant />

      {/* MODAL ADICIONAR/EDITAR ACESSO RÁPIDO */}
      <Modal
         isOpen={isAddShortcutOpen}
         onClose={() => { setIsAddShortcutOpen(false); setEditingShortcutId(null); }}
         title={editingShortcutId ? "Editar Acesso Rápido" : "Novo Acesso Rápido"}
         size="sm"
         footer={
            <div className="flex justify-end gap-2 w-full">
               <Button variant="ghost" onClick={() => { setIsAddShortcutOpen(false); setEditingShortcutId(null); }}>Cancelar</Button>
               <Button variant="primary" onClick={handleSaveShortcut} isLoading={isSavingShortcut}>Salvar</Button>
            </div>
         }
      >
         <div className="space-y-4 py-2">
             <Input 
                label="Nome do Acesso"
                placeholder="Ex: Meu Site, Artigos..."
                value={newShortcut.title || ''}
                onChange={e => setNewShortcut({...newShortcut, title: e.target.value})}
             />
             <Input 
                label="Link (URL)"
                placeholder="exemplo.com.br"
                value={newShortcut.url || ''}
                onChange={e => setNewShortcut({...newShortcut, url: e.target.value})}
             />
             <div>
                <span className="text-xs font-bold text-slate-600 block mb-2">Selecione o Ícone</span>
                <div className="flex gap-2 flex-wrap max-h-36 overflow-y-auto w-full custom-scrollbar p-1">
                   {ICON_OPTIONS.map(opt => (
                      <button
                         key={opt.id}
                         onClick={() => setNewShortcut({...newShortcut, icon: opt.id, color: opt.color})} /* Sugere a cor baseada no icone */
                         className={`p-3 rounded-xl transition-all border-2 flex items-center justify-center ${newShortcut.icon === opt.id ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shrink-0 scale-110 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300 text-slate-400 hover:bg-slate-50'}`}
                         title={opt.id}
                      >
                         {opt.icon}
                      </button>
                   ))}
                </div>
             </div>

             <div>
                <span className="text-xs font-bold text-slate-600 block mb-2">Cor do Círculo</span>
                <div className="flex gap-2 flex-wrap max-h-36 overflow-y-auto w-full custom-scrollbar p-1">
                   {COLOR_OPTIONS.map(col => (
                      <button
                         key={col}
                         onClick={() => setNewShortcut({...newShortcut, color: col})}
                         className={`w-8 h-8 rounded-full shadow-sm transition-all border-2 ${col} ${newShortcut.color === col ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'}`}
                         title={col}
                      />
                   ))}
                </div>
             </div>
         </div>
      </Modal>
    </div>
  );
};
