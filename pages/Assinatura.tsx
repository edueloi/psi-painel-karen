import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api, API_BASE_URL } from '../services/api';
import { getToken } from '../services/tokenStorage';
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
    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const STATUS_BADGE: Record<Invoice['status'], { label: string; cls: string; Icon: any }> = {
  approved: { label: 'Paga', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', Icon: CheckCircle },
  pending: { label: 'Pendente', cls: 'bg-amber-50 text-amber-700 border-amber-100', Icon: Clock },
  rejected: { label: 'Rejeitada', cls: 'bg-red-50 text-red-700 border-red-100', Icon: X },
  cancelled: { label: 'Cancelada', cls: 'bg-slate-100 text-slate-500 border-slate-200', Icon: X },
};

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
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-violet-500" />
      </div>
    );
  }

  const isTrial = status?.subscription_type === 'trial';
  const isPaid = status?.subscription_type === 'paid';
  const isExempt = status?.subscription_type === 'exempt';
  const isInGrace = !!status?.is_in_grace;
  const daysLeft = status?.days_left ?? 0;
  const totalDays = status?.total_days ?? 14;
  const isUrgent = !isInGrace && daysLeft <= 3;

  return (
    <div className="max-w-full 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

      {/* ── Voltar / Sair ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>

      {/* ── Plano mudou: avisa e recarrega a página para atualizar menu/permissões ── */}
      {planChangedTo && (
        <div className="flex items-center gap-3 p-4 bg-violet-50 border border-violet-200 rounded-2xl">
          <Loader2 size={20} className="text-violet-600 shrink-0 animate-spin" />
          <div>
            <p className="font-bold text-violet-800 text-sm">Pagamento confirmado — plano atualizado para {planChangedTo}!</p>
            <p className="text-xs text-violet-600">Atualizando sua tela para liberar os novos recursos... ({reloadCountdown}s)</p>
          </div>
        </div>
      )}

      {/* ── Sucesso de pagamento (sem mudança de plano — ex: renovação do mesmo plano) ── */}
      {!planChangedTo && (returnStatus === 'success' || paymentDone) && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <CheckCircle size={20} className="text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold text-emerald-800 text-sm">Pagamento confirmado!</p>
            <p className="text-xs text-emerald-600">Sua assinatura está ativa. Aproveite o Plaelo sem limitações.</p>
          </div>
        </div>
      )}

      {/* ── Alerta de carência (vencida mas ainda dentro do prazo de 3 dias) ── */}
      {isInGrace && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <AlertTriangle size={20} className="text-red-600 shrink-0" />
          <div>
            <p className="font-bold text-red-800 text-sm">Sua assinatura venceu</p>
            <p className="text-xs text-red-600">
              Você ainda tem acesso por {status?.grace_days_left ?? 0} dia{(status?.grace_days_left ?? 0) !== 1 ? 's' : ''}. Renove agora para não perder o acesso ao sistema.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        {/* ── Coluna principal ── */}
        <div className="space-y-6 min-w-0">
          {/* ── Card: Status da Assinatura ── */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className={`p-5 sm:p-6 ${isExempt ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600' : isInGrace ? 'bg-gradient-to-r from-red-600 to-rose-600' : isPaid ? 'bg-gradient-to-r from-violet-600 to-indigo-600' : isUrgent ? 'bg-gradient-to-r from-red-600 to-rose-600' : 'bg-gradient-to-r from-slate-700 to-slate-800'}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {isPaid || isExempt ? <Crown size={16} className="text-yellow-300" /> : <Clock size={16} className="text-slate-300" />}
                    <span className="text-xs font-bold uppercase tracking-widest text-white/70">
                      {isExempt ? 'Cortesia' : isInGrace ? 'Assinatura Vencida' : isPaid ? 'Assinatura Ativa' : isTrial ? 'Período de Teste' : 'Sem Assinatura'}
                    </span>
                  </div>
                  <p className="text-white font-black text-base sm:text-xl">
                    {(isPaid || isExempt) ? (status?.plan_name || 'Plano Ativo') : 'Plaelo Free Trial'}
                  </p>
                  {isPaid && !isInGrace && status?.expires_at && (
                    <p className="text-white/70 text-xs mt-1">Válida até {fmtDate(status.expires_at)}</p>
                  )}
                  {isInGrace && status?.expires_at && (
                    <p className="text-white/70 text-xs mt-1">Venceu em {fmtDate(status.expires_at)}</p>
                  )}
                  {isTrial && status?.trial_ends_at && (
                    <p className="text-white/70 text-xs mt-1">Expira em {fmtDate(status.trial_ends_at)}</p>
                  )}
                  {isExempt && (
                    <p className="text-white/70 text-xs mt-1">Isenta de cobrança — acesso sempre liberado</p>
                  )}
                </div>
                {!isExempt && (
                  <div className={`px-3 py-1.5 rounded-xl text-xs font-black ${isInGrace ? 'bg-white/20 text-white' : isPaid ? 'bg-white/20 text-white' : isUrgent ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80'}`}>
                    {isInGrace
                      ? `⚠ ${status?.grace_days_left ?? 0}d de carência`
                      : isPaid
                        ? `${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`
                        : isTrial
                          ? isUrgent ? `⚠ ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}` : `${daysLeft} dias`
                          : 'Expirado'}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {/* Barra de progresso */}
              {(isTrial || isPaid) && !isExempt && daysLeft !== null && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{isTrial ? 'Teste gratuito' : 'Período atual'}</span>
                    <span className="font-bold">{daysLeft} de {totalDays} dias</span>
                  </div>
                  <ProgressBar value={daysLeft} total={totalDays} warning={isUrgent || isInGrace} />
                  {isUrgent && isTrial && (
                    <p className="text-xs text-red-600 font-semibold">Assine agora para não perder o acesso ao sistema!</p>
                  )}
                </div>
              )}

              {/* Info plano — grid com mais detalhes */}
              {(isPaid || isExempt) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Plano</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{status?.plan_name || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Valor</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{status?.plan_price != null ? fmtPrice(status.plan_price) + '/mês' : 'Isento'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Último pagamento</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{fmtDateShort(status?.last_billing_at || null)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Vencimento</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{isExempt ? 'Sem vencimento' : fmtDateShort(status?.expires_at || null)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Checkout ativo ── */}
          {checkout && !paymentDone && (
            <div className="bg-white rounded-2xl border border-violet-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-violet-100 bg-violet-50 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-black text-violet-900 text-sm">{checkout.description}</p>
                  <p className="text-xs text-violet-600 mt-0.5">{fmtPrice(checkout.amount)}</p>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${polling ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {polling ? <><Loader2 size={11} className="animate-spin" /> Aguardando</> : <><CheckCircle size={11} /> Confirmado</>}
                </div>
              </div>
              <div className="p-5 sm:p-6 space-y-4">
                {/* QR Code PIX */}
                {checkout.pix_qr_code_base64 && (
                  <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <QrCode size={16} /> PIX (instantâneo e gratuito)
                    </div>
                    <img src={checkout.pix_qr_code_base64} alt="QR Code PIX" className="w-44 h-44 rounded-xl" />
                    <p className="text-xs text-slate-500 text-center">Escaneie com o app do banco para pagar na hora</p>
                    {checkout.pix_qr_code && (
                      <button onClick={copyPix} className="flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-800">
                        <Copy size={12} /> {copied ? 'Copiado!' : 'Copiar código PIX'}
                      </button>
                    )}
                  </div>
                )}

                {/* Link de pagamento por cartão */}
                {checkout.payment_url && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 text-center">ou pague com cartão</p>
                    <a href={checkout.payment_url} target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-black rounded-xl transition-all">
                      <CreditCard size={15} /> Pagar com cartão de crédito
                      <ExternalLink size={12} className="opacity-70" />
                    </a>
                  </div>
                )}

                <button onClick={() => { setCheckout(null); setPolling(false); }}
                  className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 py-1">
                  Cancelar e escolher outro plano
                </button>
              </div>
            </div>
          )}

          {/* ── Planos disponíveis (oculta quando checkout ativo, pago ou isento) ── */}
          {!checkout && !paymentDone && !isExempt && plans.length > 0 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="font-black text-slate-800 text-lg">
                  {isPaid ? 'Trocar de plano' : 'Escolha seu plano'}
                </h2>
                {/* Toggle mensal/anual */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                  <button
                    onClick={() => setPeriod('monthly')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                  >
                    Mensal
                  </button>
                  <button
                    onClick={() => setPeriod('annual')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period === 'annual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                  >
                    Anual <span className="text-emerald-600 font-black">-15%</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3">
                {plans.map(plan => {
                  const isSelected = selectedPlan?.id === plan.id;
                  const monthlyPrice = period === 'annual' ? plan.price * 0.85 : plan.price;
                  const isCurrentPlan = status?.plan_id === plan.id && isPaid;

                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`text-left rounded-2xl border-2 p-5 transition-all flex flex-col ${
                        isSelected
                          ? 'border-violet-500 bg-violet-50 shadow-lg shadow-violet-500/10'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-black text-slate-900 text-base">{plan.name}</span>
                        {plan.highlighted && (
                          <span className="px-2 py-0.5 text-[10px] font-black bg-violet-600 text-white rounded-full uppercase tracking-wider">Popular</span>
                        )}
                        {isCurrentPlan && (
                          <span className="px-2 py-0.5 text-[10px] font-black bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">Atual</span>
                        )}
                      </div>
                      {plan.description && <p className="text-xs text-slate-500 mb-3">{plan.description}</p>}

                      <p className="font-black text-slate-900 text-base sm:text-xl mt-1">{fmtPrice(monthlyPrice)}<span className="text-xs font-bold text-slate-400">/mês</span></p>
                      {period === 'annual' && (
                        <p className="text-[11px] text-emerald-600 font-bold mt-0.5">{fmtPrice(plan.price * 12 * 0.85)}/ano</p>
                      )}

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {plan.features?.slice(0, 6).map((f, i) => (
                          <span key={i} className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            <Check size={9} className="text-emerald-500" /> {f}
                          </span>
                        ))}
                        {(plan.features?.length || 0) > 6 && (
                          <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5">+{plan.features.length - 6} mais</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400">
                        <span>{plan.max_users} usuário{plan.max_users !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>{plan.max_patients} pacientes</span>
                      </div>
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t border-violet-200 flex items-center gap-1.5 text-xs font-bold text-violet-700">
                          <CheckCircle size={13} /> Plano selecionado
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Botão assinar */}
              {selectedPlan && (
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{selectedPlan.name} · {period === 'monthly' ? 'Mensal' : 'Anual'}</p>
                      <p className="text-xs text-slate-500">
                        {period === 'annual'
                          ? `${fmtPrice(selectedPlan.price * 12 * 0.85)} cobrado uma vez (economize 15%)`
                          : `${fmtPrice(selectedPlan.price)}/mês`}
                      </p>
                    </div>
                    <p className="font-black text-violet-700 text-lg">
                      {fmtPrice(period === 'annual' ? selectedPlan.price * 0.85 : selectedPlan.price)}
                      <span className="text-xs font-bold text-slate-400">/mês</span>
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setProvider('mercadopago')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${provider === 'mercadopago' ? 'bg-violet-600 text-white border-violet-500' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      Mercado Pago
                    </button>
                    <button onClick={() => setProvider('asaas')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${provider === 'asaas' ? 'bg-teal-600 text-white border-teal-500' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      Asaas
                    </button>
                  </div>

                  {provider === 'asaas' && status && !status.document_ok && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                      <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                        <AlertTriangle size={13} /> CPF/CNPJ inválido ou não cadastrado
                      </p>
                      <p className="text-[11px] text-amber-700">A Asaas exige um documento válido para gerar a cobrança. Informe o CPF/CNPJ da clínica abaixo:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={documentInput}
                          onChange={e => setDocumentInput(applyCpfCnpjMask(e.target.value))}
                          placeholder="CPF ou CNPJ"
                          className="flex-1 px-3 py-2 text-sm border border-amber-200 rounded-xl outline-none focus:border-amber-400 font-mono"
                        />
                        <button
                          onClick={saveDocument}
                          disabled={savingDocument || !documentInput.trim()}
                          className="px-4 py-2 text-xs font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-all disabled:opacity-50"
                        >
                          {savingDocument ? <Loader2 size={13} className="animate-spin" /> : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={checkoutLoading || (provider === 'asaas' && !status?.document_ok)}
                    className="w-full py-4 bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-black text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 disabled:opacity-60"
                  >
                    {checkoutLoading
                      ? <><Loader2 size={16} className="animate-spin" /> Gerando cobrança...</>
                      : <><Zap size={16} /> Assinar agora com PIX ou Cartão <ArrowRight size={15} /></>}
                  </button>

                  <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1"><Shield size={10} /> Pagamento seguro via {provider === 'asaas' ? 'Asaas' : 'Mercado Pago'}</span>
                    <span className="flex items-center gap-1"><CheckCircle size={10} /> PIX instantâneo</span>
                    <span className="flex items-center gap-1"><CreditCard size={10} /> Cartão aceito</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Sem planos cadastrados ── */}
          {!checkout && !isExempt && plans.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">
              <p>Nenhum plano disponível no momento.</p>
              <p className="text-xs mt-1">Entre em contato com o suporte para assinar.</p>
            </div>
          )}
        </div>

        {/* ── Coluna lateral: Extrato de pagamentos ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <Receipt size={16} className="text-violet-600" />
              <p className="font-bold text-slate-800 text-sm">Extrato de pagamentos</p>
            </div>
            {invoices.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">Nenhum pagamento registrado ainda.</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                {invoices.map(inv => {
                  const badge = STATUS_BADGE[inv.status];
                  return (
                    <div key={inv.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{inv.plan_name || 'Plano'}</p>
                          <p className="text-[11px] text-slate-400">{inv.period === 'annual' ? 'Anual' : 'Mensal'} · {inv.method === 'pix' ? 'Pix' : inv.method === 'card' ? 'Cartão' : '—'}</p>
                        </div>
                        <p className="font-black text-slate-800 text-sm shrink-0">{fmtPrice(Number(inv.amount))}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${badge.cls}`}>
                          <badge.Icon size={9} /> {badge.label}
                        </span>
                        <span className="text-[10px] text-slate-400">{fmtDateShort(inv.paid_at || inv.created_at)}</span>
                      </div>
                      {inv.status === 'approved' && (
                        <button
                          onClick={() => downloadReceipt(inv.id)}
                          disabled={downloadingId === inv.id}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-violet-600 hover:text-violet-800 disabled:opacity-50"
                        >
                          {downloadingId === inv.id ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                          Baixar comprovante (PDF)
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Dúvidas / suporte ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center space-y-1">
            <p className="text-xs text-slate-400">Dúvidas sobre a assinatura?</p>
            <p className="text-xs text-slate-500 font-medium">Entre em contato: <span className="text-violet-600">suporte@psiflux.com.br</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
