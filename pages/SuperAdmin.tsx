import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api } from '../services/api';
import {
  LayoutDashboard, Users, LogOut, Plus, Trash2, ShieldCheck,
  X, Building2, User, Loader2, CheckCircle, Edit2, Save,
  TrendingUp, Package, ToggleLeft, ToggleRight, Key, AlertCircle,
  Eye, EyeOff, ChevronRight, ArrowUpRight,
  DollarSign, Activity, BarChart3, Shield, Lock, Phone, Mail,
  Calendar, Check, AlertTriangle, Info, Copy, RefreshCw, Link,
  Globe, UserCheck, BarChart2, Star, Menu
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';

// ── formatters ────────────────────────────────────────────────────────────────
const _fmtCurrency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const _fmtCompact  = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const fmt      = (v: number) => _fmtCurrency.format(v);
const fmtShort = (v: number) => _fmtCompact.format(v);
const fmtDate  = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase() : '—';

// ── constants ─────────────────────────────────────────────────────────────────
const FEATURES_OPTIONS = [
  { key: 'agenda',               label: 'Agenda' },
  { key: 'pacientes',            label: 'Pacientes' },
  { key: 'prontuario',           label: 'Prontuário' },
  { key: 'formularios',          label: 'Formulários' },
  { key: 'salas_virtuais',       label: 'Salas Virtuais' },
  { key: 'pei',                  label: 'PEI / Neurodesenvolvimento' },
  { key: 'ferramentas_clinicas', label: 'Ferramentas Clínicas' },
  { key: 'estudos_de_caso',      label: 'Estudos de Caso' },
  { key: 'financeiro',           label: 'Financeiro' },
  { key: 'documentos',           label: 'Gerador de Documentos' },
  { key: 'relatorios',           label: 'Relatórios Avançados' },
  { key: 'api_acesso',           label: 'Acesso à API' },
  { key: 'suporte_prioritario',  label: 'Suporte Prioritário' },
];

const MASTER_PERMISSIONS_OPTIONS = [
  { key: 'ver_parceiros',        label: 'Visualizar parceiros' },
  { key: 'criar_parceiros',      label: 'Criar novos parceiros' },
  { key: 'editar_parceiros',     label: 'Editar parceiros' },
  { key: 'ver_financeiro',       label: 'Ver financeiro / MRR' },
  { key: 'ver_dashboard',        label: 'Acesso ao dashboard' },
  { key: 'ver_planos',           label: 'Visualizar planos' },
  { key: 'editar_planos',        label: 'Criar e editar planos' },
  { key: 'ver_equipe',           label: 'Ver equipe interna' },
  { key: 'gerenciar_equipe',     label: 'Gerenciar equipe' },
  { key: 'relatorios_master',    label: 'Relatórios master' },
  { key: 'configuracoes',        label: 'Configurações globais' },
];

const ROLE_TYPES = [
  { value: 'super_admin',   label: 'Super Admin',  color: 'indigo' },
  { value: 'vendedor',      label: 'Vendedor',     color: 'emerald' },
  { value: 'suporte',       label: 'Suporte',      color: 'sky' },
  { value: 'visualizador',  label: 'Visualizador', color: 'amber' },
  { value: 'financeiro',    label: 'Financeiro',   color: 'violet' },
];

const ROLE_COLOR: Record<string, { bg: string; text: string; light: string; border: string; grad: string }> = {
  super_admin:  { bg: 'bg-indigo-600',  text: 'text-indigo-600',  light: 'bg-indigo-50',  border: 'border-indigo-200', grad: 'from-indigo-600 to-indigo-500' },
  vendedor:     { bg: 'bg-emerald-600', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200', grad: 'from-emerald-600 to-emerald-500' },
  suporte:      { bg: 'bg-sky-600',     text: 'text-sky-600',     light: 'bg-sky-50',     border: 'border-sky-200',    grad: 'from-sky-600 to-sky-500' },
  visualizador: { bg: 'bg-amber-500',   text: 'text-amber-600',   light: 'bg-amber-50',   border: 'border-amber-200',  grad: 'from-amber-500 to-amber-400' },
  financeiro:   { bg: 'bg-violet-600',  text: 'text-violet-600',  light: 'bg-violet-50',  border: 'border-violet-200', grad: 'from-violet-600 to-violet-500' },
};

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

const AVATAR_COLORS = ['#6366f1','#10b981','#3b82f6','#f59e0b','#ec4899','#8b5cf6','#06b6d4'];
const avatarColor = (name: string) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const initials = (name: string) => name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';

type Tab = 'dashboard' | 'clients' | 'team' | 'permissions' | 'plans';
const NAV: { id: Tab; label: string; Icon: any }[] = [
  { id: 'dashboard',   label: 'Dashboard',  Icon: LayoutDashboard },
  { id: 'clients',     label: 'Parceiros',  Icon: Building2 },
  { id: 'team',        label: 'Equipe',     Icon: Users },
  { id: 'permissions', label: 'Permissões', Icon: Lock },
  { id: 'plans',       label: 'Planos',     Icon: Package },
];

// ── Toast ─────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info';
interface ToastMsg { id: number; message: string; type: ToastType; }

const ToastBar: React.FC<{ toast: ToastMsg; remove: (id: number) => void }> = ({ toast, remove }) => {
  useEffect(() => { const t = setTimeout(() => remove(toast.id), 4000); return () => clearTimeout(t); }, []);
  const styles: Record<ToastType, string> = {
    success: 'border-emerald-200 bg-white',
    error:   'border-red-200 bg-white',
    info:    'border-indigo-200 bg-white',
  };
  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={15} className="text-emerald-500 flex-shrink-0" />,
    error:   <AlertCircle size={15} className="text-red-500 flex-shrink-0" />,
    info:    <Info        size={15} className="text-indigo-500 flex-shrink-0" />,
  };
  return (
    <div className={`flex items-center gap-3 border rounded-xl shadow-xl px-4 py-3 text-sm font-medium text-slate-700 min-w-[280px] max-w-sm animate-slideIn ${styles[toast.type]}`}>
      {icons[toast.type]}
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => remove(toast.id)} className="text-slate-300 hover:text-slate-500 transition"><X size={13} /></button>
    </div>
  );
};

const Toasts: React.FC<{ toasts: ToastMsg[]; remove: (id: number) => void }> = ({ toasts, remove }) => (
  <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 items-end pointer-events-none">
    {toasts.map(t => <div key={t.id} className="pointer-events-auto"><ToastBar toast={t} remove={remove} /></div>)}
  </div>
);

// ── Confirm ───────────────────────────────────────────────────────────────────
interface ConfirmState { message: string; detail?: string; onConfirm: () => void; danger?: boolean; }
const ConfirmModal: React.FC<ConfirmState & { onClose: () => void }> = ({ message, detail, onConfirm, danger, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
    <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-sm p-6">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${danger ? 'bg-red-50' : 'bg-amber-50'}`}>
        <AlertTriangle size={22} className={danger ? 'text-red-500' : 'text-amber-500'} />
      </div>
      <h3 className="font-bold text-slate-800 text-base mb-1">{message}</h3>
      {detail && <p className="text-sm text-slate-500 mb-2">{detail}</p>}
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancelar</button>
        <button onClick={() => { onConfirm(); onClose(); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}>
          Confirmar
        </button>
      </div>
    </div>
  </div>
);

// ── Modal ─────────────────────────────────────────────────────────────────────
const Modal: React.FC<{ title: string; sub?: string; onClose: () => void; children: React.ReactNode; wide?: boolean; error?: string }> =
  ({ title, sub, onClose, children, wide, error }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-sm">
    <div className={`bg-white border border-slate-200 w-full ${wide ? 'max-w-xl' : 'max-w-md'} rounded-2xl shadow-2xl flex flex-col max-h-[94vh]`}>
      <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
        <div><h3 className="text-base font-bold text-slate-800">{title}</h3>{sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}</div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition flex-shrink-0"><X size={16} /></button>
      </div>
      <div className="p-6 space-y-4 overflow-y-auto flex-1">
        {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-3.5 py-2.5 rounded-lg"><AlertCircle size={14} className="flex-shrink-0" />{error}</div>}
        {children}
      </div>
    </div>
  </div>
);

// ── form helpers ──────────────────────────────────────────────────────────────
const inp = 'w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';
const sel = inp + ' cursor-pointer';
const lbl = (t: string) => <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{t}</label>;
const btnP = 'flex-1 py-2.5 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm flex items-center justify-center gap-2';
const btnS = 'flex-1 py-2.5 font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition text-sm';

const StatusBadge = ({ active }: { active: boolean }) => active
  ? <span className="inline-flex items-center gap-1.5 text-emerald-700 text-xs font-bold bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />ATIVO</span>
  : <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-bold bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-slate-400" />INATIVO</span>;

// ═════════════════════════════════════════════════════════════════════════════
export const SuperAdmin: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'super_admin';
  const [tab, setTab] = useState<Tab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants]           = useState<any[]>([]);
  const [plans, setPlans]               = useState<any[]>([]);
  const [stats, setStats]               = useState<any>(null);
  const [masterUsers, setMasterUsers]   = useState<any[]>([]);
  const [mrrHistory, setMrrHistory]     = useState<any[]>([]);
  const [permProfiles, setPermProfiles] = useState<any[]>([]);

  // toasts
  const toastId = useRef(0);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);
  const removeToast = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // confirm
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const doConfirm = useCallback((cfg: ConfirmState) => setConfirmState(cfg), []);

  // team modal
  const [teamModal, setTeamModal]   = useState(false);
  const [teamForm, setTeamForm]     = useState({ name: '', email: '', password: '', phone: '', permission_profile_id: '' });
  const [showTeamPass, setShowTeamPass] = useState(false);
  const openTeamModal = () => { setError(''); setTeamForm({ name: '', email: '', password: '', phone: '', permission_profile_id: '' }); setTeamModal(true); };

  // client modal
  const [clientModal, setClientModal] = useState(false);
  const [showPass, setShowPass]       = useState(false);
  const [clientForm, setClientForm]   = useState({ company_name: '', cnpj_cpf: '', phone: '', admin_name: '', admin_email: '', password: '', plan_id: '' });
  const openClientModal = () => { setError(''); setClientModal(true); };

  // plan modal
  const [planModal, setPlanModal]   = useState(false);
  const [editPlan, setEditPlan]     = useState<any>(null);
  const [planForm, setPlanForm]     = useState({ name: '', description: '', price: '', max_users: '5', max_patients: '100', features: [] as string[] });

  // permission profile modal
  const [permModal, setPermModal]   = useState(false);
  const [editPerm, setEditPerm]     = useState<any>(null);
  const [permForm, setPermForm]     = useState({ name: '', description: '', role_type: 'visualizador', permissions: [] as string[] });
  const openNewPerm  = () => { setError(''); setEditPerm(null); setPermForm({ name: '', description: '', role_type: 'visualizador', permissions: [] }); setPermModal(true); };
  const openEditPerm = (p: any) => { setError(''); setEditPerm(p); setPermForm({ name: p.name, description: p.description || '', role_type: p.role_type, permissions: p.permissions || [] }); setPermModal(true); };

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [copied, setCopied] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [t, p, s, mu, mrr, pp] = await Promise.all([
        api.get<any[]>('/tenants'),
        api.get<any[]>('/plans/all'),
        api.get<any>('/tenants/stats'),
        api.get<any[]>('/master-users'),
        api.get<any[]>('/tenants/mrr-history'),
        api.get<any[]>('/master-permissions'),
      ]);
      setTenants(t); setPlans(p); setStats(s); setMasterUsers(mu); setMrrHistory(mrr); setPermProfiles(pp);
    } catch (e: any) { toast('Erro ao carregar dados.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleCreateTeamMember = async () => {
    setError('');
    if (!teamForm.name || !teamForm.email || !teamForm.password) { setError('Nome, email e senha são obrigatórios.'); return; }
    setSaving(true);
    try { await api.post('/master-users', teamForm); setTeamModal(false); toast(`${teamForm.name} adicionado à equipe!`); load(); }
    catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const handleDeleteTeamMember = (id: number, name: string) =>
    doConfirm({ message: `Remover ${name}?`, detail: 'O acesso master será revogado permanentemente.', danger: true,
      onConfirm: async () => { try { await api.delete(`/master-users/${id}`); toast(`${name} removido.`); load(); } catch { toast('Erro ao remover.', 'error'); } } });

  const handleCreateClient = async () => {
    setError('');
    if (!clientForm.company_name || !clientForm.admin_email || !clientForm.password) { setError('Preencha nome da clínica, email e senha.'); return; }
    setSaving(true);
    try {
      await api.post('/tenants', { ...clientForm, plan_id: clientForm.plan_id || undefined });
      setClientModal(false); setClientForm({ company_name: '', cnpj_cpf: '', phone: '', admin_name: '', admin_email: '', password: '', plan_id: '' });
      toast(`Clínica "${clientForm.company_name}" criada!`); load();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const handleToggleClient = async (t: any) => {
    try { await api.put(`/tenants/${t.id}`, { active: !t.active }); toast(t.active ? 'Clínica desativada.' : 'Clínica ativada!', 'info'); load(); }
    catch { toast('Erro ao atualizar.', 'error'); }
  };

  const handleDeleteClient = (t: any) =>
    doConfirm({ message: `Deletar "${t.company_name}"?`, detail: 'Todos os dados serão removidos. Ação irreversível.', danger: true,
      onConfirm: async () => { try { await api.delete(`/tenants/${t.id}`); toast(`"${t.company_name}" deletada.`); load(); } catch { toast('Erro ao deletar.', 'error'); } } });

  const openNewPlan  = () => { setError(''); setEditPlan(null); setPlanForm({ name: '', description: '', price: '', max_users: '5', max_patients: '100', features: [] }); setPlanModal(true); };
  const openEditPlan = (p: any) => { setError(''); setEditPlan(p); setPlanForm({ name: p.name, description: p.description || '', price: String(p.price), max_users: String(p.max_users), max_patients: String(p.max_patients), features: p.features || [] }); setPlanModal(true); };

  const handleSavePlan = async () => {
    setError('');
    if (!planForm.name || !planForm.price) { setError('Nome e preço são obrigatórios.'); return; }
    setSaving(true);
    try {
      const payload = { ...planForm, price: parseFloat(planForm.price), max_users: parseInt(planForm.max_users), max_patients: parseInt(planForm.max_patients) };
      if (editPlan) await api.put(`/plans/${editPlan.id}`, payload); else await api.post('/plans', payload);
      setPlanModal(false); toast(editPlan ? 'Plano atualizado!' : 'Plano criado!'); load();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const handleSavePerm = async () => {
    setError('');
    if (!permForm.name) { setError('Nome é obrigatório.'); return; }
    setSaving(true);
    try {
      if (editPerm) await api.put(`/master-permissions/${editPerm.id}`, permForm);
      else await api.post('/master-permissions', permForm);
      setPermModal(false); toast(editPerm ? 'Perfil atualizado!' : 'Perfil de permissão criado!'); load();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const handleDeletePerm = (p: any) =>
    doConfirm({ message: `Remover perfil "${p.name}"?`, detail: 'O link de acesso será desativado permanentemente.', danger: true,
      onConfirm: async () => { try { await api.delete(`/master-permissions/${p.id}`); toast(`Perfil "${p.name}" removido.`); load(); } catch { toast('Erro.', 'error'); } } });

  const handleRegenerateToken = async (p: any) =>
    doConfirm({ message: 'Gerar novo link?', detail: 'O link atual deixará de funcionar imediatamente.', danger: false,
      onConfirm: async () => {
        try {
          const res: any = await api.post(`/master-permissions/${p.id}/regenerate-token`, {});
          setPermProfiles(prev => prev.map(pp => pp.id === p.id ? { ...pp, access_token: res.access_token } : pp));
          toast('Novo link gerado!');
        } catch { toast('Erro ao gerar link.', 'error'); }
      } });

  const copyLink = (token: string, id: number) => {
    const link = `${window.location.origin}/acesso/${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(id);
      toast('Link copiado!', 'info');
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const toggleFeature = (key: string) => setPlanForm(prev => ({
    ...prev, features: prev.features.includes(key) ? prev.features.filter(f => f !== key) : [...prev.features, key],
  }));

  const togglePermission = (key: string) => setPermForm(prev => ({
    ...prev, permissions: prev.permissions.includes(key) ? prev.permissions.filter(p => p !== key) : [...prev.permissions, key],
  }));

  const ticketMedio = useMemo(() => stats?.active_tenants > 0 ? (stats.mrr / stats.active_tenants) : 0, [stats]);
  const TAB_LABELS: Record<Tab, string> = { dashboard: 'Dashboard', clients: 'Parceiros', team: 'Equipe', permissions: 'Permissões', plans: 'Planos' };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans">

      <Toasts toasts={toasts} remove={removeToast} />
      {confirmState && <ConfirmModal {...confirmState} onClose={() => setConfirmState(null)} />}

      {/* ══ SIDEBAR OVERLAY (mobile) ══ */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ══ SIDEBAR ══ */}
      <aside className={`w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-40 shadow-sm transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 leading-none">PsiFlux</p>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Super Admin</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition"><X size={16} /></button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => { setTab(id as Tab); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              <Icon size={16} className={tab === id ? 'text-indigo-600' : 'text-slate-400'} />
              {label}
              {tab === id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl bg-slate-50 mb-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-700 truncate">Super Admin</p>
              <p className="text-[10px] text-slate-400 truncate">super_admin</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-red-50 hover:text-red-500 transition font-medium">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen w-full min-w-0">
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200 px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition flex-shrink-0">
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0">
              <span className="text-slate-500 font-medium hidden sm:inline">Root</span>
              <ChevronRight size={12} className="flex-shrink-0 hidden sm:inline" />
              <span className="text-slate-700 font-semibold truncate">{TAB_LABELS[tab]}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {tab === 'clients'     && <button onClick={openClientModal} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-sm shadow-indigo-200"><Plus size={14} /><span className="hidden sm:inline">Nova Clínica</span></button>}
            {tab === 'plans'       && <button onClick={openNewPlan}     className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-sm shadow-indigo-200"><Plus size={14} /><span className="hidden sm:inline">Novo Plano</span></button>}
            {tab === 'team'        && <button onClick={openTeamModal}   className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-sm shadow-indigo-200"><Plus size={14} /><span className="hidden sm:inline">Novo Integrante</span></button>}
            {tab === 'permissions' && <button onClick={openNewPerm}     className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-sm shadow-indigo-200"><Plus size={14} /><span className="hidden sm:inline">Novo Perfil</span></button>}
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-7 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-indigo-500" size={30} /></div>
          ) : (
            <>
              {/* ══ DASHBOARD ══ */}
              {tab === 'dashboard' && stats && (
                <div className="space-y-5 max-w-6xl">
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    {[
                      { label: 'Receita Mensal (MRR)', value: fmt(stats.mrr || 0), Icon: DollarSign, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', border: 'border-l-emerald-400', sub: `${stats.active_tenants || 0} clínicas ativas` },
                      { label: 'Clínicas Ativas', value: String(stats.active_tenants || 0), Icon: Building2, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', border: 'border-l-indigo-400', sub: `${stats.total_tenants || 0} total` },
                      { label: 'Usuários Totais', value: String(stats.total_users || 0), Icon: Users, iconBg: 'bg-sky-100', iconColor: 'text-sky-600', border: 'border-l-sky-400', sub: 'Em todas as clínicas' },
                      { label: 'Ticket Médio', value: fmt(ticketMedio), Icon: TrendingUp, iconBg: 'bg-amber-100', iconColor: 'text-amber-600', border: 'border-l-amber-400', sub: 'Por clínica / mês' },
                    ].map(c => (
                      <div key={c.label} className={`bg-white border border-slate-200 border-l-4 ${c.border} rounded-xl p-5 shadow-sm`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-9 h-9 rounded-xl ${c.iconBg} flex items-center justify-center`}><c.Icon size={17} className={c.iconColor} /></div>
                          <ArrowUpRight size={14} className="text-slate-300" />
                        </div>
                        <p className="text-xs font-semibold text-slate-400 mb-1">{c.label}</p>
                        <p className="text-2xl font-bold text-slate-800 mb-1">{c.value}</p>
                        <p className="text-xs text-slate-400">{c.sub}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div><p className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Activity size={14} className="text-indigo-500" /> Evolução de Receita</p><p className="text-xs text-slate-400 mt-0.5">Últimos 6 meses</p></div>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">6 meses</span>
                      </div>
                      <div className="h-48 min-h-0">
                        {mrrHistory.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={mrrHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                              <defs><linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, color: '#334155', fontSize: 12 }} formatter={(v: any) => [fmt(v), 'MRR']} />
                              <Area type="monotone" dataKey="mrr" stroke="#6366f1" strokeWidth={2.5} fill="url(#mrrGrad)" dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }} />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados ainda</div>}
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                      <p className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-0.5"><BarChart3 size={14} className="text-indigo-500" /> Distribuição</p>
                      <p className="text-xs text-slate-400 mb-4">Clínicas por plano</p>
                      {stats.by_plan?.length > 0 ? (
                        <>
                          <div className="h-36 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart><Pie data={stats.by_plan} dataKey="count" nameKey="plan_name" cx="50%" cy="50%" innerRadius={38} outerRadius={62} strokeWidth={2} stroke="#f8fafc">
                                {stats.by_plan.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                              </Pie><Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} /></PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="space-y-2 mt-2">
                            {stats.by_plan.map((p: any, i: number) => (
                              <div key={p.plan_name} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} /><span className="text-slate-500">{p.plan_name}</span></div>
                                <span className="text-slate-700 font-semibold">{p.count}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : <div className="h-36 flex items-center justify-center text-slate-400 text-sm">Nenhum plano ativo</div>}
                    </div>
                  </div>
                  {stats.by_plan?.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-700 flex items-center gap-2"><BarChart3 size={14} className="text-amber-500" /> Performance por Plano</p>
                        <button onClick={() => setTab('plans')} className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1">Ver planos <ArrowUpRight size={11} /></button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[480px]">
                          <thead><tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Plano</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Clínicas</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Receita/mês</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase">% MRR</th>
                          </tr></thead>
                          <tbody>
                            {stats.by_plan.map((p: any, i: number) => {
                              const planMrr = p.price * p.count;
                              const pct = stats.mrr > 0 ? Math.round(planMrr / stats.mrr * 100) : 0;
                              return (
                                <tr key={p.plan_name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition">
                                  <td className="px-6 py-3.5"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} /><span className="text-slate-700 font-medium">{p.plan_name}</span></div></td>
                                  <td className="px-6 py-3.5 text-slate-500">{p.count}</td>
                                  <td className="px-6 py-3.5 text-emerald-600 font-semibold">{fmt(planMrr)}</td>
                                  <td className="px-6 py-3.5"><div className="flex items-center gap-2"><div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-24"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} /></div><span className="text-slate-400 text-xs">{pct}%</span></div></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══ PARCEIROS — CARDS ══ */}
              {tab === 'clients' && (
                <div className="max-w-7xl space-y-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4 flex-wrap">
                      {[
                        { label: 'Total',  value: tenants.length,                            Icon: Building2,  bg: 'bg-indigo-50',  text: 'text-indigo-600' },
                        { label: 'Ativas', value: tenants.filter(t => t.active).length,      Icon: CheckCircle,bg: 'bg-emerald-50', text: 'text-emerald-600' },
                        { label: 'MRR',    value: fmt(stats?.mrr || 0),                      Icon: DollarSign, bg: 'bg-amber-50',   text: 'text-amber-600' },
                      ].map(s => (
                        <div key={s.label} className={`flex items-center gap-2.5 ${s.bg} rounded-xl px-4 py-2.5`}>
                          <s.Icon size={15} className={s.text} />
                          <div><p className="text-[10px] text-slate-500 leading-none">{s.label}</p><p className={`text-sm font-bold ${s.text} leading-tight`}>{s.value}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {tenants.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-sm">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Building2 size={24} className="text-slate-400" /></div>
                      <p className="text-slate-500 font-semibold">Nenhuma clínica cadastrada</p>
                      <button onClick={openClientModal} className="mt-5 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition"><Plus size={15} /> Nova Clínica</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {tenants.map((t, i) => {
                        const planColor = CHART_COLORS[i % CHART_COLORS.length];
                        const userPct = t.max_users ? Math.round((t.user_count || 0) / t.max_users * 100) : 0;
                        return (
                          <div key={t.id} className={`bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${!t.active ? 'opacity-60' : ''}`}>
                            {/* Barra de cor do plano */}
                            <div className="h-1.5" style={{ background: t.active ? planColor : '#cbd5e1' }} />
                            <div className="p-5">
                              {/* Header da clínica */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                                    style={{ background: avatarColor(t.company_name) }}>
                                    {initials(t.company_name)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-800 text-sm leading-tight truncate">{t.company_name}</p>
                                    {t.cnpj_cpf && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{t.cnpj_cpf}</p>}
                                  </div>
                                </div>
                                <StatusBadge active={t.active} />
                              </div>

                              {/* Plano */}
                              {t.plan_name && (
                                <div className="mb-3">
                                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                                    style={{ background: planColor + '15', color: planColor }}>
                                    <Star size={10} /> {t.plan_name} · {fmt(t.plan_price || 0)}/mês
                                  </span>
                                </div>
                              )}

                              {/* Admin */}
                              <div className="space-y-1.5 mb-4">
                                {t.admin_name && <div className="flex items-center gap-2 text-xs text-slate-500"><User size={11} className="text-slate-400 flex-shrink-0" /><span className="truncate">{t.admin_name}</span></div>}
                                {t.admin_email && <div className="flex items-center gap-2 text-xs text-slate-500"><Mail size={11} className="text-slate-400 flex-shrink-0" /><span className="truncate">{t.admin_email}</span></div>}
                                {t.phone && <div className="flex items-center gap-2 text-xs text-slate-500"><Phone size={11} className="text-slate-400 flex-shrink-0" /><span>{t.phone}</span></div>}
                              </div>

                              {/* Usuários progress */}
                              {t.max_users && (
                                <div className="mb-4">
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-slate-400">Usuários</span>
                                    <span className="font-semibold text-slate-600">{t.user_count || 0}/{t.max_users}</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(userPct, 100)}%`, background: userPct > 90 ? '#ef4444' : planColor }} />
                                  </div>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                                <button
                                  onClick={() => handleToggleClient(t)}
                                  disabled={!isAdmin || t.id === 1}
                                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${(!isAdmin || t.id === 1) ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400' : (t.active ? 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-600' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100')}`}>
                                  {t.active ? <><ToggleLeft size={13} /> Desativar</> : <><ToggleRight size={13} /> Ativar</>}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ══ EQUIPE — CARDS ══ */}
              {tab === 'team' && (
                <div className="max-w-6xl space-y-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-2.5">
                        {masterUsers.slice(0, 5).map((u, i) => (
                          <div key={u.id} className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: avatarColor(u.name), zIndex: 5 - i }}>
                            {initials(u.name)}
                          </div>
                        ))}
                        {masterUsers.length > 5 && (
                          <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600" style={{ zIndex: 0 }}>
                            +{masterUsers.length - 5}
                          </div>
                        )}
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-800">Equipe Interna</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{masterUsers.filter(u => u.active !== false).length} membros ativos · acesso master</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { label: 'Total', value: masterUsers.length, Icon: Users, bg: 'bg-indigo-50', text: 'text-indigo-600' },
                        { label: 'Super Admin', value: masterUsers.filter(u => u.role === 'super_admin').length, Icon: ShieldCheck, bg: 'bg-emerald-50', text: 'text-emerald-600' },
                        { label: 'Ativos', value: masterUsers.filter(u => u.active !== false).length, Icon: UserCheck, bg: 'bg-sky-50', text: 'text-sky-600' },
                      ].map(s => (
                        <div key={s.label} className={`flex items-center gap-2 ${s.bg} rounded-xl px-3.5 py-2.5`}>
                          <s.Icon size={14} className={s.text} />
                          <div><p className="text-[10px] text-slate-500 leading-none">{s.label}</p><p className={`text-lg font-bold ${s.text} leading-tight`}>{s.value}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {masterUsers.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-sm">
                      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Shield size={24} className="text-indigo-400" /></div>
                      <p className="text-slate-600 font-semibold">Nenhum integrante cadastrado</p>
                      <button onClick={openTeamModal} className="mt-5 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition"><Plus size={15} /> Adicionar integrante</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {masterUsers.map(u => {
                        const color = avatarColor(u.name);
                        return (
                          <div key={u.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            {/* Header colorido */}
                            <div className="relative px-5 pt-5 pb-12" style={{ background: `linear-gradient(135deg, ${color}ee, ${color}cc)` }}>
                              <div className="flex items-start justify-between">
                                <span className="inline-flex items-center gap-1.5 bg-white/25 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                                  <ShieldCheck size={10} /> Super Admin
                                </span>
                                <div className="flex gap-1">
                                  <StatusBadge active={u.active !== false} />
                                  <button onClick={() => handleDeleteTeamMember(u.id, u.name)}
                                    className="p-1.5 rounded-lg bg-white/15 hover:bg-white/30 text-white transition ml-1">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Corpo com avatar sobreposto */}
                            <div className="px-5 pb-5 -mt-8">
                              <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-xl mb-3"
                                style={{ background: color }}>
                                {initials(u.name)}
                              </div>

                              <h3 className="font-bold text-slate-800 text-base leading-tight">{u.name}</h3>
                              <p className="text-xs text-slate-400 mb-4 mt-0.5">Equipe Master · PsiFlux</p>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                                  <Mail size={12} className="text-slate-400 flex-shrink-0" />
                                  <span className="text-xs text-slate-600 truncate">{u.email}</span>
                                </div>
                                {u.phone && (
                                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                                    <Phone size={12} className="text-slate-400 flex-shrink-0" />
                                    <span className="text-xs text-slate-600">{u.phone}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                                  <Calendar size={12} className="text-slate-400 flex-shrink-0" />
                                  <span className="text-xs text-slate-500">Desde {fmtDate(u.created_at)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ══ PERMISSÕES ══ */}
              {tab === 'permissions' && (
                <div className="max-w-6xl space-y-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-base font-bold text-slate-800 flex items-center gap-2"><Lock size={16} className="text-indigo-500" /> Perfis de Permissão</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Crie perfis de acesso para sua equipe. Cada perfil gera um link único de acesso.</p>
                    </div>
                  </div>

                  {permProfiles.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-sm">
                      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Lock size={24} className="text-indigo-400" /></div>
                      <p className="text-slate-600 font-semibold">Nenhum perfil criado ainda</p>
                      <p className="text-slate-400 text-sm mt-1">Crie perfis como "Vendedor", "Suporte", "Financeiro" com permissões específicas</p>
                      <button onClick={openNewPerm} className="mt-5 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition"><Plus size={15} /> Criar primeiro perfil</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {permProfiles.map(p => {
                        const rc = ROLE_COLOR[p.role_type] || ROLE_COLOR['visualizador'];
                        const roleLabel = ROLE_TYPES.find(r => r.value === p.role_type)?.label || p.role_type;
                        return (
                          <div key={p.id} className={`bg-white border ${rc.border} rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
                            {/* Header */}
                            <div className={`bg-gradient-to-r ${rc.grad} px-5 py-4`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                                    <Shield size={18} className="text-white" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-white text-sm">{p.name}</p>
                                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">{roleLabel}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                                    {(p.permissions || []).length} permissões
                                  </span>
                                  <button onClick={() => openEditPerm(p)} className="p-1.5 rounded-lg bg-white/15 hover:bg-white/30 text-white transition"><Edit2 size={12} /></button>
                                  <button onClick={() => handleDeletePerm(p)} className="p-1.5 rounded-lg bg-white/15 hover:bg-red-400/50 text-white transition"><Trash2 size={12} /></button>
                                </div>
                              </div>
                            </div>

                            {/* Body */}
                            <div className="p-5">
                              {p.description && <p className="text-xs text-slate-500 mb-4">{p.description}</p>}

                              {/* Permissões */}
                              {p.permissions?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                  {p.permissions.map((key: string) => {
                                    const opt = MASTER_PERMISSIONS_OPTIONS.find(o => o.key === key);
                                    return (
                                      <span key={key} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md ${rc.light} ${rc.text}`}>
                                        <Check size={9} />{opt?.label || key}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Link de acesso */}
                              <div className="border border-slate-100 rounded-xl p-3 bg-slate-50">
                                <div className="flex items-center justify-between mb-1.5">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Link size={9} /> Link de Acesso</p>
                                  <button onClick={() => handleRegenerateToken(p)} className="text-[10px] text-slate-400 hover:text-indigo-600 font-semibold flex items-center gap-1 transition">
                                    <RefreshCw size={9} /> Novo link
                                  </button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                                    <p className="text-[10px] text-slate-500 font-mono truncate">/acesso/{p.access_token?.slice(0, 16)}...</p>
                                  </div>
                                  <button onClick={() => copyLink(p.access_token, p.id)}
                                    className={`p-1.5 rounded-lg transition flex-shrink-0 ${copied === p.id ? 'bg-emerald-100 text-emerald-600' : 'bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200'}`}>
                                    {copied === p.id ? <Check size={13} /> : <Copy size={13} />}
                                  </button>
                                </div>
                              </div>

                              <p className="text-[10px] text-slate-400 mt-2">Criado em {fmtDate(p.created_at)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                    <Info size={15} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-indigo-700">Perfis de permissão são exclusivos do painel master. Usuários de clínicas não têm acesso a esta área e não visualizam estes perfis.</p>
                  </div>
                </div>
              )}

              {/* ══ PLANOS ══ */}
              {tab === 'plans' && (
                <div className="max-w-5xl space-y-4">
                  <p className="text-sm text-slate-500"><span className="font-semibold text-slate-700">{plans.length}</span> plano{plans.length !== 1 ? 's' : ''}</p>
                  {plans.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-sm">
                      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Package size={22} className="text-slate-400" /></div>
                      <p className="text-slate-500 font-medium">Nenhum plano criado</p>
                      <button onClick={openNewPlan} className="mt-5 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition"><Plus size={15} /> Criar plano</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {plans.map((p, i) => (
                        <div key={p.id} className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition hover:shadow-md ${p.active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                          <div className="h-1.5" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5" style={{ background: CHART_COLORS[i % CHART_COLORS.length] + '18' }}>
                                  <Package size={16} style={{ color: CHART_COLORS[i % CHART_COLORS.length] }} />
                                </div>
                                <h3 className="font-bold text-slate-800 text-base">{p.name}</h3>
                                {p.description && <p className="text-slate-400 text-xs mt-0.5">{p.description}</p>}
                              </div>
                              <button onClick={() => openEditPlan(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"><Edit2 size={13} /></button>
                            </div>
                            <p className="text-3xl font-bold text-slate-800 mb-1">{fmt(p.price)}<span className="text-sm font-normal text-slate-400">/mês</span></p>
                            <div className="flex gap-3 text-xs text-slate-400 mb-4 mt-1.5 pb-4 border-b border-slate-100">
                              <span className="flex items-center gap-1"><Users size={10} />{p.max_users === 999 ? '∞' : p.max_users} usuários</span>
                              <span className="flex items-center gap-1"><User size={10} />{p.max_patients >= 99999 ? '∞' : p.max_patients} pacientes</span>
                            </div>
                            <div className="space-y-1.5">
                              {(p.features || []).slice(0, 5).map((f: string) => {
                                const opt = FEATURES_OPTIONS.find(o => o.key === f);
                                return <div key={f} className="flex items-center gap-2 text-xs text-slate-500"><CheckCircle size={11} className="text-emerald-500 flex-shrink-0" />{opt?.label || f}</div>;
                              })}
                              {(p.features || []).length > 5 && <p className="text-xs text-indigo-500 font-medium">+{p.features.length - 5} funcionalidades</p>}
                            </div>
                            {!p.active && <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-3 pt-3 border-t border-slate-100">Inativo</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ══ MODAL NOVA CLÍNICA ══ */}
      {clientModal && (
        <Modal title="Nova Clínica / Parceiro" sub="Crie o acesso para uma nova clínica" onClose={() => { setClientModal(false); setError(''); }} wide error={error}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">{lbl('Nome da Clínica *')}<input className={inp} placeholder="Ex: Clínica Vida Plena" value={clientForm.company_name} onChange={e => setClientForm({ ...clientForm, company_name: e.target.value })} /></div>
            <div>{lbl('CNPJ / CPF')}<input className={inp} placeholder="00.000.000/0000-00" value={clientForm.cnpj_cpf} onChange={e => setClientForm({ ...clientForm, cnpj_cpf: e.target.value })} /></div>
            <div>{lbl('Telefone')}<input className={inp} placeholder="(11) 99999-9999" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} /></div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Admin da Clínica</p>
            <div className="space-y-3">
              <div>{lbl('Nome')}<input className={inp} placeholder="Nome completo" value={clientForm.admin_name} onChange={e => setClientForm({ ...clientForm, admin_name: e.target.value })} /></div>
              <div>{lbl('E-mail *')}<input type="email" className={inp} placeholder="admin@clinica.com" value={clientForm.admin_email} onChange={e => setClientForm({ ...clientForm, admin_email: e.target.value })} /></div>
              <div>{lbl('Senha *')}<div className="relative"><input type={showPass ? 'text' : 'password'} className={inp + ' pr-10'} placeholder="Mínimo 6 caracteres" value={clientForm.password} onChange={e => setClientForm({ ...clientForm, password: e.target.value })} /><button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPass ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></div>
            </div>
          </div>
          <div>{lbl('Plano')}<select className={sel} value={clientForm.plan_id} onChange={e => setClientForm({ ...clientForm, plan_id: e.target.value })}><option value="">Sem plano</option>{plans.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name} — {fmt(p.price)}/mês</option>)}</select></div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setClientModal(false); setError(''); }} className={btnS}>Cancelar</button>
            <button onClick={handleCreateClient} disabled={saving} className={btnP}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />} Criar Acesso</button>
          </div>
        </Modal>
      )}

      {/* ══ MODAL NOVO INTEGRANTE ══ */}
      {teamModal && (
        <Modal title="Novo Integrante" sub="Acesso master ao painel de super admin" onClose={() => { setTeamModal(false); setError(''); }} error={error}>
          <div>{lbl('Nome Completo *')}<input className={inp} placeholder="Nome completo" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>{lbl('E-mail *')}<input type="email" className={inp} placeholder="usuario@psiflux.com" value={teamForm.email} onChange={e => setTeamForm({ ...teamForm, email: e.target.value })} /></div>
            <div>{lbl('Telefone')}<input className={inp} placeholder="(11) 99999-9999" value={teamForm.phone} onChange={e => setTeamForm({ ...teamForm, phone: e.target.value })} /></div>
          </div>
          <div>{lbl('Senha *')}<div className="relative"><input type={showTeamPass ? 'text' : 'password'} className={inp + ' pr-10'} placeholder="Mínimo 6 caracteres" value={teamForm.password} onChange={e => setTeamForm({ ...teamForm, password: e.target.value })} /><button type="button" onClick={() => setShowTeamPass(!showTeamPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showTeamPass ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></div>
          <div>
            {lbl('Perfil de Permissão')}
            <select className={sel} value={teamForm.permission_profile_id} onChange={e => setTeamForm({ ...teamForm, permission_profile_id: e.target.value })}>
              <option value="">Acesso total (Super Admin)</option>
              {permProfiles.filter(p => p.active).map(p => {
                const rc = ROLE_COLOR[p.role] || ROLE_COLOR['visualizador'];
                return <option key={p.id} value={p.id}>{p.name} — {ROLE_TYPES.find(r => r.value === p.role)?.label || p.role}</option>;
              })}
            </select>
            {teamForm.permission_profile_id ? (
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1"><Shield size={11} /> As permissões serão limitadas ao perfil selecionado.</p>
            ) : (
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1"><ShieldCheck size={11} /> Sem restrições — acesso completo ao painel master.</p>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setTeamModal(false); setError(''); }} className={btnS}>Cancelar</button>
            <button onClick={handleCreateTeamMember} disabled={saving} className={btnP}>{saving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Finalizar Cadastro</button>
          </div>
        </Modal>
      )}

      {/* ══ MODAL PERFIL DE PERMISSÃO ══ */}
      {permModal && (
        <Modal title={editPerm ? 'Editar Perfil' : 'Novo Perfil de Permissão'} sub="Defina as permissões e gere um link de acesso único" onClose={() => { setPermModal(false); setError(''); }} wide error={error}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">{lbl('Nome do Perfil *')}<input className={inp} placeholder="Ex: Vendedor, Suporte, Financeiro" value={permForm.name} onChange={e => setPermForm({ ...permForm, name: e.target.value })} /></div>
            <div className="col-span-2">{lbl('Descrição')}<input className={inp} placeholder="Descrição do perfil de acesso" value={permForm.description} onChange={e => setPermForm({ ...permForm, description: e.target.value })} /></div>
            <div className="col-span-2">{lbl('Tipo de Acesso')}
              <div className="grid grid-cols-3 gap-2 mt-1">
                {ROLE_TYPES.map(r => {
                  const rc = ROLE_COLOR[r.value];
                  const active = permForm.role_type === r.value;
                  return (
                    <button key={r.value} type="button" onClick={() => setPermForm({ ...permForm, role_type: r.value })}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition ${active ? `${rc.light} ${rc.text} ${rc.border}` : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div>
            {lbl('Permissões de Acesso')}
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {MASTER_PERMISSIONS_OPTIONS.map(opt => {
                const active = permForm.permissions.includes(opt.key);
                return (
                  <label key={opt.key} className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition text-xs border ${active ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    <input type="checkbox" className="sr-only" checked={active} onChange={() => togglePermission(opt.key)} />
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 border transition ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                      {active && <Check size={9} className="text-white" />}
                    </div>
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </div>
          {!editPerm && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3 flex items-center gap-2">
              <Globe size={14} className="text-slate-400 flex-shrink-0" />
              <p className="text-xs text-slate-500">Um link de acesso único será gerado automaticamente após a criação.</p>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setPermModal(false); setError(''); }} className={btnS}>Cancelar</button>
            <button onClick={handleSavePerm} disabled={saving} className={btnP}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {editPerm ? 'Salvar' : 'Criar Perfil'}</button>
          </div>
        </Modal>
      )}

      {/* ══ MODAL PLANO ══ */}
      {planModal && (
        <Modal title={editPlan ? 'Editar Plano' : 'Novo Plano'} sub={editPlan ? `Editando: ${editPlan.name}` : 'Configure um novo plano de assinatura'} onClose={() => { setPlanModal(false); setError(''); }} wide error={error}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">{lbl('Nome *')}<input className={inp} placeholder="Ex: Pro" value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} /></div>
            <div className="col-span-2">{lbl('Descrição')}<input className={inp} placeholder="Breve descrição" value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} /></div>
            <div>{lbl('Preço R$ *')}<input type="number" className={inp} placeholder="149.90" value={planForm.price} onChange={e => setPlanForm({ ...planForm, price: e.target.value })} /></div>
            <div>{lbl('Usuários')}<input type="number" className={inp} placeholder="10" value={planForm.max_users} onChange={e => setPlanForm({ ...planForm, max_users: e.target.value })} /></div>
            <div className="col-span-2">{lbl('Pacientes')}<input type="number" className={inp} placeholder="500" value={planForm.max_patients} onChange={e => setPlanForm({ ...planForm, max_patients: e.target.value })} /></div>
          </div>
          <div>{lbl('Funcionalidades')}
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {FEATURES_OPTIONS.map(opt => {
                const active = planForm.features.includes(opt.key);
                return (
                  <label key={opt.key} className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition text-xs border ${active ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    <input type="checkbox" className="sr-only" checked={active} onChange={() => toggleFeature(opt.key)} />
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 border transition ${active ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                      {active && <Check size={9} className="text-white" />}
                    </div>
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setPlanModal(false); setError(''); }} className={btnS}>Cancelar</button>
            <button onClick={handleSavePlan} disabled={saving} className={btnP}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {editPlan ? 'Salvar' : 'Criar Plano'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};
