
import React, { useState, useMemo } from 'react';
import { MOCK_TENANTS, MOCK_GLOBAL_RESOURCES, DOCUMENT_CATEGORIES, MOCK_GLOBAL_FORMS } from '../constants';
import { Tenant, GlobalResource, ClinicalForm, FormQuestion } from '../types';
import { 
  LayoutDashboard, Users, FolderOpen, LogOut, Search, Plus, 
  Trash2, ShieldCheck, DollarSign, Calendar, UploadCloud, 
  FileText, CheckCircle, AlertTriangle, Eye, X, ChevronRight, ClipboardList, Edit3, Building, Lock, User
} from 'lucide-react';
import { FormBuilder } from '../components/Forms/FormBuilder';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

interface SuperAdminProps {
  onLogout: () => void;
}

export const SuperAdmin: React.FC<SuperAdminProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tenants' | 'files' | 'forms'>('dashboard');
  const [tenants, setTenants] = useState<Tenant[]>(MOCK_TENANTS);
  const [files, setFiles] = useState<GlobalResource[]>(MOCK_GLOBAL_RESOURCES);
  const [forms, setForms] = useState<ClinicalForm[]>(MOCK_GLOBAL_FORMS);
  
  // File Categories
  const [categories, setCategories] = useState<string[]>(DOCUMENT_CATEGORIES);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // States for Tenant Modal
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [newTenant, setNewTenant] = useState<Partial<Tenant>>({
      planDurationMonths: 1,
      monthlyPrice: 79.90,
      status: 'active'
  });
  // Separate state for the Initial User Data inside the tenant creation
  const [adminUser, setAdminUser] = useState({ name: '', email: '', password: '' });

  // States for File Modal
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [newFile, setNewFile] = useState<Partial<GlobalResource>>({
      category: 'Modelos'
  });

  // State for Form Builder
  const [isFormBuilderOpen, setIsFormBuilderOpen] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);

  // --- LOGIC ---
  
  const calculatePlanTotal = () => {
      return (newTenant.monthlyPrice || 0) * (newTenant.planDurationMonths || 1);
  };

  const handleSaveTenant = () => {
      if (!newTenant.name || !adminUser.email || !adminUser.password) return alert('Preencha os dados da empresa e do admin.');
      
      const now = new Date();
      const expiry = new Date(now);
      expiry.setMonth(expiry.getMonth() + (newTenant.planDurationMonths || 1));

      // In a real backend, you would send { tenantData, adminUserData } together in one transaction
      const tenant: Tenant = {
          id: Math.random().toString(36).substr(2, 9),
          name: newTenant.name, // Company Name
          email: adminUser.email, // Contact Email
          initialPassword: adminUser.password, // For display
          planDurationMonths: newTenant.planDurationMonths || 1,
          monthlyPrice: newTenant.monthlyPrice || 79.90,
          totalValue: calculatePlanTotal(),
          startDate: now.toISOString().split('T')[0],
          expiryDate: expiry.toISOString().split('T')[0],
          status: 'active'
      };

      setTenants([tenant, ...tenants]);
      setIsTenantModalOpen(false);
      setNewTenant({ planDurationMonths: 1, monthlyPrice: 79.90 });
      setAdminUser({ name: '', email: '', password: '' });
  };

  const handleSaveFile = () => {
      if (!newFile.title) return alert('Preencha o título.');
      
      let category = newFile.category || 'Modelos';
      if (isAddingCategory && newCategoryName) {
          category = newCategoryName;
          setCategories([...categories, newCategoryName]);
          setNewCategoryName('');
          setIsAddingCategory(false);
      }

      const file: GlobalResource = {
          id: Math.random().toString(36).substr(2, 9),
          title: newFile.title,
          category: category,
          type: 'pdf', 
          size: '1.0 MB',
          date: new Date().toISOString().split('T')[0],
          public: true
      };

      setFiles([file, ...files]);
      setIsFileModalOpen(false);
      setNewFile({ category: 'Modelos' });
  };

  const handleSaveGlobalForm = (data: { title: string; description: string; questions: FormQuestion[] }) => {
      if (editingFormId) {
          setForms(prev => prev.map(f => f.id === editingFormId ? { ...f, ...data } : f));
      } else {
          const newForm: ClinicalForm = {
              id: Math.random().toString(36).substr(2, 9),
              title: data.title,
              description: data.description,
              questions: data.questions,
              createdAt: new Date().toISOString(),
              responseCount: 0,
              hash: Math.random().toString(36).substr(2, 12)
          };
          setForms([...forms, newForm]);
      }
      setIsFormBuilderOpen(false);
      setEditingFormId(null);
  };

  const handleDeleteTenant = (id: string) => {
      if (confirm('Deletar este usuário e cancelar acesso?')) {
          setTenants(tenants.filter(t => t.id !== id));
      }
  };

  const handleDeleteFile = (id: string) => {
      if (confirm('Remover arquivo público?')) {
          setFiles(files.filter(f => f.id !== id));
      }
  };

  const handleDeleteForm = (id: string) => {
      if (confirm('Remover formulário global?')) {
          setForms(forms.filter(f => f.id !== id));
      }
  };

  const stats = useMemo(() => {
      const active = tenants.filter(t => t.status === 'active').length;
      const totalRevenue = tenants.reduce((acc, t) => acc + t.totalValue, 0);
      const expiringSoon = tenants.filter(t => {
          const exp = new Date(t.expiryDate);
          const now = new Date();
          const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return diff > 0 && diff <= 30;
      }).length;

      return { active, totalRevenue, expiringSoon };
  }, [tenants]);

  if (isFormBuilderOpen) {
      const initialFormData = editingFormId ? forms.find(f => f.id === editingFormId) : undefined;
      return (
          <div className="fixed inset-0 bg-white z-[100] overflow-y-auto">
              <FormBuilder 
                  initialData={initialFormData}
                  onSave={handleSaveGlobalForm}
                  onCancel={() => { setIsFormBuilderOpen(false); setEditingFormId(null); }}
              />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col fixed h-full z-20">
          <div className="h-20 flex items-center px-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                      <ShieldCheck size={18} />
                  </div>
                  <div>
                      <h1 className="font-bold text-white text-sm tracking-wide">Super Admin</h1>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Painel Master</p>
                  </div>
              </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
              >
                  <LayoutDashboard size={18} /> Visão Geral
              </button>
              <button 
                onClick={() => setActiveTab('tenants')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'tenants' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
              >
                  <Users size={18} /> Clientes (Tenants)
              </button>
              <button 
                onClick={() => setActiveTab('files')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'files' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
              >
                  <FolderOpen size={18} /> Arquivos Globais
              </button>
              <button 
                onClick={() => setActiveTab('forms')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'forms' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
              >
                  <ClipboardList size={18} /> Formulários Globais
              </button>
          </nav>

          <div className="p-4 border-t border-slate-800">
              <div className="flex items-center gap-3 px-4 py-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">AD</div>
                  <div className="text-xs">
                      <p className="text-white font-bold">Eduardo Admin</p>
                      <p className="text-slate-500">admin@develoi.com</p>
                  </div>
              </div>
              <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-red-400 text-xs font-bold hover:bg-red-900/20 transition-colors">
                  <LogOut size={14} /> Sair do Painel
              </button>
          </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
          
          {/* DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
              <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
                  <h2 className="text-2xl font-bold text-white mb-6">Dashboard Administrativo</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                          <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl"><DollarSign size={24} /></div>
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Vendas</span>
                          </div>
                          <h3 className="text-3xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</h3>
                          <p className="text-sm text-slate-400 mt-1">Faturamento acumulado</p>
                      </div>
                      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                          <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl"><Users size={24} /></div>
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clientes Ativos</span>
                          </div>
                          <h3 className="text-3xl font-bold text-white">{stats.active}</h3>
                          <p className="text-sm text-slate-400 mt-1">Tenants com acesso</p>
                      </div>
                      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                          <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl"><AlertTriangle size={24} /></div>
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">A Vencer</span>
                          </div>
                          <h3 className="text-3xl font-bold text-white">{stats.expiringSoon}</h3>
                          <p className="text-sm text-slate-400 mt-1">Vencem em 30 dias</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                          <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                              <h3 className="font-bold text-white">Últimos Clientes</h3>
                              <button onClick={() => setActiveTab('tenants')} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">Ver todos <ChevronRight size={14} /></button>
                          </div>
                          <div className="divide-y divide-slate-700">
                              {tenants.slice(0, 5).map(t => (
                                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors">
                                      <div>
                                          <p className="font-bold text-sm text-white">{t.name}</p>
                                          <p className="text-xs text-slate-400">{t.email}</p>
                                      </div>
                                      <div className="text-right">
                                          <p className="text-sm font-bold text-emerald-400">{formatCurrency(t.totalValue)}</p>
                                          <p className="text-[10px] text-slate-500">{t.planDurationMonths} meses</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
                          <h3 className="font-bold text-white mb-4">Arquivos Públicos Recentes</h3>
                          <div className="space-y-3">
                              {files.slice(0, 4).map(f => (
                                  <div key={f.id} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-xl border border-slate-700">
                                      <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><FileText size={16} /></div>
                                      <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-white truncate">{f.title}</p>
                                          <p className="text-xs text-slate-400">{f.category}</p>
                                      </div>
                                      <span className="text-[10px] font-bold bg-slate-600 px-2 py-1 rounded text-slate-300">{f.type.toUpperCase()}</span>
                                  </div>
                              ))}
                          </div>
                          <button onClick={() => setActiveTab('files')} className="w-full mt-4 py-2 text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">Gerenciar Biblioteca</button>
                      </div>
                  </div>
              </div>
          )}

          {/* TENANTS VIEW */}
          {activeTab === 'tenants' && (
              <div className="max-w-6xl mx-auto animate-fadeIn">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                          <h2 className="text-2xl font-bold text-white">Gestão de Clientes</h2>
                          <p className="text-slate-400 mt-1">Crie empresas (Tenants) e o primeiro usuário Admin.</p>
                      </div>
                      <button 
                        onClick={() => setIsTenantModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-900/50 flex items-center gap-2 transition-all"
                      >
                          <Plus size={18} /> Novo Cliente
                      </button>
                  </div>

                  <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
                      <div className="overflow-x-auto">
                          <table className="w-full text-left">
                              <thead>
                                  <tr className="bg-slate-900/50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                                      <th className="px-6 py-4">Empresa / Admin</th>
                                      <th className="px-6 py-4">Plano</th>
                                      <th className="px-6 py-4">Valor Total</th>
                                      <th className="px-6 py-4">Validade</th>
                                      <th className="px-6 py-4">Status</th>
                                      <th className="px-6 py-4 text-right">Ações</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-700 text-sm">
                                  {tenants.map(tenant => (
                                      <tr key={tenant.id} className="hover:bg-slate-700/30 transition-colors">
                                          <td className="px-6 py-4">
                                              <p className="font-bold text-white flex items-center gap-2"><Building size={14} className="text-indigo-400"/> {tenant.name}</p>
                                              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5"><User size={12} /> {tenant.email}</p>
                                              {tenant.initialPassword && <p className="text-[10px] text-yellow-500 mt-1 bg-yellow-500/10 inline-block px-1.5 rounded">Senha: {tenant.initialPassword}</p>}
                                          </td>
                                          <td className="px-6 py-4 text-slate-300">
                                              {tenant.planDurationMonths === 12 ? 'Anual' : `${tenant.planDurationMonths} Meses`}
                                          </td>
                                          <td className="px-6 py-4 font-bold text-emerald-400">
                                              {formatCurrency(tenant.totalValue)}
                                          </td>
                                          <td className="px-6 py-4 text-slate-300">
                                              {new Date(tenant.expiryDate).toLocaleDateString()}
                                          </td>
                                          <td className="px-6 py-4">
                                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${tenant.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                  {tenant.status === 'active' ? 'Ativo' : 'Expirado'}
                                              </span>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <button 
                                                onClick={() => handleDeleteTenant(tenant.id)}
                                                className="p-2 bg-slate-700 hover:bg-red-900/50 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                                              >
                                                  <Trash2 size={16} />
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}

          {/* FILES VIEW (Resto do código mantido igual) */}
          {activeTab === 'files' && (
              <div className="max-w-6xl mx-auto animate-fadeIn">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                          <h2 className="text-2xl font-bold text-white">Arquivos Globais</h2>
                          <p className="text-slate-400 mt-1">Gerencie documentos públicos visíveis para todos os tenants.</p>
                      </div>
                      <button 
                        onClick={() => { setIsAddingCategory(false); setIsFileModalOpen(true); }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-900/50 flex items-center gap-2 transition-all"
                      >
                          <UploadCloud size={18} /> Upload Arquivo
                      </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {files.map(file => (
                          <div key={file.id} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex flex-col group hover:border-indigo-500/50 transition-all">
                              <div className="flex items-start justify-between mb-4">
                                  <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-indigo-400">
                                      <FileText size={24} />
                                  </div>
                                  <span className="text-[10px] font-bold bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-600">
                                      {file.type.toUpperCase()}
                                  </span>
                              </div>
                              <h3 className="font-bold text-white mb-1 truncate" title={file.title}>{file.title}</h3>
                              <p className="text-xs text-slate-400 mb-4">{file.category}</p>
                              
                              <div className="mt-auto pt-4 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
                                  <span>{file.size} • {new Date(file.date).toLocaleDateString()}</span>
                                  <button onClick={() => handleDeleteFile(file.id)} className="text-slate-400 hover:text-red-400 p-1"><Trash2 size={16} /></button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* FORMS VIEW (Resto do código mantido igual) */}
          {activeTab === 'forms' && (
              <div className="max-w-6xl mx-auto animate-fadeIn">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                          <h2 className="text-2xl font-bold text-white">Formulários Globais</h2>
                          <p className="text-slate-400 mt-1">Crie modelos de anamnese e questionários para todos os usuários.</p>
                      </div>
                      <button 
                        onClick={() => { setEditingFormId(null); setIsFormBuilderOpen(true); }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-900/50 flex items-center gap-2 transition-all"
                      >
                          <Plus size={18} /> Criar Modelo
                      </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {forms.map(form => (
                          <div key={form.id} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex flex-col group hover:border-indigo-500/50 transition-all">
                              <div className="flex items-start justify-between mb-4">
                                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-lg border border-purple-500/20">
                                      {form.title.charAt(0)}
                                  </div>
                                  <div className="flex gap-2">
                                      <button 
                                        onClick={() => { setEditingFormId(form.id); setIsFormBuilderOpen(true); }}
                                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors"
                                      >
                                          <Edit3 size={14} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteForm(form.id)}
                                        className="p-2 bg-slate-700 hover:bg-red-900/50 rounded-lg text-slate-300 hover:text-red-400 transition-colors"
                                      >
                                          <Trash2 size={14} />
                                      </button>
                                  </div>
                              </div>
                              <h3 className="font-bold text-white mb-2 line-clamp-1">{form.title}</h3>
                              <p className="text-xs text-slate-400 mb-4 line-clamp-2 min-h-[2.5em]">{form.description}</p>
                              
                              <div className="mt-auto pt-4 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
                                  <span className="flex items-center gap-1"><ClipboardList size={12}/> {form.questions.length} campos</span>
                                  <span>{new Date(form.createdAt).toLocaleDateString()}</span>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* --- MODAL: NEW TENANT --- */}
          {isTenantModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
                  <div className="bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl p-6">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-bold text-white">Novo Cliente (Tenant)</h3>
                          <button onClick={() => setIsTenantModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                      </div>
                      
                      <div className="space-y-6">
                          {/* Company Data */}
                          <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                              <h4 className="text-sm font-bold text-indigo-400 uppercase mb-4 flex items-center gap-2"><Building size={16} /> Dados da Empresa</h4>
                              <div className="space-y-4">
                                  <div>
                                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nome da Clínica / Empresa</label>
                                      <input type="text" className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-indigo-500 transition-colors" placeholder="Ex: Clínica Bem Viver" value={newTenant.name || ''} onChange={e => setNewTenant({...newTenant, name: e.target.value})} />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Plano (Meses)</label>
                                          <select 
                                            className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-indigo-500"
                                            value={newTenant.planDurationMonths}
                                            onChange={e => setNewTenant({...newTenant, planDurationMonths: parseInt(e.target.value)})}
                                          >
                                              <option value={1}>1 Mês</option>
                                              <option value={3}>3 Meses</option>
                                              <option value={6}>6 Meses</option>
                                              <option value={12}>1 Ano</option>
                                          </select>
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Mensalidade (R$)</label>
                                          <input type="number" className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-indigo-500" value={newTenant.monthlyPrice} onChange={e => setNewTenant({...newTenant, monthlyPrice: parseFloat(e.target.value)})} />
                                      </div>
                                  </div>
                              </div>
                          </div>

                          {/* Initial Admin User */}
                          <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                              <h4 className="text-sm font-bold text-emerald-400 uppercase mb-4 flex items-center gap-2"><Lock size={16} /> Acesso Admin Inicial</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Email do Responsável</label>
                                      <input type="email" className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-emerald-500 transition-colors" placeholder="admin@clinica.com" value={adminUser.email} onChange={e => setAdminUser({...adminUser, email: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nome do Responsável</label>
                                      <input type="text" className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-emerald-500" placeholder="Dr. João" value={adminUser.name} onChange={e => setAdminUser({...adminUser, name: e.target.value})} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Senha Temporária</label>
                                      <input type="text" className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-emerald-500" placeholder="Ex: Mudar123" value={adminUser.password} onChange={e => setAdminUser({...adminUser, password: e.target.value})} />
                                  </div>
                              </div>
                          </div>

                          <div className="flex justify-between items-center pt-2">
                              <div className="text-right">
                                  <span className="text-xs text-slate-500 block">Total do Contrato</span>
                                  <span className="text-xl font-bold text-white">{formatCurrency(calculatePlanTotal())}</span>
                              </div>
                              <div className="flex gap-3">
                                  <button onClick={() => setIsTenantModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800">Cancelar</button>
                                  <button onClick={handleSaveTenant} className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg">Criar Acesso</button>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* --- MODAL: NEW FILE --- */}
          {isFileModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
                  <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-bold text-white">Anexar Arquivo Global</h3>
                          <button onClick={() => setIsFileModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                      </div>
                      
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Título do Arquivo</label>
                              <input type="text" className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-indigo-500" value={newFile.title || ''} onChange={e => setNewFile({...newFile, title: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Categoria</label>
                              <div className="flex gap-2">
                                  {isAddingCategory ? (
                                      <input 
                                        type="text" 
                                        autoFocus
                                        placeholder="Nome da nova categoria..."
                                        className="w-full p-3 rounded-xl bg-slate-800 border border-indigo-500 text-white outline-none"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                      />
                                  ) : (
                                      <select 
                                        className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-indigo-500"
                                        value={newFile.category}
                                        onChange={e => setNewFile({...newFile, category: e.target.value})}
                                      >
                                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                      </select>
                                  )}
                                  <button 
                                    onClick={() => setIsAddingCategory(!isAddingCategory)}
                                    className={`p-3 rounded-xl border border-slate-700 hover:border-indigo-500 transition-colors ${isAddingCategory ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    title="Nova Categoria"
                                  >
                                      {isAddingCategory ? <X size={20} /> : <Plus size={20} />}
                                  </button>
                              </div>
                          </div>
                          
                          <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-800 hover:border-slate-600 transition-all cursor-pointer">
                              <UploadCloud size={32} className="mb-2" />
                              <span className="text-xs font-bold">Clique para selecionar arquivo</span>
                          </div>
                      </div>

                      <div className="mt-6 flex justify-end gap-3">
                          <button onClick={() => setIsFileModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800">Cancelar</button>
                          <button onClick={handleSaveFile} className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg">Salvar Arquivo</button>
                      </div>
                  </div>
              </div>
          )}

      </main>
    </div>
  );
};
