import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon, Palette, Bell, Globe, Moon, Monitor, Smartphone,
  Check, ChevronRight, ShieldCheck, Mail,
  Save, AlertTriangle, Clock, Send, Loader2, Calendar,
  BarChart2, FileText, UserCheck, Users2, ExternalLink, Zap, ClipboardList,
  MessageSquare, Video, FileCode, Plug, ArrowRight, Users, Shield,
  Phone, Briefcase, CreditCard, Eye, EyeOff, Unplug, CheckCircle2, XCircle, Receipt, Wallet,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '../components/UI/Button';
import { PageWrapper, SectionTitle, StatGrid, StatCard, Tabs, PanelCard, FormRow, Alert, Badge, EmptyState, ContentCard, Input, Select } from '../components/UI';
import { Switch } from '../components/UI/Switch';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Language } from '../translations';
import { useToast } from '../contexts/ToastContext';
import { api, getStaticUrl } from '../services/api';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import { maskCpfCnpj, maskPhoneBR, isValidCpfCnpj } from '../src/lib/masks';
import { fetchAddressByCep, applyCepMask } from '../src/lib/cep';

// ─── Types ──────────────────────────────────────────────────────────────────
type EmailPrefs = {
  enabled: boolean;
  new_appointment: boolean;
  appointment_reminder_professional: boolean;
  appointment_reminder_patient: boolean;
  appointment_reminder_minutes: number;
  birthday_reminder: boolean;
  weekly_report: boolean;
  monthly_report: boolean;
  form_response: boolean;
  wpp_reminder_60min: boolean;
  wpp_reminder_24h: boolean;
  wpp_new_appointment: boolean;
  wpp_cancelled_appointment: boolean;
  wpp_rescheduled_appointment: boolean;
};

const DEFAULT_EMAIL_PREFS: EmailPrefs = {
  enabled: false,
  new_appointment: false,
  appointment_reminder_professional: false,
  appointment_reminder_patient: false,
  appointment_reminder_minutes: 60,
  birthday_reminder: false,
  weekly_report: false,
  monthly_report: false,
  form_response: false,
  wpp_reminder_60min: true,
  wpp_reminder_24h: true,
  wpp_new_appointment: true,
  wpp_cancelled_appointment: true,
  wpp_rescheduled_appointment: true,
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  profissional: 'Profissional',
  secretaria: 'Secretária',
  super_admin: 'Super Admin',
};

const ROLE_COLOR: Record<string, 'primary' | 'success' | 'warning' | 'danger'> = {
  admin: 'primary',
  profissional: 'success',
  secretaria: 'warning',
  super_admin: 'danger',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <Switch checked={checked} onCheckedChange={onChange} />
);

const ToggleRow = ({ icon: Icon, title, desc, checked, onChange }: { icon: React.ElementType; title: string; desc: string; checked: boolean; onChange: () => void }) => (
  <div className="flex items-center justify-between gap-3 py-2.5">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500"><Icon size={14} /></div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-slate-800">{title}</p>
        <p className="text-[11px] text-slate-500">{desc}</p>
      </div>
    </div>
    <ToggleSwitch checked={checked} onChange={onChange} />
  </div>
);

// ─── Component ───────────────────────────────────────────────────────────────
export const Settings: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { user, hasPermission, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'aparencia');
  const { mode: selectedMode, setMode, primaryColor: selectedColor, setPrimaryColor: setSelectedColor } = useTheme();
  const { pushToast } = useToast();
  const { preferences, updatePreference } = useUserPreferences();

  // ── Team ──────────────────────────────────────────────────────────────────
  const [team, setTeam] = useState<any[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'equipe') return;
    setTeamLoading(true);
    api.get<any[]>('/users').then((data: any) => {
      setTeam(Array.isArray(data) ? data : []);
    }).catch(() => setTeam([])).finally(() => setTeamLoading(false));
  }, [activeTab]);

  // ── Conformidade ética e legal (histórico de aceites de termos) ─────────────
  const [termsHistory, setTermsHistory] = useState<Array<{ id: number; type: string; version: string; title: string; summary: string | null; content: string; accepted_at: string | null }>>([]);
  const [termsLoading, setTermsLoading] = useState(false);
  const [expandedTermId, setExpandedTermId] = useState<number | null>(null);
  const [acceptingTermId, setAcceptingTermId] = useState<number | null>(null);
  const [termChecks, setTermChecks] = useState<Record<number, boolean>>({});

  const loadTermsHistory = useCallback(() => {
    setTermsLoading(true);
    api.get<{ items: typeof termsHistory }>('/terms/my-history')
      .then(data => setTermsHistory(data.items || []))
      .catch(() => setTermsHistory([]))
      .finally(() => setTermsLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'conformidade') loadTermsHistory();
  }, [activeTab, loadTermsHistory]);

  const handleAcceptTerm = async (id: number) => {
    setAcceptingTermId(id);
    try {
      await api.post(`/terms/${id}/accept`, {});
      pushToast('success', 'Aceite registrado com sucesso!');
      loadTermsHistory();
    } catch {
      pushToast('error', 'Não foi possível registrar o aceite.');
    } finally {
      setAcceptingTermId(null);
    }
  };

  // ── Email Preferences ────────────────────────────────────────────────────
  const [emailPrefs, setEmailPrefs] = useState<EmailPrefs>(DEFAULT_EMAIL_PREFS);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);

  const loadEmailPrefs = useCallback(async () => {
    setPrefsLoading(true);
    try {
      const res = await api.get<any>('/notifications/preferences');
      setEmailPrefs({ ...DEFAULT_EMAIL_PREFS, ...(res as any) });
    } catch { /* fallback to defaults */ }
    finally { setPrefsLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'notificacoes') loadEmailPrefs();
  }, [activeTab, loadEmailPrefs]);

  const saveEmailPrefs = async () => {
    setPrefsSaving(true);
    try {
      await api.put('/notifications/preferences', emailPrefs);
      pushToast('success', 'Preferências salvas!');
    } catch { pushToast('error', 'Erro ao salvar preferências.'); }
    finally { setPrefsSaving(false); }
  };

  const sendTestEmail = async () => {
    setTestSending(true);
    try {
      const res = await api.post<any>('/notifications/test', {});
      pushToast('success', (res as any).message || 'Email de teste enviado!');
    } catch { pushToast('error', 'Erro ao enviar email de teste.'); }
    finally { setTestSending(false); }
  };

  // ── Mercado Pago ─────────────────────────────────────────────────────────
  const [mpConfig, setMpConfig] = useState({ configured: false, enabled: false, interest_rate: 0 });
  const [mpToken, setMpToken] = useState('');
  const [mpSaving, setMpSaving] = useState(false);
  const [mpTesting, setMpTesting] = useState(false);
  const [mpShowToken, setMpShowToken] = useState(false);
  const [mpInterestRate, setMpInterestRate] = useState('');
  const [mpSavingRate, setMpSavingRate] = useState(false);

  useEffect(() => {
    if (activeTab !== 'integracoes' && activeTab !== 'pagamentos') return;
    api.get<any>('/mercadopago/config').then((d: any) => {
      setMpConfig(d);
      setMpInterestRate(d.interest_rate ? String(d.interest_rate) : '');
    }).catch(() => {});
  }, [activeTab]);

  const saveMpInterestRate = async () => {
    setMpSavingRate(true);
    try {
      const rate = parseFloat(mpInterestRate.replace(',', '.')) || 0;
      await api.post('/mercadopago/config', { interest_rate: rate });
      setMpConfig(prev => ({ ...prev, interest_rate: rate }));
      pushToast('success', 'Taxa de juros atualizada!');
    } catch { pushToast('error', 'Erro ao salvar taxa de juros.'); }
    finally { setMpSavingRate(false); }
  };

  const saveMpToken = async () => {
    if (!mpToken.trim()) return;
    setMpSaving(true);
    try {
      await api.post('/mercadopago/config', { token: mpToken.trim() });
      setMpConfig(prev => ({ ...prev, configured: true, enabled: true }));
      setMpToken('');
      pushToast('success', 'Mercado Pago conectado com sucesso!');
    } catch { pushToast('error', 'Erro ao salvar token do Mercado Pago.'); }
    finally { setMpSaving(false); }
  };

  const testMpToken = async () => {
    if (!mpToken.trim()) return;
    setMpTesting(true);
    try {
      await api.post('/mercadopago/config/test', { token: mpToken.trim() });
      pushToast('success', 'Token válido! Conexão com Mercado Pago OK.');
    } catch (e: any) {
      pushToast('error', e?.message || 'Token inválido ou sem permissão.');
    } finally { setMpTesting(false); }
  };

  const disconnectMp = async () => {
    setMpSaving(true);
    try {
      await api.post('/mercadopago/config', { token: '' });
      setMpConfig(prev => ({ ...prev, configured: false, enabled: false }));
      setMpToken('');
      pushToast('success', 'Mercado Pago desconectado.');
    } catch { pushToast('error', 'Erro ao desconectar.'); }
    finally { setMpSaving(false); }
  };

  const toggleMpEnabled = async () => {
    try {
      await api.post('/mercadopago/config', { enabled: !mpConfig.enabled });
      setMpConfig(prev => ({ ...prev, enabled: !prev.enabled }));
    } catch { pushToast('error', 'Erro ao alterar status.'); }
  };

  // ── Google Meet (via Google Calendar) ────────────────────────────────────
  const [googleStatus, setGoogleStatus] = useState({ connected: false, enabled: false, email: null as string | null });
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [googleDisconnecting, setGoogleDisconnecting] = useState(false);

  useEffect(() => {
    if (activeTab !== 'integracoes' && activeTab !== 'pagamentos') return;
    api.get<any>('/google/status').then((d: any) => setGoogleStatus(d)).catch(() => {});
  }, [activeTab]);

  // Toast + limpeza da query string ao voltar do consentimento do Google
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleResult = params.get('google');
    if (!googleResult) return;
    if (googleResult === 'success') pushToast('success', 'Conta Google conectada com sucesso!');
    else if (googleResult === 'error') pushToast('error', 'Não foi possível conectar sua conta Google. Tente novamente.');
    params.delete('google');
    const qs = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectGoogle = async () => {
    setGoogleConnecting(true);
    try {
      const res = await api.get<any>('/google/connect');
      if (res?.url) window.location.href = res.url;
      else pushToast('error', 'Erro ao iniciar conexão com o Google.');
    } catch (e: any) {
      pushToast('error', e?.message || 'Erro ao iniciar conexão com o Google.');
    } finally { setGoogleConnecting(false); }
  };

  const toggleGoogleEnabled = async () => {
    try {
      await api.post('/google/toggle', { enabled: !googleStatus.enabled });
      setGoogleStatus(prev => ({ ...prev, enabled: !prev.enabled }));
    } catch { pushToast('error', 'Erro ao alterar status.'); }
  };

  const disconnectGoogle = async () => {
    setGoogleDisconnecting(true);
    try {
      await api.post('/google/disconnect', {});
      setGoogleStatus({ connected: false, enabled: false, email: null });
      pushToast('success', 'Conta Google desconectada.');
    } catch { pushToast('error', 'Erro ao desconectar conta Google.'); }
    finally { setGoogleDisconnecting(false); }
  };

  // ── Asaas (recebimentos de pacientes) ────────────────────────────────────
  const [asaasStatus, setAsaasStatus] = useState<any>({ enabled: false, balance: null });
  const [asaasSaving, setAsaasSaving] = useState(false);
  const [asaasForm, setAsaasForm] = useState({
    name: '', cpfCnpj: '', email: '', mobilePhone: '',
    postalCode: '', address: '', addressNumber: '', province: '',
    companyType: '', birthDate: '',
  });
  const [asaasCepLoading, setAsaasCepLoading] = useState(false);
  const [asaasStep, setAsaasStep] = useState<1 | 2 | 3>(1);
  const [asaasJustActivated, setAsaasJustActivated] = useState(false);
  const asaasIsCnpj = asaasForm.cpfCnpj.replace(/\D/g, '').length > 11;
  const ASAAS_LOGIN_URL = 'https://www.asaas.com/login';

  useEffect(() => {
    if (activeTab !== 'integracoes' && activeTab !== 'pagamentos') return;
    api.get<any>('/asaas/status').then((d: any) => setAsaasStatus(d)).catch(() => {});
  }, [activeTab]);

  const handleAsaasCepChange = async (raw: string) => {
    const masked = applyCepMask(raw);
    setAsaasForm(p => ({ ...p, postalCode: masked }));
    const digits = masked.replace(/\D/g, '');
    if (digits.length === 8) {
      setAsaasCepLoading(true);
      try {
        const found = await fetchAddressByCep(digits);
        if (found) {
          setAsaasForm(p => ({ ...p, address: found.street || p.address, province: found.neighborhood || p.province }));
        }
      } finally { setAsaasCepLoading(false); }
    }
  };

  const asaasStep1Valid = asaasForm.name.trim() && asaasForm.email.trim()
    && isValidCpfCnpj(asaasForm.cpfCnpj) && asaasForm.mobilePhone.replace(/\D/g, '').length >= 10
    && (asaasIsCnpj ? !!asaasForm.companyType : !!asaasForm.birthDate);

  const asaasStep2Valid = asaasForm.postalCode.trim() && asaasForm.address.trim() && asaasForm.addressNumber.trim();

  const goAsaasStep2 = () => {
    if (!asaasForm.name.trim() || !asaasForm.email.trim()) {
      pushToast('error', 'Preencha nome e e-mail.'); return;
    }
    if (!isValidCpfCnpj(asaasForm.cpfCnpj)) {
      pushToast('error', 'O CPF/CNPJ informado é inválido. Confira os números digitados.'); return;
    }
    if (asaasForm.mobilePhone.replace(/\D/g, '').length < 10) {
      pushToast('error', 'Informe um celular válido com DDD.'); return;
    }
    if (asaasIsCnpj && !asaasForm.companyType) {
      pushToast('error', 'Selecione o tipo de empresa (exigido pela Asaas para CNPJ).'); return;
    }
    if (!asaasIsCnpj && !asaasForm.birthDate) {
      pushToast('error', 'Informe a data de nascimento (exigida pela Asaas para CPF).'); return;
    }
    setAsaasStep(2);
  };

  const activateAsaas = async () => {
    if (!asaasStep2Valid) {
      pushToast('error', 'A Asaas exige o endereço completo (CEP, rua e número) para criar sua conta de recebimentos.');
      return;
    }
    setAsaasSaving(true);
    try {
      const res = await api.post<any>('/asaas/account', {
        ...asaasForm,
        cpfCnpj: asaasForm.cpfCnpj.replace(/\D/g, ''),
        mobilePhone: asaasForm.mobilePhone.replace(/\D/g, ''),
        postalCode: asaasForm.postalCode.replace(/\D/g, ''),
        companyType: asaasIsCnpj ? asaasForm.companyType : undefined,
        birthDate: !asaasIsCnpj ? asaasForm.birthDate : undefined,
      });
      setAsaasStatus({ enabled: true, accountId: res.accountId, walletId: res.walletId, balance: 0 });
      setAsaasJustActivated(true);
      pushToast('success', 'Conta criada! Falta só um passo pra você poder sacar.');
    } catch (e: any) {
      pushToast('error', e?.message || 'Erro ao ativar recebimentos.');
    } finally { setAsaasSaving(false); }
  };

  const disableAsaas = async () => {
    setAsaasSaving(true);
    try {
      await api.post('/asaas/disable', {});
      setAsaasStatus({ enabled: false, balance: null });
      setAsaasStep(1);
      setAsaasJustActivated(false);
      pushToast('success', 'Recebimentos desativados.');
    } catch { pushToast('error', 'Erro ao desativar.'); }
    finally { setAsaasSaving(false); }
  };

  // ── NFS-e (Dados Fiscais) ────────────────────────────────────────────────
  const [nfseConfig, setNfseConfig] = useState<any>({
    razao_social: '', cnpj_cpf: '', inscricao_municipal: '', codigo_municipio: '',
    codigo_tributacao_nacional: '', regime_tributario: 'simples_nacional',
    environment: 'homologacao', certificate_configured: false,
  });
  const [nfseSaving, setNfseSaving] = useState(false);
  const [nfseCertFile, setNfseCertFile] = useState<File | null>(null);
  const [nfseCertPassword, setNfseCertPassword] = useState('');
  const [nfseUploadingCert, setNfseUploadingCert] = useState(false);
  const [nfseTesting, setNfseTesting] = useState(false);
  const [nfseToggleSaving, setNfseToggleSaving] = useState(false);
  const [rsToggleSaving, setRsToggleSaving] = useState(false);
  const nfseCertInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab !== 'dados-fiscais') return;
    api.get<any>('/nfse/config').then((d: any) => setNfseConfig(d)).catch(() => {});
  }, [activeTab]);

  const toggleNfseEnabled = async () => {
    setNfseToggleSaving(true);
    try {
      const next = !nfseConfig.nfse_enabled;
      await api.post('/nfse/toggles', { nfse_enabled: next });
      setNfseConfig((p: any) => ({ ...p, nfse_enabled: next }));
      updateUser({ nfseEnabled: next });
      pushToast('success', next ? 'NFS-e ativada para a clínica.' : 'NFS-e desativada para a clínica.');
    } catch (e: any) { pushToast('error', e?.message || 'Erro ao atualizar configuração.'); }
    finally { setNfseToggleSaving(false); }
  };

  const toggleRsReceiptEnabled = async () => {
    setRsToggleSaving(true);
    try {
      const next = !nfseConfig.rs_receipt_enabled;
      await api.post('/nfse/toggles', { rs_receipt_enabled: next });
      setNfseConfig((p: any) => ({ ...p, rs_receipt_enabled: next }));
      updateUser({ rsReceiptEnabled: next });
      pushToast('success', next ? 'Recibo Receita Saúde ativado.' : 'Recibo Receita Saúde desativado.');
    } catch (e: any) { pushToast('error', e?.message || 'Erro ao atualizar configuração.'); }
    finally { setRsToggleSaving(false); }
  };

  const saveNfseConfig = async () => {
    setNfseSaving(true);
    try {
      await api.post('/nfse/config', {
        razao_social: nfseConfig.razao_social,
        inscricao_municipal: nfseConfig.inscricao_municipal,
        codigo_municipio: nfseConfig.codigo_municipio,
        codigo_tributacao_nacional: nfseConfig.codigo_tributacao_nacional,
        regime_tributario: nfseConfig.regime_tributario,
        environment: nfseConfig.environment,
      });
      pushToast('success', 'Dados fiscais salvos!');
    } catch (e: any) { pushToast('error', e?.message || 'Erro ao salvar dados fiscais.'); }
    finally { setNfseSaving(false); }
  };

  const uploadNfseCert = async () => {
    if (!nfseCertFile || !nfseCertPassword) return;
    setNfseUploadingCert(true);
    try {
      const fd = new FormData();
      fd.append('file', nfseCertFile);
      fd.append('password', nfseCertPassword);
      await api.post('/nfse/config/certificate', fd);
      setNfseConfig((prev: any) => ({ ...prev, certificate_configured: true }));
      setNfseCertFile(null);
      setNfseCertPassword('');
      pushToast('success', 'Certificado digital salvo com sucesso!');
    } catch (e: any) { pushToast('error', e?.message || 'Erro ao salvar certificado.'); }
    finally { setNfseUploadingCert(false); }
  };

  const testNfseEmission = async () => {
    setNfseTesting(true);
    try {
      const result = await api.post<any>('/nfse/config/test', {});
      if (result.success) {
        pushToast('success', 'Emissão de teste autorizada em homologação! Configuração OK.');
      } else {
        pushToast('error', result.rejection_reason || `Emissão de teste não autorizada (status: ${result.status}).`);
      }
    } catch (e: any) { pushToast('error', e?.message || 'Erro ao testar emissão.'); }
    finally { setNfseTesting(false); }
  };

  // ── Theme colors ─────────────────────────────────────────────────────────
  const THEME_COLORS = [
    { name: 'Indigo',   label: 'Moderno',  gradient: 'from-indigo-500 to-violet-600' },
    { name: 'Emerald',  label: 'Saúde',    gradient: 'from-emerald-400 to-teal-600' },
    { name: 'Rose',     label: 'Acolhedor',gradient: 'from-rose-400 to-pink-600' },
    { name: 'Amber',    label: 'Energia',  gradient: 'from-amber-400 to-orange-600' },
    { name: 'Blue',     label: 'Confiança',gradient: 'from-blue-400 to-cyan-600' },
    { name: 'Violet',   label: 'Criativo', gradient: 'from-violet-400 to-fuchsia-600' },
  ];

  // ── Menu (abas de topo) ───────────────────────────────────────────────────
  const canIntegrations = hasPermission('manage_bot_integration') || hasPermission('manage_clinical_tools') || hasPermission('manage_clinic_settings');
  const MENU_ITEMS: Array<{ id: string; label: string; icon: React.ElementType }> = [
    { id: 'aparencia',    label: 'Aparência',      icon: Palette },
    { id: 'geral',        label: 'Geral',           icon: SettingsIcon },
    { id: 'sessoes',      label: 'Sessões',         icon: Video },
    { id: 'conformidade', label: 'Conformidade',    icon: ShieldCheck },
    ...(hasPermission('manage_clinic_settings') ? [{ id: 'notificacoes', label: 'Notificações', icon: Bell }] : []),
    ...(hasPermission('manage_payments') ? [{ id: 'dados-fiscais', label: 'Dados fiscais', icon: FileText }] : []),
    ...(hasPermission('manage_professionals') && (user?.plan_features?.includes('profissionais')) ? [{ id: 'equipe', label: 'Equipe', icon: Users }] : []),
    ...(canIntegrations ? [{ id: 'integracoes', label: 'Integrações', icon: Plug }, { id: 'pagamentos', label: 'Pagamentos', icon: CreditCard }] : []),
  ];

  const loadingBlock = (text: string) => (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
      <Loader2 size={18} className="animate-spin" />{text}
    </div>
  );

  // Barra de salvar fixa (única por aba)
  const saveBar = (children: React.ReactNode) => (
    <div className="sticky bottom-0 z-10 -mx-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4 lg:-mx-5 lg:px-5 xl:-mx-6 xl:px-6">
      {children}
    </div>
  );

  const prefToggle = (key: keyof EmailPrefs) => () => setEmailPrefs(p => ({ ...p, [key]: !p[key] }));

  const integrationModules = [
    { icon: Video, title: 'Salas Virtuais', desc: 'Atendimentos por videochamada integrado ao sistema', onClick: () => navigate('/salas-virtuais') },
    { icon: MessageSquare, title: 'Bot / Automação', desc: 'Automação de mensagens e fluxos de atendimento', onClick: () => navigate('/bot') },
    { icon: FileCode, title: 'Formulários externos', desc: 'Links públicos de formulários para seus pacientes', onClick: () => navigate('/formularios') },
    { icon: Briefcase, title: 'Gerador de documentos', desc: 'Modelos de laudos, declarações e relatórios clínicos', onClick: () => navigate('/gerador-documentos') },
  ];

  const comingSoon = [
    { icon: Phone, title: 'WhatsApp Business API', desc: 'Disparo de mensagens via API oficial do WhatsApp' },
    { icon: Zap, title: 'Zapier / Webhooks', desc: 'Conecte o Plaelo a outros sistemas via webhooks' },
  ];

  const mpTokenField = (placeholder: string) => (
    <Input
      type={mpShowToken ? 'text' : 'password'}
      value={mpToken}
      onChange={e => setMpToken(e.target.value)}
      placeholder={placeholder}
      className="font-mono"
      iconRight={
        <button type="button" onClick={() => setMpShowToken(v => !v)} aria-label={mpShowToken ? 'Ocultar token' : 'Mostrar token'} className="text-slate-400 hover:text-slate-600">
          {mpShowToken ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      }
    />
  );

  return (
    <PageWrapper className="font-sans">
      <div className="space-y-4">
        <SectionTitle
          icon={SettingsIcon}
          title={t('settings.title')}
          description={t('settings.subtitle')}
          action={<Badge color="success" icon={<ShieldCheck size={12} />}>{t('settings.secure')}</Badge>}
        />

        <Tabs<string> items={MENU_ITEMS} value={activeTab} onChange={setActiveTab} label="Seções de configurações">

          {/* ── APARÊNCIA ────────────────────────────────────────────────── */}
          {activeTab === 'aparencia' && (
            <div className="space-y-3">
              <PanelCard icon={Palette} title={t('settings.appearance.color')} description={t('settings.appearance.subtitle')}>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {THEME_COLORS.map(color => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className={cx(
                        `w-10 h-10 rounded-lg bg-gradient-to-br ${color.gradient} flex items-center justify-center transition-all duration-200 group-hover:scale-105`,
                        selectedColor === color.name ? 'ring-2 ring-offset-2 ring-primary-400' : ''
                      )}>
                        {selectedColor === color.name && <Check size={16} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">{color.name}</span>
                    </button>
                  ))}
                </div>
              </PanelCard>

              <PanelCard icon={Monitor} title={t('settings.appearance.mode')}>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light', label: t('settings.appearance.light'), icon: Monitor },
                    { id: 'dark',  label: t('settings.appearance.dark'),  icon: Moon },
                    { id: 'auto',  label: t('settings.appearance.auto'),  icon: Smartphone },
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setMode(mode.id as any)}
                      className={cx(
                        'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                        selectedMode === mode.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      )}
                    >
                      <mode.icon size={18} className={selectedMode === mode.id ? 'text-primary-600' : 'text-slate-500'} />
                      <span className={cx('text-xs font-medium', selectedMode === mode.id ? 'text-primary-700' : 'text-slate-600')}>
                        {mode.label}
                      </span>
                    </button>
                  ))}
                </div>
              </PanelCard>
            </div>
          )}

          {/* ── SESSÕES ──────────────────────────────────────────────────── */}
          {activeTab === 'sessoes' && (
            <div className="space-y-3">
              <PanelCard icon={Video} title="Gravação de áudio" description="O áudio da sessão é gravado no seu navegador e enviado ao servidor ao encerrar." contentClassName="px-3 py-1">
                <div className="divide-y divide-slate-100">
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-slate-800">Iniciar gravação automaticamente</p>
                      <p className="text-[11px] text-slate-500">Inicia a gravação assim que você entrar na sala virtual</p>
                    </div>
                    <Switch
                      checked={!!preferences.sessions?.autoRecord}
                      onCheckedChange={(next) => updatePreference('sessions', { autoRecord: next })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-slate-800">Transcrever a gravação</p>
                      <p className="text-[11px] text-slate-500">Quando ligada, envia trechos de áudio ao Whisper enquanto a gravação estiver ativa</p>
                    </div>
                    <Switch
                      checked={!!preferences.sessions?.autoTranscribe}
                      onCheckedChange={(next) => updatePreference('sessions', { autoTranscribe: next })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-slate-800">Guardar cópia do áudio</p>
                      <p className="text-[11px] text-slate-500">Desligado: o áudio é usado temporariamente para transcrever e não fica salvo no servidor</p>
                    </div>
                    <Switch
                      checked={!!preferences.sessions?.saveAudioRecording}
                      onCheckedChange={(next) => updatePreference('sessions', { saveAudioRecording: next })}
                    />
                  </div>
                </div>
              </PanelCard>

              <PanelCard icon={Zap} title="Revisão com Gemini" description="Opcional: revisa o português ao encerrar a sessão, sem alterar o sentido clínico.">
                <div className="space-y-3">
                  <FormRow>
                    <Input
                      label="Nome da integração"
                      value={preferences.gemini?.integrationName || ''}
                      onChange={e => updatePreference('gemini', { integrationName: e.target.value.slice(0, 80) })}
                      placeholder="Ex.: Gemini da Dra. Karen"
                    />
                    <Input
                      label="Chave da API Gemini"
                      type="password"
                      autoComplete="off"
                      value={preferences.gemini?.apiKey || ''}
                      onChange={e => updatePreference('gemini', { apiKey: e.target.value.trim(), apiKeys: e.target.value.trim() ? [e.target.value.trim()] : [] })}
                      placeholder="Cole aqui a chave criada no Google AI Studio"
                    />
                  </FormRow>
                  <p className="text-[11px] text-slate-500 leading-relaxed">A chave é individual do profissional. Ela só é enviada para o Gemini no momento da revisão; sem chave, nenhuma chamada ao Gemini é feita.</p>
                </div>
              </PanelCard>

              {/* Aviso LGPD */}
              <Alert variant="warning">
                <strong>Atenção LGPD:</strong> a gravação e transcrição de sessões é considerada dado sensível de saúde. Certifique-se de obter o consentimento do paciente antes de gravar. Os arquivos ficam armazenados com segurança no servidor da clínica.
              </Alert>
            </div>
          )}

          {/* ── GERAL ────────────────────────────────────────────────────── */}
          {activeTab === 'geral' && (
            <div className="space-y-3">
              <PanelCard icon={Globe} title={t('settings.general.title')} description={t('settings.general.subtitle')}>
                <div className="space-y-3">
                  <FormRow cols={3}>
                    <Select
                      label={t('settings.general.language')}
                      leftIcon={<Globe size={14} />}
                      value={language}
                      onChange={e => setLanguage(e.target.value as Language)}
                    >
                      <option value="pt">Português (Brasil)</option>
                      <option value="en">English (US)</option>
                      <option value="es">Español</option>
                    </Select>

                    <Select
                      label={t('settings.general.timezone')}
                      leftIcon={<Clock size={14} />}
                      value={preferences.general?.timezone || 'America/Sao_Paulo'}
                      onChange={e => updatePreference('general', { timezone: e.target.value })}
                    >
                      <optgroup label="Brasil">
                        <option value="America/Sao_Paulo">(GMT-03:00) Brasília — São Paulo, Rio, Belo Horizonte</option>
                        <option value="America/Manaus">(GMT-04:00) Manaus, Cuiabá, Campo Grande</option>
                        <option value="America/Belem">(GMT-03:00) Belém, Fortaleza, Recife, Salvador</option>
                        <option value="America/Noronha">(GMT-02:00) Fernando de Noronha</option>
                        <option value="America/Rio_Branco">(GMT-05:00) Rio Branco, Acre</option>
                        <option value="America/Porto_Velho">(GMT-04:00) Porto Velho, Rondônia</option>
                      </optgroup>
                      <optgroup label="Américas">
                        <option value="America/Argentina/Buenos_Aires">(GMT-03:00) Buenos Aires</option>
                        <option value="America/Santiago">(GMT-03:00) Santiago</option>
                        <option value="America/Bogota">(GMT-05:00) Bogotá, Lima, Quito</option>
                        <option value="America/New_York">(GMT-05:00) New York, Miami, Toronto</option>
                        <option value="America/Chicago">(GMT-06:00) Chicago, Mexico City</option>
                        <option value="America/Denver">(GMT-07:00) Denver, Phoenix</option>
                        <option value="America/Los_Angeles">(GMT-08:00) Los Angeles, San Francisco</option>
                        <option value="America/Anchorage">(GMT-09:00) Anchorage</option>
                      </optgroup>
                      <optgroup label="Europa / África">
                        <option value="UTC">(GMT+00:00) UTC — Tempo Universal</option>
                        <option value="Europe/London">(GMT+00:00) Lisboa, Londres</option>
                        <option value="Europe/Paris">(GMT+01:00) Paris, Madrid, Roma, Berlin</option>
                        <option value="Europe/Helsinki">(GMT+02:00) Helsinki, Atenas, Cairo</option>
                        <option value="Europe/Moscow">(GMT+03:00) Moscou</option>
                        <option value="Africa/Johannesburg">(GMT+02:00) Joanesburgo</option>
                      </optgroup>
                      <optgroup label="Ásia / Pacífico">
                        <option value="Asia/Dubai">(GMT+04:00) Dubai, Abu Dhabi</option>
                        <option value="Asia/Karachi">(GMT+05:00) Karachi, Islamabad</option>
                        <option value="Asia/Kolkata">(GMT+05:30) Mumbai, Nova Délhi</option>
                        <option value="Asia/Bangkok">(GMT+07:00) Bangkok, Jakarta</option>
                        <option value="Asia/Shanghai">(GMT+08:00) Pequim, Xangai, Singapura</option>
                        <option value="Asia/Tokyo">(GMT+09:00) Tóquio, Seul</option>
                        <option value="Australia/Sydney">(GMT+10:00) Sydney</option>
                      </optgroup>
                    </Select>

                    <Select label={t('settings.general.currency')} leftIcon={<span className="text-xs font-semibold">R$</span>}>
                      <option>BRL (R$) — Real Brasileiro</option>
                      <option>USD ($) — Dólar Americano</option>
                      <option>EUR (€) — Euro</option>
                    </Select>
                  </FormRow>

                  <Alert variant="info" title="Fuso horário ativo">
                    Todas as datas e horários do sistema — incluindo respostas de formulários, agendamentos e registros — serão exibidos no fuso selecionado: <strong>{preferences.general?.timezone || 'America/Sao_Paulo'}</strong>
                  </Alert>
                </div>
              </PanelCard>

              {/* Danger zone */}
              <PanelCard icon={AlertTriangle} title={t('settings.danger.zone')} iconWrapClassName="border-red-100 bg-red-50" iconClassName="text-red-600">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-red-900">{t('settings.danger.delete')}</p>
                    <p className="text-[11px] text-red-700/80 mt-0.5">{t('settings.danger.desc')}</p>
                  </div>
                  <Button variant="softDanger" size="sm">
                    {t('settings.danger.endSub')}
                  </Button>
                </div>
              </PanelCard>

              {saveBar(
                <Button variant="primary" size="sm" iconLeft={<Save size={14} />} onClick={() => pushToast('success', 'Configurações salvas!')}>
                  {t('common.save')}
                </Button>
              )}
            </div>
          )}

          {/* ── CONFORMIDADE ÉTICA E LEGAL ───────────────────────────────── */}
          {activeTab === 'conformidade' && (
            <div className="space-y-3">
              <Alert variant="info" title="Conformidade ética e legal">
                A Plaelo lida com dados de pacientes, então a LGPD exige que esses aceites fiquem registrados com data e hora — é o que protege você e quem você atende. Abaixo está a trilha dos aceites que você registrou na plataforma.
              </Alert>

              {termsLoading ? loadingBlock('Carregando...') : termsHistory.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="Nenhum termo encontrado" description="Quando houver termos para aceitar, eles aparecerão aqui." />
              ) : (
                <div className="space-y-3">
                  {termsHistory.map(term => {
                    const expanded = expandedTermId === term.id;
                    const isPending = !term.accepted_at;
                    return (
                      <PanelCard
                        key={term.id}
                        title={term.title}
                        action={
                          <Button variant="ghost" size="xs" iconRight={expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} onClick={() => setExpandedTermId(expanded ? null : term.id)}>
                            {expanded ? 'Ocultar' : 'Ver conteúdo'}
                          </Button>
                        }
                      >
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge size="sm">v{term.version}</Badge>
                            {isPending ? (
                              <Badge color="warning" size="sm" icon={<Clock size={12} />}>Pendente</Badge>
                            ) : (
                              <Badge color="success" size="sm" icon={<CheckCircle2 size={12} />}>Aceito em {new Date(term.accepted_at!).toLocaleString('pt-BR')}</Badge>
                            )}
                          </div>
                          {term.summary && <p className="text-xs text-slate-500">{term.summary}</p>}

                          {expanded && (
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 max-h-72 overflow-y-auto text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                              {term.content}
                            </div>
                          )}

                          {isPending && (
                            <div className="pt-3 border-t border-slate-100 space-y-3">
                              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={!!termChecks[term.id]}
                                  onChange={e => setTermChecks(prev => ({ ...prev, [term.id]: e.target.checked }))}
                                  className="w-4 h-4 mt-0.5 accent-primary-600"
                                />
                                <span className="text-xs text-slate-600">Li integralmente e concordo com {term.title}.</span>
                              </label>
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={!termChecks[term.id] || acceptingTermId === term.id}
                                loading={acceptingTermId === term.id}
                                iconLeft={<CheckCircle2 size={14} />}
                                onClick={() => handleAcceptTerm(term.id)}
                              >
                                Aceitar e salvar
                              </Button>
                            </div>
                          )}
                        </div>
                      </PanelCard>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── NOTIFICAÇÕES ─────────────────────────────────────────────── */}
          {activeTab === 'notificacoes' && hasPermission('manage_clinic_settings') && (
            prefsLoading ? loadingBlock('Carregando preferências...') : (
              <div className="space-y-3">
                <PanelCard icon={Mail} title="Notificações por e-mail" description="Configure os e-mails automáticos do sistema Plaelo."
                  action={<div className="flex items-center gap-2 lg:justify-end"><span className="text-xs text-slate-500">{emailPrefs.enabled ? 'Recebendo notificações' : 'Desativado'}</span><ToggleSwitch checked={emailPrefs.enabled} onChange={() => setEmailPrefs(p => ({ ...p, enabled: !p.enabled }))} /></div>}>
                  <div className={cx('transition-opacity', emailPrefs.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none')}>
                    <p className="text-xs font-medium text-slate-600">Agendamentos</p>
                    <div className="divide-y divide-slate-100">
                      <ToggleRow icon={Calendar} title="Novo agendamento" desc="Aviso quando um atendimento for criado" checked={emailPrefs.new_appointment} onChange={prefToggle('new_appointment')} />
                      <div>
                        <ToggleRow icon={Clock} title="Lembrete para mim (profissional)" desc="E-mail antes da consulta no seu endereço" checked={emailPrefs.appointment_reminder_professional} onChange={prefToggle('appointment_reminder_professional')} />
                        {(emailPrefs.appointment_reminder_professional || emailPrefs.appointment_reminder_patient) && (
                          <div className="pb-2.5 pl-10 flex items-center gap-2">
                            <span className="text-[11px] text-slate-500">Antecedência:</span>
                            {[30, 60].map(min => (
                              <Button key={min} size="xs" variant={emailPrefs.appointment_reminder_minutes === min ? 'primary' : 'outline'}
                                onClick={() => setEmailPrefs(p => ({ ...p, appointment_reminder_minutes: min }))}>
                                {min === 30 ? '30 min' : '1 hora'}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                      <ToggleRow icon={Users2} title="Lembrete para o paciente" desc="Envia ao e-mail do paciente (se cadastrado)" checked={emailPrefs.appointment_reminder_patient} onChange={prefToggle('appointment_reminder_patient')} />
                    </div>

                    <p className="mt-3 text-xs font-medium text-slate-600">Alertas e formulários</p>
                    <div className="divide-y divide-slate-100">
                      <ToggleRow icon={UserCheck} title="Aniversariantes do dia" desc="Lista enviada toda manhã às 8h" checked={emailPrefs.birthday_reminder} onChange={prefToggle('birthday_reminder')} />
                      <ToggleRow icon={ClipboardList} title="Formulário respondido" desc="Aviso quando um paciente responder um formulário" checked={emailPrefs.form_response} onChange={prefToggle('form_response')} />
                    </div>

                    <p className="mt-3 text-xs font-medium text-slate-600">Relatórios</p>
                    <div className="divide-y divide-slate-100">
                      <ToggleRow icon={BarChart2} title="Relatório semanal" desc="Toda segunda às 7h" checked={emailPrefs.weekly_report} onChange={prefToggle('weekly_report')} />
                      <ToggleRow icon={FileText} title="Relatório mensal" desc="Todo dia 1 às 7h" checked={emailPrefs.monthly_report} onChange={prefToggle('monthly_report')} />
                    </div>
                  </div>
                  <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                    E-mails enviados por <strong className="text-slate-700">sistema@psiflux.com.br</strong> — não monitore nem responda este endereço.
                  </p>
                </PanelCard>

                {/* WhatsApp (Master Bot) — avisos ao próprio profissional. Independente do
                    toggle de email acima: fica sempre visível, controlado só pelos toggles abaixo. */}
                <PanelCard icon={MessageSquare} title="WhatsApp (avisos para mim)" description="Esses avisos usam o número de WhatsApp cadastrado no seu perfil. O Super Admin também pode desativar cada tipo globalmente." contentClassName="px-3 py-1">
                  <div className="divide-y divide-slate-100">
                    <ToggleRow icon={Calendar} title="Novo agendamento" desc="Aviso quando uma consulta for criada (sistema ou Portal do Paciente)" checked={emailPrefs.wpp_new_appointment} onChange={prefToggle('wpp_new_appointment')} />
                    <ToggleRow icon={Clock} title="Lembrete 60 minutos antes" desc="Aviso da sua próxima consulta 1h antes" checked={emailPrefs.wpp_reminder_60min} onChange={prefToggle('wpp_reminder_60min')} />
                    <ToggleRow icon={Calendar} title="Lembrete 24 horas antes" desc="Aviso no dia anterior da consulta" checked={emailPrefs.wpp_reminder_24h} onChange={prefToggle('wpp_reminder_24h')} />
                    <ToggleRow icon={XCircle} title="Cancelamento" desc="Aviso quando uma consulta sua for cancelada" checked={emailPrefs.wpp_cancelled_appointment} onChange={prefToggle('wpp_cancelled_appointment')} />
                    <ToggleRow icon={Clock} title="Remarcação" desc="Aviso quando o horário de uma consulta sua mudar" checked={emailPrefs.wpp_rescheduled_appointment} onChange={prefToggle('wpp_rescheduled_appointment')} />
                  </div>
                </PanelCard>

                {saveBar(
                  <>
                    <Button variant="outline" size="sm" loading={testSending} iconLeft={<Send size={14} />} onClick={sendTestEmail}>
                      Enviar e-mail de teste
                    </Button>
                    <Button variant="primary" size="sm" loading={prefsSaving} iconLeft={<Save size={14} />} onClick={saveEmailPrefs}>
                      Salvar preferências
                    </Button>
                  </>
                )}
              </div>
            )
          )}

          {/* ── EQUIPE ────────────────────────────────────────────────────── */}
          {activeTab === 'equipe' && hasPermission('manage_professionals') && (
            <div className="space-y-3">
              {teamLoading ? loadingBlock('Carregando equipe...') : team.length === 0 ? (
                <ContentCard>
                  <EmptyState icon={Users} title="Nenhum profissional encontrado."
                    action={<Button variant="outline" size="sm" onClick={() => navigate('/profissionais')}>Adicionar profissional</Button>} />
                </ContentCard>
              ) : (
                <>
                  <StatGrid cols={3}>
                    <StatCard title="Total" value={team.length} icon={Users} color="info" />
                    <StatCard title="Admins" value={team.filter(u => u.role === 'admin').length} icon={Shield} color="default" />
                    <StatCard title="Ativos" value={team.filter(u => u.is_active !== false).length} icon={UserCheck} color="success" />
                  </StatGrid>

                  <PanelCard icon={Users} title="Equipe da clínica" description="Profissionais e usuários com acesso ao sistema." contentClassName="p-0"
                    action={<Button variant="primary" size="sm" iconLeft={<ExternalLink size={14} />} onClick={() => navigate('/profissionais')}>Gerenciar</Button>}>
                    <div className="divide-y divide-slate-100">
                      {team.map((member: any) => {
                        const initials = (member.name || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                        const role = member.role || 'profissional';
                        const isActive = member.is_active !== false;
                        return (
                          <div key={member.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors">
                            {member.avatar_url ? (
                              <img src={getStaticUrl(member.avatar_url)} alt={member.name} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg border border-primary-100 bg-primary-50 flex items-center justify-center text-primary-700 text-xs font-medium shrink-0">
                                {initials}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-slate-800 truncate">{member.name}</p>
                              {member.email && <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5"><Mail size={10} />{member.email}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge size="sm" color={ROLE_COLOR[role] || 'default'}>{ROLE_LABEL[role] || role}</Badge>
                              <span className={cx('w-1.5 h-1.5 rounded-full', isActive ? 'bg-emerald-400' : 'bg-slate-300')} title={isActive ? 'Ativo' : 'Inativo'} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </PanelCard>

                  <Button variant="outline" size="sm" fullWidth iconRight={<ArrowRight size={14} />} onClick={() => navigate('/profissionais')}>
                    Ver todos no módulo de Profissionais
                  </Button>
                </>
              )}
            </div>
          )}

          {/* ── DADOS FISCAIS (NFS-e) ────────────────────────────────────────── */}
          {activeTab === 'dados-fiscais' && hasPermission('manage_payments') && (
            <div className="space-y-3">
              <PanelCard icon={FileText} title="NFS-e (Nota Fiscal de Serviço)" description="Emita a Nota Fiscal de Serviço Eletrônica municipal direto do Livro Caixa"
                action={
                  <div className="flex items-center gap-2 lg:justify-end">
                    {nfseConfig.certificate_configured && (
                      <Badge size="sm" color={nfseConfig.environment === 'producao' ? 'success' : 'warning'}>
                        {nfseConfig.environment === 'producao' ? 'Produção' : 'Homologação'}
                      </Badge>
                    )}
                    <ToggleSwitch checked={!!nfseConfig.nfse_enabled} onChange={toggleNfseEnabled} />
                  </div>
                }>
                <div className="space-y-3">
                  {nfseToggleSaving && <p className="text-[11px] text-slate-500">Salvando...</p>}
                  {!nfseConfig.nfse_enabled && (
                    <Alert variant="warning">NFS-e desativada — o botão de emitir e a página "Nota Fiscal" ficam ocultos para todos os profissionais da clínica até você ativar aqui.</Alert>
                  )}
                  <FormRow cols={3}>
                    <Input
                      label="Razão social / Nome completo"
                      wrapperClassName="md:col-span-2"
                      value={nfseConfig.razao_social || ''}
                      onChange={e => setNfseConfig((p: any) => ({ ...p, razao_social: e.target.value }))}
                      placeholder="Ex: João da Silva Psicologia"
                    />
                    <Input
                      label="CNPJ/CPF"
                      value={nfseConfig.cnpj_cpf || ''}
                      disabled
                      title="Alterado em Perfil > Dados pessoais"
                    />
                    <Input
                      label="Inscrição municipal"
                      value={nfseConfig.inscricao_municipal || ''}
                      onChange={e => setNfseConfig((p: any) => ({ ...p, inscricao_municipal: e.target.value }))}
                      placeholder="Opcional"
                    />
                    <Input
                      label="Código do município (IBGE)"
                      value={nfseConfig.codigo_municipio || ''}
                      onChange={e => setNfseConfig((p: any) => ({ ...p, codigo_municipio: e.target.value.replace(/\D/g, '') }))}
                      placeholder="Ex: 3554003 (Tatuí/SP)"
                      maxLength={7}
                    />
                    <Input
                      label="Código de tributação (LC 116/03)"
                      value={nfseConfig.codigo_tributacao_nacional || ''}
                      onChange={e => setNfseConfig((p: any) => ({ ...p, codigo_tributacao_nacional: e.target.value }))}
                      placeholder="Ex: 1401 (psicologia)"
                    />
                    <Select
                      label="Regime tributário"
                      value={nfseConfig.regime_tributario || 'simples_nacional'}
                      onChange={e => setNfseConfig((p: any) => ({ ...p, regime_tributario: e.target.value }))}
                    >
                      <option value="simples_nacional">Simples Nacional</option>
                      <option value="lucro_presumido">Lucro Presumido</option>
                      <option value="lucro_real">Lucro Real</option>
                    </Select>
                    <Select
                      label="Ambiente de emissão"
                      value={nfseConfig.environment || 'homologacao'}
                      onChange={e => setNfseConfig((p: any) => ({ ...p, environment: e.target.value }))}
                    >
                      <option value="homologacao">Homologação (testes, sem valor fiscal)</option>
                      <option value="producao">Produção</option>
                    </Select>
                  </FormRow>
                </div>
              </PanelCard>

              <PanelCard icon={ShieldCheck} title="Certificado digital A1 (.pfx/.p12)" description="Para trocar o certificado, selecione o novo arquivo e informe a senha.">
                <div className="space-y-3">
                  {nfseConfig.certificate_configured ? (
                    <Alert variant="success">Certificado digital configurado.</Alert>
                  ) : (
                    <Alert variant="warning">Nenhum certificado enviado ainda.</Alert>
                  )}
                  <input
                    ref={nfseCertInputRef}
                    type="file"
                    accept=".pfx,.p12"
                    className="hidden"
                    onChange={e => setNfseCertFile(e.target.files?.[0] || null)}
                  />
                  <FormRow>
                    <div className="flex flex-col gap-1">
                      <span className="ds-label">Arquivo do certificado</span>
                      <Button variant="outline" onClick={() => nfseCertInputRef.current?.click()}>
                        {nfseCertFile ? nfseCertFile.name : 'Selecionar arquivo .pfx/.p12'}
                      </Button>
                    </div>
                    <Input
                      label="Senha do certificado"
                      type="password"
                      value={nfseCertPassword}
                      onChange={e => setNfseCertPassword(e.target.value)}
                      placeholder="Senha do certificado"
                    />
                  </FormRow>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="primary" size="sm" disabled={!nfseCertFile || !nfseCertPassword} loading={nfseUploadingCert} onClick={uploadNfseCert}>
                      Salvar certificado
                    </Button>
                    <Button variant="outline" size="sm" disabled={!nfseConfig.certificate_configured} loading={nfseTesting} onClick={testNfseEmission}>
                      Testar emissão em homologação
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500">O teste emite uma NFS-e em ambiente de homologação (sem valor fiscal) para confirmar que o certificado, o município e a comunicação com o Sistema Nacional NFS-e estão corretos.</p>
                </div>
              </PanelCard>

              <PanelCard icon={Receipt} title="Recibo Receita Saúde" description="Controle manual de recibo para dedução no Imposto de Renda (independente da NFS-e)"
                action={<div className="flex lg:justify-end"><ToggleSwitch checked={!!nfseConfig.rs_receipt_enabled} onChange={toggleRsReceiptEnabled} /></div>}>
                <div className="space-y-2">
                  {rsToggleSaving && <p className="text-[11px] text-slate-500">Salvando...</p>}
                  {!nfseConfig.rs_receipt_enabled ? (
                    <Alert variant="warning">Recibo RS desativado — a coluna "Recibo RS" fica oculta no Livro Caixa até você ativar aqui.</Alert>
                  ) : (
                    <p className="text-xs text-slate-500">Recibo RS ativo no Livro Caixa.</p>
                  )}
                </div>
              </PanelCard>

              {saveBar(
                <Button variant="primary" size="sm" loading={nfseSaving} iconLeft={<Save size={14} />} onClick={saveNfseConfig}>
                  Salvar dados fiscais
                </Button>
              )}
            </div>
          )}

          {/* ── INTEGRAÇÕES ───────────────────────────────────────────────── */}
          {activeTab === 'integracoes' && canIntegrations && (
            <div className="space-y-3">
              <PanelCard icon={Plug} title={t('settings.menu.integrations')} description="Módulos nativos e integrações do sistema." contentClassName="p-0">
                <div className="divide-y divide-slate-100">
                  {integrationModules.map(item => (
                    <button key={item.title} onClick={item.onClick}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left group">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 text-primary-600"><item.icon size={15} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-slate-800">{item.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                      <Badge size="sm" color="success" className="hidden sm:inline-flex">Ativo</Badge>
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-primary-500 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </PanelCard>

              {/* ── Google Meet ──────────────────────────────────────────────── */}
              <PanelCard icon={Video} title="Google Meet" description="Gere links do Google Meet automaticamente para consultas online"
                action={
                  <div className="flex items-center gap-2 lg:justify-end">
                    {googleStatus.connected && <Badge size="sm" color={googleStatus.enabled ? 'success' : 'default'}>{googleStatus.enabled ? 'Ativo' : 'Pausado'}</Badge>}
                    {googleStatus.connected && <ToggleSwitch checked={googleStatus.enabled} onChange={toggleGoogleEnabled} />}
                  </div>
                }>
                <div className="space-y-3">
                  {googleStatus.connected ? (
                    <>
                      <Alert variant="success">Conectado como <strong>{googleStatus.email}</strong></Alert>
                      <p className="text-[11px] text-slate-500">
                        Com isso ativado, você pode gerar um link do Google Meet direto ao criar uma consulta online na Agenda.
                      </p>
                      <Button variant="softDanger" size="sm" iconLeft={<Unplug size={14} />} onClick={disconnectGoogle} disabled={googleDisconnecting}>
                        {googleDisconnecting ? 'Desconectando...' : 'Desconectar Google'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Alert variant="info" title="Como funciona">
                        Conecte sua conta Google (pessoal ou Workspace) para que o sistema gere automaticamente um link
                        do Google Meet e um evento na sua Agenda do Google ao criar uma consulta online.
                      </Alert>
                      <Button variant="primary" size="sm" loading={googleConnecting} onClick={connectGoogle}>
                        Conectar com Google
                      </Button>
                    </>
                  )}
                </div>
              </PanelCard>

              {/* Em breve */}
              <PanelCard title="Em breve" contentClassName="p-0">
                <div className="divide-y divide-slate-100">
                  {comingSoon.map(item => (
                    <div key={item.title} className="flex items-center gap-3 px-3 py-2.5 opacity-70">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500"><item.icon size={15} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-slate-700">{item.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                      <Badge size="sm">Em breve</Badge>
                    </div>
                  ))}
                </div>
              </PanelCard>
            </div>
          )}

          {/* ── PAGAMENTOS (Mercado Pago OU Asaas — escolha um) ─────────────── */}
          {activeTab === 'pagamentos' && canIntegrations && (
            <div className="space-y-3">
              <Alert variant="info">
                Escolha <strong>um</strong> gateway pra cobrar seus pacientes online — usar os dois ao mesmo tempo confunde quem for pagar.
              </Alert>

              {/* ── Mercado Pago ─────────────────────────────────────────────── */}
              <PanelCard icon={CreditCard} title="Mercado Pago" description="Receba PIX, cartão e débito — lançamento automático no Livro Caixa"
                action={
                  <div className="flex items-center gap-2 lg:justify-end">
                    {mpConfig.configured && <Badge size="sm" color={mpConfig.enabled ? 'success' : 'default'}>{mpConfig.enabled ? 'Ativo' : 'Pausado'}</Badge>}
                    {mpConfig.configured && <ToggleSwitch checked={mpConfig.enabled} onChange={toggleMpEnabled} />}
                  </div>
                }>
                <div className="space-y-3">
                  {mpConfig.configured ? (
                    <>
                      <Alert variant="success">Access Token do Mercado Pago configurado e criptografado.</Alert>
                      <div className="space-y-2">
                        <p className="text-[11px] text-slate-500">Para trocar o token, cole o novo abaixo:</p>
                        {mpTokenField('Novo Access Token (opcional)')}
                        {mpToken && (
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={testMpToken} loading={mpTesting} disabled={!mpToken.trim()}>Testar</Button>
                            <Button variant="primary" size="sm" onClick={saveMpToken} loading={mpSaving} disabled={!mpToken.trim()}>Salvar</Button>
                          </div>
                        )}
                      </div>
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <p className="text-xs font-medium text-slate-600">Juros no parcelamento (cartão de crédito)</p>
                        <p className="text-[11px] text-slate-500">Taxa ao mês aplicada sobre o valor parcelado. O paciente verá o valor com juros e um aviso no Portal. Pix e débito nunca têm juros.</p>
                        <div className="flex gap-2 items-start">
                          <Input
                            wrapperClassName="flex-1"
                            inputMode="decimal"
                            value={mpInterestRate}
                            onChange={e => setMpInterestRate(e.target.value.replace(/[^0-9.,]/g, ''))}
                            placeholder="0"
                            addonRight="% a.m."
                          />
                          <Button variant="primary" size="md" onClick={saveMpInterestRate} loading={mpSavingRate}>Salvar</Button>
                        </div>
                      </div>
                      <Button variant="softDanger" size="sm" iconLeft={<Unplug size={14} />} onClick={disconnectMp} disabled={mpSaving}>
                        Desconectar Mercado Pago
                      </Button>
                    </>
                  ) : asaasStatus.enabled ? (
                    <Alert variant="warning">Você já usa a Asaas para receber. Desative-a abaixo antes de conectar o Mercado Pago.</Alert>
                  ) : (
                    <>
                      <Alert variant="info" title="Como obter o Access Token">
                        <ol className="space-y-1 pl-4 list-decimal">
                          <li>Acesse <strong>mercadopago.com.br</strong> e faça login</li>
                          <li>Clique em <strong>Seu negócio → Configurações</strong></li>
                          <li>Vá em <strong>Credenciais de produção</strong></li>
                          <li>Copie o <strong>Access Token</strong> (começa com <code className="bg-slate-100 px-1 rounded">APP_USR-</code>)</li>
                          <li>Cole abaixo e clique em <strong>Conectar</strong></li>
                        </ol>
                      </Alert>
                      {mpTokenField('Access Token (APP_USR-...)')}
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={testMpToken} loading={mpTesting} disabled={!mpToken.trim()}>Testar conexão</Button>
                        <Button variant="primary" size="sm" onClick={saveMpToken} loading={mpSaving} disabled={!mpToken.trim()}>Conectar Mercado Pago</Button>
                      </div>
                    </>
                  )}
                </div>
              </PanelCard>

              {/* ── Asaas (recebimentos de pacientes) ───────────────────────── */}
              <PanelCard icon={Wallet} title="Asaas" description="Cobre seus pacientes por Pix, cartão ou boleto — o dinheiro cai direto na sua conta"
                action={asaasStatus.enabled ? <div className="flex lg:justify-end"><Badge size="sm" color="success">Ativo</Badge></div> : undefined}>
                <div className="space-y-3">
                  {asaasStatus.enabled ? (
                    <>
                      {asaasJustActivated && (
                        <Alert variant="info" title="Falta 1 passo pra você sacar"
                          action={
                            <a href={ASAAS_LOGIN_URL} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-900 transition-colors">
                              Acessar minha conta na Asaas <ExternalLink size={12} />
                            </a>
                          }>
                          Sua conta na Asaas já foi criada com o e-mail <strong>{asaasForm.email}</strong>. Acesse o site
                          da Asaas com esse e-mail (você define uma senha lá na primeira vez), cadastre sua conta
                          bancária e verifique seu documento — só depois disso dá pra transferir o saldo pra sua conta.
                        </Alert>
                      )}
                      <Alert variant="success">
                        Recebimentos ativos{asaasStatus.balance != null ? ` · Saldo: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(asaasStatus.balance)}` : ''}
                      </Alert>
                      <p className="text-[11px] text-slate-500">
                        Agora você pode gerar cobranças direto na ficha do paciente ou pela Comanda. Para sacar o saldo, acesse{' '}
                        <a href={ASAAS_LOGIN_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-600 hover:text-primary-800">
                          sua conta na Asaas
                        </a>.
                      </p>
                      <Button variant="softDanger" size="sm" iconLeft={<Unplug size={14} />} onClick={disableAsaas} disabled={asaasSaving}>
                        {asaasSaving ? 'Desativando...' : 'Desativar recebimentos'}
                      </Button>
                    </>
                  ) : mpConfig.configured && mpConfig.enabled ? (
                    <Alert variant="warning">Você já usa o Mercado Pago para receber. Desconecte-o acima antes de ativar a Asaas.</Alert>
                  ) : (
                    <>
                      {/* Indicador de etapas */}
                      <div className="flex items-center gap-2">
                        {[1, 2].map(step => (
                          <div key={step} className="flex items-center gap-2 flex-1">
                            <div className={cx(
                              'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0',
                              asaasStep === step ? 'bg-primary-600 text-white' : asaasStep > step ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-400'
                            )}>
                              {asaasStep > step ? <Check size={13} /> : step}
                            </div>
                            <p className={cx('text-[11px] font-medium', asaasStep === step ? 'text-primary-700' : 'text-slate-400')}>
                              {step === 1 ? 'Seus dados' : 'Endereço'}
                            </p>
                            {step === 1 && <div className={cx('flex-1 h-0.5 rounded', asaasStep > 1 ? 'bg-primary-200' : 'bg-slate-100')} />}
                          </div>
                        ))}
                      </div>

                      <Alert variant="info" title="Como funciona">
                        Ao concluir, criamos automaticamente uma conta Asaas em seu nome. Os pagamentos dos seus pacientes
                        caem direto nela — a Plaelo nunca recebe ou repassa esse dinheiro.
                      </Alert>

                      {asaasStep === 1 && (
                        <>
                          <FormRow>
                            <Input
                              label="Nome completo"
                              value={asaasForm.name}
                              onChange={e => setAsaasForm(p => ({ ...p, name: e.target.value }))}
                              placeholder="Nome completo"
                            />
                            <Input
                              label="CPF ou CNPJ"
                              value={asaasForm.cpfCnpj}
                              onChange={e => setAsaasForm(p => ({ ...p, cpfCnpj: maskCpfCnpj(e.target.value) }))}
                              placeholder="CPF ou CNPJ"
                            />
                            <Input
                              label="E-mail"
                              value={asaasForm.email}
                              onChange={e => setAsaasForm(p => ({ ...p, email: e.target.value }))}
                              placeholder="E-mail"
                              type="email"
                            />
                            <Input
                              label="Celular (com DDD)"
                              value={asaasForm.mobilePhone}
                              onChange={e => setAsaasForm(p => ({ ...p, mobilePhone: maskPhoneBR(e.target.value) }))}
                              placeholder="Celular (com DDD)"
                            />
                            {asaasIsCnpj ? (
                              <Select
                                label="Tipo de empresa (exigido p/ CNPJ)"
                                wrapperClassName="md:col-span-2"
                                value={asaasForm.companyType}
                                onChange={e => setAsaasForm(p => ({ ...p, companyType: e.target.value }))}
                              >
                                <option value="">Tipo de empresa (exigido p/ CNPJ)</option>
                                <option value="MEI">MEI</option>
                                <option value="LIMITED">Limitada (LTDA)</option>
                                <option value="INDIVIDUAL">Empresário Individual</option>
                                <option value="ASSOCIATION">Associação</option>
                              </Select>
                            ) : (
                              <Input
                                label="Data de nascimento (exigida p/ CPF)"
                                wrapperClassName="md:col-span-2"
                                type="date"
                                value={asaasForm.birthDate}
                                onChange={e => setAsaasForm(p => ({ ...p, birthDate: e.target.value }))}
                              />
                            )}
                          </FormRow>
                          <Button variant="primary" size="sm" onClick={goAsaasStep2} disabled={!asaasStep1Valid} iconRight={<ChevronRight size={14} />}>
                            Continuar
                          </Button>
                        </>
                      )}

                      {asaasStep === 2 && (
                        <>
                          <FormRow>
                            <Input
                              label="CEP"
                              value={asaasForm.postalCode}
                              onChange={e => handleAsaasCepChange(e.target.value)}
                              placeholder={asaasCepLoading ? 'Buscando CEP...' : 'CEP'}
                            />
                            <Input
                              label="Bairro"
                              value={asaasForm.province}
                              onChange={e => setAsaasForm(p => ({ ...p, province: e.target.value }))}
                              placeholder="Bairro"
                            />
                            <Input
                              label="Rua / Logradouro"
                              wrapperClassName="md:col-span-2"
                              value={asaasForm.address}
                              onChange={e => setAsaasForm(p => ({ ...p, address: e.target.value }))}
                              placeholder="Rua / Logradouro"
                            />
                            <Input
                              label="Número"
                              value={asaasForm.addressNumber}
                              onChange={e => setAsaasForm(p => ({ ...p, addressNumber: e.target.value }))}
                              placeholder="Número"
                            />
                          </FormRow>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => setAsaasStep(1)} disabled={asaasSaving}>Voltar</Button>
                            <Button variant="primary" size="sm" onClick={activateAsaas} loading={asaasSaving} disabled={!asaasStep2Valid}>
                              Ativar recebimentos
                            </Button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </PanelCard>
            </div>
          )}

        </Tabs>
      </div>
    </PageWrapper>
  );
};
