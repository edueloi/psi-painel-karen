import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Calendar, TrendingUp, Users, ShieldCheck, ChevronLeft, Smartphone, AlertCircle } from 'lucide-react';
import logoUrl from '../../images/logo-sistema/logo.png';
import capaLogoUrl from '../../images/capa-logo.png';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// ── Cartão flutuante genérico usado sobre a foto do painel ──────────────────
const FloatingCard: React.FC<{
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ className = '', style, children }) => (
  <div
    className={`absolute rounded-2xl bg-white shadow-[0_16px_40px_-12px_rgba(76,54,168,0.28)] border border-white/60 px-4 py-3.5 ${className}`}
    style={style}
  >
    {children}
  </div>
);

// Mini gráfico de barras usado no cartão "Agenda inteligente"
const MiniBars = () => (
  <div className="flex items-end gap-[3px] h-6">
    {[6, 10, 8, 16, 12, 20, 15].map((h, i) => (
      <div
        key={i}
        className="w-[3px] rounded-full"
        style={{ height: h, background: i === 5 ? '#6D42F5' : 'rgba(109,66,245,0.28)' }}
      />
    ))}
  </div>
);

// Mini sparkline usado no cartão "Financeiro"
const MiniSparkline = () => (
  <svg width="64" height="20" viewBox="0 0 64 20" fill="none">
    <path
      d="M1 16 L11 12 L21 14 L31 8 L41 9 L51 4 L63 2"
      stroke="#22C55E"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Painel direito — foto real do painel (full-bleed) + cartões flutuantes ──
const PlaeloHeroPanel = () => (
  <div
    className="hidden lg:block w-[58%] xl:w-[60%] relative flex-shrink-0 overflow-hidden"
    style={{ background: 'linear-gradient(160deg, #FBFAFF 0%, #F2EEFF 55%, #ECE6FF 100%)' }}
  >
    {/* Círculos decorativos suaves na faixa clara à esquerda da foto */}
    <div
      className="absolute -top-24 -left-20 w-[420px] h-[420px] rounded-full pointer-events-none"
      style={{ border: '1px solid rgba(109,66,245,0.14)', animation: 'plaeloSpin 60s linear infinite' }}
    />
    <div
      className="absolute -top-10 -left-8 w-[280px] h-[280px] rounded-full pointer-events-none"
      style={{ border: '1px solid rgba(109,66,245,0.10)' }}
    />

    {/* Foto real do painel — cobre a altura inteira do painel, encostada na borda direita */}
    <div className="absolute inset-y-0 right-0 w-[74%] animate-[fadeIn_0.6s_ease-out]">
      <img src={capaLogoUrl} alt="Painel Plaelo em uso" className="w-full h-full object-cover object-[75%_center]" />
    </div>

    {/* Cartão: Agenda inteligente */}
    <FloatingCard
      className="w-[220px]"
      style={{ left: '7%', top: '9%', animation: 'plaeloFloat 5.5s ease-in-out infinite' }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(109,66,245,0.12)', color: '#6D42F5' }}>
          <Calendar size={15} />
        </div>
        <span className="text-[13px] font-bold text-slate-700">Agenda inteligente</span>
      </div>
      <MiniBars />
    </FloatingCard>

    {/* Cartão: Financeiro */}
    <FloatingCard
      className="w-[190px]"
      style={{ left: '3%', top: '25%', animation: 'plaeloFloat 6.2s ease-in-out infinite', animationDelay: '0.9s' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.12)', color: '#16A34A' }}>
          <TrendingUp size={13} />
        </div>
        <span className="text-[11px] font-bold text-slate-500">Financeiro</span>
      </div>
      <p className="text-[10px] text-slate-400 mb-0.5">Receitas do mês</p>
      <div className="flex items-end justify-between gap-2">
        <span className="text-[15px] font-extrabold text-slate-800 tracking-tight">R$ 18.240,00</span>
      </div>
      <div className="mt-1"><MiniSparkline /></div>
    </FloatingCard>

    {/* Cartão: Pacientes ativos */}
    <FloatingCard
      className="w-[188px]"
      style={{ left: '27%', top: '27%', animation: 'plaeloFloat 5.8s ease-in-out infinite', animationDelay: '1.6s' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(109,66,245,0.12)', color: '#6D42F5' }}>
          <Users size={13} />
        </div>
        <span className="text-[11px] font-bold text-slate-500">Pacientes ativos</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-extrabold text-slate-800 tracking-tight">124</span>
        <span className="text-[11px] font-bold text-emerald-500">+12%</span>
      </div>
    </FloatingCard>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
export const Login: React.FC<{ onLogin: () => void }> = () => {
  const { login, isAuthenticated } = useAuth();
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === 'dark';
  const navigate  = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Trava o scroll do documento inteiro enquanto o login está montado — h-screen
  // sozinho não é suficiente em todo navegador (arredondamento de vh com zoom/DPI
  // do SO às vezes sobra 1px e cria uma barra de rolagem fantasma na página).
  React.useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  const [email, setEmail]             = useState(() => localStorage.getItem('psi_remembered_email') || '');
  const [password, setPassword]       = useState('');
  const [remember, setRemember]       = useState(() => !!localStorage.getItem('psi_remembered_email'));
  const [showPass, setShowPass]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [forgot, setForgot]           = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent]   = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  // 2FA States
  const [is2FA, setIs2FA]             = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [tempUserId, setTempUserId]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post<any>('/auth/login', { email, password, remember });

      if (res.requires_2fa) {
          setTempUserId(res.userId);
          setIs2FA(true);
          setLoading(false);
          return;
      }

      if (remember) localStorage.setItem('psi_remembered_email', email);
      else localStorage.removeItem('psi_remembered_email');

      login(res.token, remember);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = (err.message || '').toLowerCase();
      const isBlocked = msg.includes('suspensa') ||
                        msg.includes('desativada') ||
                        msg.includes('inativa') ||
                        msg.includes('clínica') ||
                        msg.includes('forbidden') ||
                        msg.includes('403');

      if (isBlocked) {
        setIsSuspended(true);
      } else {
        setError(err.message || 'E-mail ou senha incorretos.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
        const res = await api.post<any>('/auth/verify-2fa', {
            userId: tempUserId,
            token: twoFactorToken,
            remember,
        });

        if (remember) localStorage.setItem('psi_remembered_email', email);
        login(res.token, remember);
        navigate('/dashboard');
    } catch (err: any) {
        setError(err.message || 'Código 2FA inválido ou expirado.');
    } finally {
        setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSent(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared input class ──────────────────────────────────────────────────────
  const inputCls =
    'w-full pl-11 pr-4 py-3.5 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all duration-200';

  // ── Error banner ────────────────────────────────────────────────────────────
  const ErrorBanner = () =>
    (error || isSuspended) ? (
      <div className={`flex items-start gap-3 border text-sm px-4 py-3 rounded-xl mb-6 ${
        isSuspended
          ? 'bg-amber-50 border-amber-200 text-amber-700'
          : 'bg-red-50 border-red-200 text-red-600'
      }`}>
        {isSuspended
          ? <AlertCircle size={17} className="mt-0.5 flex-shrink-0" />
          : <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />}
        <p className={isSuspended ? 'font-medium' : ''}>
          {isSuspended
            ? 'Sua conta ou clínica foi suspensa. Entre em contato com o suporte para regularizar seu acesso.'
            : error}
        </p>
      </div>
    ) : null;

  return (
    <div className="h-screen w-full flex font-sans overflow-hidden">
      <style>{`
        @keyframes plaeloFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes plaeloSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── LEFT PANEL — formulário ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center bg-white overflow-y-auto px-6 py-6 sm:px-10 sm:py-8 lg:px-14 lg:py-6 xl:px-20 relative z-10">
        <div className="w-full max-w-[420px]">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-5 lg:mb-6 animate-[fadeIn_0.4s_ease-out]">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl overflow-hidden flex-shrink-0 ring-1 ring-indigo-100 shadow-lg bg-white p-2">
              <img src={logoUrl} alt="Plaelo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-black text-[22px] leading-none tracking-tight" style={{ color: '#1e295b' }}>Plaelo</h1>
              <p className="text-[11px] font-medium mt-0.5 text-slate-400">Conectando cuidado e gestão.</p>
            </div>
          </div>

          {/* ── FORGOT PASSWORD ── */}
          {forgot ? (
            <div className="animate-[fadeIn_0.4s_ease-out]">
              <button
                onClick={() => { setForgot(false); setForgotSent(false); setForgotEmail(''); setError(''); }}
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-8 transition-colors"
              >
                <ChevronLeft size={15} /> Voltar ao login
              </button>

              {forgotSent ? (
                <div className="text-center py-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                    style={{ background: 'linear-gradient(135deg, #120C2E, #6D42F5)' }}
                  >
                    <Mail size={26} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">E-mail enviado!</h2>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto mb-6 leading-relaxed">
                    Verifique sua caixa de entrada em{' '}
                    <span className="font-semibold text-slate-700">{forgotEmail}</span>{' '}
                    e siga as instruções para redefinir sua senha.
                  </p>
                  <button
                    onClick={() => { setForgot(false); setForgotSent(false); setError(''); }}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition hover:underline"
                  >
                    Voltar ao login
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-[26px] font-bold text-slate-900 tracking-tight mb-1">Recuperar senha</h2>
                  <p className="text-slate-400 text-sm mb-8">Informe seu e-mail e enviaremos as instruções.</p>
                  <ErrorBanner />
                  <form onSubmit={handleForgot} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        E-mail cadastrado
                      </label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 active:scale-[0.99]"
                      style={{
                        background: 'linear-gradient(135deg, #120C2E 0%, #6D42F5 100%)',
                        boxShadow: '0 8px 24px rgba(109,66,245,0.35)',
                      }}
                    >
                      {loading ? <><Loader2 size={15} className="animate-spin" /> Enviando...</> : 'Enviar instruções'}
                    </button>
                  </form>
                </>
              )}
            </div>

          /* ── 2FA ── */
          ) : is2FA ? (
            <div className="animate-[fadeIn_0.4s_ease-out]">
              <button
                onClick={() => { setIs2FA(false); setTwoFactorToken(''); setError(''); }}
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-8 transition-colors"
              >
                <ChevronLeft size={15} /> Voltar
              </button>

              <div className="mb-8">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: 'linear-gradient(135deg, #120C2E, #6D42F5)', boxShadow: '0 8px 24px rgba(18,12,46,0.35)' }}
                >
                  <ShieldCheck size={30} className="text-white" />
                </div>
                <h2 className="text-[26px] font-bold text-slate-900 tracking-tight mb-1.5">
                  Verificação de Segurança
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Insira o código de 6 dígitos gerado pelo seu aplicativo autenticador.
                </p>
              </div>

              <ErrorBanner />

              <form onSubmit={handle2FAVerify} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Código de Autenticação
                  </label>
                  <div className="relative">
                    <Smartphone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={twoFactorToken}
                      onChange={e => setTwoFactorToken(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="000 000"
                      autoFocus
                      className="w-full pl-11 pr-4 py-4 rounded-xl text-2xl font-black tracking-[0.35em] bg-slate-50 border border-slate-200 text-indigo-600 placeholder:text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-center"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || twoFactorToken.length < 6}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
                  style={{
                    background: 'linear-gradient(135deg, #120C2E 0%, #6D42F5 100%)',
                    boxShadow: '0 8px 24px rgba(109,66,245,0.35)',
                  }}
                >
                  {loading
                    ? <><Loader2 size={15} className="animate-spin" /> Verificando...</>
                    : <>Confirmar e Entrar <ArrowRight size={15} /></>}
                </button>
              </form>
            </div>

          /* ── MAIN LOGIN ── */
          ) : (
            <>
              <div className="mb-5 lg:mb-6 animate-[fadeIn_0.4s_ease-out]">
                <h2 className="text-2xl lg:text-[28px] font-bold text-slate-900 tracking-tight mb-1.5">
                  Bem-vinda de volta
                </h2>
                <p className="text-slate-400 text-sm">
                  Entre com suas credenciais para acessar o painel.
                </p>
              </div>

              <ErrorBanner />

              <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-5">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">E-mail</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Senha</label>
                    <button
                      type="button"
                      onClick={() => setForgot(true)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <label className="flex items-center gap-3 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                  />
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
                      remember ? 'border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'
                    }`}
                    style={remember ? { background: 'linear-gradient(135deg, #120C2E, #6D42F5)' } : {}}
                  >
                    {remember && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-slate-600">Lembrar-me neste dispositivo</span>
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 active:scale-[0.99] mt-1"
                  style={{
                    background: 'linear-gradient(135deg, #120C2E 0%, #6D42F5 100%)',
                    boxShadow: '0 8px 28px rgba(109,66,245,0.40)',
                  }}
                >
                  {loading
                    ? <><Loader2 size={15} className="animate-spin" /> Entrando...</>
                    : <>Entrar <ArrowRight size={15} /></>}
                </button>
              </form>

              {/* Sign-up CTA */}
              <div className="mt-5 lg:mt-6 text-center">
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full mb-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99,85,216,0.08), rgba(139,124,246,0.12))',
                    color: '#120C2E',
                    border: '1px solid rgba(99,85,216,0.2)',
                  }}
                >
                  <span style={{ fontSize: '10px' }}>✦</span>
                  7 dias grátis para testar
                </span>
                <p className="text-sm text-slate-400">
                  Ainda não tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/cadastro')}
                    className="font-semibold text-indigo-600 hover:text-indigo-700 transition hover:underline"
                  >
                    Cadastre-se grátis
                  </button>
                </p>
              </div>

              {/* Security footer */}
              <div className="mt-4 pt-4 lg:mt-5 lg:pt-5 border-t border-slate-100 flex items-center justify-center gap-2">
                <ShieldCheck size={12} className="text-slate-300" />
                <p className="text-[11px] text-slate-400 tracking-wide">
                  Conexão segura · Dados criptografados · LGPD
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL — foto real do painel com cartões flutuantes ────────── */}
      <PlaeloHeroPanel />
    </div>
  );
};
