import React, { useState, useEffect } from 'react';
import {
  Mail, Lock, Eye, EyeOff, Loader2, User, Phone,
  ChevronLeft, CheckCircle2, Building2, Hash, UserCircle2,
  FileText, MapPin, Home, Briefcase, Stethoscope,
  ArrowLeft, Sparkles, ShieldCheck, Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logoUrl from '../images/logo-sistema/logo.png';
import capaLogoUrl from '../images/capa-logo.png';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';
import { Combobox } from '../components/UI/Combobox';
import { fetchAddressByCep, applyCepMask } from '@/src/lib/cep';
import { WeeklyScheduleEditor, DEFAULT_WEEKLY_SCHEDULE, ScheduleDay } from '../components/Forms/WeeklyScheduleEditor';

interface ProfessionalArea {
  id: number;
  name: string;
  category: string;
  registry_label: string | null;
  registry_mask: string | null;
}

const PSYCHOLOGY_CATEGORY = 'Núcleo Principal - Diagnóstico e Tratamento';

// ── Constants ──────────────────────────────────────────────────────────────────
const STEPS = ['Acesso', 'Área', 'Perfil', 'Endereço', 'Rotina', 'Boas-vindas'] as const;

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

// Aplica a máscara de registro profissional (registry_mask) trocando cada "0" pelo
// próximo dígito digitado e preservando os separadores literais (ex: "00000/UF").
function applyRegistryMask(raw: string, mask?: string | null): string {
  if (!mask) return raw;
  const digits = raw.replace(/[^A-Za-z0-9]/g, '');
  let result = '';
  let di = 0;
  for (let i = 0; i < mask.length && di < digits.length; i++) {
    if (mask[i] === '0') {
      result += digits[di];
      di++;
    } else {
      result += mask[i];
    }
  }
  // Alguns conselhos regionais emitem registros com mais dígitos do que o
  // padrão da máscara prevê — em vez de travar, os dígitos excedentes são
  // anexados ao final para não impedir o usuário de digitar o número real.
  if (di < digits.length) {
    result += digits.slice(di);
  }
  return result;
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

// ── Multi-select Pill ──────────────────────────────────────────────────────────
interface PillGroupProps {
  label: string;
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
}
const PillGroup: React.FC<PillGroupProps> = ({ label, items, selected, onToggle }) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
    <div className="flex items-center gap-2 mb-3">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      {selected.length > 0 && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(99,85,216,0.12)', color: '#6D42F5' }}
        >
          {selected.length}
        </span>
      )}
    </div>
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
                    background: '#6D42F5',
                    borderColor: '#6D42F5',
                    color: '#fff',
                    boxShadow: '0 2px 8px rgba(99,85,216,0.30)',
                    focusRingColor: '#6D42F5',
                  }
                : {
                    background: '#fff',
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

  // Step 1 — Área de atuação
  const [areas, setAreas] = useState<ProfessionalArea[]>([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [professionalAreaId, setProfessionalAreaId] = useState('');
  const [accountType, setAccountType] = useState<'autonomo' | 'clinica'>('autonomo');

  const selectedArea = areas.find(a => String(a.id) === professionalAreaId) || null;
  const isPsychologyArea = selectedArea?.category === PSYCHOLOGY_CATEGORY;

  useEffect(() => {
    api.get<ProfessionalArea[]>('/professional-areas')
      .then(data => setAreas(data || []))
      .catch(() => setAreas([]))
      .finally(() => setAreasLoading(false));
  }, []);

  // Step 2 — Perfil
  const [registryNumber, setRegistryNumber] = useState('');
  const [cnpjCpf, setCnpjCpf]     = useState('');
  const [phone, setPhone]         = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gender, setGender]       = useState('');
  const [bio, setBio]             = useState('');

  // Step 3 — Endereço
  const [cep, setCep] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [address, setAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Step 4 — Rotina
  const [schedule, setSchedule] = useState<ScheduleDay[]>(DEFAULT_WEEKLY_SCHEDULE);

  // Step 4 — Especialidades (temas clínicos, só para área de psicologia)
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedAbordagens, setSelectedAbordagens]   = useState<string[]>([]);
  const [selectedDisp, setSelectedDisp]               = useState<string[]>([]);
  const [selectedModal, setSelectedModal]             = useState<string[]>([]);

  const handleCepChange = (raw: string) => {
    const masked = applyCepMask(raw);
    setCep(masked);
    if (masked.replace(/\D/g, '').length === 8) {
      setCepLoading(true);
      fetchAddressByCep(masked).then(result => {
        if (result) {
          setAddress(result.street);
          setNeighborhood(result.neighborhood);
          setCity(result.city);
          setState(result.state);
        }
      }).finally(() => setCepLoading(false));
    }
  };

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
      if (!professionalAreaId) return setError('Selecione sua área de atuação.');
      if (accountType === 'clinica' && !companyName.trim()) return setError('Digite o nome da clínica.');
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!phone.trim()) return setError('Digite seu telefone.');
      setStep(3);
      return;
    }
    if (step === 3) {
      setStep(4);
      return;
    }
    if (step === 4) {
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
        crp: registryNumber || undefined,
        specialty: selectedSpecialties.join(', '),
        company_name: accountType === 'clinica' ? companyName : (companyName || undefined),
        gender,
        bio,
        abordagens: JSON.stringify(selectedAbordagens),
        disponibilidade: JSON.stringify(selectedDisp),
        modalidade: JSON.stringify(selectedModal),
        professional_area_id: professionalAreaId || undefined,
        registry_number: registryNumber || undefined,
        account_type: accountType,
        cnpj_cpf: cnpjCpf || undefined,
        cep: cep || undefined,
        address: address || undefined,
        address_number: addressNumber || undefined,
        address_complement: addressComplement || undefined,
        neighborhood: neighborhood || undefined,
        city: city || undefined,
        state: state || undefined,
        schedule: JSON.stringify(schedule),
      });
      setStep(5);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared input class ─────────────────────────────────────────────────────
  const inputCls =
    'w-full pl-11 pr-4 py-2.5 min-h-[46px] rounded-xl bg-slate-50 border border-slate-200 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#6D42F5] focus:ring-2 focus:ring-[#6D42F5]/15 transition-all duration-200';

  // ── Accent button ──────────────────────────────────────────────────────────
  const accentBtn =
    'w-full py-3 min-h-[46px] rounded-xl font-bold text-[13px] text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed';

  const firstName = name.split(' ')[0];

  return (
    <div className={`register-shell${isDark ? ' dark' : ''}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        .register-shell {
          --reg-panel: #fff;
          --reg-bg: #F8F6FF;
          --reg-text: #150F2E;
          --reg-muted: #746E88;
          --reg-border: #E7E2F7;
          --reg-accent: #6D42F5;
          width: 100%;
          height: 100dvh;
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(0, 45%) minmax(500px, 55%);
          overflow: hidden;
          color: var(--reg-text);
          background: var(--reg-bg);
          font-family: 'Inter','Segoe UI',system-ui,sans-serif;
        }

        .register-shell.dark {
          --reg-panel: #151120;
          --reg-bg: #100D1B;
          --reg-text: #F5F2FF;
          --reg-muted: #A9A1BE;
          --reg-border: #2A2440;
        }

        .register-visual {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          background: #120C2E;
        }

        .register-visual-photo {
          position: absolute;
          inset: 0;
          z-index: -4;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 68% center;
          transform: scale(1.02);
        }

        .register-visual-overlay {
          position: absolute;
          inset: 0;
          z-index: -3;
          background:
            linear-gradient(90deg, rgba(9,5,29,.92) 0%, rgba(10,6,31,.78) 27%, rgba(10,6,31,.38) 57%, rgba(10,6,31,.12) 100%),
            linear-gradient(0deg, rgba(9,5,29,.88) 0%, rgba(9,5,29,.16) 50%, rgba(9,5,29,.22) 100%);
        }

        .register-visual-grid {
          position: absolute;
          inset: 0;
          z-index: -2;
          opacity: .09;
          background-image:
            linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
          background-size: 54px 54px;
          mask-image: linear-gradient(to bottom, #000, transparent 92%);
        }

        .register-visual-brand {
          position: absolute;
          left: clamp(30px,4vw,58px);
          top: clamp(30px,5vh,48px);
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #fff;
        }

        .register-visual-brand img {
          width: 40px;
          height: 40px;
          object-fit: contain;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 10px 26px rgba(0,0,0,.18);
        }

        .register-visual-brand strong {
          font-family: 'Plus Jakarta Sans',sans-serif;
          font-size: 17px;
          letter-spacing: -.04em;
        }

        .register-visual-copy {
          position: absolute;
          left: clamp(34px,5vw,68px);
          right: clamp(28px,4vw,58px);
          bottom: clamp(38px,6vh,64px);
          z-index: 2;
          max-width: 500px;
        }

        .register-visual-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 11px;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 999px;
          color: #E2D9FF;
          background: rgba(20,13,54,.34);
          backdrop-filter: blur(12px);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .07em;
          text-transform: uppercase;
        }

        .register-visual-copy h2 {
          margin: 17px 0 0;
          color: #fff;
          font-family: 'Plus Jakarta Sans',sans-serif;
          font-size: clamp(32px,3.3vw,48px);
          line-height: 1.02;
          letter-spacing: -.055em;
          font-weight: 800;
          text-wrap: balance;
          text-shadow: 0 4px 24px rgba(0,0,0,.18);
        }

        .register-visual-copy h2 span { color: #C4B5FD; }

        .register-visual-copy p {
          max-width: 470px;
          margin: 11px 0 0;
          color: rgba(255,255,255,.72);
          font-size: 12px;
          line-height: 1.6;
        }

        .register-visual-benefits {
          display: flex;
          flex-wrap: wrap;
          gap: 7px 14px;
          margin-top: 13px;
        }

        .register-visual-benefits span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: rgba(255,255,255,.72);
          font-size: 10.5px;
          font-weight: 700;
        }

        .register-visual-benefits svg { color: #77E2AD; }

        .register-float-card {
          position: absolute;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 9px;
          max-width: 245px;
          padding: 10px 12px;
          border: 1px solid rgba(255,255,255,.74);
          border-radius: 14px;
          background: rgba(255,255,255,.93);
          box-shadow: 0 18px 40px rgba(0,0,0,.20);
          backdrop-filter: blur(12px);
        }

        .register-float-card strong,
        .register-float-card small { display: block; }

        .register-float-card strong {
          color: #150F2E;
          font-size: 9.5px;
        }

        .register-float-card small {
          margin-top: 2px;
          color: #746E88;
          font-size: 7.8px;
        }

        .register-float-icon {
          width: 31px;
          height: 31px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 9px;
          color: #6D42F5;
          background: #EFE9FF;
        }

        .register-float-icon.green {
          color: #0D9155;
          background: #E4F8EE;
        }

        .register-float-a { top: 20%; left: clamp(24px,3vw,48px); }
        .register-float-b { top: 39%; right: clamp(20px,3vw,42px); }

        .register-form-panel {
          min-width: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          background:
            radial-gradient(circle at 12% 8%, rgba(109,66,245,.055), transparent 26%),
            var(--reg-panel);
        }

        .register-form-topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          min-height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 10px clamp(18px,2.6vw,32px);
          border-bottom: 1px solid rgba(231,226,247,.72);
          background: color-mix(in srgb, var(--reg-panel) 91%, transparent);
          backdrop-filter: blur(14px);
        }

        .register-form-brand {
          display: flex;
          align-items: center;
          gap: 9px;
          color: var(--reg-text);
          background: none;
          border: 0;
          cursor: pointer;
        }

        .register-form-brand img {
          width: 36px;
          height: 36px;
          object-fit: contain;
          border-radius: 11px;
          background: #fff;
        }

        .register-form-brand strong {
          font-family: 'Plus Jakarta Sans',sans-serif;
          font-size: 16px;
          letter-spacing: -.04em;
        }

        .register-form-login {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 11px;
          border: 1px solid var(--reg-border);
          border-radius: 999px;
          color: var(--reg-muted);
          background: rgba(255,255,255,.55);
          font-size: 10.5px;
          font-weight: 700;
          cursor: pointer;
        }

        .register-form-inner {
          width: min(100% - 40px, 520px);
          margin: auto;
          padding: 18px 0 24px;
        }

        .register-mobile-hero {
          display: none;
        }

        .register-stepper {
          margin-bottom: 20px;
          padding: 10px 12px;
          border: 1px solid var(--reg-border);
          border-radius: 18px;
          background: rgba(248,246,255,.72);
        }

        .dark .register-stepper {
          background: rgba(255,255,255,.03);
        }

        .register-stepper > div { min-width: 0; }

        /* Notebook / desktop com pouca altura:
           mantém tudo dentro da viewport sem scrollbar no passo inicial. */
        @media (min-width: 1025px) and (max-height: 920px) {
          .register-visual-brand {
            left: 34px;
            top: 24px;
          }

          .register-visual-brand img {
            width: 34px;
            height: 34px;
          }

          .register-visual-brand strong {
            font-size: 15px;
          }

          .register-visual-copy {
            left: 36px;
            right: 28px;
            bottom: 28px;
            max-width: 480px;
          }

          .register-visual-kicker {
            padding: 6px 10px;
            font-size: 9px;
          }

          .register-visual-copy h2 {
            margin-top: 11px;
            font-size: clamp(29px, 3vw, 42px);
            line-height: 1;
          }

          .register-visual-copy p {
            margin-top: 9px;
            max-width: 440px;
            font-size: 11px;
            line-height: 1.5;
          }

          .register-visual-benefits {
            margin-top: 10px;
          }

          .register-visual-benefits span {
            font-size: 9.5px;
          }

          .register-float-card {
            transform: scale(.90);
            transform-origin: left top;
          }

          .register-float-a {
            top: 18%;
            left: 28px;
          }

          .register-float-b {
            top: 39%;
            right: 18px;
            transform-origin: right top;
          }

          .register-form-topbar {
            min-height: 58px;
            padding: 7px 24px;
          }

          .register-form-brand img {
            width: 31px;
            height: 31px;
          }

          .register-form-brand strong {
            font-size: 15px;
          }

          .register-form-login {
            padding: 7px 10px;
            font-size: 10px;
          }

          .register-form-inner {
            width: min(100% - 40px, 500px);
            padding: 12px 0 16px;
          }

          .register-stepper {
            margin-bottom: 14px;
            padding: 8px 10px;
            border-radius: 15px;
          }

          .register-stepper .w-7 {
            width: 24px !important;
            height: 24px !important;
          }

          .register-stepper .text-xs {
            font-size: 10px !important;
          }

          .register-form-inner .mb-5 {
            margin-bottom: 14px !important;
          }

          .register-form-inner .space-y-4 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 10px !important;
          }

          .register-form-inner .space-y-5 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 12px !important;
          }

          .register-form-inner label.text-xs {
            font-size: 10px !important;
          }

          .register-form-inner input {
            min-height: 43px;
          }

          .register-form-inner button[class*="accentBtn"] {
            min-height: 43px;
          }

          .register-form-inner .mt-5 {
            margin-top: 14px !important;
          }

          .register-form-inner .mt-4 {
            margin-top: 12px !important;
          }

          .register-form-inner .mt-5.text-center,
          .register-form-inner p.text-center.mt-5 {
            margin-top: 12px !important;
            font-size: 12px !important;
          }
        }

        @media (min-width: 1025px) and (max-height: 790px) {
          .register-float-card {
            display: none;
          }

          .register-visual-copy h2 {
            font-size: clamp(28px, 2.7vw, 38px);
          }

          .register-visual-copy p {
            font-size: 10.5px;
          }

          .register-form-topbar {
            min-height: 54px;
          }

          .register-form-inner {
            padding-top: 9px;
            padding-bottom: 10px;
          }

          .register-stepper {
            margin-bottom: 11px;
            padding: 7px 9px;
          }

          .register-form-inner .mb-5 {
            margin-bottom: 11px !important;
          }
        }

        @media (max-width: 1260px) {
          .register-shell {
            grid-template-columns: minmax(0, 42%) minmax(500px, 58%);
          }

          .register-visual-copy {
            left: 30px;
            right: 24px;
          }
        }

        @media (max-width: 1024px) {
          .register-shell {
            display: block;
            height: 100dvh;
            overflow: hidden;
          }

          .register-visual { display: none; }

          .register-form-panel {
            width: 100%;
            height: 100dvh;
          }

          .register-form-inner {
            width: min(100% - 28px, 560px);
            padding: 18px 0 26px;
          }

          .register-mobile-hero {
            position: relative;
            display: block;
            min-height: 132px;
            overflow: hidden;
            margin-bottom: 16px;
            border: 1px solid var(--reg-border);
            border-radius: 24px;
            background: #120C2E;
            box-shadow: 0 18px 42px rgba(18,12,46,.10);
          }

          .register-mobile-hero img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
          }

          .register-mobile-hero::after {
            content: '';
            position: absolute;
            inset: 0;
            background:
              linear-gradient(90deg, rgba(10,6,31,.88) 0%, rgba(10,6,31,.58) 50%, rgba(10,6,31,.22) 100%),
              linear-gradient(0deg, rgba(10,6,31,.72), rgba(10,6,31,.08));
          }

          .register-mobile-hero-copy {
            position: relative;
            z-index: 2;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding: 16px;
            color: #fff;
          }

          .register-mobile-hero-copy strong {
            font-family: 'Plus Jakarta Sans',sans-serif;
            font-size: 22px;
            line-height: 1.04;
            letter-spacing: -.04em;
          }

          .register-mobile-hero-copy strong span {
            color: #C4B5FD;
          }

          .register-mobile-hero-copy small {
            max-width: 380px;
            margin-top: 6px;
            color: rgba(255,255,255,.72);
            font-size: 10.5px;
            line-height: 1.55;
          }
        }

        @media (max-width: 1024px) and (max-height: 720px) {
          .register-mobile-hero {
            display: none;
          }

          .register-form-topbar {
            min-height: 56px;
          }

          .register-form-inner {
            padding-top: 10px;
            padding-bottom: 14px;
          }

          .register-stepper {
            margin-bottom: 11px;
          }
        }

        @media (max-width: 640px) {
          .register-form-topbar {
            min-height: 60px;
            padding: 9px 12px;
          }

          .register-form-login span { display: none; }

          .register-form-inner {
            width: min(100% - 20px, 520px);
            padding-top: 12px;
          }

          .register-mobile-hero {
            min-height: 116px;
            border-radius: 18px;
          }

          .register-mobile-hero-copy {
            padding: 14px;
          }

          .register-mobile-hero-copy strong {
            font-size: 20px;
          }

          .register-stepper {
            overflow: hidden;
            margin-bottom: 14px;
            padding: 8px 9px;
          }

          .register-stepper .w-7 {
            width: 23px !important;
            height: 23px !important;
          }

          .register-stepper .text-xs {
            font-size: 9px !important;
          }

          .register-form-inner .mb-5 {
            margin-bottom: 14px !important;
          }

          .register-form-inner .space-y-4 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 10px !important;
          }

          .register-form-inner .space-y-5 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 12px !important;
          }
        }
      `}</style>

      {/* ── LEFT: imagem / posicionamento da marca ── */}
      <aside className="register-visual" aria-hidden="true">
        <img src={capaLogoUrl} alt="" className="register-visual-photo" />
        <div className="register-visual-overlay" />
        <div className="register-visual-grid" />

        <div className="register-visual-brand">
          <img src={logoUrl} alt="" />
          <strong>Plaelo</strong>
        </div>

        <div className="register-float-card register-float-a">
          <span className="register-float-icon">
            <Calendar size={15} />
          </span>
          <div>
            <strong>Comece organizado</strong>
            <small>Agenda e rotina no mesmo lugar</small>
          </div>
        </div>

        <div className="register-float-card register-float-b">
          <span className="register-float-icon green">
            <ShieldCheck size={15} />
          </span>
          <div>
            <strong>Privacidade em foco</strong>
            <small>Estrutura pensada para dados sensíveis</small>
          </div>
        </div>

        <div className="register-visual-copy">
          <span className="register-visual-kicker">
            <Sparkles size={13} />
            14 dias para conhecer a Plaelo
          </span>

          <h2>
            Comece simples.
            <span> Organize sua rotina desde o início.</span>
          </h2>

          <p>
            Configure seu perfil, sua agenda e as informações essenciais.
            Depois, a Plaelo acompanha o crescimento da sua prática ou clínica.
          </p>

          <div className="register-visual-benefits">
            <span><CheckCircle2 size={14} /> Sem cartão de crédito</span>
            <span><CheckCircle2 size={14} /> Sem fidelidade</span>
          </div>
        </div>
      </aside>

      {/* ── RIGHT: cadastro ── */}
      <section className="register-form-panel">
        <div className="register-form-topbar">
          <button type="button" className="register-form-brand" onClick={() => navigate('/')}>
            <img src={logoUrl} alt="" />
            <strong>Plaelo</strong>
          </button>

          <button type="button" className="register-form-login" onClick={() => navigate('/login')}>
            <ArrowLeft size={13} />
            <span>Já tenho conta</span>
          </button>
        </div>

        <div className="register-form-inner">
          <div className="register-mobile-hero" aria-hidden="true">
            <img src={capaLogoUrl} alt="" />
            <div className="register-mobile-hero-copy">
              <strong>
                Comece simples.
                <span> Organize sua rotina desde o início.</span>
              </strong>
              <small>14 dias grátis para conhecer a Plaelo. Sem cartão de crédito.</small>
            </div>
          </div>

          {/* Stepper (steps 0-4) */}
          {step < 5 && (
            <div className="register-stepper flex items-center gap-1.5">
              {STEPS.slice(0, 5).map((label, i) => (
                <React.Fragment key={label}>
                  <div className="flex items-center gap-1.5" title={label}>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-300"
                      style={
                        i < step
                          ? { background: '#6D42F5', color: '#fff' }
                          : i === step
                          ? { background: '#6D42F5', color: '#fff', boxShadow: '0 0 0 4px rgba(99,85,216,0.15)' }
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
                  {i < 4 && (
                    <div
                      className="flex-1 h-0.5 rounded-full transition-all duration-500"
                      style={{ background: i < step ? '#6D42F5' : '#E2E8F0' }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* ── Step 0: Acesso ─────────────────────────────────────────────── */}
          {step === 0 && (
            <div key="step-0" className="animate-[fadeIn_.35s_ease-out]">
              <div className="mb-5">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 tracking-tight mb-1">Crie sua conta</h2>
                <p className="text-slate-400 text-sm">Comece agora — sem cartão de crédito.</p>
              </div>

              {error && <ErrorBanner msg={error} />}

              <div className="space-y-4">
                {/* Nome */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome completo <span className="text-red-500">*</span></label>
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
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail profissional <span className="text-red-500">*</span></label>
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
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Senha <span className="text-red-500">*</span></label>
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
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirmar senha <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type={showConf ? 'text' : 'password'} value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repita a senha"
                      autoComplete="new-password"
                      className={`w-full pl-11 pr-12 py-2.5 min-h-[46px] rounded-xl bg-slate-50 border text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all duration-200
                        ${confirm && confirm !== password
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                          : 'border-slate-200 focus:border-[#6D42F5] focus:ring-[#6D42F5]/15'}`}
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
                className={`${accentBtn} mt-4 shadow-lg`}
                style={{ background: '#6D42F5', boxShadow: '0 4px 20px rgba(99,85,216,.30)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#5447C4')}
                onMouseLeave={e => (e.currentTarget.style.background = '#6D42F5')}
              >
                Continuar
              </button>

              <p className="text-center text-sm text-slate-400 mt-5">
                Já tem conta?{' '}
                <button onClick={() => navigate('/login')}
                  className="font-semibold transition-colors"
                  style={{ color: '#6D42F5' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#5447C4')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#6D42F5')}>
                  Entrar
                </button>
              </p>
            </div>
          )}

          {/* ── Step 1: Área de atuação ────────────────────────────────────── */}
          {step === 1 && (
            <div key="step-1" className="animate-[fadeIn_.35s_ease-out]">
              <button onClick={goBack} type="button"
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-7 transition-colors">
                <ChevronLeft size={15} /> Voltar
              </button>

              <div className="mb-5">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 tracking-tight mb-1">Sua área de atuação</h2>
                <p className="text-slate-400 text-sm">Isso ajuda a personalizar o sistema para o seu dia a dia.</p>
              </div>

              {error && <ErrorBanner msg={error} />}

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Área de atuação <span className="text-red-500">*</span></label>
                  <Combobox
                    options={areas.map(a => ({ value: String(a.id), label: a.name, group: a.category }))}
                    value={professionalAreaId}
                    onChange={v => setProfessionalAreaId(v as string)}
                    placeholder={areasLoading ? 'Carregando áreas…' : 'Selecione sua área'}
                    disabled={areasLoading}
                    icon={<Stethoscope size={15} />}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de conta</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'autonomo' as const, label: 'Autônomo', icon: <User size={18} /> },
                      { value: 'clinica' as const, label: 'Clínica', icon: <Briefcase size={18} /> },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAccountType(opt.value)}
                        className="flex flex-col items-center gap-2 rounded-xl border py-4 transition-all duration-150"
                        style={
                          accountType === opt.value
                            ? { background: 'rgba(99,85,216,0.06)', borderColor: '#6D42F5', color: '#6D42F5' }
                            : { background: '#fff', borderColor: '#E2E8F0', color: '#64748B' }
                        }
                      >
                        {opt.icon}
                        <span className="text-sm font-semibold">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {accountType === 'clinica' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome da clínica <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Building2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                        placeholder="Ex: Clínica Vida Plena"
                        className={inputCls}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={goNext}
                className={`${accentBtn} mt-4 shadow-lg`}
                style={{ background: '#6D42F5', boxShadow: '0 4px 20px rgba(99,85,216,.30)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#5447C4')}
                onMouseLeave={e => (e.currentTarget.style.background = '#6D42F5')}
              >
                Continuar
              </button>
            </div>
          )}

          {/* ── Step 2: Perfil ─────────────────────────────────────────────── */}
          {step === 2 && (
            <div key="step-2" className="animate-[fadeIn_.35s_ease-out]">
              <button onClick={goBack} type="button"
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-7 transition-colors">
                <ChevronLeft size={15} /> Voltar
              </button>

              <div className="mb-5">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 tracking-tight mb-1">Perfil profissional</h2>
                <p className="text-slate-400 text-sm">Essas informações poderão aparecer no seu perfil público.</p>
              </div>

              {error && <ErrorBanner msg={error} />}

              <div className="space-y-4">
                {/* Registro profissional (dinâmico conforme a área escolhida) */}
                {selectedArea?.registry_label && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{selectedArea.registry_label}</label>
                    <div className="relative">
                      <Hash size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text" value={registryNumber}
                        onChange={e => setRegistryNumber(applyRegistryMask(e.target.value, selectedArea.registry_mask))}
                        placeholder={selectedArea.registry_mask || ''}
                        className={inputCls}
                      />
                    </div>
                    {selectedArea.registry_mask && (
                      <p className="text-[11px] text-slate-400">Formato: {selectedArea.registry_mask}</p>
                    )}
                  </div>
                )}

                {/* CPF / CNPJ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CPF ou CNPJ</label>
                  <div className="relative">
                    <FileText size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text" value={cnpjCpf}
                      onChange={e => setCnpjCpf(applyCpfCnpjMask(e.target.value))}
                      placeholder="000.000.000-00"
                      className={inputCls}
                      inputMode="numeric"
                    />
                  </div>
                </div>

                {/* Telefone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone / WhatsApp <span className="text-red-500">*</span></label>
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
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#6D42F5] focus:ring-2 focus:ring-[#6D42F5]/15 transition-all duration-200 resize-none"
                    />
                  </div>
                </div>

                {/* Temas clínicos e abordagens — só para área de psicologia */}
                {isPsychologyArea && (
                  <div className="space-y-7 pt-3">
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
                )}
              </div>

              <button
                onClick={goNext}
                className={`${accentBtn} mt-4 shadow-lg`}
                style={{ background: '#6D42F5', boxShadow: '0 4px 20px rgba(99,85,216,.30)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#5447C4')}
                onMouseLeave={e => (e.currentTarget.style.background = '#6D42F5')}
              >
                Continuar
              </button>
            </div>
          )}

          {/* ── Step 3: Endereço ───────────────────────────────────────────── */}
          {step === 3 && (
            <div key="step-3" className="animate-[fadeIn_.35s_ease-out]">
              <button onClick={goBack} type="button"
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-7 transition-colors">
                <ChevronLeft size={15} /> Voltar
              </button>

              <div className="mb-5">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 tracking-tight mb-1">Endereço</h2>
                <p className="text-slate-400 text-sm">Onde você atende ou onde fica sua clínica.</p>
              </div>

              {error && <ErrorBanner msg={error} />}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CEP</label>
                    <div className="relative">
                      <MapPin size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text" value={cep}
                        onChange={e => handleCepChange(e.target.value)}
                        placeholder="00000-000"
                        maxLength={9}
                        className={inputCls}
                        inputMode="numeric"
                      />
                      {cepLoading && (
                        <Loader2 size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</label>
                    <input
                      type="text" value={state} onChange={e => setState(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="UF"
                      className={`${inputCls} pl-4`}
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rua / Logradouro</label>
                  <div className="relative">
                    <Home size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text" value={address} onChange={e => setAddress(e.target.value)}
                      placeholder="Rua, avenida..."
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Número</label>
                    <input
                      type="text" value={addressNumber} onChange={e => setAddressNumber(e.target.value)}
                      placeholder="Nº"
                      className={`${inputCls} pl-4`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Complemento <span className="text-slate-300 font-normal normal-case">(opcional)</span>
                    </label>
                    <input
                      type="text" value={addressComplement} onChange={e => setAddressComplement(e.target.value)}
                      placeholder="Sala, bloco..."
                      className={`${inputCls} pl-4`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bairro</label>
                    <input
                      type="text" value={neighborhood} onChange={e => setNeighborhood(e.target.value)}
                      placeholder="Bairro"
                      className={`${inputCls} pl-4`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cidade</label>
                    <input
                      type="text" value={city} onChange={e => setCity(e.target.value)}
                      placeholder="Cidade"
                      className={`${inputCls} pl-4`}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={goNext}
                className={`${accentBtn} mt-4 shadow-lg`}
                style={{ background: '#6D42F5', boxShadow: '0 4px 20px rgba(99,85,216,.30)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#5447C4')}
                onMouseLeave={e => (e.currentTarget.style.background = '#6D42F5')}
              >
                Continuar
              </button>
            </div>
          )}

          {/* ── Step 4: Rotina semanal ─────────────────────────────────────── */}
          {step === 4 && (
            <div key="step-4" className="animate-[fadeIn_.35s_ease-out]">
              <button onClick={goBack} type="button"
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-7 transition-colors">
                <ChevronLeft size={15} /> Voltar
              </button>

              <div className="mb-5">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 tracking-tight mb-1">Rotina semanal</h2>
                <p className="text-slate-400 text-sm">Defina seus horários de atendimento. Você pode ajustar isso depois.</p>
              </div>

              {error && <ErrorBanner msg={error} />}

              <WeeklyScheduleEditor schedule={schedule} onChange={setSchedule} />

              <p className="text-xs text-slate-400 mt-6 leading-relaxed">
                Ao criar sua conta você concorda com os{' '}
                <a href="/termos-de-uso" target="_blank" rel="noopener noreferrer"
                  className="hover:underline transition-colors" style={{ color: '#6D42F5' }}>
                  Termos de Uso
                </a>{' '}
                e a{' '}
                <a href="/politica-privacidade" target="_blank" rel="noopener noreferrer"
                  className="hover:underline transition-colors" style={{ color: '#6D42F5' }}>
                  Política de Privacidade
                </a>.
              </p>

              <button
                onClick={goNext}
                disabled={loading}
                className={`${accentBtn} mt-4 shadow-lg`}
                style={{ background: '#6D42F5', boxShadow: '0 4px 20px rgba(99,85,216,.30)' }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#5447C4'; }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#6D42F5'; }}
              >
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Criando conta…</>
                  : 'Criar minha conta'}
              </button>
            </div>
          )}

          {/* ── Step 5: Boas-vindas ────────────────────────────────────────── */}
          {step === 5 && (
            <div key="step-5" className="flex flex-col items-center text-center py-8 animate-[fadeIn_.5s_ease-out]">
              {/* Confetti decoration */}
              <div className="flex items-center justify-center gap-1 text-3xl mb-4 select-none" aria-hidden="true">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>🎉</span>
                <span className="animate-bounce" style={{ animationDelay: '120ms' }}>✨</span>
                <span className="animate-bounce" style={{ animationDelay: '240ms' }}>🎊</span>
              </div>

              {/* Success circle */}
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #7C6FF7 0%, #6D42F5 100%)', boxShadow: '0 8px 32px rgba(99,85,216,0.35)' }}
              >
                <CheckCircle2 size={44} className="text-white" />
              </div>

              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 tracking-tight mb-3">
                Conta criada!
              </h2>
              <p className="text-slate-500 text-sm max-w-xs mx-auto mb-2 leading-relaxed">
                Bem-vindo à Plaelo,{' '}
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
                      color: '#6D42F5',
                    }}
                  >
                    {feat}
                  </span>
                ))}
              </div>

              <button
                onClick={() => navigate('/login')}
                className={`${accentBtn} shadow-lg`}
                style={{ background: '#6D42F5', boxShadow: '0 4px 20px rgba(99,85,216,.30)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#5447C4')}
                onMouseLeave={e => (e.currentTarget.style.background = '#6D42F5')}
              >
                Ir para o login
              </button>
            </div>
          )}

        </div>
      </section>
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
