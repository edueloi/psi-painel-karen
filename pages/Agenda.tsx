import React, { useState, useEffect, useMemo } from 'react';
import { api, API_BASE_URL, getStaticUrl } from '../services/api';
import { Appointment, Service, Patient, User, AppointmentType } from '../types';
import {
    ChevronLeft, ChevronRight, ChevronDown, Clock, Plus, Video, MapPin,
    Calendar as CalendarIcon, CalendarDays, CalendarRange, X, Check, Repeat, Trash2, User as UserIcon,
    DollarSign, Package, Layers, Loader2, Briefcase, FileText, UserCheck, Ban, Link2, Search,
    Filter, LayoutGrid, List as ListIcon, ExternalLink, Sparkles, CheckCircle2, AlertCircle,
    ArrowUpRight, Info,
    Edit3, Download, Upload, FileDown, FileUp,
    Activity,
    AlignLeft, MessageSquare, Send, Stethoscope, Tag,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Modal } from '../components/UI/Modal';
import { Button } from '../components/UI/Button';
import { Input, Select, TextArea, Combobox } from '../components/UI/Input';
import { DatePicker } from '../components/UI/DatePicker';
import { AgendaPlanner, WorkScheduleDay } from '../components/UI/AgendaPlanner';
import { PageHeader } from '../components/UI/PageHeader';

type ComandaTab = 'avulsa' | 'pacote';
type ViewMode = 'kanban' | 'list';

type EditableItem = {
  id?: string;
  serviceId?: string;
  name: string;
  qty: number;
  price: number;
};

type EditableComanda = Partial<Appointment> & {
  id?: string;
  patientId?: string;
  patientSearch?: string;
  professionalId?: string;
  startDate?: string;
  totalValue?: number;
  paidValue?: number;
  description?: string;
  status?: string;
  sessions_total?: number;
  sessions_used?: number;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  packageId?: string;
  items?: EditableItem[];
};

const lineInputClass =
  'w-full h-10 bg-transparent border-0 border-b border-slate-300 px-0 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary-600 focus:outline-none';

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const compactInputClass =
  'w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none';

const iconButtonClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-primary-600';

const TypeButton: React.FC<{
  active: boolean;
  label: string;
  onClick: () => void;
}> = ({ active, label, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 text-sm text-slate-700"
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
          active ? 'border-primary-600' : 'border-slate-300'
        }`}
      >
        {active && <span className="h-2.5 w-2.5 rounded-full bg-primary-600" />}
      </span>
      <span>{label}</span>
    </button>
  );
};

const recurrenceOptions = [
    { label: 'Não Repete', freq: '', interval: 1, count: 1 },
    // 1x por semana
    { label: 'Semanal — 4 sessões', freq: 'WEEKLY', interval: 1, count: 4 },
    { label: 'Semanal — 8 sessões', freq: 'WEEKLY', interval: 1, count: 8 },
    { label: 'Semanal — 12 sessões', freq: 'WEEKLY', interval: 1, count: 12 },
    { label: 'Semanal — 16 sessões', freq: 'WEEKLY', interval: 1, count: 16 },
    { label: 'Semanal — 20 sessões', freq: 'WEEKLY', interval: 1, count: 20 },
    // 2x por semana (dia de início + 3 dias depois, todo semana)
    { label: '2x por semana — 8 sessões (4 semanas)', freq: 'TWICE_WEEKLY', interval: 1, count: 8 },
    { label: '2x por semana — 16 sessões (8 semanas)', freq: 'TWICE_WEEKLY', interval: 1, count: 16 },
    { label: '2x por semana — 24 sessões (12 semanas)', freq: 'TWICE_WEEKLY', interval: 1, count: 24 },
    // 3x por semana (dia de início, +2 dias, +4 dias, todo semana)
    { label: '3x por semana — 12 sessões (4 semanas)', freq: 'THREE_WEEKLY', interval: 1, count: 12 },
    { label: '3x por semana — 24 sessões (8 semanas)', freq: 'THREE_WEEKLY', interval: 1, count: 24 },
    // Quinzenal (A cada 2 semanas — Mantém o dia da semana)
    { label: 'Quinzenal — 2 sessões', freq: 'WEEKLY', interval: 2, count: 2 },
    { label: 'Quinzenal — 4 sessões', freq: 'WEEKLY', interval: 2, count: 4 },
    { label: 'Quinzenal — 8 sessões', freq: 'WEEKLY', interval: 2, count: 8 },
    { label: 'Quinzenal — 12 sessões', freq: 'WEEKLY', interval: 2, count: 12 },
    { label: 'Quinzenal — 16 sessões', freq: 'WEEKLY', interval: 2, count: 16 },
    { label: 'Quinzenal — 24 sessões', freq: 'WEEKLY', interval: 2, count: 24 },
    // A cada 15 dias (Intervalo fixo — Muda o dia da semana)
    { label: 'A cada 15 dias — 4 sessões', freq: 'DAILY', interval: 15, count: 4 },
    { label: 'A cada 15 dias — 8 sessões', freq: 'DAILY', interval: 15, count: 8 },
    // Mensal
    { label: 'Mensal — 3 sessões', freq: 'MONTHLY', interval: 1, count: 3 },
    { label: 'Mensal — 6 sessões', freq: 'MONTHLY', interval: 1, count: 6 },
    { label: 'Mensal — 12 sessões', freq: 'MONTHLY', interval: 1, count: 12 },
    // Personalizado
    { label: 'Personalizado...', freq: 'CUSTOM', interval: 1, count: 1 },
];

export const Agenda: React.FC = () => {
  const { t, language } = useLanguage();
  const { user, isAdmin, hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [filterPatientId, setFilterPatientId] = useState<string | null>(null);
  const [filterProfessionalId, setFilterProfessionalId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [applyToSeries, setApplyToSeries] = useState(false);
  const [deleteSeries, setDeleteSeries] = useState(false);
  const { pushToast } = useToast();

  // ── Edit scope modal (which sessions to apply changes to) ──
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
  const [pendingSavePayload, setPendingSavePayload] = useState<any>(null);
  const [scopeRelatedApts, setScopeRelatedApts] = useState<Appointment[]>([]);
  const [selectedScopeIds, setSelectedScopeIds] = useState<Set<string | number>>(new Set());

  // ── Quick reschedule from detail modal ──
  const [isDetailRescheduleOpen, setIsDetailRescheduleOpen] = useState(false);
  const [detailRescheduleDateTime, setDetailRescheduleDateTime] = useState({ date: '', time: '' });
  const [detailRescheduleScopeIds, setDetailRescheduleScopeIds] = useState<Set<string | number>>(new Set());

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState(false);
  const [isRecurrenceConfigOpen, setIsRecurrenceConfigOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [tempDateTime, setTempDateTime] = useState({ date: '', time: '' });
  const [tempRecurrence, setTempRecurrence] = useState({
      freq: '',
      interval: 1,
      endType: 'count' as 'count' | 'until',
      endValue: 1 as number | string
  });
  const [isEndTimeModalOpen, setIsEndTimeModalOpen] = useState(false);
  const [tempEndTime, setTempEndTime] = useState('');
  const [patientComandas, setPatientComandas] = useState<any[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailQuickStatus, setDetailQuickStatus] = useState<string | null>(null);
  const [detailQuickNotes, setDetailQuickNotes] = useState('');
  const [isComandaManagerOpen, setIsComandaManagerOpen] = useState(false);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [managerTab, setManagerTab] = useState<'atendimentos' | 'pagamentos' | 'pacote'>('atendimentos');
  const [newPayment, setNewPayment] = useState<{ id?: string, value: string, date: string, method: string, receiptCode: string, comandaId: string }>({ value: '', date: new Date().toISOString().slice(0, 10), method: 'Pix', receiptCode: '', comandaId: '' });
  const [comandaPayments, setComandaPayments] = useState<any[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [isNewComandaModalOpen, setIsNewComandaModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ComandaTab>('avulsa');
  const [editingComanda, setEditingComanda] = useState<EditableComanda | null>(null);
  const [relatedApts, setRelatedApts] = useState<Appointment[]>([]);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<(string | number)[]>([]);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [editingAptId, setEditingAptId] = useState<number | null>(null);
  const [editAptValues, setEditAptValues] = useState<{ date: string; time: string }>({ date: '', time: '' });

  const [formData, setFormData] = useState<any>({
      type: 'consulta',
      modality: 'presencial',
      appointment_date: new Date().toISOString().slice(0, 16),
      duration_minutes: 50,
      title: '',
      service_id: '',
      patient_id: '',
      patient_name_text: '',
      psychologist_id: '',
      professional_name_text: '',
      notes: '',
      status: 'scheduled',
      meeting_url: '',
      recurrence_enabled: false,
      recurrence_freq: '',
      recurrence_interval: 1,
      recurrence_weekdays: [],
      recurrence_rule: null,
      recurrence_end_date: '',
      recurrence_count: '',
      recurrence_explicitly_none: false,
      is_all_day: false,
      reschedule_reason: '',
      comanda_id: ''
  });


  const [profileData, setProfileData] = useState<any>({});


  const locale = language === 'pt' ? 'pt-BR' : 'en-US';

  const workSchedule: WorkScheduleDay[] = useMemo(() => {
    const raw = profileData?.schedule;
    if (!raw) return [];
    const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed as WorkScheduleDay[];
  }, [profileData]);

  const profileClosedDates = useMemo(() => {
    const raw = profileData?.closed_dates;
    if (!raw) return [];
    const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed as { date: string; label: string }[];
  }, [profileData]);

  const startHour = useMemo(() => {
    const activeStarts = workSchedule
      .filter(d => d.active)
      .map(d => parseInt(d.start.split(':')[0]));
    // Base: minimum work start hour (default 7 if no schedule configured)
    const schedMin = activeStarts.length > 0 ? Math.min(...activeStarts) : 7;

    // Only consider appointments in the CURRENT visible week to extend startHour lower
    const ws = (() => { const d = new Date(currentDate); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; })();
    const we = new Date(ws); we.setDate(we.getDate() + 6); we.setHours(23,59,59,999);
    const visibleAptHours = appointments
      .map(a => { const d = new Date(a.start); return isNaN(d.getTime()) ? null : { h: d.getHours(), t: d.getTime() }; })
      .filter((x): x is { h: number; t: number } => x !== null && x.t >= ws.getTime() && x.t <= we.getTime())
      .map(x => x.h);
    const aptMin = visibleAptHours.length > 0 ? Math.min(...visibleAptHours) : schedMin;
    return Math.min(schedMin, aptMin);
  }, [workSchedule, appointments, currentDate]);

  const endHour = useMemo(() => {
    const schedMax = workSchedule.filter(d => d.active).map(d => {
      const [h, m] = d.end.split(':').map(Number);
      return m > 0 ? h + 1 : h;
    });
    // Only consider appointments in the CURRENT visible week to extend endHour higher
    const ws = (() => { const d = new Date(currentDate); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; })();
    const we = new Date(ws); we.setDate(we.getDate() + 6); we.setHours(23,59,59,999);
    const aptMax = appointments
      .map((a: any) => { const d = new Date(a.end || a.start); return isNaN(d.getTime()) ? null : { h: d.getHours() + (d.getMinutes() > 0 ? 1 : 0), t: new Date(a.start).getTime() }; })
      .filter((x): x is { h: number; t: number } => x !== null && x.t >= ws.getTime() && x.t <= we.getTime())
      .map(x => x.h);
    const scheduleEnd = schedMax.length > 0 ? Math.max(...schedMax) : 18;
    return aptMax.length > 0 ? Math.max(scheduleEnd, ...aptMax) : scheduleEnd;
  }, [workSchedule, appointments, currentDate]);

  const skippedHours = useMemo(() => {
    if (!workSchedule.length) return [];
    // Coleta horas de intervalo/almoço de todos os dias ativos
    const lunchHours = new Set<number>();
    workSchedule.filter(d => d.active).forEach((d: any) => {
      // Support new breaks[] format and old lunchStart/lunchEnd format
      const dayBreaks: { start: string; end: string }[] =
        d.breaks ?? (d.lunchStart ? [{ start: d.lunchStart, end: d.lunchEnd }] : []);
      dayBreaks.forEach(b => {
        if (b.start && b.end) {
          const lh = parseInt(b.start.split(':')[0]);
          const le = parseInt(b.end.split(':')[0]);
          for (let h = lh; h < le; h++) lunchHours.add(h);
        }
      });
    });
    if (lunchHours.size === 0) return [];
    // Semana visível
    const ws = (() => { const d = new Date(currentDate); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; })();
    const we = new Date(ws); we.setDate(we.getDate() + 6); we.setHours(23,59,59,999);
    // Horas com agendamentos na semana visível
    const hoursWithApts = new Set<number>();
    appointments.forEach((a: any) => {
      const d = new Date(a.start);
      if (d.getTime() >= ws.getTime() && d.getTime() <= we.getTime()) {
        hoursWithApts.add(d.getHours());
      }
    });
    // Remove horas de intervalo que tenham agendamentos
    return Array.from(lunchHours).filter(h => !hoursWithApts.has(h));
  }, [workSchedule, appointments, currentDate]);

  const hourHeight = 70;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  const typeMeta = {
      consulta: {
          label: 'Consulta',
          chip: 'bg-indigo-50/50 text-indigo-700 border-indigo-100/50 backdrop-blur-sm',
          solid: 'bg-indigo-600',
          dot: 'bg-indigo-500',
          event: 'bg-white text-slate-700 border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/50'
      },
      pessoal: {
          label: 'Pessoal',
          chip: 'bg-amber-50/50 text-amber-700 border-amber-100/50 backdrop-blur-sm',
          solid: 'bg-amber-500',
          dot: 'bg-amber-500',
          event: 'bg-amber-50/40 text-amber-900 border-amber-100 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-100/50'
      },
      bloqueio: {
          label: 'Feriado/Bloqueio',
          chip: 'bg-slate-200 text-slate-600 border-slate-300',
          solid: 'bg-slate-400',
          dot: 'bg-slate-400',
          event: 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300 hover:shadow-md'
      },
  } as const;

  const statusMeta: Record<string, { label: string; chip: string; dot: string }> = {
      scheduled:         { label: 'Agendado',          chip: 'bg-slate-100/60 text-slate-500 border-slate-200/40',   dot: 'bg-slate-400' },
      confirmed:         { label: 'Confirmado',         chip: 'bg-emerald-50/60 text-emerald-700 border-emerald-100/60', dot: 'bg-emerald-500' },
      completed:         { label: 'Realizado',          chip: 'bg-indigo-50/60 text-indigo-700 border-indigo-100/60',  dot: 'bg-indigo-500' },
      cancelled:         { label: 'Cancelado',          chip: 'bg-rose-50/60 text-rose-700 border-rose-100/60',        dot: 'bg-rose-500' },
      'no-show':         { label: 'Faltou',             chip: 'bg-amber-50/60 text-amber-700 border-amber-100/60',     dot: 'bg-amber-500' },
      no_show:           { label: 'Faltou',             chip: 'bg-amber-50/60 text-amber-700 border-amber-100/60',     dot: 'bg-amber-500' },
      rescheduled:       { label: 'Reagendado',         chip: 'bg-violet-50/60 text-violet-700 border-violet-100/60',  dot: 'bg-violet-500' },
      falta_justificada: { label: 'Falta Justificada',  chip: 'bg-orange-50/60 text-orange-700 border-orange-100/60', dot: 'bg-orange-400' },
  };

  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();
  const addDays = (date: Date, days: number) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
  const startOfWeek = (date: Date) => { const d = startOfDay(date); const day = d.getDay(); d.setDate(d.getDate() - day); return d; };
  const endOfWeek = (date: Date) => addDays(startOfWeek(date), 6);
  const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);
  };

  const formatCurrencyInput = (value?: number) => {
    if (value === undefined || value === null) return '';
    return Number(value || 0).toFixed(2).replace('.', ',');
  };

  const parseMonetaryValue = (val: string) => {
    if (!val) return 0;
    const digits = val.replace(/\D/g, '');
    if (!digits) return 0;
    return parseFloat(digits) / 100;
  };

  const normalizePatientName = (p: any) => {
    if (!p) return 'Paciente';
    return p.full_name || p.name || 'Paciente';
  };

  const getComandaTotal = (c: any) =>
    Number(c?.total_value || c?.totalValue || c?.total || 0) || 0;

  const getComandaPaid = (c: any) => Number(c?.paid_value || c?.paidValue || 0) || 0;

  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const monthDays: Date[] = [];
  for (let d = new Date(calendarStart); d <= calendarEnd; d = addDays(d, 1)) { monthDays.push(new Date(d)); }

  const fetchData = async () => {
    setIsLoading(true);
    try {
        const [apts, pts, srvs, pkgs, pros, profile] = await Promise.all([
            api.get<any[]>('/appointments'),
            api.get<any[]>('/patients'),
            api.get<Service[]>('/services'),
            api.get<any[]>('/packages'),
            api.get<any[]>('/users'),
            api.get<any>('/profile/me')
        ]);

        setProfileData(profile || {});

        setAppointments(apts.map(a => {
            // .replace(' ', 'T') faz o browser tratar como hora LOCAL (sem T é interpretado como UTC)
            const rawStart = (a.start_time || a.appointment_date || '').replace(' ', 'T');
            const start = new Date(rawStart);
            // Clamp duration entre 5min e 480min (8h) para nunca gerar card gigante
            const dur = Math.min(Math.max(Number(a.duration_minutes) || 50, 5), 480);
            const end = new Date(start.getTime() + dur * 60000);
            // Normaliza status do banco para o frontend
            const knownStatuses = ['scheduled','confirmed','completed','cancelled','no-show','rescheduled','falta_justificada'];
            const rawStatus = (() => {
              const s = (a.status || 'scheduled').replace('no_show', 'no-show');
              return knownStatuses.includes(s) ? s : 'scheduled';
            })();
            return {
                ...a,
                start,
                end,
                type: a.type || 'consulta',
                status: rawStatus,
                professional_id: a.professional_id || a.psychologist_id,
                duration_minutes: a.duration_minutes || 50
            };
        }));
        setPatients((pts || []).map(p => ({
            ...p,
            full_name: p.full_name || p.name || 'Sem nome'
        })));
        setProfessionals(pros?.filter(p => p.role !== 'secretario') || []);
        setServices(srvs || []);
        setPackages(pkgs || []);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    const fetchComandas = async () => {
        const pId = selectedApt?.patient_id || formData.patient_id;
        if (!pId || isNaN(parseInt(String(pId)))) {
            setPatientComandas([]);
            return;
        }
        try {
            const data = await api.get<any[]>(`/finance/comandas/patient/${pId}`);
            setPatientComandas(data || []);
        } catch (err) {
            console.error('Erro ao buscar comandas:', err);
            setPatientComandas([]);
        }
    };
    fetchComandas();
  }, [formData.patient_id, selectedApt?.patient_id]);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const aptId = searchParams.get('appointmentId');
    if (aptId && appointments.length > 0 && !hasPrefilled) {
      const apt = appointments.find(a => String(a.id) === String(aptId));
      if (apt) {
        setCurrentDate(new Date(apt.start));
        openDetailModal(apt);
        setHasPrefilled(true);
      }
    }
  }, [searchParams, appointments, hasPrefilled]);

  const filteredAppointments = useMemo(() => {
    let filtered = appointments;
    if (filterPatientId) filtered = filtered.filter(a => String(a.patient_id || '') === String(filterPatientId));
    if (filterProfessionalId) filtered = filtered.filter(a => String(a.professional_id || '') === String(filterProfessionalId));
    if (filterStatus) filtered = filtered.filter(a => (a.status || 'scheduled') === filterStatus);
    return filtered;
  }, [appointments, filterPatientId, filterProfessionalId, filterStatus]);

  const getAppointmentsForDay = (date: Date) => filteredAppointments.filter(a => isSameDay(a.start, date));

  const calculateItemsTotal = (items?: EditableItem[]) =>
    (items || []).reduce(
      (acc, item) => acc + (Number(item.price || 0) * Number(item.qty || 0)),
      0
    );

  const modalGrossTotal = useMemo(() => {
    if (!editingComanda) return 0;

    if (modalTab === 'pacote') {
      const itemsTotal = calculateItemsTotal(editingComanda.items);
      return itemsTotal > 0 ? itemsTotal : Number(editingComanda.totalValue || 0);
    }

    return Number(editingComanda.totalValue || 0);
  }, [editingComanda, modalTab]);

  const modalDiscountAmount = useMemo(() => {
    if (!editingComanda) return 0;
    const discountValue = Number(editingComanda.discount_value || 0);

    if (editingComanda.discount_type === 'percentage') {
      return (modalGrossTotal * discountValue) / 100;
    }

    return discountValue;
  }, [editingComanda, modalGrossTotal]);

  const modalNetTotal = useMemo(() => {
    return Math.max(0, modalGrossTotal - modalDiscountAmount);
  }, [modalGrossTotal, modalDiscountAmount]);

  const resolvePackageItems = (pkg: any): EditableItem[] => {
    if (Array.isArray(pkg?.items) && pkg.items.length > 0) {
      return pkg.items.map((item: any) => {
        const linkedService = services.find(
          (service) =>
            String(service.id) === String(item.service_id || item.serviceId)
        );

        return {
          serviceId: String(item.service_id || item.serviceId || linkedService?.id || ''),
          name:
            item.service_name ||
            item.serviceName ||
            item.name ||
            linkedService?.name ||
            '',
          qty: Number(item.qty || item.quantity || 1),
          price: Number(item.price || item.unit_price || item.value || linkedService?.price || 0),
        };
      });
    }

    return [
      {
        serviceId: '',
        name: pkg?.name || 'Pacote',
        qty: 1,
        price: Number(pkg?.price || pkg?.totalPrice || pkg?.total_value || 0),
      },
    ];
  };

  const handleSelectPackage = (packageId: string) => {
    const foundPackage = packages.find((pkg) => String(pkg.id) === String(packageId));
    if (!foundPackage || !editingComanda) return;

    const items = resolvePackageItems(foundPackage);
    const sessionsTotal =
      Number(
        foundPackage.sessions_total ||
          foundPackage.sessions_count ||
          foundPackage.items?.length ||
          items.reduce((acc: number, item: EditableItem) => acc + Number(item.qty || 0), 0) ||
          1
      ) || 1;

    setEditingComanda({
      ...editingComanda,
      packageId: String(foundPackage.id),
      description: foundPackage.name || editingComanda.description || '',
      items,
      totalValue: calculateItemsTotal(items),
      sessions_total: sessionsTotal,
      discount_type: foundPackage.discountType || 'fixed',
      discount_value: Number(foundPackage.discountValue || 0),
    });
  };

  const addPackageItem = () => {
    if (!editingComanda) return;
    setEditingComanda({
      ...editingComanda,
      items: [...(editingComanda.items || []), { name: '', serviceId: '', qty: 1, price: 0 }],
    });
  };

  const updatePackageItem = (
    index: number,
    patch: Partial<EditableItem>,
    useServiceAutoFill = false
  ) => {
    if (!editingComanda) return;

    const nextItems = [...(editingComanda.items || [])];
    const currentItem = nextItems[index] || { name: '', qty: 1, price: 0 };

    let updatedItem = { ...currentItem, ...patch };

    if (useServiceAutoFill && patch.serviceId) {
      const linkedService = services.find(
        (service) => String(service.id) === String(patch.serviceId)
      );

      updatedItem = {
        ...updatedItem,
        serviceId: String(linkedService?.id || ''),
        name: linkedService?.name || updatedItem.name || '',
        price: Number(linkedService?.price || 0),
      };
    }

    nextItems[index] = updatedItem;

    setEditingComanda({
      ...editingComanda,
      items: nextItems,
      totalValue: calculateItemsTotal(nextItems),
    });
  };

  const removePackageItem = (index: number) => {
    if (!editingComanda) return;
    const nextItems = [...(editingComanda.items || [])].filter((_, i) => i !== index);

    setEditingComanda({
      ...editingComanda,
      items: nextItems,
      totalValue: calculateItemsTotal(nextItems),
    });
  };

  const stats = useMemo(() => {
    const today = getAppointmentsForDay(new Date());
    return {
      todayCount: today.length,
      confirmedCount: today.filter(a => a.status === 'confirmed').length,
      onlineCount: today.filter(a => a.modality === 'online').length
    };
  }, [filteredAppointments]);

  const handleNavigate = (direction: number) => {
    const d = new Date(currentDate);
    if (view === 'day') d.setDate(d.getDate() + direction);
    if (view === 'week') d.setDate(d.getDate() + direction * 7);
    if (view === 'month') d.setMonth(d.getMonth() + direction);
    setCurrentDate(d);
  };

  const handleDateChange = (dateStr: string) => {
    if (dateStr) {
      setCurrentDate(new Date(dateStr + 'T12:00:00'));
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/export`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('psi_token')}` }
      });
      if (!response.ok) throw new Error('Erro ao exportar');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agenda_exportada_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      pushToast('success', 'Agenda exportada com sucesso.');
    } catch (err: any) {
      console.error('Erro ao exportar Excel:', err);
      pushToast('error', `Erro ao exportar agenda: ${err.message || 'Erro de conexão'}`);
    }
  };

  const handleExportCSV = () => {
    try {
      const columns = ['Data/Hora', 'Paciente', 'Profissional', 'Serviço', 'Duração', 'Status', 'Modalidade'];
      const rows = filteredAppointments.map(a => {
        const dateStr = a.start
          ? a.start.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '';
        const patient = patients.find(p => String(p.id) === String(a.patient_id));
        const patientName = a.patient_name || (patient ? (patient.full_name || patient.name) : '') || '';
        const prof = professionals.find(p => String(p.id) === String(a.professional_id || a.psychologist_id));
        const profName = prof?.name || '';
        const srv = services.find(s => String(s.id) === String(a.service_id));
        const srvName = srv?.name || '';
        const duration = a.duration_minutes ? `${a.duration_minutes} min` : '';
        const statusLabels: Record<string, string> = {
          scheduled: 'Agendado',
          confirmed: 'Confirmado',
          completed: 'Realizado',
          cancelled: 'Cancelado',
          'no-show': 'Faltou',
        };
        const status = statusLabels[a.status || 'scheduled'] || a.status || '';
        const modalityLabels: Record<string, string> = { presencial: 'Presencial', online: 'Online', domiciliar: 'Domiciliar' };
        const modality = modalityLabels[a.modality || ''] || a.modality || '';
        return [dateStr, patientName, profName, srvName, duration, status, modality]
          .map(v => `"${String(v).replace(/"/g, '""')}"`)
          .join(';');
      });
      const BOM = '\uFEFF';
      const csvContent = BOM + [columns.join(';'), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agenda_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      pushToast('success', 'CSV exportado com sucesso.');
    } catch (err) {
      console.error(err);
      pushToast('error', 'Erro ao exportar CSV.');
    }
  };

  const handleExportPDF = async () => {
    try {
      pushToast('success', 'Gerando PDF...');
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const profName = profileData?.name || '';
      const profCrp = profileData?.crp || '';
      const logoUrl = profileData?.clinic_logo_url ? getStaticUrl(profileData.clinic_logo_url) : '';
      const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

      const statusLabels: Record<string, string> = {
        scheduled: 'Agendado',
        confirmed: 'Confirmado',
        completed: 'Realizado',
        cancelled: 'Cancelado',
        'no-show': 'Faltou',
      };

      const tableRows = filteredAppointments.map(a => {
        const dateStr = a.start
          ? a.start.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '';
        const patient = patients.find(p => String(p.id) === String(a.patient_id));
        const patientName = a.patient_name || (patient ? (patient.full_name || patient.name) : '') || '-';
        const prof = professionals.find(p => String(p.id) === String(a.professional_id || a.psychologist_id));
        const profNameRow = prof?.name || '-';
        const srv = services.find(s => String(s.id) === String(a.service_id));
        const srvName = srv?.name || '-';
        const status = statusLabels[a.status || 'scheduled'] || a.status || '-';
        return [dateStr, patientName, profNameRow, srvName, status];
      });

      const buildRowHtml = (row: string[]) =>
        `<tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:8px 12px;font-size:12px;color:#334155;">${row[0]}</td>
          <td style="padding:8px 12px;font-size:12px;color:#334155;">${row[1]}</td>
          <td style="padding:8px 12px;font-size:12px;color:#334155;">${row[2]}</td>
          <td style="padding:8px 12px;font-size:12px;color:#334155;">${row[3]}</td>
          <td style="padding:8px 12px;font-size:12px;color:#334155;">${row[4]}</td>
        </tr>`;

      const headersHtml = `
        <tr style="background:#f8fafc;">
          <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;color:#64748b;border-bottom:2px solid #e2e8f0;">Data/Hora</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;color:#64748b;border-bottom:2px solid #e2e8f0;">Paciente</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;color:#64748b;border-bottom:2px solid #e2e8f0;">Profissional</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;color:#64748b;border-bottom:2px solid #e2e8f0;">Serviço</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;color:#64748b;border-bottom:2px solid #e2e8f0;">Status</th>
        </tr>`;

      const ROWS_FIRST_PAGE = 14;
      const ROWS_PER_PAGE = 18;

      const chunks: (typeof tableRows)[] = [];
      if (tableRows.length <= ROWS_FIRST_PAGE) {
        chunks.push(tableRows);
      } else {
        chunks.push(tableRows.slice(0, ROWS_FIRST_PAGE));
        for (let i = ROWS_FIRST_PAGE; i < tableRows.length; i += ROWS_PER_PAGE) {
          chunks.push(tableRows.slice(i, i + ROWS_PER_PAGE));
        }
      }

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      for (let pageIdx = 0; pageIdx < chunks.length; pageIdx++) {
        const pageRows = chunks[pageIdx];
        const isFirstPage = pageIdx === 0;
        const isLastPage = pageIdx === chunks.length - 1;

        const rowsHtml = pageRows.map(row => buildRowHtml(row)).join('');

        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1200px;background:#ffffff;font-family:Arial,sans-serif;color:#1e293b;padding:40px;box-sizing:border-box;';

        container.innerHTML = `
          ${isFirstPage ? `
            <div style="display:flex;align-items:center;gap:24px;margin-bottom:32px;border-bottom:2px solid #e2e8f0;padding-bottom:24px;">
              ${logoUrl
                ? `<img src="${logoUrl}" style="width:72px;height:72px;object-fit:contain;border-radius:12px;border:1px solid #e2e8f0;" crossorigin="anonymous" />`
                : `<div style="width:72px;height:72px;border-radius:12px;background:#f1f5f9;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#94a3b8;">LOGO</div>`
              }
              <div>
                <div style="font-size:20px;font-weight:900;color:#1e293b;">${profName}</div>
                ${profCrp ? `<div style="font-size:13px;color:#64748b;">CRP: ${profCrp}</div>` : ''}
                <div style="font-size:13px;color:#64748b;margin-top:4px;">Agenda de Atendimentos</div>
                <div style="font-size:12px;color:#94a3b8;">Gerado em: ${now}</div>
              </div>
            </div>
          ` : `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #e2e8f0;">
              <span style="font-size:13px;font-weight:700;color:#1e293b;">Agenda de Atendimentos</span>
              <span style="font-size:11px;color:#94a3b8;">Página ${pageIdx + 1} de ${chunks.length} · ${now}</span>
            </div>
          `}
          <table style="width:100%;border-collapse:collapse;">
            <thead>${headersHtml}</thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          ${isLastPage ? `<div style="margin-top:20px;font-size:10px;color:#94a3b8;text-align:right;">Gerado em ${now} · PsiFlux${profName ? ` · ${profName}` : ''}${profCrp ? ` · CRP ${profCrp}` : ''}</div>` : ''}
        `;

        document.body.appendChild(container);
        const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 1200 });
        document.body.removeChild(container);

        const imgData = canvas.toDataURL('image/png');
        const imgH = (canvas.height / canvas.width) * 297;
        const safeScale = imgH > 210 ? 210 / imgH : 1;
        const finalW = 297 * safeScale;
        const finalH = imgH * safeScale;

        if (pageIdx > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', (297 - finalW) / 2, 0, finalW, finalH);
      }

      pdf.save(`agenda_${new Date().toISOString().slice(0, 10)}.pdf`);
      pushToast('success', 'PDF exportado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      pushToast('error', `Erro ao gerar PDF: ${err.message || 'Erro desconhecido'}`);
    }
  };


  const fetchComandaPayments = async (comandaId: string | number) => {
    if (!comandaId) return;
    setIsLoadingPayments(true);
    try {
      const payments = await api.get<any[]>(`/finance/comandas/${comandaId}/payments`);
      setComandaPayments(payments || []);
    } catch (err) {
      console.error('Erro ao buscar histórico de pagamentos:', err);
      setComandaPayments([]);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const handleSavePayment = async () => {
    const comandaId = selectedApt?.comanda_id || editingComanda?.id || newPayment.comandaId;
    if (!comandaId) {
        pushToast('error', 'Nenhuma comanda vinculada.');
        return;
    }

    const valueToAdd = parseMonetaryValue(newPayment.value);
    if (valueToAdd <= 0) {
        pushToast('error', 'Por favor, insira um valor válido para o pagamento');
        return;
    }

    try {
        if (newPayment.id) {
          await api.put(`/finance/comandas/${comandaId}/payments/${newPayment.id}`, {
              amount: valueToAdd,
              payment_date: newPayment.date,
              payment_method: newPayment.method,
              receipt_code: newPayment.receiptCode || null,
          });
        } else {
          await api.post(`/finance/comandas/${comandaId}/payments`, {
              amount: valueToAdd,
              payment_date: newPayment.date,
              payment_method: newPayment.method,
              receipt_code: newPayment.receiptCode || null,
          });
        }

        pushToast('success', newPayment.id ? 'Pagamento atualizado com sucesso!' : 'Pagamento registrado com sucesso!');
        setIsAddPaymentModalOpen(false);
        setNewPayment({ value: '', date: new Date().toISOString().slice(0, 10), method: 'Pix', receiptCode: '', comandaId: '' });

        // Recarregar dados
        fetchData();
        if (selectedApt?.patient_id || editingComanda?.patientId) {
            const pid = selectedApt?.patient_id || editingComanda?.patientId;
            const res = await api.get<any[]>(`/finance/comandas?patient_id=${pid}`);
            setPatientComandas(res as any[]);
            
            if (editingComanda) {
              const comandas = Array.isArray(res) ? res : (res as any).data || [];
              const updatedComanda = comandas.find((c: any) => String(c.id) === String(comandaId));
              if (updatedComanda) {
                setEditingComanda({
                  ...updatedComanda,
                  patientId: String(updatedComanda.patient_id),
                  professionalId: String(updatedComanda.professional_id),
                  items: updatedComanda.items?.map((it: any) => ({ ...it, serviceId: it.service_id }))
                });
              }
            }
        }
    } catch (err) {
        console.error(err);
        pushToast('error', 'Erro ao salvar pagamento');
    }
  };

  const handleDeletePayment = async (paymentId: string | number, comandaId: string | number) => {
    try {
      await api.delete(`/finance/comandas/${comandaId}/payments/${paymentId}`);
      pushToast('success', 'Pagamento excluído com sucesso!');
      
      // Recarregar dados
      fetchData();
      if (selectedApt?.patient_id || editingComanda?.patientId) {
        const pid = selectedApt?.patient_id || editingComanda?.patientId;
        const res = await api.get<any[]>(`/finance/comandas?patient_id=${pid}`);
        const comandas = Array.isArray(res) ? res : (res as any).data || [];
        setPatientComandas(comandas);
        if (editingComanda) {
          const updatedComanda = comandas.find((c: any) => String(c.id) === String(comandaId));
          if (updatedComanda) {
            setEditingComanda({
              ...updatedComanda,
              patientId: String(updatedComanda.patient_id),
              professionalId: String(updatedComanda.professional_id),
              items: updatedComanda.items?.map((it: any) => ({ ...it, serviceId: it.service_id }))
            });
          }
        }
      }
    } catch (err: any) {
      pushToast('error', err?.response?.data?.error || 'Erro ao excluir pagamento');
    }
  };

  const handleUpdateAppointmentStatus = async (appointmentId: number | string, newStatus: string) => {
    try {
      await api.put(`/appointments/${appointmentId}/status`, { status: newStatus });
      pushToast('success', 'Status atualizado!');
      fetchData();
      if (selectedApt?.patient_id) {
          const res = await api.get(`/finance/comandas?patient_id=${selectedApt.patient_id}`);
          setPatientComandas(res as any[]);
      }
    } catch (error) {
      pushToast('error', 'Erro ao atualizar status.');
    }
  };

  const handleUpdateAppointmentDate = async (appointmentId: number | string, newDate: string) => {
    try {
      await api.put(`/appointments/${appointmentId}/date`, { start_time: newDate });
      pushToast('success', 'Data atualizada!');
      fetchData();
      if (selectedApt?.patient_id) {
          const res = await api.get(`/finance/comandas?patient_id=${selectedApt.patient_id}`);
          setPatientComandas(res as any[]);
      }
    } catch (error) {
      pushToast('error', 'Erro ao atualizar data.');
    }
  };

  const handleRemoveCharge = async () => {
    if (!selectedApt) return;
    if (!window.confirm('Deseja realmente remover o vínculo financeiro deste agendamento?')) return;

    try {
        await api.put(`/appointments/${selectedApt.id}`, {
            ...selectedApt,
            comanda_id: null
        });
        pushToast('success', 'Vínculo financeiro removido.');
        setIsDetailModalOpen(false);
        fetchData();
    } catch (err) {
        console.error(err);
        pushToast('error', 'Erro ao remover cobrança.');
    }
  };

  const handleGenerateReceipt = async () => {
    if (!selectedApt) return;

    pushToast('success', 'Gerando recibo para download...');

    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

    const srv = services.find(s => String(s.id) === String(selectedApt.service_id));
    const prof = professionals.find(p => String(p.id) === String(selectedApt.professional_id || selectedApt.psychologist_id));

    const profName = prof?.name || profileData?.name || '';
    const profCrp = prof?.crp || profileData?.crp || '';
    const profCpf = prof?.cpf || profileData?.cpf || '';

    const patientName = selectedApt.patient_name || selectedApt.title || 'Paciente';
    const amount = srv ? formatCurrency(srv.price) : 'R$ 0,00';
    const dateStr = selectedApt.start.toLocaleDateString('pt-BR');
    const fullDateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const location = (profileData.address || '').split(',').pop()?.trim() || 'São Paulo';
    const logoUrl = profileData.clinic_logo_url ? getStaticUrl(profileData.clinic_logo_url) : '';

    // Cria um div invisível no DOM para renderizar o recibo
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:white;font-family:Arial,sans-serif;color:#00214d;';
    container.innerHTML = `
      <div style="display:flex;min-height:1123px;">
        <div style="width:40px;background:#00214d;min-height:1123px;flex-shrink:0;"></div>
        <div style="padding:60px 80px;flex:1;position:relative;">
          <div style="position:absolute;top:60px;right:80px;text-align:right;font-size:11px;color:#00214d;line-height:1.6;">
            <b>${profName}</b><br/>
            Psicóloga(o)<br/>
            ${profCrp ? `CRP: ${profCrp}<br/>` : ''}
            ${profCpf ? `CPF: ${profCpf}` : ''}
          </div>

          <div style="width:120px;height:120px;background:white;border:1px solid #e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:40px;overflow:hidden;">
            ${logoUrl
              ? `<img src="${logoUrl}" style="width:100%;height:100%;object-fit:contain;" crossorigin="anonymous" />`
              : `<span style="font-size:10px;font-weight:900;text-align:center;padding:10px;">SEU LOGO AQUI</span>`
            }
          </div>

          <div style="text-align:right;margin:40px 0 60px 0;font-size:13px;">
            ${location}, ${fullDateStr}
          </div>

          <div style="text-align:center;font-size:18px;font-weight:900;letter-spacing:2px;margin-bottom:50px;color:#00214d;">
            RECIBO
          </div>

          <div style="font-size:14px;line-height:1.8;text-align:justify;margin-bottom:30px;color:#334155;">
            Serviço de atendimento psicológico prestados ao(à) <b style="color:#00214d;">${patientName}</b>.
            As sessões foram realizadas no dia <b style="color:#00214d;">${dateStr}</b>.
            <br/><br/>
            Valor total dos atendimentos prestados na data citada acima: <b style="color:#00214d;">${amount}</b>.
            <br/><br/>
            Psicóloga(o) responsável pelos atendimentos prestados: <b style="color:#00214d;">${profName}</b>${profCrp ? `, CRP: <b style="color:#00214d;">${profCrp}</b>` : ''}.
          </div>

          <div style="margin-top:100px;text-align:center;">
            <div style="border-top:1.5px solid #00214d;width:350px;margin:0 auto;padding-top:10px;">
              <b style="text-transform:uppercase;font-size:13px;">${profName}</b><br/>
              <span style="font-size:11px;">Psicóloga(o)${profCrp ? ` - ${profCrp}` : ''}</span>
            </div>
          </div>

          <div style="position:absolute;bottom:40px;left:0;right:0;text-align:center;font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
            ${profileData.address || ''} | ${profileData.phone || ''}
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const fileName = `Recibo_${patientName.replace(/\s+/g, '_')}_${dateStr.replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);
      pushToast('success', 'Recibo baixado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      pushToast('error', 'Erro ao gerar recibo.');
    } finally {
      document.body.removeChild(container);
    }

  };


  const getRangeLabel = () => {
    if (view === 'month') return currentDate.toLocaleString(locale, { month: 'long', year: 'numeric' });
    if (view === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      return `${start.toLocaleDateString(locale, { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };

  const toLocalISO = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const openNewModal = (date?: Date) => {
    const initialDate = date || new Date();
    setSelectedApt(null);
    setPatientComandas([]);
    setFormData({
        type: 'consulta',
        modality: 'presencial',
        appointment_date: toLocalISO(initialDate),
        duration_minutes: 50,
        title: '',
        service_id: '',
        patient_id: '',
        psychologist_id: '',
        notes: '',
        status: 'scheduled',
        meeting_url: '',
        recurrence_enabled: false,
        reschedule_reason: '',
        comanda_id: ''
    });
    setIsModalOpen(true);
  };

   const openDetailModal = (apt: Appointment) => {
    setSelectedApt(apt);
    setFormData(prev => ({ ...prev, id: apt.id }));
    setIsDetailModalOpen(true);
  };

  const openEditModal = (apt: Appointment) => {
    setSelectedApt(apt);
    setFormData({
        ...apt,
        appointment_date: toLocalISO(apt.start),
        _originalDate: toLocalISO(apt.start),
        psychologist_id: apt.professional_id || apt.psychologist_id,
        reschedule_reason: apt.reschedule_reason || '',
        comanda_id: apt.comanda_id || ''
    });
    setIsDetailModalOpen(false);
    setIsModalOpen(true);
  };

  // ── Executa o save real (opcionalmente em múltiplos agendamentos) ──
  const executeSaveAppointment = async (payload: any, extraIds: (string | number)[] = []) => {
    setIsSaving(true);
    try {
      let response: any;
      if (payload.id) {
        response = await api.put<Appointment>(`/appointments/${payload.id}`, payload);

        // Se o usuário selecionou repetição ao editar um agendamento existente,
        // criamos a série a partir desta data (o backend pula a data atual por anti-duplicata)
        if (payload.recurrence_freq && payload.recurrence_freq !== 'CUSTOM') {
          try {
            const { id: _id, ...postPayload } = payload;
            await api.post('/appointments', postPayload);
          } catch (seriesErr: any) {
            // Se só não criou por duplicata (todos já existem), ignora silenciosamente
            if (!seriesErr?.message?.includes('Nenhum agendamento foi criado')) {
              console.warn('Aviso ao criar série:', seriesErr?.message);
            }
          }
        }
      } else {
        response = await api.post<Appointment>('/appointments', payload);
      }

      // Aplica as mesmas alterações (exceto data) nos demais agendamentos selecionados
      for (const extraId of extraIds) {
        if (String(extraId) === String(payload.id)) continue;
        const sibling = appointments.find(a => String(a.id) === String(extraId));
        const siblingPayload = {
          ...payload,
          id: extraId,
          // mantém a data original de cada sessão — só propaga outros campos
          start_time: null,
          appointment_date: sibling ? new Date(sibling.start).toISOString().slice(0, 16) : payload.appointment_date,
        };
        await api.put(`/appointments/${extraId}`, siblingPayload).catch(() => {});
      }

      const savedAppointment = response;

      if (formData.type === 'consulta' && formData.modality === 'online' && !formData.meeting_url) {
        try {
          const localToUtc2 = (str: string) => str ? new Date(str).toISOString() : null;
          const roomCode = Math.random().toString(36).substr(2, 9);
          const patient = patients.find(p => String(p.id) === String(formData.patient_id));
          const titleText = `Sessão: ${patient?.full_name || 'Paciente'} - ${new Date(formData.appointment_date).toLocaleDateString()}`;
          const roomData = { title: titleText, code: roomCode, patient_id: formData.patient_id, professional_id: formData.psychologist_id || formData.professional_id, appointment_id: savedAppointment.id, scheduled_start: localToUtc2(formData.appointment_date), provider: 'interno' };
          const room = await api.post<any>('/virtual-rooms', roomData);
          const meetingUrl = `${window.location.origin}/sala/${room.code || roomCode}`;
          await api.put(`/appointments/${savedAppointment.id}`, { ...payload, meeting_url: meetingUrl });
        } catch (roomError) { console.error('Erro ao criar sala virtual:', roomError); }
      }

      fetchData();
      closeAppointmentModal();
      pushToast('success', extraIds.length > 0 ? `${extraIds.length + 1} agendamentos atualizados!` : 'Agenda atualizada com sucesso.');
    } catch (e: any) {
      if (e?.message?.includes('não encontrado') || e?.message?.includes('not found') || e?.message?.includes('404')) {
        pushToast('error', 'Agendamento não encontrado. A lista será atualizada.');
        fetchData();
        closeAppointmentModal();
      } else if (e?.conflict) {
        const fmt = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const who = e.prof_name || 'O profissional';
        const hStart = e.start_time ? fmt(e.start_time) : '?';
        const hEnd = e.end_time ? fmt(e.end_time) : '?';
        pushToast('error', `${who} já possui um agendamento das ${hStart} às ${hEnd} neste período.`);
      } else {
        pushToast('error', e?.message || 'Erro ao salvar agendamento.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;

    if ((formData.status === 'no-show' || formData.status === 'cancelled') && !formData.notes?.trim()) {
      pushToast('error', formData.status === 'no-show'
        ? 'Informe o motivo da falta no campo Observações.'
        : 'Informe o motivo do cancelamento no campo Observações.');
      return;
    }

    // Aviso: comanda de pacote sem repetição selecionada (apenas ao CRIAR, não ao editar)
    if (!formData.id && formData.comanda_id && !formData.recurrence_freq && !formData.recurrence_explicitly_none) {
      const selectedComanda = patientComandas.find((c: any) => String(c.id) === String(formData.comanda_id));
      const isPackageComanda = selectedComanda && (selectedComanda.package_id || Number(selectedComanda.sessions_total) > 1);
      if (isPackageComanda) {
        pushToast('error', `Comanda de pacote (${selectedComanda.sessions_total} sessões). Configure a repetição ou clique em "Não Repete" para criar só esta sessão.`);
        return;
      }
    }

    const isPackage = String(formData.service_id).startsWith('pkg_');
    const cleanServiceId = isPackage ? formData.service_id.replace('pkg_', '') : formData.service_id;
    const dateChanged = !formData._originalDate || formData.appointment_date !== formData._originalDate;
    const localToUtc = (str: string) => str ? new Date(str).toISOString() : null;

    // Sempre calcular end_time a partir do start + duração para garantir que
    // mudanças de duração (sem mudar o horário) também persistam corretamente
    const startUTC  = localToUtc(formData.appointment_date);
    const endUTC    = startUTC && formData.duration_minutes
      ? new Date(new Date(startUTC).getTime() + Number(formData.duration_minutes) * 60000).toISOString()
      : null;

    const payload = {
        ...formData,
        start_time: dateChanged ? startUTC : null,
        end_time:   endUTC,   // sempre envia end_time correto (duração pode ter mudado sem mudar o horário)
        professional_id: formData.psychologist_id || formData.professional_id,
        service_id: isPackage ? null : cleanServiceId,
        package_id: isPackage ? cleanServiceId : null
    };

    // Se é edição com comanda, verifica se há sessões irmãs
    if (formData.id && formData.comanda_id) {
      const siblings = appointments.filter(a =>
        String(a.comanda_id) === String(formData.comanda_id) &&
        String(a.id) !== String(formData.id)
      );
      if (siblings.length > 0) {
        // Pré-seleciona apenas o atual
        setSelectedScopeIds(new Set([String(formData.id)]));
        setScopeRelatedApts(siblings);
        setPendingSavePayload(payload);
        setIsScopeModalOpen(true);
        return;
      }
    }

    await executeSaveAppointment(payload);
  };

  const handleSelectComanda = (c: any) => {
    let targetServiceId = formData.service_id;
    let targetDuration = formData.duration_minutes;

    // Tenta encontrar serviço pelo nome ou ID
    const srvId = c.service_id || c.items?.[0]?.serviceId || c.items?.[0]?.service_id;
    const srv = services.find(s =>
        (srvId && String(s.id) === String(srvId)) ||
        (c.description?.toLowerCase().includes(s.name?.toLowerCase()))
    );

    if (srv) {
        targetServiceId = String(srv.id);
        targetDuration = srv.duration;
    } else {
        // Tenta encontrar pacote
        const pkgId = c.package_id || c.packageId;
        const pkg = packages.find(p =>
            (pkgId && String(p.id) === String(pkgId)) ||
            (c.description?.toLowerCase().includes(p.name?.toLowerCase()))
        );
        if (pkg) {
            targetServiceId = `pkg_${pkg.id}`;
            const firstItem = pkg.items?.[0];
            if (firstItem) {
                const srvObj = services.find(s => String(s.id) === String(firstItem.serviceId || firstItem.service_id));
                if (srvObj) targetDuration = srvObj.duration;
            }
        }
    }

    setFormData((prev: any) => ({
        ...prev,
        comanda_id: c.id,
        service_id: targetServiceId,
        duration_minutes: targetDuration,
        recurrence_explicitly_none: false
    }));
  };

  // Fecha o modal de agendamento e limpa o modal de comanda para não ficar sujo
  const closeAppointmentModal = () => {
    setIsModalOpen(false);
    setIsNewComandaModalOpen(false);
    setEditingComanda(null);
  };

  const openNewComandaModal = () => {
    if (!selectedApt && !formData.patient_id) return;

    const patientId = selectedApt?.patient_id || formData.patient_id;
    const patientFromList = patients.find(p => String(p.id) === String(patientId));
    const patientName = selectedApt?.patient_name || formData.patient_name_text || patientFromList?.full_name || (patientFromList as any)?.name || '';
    const professionalId = selectedApt?.psychologist_id || formData.psychologist_id || profileData?.id || '';

    const comandaDate = selectedApt?.start
      ? new Date(selectedApt.start).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const val = formData.service_id;
    let description = '';
    let totalValue = 0;
    let sessionsTotal = 1;
    let packageId = '';
    let items: EditableItem[] = [];
    let pkgDiscountType: 'fixed' | 'percentage' = 'fixed';
    let pkgDiscountValue = 0;

    if (val) {
      const isPkg = val.startsWith('pkg_');
      const id = isPkg ? val.replace('pkg_', '') : val;

      if (isPkg) {
        const pkg = packages.find((p) => String(p.id) === id);
        if (pkg) {
          description = pkg.name;
          packageId = String(pkg.id);
          items = resolvePackageItems(pkg);
          totalValue = calculateItemsTotal(items);
          sessionsTotal = pkg.items?.length || 1;
          pkgDiscountType = pkg.discountType || 'fixed';
          pkgDiscountValue = Number(pkg.discountValue || 0);
        }
      } else {
        const srv = services.find((s) => String(s.id) === id);
        if (srv) {
          description = srv.name;
          totalValue = Number(srv.price || 0);
        }
      }
    }

    setIsNewComandaModalOpen(true);
    setModalTab(packageId ? 'pacote' : 'avulsa');
    setEditingComanda({
      status: 'open',
      items,
      totalValue,
      paidValue: 0,
      description,
      patientId: String(patientId || ''),
      patientSearch: patientName,
      professionalId: String(professionalId),
      startDate: comandaDate,
      sessions_total: sessionsTotal,
      discount_type: pkgDiscountType,
      discount_value: pkgDiscountValue,
      packageId,
      patientLocked: false,
    });
  };

  const handleCreateComanda = async () => {
    if (!editingComanda || !editingComanda.patientId) {
      pushToast('error', 'Selecione um paciente primeiro.');
      return;
    }

    try {
      const payload = {
        patient_id: editingComanda.patientId,
        professional_id: editingComanda.professionalId,
        description: editingComanda.description || (modalTab === 'pacote' ? 'Pacote' : 'Sessão'),
        status: 'open',
        total_value: modalNetTotal,
        start_date: editingComanda.startDate,
        sessions_total: Number(editingComanda.sessions_total || 1),
        discount_type: editingComanda.discount_type,
        discount_value: editingComanda.discount_value,
        package_id: editingComanda.packageId || null,
        skip_appointment: true, // agendamentos são criados separadamente pela Agenda
        items: modalTab === 'pacote' && editingComanda.items?.length
          ? editingComanda.items.map(item => ({
              name: item.name,
              service_id: item.serviceId,
              qty: item.qty,
              price: item.price
            }))
          : [{
              name: editingComanda.description || 'Sessão',
              price: editingComanda.totalValue || 0,
              qty: 1
            }],
        notes: 'Criado via Agenda'
      };

      const result = await api.post<any>('/finance/comandas', payload);
      setPatientComandas((prev) => [result, ...prev]);
      setFormData((prev) => ({ ...prev, comanda_id: result.id }));
      setIsNewComandaModalOpen(false);
      pushToast('success', 'Comanda criada e vinculada!');
    } catch (err) {
      console.error(err);
      pushToast('error', 'Erro ao criar comanda.');
    }
  };



  return (
    <div className="mx-auto max-w-[1600px] px-6 pt-6 pb-24 space-y-6 animate-fadeIn font-sans">
      <PageHeader
        icon={<CalendarIcon />}
        title={t('agenda.title')}
        subtitle={t('agenda.subtitle')}
        containerClassName="mb-0"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setExportMenuOpen((o: boolean) => !o)}
                className="bg-white hover:bg-slate-50 text-slate-600 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-all active:scale-95 shadow-sm uppercase tracking-tighter"
              >
                <Download size={14} className="text-emerald-500" /> Exportar <ChevronDown size={12} />
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg" onMouseLeave={() => setExportMenuOpen(false)}>
                  <button onClick={() => { setExportMenuOpen(false); handleExportCSV(); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <FileText size={14} className="text-emerald-500" /> Exportar CSV
                  </button>
                  <button onClick={() => { setExportMenuOpen(false); handleExport(); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <FileText size={14} className="text-green-600" /> Exportar Excel
                  </button>
                  <button onClick={() => { setExportMenuOpen(false); handleExportPDF(); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <FileText size={14} className="text-red-500" /> Exportar PDF
                  </button>
                </div>
              )}
            </div>
            {hasPermission('create_appointment') && (
              <button
                onClick={() => openNewModal()}
                className="bg-gradient-to-r from-indigo-600 to-primary-600 hover:from-indigo-700 hover:to-primary-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-100 transition-all active:scale-95 uppercase tracking-tighter"
              >
                <Plus size={14} /> Novo Agendamento
              </button>
            )}
          </div>
        }
      />

      {/* STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-indigo-50/30 p-5 rounded-[2rem] border border-indigo-100 shadow-sm flex items-center gap-4 group hover:bg-white hover:border-indigo-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center border border-indigo-500 shadow-lg shadow-indigo-200 group-hover:scale-110 transition-all">
                  <CalendarRange size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sessões hoje</p>
                  <p className="text-xl font-black text-slate-800">{stats.todayCount}</p>
              </div>
          </div>
          <div className="bg-emerald-50/30 p-5 rounded-[2rem] border border-emerald-100 shadow-sm flex items-center gap-4 group hover:bg-white hover:border-emerald-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center border border-emerald-400 shadow-lg shadow-emerald-100 group-hover:scale-110 transition-all">
                  <UserCheck size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-500">Confirmados</p>
                  <p className="text-xl font-black text-slate-800">{stats.confirmedCount}</p>
              </div>
          </div>
          <div className="bg-amber-50/30 p-5 rounded-[2rem] border border-amber-100 shadow-sm flex items-center gap-4 group hover:bg-white hover:border-amber-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center border border-amber-400 shadow-lg shadow-amber-100 group-hover:scale-110 transition-all">
                  <Video size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-amber-500">Online hoje</p>
                  <p className="text-xl font-black text-slate-800">{stats.onlineCount}</p>
              </div>
          </div>
      </div>

      {/* FILTERS & NAVIGATION BAR */}
      <div className="bg-gradient-to-r from-white to-indigo-50/40 px-4 py-3 rounded-[2.5rem] border border-indigo-100/50 shadow-sm flex flex-wrap gap-2 items-center justify-between">

          {/* Navegação + label de data */}
          <div className="flex items-center gap-2 min-w-0">
              <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner border border-slate-200 shrink-0">
                  <button onClick={() => handleNavigate(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-indigo-600"><ChevronLeft size={18}/></button>
                  <button onClick={() => setCurrentDate(new Date())} className="px-3 text-[10px] font-black text-slate-700 uppercase tracking-widest underline decoration-indigo-300 underline-offset-4">Hoje</button>
                  <button onClick={() => handleNavigate(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-indigo-600"><ChevronRight size={18}/></button>
              </div>
              <h2 className="text-sm font-black text-slate-700 truncate hidden sm:block max-w-[200px] lg:max-w-[260px]">{getRangeLabel()}</h2>
              <DatePicker
                value={currentDate.toISOString().slice(0, 10)}
                onChange={(val) => val && handleDateChange(val)}
              />
          </div>

          {/* Controles: view switcher + filtros */}
          <div className="flex flex-wrap items-center gap-2">
              {/* View switcher */}
              <div className="flex bg-slate-100 p-1 rounded-2xl shrink-0">
                  <button onClick={() => setView('day')} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Dia</button>
                  <button onClick={() => setView('week')} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Semana</button>
                  <button onClick={() => setView('month')} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Mês</button>
              </div>

              {/* Filtros */}
              <select className="bg-white border border-slate-200 rounded-2xl px-3 py-1.5 text-[10px] font-black text-slate-600 uppercase tracking-wider outline-none focus:border-indigo-400 min-w-[90px] max-w-[130px]" value={filterStatus || ''} onChange={e => setFilterStatus(e.target.value || null)}>
                  <option value="">Status</option>
                  {Object.entries(statusMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select className="bg-white border border-slate-200 rounded-2xl px-3 py-1.5 text-[10px] font-black text-slate-600 uppercase tracking-wider outline-none focus:border-indigo-400 min-w-[100px] max-w-[150px]" value={filterProfessionalId || ''} onChange={e => setFilterProfessionalId(e.target.value || null)}>
                  <option value="">Profissional</option>
                  {professionals.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
          </div>
      </div>

      {/* CALENDAR CONTENT */}
      <div className="bg-white rounded-[2.5rem] border border-indigo-100/60 shadow-xl shadow-indigo-500/5 overflow-hidden animate-fadeIn relative">
        {isLoading ? (
            <div className="flex flex-col h-full animate-pulse">
                {/* Header Skeleton */}
                <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/30">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="py-4 flex justify-center">
                            <div className="h-2 w-12 bg-slate-200 rounded-full"></div>
                        </div>
                    ))}
                </div>
                {/* Body Skeleton */}
                <div className="grid grid-cols-7 flex-1 min-h-[600px]">
                    {Array.from({ length: 35 }).map((_, i) => (
                        <div key={i} className="p-4 border-b border-r border-slate-50 flex flex-col gap-3">
                            <div className="h-5 w-5 bg-slate-200 rounded-lg"></div>
                            <div className="space-y-2">
                                <div className="h-3 w-full bg-slate-100 rounded-md"></div>
                                <div className="h-3 w-4/5 bg-slate-100 rounded-md opacity-60"></div>
                            </div>
                        </div>
                    ))}
                </div>
                {/* Loading Overlay Spinner (Optional for extra "premium" feel) */}
                <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center z-50">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <Sparkles className="absolute -top-2 -right-2 text-amber-400 animate-pulse" size={16}/>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Sincronizando Agenda</p>
                    </div>
                </div>
            </div>
        ) : view === 'month' ? (
            <div className="flex flex-col h-full bg-slate-50/50 rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-2xl shadow-indigo-100/20">
                <div className="grid grid-cols-7 border-b border-slate-100 bg-indigo-50/30 backdrop-blur-md sticky top-0 z-20">
                    {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((day, idx) => {
                        const isWknd = idx === 0 || idx === 6;
                        return (
                            <div key={day} className={`py-4 text-center text-[9px] font-black tracking-[0.2em] uppercase ${isWknd ? 'text-slate-400 bg-slate-100/60' : 'text-indigo-400'}`}>{day}</div>
                        );
                    })}
                </div>
                <div className="grid grid-cols-7 flex-1">
                    {monthDays.map((day, idx) => {
                        const dayApts = getAppointmentsForDay(day);
                        const isToday = isSameDay(day, new Date());
                        const inMonth = day.getMonth() === currentDate.getMonth();
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                        return (
                            <div
                                key={day.toISOString()}
                                className={`min-h-[140px] p-2 border-b border-r border-slate-200/70 transition-all group relative
                                    ${!inMonth ? 'bg-slate-100/60 opacity-50' : isWeekend ? 'bg-slate-100/80' : 'bg-white'}
                                    hover:bg-indigo-50/20 cursor-alias
                                `}
                                onClick={() => inMonth && openNewModal(day)}
                            >
                                <div className="flex justify-between items-start mb-3 px-1 sticky top-14">
                                    <span className={`text-[12px] font-black transition-all ${isToday ? 'h-7 w-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-indigo-400 ring-2 ring-indigo-50' : inMonth ? 'text-slate-800' : 'text-slate-300'}`}>
                                        {day.getDate()}
                                    </span>
                                    {dayApts.length > 0 && (
                                        <div className="flex gap-0.5">
                                            {Array.from(new Set(dayApts.map(a => a.type)) as Set<AppointmentType>).map(type => (
                                                <div key={type} className={`w-1 h-1 rounded-full ${typeMeta[type].dot}`}></div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1.5 relative">
                                    {dayApts.slice(0, 4).map(apt => (
                                        <button
                                            key={apt.id}
                                            onClick={(e) => { e.stopPropagation(); openDetailModal(apt); }}
                                            className={`w-full text-left px-2 py-1 rounded-xl border text-[8px] font-bold truncate transition-all hover:scale-[1.02] active:scale-95 shadow-sm overflow-hidden flex items-center gap-1.5 group/item ${typeMeta[apt.type].event}`}
                                        >
                                            <div className={`w-0.5 h-3 rounded-full ${typeMeta[apt.type].solid}`}></div>
                                            <span className="truncate flex-1">{apt.patient_name || apt.title}</span>

                                            {/* Package / Recurrence Indicator */}
                                            {apt.comanda_id && (
                                                <div className="flex items-center gap-0.5 bg-indigo-50/50 px-1 rounded text-[7px] text-indigo-500 font-black shrink-0 border border-indigo-100/50">
                                                    <Package size={8} />
                                                    {apt.recurrence_index ? `${apt.recurrence_index}/${apt.recurrence_count}` : 'PK'}
                                                </div>
                                            )}

                                            {apt.modality === 'online' && <Video size={9} className="text-indigo-400 shrink-0"/>}
                                        </button>
                                    ))}
                                    {dayApts.length > 4 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setCurrentDate(day); setView('day'); }}
                                            className="w-full py-1 text-[8px] font-black text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/50 rounded-lg transition-colors border border-indigo-100/50 uppercase tracking-widest text-center"
                                        >
                                            + {dayApts.length - 4} mais
                                        </button>
                                    )}
                                </div>
                                {hasPermission('create_appointment') && (
                                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 text-indigo-600 bg-white shadow-xl border border-indigo-50 p-1.5 rounded-lg z-10 shrink-0">
                                        <Plus size={12} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        ) : (
            <AgendaPlanner
                view={view as 'day' | 'week'}
                onViewChange={(v) => setView(v as any)}
                currentDate={currentDate}
                onCurrentDateChange={setCurrentDate}
                events={filteredAppointments.map(a => {
                    // Tenta encontrar serviço ou pacote
                    let serviceName = '';
                    if (a.package_id) {
                        serviceName = packages.find(p => String(p.id) === String(a.package_id))?.name || 'Pacote';
                    } else if (a.service_id) {
                        serviceName = services.find(s => String(s.id) === String(a.service_id))?.name || '';
                    }

                    const now = new Date();
                    const startTime = new Date(a.start);
                    let status = (a.status as any) || 'scheduled';
                    
                    // Auto-confirmação visual se passou do horário
                    if (status === 'scheduled' && startTime < now) {
                        status = 'confirmed';
                    }

                    // Contador dinâmico baseado na comanda se não tiver recorrência fixa
                    let finalRecurrenceIndex = a.recurrence_index;
                    let finalRecurrenceCount = a.recurrence_count;
                    if (!finalRecurrenceIndex && a.comanda_id) {
                        const comandaApts = appointments.filter(x => String(x.comanda_id || '') === String(a.comanda_id))
                            .sort((x, y) => new Date(x.start).getTime() - new Date(y.start).getTime());
                        const idx = comandaApts.findIndex(x => String(x.id) === String(a.id));
                        if (idx !== -1) {
                            finalRecurrenceIndex = idx + 1;
                            finalRecurrenceCount = comandaApts.length;
                        }
                    }

                    return {
                        id: String(a.id),
                        title: a.patient_name || a.title || 'Paciente',
                        subtitle: a.duration_minutes ? `${a.duration_minutes} min` : undefined,
                        description: a.notes,
                        start: a.start,
                        end: a.end,
                        type: (a.type as any) || 'consulta',
                        status: status,
                        modality: a.modality as 'presencial' | 'online',
                        recurrenceIndex: finalRecurrenceIndex,
                        recurrenceCount: finalRecurrenceCount,
                        serviceName,
                        comandaId: a.comanda_id,
                        color: a.type === 'bloqueio' ? '#64748b' : undefined,
                    };
                })}
                onEventClick={(event) => {
                    const apt = appointments.find(a => String(a.id) === String(event.id));
                    if (apt) openDetailModal(apt);
                }}
                onSlotClick={hasPermission('create_appointment') ? (date) => openNewModal(date) : undefined}
                showTasksPanel={false}
                hideHeader
                hideStats
                hourHeight={125}
                startHour={startHour}
                endHour={endHour}
                skippedHours={skippedHours}
                workSchedule={workSchedule}
                closedDates={profileClosedDates}
            />
        )}
      </div>

      {/* APPOINTMENT MODAL */}
      <Modal
          isOpen={isModalOpen}
          onClose={closeAppointmentModal}
          title={formData.id ? 'Editar Sessão' : 'Novo Agendamento'}
          subtitle={new Date(formData.appointment_date).toLocaleDateString(locale, { dateStyle: 'full' })}
          maxWidth="max-w-4xl"
          footer={
            <div className="flex flex-col sm:flex-row w-full justify-between items-center gap-4">
              {formData.id ? (
                <Button
                  variant="danger"
                  onClick={() => {
                    if (formData.id || selectedApt?.id) {
                      setSelectedDeleteIds([formData.id || (selectedApt?.id as any)]);
                    }
                    setIsDeleteModalOpen(true);
                  }}
                  className="h-10 w-full sm:w-10 p-0 rounded-lg shadow-sm flex items-center justify-center"
                >
                  <Trash2 size={18}/>
                  <span className="sm:hidden ml-2 text-xs font-semibold">Excluir Agendamento</span>
                </Button>
              ) : <div className="hidden sm:block" />}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button variant="ghost" onClick={closeAppointmentModal} className="text-xs font-semibold h-10 px-6 rounded-lg">
                  Descartar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  isLoading={isSaving}
                  loadingText="Salvando..."
                  className="px-6 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm text-xs font-semibold transition-all transform active:scale-95 w-full sm:w-auto"
                >
                  <CheckCircle2 size={16} className="mr-2" />
                  {formData.id ? 'Atualizar' : 'Confirmar'} Agendamento
                </Button>
              </div>
            </div>
          }
      >
          <div className="space-y-8 py-2">
              {/* TYPE SELECTOR */}
              <div className="bg-slate-50 p-1.5 rounded-xl flex flex-col sm:flex-row border border-slate-200/50 shadow-sm gap-1">
                   {[
                       { id: 'consulta', label: 'Consulta', icon: <Briefcase size={14}/>, color: 'text-indigo-600 bg-white shadow-sm border-indigo-100' },
                       { id: 'pessoal', label: 'Evento Pessoal', icon: <UserIcon size={14}/>, color: 'text-amber-500 bg-white shadow-sm border-amber-100' },
                       { id: 'bloqueio', label: 'Bloqueio Agenda', icon: <Ban size={14}/>, color: 'text-slate-900 bg-white shadow-sm border-slate-300' }
                   ].map(t => (
                       <button
                         key={t.id}
                         type="button"
                         onClick={() => setFormData({...formData, type: t.id})}
                         className={`flex-1 py-1.5 px-4 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 border border-transparent ${formData.type === t.id ? t.color : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/30'}`}
                       >
                           {t.icon}
                           {t.label}
                       </button>
                   ))}
               </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* LEFT COLUMN: IDENTIFICATION */}
                  <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Identificação</h4>
                      </div>

                      {formData.type === 'consulta' ? (
                        <>
                          <div className="space-y-2">
                              {/* PAZIENTE COMBOBOX */}
                              <Combobox
                                label="Paciente"
                                options={patients.map(p => ({ id: p.id, label: p.full_name || (p as any).name || '' }))}
                                value={formData.patient_id || ''}
                                icon={<UserIcon size={18} className="text-indigo-400" />}
                                placeholder="Pesquisar ou adicionar paciente..."
                                allowCustom={true}
                                onChange={(val) => setFormData({...formData, patient_id: val})}
                              />
                          </div>

                          {/* COMANDA LINKAGE SECTION */}
                          {formData.patient_id && !isNaN(parseInt(formData.patient_id)) && (
                            <div className="animate-fadeIn">
                                {formData.comanda_id ? (
                                    <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg shadow-sm border border-indigo-200 text-indigo-500">
                                                <DollarSign size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Comanda Vinculada</p>
                                                <p className="text-xs font-bold text-slate-700">
                                                    {patientComandas.find(c => c.id === formData.comanda_id)?.description || 'Carregando...'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({...formData, comanda_id: ''})}
                                            className="text-[10px] font-bold text-indigo-400 hover:text-rose-500 uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100 mr-2"
                                        >
                                            Remover Comanda
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {patientComandas.length > 0 ? (
                                            <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200/50">
                                                <div className="flex items-center gap-2 mb-3 text-orange-600">
                                                    <Info size={14} />
                                                    <p className="text-[10px] font-bold uppercase tracking-wider">Comanda aberta disponível. Vincule abaixo:</p>
                                                </div>
                                                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {patientComandas.map(c => (
                                                        <button
                                                            key={c.id}
                                                            type="button"
                                                            onClick={() => handleSelectComanda(c)}
                                                            className="w-full flex items-center justify-between p-2.5 bg-white hover:bg-orange-50 border border-slate-100 hover:border-orange-200 rounded-lg transition-all group shadow-sm"
                                                        >
                                                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide group-hover:text-orange-600 transition-colors">{c.description}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-medium text-slate-400">{c.sessions_used}/{c.sessions_total} sessões</span>
                                                                <ChevronRight size={14} className="text-orange-400 group-hover:translate-x-0.5 transition-transform" />
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={openNewComandaModal}
                                                    className="w-full mt-3 py-2 border border-orange-200 rounded-lg text-[10px] font-bold text-orange-600 hover:bg-orange-100/50 transition-all uppercase tracking-widest"
                                                >
                                                    CRIAR NOVA COMANDA
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={openNewComandaModal}
                                                    className="px-3 py-1.5 border border-orange-200 rounded-lg text-[10px] font-bold text-orange-600 hover:bg-orange-50 transition-all uppercase tracking-wider shadow-sm"
                                                >
                                                    NOVA COMANDA
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                          )}

                          <div className="space-y-2 pt-2">
                               <Select
                                 label="Serviço ou Pacote"
                                 icon={<Package size={18} className="text-emerald-400" />}
                                 value={formData.service_id || ''}
                                 onChange={e => {
                                   const val = e.target.value;
                                   const isPkg = val.startsWith('pkg_');
                                   const id = isPkg ? val.replace('pkg_', '') : val;

                                   let duration = formData.duration_minutes;
                                   if (isPkg) {
                                       const pkg = packages.find(p => String(p.id) === id);
                                       const firstItem = pkg?.items?.[0];
                                       if (firstItem) {
                                           const srvObj = services.find(s => String(s.id) === String(isPkg ? firstItem.serviceId : id));
                                           if (srvObj) duration = srvObj.duration;
                                       }
                                   } else {
                                       const srv = services.find(s => String(s.id) === id);
                                       if (srv) duration = srv.duration;
                                   }

                                   setFormData({...formData, service_id: val, duration_minutes: duration});
                                 }}
                               >
                                   <option value="">Selecionar...</option>
                                   <optgroup label="Serviços Individuais">
                                     {services.map(s => <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.price)}</option>)}
                                   </optgroup>
                                   <optgroup label="Pacotes">
                                     {packages.map(p => <option key={`pkg_${p.id}`} value={`pkg_${p.id}`}>{p.name} - {formatCurrency(p.totalPrice)} ({p.items?.length || 0} itens)</option>)}
                                   </optgroup>
                               </Select>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2">
                            <Input
                              label="Título do Evento / Motivo do Bloqueio"
                              placeholder="Ex: Supervisão Clínica ou Almoço"
                              icon={<Activity size={18} className="text-amber-400" />}
                              value={formData.title || ''}
                              onChange={e => setFormData({...formData, title: e.target.value})}
                            />
                        </div>
                      )}

                      {formData.type === 'consulta' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Modalidade</label>
                                <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200/60">
                                    <button
                                      type="button"
                                      onClick={() => setFormData({...formData, modality: 'presencial'})}
                                      className={`flex-1 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all ${formData.modality === 'presencial' ? 'bg-white shadow-sm text-indigo-600 border border-indigo-100' : 'text-slate-400 border border-transparent'}`}
                                    >
                                      Presencial
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setFormData({...formData, modality: 'online'})}
                                      className={`flex-1 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all ${formData.modality === 'online' ? 'bg-white shadow-sm text-indigo-600 border border-indigo-100' : 'text-slate-400 border border-transparent'}`}
                                    >
                                      Online
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Select
                                  label="Status"
                                  value={formData.status}
                                  onChange={e => setFormData({...formData, status: e.target.value})}
                                >
                                    {Object.entries(statusMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </Select>
                                {formData.status === 'no-show' && (
                                  <p className="text-[10px] font-bold text-amber-600 ml-1 flex items-center gap-1">
                                    <AlertCircle size={10} /> Preencha as Observações abaixo — campo obrigatório para "Faltou"
                                  </p>
                                )}
                                {formData.status === 'cancelled' && (
                                  <p className="text-[10px] font-bold text-rose-500 ml-1 flex items-center gap-1">
                                    <AlertCircle size={10} /> Sessão cancelada será contabilizada na comanda
                                  </p>
                                )}
                            </div>
                        </div>
                       )}
                  </div>

                  {/* RIGHT COLUMN: TIME & RECURRENCE */}
                  <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Horário e Repetição</h4>
                      </div>

                      {formData.id ? (
                        /* ── MODO EDIÇÃO: data/hora readonly — só muda via botão dedicado ── */
                        <div className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg text-indigo-500 border border-slate-100 shadow-sm shrink-0">
                              <Clock size={16}/>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Data e Horário</p>
                              <p className="text-sm font-black text-slate-800 tabular-nums">
                                {new Date(formData.appointment_date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                {' · '}
                                {formData.appointment_date.slice(11, 16)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTempDateTime({
                                date: formData.appointment_date.slice(0, 10),
                                time: formData.appointment_date.slice(11, 16)
                              });
                              setIsRescheduleModalOpen(true);
                            }}
                            className="shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm"
                          >
                            Alterar
                          </button>
                        </div>
                      ) : (
                        /* ── MODO CRIAÇÃO: campos editáveis normalmente ── */
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Data</label>
                            <DatePicker
                              value={formData.appointment_date.slice(0, 10)}
                              onChange={val => val && setFormData({...formData, appointment_date: `${val}T${formData.appointment_date.slice(11, 16)}`})}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Hora</label>
                            <div className="relative group">
                              <Clock size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
                              <input
                                type="time"
                                value={formData.appointment_date.slice(11, 16)}
                                onChange={e => setFormData({...formData, appointment_date: `${formData.appointment_date.slice(0, 10)}T${e.target.value}`})}
                                className="h-10 w-full rounded-xl border border-slate-300 pl-8 pr-2 text-xs font-black text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
                              />
                            </div>
                          </div>
                          <Input
                            label="Duração (min)"
                            type="number"
                            icon={<Layers size={16} className="text-slate-400" />}
                            value={formData.duration_minutes}
                            onChange={e => setFormData({...formData, duration_minutes: Number(e.target.value)})}
                          />
                        </div>
                      )}

                      {/* END TIME PREVIEW */}
                      <div className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 shadow-sm transition-all hover:bg-slate-100/50">
                          <div className="flex items-center gap-3">
                              <div className="p-2 bg-white rounded-lg text-indigo-500 border border-slate-100 shadow-sm shrink-0">
                                  <Clock size={16}/>
                              </div>
                              <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Término Previsto</p>
                                  <p className="text-sm font-black text-indigo-700 tabular-nums">
                                      {(() => {
                                          try {
                                              const start = new Date(formData.appointment_date);
                                              const end = new Date(start.getTime() + formData.duration_minutes * 60000);
                                              return end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 'h';
                                          } catch { return '--:--'; }
                                      })()}
                                  </p>
                              </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                                try {
                                    const start = new Date(formData.appointment_date);
                                    const end = new Date(start.getTime() + formData.duration_minutes * 60000);
                                    setTempEndTime(end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                                    setIsEndTimeModalOpen(true);
                                } catch { setTempEndTime(''); }
                            }}
                            className="shrink-0 px-3 py-1.5 bg-white hover:bg-slate-50 text-indigo-600 border border-indigo-200 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xs"
                          >
                            Alterar
                          </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                          <Combobox
                            label="Profissional Responsável"
                            options={professionals.map(p => ({ id: p.id, label: p.name }))}
                            value={formData.psychologist_id || formData.professional_id || ''}
                            icon={<UserCheck size={18} className="text-indigo-400" />}
                            placeholder="Buscar..."
                            allowCustom={true}
                            onChange={(val) => setFormData({...formData, psychologist_id: val, professional_id: val})}
                          />
                      </div>

                      {(() => {
                          const selComanda = formData.comanda_id ? patientComandas.find((c: any) => String(c.id) === String(formData.comanda_id)) : null;
                          const needsRecurrence = !formData.id && selComanda && (selComanda.package_id || Number(selComanda.sessions_total) > 1) && !formData.recurrence_rule && !formData.recurrence_explicitly_none;
                          return (
                          <div className={`p-4 rounded-xl border space-y-3 transition-colors ${needsRecurrence ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200/60'}`}>
                              <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                      <div className={`p-1.5 bg-white rounded-lg shadow-sm border text-indigo-500 ${needsRecurrence ? 'border-amber-300' : 'border-slate-200'}`}>
                                          <Repeat size={14} />
                                      </div>
                                      <div>
                                          <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider leading-none mb-1">Repetição Fixa</p>
                                          <p className="text-[10px] font-medium text-slate-400">Marque sessões recorrentes</p>
                                      </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setIsRecurrenceModalOpen(true)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-white border rounded-lg font-bold uppercase text-[10px] hover:bg-slate-100 transition-all shadow-sm group/btn ${needsRecurrence ? 'border-amber-400 text-amber-700' : 'border-slate-200 text-indigo-600'}`}
                                  >
                                    {formData.recurrence_rule ? (
                                        <>
                                            {recurrenceOptions.find(o => o.freq === formData.recurrence_freq && o.interval === formData.recurrence_interval)?.label || 'Personalizado'}
                                            <div className="w-1 h-3 bg-indigo-200 rounded-full mx-1"></div>
                                            {formData.recurrence_count ? `${formData.recurrence_count}x` : formData.recurrence_end_date ? 'Até data' : ''}
                                        </>
                                    ) : 'Não Repete'}
                                    <ChevronRight size={10} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                  </button>
                              </div>
                              {needsRecurrence && (
                                  <div className="flex items-start gap-2 pt-1 border-t border-amber-200">
                                      <AlertCircle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                                      <div className="flex-1">
                                          <p className="text-[11px] font-bold text-amber-700 leading-snug">Repetição necessária</p>
                                          <p className="text-[10px] text-amber-600 leading-relaxed mt-0.5">
                                              Esta comanda é de pacote ({selComanda.sessions_total} sessões). Configure a repetição ou confirme "Não Repete" para criar só esta sessão.
                                          </p>
                                      </div>
                                  </div>
                              )}
                          </div>
                          );
                      })()}
                  </div>
              </div>

              {formData.type === 'consulta' && formData.modality === 'online' && (
                  <div className="bg-slate-900 p-5 rounded-3xl text-white animate-slideIn flex items-center gap-5 shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-white/10 shadow-inner">
                          <Video size={24}/>
                      </div>
                      <div className="flex-1">
                          <label className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-1.5 block">Link da Sala Virtual</label>
                          <input
                            placeholder="Link do Google Meet, Zoom ou Internal Room..."
                            value={formData.meeting_url || ''}
                            onChange={e => setFormData({...formData, meeting_url: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white placeholder:text-slate-500 outline-none focus:bg-white/10 focus:border-indigo-500 transition-all"
                          />
                      </div>
                  </div>
              )}

              {(() => {
                const isAbsence = formData.status === 'no-show';
                const isCancelled = formData.status === 'cancelled';
                const needsReason = isAbsence || isCancelled;
                const notesEmpty = !formData.notes?.trim();
                const notesLabel = isAbsence
                  ? 'Motivo da Falta'
                  : isCancelled
                  ? 'Motivo do Cancelamento'
                  : 'Observações e Histórico';
                const notesColor = needsReason ? 'bg-rose-500' : 'bg-slate-400';
                const borderClass = needsReason && notesEmpty
                  ? '!border-rose-400 focus:!border-rose-600'
                  : 'border-slate-200';
                return (
                  <div className="space-y-3">
                      <div className="flex items-center gap-2 ml-1">
                          <div className={`w-1.5 h-4 ${notesColor} rounded-full`}></div>
                          <h4 className={`text-xs font-bold uppercase tracking-wider ${needsReason ? 'text-rose-600' : 'text-slate-800'}`}>
                            {notesLabel}{needsReason && <span className="text-rose-500 ml-1">*</span>}
                          </h4>
                      </div>
                      <TextArea
                        placeholder={isAbsence
                          ? 'Descreva o motivo da falta...'
                          : isCancelled
                          ? 'Descreva o motivo do cancelamento...'
                          : 'Adicione detalhes sobre o atendimento, queixas iniciais ou avisos importantes...'}
                        value={formData.notes || ''}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                        className={`min-h-[100px] !rounded-xl shadow-sm ${borderClass}`}
                      />
                      {needsReason && notesEmpty && (
                        <p className="text-[10px] font-bold text-rose-500 ml-1 flex items-center gap-1">
                          <AlertCircle size={10} /> Campo obrigatório para registrar {isAbsence ? 'falta' : 'cancelamento'}
                        </p>
                      )}
                  </div>
                );
              })()}

              {formData.id && formData.status !== 'no-show' && formData.status !== 'cancelled' && (
                <div className="bg-amber-50/30 p-5 rounded-3xl border border-dashed border-amber-200/50 flex flex-col gap-3">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">Motivo da Alteração / Reagendamento</p>
                    <TextArea
                        placeholder="Por que este atendimento foi alterado? (Opcional)"
                        value={formData.reschedule_reason || ''}
                        onChange={e => setFormData({...formData, reschedule_reason: e.target.value})}
                        className="!bg-transparent !border-none !p-0 min-h-[60px] text-amber-700 placeholder:text-amber-300"
                    />
                </div>
              )}
          </div>
      </Modal>

      {/* DELETE CONFIRM */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
           <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full text-center shadow-2xl border border-white/20 transform animate-bounceIn overflow-hidden flex flex-col max-h-[90vh]">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-100 shadow-lg shadow-rose-500/10 shrink-0">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight shrink-0">Remover Atendimento?</h3>
              
              {selectedApt?.comanda_id && appointments.filter(a => a.comanda_id === selectedApt.comanda_id).length > 1 ? (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <p className="text-[12px] font-bold text-slate-400 mb-4 leading-relaxed shrink-0">
                    Este agendamento está vinculado a uma comanda com outros atendimentos.
                    Selecione quais deseja remover:
                  </p>
                  
                  <div className="flex-1 overflow-y-auto px-1 py-1 space-y-2 mb-6 custom-scrollbar">
                    {appointments
                      .filter(a => a.comanda_id === selectedApt.comanda_id)
                      .sort((a,b) => a.start.getTime() - b.start.getTime())
                      .map(apt => (
                      <label key={apt.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-all">
                        <input
                          type="checkbox"
                          checked={selectedDeleteIds.includes(apt.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedDeleteIds([...selectedDeleteIds, apt.id]);
                            else setSelectedDeleteIds(selectedDeleteIds.filter(id => id !== apt.id));
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                        />
                        <div className="flex-1 text-left">
                          <p className="text-[11px] font-black text-slate-700 uppercase">{apt.patient_name || apt.title}</p>
                          <p className="text-[9px] font-bold text-slate-400">
                             {apt.start.toLocaleDateString()} às {apt.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {apt.id === selectedApt.id && (
                          <span className="text-[8px] font-black bg-slate-100 px-1.5 py-0.5 rounded text-slate-400 uppercase">Atual</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[12px] font-bold text-slate-400 mb-8 leading-relaxed">
                  Deseja remover este compromisso permanentemente? Esta ação não pode ser desfeita.
                </p>
              )}

              <div className="flex flex-col gap-3 shrink-0">
                 <button 
                   disabled={selectedApt?.comanda_id && appointments.filter(a => a.comanda_id === selectedApt.comanda_id).length > 1 && selectedDeleteIds.length === 0}
                   className="w-full py-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2"
                   onClick={async () => {
                    const idsToDel = (selectedApt?.comanda_id && appointments.filter(a => a.comanda_id === selectedApt.comanda_id).length > 1) 
                      ? selectedDeleteIds 
                      : [formData.id || selectedApt?.id];
                    
                    if (idsToDel.length === 0) {
                        const singleId = formData.id || selectedApt?.id;
                        if (!singleId) return;
                        idsToDel.push(singleId);
                    }

                    try {
                        const results = await Promise.allSettled(idsToDel.map(id => api.delete(`/appointments/${id}`)));
                        const failures = results.filter(r => r.status === 'rejected' && !(r.reason?.message?.includes('não encontrado') || r.reason?.message?.includes('not found')));
                        if (failures.length > 0) {
                            pushToast('error', 'Erro ao remover agendamento(s).');
                        } else {
                            pushToast('success', idsToDel.length > 1 ? `${idsToDel.length} agendamentos removidos.` : 'Agendamento removido.');
                        }
                        fetchData();
                        closeAppointmentModal();
                        setIsDeleteModalOpen(false);
                        setIsDetailModalOpen(false);
                        setSelectedDeleteIds([]);
                    } catch (err) {
                        console.error(err);
                        pushToast('error', 'Erro ao remover agendamento(s).');
                        fetchData();
                    }
                 }}>
                    {selectedDeleteIds.length > 1 ? `Excluir ${selectedDeleteIds.length} Atendimentos` : 'Confirmar Exclusão'}
                 </button>
                 <button onClick={() => { setIsDeleteModalOpen(false); setSelectedDeleteIds([]); }} className="w-full py-4 text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] transition-colors">
                    Cancelar
                 </button>
              </div>
           </div>
        </div>
      )}
      {/* RECURRENCE SELECTION MODAL */}
      <Modal
        isOpen={isRecurrenceModalOpen}
        onClose={() => setIsRecurrenceModalOpen(false)}
        title="Seleção Atual"
        subtitle="Escolha uma opção abaixo para mudar a seleção"
        maxWidth="md"
      >
        <div className="space-y-1">
            <div className="flex items-center gap-3 p-4 mb-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <div className="p-2 bg-white rounded-lg text-indigo-500 shadow-sm border border-indigo-200">
                    <Repeat size={18} />
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Opção Atual</p>
                    <p className="font-bold text-indigo-900">
                        {formData.recurrence_rule ? (
                            recurrenceOptions.find(o => o.freq === formData.recurrence_freq && o.interval === formData.recurrence_interval)?.label || 'Personalizado'
                        ) : 'Não Repete'}
                    </p>
                </div>
            </div>

            <p className="text-[10px] font-bold text-indigo-500 mb-4 px-2 italic leading-relaxed">
               Dica: Escolha repetição semanal caso queira que sempre caia no mesmo dia da semana
            </p>

            <div className="max-h-[350px] overflow-y-auto pr-2 space-y-1 custom-scrollbar">
                {recurrenceOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                          if (opt.freq === 'CUSTOM') {
                              setTempRecurrence({
                                  freq: 'WEEKLY',
                                  interval: 1,
                                  endType: 'count',
                                  endValue: 4
                              });
                              setIsRecurrenceModalOpen(false);
                              setIsRecurrenceConfigOpen(true);
                          } else if (opt.freq) {
                              setFormData({
                                  ...formData,
                                  recurrence_rule: 'custom',
                                  recurrence_freq: opt.freq,
                                  recurrence_interval: opt.interval,
                                  recurrence_count: (opt as any).count || 1,
                                  recurrence_end_date: ''
                              });
                              setIsRecurrenceModalOpen(false);
                          } else {
                              setFormData({
                                  ...formData,
                                  recurrence_rule: null,
                                  recurrence_freq: '',
                                  recurrence_interval: 1,
                                  recurrence_count: '',
                                  recurrence_end_date: '',
                                  recurrence_explicitly_none: true
                              });
                              setIsRecurrenceModalOpen(false);
                          }
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
                    >
                        <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{opt.label}</span>
                        <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-all" />
                    </button>
                ))}
            </div>
        </div>
      </Modal>

      {/* RESCHEDULE MODAL — Altera data/hora apenas deste agendamento */}
      <Modal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        title="Alterar Data e Horário"
        subtitle="Apenas este agendamento será alterado"
        maxWidth="max-w-sm"
        footer={(
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" onClick={() => setIsRescheduleModalOpen(false)} className="text-xs font-semibold h-10 px-6">Cancelar</Button>
            <Button
              variant="primary"
              className="!bg-indigo-600 hover:!bg-indigo-700 !text-white h-10 px-8 text-xs font-semibold rounded-lg"
              onClick={() => {
                const newDate = `${tempDateTime.date}T${tempDateTime.time}`;
                setFormData(prev => ({ ...prev, appointment_date: newDate }));
                setIsRescheduleModalOpen(false);
              }}
            >
              Confirmar
            </Button>
          </div>
        )}
      >
        <div className="space-y-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Data</label>
            <DatePicker
              value={tempDateTime.date}
              onChange={val => val && setTempDateTime(prev => ({ ...prev, date: val }))}
            />
          </div>
          <Input
            label="Horário"
            type="time"
            icon={<Clock size={16} className="text-slate-400" />}
            value={tempDateTime.time}
            onChange={e => setTempDateTime(prev => ({ ...prev, time: e.target.value }))}
          />
          {tempDateTime.date && tempDateTime.time && (
            <div className="flex items-center gap-2 bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-sm font-black text-indigo-700">
              <Clock size={14} />
              {new Date(`${tempDateTime.date}T${tempDateTime.time}`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              {' às '}
              {tempDateTime.time}
            </div>
          )}
        </div>
      </Modal>

      {/* END TIME MODAL — Altera a duração via horário de término */}
      <Modal
        isOpen={isEndTimeModalOpen}
        onClose={() => setIsEndTimeModalOpen(false)}
        title="Alterar Término"
        subtitle="O sistema calculará a nova duração automaticamente"
        maxWidth="max-w-sm"
        footer={(
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" onClick={() => setIsEndTimeModalOpen(false)} className="text-xs font-semibold h-10 px-6">Cancelar</Button>
            <Button
              variant="primary"
              className="!bg-indigo-600 hover:!bg-indigo-700 !text-white h-10 px-8 text-xs font-semibold rounded-lg"
              onClick={() => {
                try {
                    const start = new Date(formData.appointment_date);
                    const [h, m] = tempEndTime.split(':').map(Number);
                    const end = new Date(start);
                    end.setHours(h, m, 0, 0);
                    
                    // Se o término for antes do início, assume que é no dia seguinte? 
                    // Mas geralmente para consultas é no mesmo dia.
                    let diffMs = end.getTime() - start.getTime();
                    if (diffMs < 0) {
                        // Se o término for menor que o início, tratamos como erro ou dia seguinte?
                        // Melhor avisar ou apenas limitar a 15min.
                        diffMs = 15 * 60000;
                    }
                    const newDuration = Math.round(diffMs / 60000);
                    setFormData(prev => ({ ...prev, duration_minutes: newDuration }));
                    setIsEndTimeModalOpen(false);
                } catch (e) { console.error(e); }
              }}
            >
              Confirmar
            </Button>
          </div>
        )}
      >
        <div className="space-y-4 py-2">
          <Input
            label="Horário de Término"
            type="time"
            icon={<Clock size={16} className="text-slate-400" />}
            value={tempEndTime}
            onChange={e => setTempEndTime(e.target.value)}
          />
          <p className="text-[10px] text-slate-400 font-medium px-1">
             Selecione o horário exato em que a sessão deve terminar. A duração total será ajustada.
          </p>
        </div>
      </Modal>

      {/* RECURRENCE CONFIG MODAL */}
      <Modal
        isOpen={isRecurrenceConfigOpen}
        onClose={() => setIsRecurrenceConfigOpen(false)}
        title="Configurar Repetição"
        subtitle="Defina como este agendamento irá se repetir"
        maxWidth="max-w-md"
        footer={(
            <div className="flex justify-end gap-2 w-full sm:w-auto">
                <Button variant="ghost" onClick={() => { setIsRecurrenceConfigOpen(false); setIsRecurrenceModalOpen(true); }} className="text-xs font-semibold h-10 px-6">VOLTAR</Button>
                <Button
                    variant="primary"
                    className="!bg-indigo-600 hover:!bg-indigo-700 !text-white h-10 px-8 text-xs font-semibold rounded-lg"
                    onClick={() => {
                        setFormData({
                            ...formData,
                            recurrence_rule: 'custom',
                            recurrence_freq: tempRecurrence.freq,
                            recurrence_interval: tempRecurrence.interval,
                            recurrence_count: tempRecurrence.endType === 'count' ? tempRecurrence.endValue : '',
                            recurrence_end_date: tempRecurrence.endType === 'until' ? tempRecurrence.endValue : ''
                        });
                        setIsRecurrenceConfigOpen(false);
                    }}
                >
                    SALVAR
                </Button>
            </div>
        )}
      >
          <div className="space-y-6 py-4">
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-4">
                <Select
                  label="Frequência de repetição"
                  value={tempRecurrence.freq}
                  onChange={e => setTempRecurrence({...tempRecurrence, freq: e.target.value})}
                  className="bg-white"
                >
                    <option value="DAILY">Diariamente</option>
                    <option value="WEEKLY">Semanalmente</option>
                    <option value="MONTHLY">Mensalmente</option>
                    <option value="YEARLY">Anualmente</option>
                </Select>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">A cada</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                      value={tempRecurrence.interval || ''}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setTempRecurrence({...tempRecurrence, interval: val ? parseInt(val) : 1});
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 w-full">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unidade</label>
                      <div className="flex items-center h-10 px-4 bg-slate-100/50 border border-slate-200/40 rounded-xl text-xs font-bold text-slate-400 uppercase tracking-tight">
                          {tempRecurrence.freq === 'DAILY' ? 'Dia(s)' : tempRecurrence.freq === 'WEEKLY' ? 'Semana(s)' : tempRecurrence.freq === 'MONTHLY' ? 'Mês(es)' : 'Ano(s)'}
                      </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 px-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Repeat size={12} /> Terminar em
                  </label>
                  <div className="flex gap-4">
                      <button
                          type="button"
                          onClick={() => setTempRecurrence({...tempRecurrence, endType: 'count'})}
                          className={`flex-1 group py-4 px-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${tempRecurrence.endType === 'count' ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-500/10' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                      >
                          <span className={`text-[10px] font-black uppercase tracking-widest ${tempRecurrence.endType === 'count' ? 'text-indigo-600' : 'text-slate-400'}`}>Por vezes</span>
                          <div className={`flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm transition-all ${tempRecurrence.endType === 'count' ? 'border-indigo-200' : 'border-slate-100 group-hover:border-slate-200'}`}>
                            <input
                                type="text"
                                inputMode="numeric"
                                className="w-8 bg-transparent text-center font-black text-slate-700 outline-none text-sm"
                                value={tempRecurrence.endType === 'count' ? (tempRecurrence.endValue || '') : ''}
                                onChange={e => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setTempRecurrence({
                                    ...tempRecurrence, 
                                    endValue: val ? parseInt(val) : '' as any, 
                                    endType: 'count'
                                  });
                                }}
                                disabled={tempRecurrence.endType !== 'count'}
                            />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">vezes</span>
                          </div>
                      </button>

                      <button
                          type="button"
                          onClick={() => setTempRecurrence({...tempRecurrence, endType: 'until'})}
                          className={`flex-1 group py-4 px-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${tempRecurrence.endType === 'until' ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-500/10' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                      >
                          <span className={`text-[10px] font-black uppercase tracking-widest ${tempRecurrence.endType === 'until' ? 'text-indigo-600' : 'text-slate-400'}`}>Por Data</span>
                          <div className={`flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border shadow-sm transition-all ${tempRecurrence.endType === 'until' ? 'border-indigo-200' : 'border-slate-100 group-hover:border-slate-200'}`}>
                            <CalendarIcon size={12} className={tempRecurrence.endType === 'until' ? 'text-indigo-500' : 'text-slate-300'} />
                            <DatePicker 
                              value={tempRecurrence.endType === 'until' ? String(tempRecurrence.endValue) : ''}
                              onChange={(val) => val && setTempRecurrence({...tempRecurrence, endValue: val, endType: 'until'})}
                              disabled={tempRecurrence.endType !== 'until'}
                              className="bg-transparent text-[11px] font-black outline-none text-slate-700 uppercase"
                            />
                          </div>
                      </button>
                  </div>
              </div>
          </div>
      </Modal>


      <Modal
        isOpen={isNewComandaModalOpen}
        onClose={() => setIsNewComandaModalOpen(false)}
        title={editingComanda?.id ? 'Editando Comanda' : 'Criando Comanda'}
        maxWidth="max-w-3xl"
        footer={
          <div className="flex w-full items-center justify-between">
            <Button
              onClick={() => setIsNewComandaModalOpen(false)}
              variant="outline"
              size="sm"
            >
              FECHAR
            </Button>

            <Button
              onClick={handleCreateComanda}
              variant="primary"
              isLoading={isLoading}
              loadingText={editingComanda?.id ? 'SALVANDO...' : 'CRIANDO...'}
            >
              CRIAR COMANDA
            </Button>
          </div>
        }
      >
        {editingComanda && (
          <div className="space-y-5 py-1">
            <div className="flex flex-wrap items-center gap-6">
              <div className="text-sm text-slate-600">Tipo:</div>

              <TypeButton
                active={modalTab === 'avulsa'}
                label="Comanda Normal"
                onClick={() => {
                  setModalTab('avulsa');
                  setEditingComanda({
                    ...editingComanda,
                    packageId: '',
                    items: editingComanda.items || [],
                    sessions_total: Number(editingComanda.sessions_total || 1),
                  });
                }}
              />

              <TypeButton
                active={modalTab === 'pacote'}
                label="Comanda Pacote"
                onClick={() => {
                  setModalTab('pacote');
                  setEditingComanda({
                    ...editingComanda,
                    sessions_total:
                      Number(editingComanda.sessions_total || 0) > 1
                        ? Number(editingComanda.sessions_total || 0)
                        : 4,
                    items:
                      editingComanda.items && editingComanda.items.length > 0
                        ? editingComanda.items
                        : [{ name: '', serviceId: '', qty: 1, price: 0 }],
                  });
                }}
              />
            </div>

            {modalTab === 'avulsa' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Descrição"
                  value={editingComanda.description || ''}
                  onChange={(e) =>
                    setEditingComanda({
                      ...editingComanda,
                      description: e.target.value,
                    })
                  }
                  placeholder="Ex: Sessão de Psicologia, Avaliação, etc"
                  containerClassName="md:col-span-2"
                />

                <Combobox
                  label="Cliente"
                  options={patients.filter((p: any) => p.status === 'ativo' || p.status === 'active').map((p: any) => ({ id: p.id, label: p.full_name || p.name }))}
                  value={editingComanda.patientId || ''}
                  onChange={(id, label) => {
                    setEditingComanda({
                      ...editingComanda,
                      patientId: String(id),
                      patientSearch: label || '',
                    });
                  }}
                  placeholder="Selecione um cliente..."
                  disabled={!!editingComanda.patientLocked}
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest ml-1">Data</label>
                  <DatePicker
                    value={editingComanda.startDate || ''}
                    onChange={(val) =>
                      setEditingComanda({
                        ...editingComanda,
                        startDate: val,
                      })
                    }
                  />
                </div>

                <Input
                  label="Valor Total"
                  type="text"
                  value={formatCurrencyInput(Number(editingComanda.totalValue || 0))}
                  onChange={(e) =>
                    setEditingComanda({
                      ...editingComanda,
                      totalValue: parseMonetaryValue(e.target.value),
                    })
                  }
                  prefix="R$"
                />

                <Input
                  label="Número de Atendimentos"
                  type="number"
                  min={1}
                  value={editingComanda.sessions_total || 1}
                  onChange={(e) =>
                    setEditingComanda({
                      ...editingComanda,
                      sessions_total: Math.max(1, Number(e.target.value || 1)),
                    })
                  }
                />

                <Select
                  label="Profissional"
                  value={editingComanda.professionalId || ''}
                  onChange={(e) =>
                    setEditingComanda({
                      ...editingComanda,
                      professionalId: e.target.value,
                    })
                  }
                >
                  <option value="">Selecione um profissional</option>
                  {professionals.map((p: any) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.full_name || p.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <div className="space-y-4">
                <Select
                  label="Pacote"
                  value={editingComanda.packageId || ''}
                  onChange={(e) => handleSelectPackage(e.target.value)}
                >
                  <option value="">Selecione uma definição de pacote</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={String(pkg.id)}>
                      {pkg.name}
                    </option>
                  ))}
                </Select>

                <Combobox
                  label="Cliente"
                  options={patients.filter((p: any) => p.status === 'ativo' || p.status === 'active').map((p: any) => ({ id: p.id, label: p.full_name || p.name }))}
                  value={editingComanda.patientId || ''}
                  onChange={(id, label) => {
                    setEditingComanda({
                      ...editingComanda,
                      patientId: String(id),
                      patientSearch: label || '',
                    });
                  }}
                  placeholder="Selecione um cliente..."
                  disabled={!!editingComanda.patientLocked}
                />

                <Select
                  label="Profissional"
                  value={editingComanda.professionalId || ''}
                  onChange={(e) =>
                    setEditingComanda({
                      ...editingComanda,
                      professionalId: e.target.value,
                    })
                  }
                >
                  <option value="">Selecione um profissional</option>
                  {professionals.map((p: any) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.full_name || p.name}
                    </option>
                  ))}
                </Select>

                <div className="pt-1">
                  <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-600">
                    Itens:
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-3 text-[12px] text-slate-500">
                      <div className="col-span-6">Serviço</div>
                      <div className="col-span-2">Qtd</div>
                      <div className="col-span-3">Preço</div>
                      <div className="col-span-1" />
                    </div>

                    {(editingComanda.items || []).map((item, index) => (
                      <div key={index} className="grid grid-cols-12 items-end gap-3">
                        <div className="col-span-6">
                          <Select
                            label=""
                            value={item.serviceId || ''}
                            onChange={(e) =>
                              updatePackageItem(
                                index,
                                { serviceId: e.target.value },
                                true
                              )
                            }
                            size="sm"
                          >
                            <option value="">Selecione</option>
                            {services.map((service) => (
                              <option key={service.id} value={String(service.id)}>
                                {service.name}
                              </option>
                            ))}
                          </Select>
                        </div>

                        <div className="col-span-2">
                          <input
                            type="number"
                            min={1}
                            value={item.qty || 1}
                            onChange={(e) =>
                              updatePackageItem(index, {
                                qty: Math.max(1, Number(e.target.value || 1)),
                              })
                            }
                            className={lineInputClass}
                          />
                        </div>

                        <div className="col-span-3">
                          <input
                            type="text"
                            value={formatCurrencyInput(Number(item.price || 0))}
                            onChange={(e) =>
                              updatePackageItem(index, {
                                price: parseMonetaryValue(e.target.value),
                              })
                            }
                            className={lineInputClass}
                          />
                        </div>

                        <div className="col-span-1 flex justify-end">
                          <Button
                            variant="softDanger"
                            size="sm"
                            iconOnly
                            onClick={() => removePackageItem(index)}
                            title="Remover item"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addPackageItem}
                    className="mt-3 w-full rounded-md border border-indigo-400 py-2.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
                  >
                    ADICIONAR ITEM
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <div className="w-full max-w-[290px] space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Valor Total:</span>
                  <strong className="font-semibold text-slate-800">
                    {formatCurrency(modalGrossTotal)}
                  </strong>
                </div>

                <div className="grid grid-cols-[1fr_auto_82px] items-center gap-2">
                  <span className="text-sm text-slate-600">Desconto:</span>

                  <div className="inline-flex overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingComanda({
                          ...editingComanda,
                          discount_type: 'percentage',
                        })
                      }
                      className={`px-3 py-2 text-xs font-semibold ${
                        editingComanda.discount_type === 'percentage'
                          ? 'bg-slate-200 text-slate-800'
                          : 'text-slate-500'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingComanda({
                          ...editingComanda,
                          discount_type: 'fixed',
                        })
                      }
                      className={`px-3 py-2 text-xs font-semibold ${
                        editingComanda.discount_type === 'fixed'
                          ? 'bg-slate-200 text-slate-800'
                          : 'text-slate-500'
                      }`}
                    >
                      R$
                    </button>
                  </div>

                  <input
                    value={formatCurrencyInput(Number(editingComanda.discount_value || 0))}
                    onChange={(e) =>
                      setEditingComanda({
                        ...editingComanda,
                        discount_value: parseMonetaryValue(e.target.value),
                      })
                    }
                    className="h-9 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm text-slate-600">
                  <span>Total Líquido:</span>
                  <strong className="text-lg font-bold text-slate-800">
                    {formatCurrency(modalNetTotal)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* APPOINTMENT DETAIL MODAL */}
      {isDetailModalOpen && selectedApt && (() => {
        const apt = selectedApt;
        const patient = patients.find(p => String(p.id) === String(apt.patient_id));
        const srv = services.find(s => String(s.id) === String(apt.service_id));
        const pkg = packages.find(p => String(p.id) === String(apt.package_id));
        const cmnd = patientComandas.find(c => String(c.id) === String(apt.comanda_id));
        const currentStatus = detailQuickStatus ?? (apt.status || 'scheduled');
        const needsNotes = currentStatus === 'no-show' || currentStatus === 'cancelled' || currentStatus === 'rescheduled';
        const initials = (apt.patient_name || apt.title || 'P').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
        const statusColor: Record<string, string> = {
          scheduled: '#6366f1', confirmed: '#10b981', completed: '#059669',
          'no-show': '#f59e0b', cancelled: '#ef4444', rescheduled: '#8b5cf6',
        };
        const accentColor = statusColor[currentStatus] || '#6366f1';

        const quickStatuses = [
          { key: 'scheduled', label: 'Agendado', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', active: 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' },
          { key: 'confirmed', label: 'Confirmado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', active: 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100' },
          { key: 'completed', label: 'Realizado', color: 'bg-green-50 text-green-700 border-green-200', active: 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-100' },
          { key: 'no-show', label: 'Faltou', color: 'bg-amber-50 text-amber-700 border-amber-200', active: 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-100' },
          { key: 'rescheduled', label: 'Reagendado', color: 'bg-violet-50 text-violet-700 border-violet-200', active: 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-100' },
          { key: 'cancelled', label: 'Cancelado', color: 'bg-rose-50 text-rose-700 border-rose-200', active: 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-100' },
        ];

        const handleQuickSave = async () => {
          if (needsNotes && !detailQuickNotes.trim()) {
            pushToast('error', `Informe o motivo ${currentStatus === 'no-show' ? 'da falta' : currentStatus === 'rescheduled' ? 'do reagendamento' : 'do cancelamento'}.`);
            return;
          }
          if (currentStatus === 'rescheduled' && (!detailRescheduleDateTime.date || !detailRescheduleDateTime.time)) {
            pushToast('error', 'Informe a nova data e horário.');
            return;
          }

          try {
            if (currentStatus === 'rescheduled') {
              const newDateTime = `${detailRescheduleDateTime.date}T${detailRescheduleDateTime.time}:00`;
              const payload = {
                patient_id: apt.patient_id,
                professional_id: apt.professional_id || (apt as any).psychologist_id,
                service_id: apt.service_id,
                status: 'rescheduled',
                notes: detailQuickNotes || apt.notes,
                start_time: new Date(newDateTime).toISOString(),
                duration_minutes: apt.duration_minutes || 50,
                modality: apt.modality,
                type: apt.type,
                comanda_id: apt.comanda_id
              };
              await api.put(`/appointments/${apt.id}`, payload);
            } else {
              await api.put(`/appointments/${apt.id}/status`, { status: currentStatus, notes: detailQuickNotes || undefined });
            }
            pushToast('success', 'Atualizado com sucesso!');
            fetchData();
            setDetailQuickStatus(null);
            setDetailQuickNotes('');
            setIsDetailModalOpen(false);
          } catch { pushToast('error', 'Erro ao atualizar agendamento.'); }
        };

        return (
          <Modal isOpen={isDetailModalOpen} onClose={() => { setIsDetailModalOpen(false); setDetailQuickStatus(null); setDetailQuickNotes(''); }} title="" maxWidth="max-w-[655px]" hideCloseButton>
            <div className="pb-2 -mt-2">

              {/* ── HERO HEADER ── */}
              <div className="relative rounded-2xl overflow-hidden mb-5 px-5 pt-5 pb-4" style={{ background: `linear-gradient(135deg, ${accentColor}18 0%, ${accentColor}08 100%)`, border: `1px solid ${accentColor}25` }}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-lg shrink-0" style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-black text-slate-900 truncate">{apt.patient_name || apt.title || 'Paciente'}</h2>
                    {patient?.phone && <p className="text-xs font-semibold text-slate-500 mt-0.5">{patient.phone}</p>}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-white/70 px-2 py-0.5 rounded-full border border-white/50">
                        <Clock size={11} />
                        {apt.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {apt.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 bg-white/70 px-2 py-0.5 rounded-full border border-white/50">
                        {apt.start.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short' })}
                      </span>
                      {apt.recurrence_index && (
                        <span className="text-[11px] font-black bg-white/80 px-2 py-0.5 rounded-full border border-white/50" style={{ color: accentColor }}>
                          {apt.recurrence_index}/{apt.recurrence_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => { setIsDetailModalOpen(false); setDetailQuickStatus(null); setDetailQuickNotes(''); }} className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-white/60 text-slate-400 hover:bg-white hover:text-slate-600 transition-all border border-white/50">
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* ── INFO PILLS ── */}
              <div className="flex flex-wrap gap-2 px-1 mb-5">
                {(srv || pkg) && (
                  <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <Stethoscope size={13} className="text-indigo-500 shrink-0" />
                    <span className="text-[12px] font-semibold text-slate-700 truncate max-w-[160px]">{srv?.name || pkg?.name || 'Serviço'}</span>
                    {srv && <span className="text-[11px] font-bold text-slate-400 ml-1">{formatCurrency(srv.price)}</span>}
                  </div>
                )}
                {apt.modality && (
                  <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    {apt.modality === 'online' ? <Video size={13} className="text-indigo-500" /> : <MapPin size={13} className="text-slate-400" />}
                    <span className="text-[12px] font-semibold text-slate-600 capitalize">{apt.modality}</span>
                  </div>
                )}
                {cmnd && (
                  <button onClick={async () => {
                    try {
                      const res = await api.get<any[]>('/finance/comandas');
                      const all = Array.isArray(res) ? res : [];
                      const fresh = all.find(c => String(c.id) === String(apt.comanda_id));
                      if (fresh) {
                        setPatientComandas(prev => {
                          const filtered = prev.filter(c => String(c.id) !== String(apt.comanda_id));
                          return [...filtered, fresh];
                        });
                      }
                    } catch { /* use existing data */ }
                    setIsComandaManagerOpen(true);
                  }} className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 hover:bg-emerald-100 transition-colors">
                    <DollarSign size={13} className="text-emerald-600 shrink-0" />
                    <span className="text-[12px] font-semibold text-emerald-700">{formatCurrency(cmnd.paidValue || 0)}</span>
                    <span className="text-[10px] text-emerald-500 font-bold">pago</span>
                    {((cmnd.totalValue || cmnd.total || 0) - (cmnd.paidValue || 0)) > 0 && (
                      <><span className="text-emerald-300 mx-0.5">·</span><span className="text-[12px] font-semibold text-rose-500">{formatCurrency((cmnd.totalValue || cmnd.total || 0) - (cmnd.paidValue || 0))}</span><span className="text-[10px] text-rose-400 font-bold">dev</span></>
                    )}
                    <ChevronRight size={11} className="text-emerald-400 ml-0.5" />
                  </button>
                )}
              </div>

              {/* ── OBSERVAÇÕES ── */}
              {apt.notes && (
                <div className="mx-1 mb-4 bg-slate-50 rounded-xl border border-slate-100 px-3 py-2.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Observações</p>
                  <p className="text-[12px] text-slate-600 leading-relaxed">{apt.notes}</p>
                </div>
              )}

              {/* ── QUICK STATUS ── */}
              <div className="px-1 mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Atualizar Status</p>
                <div className="flex flex-wrap gap-2">
                  {quickStatuses.map(s => (
                    <button
                      key={s.key}
                      onClick={() => { 
                        const isActive = s.key === currentStatus && !detailQuickStatus;
                        setDetailQuickStatus(isActive ? null : s.key); 
                        setDetailQuickNotes('');
                        if (s.key === 'rescheduled' && !isActive) {
                          const aptDate = new Date(apt.start);
                          setDetailRescheduleDateTime({
                            date: aptDate.toISOString().slice(0, 10),
                            time: aptDate.toTimeString().slice(0, 5)
                          });
                        }
                      }}
                      className={cx('text-[11px] font-black px-3 py-1.5 rounded-xl border transition-all', currentStatus === s.key ? s.active : s.color)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Reschedule specific fields */}
                {detailQuickStatus === 'rescheduled' && (
                  <div className="mt-4 grid grid-cols-2 gap-3 animate-fadeIn">
                    <div>
                      <label className="text-[10px] font-black text-violet-500 uppercase tracking-widest block mb-1.5 ml-1">Nova Data</label>
                      <DatePicker
                        value={detailRescheduleDateTime.date}
                        onChange={val => setDetailRescheduleDateTime(prev => ({ ...prev, date: val }))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-violet-500 uppercase tracking-widest block mb-1.5 ml-1">Novo Horário</label>
                      <div className="relative">
                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400" />
                        <input
                          type="time"
                          value={detailRescheduleDateTime.time}
                          onChange={e => setDetailRescheduleDateTime(prev => ({ ...prev, time: e.target.value }))}
                          className="w-full rounded-xl border border-violet-200 pl-9 pr-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-500 transition-colors bg-violet-50/20"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes required when faltou/cancelado/reagendado */}
                {detailQuickStatus && needsNotes && (
                  <div className="mt-3">
                    <label className={cx('text-[10px] font-black uppercase tracking-widest mb-1.5 block', currentStatus === 'rescheduled' ? 'text-violet-500' : 'text-rose-500')}>
                      {currentStatus === 'no-show' ? 'Motivo da Falta *' : currentStatus === 'rescheduled' ? 'Observação / Motivo do Reagendamento *' : 'Motivo do Cancelamento *'}
                    </label>
                    <textarea
                      value={detailQuickNotes}
                      onChange={e => setDetailQuickNotes(e.target.value)}
                      placeholder={currentStatus === 'no-show' ? 'Descreva o motivo da falta...' : currentStatus === 'rescheduled' ? 'Ex: Paciente solicitou por motivos de trabalho...' : 'Descreva o motivo do cancelamento...'}
                      rows={2}
                      className={cx('w-full rounded-xl border px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 outline-none resize-none transition-colors',
                        currentStatus === 'rescheduled' 
                          ? (detailQuickNotes.trim() ? 'border-violet-300 focus:border-violet-500' : 'border-violet-400 focus:border-violet-600 bg-violet-50/30')
                          : (detailQuickNotes.trim() ? 'border-rose-300 focus:border-rose-500' : 'border-rose-400 focus:border-rose-600 bg-rose-50/30')
                      )}
                    />
                  </div>
                )}

                {hasPermission('confirm_appointment') && detailQuickStatus && detailQuickStatus !== (apt.status || 'scheduled') && (
                  <button
                    onClick={handleQuickSave}
                    className="mt-3 w-full py-2.5 rounded-xl text-[12px] font-black text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
                  >
                    Confirmar alteração para "{quickStatuses.find(s => s.key === detailQuickStatus)?.label}"
                  </button>
                )}
              </div>

              {/* ── ACTION BAR ── */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                {patient?.phone && (
                  <button onClick={() => window.open(`https://wa.me/${patient.phone!.replace(/\D/g, '')}`, '_blank')}
                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-all">
                    <MessageSquare size={16} className="text-emerald-600" />
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">WhatsApp</span>
                  </button>
                )}
                <button 
                   onClick={() => navigate(`/records?patient_id=${apt.patient_id}&appointment_id=${apt.id}`)}
                   className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-all"
                >
                  <Stethoscope size={16} className="text-indigo-600" />
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Prontuário</span>
                </button>
                <button onClick={handleGenerateReceipt}
                  className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all">
                  <FileText size={16} className="text-slate-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Recibo</span>
                </button>
                {apt.comanda_id && (
                  <button onClick={async () => {
                    try {
                      const res = await api.get<any[]>('/finance/comandas');
                      const all = Array.isArray(res) ? res : [];
                      const foundCmnd = all.find(c => String(c.id) === String(apt.comanda_id));

                      if (!foundCmnd) {
                        pushToast('error', 'Comanda não encontrada no sistema.');
                        return;
                      }

                      setPatientComandas(prev => {
                        const filtered = prev.filter(c => String(c.id) !== String(apt.comanda_id));
                        return [...filtered, foundCmnd];
                      });
                      setIsComandaManagerOpen(true);
                    } catch (e) {
                      pushToast('error', 'Erro ao carregar dados financeiros.');
                    }
                  }}
                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-all">
                    <DollarSign size={16} className="text-emerald-600" />
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Gestão</span>
                  </button>
                )}
                {hasPermission('edit_appointment') && apt.comanda_id && (
                  <button onClick={() => {
                    const aptDate = new Date(apt.start);
                    const dateStr = aptDate.toISOString().slice(0,10);
                    const timeStr = aptDate.toTimeString().slice(0,5);
                    setDetailRescheduleDateTime({ date: dateStr, time: timeStr });
                    const siblings = appointments.filter(a =>
                      a.comanda_id && String(a.comanda_id) === String(apt.comanda_id) && String(a.id) !== String(apt.id)
                    );
                    setDetailRescheduleScopeIds(new Set([String(apt.id)]));
                    setScopeRelatedApts(siblings);
                    setIsDetailRescheduleOpen(true);
                    setIsDetailModalOpen(false);
                  }}
                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-violet-50 border border-violet-100 hover:bg-violet-100 transition-all">
                    <Clock size={16} className="text-violet-600" />
                    <span className="text-[9px] font-black text-violet-600 uppercase tracking-widest">Editar Horário</span>
                  </button>
                )}
                {hasPermission('edit_appointment') && (
                  <button onClick={() => { if (apt) openEditModal(apt); setIsDetailModalOpen(false); }}
                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-all">
                    <Edit3 size={16} className="text-indigo-600" />
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Editar</span>
                  </button>
                )}
                {hasPermission('delete_appointment') && (
                  <button onClick={() => { if (apt) setSelectedDeleteIds([apt.id]); setIsDetailModalOpen(false); setIsDeleteModalOpen(true); }}
                    className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-all">
                    <Trash2 size={16} className="text-rose-500" />
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Deletar</span>
                  </button>
                )}
              </div>

            </div>
          </Modal>
        );
      })()}

      {/* ── SCOPE CONFIRMATION MODAL (save edits to sibling sessions) ── */}
      <Modal
        isOpen={isScopeModalOpen}
        onClose={() => { setIsScopeModalOpen(false); setPendingSavePayload(null); }}
        title="Aplicar alterações"
        maxWidth="max-w-sm"
      >
        <div className="pb-2">
          <p className="text-sm text-slate-600 mb-4">
            Este agendamento faz parte de uma série. Deseja aplicar as alterações também em outros agendamentos da série?
          </p>
          <div className="space-y-2 max-h-56 overflow-y-auto mb-4">
            {/* Current appointment always shown as checked */}
            <label className="flex items-center gap-3 p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 cursor-default">
              <input type="checkbox" checked readOnly className="accent-indigo-600 w-4 h-4" />
              <span className="text-sm font-semibold text-indigo-700">Este agendamento (atual)</span>
            </label>
            {scopeRelatedApts.map(a => {
              const id = String(a.id);
              const checked = selectedScopeIds.has(id);
              return (
                <label key={id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={checked}
                    className="accent-indigo-600 w-4 h-4"
                    onChange={() => {
                      setSelectedScopeIds(prev => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id); else next.add(id);
                        return next;
                      });
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-slate-700">
                      {new Date(a.start).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      {new Date(a.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => {
                const allIds = new Set([String(pendingSavePayload?.id), ...scopeRelatedApts.map(a => String(a.id))]);
                setSelectedScopeIds(allIds);
              }}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              Selecionar todos
            </button>
            <span className="text-slate-300">·</span>
            <button
              onClick={() => setSelectedScopeIds(new Set([String(pendingSavePayload?.id)]))}
              className="text-xs font-bold text-slate-400 hover:underline"
            >
              Somente este
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setIsScopeModalOpen(false); setPendingSavePayload(null); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!pendingSavePayload) return;
                setIsScopeModalOpen(false);
                executeSaveAppointment(pendingSavePayload, [...selectedScopeIds].filter(id => String(id) !== String(pendingSavePayload.id)));
              }}
              className="flex-1 py-2.5 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              Salvar ({selectedScopeIds.size})
            </button>
          </div>
        </div>
      </Modal>

      {/* ── DETAIL RESCHEDULE MODAL (horário button in detail modal) ── */}
      <Modal
        isOpen={isDetailRescheduleOpen}
        onClose={() => setIsDetailRescheduleOpen(false)}
        title="Alterar Horário"
        maxWidth="max-w-md"
      >
        <div className="pb-2">
          <p className="text-sm text-slate-500 mb-4">Escolha a nova data e horário para este agendamento.</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Data</label>
              <input
                type="date"
                value={detailRescheduleDateTime.date}
                onChange={e => setDetailRescheduleDateTime(prev => ({ ...prev, date: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Horário</label>
              <input
                type="time"
                value={detailRescheduleDateTime.time}
                onChange={e => setDetailRescheduleDateTime(prev => ({ ...prev, time: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          {scopeRelatedApts.length > 0 && (
            <>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Aplicar também em</p>
              <div className="space-y-2 max-h-44 overflow-y-auto mb-4">
                {scopeRelatedApts.map(a => {
                  const id = String(a.id);
                  const checked = detailRescheduleScopeIds.has(id);
                  return (
                    <label key={id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={checked}
                        className="accent-indigo-600 w-4 h-4"
                        onChange={() => {
                          setDetailRescheduleScopeIds(prev => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id); else next.add(id);
                            return next;
                          });
                        }}
                      />
                      <span className="text-sm font-semibold text-slate-700">
                        {new Date(a.start).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(a.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setDetailRescheduleScopeIds(new Set(scopeRelatedApts.map(a => String(a.id))))}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  Selecionar todos
                </button>
                <span className="text-slate-300">·</span>
                <button
                  onClick={() => setDetailRescheduleScopeIds(new Set())}
                  className="text-xs font-bold text-slate-400 hover:underline"
                >
                  Nenhum
                </button>
              </div>
            </>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setIsDetailRescheduleOpen(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                if (!selectedApt || !detailRescheduleDateTime.date || !detailRescheduleDateTime.time) return;
                const newDateTime = `${detailRescheduleDateTime.date}T${detailRescheduleDateTime.time}:00`;
                const newStartUtc = new Date(newDateTime).toISOString();
                const basePayload = {
                  patient_id: selectedApt.patient_id,
                  professional_id: selectedApt.professional_id || (selectedApt as any).psychologist_id,
                  service_id: selectedApt.service_id,
                  package_id: (selectedApt as any).package_id,
                  status: selectedApt.status,
                  notes: selectedApt.notes,
                  modality: selectedApt.modality,
                  type: selectedApt.type,
                  duration_minutes: selectedApt.duration_minutes,
                  comanda_id: selectedApt.comanda_id,
                };
                try {
                  await api.put(`/appointments/${selectedApt.id}`, { ...basePayload, start_time: newStartUtc });
                  for (const id of detailRescheduleScopeIds) {
                    const sibling = scopeRelatedApts.find(a => String(a.id) === String(id));
                    if (!sibling) continue;
                    // Preserva data original do sibling, muda apenas o horário
                    const origDate = new Date(sibling.start);
                    const [h, m] = detailRescheduleDateTime.time.split(':').map(Number);
                    origDate.setHours(h, m, 0, 0);
                    const siblingPayload = {
                      patient_id: sibling.patient_id,
                      professional_id: sibling.professional_id || (sibling as any).psychologist_id,
                      service_id: sibling.service_id,
                      package_id: (sibling as any).package_id,
                      status: sibling.status,
                      notes: sibling.notes,
                      modality: sibling.modality,
                      type: sibling.type,
                      duration_minutes: sibling.duration_minutes,
                      comanda_id: sibling.comanda_id,
                    };
                    await api.put(`/appointments/${id}`, { ...siblingPayload, start_time: origDate.toISOString() });
                  }
                  pushToast('success', 'Horário atualizado!');
                  fetchData();
                  setIsDetailRescheduleOpen(false);
                } catch { pushToast('error', 'Erro ao atualizar horário.'); }
              }}
              className="flex-1 py-2.5 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>

      {/* COMANDA MANAGER MODAL */}
      {/* COMANDA MANAGER MODAL */}
      <Modal
        isOpen={isComandaManagerOpen}
        onClose={() => setIsComandaManagerOpen(false)}
        title="Gestão de Histórico e Pagamentos"
        maxWidth="max-w-5xl"
      >
        {(() => {
          const cmnd = patientComandas.find(c => String(c.id) === String(selectedApt?.comanda_id));
          
          if (!cmnd) {
            return (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                  <DollarSign size={24} className="text-slate-300" />
                </div>
                <div>
                  <p className="text-slate-600 font-bold">Comanda não encontrada</p>
                  <p className="text-slate-400 text-xs">Este atendimento pode não estar vinculado a um registro financeiro.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setIsComandaManagerOpen(false)}>Fechar Janela</Button>
              </div>
            );
          }

          // Pega os agendamentos desta comanda diretamente do state (cmnd.appointments pode estar vazio)
          const cmndAppointments = appointments
            .filter(a => a.comanda_id && String(a.comanda_id) === String(cmnd.id))
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

          return (
            <div className="grid grid-cols-1 gap-6 py-2 lg:grid-cols-[1.6fr_0.9fr]">
              {(() => {
                const usedSessionsArr = cmndAppointments.filter((a: any) => {
                  // Slot reservado = sessão consumida: concluído, confirmado, faltou e cancelado contam
                  return a.status === 'completed' || a.status === 'confirmed'
                    || a.status === 'no_show' || a.status === 'no-show'
                    || a.status === 'cancelled';
                });
                const calculatedUsed = usedSessionsArr.length;
                const totalSessions = cmnd.sessions_total || 1;
                const progress = Math.min(100, (calculatedUsed / totalSessions) * 100);

                return (
                  <>
              <div className="space-y-5">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 font-bold text-primary-700">
                      {String(selectedApt?.patient_name || 'P').charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {selectedApt?.patient_name}
                      </p>
                      <p className="text-xs text-slate-400">#{cmnd.id}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleGenerateReceipt}
                      className={iconButtonClass}
                      title="Recibo"
                    >
                      <FileText size={16} />
                    </button>

                    <button
                      onClick={() => {
                        setIsComandaManagerOpen(false);
                        setEditingComanda({
                           ...cmnd,
                           patientId: String(cmnd.patient_id),
                           professionalId: String(cmnd.professional_id),
                           items: cmnd.items?.map((it: any) => ({ ...it, serviceId: it.service_id }))
                        });
                        setModalTab(cmnd.package_id ? 'pacote' : 'avulsa');
                        setIsNewComandaModalOpen(true);
                      }}
                      className={iconButtonClass}
                      title="Editar"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>
                </div>

                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  {(['atendimentos', 'pagamentos', 'pacote'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setManagerTab(tab)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
                        managerTab === tab
                          ? 'bg-white text-primary-600 shadow-sm'
                          : 'text-slate-500'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  {managerTab === 'atendimentos' && (
                    <div className="space-y-3">
                      {cmndAppointments.map((appointment) => {
                        const aptStart = new Date(appointment.start);
                        const statusLabels: Record<string, string> = {
                          scheduled: 'Agendado', confirmed: 'Confirmado',
                          completed: 'Realizado', cancelled: 'Cancelado',
                          'no-show': 'Faltou', no_show: 'Faltou',
                        };
                        const statusColors: Record<string, string> = {
                          scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                          confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          completed: 'bg-green-50 text-green-700 border-green-200',
                          cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
                          'no-show': 'bg-amber-50 text-amber-700 border-amber-200',
                          no_show: 'bg-amber-50 text-amber-700 border-amber-200',
                        };
                        const isEditing = editingAptId === appointment.id;

                        const handleStartEdit = () => {
                           setEditAptValues({
                             date: aptStart.toISOString().split('T')[0],
                             time: aptStart.toTimeString().slice(0, 5)
                           });
                           setEditingAptId(appointment.id);
                        };

                        const handleSaveAptEdit = async (index: number) => {
                           const newStart = new Date(`${editAptValues.date}T${editAptValues.time}:00`);
                           
                           // Validação Chronológica
                           if (index > 0) {
                              const prev = new Date(cmndAppointments[index-1].start);
                              if (newStart <= prev) {
                                pushToast('error', `Data inválida. Deve ser após ${prev.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`);
                                return;
                              }
                           }
                           if (index < cmndAppointments.length - 1) {
                              const next = new Date(cmndAppointments[index+1].start);
                              if (newStart >= next) {
                                pushToast('error', `Data inválida. O próximo é em ${next.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`);
                                return;
                              }
                           }

                           try {
                              await api.put(`/appointments/${appointment.id}`, { 
                                ...appointment, 
                                start_time: newStart.toISOString(),
                                // Garantir que ids estão corretos para o backend
                                professional_id: appointment.professional_id || (appointment as any).psychologist_id,
                                duration_minutes: appointment.duration_minutes || 50
                              });
                              pushToast('success', 'Atendimento atualizado!');
                              setEditingAptId(null);
                              fetchData();
                           } catch (e: any) {
                              pushToast('error', e.message || 'Erro ao atualizar');
                           }
                        };

                        return (
                          <div
                            key={appointment.id}
                            className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 shrink-0">
                                <CalendarDays size={16} />
                              </div>
                              
                              {isEditing ? (
                                <div className="flex items-center gap-2 flex-1 animate-fadeIn">
                                  <div className="w-[125px]">
                                    <DatePicker
                                      value={editAptValues.date}
                                      onChange={(val) => setEditAptValues(prev => ({ ...prev, date: val }))}
                                      className="!h-8 !border-slate-200 !rounded-lg text-[11px] font-black"
                                    />
                                  </div>
                                  <div className="relative group">
                                    <Clock size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
                                    <input
                                      type="time"
                                      value={editAptValues.time}
                                      onChange={e => setEditAptValues(prev => ({ ...prev, time: e.target.value }))}
                                      className="h-8 w-[95px] rounded-lg border border-slate-200 pl-8 pr-2 text-[11px] font-black text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 ml-auto">
                                    <button
                                      onClick={() => handleSaveAptEdit(cmndAppointments.indexOf(appointment))}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-100 transition-all transform active:scale-90"
                                      title="Salvar alteração"
                                    >
                                      <Check size={14} />
                                    </button>
                                    <button
                                      onClick={() => setEditingAptId(null)}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all transform active:scale-90"
                                      title="Descartar"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-sm font-bold text-slate-800">
                                    {aptStart.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {aptStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    {appointment.recurrence_index ? ` · Sessão ${appointment.recurrence_index}/${cmnd.sessions_total || appointment.recurrence_count || '?'}` : ''}
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {!isEditing && (
                                <button 
                                  onClick={handleStartEdit}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all mr-1"
                                  title="Editar data/hora"
                                >
                                  <Edit3 size={13} />
                                </button>
                              )}

                              <select
                                value={appointment.status || 'scheduled'}
                                onChange={(e) => handleUpdateAppointmentStatus(appointment.id, e.target.value)}
                                className={`text-[11px] font-bold rounded-lg border px-2 py-1 outline-none cursor-pointer ${statusColors[appointment.status || 'scheduled'] || 'bg-slate-50 text-slate-600 border-slate-200'}`}
                                style={{ height: '30px' }}
                              >
                                <option value="scheduled">Agendado</option>
                                <option value="confirmed">Confirmado</option>
                                <option value="completed">Realizado</option>
                                <option value="no_show">Faltou</option>
                                <option value="cancelled">Cancelado</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}

                      {cmndAppointments.length === 0 && (
                        <div className="py-10 text-center text-sm text-slate-400">
                          Nenhum atendimento vinculado.
                        </div>
                      )}
                    </div>
                  )}

                  {managerTab === 'pagamentos' && (
                    <div className="space-y-3">
                      {cmnd.payments?.map((payment: any) => (
                        <div
                          key={payment.id}
                          className="group flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-emerald-600">
                              <Check size={18} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">
                                {formatCurrency(Number(payment.amount || 0))}
                              </p>
                              <p className="text-xs text-slate-400">
                                {new Date(payment.payment_date).toLocaleDateString('pt-BR')} •{' '}
                                {payment.payment_method}
                                {payment.receipt_code ? ` • #${payment.receipt_code}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 group-hover:hidden">Recebido</span>
                            <div className="hidden group-hover:flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setNewPayment({
                                    id: String(payment.id),
                                    value: formatCurrencyInput(Number(payment.amount || 0)),
                                    date: payment.payment_date ? new Date(payment.payment_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                                    method: payment.payment_method || 'Pix',
                                    receiptCode: payment.receipt_code || '',
                                    comandaId: String(cmnd.id),
                                  });
                                  setIsAddPaymentModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                                title="Editar pagamento"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('Tem certeza que deseja excluir este pagamento?')) {
                                    handleDeletePayment(payment.id, cmnd.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200"
                                title="Excluir pagamento"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {(!cmnd.payments || cmnd.payments.length === 0) && (
                        <div className="py-10 text-center text-sm text-slate-400">
                          Nenhum pagamento registrado.
                        </div>
                      )}
                    </div>
                  )}

                  {managerTab === 'pacote' && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className={cx(
                        "mb-2 text-4xl font-bold",
                        calculatedUsed > totalSessions
                          ? "text-red-600"
                          : "text-primary-600"
                      )}>
                        {calculatedUsed} / {totalSessions}
                      </div>
                      <div className="mb-4 text-sm text-slate-500">
                        Atendimentos consumidos
                      </div>
                      <div className="h-3 w-full max-w-md overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-primary-600"
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl bg-primary-600 p-5 text-white shadow-lg shadow-primary-200">
                  <p className="mb-1 text-xs uppercase tracking-wider text-primary-100">
                    Valor total
                  </p>
                  <p className="mb-4 text-3xl font-bold">
                    {formatCurrency(getComandaTotal(cmnd))}
                  </p>

                  <div className="space-y-2 border-t border-primary-400 pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>Recebido</span>
                      <strong>{formatCurrency(getComandaPaid(cmnd))}</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-sm">
                      <span>Pendente</span>
                      <strong>{formatCurrency(getComandaTotal(cmnd) - getComandaPaid(cmnd))}</strong>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                       setNewPayment({
                          value: formatCurrencyInput(getComandaTotal(cmnd) - getComandaPaid(cmnd)) || '0,00',
                          date: new Date().toISOString().slice(0, 10),
                          method: 'Pix',
                          receiptCode: cmnd.receipt_code || '',
                          comandaId: String(cmnd.id)
                       });
                       setIsAddPaymentModalOpen(true);
                    }}
                    variant="primary"
                    fullWidth
                    className="mt-4 bg-white !text-primary-600 hover:bg-primary-50"
                    size="lg"
                  >
                    Novo pagamento
                  </Button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h4 className="mb-4 text-sm font-semibold text-slate-700">Itens cobrados</h4>
                  <div className="space-y-3">
                    {cmnd.items?.map((item: any, index: number) => (
                      <div key={item.id || index} className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-800">{item.name}</p>
                          <p className="text-xs text-slate-400">
                            {item.qty} × {formatCurrency(item.price)}
                          </p>
                        </div>
                        <strong className="text-sm text-slate-700">
                          {formatCurrency(Number(item.qty || 0) * Number(item.price || 0))}
                        </strong>
                      </div>
                    ))}

                    {(!cmnd.items || cmnd.items.length === 0) && (
                      <p className="text-sm text-slate-400">Nenhum item registrado.</p>
                    )}
                  </div>
                </div>
              </div>
              </>
                );
              })()}
            </div>
          );
        })()}
      </Modal>

      {/* ADD PAYMENT MODAL */}
      <Modal
        isOpen={isAddPaymentModalOpen}
        onClose={() => setIsAddPaymentModalOpen(false)}
        title={newPayment.id ? "Editar Pagamento" : "Lançar Novo Pagamento"}
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button
              onClick={() => setIsAddPaymentModalOpen(false)}
              variant="ghost"
              size="sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSavePayment}
              variant="primary"
              className="px-6"
            >
              Efetivar pagamento
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest ml-1">Valor do pagamento</label>
            <input
              value={newPayment.value}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                if (!digits) { setNewPayment(prev => ({ ...prev, value: '' })); return; }
                setNewPayment(prev => ({ ...prev, value: (parseFloat(digits) / 100).toFixed(2).replace('.', ',') }));
              }}
              placeholder="0,00"
              className={compactInputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest ml-1">Data do Pagamento</label>
              <DatePicker
                value={newPayment.date}
                onChange={(val) =>
                  val && setNewPayment((prev) => ({ ...prev, date: val }))
                }
              />
            </div>

            <Select
              label="Forma de pagamento"
              value={newPayment.method}
              onChange={(e) =>
                setNewPayment((prev) => ({ ...prev, method: e.target.value }))
              }
            >
              <option value="Dinheiro">Dinheiro</option>
              <option value="Pix">Pix</option>
              <option value="Cartão de Crédito">Cartão de Crédito</option>
              <option value="Cartão de Débito">Cartão de Débito</option>
              <option value="Transferência">Transferência</option>
            </Select>
          </div>

          <Input
            label="Código do Recibo (Opcional)"
            placeholder="Ex: REC-123"
            value={newPayment.receiptCode}
            onChange={(e) =>
              setNewPayment((prev) => ({ ...prev, receiptCode: e.target.value }))
            }
          />
        </div>
      </Modal>
    </div>
  );
};
