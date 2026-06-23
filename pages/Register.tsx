import React, { useState } from 'react';
import {
  Mail, Lock, Eye, EyeOff, Loader2, User, Phone,
  BrainCircuit, ChevronLeft, CheckCircle2, Building2, Hash,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logoUrl from '../images/logo-psiflux.png';
import logoDarkUrl from '../images/logopsiflux-para-fundo-escuro.png';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';

// Mesma ilustração da esquerda do Login
const LeftIllustration = () => (
  <svg viewBox="0 0 480 480" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full max-w-sm mx-auto">
    <ellipse cx="240" cy="260" rx="200" ry="180" fill="#e0e7ff" fillOpacity="0.5" />
    <ellipse cx="300" cy="180" rx="130" ry="120" fill="#ede9fe" fillOpacity="0.6" />
    {/* Tela central */}
    <rect x="100" y="120" width="280" height="200" rx="20" fill="white" stroke="#c7d2fe" strokeWidth="2" />
    <rect x="100" y="120" width="280" height="36" rx="20" fill="#6355D8" />
    <rect x="100" y="138" width="280" height="18" fill="#6355D8" />
    <circle cx="122" cy="138" r="5" fill="white" fillOpacity="0.5" />
    <circle cx="140" cy="138" r="5" fill="white" fillOpacity="0.5" />
    <circle cx="158" cy="138" r="5" fill="white" fillOpacity="0.5" />
    {/* Formulário */}
    <rect x="128" y="170" width="224" height="26" rx="8" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1.5" />
    <rect x="140" y="180" width="80" height="6" rx="3" fill="#CBD5E1" />
    <rect x="128" y="205" width="224" height="26" rx="8" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1.5" />
    <rect x="140" y="215" width="60" height="6" rx="3" fill="#CBD5E1" />
    <rect x="128" y="240" width="224" height="26" rx="8" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1.5" />
    <rect x="140" y="250" width="70" height="6" rx="3" fill="#CBD5E1" />
    <rect x="128" y="275" width="224" height="28" rx="10" fill="#6355D8" />
    <rect x="200" y="284" width="80" height="8" rx="4" fill="white" fillOpacity="0.8" />
    {/* Cards flutuantes */}
    <rect x="40" y="200" width="110" height="62" rx="14" fill="white" stroke="#e0e7ff" strokeWidth="1.5"
      style={{ filter:'drop-shadow(0 4px 12px rgba(99,85,216,0.12))' }} />
    <rect x="52" y="212" width="26" height="26" rx="8" fill="#eef2ff" />
    <path d="M65 218 a5 5 0 1 1 0 .01 M58 232 a7 5 0 0 1 14 0" stroke="#6355D8" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
    <rect x="86" y="214" width="50" height="6" rx="3" fill="#e0e7ff" />
    <rect x="86" y="224" width="36" height="5" rx="2.5" fill="#c7d2fe" />
    <text x="52" y="257" fontSize="7" fill="#6355D8" fontWeight="700">Perfil público</text>
    <rect x="330" y="215" width="110" height="62" rx="14" fill="white" stroke="#d1fae5" strokeWidth="1.5"
      style={{ filter:'drop-shadow(0 4px 12px rgba(14,169,139,0.12))' }} />
    <rect x="342" y="227" width="26" height="26" rx="8" fill="#ecfdf5" />
    <path d="M355 233 v12 M351 237 h8 M351 241 h8" stroke="#0EA98B" strokeWidth="1.8" strokeLinecap="round"/>
    <rect x="376" y="229" width="50" height="6" rx="3" fill="#d1fae5" />
    <rect x="376" y="239" width="36" height="5" rx="2.5" fill="#a7f3d0" />
    <text x="342" y="272" fontSize="7" fill="#0EA98B" fontWeight="700">Agenda online</text>
    {/* Checklist */}
    <rect x="155" y="355" width="170" height="70" rx="14" fill="white" stroke="#e0e7ff" strokeWidth="1.5"
      style={{ filter:'drop-shadow(0 4px 16px rgba(99,85,216,0.10))' }} />
    {[0,1,2].map(i => (
      <g key={i} transform={`translate(167,${367+i*18})`}>
        <circle cx="7" cy="7" r="7" fill={i === 2 ? '#F1F5F9' : '#6355D8'} fillOpacity={i === 2 ? 1 : 0.15} />
        {i < 2 && <path d="M4 7 l2.5 2.5 l4-4" stroke="#6355D8" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
        <rect x="20" y="4" width={i === 0 ? 90 : i === 1 ? 70 : 50} height="6" rx="3" fill={i === 2 ? '#F1F5F9' : '#e0e7ff'} />
      </g>
    ))}
    {/* Decoração */}
    {[[80,150],[400,300],[420,140],[60,340]].map(([cx,cy],i) => (
      <g key={i} transform={`translate(${cx},${cy})`} opacity="0.4">
        <line x1="-5" y1="0" x2="5" y2="0" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="0" y1="-5" x2="0" y2="5" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round"/>
      </g>
    ))}
    <circle cx="240" cy="88" r="28" fill="#6355D8" style={{ filter:'drop-shadow(0 8px 24px rgba(99,85,216,0.35))' }} />
    <path d="M232 88 q0-6 6-8 q3-1 6 2 q4 3 3 8 q-1 3-4 5 l0 3" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <circle cx="240" cy="110" r="1.8" fill="white" />
  </svg>
);

const STEPS = ['Acesso', 'Perfil', 'Pronto'];

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === 'dark';

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Step 0 — acesso
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);

  // Step 1 — perfil
  const [phone, setPhone]         = useState('');
  const [specialty, setSpecialty] = useState('');
  const [crp, setCrp]             = useState('');
  const [company, setCompany]     = useState('');

  const passwordStrength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8)  s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthLabel = ['', 'Fraca', 'Média', 'Boa', 'Forte'][passwordStrength];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'][passwordStrength];

  const goNext = () => {
    setError('');
    if (step === 0) {
      if (!name.trim()) return setError('Digite seu nome completo.');
      if (!email.trim() || !email.includes('@')) return setError('Digite um e-mail válido.');
      if (password.length < 8) return setError('A senha deve ter ao menos 8 caracteres.');
      if (password !== confirm) return setError('As senhas não coincidem.');
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register', { name, email, password, phone, specialty, crp, company_name: company });
      setDone(true);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex font-sans bg-white overflow-y-auto">

      {/* ── Esquerda — ilustração (mesmo estilo do Login) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[50%] p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #eef2ff 0%, #f5f3ff 55%, #fdf4ff 100%)' }}>
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, #c7d2fe, transparent 70%)', transform: 'translate(30%,-30%)' }} />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #ddd6fe, transparent 70%)', transform: 'translate(-30%,30%)' }} />

        {/* Logo */}
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-[64px] h-[64px] rounded-2xl overflow-hidden shadow-xl ring-2 ring-indigo-200/60 bg-white/80 backdrop-blur-sm flex-shrink-0">
            <img src={isDark ? logoDarkUrl : logoUrl} alt="PsiFlux" className="w-full h-full object-contain p-0.5" />
          </div>
          <div>
            <h1 className="text-slate-800 font-display font-bold text-[24px] leading-none tracking-tight flex items-baseline">
              <span style={{ color: '#1e295b' }}>Psi</span>
              <span style={{ color: '#00bcd4' }}>Flux</span>
            </h1>
            <p style={{ color: '#1e295b' }} className="text-[11px] font-medium tracking-tight mt-0.5">Onde o seu consultório flui.</p>
          </div>
        </div>

        {/* Ilustração */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-6">
          <LeftIllustration />
          <div className="text-center mt-2">
            <h2 className="text-xl font-bold text-slate-700">Tudo para sua prática clínica</h2>
            <p className="text-slate-400 text-sm mt-1.5 max-w-xs">
              Agenda inteligente, prontuário digital, salas de vídeo e perfil público — tudo em um lugar.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-4 relative z-10">
          {[
            { value: '7 dias', label: 'Grátis para testar' },
            { value: '2k+',   label: 'Psicólogos' },
            { value: '4.9★',  label: 'Avaliação' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center px-5 py-3 bg-indigo-50 rounded-2xl border border-white/80 shadow-sm">
              <p className="text-slate-800 font-display font-bold text-xl leading-none">{value}</p>
              <p className="text-slate-500 text-xs mt-1 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Direita — formulário ── */}
      <div className="flex-1 flex flex-col justify-center p-6 sm:p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-[420px] mx-auto py-8">

          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md ring-2 ring-indigo-100 flex-shrink-0">
              <img src={isDark ? logoDarkUrl : logoUrl} alt="PsiFlux" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="font-bold text-[20px] tracking-tight leading-none">
                <span style={{ color: '#1e295b' }}>Psi</span>
                <span style={{ color: '#00bcd4' }}>Flux</span>
              </p>
              <p className="text-slate-400 text-[10px] mt-0.5 font-medium">Onde o seu consultório flui.</p>
            </div>
          </div>

          {/* Stepper */}
          {!done && (
            <div className="flex items-center gap-2 mb-8">
              {STEPS.map((label, i) => (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                      ${i < step ? 'bg-indigo-600 text-white' : i === step ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
                      {i < step ? <CheckCircle2 size={14} /> : i + 1}
                    </div>
                    <span className={`text-xs font-semibold hidden sm:block ${i === step ? 'text-slate-700' : 'text-slate-400'}`}>
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 rounded-full transition-all ${i < step ? 'bg-indigo-600' : 'bg-slate-100'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* ── Step 0: Acesso ── */}
          {step === 0 && (
            <div className="animate-[fadeIn_.4s_ease-out]">
              <div className="mb-7">
                <h2 className="text-[26px] font-bold text-slate-900 tracking-tight mb-1">Crie sua conta</h2>
                <p className="text-slate-400 text-sm">Comece agora — sem cartão de crédito.</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {/* Nome */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome completo</label>
                  <div className="relative">
                    <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Dra. Ana Silva"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                    />
                  </div>
                </div>

                {/* E-mail */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail profissional</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="ana@consultorio.com.br"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                    />
                  </div>
                </div>

                {/* Senha */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Senha</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full pl-11 pr-12 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                    />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Barra de força */}
                  {password && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex gap-1 flex-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="h-1 flex-1 rounded-full transition-all"
                            style={{ background: i <= passwordStrength ? strengthColor : '#E2E8F0' }} />
                        ))}
                      </div>
                      <span className="text-xs font-semibold" style={{ color: strengthColor }}>{strengthLabel}</span>
                    </div>
                  )}
                </div>

                {/* Confirmar senha */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirmar senha</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConf ? 'text' : 'password'} value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repita a senha"
                      className={`w-full pl-11 pr-12 py-3.5 rounded-xl bg-slate-50 border text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 transition
                        ${confirm && confirm !== password
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                          : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-100'}`}
                    />
                    <button type="button" onClick={() => setShowConf(s => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                      {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={goNext}
                className="w-full mt-7 py-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 shadow-lg active:scale-[0.99]"
                style={{ background: '#6355D8', boxShadow: '0 4px 20px rgba(99,85,216,.35)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#5447C4')}
                onMouseLeave={e => (e.currentTarget.style.background = '#6355D8')}
              >
                Continuar
              </button>

              <p className="text-center text-sm text-slate-400 mt-5">
                Já tem conta?{' '}
                <button onClick={() => navigate('/login')}
                  className="font-semibold text-indigo-600 hover:text-indigo-700 transition">
                  Entrar
                </button>
              </p>
            </div>
          )}

          {/* ── Step 1: Perfil profissional ── */}
          {step === 1 && (
            <form onSubmit={handleSubmit} className="animate-[fadeIn_.4s_ease-out]">
              <button onClick={() => setStep(0)} type="button"
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-7 transition">
                <ChevronLeft size={15} /> Voltar
              </button>

              <div className="mb-7">
                <h2 className="text-[26px] font-bold text-slate-900 tracking-tight mb-1">Seu perfil profissional</h2>
                <p className="text-slate-400 text-sm">Essas informações aparecerão no seu perfil público. Você pode editar depois.</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {/* Especialidade */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Especialidade principal</label>
                  <div className="relative">
                    <BrainCircuit size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text" value={specialty} onChange={e => setSpecialty(e.target.value)}
                      placeholder="Ex: Psicologia Clínica, TCC, Infantil…"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                    />
                  </div>
                </div>

                {/* CRP */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CRP</label>
                  <div className="relative">
                    <Hash size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text" value={crp} onChange={e => setCrp(e.target.value)}
                      placeholder="Ex: 06/123456"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                    />
                  </div>
                </div>

                {/* Nome do consultório */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Nome do consultório <span className="text-slate-300 font-normal normal-case">(opcional)</span>
                  </label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text" value={company} onChange={e => setCompany(e.target.value)}
                      placeholder="Ex: Consultório Ana Silva"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                    />
                  </div>
                </div>

                {/* Telefone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Telefone / WhatsApp <span className="text-slate-300 font-normal normal-case">(opcional)</span>
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-5 leading-relaxed">
                Ao criar sua conta você concorda com os{' '}
                <button type="button" onClick={() => navigate('/termos-publicos')}
                  className="text-indigo-500 hover:underline">Termos de Uso</button>{' '}
                e a{' '}
                <button type="button" onClick={() => navigate('/privacidade')}
                  className="text-indigo-500 hover:underline">Política de Privacidade</button>.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-5 py-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 shadow-lg active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: '#6355D8', boxShadow: '0 4px 20px rgba(99,85,216,.35)' }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#5447C4'; }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#6355D8'; }}
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Criando conta…</>
                  : 'Criar minha conta'}
              </button>
            </form>
          )}

          {/* ── Step 2: Sucesso ── */}
          {step === 2 && done && (
            <div className="text-center py-6 animate-[fadeIn_.5s_ease-out]">
              <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <CheckCircle2 size={40} className="text-emerald-500" />
              </div>
              <h2 className="text-[26px] font-bold text-slate-900 tracking-tight mb-2">Conta criada!</h2>
              <p className="text-slate-400 text-sm max-w-xs mx-auto mb-8 leading-relaxed">
                Bem-vindo ao PsiFlux, <strong className="text-slate-700">{name.split(' ')[0]}</strong>!<br />
                Faça login para acessar seu painel e começar a configurar seu consultório.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 shadow-lg"
                style={{ background: '#6355D8', boxShadow: '0 4px 20px rgba(99,85,216,.35)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#5447C4')}
                onMouseLeave={e => (e.currentTarget.style.background = '#6355D8')}
              >
                Ir para o login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
