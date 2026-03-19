import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, BrainCircuit, ShieldCheck, ChevronLeft } from 'lucide-react';
import logoUrl from '../../images/logo-psiflux.png';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// ── Ilustração SVG da esquerda ─────────────────────────────────────────────
const LeftIllustration = () => (
  <svg viewBox="0 0 480 480" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full max-w-sm mx-auto">
    {/* Fundo blob suave */}
    <ellipse cx="240" cy="260" rx="200" ry="180" fill="#e0e7ff" fillOpacity="0.5" />
    <ellipse cx="300" cy="180" rx="130" ry="120" fill="#ede9fe" fillOpacity="0.6" />

    {/* Tela / monitor estilizado */}
    <rect x="100" y="120" width="280" height="190" rx="20" fill="white" stroke="#c7d2fe" strokeWidth="2" />
    <rect x="100" y="120" width="280" height="36" rx="20" fill="#6366f1" />
    <rect x="100" y="138" width="280" height="18" fill="#6366f1" />
    {/* dots da barra */}
    <circle cx="122" cy="138" r="5" fill="white" fillOpacity="0.5" />
    <circle cx="140" cy="138" r="5" fill="white" fillOpacity="0.5" />
    <circle cx="158" cy="138" r="5" fill="white" fillOpacity="0.5" />

    {/* Conteúdo da tela — gráfico de linha */}
    <polyline points="120,270 160,240 200,255 250,210 300,220 360,185" stroke="#6366f1" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="120,270 160,240 200,255 250,210 300,220 360,185 360,290 120,290" fill="#6366f1" fillOpacity="0.08" />
    {/* pontos do gráfico */}
    {[[160,240],[200,255],[250,210],[300,220],[360,185]].map(([cx,cy],i) => (
      <circle key={i} cx={cx} cy={cy} r="4" fill="#6366f1" />
    ))}
    {/* linhas de grade */}
    {[200,230,260,290].map((y,i) => (
      <line key={i} x1="118" y1={y} x2="365" y2={y} stroke="#e0e7ff" strokeWidth="1" />
    ))}

    {/* Cards flutuantes */}
    {/* Card 1 — pacientes */}
    <rect x="50" y="200" width="110" height="62" rx="14" fill="white" stroke="#e0e7ff" strokeWidth="1.5" style={{ filter:'drop-shadow(0 4px 12px rgba(99,102,241,0.10))' }} />
    <rect x="62" y="212" width="26" height="26" rx="8" fill="#eef2ff" />
    <path d="M75 218 a5 5 0 1 1 0 .01 M68 232 a7 5 0 0 1 14 0" stroke="#6366f1" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
    <rect x="96" y="214" width="50" height="6" rx="3" fill="#e0e7ff" />
    <rect x="96" y="224" width="36" height="5" rx="2.5" fill="#c7d2fe" />
    <rect x="62" y="245" width="82" height="8" rx="4" fill="#6366f1" fillOpacity="0.15" />
    <text x="74" y="252" fontSize="7" fill="#6366f1" fontWeight="600">48 pacientes ativos</text>

    {/* Card 2 — agenda */}
    <rect x="320" y="240" width="110" height="62" rx="14" fill="white" stroke="#e0e7ff" strokeWidth="1.5" style={{ filter:'drop-shadow(0 4px 12px rgba(139,92,246,0.10))' }} />
    <rect x="332" y="252" width="26" height="26" rx="8" fill="#f5f3ff" />
    <rect x="337" y="257" width="16" height="16" rx="3" stroke="#8b5cf6" strokeWidth="1.8" fill="none" />
    <line x1="341" y1="255" x2="341" y2="260" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="349" y1="255" x2="349" y2="260" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="337" y1="265" x2="353" y2="265" stroke="#8b5cf6" strokeWidth="1" />
    <rect x="366" y="254" width="50" height="6" rx="3" fill="#ede9fe" />
    <rect x="366" y="264" width="36" height="5" rx="2.5" fill="#ddd6fe" />
    <rect x="332" y="285" width="82" height="8" rx="4" fill="#8b5cf6" fillOpacity="0.12" />
    <text x="341" y="292" fontSize="7" fill="#8b5cf6" fontWeight="600">6 consultas hoje</text>

    {/* Card 3 — faturamento */}
    <rect x="160" y="330" width="160" height="60" rx="14" fill="white" stroke="#e0e7ff" strokeWidth="1.5" style={{ filter:'drop-shadow(0 4px 16px rgba(99,102,241,0.12))' }} />
    <rect x="172" y="342" width="26" height="26" rx="8" fill="#ecfdf5" />
    <path d="M185 348 v12 M181 352 h8 M181 356 h8" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round"/>
    <rect x="206" y="344" width="60" height="6" rx="3" fill="#d1fae5" />
    <rect x="206" y="354" width="80" height="6" rx="3" fill="#d1fae5" />
    <text x="206" y="362" fontSize="9" fill="#065f46" fontWeight="700">R$ 12.400</text>
    <text x="206" y="374" fontSize="7" fill="#6ee7b7">↑ +18% este mês</text>

    {/* Ícone central flutuante */}
    <circle cx="240" cy="108" r="32" fill="#6366f1" style={{ filter:'drop-shadow(0 8px 24px rgba(99,102,241,0.35))' }} />
    <path d="M228 108 q0-8 8-10 q4-1 8 2 q6 4 4 10 q-1 4-5 6 l0 4" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
    <circle cx="240" cy="134" r="2" fill="white" />

    {/* Estrelinhas decorativas */}
    {[[80,150],[400,300],[420,140],[60,340]].map(([cx,cy],i)=>(
      <g key={i} transform={`translate(${cx},${cy})`} opacity="0.5">
        <line x1="-5" y1="0" x2="5" y2="0" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="0" y1="-5" x2="0" y2="5" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round"/>
      </g>
    ))}
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
export const Login: React.FC<{ onLogin: () => void }> = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [email, setEmail]             = useState(() => localStorage.getItem('psi_remembered_email') || '');
  const [password, setPassword]       = useState('');
  const [remember, setRemember]       = useState(() => !!localStorage.getItem('psi_remembered_email'));
  const [showPass, setShowPass]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [forgot, setForgot]           = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post<{ token: string }>('/auth/login', { email, password });
      if (remember) localStorage.setItem('psi_remembered_email', email);
      else localStorage.removeItem('psi_remembered_email');
      login(res.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // TODO: substituir pelo endpoint real quando disponível
      await new Promise(r => setTimeout(r, 900));
      setForgotSent(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex font-sans bg-white overflow-y-auto">

      {/* ── Esquerda — ilustração ── */}
      <div className="hidden lg:flex flex-col justify-between w-[50%] p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #eef2ff 0%, #f5f3ff 55%, #fdf4ff 100%)' }}>

        {/* blobs suaves */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-40" style={{ background: 'radial-gradient(circle, #c7d2fe, transparent 70%)', transform: 'translate(30%,-30%)' }} />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #ddd6fe, transparent 70%)', transform: 'translate(-30%,30%)' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #e0e7ff, transparent 70%)', transform: 'translate(-50%,-50%)' }} />

        {/* Logo */}
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-[52px] h-[52px] rounded-2xl overflow-hidden shadow-xl ring-2 ring-indigo-200/60 bg-white/80 backdrop-blur-sm flex-shrink-0">
            <img src={logoUrl} alt="PsiFlux" className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <h1 className="text-slate-800 font-display font-bold text-[24px] leading-none tracking-tight flex items-baseline">
              <span className="text-[#1e295b]">Psi</span>
              <span className="text-[#00bcd4]">Flux</span>
            </h1>
            <p className="text-[#1e295b] text-[11px] font-medium tracking-tight mt-0.5">Onde o seu consultório flui.</p>
          </div>
        </div>

        {/* Ilustração central */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-6">
          <LeftIllustration />
          <div className="text-center mt-2">
            <h2 className="text-xl font-bold text-slate-700">Gestão clínica completa</h2>
            <p className="text-slate-400 text-sm mt-1.5 max-w-xs">Agenda, prontuários, financeiro e muito mais para sua prática.</p>
          </div>
        </div>

        {/* Indicadores */}
        <div className="flex items-center justify-center gap-4 relative z-10">
          {[
            { value: '98%', label: 'Satisfação', color: 'bg-indigo-50' },
            { value: '2k+', label: 'Psicólogos', color: 'bg-violet-50' },
            { value: '4.9★', label: 'Avaliação', color: 'bg-purple-50' },
          ].map(({ value, label, color }) => (
            <div key={label} className={`text-center px-5 py-3 ${color} rounded-2xl border border-white/80 shadow-sm`}>
              <p className="text-slate-800 font-display font-bold text-xl leading-none">{value}</p>
              <p className="text-slate-500 text-xs mt-1 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Direita — formulário ── */}
      <div className="flex-1 flex flex-col justify-center p-6 sm:p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-[400px] mx-auto py-8">

          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md ring-2 ring-indigo-100 bg-indigo-50/50 flex-shrink-0">
              <img src={logoUrl} alt="PsiFlux" className="w-full h-full object-contain p-0.5" />
            </div>
            <div>
              <h1 className="text-slate-800 font-display font-bold text-[22px] leading-none tracking-tight flex items-baseline">
                <span className="text-[#1e295b]">Psi</span>
                <span className="text-[#00bcd4]">Flux</span>
              </h1>
              <p className="text-[#1e295b] text-[10px] font-medium tracking-tight mt-0.5">Onde o seu consultório flui.</p>
            </div>
          </div>

          {/* ── Esqueci a senha ── */}
          {forgot ? (
            <div>
              <button onClick={() => { setForgot(false); setForgotSent(false); setForgotEmail(''); }}
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-8 transition">
                <ChevronLeft size={15} /> Voltar ao login
              </button>

              {forgotSent ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <Mail size={26} className="text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">E-mail enviado!</h2>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto mb-6">
                    Verifique sua caixa de entrada em{' '}
                    <span className="font-semibold text-slate-700">{forgotEmail}</span>{' '}
                    e siga as instruções para redefinir sua senha.
                  </p>
                  <button onClick={() => { setForgot(false); setForgotSent(false); }}
                    className="text-indigo-600 font-semibold text-sm hover:underline">
                    Voltar ao login
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">Recuperar senha</h2>
                  <p className="text-slate-400 text-sm mb-8">Informe seu e-mail e enviaremos as instruções.</p>
                  <form onSubmit={handleForgot} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail cadastrado</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" />
                      </div>
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2 transition shadow-md shadow-indigo-100 disabled:opacity-60">
                      {loading ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : 'Enviar instruções'}
                    </button>
                  </form>
                </>
              )}
            </div>

          ) : (
          /* ── Login ── */
            <>
              <div className="mb-8">
                <h2 className="text-[28px] font-display font-bold text-slate-900 mb-1.5 tracking-tight">Bem-vindo de volta</h2>
                <p className="text-slate-400 text-sm">Entre com suas credenciais para acessar o painel</p>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" />
                  </div>
                </div>

                {/* Senha */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Senha</label>
                    <button type="button" onClick={() => setForgot(true)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition hover:underline">
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-11 py-3.5 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Lembrar-me */}
                <label className="flex items-center gap-3 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                  />
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${remember ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>
                    {remember && (
                      <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                        <path d="M1 4l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-slate-600">Lembrar-me neste dispositivo</span>
                </label>

                {/* Botão entrar */}
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-indigo-200/60 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99] mt-1">
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Entrando...</>
                    : <>Entrar <ArrowRight size={16} /></>}
                </button>
              </form>

              <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-2">
                <ShieldCheck size={13} className="text-slate-300" />
                <p className="text-xs text-slate-400">Conexão segura · Dados criptografados · LGPD</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
