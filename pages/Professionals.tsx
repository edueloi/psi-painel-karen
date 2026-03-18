
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  UserCheck, Plus, Edit3, Trash2, Shield, 
  Briefcase, CheckCircle, X, DollarSign, Users, Lock, Key, 
  Loader2, Phone, Mail, ShieldAlert, UserPlus, Power, Eye, EyeOff, ChevronRight, AlertCircle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
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

  useEffect(() => {
    fetchPros();
  }, []);

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
        role: 'profissional', 
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
      {/* STICKY HEADER */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md shadow-sm">
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
            {filteredPros.map(pro => (
              <div 
                key={pro.id} 
                className={cx(
                  "bg-white p-6 rounded-[32px] border transition-all group relative overflow-hidden flex flex-col",
                  !pro.is_active ? "opacity-75 border-slate-200" : "border-slate-200 hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1"
                )}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-bl-[4rem] -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className={cx(
                      "h-14 w-14 rounded-2xl flex items-center justify-center font-bold text-xl border transition-all",
                      !pro.is_active 
                        ? "bg-slate-50 text-slate-300 border-slate-200" 
                        : "bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-400 group-hover:shadow-lg group-hover:shadow-indigo-100"
                    )}>
                      {(pro.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-800 text-[16px] truncate max-w-[150px]">{pro.name}</h3>
                      <div className="flex flex-col gap-1 mt-1">
                        <span className={cx(
                          "inline-flex w-fit px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border",
                          pro.role === 'admin' ? "bg-amber-50 text-amber-600 border-amber-100" :
                          pro.role === 'profissional' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                          "bg-slate-50 text-slate-500 border-slate-100"
                        )}>
                          {pro.role}
                        </span>
                        {pro.specialty && (
                          <span className="text-[10px] font-medium text-indigo-400 italic truncate max-w-[180px]">
                            {pro.specialty}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
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
                      pro.is_active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" : "bg-rose-400 shadow-sm"
                    )} />
                    <span className={cx(
                      "font-bold text-[10px] uppercase tracking-wider",
                      pro.is_active ? "text-emerald-600" : "text-rose-500"
                    )}>
                      {pro.is_active ? 'Acesso Ativo' : 'Suspenso'}
                    </span>
                  </div>
                  {pro.role === 'admin' && <Shield size={14} className="text-amber-400" />}
                </div>
              </div>
            ))}
            
            {filteredPros.length === 0 && (
              <div className="col-span-full py-32 text-center bg-white rounded-[32px] border border-slate-200 shadow-sm flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6 border border-slate-100">
                  <Users size={36} className="text-slate-200" />
                </div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">Nenhum profissional encontrado</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-[32px] p-24 text-center border border-slate-200 shadow-sm flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6 border border-slate-100">
              <ShieldAlert size={36} className="text-slate-200" />
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">O módulo de {activeTab === 'permissions' ? 'Permissões' : 'Comissões'} está sendo preparado...</p>
          </div>
        )}
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
                  label="Cargo e Permissão"
                  value={editingPro.role}
                  onChange={e => setEditingPro({...editingPro, role: e.target.value})}
                  leftIcon={<Shield size={16} />}
                >
                  <option value="profissional">Psicólogo(a)</option>
                  <option value="admin">Administrador(a)</option>
                  <option value="secretario">Secretário(a)</option>
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

      {/* CONFIRM DELETE MODAL */}
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
    </div>
  );
};

