import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api, getStaticUrl } from '../services/api';
import logoUrl from '../images/logo-sistema/logo.png';
import {
  LayoutDashboard, Users, LogOut, Plus, Trash2, ShieldCheck, ShieldOff,
  X, Building2, User, Loader2, CheckCircle, Edit2, Save, Camera,
  TrendingUp, Package, Lock, Phone, Mail, DollarSign, Activity, BarChart3, Shield,
  Eye, EyeOff, ArrowUpRight, Clock, Calendar, Check, AlertTriangle, Copy, RefreshCw, Link,
  Globe, UserCheck, Unlock, Briefcase, FileText, MessageSquare, Send,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Button, IconButton, Input, Textarea, Select, Modal, ModalFooter, ConfirmModal as ConfirmDialog,
  Tabs, Switch, Badge, Alert, PageWrapper, SectionTitle, StatGrid, ContentCard, FormRow,
  PanelCard, StatCard, EmptyState, GridTable, usePagination, DatePicker,
  FilterLine, FilterLineSection, FilterLineSelect, FilterLineSegmented,
} from '../components/UI';
import type { Column } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ProfessionalAreasTab } from '../components/SuperAdmin/ProfessionalAreasTab';
import { ConversationsTab } from '../components/SuperAdmin/ConversationsTab';

// ── formatters ────────────────────────────────────────────────────────────────
const _fmtCurrency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const _fmtCompact  = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const fmt      = (v: number) => _fmtCurrency.format(v);
const fmtShort = (v: number) => _fmtCompact.format(v);
const fmtDate  = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '—';

// ── constants ─────────────────────────────────────────────────────────────────
// Cada item DEVE ter um requiredFeature correspondente no constants.tsx (NAV_SECTIONS)
// Chaves sem correspondência no menu foram removidas para não confundir
const FEATURES_OPTIONS = [
  // ── Clínico ──────────────────────────────────────────────────────────────
  { key: 'pacientes',            label: 'Pacientes',                        group: 'Clínico' },
  { key: 'prontuario',           label: 'Prontuário',                       group: 'Clínico' },
  { key: 'estudos_de_caso',      label: 'Estudos de Caso',                  group: 'Clínico' },
  // ── Intervenção & Teoria ──────────────────────────────────────────────────
  { key: 'ferramentas_clinicas', label: 'Ferramentas Clínicas & Abordagens', group: 'Intervenção' },
  // ── Avaliação ─────────────────────────────────────────────────────────────
  { key: 'formularios',          label: 'Formulários',                       group: 'Avaliação' },
  { key: 'instrumentos',         label: 'Instrumentos (DISC, DASS-21)',       group: 'Avaliação', premium: true },
  // ── Documentos ────────────────────────────────────────────────────────────
  { key: 'documentos',           label: 'Documentos, Encaminhamentos & Termos', group: 'Documentos', premium: true },
  // ── Gestão ───────────────────────────────────────────────────────────────
  { key: 'agenda',               label: 'Agenda',                           group: 'Gestão' },
  { key: 'salas_virtuais',       label: 'Salas Virtuais',                   group: 'Gestão', premium: true },
  { key: 'profissionais',        label: 'Profissionais',                    group: 'Gestão' },
  { key: 'servicos',             label: 'Serviços',                         group: 'Gestão' },
  { key: 'produtos',             label: 'Produtos',                         group: 'Gestão' },
  { key: 'comandas',             label: 'Comandas',                         group: 'Gestão' },
  // ── Financeiro ───────────────────────────────────────────────────────────
  { key: 'financeiro',           label: 'Financeiro & Livro Caixa',         group: 'Financeiro', premium: true },
  { key: 'nota_fiscal',          label: 'Nota Fiscal (NFS-e)',              group: 'Financeiro', premium: true },
  { key: 'relatorios',           label: 'Relatórios & Desempenho',          group: 'Financeiro', premium: true },
  // ── Comunicação ───────────────────────────────────────────────────────────
  { key: 'mensagens',            label: 'Mensagens Internas',               group: 'Comunicação' },
  { key: 'aurora_ai',            label: 'Bia AI',                        group: 'Comunicação', premium: true },
  { key: 'whatsapp_bot',         label: 'WhatsApp Bot',                     group: 'Comunicação', premium: true },
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

const CHART_COLORS = ['var(--c-600)', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

const initials = (name: string) => name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';

const NAV_TABS = [
  { id: 'dashboard',     label: 'Dashboard',            icon: LayoutDashboard },
  { id: 'clients',       label: 'Parceiros',            icon: Building2 },
  { id: 'team',          label: 'Equipe',               icon: Users },
  { id: 'permissions',   label: 'Permissões',           icon: Lock },
  { id: 'plans',         label: 'Planos',               icon: Package },
  { id: 'areas',         label: 'Áreas de Atuação',     icon: Briefcase },
  { id: 'whatsapp',      label: 'WhatsApp Bot',         icon: Phone },
  { id: 'conversations', label: 'Central de Conversas', icon: MessageSquare },
  { id: 'pagamentos',    label: 'Pagamentos',           icon: DollarSign },
  { id: 'faturas',       label: 'Faturas',              icon: FileText },
  { id: 'emails',        label: 'Central de E-mails',   icon: Mail },
] as const;
type Tab = typeof NAV_TABS[number]['id'];

type ClientTab = 'dados' | 'acesso' | 'assinatura';
const CLIENT_TABS = [
  { id: 'dados',      label: 'Dados',      icon: Building2 },
  { id: 'acesso',     label: 'Acesso',     icon: Lock },
  { id: 'assinatura', label: 'Assinatura', icon: DollarSign },
] as const;
type TeamTab = 'dados' | 'acesso';
const TEAM_TABS = [
  { id: 'dados',  label: 'Dados',  icon: User },
  { id: 'acesso', label: 'Acesso', icon: Lock },
] as const;
type PermTab = 'dados' | 'permissoes';
type PlanTab = 'dados' | 'funcionalidades';

// ── Confirm ───────────────────────────────────────────────────────────────────
interface ConfirmState { message: string; detail?: string; onConfirm: () => void; danger?: boolean; }

// ── máscaras ──────────────────────────────────────────────────────────────────
const mkP = (v: string) => v.replace(/\D/g, "").replace(/^(\d{2})(\d)/g, "($1) $2").replace(/(\d)(\d{4})$/, "$1-$2").substring(0, 15);
const mkC = (v: string) => {
  v = v.replace(/\D/g, "");
  if (v.length <= 11) return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2").substring(0, 14);
  return v.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2").substring(0, 18);
};

const StatusBadge = ({ active, status, expires_at, trial_ends_at, billing_exempt }: { active: boolean; status?: string; expires_at?: string; trial_ends_at?: string; billing_exempt?: boolean }) => {
  if (status === 'blocked') return <Badge size="sm" color="danger" icon={<Lock size={10} />}>Bloqueado</Badge>;

  if (billing_exempt) return <Badge size="sm" color="purple" icon={<CheckCircle size={10} />}>Isenta</Badge>;

  if (trial_ends_at) {
    const trialDays = Math.ceil((new Date(trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (trialDays < 0) return <Badge size="sm" color="danger" icon={<AlertTriangle size={10} />}>Teste Expirado</Badge>;
    return <Badge size="sm" color="info" icon={<Clock size={10} />}>Teste — {trialDays}d</Badge>;
  }

  if (expires_at) {
    const days = Math.ceil((new Date(expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return <Badge size="sm" color="danger" icon={<AlertTriangle size={10} />}>Vencido</Badge>;
    if (days <= 5) return <Badge size="sm" color="warning" icon={<Clock size={10} />}>Vence em {days}d</Badge>;
  }

  return <Badge size="sm" dot color={active ? 'success' : 'default'}>{active ? 'Ativo' : 'Inativo'}</Badge>;
};

// ── Cartão de gateway de pagamento (Mercado Pago / Asaas da plataforma) ─────────
interface GatewayCardProps {
  title: string; description: string;
  configured: boolean; enabled: boolean;
  token: string; setToken: (v: string) => void;
  showToken: boolean; setShowToken: (fn: (v: boolean) => boolean) => void;
  saving: boolean; testing: boolean;
  onToggle: () => void; onSave: () => void; onTest: () => void; onDisconnect: () => void;
  configuredMsg: string; replaceHint: string;
  placeholderReplace: string; placeholderNew: string;
  disconnectLabel: string; steps: React.ReactNode;
}
const GatewayCard: React.FC<GatewayCardProps> = (g) => (
  <PanelCard
    title={g.title}
    description={g.description}
    icon={DollarSign}
    action={g.configured ? (
      <div className="flex items-center gap-2">
        <Badge size="sm" dot color={g.enabled ? 'success' : 'default'}>{g.enabled ? 'Ativo' : 'Pausado'}</Badge>
        <Switch aria-label={`Ativar ${g.title}`} checked={g.enabled} onCheckedChange={() => g.onToggle()} />
      </div>
    ) : undefined}
    contentClassName="p-3 space-y-3"
  >
    {g.configured ? (
      <>
        <Alert variant="success">{g.configuredMsg}</Alert>
        <p className="text-[11px] text-slate-500">{g.replaceHint}</p>
        <Input
          aria-label={g.placeholderReplace}
          type={g.showToken ? 'text' : 'password'}
          value={g.token}
          onChange={e => g.setToken(e.target.value)}
          placeholder={g.placeholderReplace}
          className="font-mono"
          iconRight={<IconButton type="button" variant="ghost" size="xs" aria-label={g.showToken ? 'Ocultar chave' : 'Mostrar chave'} onClick={() => g.setShowToken(v => !v)}>{g.showToken ? <EyeOff size={14} /> : <Eye size={14} />}</IconButton>}
        />
        {g.token && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={g.onTest} loading={g.testing} disabled={g.testing || !g.token.trim()}>Testar</Button>
            <Button size="sm" className="flex-1" onClick={g.onSave} loading={g.saving} disabled={g.saving || !g.token.trim()}>Salvar</Button>
          </div>
        )}
        <Button variant="softDanger" size="xs" iconLeft={<X size={14} />} onClick={g.onDisconnect} disabled={g.saving}>{g.disconnectLabel}</Button>
      </>
    ) : (
      <>
        <Alert variant="info" title="Como configurar:">
          <ol className="space-y-1 pl-4 list-decimal">{g.steps}</ol>
        </Alert>
        <Input
          aria-label={g.placeholderNew}
          type={g.showToken ? 'text' : 'password'}
          value={g.token}
          onChange={e => g.setToken(e.target.value)}
          placeholder={g.placeholderNew}
          className="font-mono"
          iconRight={<IconButton type="button" variant="ghost" size="xs" aria-label={g.showToken ? 'Ocultar chave' : 'Mostrar chave'} onClick={() => g.setShowToken(v => !v)}>{g.showToken ? <EyeOff size={14} /> : <Eye size={14} />}</IconButton>}
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={g.onTest} loading={g.testing} disabled={!g.token.trim() || g.testing}>Testar conexão</Button>
          <Button size="sm" className="flex-1" onClick={g.onSave} loading={g.saving} disabled={!g.token.trim() || g.saving}>Conectar</Button>
        </div>
      </>
    )}
  </PanelCard>
);

// ═════════════════════════════════════════════════════════════════════════════
const TAB_SLUGS: Record<Tab, string> = {
  dashboard: 'dashboard', clients: 'parceiros', team: 'equipe',
  permissions: 'permissoes', plans: 'planos', areas: 'areas-de-atuacao', whatsapp: 'whatsapp', conversations: 'conversas', pagamentos: 'pagamentos',
  faturas: 'faturas', emails: 'emails',
};
const SLUG_TO_TAB: Record<string, Tab> = Object.fromEntries(
  Object.entries(TAB_SLUGS).map(([k, v]) => [v, k as Tab])
);

export const SuperAdmin: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'super_admin';

  const getInitialTab = (): Tab => {
    const slug = window.location.pathname.split('/').pop() || '';
    return SLUG_TO_TAB[slug] || 'dashboard';
  };

  const [tab, setTab] = useState<Tab>(getInitialTab);

  const changeTab = (id: Tab) => {
    setTab(id);
    window.history.pushState({}, '', `/painel-master/${TAB_SLUGS[id]}`);
  };
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants]           = useState<any[]>([]);
  const [plans, setPlans]               = useState<any[]>([]);
  const [stats, setStats]               = useState<any>(null);
  const [masterUsers, setMasterUsers]   = useState<any[]>([]);
  const [mrrHistory, setMrrHistory]     = useState<any[]>([]);
  const [permProfiles, setPermProfiles] = useState<any[]>([]);
  const [statsDays, setStatsDays]       = useState(30);
  const [historyMonths, setHistoryMonths] = useState(6);
  const [statsLoading, setStatsLoading] = useState(false);

  // WhatsApp state
  const [wppStatus, setWppStatus] = useState<{ status: string; qrcode: string | null; phone: string | null }>({ status: 'disconnected', qrcode: null, phone: null });
  const [loadingWpp, setLoadingWpp] = useState(false);

  const canAccessWpp = user?.email === 'super@psiflux.com' || user?.email === 'admin@psiflux.com';

  // toasts (sistema padrão do painel)
  const { pushToast } = useToast();
  const toast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => { pushToast(type, message); }, [pushToast]);

  // confirm
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const doConfirm = useCallback((cfg: ConfirmState) => setConfirmState(cfg), []);

  // team modal
  const [teamModal, setTeamModal]   = useState(false);
  const [editTeam, setEditTeam]     = useState<any>(null);
  const [teamForm, setTeamForm]     = useState({ 
    name: '', email: '', password: '', phone: '', 
    permission_profile_id: '', cargo: '', departamento: '', avatar_url: '' 
  });
  const [showTeamPass, setShowTeamPass] = useState(false);
  const openTeamModal = () => { 
    setError(''); 
    setEditTeam(null);
    setTeamForm({ name: '', email: '', password: '', phone: '', permission_profile_id: '', cargo: '', departamento: '', avatar_url: '' }); 
    setTeamModal(true); 
  };
  const openEditTeamMember = (u: any) => {
    setError('');
    setEditTeam(u);
    setTeamForm({
      name: u.name,
      email: u.email,
      password: '',
      phone: u.phone || '',
      permission_profile_id: String(u.permission_profile_id || ''),
      cargo: u.cargo || '',
      departamento: u.departamento || '',
      avatar_url: u.avatar_url || ''
    });
    setTeamModal(true);
  };

  // client modal
  const [clientModal, setClientModal] = useState(false);
  const [editClient, setEditClient]   = useState<any>(null);
  const [showPass, setShowPass]       = useState(false);
  const [clientForm, setClientForm]   = useState({ company_name: '', cnpj_cpf: '', phone: '', admin_name: '', admin_email: '', password: '', plan_id: '', expires_at: '', status: 'active', trial_ends_at: '', billing_exempt: false });
  const openClientModal = () => { setError(''); setEditClient(null); setClientForm({ company_name: '', cnpj_cpf: '', phone: '', admin_name: '', admin_email: '', password: '', plan_id: '', expires_at: '', status: 'active', trial_ends_at: '', billing_exempt: false }); setClientModal(true); };
  const openEditClient = (t: any) => {
    setError('');
    setEditClient(t);
    setClientForm({
      company_name: t.company_name,
      cnpj_cpf: t.cnpj_cpf || '',
      phone: t.phone || '',
      admin_name: t.admin_name || '',
      admin_email: t.admin_email || '',
      password: '',
      plan_id: String(t.plan_id || ''),
      expires_at: t.expires_at ? t.expires_at.split('T')[0] : '',
      status: t.status || 'active',
      trial_ends_at: t.trial_ends_at ? t.trial_ends_at.split('T')[0] : '',
      billing_exempt: !!t.billing_exempt
    });
    setClientModal(true);
  };

  // Converter trial em assinatura ativa
  const [convertingTrial, setConvertingTrial] = useState(false);
  const convertTrialToActive = async () => {
    if (!editClient) return;
    if (!clientForm.plan_id) { toast('Selecione um plano antes de converter.', 'error'); return; }
    setConvertingTrial(true);
    try {
      const updated = await api.post<any>(`/tenants/${editClient.id}/convert-trial`, { plan_id: clientForm.plan_id, months: 1 });
      toast('Cliente convertido para assinatura ativa!', 'success');
      setClientModal(false);
      setTenants(prev => prev.map(t => t.id === editClient.id ? { ...t, ...updated } : t));
    } catch (e: any) {
      toast(e?.message || 'Erro ao converter trial.', 'error');
    } finally { setConvertingTrial(false); }
  };

  const [clientTab, setClientTab] = useState<ClientTab>('dados');
  const [teamTab, setTeamTab] = useState<TeamTab>('dados');
  const [permTab, setPermTab] = useState<PermTab>('dados');
  const [planTab, setPlanTab] = useState<PlanTab>('dados');

  const [clientFilter, setClientFilter] = useState<'all' | 'active' | 'expiring' | 'expired' | 'blocked'>('all');

  // plan modal
  const [planModal, setPlanModal]   = useState(false);
  const [editPlan, setEditPlan]     = useState<any>(null);
  const [planForm, setPlanForm]     = useState({ name: '', description: '', price: '', max_users: '10', features: [] as string[], highlighted: false });

  // permission profile modal
  const [permModal, setPermModal]   = useState(false);
  const [editPerm, setEditPerm]     = useState<any>(null);
  const [permForm, setPermForm]     = useState({ name: '', description: '', role: 'visualizador', permissions: [] as string[] });
  const openNewPerm  = () => { setError(''); setEditPerm(null); setPermForm({ name: '', description: '', role: 'visualizador', permissions: [] }); setPermModal(true); };
  const openEditPerm = (p: any) => { setError(''); setEditPerm(p); setPermForm({ name: p.name, description: p.description || '', role: p.role, permissions: p.permissions || [] }); setPermModal(true); };

  useEffect(() => { if (clientModal) setClientTab('dados'); }, [clientModal]);
  useEffect(() => { if (teamModal) setTeamTab('dados'); }, [teamModal]);
  useEffect(() => { if (permModal) setPermTab('dados'); }, [permModal]);
  useEffect(() => { if (planModal) setPlanTab('dados'); }, [planModal]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [copied, setCopied] = useState<number | null>(null);

  const teamFileRef = useRef<HTMLInputElement>(null);
  const [uploadingTeamPhoto, setUploadingTeamPhoto] = useState(false);

  // ── Pagamentos (MP do super_admin) ───────────────────────────────────────────
  const [mpConfig, setMpConfig] = useState({ configured: false, enabled: false });
  const [mpToken, setMpToken] = useState('');
  const [mpShowToken, setMpShowToken] = useState(false);
  const [mpSaving, setMpSaving] = useState(false);
  const [mpTesting, setMpTesting] = useState(false);

  // ── Pagamentos (Asaas da plataforma — cobra a mensalidade dos consultórios) ──
  const [asaasConfig, setAsaasConfig] = useState({ configured: false, enabled: false });
  const [asaasToken, setAsaasToken] = useState('');
  const [asaasShowToken, setAsaasShowToken] = useState(false);
  const [asaasSaving, setAsaasSaving] = useState(false);
  const [asaasTesting, setAsaasTesting] = useState(false);

  useEffect(() => {
    if (tab !== 'pagamentos') return;
    api.get<any>('/mercadopago/config').then((d: any) => setMpConfig(d)).catch(() => {});
    api.get<any>('/asaas/config').then((d: any) => setAsaasConfig(d)).catch(() => {});
  }, [tab]);

  // ── Faturas de assinatura ──────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesSummary, setInvoicesSummary] = useState({ total_approved: 0, total_pending: 0, count_approved: 0, count_pending: 0 });
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const invPg = usePagination(invoices, 15);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('');

  const [emailSummary, setEmailSummary] = useState<any>({ active_recipients: 0, campaigns: [] });
  const [emailForm, setEmailForm] = useState({ subject: '', title: '', content: '', button_text: 'Conhecer novidade', button_url: '' });
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const loadEmailSummary = useCallback(() => api.get<any>('/email-campaigns/summary').then(setEmailSummary).catch(() => toast('Erro ao carregar central de e-mails.', 'error')), [toast]);
  useEffect(() => { if (tab === 'emails') loadEmailSummary(); }, [tab, loadEmailSummary]);
  const sendCampaign = async () => {
    if (!emailForm.subject.trim() || !emailForm.title.trim() || !emailForm.content.trim()) { toast('Preencha assunto, título e mensagem.', 'error'); return; }
    setSendingCampaign(true);
    try {
      const result: any = await api.post('/email-campaigns/send', emailForm);
      toast(`E-mail enviado para ${result.delivered} de ${result.recipients} usuários ativos.`);
      setEmailForm({ subject: '', title: '', content: '', button_text: 'Conhecer novidade', button_url: '' });
      loadEmailSummary();
    } catch (e: any) { toast(e?.message || 'Erro ao enviar e-mail.', 'error'); }
    finally { setSendingCampaign(false); }
  };

  const loadInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const qs = invoiceStatusFilter ? `?status=${invoiceStatusFilter}` : '';
      const d: any = await api.get(`/subscription/admin/invoices${qs}`);
      setInvoices(d.invoices || []);
      setInvoicesSummary(d.summary || { total_approved: 0, total_pending: 0, count_approved: 0, count_pending: 0 });
    } catch { /* silencioso — tela de faturas não é crítica */ }
    finally { setInvoicesLoading(false); }
  }, [invoiceStatusFilter]);

  useEffect(() => {
    if (tab !== 'faturas') return;
    loadInvoices();
  }, [tab, loadInvoices]);

  // ── Toggles mestres do WhatsApp Bot (avisos a profissionais, plataforma toda) ──
  const [masterWppPrefs, setMasterWppPrefs] = useState({
    reminder_60min_enabled: true,
    reminder_24h_professional_enabled: true,
    new_appointment_professional_enabled: true,
    cancelled_appointment_professional_enabled: true,
    rescheduled_appointment_professional_enabled: true,
    conversation_enabled: true,
  });
  const [masterWppSaving, setMasterWppSaving] = useState(false);

  useEffect(() => {
    if (tab !== 'whatsapp') return;
    api.get<any>('/whatsapp/master-preferences').then(d => setMasterWppPrefs(p => ({ ...p, ...d }))).catch(() => {});
  }, [tab]);

  const toggleMasterWppPref = async (key: string) => {
    const updated = { ...masterWppPrefs, [key]: !(masterWppPrefs as any)[key] };
    setMasterWppPrefs(updated);
    setMasterWppSaving(true);
    try {
      await api.post('/whatsapp/master-preferences', updated);
    } catch {
      setMasterWppPrefs(masterWppPrefs); // reverte em caso de erro
      toast('Erro ao salvar preferência.', 'error');
    } finally {
      setMasterWppSaving(false);
    }
  };

  const saveMpToken = async () => {
    if (!mpToken.trim()) return;
    setMpSaving(true);
    try {
      await api.post('/mercadopago/config', { token: mpToken.trim() });
      setMpConfig({ configured: true, enabled: true });
      setMpToken('');
      toast('Mercado Pago configurado para receber assinaturas!', 'success');
    } catch { toast('Erro ao salvar token.', 'error'); }
    finally { setMpSaving(false); }
  };

  const testMpToken = async () => {
    if (!mpToken.trim()) return;
    setMpTesting(true);
    try {
      await api.post('/mercadopago/config/test', { token: mpToken.trim() });
      toast('Token válido! Conexão com Mercado Pago OK.', 'success');
    } catch { toast('Token inválido.', 'error'); }
    finally { setMpTesting(false); }
  };

  const disconnectMp = async () => {
    setMpSaving(true);
    try {
      await api.post('/mercadopago/config', { token: '' });
      setMpConfig({ configured: false, enabled: false });
      toast('Mercado Pago desconectado.', 'success');
    } catch { toast('Erro ao desconectar.', 'error'); }
    finally { setMpSaving(false); }
  };

  const toggleMpEnabled = async () => {
    try {
      await api.post('/mercadopago/config', { enabled: !mpConfig.enabled });
      setMpConfig(prev => ({ ...prev, enabled: !prev.enabled }));
    } catch { toast('Erro ao alterar status.', 'error'); }
  };

  const saveAsaasToken = async () => {
    if (!asaasToken.trim()) return;
    setAsaasSaving(true);
    try {
      await api.post('/asaas/config', { token: asaasToken.trim() });
      setAsaasConfig({ configured: true, enabled: true });
      setAsaasToken('');
      toast('Asaas configurado para receber assinaturas!', 'success');
    } catch { toast('Erro ao salvar chave.', 'error'); }
    finally { setAsaasSaving(false); }
  };

  const testAsaasToken = async () => {
    if (!asaasToken.trim()) return;
    setAsaasTesting(true);
    try {
      await api.post('/asaas/config/test', { token: asaasToken.trim() });
      toast('Chave válida! Conexão com Asaas OK.', 'success');
    } catch { toast('Chave inválida.', 'error'); }
    finally { setAsaasTesting(false); }
  };

  const disconnectAsaas = async () => {
    setAsaasSaving(true);
    try {
      await api.post('/asaas/config', { token: '' });
      setAsaasConfig({ configured: false, enabled: false });
      toast('Asaas desconectado.', 'success');
    } catch { toast('Erro ao desconectar.', 'error'); }
    finally { setAsaasSaving(false); }
  };

  const toggleAsaasEnabled = async () => {
    try {
      await api.post('/asaas/config', { enabled: !asaasConfig.enabled });
      setAsaasConfig(prev => ({ ...prev, enabled: !prev.enabled }));
    } catch { toast('Erro ao alterar status.', 'error'); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [t, p, s, mu, mrr, pp] = await Promise.all([
        api.get<any[]>('/tenants'),
        api.get<any[]>('/plans/all'),
        api.get<any>(`/tenants/stats?days=${statsDays}`),
        api.get<any[]>('/master-users'),
        api.get<any[]>(`/tenants/mrr-history?months=${historyMonths}`),
        api.get<any[]>('/master-permissions'),
      ]);
      setTenants(t); setPlans(p); setStats(s); setMasterUsers(mu); setMrrHistory(mrr); setPermProfiles(pp);
    } catch (e: any) { toast('Erro ao carregar dados.', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    if (canAccessWpp) {
      loadWppStatus();
    }
  }, []);

  // Recarrega só o card de stats quando o filtro de período muda (sem recarregar tudo)
  useEffect(() => {
    if (loading) return; // evita duplicar com o load() inicial
    setStatsLoading(true);
    api.get<any>(`/tenants/stats?days=${statsDays}`)
      .then(setStats)
      .catch(() => toast('Erro ao atualizar estatísticas.', 'error'))
      .finally(() => setStatsLoading(false));
  }, [statsDays]);

  // Recarrega só o gráfico de evolução quando o filtro de meses muda
  useEffect(() => {
    if (loading) return;
    api.get<any[]>(`/tenants/mrr-history?months=${historyMonths}`)
      .then(setMrrHistory)
      .catch(() => toast('Erro ao atualizar histórico.', 'error'));
  }, [historyMonths]);

  const loadWppStatus = async () => {
    try {
      const res: any = await api.get('/whatsapp/status');
      console.log('[WPP] Status Polling:', res); // Log de depuração
      setWppStatus(res);
    } catch (e) { 
      console.error('Error loading wpp status', e); 
    }
  };

  useEffect(() => {
    let interval: any;
    if (tab === 'whatsapp' && wppStatus.status !== 'connected') {
      loadWppStatus(); // Força uma carga inicial ao entrar na aba
      interval = setInterval(loadWppStatus, 4000); // Polling mais rápido (4s)
    }
    return () => clearInterval(interval);
  }, [tab, wppStatus.status]);

  const handleWppConnect = async () => {
    setLoadingWpp(true);
    try {
      const res: any = await api.post('/whatsapp/connect', {});
      setWppStatus({ status: 'connecting', qrcode: res.qrcode, phone: null });
      toast('Iniciando conexão... Escaneie o QR Code.');
    } catch { toast('Erro ao conectar WhatsApp.', 'error'); }
    finally { setLoadingWpp(false); }
  };

  const handleWppDisconnect = async () => {
    setLoadingWpp(true);
    try {
      await api.post('/whatsapp/disconnect', {});
      setWppStatus({ status: 'disconnected', qrcode: null, phone: null });
      toast('WhatsApp desconectado.');
    } catch { toast('Erro ao desconectar.', 'error'); }
    finally { setLoadingWpp(false); }
  };

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleSaveTeamMember = async () => {
    setError('');
    if (!teamForm.name || !teamForm.email || (!editTeam && !teamForm.password)) { 
      setError('Nome, email e senha são obrigatórios.'); return; 
    }
    setSaving(true);
    try { 
      if (editTeam) {
        await api.put(`/master-users/${editTeam.id}`, teamForm);
        toast(`${teamForm.name} atualizado!`);
      } else {
        await api.post('/master-users', teamForm); 
        toast(`${teamForm.name} adicionado à equipe!`); 
      }
      setTeamModal(false); 
      load(); 
    }
    catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const handleDeleteTeamMember = (id: number, name: string) => {
    if (user?.email !== 'super@psiflux.com') {
      toast('Apenas o Administrador Raiz (super@psiflux.com) pode excluir membros da equipe.', 'error');
      return;
    }
    doConfirm({ message: `Remover ${name}?`, detail: 'O acesso master será revogado permanentemente.', danger: true,
      onConfirm: async () => { try { await api.delete(`/master-users/${id}`); toast(`${name} removido.`); load(); } catch { toast('Erro ao remover.', 'error'); } } });
  };

  const handleSaveClient = async () => {
    setError('');
    if (!clientForm.company_name || !clientForm.admin_email || (!editClient && !clientForm.password)) { 
      setError('Clínica, email e senha são obrigatórios.'); return; 
    }
    setSaving(true);
    try {
      const payload = { ...clientForm, plan_id: clientForm.plan_id || undefined, trial_ends_at: clientForm.trial_ends_at || null };
      if (editClient) {
        await api.put(`/tenants/${editClient.id}`, payload);
        toast(`Clínica "${clientForm.company_name}" atualizada!`);
      } else {
        await api.post('/tenants', payload);
        toast(`Clínica "${clientForm.company_name}" criada!`);
      }
      setClientModal(false); load();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const handleToggleClient = async (t: any) => {
    try { await api.put(`/tenants/${t.id}`, { active: !t.active }); toast(t.active ? 'Clínica desativada (Suspensão).' : 'Clínica reativada!', 'info'); load(); }
    catch { toast('Erro ao atualizar.', 'error'); }
  };

  const handleUpdateTenantStatus = async (t: any, newStatus: string) => {
    try { await api.put(`/tenants/${t.id}`, { status: newStatus }); toast(`Status alterado para ${newStatus === 'active' ? 'Regular' : 'Bloqueado'}.`); load(); }
    catch { toast('Erro ao alterar status.', 'error'); }
  };

  const handleDeleteClient = (t: any) => {
    if (user?.email !== 'super@psiflux.com') {
      toast('Apenas o Administrador Raiz (super@psiflux.com) pode excluir clínicas.', 'error');
      return;
    }
    doConfirm({ 
      message: `Deletar "${t.company_name}"?`, 
      detail: 'Todos os dados desta clínica serão removidos permanentemente. Esta ação é irreversível.', 
      danger: true,
      onConfirm: async () => { 
        try { 
          await api.delete(`/tenants/${t.id}`); 
          toast(`"${t.company_name}" deletada com sucesso.`); 
          load(); 
        } catch (e) { 
          toast('Erro ao deletar clínica.', 'error'); 
        } 
      } 
    });
  };

  const openNewPlan  = () => { setError(''); setEditPlan(null); setPlanForm({ name: '', description: '', price: '', max_users: '10', features: [], highlighted: false }); setPlanModal(true); };
  const openEditPlan = (p: any) => { setError(''); setEditPlan(p); setPlanForm({ name: p.name, description: p.description || '', price: Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), max_users: String(p.max_users), features: p.features || [], highlighted: !!p.highlighted }); setPlanModal(true); };
  
  const handleDeletePlan = (p: any) =>
    doConfirm({ message: `Remover plano "${p.name}"?`, detail: 'Esta ação removerá o plano. Se existirem clínicas usando este plano, ele será apenas desativado para novas adesões.', danger: true,
      onConfirm: async () => { try { await api.delete(`/plans/${p.id}`); toast(`Plano "${p.name}" removido.`); load(); } catch { toast('Erro ao remover plano.', 'error'); } } });

  const handleSavePlan = async () => {
    setError('');
    if (!planForm.name || !planForm.price) { setError('Nome e preço são obrigatórios.'); return; }
    setSaving(true);
    try {
      const pClean = typeof planForm.price === 'string' ? planForm.price.replace(/\./g, '').replace(',', '.') : planForm.price;
      const payload = { ...planForm, price: parseFloat(String(pClean)), max_users: parseInt(planForm.max_users) };
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
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  // (rótulos das abas vêm de NAV_TABS)

  const visibleTabs = NAV_TABS.filter(n => (n.id !== 'whatsapp' && n.id !== 'conversations') || canAccessWpp);
  const permTabs = [
    { id: 'dados', label: 'Dados', icon: Shield },
    { id: 'permissoes', label: 'Permissões', icon: Lock, badge: permForm.permissions.length },
  ] as const;
  const planTabs = [
    { id: 'dados', label: 'Dados', icon: Package },
    { id: 'funcionalidades', label: 'Funcionalidades', icon: Check, badge: planForm.features.length },
  ] as const;

  // ── render ────────────────────────────────────────────────────────────────
  const clientsVisible = tenants.filter(t => t.id !== 1);
  const filteredClients = clientsVisible.filter(t => {
    if (clientFilter === 'active') return t.status === 'active' && t.active;
    if (clientFilter === 'blocked') return t.status === 'blocked';
    if (clientFilter === 'expired') return t.expires_at && new Date(t.expires_at) < new Date() && t.status !== 'blocked';
    if (clientFilter === 'expiring') {
      if (!t.expires_at) return false;
      const d = Math.ceil((new Date(t.expires_at).getTime() - new Date().getTime()) / 864e5);
      return d >= 0 && d <= 5;
    }
    return true;
  });
  const clientTabs = [
    { id: 'all',      label: 'Tudo',       icon: LayoutDashboard, badge: clientsVisible.length },
    { id: 'active',   label: 'Ativos',     icon: CheckCircle,     badge: clientsVisible.filter(t => t.status === 'active' && t.active).length },
    { id: 'expiring', label: 'Vencendo',   icon: Clock,           badge: clientsVisible.filter(t => {
      if (!t.expires_at) return false;
      const d = Math.ceil((new Date(t.expires_at).getTime() - new Date().getTime()) / 864e5);
      return d >= 0 && d <= 5 && t.status !== 'blocked';
    }).length },
    { id: 'expired',  label: 'Vencidos',   icon: AlertTriangle,   badge: clientsVisible.filter(t => t.expires_at && new Date(t.expires_at) < new Date() && t.status !== 'blocked').length },
    { id: 'blocked',  label: 'Bloqueados', icon: Lock,            badge: clientsVisible.filter(t => t.status === 'blocked').length },
] as const;
  const isRoot = user?.email === 'super@psiflux.com';

  const planCols: Column<any>[] = [
    {
      header: 'Plano',
      render: (p: any) => (
        <div className={`flex items-center gap-2.5 min-w-0 ${!p.active ? 'opacity-60' : ''}`}>
          <div className="w-8 h-8 rounded-lg border border-primary-100 bg-primary-50 flex items-center justify-center shrink-0"><Package size={14} className="text-primary-600" /></div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-800 truncate">{p.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{p.description || `${p.max_users === 999 ? '∞' : p.max_users} usuários`}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Preço',
      render: (p: any) => {
        const monthlyPrice = Number(p.price);
        const displayPrice = billingPeriod === 'annual' ? monthlyPrice * 0.8 : monthlyPrice;
        return (
          <div className="whitespace-nowrap">
            <p className="text-xs font-semibold text-slate-800 tabular-nums">{fmt(displayPrice)}</p>
            <p className="text-[11px] text-slate-500">/mês{billingPeriod === 'annual' ? ' (anual)' : ''}</p>
          </div>
        );
      },
    },
    { header: 'Usuários', render: (p: any) => <Badge size="sm" icon={<Users size={10} />}>{p.max_users === 999 ? '∞' : p.max_users}</Badge> },
    {
      header: 'Funcionalidades',
      render: (p: any) => {
        const activeFeatures = (p.features || []).filter((fk: string) => fk !== 'pacientes');
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {activeFeatures.slice(0, 3).map((f: string) => {
              const opt = FEATURES_OPTIONS.find(o => o.key === f);
              return <Badge key={f} size="sm">{opt?.label || f}</Badge>;
            })}
            {activeFeatures.length > 3 && <span className="text-[11px] font-medium text-primary-600">+{activeFeatures.length - 3}</span>}
          </div>
        );
      },
    },
    { header: 'Status', render: (p: any) => <Badge size="sm" dot color={p.active ? 'success' : 'default'}>{p.active ? 'Ativo' : 'Inativo'}</Badge> },
    {
      header: 'Ações', className: 'text-right', headerClassName: 'text-right',
      render: (p: any) => (
        <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
          <IconButton variant="outline" size="xs" aria-label={`Editar plano ${p.name}`} onClick={() => openEditPlan(p)}><Edit2 size={14} /></IconButton>
          <IconButton variant="danger" size="xs" aria-label={`Remover plano ${p.name}`} onClick={() => handleDeletePlan(p)}><Trash2 size={14} /></IconButton>
        </div>
      ),
    },
  ];

  const planPerfData = (stats?.by_plan || []).map((p: any, i: number) => ({ ...p, _i: i }));
  const planPerfCols: Column<any>[] = [
    { header: 'Plano', render: (p: any) => <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[p._i % CHART_COLORS.length] }} /><span className="text-xs font-medium text-slate-800">{p.plan_name}</span></div> },
    { header: 'Clínicas', render: (p: any) => <span className="text-xs text-slate-600">{p.count}</span> },
    { header: `Receita (${statsDays}d)`, render: (p: any) => <span className="text-xs font-semibold text-emerald-700 tabular-nums whitespace-nowrap">{fmt(p.price)}</span> },
    {
      header: '% MRR',
      render: (p: any) => {
        const pct = stats.mrr > 0 ? Math.round(p.price / stats.mrr * 100) : 0; // p.price já é a receita real do plano (soma de faturas aprovadas)
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-12 max-w-24"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: CHART_COLORS[p._i % CHART_COLORS.length] }} /></div>
            <span className="text-[11px] text-slate-500">{pct}%</span>
          </div>
        );
      },
    },
  ];

  const invoiceCols: Column<any>[] = [
    { header: 'Clínica', render: (inv: any) => <span className="text-xs font-medium text-slate-800">{inv.tenant_name || '—'}</span> },
    { header: 'Plano', render: (inv: any) => <span className="text-xs text-slate-600">{inv.plan_name || '—'}</span> },
    { header: 'Período', render: (inv: any) => <span className="text-xs text-slate-600">{inv.period === 'annual' ? 'Anual' : 'Mensal'}</span> },
    { header: 'Valor', render: (inv: any) => <span className="text-xs font-semibold text-slate-800 tabular-nums whitespace-nowrap">{fmt(Number(inv.amount) || 0)}</span> },
    { header: 'Método', render: (inv: any) => <span className="text-xs text-slate-600">{inv.method === 'pix' ? 'Pix' : inv.method === 'card' ? 'Cartão' : '—'}</span> },
    {
      header: 'Status',
      render: (inv: any) => (
        <>
          {inv.status === 'approved' && <Badge size="sm" color="success" icon={<CheckCircle size={10} />}>Paga</Badge>}
          {inv.status === 'pending' && <Badge size="sm" color="warning" icon={<Clock size={10} />}>Pendente</Badge>}
          {inv.status === 'rejected' && <Badge size="sm" color="danger" icon={<X size={10} />}>Rejeitada</Badge>}
          {inv.status === 'cancelled' && <Badge size="sm">Cancelada</Badge>}
        </>
      ),
    },
    { header: 'Data', render: (inv: any) => <span className="text-xs text-slate-500 whitespace-nowrap">{fmtDate(inv.paid_at || inv.created_at)}</span> },
  ];

  const sectionAction: Partial<Record<Tab, React.ReactNode>> = {
    clients: <Button size="sm" iconLeft={<Plus size={14} />} onClick={openClientModal}>Nova Clínica</Button>,
    plans: <Button size="sm" iconLeft={<Plus size={14} />} onClick={openNewPlan}>Novo Plano</Button>,
    team: <Button size="sm" iconLeft={<Plus size={14} />} onClick={openTeamModal}>Novo Integrante</Button>,
    permissions: <Button size="sm" iconLeft={<Plus size={14} />} onClick={openNewPerm}>Novo Perfil</Button>,
  };
  const sectionTitles: Partial<Record<Tab, { title: string; description: string; icon: React.ElementType }>> = {
    dashboard: { title: 'Painel Master Plaelo', description: 'Visão geral e administração centralizada de todas as clínicas', icon: LayoutDashboard },
    clients: { title: 'Parceiros', description: `${clientsVisible.length} clínica${clientsVisible.length !== 1 ? 's' : ''} cadastrada${clientsVisible.length !== 1 ? 's' : ''}`, icon: Building2 },
    team: { title: 'Equipe Interna', description: `${masterUsers.filter(u => u.active !== false).length} membros ativos · acesso master`, icon: Users },
    permissions: { title: 'Perfis de Permissão', description: 'Crie perfis de acesso para sua equipe. Cada perfil gera um link único de acesso.', icon: Lock },
    plans: { title: 'Planos e Precificação', description: 'Gerencie os planos que serão exibidos para pagamento no site', icon: Package },
    pagamentos: { title: 'Recebimento de Assinaturas', description: 'Configure o gateway da plataforma para receber os pagamentos dos consultórios.', icon: DollarSign },
    faturas: { title: 'Faturas de Assinatura', description: 'Histórico de cobranças geradas para os consultórios pagarem a assinatura da plataforma.', icon: FileText },
    emails: { title: 'Central de E-mails', description: 'Envie novidades e comunicados para todos os usuários ativos do Plaelo.', icon: Mail },
    whatsapp: { title: 'WhatsApp Bot', description: 'Instância Master — Notificações', icon: Phone },
    areas: { title: 'Áreas de Atuação', description: 'Cadastre as áreas profissionais disponíveis na plataforma.', icon: Briefcase },
    conversations: { title: 'Central de Conversas', description: 'Atendimento via WhatsApp pelo número master.', icon: MessageSquare },
  };
  const st = sectionTitles[tab];

  const validateClientTab = () => {
    if (!clientForm.company_name) setClientTab('dados');
    else if (!clientForm.admin_email || (!editClient && !clientForm.password)) setClientTab('acesso');
  };
  const validateTeamTab = () => {
    if (!teamForm.name || !teamForm.email) setTeamTab('dados');
    else if (!editTeam && !teamForm.password) setTeamTab('acesso');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <ConfirmDialog
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={() => { confirmState?.onConfirm(); setConfirmState(null); }}
        title={confirmState?.message || ''}
        message={confirmState?.detail || ''}
        variant={confirmState?.danger ? 'danger' : 'primary'}
        confirmLabel="Confirmar"
      />

      {/* ══ CABEÇALHO + ABAS ══ */}
      <header className="sticky top-0 z-20 bg-white">
        <div className="px-3 sm:px-4 lg:px-5 pt-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center shrink-0 p-1">
              <img src={logoUrl} alt="Plaelo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 leading-none truncate">Plaelo</p>
              <p className="text-[11px] text-primary-600 font-medium mt-0.5">Super Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg border border-primary-100 bg-primary-50 text-primary-700 flex items-center justify-center shrink-0"><User size={14} /></div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800 truncate max-w-[180px]">{user?.name || 'Super Admin'}</p>
                <p className="text-[11px] text-slate-500 truncate">Administrador Master</p>
              </div>
            </div>
            <Button variant="outline" size="sm" iconLeft={<LogOut size={14} />} onClick={onLogout}>Sair</Button>
          </div>
        </div>
        <div className="mt-1">
          <Tabs<Tab> items={visibleTabs} value={tab} onChange={changeTab} label="Seções do painel master" className="[&>[role=tablist]]:px-3 sm:[&>[role=tablist]]:px-4 lg:[&>[role=tablist]]:px-5" />
        </div>
      </header>

      {/* ══ CONTEÚDO ══ */}
      <main className="flex-1 min-w-0">
        <PageWrapper>
          <div className="space-y-4">
            {st && (
              <SectionTitle
                title={st.title}
                description={st.description}
                icon={st.icon}
                action={tab === 'dashboard' ? (
                  <>
                    {statsLoading && <Loader2 size={14} className="animate-spin text-slate-400" />}
                    <FilterLineSegmented<number>
                      size="sm"
                      value={statsDays}
                      onChange={setStatsDays}
                      options={[
                        { label: '7 dias', value: 7 },
                        { label: '30 dias', value: 30 },
                        { label: '90 dias', value: 90 },
                        { label: '1 ano', value: 365 },
                      ]}
                    />
                  </>
                ) : sectionAction[tab]}
              />
            )}

            {loading ? (
              <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                <Loader2 size={18} className="animate-spin" />Carregando…
              </div>
            ) : (
              <>
                {/* ══ DASHBOARD ══ */}
                {tab === 'dashboard' && stats && (
                  <div className="space-y-3">
                    <StatGrid cols={4}>
                      <StatCard title="Receita no Período" value={fmt(stats.mrr || 0)} icon={DollarSign} color="success" description={`Últimos ${statsDays} dias`} />
                      <StatCard title="Clínicas Ativas" value={String(stats.active_tenants || 0)} icon={Building2} color="default" description={`${stats.total_tenants || 0} total`} />
                      <StatCard title="Usuários Totais" value={String(stats.total_users || 0)} icon={Users} color="info" description="Em todas as clínicas" />
                      <StatCard title="Ticket Médio" value={fmt(ticketMedio)} icon={TrendingUp} color="warning" description={`Por clínica, ${statsDays}d`} />
                    </StatGrid>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                      <PanelCard
                        className="lg:col-span-2 min-w-0"
                        title="Evolução de Receita"
                        description={`Últimos ${historyMonths} meses`}
                        icon={Activity}
                        action={
                          <Select
                            aria-label="Período do histórico"
                            size="sm"
                            value={String(historyMonths)}
                            onChange={e => setHistoryMonths(Number(e.target.value))}
                            options={[
                              { value: '3', label: '3 meses' },
                              { value: '6', label: '6 meses' },
                              { value: '12', label: '12 meses' },
                              { value: '24', label: '24 meses' },
                            ]}
                          />
                        }
                        contentClassName="p-3"
                      >
                        <div className="h-52 min-w-0 w-full relative">
                          {mrrHistory.length > 0 ? (
                            <ResponsiveContainer width="100%" height={208} debounce={100}>
                              <AreaChart data={mrrHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs><linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" style={{ stopColor: 'var(--c-600)', stopOpacity: 0.2 }} /><stop offset="95%" style={{ stopColor: 'var(--c-600)', stopOpacity: 0 }} /></linearGradient></defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#334155', fontSize: 12 }} formatter={(v: any) => [fmt(v), 'MRR']} />
                                <Area type="monotone" dataKey="mrr" stroke="var(--c-600)" strokeWidth={2} fill="url(#mrrGrad)" dot={{ fill: 'var(--c-600)', r: 3, strokeWidth: 0 }} />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : <div className="h-full flex items-center justify-center text-slate-400 text-xs">Sem dados ainda</div>}
                        </div>
                      </PanelCard>

                      <PanelCard className="min-w-0" title="Distribuição" description="Clínicas por plano" icon={BarChart3} contentClassName="p-3">
                        {stats.by_plan?.length > 0 ? (
                          <>
                            <div className="h-36 w-full relative">
                              <ResponsiveContainer width="100%" height={144} debounce={100}>
                                <PieChart><Pie data={stats.by_plan} dataKey="count" nameKey="plan_name" cx="50%" cy="50%" innerRadius={38} outerRadius={62} strokeWidth={2} stroke="#f8fafc">
                                  {stats.by_plan.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie><Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} /></PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="space-y-1.5 mt-2">
                              {stats.by_plan.map((p: any, i: number) => (
                                <div key={p.plan_name} className="flex items-center justify-between text-xs gap-2">
                                  <div className="flex items-center gap-2 min-w-0"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} /><span className="text-slate-500 truncate">{p.plan_name}</span></div>
                                  <span className="text-slate-700 font-medium shrink-0">{p.count}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : <div className="h-36 flex items-center justify-center text-slate-400 text-xs">Nenhum plano ativo</div>}
                      </PanelCard>
                    </div>

                    {stats.by_plan?.length > 0 && (
                      <PanelCard
                        title="Performance por Plano"
                        icon={BarChart3}
                        action={<Button variant="ghost" size="xs" iconRight={<ArrowUpRight size={14} />} onClick={() => changeTab('plans')}>Ver planos</Button>}
                      >
                        <GridTable<any>
                          noDesktopCard
                          data={planPerfData}
                          columns={planPerfCols}
                          keyExtractor={p => p.plan_name}
                          emptyMessage="Nenhum plano ativo"
                        />
                      </PanelCard>
                    )}
                  </div>
                )}

                {/* ══ PARCEIROS ══ */}
                {tab === 'clients' && (
                  <div className="space-y-3">
                    <Tabs<'all' | 'active' | 'expiring' | 'expired' | 'blocked'> items={clientTabs} value={clientFilter} onChange={setClientFilter} label="Filtrar parceiros por situação" />

                    {tenants.length === 0 ? (
                      <ContentCard>
                        <EmptyState
                          icon={Building2}
                          title="Nenhuma clínica ainda"
                          description="Adicione o primeiro parceiro clínico na plataforma."
                          action={<Button size="sm" iconLeft={<Plus size={14} />} onClick={openClientModal}>Nova Clínica</Button>}
                        />
                      </ContentCard>
                    ) : filteredClients.length === 0 ? (
                      <ContentCard><EmptyState icon={Building2} title="Nenhuma clínica nesta situação" description="Altere a aba para ver outras clínicas." /></ContentCard>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {filteredClients.map(t => {
                          const daysLeft = t.expires_at ? Math.ceil((new Date(t.expires_at).getTime() - new Date().getTime()) / 864e5) : null;
                          const isExpired = daysLeft !== null && daysLeft < 0;
                          const isBlocked = t.status === 'blocked';
                          const isExpiring = daysLeft !== null && daysLeft >= 0 && daysLeft <= 5;

                          return (
                            <ContentCard key={t.id} padding="none" className={`flex flex-col overflow-hidden ${isBlocked ? 'border-red-200' : isExpired ? 'border-amber-200' : ''}`}>
                              <div className="p-3 flex-1 flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-9 h-9 rounded-lg border border-primary-100 bg-primary-50 text-primary-700 flex items-center justify-center text-xs font-medium shrink-0">
                                      {initials(t.company_name)}
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="font-medium text-slate-800 text-sm leading-tight truncate">{t.company_name}</h4>
                                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1"><Calendar size={10} /> Desde {new Date(t.created_at).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                  </div>
                                  <StatusBadge active={t.active} status={t.status} expires_at={t.expires_at} trial_ends_at={t.trial_ends_at} billing_exempt={t.billing_exempt} />
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center min-w-0">
                                    <p className="text-[11px] text-slate-500 mb-0.5">Plano</p>
                                    <p className="text-xs font-medium text-slate-700 truncate">{t.plan_name || '—'}</p>
                                  </div>
                                  <div className={`border rounded-lg p-2 text-center min-w-0 ${t.billing_exempt ? 'bg-violet-50 border-violet-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <p className="text-[11px] text-slate-500 mb-0.5">Valor</p>
                                    <p className={`text-xs font-medium ${t.billing_exempt ? 'text-violet-700' : 'text-emerald-700'}`}>
                                      {t.billing_exempt ? 'Isento' : t.plan_price ? `R$${Number(t.plan_price).toFixed(0)}` : '—'}
                                    </p>
                                  </div>
                                  <div className={`border rounded-lg p-2 text-center min-w-0 ${isExpired ? 'bg-red-50 border-red-100' : isExpiring ? 'bg-amber-50 border-amber-100' : t.trial_ends_at ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <p className="text-[11px] text-slate-500 mb-0.5">{t.trial_ends_at ? 'Fim do Teste' : 'Vencimento'}</p>
                                    <p className={`text-xs font-medium ${isExpired ? 'text-red-600' : isExpiring ? 'text-amber-700' : t.trial_ends_at ? 'text-blue-700' : 'text-slate-700'}`}>
                                      {t.billing_exempt
                                        ? '—'
                                        : t.trial_ends_at
                                        ? new Date(t.trial_ends_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                                        : t.expires_at ? new Date(t.expires_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 gap-2">
                                  <span className="flex items-center gap-1.5 truncate min-w-0"><Mail size={12} className="shrink-0" /><span className="truncate">{t.admin_email}</span></span>
                                  <span className="flex items-center gap-1 shrink-0"><Users size={12} />{t.user_count || 0}/{t.max_users === 999 ? '∞' : t.max_users}</span>
                                </div>

                                {isExpired && !isBlocked && <Alert variant="error">Assinatura vencida — login bloqueado automaticamente</Alert>}
                                {isBlocked && <Alert variant="error">Acesso bloqueado manualmente</Alert>}

                                <div className="mt-auto pt-3 border-t border-slate-100 flex flex-col gap-2">
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1" iconLeft={<Edit2 size={14} />} onClick={() => openEditClient(t)}>Editar</Button>
                                    <Button variant={t.active ? 'outline' : 'success'} size="sm" className="flex-1"
                                      onClick={() => handleToggleClient(t)} disabled={!isAdmin || t.id === 1}
                                      iconLeft={t.active ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}>
                                      {t.active ? 'Suspender' : 'Reativar'}
                                    </Button>
                                    <IconButton
                                      variant={t.status === 'blocked' ? 'success' : 'outline'}
                                      size="sm"
                                      onClick={() => handleUpdateTenantStatus(t, t.status === 'blocked' ? 'active' : 'blocked')}
                                      disabled={!isAdmin || t.id === 1}
                                      aria-label={t.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                                      title={t.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}>
                                      {t.status === 'blocked' ? <Unlock size={14} /> : <Lock size={14} />}
                                    </IconButton>
                                  </div>
                                  {isRoot && t.id !== 1 && (
                                    <Button variant="softDanger" size="xs" fullWidth iconLeft={<Trash2 size={14} />} onClick={() => handleDeleteClient(t)}>Excluir clínica</Button>
                                  )}
                                </div>
                              </div>
                            </ContentCard>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ══ EQUIPE ══ */}
                {tab === 'team' && (
                  <div className="space-y-3">
                    <StatGrid cols={3}>
                      <StatCard title="Total" value={masterUsers.length} icon={Users} color="default" />
                      <StatCard title="Super Admin" value={masterUsers.filter(u => u.role === 'super_admin').length} icon={ShieldCheck} color="success" />
                      <StatCard title="Ativos" value={masterUsers.filter(u => u.active !== false).length} icon={UserCheck} color="info" />
                    </StatGrid>

                    {masterUsers.length === 0 ? (
                      <ContentCard>
                        <EmptyState icon={Shield} title="Nenhum integrante cadastrado"
                          action={<Button size="sm" iconLeft={<Plus size={14} />} onClick={openTeamModal}>Adicionar integrante</Button>} />
                      </ContentCard>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {masterUsers.map(u => (
                          <ContentCard key={u.id} padding="none" className="overflow-hidden flex flex-col">
                            <div className="p-3 flex-1 space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-lg border border-primary-100 bg-primary-50 text-primary-700 flex items-center justify-center text-sm font-medium overflow-hidden shrink-0">
                                  {u.avatar_url ? (
                                    <img src={getStaticUrl(u.avatar_url)} alt={u.name} className="w-full h-full object-cover" />
                                  ) : initials(u.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-medium text-slate-800 text-sm leading-tight truncate">{u.name}</h3>
                                  <p className="text-[11px] text-slate-500 mt-0.5">Equipe Master · Plaelo</p>
                                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                    <Badge size="sm" color="primary" icon={<ShieldCheck size={10} />}>Super Admin</Badge>
                                    <StatusBadge active={u.active !== false} />
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                {u.cargo && (
                                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                                    <Briefcase size={12} className="text-slate-400 shrink-0" />
                                    <span className="text-xs font-medium text-slate-700 truncate">{u.cargo}</span>
                                  </div>
                                )}
                                {u.departamento && (
                                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                                    <Users size={12} className="text-slate-400 shrink-0" />
                                    <span className="text-xs text-slate-600 truncate">{u.departamento}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                                  <Mail size={12} className="text-slate-400 shrink-0" />
                                  <span className="text-[11px] text-slate-500 truncate">{u.email}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                                  <Calendar size={12} className="text-slate-400 shrink-0" />
                                  <span className="text-[11px] text-slate-500">Membro desde {new Date(u.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center gap-2">
                              <Button variant="outline" size="xs" iconLeft={<Edit2 size={14} />} onClick={() => openEditTeamMember(u)}>Editar</Button>
                              {isRoot && u.id !== user?.id && u.email !== 'super@psiflux.com' && (
                                <IconButton variant="danger" size="xs" aria-label={`Remover ${u.name}`} onClick={() => handleDeleteTeamMember(u.id, u.name)}><Trash2 size={14} /></IconButton>
                              )}
                            </div>
                          </ContentCard>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ══ PERMISSÕES ══ */}
                {tab === 'permissions' && (
                  <div className="space-y-3">
                    {permProfiles.length === 0 ? (
                      <ContentCard>
                        <EmptyState icon={Lock} title="Nenhum perfil criado ainda"
                          description='Crie perfis como "Vendedor", "Suporte", "Financeiro" com permissões específicas'
                          action={<Button size="sm" iconLeft={<Plus size={14} />} onClick={openNewPerm}>Criar primeiro perfil</Button>} />
                      </ContentCard>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {permProfiles.map(p => {
                          const roleLabel = ROLE_TYPES.find(r => r.value === p.role_type)?.label || p.role_type;
                          return (
                            <ContentCard key={p.id} padding="none" className="overflow-hidden">
                              <div className="p-3 border-b border-slate-100 flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-lg border border-primary-100 bg-primary-50 flex items-center justify-center shrink-0">
                                    <Shield size={14} className="text-primary-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-slate-800 text-sm truncate">{p.name}</p>
                                    <p className="text-[11px] text-slate-500">{roleLabel}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge size="sm">{(p.permissions || []).length} permissões</Badge>
                                  <IconButton variant="outline" size="xs" aria-label="Editar perfil" onClick={() => openEditPerm(p)}><Edit2 size={14} /></IconButton>
                                  <IconButton variant="danger" size="xs" aria-label="Remover perfil" onClick={() => handleDeletePerm(p)}><Trash2 size={14} /></IconButton>
                                </div>
                              </div>

                              <div className="p-3 space-y-3">
                                {p.description && <p className="text-xs text-slate-500">{p.description}</p>}

                                {p.permissions?.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {p.permissions.map((key: string) => {
                                      const opt = MASTER_PERMISSIONS_OPTIONS.find(o => o.key === key);
                                      return <Badge key={key} size="sm" color="primary" icon={<Check size={10} />}>{opt?.label || key}</Badge>;
                                    })}
                                  </div>
                                )}

                                <div className="border border-slate-100 rounded-lg p-2.5 bg-slate-50">
                                  <div className="flex items-center justify-between mb-1.5 gap-2">
                                    <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1"><Link size={10} /> Link de Acesso</p>
                                    <Button variant="ghost" size="xs" iconLeft={<RefreshCw size={14} />} onClick={() => handleRegenerateToken(p)}>Novo link</Button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                                      <p className="text-[11px] text-slate-500 font-mono truncate">/acesso/{p.access_token?.slice(0, 16)}...</p>
                                    </div>
                                    <IconButton variant={copied === p.id ? 'success' : 'outline'} size="sm" aria-label="Copiar link de acesso" onClick={() => copyLink(p.access_token, p.id)}>
                                      {copied === p.id ? <Check size={14} /> : <Copy size={14} />}
                                    </IconButton>
                                  </div>
                                </div>

                                <p className="text-[11px] text-slate-500">Criado em {fmtDate(p.created_at)}</p>
                              </div>
                            </ContentCard>
                          );
                        })}
                      </div>
                    )}

                    <Alert variant="info">Perfis de permissão são exclusivos do painel master. Usuários de clínicas não têm acesso a esta área e não visualizam estes perfis.</Alert>
                  </div>
                )}

                {/* ══ PLANOS ══ */}
                {tab === 'plans' && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">{plans.length} plano{plans.length !== 1 ? 's' : ''} cadastrado{plans.length !== 1 ? 's' : ''}</p>
                      <FilterLineSegmented<'monthly' | 'annual'>
                        size="sm"
                        value={billingPeriod}
                        onChange={setBillingPeriod}
                        options={[
                          { value: 'monthly', label: 'Mensal' },
                          { value: 'annual', label: 'Anual (-20%)' },
                        ]}
                      />
                    </div>

                    {plans.length === 0 ? (
                      <ContentCard>
                        <EmptyState icon={Package} title="Nenhum plano criado" description="Crie planos que serão exibidos no site para pagamento"
                          action={<Button size="sm" iconLeft={<Plus size={14} />} onClick={openNewPlan}>Criar plano</Button>} />
                      </ContentCard>
                    ) : (
                      <>
                        <ContentCard padding="none">
                          <GridTable<any>
                            noDesktopCard
                            data={plans}
                            columns={planCols}
                            keyExtractor={p => p.id}
                            onRowClick={openEditPlan}
                            emptyMessage="Nenhum plano criado"
                            mobileBreakpoint="lg"
                          />
                        </ContentCard>

                        <PanelCard
                          title="Gateway de Pagamento"
                          description="Cobrança automática recorrente mensal ou anual"
                          icon={DollarSign}
                          action={<Badge size="sm" color="warning">Em breve</Badge>}
                          contentClassName="p-3"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                              { Icon: DollarSign, title: 'Stripe', desc: 'Cartão, boleto, Pix — recorrência automática.' },
                              { Icon: Link, title: 'Hotmart / Eduzz', desc: 'Checkout externo via webhook.' },
                            ].map(g => (
                              <div key={g.title} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                                <div className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center shrink-0"><g.Icon size={14} className="text-slate-500" /></div>
                                <div>
                                  <p className="text-[13px] font-medium text-slate-700">{g.title}</p>
                                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{g.desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </PanelCard>
                      </>
                    )}
                  </div>
                )}

                {/* ══ PAGAMENTOS ══ */}
                {tab === 'pagamentos' && (
                  <div className="space-y-3">
                    <Alert variant="info" title="Tokens exclusivos da plataforma">
                      Estas chaves são separadas do token que cada psicólogo usa para receber dos pacientes.
                    </Alert>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
                      <GatewayCard
                        title="Mercado Pago — Plataforma"
                        description="Access Token da sua conta MP para receber assinaturas dos consultórios"
                        configured={mpConfig.configured} enabled={mpConfig.enabled}
                        token={mpToken} setToken={setMpToken} showToken={mpShowToken} setShowToken={setMpShowToken}
                        saving={mpSaving} testing={mpTesting}
                        onToggle={toggleMpEnabled} onSave={saveMpToken} onTest={testMpToken} onDisconnect={disconnectMp}
                        configuredMsg="Token Mercado Pago configurado. Assinaturas serão recebidas na sua conta."
                        replaceHint="Para trocar o token, cole o novo abaixo:"
                        placeholderReplace="Novo Access Token (APP_USR-...)" placeholderNew="Access Token (APP_USR-...)"
                        disconnectLabel="Desconectar Mercado Pago"
                        steps={<>
                          <li>Acesse <strong>mercadopago.com.br</strong> com a conta da plataforma Plaelo</li>
                          <li>Vá em <strong>Seu negócio → Configurações → Credenciais de produção</strong></li>
                          <li>Copie o <strong>Access Token</strong> (começa com <code className="bg-slate-100 px-1 rounded">APP_USR-</code>)</li>
                          <li>Cole abaixo e clique em <strong>Conectar</strong></li>
                        </>}
                      />
                      <GatewayCard
                        title="Asaas — Plataforma"
                        description="Chave da conta Asaas da Plaelo para receber assinaturas dos consultórios"
                        configured={asaasConfig.configured} enabled={asaasConfig.enabled}
                        token={asaasToken} setToken={setAsaasToken} showToken={asaasShowToken} setShowToken={setAsaasShowToken}
                        saving={asaasSaving} testing={asaasTesting}
                        onToggle={toggleAsaasEnabled} onSave={saveAsaasToken} onTest={testAsaasToken} onDisconnect={disconnectAsaas}
                        configuredMsg="Chave Asaas configurada. Assinaturas serão recebidas na conta da Plaelo."
                        replaceHint="Para trocar a chave, cole a nova abaixo:"
                        placeholderReplace="Nova API Key ($aact_...)" placeholderNew="API Key ($aact_...)"
                        disconnectLabel="Desconectar Asaas"
                        steps={<>
                          <li>Acesse <strong>asaas.com</strong> com a conta integradora da Plaelo</li>
                          <li>Vá em <strong>Integrações → Chaves de API</strong></li>
                          <li>Gere e copie a <strong>API Key</strong> (começa com <code className="bg-slate-100 px-1 rounded">$aact_</code>)</li>
                          <li>Cole abaixo e clique em <strong>Conectar</strong></li>
                        </>}
                      />
                    </div>

                    <Alert variant="warning" title="Dois tokens, dois fluxos — nunca se misturam:">
                      <p>• <strong>Estas chaves/tokens (super_admin, acima)</strong> → recebem as assinaturas mensais dos consultórios</p>
                      <p>• <strong>Chave do psicólogo</strong> (em Configurações → Integrações) → recebe pagamentos de pacientes, direto na conta dele</p>
                    </Alert>
                  </div>
                )}

                {/* ══ FATURAS ══ */}
                {tab === 'faturas' && (
                  <div className="space-y-3">
                    <StatGrid cols={4}>
                      <StatCard title="Recebido" value={fmt(Number(invoicesSummary.total_approved) || 0)} icon={DollarSign} color="success" />
                      <StatCard title="Faturas pagas" value={invoicesSummary.count_approved} icon={CheckCircle} color="default" />
                      <StatCard title="Aguardando" value={fmt(Number(invoicesSummary.total_pending) || 0)} icon={Clock} color="warning" />
                      <StatCard title="Faturas pendentes" value={invoicesSummary.count_pending} icon={FileText} color="default" />
                    </StatGrid>

                    <FilterLine>
                      <FilterLineSection grow>
                        <FilterLineSelect
                          label="Status"
                          value={invoiceStatusFilter}
                          onChange={setInvoiceStatusFilter}
                          options={[
                            { value: '', label: 'Todos os status' },
                            { value: 'approved', label: 'Aprovadas' },
                            { value: 'pending', label: 'Pendentes' },
                            { value: 'rejected', label: 'Rejeitadas' },
                            { value: 'cancelled', label: 'Canceladas' },
                          ]}
                        />
                      </FilterLineSection>
                    </FilterLine>

                    <ContentCard padding="none">
                      <GridTable<any>
                        noDesktopCard
                        data={invPg.paginatedData}
                        columns={invoiceCols}
                        keyExtractor={inv => inv.id}
                        isLoading={invoicesLoading}
                        emptyMessage="Nenhuma fatura encontrada."
                        mobileBreakpoint="lg"
                        pagination={{ total: invoices.length, page: invPg.page, pageSize: invPg.pageSize, onPageChange: invPg.setPage, onPageSizeChange: invPg.setPageSize }}
                      />
                    </ContentCard>
                  </div>
                )}

                {tab === 'areas' && <ProfessionalAreasTab />}

                {/* ══ E-MAILS ══ */}
                {tab === 'emails' && (
                  <div className="space-y-3">
                    <StatGrid cols={3}>
                      <StatCard title="Destinatários ativos" value={emailSummary.active_recipients || 0} icon={Users} color="default" />
                    </StatGrid>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 items-start">
                      <PanelCard className="xl:col-span-2 min-w-0" title="Novo comunicado" description="O envio será feito somente para usuários com conta ativa e e-mail cadastrado." icon={Mail} contentClassName="p-3 space-y-3">
                        <Input label="Assunto do e-mail" maxLength={180} value={emailForm.subject} onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })} placeholder="Ex.: Novidade no Plaelo" />
                        <Input label="Título em destaque" maxLength={180} value={emailForm.title} onChange={e => setEmailForm({ ...emailForm, title: e.target.value })} placeholder="Uma nova atualização chegou" />
                        <Textarea label="Mensagem" rows={6} value={emailForm.content} onChange={e => setEmailForm({ ...emailForm, content: e.target.value })} placeholder="Conte o que mudou e como isso ajuda no dia a dia..." />
                        <FormRow cols={2}>
                          <Input label="Texto do botão (opcional)" value={emailForm.button_text} onChange={e => setEmailForm({ ...emailForm, button_text: e.target.value })} />
                          <Input label="Link do botão (opcional)" value={emailForm.button_url} onChange={e => setEmailForm({ ...emailForm, button_url: e.target.value })} placeholder="https://..." />
                        </FormRow>
                        <div className="flex justify-end">
                          <Button
                            iconLeft={<Send size={14} />}
                            loading={sendingCampaign}
                            disabled={sendingCampaign || !emailSummary.active_recipients}
                            onClick={() => doConfirm({ message: `Enviar para ${emailSummary.active_recipients || 0} usuários ativos?`, detail: 'O envio será registrado no histórico.', onConfirm: sendCampaign })}
                          >
                            {sendingCampaign ? 'Enviando...' : 'Disparar e-mail para ativos'}
                          </Button>
                        </div>
                      </PanelCard>
                      <PanelCard className="min-w-0" title="Últimos disparos" icon={Send} contentClassName="p-3 space-y-2">
                        {(emailSummary.campaigns || []).length === 0 ? (
                          <EmptyState icon={Mail} title="Nenhum comunicado enviado ainda." />
                        ) : emailSummary.campaigns.map((campaign: any) => (
                          <div key={campaign.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                            <p className="text-xs font-medium text-slate-700 truncate">{campaign.subject}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{campaign.delivered_count}/{campaign.recipient_count} enviados · {fmtDate(campaign.sent_at || campaign.created_at)}</p>
                            {campaign.failed_count > 0 && <p className="text-[11px] text-red-600 mt-0.5">{campaign.failed_count} falharam</p>}
                          </div>
                        ))}
                      </PanelCard>
                    </div>
                  </div>
                )}

                {/* ══ WHATSAPP BOT ══ */}
                {tab === 'whatsapp' && canAccessWpp && (
                  <div className="space-y-3">
                    <PanelCard
                      title="Conexão"
                      description="Envia lembretes automáticos 60 min antes das sessões para todos os profissionais cadastrados nas clínicas."
                      icon={Phone}
                      action={
                        wppStatus.status === 'connected'
                          ? <Badge size="sm" color="success" dot>Conectado</Badge>
                          : wppStatus.status === 'connecting'
                          ? <Badge size="sm" color="warning" icon={<Loader2 size={10} className="animate-spin" />}>Aguardando QR</Badge>
                          : <Badge size="sm" dot>Desconectado</Badge>
                      }
                      contentClassName="p-3"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-3">
                          {wppStatus.status === 'connected' && wppStatus.phone && (
                            <Alert variant="success" title="Número ativo">{wppStatus.phone}</Alert>
                          )}
                          <div className="flex flex-col gap-2">
                            {wppStatus.status === 'disconnected' ? (
                              <Button variant="success" onClick={handleWppConnect} disabled={loadingWpp} loading={loadingWpp} iconLeft={<Plus size={14} />}>Conectar WhatsApp</Button>
                            ) : (
                              <>
                                <Button variant="softDanger" onClick={handleWppDisconnect} disabled={loadingWpp} loading={loadingWpp} iconLeft={<LogOut size={14} />}>Desconectar</Button>
                                {wppStatus.status === 'connected' && (
                                  <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                                    <p className="text-xs font-medium text-slate-600">Enviar teste</p>
                                    <div className="flex gap-2 items-end">
                                      <div className="flex-1 min-w-0">
                                        <Input id="testPhone" aria-label="Telefone para teste" type="text" placeholder="(00) 00000-0000"
                                          onChange={e => { let v = e.target.value.replace(/\D/g,''); if(v.length>11)v=v.slice(0,11); if(v.length>2)v=`(${v.slice(0,2)}) ${v.slice(2)}`; if(v.length>9)v=`${v.slice(0,10)}-${v.slice(10)}`; e.target.value=v; }} />
                                      </div>
                                      <Button size="md" onClick={async () => { const ph=(document.getElementById('testPhone') as HTMLInputElement).value; if(!ph) return toast('Insira um número','info'); try { await api.post('/whatsapp/test',{phone:ph,message:'🚀 Teste Plaelo: Bot operando!'}); toast('Enviado!'); } catch { toast('Erro','error'); }}}>
                                        Testar
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            {(wppStatus.status === 'connecting' || wppStatus.status === 'connected') && (
                              <Button variant="outline" size="sm" onClick={loadWppStatus} iconLeft={<RefreshCw size={14} />}>Atualizar status</Button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-lg min-h-[180px] p-3">
                          {wppStatus.qrcode ? (
                            <div className="bg-white p-3 rounded-lg border border-slate-100">
                              <img src={wppStatus.qrcode} alt="QR Code" className="w-44 h-44 sm:w-52 sm:h-52 max-w-full" />
                              <p className="text-[11px] text-center text-slate-500 mt-2">Escaneie no WhatsApp</p>
                            </div>
                          ) : wppStatus.status === 'connected' ? (
                            <EmptyState className="border-0 bg-transparent" icon={CheckCircle} title="Bot ativo" description="Enviando mensagens" />
                          ) : (
                            <EmptyState className="border-0 bg-transparent" icon={Phone} title="Desconectado" />
                          )}
                        </div>
                      </div>
                    </PanelCard>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
                      {/* Toggles mestres — liga/desliga cada tipo de aviso ao profissional,
                          plataforma inteira. Cada profissional ainda pode desativar o que
                          quiser individualmente em Configurações → Notificações. */}
                      <PanelCard
                        title="Avisos aos profissionais"
                        description="Kill-switch geral: desligar aqui bloqueia o tipo de aviso para TODOS os profissionais da plataforma. Cada profissional também controla individualmente em Configurações → Notificações."
                        icon={Calendar}
                        action={masterWppSaving ? <Loader2 size={14} className="animate-spin text-slate-400" /> : undefined}
                      >
                        <div className="divide-y divide-slate-100">
                          {[
                            { key: 'new_appointment_professional_enabled', Icon: Calendar, title: 'Novo agendamento', desc: 'Sistema ou Portal do Paciente' },
                            { key: 'reminder_60min_enabled', Icon: Clock, title: 'Lembrete 60 min antes', desc: 'Aviso de consulta próxima' },
                            { key: 'reminder_24h_professional_enabled', Icon: Calendar, title: 'Lembrete 24h antes', desc: 'Aviso no dia anterior' },
                            { key: 'cancelled_appointment_professional_enabled', Icon: X, title: 'Cancelamento', desc: 'Sistema ou Portal do Paciente' },
                            { key: 'rescheduled_appointment_professional_enabled', Icon: RefreshCw, title: 'Remarcação', desc: 'Sistema ou Portal do Paciente' },
                          ].map(item => (
                            <div key={item.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                                  <item.Icon size={14} className="text-slate-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-800 text-[13px]">{item.title}</p>
                                  <p className="text-[11px] text-slate-500">{item.desc}</p>
                                </div>
                              </div>
                              <Switch aria-label={item.title} checked={!!(masterWppPrefs as any)[item.key]} onCheckedChange={() => toggleMasterWppPref(item.key)} />
                            </div>
                          ))}
                        </div>
                      </PanelCard>

                      {/* Bot conversacional — separado dos avisos acima. Desligar aqui NÃO
                          afeta os lembretes/avisos automáticos, só o menu de atendimento
                          via chat (quem escrever para o número não recebe resposta). */}
                      <PanelCard
                        title="Bot conversacional"
                        description="Desligado, o número master só envia os avisos automáticos ao lado — não responde quem mandar mensagem pra ele."
                        icon={MessageSquare}
                      >
                        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                              <MessageSquare size={14} className="text-slate-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 text-[13px]">Responder mensagens automaticamente</p>
                              <p className="text-[11px] text-slate-500">Menu de atendimento (agenda, reagendar, etc.) para quem escrever no número master</p>
                            </div>
                          </div>
                          <Switch aria-label="Responder mensagens automaticamente" checked={!!masterWppPrefs.conversation_enabled} onCheckedChange={() => toggleMasterWppPref('conversation_enabled')} />
                        </div>
                      </PanelCard>
                    </div>
                  </div>
                )}

                {tab === 'conversations' && canAccessWpp && <ConversationsTab />}
              </>
            )}
          </div>

          {/* ══ MODAL EDITAR / NOVA CLÍNICA ══ */}
          <Modal
            isOpen={clientModal}
            onClose={() => { setClientModal(false); setError(''); }}
            title={editClient ? 'Editar Clínica' : 'Nova Clínica'}
            subtitle={editClient ? `ID: ${editClient.id} — ${editClient.company_name}` : 'Crie o acesso para uma nova clínica'}
            size="xl"
            mobileStyle="fullscreen"
            footer={
              <ModalFooter align="between">
                <Button variant="outline" size="sm" onClick={() => { setClientModal(false); setError(''); }}>Cancelar</Button>
                <Button size="sm" loading={saving} disabled={saving} iconLeft={<Save size={14} />} onClick={() => { validateClientTab(); handleSaveClient(); }}>
                  {editClient ? 'Salvar Alterações' : 'Criar Clínica'}
                </Button>
              </ModalFooter>
            }
          >
            <div className="space-y-3">
              {error && <Alert variant="error">{error}</Alert>}
              <Tabs<ClientTab> items={CLIENT_TABS} value={clientTab} onChange={setClientTab} label="Seções da clínica" />

              {clientTab === 'dados' && (
                <div className="space-y-3">
                  <Input label="Nome da Clínica *" placeholder="Ex: Clínica Vida Plena" value={clientForm.company_name} onChange={e => setClientForm({ ...clientForm, company_name: e.target.value })} />
                  <FormRow cols={2}>
                    <Input label="CNPJ / CPF" placeholder="00.000.000/0000-00" value={clientForm.cnpj_cpf} onChange={e => setClientForm({ ...clientForm, cnpj_cpf: mkC(e.target.value) })} />
                    <Input label="Telefone" placeholder="(11) 99999-9999" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: mkP(e.target.value) })} />
                  </FormRow>
                </div>
              )}

              {clientTab === 'acesso' && (
                <FormRow cols={2}>
                  <Input label="Nome do Admin" placeholder="Nome completo" value={clientForm.admin_name} onChange={e => setClientForm({ ...clientForm, admin_name: e.target.value })} />
                  <Input label="E-mail do Admin *" type="email" placeholder="admin@clinica.com" value={clientForm.admin_email} onChange={e => setClientForm({ ...clientForm, admin_email: e.target.value })} />
                  {!editClient && (
                    <Input
                      wrapperClassName="md:col-span-2"
                      label="Senha *"
                      type={showPass ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={clientForm.password}
                      onChange={e => setClientForm({ ...clientForm, password: e.target.value })}
                      iconRight={<IconButton type="button" variant="ghost" size="xs" aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPass(!showPass)}>{showPass ? <EyeOff size={14} /> : <Eye size={14} />}</IconButton>}
                    />
                  )}
                </FormRow>
              )}

              {clientTab === 'assinatura' && (
                <div className="space-y-3">
                  <FormRow cols={3}>
                    <Select label="Plano" value={clientForm.plan_id} onChange={e => setClientForm({ ...clientForm, plan_id: e.target.value })}
                      options={[{ value: '', label: 'Sem plano' }, ...plans.map(p => ({ value: String(p.id), label: `${p.name} — ${fmt(p.price)}` }))]} />
                    <DatePicker label="Vencimento" value={clientForm.expires_at} onChange={v => setClientForm({ ...clientForm, expires_at: v || '' })} />
                    <Select label="Status de Cobrança" value={clientForm.status} onChange={e => setClientForm({ ...clientForm, status: e.target.value })}
                      options={[
                        { value: 'active', label: 'Regular (Ativo)' },
                        { value: 'expired', label: 'Atrasado (Vencido)' },
                        { value: 'blocked', label: 'Bloqueado' },
                      ]} />
                    <DatePicker label="Fim do Teste Grátis" hint="Deixe em branco se não estiver em teste." value={clientForm.trial_ends_at} onChange={v => setClientForm({ ...clientForm, trial_ends_at: v || '' })} />
                  </FormRow>

                  <div className="rounded-lg border border-slate-200 p-3">
                    <Switch
                      checked={clientForm.billing_exempt}
                      onCheckedChange={v => setClientForm({ ...clientForm, billing_exempt: v })}
                      label="Isenta de cobrança"
                      description="Clínica nunca é bloqueada por vencimento/teste expirado, não pode gerar cobrança e fica fora do MRR e das métricas de receita."
                    />
                  </div>

                  {editClient && clientForm.trial_ends_at && !clientForm.billing_exempt && (
                    <Alert
                      variant="info"
                      title="Cliente em período de teste"
                      action={
                        <Button type="button" variant="outline" size="sm" onClick={convertTrialToActive} loading={convertingTrial} disabled={convertingTrial || !clientForm.plan_id}>
                          Converter em assinatura ativa
                        </Button>
                      }
                    >
                      Converta agora para assinatura ativa usando o plano selecionado acima, sem esperar pagamento via Mercado Pago.
                    </Alert>
                  )}
                </div>
              )}
            </div>
          </Modal>

          {/* ══ MODAL INTEGRANTE ══ */}
          <Modal
            isOpen={teamModal}
            onClose={() => { setTeamModal(false); setError(''); }}
            title={editTeam ? 'Editar Integrante' : 'Novo Integrante'}
            subtitle={editTeam ? `ID: ${editTeam.id} — ${editTeam.name}` : 'Acesso master ao painel de super admin'}
            size="lg"
            mobileStyle="fullscreen"
            footer={
              <ModalFooter align="between">
                <Button variant="outline" size="sm" onClick={() => { setTeamModal(false); setError(''); }}>Cancelar</Button>
                <Button size="sm" loading={saving} disabled={saving} iconLeft={<Save size={14} />} onClick={() => { validateTeamTab(); handleSaveTeamMember(); }}>
                  {editTeam ? 'Salvar Alterações' : 'Criar Integrante'}
                </Button>
              </ModalFooter>
            }
          >
            <div className="space-y-3">
              {error && <Alert variant="error">{error}</Alert>}
              <Tabs<TeamTab> items={TEAM_TABS} value={teamTab} onChange={setTeamTab} label="Seções do integrante" />

              {teamTab === 'dados' && (
                <div className="space-y-3">
                  <Input label="Nome Completo *" placeholder="Nome completo" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} />
                  <FormRow cols={2}>
                    <Input label="E-mail *" type="email" placeholder="usuario@psiflux.com" value={teamForm.email} onChange={e => setTeamForm({ ...teamForm, email: e.target.value })} />
                    <Input label="Telefone" placeholder="(11) 99999-9999" value={teamForm.phone} onChange={e => setTeamForm({ ...teamForm, phone: mkP(e.target.value) })} />
                    {teamForm.email !== 'super@psiflux.com' && (
                      <>
                        <Input label="Cargo / Profissão" placeholder="Ex: Gestor Comercial" value={teamForm.cargo} onChange={e => setTeamForm({ ...teamForm, cargo: e.target.value })} />
                        <Input label="Departamento" placeholder="Ex: Suporte" value={teamForm.departamento} onChange={e => setTeamForm({ ...teamForm, departamento: e.target.value })} />
                      </>
                    )}
                  </FormRow>

                  <div>
                    <p className="ds-label mb-1">Foto do Perfil</p>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                      <div className="w-14 h-14 rounded-lg bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                        {teamForm.avatar_url ? (
                          <img src={getStaticUrl(teamForm.avatar_url)} alt="Foto do integrante" className="w-full h-full object-cover" />
                        ) : <User size={22} className="text-slate-300" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <input type="file" className="hidden" ref={teamFileRef} accept="image/*" aria-label="Enviar foto do perfil" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingTeamPhoto(true);
                          try {
                            const fd = new FormData();
                            fd.append('file', file);
                            fd.append('category', 'Perfil-Master');
                            const res: any = await api.post('/uploads', fd);
                            setTeamForm({ ...teamForm, avatar_url: res.file_url });
                            toast('Foto carregada!');
                          } catch { toast('Erro ao carregar foto.', 'error'); }
                          finally { setUploadingTeamPhoto(false); }
                        }} />
                        <Button type="button" variant="outline" size="sm" loading={uploadingTeamPhoto} iconLeft={<Camera size={14} />} onClick={() => teamFileRef.current?.click()}>
                          {teamForm.avatar_url ? 'Alterar Foto' : 'Carregar Foto'}
                        </Button>
                        <p className="text-[11px] text-slate-500 mt-1">JPG, PNG ou WEBP. Máximo 2MB.</p>
                      </div>
                      {teamForm.avatar_url && (
                        <IconButton type="button" variant="ghost" size="sm" aria-label="Remover foto" onClick={() => setTeamForm({ ...teamForm, avatar_url: '' })}>
                          <Trash2 size={14} />
                        </IconButton>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {teamTab === 'acesso' && (
                <div className="space-y-3">
                  <Input
                    label={'Senha' + (editTeam ? ' (deixe em branco para não alterar)' : ' *')}
                    type={showTeamPass ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={teamForm.password}
                    onChange={e => setTeamForm({ ...teamForm, password: e.target.value })}
                    iconRight={<IconButton type="button" variant="ghost" size="xs" aria-label={showTeamPass ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowTeamPass(!showTeamPass)}>{showTeamPass ? <EyeOff size={14} /> : <Eye size={14} />}</IconButton>}
                  />
                  <Select
                    label="Perfil de Permissão"
                    value={teamForm.permission_profile_id}
                    onChange={e => setTeamForm({ ...teamForm, permission_profile_id: e.target.value })}
                    options={[{ value: '', label: 'Acesso total (Super Admin)' }, ...permProfiles.map(p => ({ value: String(p.id), label: p.name }))]}
                    hint={teamForm.permission_profile_id ? 'As permissões serão limitadas ao perfil selecionado.' : 'Sem restrições — acesso completo ao painel master.'}
                  />
                </div>
              )}
            </div>
          </Modal>

          {/* ══ MODAL PERFIL DE PERMISSÃO ══ */}
          <Modal
            isOpen={permModal}
            onClose={() => { setPermModal(false); setError(''); }}
            title={editPerm ? 'Editar Perfil' : 'Novo Perfil de Permissão'}
            subtitle="Defina as permissões e gere um link de acesso único"
            size="lg"
            mobileStyle="fullscreen"
            footer={
              <ModalFooter align="between">
                <Button variant="outline" size="sm" onClick={() => { setPermModal(false); setError(''); }}>Cancelar</Button>
                <Button size="sm" loading={saving} disabled={saving} iconLeft={<Save size={14} />} onClick={() => { if (!permForm.name) setPermTab('dados'); handleSavePerm(); }}>
                  {editPerm ? 'Salvar' : 'Criar Perfil'}
                </Button>
              </ModalFooter>
            }
          >
            <div className="space-y-3">
              {error && <Alert variant="error">{error}</Alert>}
              <Tabs<PermTab> items={permTabs} value={permTab} onChange={setPermTab} label="Seções do perfil" />

              {permTab === 'dados' && (
                <div className="space-y-3">
                  <Input label="Nome do Perfil *" placeholder="Ex: Vendedor, Suporte, Financeiro" value={permForm.name} onChange={e => setPermForm({ ...permForm, name: e.target.value })} />
                  <Input label="Descrição" placeholder="Descrição do perfil de acesso" value={permForm.description} onChange={e => setPermForm({ ...permForm, description: e.target.value })} />
                  <Select label="Tipo de Acesso" value={permForm.role} onChange={e => setPermForm({ ...permForm, role: e.target.value })}
                    options={ROLE_TYPES.map(r => ({ value: r.value, label: r.label }))} />
                  {!editPerm && (
                    <Alert variant="info"><span className="inline-flex items-center gap-1.5"><Globe size={14} className="shrink-0" />Um link de acesso único será gerado automaticamente após a criação.</span></Alert>
                  )}
                </div>
              )}

              {permTab === 'permissoes' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MASTER_PERMISSIONS_OPTIONS.map(opt => {
                    const active = permForm.permissions.includes(opt.key);
                    return (
                      <label key={opt.key} className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition text-xs border ${active ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                        <input type="checkbox" className="sr-only" checked={active} onChange={() => togglePermission(opt.key)} />
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition ${active ? 'bg-primary-600 border-primary-600' : 'bg-white border-slate-300'}`}>
                          {active && <Check size={10} className="text-white" />}
                        </div>
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </Modal>

          {/* ══ MODAL PLANO ══ */}
          <Modal
            isOpen={planModal}
            onClose={() => { setPlanModal(false); setError(''); }}
            title={editPlan ? 'Editar Plano' : 'Novo Plano'}
            subtitle={editPlan ? `Editando: ${editPlan.name}` : 'Configure um novo plano de assinatura'}
            size="2xl"
            mobileStyle="fullscreen"
            footer={
              <ModalFooter align="between">
                <Button variant="outline" size="sm" onClick={() => { setPlanModal(false); setError(''); }}>Cancelar</Button>
                <Button size="sm" loading={saving} disabled={saving} iconLeft={<Save size={14} />} onClick={() => { if (!planForm.name || !planForm.price) setPlanTab('dados'); handleSavePlan(); }}>
                  {editPlan ? 'Salvar' : 'Criar Plano'}
                </Button>
              </ModalFooter>
            }
          >
            <div className="space-y-3">
              {error && <Alert variant="error">{error}</Alert>}
              <Tabs<PlanTab> items={planTabs} value={planTab} onChange={setPlanTab} label="Seções do plano" />

              {planTab === 'dados' && (
                <div className="space-y-3">
                  <Input label="Nome *" placeholder="Ex: Pro" value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} />
                  <Input label="Descrição" placeholder="Breve descrição" value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} />
                  <FormRow cols={2}>
                    <Input
                      label="Preço R$ *"
                      placeholder="R$ 0,00"
                      value={planForm.price}
                      onChange={e => {
                        const digits = e.target.value.replace(/\D/g, '');
                        if (!digits) return setPlanForm({ ...planForm, price: '' });
                        const n = (parseInt(digits, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        setPlanForm({ ...planForm, price: n });
                      }}
                    />
                    <Input label="Usuários" type="number" placeholder="10" value={planForm.max_users} onChange={e => setPlanForm({ ...planForm, max_users: e.target.value })} />
                  </FormRow>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <Switch
                      checked={planForm.highlighted}
                      onCheckedChange={v => setPlanForm({ ...planForm, highlighted: v })}
                      label='Destaque no site — "Mais popular"'
                      description="Este plano aparecerá em destaque na página de planos do site"
                    />
                  </div>
                </div>
              )}

              {planTab === 'funcionalidades' && (
                <div className="space-y-3">
                  {plans.filter(p => p.id !== editPlan?.id && (p.features || []).length > 0).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-500 mr-1">Copiar de:</span>
                      {plans.filter(p => p.id !== editPlan?.id && (p.features || []).length > 0).map(p => (
                        <Button
                          key={p.id}
                          type="button"
                          variant="soft"
                          size="xs"
                          onClick={() => setPlanForm(prev => ({ ...prev, features: Array.from(new Set(p.features || [])) }))}
                          title={`Usar exatamente as funcionalidades do plano ${p.name}`}
                        >
                          {p.name}
                        </Button>
                      ))}
                      {planForm.features.length > 0 && (
                        <Button type="button" variant="ghost" size="xs" onClick={() => setPlanForm(prev => ({ ...prev, features: [] }))}>Limpar tudo</Button>
                      )}
                    </div>
                  )}
                  {Array.from(new Set(FEATURES_OPTIONS.map(o => o.group))).map(group => (
                    <div key={group}>
                      <p className="text-xs font-medium text-slate-600 mb-1.5">{group}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {FEATURES_OPTIONS.filter(o => o.group === group).map(opt => {
                          const active = planForm.features.includes(opt.key);
                          return (
                            <label key={opt.key} className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition text-xs border ${active ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                              <input type="checkbox" className="sr-only" checked={active} onChange={() => toggleFeature(opt.key)} />
                              <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition ${active ? 'bg-primary-600 border-primary-600' : 'bg-white border-slate-300'}`}>
                                {active && <Check size={10} className="text-white" />}
                              </div>
                              <span className="min-w-0">{opt.label}</span>
                              {opt.premium && <Badge size="sm" color="warning" className="ml-auto">Premium</Badge>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Modal>
        </PageWrapper>
      </main>
    </div>
  );
};
