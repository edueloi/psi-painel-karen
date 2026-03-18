import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_SERVICES, MOCK_PACKAGES } from '../constants';
import { Service, ServicePackage, ServicePackageItem } from '../types';
import {
  Briefcase,
  Search,
  Plus,
  Edit3,
  Trash2,
  Clock,
  DollarSign,
  Tag,
  Package,
  Layers,
  AlertCircle,
  Download,
  FileUp,
  FileDown,
  Palette,
  CheckCircle2,
} from 'lucide-react';
import { api, API_BASE_URL } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { Modal } from '../components/UI/Modal';
import { Input, Select, TextArea, Combobox } from '../components/UI/Input';
import {
  FilterLine,
  FilterLineSection,
  FilterLineItem,
  FilterLineSearch,
  FilterLineSegmented,
} from '../components/UI/FilterLine';
import { Button } from '../components/UI/Button';
import { StatusAlert } from '../components/UI/StatusAlert';
import { useToast } from '../contexts/ToastContext';

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

const CurrencyInput: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
  hint?: string;
}> = ({ label, value, onChange, hint }) => {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
    setDisplayValue(formatted);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    const num = parseInt(digits || '0', 10) / 100;

    setDisplayValue(
      new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num)
    );

    onChange(num);
  };

  return (
    <Input
      label={label}
      value={displayValue}
      onChange={handleChange}
      prefix="R$"
      hint={hint}
    />
  );
};

export const Services: React.FC = () => {
  const { t, language } = useLanguage();
  const { pushToast } = useToast();

  const [activeTab, setActiveTab] = useState<'services' | 'packages'>('services');
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [packages, setPackages] = useState<ServicePackage[]>(MOCK_PACKAGES);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [editingPackage, setEditingPackage] = useState<Partial<ServicePackage> | null>(null);
  const [deleteId, setDeleteId] = useState<{ id: string; type: 'service' | 'package' } | null>(null);

  const [packageServiceToAdd, setPackageServiceToAdd] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [srvs, pkgs] = await Promise.allSettled([
          api.get<Service[]>('/services'),
          api.get<ServicePackage[]>('/packages'),
        ]);

        if (srvs.status === 'fulfilled') setServices(srvs.value || MOCK_SERVICES);
        if (pkgs.status === 'fulfilled') setPackages(pkgs.value || MOCK_PACKAGES);
      } catch (e) {
        console.error('Erro ao buscar serviços/pacotes:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value || 0));
  };

  const filteredServices = useMemo(
    () =>
      services.filter(
        (service) =>
          (service.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (service.category || '').toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [services, searchTerm]
  );

  const filteredPackages = useMemo(
    () =>
      packages.filter((pkg) =>
        (pkg.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [packages, searchTerm]
  );

  const stats = useMemo(
    () => ({
      totalServices: services.length,
      totalPackages: packages.length,
      avgPrice: services.length
        ? services.reduce((acc, service) => acc + (Number(service.price) || 0), 0) / services.length
        : 0,
    }),
    [services, packages]
  );

  const serviceOptions = useMemo(
    () =>
      services.map((service) => ({
        id: String(service.id),
        label: service.name,
      })),
    [services]
  );

  const handleOpenServiceModal = (service?: Service) => {
    setEditingService(
      service || {
        duration: 50,
        color: '#6366f1',
        modality: 'presencial',
        category: t('services.category.general'),
        price: 0,
        cost: 0,
        description: '',
      }
    );
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async () => {
    if (!editingService?.name) {
      pushToast('warning', 'Nome obrigatório', 'Informe o nome do serviço.');
      return;
    }

    try {
      const payload = {
        ...editingService,
        price: Number(editingService.price) || 0,
        cost: Number(editingService.cost) || 0,
        duration: Number(editingService.duration) || 50,
      };

      if (editingService.id) {
        const updated = await api.put<Service>(`/services/${editingService.id}`, payload);
        setServices((prev) => prev.map((service) => (service.id === updated.id ? updated : service)));
      } else {
        const saved = await api.post<Service>('/services', payload);
        setServices((prev) => [saved, ...prev]);
      }

      setIsServiceModalOpen(false);
      pushToast('success', 'Serviço salvo com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar serviço:', err);
      pushToast('error', 'Erro ao salvar serviço.', 'Verifique os dados e tente novamente.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      if (deleteId.type === 'service') {
        await api.delete(`/services/${deleteId.id}`);
        setServices((prev) => prev.filter((service) => service.id !== deleteId.id));
      } else {
        await api.delete(`/packages/${deleteId.id}`);
        setPackages((prev) => prev.filter((pkg) => pkg.id !== deleteId.id));
      }

      setDeleteId(null);
      pushToast('success', 'Excluído com sucesso!');
    } catch (err) {
      console.error('Erro ao deletar:', err);
      pushToast('error', 'Erro ao excluir item.');
    }
  };

  const handleOpenPackageModal = (pkg?: ServicePackage) => {
    setEditingPackage(
      pkg || {
        items: [],
        discountType: 'percentage',
        discountValue: 0,
        totalPrice: 0,
        description: '',
      }
    );
    setPackageServiceToAdd('');
    setIsPackageModalOpen(true);
  };

  const calculatePackageTotal = (
    items: ServicePackageItem[],
    discountType: 'percentage' | 'fixed',
    discountValue: number
  ) => {
    const subtotal = items.reduce((acc, item) => {
      const service = services.find((srv) => String(srv.id) === String(item.serviceId));
      return acc + (service ? Number(service.price || 0) * Number(item.quantity || 0) : 0);
    }, 0);

    let final = subtotal;

    if (discountType === 'percentage') {
      final = subtotal - subtotal * (discountValue / 100);
    } else {
      final = subtotal - discountValue;
    }

    return Math.max(0, final);
  };

  const handlePackageItemChange = (items: ServicePackageItem[]) => {
    if (!editingPackage) return;

    const total = calculatePackageTotal(
      items,
      editingPackage.discountType || 'percentage',
      Number(editingPackage.discountValue || 0)
    );

    setEditingPackage({
      ...editingPackage,
      items,
      totalPrice: total,
    });
  };

  const handlePackageDiscountChange = (
    type: 'percentage' | 'fixed',
    value: number
  ) => {
    if (!editingPackage) return;

    const total = calculatePackageTotal(
      editingPackage.items || [],
      type,
      value
    );

    setEditingPackage({
      ...editingPackage,
      discountType: type,
      discountValue: value,
      totalPrice: total,
    });
  };

  const handleAddServiceToPackage = () => {
    if (!editingPackage || !packageServiceToAdd) return;

    const nextItems = [...(editingPackage.items || [])];
    const existing = nextItems.find(
      (item) => String(item.serviceId) === String(packageServiceToAdd)
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      nextItems.push({
        serviceId: packageServiceToAdd,
        quantity: 1,
      });
    }

    handlePackageItemChange(nextItems);
    setPackageServiceToAdd('');
  };

  const handleSavePackage = async () => {
    if (!editingPackage?.name) {
      pushToast('warning', 'Nome obrigatório', 'Informe o nome do pacote.');
      return;
    }

    if (!editingPackage.items?.length) {
      pushToast('warning', 'Pacote vazio', 'Adicione ao menos um serviço ao pacote.');
      return;
    }

    try {
      const payload = {
        ...editingPackage,
        totalPrice: Number(editingPackage.totalPrice) || 0,
        discountValue: Number(editingPackage.discountValue) || 0,
      };

      if (editingPackage.id) {
        const updated = await api.put<ServicePackage>(`/packages/${editingPackage.id}`, payload);
        setPackages((prev) => prev.map((pkg) => (pkg.id === updated.id ? updated : pkg)));
      } else {
        const saved = await api.post<ServicePackage>('/packages', payload);
        setPackages((prev) => [saved, ...prev]);
      }

      setIsPackageModalOpen(false);
      pushToast('success', 'Pacote salvo com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar pacote:', err);
      pushToast('error', 'Erro ao salvar pacote.', 'Verifique os dados e tente novamente.');
    }
  };

  const handleExportTemplate = async () => {
    try {
      const endpoint =
        activeTab === 'services'
          ? '/services/export-template'
          : '/packages/export-template';

      const filename =
        activeTab === 'services'
          ? 'modelo_importacao_servicos.xlsx'
          : 'modelo_importacao_pacotes.xlsx';

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('psi_token')}`,
        },
      });

      if (!response.ok) throw new Error(`Erro no servidor: ${response.status}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();

      pushToast('success', 'Modelo baixado com sucesso!');
    } catch (err) {
      console.error('Erro ao baixar modelo:', err);
      pushToast('error', 'Erro ao baixar modelo.');
    }
  };

  const handleExportData = async () => {
    try {
      const endpoint = activeTab === 'services' ? '/services/export' : '/packages/export';
      const filename =
        activeTab === 'services'
          ? 'servicos_exportados.xlsx'
          : 'pacotes_exportados.xlsx';

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('psi_token')}`,
        },
      });

      if (!response.ok) throw new Error(`Erro no servidor: ${response.status}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();

      pushToast('success', 'Exportação concluída!');
    } catch (err) {
      console.error('Erro ao exportar:', err);
      pushToast('error', 'Erro ao exportar dados.');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const endpoint = activeTab === 'services' ? '/services/import' : '/packages/import';
      const result = await api.request<any>(endpoint, {
        method: 'POST',
        body: formData,
      });

      pushToast('success', result.message || 'Importação concluída.');

      if (result.errors && result.errors.length > 0) {
        console.warn('Erros na importação:', result.errors);
        pushToast('warning', 'Importação parcial', 'Algumas linhas tiveram erro. Verifique o console.');
      }

      if (activeTab === 'services') {
        const srvs = await api.get<Service[]>('/services');
        setServices(srvs || []);
      } else {
        const pkgs = await api.get<ServicePackage[]>('/packages');
        setPackages(pkgs || []);
      }
    } catch (err) {
      console.error('Erro ao importar:', err);
      pushToast(
        'error',
        `Erro ao importar ${activeTab === 'services' ? 'serviços' : 'pacotes'}.`
      );
    } finally {
      e.target.value = '';
    }
  };

  const renderServiceCard = (service: Service) => {
    return (
      <div
        key={service.id}
        className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="h-11 w-1.5 rounded-full"
              style={{ backgroundColor: service.color || '#6366f1' }}
            />
            <div className="min-w-0">
              <h4 className="truncate text-[15px] font-semibold text-slate-800">
                {service.name}
              </h4>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {service.category}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="xs"
              iconOnly
              onClick={() => handleOpenServiceModal(service)}
              title="Editar serviço"
            >
              <Edit3 size={14} />
            </Button>

            <Button
              variant="softDanger"
              size="xs"
              iconOnly
              onClick={() => setDeleteId({ id: String(service.id), type: 'service' })}
              title="Excluir serviço"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="mb-1 flex items-center gap-2">
              <Clock size={13} className="text-primary-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Duração
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {service.duration} min
            </p>
          </div>

          <div
            className={cx(
              'rounded-2xl border p-3',
              service.modality === 'online'
                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                : service.modality === 'geral'
                ? 'border-violet-100 bg-violet-50 text-violet-700'
                : 'border-blue-100 bg-blue-50 text-blue-700'
            )}
          >
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
              Modalidade
            </div>
            <p className="text-sm font-semibold">
              {service.modality === 'online'
                ? t('agenda.online')
                : service.modality === 'geral'
                ? 'Geral'
                : t('agenda.presential')}
            </p>
          </div>
        </div>

        {service.description ? (
          <p className="mb-4 line-clamp-2 text-sm text-slate-500">
            {service.description}
          </p>
        ) : (
          <div className="mb-4 h-[42px]" />
        )}

        <div className="flex items-end justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-[11px] text-slate-400">Preço</p>
            <p className="text-lg font-bold text-primary-600">
              {formatCurrency(service.price)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[11px] text-slate-400">Custo</p>
            <p className="text-sm font-semibold text-slate-700">
              {formatCurrency(service.cost || 0)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderPackageCard = (pkg: ServicePackage) => {
    return (
      <div
        key={pkg.id}
        className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Package size={20} />
            </div>

            <div className="min-w-0">
              <h4 className="truncate text-[15px] font-semibold text-slate-800">
                {pkg.name}
              </h4>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {pkg.items?.length || 0} itens
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="xs"
              iconOnly
              onClick={() => handleOpenPackageModal(pkg)}
              title="Editar pacote"
            >
              <Edit3 size={14} />
            </Button>

            <Button
              variant="softDanger"
              size="xs"
              iconOnly
              onClick={() => setDeleteId({ id: String(pkg.id), type: 'package' })}
              title="Excluir pacote"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="space-y-2">
            {(pkg.items || []).slice(0, 3).map((item, index) => {
              const service = services.find((srv) => String(srv.id) === String(item.serviceId));

              return (
                <div key={index} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-slate-600">
                    {item.quantity}x {service?.name || 'Serviço'}
                  </span>
                  <span className="shrink-0 font-medium text-slate-400">
                    {service ? formatCurrency(service.price * item.quantity) : '-'}
                  </span>
                </div>
              );
            })}

            {(pkg.items || []).length > 3 && (
              <p className="pt-1 text-center text-[11px] font-medium text-slate-400">
                + {(pkg.items || []).length - 3} outro(s) item(ns)
              </p>
            )}
          </div>
        </div>

        {pkg.description ? (
          <p className="mb-4 line-clamp-2 text-sm text-slate-500">
            {pkg.description}
          </p>
        ) : (
          <div className="mb-4 h-[42px]" />
        )}

        <div className="flex items-end justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-[11px] text-slate-400">Preço final</p>
            <p className="text-lg font-bold text-emerald-600">
              {formatCurrency(pkg.totalPrice || 0)}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
            {pkg.discountType === 'percentage'
              ? `${pkg.discountValue || 0}% OFF`
              : `-${formatCurrency(pkg.discountValue || 0)}`}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-violet-600 text-white shadow-lg shadow-primary-200">
              <Briefcase size={20} />
            </div>

            <div>
              <h1 className="text-lg font-semibold text-slate-900">
                {t('services.title')}
              </h1>
              <p className="text-sm text-slate-500">{t('services.management')}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={handleExportTemplate}
              title="Baixar modelo"
            >
              Modelo
            </Button>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileDown size={14} />}
              onClick={handleExportData}
              title={activeTab === 'services' ? 'Exportar serviços' : 'Exportar pacotes'}
            >
              Exportar
            </Button>

            <label>
              <input
                type="file"
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={handleImportFile}
              />
              <span>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<FileUp size={14} />}
                  as={undefined as any}
                >
                  Importar
                </Button>
              </span>
            </label>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() =>
                activeTab === 'services'
                  ? handleOpenServiceModal()
                  : handleOpenPackageModal()
              }
            >
              {activeTab === 'services' ? t('services.newService') : t('services.newPackage')}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                <Briefcase size={20} />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Serviços
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.totalServices}</p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Package size={20} />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Pacotes
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.totalPackages}</p>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <DollarSign size={20} />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Valor médio
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.avgPrice)}</p>
          </div>
        </div>

        {/* Filters */}
        <FilterLine>
          <FilterLineSection grow>
            <FilterLineItem grow minWidth={280}>
              <FilterLineSearch
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t('services.search')}
              />
            </FilterLineItem>
          </FilterLineSection>

          <FilterLineSection align="right">
            <FilterLineSegmented
              value={activeTab}
              onChange={(val) => setActiveTab(val as 'services' | 'packages')}
              options={[
                { value: 'services', label: t('services.services') },
                { value: 'packages', label: t('services.packages') },
              ]}
            />
          </FilterLineSection>
        </FilterLine>

        {/* Content */}
        {activeTab === 'services' ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredServices.map(renderServiceCard)}

            {!isLoading && filteredServices.length === 0 && (
              <div className="col-span-full rounded-[28px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-slate-400">
                Nenhum serviço encontrado.
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-2">
            {filteredPackages.map(renderPackageCard)}

            {!isLoading && filteredPackages.length === 0 && (
              <div className="col-span-full rounded-[28px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center text-slate-400">
                Nenhum pacote encontrado.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Serviço */}
      <Modal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title={editingService?.id ? 'Editar Serviço' : 'Novo Serviço'}
        maxWidth="lg"
        footer={
          <div className="flex w-full items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setIsServiceModalOpen(false)}
            >
              Fechar
            </Button>

            <Button
              variant="primary"
              onClick={handleSaveService}
            >
              Salvar serviço
            </Button>
          </div>
        }
      >
        {editingService && (
          <div className="space-y-5">
            <Input
              label="Nome do atendimento"
              value={editingService.name || ''}
              onChange={(e) =>
                setEditingService({ ...editingService, name: e.target.value })
              }
              placeholder="Ex: Psicoterapia Individual"
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Categoria"
                value={editingService.category || ''}
                onChange={(e) =>
                  setEditingService({ ...editingService, category: e.target.value })
                }
                placeholder="Ex: Psicologia Clínica"
              />

              <Input
                label="Duração (min)"
                type="number"
                value={editingService.duration || 0}
                onChange={(e) =>
                  setEditingService({
                    ...editingService,
                    duration: parseInt(e.target.value || '0', 10),
                  })
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <CurrencyInput
                label="Valor de venda"
                value={editingService.price || 0}
                onChange={(val) =>
                  setEditingService({ ...editingService, price: val })
                }
              />

              <CurrencyInput
                label="Custo profissional"
                value={editingService.cost || 0}
                onChange={(val) =>
                  setEditingService({ ...editingService, cost: val })
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="Modalidade"
                value={editingService.modality || 'presencial'}
                onChange={(e) =>
                  setEditingService({
                    ...editingService,
                    modality: e.target.value as any,
                  })
                }
              >
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
                <option value="geral">Geral (ambos)</option>
              </Select>

              <Input
                label="Cor"
                value={editingService.color || '#6366f1'}
                onChange={(e) =>
                  setEditingService({
                    ...editingService,
                    color: e.target.value,
                  })
                }
                leftIcon={<Palette size={16} />}
                placeholder="#6366f1"
              />
            </div>

            <TextArea
              label="Descrição / observações"
              value={editingService.description || ''}
              onChange={(e) =>
                setEditingService({
                  ...editingService,
                  description: e.target.value,
                })
              }
              placeholder="Detalhes adicionais sobre o serviço..."
              rows={5}
            />
          </div>
        )}
      </Modal>

      {/* Modal Pacote */}
      <Modal
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        title={editingPackage?.id ? 'Editar Pacote' : 'Novo Pacote'}
        maxWidth="xl"
        footer={
          <div className="flex w-full items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setIsPackageModalOpen(false)}
            >
              Fechar
            </Button>

            <Button
              variant="primary"
              onClick={handleSavePackage}
            >
              Salvar pacote
            </Button>
          </div>
        }
      >
        {editingPackage && (
          <div className="space-y-5">
            <Input
              label="Título do pacote"
              value={editingPackage.name || ''}
              onChange={(e) =>
                setEditingPackage({ ...editingPackage, name: e.target.value })
              }
              placeholder="Ex: Terapia Mensal Intensiva"
            />

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-primary-600" />
                  <h4 className="text-sm font-semibold text-slate-700">
                    Serviços incluídos
                  </h4>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <Combobox
                  label="Adicionar serviço"
                  options={serviceOptions}
                  value={packageServiceToAdd}
                  onChange={(value) => setPackageServiceToAdd(String(value))}
                  placeholder="Selecione um serviço..."
                  size="sm"
                  showSelectedBadge={false}
                />

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    leftIcon={<Plus size={14} />}
                    onClick={handleAddServiceToPackage}
                    disabled={!packageServiceToAdd}
                    fullWidth
                  >
                    Adicionar
                  </Button>
                </div>
              </div>

              {(!editingPackage.items || editingPackage.items.length === 0) ? (
                <StatusAlert
                  variant="info"
                  title="Nenhum serviço adicionado"
                  message="Selecione um serviço acima para começar a montar o pacote."
                  compact
                />
              ) : (
                <div className="space-y-3">
                  {(editingPackage.items || []).map((item, index) => {
                    const service = services.find(
                      (srv) => String(srv.id) === String(item.serviceId)
                    );

                    return (
                      <div
                        key={`${item.serviceId}-${index}`}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_110px_150px_auto] md:items-end">
                          <Select
                            label="Serviço"
                            value={String(item.serviceId)}
                            onChange={(e) => {
                              const nextItems = [...(editingPackage.items || [])];
                              nextItems[index].serviceId = e.target.value;
                              handlePackageItemChange(nextItems);
                            }}
                            size="sm"
                          >
                            {services.map((serviceOption) => (
                              <option key={serviceOption.id} value={String(serviceOption.id)}>
                                {serviceOption.name}
                              </option>
                            ))}
                          </Select>

                          <Input
                            label="Quantidade"
                            type="number"
                            value={item.quantity}
                            min={1}
                            size="sm"
                            onChange={(e) => {
                              const nextItems = [...(editingPackage.items || [])];
                              nextItems[index].quantity = parseInt(e.target.value || '1', 10) || 1;
                              handlePackageItemChange(nextItems);
                            }}
                          />

                          <Input
                            label="Subtotal"
                            value={
                              service
                                ? formatCurrency(service.price * item.quantity)
                                : formatCurrency(0)
                            }
                            readOnly
                            size="sm"
                          />

                          <div className="flex items-end justify-end">
                            <Button
                              variant="softDanger"
                              size="sm"
                              iconOnly
                              onClick={() => {
                                const nextItems = (editingPackage.items || []).filter(
                                  (_, i) => i !== index
                                );
                                handlePackageItemChange(nextItems);
                              }}
                              title="Remover item"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-sm font-semibold text-slate-700">
                  Configurar desconto
                </h4>

                <div className="space-y-4">
                  <FilterLineSegmented
                    value={editingPackage.discountType || 'percentage'}
                    onChange={(type) =>
                      handlePackageDiscountChange(
                        type as 'percentage' | 'fixed',
                        Number(editingPackage.discountValue || 0)
                      )
                    }
                    options={[
                      { value: 'percentage', label: '%' },
                      { value: 'fixed', label: 'R$' },
                    ]}
                    size="sm"
                  />

                  {editingPackage.discountType === 'percentage' ? (
                    <Input
                      label="Desconto percentual"
                      type="number"
                      suffix="%"
                      value={editingPackage.discountValue || 0}
                      onChange={(e) =>
                        handlePackageDiscountChange(
                          'percentage',
                          parseFloat(e.target.value || '0') || 0
                        )
                      }
                    />
                  ) : (
                    <CurrencyInput
                      label="Desconto fixo"
                      value={Number(editingPackage.discountValue || 0)}
                      onChange={(val) => handlePackageDiscountChange('fixed', val)}
                    />
                  )}
                </div>
              </div>

              <div className="rounded-[24px] bg-slate-900 p-5 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-200">
                  Preço final
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {formatCurrency(editingPackage.totalPrice || 0)}
                </p>

                <div className="mt-4 border-t border-white/10 pt-4 text-sm text-slate-300">
                  <p>
                    Itens: <strong className="text-white">{editingPackage.items?.length || 0}</strong>
                  </p>
                  <p className="mt-1">
                    Desconto:{' '}
                    <strong className="text-white">
                      {editingPackage.discountType === 'percentage'
                        ? `${editingPackage.discountValue || 0}%`
                        : formatCurrency(editingPackage.discountValue || 0)}
                    </strong>
                  </p>
                </div>
              </div>
            </div>

            <TextArea
              label="Observações do pacote"
              value={editingPackage.description || ''}
              onChange={(e) =>
                setEditingPackage({
                  ...editingPackage,
                  description: e.target.value,
                })
              }
              placeholder="Detalhes sobre o pacote promocional..."
              rows={5}
            />
          </div>
        )}
      </Modal>

      {/* Modal Exclusão */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Excluir item"
        maxWidth="md"
        footer={
          <div className="flex w-full items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setDeleteId(null)}
            >
              Cancelar
            </Button>

            <Button
              variant="danger"
              onClick={confirmDelete}
            >
              Confirmar exclusão
            </Button>
          </div>
        }
      >
        <div className="py-2">
          <StatusAlert
            variant="warning"
            title="Confirmação necessária"
            message={`Você está prestes a excluir este ${
              deleteId?.type === 'service' ? 'serviço' : 'pacote'
            }. Agendamentos passados não serão alterados.`}
          />
        </div>
      </Modal>
    </div>
  );
};