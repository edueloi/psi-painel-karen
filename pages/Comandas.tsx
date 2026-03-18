import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, getStaticUrl } from '../services/api';
import { Comanda, Patient, Service } from '../types';
import { Modal } from '../components/UI/Modal';
import { DatePicker } from '../components/UI/DatePicker';
import { Button } from '../components/UI/Button';
import { Input, Select, TextArea, Combobox } from '../components/UI/Input';
import { FilterLine, FilterLineSection, FilterLineItem, FilterLineSegmented, FilterLineSearch, FilterLineViewToggle } from '../components/UI/FilterLine';

import { useUserPreferences } from '../contexts/UserPreferencesContext';
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

type EditableComanda = Partial<Comanda> & {
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
  'w-full h-10 bg-transparent border-0 border-b border-slate-300 px-0 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-600 focus:outline-none';

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const compactInputClass =
  'w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none';

const iconButtonClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-violet-600';

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
          active ? 'border-violet-600' : 'border-slate-500'
        }`}
      >
        {active && <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />}
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

  const [toasts, setToasts] = useState<
    { id: number; type: 'success' | 'error'; message: string }[]
  >([]);

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
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ComandaTab>('avulsa');
  const [editingComanda, setEditingComanda] = useState<EditableComanda | null>(
    null
  );

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyComanda, setHistoryComanda] = useState<Comanda | null>(null);
  const [managerTab, setManagerTab] = useState<
    'atendimentos' | 'pagamentos' | 'pacote'
  >('atendimentos');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    value: '',
    date: new Date().toISOString().slice(0, 10),
    method: 'Pix',
    receiptCode: '',
  });

  const pushToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((toast) => toast.id !== id)),
      3000
    );
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value || 0));

  const formatCurrencyInput = (value?: number) => {
    if (value === undefined || value === null) return '';
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  };

  const parseMonetaryValue = (val: string) => {
    if (!val) return 0;
    // Captura apenas dígitos
    const digits = val.replace(/\D/g, '');
    if (!digits) return 0;
    // Divide por 100 para transformar centavos em decimal real para o estado
    return parseFloat(digits) / 100;
  };

  const normalizePatientName = (patient: any) =>
    patient?.full_name || patient?.name || 'Sem nome';

  const getComandaTotal = (c: any) =>
    Number(c?.totalValue || c?.total || 0) || 0;

  const getComandaPaid = (c: any) => Number(c?.paidValue || 0) || 0;

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
  }, []);

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

  const filteredComandas = useMemo(() => {
    return comandas.filter((c: any) => {
      const patientName = String(c.patientName || c.patient_name || '').toLowerCase();
      const description = String(c.description || '').toLowerCase();
      const firstItem = String(c.items?.[0]?.name || '').toLowerCase();

      const matchesSearch =
        patientName.includes(searchTerm.toLowerCase()) ||
        description.includes(searchTerm.toLowerCase()) ||
        firstItem.includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (statusFilter !== c.status) return false;

      if (statusFilter === 'closed') {
        const refDate = new Date(c.updated_at || c.createdAt || c.created_at || new Date());
        const now = new Date();

        if (dateRangeFilter === 'today') {
          return refDate.toDateString() === now.toDateString();
        }

        if (dateRangeFilter === 'month') {
          return (
            refDate.getMonth() === now.getMonth() &&
            refDate.getFullYear() === now.getFullYear()
          );
        }

        if (dateRangeFilter === 'year') {
          return refDate.getFullYear() === now.getFullYear();
        }
      }

      return true;
    });
  }, [comandas, searchTerm, statusFilter, dateRangeFilter]);

  const stats = useMemo(() => {
    const total = comandas.reduce((acc, c: any) => acc + getComandaTotal(c), 0);
    const open = comandas
      .filter((c: any) => c.status === 'open')
      .reduce((acc, c: any) => acc + getComandaPending(c), 0);
    const received = comandas.reduce((acc, c: any) => acc + getComandaPaid(c), 0);

    return { total, open, received };
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
        status: editingComanda.status || 'open',
        start_date: editingComanda.startDate,
        package_id: isPackage && editingComanda.packageId ? String(editingComanda.packageId) : null,
        items: itemsPayload,
        skip_appointment: isPackage,
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

  const handleUpdateAppointmentStatus = async (
    appointmentId: string,
    newStatus: string
  ) => {
    try {
      await api.put(`/appointments/${appointmentId}`, { status: newStatus });
      await fetchData();

      if (historyComanda) {
        const refreshed = await api.get<Comanda[]>('/finance/comandas');
        const updated = refreshed.find((c) => String(c.id) === String(historyComanda.id));
        if (updated) setHistoryComanda(updated);
      }

      pushToast('success', 'Status atualizado.');
    } catch (error) {
      console.error(error);
      pushToast('error', 'Erro ao atualizar status.');
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
      };

      await api.post(`/finance/comandas/${historyComanda.id}/payments`, payload);

      pushToast('success', 'Pagamento registrado!');
      setIsAddPaymentModalOpen(false);
      setNewPayment({
        value: '',
        date: new Date().toISOString().slice(0, 10),
        method: 'Pix',
        receiptCode: '',
      });

      await fetchData();

      const refreshed = await api.get<Comanda[]>('/finance/comandas');
      const updated = refreshed.find((c) => String(c.id) === String(historyComanda.id));
      if (updated) setHistoryComanda(updated);
    } catch (error) {
      console.error(error);
      pushToast('error', 'Erro ao registrar pagamento.');
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
      {toasts.length > 0 && (
        <div className="fixed right-5 top-5 z-[80] space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`rounded-xl border px-4 py-3 text-sm shadow-xl ${
                toast.type === 'success'
                  ? 'border-emerald-100 bg-white text-emerald-700'
                  : 'border-red-100 bg-white text-red-700'
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Gestão de Comandas</h1>
              <p className="text-xs text-slate-400">Controle financeiro, pacotes e sessões</p>
            </div>
          </div>

          <Button
            onClick={() => handleOpenModal()}
            leftIcon={<Plus size={16} />}
            variant="primary"
            radius="xl"
            className="shadow-lg shadow-violet-200"
          >
            Nova comanda
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-6 py-6">
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
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
                Saldo em Aberto
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

        <FilterLine className="mb-6">
          <FilterLineSection align="left" grow>
            <FilterLineSearch
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar paciente, descrição ou item..."
              className="xl:max-w-[420px]"
            />
          </FilterLineSection>

          <FilterLineSection align="right">
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

            {statusFilter === 'closed' && (
              <FilterLineSegmented
                value={dateRangeFilter}
                onChange={(range) => {
                  setDateRangeFilter(range as DateRangeFilter);
                  updatePreference('comandas', { dateRangeFilter: range });
                }}
                options={[
                  { value: 'month', label: 'Mês' },
                  { value: 'year', label: 'Ano' },
                  { value: 'all', label: 'Tudo' },
                ]}
                size="sm"
              />
            )}

            <FilterLineViewToggle
              value={viewMode}
              onChange={(mode) => {
                setViewMode(mode as any);
                updatePreference('comandas', { viewMode: mode });
              }}
              gridValue="kanban"
              listValue="list"
            />
          </FilterLineSection>
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
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 font-bold text-violet-700">
                      {String(comanda.patientName || comanda.patient_name || 'P').charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {comanda.patientName || comanda.patient_name}
                      </p>
                      <p className="text-xs text-slate-400">#{comanda.id}</p>
                    </div>
                  </div>

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
                </div>

                <div className="mb-4 rounded-xl bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Package size={15} className="text-violet-500" />
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
                      className="h-full rounded-full bg-violet-600"
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
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4">ID</th>
                    <th className="px-5 py-4">Paciente</th>
                    <th className="px-5 py-4">Serviço / Pacote</th>
                    <th className="px-5 py-4">Sessões</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Recebido</th>
                    <th className="px-5 py-4">Pendente</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComandas.map((comanda: any) => (
                    <tr
                      key={comanda.id}
                      onClick={() => {
                        setHistoryComanda(comanda);
                        setIsHistoryOpen(true);
                      }}
                      className="cursor-pointer border-b border-slate-100 text-sm transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 text-slate-400">#{comanda.id}</td>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {comanda.patientName || comanda.patient_name}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {comanda.items?.[0]?.name || comanda.description || '—'}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <div className="flex flex-col">
                          <span className={cx(
                            "font-medium",
                            (comanda.appointments?.length || 0) > (comanda.sessions_total || 0) 
                              ? "text-red-600" 
                              : (comanda.appointments?.length || 0) === (comanda.sessions_total || 0)
                                ? "text-emerald-600"
                                : "text-slate-700"
                          )}>
                            {comanda.sessions_used || 0} / {comanda.sessions_total || 1}
                          </span>
                          {(comanda.appointments?.length || 0) > (comanda.sessions_total || 0) && (
                            <span className="text-[10px] text-red-500 font-bold uppercase">Excedido</span>
                          )}
                          {(comanda.appointments?.length || 0) < (comanda.sessions_total || 1) && (comanda.appointments?.length || 0) > (comanda.sessions_used || 0) && (
                            <span className="text-[10px] text-amber-500 font-medium whitespace-nowrap">
                              {comanda.appointments.length} agendados
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {formatCurrency(getComandaTotal(comanda))}
                      </td>
                      <td className="px-5 py-4 font-semibold text-emerald-600">
                        {formatCurrency(getComandaPaid(comanda))}
                      </td>
                      <td className="px-5 py-4 font-semibold text-amber-600">
                        {formatCurrency(getComandaPending(comanda))}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={comanda.status} />
                      </td>
                      <td
                        className="px-5 py-4"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="xs"
                            iconOnly
                            onClick={() => handleOpenModal(comanda)}
                            title="Editar"
                          >
                            <Edit3 size={14} />
                          </Button>

                          <Button
                            variant="soft"
                            size="xs"
                            iconOnly
                            onClick={() => {
                              setHistoryComanda(comanda);
                              setIsHistoryOpen(true);
                            }}
                            title="Histórico de pagamentos"
                          >
                            <CheckCircle2 size={14} />
                          </Button>

                          <Button
                            variant="softDanger"
                            size="xs"
                            iconOnly
                            onClick={() => setDeleteConfirmId(String(comanda.id))}
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!isLoading && filteredComandas.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center text-sm text-slate-400">
                        Nenhuma comanda encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
                    className="mt-3 w-full rounded-md border border-violet-400 py-2.5 text-sm font-semibold text-violet-600 transition hover:bg-violet-50"
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
                    className="h-9 rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-violet-500"
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

      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Gestão de Histórico e Pagamentos"
        maxWidth="max-w-5xl"
      >
        {historyComanda && (
          <div className="grid grid-cols-1 gap-6 py-2 lg:grid-cols-[1.6fr_0.9fr]">
            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 font-bold text-violet-700">
                    {String(
                      (historyComanda as any).patientName ||
                        (historyComanda as any).patient_name ||
                        'P'
                    ).charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {(historyComanda as any).patientName ||
                        (historyComanda as any).patient_name}
                    </p>
                    <p className="text-xs text-slate-400">#{historyComanda.id}</p>
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
                      setIsHistoryOpen(false);
                      handleOpenModal(historyComanda);
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
                        ? 'bg-white text-violet-600 shadow-sm'
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
                    {(historyComanda as any).appointments?.map((appointment: any) => (
                      <div
                        key={appointment.id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                            <CalendarDays size={18} />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">
                              {new Date(
                                appointment.start_time || appointment.start_date || appointment.startDate
                              ).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="text-xs text-slate-400">
                              {new Date(
                                appointment.start_time || appointment.start_date || appointment.startDate
                              ).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>

                        <select
                          value={appointment.status}
                          onChange={(e) =>
                            handleUpdateAppointmentStatus(appointment.id, e.target.value)
                          }
                          className={compactInputClass}
                        >
                          <option value="scheduled">Agendado</option>
                          <option value="completed">Concluído</option>
                          <option value="cancelled">Cancelado</option>
                          <option value="no_show">Faltou</option>
                        </select>
                      </div>
                    ))}

                    {(!(historyComanda as any).appointments ||
                      (historyComanda as any).appointments.length === 0) && (
                      <div className="py-10 text-center text-sm text-slate-400">
                        Nenhum atendimento vinculado.
                      </div>
                    )}
                  </div>
                )}

                {managerTab === 'pagamentos' && (
                  <div className="space-y-3">
                    {(historyComanda as any).payments?.map((payment: any) => (
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
                              {new Date(payment.payment_date).toLocaleDateString('pt-BR')} •{' '}
                              {payment.payment_method}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-400">
                          #{payment.receipt_code || '---'}
                        </span>
                      </div>
                    ))}

                    {(!(historyComanda as any).payments ||
                      (historyComanda as any).payments.length === 0) && (
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
                      ((historyComanda as any).appointments?.length || 0) > ((historyComanda as any).sessions_total || 0)
                        ? "text-red-600"
                        : "text-violet-600"
                    )}>
                      {(historyComanda as any).sessions_used || 0} /{' '}
                      {(historyComanda as any).sessions_total || 1}
                    </div>
                    {((historyComanda as any).appointments?.length || 0) > ((historyComanda as any).sessions_total || 0) && (
                      <div className="mb-2 text-xs font-bold text-red-500 uppercase">
                        {(historyComanda as any).appointments.length} agendamentos no total (excede o pacote)
                      </div>
                    )}
                    <div className="mb-4 text-sm text-slate-500">
                      Atendimentos consumidos
                    </div>
                    <div className="h-3 w-full max-w-md overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-violet-600"
                        style={{
                          width: `${Math.min(
                            100,
                            (((historyComanda as any).sessions_used || 0) /
                              ((historyComanda as any).sessions_total || 1)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl bg-violet-600 p-5 text-white shadow-lg shadow-violet-200">
                <p className="mb-1 text-xs uppercase tracking-wider text-violet-100">
                  Valor total
                </p>
                <p className="mb-4 text-3xl font-bold">
                  {formatCurrency(getComandaTotal(historyComanda))}
                </p>

                <div className="space-y-2 border-t border-violet-400 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Recebido</span>
                    <strong>{formatCurrency(getComandaPaid(historyComanda))}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-sm">
                    <span>Pendente</span>
                    <strong>{formatCurrency(getComandaPending(historyComanda))}</strong>
                  </div>
                </div>

                <Button
                  onClick={() => setIsAddPaymentModalOpen(true)}
                  variant="primary"
                  fullWidth
                  className="mt-4 bg-white !text-violet-600 hover:bg-violet-50"
                  size="lg"
                >
                  Novo pagamento
                </Button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h4 className="mb-4 text-sm font-semibold text-slate-700">Itens cobrados</h4>
                <div className="space-y-3">
                  {(historyComanda as any).items?.map((item: any, index: number) => (
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

                  {(!(historyComanda as any).items ||
                    (historyComanda as any).items.length === 0) && (
                    <p className="text-sm text-slate-400">Nenhum item registrado.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

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
                setNewPayment((prev) => ({ ...prev, value: e.target.value }))
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
    </div>
  );
};
