import React, { useState, useEffect } from 'react';
import { api, getStaticUrl } from '../services/api';
import { 
  UserCheck, Plus, Edit3, Trash2, Shield, 
  Briefcase, CheckCircle, X, DollarSign, Users, Lock, Key, 
  Loader2, Phone, Mail, ShieldAlert, UserPlus, Power, Eye, EyeOff, ChevronRight, AlertCircle,
  Layout, Settings, FileText, Smartphone, Tablet, Calendar, Check
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/UI/Modal';
import { Button } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { 
  FilterLine, FilterLineSection, FilterLineSearch, FilterLineSegmented 
} from '../components/UI/FilterLine';

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export const Professionals: React.FC = () => {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'team' | 'permissions' | 'commissions'>('team');
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPro, setEditingPro] = useState<any>(null);
  const [deleteConfirmPro, setDeleteConfirmPro] = useState<any>(null);
  const { pushToast } = useToast();

  // Permissions Tab State
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [pendingProfilePermissions, setPendingProfilePermissions] = useState<Record<string, boolean>>({});
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  // Commissions Tab State
  const [selectedComProId, setSelectedComProId] = useState<number | null>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [isSavingCommissions, setIsSavingCommissions] = useState(false);
  
  // Deletion Modals
  const [deleteConfirmProfile, setDeleteConfirmProfile] = useState<{id: number, name: string} | null>(null);
  
  const PERMISSION_SCHEMA = [
    {
      category: 'Recursos Iniciais',
      icon: <Layout size={16} />,
      permissions: [
        { key: 'view_dashboard', label: 'Ver Dashboard', description: 'Acessar métricas e resumo na tela inicial' },
        { key: 'view_performance_reports', label: 'Desempenho e Clientes', description: 'Acessar módulo de performance e melhores clientes' },
        { key: 'view_boarding_notices', label: 'Ver Murais e Avisos', description: 'Ler painel de informativos da clínica' },
        { key: 'manage_boarding_notices', label: 'Gerenciar Informes', description: 'Publicar e remover textos de avisos' },
      ]
    },
    {
      category: 'Agenda e Reservas',
      icon: <Calendar size={16} />,
      permissions: [
        { key: 'view_agenda', label: 'Ver Agenda', description: 'Visualizar horários e compromissos' },
        { key: 'create_appointment', label: 'Criar Agendamento', description: 'Agendar novas sessões e reservas' },
        { key: 'edit_appointment', label: 'Editar Agendamento', description: 'Alterar horários e dados de sessões' },
        { key: 'delete_appointment', label: 'Desmarcar / Excluir', description: 'Remover agendamentos da grade' },
        { key: 'confirm_appointment', label: 'Confirmar / Faltas', description: 'Alterar status de frequência do paciente' },
        { key: 'manage_agenda_settings', label: 'Configurações da Grade', description: 'Definir expedientes e realizar bloqueios' },
      ]
    },
    {
      category: 'Pacientes & Clínico',
      icon: <Users size={16} />,
      permissions: [
        { key: 'view_patients', label: 'Listar Pacientes', description: 'Acessar lista e dados básicos de contato' },
        { key: 'create_patient', label: 'Cadastrar Novo', description: 'Incluir novos pacientes no sistema' },
        { key: 'edit_patient', label: 'Editar Cadastro', description: 'Alterar perfil, tags e informações cadastrais' },
        { key: 'delete_patient', label: 'Excluir Paciente', description: 'Remover ficha permanentemente' },
        { key: 'view_medical_records', label: 'Ver Prontuário / Evoluções', description: 'Ler e ter acesso ao histórico clínico e registros' },
        { key: 'create_medical_record', label: 'Evoluir', description: 'Anotar novas sessões e registrar andamento' },
        { key: 'edit_medical_record', label: 'Editar Prontuário', description: 'Corrigir e assinar registros antigos' },
        { key: 'manage_clinical_tools', label: 'Testes e Avaliações', description: 'Acesso a Inventários, Escalas e PEI' },
      ]
    },
    {
      category: 'Financeiro e Guias',
      icon: <DollarSign size={16} />,
      permissions: [
        { key: 'view_comandas', label: 'Ver Comandas Pessoais', description: 'Acessar faturamentos referentes a este gestor' },
        { key: 'view_all_comandas', label: 'Ver Todas Comandas', description: 'Habilidade de ver faturamentos de terceiros' },
        { key: 'create_comanda', label: 'Abrir Guia / Comanda', description: 'Lançar novas cobranças e serviços associados' },
        { key: 'edit_comanda', label: 'Editar Detalhes', description: 'Adicionar descontos, taxas e alterar itens' },
        { key: 'delete_comanda', label: 'Cancelar Comanda', description: 'Remover guias e apagar lançamentos' },
        { key: 'manage_payments', label: 'Módulo de Recebimentos', description: 'Visualizar botão de baixa e parcelas em aberto' },
        { key: 'process_payments', label: 'Dar Baixa e Estornar', description: 'Informar ao sistema que um pagamento caiu' },
        { key: 'view_financial_reports', label: 'Relatórios de Fechamento', description: 'Ver gráficos de caixa, saldo e fechamento' },
        { key: 'manage_invoice_issuer', label: 'Emissor Financeiro', description: 'Gerar Recibos, Notas Fiscais e Documentos Financeiros' },
      ]
    },
    {
      category: 'Produtos, Serviços e Pacotes',
      icon: <Briefcase size={16} />,
      permissions: [
        { key: 'view_products', label: 'Ver Catálogo', description: 'Ver lista de itens e tabelas' },
        { key: 'manage_products', label: 'Gerenciar Produtos', description: 'Adicionar e alterar produtos e catálogo' },
        { key: 'manage_services', label: 'Configurar Serviços e Valores', description: 'Formatador de tipos de sessões na agenda' },
        { key: 'manage_packages', label: 'Gestão de Pacotes', description: 'Criar e editar pacotes de cobrança de sessões vinculadas' },
      ]
    },
    {
      category: 'Comunicação e Disparos',
      icon: <Phone size={16} />,
      permissions: [
        { key: 'manage_bot_integration', label: 'Vincular Bot / WhatsApp', description: 'Autorizar pareamentos de bots e regras de automação' },
        { key: 'access_messages', label: 'Módulo de Mensagens', description: 'Abrir chat, conversar com pacientes e automações' },
      ]
    },
    {
      category: 'Configurações e Formulários',
      icon: <Settings size={16} />,
      permissions: [
        { key: 'manage_documents', label: 'Modelos de Documentos', description: 'Programar atestados e recibos automáticos' },
        { key: 'manage_forms', label: 'Gestor de Formulários', description: 'Criar questionários, triagens e anamneses de formulários' },
        { key: 'manage_professionals', label: 'Gestão de RH (Equipe)', description: 'Pode ver tela de equipe, criar cargos e permissões' },
        { key: 'manage_commissions', label: 'Acesso às Comissões', description: 'Configurar e ver regras de comissionamento' },
        { key: 'manage_clinic_settings', label: 'Ajustes da Instituição', description: 'Trocar logo, regras gerenciais e CNPJ' },
        { key: 'access_audit_logs', label: 'Ver Log e Auditoria', description: 'Acesso ao registro do que os demais usuários fazem' },
      ]
    }
  ];

  const fetchPros = async () => {
    setIsLoading(true);
    try {
        const data = await api.get<any[]>('/users');
        setProfessionals(data);
    } catch (e: any) {
        console.error("Erro ao carregar profissionais:", e.message);
        pushToast('error', "Erro ao carregar profissionais");
    } finally {
        setIsLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
        const data = await api.get<any[]>('/permission-profiles');
        setProfiles(data);
    } catch (e: any) {
        console.error("Erro ao carregar perfis:", e.message);
    }
  };

  const fetchServices = async () => {
    try {
        const data = await api.get<any[]>('/services');
        setServices(data);
    } catch (e: any) {
        console.error("Erro ao carregar serviços:", e.message);
    }
  };

  useEffect(() => {
    fetchPros();
    fetchProfiles();
    fetchServices();
  }, []);

  // Sync selection for commissions tab
  useEffect(() => {
    if (activeTab === 'commissions' && professionals.length > 0 && !selectedComProId) {
      setSelectedComProId(professionals[0].id);
    }
  }, [activeTab, professionals]);

  // Fetch individual commissions when user selected
  useEffect(() => {
    if (selectedComProId && activeTab === 'commissions') {
      const fetchComms = async () => {
        try {
          const data = await api.get<any[]>(`/commissions/users/${selectedComProId}`);
          setCommissions(data);
        } catch (e: any) {
          console.error("Erro ao carregar comissões:", e.message);
        }
      };
      fetchComms();
    }
  }, [selectedComProId, activeTab]);

  const handleSaveCommissions = async () => {
    if (!selectedComProId) return;
    setIsSavingCommissions(true);
    try {
      await api.put(`/commissions/users/${selectedComProId}`, commissions);
      pushToast('success', 'Regras de comissão atualizadas com sucesso!');
    } catch (e: any) {
      pushToast('error', 'Erro ao salvar comissões: ' + e.message);
    } finally {
      setIsSavingCommissions(false);
    }
  };

  const setGeneralCommission = (type: 'percentage'|'fixed', value: number) => {
    // Modify or add the rule where service_id is null
    const newComms = [...commissions];
    const idx = newComms.findIndex(c => c.service_id === null);
    if (idx >= 0) {
      newComms[idx] = { ...newComms[idx], type, value };
    } else {
      newComms.push({ service_id: null, type, value });
    }
    setCommissions(newComms);
  };
  
  const addServiceCommission = (serviceId: number) => {
    if (commissions.find(c => c.service_id === serviceId)) return;
    setCommissions([...commissions, { service_id: serviceId, type: 'percentage', value: 0 }]);
  };

  const updateServiceCommission = (serviceId: number, type: 'percentage'|'fixed', value: number) => {
    setCommissions(prev => prev.map(c => 
      c.service_id === serviceId ? { ...c, type, value } : c
    ));
  };
  
  const removeServiceCommission = (serviceId: number) => {
    if (serviceId === null) {
      setCommissions(prev => prev.filter(c => c.service_id !== null));
    } else {
      setCommissions(prev => prev.filter(c => c.service_id !== serviceId));
    }
  };

  useEffect(() => {
    if (activeTab === 'permissions' && profiles.length > 0 && !selectedProfileId) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [activeTab, profiles]);

  useEffect(() => {
    if (selectedProfileId) {
      const profile = profiles.find(p => p.id === selectedProfileId);
      if (profile) {
        let perms = profile.permissions || {};
        if (typeof perms === 'string') {
          try { perms = JSON.parse(perms); } catch { perms = {}; }
        }
        setPendingProfilePermissions(perms);
      }
    }
  }, [selectedProfileId, profiles]);

  const handleOpenModal = (pro?: any) => {
    if (pro) {
      setEditingPro({ 
        ...pro, 
        password: '' // Senha sempre vazia ao abrir para edição
      });
    } else {
      setEditingPro({ 
        name: '', 
        email: '', 
        password: '', 
        role: 'professional',
        tenant_profile_id: '',
        phone: '', 
        specialty: '',
        crp: '',
        is_active: true 
      });
    }
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingPro.name || !editingPro.email || (!editingPro.id && !editingPro.password)) {
        pushToast('error', "Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    setIsSaving(true);
    try {
        const payload = { ...editingPro };
        if (editingPro.id && !editingPro.password) {
            delete payload.password;
        }

        if (editingPro.id) {
            await api.put(`/users/${editingPro.id}`, payload);
        } else {
            await api.post('/users', payload);
        }
        
        await fetchPros();
        setIsModalOpen(false);
        pushToast('success', editingPro.id ? 'Usuário atualizado.' : 'Usuário criado.');
    } catch (e: any) { 
        pushToast('error', e.message || "Erro ao salvar usuário."); 
    } finally {
        setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
      if (!deleteConfirmPro) return;
      try {
          await api.delete(`/users/${deleteConfirmPro.id}`);
          setProfessionals(prev => prev.filter(p => p.id !== deleteConfirmPro.id));
          setDeleteConfirmPro(null);
          pushToast('success', 'Usuário removido.');
      } catch (e: any) {
          pushToast('error', "Erro ao remover: " + e.message);
      }
  };

  const handleSaveProfilePermissions = async () => {
    if (!selectedProfileId) return;
    setIsUpdatingProfile(true);
    const profile = profiles.find(p => p.id === selectedProfileId);
    try {
      await api.put(`/permission-profiles/${selectedProfileId}`, { 
        name: profile.name,
        is_default: profile.is_default,
        permissions: pendingProfilePermissions 
      });
      
      setProfiles(prev => prev.map(p => 
        p.id === selectedProfileId ? { ...p, permissions: pendingProfilePermissions } : p
      ));
      
      pushToast('success', 'Perfil de acesso atualizado!');
    } catch (e: any) {
      pushToast('error', 'Erro ao salvar perfil: ' + e.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const toggleProfilePermission = (key: string) => {
    const profile = profiles.find(p => p.id === selectedProfileId);
    if (profile?.slug === 'admin') return;

    setPendingProfilePermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;
    try {
        const data = await api.post<any>('/permission-profiles', { name: newProfileName, permissions: {} });
        setProfiles([...profiles, data]);
        setNewProfileName('');
        setIsCreatingProfile(false);
        setSelectedProfileId(data.id);
        pushToast('success', 'Novo perfil criado.');
    } catch (e: any) {
        pushToast('error', 'Erro ao criar perfil.');
    }
  };

  const confirmDeleteProfile = async () => {
    if (!deleteConfirmProfile) return;
    try {
      await api.delete(`/permission-profiles/${deleteConfirmProfile.id}`);
      const newProfiles = profiles.filter(p => p.id !== deleteConfirmProfile.id);
      setProfiles(newProfiles);
      if (selectedProfileId === deleteConfirmProfile.id) setSelectedProfileId(newProfiles[0]?.id || null);
      pushToast('success', 'Perfil removido.');
    } catch (e: any) {
      pushToast('error', 'Erro ao remover: ' + e.message);
    } finally {
      setDeleteConfirmProfile(null);
    }
  };

  const handleDelete = (id: number, name: string) => {
      setDeleteConfirmPro({ id, name });
  };

  const filteredPros = professionals.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = React.useMemo(() => {
    return {
      total: professionals.length,
      admins: professionals.filter(p => p.role === 'admin').length,
      pros: professionals.filter(p => p.role === 'profissional').length,
      active: professionals.filter(p => p.is_active).length
    };
  }, [professionals]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white shadow-sm z-40 relative">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100">
              <Users size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{t('professionals.title')}</h1>
              <p className="text-xs text-slate-400 font-medium">{t('professionals.subtitle')}</p>
            </div>
          </div>

          <Button
            onClick={() => handleOpenModal()}
            leftIcon={<UserPlus size={18} />}
            variant="primary"
            radius="xl"
            className="shadow-lg shadow-indigo-200"
          >
            {t('professionals.new')}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-6 py-8 space-y-8">
        {/* STATS BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t('professionals.team'), value: stats.total, icon: <Users size={22} />, color: 'primary' },
            { label: 'Admins', value: stats.admins, icon: <Shield size={22} />, color: 'amber' },
            { label: 'Ativos', value: stats.active, icon: <UserCheck size={22} />, color: 'emerald' },
            { label: 'Staff', value: stats.pros, icon: <Briefcase size={22} />, color: 'violet' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-indigo-300 transition-all">
                <div className={cx(
                  "h-12 w-12 rounded-2xl flex items-center justify-center border transition-all",
                  stat.color === 'primary' ? "bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white" :
                  stat.color === 'amber'   ? "bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-500 group-hover:text-white" :
                  stat.color === 'emerald' ? "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white" :
                  "bg-violet-50 text-violet-600 border-violet-100 group-hover:bg-violet-600 group-hover:text-white"
                )}>
                    {stat.icon}
                </div>
                <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-xl font-black text-slate-800">{stat.value}</p>
                </div>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <FilterLine>
          <FilterLineSection grow>
            <FilterLineSearch
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Pesquisar por nome ou e-mail..."
              className="max-w-[420px]"
            />
          </FilterLineSection>

          <FilterLineSection align="right">
            <FilterLineSegmented
              value={activeTab}
              onChange={(val) => setActiveTab(val as any)}
              options={[
                { value: 'team', label: t('professionals.team'), icon: <Users size={14}/> },
                { value: 'permissions', label: t('professionals.permissions'), icon: <Key size={14}/> },
                { value: 'commissions', label: 'Comissões', icon: <DollarSign size={14}/> }
              ]}
            />
          </FilterLineSection>
        </FilterLine>

        {/* --- CONTENT --- */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="animate-spin text-indigo-600 mb-6" size={48} />
            <p className="text-sm font-bold uppercase tracking-widest">Sincronizando com a clínica...</p>
          </div>
        ) : activeTab === 'team' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPros.map(pro => {
              const isOwner = currentUser?.id === pro.id;
              const effectiveActive = isOwner ? true : pro.is_active;
              return (
              <div
                key={pro.id}
                className={cx(
                  "bg-white p-6 rounded-[32px] border transition-all group relative overflow-hidden flex flex-col",
                  !effectiveActive ? "opacity-75 border-slate-200" : "border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1"
                )}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-bl-[4rem] -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className={cx(
                      "h-14 w-14 rounded-2xl flex items-center justify-center font-bold text-xl border transition-all overflow-hidden",
                      !effectiveActive
                        ? "bg-slate-50 text-slate-300 border-slate-200"
                        : "bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-400 group-hover:shadow-lg group-hover:shadow-indigo-100"
                    )}>
                      {pro.avatar_url
                        ? <img src={getStaticUrl(pro.avatar_url)} alt={pro.name} className="h-full w-full object-cover" />
                        : (pro.name || '?').charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 text-[16px] truncate max-w-[150px]">{pro.name}</h3>
                      <div className="flex flex-col gap-1 mt-1">
                        <span className={cx(
                          "inline-flex w-fit px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border",
                          pro.role === 'admin' ? "bg-amber-50 text-amber-600 border-amber-100" :
                          "bg-indigo-50 text-indigo-600 border-indigo-100"
                        )}>
                          {profiles.find(p => p.id === pro.tenant_profile_id)?.name || pro.role}
                        </span>
                        {pro.specialty && (
                          <span className="text-[10px] font-medium text-indigo-400 italic truncate max-w-[180px]">
                            {pro.specialty}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {!isOwner && (
                    <div className="flex gap-1.5 p-1 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-100 shadow-sm">
                      <Button
                        variant="ghost"
                        size="xs"
                        iconOnly
                        onClick={() => handleOpenModal(pro)}
                        title="Editar"
                      >
                        <Edit3 size={15} />
                      </Button>
                      <Button
                        variant="softDanger"
                        size="xs"
                        iconOnly
                        onClick={() => handleDelete(pro.id, pro.name)}
                        title="Remover"
                      >
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-6 flex-1 relative z-10">
                  <div className="bg-slate-50/50 border border-slate-100/50 p-4 rounded-2xl space-y-2.5">
                    <div className="flex items-center gap-3 text-[13px] text-slate-600">
                      <Mail size={15} className="text-indigo-400 shrink-0" />
                      <span className="font-medium truncate" title={pro.email}>{pro.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[13px] text-slate-600">
                      <Phone size={15} className="text-indigo-400 shrink-0" />
                      <span className="font-medium">{pro.phone || 'Sem telefone'}</span>
                    </div>
                    {pro.crp && (
                      <div className="flex items-center gap-3 text-[13px] text-slate-600">
                        <CheckCircle size={15} className="text-emerald-400 shrink-0" />
                        <span className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Reg: {pro.crp}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2">
                    <div className={cx(
                      "w-2 h-2 rounded-full",
                      effectiveActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" : "bg-rose-400 shadow-sm"
                    )} />
                    <span className={cx(
                      "font-bold text-[10px] uppercase tracking-wider",
                      effectiveActive ? "text-emerald-600" : "text-rose-500"
                    )}>
                      {effectiveActive ? 'Acesso Ativo' : 'Suspenso'}
                    </span>
                  </div>
                  {pro.role === 'admin' && <Shield size={14} className="text-amber-400" />}
                </div>
              </div>
              );
            })}
            
            {filteredPros.length === 0 && (
              <div className="col-span-full py-32 text-center bg-white rounded-[32px] border border-slate-200 shadow-sm flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6 border border-slate-100">
                  <Users size={36} className="text-slate-200" />
                </div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Nenhum profissional encontrado</p>
              </div>
            )}
          </div>
        ) : activeTab === 'permissions' ? (
          <div className="flex flex-col lg:flex-row gap-8 min-h-[600px] animate-fadeIn">
            {/* Escolha do Profissional */}
            <div className="w-full lg:w-80 shrink-0 space-y-4">
              <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Perfis de Acesso</h3>
                  <Button variant="ghost" size="xs" onClick={() => setIsCreatingProfile(true)} iconOnly title="Novo Perfil"><Plus size={16} /></Button>
                </div>
                {isCreatingProfile && (
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-2">
                    <Input 
                      placeholder="Nome do novo exp: Marketing..." 
                      value={newProfileName} 
                      onChange={e => setNewProfileName(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="xs" onClick={() => setIsCreatingProfile(false)}>Cancelar</Button>
                      <Button variant="primary" size="xs" onClick={handleCreateProfile}>Criar</Button>
                    </div>
                  </div>
                )}
                <div className="max-h-[500px] overflow-y-auto no-scrollbar py-2">
                  {profiles.filter(p => p.slug !== 'admin').map(pro => (
                    <div
                      key={pro.id}
                      onClick={() => setSelectedProfileId(pro.id)}
                      className={cx(
                        "w-full px-5 py-4 flex items-center justify-between transition-all hover:bg-slate-50 relative cursor-pointer",
                        selectedProfileId === pro.id ? "bg-indigo-50/50" : ""
                      )}
                    >
                      {selectedProfileId === pro.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-600 rounded-r-full shadow-[2px_0_10px_rgba(79,70,229,0.3)]" />}
                      
                      <div className="flex items-center gap-4">
                        <div className={cx(
                          "h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                          selectedProfileId === pro.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-slate-100 text-slate-400"
                        )}>
                          {(pro.name || '?').charAt(0).toUpperCase()}
                        </div>
                        
                        <div className="text-left min-w-0">
                          <p className={cx("text-sm font-bold truncate", selectedProfileId === pro.id ? "text-indigo-600" : "text-slate-700")}>
                            {pro.name}
                          </p>
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{pro.is_default ? 'Padrão do Sistema' : 'Personalizado'}</p>
                        </div>
                      </div>

                      {!pro.is_default && (
                        <div 
                           className="relative z-10 p-1.5 rounded-lg hover:bg-rose-50 text-rose-400 transition-colors" 
                           onClick={(e) => { e.stopPropagation(); setDeleteConfirmProfile({id: pro.id, name: pro.name}); }}
                           title="Excluir Perfil"
                        >
                          <Trash2 size={16} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 rounded-3xl p-5 border border-amber-100">
                <div className="flex gap-3 text-amber-600 mb-2">
                  <ShieldAlert size={20} className="shrink-0" />
                  <h4 className="text-xs font-black uppercase tracking-widest mt-0.5">Aviso Importante</h4>
                </div>
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                  Permissões granulares permitem restringir acessos específicos. Administradores sempre terão acesso total a todos os módulos, independente destas configurações.
                </p>
              </div>
            </div>

            {/* Grid de Permissões */}
            <div className="flex-1 space-y-6">
              {selectedProfileId ? (
                <>
                  <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-20">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                          <Key size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-800">Definição de Acessos</h3>
                          <p className="text-xs text-slate-400 font-medium">Configure as funções do perfil "{profiles.find(p => p.id === selectedProfileId)?.name}"</p>
                        </div>
                      </div>
                      
                      {profiles.find(p => p.id === selectedProfileId)?.slug === 'admin' ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 font-bold text-xs uppercase tracking-widest">
                          <Lock size={14} />
                          Acesso Total (Fixo)
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          onClick={handleSaveProfilePermissions}
                          isLoading={isUpdatingProfile}
                          leftIcon={<CheckCircle size={18} />}
                          className="shadow-lg shadow-indigo-100"
                        >
                          SALVAR PERFIL
                        </Button>
                      )}
                    </div>

                    <div className="p-8 space-y-10">
                      {PERMISSION_SCHEMA.map((cat, idx) => (
                        <div key={idx} className="space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                              {cat.icon}
                            </div>
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{cat.category}</h4>
                            <div className="flex-1 h-px bg-slate-100"></div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {cat.permissions.map((perm) => (
                              <div 
                                key={perm.key}
                                onClick={() => toggleProfilePermission(perm.key)}
                                className={cx(
                                  "group flex items-center justify-between p-5 rounded-3xl border-2 cursor-pointer transition-all duration-300",
                                  pendingProfilePermissions[perm.key] 
                                    ? "bg-indigo-50/30 border-indigo-100 shadow-sm" 
                                    : "bg-white border-slate-50 hover:border-slate-200"
                                )}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={cx(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                                    pendingProfilePermissions[perm.key] ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-100 text-slate-400"
                                  )}>
                                    {pendingProfilePermissions[perm.key] ? <Check size={18} strokeWidth={3} /> : <X size={18} />}
                                  </div>
                                  <div>
                                    <p className={cx("text-sm font-bold transition-colors", pendingProfilePermissions[perm.key] ? "text-indigo-700" : "text-slate-700")}>
                                      {perm.label}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium leading-none mt-1">
                                      {perm.description}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className={cx(
                                  "w-10 h-6 rounded-full relative transition-all duration-300 p-0.5",
                                  pendingProfilePermissions[perm.key] ? "bg-indigo-600" : "bg-slate-200"
                                )}>
                                  <div className={cx(
                                    "w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 transform",
                                    pendingProfilePermissions[perm.key] ? "translate-x-4" : "translate-x-0"
                                  )} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center bg-white rounded-[40px] border border-slate-200 border-dashed p-12 text-slate-400">
                  <Key size={48} className="mb-4 opacity-20" />
                  <p className="font-bold uppercase tracking-widest text-xs">Selecione um perfil à esquerda</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'commissions' ? (
          <div className="flex flex-col lg:flex-row gap-8 min-h-[600px] animate-fadeIn">
            {/* Escolha do Profissional */}
            <div className="w-full lg:w-80 shrink-0 space-y-4">
              <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Selecionar Equipe</h3>
                </div>
                <div className="max-h-[500px] overflow-y-auto no-scrollbar py-2">
                  {professionals.map(pro => (
                    <button
                      key={pro.id}
                      onClick={() => setSelectedComProId(pro.id)}
                      className={cx(
                        "w-full px-5 py-4 flex items-center gap-4 transition-all hover:bg-slate-50 relative",
                        selectedComProId === pro.id ? "bg-indigo-50/50" : ""
                      )}
                    >
                      {selectedComProId === pro.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-600 rounded-r-full shadow-[2px_0_10px_rgba(79,70,229,0.3)]" />}
                      <div className={cx(
                        "h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0",
                        selectedComProId === pro.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
                      )}>
                        {(pro.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left min-w-0">
                        <p className={cx("text-sm font-bold truncate", selectedComProId === pro.id ? "text-indigo-600" : "text-slate-700")}>{pro.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Area Principal */}
            <div className="flex-1 space-y-6">
              {selectedComProId ? (
                <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><DollarSign size={24} /></div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">Regras de Comissão</h3>
                        <p className="text-xs text-slate-400 font-medium">Configure os repasses para {professionals.find(p => p.id === selectedComProId)?.name}</p>
                      </div>
                    </div>
                    <Button variant="primary" onClick={handleSaveCommissions} isLoading={isSavingCommissions} leftIcon={<CheckCircle size={18} />}>
                      SALVAR REGRAS
                    </Button>
                  </div>

                  <div className="p-8 space-y-8">
                    {/* Regra Geral */}
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Layout size={14} /> Regra Global (Padrão)
                      </h4>
                      <div className="p-5 border-2 border-slate-100 rounded-[24px] flex flex-wrap md:flex-nowrap items-center gap-4 bg-slate-50/50">
                        <div className="w-48">
                            <Select
                              label=""
                              value={commissions.find(c => c.service_id === null)?.type || 'percentage'}
                              onChange={(e) => setGeneralCommission(e.target.value as any, commissions.find(c => c.service_id === null)?.value || 0)}
                            >
                              <option value="percentage">Porcentagem (%)</option>
                              <option value="fixed">Valor Fixo (R$)</option>
                            </Select>
                        </div>
                        <div className="w-32">
                            <Input
                              label=""
                              type="number"
                              value={commissions.find(c => c.service_id === null)?.value || 0}
                              onChange={(e) => setGeneralCommission(commissions.find(c => c.service_id === null)?.type || 'percentage', parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        <span className="text-sm text-slate-500 font-medium">Aplicado a todos os serviços não detalhados abaixo.</span>
                      </div>
                    </div>

                    {/* Regras por Serviço */}
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle size={14} /> Regras Específicas Override
                        </h4>
                        <div className="w-64">
                            <Select
                              label=""
                              value=""
                              onChange={(e) => { if (e.target.value) addServiceCommission(parseInt(e.target.value)) }}
                            >
                              <option value="">+ Adicionar serviço...</option>
                              {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                            </Select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {commissions.filter(c => c.service_id !== null).map((c) => {
                          const srv = services.find(s => s.id === c.service_id);
                          return (
                            <div key={c.service_id} className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-indigo-200">
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{srv?.name || 'Serviço Excluído'}</p>
                                <p className="text-xs text-slate-400 font-medium tracking-wide">Preço do Módulo: R$ {srv?.price || '0.00'}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-36">
                                    <Select
                                      label=""
                                      value={c.type}
                                      onChange={(e) => updateServiceCommission(c.service_id, e.target.value as any, c.value)}
                                    >
                                      <option value="percentage">Percentual (%)</option>
                                      <option value="fixed">Fixo (R$)</option>
                                    </Select>
                                </div>
                                <div className="w-24">
                                    <Input
                                      label=""
                                      type="number"
                                      value={c.value}
                                      onChange={(e) => updateServiceCommission(c.service_id, c.type, parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <Button variant="ghost" size="sm" iconOnly onClick={() => removeServiceCommission(c.service_id)} title="Remover Regra"><Trash2 size={16} className="text-rose-400" /></Button>
                              </div>
                            </div>
                          );
                        })}
                        {commissions.filter(c => c.service_id !== null).length === 0 && (
                          <div className="p-8 text-center text-slate-400 text-[13px] font-medium border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-3xl">
                            Nenhuma regra específica configurada.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center bg-white rounded-[40px] border border-slate-200 border-dashed p-12 text-slate-400">
                  <DollarSign size={48} className="mb-4 opacity-20" />
                  <p className="font-bold uppercase tracking-widest text-xs">Selecione um profissional à esquerda para comissões</p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>

      {/* --- MODAL DE USUÁRIO --- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPro?.id ? 'Editar Cadastro' : 'Novo Integrante'}
        subtitle="Controle de Staff & Acesso do sistema"
        maxWidth="2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              DESCARTAR
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isSaving}
              leftIcon={<CheckCircle size={18} />}
            >
              SALVAR ALTERAÇÕES
            </Button>
          </>
        }
      >
        {editingPro && (
          <div className="space-y-6 sm:p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Nome Completo *"
                value={editingPro.name}
                onChange={e => setEditingPro({...editingPro, name: e.target.value})}
                placeholder="Ex: Dr. Ricardo Silva"
              />
              <Input
                label="Telefone / WhatsApp"
                value={editingPro.phone || ''}
                onChange={e => setEditingPro({...editingPro, phone: e.target.value})}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Especialidade / Título"
                value={editingPro.specialty || ''}
                onChange={e => setEditingPro({...editingPro, specialty: e.target.value})}
                placeholder="Ex: TCC, Neuropsi..."
              />
              <Input
                label="Registro Profissional (CRP/CRM)"
                value={editingPro.crp || ''}
                onChange={e => setEditingPro({...editingPro, crp: e.target.value})}
                placeholder="Ex: CRP 12/3456"
              />
            </div>

            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-6">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Credenciais de Acesso
              </h4>

              <Input
                label="E-mail Corporativo *"
                disabled={!!editingPro.id}
                value={editingPro.email}
                onChange={e => setEditingPro({...editingPro, email: e.target.value})}
                placeholder="usuario@clinica.com"
                leftIcon={<Mail size={16} />}
                hint={editingPro.id ? "O e-mail não pode ser alterado após criado." : undefined}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="relative">
                  <Input
                    label={editingPro.id ? 'Redefinir Senha' : 'Senha Inicial *'}
                    type={showPassword ? "text" : "password"}
                    value={editingPro.password || ''}
                    onChange={e => setEditingPro({...editingPro, password: e.target.value})}
                    placeholder={editingPro.id ? "Manter atual" : "••••••••"}
                    leftIcon={<Lock size={16} />}
                    rightIcon={
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                </div>

                <Select
                  label="Perfil de Acesso *"
                  value={editingPro.tenant_profile_id || ''}
                  onChange={e => setEditingPro({...editingPro, tenant_profile_id: e.target.value ? parseInt(e.target.value) : null})}
                  leftIcon={<Shield size={16} />}
                >
                  <option value="">Selecione um perfil...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div 
              onClick={() => setEditingPro({...editingPro, is_active: !editingPro.is_active})}
              className={cx(
                "flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all",
                editingPro.is_active ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cx(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-white",
                  editingPro.is_active ? "bg-emerald-500 shadow-md shadow-emerald-100" : "bg-rose-500 shadow-md shadow-rose-100"
                )}>
                  <Power size={20} />
                </div>
                <div>
                  <span className="block font-bold text-slate-800 text-sm">Status da Conta</span>
                  <span className={cx(
                    "text-[10px] font-bold uppercase tracking-widest",
                    editingPro.is_active ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {editingPro.is_active ? 'Ativo - Login Habilitado' : 'Suspenso - Login Bloqueado'}
                  </span>
                </div>
              </div>
              <div className={cx(
                "w-12 h-7 rounded-full relative transition-all p-1",
                editingPro.is_active ? "bg-emerald-500" : "bg-slate-300"
              )}>
                <div className={cx(
                  "w-5 h-5 bg-white rounded-full shadow-sm transition-all transform",
                  editingPro.is_active ? "translate-x-5" : "translate-x-0"
                )} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* CONFIRM DELETE MODAL (PRO) */}
      <Modal
        isOpen={!!deleteConfirmPro}
        onClose={() => setDeleteConfirmPro(null)}
        title="Remover Acesso?"
        maxWidth="sm"
        headerClassName="text-center"
      >
        <div className="text-center py-2">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[24px] flex items-center justify-center mx-auto mb-6 border border-red-100 shadow-md">
            <AlertCircle size={40} />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
            Esta ação irá remover permanentemente o acesso de <br />
            <span className="text-slate-900 font-bold">{deleteConfirmPro?.name}</span> ao sistema.
          </p>
          <div className="flex flex-col gap-3">
             <Button 
              variant="danger"
              fullWidth
              onClick={confirmDelete}
              className="py-4"
             >
               CONFIRMAR EXCLUSÃO
             </Button>
             <Button 
              variant="ghost"
              fullWidth
              onClick={() => setDeleteConfirmPro(null)}
             >
               CANCELAR
             </Button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE MODAL (PROFILE) */}
      <Modal
        isOpen={!!deleteConfirmProfile}
        onClose={() => setDeleteConfirmProfile(null)}
        title="Remover Perfil?"
        maxWidth="sm"
        headerClassName="text-center"
      >
        <div className="text-center py-2">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-[24px] flex items-center justify-center mx-auto mb-6 border border-amber-100 shadow-md">
            <ShieldAlert size={40} />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
            Tem certeza que deseja apagar o perfil <br />
            <span className="text-slate-900 font-bold">"{deleteConfirmProfile?.name}"</span>?<br/>
            Eles perderão acesso até que você reatribua um novo.
          </p>
          <div className="flex flex-col gap-3">
             <Button 
              variant="danger"
              fullWidth
              onClick={confirmDeleteProfile}
              className="py-4"
             >
               APAGAR PERFIL
             </Button>
             <Button 
              variant="ghost"
              fullWidth
              onClick={() => setDeleteConfirmProfile(null)}
             >
               CANCELAR
             </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

