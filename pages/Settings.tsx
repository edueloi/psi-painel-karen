import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon, Palette, Bell, Globe, Moon, Monitor, Smartphone,
  Check, ChevronRight, ShieldCheck, Mail,
  Save, AlertTriangle, Clock, Send, Loader2, Calendar,
  BarChart2, FileText, UserCheck, Users2, ExternalLink, Zap, ClipboardList,
  MessageSquare, Video, FileCode, Plug, ArrowRight, Users, Shield,
  Phone, Briefcase
} from 'lucide-react';
import { Button } from '../components/UI/Button';
import { PageHeader } from '../components/UI/PageHeader';
import { Select } from '../components/UI/Input';
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
};

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  profissional: 'Profissional',
  secretaria: 'Secretária',
  super_admin: 'Super Admin',
};

const ROLE_COLOR: Record<string, string> = {
  admin: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  profissional: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  secretaria: 'bg-amber-50 text-amber-700 border-amber-100',
  super_admin: 'bg-red-50 text-red-700 border-red-100',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    className={cx(
      'relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:ring-offset-1 shrink-0',
      checked ? 'bg-indigo-600' : 'bg-slate-200'
    )}
  >
    <div className={cx(
      'absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-300',
      checked ? 'translate-x-6' : 'translate-x-0'
    )} />
  </button>
);

const SectionHeader = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc?: string }) => (
  <div className="flex items-start gap-3 mb-8">
    <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600 shrink-0">{icon}</div>
    <div>
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      {desc && <p className="text-slate-500 text-sm mt-0.5">{desc}</p>}
    </div>
  </div>
);

// ─── Component ───────────────────────────────────────────────────────────────
export const Settings: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { user, hasPermission } = useAuth();
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
    ...(hasPermission('manage_clinic_settings') ? [{ id: 'notificacoes', label: 'Notificações', icon: <Bell size={18} />, desc: 'Emails automáticos' }] : []),
    ...(hasPermission('manage_professionals') && (user?.plan_features?.includes('profissionais')) ? [{ id: 'equipe', label: 'Equipe', icon: <Users size={18} />, desc: 'Profissionais da clínica' }] : []),
    ...(hasPermission('manage_bot_integration') || hasPermission('manage_clinical_tools') || hasPermission('manage_clinic_settings') ? [{ id: 'integracoes', label: 'Integrações', icon: <Plug size={18} />, desc: 'Módulos e conexões' }] : []),
  ];

  return (
    <div className="max-w-[1600px] mx-auto pb-20 px-4 font-sans">

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

      <div className="flex flex-col lg:flex-row gap-6">

        {/* Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {MENU_ITEMS.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cx(
                  'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all relative',
                  idx < MENU_ITEMS.length - 1 && 'border-b border-slate-100',
                  activeTab === item.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                {activeTab === item.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-600 rounded-r" />
                )}
                <div className={cx(
                  'p-1.5 rounded-lg shrink-0 transition-colors',
                  activeTab === item.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                )}>
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className={cx('text-sm font-semibold', activeTab === item.id ? 'text-indigo-800' : 'text-slate-700')}>
                    {item.label}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{item.desc}</p>
                </div>
                {activeTab === item.id && <ChevronRight size={14} className="ml-auto text-indigo-400 shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 min-h-[560px]">

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
                        selectedColor === color.name ? 'ring-4 ring-offset-2 ring-indigo-400 scale-110' : ''
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
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light', label: t('settings.appearance.light'), icon: <Monitor size={22} /> },
                    { id: 'dark',  label: t('settings.appearance.dark'),  icon: <Moon size={22} /> },
                    { id: 'auto',  label: t('settings.appearance.auto'),  icon: <Smartphone size={22} /> },
                  ].map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setMode(mode.id as any)}
                      className={cx(
                        'flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-200',
                        selectedMode === mode.id
                          ? 'border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      )}
                    >
                      <div className={cx(
                        'p-3 rounded-xl',
                        selectedMode === mode.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                      )}>
                        {mode.icon}
                      </div>
                      <span className={cx('text-xs font-bold', selectedMode === mode.id ? 'text-indigo-700' : 'text-slate-600')}>
                        {mode.label}
                      </span>
                      {selectedMode === mode.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      )}
                    </button>
                  ))}
                </div>
              </section>
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

                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
                  <Clock size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-indigo-800">Fuso horário ativo</p>
                    <p className="text-xs text-indigo-600 mt-0.5">
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
                    'flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300',
                    emailPrefs.enabled ? 'border-indigo-200 bg-indigo-50/60' : 'border-slate-200 bg-slate-50'
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cx('p-2.5 rounded-xl transition-colors', emailPrefs.enabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400')}>
                        <Mail size={18} />
                      </div>
                      <div>
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
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
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
                <div className="space-y-2">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'Total', value: team.length, icon: <Users size={16} />, color: 'indigo' },
                      { label: 'Admins', value: team.filter(u => u.role === 'admin').length, icon: <Shield size={16} />, color: 'amber' },
                      { label: 'Ativos', value: team.filter(u => u.is_active !== false).length, icon: <UserCheck size={16} />, color: 'emerald' },
                    ].map(stat => (
                      <div key={stat.label} className={cx(
                        'flex items-center gap-3 p-3 rounded-xl border',
                        stat.color === 'indigo' ? 'bg-indigo-50 border-indigo-100' :
                        stat.color === 'amber'  ? 'bg-amber-50 border-amber-100' :
                        'bg-emerald-50 border-emerald-100'
                      )}>
                        <span className={cx(
                          stat.color === 'indigo' ? 'text-indigo-600' :
                          stat.color === 'amber'  ? 'text-amber-600' :
                          'text-emerald-600'
                        )}>{stat.icon}</span>
                        <div>
                          <p className="text-lg font-bold text-slate-800">{stat.value}</p>
                          <p className="text-[10px] font-semibold text-slate-500">{stat.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>

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
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
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
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 transition-all"
                  >
                    Ver todos no módulo de Profissionais <ArrowRight size={14} />
                  </button>
                </div>
              )}
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
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm transition-all text-left group">
                      <div className={cx('p-2.5 rounded-xl shrink-0', item.color)}>{item.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cx('px-2 py-0.5 rounded-full text-[10px] font-bold border', item.badgeColor)}>
                          {item.badge}
                        </span>
                        <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                      </div>
                    </button>
                  ))}
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
    </div>
  );
};
