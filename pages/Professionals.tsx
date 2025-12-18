
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  UserCheck, Search, Plus, Filter, Edit3, Trash2, Shield, Calendar, 
  Briefcase, Percent, CheckCircle, Check, X, DollarSign, Users, Lock, Key, 
  Loader2, Phone, Mail, ShieldAlert, UserPlus, Power, Eye, EyeOff
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
        is_active: true 
      });
    }
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingPro.name || !editingPro.email || (!editingPro.id && !editingPro.password)) {
        alert("Por favor, preencha todos os campos obrigatórios.");
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
    } catch (e: any) { 
        alert(e.message || "Erro ao salvar usuário."); 
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
      if (window.confirm(`Deseja realmente remover o acesso de ${name}?`)) {
          try {
              await api.delete(`/users/${id}`);
              setProfessionals(prev => prev.filter(p => p.id !== id));
          } catch (e: any) {
              alert("Erro ao remover: " + e.message);
          }
      }
  };

  const filteredPros = professionals.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn font-sans pb-20">
      
      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 opacity-90"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
            <div className="max-w-2xl text-center lg:text-left">
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">{t('professionals.title')}</h1>
                <p className="text-indigo-200">{t('professionals.subtitle')}</p>
            </div>
            
            <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50 backdrop-blur-sm overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('team')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'team' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                    <Users size={18} /> {t('professionals.team')}
                </button>
                <button onClick={() => setActiveTab('permissions')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'permissions' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                    <Key size={18} /> {t('professionals.permissions')}
                </button>
            </div>
        </div>
      </div>

      {/* --- TOOLBAR --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar por nome ou e-mail..." 
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:scale-95"
          >
              <UserPlus size={20} />
              {t('professionals.new')}
          </button>
      </div>

      {/* --- CONTENT --- */}
      {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
              <p className="font-bold">Sincronizando com a clínica...</p>
          </div>
      ) : activeTab === 'team' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPros.map(pro => (
                  <div key={pro.id} className={`bg-white rounded-3xl p-6 border transition-all duration-300 group relative overflow-hidden ${!pro.is_active ? 'opacity-75 border-slate-100' : 'border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:-translate-y-1'}`}>
                      
                      {/* Role Badge Overlay */}
                      <div className="absolute top-4 right-4">
                          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${
                              pro.role === 'admin' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              pro.role === 'profissional' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                              'bg-slate-50 text-slate-500 border-slate-100'
                          }`}>
                              {pro.role}
                          </span>
                      </div>

                      <div className="flex items-center gap-4 mb-6">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl transition-colors ${!pro.is_active ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                              {pro.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                              <h3 className="font-bold text-slate-800 truncate pr-16">{pro.name}</h3>
                              <p className="text-xs text-slate-400 flex items-center gap-1"><Mail size={12}/> {pro.email}</p>
                          </div>
                      </div>

                      <div className="space-y-3 mb-6">
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                              <Phone size={14} className="text-slate-300" />
                              <span className="font-medium">{pro.phone || 'Sem telefone'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                              <div className={`w-2 h-2 rounded-full ${pro.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                              <span className={`font-bold text-[10px] uppercase tracking-wider ${pro.is_active ? 'text-emerald-600' : 'text-rose-500'}`}>
                                  {pro.is_active ? 'Acesso Ativo' : 'Acesso Suspenso'}
                              </span>
                          </div>
                      </div>

                      <div className="pt-4 border-t border-slate-50 flex gap-2">
                          <button 
                            onClick={() => handleOpenModal(pro)}
                            className="flex-1 py-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                          >
                              <Edit3 size={14} /> Editar
                          </button>
                          <button 
                            onClick={() => handleDelete(pro.id, pro.name)}
                            className="p-2.5 bg-slate-50 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-xl transition-all"
                          >
                              <Trash2 size={18} />
                          </button>
                      </div>
                  </div>
              ))}
              
              {filteredPros.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                      <Users size={48} className="mx-auto mb-4 opacity-20" />
                      <p>Nenhum profissional encontrado com esses critérios.</p>
                  </div>
              )}
          </div>
      ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm text-slate-400">
              <ShieldAlert size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium">O módulo de {activeTab === 'permissions' ? 'Permissões' : 'Comissões'} está sendo carregado...</p>
          </div>
      )}

      {/* --- MODAL DE USUÁRIO --- */}
      {isModalOpen && editingPro && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white w-full max-w-xl rounded-[28px] shadow-2xl animate-[slideUpFade_0.3s_ease-out] overflow-hidden flex flex-col max-h-[90vh]">
                  
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                              {editingPro.id ? <Edit3 size={20} /> : <UserPlus size={20} />}
                          </div>
                          <div>
                              <h3 className="text-xl font-display font-bold text-slate-800">
                                {editingPro.id ? 'Editar Usuário' : 'Novo Usuário'}
                              </h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Controle de Acesso Clínica</p>
                          </div>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm">
                          <X size={20}/>
                      </button>
                  </div>

                  <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nome Completo *</label>
                              <input 
                                type="text" 
                                className="w-full p-3.5 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700 transition-all"
                                value={editingPro.name} 
                                onChange={e => setEditingPro({...editingPro, name: e.target.value})} 
                                placeholder="Ex: Dr. Ricardo Silva"
                              />
                          </div>
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Telefone</label>
                              <input 
                                type="tel" 
                                className="w-full p-3.5 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700 transition-all"
                                value={editingPro.phone || ''} 
                                onChange={e => setEditingPro({...editingPro, phone: e.target.value})} 
                                placeholder="(00) 00000-0000"
                              />
                          </div>
                      </div>

                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">E-mail de Acesso *</label>
                          <input 
                            type="email" 
                            disabled={!!editingPro.id}
                            className="w-full p-3.5 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700 transition-all disabled:bg-slate-50 disabled:text-slate-400"
                            value={editingPro.email} 
                            onChange={e => setEditingPro({...editingPro, email: e.target.value})} 
                            placeholder="usuario@clinica.com"
                          />
                          {editingPro.id && <p className="text-[10px] text-slate-400 italic">O e-mail não pode ser alterado após a criação.</p>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                                  {editingPro.id ? 'Nova Senha (opcional)' : 'Senha Inicial *'}
                              </label>
                              <div className="relative">
                                  <input 
                                    type={showPassword ? "text" : "password"} 
                                    className="w-full p-3.5 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700 transition-all"
                                    value={editingPro.password || ''} 
                                    onChange={e => setEditingPro({...editingPro, password: e.target.value})} 
                                    placeholder={editingPro.id ? "Manter atual" : "••••••••"}
                                  />
                                  <button 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
                                  >
                                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                  </button>
                              </div>
                          </div>
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Cargo / Nível de Acesso</label>
                              <select 
                                className="w-full p-3.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-bold text-slate-700 transition-all"
                                value={editingPro.role}
                                onChange={e => setEditingPro({...editingPro, role: e.target.value})}
                              >
                                  <option value="profissional">Psicólogo(a)</option>
                                  <option value="admin">Administrador(a)</option>
                                  <option value="secretario">Secretário(a)</option>
                              </select>
                          </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                          <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors group">
                              <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg transition-colors ${editingPro.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                      <Power size={18} />
                                  </div>
                                  <div>
                                      <span className="block font-bold text-slate-700 text-sm">Status do Acesso</span>
                                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                          {editingPro.is_active ? 'Ativo - Pode realizar login' : 'Inativo - Bloqueado'}
                                      </span>
                                  </div>
                              </div>
                              <div 
                                onClick={() => setEditingPro({...editingPro, is_active: !editingPro.is_active})}
                                className={`w-12 h-7 rounded-full relative transition-all duration-300 ${editingPro.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                              >
                                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${editingPro.is_active ? 'left-6' : 'left-1'}`}></div>
                              </div>
                          </label>
                      </div>

                  </div>

                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4 shrink-0">
                      <button 
                        onClick={() => setIsModalOpen(false)} 
                        className="flex-1 py-3.5 font-bold text-slate-500 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all"
                      >
                        {t('common.cancel')}
                      </button>
                      <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="flex-[2] py-3.5 font-bold text-white bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-900/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Check size={20} /> {t('common.save')}</>}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
