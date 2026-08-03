import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe, Users, Copy, Check, Trash2, Plus, RefreshCw,
  Send, Settings, QrCode, CreditCard, ExternalLink, Shield, Package, Loader2,
  FileSignature,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import { ContractTemplateEditor } from '../components/Contract/ContractTemplateEditor';
import {
  PageWrapper, SectionTitle, StatGrid, StatCard, FilterLineSegmented,
  Button, IconButton, EmptyState,
} from '../components/UI';
import { Switch } from '../components/UI/Switch';
import { Select, Input, Textarea } from '../components/UI/Input';

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
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);

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
    <PageWrapper className="space-y-4 sm:space-y-6 font-sans">
      <SectionTitle
        icon={Globe}
        title="Portal do Paciente"
        description="Gerencie acessos e configurações do portal"
        action={
          tab === 'pacientes' && (
            <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => setShowForm(v => !v)}>
              Novo link
            </Button>
          )
        }
      />

      <StatGrid cols={3}>
        <StatCard title="Total" value={tokens.length} icon={Users} color="default" />
        <StatCard title="Com acesso" value={activeCount} icon={Check} color="success" />
        <StatCard title="Pendentes" value={pendingCount} icon={Package} color="warning" />
      </StatGrid>

      <FilterLineSegmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'pacientes', label: 'Pacientes', icon: <Users size={13} /> },
          { value: 'configuracoes', label: 'Configurações', icon: <Settings size={13} /> },
        ]}
      />

      {/* ── TAB: PACIENTES ── */}
      {tab === 'pacientes' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Inline create form */}
          {showForm && (
            <div className="px-4 py-3 bg-primary-50/60 border-b border-primary-100">
              <p className="text-xs font-black text-primary-700 mb-2">Novo link de acesso</p>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2">
                <div className="col-span-2 md:col-span-1">
                  <Select
                    value={form.patient_id}
                    onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
                  >
                    <option value="">Paciente *</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name || p.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Select
                    value={form.expires_in_days}
                    onChange={e => setForm(f => ({ ...f, expires_in_days: parseInt(e.target.value) }))}
                  >
                    <option value={30}>30 dias</option>
                    <option value={90}>3 meses</option>
                    <option value={365}>1 ano</option>
                    <option value={3650}>Sem expiração</option>
                  </Select>
                </div>
                <div className="flex items-center gap-4 col-span-2 md:col-span-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      size="sm"
                      checked={form.allow_self_schedule}
                      onCheckedChange={(next) => setForm(f => ({ ...f, allow_self_schedule: next }))}
                    />
                    <span className="text-[11px] text-slate-600 font-semibold">Auto-agend.</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      size="sm"
                      checked={form.require_approval}
                      onCheckedChange={(next) => setForm(f => ({ ...f, require_approval: next }))}
                    />
                    <span className="text-[11px] text-slate-600 font-semibold">Aprovação</span>
                  </label>
                </div>
                <div className="flex gap-2 col-span-2 md:col-span-1">
                  <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" onClick={createToken} loading={creating} loadingText="...">
                    Criar
                  </Button>
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
              <IconButton variant="ghost" size="xs" onClick={fetchTokens} title="Atualizar">
                <RefreshCw size={12} />
              </IconButton>
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-center text-slate-400 text-xs">Carregando...</div>
          ) : tokens.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="Nenhum link de acesso criado"
              className="border-0 rounded-none"
            />
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
                            <span className="text-[10px] text-primary-400 font-medium">Auto-agend.</span>
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
                      <IconButton variant="ghost" size="xs" onClick={() => copyLink(t.token, t.id)}
                        className="hover:bg-primary-50 hover:text-primary-500"
                        title="Copiar link">
                        {copiedId === t.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </IconButton>
                      <IconButton variant="ghost" size="xs" onClick={() => sendWhatsApp(t)}
                        className="hover:bg-emerald-50 hover:text-emerald-500"
                        title="Enviar WhatsApp">
                        <Send size={13} />
                      </IconButton>
                      <IconButton variant="ghost" size="xs"
                        onClick={() => window.open(`${baseUrl}/portal/entrar/${t.token}`, '_blank')}
                        className="hover:bg-blue-50 hover:text-blue-500"
                        title="Abrir link">
                        <ExternalLink size={13} />
                      </IconButton>
                      <IconButton variant="ghost" size="xs"
                        onClick={() => toggleExpandToken(t.id)}
                        className={expandedTokenId === t.id ? 'text-primary-500 bg-primary-50' : 'hover:bg-primary-50 hover:text-primary-500'}
                        title="Configurar pacotes">
                        {loadingTokenPkgs === t.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Package size={13} />}
                      </IconButton>
                      <IconButton variant="ghost" size="xs" onClick={() => revokeToken(t.id)}
                        className="hover:bg-red-50 hover:text-red-500"
                        title="Revogar">
                        <Trash2 size={13} />
                      </IconButton>
                    </div>
                  </div>

                  {/* Painel de configuração de pacotes */}
                  {expandedTokenId === t.id && tokenPackages[t.id] && (
                    <div className="border-t border-primary-100 bg-primary-50/40 px-4 py-3">
                      <p className="text-[10px] font-black text-primary-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Package size={11} /> Pacotes disponíveis para {name}
                      </p>
                      <p className="text-[10px] text-slate-400 mb-2">Marque os pacotes que {name} pode ver e contratar pelo portal. Por padrão, nenhum aparece.</p>
                      {tokenPackages[t.id].length === 0 ? (
                        <p className="text-xs text-slate-400">Nenhum pacote cadastrado ainda.</p>
                      ) : (
                        <div className="space-y-2">
                          {tokenPackages[t.id].map(pkg => (
                            <div key={pkg.package_id} className="bg-white rounded-xl border border-slate-200 px-3 py-2 flex items-center gap-3">
                              <Switch
                                size="sm"
                                checked={pkg.active}
                                onCheckedChange={(next) => updateTokenPackage(t.id, pkg.package_id, 'active', next)}
                              />
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
                                  className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-300"
                                />
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-end pt-1">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => saveTokenPackages(t.id)}
                              loading={savingTokenPkgs === t.id}
                              iconLeft={<Check size={11} />}
                            >
                              Salvar
                            </Button>
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
                  <QrCode size={14} className="text-primary-500" />
                  <span className="text-xs font-black text-slate-700">Configurações de PIX</span>
                </div>
                <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <Select
                    label="Tipo de chave"
                    value={settings.pix_key_type || 'cpf'}
                    onChange={e => setSettings(s => ({ ...s, pix_key_type: e.target.value }))}
                  >
                    {PIX_KEY_TYPES.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                  </Select>
                  <Input
                    label="Chave PIX"
                    type="text"
                    value={settings.pix_key || ''}
                    onChange={e => setSettings(s => ({ ...s, pix_key: e.target.value }))}
                    placeholder="Ex.: 123.456.789-00"
                  />
                  <Input
                    label="Nome do titular"
                    type="text"
                    value={settings.pix_owner_name || ''}
                    onChange={e => setSettings(s => ({ ...s, pix_owner_name: e.target.value }))}
                    placeholder="Ex.: Karen Gomes"
                  />
                  <div className="sm:col-span-2 md:col-span-3">
                    <Textarea
                      label="Instruções de pagamento (visível ao paciente)"
                      value={settings.pix_instructions || ''}
                      onChange={e => setSettings(s => ({ ...s, pix_instructions: e.target.value }))}
                      rows={2}
                      placeholder="Ex.: Realize o pagamento antes da sessão e envie o comprovante via WhatsApp."
                    />
                  </div>
                </div>
              </div>

              {/* Formas de pagamento */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                  <CreditCard size={14} className="text-primary-500" />
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
                      <Switch
                        checked={!!settings[item.key]}
                        onCheckedChange={(next) => setSettings(s => ({ ...s, [item.key]: next }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Opções adicionais */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                  <Shield size={14} className="text-primary-500" />
                  <span className="text-xs font-black text-slate-700">Opções do portal</span>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Exigir pagamento antes da sessão</p>
                      <p className="text-[11px] text-slate-400">Paciente precisa confirmar pagamento para o agendamento ser aceito</p>
                    </div>
                    <Switch
                      checked={!!settings.require_payment_before_session}
                      onCheckedChange={(next) => setSettings(s => ({ ...s, require_payment_before_session: next }))}
                    />
                  </div>
                </div>
              </div>

              {/* Editor de Contrato */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                  <FileSignature size={14} className="text-primary-500" />
                  <span className="text-xs font-black text-slate-700">Contrato de Prestação de Serviços</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-400">
                    Edite o texto do contrato que o paciente lê e assina no portal (modelos separados para atendimento online e presencial).
                  </p>
                  <Button
                    variant="soft"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setIsContractModalOpen(true)}
                    iconLeft={<Settings size={13} />}
                  >
                    Editar contrato
                  </Button>
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={saveSettings}
                  loading={savingSettings}
                  loadingText="Salvando..."
                >
                  Salvar configurações
                </Button>
              </div>
            </>
          )}
          <ContractTemplateEditor isOpen={isContractModalOpen} onClose={() => setIsContractModalOpen(false)} />
        </div>
      )}
    </PageWrapper>
  );
};
