import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, Calendar, Sparkles, TrendingUp, ShieldCheck, ChevronLeft, Smartphone, AlertCircle } from 'lucide-react';
import logoUrl from '../../images/logo-sistema/logo.png';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// ── Floating collage illustration (mesma linguagem visual do site público) ──
const PlaeloIllustration = () => (
  <div className="relative w-full max-w-md mx-auto" style={{ minHeight: 320 }}>
    <div className="absolute rounded-3xl shadow-2xl p-5" style={{ top: 0, left: '2%', width: '68%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(6px)' }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.18)', color: '#C4B5FD' }}>
          <Calendar size={16} />
        </div>
        <span className="text-sm font-bold" style={{ color: '#E0DEFF' }}>Agenda de hoje</span>
      </div>
      {[['09:00', 'Sessão · Ana P.'], ['10:30', 'Retorno · Marcos S.'], ['14:00', 'Avaliação · Beatriz L.']].map(([time, label]) => (
        <div key={time} className="flex gap-2.5 text-xs py-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ color: '#A78BFA', fontWeight: 700 }}>{time}</span>
          <span style={{ color: 'rgba(224,222,255,0.6)' }}>{label}</span>
        </div>
      ))}
    </div>

    <div className="absolute rounded-3xl shadow-2xl p-5" style={{ top: '42%', right: '0%', width: '56%', transform: 'rotate(2deg)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(6px)' }}>
      <div className="flex items-center gap-2 mb-1.5" style={{ color: '#6EE7B7' }}>
        <TrendingUp size={16} />
        <span className="text-xs font-bold">Financeiro do mês</span>
      </div>
      <div className="text-2xl font-extrabold tracking-tight" style={{ color: '#fff' }}>R$ 18.240</div>
      <div className="text-xs mt-0.5" style={{ color: 'rgba(224,222,255,0.5)' }}>42 atendimentos</div>
    </div>

    <div className="absolute rounded-3xl shadow-2xl p-5" style={{ bottom: 0, left: '12%', width: '64%', transform: 'rotate(-2deg)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(6px)' }}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(110,231,183,0.15)', color: '#6EE7B7' }}>
          <Sparkles size={13} />
        </div>
        <span className="text-xs font-bold" style={{ color: '#E0DEFF' }}>Aurora IA</span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'rgba(224,222,255,0.6)' }}>
        "Resumo da última sessão pronto para revisão."
      </p>
    </div>
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
      const res = await api.post<any>('/auth/login', { email, password });

      if (res.requires_2fa) {
          setTempUserId(res.userId);
          setIs2FA(true);
          setLoading(false);
          return;
      }

      if (remember) localStorage.setItem('psi_remembered_email', email);
      else localStorage.removeItem('psi_remembered_email');

      login(res.token);
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
            token: twoFactorToken
        });

        if (remember) localStorage.setItem('psi_remembered_email', email);
        login(res.token);
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
    <div className="min-h-screen w-full flex font-sans overflow-hidden">

      {/* ── LEFT PANEL — dark, illustrated ───────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden flex-shrink-0"
        style={{ background: 'linear-gradient(160deg, #120C2E 0%, #2A1F6B 100%)' }}
      >
        {/* Background glow layers */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 40% 35%, rgba(109,66,245,0.22) 0%, transparent 70%), ' +
              'radial-gradient(ellipse 50% 50% at 75% 70%, rgba(18,183,106,0.12) 0%, transparent 65%)',
          }}
        />

        {/* Top-left logo */}
        <div className="relative z-10 flex items-center gap-3 p-10">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 ring-1 ring-white/10 shadow-2xl bg-white p-2">
            <img src={logoUrl} alt="Plaelo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-[26px] leading-none tracking-tight" style={{ fontWeight: 900, color: '#E0DEFF' }}>
              Plaelo
            </h1>
            <p className="text-[11px] font-medium tracking-wide mt-0.5" style={{ color: 'rgba(167,139,250,0.6)' }}>
              Conectando cuidado e gestão.
            </p>
          </div>
        </div>

        {/* Center illustration */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-10 -mt-6">
          <div className="w-full max-w-[420px]">
            <PlaeloIllustration />
          </div>
          <div className="text-center mt-8 px-6">
            <h2 className="text-xl font-bold text-white/90 tracking-tight">
              Gestão para saúde mental
            </h2>
            <p className="text-sm mt-2 leading-relaxed max-w-xs mx-auto" style={{ color: 'rgba(167,139,250,0.65)' }}>
              Agenda, prontuários, financeiro e relatórios — tudo integrado para sua prática fluir.
            </p>
          </div>
        </div>

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(167,139,250,1) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* ── RIGHT PANEL — white, form ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center bg-white overflow-y-auto px-6 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">

          {/* Mobile-only logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 ring-1 ring-indigo-100 shadow-lg bg-white p-2">
              <img src={logoUrl} alt="Plaelo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-black text-[22px] leading-none tracking-tight" style={{ color: '#1e295b' }}>Plaelo</h1>
              <p className="text-[10px] font-medium mt-0.5 text-slate-400">Conectando cuidado e gestão.</p>
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
              <div className="mb-8 animate-[fadeIn_0.4s_ease-out]">
                <h2 className="text-[28px] font-bold text-slate-900 tracking-tight mb-1.5">
                  Bem-vindo de volta
                </h2>
                <p className="text-slate-400 text-sm">
                  Entre com suas credenciais para acessar o painel.
                </p>
              </div>

              <ErrorBanner />

              <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="mt-7 text-center">
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
              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2">
                <ShieldCheck size={12} className="text-slate-300" />
                <p className="text-[11px] text-slate-400 tracking-wide">
                  Conexão segura · Dados criptografados · LGPD
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
