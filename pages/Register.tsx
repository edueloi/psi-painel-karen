import React, { useState } from 'react';
import {
  Mail, Lock, Eye, EyeOff, Loader2, User, Phone,
  ChevronLeft, CheckCircle2, Building2, Hash, UserCircle2,
  FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logoUrl from '../images/logo-psiflux.png';
import logoDarkUrl from '../images/logopsiflux-para-fundo-escuro.png';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';

// ── SVG Brain/Nodes Illustration (dark panel) ──────────────────────────────────
const BrainIllustration = () => (
  <svg viewBox="0 0 520 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full max-w-md mx-auto">
    <defs>
      <radialGradient id="rg-glow1" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#8B7CF6" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#8B7CF6" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="rg-glow2" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#6355D8" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#6355D8" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="rg-orb" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.9" />
        <stop offset="60%" stopColor="#6355D8" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#4338CA" stopOpacity="0.4" />
      </radialGradient>
      <filter id="reg-blur1"><feGaussianBlur stdDeviation="18" /></filter>
      <filter id="reg-blur2"><feGaussianBlur stdDeviation="10" /></filter>
      <filter id="reg-nodeglow">
        <feGaussianBlur stdDeviation="3" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    {/* Ambient glow */}
    <ellipse cx="260" cy="230" rx="180" ry="160" fill="url(#rg-glow1)" filter="url(#reg-blur1)" />
    <ellipse cx="180" cy="160" rx="120" ry="100" fill="url(#rg-glow2)" filter="url(#reg-blur1)" />
    <ellipse cx="360" cy="320" rx="100" ry="90" fill="url(#rg-glow2)" filter="url(#reg-blur1)" />
    {/* Outer ring connections */}
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
    {/* Inner ring */}
    <line x1="200" y1="165" x2="260" y2="160" stroke="#A78BFA" strokeWidth="1.2" strokeOpacity="0.6" />
    <line x1="260" y1="160" x2="330" y2="180" stroke="#A78BFA" strokeWidth="1.2" strokeOpacity="0.6" />
    <line x1="330" y1="180" x2="340" y2="250" stroke="#8B7CF6" strokeWidth="1.2" strokeOpacity="0.6" />
    <line x1="340" y1="250" x2="310" y2="320" stroke="#8B7CF6" strokeWidth="1.2" strokeOpacity="0.5" />
    <line x1="310" y1="320" x2="240" y2="330" stroke="#A78BFA" strokeWidth="1.2" strokeOpacity="0.5" />
    <line x1="240" y1="330" x2="175" y2="300" stroke="#A78BFA" strokeWidth="1.2" strokeOpacity="0.5" />
    <line x1="175" y1="300" x2="170" y2="230" stroke="#8B7CF6" strokeWidth="1.2" strokeOpacity="0.6" />
    <line x1="170" y1="230" x2="200" y2="165" stroke="#8B7CF6" strokeWidth="1.2" strokeOpacity="0.6" />
    {/* Spokes to center */}
    <line x1="200" y1="165" x2="260" y2="245" stroke="#A78BFA" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="260" y1="160" x2="260" y2="245" stroke="#A78BFA" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="330" y1="180" x2="260" y2="245" stroke="#A78BFA" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="340" y1="250" x2="260" y2="245" stroke="#8B7CF6" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="310" y1="320" x2="260" y2="245" stroke="#8B7CF6" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="240" y1="330" x2="260" y2="245" stroke="#A78BFA" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="175" y1="300" x2="260" y2="245" stroke="#A78BFA" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="170" y1="230" x2="260" y2="245" stroke="#8B7CF6" strokeWidth="0.8" strokeOpacity="0.4" />
    {/* Cross connections */}
    <line x1="140" y1="130" x2="200" y2="165" stroke="#6355D8" strokeWidth="0.8" strokeOpacity="0.35" />
    <line x1="210" y1="100" x2="260" y2="160" stroke="#6355D8" strokeWidth="0.8" strokeOpacity="0.35" />
    <line x1="370" y1="120" x2="330" y2="180" stroke="#6355D8" strokeWidth="0.8" strokeOpacity="0.35" />
    <line x1="400" y1="190" x2="340" y2="250" stroke="#8B7CF6" strokeWidth="0.8" strokeOpacity="0.35" />
    <line x1="360" y1="350" x2="310" y2="320" stroke="#8B7CF6" strokeWidth="0.8" strokeOpacity="0.35" />
    <line x1="210" y1="380" x2="240" y2="330" stroke="#8B7CF6" strokeWidth="0.8" strokeOpacity="0.35" />
    <line x1="120" y1="265" x2="170" y2="230" stroke="#6355D8" strokeWidth="0.8" strokeOpacity="0.35" />
    <line x1="145" y1="340" x2="175" y2="300" stroke="#6355D8" strokeWidth="0.8" strokeOpacity="0.35" />
    {/* Hexagons */}
    <polygon points="260,195 280,207 280,231 260,243 240,231 240,207" stroke="#6355D8" strokeWidth="1" strokeOpacity="0.3" fill="none" />
    <polygon points="260,140 290,157 290,191 260,208 230,191 230,157" stroke="#8B7CF6" strokeWidth="0.8" strokeOpacity="0.2" fill="none" />
    {/* Outer nodes */}
    <circle cx="140" cy="130" r="7" fill="#6355D8" fillOpacity="0.6" stroke="#A78BFA" strokeWidth="1.5" filter="url(#reg-nodeglow)" />
    <circle cx="210" cy="100" r="8" fill="#6355D8" fillOpacity="0.7" stroke="#A78BFA" strokeWidth="1.5" filter="url(#reg-nodeglow)" />
    <circle cx="290" cy="90" r="6" fill="#6355D8" fillOpacity="0.5" stroke="#8B7CF6" strokeWidth="1.5" />
    <circle cx="370" cy="120" r="7" fill="#6355D8" fillOpacity="0.6" stroke="#A78BFA" strokeWidth="1.5" filter="url(#reg-nodeglow)" />
    <circle cx="400" cy="190" r="9" fill="#6355D8" fillOpacity="0.8" stroke="#A78BFA" strokeWidth="2" filter="url(#reg-nodeglow)" />
    <circle cx="390" cy="270" r="6" fill="#6355D8" fillOpacity="0.5" stroke="#8B7CF6" strokeWidth="1.5" />
    <circle cx="360" cy="350" r="7" fill="#6355D8" fillOpacity="0.6" stroke="#A78BFA" strokeWidth="1.5" />
    <circle cx="290" cy="390" r="6" fill="#6355D8" fillOpacity="0.5" stroke="#8B7CF6" strokeWidth="1.5" />
    <circle cx="210" cy="380" r="7" fill="#6355D8" fillOpacity="0.6" stroke="#A78BFA" strokeWidth="1.5" />
    <circle cx="145" cy="340" r="6" fill="#6355D8" fillOpacity="0.5" stroke="#8B7CF6" strokeWidth="1.5" />
    <circle cx="120" cy="265" r="8" fill="#6355D8" fillOpacity="0.7" stroke="#A78BFA" strokeWidth="1.5" filter="url(#reg-nodeglow)" />
    <circle cx="130" cy="190" r="6" fill="#6355D8" fillOpacity="0.5" stroke="#8B7CF6" strokeWidth="1.5" />
    {/* Inner nodes */}
    <circle cx="200" cy="165" r="9" fill="#8B7CF6" fillOpacity="0.8" stroke="#A78BFA" strokeWidth="2" filter="url(#reg-nodeglow)" />
    <circle cx="260" cy="160" r="8" fill="#8B7CF6" fillOpacity="0.75" stroke="#A78BFA" strokeWidth="2" />
    <circle cx="330" cy="180" r="9" fill="#8B7CF6" fillOpacity="0.8" stroke="#A78BFA" strokeWidth="2" filter="url(#reg-nodeglow)" />
    <circle cx="340" cy="250" r="8" fill="#8B7CF6" fillOpacity="0.75" stroke="#A78BFA" strokeWidth="2" />
    <circle cx="310" cy="320" r="9" fill="#8B7CF6" fillOpacity="0.8" stroke="#A78BFA" strokeWidth="2" filter="url(#reg-nodeglow)" />
    <circle cx="240" cy="330" r="7" fill="#8B7CF6" fillOpacity="0.7" stroke="#A78BFA" strokeWidth="1.5" />
    <circle cx="175" cy="300" r="9" fill="#8B7CF6" fillOpacity="0.8" stroke="#A78BFA" strokeWidth="2" filter="url(#reg-nodeglow)" />
    <circle cx="170" cy="230" r="8" fill="#8B7CF6" fillOpacity="0.75" stroke="#A78BFA" strokeWidth="2" />
    {/* Center orb */}
    <circle cx="260" cy="245" r="28" fill="url(#rg-orb)" filter="url(#reg-blur2)" />
    <circle cx="260" cy="245" r="20" fill="#7C6FF7" fillOpacity="0.9" stroke="#A78BFA" strokeWidth="2.5" filter="url(#reg-nodeglow)" />
    <circle cx="260" cy="245" r="10" fill="#C4B5FD" fillOpacity="0.6" />
    <circle cx="255" cy="240" r="4" fill="white" fillOpacity="0.4" />
    {/* Accent dots */}
    <circle cx="450" cy="100" r="3" fill="#A78BFA" fillOpacity="0.5" />
    <circle cx="465" cy="115" r="2" fill="#8B7CF6" fillOpacity="0.4" />
    <circle cx="75" cy="400" r="3" fill="#A78BFA" fillOpacity="0.5" />
    <circle cx="60" cy="415" r="2" fill="#8B7CF6" fillOpacity="0.4" />
    <circle cx="460" cy="380" r="2.5" fill="#A78BFA" fillOpacity="0.4" />
    {/* Pulse rings */}
    <circle cx="400" cy="190" r="16" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.25" fill="none" />
    <circle cx="200" cy="165" r="15" stroke="#8B7CF6" strokeWidth="1" strokeOpacity="0.25" fill="none" />
    <circle cx="310" cy="320" r="15" stroke="#A78BFA" strokeWidth="1" strokeOpacity="0.25" fill="none" />
    <circle cx="260" cy="245" r="36" stroke="#8B7CF6" strokeWidth="1.5" strokeOpacity="0.2" fill="none" />
    <circle cx="260" cy="245" r="50" stroke="#6355D8" strokeWidth="1" strokeOpacity="0.12" fill="none" />
  </svg>
);

// ── Constants ──────────────────────────────────────────────────────────────────
const STEPS = ['Acesso', 'Perfil', 'Especialidades', 'Boas-vindas'] as const;

const SPECIALTIES = [
  'Ansiedade', 'Depressão', 'TDAH', 'Relacionamentos', 'Trauma e TEPT',
  'Luto', 'Burnout', 'Transição de Carreira', 'Autoestima',
  'Transtornos Alimentares', 'Infantil', 'Adolescência', 'Autismo (TEA)',
  'Orientação Vocacional', 'Dependência Química', 'Síndrome do Pânico',
  'Abuso Sexual', 'Abuso Psicológico', 'Problemas Familiares', 'Sexualidade',
  'Identidade de Gênero', 'Ansiedade Social', 'Fobias', 'Insônia',
  'Dor Crônica', 'Neurodivergências',
];

const ABORDAGENS = [
  'Terapia Cognitivo Comportamental (TCC)',
  'Terapia de Aceitação e Compromisso (ACT)',
  'Terapia Comportamental Dialética (DBT)',
  'Terapia dos Esquemas',
  'Psicanálise',
  'Psicoterapia Junguiana (Analítica)',
  'Terapia analítico-comportamental (Behaviorismo)',
  'Gestalt-terapia',
  'Humanista',
  'Psicologia positiva',
  'Terapia Fenomenológico-Existencial',
  'Terapia familiar',
  'Terapia de casal',
  'Logoterapia',
  'EMDR',
  'Mindfulness',
];

const DISPONIBILIDADE = ['Manhã', 'Tarde', 'Noite'];
const MODALIDADE = ['Presencial', 'Online'];

// ── Mask helpers ──────────────────────────────────────────────────────────────
function applyPhoneMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function applyCrpMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

// ── Multi-select Pill ──────────────────────────────────────────────────────────
interface PillGroupProps {
  label: string;
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
}
const PillGroup: React.FC<PillGroupProps> = ({ label, items, selected, onToggle }) => (
  <div>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">{label}</p>
    <div className="flex flex-wrap gap-2">
      {items.map(item => {
        const active = selected.includes(item);
        return (
          <button
            key={item}
            type="button"
            onClick={() => onToggle(item)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1"
            style={
              active
                ? {
                    background: '#6355D8',
                    borderColor: '#6355D8',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(99,85,216,0.30)',
                    focusRingColor: '#6355D8',
                  }
                : {
                    background: '#F8FAFC',
                    borderColor: '#E2E8F0',
                    color: '#64748B',
                  }
            }
          >
            {item}
          </button>
        );
      })}
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === 'dark';

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 0 — Acesso
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);

  // Step 1 — Perfil
  const [crp, setCrp]             = useState('');
  const [phone, setPhone]         = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gender, setGender]       = useState('');
  const [bio, setBio]             = useState('');

  // Step 2 — Especialidades
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedAbordagens, setSelectedAbordagens]   = useState<string[]>([]);
  const [selectedDisp, setSelectedDisp]               = useState<string[]>([]);
  const [selectedModal, setSelectedModal]             = useState<string[]>([]);

  // ── Password strength ──────────────────────────────────────────────────────
  const passwordStrength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8)        s++;
    if (/[A-Z]/.test(password))      s++;
    if (/[0-9]/.test(password))      s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthLabel = ['', 'Fraca', 'Média', 'Boa', 'Forte'][passwordStrength];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#3B82F6', '#10B981'][passwordStrength];

  // ── Toggle pill helper ─────────────────────────────────────────────────────
  const toggle = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setArr(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
  };

  // ── Step navigation ────────────────────────────────────────────────────────
  const goNext = () => {
    setError('');
    if (step === 0) {
      if (!name.trim())                              return setError('Digite seu nome completo.');
      if (!email.trim() || !email.includes('@'))     return setError('Digite um e-mail válido.');
      if (password.length < 8)                       return setError('A senha deve ter ao menos 8 caracteres.');
      if (password !== confirm)                      return setError('As senhas não coincidem.');
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!crp.trim())   return setError('Digite seu CRP.');
      if (!phone.trim()) return setError('Digite seu telefone.');
      setStep(2);
      return;
    }
    if (step === 2) {
      handleSubmit();
    }
  };

  const goBack = () => {
    setError('');
    setStep(s => Math.max(0, s - 1));
  };

  // ── API Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register', {
        name,
        email,
        password,
        phone,
        crp,
        specialty: selectedSpecialties.join(', '),
        company_name: companyName,
        gender,
        bio,
        abordagens: JSON.stringify(selectedAbordagens),
        disponibilidade: JSON.stringify(selectedDisp),
        modalidade: JSON.stringify(selectedModal),
      });
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared input class ─────────────────────────────────────────────────────
  const inputCls =
    'w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#6355D8] focus:ring-2 focus:ring-[#6355D8]/15 transition-all duration-200';

  // ── Accent button ──────────────────────────────────────────────────────────
  const accentBtn =
    'w-full py-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed';

  const firstName = name.split(' ')[0];

  return (
    <div className="min-h-screen w-full flex font-sans overflow-hidden">

      {/* ── LEFT PANEL — dark ───────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[48%] flex-shrink-0 relative overflow-hidden"
        style={{ background: '#0C0B1A' }}
      >
        {/* Glow layers */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 40% 35%, rgba(99,85,216,0.18) 0%, transparent 70%), ' +
              'radial-gradient(ellipse 50% 50% at 75% 70%, rgba(139,124,246,0.10) 0%, transparent 65%)',
          }}
        />

        {/* Logo */}
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

        {/* Illustration + headline */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-10 -mt-6">
          <div className="w-full max-w-[420px]">
            <BrainIllustration />
          </div>
          <div className="text-center mt-2 px-6">
            <h2 className="text-xl font-bold leading-tight" style={{ color: 'rgba(255,255,255,0.92)' }}>
              Crie sua conta grátis
            </h2>
            <p className="text-sm mt-2 leading-relaxed max-w-xs mx-auto" style={{ color: 'rgba(167,139,250,0.65)' }}>
              14 dias sem compromisso. Cancele quando quiser.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 flex items-center justify-center gap-3 p-10 pt-6">
          {[
            { value: '14 dias', label: 'Teste grátis' },
            { value: 'Sem', label: 'Cartão de crédito' },
          ].map(({ value, label }) => (
            <div
              key={label}
              className="text-center px-5 py-3 rounded-2xl border"
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderColor: 'rgba(167,139,250,0.18)',
              }}
            >
              <p className="font-bold text-[18px] leading-none" style={{ color: '#E0DEFF' }}>{value}</p>
              <p className="text-[11px] mt-1 font-medium" style={{ color: 'rgba(167,139,250,0.55)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL — form ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        <div className="w-full max-w-[480px] mx-auto px-6 sm:px-8 py-10 flex-1 flex flex-col justify-center">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md ring-2 ring-slate-100 flex-shrink-0">
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

          {/* Stepper (steps 0-2) */}
          {step < 3 && (
            <div className="flex items-center gap-2 mb-8">
              {STEPS.slice(0, 3).map((label, i) => (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-300"
                      style={
                        i < step
                          ? { background: '#6355D8', color: '#fff' }
                          : i === step
                          ? { background: '#6355D8', color: '#fff', boxShadow: '0 0 0 4px rgba(99,85,216,0.15)' }
                          : { background: '#F1F5F9', color: '#94A3B8' }
                      }
                    >
                      {i < step ? <CheckCircle2 size={14} /> : i + 1}
                    </div>
                    <span
                      className="text-xs font-semibold hidden sm:block transition-colors"
                      style={{ color: i === step ? '#1E293B' : '#94A3B8' }}
                    >
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      className="flex-1 h-0.5 rounded-full transition-all duration-500"
                      style={{ background: i < step ? '#6355D8' : '#E2E8F0' }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* ── Step 0: Acesso ─────────────────────────────────────────────── */}
          {step === 0 && (
            <div key="step-0" className="animate-[fadeIn_.35s_ease-out]">
              <div className="mb-7">
                <h2 className="text-[28px] font-bold text-slate-900 tracking-tight mb-1">Crie sua conta</h2>
                <p className="text-slate-400 text-sm">Comece agora — sem cartão de crédito.</p>
              </div>

              {error && <ErrorBanner msg={error} />}

              <div className="space-y-4">
                {/* Nome */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome completo</label>
                  <div className="relative">
                    <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Dra. Ana Silva"
                      className={inputCls}
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* E-mail */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail profissional</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="ana@consultorio.com.br"
                      className={inputCls}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Senha */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Senha</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className={`${inputCls} pr-12`}
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {password && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex gap-1 flex-1">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                            style={{ background: i <= passwordStrength ? strengthColor : '#E2E8F0' }} />
                        ))}
                      </div>
                      <span className="text-xs font-semibold w-10 text-right transition-colors"
                        style={{ color: strengthColor }}>{strengthLabel}</span>
                    </div>
                  )}
                </div>

                {/* Confirmar senha */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirmar senha</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type={showConf ? 'text' : 'password'} value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repita a senha"
                      autoComplete="new-password"
                      className={`w-full pl-11 pr-12 py-3.5 rounded-xl bg-slate-50 border text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all duration-200
                        ${confirm && confirm !== password
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                          : 'border-slate-200 focus:border-[#6355D8] focus:ring-[#6355D8]/15'}`}
                    />
                    <button type="button" onClick={() => setShowConf(s => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                      {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirm && confirm !== password && (
                    <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>
                  )}
                </div>
              </div>

              <button
                onClick={goNext}
                className={`${accentBtn} mt-7 shadow-lg`}
                style={{ background: '#6355D8', boxShadow: '0 4px 20px rgba(99,85,216,.30)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#5447C4')}
                onMouseLeave={e => (e.currentTarget.style.background = '#6355D8')}
              >
                Continuar
              </button>

              <p className="text-center text-sm text-slate-400 mt-5">
                Já tem conta?{' '}
                <button onClick={() => navigate('/login')}
                  className="font-semibold transition-colors"
                  style={{ color: '#6355D8' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#5447C4')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#6355D8')}>
                  Entrar
                </button>
              </p>
            </div>
          )}

          {/* ── Step 1: Perfil ─────────────────────────────────────────────── */}
          {step === 1 && (
            <div key="step-1" className="animate-[fadeIn_.35s_ease-out]">
              <button onClick={goBack} type="button"
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-7 transition-colors">
                <ChevronLeft size={15} /> Voltar
              </button>

              <div className="mb-7">
                <h2 className="text-[28px] font-bold text-slate-900 tracking-tight mb-1">Perfil profissional</h2>
                <p className="text-slate-400 text-sm">Essas informações poderão aparecer no seu perfil público.</p>
              </div>

              {error && <ErrorBanner msg={error} />}

              <div className="space-y-4">
                {/* CRP */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CRP</label>
                  <div className="relative">
                    <Hash size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text" value={crp}
                      onChange={e => setCrp(applyCrpMask(e.target.value))}
                      placeholder="06/123456"
                      maxLength={9}
                      className={inputCls}
                      inputMode="numeric"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">Formato: região/número (ex: 06/123456)</p>
                </div>

                {/* Telefone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone / WhatsApp</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="tel" value={phone}
                      onChange={e => setPhone(applyPhoneMask(e.target.value))}
                      placeholder="(11) 99999-9999"
                      maxLength={16}
                      className={inputCls}
                      inputMode="numeric"
                    />
                  </div>
                </div>

                {/* Nome do consultório */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Nome do consultório{' '}
                    <span className="text-slate-300 font-normal normal-case">(opcional)</span>
                  </label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                      placeholder="Ex: Consultório Ana Silva"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Gênero */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gênero</label>
                  <div className="relative">
                    <UserCircle2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value)}
                      className={`${inputCls} appearance-none cursor-pointer`}
                    >
                      <option value="">Prefiro não informar</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M6 8L1 3h10L6 8z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Apresentação{' '}
                    <span className="text-slate-300 font-normal normal-case">(opcional)</span>
                  </label>
                  <div className="relative">
                    <FileText size={15} className="absolute left-4 top-4 text-slate-400 pointer-events-none" />
                    <textarea
                      value={bio} onChange={e => setBio(e.target.value)}
                      placeholder="Conte um pouco sobre você e sua abordagem…"
                      rows={3}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#6355D8] focus:ring-2 focus:ring-[#6355D8]/15 transition-all duration-200 resize-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={goNext}
                className={`${accentBtn} mt-7 shadow-lg`}
                style={{ background: '#6355D8', boxShadow: '0 4px 20px rgba(99,85,216,.30)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#5447C4')}
                onMouseLeave={e => (e.currentTarget.style.background = '#6355D8')}
              >
                Continuar
              </button>
            </div>
          )}

          {/* ── Step 2: Especialidades ─────────────────────────────────────── */}
          {step === 2 && (
            <div key="step-2" className="animate-[fadeIn_.35s_ease-out]">
              <button onClick={goBack} type="button"
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-7 transition-colors">
                <ChevronLeft size={15} /> Voltar
              </button>

              <div className="mb-7">
                <h2 className="text-[28px] font-bold text-slate-900 tracking-tight mb-1">Especialidades</h2>
                <p className="text-slate-400 text-sm">Selecione tudo que se aplica. Você pode alterar depois.</p>
              </div>

              {error && <ErrorBanner msg={error} />}

              <div className="space-y-7">
                <PillGroup
                  label="Especialidades"
                  items={SPECIALTIES}
                  selected={selectedSpecialties}
                  onToggle={item => toggle(selectedSpecialties, setSelectedSpecialties, item)}
                />
                <PillGroup
                  label="Abordagens"
                  items={ABORDAGENS}
                  selected={selectedAbordagens}
                  onToggle={item => toggle(selectedAbordagens, setSelectedAbordagens, item)}
                />
                <PillGroup
                  label="Disponibilidade"
                  items={DISPONIBILIDADE}
                  selected={selectedDisp}
                  onToggle={item => toggle(selectedDisp, setSelectedDisp, item)}
                />
                <PillGroup
                  label="Modalidade"
                  items={MODALIDADE}
                  selected={selectedModal}
                  onToggle={item => toggle(selectedModal, setSelectedModal, item)}
                />
              </div>

              <p className="text-xs text-slate-400 mt-6 leading-relaxed">
                Ao criar sua conta você concorda com os{' '}
                <button type="button" onClick={() => navigate('/termos-publicos')}
                  className="hover:underline transition-colors" style={{ color: '#6355D8' }}>
                  Termos de Uso
                </button>{' '}
                e a{' '}
                <button type="button" onClick={() => navigate('/privacidade')}
                  className="hover:underline transition-colors" style={{ color: '#6355D8' }}>
                  Política de Privacidade
                </button>.
              </p>

              <button
                onClick={goNext}
                disabled={loading}
                className={`${accentBtn} mt-5 shadow-lg`}
                style={{ background: '#6355D8', boxShadow: '0 4px 20px rgba(99,85,216,.30)' }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#5447C4'; }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#6355D8'; }}
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Criando conta…</>
                  : 'Criar minha conta'}
              </button>
            </div>
          )}

          {/* ── Step 3: Boas-vindas ────────────────────────────────────────── */}
          {step === 3 && (
            <div key="step-3" className="flex flex-col items-center text-center py-8 animate-[fadeIn_.5s_ease-out]">
              {/* Confetti decoration */}
              <div className="flex items-center justify-center gap-1 text-3xl mb-4 select-none" aria-hidden="true">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>🎉</span>
                <span className="animate-bounce" style={{ animationDelay: '120ms' }}>✨</span>
                <span className="animate-bounce" style={{ animationDelay: '240ms' }}>🎊</span>
              </div>

              {/* Success circle */}
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #7C6FF7 0%, #6355D8 100%)', boxShadow: '0 8px 32px rgba(99,85,216,0.35)' }}
              >
                <CheckCircle2 size={44} className="text-white" />
              </div>

              <h2 className="text-[30px] font-bold text-slate-900 tracking-tight mb-3">
                Conta criada!
              </h2>
              <p className="text-slate-500 text-sm max-w-xs mx-auto mb-2 leading-relaxed">
                Bem-vindo ao PsiFlux,{' '}
                <span className="font-bold text-slate-800">{firstName}</span>! 🌟
              </p>
              <p className="text-slate-400 text-sm max-w-xs mx-auto mb-8 leading-relaxed">
                Faça login para acessar seu painel e começar a configurar seu consultório.
              </p>

              {/* Feature chips */}
              <div className="flex flex-wrap justify-center gap-2 mb-10">
                {['Agenda inteligente', 'Prontuário digital', 'Sala de vídeo', 'Perfil público'].map(feat => (
                  <span
                    key={feat}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                    style={{
                      background: 'rgba(99,85,216,0.07)',
                      borderColor: 'rgba(99,85,216,0.20)',
                      color: '#6355D8',
                    }}
                  >
                    {feat}
                  </span>
                ))}
              </div>

              <button
                onClick={() => navigate('/login')}
                className={`${accentBtn} shadow-lg`}
                style={{ background: '#6355D8', boxShadow: '0 4px 20px rgba(99,85,216,.30)' }}
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

// ── Error Banner helper (small, local) ────────────────────────────────────────
const ErrorBanner: React.FC<{ msg: string }> = ({ msg }) => (
  <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
    <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
    <span>{msg}</span>
  </div>
);
