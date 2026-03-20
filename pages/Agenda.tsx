import React, { useState, useEffect, useMemo } from 'react';
import { api, API_BASE_URL, getStaticUrl } from '../services/api';
import { Appointment, Service, Patient, User, AppointmentType } from '../types';
import {
    ChevronLeft, ChevronRight, Clock, Plus, Video, MapPin,
    Calendar as CalendarIcon, CalendarDays, CalendarRange, X, Check, Repeat, Trash2, User as UserIcon,
    DollarSign, Package, Layers, Loader2, Briefcase, FileText, UserCheck, Ban, Link2, Search,
    Filter, LayoutGrid, List as ListIcon, ExternalLink, Sparkles, CheckCircle2, AlertCircle,
    ArrowUpRight, Info,
    Edit3, Download, Upload, FileDown, FileUp,
    Activity,
    AlignLeft, MessageSquare, Send, Stethoscope, Tag,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Modal } from '../components/UI/Modal';
import { Button } from '../components/UI/Button';
import { Input, Select, TextArea, Combobox } from '../components/UI/Input';
import { DatePicker } from '../components/UI/DatePicker';
import { AgendaPlanner } from '../components/UI/AgendaPlanner';

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
    { label: 'Semanal (Total 4 sessões)', freq: 'WEEKLY', interval: 1, count: 4 },
    { label: 'Semanal (Total 8 sessões)', freq: 'WEEKLY', interval: 1, count: 8 },
    { label: 'Semanal (Total 12 sessões)', freq: 'WEEKLY', interval: 1, count: 12 },
    { label: 'Quinzenal (Total 2 sessões)', freq: 'DAILY', interval: 15, count: 2 },
    { label: 'Quinzenal (Total 4 sessões)', freq: 'DAILY', interval: 15, count: 4 },
    { label: 'Mensal (Total 3 sessões)', freq: 'MONTHLY', interval: 1, count: 3 },
    { label: 'Mensal (Total 6 sessões)', freq: 'MONTHLY', interval: 1, count: 6 },
    { label: 'Personalizado...', freq: 'CUSTOM', interval: 1, count: 1 },
];

export const Agenda: React.FC = () => {
  const { t, language } = useLanguage();
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [filterPatientId, setFilterPatientId] = useState<string | null>(null);
  const [filterProfessionalId, setFilterProfessionalId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [applyToSeries, setApplyToSeries] = useState(false);
  const [deleteSeries, setDeleteSeries] = useState(false);
  const { pushToast } = useToast();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState(false);
  const [isRecurrenceConfigOpen, setIsRecurrenceConfigOpen] = useState(false);
  const [tempRecurrence, setTempRecurrence] = useState({
      freq: '',
      interval: 1,
      endType: 'count' as 'count' | 'until',
      endValue: 1 as number | string
  });
  const [patientComandas, setPatientComandas] = useState<any[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailQuickStatus, setDetailQuickStatus] = useState<string | null>(null);
  const [detailQuickNotes, setDetailQuickNotes] = useState('');
  const [isComandaManagerOpen, setIsComandaManagerOpen] = useState(false);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [managerTab, setManagerTab] = useState<'atendimentos' | 'pagamentos' | 'pacote'>('atendimentos');
  const [newPayment, setNewPayment] = useState({ value: '', date: new Date().toISOString().slice(0, 10), method: 'Pix', receiptCode: '' });
  const [comandaPayments, setComandaPayments] = useState<any[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [isNewComandaModalOpen, setIsNewComandaModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ComandaTab>('avulsa');
  const [editingComanda, setEditingComanda] = useState<EditableComanda | null>(null);
  const [relatedApts, setRelatedApts] = useState<Appointment[]>([]);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<(string | number)[]>([]);

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
      is_all_day: false,
      reschedule_reason: '',
      comanda_id: ''
  });


  const [profileData, setProfileData] = useState<any>({});


  const locale = language === 'pt' ? 'pt-BR' : 'en-US';
  const startHour = 6;
  const endHour = 22;
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
          chip: 'bg-slate-900 text-white border-slate-800 shadow-xl',
          solid: 'bg-slate-900',
          dot: 'bg-slate-900',
          event: 'bg-slate-900 text-white border-none shadow-xl backdrop-blur-sm ring-1 ring-white/10'
      },
  } as const;

  const statusMeta = {
      scheduled: { label: 'Agendado', chip: 'bg-slate-100/60 text-slate-500 border-slate-200/40', dot: 'bg-slate-400' },
      confirmed: { label: 'Confirmado', chip: 'bg-emerald-50/60 text-emerald-700 border-emerald-100/60', dot: 'bg-emerald-500' },
      completed: { label: 'Realizado', chip: 'bg-indigo-50/60 text-indigo-700 border-indigo-100/60', dot: 'bg-indigo-500' },
      cancelled: { label: 'Cancelado', chip: 'bg-rose-50/60 text-rose-700 border-rose-100/60', dot: 'bg-rose-500' },
      'no-show': { label: 'Faltou', chip: 'bg-amber-50/60 text-amber-700 border-amber-100/60', dot: 'bg-amber-500' },
  } as const;

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
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
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
            const start = new Date(a.start_time || a.appointment_date);
            // Clamp duration entre 5min e 480min (8h) para nunca gerar card gigante
            const dur = Math.min(Math.max(Number(a.duration_minutes) || 50, 5), 480);
            const end = new Date(start.getTime() + dur * 60000);
            // Normaliza status: banco usa no_show, frontend usa no-show
            const rawStatus = (a.status || 'scheduled').replace('no_show', 'no-show');
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
    } catch (err) {
      console.error(err);
      pushToast('error', 'Erro ao exportar agenda.');
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/appointments/export-template`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('psi_token')}` }
      });
      if (!response.ok) throw new Error('Erro ao baixar modelo');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modelo_importacao_agenda.xlsx';
      a.click();
    } catch (err) {
      console.error(err);
      pushToast('error', 'Erro ao baixar modelo.');
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
    const comandaId = selectedApt?.comanda_id || editingComanda?.id;
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
        await api.post(`/finance/payments`, {
            comanda_id: comandaId,
            amount: valueToAdd,
            payment_date: newPayment.date,
            payment_method: newPayment.method,
            receipt_code: newPayment.receiptCode || null,
        });

        pushToast('success', 'Pagamento registrado com sucesso!');
        setIsAddPaymentModalOpen(false);
        setNewPayment({ value: '', date: new Date().toISOString().slice(0, 10), method: 'Pix', receiptCode: '' });

        // Recarregar dados
        fetchData();
        if (selectedApt?.patient_id || editingComanda?.patientId) {
            const pid = selectedApt?.patient_id || editingComanda?.patientId;
            const res = await api.get(`/finance/comandas?patient_id=${pid}`);
            setPatientComandas(res as any[]);
        }
    } catch (err) {
        console.error(err);
        pushToast('error', 'Erro ao salvar pagamento');
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

  const handleDeletePayment = async (paymentId: number) => {
    const comandaId = selectedApt?.comanda_id;
    if (!comandaId) return;
    if (!window.confirm('Remover este pagamento?')) return;
    try {
      await api.delete(`/finance/comandas/${comandaId}/payments/${paymentId}`);
      pushToast('success', 'Pagamento removido.');
      await fetchComandaPayments(comandaId);
      fetchData();
      if (selectedApt?.patient_id) {
        const res = await api.get(`/finance/comandas/patient/${selectedApt.patient_id}`);
        setPatientComandas(res as any[]);
      }
    } catch (err) {
      console.error(err);
      pushToast('error', 'Erro ao remover pagamento.');
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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImport(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await api.request<any>('/appointments/import', {
        method: 'POST',
        body: formData
      });
      fetchData();
      pushToast('success', result.message || 'Dados importados com sucesso.');
      setIsImportModalOpen(false);
    } catch (err) {
      console.error(err);
      pushToast('error', 'Erro ao importar dados. Verifique o formato do arquivo.');
    } finally {
      setIsProcessingImport(false);
      e.target.value = '';
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

  const handleSave = async () => {
    if (isSaving) return;

    // Observação obrigatória quando status é "faltou" ou "cancelado"
    if ((formData.status === 'no-show' || formData.status === 'cancelled') && !formData.notes?.trim()) {
      pushToast('error', formData.status === 'no-show'
        ? 'Informe o motivo da falta no campo Observações.'
        : 'Informe o motivo do cancelamento no campo Observações.');
      return;
    }

    setIsSaving(true);
    try {
        const isPackage = String(formData.service_id).startsWith('pkg_');
        const cleanServiceId = isPackage ? formData.service_id.replace('pkg_', '') : formData.service_id;

        // Só envia start_time se o usuário realmente alterou a data/hora
        const dateChanged = !formData._originalDate || formData.appointment_date !== formData._originalDate;

        const payload = {
            ...formData,
            start_time: dateChanged ? formData.appointment_date : null,
            professional_id: formData.psychologist_id || formData.professional_id,
            service_id: isPackage ? null : cleanServiceId,
            package_id: isPackage ? cleanServiceId : null
        };

        let response;
        if (formData.id) {
            response = await api.put<Appointment>(`/appointments/${formData.id}`, payload);
        } else {
            response = await api.post<Appointment>('/appointments', payload);
        }

        const savedAppointment = response;

        // SE FOR ONLINE E NÃO TEM URL AINDA, CRIA UMA SALA VIRTUAL
        if (formData.type === 'consulta' && formData.modality === 'online' && !formData.meeting_url) {
            try {
                const roomCode = Math.random().toString(36).substr(2, 9);
                const patient = patients.find(p => String(p.id) === String(formData.patient_id));
                const titleText = `Sessão: ${patient?.full_name || 'Paciente'} - ${new Date(formData.appointment_date).toLocaleDateString()}`;

                const roomData = {
                    title: titleText,
                    code: roomCode,
                    patient_id: formData.patient_id,
                    professional_id: formData.psychologist_id || formData.professional_id,
                    appointment_id: savedAppointment.id,
                    scheduled_start: formData.appointment_date,
                    provider: 'interno'
                };

                const room = await api.post<any>('/virtual-rooms', roomData);
                const meetingUrl = `${window.location.origin}/sala/${room.code || roomCode}`;

                await api.put(`/appointments/${savedAppointment.id}`, {
                    ...payload,
                    meeting_url: meetingUrl
                });
            } catch (roomError) {
                console.error("Erro ao criar sala virtual:", roomError);
            }
        }

        // NOVO FLOW: Informa que a comanda foi gerada mas não redireciona (conforme pedido: "por debaixo dos panos")
        if (savedAppointment.comanda_id) {
            pushToast('success', 'Agendamento e Comanda gerada com sucesso!');
            fetchData();
            setIsModalOpen(false);
            return;
        }

        fetchData();
        setIsModalOpen(false);
        pushToast('success', 'Agenda atualizada com sucesso.');
    } catch (e: any) {
        pushToast('error', 'Erro ao salvar agendamento.');
    } finally {
        setIsSaving(false);
    }
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
        duration_minutes: targetDuration
    }));
  };

  const openNewComandaModal = () => {
    if (!selectedApt && !formData.patient_id) return;

    const patientId = selectedApt?.patient_id || formData.patient_id;
    const patientName = selectedApt?.patient_name || formData.patient_name_text || '';
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
      discount_type: 'fixed',
      discount_value: 0,
      packageId,
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
    <div className="space-y-6 animate-fadeIn font-sans pb-24">


      {/* HEADER HERO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100 shadow-sm"><CalendarIcon size={20}/></div>
                  {t('agenda.title')}
              </h1>
              <p className="text-slate-400 text-xs mt-1 font-bold">{t('agenda.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
              <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="bg-white hover:bg-slate-50 text-slate-600 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-all active:scale-95 shadow-sm"
              >
                  <Upload size={14} className="text-indigo-500" /> Importar
              </button>
              <button
                  onClick={handleExport}
                  className="bg-white hover:bg-slate-50 text-slate-600 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-all active:scale-95 shadow-sm"
              >
                  <Download size={14} className="text-emerald-500" /> Exportar
              </button>
              <button
                  onClick={() => openNewModal()}
                  className="bg-gradient-to-r from-indigo-600 to-primary-600 hover:from-indigo-700 hover:to-primary-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-100 transition-all active:scale-95"
              >
                  <Plus size={14} /> Novo Agendamento
              </button>
          </div>
      </div>

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
      <div className="bg-gradient-to-r from-white to-indigo-50/40 p-4 rounded-[2.5rem] border border-indigo-100/50 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-center lg:justify-start">
              <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] shadow-inner border border-slate-200">
                  <button onClick={() => handleNavigate(-1)} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-indigo-600"><ChevronLeft size={20}/></button>
                  <button onClick={() => setCurrentDate(new Date())} className="px-4 text-[10px] font-black text-slate-700 uppercase tracking-widest underline decoration-indigo-300 underline-offset-4">Hoje</button>
                  <button onClick={() => handleNavigate(1)} className="p-2.5 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-indigo-600"><ChevronRight size={20}/></button>
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-800 truncate px-2">{getRangeLabel()}</h2>
                <div className="relative group">
                  <DatePicker 
                    value={currentDate.toISOString().slice(0, 10)} 
                    onChange={(val) => val && handleDateChange(val)}
                  />
                </div>
              </div>
          </div>

          <div className="flex gap-3 w-full lg:w-auto overflow-x-auto no-scrollbar py-1">
              <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem]">
                  <button onClick={() => setView('day')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Dia</button>
                  <button onClick={() => setView('week')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Semana</button>
                  <button onClick={() => setView('month')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Mês</button>
              </div>

              <div className="flex gap-2">
                <select className="bg-white border border-slate-200 rounded-2xl px-4 py-2 text-[10px] font-black text-slate-600 uppercase tracking-wider outline-none focus:border-indigo-400 max-w-[150px]" value={filterStatus || ''} onChange={e => setFilterStatus(e.target.value || null)}>
                    <option value="">Status</option>
                    {Object.entries(statusMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select className="bg-white border border-slate-200 rounded-2xl px-4 py-2 text-[10px] font-black text-slate-600 uppercase tracking-wider outline-none focus:border-indigo-400 max-w-[150px]" value={filterProfessionalId || ''} onChange={e => setFilterProfessionalId(e.target.value || null)}>
                    <option value="">Profissional</option>
                    {professionals.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                </select>
              </div>
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
                    {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((day, idx) => (
                        <div key={day} className={`py-4 text-center text-[9px] font-black tracking-[0.2em] text-indigo-400 uppercase`}>{day}</div>
                    ))}
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
                                className={`min-h-[140px] p-2 border-b border-r border-slate-100/60 transition-all group relative
                                    ${inMonth ? 'bg-white' : 'bg-slate-50/40 opacity-40'}
                                    ${isWeekend && inMonth ? 'bg-slate-50/30' : ''}
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
                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 text-indigo-600 bg-white shadow-xl border border-indigo-50 p-1.5 rounded-lg z-10 shrink-0">
                                    <Plus size={12} />
                                </div>
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
                onSlotClick={(date) => openNewModal(date)}
                showTasksPanel={false}
                hideHeader
                hideStats
                hourHeight={125}
            />
        )}
      </div>

      {/* APPOINTMENT MODAL */}
      <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
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
                <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-xs font-semibold h-10 px-6 rounded-lg">
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
                                options={patients.map(p => ({ id: p.id, label: p.full_name }))}
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
                                                    onClick={() => setIsNewComandaModalOpen(true)}
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

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Data</label>
                          <DatePicker 
                            value={formData.appointment_date.slice(0, 10)} 
                            onChange={val => val && setFormData({...formData, appointment_date: `${val}T${formData.appointment_date.slice(11, 16)}`})}
                          />
                        </div>
                        <Input
                          label="Hora"
                          type="time"
                          icon={<Clock size={16} className="text-slate-400" />}
                          value={formData.appointment_date.slice(11, 16)}
                          onChange={e => setFormData({...formData, appointment_date: `${formData.appointment_date.slice(0, 10)}T${e.target.value}`})}
                        />
                        <Input
                          label="Duração (min)"
                          type="number"
                          icon={<Layers size={16} className="text-slate-400" />}
                          value={formData.duration_minutes}
                          onChange={e => setFormData({...formData, duration_minutes: Number(e.target.value)})}
                        />
                      </div>

                      {/* END TIME PREVIEW */}
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 shadow-sm">
                          <div className="p-2 bg-white rounded-lg text-indigo-500 border border-slate-100 shadow-sm">
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

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                  <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200 text-indigo-500">
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
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-indigo-600 uppercase text-[10px] hover:bg-slate-100 transition-all shadow-sm group/btn"
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
                      </div>
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

      {/* IMPORT MODAL */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => !isProcessingImport && setIsImportModalOpen(false)}
        title="Importar Agenda"
        subtitle="Siga o modelo para importar seus agendamentos via excel/csv"
        maxWidth="max-w-xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100 flex flex-col items-center text-center group hover:border-indigo-200 transition-all">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm mb-4 border border-indigo-50 group-hover:scale-110 transition-transform">
                <FileDown size={28} />
              </div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-2">1. Baixe o Modelo</h4>
              <p className="text-[10px] font-bold text-slate-400 mb-5 leading-relaxed">
                Baixe nossa planilha modelo para preencher com seus dados corretamente.
              </p>
              <button
                onClick={downloadTemplate}
                className="w-full py-3 bg-white hover:bg-slate-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-indigo-100 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Download size={14} /> Download Modelo
              </button>
            </div>

            <div className="bg-indigo-600 p-5 rounded-[2rem] border border-indigo-500 flex flex-col items-center text-center shadow-lg shadow-indigo-200">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-4 backdrop-blur-md">
                <Info size={28} />
              </div>
              <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2 text-shadow-sm">Dica Importante</h4>
              <p className="text-[10px] font-bold text-indigo-100 mb-5 leading-relaxed">
                Preencha os IDs de pacientes e profissionais conforme listados no seu painel.
              </p>
              <div className="w-full py-3 bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/20 backdrop-blur-md">
                Formato: .XLSX / .CSV
              </div>
            </div>
          </div>

          <div className="relative group">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleImport}
              disabled={isProcessingImport}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              id="file-upload"
            />
            <div className={`p-10 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center transition-all ${isProcessingImport ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 hover:bg-white hover:border-indigo-300 border-slate-200'}`}>
              {isProcessingImport ? (
                <>
                  <Loader2 size={32} className="text-indigo-500 animate-spin mb-4" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Importando registros...</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-primary-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-indigo-200 mb-4 group-hover:scale-110 transition-transform">
                    <FileUp size={32} />
                  </div>
                  <p className="text-xs font-black text-slate-700 uppercase tracking-widest">2. Selecione seu Arquivo</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-2">Clique aqui ou arraste seu arquivo CSV</p>

                  <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-100 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aguardando arquivo</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex justify-center border-t border-slate-50 pt-6">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-[0.2em] transition-colors flex items-center gap-2"
            >
              <X size={14}/> Cancelar e Sair
            </button>
          </div>
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
                        await Promise.all(idsToDel.map(id => api.delete(`/appointments/${id}`)));
                        pushToast('success', idsToDel.length > 1 ? `${idsToDel.length} agendamentos removidos.` : 'Agendamento removido.');
                        fetchData();
                        setIsModalOpen(false);
                        setIsDeleteModalOpen(false);
                        setIsDetailModalOpen(false);
                        setSelectedDeleteIds([]);
                    } catch (err) {
                        console.error(err);
                        pushToast('error', 'Erro ao remover agendamento(s).');
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
                                  recurrence_end_date: ''
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
          <div className="space-y-6 py-2">
              <Select
                label="Repetir frequência"
                value={tempRecurrence.freq}
                onChange={e => setTempRecurrence({...tempRecurrence, freq: e.target.value})}
              >
                  <option value="DAILY">Diariamente</option>
                  <option value="WEEKLY">Semanalmente</option>
                  <option value="MONTHLY">Mensalmente</option>
                  <option value="YEARLY">Anualmente</option>
              </Select>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="A cada"
                  type="number"
                  value={tempRecurrence.interval}
                  onChange={e => setTempRecurrence({...tempRecurrence, interval: parseInt(e.target.value) || 1})}
                />
                <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Unidade</label>
                    <div className="flex items-center h-10 px-4 bg-slate-50 border border-slate-200/60 rounded-lg text-sm font-semibold text-slate-500">
                        {tempRecurrence.freq === 'DAILY' ? 'Dia(s)' : tempRecurrence.freq === 'WEEKLY' ? 'Semana(s)' : tempRecurrence.freq === 'MONTHLY' ? 'Mês(es)' : 'Ano(s)'}
                    </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Terminar em</label>
                  <div className="flex gap-3">
                      <button
                          type="button"
                          onClick={() => setTempRecurrence({...tempRecurrence, endType: 'count'})}
                          className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${tempRecurrence.endType === 'count' ? 'border-indigo-600 bg-indigo-50/30 text-indigo-600' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                      >
                          <span className="text-[10px] font-bold uppercase">Por vezes</span>
                          <div className="flex items-center gap-2">
                            <input
                                className="w-10 bg-white border border-slate-200 rounded px-1 text-center font-bold text-slate-700 outline-none"
                                value={tempRecurrence.endType === 'count' ? tempRecurrence.endValue : ''}
                                onChange={e => setTempRecurrence({...tempRecurrence, endValue: parseInt(e.target.value) || 1, endType: 'count'})}
                                disabled={tempRecurrence.endType !== 'count'}
                            />
                            <span className="text-[10px] font-medium opacity-60">vezes</span>
                          </div>
                      </button>

                      <button
                          type="button"
                          onClick={() => setTempRecurrence({...tempRecurrence, endType: 'until'})}
                          className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${tempRecurrence.endType === 'until' ? 'border-indigo-600 bg-indigo-50/30 text-indigo-600' : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                      >
                          <span className="text-[10px] font-bold uppercase">Por Data</span>
                          <DatePicker 
                            value={tempRecurrence.endType === 'until' ? String(tempRecurrence.endValue) : ''}
                            onChange={(val) => val && setTempRecurrence({...tempRecurrence, endValue: val, endType: 'until'})}
                            disabled={tempRecurrence.endType !== 'until'}
                            className="bg-transparent text-[10px] font-bold outline-none uppercase"
                          />
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
                  options={patients.map((p: any) => ({ id: p.id, label: p.full_name || p.name }))}
                  value={editingComanda.patientId || ''}
                  onChange={(id, label) => {
                    setEditingComanda({
                      ...editingComanda,
                      patientId: String(id),
                      patientSearch: label || '',
                    });
                  }}
                  placeholder="Selecione um cliente..."
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
                  options={patients.map((p: any) => ({ id: p.id, label: p.full_name || p.name }))}
                  value={editingComanda.patientId || ''}
                  onChange={(id, label) => {
                    setEditingComanda({
                      ...editingComanda,
                      patientId: String(id),
                      patientSearch: label || '',
                    });
                  }}
                  placeholder="Selecione um cliente..."
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
        const needsNotes = currentStatus === 'no-show' || currentStatus === 'cancelled';
        const initials = (apt.patient_name || apt.title || 'P').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
        const statusColor: Record<string, string> = {
          scheduled: '#6366f1', confirmed: '#10b981', completed: '#059669',
          'no-show': '#f59e0b', cancelled: '#ef4444',
        };
        const accentColor = statusColor[currentStatus] || '#6366f1';

        const quickStatuses = [
          { key: 'scheduled', label: 'Agendado', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', active: 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' },
          { key: 'confirmed', label: 'Confirmado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', active: 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100' },
          { key: 'completed', label: 'Realizado', color: 'bg-green-50 text-green-700 border-green-200', active: 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-100' },
          { key: 'no-show', label: 'Faltou', color: 'bg-amber-50 text-amber-700 border-amber-200', active: 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-100' },
          { key: 'cancelled', label: 'Cancelado', color: 'bg-rose-50 text-rose-700 border-rose-200', active: 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-100' },
        ];

        const handleQuickSave = async () => {
          if (needsNotes && !detailQuickNotes.trim()) {
            pushToast('error', `Informe o motivo ${currentStatus === 'no-show' ? 'da falta' : 'do cancelamento'}.`);
            return;
          }
          try {
            await api.put(`/appointments/${apt.id}/status`, { status: currentStatus, notes: detailQuickNotes || undefined });
            pushToast('success', 'Status atualizado!');
            fetchData();
            setDetailQuickStatus(null);
            setDetailQuickNotes('');
            setIsDetailModalOpen(false);
          } catch { pushToast('error', 'Erro ao atualizar status.'); }
        };

        return (
          <Modal isOpen={isDetailModalOpen} onClose={() => { setIsDetailModalOpen(false); setDetailQuickStatus(null); setDetailQuickNotes(''); }} title="" maxWidth="max-w-md" hideCloseButton>
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
                  <button onClick={() => setIsComandaManagerOpen(true)} className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 hover:bg-emerald-100 transition-colors">
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
                      onClick={() => { setDetailQuickStatus(s.key === currentStatus && !detailQuickStatus ? null : s.key); setDetailQuickNotes(''); }}
                      className={cx('text-[11px] font-black px-3 py-1.5 rounded-xl border transition-all', currentStatus === s.key ? s.active : s.color)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Notes required when faltou/cancelado */}
                {detailQuickStatus && needsNotes && (
                  <div className="mt-3">
                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1.5 block">
                      {currentStatus === 'no-show' ? 'Motivo da Falta *' : 'Motivo do Cancelamento *'}
                    </label>
                    <textarea
                      value={detailQuickNotes}
                      onChange={e => setDetailQuickNotes(e.target.value)}
                      placeholder={currentStatus === 'no-show' ? 'Descreva o motivo da falta...' : 'Descreva o motivo do cancelamento...'}
                      rows={2}
                      className={cx('w-full rounded-xl border px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 outline-none resize-none transition-colors',
                        detailQuickNotes.trim() ? 'border-rose-300 focus:border-rose-500' : 'border-rose-400 focus:border-rose-600 bg-rose-50/30')}
                    />
                  </div>
                )}

                {detailQuickStatus && detailQuickStatus !== (apt.status || 'scheduled') && (
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
                <button onClick={handleGenerateReceipt}
                  className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-all">
                  <FileText size={16} className="text-slate-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Recibo</span>
                </button>
                <button onClick={() => { if (apt) openEditModal(apt); setIsDetailModalOpen(false); }}
                  className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-all">
                  <Edit3 size={16} className="text-indigo-600" />
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Editar</span>
                </button>
                <button onClick={() => { if (apt) setSelectedDeleteIds([apt.id]); setIsDetailModalOpen(false); setIsDeleteModalOpen(true); }}
                  className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-all">
                  <Trash2 size={16} className="text-rose-500" />
                  <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Deletar</span>
                </button>
              </div>

            </div>
          </Modal>
        );
      })()}

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
          if (!cmnd) return null;

          return (
            <div className="grid grid-cols-1 gap-6 py-2 lg:grid-cols-[1.6fr_0.9fr]">
              {(() => {
                const now = new Date();
                const usedSessionsArr = (cmnd.appointments || []).filter((a: any) => {
                  const startTime = new Date(a.start_time || a.start_date || a.start || a.startDate);
                  const isPast = startTime < now;
                  const isCancelled = a.status === 'cancelled';
                  // no-show conta como sessão consumida (slot foi reservado, profissional estava disponível)
                  return a.status === 'completed' || a.status === 'no_show' || a.status === 'no-show' || a.status === 'confirmed' || (isPast && !isCancelled);
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
                      {(cmnd.appointments || []).map((appointment: any) => (
                        <div
                          key={appointment.id}
                          className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                              <CalendarDays size={18} />
                            </div>
                            <div className="flex flex-col gap-1">
                               <p className="text-sm font-medium text-slate-800">
                                 {new Date(appointment.start_time || appointment.start_date || appointment.startDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                               </p>
                               <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-medium text-slate-400 uppercase">
                                        Data e Horário
                                    </p>
                                    {cmnd.package_id && appointment.recurrence_index && (
                                        <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-indigo-100">
                                            {appointment.recurrence_index} de {cmnd.sessions_total || appointment.recurrence_count}
                                        </span>
                                    )}
                               </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <select
                              value={appointment.status}
                              onChange={(e) =>
                                handleUpdateAppointmentStatus(appointment.id, e.target.value)
                              }
                              className={compactInputClass}
                              style={{ height: '32px', fontSize: '11px' }}
                            >
                              <option value="scheduled">Agendado</option>
                              <option value="completed">Concluido</option>
                              <option value="cancelled">Cancelado</option>
                              <option value="no_show">Faltou</option>
                            </select>

                            <input
                              type="datetime-local"
                              value={new Date(
                                new Date(appointment.start_time || appointment.start_date || appointment.startDate).getTime() - 
                                (new Date().getTimezoneOffset() * 60000)
                              ).toISOString().slice(0, 16)}
                              onChange={(e) => handleUpdateAppointmentDate(appointment.id, e.target.value)}
                              className="text-[10px] font-bold border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      ))}

                      {(!cmnd.appointments || cmnd.appointments.length === 0) && (
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
                          className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 p-4"
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
                                {new Date(payment.payment_date).toLocaleDateString()} •{' '}
                                {payment.payment_method}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400">
                            #{payment.receipt_code || '---'}
                          </span>
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
                          value: String(getComandaTotal(cmnd) - getComandaPaid(cmnd)),
                          date: new Date().toISOString().slice(0, 10),
                          method: 'Pix',
                          receiptCode: cmnd.receipt_code || ''
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
        title="Lançar Novo Pagamento"
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
              onChange={(e) =>
                setNewPayment((prev) => ({ ...prev, value: formatCurrencyInput(parseMonetaryValue(e.target.value)) }))
              }
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
