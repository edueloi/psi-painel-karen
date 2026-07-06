import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import {
  CheckCircle, Zap, Crown, Clock, Copy, ExternalLink,
  Loader2, AlertTriangle, RefreshCw, Star, Check, X,
  CreditCard, QrCode, Calendar, Shield, ArrowRight
} from 'lucide-react';

interface SubStatus {
  subscription_type: 'free' | 'trial' | 'paid';
  is_active: boolean;
  days_left: number | null;
  total_days: number | null;
  trial_ends_at: string | null;
  expires_at: string | null;
  last_billing_at: string | null;
  plan_id: number | null;
  plan_name: string | null;
  plan_price: number | null;
  plan_features: string[];
  has_payment_configured: boolean;
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
  preference_id: string;
  payment_url: string;
  pix_qr_code: string | null;
  pix_qr_code_base64: string | null;
  pix_payment_id: string | null;
  amount: number;
  plan_name: string;
  description: string;
}

function ProgressBar({ value, total, color = 'emerald', warning = false }: { value: number; total: number; color?: string; warning?: boolean }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
  const barColor = warning ? 'bg-red-500' : pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Assinatura() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState<SubStatus | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [copied, setCopied] = useState(false);
  const [polling, setPolling] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  const returnStatus = searchParams.get('status');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sub, plansData] = await Promise.all([
        api.get<SubStatus>('/subscription/status'),
        api.get<Plan[]>('/plans'),
      ]);
      setStatus(sub);
      setPlans(plansData);
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
    const interval = setInterval(async () => {
      try {
        const d = await api.get<any>(`/subscription/check-payment/${checkout.pix_payment_id}`);
        if (d.status === 'approved') {
          setPolling(false);
          setPaymentDone(true);
          setTimeout(() => { loadData(); setCheckout(null); }, 2000);
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [checkout, polling, loadData]);

  const handleCheckout = async () => {
    if (!selectedPlan) return;
    setCheckoutLoading(true);
    try {
      const data = await api.post<Checkout>('/subscription/checkout', {
        plan_id: selectedPlan.id,
        period,
      });
      setCheckout(data);
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

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
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
  const daysLeft = status?.days_left ?? 0;
  const totalDays = status?.total_days ?? 14;
  const isUrgent = daysLeft <= 3;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

      {/* ── Sucesso de pagamento ── */}
      {(returnStatus === 'success' || paymentDone) && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <CheckCircle size={20} className="text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold text-emerald-800 text-sm">Pagamento confirmado!</p>
            <p className="text-xs text-emerald-600">Sua assinatura está ativa. Aproveite o PsiFlux sem limitações.</p>
          </div>
        </div>
      )}

      {/* ── Card: Status da Assinatura ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className={`p-5 ${isPaid ? 'bg-gradient-to-r from-violet-600 to-indigo-600' : isUrgent ? 'bg-gradient-to-r from-red-600 to-rose-600' : 'bg-gradient-to-r from-slate-700 to-slate-800'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isPaid ? <Crown size={16} className="text-yellow-300" /> : <Clock size={16} className="text-slate-300" />}
                <span className="text-xs font-bold uppercase tracking-widest text-white/70">
                  {isPaid ? 'Assinatura Ativa' : isTrial ? 'Período de Teste' : 'Sem Assinatura'}
                </span>
              </div>
              <p className="text-white font-black text-xl">
                {isPaid ? (status?.plan_name || 'Plano Ativo') : 'PsiFlux Free Trial'}
              </p>
              {isPaid && status?.expires_at && (
                <p className="text-white/70 text-xs mt-1">Válida até {fmtDate(status.expires_at)}</p>
              )}
              {isTrial && status?.trial_ends_at && (
                <p className="text-white/70 text-xs mt-1">Expira em {fmtDate(status.trial_ends_at)}</p>
              )}
            </div>
            <div className={`px-3 py-1.5 rounded-xl text-xs font-black ${isPaid ? 'bg-white/20 text-white' : isUrgent ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80'}`}>
              {isPaid
                ? `${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`
                : isTrial
                  ? isUrgent ? `⚠ ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}` : `${daysLeft} dias`
                  : 'Expirado'}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {/* Barra de progresso */}
          {(isTrial || isPaid) && daysLeft !== null && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{isTrial ? 'Teste gratuito' : 'Período atual'}</span>
                <span className="font-bold">{daysLeft} de {totalDays} dias</span>
              </div>
              <ProgressBar value={daysLeft} total={totalDays} warning={isUrgent} />
              {isUrgent && isTrial && (
                <p className="text-xs text-red-600 font-semibold">Assine agora para não perder o acesso ao sistema!</p>
              )}
            </div>
          )}

          {/* Info plano pago */}
          {isPaid && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Plano</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{status?.plan_name || '—'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Último pagamento</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{fmtDate(status?.last_billing_at || null)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Checkout ativo ── */}
      {checkout && !paymentDone && (
        <div className="bg-white rounded-2xl border border-violet-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-violet-100 bg-violet-50 flex items-center justify-between">
            <div>
              <p className="font-black text-violet-900 text-sm">{checkout.description}</p>
              <p className="text-xs text-violet-600 mt-0.5">{fmtPrice(checkout.amount)}</p>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${polling ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {polling ? <><Loader2 size={11} className="animate-spin" /> Aguardando</> : <><CheckCircle size={11} /> Confirmado</>}
            </div>
          </div>
          <div className="p-5 space-y-4">
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

      {/* ── Planos disponíveis (oculta quando checkout ativo ou pago) ── */}
      {!checkout && !paymentDone && plans.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
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

          <div className="space-y-3">
            {plans.map(plan => {
              const isSelected = selectedPlan?.id === plan.id;
              const monthlyPrice = period === 'annual' ? plan.price * 0.85 : plan.price;
              const isCurrentPlan = status?.plan_id === plan.id && isPaid;

              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`w-full text-left rounded-2xl border-2 p-5 transition-all ${
                    isSelected
                      ? 'border-violet-500 bg-violet-50 shadow-lg shadow-violet-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-slate-900 text-base">{plan.name}</span>
                        {plan.highlighted && (
                          <span className="px-2 py-0.5 text-[10px] font-black bg-violet-600 text-white rounded-full uppercase tracking-wider">Popular</span>
                        )}
                        {isCurrentPlan && (
                          <span className="px-2 py-0.5 text-[10px] font-black bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">Atual</span>
                        )}
                      </div>
                      {plan.description && <p className="text-xs text-slate-500 mb-3">{plan.description}</p>}
                      <div className="flex flex-wrap gap-1.5">
                        {plan.features?.slice(0, 5).map((f, i) => (
                          <span key={i} className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            <Check size={9} className="text-emerald-500" /> {f}
                          </span>
                        ))}
                        {(plan.features?.length || 0) > 5 && (
                          <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5">+{plan.features.length - 5} mais</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2.5 text-[11px] text-slate-400">
                        <span>{plan.max_users} usuário{plan.max_users !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>{plan.max_patients} pacientes</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-slate-900 text-xl">
                        {fmtPrice(monthlyPrice)}
                      </p>
                      <p className="text-[10px] text-slate-400">/mês</p>
                      {period === 'annual' && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                          {fmtPrice(plan.price * 12 * 0.85)}/ano
                        </p>
                      )}
                    </div>
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
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
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

              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full py-4 bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-black text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 disabled:opacity-60"
              >
                {checkoutLoading
                  ? <><Loader2 size={16} className="animate-spin" /> Gerando cobrança...</>
                  : <><Zap size={16} /> Assinar agora com PIX ou Cartão <ArrowRight size={15} /></>}
              </button>

              <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><Shield size={10} /> Pagamento seguro via Mercado Pago</span>
                <span className="flex items-center gap-1"><CheckCircle size={10} /> PIX instantâneo</span>
                <span className="flex items-center gap-1"><CreditCard size={10} /> Cartão aceito</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Sem planos cadastrados ── */}
      {!checkout && plans.length === 0 && (
        <div className="text-center py-10 text-slate-400 text-sm">
          <p>Nenhum plano disponível no momento.</p>
          <p className="text-xs mt-1">Entre em contato com o suporte para assinar.</p>
        </div>
      )}

      {/* ── Dúvidas / suporte ── */}
      <div className="text-center space-y-1 pt-2">
        <p className="text-xs text-slate-400">Dúvidas sobre a assinatura?</p>
        <p className="text-xs text-slate-500 font-medium">Entre em contato: <span className="text-violet-600">suporte@psiflux.com.br</span></p>
      </div>
    </div>
  );
}
