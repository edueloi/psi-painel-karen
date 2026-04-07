import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, getStaticUrl, API_BASE_URL } from '../services/api';
import { Comanda, Patient, Service } from '../types';
import { Modal } from '../components/UI/Modal';
import { DatePicker } from '../components/UI/DatePicker';
import { Button } from '../components/UI/Button';
import { Input, Select, TextArea, Combobox } from '../components/UI/Input';
import { FilterLine, FilterLineSection, FilterLineItem, FilterLineSegmented, FilterLineSearch, FilterLineViewToggle, FilterLineDateRange } from '../components/UI/FilterLine';
import { ActionDrawer } from '../components/UI/ActionDrawer';
import { GridTable } from '../components/UI/GridTable';
import { PageHeader } from '../components/UI/PageHeader';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import {
  ShoppingBag,
  Search,
  Plus,
  Edit3,
  Trash2,
  DollarSign,
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  User as UserIcon,
  Calendar as CalendarIcon,
  CalendarDays,
  LayoutGrid,
  List as ListIcon,
  CreditCard,
  Check,
  Package,
  Upload,
  Download,
  ChevronDown,
  XCircle,
  UserCheck,
  List,
} from 'lucide-react';

type ComandaTab = 'avulsa' | 'pacote';
type ViewMode = 'kanban' | 'list';
type StatusFilter = 'open' | 'closed';
type DateRangeFilter = 'today' | 'month' | 'year' | 'all';

type EditableItem = {
  id?: string;
  serviceId?: string;
  name: string;
  qty: number;
  price: number;
};

type EditableComanda = Omit<Partial<Comanda>, 'items'> & {
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
  syncToLivrocaixa?: boolean;
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
          active ? 'border-primary-600' : 'border-slate-500'
        }`}
      >
        {active && <span className="h-2.5 w-2.5 rounded-full bg-primary-600" />}
      </span>
      <span>{label}</span>
    </button>
  );
};

const Field: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="mb-1 block text-[12px] font-medium text-slate-600">
      {label}
    </label>
    {children}
  </div>
);

export const Comandas: React.FC = () => {
  const location = useLocation();
  const { preferences, updatePreference } = useUserPreferences();
  const { pushToast } = useToast();
  const { hasPermission } = useAuth();

  const [activePatients, setActivePatients] = useState<Patient[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [profileData, setProfileData] = useState<any>({});
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>(
    preferences?.comandas?.viewMode || 'list'
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    preferences?.comandas?.statusFilter || 'open'
  );
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>(
    preferences?.comandas?.dateRangeFilter || 'month'
  );
  const [closedDateFrom, setClosedDateFrom] = useState<string | null>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [closedDateTo, setClosedDateTo] = useState<string | null>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  });
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ComandaTab>('avulsa');
  const [editingComanda, setEditingComanda] = useState<EditableComanda | null>(
    null
  );

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importSelectedIds, setImportSelectedIds] = useState<Set<number>>(new Set());
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; errors: any[] } | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyComanda, setHistoryComanda] = useState<Comanda | null>(null);
  const [managerTab, setManagerTab] = useState<
    'atendimentos' | 'pagamentos' | 'pacote'
  >('atendimentos');
  const [comandaLivroCaixaTx, setComandaLivroCaixaTx] = useState<any[]>([]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Selection + pagination
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allVisibleSelected = currentComandas.every(c => selectedIds.has(String(c.id)));
    if (allVisibleSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        currentComandas.forEach(c => next.delete(String(c.id)));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        currentComandas.forEach(c => next.add(String(c.id)));
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all([...selectedIds].map(id => api.delete(`/finance/comandas/${id}`)));
      setSelectedIds(new Set());
      setConfirmBulkDelete(false);
      await fetchData();
      pushToast('success', 'Comandas excluídas.');
    } catch {
      pushToast('error', 'Erro ao excluir comandas.');
    }
  };

  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [newPayment, setNewPayment] = useState<{ id?: string, value: string, date: string, method: string, receiptCode: string, comandaId: string }>({
    value: '',
    date: new Date().toISOString().slice(0, 10),
    method: 'Pix',
    receiptCode: '',
    comandaId: ''
  });



  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value || 0));

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

  const handleMonetaryChange = (val: string, setter: (v: string) => void) => {
    const digits = val.replace(/\D/g, '');
    if (!digits) { setter(''); return; }
    setter((parseFloat(digits) / 100).toFixed(2).replace('.', ','));
  };

  const normalizePatientName = (patient: any) =>
    patient?.full_name || patient?.name || 'Sem nome';

  const getComandaTotal = (c: any) =>
    Number(c?.totalValue || c?.total || 0) || 0;

  const getComandaPaid = (c: any) => 
    Number(c?.paidValue || c?.paid_value || 0) || 0;

  const getComandaPending = (c: any) =>
    Math.max(0, getComandaTotal(c) - getComandaPaid(c));

  const calculateItemsTotal = (items?: EditableItem[]) =>
    (items || []).reduce(
      (acc, item) => acc + (Number(item.price || 0) * Number(item.qty || 0)),
      0
    );

  const createBaseComanda = (): EditableComanda => ({
    status: 'open',
    items: [],
    totalValue: 0,
    paidValue: 0,
    description: '',
    patientId: '',
    patientSearch: '',
    professionalId: String(profileData?.id || professionals?.[0]?.id || ''),
    startDate: new Date().toISOString().slice(0, 10),
    duration_minutes: 60,
    sessions_total: 1,
    discount_type: 'fixed',
    discount_value: 0,
    packageId: '',
    syncToLivrocaixa: false,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ptsData, srvsData, usrsData, pkgsData, profileRes, fetchedComandas] =
        await Promise.all([
          api.get<any[]>('/patients'),
          api.get<Service[]>('/services'),
          api.get<any[]>('/users'),
          api.get<any[]>('/packages'),
          api.get<any>('/profile/me'),
          api.get<Comanda[]>('/finance/comandas'),
        ]);

      const mappedPatients = (ptsData || []).map((p) => ({
        ...p,
        full_name: normalizePatientName(p),
      })) as Patient[];

      setPatients(mappedPatients);
      setActivePatients(
        mappedPatients.filter(
          (p: any) => p.status !== 'inactive' && p.status !== 'inativo'
        )
      );
      setServices(srvsData || []);
      setProfessionals(usrsData || []);
      setPackages(pkgsData || []);
      setProfileData(profileRes || {});
      setComandas(fetchedComandas || []);
    } catch (error) {
      console.error(error);
      pushToast('error', 'Erro ao carregar comandas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);;

  useEffect(() => {
    const state = location.state as { openComandaId?: string };
    if (state?.openComandaId && comandas.length > 0) {
      const found = comandas.find(
        (c: any) => String(c.id) === String(state.openComandaId)
      );
      if (found) {
        handleOpenModal(found);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, comandas]);

  const normC = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filteredComandas = useMemo(() => {
    return comandas.filter((c: any) => {
      const patientName = normC(c.patientName || c.patient_name || '');
      const description = normC(c.description || '');
      const firstItem = normC(c.items?.[0]?.name || '');
      const term = normC(searchTerm);

      const matchesSearch =
        patientName.includes(term) ||
        description.includes(term) ||
        firstItem.includes(term);

      if (!matchesSearch) return false;
      if (statusFilter !== c.status) return false;

      if (closedDateFrom || closedDateTo) {
        const refDate = new Date(c.updated_at || c.createdAt || c.created_at || new Date());
        refDate.setHours(0, 0, 0, 0);
        if (closedDateFrom) {
          const from = new Date(closedDateFrom);
          from.setHours(0, 0, 0, 0);
          if (refDate < from) return false;
        }
        if (closedDateTo) {
          const to = new Date(closedDateTo);
          to.setHours(23, 59, 59, 999);
          if (refDate > to) return false;
        }
      }

      return true;
    });
  }, [comandas, searchTerm, statusFilter, closedDateFrom, closedDateTo]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchTerm, statusFilter, closedDateFrom, closedDateTo, itemsPerPage]);

  // Fetch livro caixa transactions linked to the open comanda
  useEffect(() => {
    if (!historyComanda) { setComandaLivroCaixaTx([]); return; }
    api.get<any[]>('/finance', { comanda_id: String(historyComanda.id) }).then((all: any[]) => {
      const linked = (Array.isArray(all) ? all : []).filter(
        (tx: any) => String(tx.comanda_id) === String(historyComanda.id)
      );
      setComandaLivroCaixaTx(linked);
    }).catch(() => setComandaLivroCaixaTx([]));
  }, [historyComanda?.id]);

  const totalPages = Math.max(1, Math.ceil(filteredComandas.length / itemsPerPage));
  const currentComandas = useMemo(() => {
    return filteredComandas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredComandas, currentPage, itemsPerPage]);

  const stats = useMemo(() => {
    const total    = filteredComandas.reduce((acc, c: any) => acc + getComandaTotal(c), 0);
    const pending  = filteredComandas.reduce((acc, c: any) => acc + getComandaPending(c), 0);
    const received = filteredComandas.reduce((acc, c: any) => acc + getComandaPaid(c), 0);
    return { total, open: pending, received };
  }, [filteredComandas]);

  const openComandasStats = useMemo(() => {
    const openComandas = comandas.filter(c => c.status === 'open');
    const totalPending = openComandas.reduce((acc, c) => acc + getComandaPending(c), 0);
    return {
      count: openComandas.length,
      totalPending: totalPending,
    };
  }, [comandas]);

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

  const saveDisabled =
    !editingComanda?.patientId ||
    modalNetTotal <= 0 ||
    (modalTab === 'pacote' &&
      !(editingComanda?.items || []).some((item) => item.name && item.qty > 0));

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
      discount_type: ((foundPackage as any).discountType || (foundPackage as any).discount_type || 'fixed') as 'percentage' | 'fixed',
      discount_value: Number((foundPackage as any).discountValue ?? (foundPackage as any).discount_value ?? 0),
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

  const handlePatientSearchChange = (value: string) => {
    if (!editingComanda) return;

    const foundPatient = activePatients.find(
      (patient: any) => normalizePatientName(patient).toLowerCase() === value.toLowerCase()
    );

    setEditingComanda({
      ...editingComanda,
      patientSearch: value,
      patientId: foundPatient ? String(foundPatient.id) : editingComanda.patientId || '',
    });
  };

  const handleOpenModal = (comanda?: Comanda) => {
    if (comanda) {
      const patientId = String((comanda as any).patient_id || (comanda as any).patientId || '');
      const patientName =
        (comanda as any).patientName ||
        (comanda as any).patient_name ||
        activePatients.find((p: any) => String(p.id) === patientId)?.full_name ||
        '';

      const items =
        Array.isArray((comanda as any).items) && (comanda as any).items.length > 0
          ? (comanda as any).items.map((item: any) => ({
              id: item.id,
              serviceId: String(item.service_id || item.serviceId || ''),
              name: item.name || '',
              qty: Number(item.qty || 1),
              price: Number(item.price || 0),
            }))
          : [];

      const isPackage =
        Boolean((comanda as any).package_id || (comanda as any).packageId) ||
        Number((comanda as any).sessions_total || 1) > 1 ||
        items.length > 1;

      setEditingComanda({
        ...(comanda as any),
        patientId,
        patientSearch: patientName,
        professionalId: String((comanda as any).professional_id || (comanda as any).professionalId || profileData?.id || ''),
        startDate: String(
          (comanda as any).start_date ||
            (comanda as any).startDate ||
            (comanda as any).createdAt ||
            new Date().toISOString()
        ).slice(0, 10),
        totalValue: Number((comanda as any).totalValue || (comanda as any).total || 0),
        paidValue: Number((comanda as any).paidValue || 0),
        discount_type: (comanda as any).discount_type || 'fixed',
        discount_value: Number((comanda as any).discount_value || 0),
        packageId: String((comanda as any).package_id || (comanda as any).packageId || ''),
        items,
        sessions_total: Number((comanda as any).sessions_total || 1),
        sessions_used: Number((comanda as any).sessions_used || 0),
        syncToLivrocaixa: Boolean((comanda as any).sync_to_livrocaixa),
      });

      setModalTab(isPackage ? 'pacote' : 'avulsa');
    } else {
      setEditingComanda(createBaseComanda());
      setModalTab('avulsa');
    }

    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingComanda?.patientId) {
      pushToast('error', 'Selecione um cliente.');
      return;
    }

    try {
      const isPackage = modalTab === 'pacote';

      const itemsPayload = isPackage
        ? (editingComanda.items || [])
            .filter((item) => item.name && Number(item.qty || 0) > 0)
            .map((item) => ({
              ...(item.id ? { id: item.id } : {}),
              service_id: item.serviceId || undefined,
              name: item.name,
              price: Number(item.price || 0),
              qty: Number(item.qty || 1),
            }))
        : [
            {
              name: editingComanda.description?.trim() || 'Comanda avulsa',
              price: modalNetTotal,
              qty: 1,
            },
          ];

      const payload: any = {
        patient_id: String(editingComanda.patientId),
        professional_id: String(
          editingComanda.professionalId || profileData?.id || professionals?.[0]?.id || ''
        ),
        description:
          editingComanda.description ||
          (isPackage
            ? packages.find((pkg) => String(pkg.id) === String(editingComanda.packageId))?.name || ''
            : 'Comanda avulsa'),
        total_value: Number(modalNetTotal),
        gross_total_value: Number(modalGrossTotal),
        discount_type: editingComanda.discount_type || 'fixed',
        discount_value: Number(editingComanda.discount_value || 0),
        sessions_total: Number(editingComanda.sessions_total || 1),
        sessions_used: Number(editingComanda.sessions_used || 0),
        status: editingComanda.status || 'open',
        start_date: editingComanda.startDate,
        package_id: isPackage && editingComanda.packageId ? String(editingComanda.packageId) : null,
        items: itemsPayload,
        skip_appointment: isPackage,
        sync_to_livrocaixa: editingComanda.syncToLivrocaixa ? 1 : 0,
      };

      if (editingComanda.id) {
        await api.put(`/finance/comandas/${editingComanda.id}`, payload);
      } else {
        await api.post('/finance/comandas', payload);
      }

      pushToast('success', 'Comanda salva com sucesso!');
      setIsModalOpen(false);
      await fetchData();
    } catch (error: any) {
      console.error('ERRO AO SALVAR COMANDA:', error);
      // Inspecionar o corpo do erro se disponível
      const serverMsg = error.response?.data?.error || error.response?.data?.message || error.message;
      pushToast('error', `Erro ao salvar: ${serverMsg}`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await api.delete(`/finance/comandas/${deleteConfirmId}`);
      setComandas((prev) => prev.filter((c) => String(c.id) !== String(deleteConfirmId)));
      pushToast('success', 'Comanda removida com sucesso!');
    } catch (error) {
      console.error(error);
      pushToast('error', 'Erro ao remover comanda.');
    } finally {
      setDeleteConfirmId(null);
    }
  };
  const parseImportRows = (cols: string[]) => {
    const description = cols[0] || '';
    const client_name = cols[1] || '';
    const date = cols[2] || '';
    const sessStr = cols[3] || '';
    const totalStr = cols[4] || '';
    const paidStr = cols[5] || '';
    const sessMatch = sessStr.match(/(\d+)\s+de\s+(\d+)/i);
    const sessions_used = sessMatch ? parseInt(sessMatch[1]) : 0;
    const sessions_total = sessMatch ? parseInt(sessMatch[2]) : 1;
    const parseMoney = (s: string) =>
      parseFloat(String(s).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    return { description, client_name, date, sessions_used, sessions_total, total: parseMoney(totalStr), paid: parseMoney(paidStr) };
  };

  const parseCsvFile = (file: File) => {
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Envia ao backend para parsing
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('psi_token');
      fetch(`${API_BASE_URL}/finance/comandas/parse-xlsx`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
        .then(r => r.json())
        .then(data => { setImportRows(data.rows || []); setImportResult(null); setImportSelectedIds(new Set()); })
        .catch(() => pushToast('error', 'Erro ao ler arquivo XLSX.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return;
      const delim = lines[0].includes(';') ? ';' : ',';
      const parseLine = (line: string) => line.split(delim).map(c => c.replace(/^["']|["']$/g, '').trim());
      const parsed = lines.slice(1).map(line => parseImportRows(parseLine(line))).filter(r => r.client_name);
      setImportRows(parsed);
      setImportResult(null);
      setImportSelectedIds(new Set());
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleExportXLSX = async () => {
    pushToast('success', 'Gerando Excel...');
    try {
      const rows = (filteredComandas as any[]).map(c => ({
        id: c.id,
        description: c.items?.[0]?.name || c.description || '',
        client_name: c.patientName || c.patient_name || '',
        date: c.start_date || c.created_at || '',
        sessions_used: c.sessions_used ?? 0,
        sessions_total: c.sessions_total ?? 1,
        total: getComandaTotal(c),
        paid: getComandaPaid(c),
        pending: getComandaPending(c),
        status: c.status === 'closed' ? 'Finalizada' : 'Aberta',
      }));
      const token = localStorage.getItem('psi_token');
      const res = await fetch(`${API_BASE_URL}/finance/comandas/export-xlsx`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, filterLabel: statusFilter === 'closed' ? 'Finalizadas' : 'Em Aberto' }),
      });
      if (!res.ok) throw new Error('Erro ao gerar Excel');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comandas_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      pushToast('success', 'Excel exportado!');
    } catch (err) {
      pushToast('error', 'Erro ao exportar Excel.');
    }
  };

  const handleImport = async () => {
    if (!importRows.length) return;
    setImportLoading(true);
    try {
      const result = await api.post<{ created: number; errors: any[] }>(
        '/finance/comandas/import',
        { rows: importRows }
      );
      setImportResult(result);
      if (result.created > 0) {
        await fetchData();
      }
    } catch (err) {
      pushToast('error', 'Erro ao importar comandas.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleUpdateAppointmentStatus = async (
    appointmentId: string | number,
    newStatus: string
  ) => {
    try {
      await api.put(`/appointments/${appointmentId}`, { status: newStatus });
      
      const res = await api.get<Comanda[]>('/finance/comandas');
      const latestComandas = res || [];
      setComandas(latestComandas);
 
      if (historyComanda) {
        const updated = latestComandas.find((c: any) => String(c.id) === String(historyComanda.id));
        if (updated) setHistoryComanda(updated);
      }
 
      pushToast('success', 'Status atualizado.');
    } catch (error) {
      console.error(error);
      pushToast('error', 'Erro ao atualizar status.');
    }
  };
 
  const handleIncrementSessions = async (comanda: Comanda) => {
    try {
      const currentUsed = Number(comanda.sessions_used || 0);
      const total = Number(comanda.sessions_total || 1);
      if (currentUsed >= total && !window.confirm('Este pacote já está completo. Deseja adicionar uma sessão extra?')) {
        return;
      }

      await api.put(`/finance/comandas/${comanda.id}`, {
        ...comanda,
        sessions_used: currentUsed + 1
      });

      pushToast('success', 'Atendimento registrado!');
      await fetchData();
      
      if (historyComanda && String(historyComanda.id) === String(comanda.id)) {
        const refreshed = await api.get<Comanda[]>('/finance/comandas');
        const updated = refreshed.find((c) => String(c.id) === String(comanda.id));
        if (updated) setHistoryComanda(updated);
      }
    } catch (error) {
      console.error(error);
      pushToast('error', 'Erro ao registrar atendimento.');
    }
  };

  const handleUpdateAppointmentDate = async (
    appointmentId: string | number,
    newDate: string
  ) => {
    try {
      // datetime-local input retorna horário local (ex: "2026-04-15T15:00").
      // O backend interpreta strings sem timezone como UTC, então precisamos
      // converter explicitamente para ISO UTC antes de enviar.
      const utcDate = new Date(newDate).toISOString();
      await api.put(`/appointments/${appointmentId}`, { start_time: utcDate });
      
      const res = await api.get<Comanda[]>('/finance/comandas');
      const latestComandas = res || [];
      setComandas(latestComandas);
 
      if (historyComanda) {
        const updated = latestComandas.find((c: any) => String(c.id) === String(historyComanda.id));
        if (updated) setHistoryComanda(updated);
      }
 
      pushToast('success', 'Data vinculada atualizada.');
    } catch (error) {
      console.error(error);
      pushToast('error', 'Erro ao atualizar data do atendimento.');
    }
  };

  const handleSavePayment = async () => {
    if (!historyComanda) return;

    try {
      const payload = {
        amount: parseMonetaryValue(newPayment.value),
        payment_date: newPayment.date,
        payment_method: newPayment.method,
        receipt_code: newPayment.receiptCode,
        source: 'comanda',
      };

      if (newPayment.id) {
        await api.put(`/finance/comandas/${historyComanda.id}/payments/${newPayment.id}`, payload);
      } else {
        await api.post(`/finance/comandas/${historyComanda.id}/payments`, payload);
      }

      pushToast('success', newPayment.id ? 'Pagamento atualizado!' : 'Pagamento registrado!');
      setIsAddPaymentModalOpen(false);
      setNewPayment({
        value: '',
        date: new Date().toISOString().slice(0, 10),
        method: 'Pix',
        receiptCode: '',
        comandaId: ''
      });

      await fetchData();

      const refreshed = await api.get<Comanda[]>('/finance/comandas');
      const updated = refreshed.find((c) => String(c.id) === String(historyComanda.id));
      if (updated) setHistoryComanda(updated);
      
      // Update livro caixa state as well
      const allTx = await api.get<any[]>('/finance', { comanda_id: String(historyComanda.id) });
      const linked = (Array.isArray(allTx) ? allTx : []).filter(
        (tx: any) => String(tx.comanda_id) === String(historyComanda.id)
      );
      setComandaLivroCaixaTx(linked);

    } catch (error) {
      console.error(error);
      pushToast('error', 'Erro ao salvar pagamento.');
    }
  };

  const handleDeletePayment = async (paymentId: string | number) => {
    if (!historyComanda) return;
    
    try {
      await api.delete(`/finance/comandas/${historyComanda.id}/payments/${paymentId}`);
      pushToast('success', 'Pagamento excluído com sucesso!');
      
      await fetchData();
      
      const refreshed = await api.get<Comanda[]>('/finance/comandas');
      const updated = refreshed.find((c) => String(c.id) === String(historyComanda.id));
      if (updated) setHistoryComanda(updated);
      
      const allTx = await api.get<any[]>('/finance', { comanda_id: String(historyComanda.id) });
      const linked = (Array.isArray(allTx) ? allTx : []).filter(
        (tx: any) => String(tx.comanda_id) === String(historyComanda.id)
      );
      setComandaLivroCaixaTx(linked);
    } catch (err: any) {
      pushToast('error', err?.response?.data?.error || 'Erro ao excluir pagamento.');
    }
  };

  const handleExportCSV = () => {
    const rows = filteredComandas as any[];
    const headers = ['ID', 'Descrição', 'Cliente', 'Data', 'N. Atendimentos', 'Total', 'Recebido', 'Pendente', 'Status'];
    const fmtMoney = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
    const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '';

    const lines = [
      headers.join(';'),
      ...rows.map(c => {
        const sessUsed = c.sessions_used ?? 0;
        const sessTotal = c.sessions_total ?? 1;
        const total = getComandaTotal(c);
        const paid = getComandaPaid(c);
        const pending = getComandaPending(c);
        const desc = (c.items?.[0]?.name || c.description || '').replace(/;/g, ',');
        const patient = (c.patientName || c.patient_name || '').replace(/;/g, ',');
        const date = fmtDate(c.start_date || c.created_at);
        const sessions = `${sessUsed} de ${sessTotal} atendimentos`;
        const status = c.status === 'closed' ? 'Finalizada' : 'Aberta';
        return [c.id, desc, patient, date, sessions, fmtMoney(total), fmtMoney(paid), fmtMoney(pending), status].join(';');
      })
    ];

    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comandas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('success', 'CSV exportado!');
  };

  const handleExportPDF = async () => {
    pushToast('success', 'Gerando PDF...');
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const rows = filteredComandas as any[];
      const logoUrl = profileData?.clinic_logo_url ? getStaticUrl(profileData.clinic_logo_url) : '';
      const profName = profileData?.name || '';
      const profCrp = profileData?.crp || '';
      const companyName = profileData?.company_name || 'Consultório';
      const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      const filterLabel = statusFilter === 'closed' ? 'Finalizadas' : 'Em Aberto';

      const fmtMoney = (v: number) =>
        `R$ ${Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
      const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

      const tableRows = rows.map((c: any) => {
        const sessUsed = c.sessions_used ?? 0;
        const sessTotal = c.sessions_total ?? 1;
        return [
          `#${c.id}`,
          (c.items?.[0]?.name || c.description || '-').slice(0, 20),
          (c.patientName || c.patient_name || '-').slice(0, 28),
          fmtDate(c.start_date || c.created_at),
          `${sessUsed}/${sessTotal}`,
          fmtMoney(getComandaTotal(c)),
          fmtMoney(getComandaPaid(c)),
          fmtMoney(getComandaPending(c)),
          c.status === 'closed' ? 'Finalizada' : 'Aberta',
        ];
      });

      const totTotal = rows.reduce((s: number, c: any) => s + getComandaTotal(c), 0);
      const totPaid  = rows.reduce((s: number, c: any) => s + getComandaPaid(c), 0);
      const totPend  = rows.reduce((s: number, c: any) => s + getComandaPending(c), 0);

      const headers = ['ID', 'Descrição', 'Paciente', 'Data', 'Sessões', 'Total', 'Recebido', 'Pendente', 'Status'];

      const buildRowHtml = (row: string[], i: number) => {
        const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
        const isOpen = row[8] === 'Aberta';
        const statusColor = isOpen ? '#d97706' : '#059669';
        const statusBg = isOpen ? '#fef3c7' : '#d1fae5';
        return `<tr style="background:${bg}">
          ${row.slice(0, 8).map((cell, ci) => `
            <td style="padding:6px 8px;font-size:11px;color:#374151;border-bottom:1px solid #f1f5f9;
              text-align:${ci >= 5 ? 'right' : 'left'};white-space:nowrap;">${cell}</td>
          `).join('')}
          <td style="padding:6px 8px;text-align:center;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:10px;font-weight:bold;background:${statusBg};color:${statusColor};
              padding:2px 8px;border-radius:99px;">${row[8]}</span>
          </td>
        </tr>`;
      };

      const headersHtml = headers.map((h, i) => `
        <th style="padding:10px 8px;font-size:11px;font-weight:700;text-transform:uppercase;
          letter-spacing:.05em;color:#e2e8f0;text-align:${i >= 5 ? 'right' : 'left'};">${h}</th>
      `).join('');

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

        const rowsHtml = pageRows.map((row, i) => buildRowHtml(row, i)).join('');

        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1200px;background:#ffffff;font-family:Arial,sans-serif;';

        container.innerHTML = `
          <div style="padding:32px 40px;">
            ${isFirstPage ? `
              <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;">
                <div style="display:flex;align-items:center;gap:16px;">
                  ${logoUrl
                    ? `<img src="${logoUrl}" style="height:56px;width:56px;object-fit:contain;border-radius:10px;" crossorigin="anonymous"/>`
                    : `<div style="height:56px;width:56px;background:#e0e7ff;border-radius:10px;"></div>`}
                  <div>
                    <div style="font-size:18px;font-weight:900;color:#1e293b;">${companyName}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">Gestão de Comandas · ${filterLabel}</div>
                  </div>
                </div>
                <div style="text-align:right;font-size:11px;color:#64748b;line-height:1.8;">
                  ${profName ? `<b style="color:#1e293b;">${profName}</b><br/>` : ''}
                  ${profCrp ? `CRP: ${profCrp}<br/>` : ''}
                  ${now}
                </div>
              </div>
              <div style="display:flex;gap:12px;margin-bottom:20px;">
                ${[
                  ['Faturamento Total', fmtMoney(totTotal), '#1e293b', '#f8fafc'],
                  ['Total Recebido', fmtMoney(totPaid), '#059669', '#f0fdf4'],
                  ['Total Pendente', fmtMoney(totPend), '#d97706', '#fffbeb'],
                  ['Total de Comandas', String(rows.length), '#4f46e5', '#eef2ff'],
                ].map(([label, val, color, bg]) => `
                  <div style="flex:1;background:${bg};border-radius:10px;padding:12px 16px;">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;">${label}</div>
                    <div style="font-size:16px;font-weight:900;color:${color};margin-top:4px;">${val}</div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #e2e8f0;">
                <span style="font-size:13px;font-weight:700;color:#1e293b;">Gestão de Comandas · ${filterLabel}</span>
                <span style="font-size:11px;color:#94a3b8;">Página ${pageIdx + 1} de ${chunks.length} · ${now}</span>
              </div>
            `}
            <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;">
              <thead>
                <tr style="background:#1e293b;">${headersHtml}</tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            ${isLastPage ? `
              <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:10px;color:#94a3b8;">Gerado em ${now} · PsiFlux</div>
                ${profName ? `<div style="font-size:10px;color:#64748b;">${profName}${profCrp ? ` · CRP ${profCrp}` : ''}</div>` : ''}
              </div>
            ` : ''}
          </div>`;

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

      pdf.save(`comandas_${filterLabel.toLowerCase().replace(' ', '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
      pushToast('success', 'PDF gerado!');
    } catch (err) {
      console.error(err);
      pushToast('error', 'Erro ao gerar PDF.');
    }
  };

  const handleGenerateReceipt = async () => {
    if (!historyComanda) return;

    pushToast('success', 'Gerando recibo...');

    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const professional = professionals.find(
        (p) =>
          String(p.id) ===
          String((historyComanda as any).professional_id || (historyComanda as any).professionalId)
      );

      const professionalName = professional?.name || profileData?.name || '';
      const professionalCrp = professional?.crp || profileData?.crp || '';
      const professionalCpf = professional?.cpf || profileData?.cpf || '';

      const patientName =
        (historyComanda as any).patientName ||
        (historyComanda as any).patient_name ||
        'Paciente';

      const amount = formatCurrency(getComandaTotal(historyComanda));
      const dateStr = new Date(
        (historyComanda as any).createdAt ||
          (historyComanda as any).created_at ||
          new Date()
      ).toLocaleDateString('pt-BR');

      const fullDate = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const locationText =
        String(profileData?.address || '').split(',').pop()?.trim() || 'São Paulo';

      const logoUrl = profileData?.clinic_logo_url
        ? getStaticUrl(profileData.clinic_logo_url)
        : '';

      const container = document.createElement('div');
      container.style.cssText =
        'position:fixed;left:-9999px;top:0;width:794px;background:#ffffff;font-family:Arial,sans-serif;color:#00214d;';

      container.innerHTML = `
        <div style="display:flex;min-height:1123px;">
          <div style="width:40px;background:#00214d;min-height:1123px;flex-shrink:0;"></div>
          <div style="padding:60px 80px;flex:1;position:relative;">
            <div style="position:absolute;top:60px;right:80px;text-align:right;font-size:11px;color:#00214d;">
              <b>${professionalName}</b><br/>
              Psicóloga(o)<br/>
              ${professionalCrp ? `CRP: ${professionalCrp}<br/>` : ''}
              ${professionalCpf ? `CPF: ${professionalCpf}` : ''}
            </div>
            <div style="width:120px;height:120px;background:white;border:1px solid #e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:40px;overflow:hidden;">
              ${
                logoUrl
                  ? `<img src="${logoUrl}" style="width:100%;height:100%;object-fit:contain;" crossorigin="anonymous" />`
                  : `<span style="font-size:10px;">SEU LOGO</span>`
              }
            </div>
            <div style="text-align:right;margin:40px 0;font-size:13px;">${locationText}, ${fullDate}</div>
            <div style="text-align:center;font-size:18px;font-weight:900;margin-bottom:50px;">RECIBO</div>
            <div style="font-size:14px;line-height:1.8;text-align:justify;margin-bottom:30px;">
              Serviço prestado ao(à) <b>${patientName}</b>. Referente à comanda de <b>${dateStr}</b>.<br/><br/>
              Valor total: <b>${amount}</b>.<br/><br/>
              <b>${professionalName}</b>${professionalCrp ? `, CRP: ${professionalCrp}` : ''}.
            </div>
            <div style="margin-top:100px;text-align:center;">
              <div style="border-top:1.5px solid #00214d;width:300px;margin:0 auto;padding-top:10px;">
                <b>${professionalName}</b><br/>
                Psicóloga(o)${professionalCrp ? ` - ${professionalCrp}` : ''}
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save(`Recibo_${patientName.replace(/\s+/g, '_')}_${dateStr.replace(/\//g, '-')}.pdf`);

      document.body.removeChild(container);
      pushToast('success', 'Recibo gerado!');
    } catch (error) {
      console.error(error);
      pushToast('error', 'Erro ao gerar recibo.');
    }
  };

  const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
        status === 'closed'
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-amber-50 text-amber-700'
      }`}
    >
      {status === 'closed' ? 'Pago' : 'Aberto'}
    </span>
  );

  return (
    <div className="min-h-screen bg-slate-50">


      <div className="mx-auto max-w-[1600px] px-6 pt-6 mb-6">
        <PageHeader
          icon={<ShoppingBag />}
          title="Gestão de Comandas"
          subtitle="Controle financeiro, pacotes e sessões"
          containerClassName="mb-0"
          actions={
            <div className="flex items-center gap-2">
              {hasPermission('manage_payments') && (
                <Button
                  onClick={() => { setImportRows([]); setImportResult(null); setIsImportOpen(true); }}
                  leftIcon={<Upload size={16} />}
                  variant="outline"
                  radius="xl"
                >
                  Importar
                </Button>
              )}

              {/* dropdown exportar */}
              {hasPermission('view_financial_reports') && (
                <div className="relative">
                  <Button
                    onClick={() => setExportMenuOpen(o => !o)}
                    leftIcon={<Download size={16} />}
                    rightIcon={<ChevronDown size={14} />}
                    variant="outline"
                    radius="xl"
                  >
                    Exportar
                  </Button>
                  {exportMenuOpen && (
                    <div
                      className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                      onMouseLeave={() => setExportMenuOpen(false)}
                    >
                      <button
                        onClick={() => { setExportMenuOpen(false); handleExportCSV(); }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <FileText size={14} className="text-emerald-500" /> Exportar CSV
                      </button>
                      <button
                        onClick={() => { setExportMenuOpen(false); handleExportXLSX(); }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <FileText size={14} className="text-green-600" /> Exportar Excel
                      </button>
                      <button
                        onClick={() => { setExportMenuOpen(false); handleExportPDF(); }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <FileText size={14} className="text-red-500" /> Exportar PDF
                      </button>
                    </div>
                  )}
                </div>
              )}

              {hasPermission('manage_payments') && (
                <Button
                  onClick={() => handleOpenModal()}
                  leftIcon={<Plus size={16} />}
                  variant="primary"
                  radius="xl"
                  className="shadow-lg shadow-primary-200"
                >
                  Nova comanda
                </Button>
              )}
            </div>
          }
        />
      </div>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {openComandasStats.count > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-amber-500" aria-hidden="true" />
              </div>
              <div className="ml-4">
                <p className="text-base font-semibold text-amber-800">
                  Atenção: Existem Comandas em Aberto!
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  Você possui{' '}
                  <span className="font-bold">{openComandasStats.count}</span>{' '}
                  comanda{openComandasStats.count > 1 ? 's' : ''} em aberto, totalizando{' '}
                  <span className="font-bold">{formatCurrency(openComandasStats.totalPending)}</span>{' '}
                  a receber. É importante fazer a gestão e finalização das mesmas.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <FileText size={18} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Faturamento Total
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.total)}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock size={18} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {statusFilter === 'open' ? 'Saldo em Aberto' : 'Total Pendente'}
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(stats.open)}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={18} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Recebido
              </span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.received)}</p>
          </div>
        </div>

        <FilterLine className="mb-6 overflow-x-auto">
  <div className="flex w-full min-w-max items-end gap-3 flex-nowrap">
    <div className="min-w-[320px] max-w-[420px] flex-1">
      <FilterLineSearch
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Buscar paciente, descrição ou item..."
        className="w-full"
      />
    </div>

    <div className="shrink-0">
      <FilterLineDateRange
        from={closedDateFrom}
        to={closedDateTo}
        onFromChange={(val) => setClosedDateFrom(val)}
        onToChange={(val) => setClosedDateTo(val)}
        fromLabel="De"
        toLabel="Até"
      />
    </div>

    <div className="shrink-0 ml-auto flex items-center gap-3">
      <FilterLineSegmented
        value={statusFilter}
        onChange={(val) => {
          setStatusFilter(val as any);
          updatePreference('comandas', { statusFilter: val });
        }}
        options={[
          { value: 'open', label: 'Em aberto' },
          { value: 'closed', label: 'Finalizadas' },
        ]}
        size="sm"
      />
      <FilterLineViewToggle
        value={viewMode}
        onChange={(mode) => {
          setViewMode(mode as any);
          updatePreference('comandas', { viewMode: mode });
        }}
        gridValue="kanban"
        listValue="list"
      />
    </div>
  </div>
</FilterLine>

        {viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredComandas.map((comanda: any) => (
              <div
                key={comanda.id}
                onClick={() => {
                  setHistoryComanda(comanda);
                  setIsHistoryOpen(true);
                }}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 font-bold text-primary-700">
                      {String(comanda.patientName || comanda.patient_name || 'P').charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {comanda.patientName || comanda.patient_name}
                      </p>
                      <p className="text-xs text-slate-400">#{comanda.id}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {hasPermission('manage_payments') && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(comanda);
                          }}
                          className={iconButtonClass}
                          title="Editar"
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(String(comanda.id));
                          }}
                          className={`${iconButtonClass} hover:bg-red-50 hover:text-red-600`}
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mb-4 rounded-xl bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Package size={15} className="text-primary-500" />
                    <span>{comanda.items?.[0]?.name || comanda.description || 'Sem item'}</span>
                  </div>

                  <div className="mb-2 flex justify-between text-xs text-slate-500">
                    <span>Sessões</span>
                    <span>
                      {comanda.sessions_used || 0} / {comanda.sessions_total || 1}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-primary-600"
                      style={{
                        width: `${Math.min(
                          100,
                          ((Number(comanda.sessions_used || 0) /
                            Number(comanda.sessions_total || 1)) *
                            100) || 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Total</p>
                    <p className="text-lg font-bold text-slate-800">
                      {formatCurrency(getComandaTotal(comanda))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Pendente</p>
                    <p className="text-sm font-semibold text-amber-600">
                      {formatCurrency(getComandaPending(comanda))}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Bulk action bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 mb-4 gap-4">
                <span className="text-sm font-semibold text-amber-800">{selectedIds.size} comanda{selectedIds.size > 1 ? 's' : ''} selecionada{selectedIds.size > 1 ? 's' : ''}</span>
                <div className="flex gap-2">
                  <Button variant="softDanger" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => setConfirmBulkDelete(true)}>
                    Excluir selecionadas
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Cancelar</Button>
                </div>
              </div>
            )}

            <GridTable<any>
              data={currentComandas}
              keyExtractor={(c) => c.id}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onRowClick={(c) => { setHistoryComanda(c); setIsHistoryOpen(true); }}
              emptyMessage="Nenhuma comanda encontrada."
              columns={[
                {
                  header: 'ID',
                  render: (c: any) => <span className="text-slate-400 font-mono text-xs">#{c.id}</span>
                },
                {
                  header: 'Paciente',
                  render: (c: any) => (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {String(c.patientName || c.patient_name || 'P').charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-800">{c.patientName || c.patient_name}</span>
                    </div>
                  )
                },
                {
                  header: 'Serviço / Pacote',
                  render: (c: any) => <span className="text-slate-600 text-sm">{c.items?.[0]?.name || c.description || '—'}</span>
                },
                {
                  header: 'Sessões',
                  render: (c: any) => (
                    <div className="flex flex-col">
                      <span className={`font-medium text-sm ${
                        (c.appointments?.length || 0) > (c.sessions_total || 0) ? 'text-red-600' :
                        (c.appointments?.length || 0) === (c.sessions_total || 0) ? 'text-emerald-600' : 'text-slate-700'
                      }`}>
                        {c.sessions_used || 0} / {c.sessions_total || 1}
                      </span>
                      {(c.appointments?.length || 0) > (c.sessions_total || 0) && (
                        <span className="text-[10px] text-red-500 font-bold uppercase">Excedido</span>
                      )}
                    </div>
                  )
                },
                {
                  header: 'Total',
                  render: (c: any) => <span className="font-semibold text-slate-800">{formatCurrency(getComandaTotal(c))}</span>
                },
                {
                  header: 'Recebido',
                  render: (c: any) => <span className="font-semibold text-emerald-600">{formatCurrency(getComandaPaid(c))}</span>
                },
                {
                  header: 'Pendente',
                  render: (c: any) => <span className="font-semibold text-amber-600">{formatCurrency(getComandaPending(c))}</span>
                },
                {
                  header: 'Status',
                  render: (c: any) => <StatusBadge status={c.status} />
                },
                {
                  header: 'Ações',
                  className: 'text-right',
                  headerClassName: 'text-right',
                  render: (c: any) => (
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {hasPermission('manage_payments') && (
                        <>
                          <Button 
                            variant="soft" 
                            size="xs" 
                            iconOnly 
                            onClick={() => handleIncrementSessions(c)} 
                            title="Marcar Realizado (+1)"
                            className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          >
                            <UserCheck size={14} />
                          </Button>
                          <Button variant="outline" size="xs" iconOnly onClick={() => handleOpenModal(c)} title="Editar">
                            <Edit3 size={14} />
                          </Button>
                        </>
                      )}
                      <Button variant="soft" size="xs" iconOnly onClick={() => { setHistoryComanda(c); setIsHistoryOpen(true); }} title="Histórico">
                        <List size={14} />
                      </Button>
                      {hasPermission('manage_payments') && (
                        <Button variant="softDanger" size="xs" iconOnly onClick={() => setDeleteConfirmId(String(c.id))} title="Excluir">
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  )
                }
              ]}
            />

            {/* Pagination */}
            {filteredComandas.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 p-4 bg-white border border-slate-200 rounded-3xl shadow-sm">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>Itens por página:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    {[5, 15, 30, 50].map(limit => (
                      <option key={limit} value={limit}>{limit}</option>
                    ))}
                  </select>
                  <span className="text-slate-400">{filteredComandas.length} total</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-500">
                    Página {currentPage} de {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50 transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50 transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingComanda?.id ? 'Editando Comanda' : 'Criando Comanda'}
        maxWidth="max-w-3xl"
        footer={
          <div className="flex w-full items-center justify-between">
            <Button
              onClick={() => setIsModalOpen(false)}
              variant="outline"
              size="sm"
            >
              FECHAR
            </Button>

            <Button
              onClick={handleSave}
              disabled={saveDisabled}
              variant="primary"
              isLoading={isLoading}
              loadingText={editingComanda?.id ? 'SALVANDO...' : 'CRIANDO...'}
            >
              {editingComanda?.id ? 'SALVAR' : 'CRIAR'}
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

            {/* Vincular ao Livro Caixa */}
            <div
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition cursor-pointer ${
                editingComanda.syncToLivrocaixa
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
              onClick={() =>
                setEditingComanda({
                  ...editingComanda,
                  syncToLivrocaixa: !editingComanda.syncToLivrocaixa,
                })
              }
            >
              <div className="flex flex-col">
                <span className={`text-sm font-semibold ${editingComanda.syncToLivrocaixa ? 'text-emerald-700' : 'text-slate-700'}`}>
                  Vincular ao Livro Caixa
                </span>
                <span className="text-xs text-slate-500 mt-0.5">
                  {editingComanda.syncToLivrocaixa
                    ? 'Esta comanda aparecerá no Livro Caixa (pendente até ser paga)'
                    : 'Ativar para registrar esta comanda no Livro Caixa'}
                </span>
              </div>
              <div
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ${
                  editingComanda.syncToLivrocaixa ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform duration-200 ${
                    editingComanda.syncToLivrocaixa ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </div>
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
                  options={activePatients.map((p: any) => ({ id: p.id, label: normalizePatientName(p) }))}
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
                        startDate: val ?? undefined,
                      })
                    }
                  />
                </div>

                <input
                  type="text"
                  value={formatCurrencyInput(Number(editingComanda.totalValue || 0))}
                  onChange={(e) =>
                    handleMonetaryChange(e.target.value, (v) => 
                      setEditingComanda({
                        ...editingComanda,
                        totalValue: parseMonetaryValue(v),
                      })
                    )
                  }
                  className={compactInputClass}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Nº Atendimentos Total"
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
                  <Input
                    label="Sessões Realizadas"
                    type="number"
                    min={0}
                    value={editingComanda.sessions_used || 0}
                    onChange={(e) =>
                      setEditingComanda({
                        ...editingComanda,
                        sessions_used: Math.max(0, Number(e.target.value || 0)),
                      })
                    }
                  />
                </div>

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
                  options={patients.map((p: any) => ({ id: p.id, label: normalizePatientName(p) }))}
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

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Nº Atendimentos Total"
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
                    <Input
                      label="Sessões Realizadas"
                      type="number"
                      min={0}
                      value={editingComanda.sessions_used || 0}
                      onChange={(e) =>
                        setEditingComanda({
                          ...editingComanda,
                          sessions_used: Math.max(0, Number(e.target.value || 0)),
                        })
                      }
                    />
                  </div>

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
                              handleMonetaryChange(e.target.value, (v) => 
                                updatePackageItem(index, {
                                  price: parseMonetaryValue(v),
                                })
                              )
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
                    className="mt-3 w-full rounded-md border border-primary-400 py-2.5 text-sm font-semibold text-primary-600 transition hover:bg-primary-50"
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
                      handleMonetaryChange(e.target.value, (v) => 
                        setEditingComanda({
                          ...editingComanda,
                          discount_value: parseMonetaryValue(v),
                        })
                      )
                    }
                    className="h-9 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-primary-500"
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

      <ActionDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Gestão de Histórico e Pagamentos"
        subtitle={historyComanda ? `Comanda #${historyComanda.id} • ${historyComanda.patientName || historyComanda.patient_name}` : ''}
        size="xl"
      >
        {historyComanda && (
  <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
    {/* coluna principal */}
    <div className="min-w-0 flex-1 space-y-3">

      {/* topo compacto */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-sm font-bold text-primary-700">
            {String(
              (historyComanda as any).patientName ||
                (historyComanda as any).patient_name ||
                'P'
            ).charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-800">
              {(historyComanda as any).patientName ||
                (historyComanda as any).patient_name}
            </p>
            <p className="text-xs text-slate-400">Comanda #{historyComanda.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleIncrementSessions(historyComanda)}
            title="Marcar Realizado (+1)"
            className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-600 transition hover:bg-emerald-100"
          >
            <UserCheck size={14} />
            <span>REALIZADO</span>
          </button>
          {hasPermission('manage_invoice_issuer') && (
            <button
              onClick={handleGenerateReceipt}
              title="Recibo"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <FileText size={14} />
            </button>
          )}
          <button
            onClick={() => { setIsHistoryOpen(false); handleOpenModal(historyComanda); }}
            title="Editar"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => { setIsHistoryOpen(false); setDeleteConfirmId(String(historyComanda.id)); }}
            title="Excluir"
            className="rounded-lg p-1.5 text-rose-300 transition hover:bg-rose-50 hover:text-rose-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* resumo financeiro compacto */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</p>
          <p className="text-sm font-bold text-slate-800">{formatCurrency(getComandaTotal(historyComanda))}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500">Recebido</p>
          <p className="text-sm font-bold text-emerald-700">{formatCurrency(getComandaPaid(historyComanda))}</p>
        </div>
        <div className="rounded-lg bg-amber-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-500">Pendente</p>
          <p className="text-sm font-bold text-amber-700">{formatCurrency(getComandaPending(historyComanda))}</p>
        </div>
      </div>

      {/* tabs */}
      <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
        {([
          { key: 'atendimentos', label: 'Atendimentos' },
          { key: 'pagamentos', label: 'Pagamentos' },
          { key: 'pacote', label: 'Pacote' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setManagerTab(tab.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              managerTab === tab.key
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* conteúdo das tabs */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {managerTab === 'atendimentos' && (
          <div className="divide-y divide-slate-100">
            {(historyComanda as any).appointments?.map((appointment: any, idx: number) => {
              const statusMap: Record<string, { label: string; color: string }> = {
                scheduled:  { label: 'Agendado',  color: 'bg-blue-100 text-blue-700' },
                completed:  { label: 'Realizado', color: 'bg-emerald-100 text-emerald-700' },
                cancelled:  { label: 'Cancelado', color: 'bg-slate-100 text-slate-500' },
                no_show:    { label: 'Faltou',    color: 'bg-rose-100 text-rose-600' },
                confirmed:  { label: 'Confirmado',color: 'bg-primary-100 text-primary-700' },
              };
              const st = statusMap[appointment.status] || { label: appointment.status, color: 'bg-slate-100 text-slate-500' };
              return (
                <div key={appointment.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="w-5 shrink-0 text-center text-xs font-medium text-slate-400">{idx + 1}</span>
                  <input
                    type="datetime-local"
                    value={new Date(
                      new Date(appointment.start_time || appointment.start_date || appointment.startDate).getTime() -
                        new Date().getTimezoneOffset() * 60000
                    ).toISOString().slice(0, 16)}
                    onChange={(e) => handleUpdateAppointmentDate(appointment.id, e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-primary-400 focus:bg-white"
                  />
                  <select
                    value={appointment.status}
                    onChange={(e) => handleUpdateAppointmentStatus(appointment.id, e.target.value)}
                    className={`shrink-0 rounded-lg border-0 px-2 py-1.5 text-xs font-medium outline-none ${st.color}`}
                  >
                    <option value="scheduled">Agendado</option>
                    <option value="completed">Realizado</option>
                    <option value="cancelled">Cancelado</option>
                    <option value="no_show">Faltou</option>
                  </select>
                </div>
              );
            })}
            {(!(historyComanda as any).appointments ||
              (historyComanda as any).appointments.length === 0) && (
              <div className="flex min-h-[120px] items-center justify-center text-xs text-slate-400">
                Nenhum atendimento vinculado.
              </div>
            )}
          </div>
        )}

        {managerTab === 'pagamentos' && (
          <div className="divide-y divide-slate-100">
            {comandaLivroCaixaTx.map((tx: any) => (
              <div key={`lc-${tx.id}`} className="flex items-center justify-between px-3 py-2.5 bg-indigo-50/50 group">
                <div className="flex items-center gap-2 max-w-[calc(100%-80px)]">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <Check size={13} />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-semibold text-slate-800">
                      {formatCurrency(Number(tx.amount || 0))}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {tx.payment_date ? new Date(tx.payment_date).toLocaleDateString('pt-BR') : '—'} 
                      {tx.created_at ? ` às ${new Date(tx.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''} 
                      · {tx.payment_method || '—'} 
                      {tx.created_by_name ? ` · Por ${tx.created_by_name}` : ''}
                      · <span className={tx.source === 'Agenda' ? 'text-blue-500 font-semibold' : tx.source === 'direct' ? 'text-emerald-500 font-semibold' : 'text-indigo-500 font-semibold'}>
                          {tx.source === 'Agenda' ? 'Agenda' : tx.source === 'direct' ? 'Comanda' : 'Livro Caixa'}
                        </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-indigo-400 group-hover:hidden">Recebido</span>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button onClick={() => {
                        setNewPayment({
                          value: formatCurrencyInput(Number(tx.amount || 0)) || '0,00',
                          date: tx.date ? new Date(tx.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                          method: tx.payment_method || 'Pix',
                          receiptCode: tx.receipt_code || '',
                          comandaId: String(historyComanda?.id),
                          id: String(tx.id)
                        });
                        setIsAddPaymentModalOpen(true);
                      }} 
                      className="p-1 rounded bg-indigo-100 text-indigo-600 hover:bg-indigo-200" title="Editar pagamento">
                      <Edit3 size={12} />
                    </button>
                    <button onClick={() => {
                        if (window.confirm('Tem certeza que deseja remover este pagamento do livro caixa?')) {
                          handleDeletePayment(tx.id);
                        }
                      }} 
                      className="p-1 rounded bg-rose-100 text-rose-600 hover:bg-rose-200" title="Excluir pagamento">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {(!(historyComanda as any).payments || (historyComanda as any).payments.length === 0) &&
              comandaLivroCaixaTx.length === 0 && (
              <div className="flex min-h-[120px] items-center justify-center text-xs text-slate-400">
                Nenhum pagamento registrado.
              </div>
            )}
          </div>
        )}

        {managerTab === 'pacote' && (() => {
          const used = (historyComanda as any).sessions_used || 0;
          const total = (historyComanda as any).sessions_total || 1;
          const remaining = Math.max(0, total - used);
          const over = used > total;
          const pct = Math.min(100, (used / total) * 100);
          const items: any[] = (historyComanda as any).items || [];
          const apts: any[] = (historyComanda as any).appointments || [];
          const aptLabels: Record<string, string> = {
            completed: 'Realizado', no_show: 'Faltou',
            cancelled: 'Cancelado', scheduled: 'Agendado', confirmed: 'Confirmado',
          };
          const aptColors: Record<string, string> = {
            completed: 'bg-emerald-100 text-emerald-700',
            no_show:   'bg-rose-100 text-rose-600',
            cancelled: 'bg-slate-100 text-slate-400',
            scheduled: 'bg-blue-100 text-blue-600',
            confirmed: 'bg-primary-100 text-primary-600',
          };
          return (
            <div className="divide-y divide-slate-100">
              {/* tabela de uso do pacote */}
              <div className="px-3 py-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Uso do Pacote</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      <th className="pb-1.5 text-left">Serviço</th>
                      <th className="pb-1.5 text-center">Quantidade</th>
                      <th className="pb-1.5 text-center">Utilizados</th>
                      <th className="pb-1.5 text-center">Restante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length > 0 ? items.map((item: any, idx: number) => {
                      const itemQty = Number(item.qty || 0);
                      const itemUsed = idx === 0 ? used : 0;
                      const itemRem = Math.max(0, itemQty - itemUsed);
                      const itemOver = itemUsed > itemQty;
                      return (
                        <tr key={item.id || idx} className="border-b border-slate-50">
                          <td className="py-2 font-medium text-slate-700">{item.name}</td>
                          <td className="py-2 text-center text-slate-600">{itemQty}</td>
                          <td className="py-2 text-center font-semibold text-slate-800">{itemUsed}</td>
                          <td className="py-2 text-center">
                            {itemOver ? (
                              <span className="rounded-md bg-rose-100 px-1.5 py-0.5 font-bold text-rose-600">
                                Excedido {itemUsed - itemQty}
                              </span>
                            ) : itemRem === 0 ? (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-400">Completo</span>
                            ) : (
                              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-700">
                                Faltam {itemRem}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td className="py-2 font-medium text-slate-700">
                          {(historyComanda as any).service_name || (historyComanda as any).package_name || 'Serviço'}
                        </td>
                        <td className="py-2 text-center text-slate-600">{total}</td>
                        <td className="py-2 text-center font-semibold text-slate-800">{used}</td>
                        <td className="py-2 text-center">
                          {over ? (
                            <span className="rounded-md bg-rose-100 px-1.5 py-0.5 font-bold text-rose-600">Excedido {used - total}</span>
                          ) : remaining === 0 ? (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-400">Completo</span>
                          ) : (
                            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-700">Faltam {remaining}</span>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {/* barra de progresso */}
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                    <span>{used} de {total} sessões usadas</span>
                    <span>{Math.round(pct)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${over ? 'bg-rose-500' : 'bg-primary-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* detalhe dos atendimentos */}
              {apts.length > 0 && (
                <div className="px-3 py-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Detalhe das Sessões</p>
                  <div className="flex flex-wrap gap-1.5">
                    {apts.map((apt: any, i: number) => (
                      <span
                        key={apt.id || i}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ${aptColors[apt.status] || aptColors.scheduled}`}
                      >
                        <span className="font-bold">#{i + 1}</span>
                        <span>·</span>
                        <span>{new Date(apt.start_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                        <span>·</span>
                        <span>{aptLabels[apt.status] || apt.status}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>

    {/* lateral direita */}
    <aside className="w-full shrink-0 space-y-3 xl:w-56 xl:sticky xl:top-0 xl:self-start">
      <div className="rounded-xl bg-primary-600 p-4 text-white shadow-md shadow-primary-100">
        <p className="text-[10px] uppercase tracking-wider text-primary-200">Valor total</p>
        <p className="mt-0.5 text-xl font-bold">{formatCurrency(getComandaTotal(historyComanda))}</p>
        <div className="mt-3 space-y-1.5 border-t border-primary-500 pt-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-primary-200">Recebido</span>
            <strong>{formatCurrency(getComandaPaid(historyComanda))}</strong>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white/10 px-2 py-1">
            <span className="text-primary-200">Pendente</span>
            <strong>{formatCurrency(getComandaPending(historyComanda))}</strong>
          </div>
        </div>
        {hasPermission('process_payments') && (
          <button
            onClick={() => {
              setNewPayment({
                value: formatCurrencyInput(getComandaPending(historyComanda)) || '0,00',
                date: new Date().toISOString().slice(0, 10),
                method: 'Pix',
                receiptCode: '',
                comandaId: String(historyComanda.id)
              });
              setIsAddPaymentModalOpen(true);
            }}
            className="mt-3 w-full rounded-lg bg-white py-1.5 text-xs font-semibold text-primary-600 transition hover:bg-primary-50"
          >
            + Novo pagamento
          </button>
        )}
      </div>

      {(historyComanda as any).items?.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Itens</p>
          <div className="space-y-2">
            {(historyComanda as any).items.map((item: any, index: number) => (
              <div key={item.id || index} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-700">{item.name}</p>
                  <p className="text-[11px] text-slate-400">{item.qty} × {formatCurrency(item.price)}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-slate-700">
                  {formatCurrency(Number(item.qty || 0) * Number(item.price || 0))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  </div>
)}
      </ActionDrawer>

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
              variant="success"
              className="px-6"
            >
              Efetivar pagamento
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <Field label="Valor do pagamento">
            <input
              value={newPayment.value}
              onChange={(e) =>
                handleMonetaryChange(e.target.value, (v) => 
                  setNewPayment(prev => ({ ...prev, value: v }))
                )
              }
              placeholder="0,00"
              className={compactInputClass}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest ml-1">Data</label>
              <DatePicker
                value={newPayment.date}
                onChange={(val) =>
                  setNewPayment((prev) => ({ ...prev, date: val || '' }))
                }
              />
            </div>

            <Field label="Método">
              <select
                value={newPayment.method}
                onChange={(e) =>
                  setNewPayment((prev) => ({ ...prev, method: e.target.value }))
                }
                className={compactInputClass}
              >
                <option value="Pix">Pix</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Débito">Débito</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Boleto">Boleto</option>
              </select>
            </Field>
          </div>

          <Field label="Código de transação / comprovante">
            <input
              value={newPayment.receiptCode}
              onChange={(e) =>
                setNewPayment((prev) => ({ ...prev, receiptCode: e.target.value }))
              }
              placeholder="Ex: 123ABC..."
              className={compactInputClass}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Exclusão de Registro"
        footer={
          <div className="flex w-full items-center justify-between">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
            >
              Manter registro
            </button>
            <button
              onClick={handleConfirmDelete}
              className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Excluir registro
            </button>
          </div>
        }
      >
        <div className="py-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <AlertTriangle size={30} />
          </div>
          <p className="text-base font-semibold text-slate-800">Atenção</p>
          <p className="mt-2 text-sm text-slate-500">
            Esta comanda e seus vínculos financeiros serão removidos permanentemente.
          </p>
        </div>
      </Modal>

      {/* BULK DELETE CONFIRM */}
      <Modal
        isOpen={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        title="Excluir Selecionadas"
        maxWidth="sm"
        footer={
          <div className="flex w-full items-center justify-between">
            <button
              onClick={() => setConfirmBulkDelete(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleBulkDelete}
              className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Excluir {selectedIds.size} comanda{selectedIds.size > 1 ? 's' : ''}
            </button>
          </div>
        }
      >
        <div className="py-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <AlertTriangle size={30} />
          </div>
          <p className="text-base font-semibold text-slate-800">Atenção</p>
          <p className="mt-2 text-sm text-slate-500">
            Você irá excluir permanentemente <strong>{selectedIds.size}</strong> comanda{selectedIds.size > 1 ? 's' : ''}.<br />
            Esta ação não pode ser desfeita.
          </p>
        </div>
      </Modal>

      {/* MODAL DE IMPORTAÇÃO */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => { setIsImportOpen(false); setImportRows([]); setImportResult(null); }}
        title="Importar Comandas"
        maxWidth="5xl"
        footer={
          importResult ? (
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span><strong className="text-emerald-700">{importResult.created}</strong> importada(s){importResult.errors.length > 0 && <span className="ml-2 text-rose-500">· {importResult.errors.length} erro(s)</span>}</span>
              </div>
              <button onClick={() => setIsImportOpen(false)} className="rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700">Fechar</button>
            </div>
          ) : importRows.length > 0 ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{importRows.length} linha(s)</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                  {importRows.filter(r => r.sessions_used >= r.sessions_total).length} finalizadas
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                  {importRows.filter(r => r.sessions_used < r.sessions_total).length} abertas
                </span>
              </div>
              <button onClick={handleImport} disabled={importLoading} className="rounded-xl bg-primary-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50">
                {importLoading ? 'Importando...' : `Importar ${importRows.length} comanda(s)`}
              </button>
            </div>
          ) : null
        }
      >
        <div className="flex flex-col gap-4">

          {/* upload — sempre visível para trocar arquivo */}
          {!importResult && (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-4 transition hover:border-primary-400 hover:bg-primary-50/50">
              <Upload size={22} className="shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-700">
                  {importRows.length > 0 ? 'Trocar arquivo' : 'Selecionar arquivo CSV ou Excel (.xlsx)'}
                </p>
                <p className="truncate text-xs text-slate-400">
                  Colunas: Descrição · Paciente · Data · N. Atendimentos · Total · Total Pago
                </p>
              </div>
              {importRows.length > 0 && (
                <span className="shrink-0 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-600">
                  {importRows.length} linhas
                </span>
              )}
              <input type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) parseCsvFile(f); e.target.value = ''; }}
              />
            </label>
          )}

          {/* tabela de preview */}
          {importRows.length > 0 && !importResult && (() => {
            const allSelected = importSelectedIds.size === importRows.length && importRows.length > 0;
            const someSelected = importSelectedIds.size > 0;
            const toggleAll = () => {
              if (allSelected) setImportSelectedIds(new Set());
              else setImportSelectedIds(new Set(importRows.map((_, i) => i)));
            };
            const toggleOne = (i: number) => {
              setImportSelectedIds(prev => {
                const next = new Set(prev);
                next.has(i) ? next.delete(i) : next.add(i);
                return next;
              });
            };
            const deleteSelected = () => {
              setImportRows(prev => prev.filter((_, i) => !importSelectedIds.has(i)));
              setImportSelectedIds(new Set());
            };

            return (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                {/* barra de ações em lote */}
                {someSelected && (
                  <div className="flex items-center justify-between bg-primary-50 px-4 py-2.5 border-b border-primary-100">
                    <span className="text-xs font-semibold text-primary-700">
                      {importSelectedIds.size} linha(s) selecionada(s)
                    </span>
                    <button
                      onClick={deleteSelected}
                      className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600"
                    >
                      <Trash2 size={12} /> Remover selecionadas
                    </button>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="w-10 px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                            onChange={toggleAll}
                            className="h-3.5 w-3.5 cursor-pointer rounded accent-primary-600"
                          />
                        </th>
                        {['Descrição', 'Paciente', 'Data', 'Sessões', 'Total', 'Pago', 'Status', ''].map((h, i) => (
                          <th key={i} className={`px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 ${
                            i >= 4 && i <= 5 ? 'text-right' : i === 3 || i === 6 ? 'text-center' : 'text-left'
                          }`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importRows.map((r, i) => {
                        const closed = r.sessions_used >= r.sessions_total;
                        const selected = importSelectedIds.has(i);
                        return (
                          <tr
                            key={i}
                            onClick={() => toggleOne(i)}
                            className={`cursor-pointer transition ${selected ? 'bg-primary-50/70' : 'hover:bg-slate-50/80'}`}
                          >
                            <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleOne(i)}
                                className="h-3.5 w-3.5 cursor-pointer rounded accent-primary-600"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">{r.description || '—'}</td>
                            <td className="px-3 py-2.5 font-medium text-slate-800">{r.client_name}</td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{r.date}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                closed ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                              }`}>
                                {r.sessions_used}<span className="opacity-40">/</span>{r.sessions_total}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-right text-slate-700">{formatCurrency(r.total)}</td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-emerald-700">{formatCurrency(r.paid)}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                closed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-600'
                              }`}>
                                {closed ? 'Finalizada' : 'Aberta'}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => setImportRows(prev => prev.filter((_, idx) => idx !== i))}
                                title="Remover esta linha"
                                className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* resultado */}
          {importResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                  <CheckCircle2 size={20} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-800">{importResult.created} comanda(s) importada(s) com sucesso!</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Pacientes novos foram criados automaticamente.</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="mb-2 text-xs font-semibold text-rose-700">Erros ({importResult.errors.length}):</p>
                  <ul className="space-y-1 text-xs text-rose-600">
                    {importResult.errors.map((e: any, i: number) => (
                      <li key={i} className="flex gap-2"><span className="shrink-0">•</span><span><strong>{e.row}</strong>: {e.error}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
