import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe, Users, Link2, Copy, Check, Trash2, Plus, RefreshCw,
  Send, Clock, Settings, QrCode, CreditCard, Wallet, ChevronRight,
  ToggleLeft, ToggleRight, ExternalLink, Shield, AlertCircle, Package, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';

interface PortalToken {
  id: number;
  patient_id: number;
  patient_name?: string;
  patient_phone?: string;
  label?: string;
  token: string;
  is_used: number;
  used_at?: string;
  expires_at?: string;
  allow_self_schedule: number;
  require_approval: number;
  created_at: string;
}

interface Patient {
  id: number;
  name?: string;
  full_name?: string;
  phone?: string;
}

interface PortalSettings {
  pix_key?: string;
  pix_key_type?: string;
  pix_owner_name?: string;
  pix_instructions?: string;
  payment_pix_enabled?: boolean;
  payment_credit_enabled?: boolean;
  payment_debit_enabled?: boolean;
  payment_transfer_enabled?: boolean;
  require_payment_before_session?: boolean;
}

interface TokenPackageConfig {
  package_id: number;
  name: string;
  sessions_count: number;
  default_price: number;
  custom_price: number | null;
  active: boolean;
  configured: boolean;
}

type Tab = 'pacientes' | 'configuracoes';

const PIX_KEY_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'random', label: 'Chave aleatória' },
];

export const PortalPaciente: React.FC = () => {
  const { pushToast } = useToast();
  const [tab, setTab] = useState<Tab>('pacientes');
  const [tokens, setTokens] = useState<PortalToken[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    patient_id: '',
    expires_in_days: 365,
    allow_self_schedule: true,
    require_approval: false,
  });

  // Settings tab state
  const [settings, setSettings] = useState<PortalSettings>({
    pix_key: '',
    pix_key_type: 'cpf',
    pix_owner_name: '',
    pix_instructions: '',
    payment_pix_enabled: true,
    payment_credit_enabled: false,
    payment_debit_enabled: false,
    payment_transfer_enabled: false,
    require_payment_before_session: false,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  const baseUrl = window.location.origin;

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<PortalToken[]>('/patient-portal/tokens/all');
      setTokens(Array.isArray(data) ? data : []);
    } catch { setTokens([]); }
    finally { setLoading(false); }
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      const data = await api.get<any>('/patients?limit=500');
      const list = Array.isArray(data) ? data : (data?.patients || data?.data || []);
      setPatients(list);
    } catch { setPatients([]); }
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const data = await api.get<PortalSettings>('/patient-portal/settings');
      if (data && typeof data === 'object') {
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch { /* uses defaults */ }
    finally { setLoadingSettings(false); }
  }, []);

  useEffect(() => {
    fetchTokens();
    fetchPatients();
  }, []);

  useEffect(() => {
    if (tab === 'configuracoes') fetchSettings();
  }, [tab]);

  const createToken = async () => {
    if (!form.patient_id) { pushToast('error', 'Selecione um paciente.'); return; }
    setCreating(true);
    try {
      await api.post('/patient-portal/tokens', {
        patient_id: parseInt(form.patient_id),
        expires_in_days: form.expires_in_days,
        allow_self_schedule: form.allow_self_schedule ? 1 : 0,
        require_approval: form.require_approval ? 1 : 0,
      });
      pushToast('success', 'Link de acesso criado!');
      setShowForm(false);
      setForm({ patient_id: '', expires_in_days: 365, allow_self_schedule: true, require_approval: false });
      fetchTokens();
    } catch (e: any) {
      pushToast('error', e?.message || 'Erro ao criar link.');
    } finally { setCreating(false); }
  };

  const revokeToken = async (id: number) => {
    if (!confirm('Revogar este link? O paciente não poderá mais acessar.')) return;
    try {
      await api.delete(`/patient-portal/tokens/${id}`);
      pushToast('success', 'Link revogado.');
      fetchTokens();
    } catch { pushToast('error', 'Erro ao revogar.'); }
  };

  const copyLink = (token: string, id: number) => {
    navigator.clipboard.writeText(`${baseUrl}/portal/entrar/${token}`).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      pushToast('success', 'Link copiado!');
    });
  };

  const sendWhatsApp = (t: PortalToken) => {
    const patient = patients.find(p => String(p.id) === String(t.patient_id));
    const name = t.patient_name || patient?.full_name || patient?.name || 'Paciente';
    const phone = t.patient_phone || patient?.phone || '';
    const url = `${baseUrl}/portal/entrar/${t.token}`;
    const msg = encodeURIComponent(
      `Olá ${name}! Aqui está seu link de acesso ao portal:\n\n${url}\n\nNele você pode agendar consultas e muito mais. 😊`
    );
    const wa = phone
      ? `https://wa.me/55${phone.replace(/\D/g, '')}?text=${msg}`
      : `https://wa.me/?text=${msg}`;
    window.open(wa, '_blank');
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.post('/patient-portal/settings', settings);
      pushToast('success', 'Configurações salvas!');
    } catch { pushToast('error', 'Erro ao salvar configurações.'); }
    finally { setSavingSettings(false); }
  };

  // Estado para configuração de pacotes por token
  const [expandedTokenId, setExpandedTokenId] = useState<number | null>(null);
  const [tokenPackages, setTokenPackages] = useState<Record<number, TokenPackageConfig[]>>({});
  const [loadingTokenPkgs, setLoadingTokenPkgs] = useState<number | null>(null);
  const [savingTokenPkgs, setSavingTokenPkgs] = useState<number | null>(null);

  const loadTokenPackages = async (tokenId: number) => {
    if (tokenPackages[tokenId]) {
      setExpandedTokenId(expandedTokenId === tokenId ? null : tokenId);
      return;
    }
    setLoadingTokenPkgs(tokenId);
    try {
      const data = await api.get<TokenPackageConfig[]>(`/patient-portal/token-packages/${tokenId}`);
      setTokenPackages(prev => ({ ...prev, [tokenId]: Array.isArray(data) ? data : [] }));
      setExpandedTokenId(tokenId);
    } catch { pushToast('error', 'Erro ao carregar pacotes.'); }
    finally { setLoadingTokenPkgs(null); }
  };

  const toggleExpandToken = (tokenId: number) => {
    if (expandedTokenId === tokenId) { setExpandedTokenId(null); return; }
    loadTokenPackages(tokenId);
  };

  const updateTokenPackage = (tokenId: number, packageId: number, field: 'active' | 'custom_price', value: any) => {
    setTokenPackages(prev => ({
      ...prev,
      [tokenId]: (prev[tokenId] || []).map(p =>
        p.package_id === packageId ? { ...p, [field]: value } : p
      ),
    }));
  };

  const saveTokenPackages = async (tokenId: number) => {
    const pkgs = tokenPackages[tokenId];
    if (!pkgs) return;
    setSavingTokenPkgs(tokenId);
    try {
      await api.post(`/patient-portal/token-packages/${tokenId}`, pkgs.map(p => ({
        package_id: p.package_id,
        active: p.active,
        custom_price: p.custom_price !== null && p.custom_price !== undefined && String(p.custom_price) !== '' ? p.custom_price : null,
      })));
      pushToast('success', 'Pacotes configurados!');
    } catch { pushToast('error', 'Erro ao salvar.'); }
    finally { setSavingTokenPkgs(null); }
  };

  const activeCount = tokens.filter(t => t.is_used).length;
  const pendingCount = tokens.filter(t => !t.is_used).length;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Globe size={16} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-800 leading-none">Portal do Paciente</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Gerencie acessos e configurações do portal</p>
          </div>
        </div>
        {tab === 'pacientes' && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
          >
            <Plus size={13} /> Novo link
          </button>
        )}
      </div>

      {/* Stats — compact row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'Total', value: tokens.length, color: 'text-slate-700', bg: 'bg-slate-50' },
          { label: 'Com acesso', value: activeCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pendentes', value: pendingCount, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl px-3 py-2 flex items-center gap-2`}>
            <span className={`text-lg font-black ${s.color}`}>{s.value}</span>
            <span className="text-[11px] text-slate-400 font-medium">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-3 w-fit">
        {(['pacientes', 'configuracoes'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'pacientes' ? <><Users size={12} /> Pacientes</> : <><Settings size={12} /> Configurações</>}
          </button>
        ))}
      </div>

      {/* ── TAB: PACIENTES ── */}
      {tab === 'pacientes' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          {/* Inline create form */}
          {showForm && (
            <div className="px-4 py-3 bg-indigo-50/60 border-b border-indigo-100">
              <p className="text-xs font-black text-indigo-700 mb-2">Novo link de acesso</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="col-span-2 md:col-span-1">
                  <select
                    value={form.patient_id}
                    onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="">Paciente *</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name || p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={form.expires_in_days}
                    onChange={e => setForm(f => ({ ...f, expires_in_days: parseInt(e.target.value) }))}
                    className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value={30}>30 dias</option>
                    <option value={90}>3 meses</option>
                    <option value={365}>1 ano</option>
                    <option value={3650}>Sem expiração</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={form.allow_self_schedule}
                      onChange={e => setForm(f => ({ ...f, allow_self_schedule: e.target.checked }))}
                      className="rounded accent-indigo-600 w-3 h-3" />
                    <span className="text-[11px] text-slate-600">Auto-agend.</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={form.require_approval}
                      onChange={e => setForm(f => ({ ...f, require_approval: e.target.checked }))}
                      className="rounded accent-indigo-600 w-3 h-3" />
                    <span className="text-[11px] text-slate-600">Aprovação</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowForm(false)}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 font-medium rounded-lg">
                    Cancelar
                  </button>
                  <button onClick={createToken} disabled={creating}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-all">
                    {creating ? '...' : 'Criar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Paciente</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide hidden md:block">Criado</span>
            <div className="flex items-center justify-end gap-1">
              <button onClick={fetchTokens} className="p-1 text-slate-400 hover:text-indigo-500">
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-center text-slate-400 text-xs">Carregando...</div>
          ) : tokens.length === 0 ? (
            <div className="p-8 text-center">
              <Globe size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-xs">Nenhum link de acesso criado.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {tokens.map(t => {
                const patient = patients.find(p => String(p.id) === String(t.patient_id));
                const name = t.patient_name || patient?.full_name || patient?.name || `Paciente #${t.patient_id}`;
                const isExpired = t.expires_at && new Date(t.expires_at) < new Date();
                const statusLabel = t.is_used ? 'ATIVO' : isExpired ? 'EXPIRADO' : 'PENDENTE';
                const statusColor = t.is_used
                  ? 'bg-emerald-100 text-emerald-600'
                  : isExpired
                    ? 'bg-red-100 text-red-500'
                    : 'bg-amber-100 text-amber-600';
                const createdAt = new Date(t.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

                return (
                  <div key={t.id} className="border-b border-slate-50 last:border-0">
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-4 py-2.5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 ${statusColor}`}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {t.allow_self_schedule ? (
                            <span className="text-[10px] text-indigo-400 font-medium">Auto-agend.</span>
                          ) : (
                            <span className="text-[10px] text-slate-300 font-medium">Só consulta</span>
                          )}
                          {t.require_approval ? (
                            <span className="text-[10px] text-orange-400 font-medium">Aprovação</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${statusColor}`}>
                      {statusLabel}
                    </span>

                    <span className="text-[10px] text-slate-400 hidden md:block whitespace-nowrap">{createdAt}</span>

                    <div className="flex items-center gap-0.5">
                      <button onClick={() => copyLink(t.token, t.id)}
                        className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors rounded-lg hover:bg-indigo-50"
                        title="Copiar link">
                        {copiedId === t.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>
                      <button onClick={() => sendWhatsApp(t)}
                        className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors rounded-lg hover:bg-emerald-50"
                        title="Enviar WhatsApp">
                        <Send size={13} />
                      </button>
                      <button
                        onClick={() => window.open(`${baseUrl}/portal/entrar/${t.token}`, '_blank')}
                        className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50"
                        title="Abrir link">
                        <ExternalLink size={13} />
                      </button>
                      <button
                        onClick={() => toggleExpandToken(t.id)}
                        className={`p-1.5 transition-colors rounded-lg ${expandedTokenId === t.id ? 'text-indigo-500 bg-indigo-50' : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-50'}`}
                        title="Configurar pacotes">
                        {loadingTokenPkgs === t.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Package size={13} />}
                      </button>
                      <button onClick={() => revokeToken(t.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                        title="Revogar">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Painel de configuração de pacotes */}
                  {expandedTokenId === t.id && tokenPackages[t.id] && (
                    <div className="border-t border-indigo-100 bg-indigo-50/40 px-4 py-3">
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Package size={11} /> Pacotes disponíveis para {name}
                      </p>
                      {tokenPackages[t.id].length === 0 ? (
                        <p className="text-xs text-slate-400">Nenhum pacote cadastrado ainda.</p>
                      ) : (
                        <div className="space-y-2">
                          {tokenPackages[t.id].map(pkg => (
                            <div key={pkg.package_id} className="bg-white rounded-xl border border-slate-200 px-3 py-2 flex items-center gap-3">
                              <input type="checkbox" checked={pkg.active}
                                onChange={e => updateTokenPackage(t.id, pkg.package_id, 'active', e.target.checked)}
                                className="rounded accent-indigo-600 w-3.5 h-3.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-bold truncate ${pkg.active ? 'text-slate-700' : 'text-slate-300'}`}>{pkg.name}</p>
                                <p className="text-[10px] text-slate-400">{pkg.sessions_count} sessões · padrão: R$ {Number(pkg.default_price).toFixed(2)}</p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] text-slate-400">Preço:</span>
                                <input
                                  type="number"
                                  value={pkg.custom_price !== null && pkg.custom_price !== undefined ? String(pkg.custom_price) : ''}
                                  onChange={e => updateTokenPackage(t.id, pkg.package_id, 'custom_price', e.target.value === '' ? null : parseFloat(e.target.value))}
                                  placeholder={String(Number(pkg.default_price).toFixed(2))}
                                  className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                />
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => saveTokenPackages(t.id)}
                              disabled={savingTokenPkgs === t.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-all">
                              {savingTokenPkgs === t.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                              Salvar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: CONFIGURAÇÕES ── */}
      {tab === 'configuracoes' && (
        <div className="space-y-3">
          {loadingSettings ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center text-xs text-slate-400">Carregando...</div>
          ) : (
            <>
              {/* PIX */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                  <QrCode size={14} className="text-indigo-500" />
                  <span className="text-xs font-black text-slate-700">Configurações de PIX</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Tipo de chave</label>
                    <select
                      value={settings.pix_key_type || 'cpf'}
                      onChange={e => setSettings(s => ({ ...s, pix_key_type: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      {PIX_KEY_TYPES.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Chave PIX</label>
                    <input
                      type="text"
                      value={settings.pix_key || ''}
                      onChange={e => setSettings(s => ({ ...s, pix_key: e.target.value }))}
                      placeholder="Ex.: 123.456.789-00"
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Nome do titular</label>
                    <input
                      type="text"
                      value={settings.pix_owner_name || ''}
                      onChange={e => setSettings(s => ({ ...s, pix_owner_name: e.target.value }))}
                      placeholder="Ex.: Karen Gomes"
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Instruções de pagamento (visível ao paciente)</label>
                    <textarea
                      value={settings.pix_instructions || ''}
                      onChange={e => setSettings(s => ({ ...s, pix_instructions: e.target.value }))}
                      rows={2}
                      placeholder="Ex.: Realize o pagamento antes da sessão e envie o comprovante via WhatsApp."
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Formas de pagamento */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                  <CreditCard size={14} className="text-indigo-500" />
                  <span className="text-xs font-black text-slate-700">Formas de pagamento aceitas</span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {[
                    { key: 'payment_pix_enabled' as const, label: 'PIX', desc: 'Pagamento via chave PIX' },
                    { key: 'payment_credit_enabled' as const, label: 'Cartão de crédito', desc: 'Máquina ou link de pagamento' },
                    { key: 'payment_debit_enabled' as const, label: 'Cartão de débito', desc: 'Máquina presencial' },
                    { key: 'payment_transfer_enabled' as const, label: 'Transferência bancária', desc: 'TED / DOC' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                      <div>
                        <p className="text-xs font-bold text-slate-700">{item.label}</p>
                        <p className="text-[11px] text-slate-400">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => setSettings(s => ({ ...s, [item.key]: !s[item.key] }))}
                        className="transition-colors"
                      >
                        {settings[item.key]
                          ? <ToggleRight size={22} className="text-indigo-500" />
                          : <ToggleLeft size={22} className="text-slate-300" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opções adicionais */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                  <Shield size={14} className="text-indigo-500" />
                  <span className="text-xs font-black text-slate-700">Opções do portal</span>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Exigir pagamento antes da sessão</p>
                      <p className="text-[11px] text-slate-400">Paciente precisa confirmar pagamento para o agendamento ser aceito</p>
                    </div>
                    <button onClick={() => setSettings(s => ({ ...s, require_payment_before_session: !s.require_payment_before_session }))}>
                      {settings.require_payment_before_session
                        ? <ToggleRight size={22} className="text-indigo-500" />
                        : <ToggleLeft size={22} className="text-slate-300" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end">
                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-all shadow-sm"
                >
                  {savingSettings ? 'Salvando...' : 'Salvar configurações'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
