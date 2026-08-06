import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon, Palette, Bell, Globe, Moon, Monitor, Smartphone,
  Check, ChevronRight, ShieldCheck, Mail,
  Save, AlertTriangle, Clock, Send, Loader2, Calendar,
  BarChart2, FileText, UserCheck, Users2, ExternalLink, Zap, ClipboardList,
  MessageSquare, Video, FileCode, Plug, ArrowRight, Users, Shield,
  Phone, Briefcase, CreditCard, Eye, EyeOff, Unplug, CheckCircle2, XCircle, Receipt
} from 'lucide-react';
import { Button } from '../components/UI/Button';
import { PageHeader } from '../components/UI/PageHeader';
import { Select } from '../components/UI/Input';
import { PageWrapper, SectionTitle, StatGrid, StatCard } from '../components/UI';
import { Switch } from '../components/UI/Switch';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Language } from '../translations';
import { useToast } from '../contexts/ToastContext';
import { api, getStaticUrl } from '../services/api';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useAuth } from '../contexts/AuthContext';

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

const ROLE_COLOR: Record<string, string> = {
  admin: 'bg-primary-50 text-primary-700 border-primary-100',
  profissional: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  secretaria: 'bg-amber-50 text-amber-700 border-amber-100',
  super_admin: 'bg-red-50 text-red-700 border-red-100',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <Switch checked={checked} onCheckedChange={onChange} />
);

const SectionHeader = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc?: string }) => (
  <SectionTitle
    icon={() => <>{icon}</>}
    title={title}
    description={desc}
    className="mb-8"
  />
);

// ─── Component ───────────────────────────────────────────────────────────────
export const Settings: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { user, hasPermission, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('aparencia');
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
    if (activeTab !== 'integracoes') return;
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

  // ── Menu ─────────────────────────────────────────────────────────────────
  const MENU_ITEMS = [
    { id: 'aparencia',    label: 'Aparência',      icon: <Palette size={18} />,      desc: 'Cores e modo visual' },
    { id: 'geral',        label: 'Geral',           icon: <SettingsIcon size={18} />, desc: 'Idioma e preferências' },
    { id: 'sessoes',      label: 'Sessões',         icon: <Video size={18} />,        desc: 'Gravação e transcrição' },
    ...(hasPermission('manage_clinic_settings') ? [{ id: 'notificacoes', label: 'Notificações', icon: <Bell size={18} />, desc: 'Emails automáticos' }] : []),
    ...(hasPermission('manage_payments') ? [{ id: 'dados-fiscais', label: 'Dados Fiscais', icon: <FileText size={18} />, desc: 'NFS-e e certificado digital' }] : []),
    ...(hasPermission('manage_professionals') && (user?.plan_features?.includes('profissionais')) ? [{ id: 'equipe', label: 'Equipe', icon: <Users size={18} />, desc: 'Profissionais da clínica' }] : []),
    ...(hasPermission('manage_bot_integration') || hasPermission('manage_clinical_tools') || hasPermission('manage_clinic_settings') ? [{ id: 'integracoes', label: 'Integrações', icon: <Plug size={18} />, desc: 'Módulos e conexões' }] : []),
  ];

  return (
    <PageWrapper className="space-y-4 sm:space-y-6 font-sans">

      <PageHeader
        icon={<SettingsIcon />}
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        actions={
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold rounded-xl text-sm w-fit">
            <ShieldCheck size={16} />
            {t('settings.secure')}
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">

        {/* Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-row overflow-x-auto lg:flex-col lg:overflow-visible">
            {MENU_ITEMS.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cx(
                  'flex shrink-0 items-center gap-3 px-4 py-3.5 text-left transition-all relative lg:w-full',
                  idx < MENU_ITEMS.length - 1 && 'border-b-0 lg:border-b border-slate-100 border-r lg:border-r-0',
                  activeTab === item.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                {activeTab === item.id && (
                  <div className="absolute left-0 right-0 lg:right-auto bottom-0 lg:top-0 h-0.5 lg:h-auto lg:w-0.5 bg-primary-600 rounded-t lg:rounded-t-none lg:rounded-r" />
                )}
                <div className={cx(
                  'p-1.5 rounded-lg shrink-0 transition-colors',
                  activeTab === item.id ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400'
                )}>
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className={cx('text-sm font-semibold whitespace-nowrap lg:whitespace-normal', activeTab === item.id ? 'text-primary-800' : 'text-slate-700')}>
                    {item.label}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate hidden lg:block">{item.desc}</p>
                </div>
                {activeTab === item.id && <ChevronRight size={14} className="ml-auto text-primary-400 shrink-0 hidden lg:block" />}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 lg:p-8">

          {/* ── APARÊNCIA ────────────────────────────────────────────────── */}
          {activeTab === 'aparencia' && (
            <div className="space-y-8 max-w-2xl">
              <SectionHeader icon={<Palette size={20} />} title={t('settings.appearance.title')} desc={t('settings.appearance.subtitle')} />

              {/* Cor do tema */}
              <section>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">{t('settings.appearance.color')}</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {THEME_COLORS.map(color => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className={cx(
                        `w-12 h-12 rounded-2xl bg-gradient-to-br ${color.gradient} shadow-md flex items-center justify-center transition-all duration-200 group-hover:scale-110`,
                        selectedColor === color.name ? 'ring-4 ring-offset-2 ring-primary-400 scale-110' : ''
                      )}>
                        {selectedColor === color.name && <Check size={20} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500">{color.name}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Modo */}
              <section>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">{t('settings.appearance.mode')}</p>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { id: 'light', label: t('settings.appearance.light'), icon: <Monitor size={22} /> },
                    { id: 'dark',  label: t('settings.appearance.dark'),  icon: <Moon size={22} /> },
                    { id: 'auto',  label: t('settings.appearance.auto'),  icon: <Smartphone size={22} /> },
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setMode(mode.id as any)}
                      className={cx(
                        'flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-5 rounded-2xl border-2 transition-all duration-200',
                        selectedMode === mode.id
                          ? 'border-primary-500 bg-primary-50 shadow-md shadow-primary-100'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      )}
                    >
                      <div className={cx(
                        'p-2 sm:p-3 rounded-xl',
                        selectedMode === mode.id ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-500'
                      )}>
                        {mode.icon}
                      </div>
                      <span className={cx('text-xs font-bold', selectedMode === mode.id ? 'text-primary-700' : 'text-slate-600')}>
                        {mode.label}
                      </span>
                      {selectedMode === mode.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                      )}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ── SESSÕES ──────────────────────────────────────────────────── */}
          {activeTab === 'sessoes' && (
            <div className="space-y-8 max-w-2xl">
              <SectionHeader icon={<Video size={20} />} title="Sessões Virtuais" desc="Configure gravação e transcrição automática das consultas." />

              {/* Gravação de áudio */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                  <p className="text-sm font-semibold text-slate-700">Gravação de Áudio</p>
                  <p className="text-xs text-slate-500 mt-0.5">O áudio da sessão é gravado no seu navegador e enviado ao servidor ao encerrar.</p>
                </div>
                <div className="divide-y divide-slate-100">
                  <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">Iniciar transcrição automaticamente</p>
                      <p className="text-xs text-slate-500 mt-0.5">Captura trechos temporários assim que você entrar na sala virtual</p>
                    </div>
                    <Switch
                      checked={!!preferences.sessions?.autoRecord}
                      onCheckedChange={(next) => updatePreference('sessions', { autoRecord: next })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">Transcrever automaticamente ao encerrar</p>
                      <p className="text-xs text-slate-500 mt-0.5">Usa OpenAI Whisper para gerar a transcrição da sessão após o encerramento</p>
                    </div>
                    <Switch
                      checked={!!preferences.sessions?.autoTranscribe}
                      onCheckedChange={(next) => updatePreference('sessions', { autoTranscribe: next })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">Guardar cópia do áudio</p>
                      <p className="text-xs text-slate-500 mt-0.5">Desligado: o áudio é usado temporariamente para transcrever e não fica salvo no servidor</p>
                    </div>
                    <Switch
                      checked={!!preferences.sessions?.saveAudioRecording}
                      onCheckedChange={(next) => updatePreference('sessions', { saveAudioRecording: next })}
                    />
                  </div>
                </div>
              </div>

              {/* Aviso LGPD */}
              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                  <strong>Atenção LGPD:</strong> a gravação e transcrição de sessões é considerada dado sensível de saúde. Certifique-se de obter o consentimento do paciente antes de gravar. Os arquivos ficam armazenados com segurança no servidor da clínica.
                </div>
              </div>
            </div>
          )}

          {/* ── GERAL ────────────────────────────────────────────────────── */}
          {activeTab === 'geral' && (
            <div className="space-y-8 max-w-2xl">
              <SectionHeader icon={<SettingsIcon size={20} />} title={t('settings.general.title')} desc={t('settings.general.subtitle')} />

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Select
                    label={t('settings.general.language')}
                    leftIcon={<Globe size={16} />}
                    value={language}
                    onChange={e => setLanguage(e.target.value as Language)}
                    size="lg"
                  >
                    <option value="pt">Português (Brasil)</option>
                    <option value="en">English (US)</option>
                    <option value="es">Español</option>
                  </Select>

                  <Select
                    label={t('settings.general.timezone')}
                    leftIcon={<Clock size={16} />}
                    size="lg"
                    value={preferences.general?.timezone || 'America/Sao_Paulo'}
                    onChange={e => updatePreference('general', { timezone: e.target.value })}
                  >
                    <optgroup label="🇧🇷 Brasil">
                      <option value="America/Sao_Paulo">(GMT-03:00) Brasília — São Paulo, Rio, Belo Horizonte</option>
                      <option value="America/Manaus">(GMT-04:00) Manaus, Cuiabá, Campo Grande</option>
                      <option value="America/Belem">(GMT-03:00) Belém, Fortaleza, Recife, Salvador</option>
                      <option value="America/Noronha">(GMT-02:00) Fernando de Noronha</option>
                      <option value="America/Rio_Branco">(GMT-05:00) Rio Branco, Acre</option>
                      <option value="America/Porto_Velho">(GMT-04:00) Porto Velho, Rondônia</option>
                    </optgroup>
                    <optgroup label="🌎 Americas">
                      <option value="America/Argentina/Buenos_Aires">(GMT-03:00) Buenos Aires</option>
                      <option value="America/Santiago">(GMT-03:00) Santiago</option>
                      <option value="America/Bogota">(GMT-05:00) Bogotá, Lima, Quito</option>
                      <option value="America/New_York">(GMT-05:00) New York, Miami, Toronto</option>
                      <option value="America/Chicago">(GMT-06:00) Chicago, Mexico City</option>
                      <option value="America/Denver">(GMT-07:00) Denver, Phoenix</option>
                      <option value="America/Los_Angeles">(GMT-08:00) Los Angeles, San Francisco</option>
                      <option value="America/Anchorage">(GMT-09:00) Anchorage</option>
                    </optgroup>
                    <optgroup label="🌍 Europa / África">
                      <option value="UTC">(GMT+00:00) UTC — Tempo Universal</option>
                      <option value="Europe/London">(GMT+00:00) Lisboa, Londres</option>
                      <option value="Europe/Paris">(GMT+01:00) Paris, Madrid, Roma, Berlin</option>
                      <option value="Europe/Helsinki">(GMT+02:00) Helsinki, Atenas, Cairo</option>
                      <option value="Europe/Moscow">(GMT+03:00) Moscou</option>
                      <option value="Africa/Johannesburg">(GMT+02:00) Joanesburgo</option>
                    </optgroup>
                    <optgroup label="🌏 Ásia / Pacífico">
                      <option value="Asia/Dubai">(GMT+04:00) Dubai, Abu Dhabi</option>
                      <option value="Asia/Karachi">(GMT+05:00) Karachi, Islamabad</option>
                      <option value="Asia/Kolkata">(GMT+05:30) Mumbai, Nova Délhi</option>
                      <option value="Asia/Bangkok">(GMT+07:00) Bangkok, Jakarta</option>
                      <option value="Asia/Shanghai">(GMT+08:00) Pequim, Xangai, Singapura</option>
                      <option value="Asia/Tokyo">(GMT+09:00) Tóquio, Seul</option>
                      <option value="Australia/Sydney">(GMT+10:00) Sydney</option>
                    </optgroup>
                  </Select>
                </div>

                <div className="p-4 bg-primary-50 border border-primary-100 rounded-2xl flex items-start gap-3">
                  <Clock size={16} className="text-primary-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-primary-800">Fuso horário ativo</p>
                    <p className="text-xs text-primary-600 mt-0.5">
                      Todas as datas e horários do sistema — incluindo respostas de formulários, agendamentos e registros — serão exibidos no fuso selecionado: <strong>{preferences.general?.timezone || 'America/Sao_Paulo'}</strong>
                    </p>
                  </div>
                </div>

                <Select label={t('settings.general.currency')} leftIcon={<span className="text-xs font-bold">R$</span>} size="lg">
                  <option>BRL (R$) — Real Brasileiro</option>
                  <option>USD ($) — Dólar Americano</option>
                  <option>EUR (€) — Euro</option>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="lg"
                  radius="xl"
                  leftIcon={<Save size={16} />}
                  onClick={() => pushToast('success', 'Configurações salvas!')}
                >
                  {t('common.save')}
                </Button>
              </div>

              {/* Danger zone */}
              <div className="pt-6 border-t border-slate-100">
                <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} /> {t('settings.danger.zone')}
                </p>
                <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-red-900 text-sm">{t('settings.danger.delete')}</p>
                    <p className="text-xs text-red-700/70 mt-1">{t('settings.danger.desc')}</p>
                  </div>
                  <Button variant="softDanger" size="sm" radius="xl">
                    {t('settings.danger.endSub')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── NOTIFICAÇÕES ─────────────────────────────────────────────── */}
          {activeTab === 'notificacoes' && hasPermission('manage_clinic_settings') && (
            <div className="space-y-6 max-w-2xl">
              <SectionHeader icon={<Bell size={20} />} title="Notificações por Email" desc="Configure os emails automáticos do sistema PsiFlux." />

              {prefsLoading ? (
                <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
                  <Loader2 size={26} className="animate-spin" />
                  <span className="text-sm">Carregando preferências...</span>
                </div>
              ) : (
                <div className="space-y-5">

                  {/* Master */}
                  <div className={cx(
                    'flex items-center justify-between gap-3 p-4 rounded-2xl border-2 transition-all duration-300',
                    emailPrefs.enabled ? 'border-primary-200 bg-primary-50/60' : 'border-slate-200 bg-slate-50'
                  )}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cx('p-2.5 rounded-xl transition-colors shrink-0', emailPrefs.enabled ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-400')}>
                        <Mail size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">Emails habilitados</p>
                        <p className="text-xs text-slate-500">{emailPrefs.enabled ? 'Recebendo notificações por email' : 'Todos os emails estão desativados'}</p>
                      </div>
                    </div>
                    <ToggleSwitch checked={emailPrefs.enabled} onChange={() => setEmailPrefs(p => ({ ...p, enabled: !p.enabled }))} />
                  </div>

                  <div className={cx('space-y-4 transition-all duration-300', emailPrefs.enabled ? 'opacity-100' : 'opacity-30 pointer-events-none')}>

                    {/* Agendamentos */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 pl-1">Agendamentos</p>
                      <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Calendar size={16} /></div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">Novo agendamento</p>
                              <p className="text-xs text-slate-400">Aviso quando um atendimento for criado</p>
                            </div>
                          </div>
                          <ToggleSwitch checked={emailPrefs.new_appointment} onChange={() => setEmailPrefs(p => ({ ...p, new_appointment: !p.new_appointment }))} />
                        </div>

                        <div className="px-4 py-3.5 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Clock size={16} /></div>
                              <div>
                                <p className="font-semibold text-slate-800 text-sm">Lembrete para mim (profissional)</p>
                                <p className="text-xs text-slate-400">Email antes da consulta no seu endereço</p>
                              </div>
                            </div>
                            <ToggleSwitch checked={emailPrefs.appointment_reminder_professional} onChange={() => setEmailPrefs(p => ({ ...p, appointment_reminder_professional: !p.appointment_reminder_professional }))} />
                          </div>
                          {(emailPrefs.appointment_reminder_professional || emailPrefs.appointment_reminder_patient) && (
                            <div className="mt-2.5 ml-10 flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-slate-400">Antecedência:</span>
                              {[30, 60].map(min => (
                                <button key={min} onClick={() => setEmailPrefs(p => ({ ...p, appointment_reminder_minutes: min }))}
                                  className={cx('px-3 py-1 rounded-lg text-xs font-bold border transition-all',
                                    emailPrefs.appointment_reminder_minutes === min
                                      ? 'bg-primary-600 text-white border-primary-600'
                                      : 'bg-white text-slate-500 border-slate-200 hover:border-primary-300'
                                  )}>
                                  {min === 30 ? '30 min' : '1 hora'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-violet-100 text-violet-600 rounded-lg"><Users2 size={16} /></div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">Lembrete para o paciente</p>
                              <p className="text-xs text-slate-400">Envia ao email do paciente (se cadastrado)</p>
                            </div>
                          </div>
                          <ToggleSwitch checked={emailPrefs.appointment_reminder_patient} onChange={() => setEmailPrefs(p => ({ ...p, appointment_reminder_patient: !p.appointment_reminder_patient }))} />
                        </div>
                      </div>
                    </div>

                    {/* Alertas */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 pl-1">Alertas</p>
                      <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-pink-100 text-pink-600 rounded-lg"><UserCheck size={16} /></div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">Aniversariantes do dia</p>
                              <p className="text-xs text-slate-400">Lista enviada toda manhã às 8h</p>
                            </div>
                          </div>
                          <ToggleSwitch checked={emailPrefs.birthday_reminder} onChange={() => setEmailPrefs(p => ({ ...p, birthday_reminder: !p.birthday_reminder }))} />
                        </div>
                      </div>
                    </div>

                    {/* Formulários */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 pl-1">Formulários</p>
                      <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-rose-100 text-rose-600 rounded-lg"><ClipboardList size={16} /></div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">Formulário respondido</p>
                              <p className="text-xs text-slate-400">Aviso quando um paciente responder um formulário</p>
                            </div>
                          </div>
                          <ToggleSwitch checked={emailPrefs.form_response} onChange={() => setEmailPrefs(p => ({ ...p, form_response: !p.form_response }))} />
                        </div>
                      </div>
                    </div>

                    {/* Relatórios */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 pl-1">Relatórios</p>
                      <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-violet-100 text-violet-600 rounded-lg"><BarChart2 size={16} /></div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">Relatório semanal</p>
                              <p className="text-xs text-slate-400">Toda segunda às 7h</p>
                            </div>
                          </div>
                          <ToggleSwitch checked={emailPrefs.weekly_report} onChange={() => setEmailPrefs(p => ({ ...p, weekly_report: !p.weekly_report }))} />
                        </div>
                        <div className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg"><FileText size={16} /></div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">Relatório mensal</p>
                              <p className="text-xs text-slate-400">Todo dia 1 às 7h</p>
                            </div>
                          </div>
                          <ToggleSwitch checked={emailPrefs.monthly_report} onChange={() => setEmailPrefs(p => ({ ...p, monthly_report: !p.monthly_report }))} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp (Master Bot) — avisos ao próprio profissional. Independente do
                      toggle de email acima: fica sempre visível, controlado só pelos toggles abaixo. */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 pl-1">WhatsApp (avisos para mim)</p>
                    <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Calendar size={16} /></div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">Novo agendamento</p>
                            <p className="text-xs text-slate-400">Aviso quando uma consulta for criada (sistema ou Portal do Paciente)</p>
                          </div>
                        </div>
                        <ToggleSwitch checked={emailPrefs.wpp_new_appointment} onChange={() => setEmailPrefs(p => ({ ...p, wpp_new_appointment: !p.wpp_new_appointment }))} />
                      </div>
                      <div className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Clock size={16} /></div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">Lembrete 60 minutos antes</p>
                            <p className="text-xs text-slate-400">Aviso da sua próxima consulta 1h antes</p>
                          </div>
                        </div>
                        <ToggleSwitch checked={emailPrefs.wpp_reminder_60min} onChange={() => setEmailPrefs(p => ({ ...p, wpp_reminder_60min: !p.wpp_reminder_60min }))} />
                      </div>
                      <div className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-sky-100 text-sky-600 rounded-lg"><Calendar size={16} /></div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">Lembrete 24 horas antes</p>
                            <p className="text-xs text-slate-400">Aviso no dia anterior da consulta</p>
                          </div>
                        </div>
                        <ToggleSwitch checked={emailPrefs.wpp_reminder_24h} onChange={() => setEmailPrefs(p => ({ ...p, wpp_reminder_24h: !p.wpp_reminder_24h }))} />
                      </div>
                      <div className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-red-100 text-red-600 rounded-lg"><XCircle size={16} /></div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">Cancelamento</p>
                            <p className="text-xs text-slate-400">Aviso quando uma consulta sua for cancelada</p>
                          </div>
                        </div>
                        <ToggleSwitch checked={emailPrefs.wpp_cancelled_appointment} onChange={() => setEmailPrefs(p => ({ ...p, wpp_cancelled_appointment: !p.wpp_cancelled_appointment }))} />
                      </div>
                      <div className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg"><Clock size={16} /></div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">Remarcação</p>
                            <p className="text-xs text-slate-400">Aviso quando o horário de uma consulta sua mudar</p>
                          </div>
                        </div>
                        <ToggleSwitch checked={emailPrefs.wpp_rescheduled_appointment} onChange={() => setEmailPrefs(p => ({ ...p, wpp_rescheduled_appointment: !p.wpp_rescheduled_appointment }))} />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 pl-1">Esses avisos usam o número de WhatsApp cadastrado no seu perfil. O Super Admin também pode desativar cada tipo globalmente.</p>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <Button variant="primary" size="lg" radius="xl" elevation="md" isLoading={prefsSaving} loadingText="Salvando..." leftIcon={<Save size={16} />} onClick={saveEmailPrefs}>
                      Salvar preferências
                    </Button>
                    <Button variant="outline" size="lg" radius="xl" isLoading={testSending} loadingText="Enviando..." leftIcon={<Send size={16} />} onClick={sendTestEmail}>
                      Enviar email de teste
                    </Button>
                  </div>

                  <div className="flex items-start gap-2.5 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <Mail size={13} className="mt-0.5 shrink-0 text-slate-400" />
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Emails enviados por <strong className="text-slate-700">sistema@psiflux.com.br</strong> — não monitore nem responda este endereço.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── EQUIPE ────────────────────────────────────────────────────── */}
          {activeTab === 'equipe' && hasPermission('manage_professionals') && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-start justify-between gap-4">
                <SectionHeader icon={<Users size={20} />} title="Equipe da Clínica" desc="Profissionais e usuários com acesso ao sistema." />
                <Button variant="primary" size="sm" radius="xl" leftIcon={<ExternalLink size={14} />} onClick={() => navigate('/profissionais')}>
                  Gerenciar
                </Button>
              </div>

              {teamLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-sm">Carregando equipe...</span>
                </div>
              ) : team.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                  <Users size={40} className="opacity-30" />
                  <p className="text-sm">Nenhum profissional encontrado.</p>
                  <Button variant="soft" size="sm" radius="xl" onClick={() => navigate('/profissionais')}>
                    Adicionar profissional
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Stats */}
                  <StatGrid cols={3}>
                    <StatCard title="Total" value={team.length} icon={Users} color="info" />
                    <StatCard title="Admins" value={team.filter(u => u.role === 'admin').length} icon={Shield} color="default" />
                    <StatCard title="Ativos" value={team.filter(u => u.is_active !== false).length} icon={UserCheck} color="success" />
                  </StatGrid>

                  {/* List */}
                  <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
                    {team.map((member: any) => {
                      const initials = (member.name || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                      const role = member.role || 'profissional';
                      const isActive = member.is_active !== false;
                      return (
                        <div key={member.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                          {member.avatar_url ? (
                            <img src={getStaticUrl(member.avatar_url)} alt={member.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                              {initials}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate">{member.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {member.email && <p className="text-xs text-slate-400 truncate flex items-center gap-1"><Mail size={10} />{member.email}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={cx('px-2 py-0.5 rounded-full text-[10px] font-bold border', ROLE_COLOR[role] || ROLE_COLOR['profissional'])}>
                              {ROLE_LABEL[role] || role}
                            </span>
                            <span className={cx('w-1.5 h-1.5 rounded-full', isActive ? 'bg-emerald-400' : 'bg-slate-300')} title={isActive ? 'Ativo' : 'Inativo'} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => navigate('/profissionais')}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 hover:border-primary-200 hover:text-primary-600 transition-all"
                  >
                    Ver todos no módulo de Profissionais <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── DADOS FISCAIS (NFS-e) ────────────────────────────────────────── */}
          {activeTab === 'dados-fiscais' && hasPermission('manage_payments') && (
            <div className="space-y-6 max-w-2xl">
              <SectionHeader icon={<FileText size={20} />} title="Dados Fiscais" desc="Configure a emissão de NFS-e (Nota Fiscal de Serviço Eletrônica) do seu consultório." />

              <div>
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="flex items-center gap-3 sm:gap-4 p-4 border-b border-slate-100">
                    <div className="p-2.5 rounded-xl bg-primary-100 text-primary-600 shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-800 text-sm">NFS-e (Nota Fiscal de Serviço)</p>
                        {nfseConfig.certificate_configured && (
                          <span className={cx(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                            nfseConfig.environment === 'producao'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                          )}>
                            {nfseConfig.environment === 'producao' ? 'Produção' : 'Homologação'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Emita a Nota Fiscal de Serviço Eletrônica municipal direto do Livro Caixa</p>
                    </div>
                    <ToggleSwitch checked={!!nfseConfig.nfse_enabled} onChange={toggleNfseEnabled} />
                  </div>
                  {nfseToggleSaving && <div className="px-4 pt-2 text-[11px] text-slate-400">Salvando...</div>}
                  {!nfseConfig.nfse_enabled && (
                    <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
                      <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">NFS-e desativada — o botão de emitir e a página "Nota Fiscal" ficam ocultos para todos os profissionais da clínica até você ativar aqui.</p>
                    </div>
                  )}

                  <div className="p-4 space-y-4">
                    {/* Dados fiscais */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">Razão social / Nome completo</label>
                        <input
                          type="text"
                          value={nfseConfig.razao_social || ''}
                          onChange={e => setNfseConfig((p: any) => ({ ...p, razao_social: e.target.value }))}
                          placeholder="Ex: João da Silva Psicologia"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-primary-400"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">CNPJ/CPF</label>
                        <input
                          type="text"
                          value={nfseConfig.cnpj_cpf || ''}
                          disabled
                          title="Alterado em Perfil > Dados pessoais"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">Inscrição municipal</label>
                        <input
                          type="text"
                          value={nfseConfig.inscricao_municipal || ''}
                          onChange={e => setNfseConfig((p: any) => ({ ...p, inscricao_municipal: e.target.value }))}
                          placeholder="Opcional"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-primary-400"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">Código do município (IBGE)</label>
                        <input
                          type="text"
                          value={nfseConfig.codigo_municipio || ''}
                          onChange={e => setNfseConfig((p: any) => ({ ...p, codigo_municipio: e.target.value.replace(/\D/g, '') }))}
                          placeholder="Ex: 3554003 (Tatuí/SP)"
                          maxLength={7}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-primary-400"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">Código de tributação (LC 116/03)</label>
                        <input
                          type="text"
                          value={nfseConfig.codigo_tributacao_nacional || ''}
                          onChange={e => setNfseConfig((p: any) => ({ ...p, codigo_tributacao_nacional: e.target.value }))}
                          placeholder="Ex: 1401 (psicologia)"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-primary-400"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">Regime tributário</label>
                        <select
                          value={nfseConfig.regime_tributario || 'simples_nacional'}
                          onChange={e => setNfseConfig((p: any) => ({ ...p, regime_tributario: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-primary-400 bg-white"
                        >
                          <option value="simples_nacional">Simples Nacional</option>
                          <option value="lucro_presumido">Lucro Presumido</option>
                          <option value="lucro_real">Lucro Real</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 mb-1 block">Ambiente de emissão</label>
                        <select
                          value={nfseConfig.environment || 'homologacao'}
                          onChange={e => setNfseConfig((p: any) => ({ ...p, environment: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-primary-400 bg-white"
                        >
                          <option value="homologacao">Homologação (testes, sem valor fiscal)</option>
                          <option value="producao">Produção</option>
                        </select>
                      </div>
                    </div>
                    <button onClick={saveNfseConfig} disabled={nfseSaving}
                      className="w-full py-2.5 text-xs font-bold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-all disabled:opacity-40">
                      {nfseSaving ? <span className="flex items-center justify-center gap-1"><Loader2 size={13} className="animate-spin" /> Salvando...</span> : 'Salvar dados fiscais'}
                    </button>

                    {/* Certificado digital */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <p className="text-xs font-bold text-slate-600">Certificado digital A1 (.pfx/.p12)</p>
                      {nfseConfig.certificate_configured ? (
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          <p className="text-xs text-emerald-700 font-medium">Certificado digital configurado.</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                          <p className="text-xs text-amber-700 font-medium">Nenhum certificado enviado ainda.</p>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-400">Para trocar o certificado, selecione o novo arquivo e informe a senha:</p>
                      <input
                        ref={nfseCertInputRef}
                        type="file"
                        accept=".pfx,.p12"
                        className="hidden"
                        onChange={e => setNfseCertFile(e.target.files?.[0] || null)}
                      />
                      <button
                        onClick={() => nfseCertInputRef.current?.click()}
                        className="w-full py-2 text-xs font-bold text-primary-700 bg-primary-50 border border-dashed border-primary-200 rounded-xl hover:bg-primary-100 transition-all"
                      >
                        {nfseCertFile ? nfseCertFile.name : 'Selecionar arquivo .pfx/.p12'}
                      </button>
                      <input
                        type="password"
                        value={nfseCertPassword}
                        onChange={e => setNfseCertPassword(e.target.value)}
                        placeholder="Senha do certificado"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-primary-400"
                      />
                      <button onClick={uploadNfseCert} disabled={!nfseCertFile || !nfseCertPassword || nfseUploadingCert}
                        className="w-full py-2.5 text-xs font-bold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-all disabled:opacity-40">
                        {nfseUploadingCert ? <span className="flex items-center justify-center gap-1"><Loader2 size={13} className="animate-spin" /> Enviando...</span> : 'Salvar certificado'}
                      </button>
                    </div>

                    {/* Testar emissão em homologação */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <p className="text-xs font-bold text-slate-600">Validar configuração</p>
                      <p className="text-[11px] text-slate-400">Emite uma NFS-e de teste em ambiente de homologação (sem valor fiscal) para confirmar que o certificado, o município e a comunicação com o Sistema Nacional NFS-e estão corretos.</p>
                      <button onClick={testNfseEmission} disabled={nfseTesting || !nfseConfig.certificate_configured}
                        className="w-full py-2.5 text-xs font-bold text-primary-700 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 transition-all disabled:opacity-40">
                        {nfseTesting ? <span className="flex items-center justify-center gap-1"><Loader2 size={13} className="animate-spin" /> Testando emissão...</span> : 'Testar emissão em homologação'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Recibo Receita Saúde ────────────────────────────────────── */}
              <div>
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
                      <Receipt size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">Recibo Receita Saúde</p>
                      <p className="text-xs text-slate-400 mt-0.5">Controle manual de recibo para dedução no Imposto de Renda (independente da NFS-e)</p>
                    </div>
                    <ToggleSwitch checked={!!nfseConfig.rs_receipt_enabled} onChange={toggleRsReceiptEnabled} />
                  </div>
                  {rsToggleSaving && <div className="px-4 pb-2 text-[11px] text-slate-400">Salvando...</div>}
                  {!nfseConfig.rs_receipt_enabled && (
                    <div className="mx-4 mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
                      <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">Recibo RS desativado — a coluna "Recibo RS" fica oculta no Livro Caixa até você ativar aqui.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── INTEGRAÇÕES ───────────────────────────────────────────────── */}
          {activeTab === 'integracoes' && (hasPermission('manage_bot_integration') || hasPermission('manage_clinical_tools') || hasPermission('manage_clinic_settings')) && (
            <div className="space-y-6 max-w-2xl">
              <SectionHeader icon={<Plug size={20} />} title={t('settings.menu.integrations')} desc="Módulos nativos e integrações do sistema." />

              {/* Módulos nativos — funcionam */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 pl-1">Módulos ativos</p>
                <div className="space-y-2">
                  {[
                    {
                      icon: <Video size={20} />,
                      color: 'bg-indigo-100 text-indigo-600',
                      title: 'Salas Virtuais',
                      desc: 'Atendimentos por videochamada integrado ao sistema',
                      badge: 'Ativo',
                      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                      onClick: () => navigate('/salas-virtuais'),
                    },
                    {
                      icon: <MessageSquare size={20} />,
                      color: 'bg-emerald-100 text-emerald-600',
                      title: 'Bot / Automação',
                      desc: 'Automação de mensagens e fluxos de atendimento',
                      badge: 'Ativo',
                      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                      onClick: () => navigate('/bot'),
                    },
                    {
                      icon: <FileCode size={20} />,
                      color: 'bg-violet-100 text-violet-600',
                      title: 'Formulários externos',
                      desc: 'Links públicos de formulários para seus pacientes',
                      badge: 'Ativo',
                      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                      onClick: () => navigate('/formularios'),
                    },
                    {
                      icon: <Briefcase size={20} />,
                      color: 'bg-amber-100 text-amber-600',
                      title: 'Gerador de documentos',
                      desc: 'Modelos de laudos, declarações e relatórios clínicos',
                      badge: 'Ativo',
                      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                      onClick: () => navigate('/gerador-documentos'),
                    },
                  ].map(item => (
                    <button key={item.title} onClick={item.onClick}
                      className="w-full flex items-center gap-3 sm:gap-4 p-4 rounded-2xl border border-slate-200 bg-white hover:border-primary-200 hover:shadow-sm transition-all text-left group">
                      <div className={cx('p-2.5 rounded-xl shrink-0', item.color)}>{item.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cx('px-2 py-0.5 rounded-full text-[10px] font-bold border hidden sm:inline-flex', item.badgeColor)}>
                          {item.badge}
                        </span>
                        <ArrowRight size={14} className="text-slate-300 group-hover:text-primary-400 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Mercado Pago ─────────────────────────────────────────────── */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 pl-1">Pagamentos</p>
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="flex items-center gap-3 sm:gap-4 p-4 border-b border-slate-100">
                    <div className="p-2.5 rounded-xl bg-primary-100 text-primary-600 shrink-0">
                      <CreditCard size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-800 text-sm">Mercado Pago</p>
                        {mpConfig.configured && (
                          <span className={cx(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                            mpConfig.enabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          )}>
                            {mpConfig.enabled ? 'Ativo' : 'Pausado'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Receba PIX, cartão e débito — lançamento automático no Livro Caixa</p>
                    </div>
                    {mpConfig.configured && (
                      <ToggleSwitch checked={mpConfig.enabled} onChange={toggleMpEnabled} />
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    {mpConfig.configured ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          <p className="text-xs text-emerald-700 font-medium">Access Token do Mercado Pago configurado e criptografado.</p>
                        </div>
                        <p className="text-[11px] text-slate-400">Para trocar o token, cole o novo abaixo:</p>
                        <div className="relative">
                          <input
                            type={mpShowToken ? 'text' : 'password'}
                            value={mpToken}
                            onChange={e => setMpToken(e.target.value)}
                            placeholder="Novo Access Token (opcional)"
                            className="w-full pr-10 pl-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-primary-400 font-mono"
                          />
                          <button onClick={() => setMpShowToken(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {mpShowToken ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        {mpToken && (
                          <div className="flex gap-2">
                            <button onClick={testMpToken} disabled={mpTesting || !mpToken.trim()}
                              className="flex-1 py-2 text-xs font-bold text-primary-700 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 transition-all disabled:opacity-50">
                              {mpTesting ? <Loader2 size={13} className="animate-spin inline" /> : 'Testar'}
                            </button>
                            <button onClick={saveMpToken} disabled={mpSaving || !mpToken.trim()}
                              className="flex-1 py-2 text-xs font-bold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50">
                              {mpSaving ? <Loader2 size={13} className="animate-spin inline" /> : 'Salvar'}
                            </button>
                          </div>
                        )}
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <p className="text-xs font-bold text-slate-600">Juros no parcelamento (cartão de crédito)</p>
                          <p className="text-[11px] text-slate-400">Taxa ao mês aplicada sobre o valor parcelado. O paciente verá o valor com juros e um aviso no Portal. Pix e débito nunca têm juros.</p>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={mpInterestRate}
                                onChange={e => setMpInterestRate(e.target.value.replace(/[^0-9.,]/g, ''))}
                                placeholder="0"
                                className="w-full pr-8 pl-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-primary-400"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">% a.m.</span>
                            </div>
                            <button onClick={saveMpInterestRate} disabled={mpSavingRate}
                              className="px-4 py-2 text-xs font-bold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-all disabled:opacity-50">
                              {mpSavingRate ? <Loader2 size={13} className="animate-spin inline" /> : 'Salvar'}
                            </button>
                          </div>
                        </div>
                        <button onClick={disconnectMp} disabled={mpSaving}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors">
                          <Unplug size={12} /> Desconectar Mercado Pago
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Guia passo a passo */}
                        <div className="p-3 bg-primary-50 rounded-xl border border-primary-100 space-y-1.5">
                          <p className="text-xs font-bold text-primary-700">Como obter o Access Token:</p>
                          <ol className="text-xs text-primary-800 space-y-1 pl-3 list-decimal">
                            <li>Acesse <strong>mercadopago.com.br</strong> e faça login</li>
                            <li>Clique em <strong>Seu negócio → Configurações</strong></li>
                            <li>Vá em <strong>Credenciais de produção</strong></li>
                            <li>Copie o <strong>Access Token</strong> (começa com <code className="bg-primary-100 px-1 rounded">APP_USR-</code>)</li>
                            <li>Cole abaixo e clique em <strong>Conectar</strong></li>
                          </ol>
                        </div>
                        <div className="relative">
                          <input
                            type={mpShowToken ? 'text' : 'password'}
                            value={mpToken}
                            onChange={e => setMpToken(e.target.value)}
                            placeholder="Access Token (APP_USR-...)"
                            className="w-full pr-10 pl-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-primary-400 font-mono"
                          />
                          <button onClick={() => setMpShowToken(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {mpShowToken ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button onClick={testMpToken} disabled={!mpToken.trim() || mpTesting}
                            className="flex-1 py-2.5 text-xs font-bold text-primary-700 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 transition-all disabled:opacity-40">
                            {mpTesting ? <span className="flex items-center justify-center gap-1"><Loader2 size={13} className="animate-spin" /> Testando...</span> : 'Testar conexão'}
                          </button>
                          <button onClick={saveMpToken} disabled={!mpToken.trim() || mpSaving}
                            className="flex-1 py-2.5 text-xs font-bold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-all disabled:opacity-40">
                            {mpSaving ? <span className="flex items-center justify-center gap-1"><Loader2 size={13} className="animate-spin" /> Salvando...</span> : 'Conectar Mercado Pago'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Em breve */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 pl-1">Em breve</p>
                <div className="space-y-2">
                  {[
                    {
                      icon: <span className="font-bold text-base">G</span>,
                      color: 'bg-blue-50 text-blue-600',
                      title: 'Google Calendar',
                      desc: 'Sincronize sua agenda com o Google Calendar',
                    },
                    {
                      icon: <Phone size={20} />,
                      color: 'bg-green-50 text-green-600',
                      title: 'WhatsApp Business API',
                      desc: 'Disparo de mensagens via API oficial do WhatsApp',
                    },
                    {
                      icon: <Zap size={20} />,
                      color: 'bg-orange-50 text-orange-600',
                      title: 'Zapier / Webhooks',
                      desc: 'Conecte o PsiFlux a outros sistemas via webhooks',
                    },
                  ].map(item => (
                    <div key={item.title}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/60 opacity-60">
                      <div className={cx('p-2.5 rounded-xl shrink-0', item.color)}>{item.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-700 text-sm">{item.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-500 border border-slate-200 shrink-0">
                        Em breve
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </PageWrapper>
  );
};
