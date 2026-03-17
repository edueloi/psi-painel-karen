
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  UserCheck, Search, Plus, Filter, Edit3, Trash2, Shield, Calendar, 
  Briefcase, Percent, CheckCircle, Check, X, DollarSign, Users, Lock, Key, 
  Loader2, Phone, Mail, ShieldAlert, UserPlus, Power, Eye, EyeOff, ChevronRight, AlertCircle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

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
  const [toasts, setToasts] = useState<{ id: number; type: 'success' | 'error'; message: string }[]>([]);

  const pushToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const fetchPros = async () => {
    setIsLoading(true);
    try {
        const data = await api.get<any[]>('/users');
        setProfessionals(data);
    } catch (e: any) {
        console.error("Erro ao carregar profissionais:", e.message);
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
        // Se for edição e a senha estiver vazia, removemos do payload para não sobrescrever com vazio
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
    <div className="space-y-6 animate-fadeIn font-sans pb-24">
      
      {/* HEADER & TOP CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100"><Users size={20}/></div>
                  {t('professionals.title')}
              </h1>
              <p className="text-slate-400 text-xs mt-1 font-bold">{t('professionals.subtitle')}</p>
          </div>
          <button 
              onClick={() => handleOpenModal()} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
              <UserPlus size={18} /> {t('professionals.new')}
          </button>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Users size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('professionals.team')}</p>
                  <p className="text-xl font-black text-slate-800">{stats.total}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-amber-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <Shield size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-amber-500">Admins</p>
                  <p className="text-xl font-black text-slate-800">{stats.admins}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <UserCheck size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-500">Ativos</p>
                  <p className="text-xl font-black text-slate-800">{stats.active}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-violet-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 group-hover:bg-violet-600 group-hover:text-white transition-all">
                  <Briefcase size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-violet-500">Staff</p>
                  <p className="text-xl font-black text-slate-800">{stats.pros}</p>
              </div>
          </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                  type="text" 
                  placeholder="Pesquisar por nome ou e-mail..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-indigo-200 transition-all placeholder:text-slate-400" 
              />
          </div>

          <div className="flex gap-3 w-full lg:w-auto overflow-x-auto no-scrollbar">
              {/* View Toggle */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl flex-1 lg:flex-none">
                  {[
                      { id: 'team', label: t('professionals.team'), icon: <Users size={14}/> },
                      { id: 'permissions', label: t('professionals.permissions'), icon: <Key size={14}/> },
                      { id: 'commissions', label: 'Comissões', icon: <DollarSign size={14}/> }
                  ].map(tab => (
                      <button 
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}
                      >
                          {tab.icon}
                          {tab.label}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* --- CONTENT --- */}
      {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <Loader2 className="animate-spin text-indigo-600 mb-6" size={48} />
              <p className="text-sm font-black uppercase tracking-widest">Sincronizando com a clínica...</p>
          </div>
      ) : activeTab === 'team' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPros.map(pro => (
                  <div key={pro.id} className={`bg-white p-6 rounded-[2.5rem] border transition-all group relative overflow-hidden flex flex-col ${!pro.is_active ? 'opacity-75 border-slate-100' : 'border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:-translate-y-1'}`}>
                      
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-bl-[3rem] -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div className="flex justify-between items-start mb-6 relative z-10">
                          <div className="flex items-center gap-4">
                              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl border-2 transition-all ${
                                !pro.is_active ? 'bg-slate-50 text-slate-300 border-slate-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-400 group-hover:shadow-lg group-hover:shadow-indigo-200'
                              }`}>
                                  {(pro.name || '?').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                  <h3 className="font-black text-slate-800 text-[15px] truncate max-w-[150px]">{pro.name}</h3>
                                  <div className="flex flex-col">
                                    <span className={`inline-flex w-fit px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border mt-1 ${
                                        pro.role === 'admin' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                        pro.role === 'profissional' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                        'bg-slate-50 text-slate-500 border-slate-100'
                                    }`}>
                                        {pro.role}
                                    </span>
                                    {pro.specialty && (
                                      <span className="text-[10px] font-bold text-indigo-400 mt-1 truncate max-w-[150px] italic">
                                        {pro.specialty}
                                      </span>
                                    )}
                                  </div>
                              </div>
                          </div>
                          <div className="flex gap-1.5 shadow-sm bg-white/50 backdrop-blur-sm p-1 rounded-xl ring-1 ring-slate-100">
                              <button onClick={() => handleOpenModal(pro)} className="p-2.5 bg-slate-50 hover:bg-indigo-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"><Edit3 size={14}/></button>
                              <button onClick={() => handleDelete(pro.id, pro.name)} className="p-2.5 bg-slate-50 hover:bg-red-50 rounded-xl text-slate-300 hover:text-red-500 transition-all border border-transparent hover:border-red-100"><Trash2 size={14}/></button>
                          </div>
                      </div>

                      <div className="space-y-3 mb-6 flex-1 relative z-10">
                          <div className="bg-slate-50/50 border border-slate-100/50 p-3.5 rounded-2xl flex flex-col gap-2">
                              <div className="flex items-center gap-3 text-xs text-slate-600">
                                  <Mail size={14} className="text-indigo-400 shrink-0" />
                                  <span className="font-bold truncate" title={pro.email}>{pro.email}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-600">
                                  <Phone size={14} className="text-indigo-400 shrink-0" />
                                  <span className="font-bold">{pro.phone || 'Sem telefone'}</span>
                              </div>
                              {pro.crp && (
                                <div className="flex items-center gap-3 text-xs text-slate-600">
                                    <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                                    <span className="font-black text-[10px] uppercase tracking-widest">Reg: {pro.crp}</span>
                                </div>
                              )}
                          </div>
                      </div>

                      <div className="pt-4 border-t border-slate-50 flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${pro.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-rose-400 shadow-sm'}`}></div>
                              <span className={`font-black text-[10px] uppercase tracking-[0.1em] ${pro.is_active ? 'text-emerald-600' : 'text-rose-500'}`}>
                                  {pro.is_active ? 'Acesso Ativo' : 'Suspenso'}
                              </span>
                          </div>
                          {pro.role === 'admin' && <Shield size={14} className="text-amber-400" />}
                      </div>
                  </div>
              ))}
              
              {filteredPros.length === 0 && (
                  <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm flex flex-col items-center">
                      <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mb-6 border border-slate-100">
                        <Users size={40} className="text-slate-200" />
                      </div>
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Nenhum profissional encontrado</p>
                  </div>
              )}
          </div>
      ) : (
          <div className="bg-white rounded-[3rem] p-24 text-center border border-slate-100 shadow-sm flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mb-6 border border-slate-100">
                <ShieldAlert size={40} className="text-slate-200" />
              </div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">O módulo de {activeTab === 'permissions' ? 'Permissões' : 'Comissões'} está sendo preparado...</p>
          </div>
      )}

      {/* --- MODAL DE USUÁRIO --- */}
      {isModalOpen && editingPro && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
              <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl animate-bounceIn overflow-hidden flex flex-col max-h-[92vh] border border-white/20">
                  
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                      <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                              {editingPro.id ? <Edit3 size={20} /> : <UserPlus size={22} />}
                          </div>
                          <div>
                              <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">
                                {editingPro.id ? 'Editar Cadastro' : 'Novo Integrante'}
                              </h3>
                              <p className="text-[9px] sm:text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em]">Controle de Staff & Acesso</p>
                          </div>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white hover:bg-slate-50 rounded-2xl text-slate-400 shadow-sm ring-1 ring-slate-200 transition-all active:scale-95">
                          <X size={20}/>
                      </button>
                  </div>

                  <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar flex-1 space-y-10">
                      
                      <div className="space-y-8">
                          <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Dados de Identificação</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-3">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Nome Completo *</label>
                                  <input 
                                    type="text" 
                                    className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none font-black text-slate-700 focus:bg-white focus:border-indigo-400 transition-all text-sm"
                                    value={editingPro.name} 
                                    onChange={e => setEditingPro({...editingPro, name: e.target.value})} 
                                    placeholder="Ex: Dr. Ricardo Silva"
                                  />
                              </div>
                              <div className="space-y-3">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Telefone / WhatsApp</label>
                                  <input 
                                    type="tel" 
                                    className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none font-black text-slate-700 focus:bg-white focus:border-indigo-400 transition-all text-sm"
                                    value={editingPro.phone || ''} 
                                    onChange={e => setEditingPro({...editingPro, phone: e.target.value})} 
                                    placeholder="(00) 00000-0000"
                                  />
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-3">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Especialidade / Título</label>
                                  <input 
                                    type="text" 
                                    className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none font-black text-slate-700 focus:bg-white focus:border-indigo-400 transition-all text-sm"
                                    value={editingPro.specialty || ''} 
                                    onChange={e => setEditingPro({...editingPro, specialty: e.target.value})} 
                                    placeholder="Ex: TCC, Neuropsi..."
                                  />
                              </div>
                              <div className="space-y-3">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Registro Profissional (CRP/CRM)</label>
                                  <input 
                                    type="text" 
                                    className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 outline-none font-black text-slate-700 focus:bg-white focus:border-indigo-400 transition-all text-sm"
                                    value={editingPro.crp || ''} 
                                    onChange={e => setEditingPro({...editingPro, crp: e.target.value})} 
                                    placeholder="Ex: CRP 12/3456"
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Credenciais de Acesso</label>
                          <div className="bg-slate-50/50 p-6 md:p-8 rounded-3xl border border-slate-100 space-y-8">
                              <div className="space-y-3">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">E-mail Corporativo *</label>
                                  <div className="relative group">
                                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                      <input 
                                        type="email" 
                                        disabled={!!editingPro.id}
                                        className="w-full p-4 pl-12 rounded-xl border-2 border-slate-100 bg-white outline-none font-black text-slate-700 focus:border-indigo-400 transition-all disabled:bg-slate-100 disabled:text-slate-400 text-sm"
                                        value={editingPro.email} 
                                        onChange={e => setEditingPro({...editingPro, email: e.target.value})} 
                                        placeholder="usuario@clinica.com"
                                      />
                                  </div>
                                  {editingPro.id && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-1">O e-mail é a identidade única do acesso e não pode ser alterado.</p>}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="space-y-3">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">
                                          {editingPro.id ? 'Redefinir Senha' : 'Senha Inicial *'}
                                      </label>
                                      <div className="relative group">
                                           <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                           <input 
                                             type={showPassword ? "text" : "password"} 
                                             className="w-full p-4 pl-12 rounded-xl border-2 border-slate-100 bg-white outline-none font-black text-slate-700 focus:border-indigo-400 transition-all text-sm"
                                             value={editingPro.password || ''} 
                                             onChange={e => setEditingPro({...editingPro, password: e.target.value})} 
                                             placeholder={editingPro.id ? "Manter atual" : "••••••••"}
                                           />
                                           <button 
                                             onClick={() => setShowPassword(!showPassword)}
                                             className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                           >
                                               {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                           </button>
                                       </div>
                                  </div>
                                  <div className="space-y-3">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Cargo e Permissão</label>
                                      <div className="relative group">
                                           <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors" size={18} />
                                           <select 
                                             className="w-full p-4 pl-12 rounded-xl border-2 border-slate-100 bg-white outline-none focus:border-indigo-400 transition-all font-black text-slate-700 text-sm appearance-none cursor-pointer"
                                             value={editingPro.role}
                                             onChange={e => setEditingPro({...editingPro, role: e.target.value})}
                                           >
                                               <option value="profissional">Psicólogo(a)</option>
                                               <option value="admin">Administrador(a)</option>
                                               <option value="secretario">Secretário(a)</option>
                                           </select>
                                           <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={18} />
                                       </div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="pt-6">
                          <div 
                            onClick={() => setEditingPro({...editingPro, is_active: !editingPro.is_active})}
                            className={`flex items-center justify-between p-6 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 ${
                              editingPro.is_active ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
                            } group`}
                          >
                              <div className="flex items-center gap-5">
                                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                                      editingPro.is_active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-rose-500 text-white shadow-lg shadow-rose-100'
                                  }`}>
                                      <Power size={24} />
                                  </div>
                                  <div>
                                      <span className="block font-black text-slate-800 text-base">Status da Conta</span>
                                      <span className={`text-[10px] font-black uppercase tracking-widest ${editingPro.is_active ? 'text-emerald-600' : 'text-rose-600'}`}>
                                          {editingPro.is_active ? 'Ativo - Login Habilitado' : 'Suspenso - Login Bloqueado'}
                                      </span>
                                  </div>
                              </div>
                              <div className={`w-14 h-8 rounded-full relative transition-all duration-300 p-1 ${editingPro.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 transform ${editingPro.is_active ? 'translate-x-6' : 'translate-x-0'}`}></div>
                              </div>
                          </div>
                      </div>

                  </div>

                  <div className="p-6 md:p-8 border-t border-slate-50 bg-slate-50/30 flex justify-end items-center gap-4 px-8 md:px-12 pb-8 md:pb-12">
                    <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">DESCARTAR</button>
                    <button onClick={handleSave} className="px-10 py-4 bg-indigo-600 hover:bg-slate-800 text-white rounded-2xl shadow-xl shadow-indigo-600/20 transition-all font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transform active:scale-95">
                        <CheckCircle size={20} /> SALVAR ALTERAÇÕES
                    </button>
                </div>
            </div>
        </div>
      )}
      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmPro && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-fadeIn">
           <div className="bg-white rounded-[3.5rem] p-12 max-w-sm w-full text-center shadow-2xl border border-white/20 transform animate-bounceIn">
              <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-red-100 shadow-lg shadow-red-50">
                <AlertCircle size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight leading-none">Remover Acesso?</h3>
              <p className="text-sm font-bold text-slate-400 mb-10 leading-relaxed">
                Esta ação irá remover permanentemente o acesso de <span className="text-slate-900 font-black">{deleteConfirmPro.name}</span> ao sistema.
              </p>
              <div className="flex flex-col gap-4">
                 <button 
                  onClick={confirmDelete}
                  className="w-full py-5 bg-red-500 hover:bg-red-600 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.1em] shadow-xl shadow-red-100 transition-all transform active:scale-95"
                 >
                   CONFIRMAR EXCLUSÃO
                 </button>
                 <button 
                  onClick={() => setDeleteConfirmPro(null)}
                  className="w-full py-4 text-slate-400 hover:text-slate-600 text-[11px] font-black uppercase tracking-[0.1em] transition-all font-black"
                 >
                   MANTER ACESSO
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* TOASTS */}
      <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-3">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-6 py-4 rounded-[1.5rem] shadow-2xl border animate-slideIn ${t.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            <span className="text-xs font-black uppercase tracking-widest">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

