
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Tenant, ClinicalForm } from '../types';
import { 
  LayoutDashboard, Users, FolderOpen, LogOut, Search, Plus, 
  Trash2, ShieldCheck, DollarSign, X, ClipboardList, Edit3, Building, User, Loader2
} from 'lucide-react';
import { FormBuilder } from '../components/Forms/FormBuilder';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const SuperAdmin: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tenants' | 'forms'>('dashboard');
  const [tenants, setTenants] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // States for Tenant Modal
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({
      company_name: '',
      admin_name: '',
      admin_email: '',
      password: '',
      plan_type: 'mensal'
  });

  const [isFormBuilderOpen, setIsFormBuilderOpen] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);

  const fetchData = async () => {
      setIsLoading(true);
      try {
          const [tenantsData, formsData] = await Promise.all([
              api.get<any[]>('/tenants'),
              api.get<any[]>('/forms')
          ]);
          setTenants(tenantsData);
          setForms(formsData);
      } catch (e: any) {
          console.error(e.message);
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
      fetchData();
  }, []);

  const handleSaveTenant = async () => {
      try {
          await api.post('/tenants', newTenant);
          fetchData();
          setIsTenantModalOpen(false);
          setNewTenant({ company_name: '', admin_name: '', admin_email: '', password: '', plan_type: 'mensal' });
      } catch (e: any) {
          alert(e.message);
      }
  };

  const handleDeleteTenant = async (id: number) => {
      if (confirm('Deletar este tenant e todos os dados relacionados?')) {
          await api.delete(`/tenants/${id}`);
          fetchData();
      }
  };

  const stats = useMemo(() => {
      return {
          totalTenants: tenants.length,
          totalRevenue: tenants.length * 79.9, // Mock simple math
          activeTenants: tenants.length 
      };
  }, [tenants]);

  if (isFormBuilderOpen) {
      return (
          <div className="fixed inset-0 bg-white z-[100] overflow-y-auto">
              <FormBuilder 
                  onSave={async (data) => {
                      await api.post('/forms', data);
                      setIsFormBuilderOpen(false);
                      fetchData();
                  }}
                  onCancel={() => setIsFormBuilderOpen(false)}
              />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex font-sans">
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col fixed h-full z-20">
          <div className="h-20 flex items-center px-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold"><ShieldCheck size={18} /></div>
                  <div><h1 className="font-bold text-white text-sm tracking-wide">Super Admin</h1><p className="text-[10px] text-slate-500 uppercase font-bold">Painel Master</p></div>
              </div>
          </div>
          <nav className="flex-1 p-4 space-y-2">
              <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}><LayoutDashboard size={18} /> Visão Geral</button>
              <button onClick={() => setActiveTab('tenants')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'tenants' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}><Users size={18} /> Clientes (Tenants)</button>
              <button onClick={() => setActiveTab('forms')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'forms' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}><ClipboardList size={18} /> Formulários Globais</button>
          </nav>
          <div className="p-4 border-t border-slate-800"><button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-red-400 text-xs font-bold hover:bg-red-900/20 transition-colors"><LogOut size={14} /> Sair</button></div>
      </aside>

      <main className="flex-1 ml-64 p-8 overflow-y-auto">
          {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-500 mb-2" size={40} /><p>Carregando dados master...</p></div>
          ) : (
              <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
                  {activeTab === 'dashboard' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                              <p className="text-slate-400 text-xs font-bold uppercase mb-4">Total Clientes</p>
                              <h3 className="text-3xl font-bold">{stats.totalTenants}</h3>
                          </div>
                          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                              <p className="text-slate-400 text-xs font-bold uppercase mb-4">Faturamento Est.</p>
                              <h3 className="text-3xl font-bold text-emerald-400">{formatCurrency(stats.totalRevenue)}</h3>
                          </div>
                      </div>
                  )}

                  {activeTab === 'tenants' && (
                      <div className="space-y-6">
                          <div className="flex justify-between items-center">
                              <h2 className="text-2xl font-bold">Gestão de Tenants</h2>
                              <button onClick={() => setIsTenantModalOpen(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2"><Plus size={18} /> Novo Cliente</button>
                          </div>
                          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                              <table className="w-full text-left">
                                  <thead className="bg-slate-950 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                      <tr><th className="px-6 py-4">Empresa</th><th className="px-6 py-4">Plano</th><th className="px-6 py-4">Admin</th><th className="px-6 py-4 text-right">Ações</th></tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-700 text-sm">
                                      {tenants.map(t => (
                                          <tr key={t.id} className="hover:bg-slate-700/30">
                                              <td className="px-6 py-4 font-bold text-white">{t.company_name}</td>
                                              <td className="px-6 py-4 capitalize text-slate-400">{t.plan_type}</td>
                                              <td className="px-6 py-4"><div><p className="font-bold">{t.admin_name}</p><p className="text-xs opacity-50">{t.admin_email}</p></div></td>
                                              <td className="px-6 py-4 text-right"><button onClick={() => handleDeleteTenant(t.id)} className="text-red-400 hover:text-red-300 p-2"><Trash2 size={16} /></button></td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  )}
              </div>
          )}
      </main>

      {isTenantModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 p-8">
                  <h3 className="text-xl font-bold text-white mb-6">Criar Novo Cliente</h3>
                  <div className="space-y-4">
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Clínica</label><input type="text" className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white" value={newTenant.company_name} onChange={e => setNewTenant({...newTenant, company_name: e.target.value})} /></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Responsável</label><input type="text" className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white" value={newTenant.admin_name} onChange={e => setNewTenant({...newTenant, admin_name: e.target.value})} /></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail do Admin</label><input type="email" className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white" value={newTenant.admin_email} onChange={e => setNewTenant({...newTenant, admin_email: e.target.value})} /></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha Inicial</label><input type="text" className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white" value={newTenant.password} onChange={e => setNewTenant({...newTenant, password: e.target.value})} /></div>
                  </div>
                  <div className="flex gap-3 mt-8"><button onClick={() => setIsTenantModalOpen(false)} className="flex-1 py-3 font-bold text-slate-400 bg-slate-800 rounded-xl">Cancelar</button><button onClick={handleSaveTenant} className="flex-1 py-3 font-bold text-white bg-indigo-600 rounded-xl">Criar Acesso</button></div>
              </div>
          </div>
      )}
    </div>
  );
};
