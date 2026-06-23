import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, BrainCircuit, ShieldCheck, ChevronLeft, Smartphone, AlertCircle } from 'lucide-react';
import logoUrl from '../../images/logo-psiflux.png';
import logoDarkUrl from '../../images/logopsiflux-para-fundo-escuro.png';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// ── Geometric Brain SVG Illustration ─────────────────────────────────────────
const BrainIllustration = () => (
  <svg viewBox="0 0 520 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full max-w-md mx-auto">
    <defs>
      <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#8B7CF6" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#8B7CF6" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="glow2" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#6355D8" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#6355D8" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="orbGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.9" />
        <stop offset="60%" stopColor="#6355D8" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#4338CA" stopOpacity="0.4" />
      </radialGradient>
      <filter id="blur1">
        <feGaussianBlur stdDeviation="18" />
      </filter>
      <filter id="blur2">
        <feGaussianBlur stdDeviation="10" />
      </filter>
      <filter id="nodeglow">
        <feGaussianBlur stdDeviation="3" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>

    {/* Ambient glow blobs */}
    <ellipse cx="260" cy="230" rx="180" ry="160" fill="url(#glow1)" filter="url(#blur1)" />
    <ellipse cx="180" cy="160" rx="120" ry="100" fill="url(#glow2)" filter="url(#blur1)" />
    <ellipse cx="360" cy="320" rx="100" ry="90" fill="url(#glow2)" filter="url(#blur1)" />

    {/* Connection lines between nodes — drawn first so nodes appear on top */}
    {/* Outer connections */}
    <line x1="140" y1="130" x2="210" y2="100" stroke="#6355D8" strokeWidth="1" strokeOpacity="0.5" />
    <line x1="210" y1="100" x2="290" y2="90" stroke="#6355D8" strokeWidth="1" strokeOpacity="0.5" />
    <line x1="290" y1="90" x2="370" y2="120" stroke="#6355D8" strokeWidth="1" strokeOpacity="0.4" />
    <line x1="370" y1="120" x2="400" y2="190" stroke="#8B7CF6" strokeWidth="1" strokeOpacity="0.5" />
    <line x1="400" y1="190" x2="390" y2="270" stroke="#8B7CF6" strokeWidth="1" strokeOpacity="0.4" />
    <line x1="390" y1="270" x2="360" y2="350" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.4" />
    <line x1="360" y1="350" x2="290" y2="390" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.4" />
    <line x1="290" y1="390" x2="210" y2="380" stroke="#8B7CF6" strokeWidth="1" strokeOpacity="0.4" />
    <line x1="210" y1="380" x2="145" y2="340" stroke="#8B7CF6" strokeWidth="1" strokeOpacity="0.4" />
    <line x1="145" y1="340" x2="120" y2="265" stroke="#6355D8" strokeWidth="1" strokeOpacity="0.5" />
    <line x1="120" y1="265" x2="130" y2="190" stroke="#6355D8" strokeWidth="1" strokeOpacity="0.5" />
    <line x1="130" y1="190" x2="140" y2="130" stroke="#6355D8" strokeWidth="1" strokeOpacity="0.5" />

    {/* Inner connections — first ring to center */}
    <line x1="200" y1="165" x2="260" y2="160" stroke="#A78BFA" strokeWidth="1.2" strokeOpacity="0.6" />
    <line x1="260" y1="160" x2="330" y2="180" stroke="#A78BFA" strokeWidth="1.2" strokeOpacity="0.6" />
    <line x1="330" y1="180" x2="340" y2="250" stroke="#8B7CF6" strokeWidth="1.2" strokeOpacity="0.6" />
    <line x1="340" y1="250" x2="310" y2="320" stroke="#8B7CF6" strokeWidth="1.2" strokeOpacity="0.5" />
    <line x1="310" y1="320" x2="240" y2="330" stroke="#A78BFA" strokeWidth="1.2" strokeOpacity="0.5" />
    <line x1="240" y1="330" x2="175" y2="300" stroke="#A78BFA" strokeWidth="1.2" strokeOpacity="0.5" />
    <line x1="175" y1="300" x2="170" y2="230" stroke="#8B7CF6" strokeWidth="1.2" strokeOpacity="0.6" />
    <line x1="170" y1="230" x2="200" y2="165" stroke="#8B7CF6" strokeWidth="1.2" strokeOpacity="0.6" />

    {/* Radial spokes to center */}
    <line x1="200" y1="165" x2="260" y2="245" stroke="#A78BFA" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="260" y1="160" x2="260" y2="245" stroke="#A78BFA" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="330" y1="180" x2="260" y2="245" stroke="#A78BFA" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="340" y1="250" x2="260" y2="245" stroke="#8B7CF6" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="310" y1="320" x2="260" y2="245" stroke="#8B7CF6" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="240" y1="330" x2="260" y2="245" stroke="#A78BFA" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="175" y1="300" x2="260" y2="245" stroke="#A78BFA" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="170" y1="230" x2="260" y2="245" stroke="#8B7CF6" strokeWidth="0.8" strokeOpacity="0.4" />

    {/* Cross connections — outer to inner */}
    <line x1="140" y1="130" x2="200" y2="165" stroke="#6355D8" strokeWidth="0.8" strokeOpacity="0.35" />
    <line x1="210" y1="100" x2="260" y2="160" stroke="#6355D8" strokeWidth="0.8" strokeOpacity="0.35" />
    <line x1="370" y1="120" x2="330" y2="180" stroke="#6355D8" strokeWidth="0.8" strokeOpacity="0.35" />
    <line x1="400" y1="190" x2="340" y2="250" stroke="#8B7CF6" strokeWidth="0.8" strokeOpacity="0.35" />
    <line x1="360" y1="350" x2="310" y2="320" stroke="#8B7CF6" strokeWidth="0.8" strokeOpacity="0.35" />
    <line x1="210" y1="380" x2="240" y2="330" stroke="#8B7CF6" strokeWidth="0.8" strokeOpacity="0.35" />
    <line x1="120" y1="265" x2="170" y2="230" stroke="#6355D8" strokeWidth="0.8" strokeOpacity="0.35" />
    <line x1="145" y1="340" x2="175" y2="300" stroke="#6355D8" strokeWidth="0.8" strokeOpacity="0.35" />

    {/* Hexagon background shapes (subtle) */}
    <polygon points="260,195 280,207 280,231 260,243 240,231 240,207" stroke="#6355D8" strokeWidth="1" strokeOpacity="0.3" fill="none" />
    <polygon points="260,140 290,157 290,191 260,208 230,191 230,157" stroke="#8B7CF6" strokeWidth="0.8" strokeOpacity="0.2" fill="none" />

    {/* Outer ring nodes */}
    <circle cx="140" cy="130" r="7" fill="#6355D8" fillOpacity="0.6" stroke="#A78BFA" strokeWidth="1.5" filter="url(#nodeglow)" />
    <circle cx="210" cy="100" r="8" fill="#6355D8" fillOpacity="0.7" stroke="#A78BFA" strokeWidth="1.5" filter="url(#nodeglow)" />
    <circle cx="290" cy="90" r="6" fill="#6355D8" fillOpacity="0.5" stroke="#8B7CF6" strokeWidth="1.5" />
    <circle cx="370" cy="120" r="7" fill="#6355D8" fillOpacity="0.6" stroke="#A78BFA" strokeWidth="1.5" filter="url(#nodeglow)" />
    <circle cx="400" cy="190" r="9" fill="#6355D8" fillOpacity="0.8" stroke="#A78BFA" strokeWidth="2" filter="url(#nodeglow)" />
    <circle cx="390" cy="270" r="6" fill="#6355D8" fillOpacity="0.5" stroke="#8B7CF6" strokeWidth="1.5" />
    <circle cx="360" cy="350" r="7" fill="#6355D8" fillOpacity="0.6" stroke="#A78BFA" strokeWidth="1.5" />
    <circle cx="290" cy="390" r="6" fill="#6355D8" fillOpacity="0.5" stroke="#8B7CF6" strokeWidth="1.5" />
    <circle cx="210" cy="380" r="7" fill="#6355D8" fillOpacity="0.6" stroke="#A78BFA" strokeWidth="1.5" />
    <circle cx="145" cy="340" r="6" fill="#6355D8" fillOpacity="0.5" stroke="#8B7CF6" strokeWidth="1.5" />
    <circle cx="120" cy="265" r="8" fill="#6355D8" fillOpacity="0.7" stroke="#A78BFA" strokeWidth="1.5" filter="url(#nodeglow)" />
    <circle cx="130" cy="190" r="6" fill="#6355D8" fillOpacity="0.5" stroke="#8B7CF6" strokeWidth="1.5" />

    {/* Inner ring nodes */}
    <circle cx="200" cy="165" r="9" fill="#8B7CF6" fillOpacity="0.8" stroke="#A78BFA" strokeWidth="2" filter="url(#nodeglow)" />
    <circle cx="260" cy="160" r="8" fill="#8B7CF6" fillOpacity="0.75" stroke="#A78BFA" strokeWidth="2" />
    <circle cx="330" cy="180" r="9" fill="#8B7CF6" fillOpacity="0.8" stroke="#A78BFA" strokeWidth="2" filter="url(#nodeglow)" />
    <circle cx="340" cy="250" r="8" fill="#8B7CF6" fillOpacity="0.75" stroke="#A78BFA" strokeWidth="2" />
    <circle cx="310" cy="320" r="9" fill="#8B7CF6" fillOpacity="0.8" stroke="#A78BFA" strokeWidth="2" filter="url(#nodeglow)" />
    <circle cx="240" cy="330" r="7" fill="#8B7CF6" fillOpacity="0.7" stroke="#A78BFA" strokeWidth="1.5" />
    <circle cx="175" cy="300" r="9" fill="#8B7CF6" fillOpacity="0.8" stroke="#A78BFA" strokeWidth="2" filter="url(#nodeglow)" />
    <circle cx="170" cy="230" r="8" fill="#8B7CF6" fillOpacity="0.75" stroke="#A78BFA" strokeWidth="2" />

    {/* Center orb */}
    <circle cx="260" cy="245" r="28" fill="url(#orbGrad)" filter="url(#blur2)" />
    <circle cx="260" cy="245" r="20" fill="#7C6FF7" fillOpacity="0.9" stroke="#A78BFA" strokeWidth="2.5" filter="url(#nodeglow)" />
    <circle cx="260" cy="245" r="10" fill="#C4B5FD" fillOpacity="0.6" />
    <circle cx="255" cy="240" r="4" fill="white" fillOpacity="0.4" />

    {/* Floating accent dots */}
    <circle cx="450" cy="100" r="3" fill="#A78BFA" fillOpacity="0.5" />
    <circle cx="465" cy="115" r="2" fill="#8B7CF6" fillOpacity="0.4" />
    <circle cx="75" cy="400" r="3" fill="#A78BFA" fillOpacity="0.5" />
    <circle cx="60" cy="415" r="2" fill="#8B7CF6" fillOpacity="0.4" />
    <circle cx="460" cy="380" r="2.5" fill="#A78BFA" fillOpacity="0.4" />

    {/* Small pulse rings on brightest nodes */}
    <circle cx="400" cy="190" r="16" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.25" fill="none" />
    <circle cx="200" cy="165" r="15" stroke="#8B7CF6" strokeWidth="1" strokeOpacity="0.25" fill="none" />
    <circle cx="310" cy="320" r="15" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.25" fill="none" />
    <circle cx="260" cy="245" r="36" stroke="#8B7CF6" strokeWidth="1.5" strokeOpacity="0.2" fill="none" />
    <circle cx="260" cy="245" r="50" stroke="#6355D8" strokeWidth="1" strokeOpacity="0.12" fill="none" />
  </svg>
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
        style={{ background: '#0C0B1A' }}
      >
        {/* Background glow layers */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 40% 35%, rgba(99,85,216,0.18) 0%, transparent 70%), ' +
              'radial-gradient(ellipse 50% 50% at 75% 70%, rgba(139,124,246,0.10) 0%, transparent 65%)',
          }}
        />

        {/* Top-left logo */}
        <div className="relative z-10 flex items-center gap-3 p-10">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 ring-1 ring-white/10 shadow-2xl">
            <img src={logoDarkUrl} alt="PsiFlux" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-[26px] leading-none tracking-tight" style={{ fontWeight: 900 }}>
              <span style={{ color: '#E0DEFF' }}>Psi</span>
              <span style={{ color: '#A78BFA' }}>Flux</span>
            </h1>
            <p className="text-[11px] font-medium tracking-wide mt-0.5" style={{ color: 'rgba(167,139,250,0.6)' }}>
              Onde o seu consultório flui.
            </p>
          </div>
        </div>

        {/* Center illustration */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-10 -mt-6">
          <div className="w-full max-w-[420px]">
            <BrainIllustration />
          </div>
          <div className="text-center mt-2 px-6">
            <h2 className="text-xl font-bold text-white/90 tracking-tight">
              Gestão clínica inteligente
            </h2>
            <p className="text-sm mt-2 leading-relaxed max-w-xs mx-auto" style={{ color: 'rgba(167,139,250,0.65)' }}>
              Agenda, prontuários, financeiro e relatórios — tudo integrado para sua prática fluir.
            </p>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 flex items-center justify-center gap-3 p-10 pt-6">
          {[
            { value: '98%', label: 'Satisfação' },
            { value: '2k+', label: 'Psicólogos' },
            { value: '4.9 ★', label: 'Avaliação' },
          ].map(({ value, label }) => (
            <div
              key={label}
              className="text-center px-6 py-3.5 rounded-2xl flex-1"
              style={{
                background: 'rgba(99,85,216,0.15)',
                border: '1px solid rgba(99,85,216,0.25)',
              }}
            >
              <p className="font-extrabold text-xl leading-none text-white">{value}</p>
              <p className="text-xs mt-1.5 font-medium" style={{ color: 'rgba(167,139,250,0.7)' }}>{label}</p>
            </div>
          ))}
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
            <div
              className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 ring-1 ring-indigo-100 shadow-lg"
              style={{ background: '#0C0B1A' }}
            >
              <img src={logoDarkUrl} alt="PsiFlux" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-black text-[22px] leading-none tracking-tight">
                <span style={{ color: '#1e295b' }}>Psi</span>
                <span style={{ color: '#6355D8' }}>Flux</span>
              </h1>
              <p className="text-[10px] font-medium mt-0.5 text-slate-400">Onde o seu consultório flui.</p>
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
                    style={{ background: 'linear-gradient(135deg, #6355D8, #8B7CF6)' }}
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
                        background: 'linear-gradient(135deg, #6355D8 0%, #8B7CF6 100%)',
                        boxShadow: '0 8px 24px rgba(99,85,216,0.35)',
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
                  style={{ background: 'linear-gradient(135deg, #6355D8, #8B7CF6)', boxShadow: '0 8px 24px rgba(99,85,216,0.3)' }}
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
                    background: 'linear-gradient(135deg, #6355D8 0%, #8B7CF6 100%)',
                    boxShadow: '0 8px 24px rgba(99,85,216,0.35)',
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
                      type="email"
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
                    style={remember ? { background: 'linear-gradient(135deg, #6355D8, #8B7CF6)' } : {}}
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
                    background: 'linear-gradient(135deg, #6355D8 0%, #8B7CF6 100%)',
                    boxShadow: '0 8px 28px rgba(99,85,216,0.40)',
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
                    color: '#6355D8',
                    border: '1px solid rgba(99,85,216,0.2)',
                  }}
                >
                  <span style={{ fontSize: '10px' }}>✦</span>
                  14 dias grátis para testar
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
