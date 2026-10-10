import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api, API_BASE_URL } from '../services/api';
import { getToken } from '../services/tokenStorage';
import { Alert, Badge, Button, ContentCard, EmptyState, FilterLineSegmented, Input, PageWrapper, PanelCard, SectionTitle, StatCard, StatGrid, Tabs } from '../components/UI';
import {
  CheckCircle, Zap, Crown, Clock, Copy, ExternalLink,
  Loader2, AlertTriangle, Check, X,
  CreditCard, QrCode, Calendar, Shield, ArrowRight, ArrowLeft,
  Receipt, Download, FileText, LogOut,
} from 'lucide-react';

interface SubStatus {
  subscription_type: 'free' | 'trial' | 'paid' | 'exempt';
  is_active: boolean;
  days_left: number | null;
  total_days: number | null;
  is_in_grace?: boolean;
  grace_days_left?: number | null;
  trial_ends_at: string | null;
  expires_at: string | null;
  last_billing_at: string | null;
  plan_id: number | null;
  plan_name: string | null;
  plan_price: number | null;
  plan_features: string[];
  has_payment_configured: boolean;
  mercadopago_available: boolean;
  asaas_available: boolean;
  document_ok: boolean;
}

interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  max_users: number;
  max_patients: number;
  features: string[];
  highlighted?: boolean;
}

interface Checkout {
  preference_id?: string;
  payment_url: string | null;
  pix_qr_code: string | null;
  pix_qr_code_base64: string | null;
  pix_payment_id: string | null;
  amount: number;
  plan_name: string;
  description: string;
  provider: 'mercadopago' | 'asaas';
}

interface Invoice {
  id: number;
  plan_name: string | null;
  period: 'monthly' | 'annual';
  amount: number;
  method: 'pix' | 'card' | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  paid_at: string | null;
  created_at: string;
}

function applyCpfCnpjMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function ProgressBar({ value, total, warning = false }: { value: number; total: number; warning?: boolean }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
  const barColor = warning ? 'bg-red-500' : pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const STATUS_BADGE: Record<Invoice['status'], { label: string; color: 'success' | 'warning' | 'danger' | 'default'; Icon: any }> = {
  approved: { label: 'Paga', color: 'success', Icon: CheckCircle },
  pending: { label: 'Pendente', color: 'warning', Icon: Clock },
  rejected: { label: 'Rejeitada', color: 'danger', Icon: X },
  cancelled: { label: 'Cancelada', color: 'default', Icon: X },
};

const ASSINATURA_TABS = [
  { id: 'plano', label: 'Plano', icon: Crown },
  { id: 'extrato', label: 'Extrato de pagamentos', icon: Receipt },
] as const;
type AssinaturaTab = typeof ASSINATURA_TABS[number]['id'];

export function Assinatura() {
  const { user, logout } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<SubStatus | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [provider, setProvider] = useState<'mercadopago' | 'asaas'>('mercadopago');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [copied, setCopied] = useState(false);
  const [polling, setPolling] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [planChangedTo, setPlanChangedTo] = useState<string | null>(null);
  const [reloadCountdown, setReloadCountdown] = useState<number | null>(null);
  const [documentInput, setDocumentInput] = useState('');
  const [savingDocument, setSavingDocument] = useState(false);
  const [activeTab, setActiveTab] = useState<AssinaturaTab>('plano');

  const returnStatus = searchParams.get('status');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sub, plansData, invoicesData] = await Promise.all([
        api.get<SubStatus>('/subscription/status'),
        api.get<Plan[]>('/plans'),
        api.get<Invoice[]>('/subscription/my-invoices').catch(() => []),
      ]);
      setStatus(sub);
      // Se só um gateway estiver configurado pela plataforma, usa ele direto
      // — não faz sentido mostrar a escolha entre os dois.
      if (sub.mercadopago_available && !sub.asaas_available) setProvider('mercadopago');
      else if (sub.asaas_available && !sub.mercadopago_available) setProvider('asaas');
      setPlans(plansData);
      setInvoices(invoicesData);
      if (plansData.length > 0) {
        const highlighted = plansData.find(p => p.highlighted) || plansData[0];
        setSelectedPlan(highlighted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Polling quando tem PIX pendente
  useEffect(() => {
    if (!checkout?.pix_payment_id || !polling) return;
    const planBeforePayment = status?.plan_id;
    const interval = setInterval(async () => {
      try {
        const endpoint = checkout.provider === 'asaas'
          ? `/subscription/check-payment-asaas/${checkout.pix_payment_id}`
          : `/subscription/check-payment/${checkout.pix_payment_id}`;
        const d = await api.get<any>(endpoint);
        const isPaid = checkout.provider === 'asaas'
          ? ['CONFIRMED', 'RECEIVED'].includes(d.status)
          : d.status === 'approved';
        if (isPaid) {
          setPolling(false);
          setPaymentDone(true);
          setTimeout(async () => {
            const newSub = await api.get<SubStatus>('/subscription/status').catch(() => null);
            if (newSub && planBeforePayment != null && newSub.plan_id !== planBeforePayment) {
              // Plano mudou de verdade — o menu/permissões/features do usuário (carregados
              // no login) ficam desatualizados até um reload completo da página.
              setPlanChangedTo(newSub.plan_name || 'novo plano');
              setReloadCountdown(5);
            } else {
              loadData();
              setCheckout(null);
            }
          }, 2000);
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [checkout, polling, loadData, status]);

  // Contagem regressiva de reload automático após mudança de plano confirmada
  useEffect(() => {
    if (reloadCountdown === null) return;
    if (reloadCountdown <= 0) { window.location.reload(); return; }
    const t = setTimeout(() => setReloadCountdown(c => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [reloadCountdown]);

  const saveDocument = async () => {
    if (!documentInput.trim()) return;
    setSavingDocument(true);
    try {
      await api.post('/subscription/document', { cnpj_cpf: documentInput.trim() });
      pushToast('success', 'CPF/CNPJ atualizado!');
      setDocumentInput('');
      loadData();
    } catch (e: any) {
      pushToast('error', e?.message || 'CPF/CNPJ inválido.');
    } finally {
      setSavingDocument(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPlan) return;
    setCheckoutLoading(true);
    try {
      const data = await api.post<any>('/subscription/checkout', {
        plan_id: selectedPlan.id,
        period,
        provider,
      });
      // Normaliza a resposta da Asaas pro mesmo formato usado pelo Mercado Pago,
      // pra não precisar duplicar toda a renderização/polling abaixo.
      const normalized: Checkout = provider === 'asaas'
        ? {
            payment_url: data.invoice_url || null,
            pix_qr_code: data.pix_copy_paste || null,
            pix_qr_code_base64: data.pix_qr_code_base64 || null,
            pix_payment_id: data.payment_id || null,
            amount: data.amount,
            plan_name: data.plan_name,
            description: data.description,
            provider: 'asaas',
          }
        : { ...data, provider: 'mercadopago' };
      setCheckout(normalized);
      setPolling(true);
    } catch (e: any) {
      pushToast('error', e?.message || 'Erro ao gerar cobrança. Entre em contato com o suporte.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const copyPix = () => {
    if (!checkout?.pix_qr_code) return;
    navigator.clipboard.writeText(checkout.pix_qr_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const downloadReceipt = async (invoiceId: number) => {
    setDownloadingId(invoiceId);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/subscription/invoices/${invoiceId}/receipt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprovante-${invoiceId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      pushToast('error', 'Erro ao baixar comprovante.');
    } finally {
      setDownloadingId(null);
    }
  };

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };
  const fmtDateShort = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const fmtPrice = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) {
    return (
      <PageWrapper>
        <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin" />Carregando…
        </div>
      </PageWrapper>
    );
  }

  const isTrial = status?.subscription_type === 'trial';
  const isPaid = status?.subscription_type === 'paid';
  const isExempt = status?.subscription_type === 'exempt';
  const isInGrace = !!status?.is_in_grace;
  const daysLeft = status?.days_left ?? 0;
  const totalDays = status?.total_days ?? 14;
  const isUrgent = !isInGrace && daysLeft <= 3;

  const statusLabel = isExempt ? 'Cortesia' : isInGrace ? 'Assinatura Vencida' : isPaid ? 'Assinatura Ativa' : isTrial ? 'Período de Teste' : 'Sem Assinatura';
  const statusBadge = isInGrace
    ? `${status?.grace_days_left ?? 0}d de carência`
    : isPaid
      ? `${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`
      : isTrial
        ? `${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`
        : 'Expirado';
  const statusColor: 'danger' | 'success' | 'default' = isInGrace || (isUrgent && !isPaid) ? 'danger' : isPaid || isExempt ? 'success' : 'default';

  return (
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          title="Assinatura"
          description={[statusLabel, status?.plan_name].filter(Boolean).join(' · ')}
          icon={Crown}
          action={
            <>
              <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate(-1)}>Voltar</Button>
              <Button variant="outline" size="sm" iconLeft={<LogOut size={14} />} onClick={logout}>Sair</Button>
            </>
          }
        />

        {/* ── Plano mudou: avisa e recarrega a página para atualizar menu/permissões ── */}
        {planChangedTo && (
          <Alert variant="info" title={`Pagamento confirmado — plano atualizado para ${planChangedTo}!`}>
            Atualizando sua tela para liberar os novos recursos... ({reloadCountdown}s)
          </Alert>
        )}

        {/* ── Sucesso de pagamento (sem mudança de plano — ex: renovação do mesmo plano) ── */}
        {!planChangedTo && (returnStatus === 'success' || paymentDone) && (
          <Alert variant="success" title="Pagamento confirmado!">
            Sua assinatura está ativa. Aproveite o Plaelo sem limitações.
          </Alert>
        )}

        {/* ── Alerta de carência (vencida mas ainda dentro do prazo de 3 dias) ── */}
        {isInGrace && (
          <Alert variant="error" title="Sua assinatura venceu">
            Você ainda tem acesso por {status?.grace_days_left ?? 0} dia{(status?.grace_days_left ?? 0) !== 1 ? 's' : ''}. Renove agora para não perder o acesso ao sistema.
          </Alert>
        )}

        {/* ── Status da assinatura ── */}
        <ContentCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isPaid || isExempt ? <Crown size={14} className="text-primary-600" /> : <Clock size={14} className="text-slate-400" />}
                <span className="text-xs font-medium text-slate-600">{statusLabel}</span>
              </div>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {(isPaid || isExempt) ? (status?.plan_name || 'Plano Ativo') : 'Plaelo Free Trial'}
              </p>
              {isPaid && !isInGrace && status?.expires_at && (
                <p className="mt-0.5 text-[11px] text-slate-500">Válida até {fmtDate(status.expires_at)}</p>
              )}
              {isInGrace && status?.expires_at && (
                <p className="mt-0.5 text-[11px] text-slate-500">Venceu em {fmtDate(status.expires_at)}</p>
              )}
              {isTrial && status?.trial_ends_at && (
                <p className="mt-0.5 text-[11px] text-slate-500">Expira em {fmtDate(status.trial_ends_at)}</p>
              )}
              {isExempt && (
                <p className="mt-0.5 text-[11px] text-slate-500">Isenta de cobrança — acesso sempre liberado</p>
              )}
            </div>
            {!isExempt && <Badge color={statusColor} dot>{statusBadge}</Badge>}
          </div>

          {(isTrial || isPaid) && !isExempt && daysLeft !== null && (
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{isTrial ? 'Teste gratuito' : 'Período atual'}</span>
                <span className="font-medium">{daysLeft} de {totalDays} dias</span>
              </div>
              <ProgressBar value={daysLeft} total={totalDays} warning={isUrgent || isInGrace} />
              {isUrgent && isTrial && (
                <p className="text-xs font-medium text-red-600">Assine agora para não perder o acesso ao sistema!</p>
              )}
            </div>
          )}
        </ContentCard>

        {(isPaid || isExempt) && (
          <StatGrid cols={4}>
            <StatCard title="Plano" value={status?.plan_name || '—'} icon={Crown} />
            <StatCard title="Valor" value={status?.plan_price != null ? fmtPrice(status.plan_price) + '/mês' : 'Isento'} icon={CreditCard} color="info" />
            <StatCard title="Último pagamento" value={fmtDateShort(status?.last_billing_at || null)} icon={Receipt} color="success" />
            <StatCard title="Vencimento" value={isExempt ? 'Sem vencimento' : fmtDateShort(status?.expires_at || null)} icon={Calendar} color={isInGrace ? 'danger' : 'default'} />
          </StatGrid>
        )}

        <Tabs<AssinaturaTab>
          items={ASSINATURA_TABS}
          value={activeTab}
          onChange={setActiveTab}
          label="Seções da assinatura"
        >
          {activeTab === 'plano' && (
            <div className="space-y-3">
              {/* ── Checkout ativo ── */}
              {checkout && !paymentDone && (
                <PanelCard
                  title={checkout.description}
                  description={fmtPrice(checkout.amount)}
                  icon={CreditCard}
                  action={polling
                    ? <Badge color="warning" icon={<Loader2 size={11} className="animate-spin" />}>Aguardando</Badge>
                    : <Badge color="success" icon={<CheckCircle size={11} />}>Confirmado</Badge>}
                >
                  <div className="space-y-3 p-3">
                    {checkout.pix_qr_code_base64 && (
                      <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <QrCode size={14} /> PIX (instantâneo e gratuito)
                        </div>
                        <img src={checkout.pix_qr_code_base64} alt="QR Code PIX" className="h-44 w-44 rounded-lg" />
                        <p className="text-center text-xs text-slate-500">Escaneie com o app do banco para pagar na hora</p>
                        {checkout.pix_qr_code && (
                          <Button variant="outline" size="sm" iconLeft={<Copy size={14} />} onClick={copyPix}>
                            {copied ? 'Copiado!' : 'Copiar código PIX'}
                          </Button>
                        )}
                      </div>
                    )}

                    {checkout.payment_url && (
                      <div className="space-y-2">
                        <p className="text-center text-xs font-medium text-slate-500">ou pague com cartão</p>
                        <a href={checkout.payment_url} target="_blank" rel="noreferrer"
                          className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary-600 text-xs font-medium text-white transition-colors hover:bg-primary-700">
                          <CreditCard size={14} /> Pagar com cartão de crédito
                          <ExternalLink size={12} className="opacity-70" />
                        </a>
                      </div>
                    )}

                    <Button variant="ghost" size="sm" fullWidth onClick={() => { setCheckout(null); setPolling(false); }}>
                      Cancelar e escolher outro plano
                    </Button>
                  </div>
                </PanelCard>
              )}

              {/* ── Planos disponíveis (oculta quando checkout ativo, pago ou isento) ── */}
              {!checkout && !paymentDone && !isExempt && plans.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm font-medium text-slate-900">
                      {isPaid ? 'Trocar de plano' : 'Escolha seu plano'}
                    </h2>
                    <FilterLineSegmented<'monthly' | 'annual'>
                      value={period}
                      onChange={setPeriod}
                      options={[
                        { value: 'monthly', label: 'Mensal' },
                        { value: 'annual', label: 'Anual -15%' },
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {plans.map(plan => {
                      const isSelected = selectedPlan?.id === plan.id;
                      const monthlyPrice = period === 'annual' ? plan.price * 0.85 : plan.price;
                      const isCurrentPlan = status?.plan_id === plan.id && isPaid;

                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlan(plan)}
                          className={`flex flex-col rounded-lg border p-3 text-left transition-all ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">{plan.name}</span>
                            {plan.highlighted && <Badge color="primary" size="sm">Popular</Badge>}
                            {isCurrentPlan && <Badge color="success" size="sm">Atual</Badge>}
                          </div>
                          {plan.description && <p className="mb-2 text-xs text-slate-500">{plan.description}</p>}

                          <p className="mt-1 text-base font-medium text-slate-900">{fmtPrice(monthlyPrice)}<span className="text-xs font-normal text-slate-500">/mês</span></p>
                          {period === 'annual' && (
                            <p className="mt-0.5 text-[11px] font-medium text-emerald-600">{fmtPrice(plan.price * 12 * 0.85)}/ano</p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {plan.features?.slice(0, 6).map((f, i) => (
                              <span key={i} className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                                <Check size={10} className="text-emerald-500" /> {f}
                              </span>
                            ))}
                            {(plan.features?.length || 0) > 6 && (
                              <span className="px-2 py-0.5 text-[11px] text-slate-400">+{plan.features.length - 6} mais</span>
                            )}
                          </div>
                          <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
                            <span>{plan.max_users} usuário{plan.max_users !== 1 ? 's' : ''}</span>
                            <span>•</span>
                            <span>{plan.max_patients} pacientes</span>
                          </div>
                          {isSelected && (
                            <div className="mt-3 flex items-center gap-1.5 border-t border-primary-200 pt-3 text-xs font-medium text-primary-700">
                              <CheckCircle size={14} /> Plano selecionado
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Botão assinar */}
                  {selectedPlan && (
                    <ContentCard className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{selectedPlan.name} · {period === 'monthly' ? 'Mensal' : 'Anual'}</p>
                          <p className="text-xs text-slate-500">
                            {period === 'annual'
                              ? `${fmtPrice(selectedPlan.price * 12 * 0.85)} cobrado uma vez (economize 15%)`
                              : `${fmtPrice(selectedPlan.price)}/mês`}
                          </p>
                        </div>
                        <p className="text-base font-medium text-primary-700">
                          {fmtPrice(period === 'annual' ? selectedPlan.price * 0.85 : selectedPlan.price)}
                          <span className="text-xs font-normal text-slate-500">/mês</span>
                        </p>
                      </div>

                      {!!status?.mercadopago_available && !!status?.asaas_available && (
                        <FilterLineSegmented<'mercadopago' | 'asaas'>
                          value={provider}
                          onChange={setProvider}
                          options={[
                            { value: 'mercadopago', label: 'Mercado Pago' },
                            { value: 'asaas', label: 'Asaas' },
                          ]}
                        />
                      )}

                      {provider === 'asaas' && status && !status.document_ok && (
                        <Alert variant="warning" title="CPF/CNPJ inválido ou não cadastrado">
                          <p>A Asaas exige um documento válido para gerar a cobrança. Informe o CPF/CNPJ da clínica abaixo:</p>
                          <div className="mt-2 flex gap-2">
                            <Input
                              type="text"
                              aria-label="CPF ou CNPJ"
                              value={documentInput}
                              onChange={e => setDocumentInput(applyCpfCnpjMask(e.target.value))}
                              placeholder="CPF ou CNPJ"
                              wrapperClassName="flex-1"
                              className="font-mono"
                            />
                            <Button
                              variant="primary"
                              size="md"
                              onClick={saveDocument}
                              loading={savingDocument}
                              disabled={savingDocument || !documentInput.trim()}
                            >
                              Salvar
                            </Button>
                          </div>
                        </Alert>
                      )}

                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        onClick={handleCheckout}
                        loading={checkoutLoading}
                        loadingText="Gerando cobrança..."
                        disabled={checkoutLoading || (provider === 'asaas' && !status?.document_ok)}
                        iconLeft={<Zap size={14} />}
                        iconRight={<ArrowRight size={14} />}
                      >
                        Assinar agora com PIX ou Cartão
                      </Button>

                      <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1"><Shield size={11} /> Pagamento seguro via {provider === 'asaas' ? 'Asaas' : 'Mercado Pago'}</span>
                        <span className="flex items-center gap-1"><CheckCircle size={11} /> PIX instantâneo</span>
                        <span className="flex items-center gap-1"><CreditCard size={11} /> Cartão aceito</span>
                      </div>
                    </ContentCard>
                  )}
                </div>
              )}

              {/* ── Sem planos cadastrados ── */}
              {!checkout && !isExempt && plans.length === 0 && (
                <ContentCard>
                  <EmptyState icon={Crown} title="Nenhum plano disponível no momento." description="Entre em contato com o suporte para assinar." />
                </ContentCard>
              )}

              <p className="text-center text-xs text-slate-500">
                Dúvidas sobre a assinatura? Entre em contato: <span className="font-medium text-primary-600">suporte@psiflux.com.br</span>
              </p>
            </div>
          )}

          {activeTab === 'extrato' && (
            <ContentCard padding="none">
              {invoices.length === 0 ? (
                <EmptyState icon={Receipt} title="Nenhum pagamento registrado ainda." />
              ) : (
                <div className="divide-y divide-slate-100">
                  {invoices.map(inv => {
                    const badge = STATUS_BADGE[inv.status];
                    return (
                      <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-slate-800">{inv.plan_name || 'Plano'}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {inv.period === 'annual' ? 'Anual' : 'Mensal'} · {inv.method === 'pix' ? 'Pix' : inv.method === 'card' ? 'Cartão' : '—'} · {fmtDateShort(inv.paid_at || inv.created_at)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge color={badge.color} size="sm" icon={<badge.Icon size={10} />}>{badge.label}</Badge>
                          <span className="text-xs font-semibold tabular-nums text-slate-800">{fmtPrice(Number(inv.amount))}</span>
                          {inv.status === 'approved' && (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => downloadReceipt(inv.id)}
                              loading={downloadingId === inv.id}
                              disabled={downloadingId === inv.id}
                              iconLeft={<Download size={14} />}
                            >
                              Comprovante (PDF)
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ContentCard>
          )}
        </Tabs>
      </div>
    </PageWrapper>
  );
}
