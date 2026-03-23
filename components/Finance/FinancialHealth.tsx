
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, User, Building2, Briefcase, ChevronRight, ChevronLeft,
  Edit3, TrendingUp, TrendingDown, Wallet, Calculator, Star,
  AlertCircle, CheckCircle2, Info, X, RefreshCw, Landmark,
  Heart, GraduationCap, Stethoscope, BookOpen, HelpCircle,
  Users, Baby, Receipt
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FinancialProfile {
  workType: 'autonomo' | 'pj_simples' | 'clt';
  professionType: 'psicologo' | 'psiquiatra' | 'psicopedagogo' | 'terapeuta' | 'outro';
  professionCouncil: string; // CRP, CRM, etc.
  employeeCount: number;
  dependentCount: number;
  monthlySessionCount: number;
  issApplies: boolean;
  issRate: number; // percentage 0-5
}

interface MonthSummary {
  month: number;
  year: number;
  income: number;
  expense: number;
  balance: number;
}

interface Props {
  monthSummaries: MonthSummary[];
  selectedYear: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'psiflux_financial_profile';

const PROFESSION_OPTIONS = [
  { id: 'psicologo',     label: 'Psicólogo(a)',        council: 'CRP',     icon: '🧠',  councilFee: 40  },
  { id: 'psiquiatra',    label: 'Psiquiatra',           council: 'CRM',     icon: '⚕️',  councilFee: 75  },
  { id: 'psicopedagogo', label: 'Psicopedagogo(a)',     council: 'ABPp/CRP',icon: '📚',  councilFee: 40  },
  { id: 'terapeuta',     label: 'Terapeuta Ocup.',      council: 'CREFITO', icon: '💆',  councilFee: 45  },
  { id: 'outro',         label: 'Outra profissão',      council: '—',       icon: '👤',  councilFee: 30  },
];

const WORK_OPTIONS = [
  {
    id: 'autonomo',
    label: 'Autônomo(a) – CPF',
    desc: 'Atendo por conta própria, emito recibo ou NFS-e pessoa física',
    icon: <User size={22} />,
  },
  {
    id: 'pj_simples',
    label: 'Clínica / Empresa (PJ)',
    desc: 'Tenho CNPJ, Simples Nacional ou Lucro Presumido',
    icon: <Building2 size={22} />,
  },
  {
    id: 'clt',
    label: 'Contratado(a) CLT',
    desc: 'Sou empregado de clínica ou hospital, mas quero planejar minha renda',
    icon: <Briefcase size={22} />,
  },
];

// ─── Calculation Engine ───────────────────────────────────────────────────────

const INSS_TETO_2025 = 7786.02;
const INSS_RATE_AUTONOMO = 0.20;
const INSS_MAX = INSS_TETO_2025 * INSS_RATE_AUTONOMO; // R$1,557.20

function calcInss(income: number, workType: string): number {
  if (workType === 'clt') return 0; // employer handles
  if (workType === 'pj_simples') return 0; // included in DAS
  const base = Math.min(income, INSS_TETO_2025);
  return base * INSS_RATE_AUTONOMO;
}

function calcIr(income: number, inss: number, dependentCount: number, workType: string): number {
  if (workType === 'pj_simples') return 0; // included in DAS
  const deducaoDependente = 189.59 * dependentCount;
  const base = Math.max(0, income - inss - deducaoDependente);
  if (base <= 2259.20) return 0;
  if (base <= 2826.65) return base * 0.075 - 169.44;
  if (base <= 3751.05) return base * 0.15  - 381.44;
  if (base <= 4664.68) return base * 0.225 - 662.77;
  return base * 0.275 - 896.00;
}

function calcDas(income: number, workType: string): number {
  if (workType !== 'pj_simples') return 0;
  // Simples Nacional Anexo III (serviços profissionais de saúde)
  // Faixa 1: até R$180k/ano → 6%
  // Simplificado: usar 6% para renda mensal até R$15k
  const annual = income * 12;
  if (annual <= 180000) return income * 0.06;
  if (annual <= 360000) return income * 0.1120;
  return income * 0.135;
}

function calcIss(income: number, applies: boolean, rate: number): number {
  if (!applies) return 0;
  return income * (rate / 100);
}

const MONTH_NAMES = [
  'Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez',
];

// ─── Component ────────────────────────────────────────────────────────────────

const IR_BRACKETS = [
  { label: 'Isento',  range: 'Até R$2.259,20',             aliquota: '—',    deducao: '—',       min: 0,       max: 2259.20,   color: 'emerald' },
  { label: '7,5%',   range: 'R$2.259,21 – R$2.826,65',    aliquota: '7,5%', deducao: 'R$169,44',min: 2259.21, max: 2826.65,   color: 'sky' },
  { label: '15%',    range: 'R$2.826,66 – R$3.751,05',    aliquota: '15%',  deducao: 'R$381,44',min: 2826.66, max: 3751.05,   color: 'amber' },
  { label: '22,5%',  range: 'R$3.751,06 – R$4.664,68',    aliquota: '22,5%',deducao: 'R$662,77',min: 3751.06, max: 4664.68,   color: 'orange' },
  { label: '27,5%',  range: 'Acima de R$4.664,68',        aliquota: '27,5%',deducao: 'R$896,00',min: 4664.69, max: Infinity,  color: 'rose' },
];

export const FinancialHealth: React.FC<Props> = ({ monthSummaries, selectedYear }) => {
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [darfPaid, setDarfPaid] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(`psiflux_darf_${selectedYear}`);
      return new Set(saved ? JSON.parse(saved) : []);
    } catch { return new Set(); }
  });

  const toggleDarf = (month: number) => {
    setDarfPaid(prev => {
      const key = `${selectedYear}-${month}`;
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem(`psiflux_darf_${selectedYear}`, JSON.stringify([...next]));
      return next;
    });
  };

  // Setup form state
  const [fWorkType, setFWorkType] = useState<FinancialProfile['workType']>('autonomo');
  const [fProfession, setFProfession] = useState<FinancialProfile['professionType']>('psicologo');
  const [fEmployees, setFEmployees] = useState(0);
  const [fDependents, setFDependents] = useState(0);
  const [fSessions, setFSessions] = useState(20);
  const [fIssApplies, setFIssApplies] = useState(false);
  const [fIssRate, setFIssRate] = useState(2);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setProfile(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const saveProfile = () => {
    const prof = PROFESSION_OPTIONS.find(p => p.id === fProfession)!;
    const newProfile: FinancialProfile = {
      workType: fWorkType,
      professionType: fProfession,
      professionCouncil: prof.council,
      employeeCount: fEmployees,
      dependentCount: fDependents,
      monthlySessionCount: fSessions,
      issApplies: fIssApplies,
      issRate: fIssRate,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    setProfile(newProfile);
    setIsSetupOpen(false);
    setStep(1);
  };

  const openSetup = (existing?: FinancialProfile) => {
    if (existing) {
      setFWorkType(existing.workType);
      setFProfession(existing.professionType);
      setFEmployees(existing.employeeCount);
      setFDependents(existing.dependentCount);
      setFSessions(existing.monthlySessionCount);
      setFIssApplies(existing.issApplies);
      setFIssRate(existing.issRate);
    }
    setStep(1);
    setIsSetupOpen(true);
  };

  // ── Compute averages ─────────────────────────────────────────────────────────

  const monthsWithActivity = monthSummaries.filter(
    (m: MonthSummary) => Number(m.income) > 0 || Number(m.expense) > 0
  );
  const sortedMonths = [...monthsWithActivity].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
  const lastSixMonths = sortedMonths.slice(0, 6);
  const avgIncome = lastSixMonths.length > 0
    ? lastSixMonths.reduce((s, m) => s + Number(m.income), 0) / lastSixMonths.length
    : 0;
  const avgExpense = lastSixMonths.length > 0
    ? lastSixMonths.reduce((s, m) => s + Number(m.expense), 0) / lastSixMonths.length
    : 0;
  const latestMonth = sortedMonths[0];
  const currentIncome = latestMonth ? Number(latestMonth.income) : avgIncome;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const pct = (v: number, base: number) =>
    base > 0 ? ((v / base) * 100).toFixed(1) + '%' : '—';

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-200 flex items-center justify-center mb-5 shadow-sm">
          <ShieldCheck size={36} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Planejamento Financeiro</h2>
        <p className="text-sm text-slate-500 font-bold max-w-md mb-8">
          Configure seu perfil profissional para receber um painel personalizado com quanto guardar para impostos, férias, 13º e muito mais.
        </p>
        <button
          onClick={() => openSetup()}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 transition-all active:scale-95"
        >
          <User size={15} /> Configurar meu perfil
        </button>
        {isSetupOpen && (
          <SetupModal
            step={step} setStep={setStep}
            fWorkType={fWorkType} setFWorkType={setFWorkType}
            fProfession={fProfession} setFProfession={setFProfession}
            fEmployees={fEmployees} setFEmployees={setFEmployees}
            fDependents={fDependents} setFDependents={setFDependents}
            fSessions={fSessions} setFSessions={setFSessions}
            fIssApplies={fIssApplies} setFIssApplies={setFIssApplies}
            fIssRate={fIssRate} setFIssRate={setFIssRate}
            onSave={saveProfile}
            onClose={() => setIsSetupOpen(false)}
          />
        )}
      </div>
    );
  }

  // ── Calculations ─────────────────────────────────────────────────────────────

  const base = avgIncome;
  const profOption = PROFESSION_OPTIONS.find(p => p.id === profile.professionType)!;

  const inss   = calcInss(base, profile.workType);
  const ir     = calcIr(base, inss, profile.dependentCount, profile.workType);
  const das    = calcDas(base, profile.workType);
  const iss    = calcIss(base, profile.issApplies, profile.issRate);
  const ferias = base * (1 / 12);
  const decimo = base * (1 / 12);
  const council = profOption.councilFee;

  const totalReserve = inss + ir + das + iss + ferias + decimo + council;
  const disponivel = base - totalReserve - avgExpense;

  // ── Annual totals (from actual month data) ────────────────────────────────
  const annualIncome  = monthSummaries.reduce((s, m) => s + Number(m.income), 0);
  const annualExpense = monthSummaries.reduce((s, m) => s + Number(m.expense), 0);
  const monthsWithData = monthSummaries.filter(m => Number(m.income) > 0 || Number(m.expense) > 0).length;

  const annualInss = monthSummaries.reduce((s, m) => s + calcInss(Number(m.income), profile.workType), 0);
  const annualIr   = monthSummaries.reduce((s, m) => {
    const inc = Number(m.income);
    return s + calcIr(inc, calcInss(inc, profile.workType), profile.dependentCount, profile.workType);
  }, 0);
  const annualDas  = monthSummaries.reduce((s, m) => s + calcDas(Number(m.income), profile.workType), 0);
  const annualIss  = monthSummaries.reduce((s, m) => s + calcIss(Number(m.income), profile.issApplies, profile.issRate), 0);
  const annualFerias  = annualIncome / 12;
  const annualDecimo  = annualIncome / 12;
  const annualTaxes   = annualInss + annualIr + annualDas + annualIss;
  const annualReserves = annualFerias + annualDecimo + profOption.councilFee;
  const annualTotalObligation = annualTaxes + annualReserves;

  // Projection: extrapolate avg to full 12 months
  const projectedIncome = monthsWithData > 0 ? (annualIncome / monthsWithData) * 12 : avgIncome * 12;

  const reserveItems = [
    ...(profile.workType === 'autonomo' ? [
      {
        label: 'INSS Autônomo',
        desc: '20% sobre receita (máx. R$1.557/mês)',
        value: inss,
        icon: <ShieldCheck size={16} />,
        color: 'blue',
        formula: `20% × ${formatCurrency(Math.min(base, INSS_TETO_2025))}`,
      },
      {
        label: 'IR / Carnê-Leão',
        desc: 'Imposto de Renda mensal (tabela progressiva)',
        value: ir,
        icon: <Receipt size={16} />,
        color: ir > 0 ? 'amber' : 'slate',
        formula: ir <= 0 ? 'Isento nesta faixa' : `Base líquida: ${formatCurrency(Math.max(0, base - inss - 189.59 * profile.dependentCount))}`,
      },
    ] : []),
    ...(profile.workType === 'pj_simples' ? [
      {
        label: 'DAS – Simples Nacional',
        desc: 'Unifica IR, INSS, PIS/Cofins e ISS',
        value: das,
        icon: <Landmark size={16} />,
        color: 'blue',
        formula: `Alíquota estimada: ${((das / base) * 100).toFixed(1)}%`,
      },
    ] : []),
    ...(profile.issApplies && profile.workType !== 'pj_simples' ? [
      {
        label: `ISS – ${profile.issRate}%`,
        desc: 'Imposto sobre Serviços (município)',
        value: iss,
        icon: <Landmark size={16} />,
        color: 'purple',
        formula: `${profile.issRate}% × ${formatCurrency(base)}`,
      },
    ] : []),
    {
      label: 'Reserva de Férias',
      desc: '1/12 da receita mensal (8,33%)',
      value: ferias,
      icon: <Star size={16} />,
      color: 'emerald',
      formula: `${formatCurrency(base)} ÷ 12`,
    },
    {
      label: '13º Salário',
      desc: '1/12 da receita mensal (8,33%)',
      value: decimo,
      icon: <Star size={16} />,
      color: 'emerald',
      formula: `${formatCurrency(base)} ÷ 12`,
    },
    {
      label: `Anuidade ${profOption.council}`,
      desc: 'Estimativa mensal da anuidade do conselho',
      value: council,
      icon: <GraduationCap size={16} />,
      color: 'slate',
      formula: 'Dividida em 12 meses',
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100',   icon: 'text-blue-500' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-100',  icon: 'text-amber-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100',icon: 'text-emerald-500' },
    purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-100', icon: 'text-purple-500' },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-100',   icon: 'text-rose-500' },
    slate:   { bg: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-100',  icon: 'text-slate-400' },
  };

  // Session fee suggestion
  const workingMonths = 11; // accounting for 1 month vacation
  const annualNeeded = (base + council) * 12 + (inss + ir + das + iss) * 12;
  const sessionSuggestion = profile.monthlySessionCount > 0
    ? Math.ceil(annualNeeded / (profile.monthlySessionCount * workingMonths) / 5) * 5
    : null;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-200 flex items-center justify-center text-xl">
            {profOption.icon}
          </div>
          <div>
            <p className="font-black text-slate-800 text-sm">{profOption.label}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                {WORK_OPTIONS.find(w => w.id === profile.workType)?.label}
              </span>
              {profile.dependentCount > 0 && (
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <Baby size={9} /> {profile.dependentCount} dependente(s)
                </span>
              )}
              {profile.employeeCount > 0 && (
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <Users size={9} /> {profile.employeeCount} func.
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => openSetup(profile)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-black text-slate-500 hover:text-slate-800 hover:bg-slate-50 uppercase tracking-widest transition-all"
        >
          <Edit3 size={12} /> Editar Perfil
        </button>
      </div>

      {/* Base income info */}
      {lastSixMonths.length === 0 ? (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
          <AlertCircle size={16} className="text-amber-500 shrink-0" />
          <p className="text-sm font-bold text-amber-700">
            Sem lançamentos registrados ainda. Adicione receitas para ativar o planejamento.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Base de cálculo</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Receita média/mês</p>
              <p className="text-lg font-black text-slate-800">{formatCurrency(avgIncome)}</p>
              <p className="text-[9px] text-slate-400 font-bold">últimos {lastSixMonths.length} meses</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Despesa média/mês</p>
              <p className="text-lg font-black text-rose-600">{formatCurrency(avgExpense)}</p>
              <p className="text-[9px] text-slate-400 font-bold">média operacional</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Último mês</p>
              <p className="text-lg font-black text-slate-800">
                {latestMonth ? `${MONTH_NAMES[latestMonth.month - 1]}/${latestMonth.year}` : '—'}
              </p>
              <p className="text-[9px] text-slate-400 font-bold">
                {latestMonth ? formatCurrency(latestMonth.income) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total a reservar</p>
              <p className="text-lg font-black text-amber-600">{formatCurrency(totalReserve)}</p>
              <p className="text-[9px] text-slate-400 font-bold">{pct(totalReserve, base)} da receita</p>
            </div>
          </div>
        </div>
      )}

      {/* Reserve cards */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 px-1">
          📌 Separe por mês — baseado na sua receita média de {formatCurrency(avgIncome)}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {reserveItems.map((item) => {
            const c = colorMap[item.color];
            return (
              <div
                key={item.label}
                className={`${c.bg} border ${c.border} rounded-2xl p-4`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${c.bg} border ${c.border}`}>
                    <span className={c.icon}>{item.icon}</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${c.text} bg-white/60 px-2 py-0.5 rounded-lg`}>
                    {pct(item.value, base)}
                  </span>
                </div>
                <p className={`font-black text-lg ${c.text}`}>{formatCurrency(item.value)}</p>
                <p className="font-black text-[11px] text-slate-700 mt-0.5">{item.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                <p className={`text-[9px] font-bold mt-2 ${c.icon} opacity-70`}>{item.formula}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary bar */}
      <div className="bg-slate-900 rounded-3xl p-5 text-white">
        <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-4">Resumo mensal</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-0.5">Receita bruta</p>
            <p className="text-xl font-black">{formatCurrency(base)}</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-0.5">Reservas totais</p>
            <p className="text-xl font-black text-amber-400">{formatCurrency(totalReserve)}</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-rose-400 mb-0.5">Despesas oper.</p>
            <p className="text-xl font-black text-rose-400">{formatCurrency(avgExpense)}</p>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-300 mb-0.5">Disponível real</p>
            <p className={`text-xl font-black ${disponivel >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
              {formatCurrency(disponivel)}
            </p>
          </div>
        </div>
        <div className="mt-4 bg-white/10 rounded-2xl overflow-hidden h-2.5 flex">
          {[
            { value: totalReserve, color: 'bg-amber-400' },
            { value: avgExpense, color: 'bg-rose-400' },
            { value: Math.max(0, disponivel), color: 'bg-emerald-400' },
          ].map((seg, i) => (
            <div
              key={i}
              className={`${seg.color} transition-all`}
              style={{ width: base > 0 ? `${Math.min(100, (seg.value / base) * 100)}%` : '0%' }}
            />
          ))}
        </div>
        <div className="flex gap-4 mt-2">
          {[
            { color: 'bg-amber-400', label: 'Reservas' },
            { color: 'bg-rose-400', label: 'Despesas' },
            { color: 'bg-emerald-400', label: 'Disponível' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${l.color}`} />
              <span className="text-[9px] font-black uppercase tracking-widest text-white/50">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Annual view */}
      {monthsWithData > 0 && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              📅 Visão anual — {selectedYear}
            </p>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
              {monthsWithData} {monthsWithData === 1 ? 'mês' : 'meses'} com dados
            </span>
          </div>

          {/* Income / expense / projection */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">Faturamento acumulado</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(annualIncome)}</p>
              <p className="text-[9px] text-slate-400 font-bold mt-1">Total recebido em {selectedYear}</p>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-600 mb-1">Despesas acumuladas</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(annualExpense)}</p>
              <p className="text-[9px] text-slate-400 font-bold mt-1">Total de custos no ano</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 col-span-2 sm:col-span-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-1">Projeção para 12 meses</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(projectedIncome)}</p>
              <p className="text-[9px] text-slate-400 font-bold mt-1">Baseado na média dos {monthsWithData} meses</p>
            </div>
          </div>

          {/* Annual tax/obligation breakdown */}
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">Obrigações acumuladas no ano</p>
          <div className="space-y-2">
            {[
              ...(profile.workType === 'autonomo' ? [
                { label: 'INSS Autônomo (acumulado)', value: annualInss, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
                { label: 'IR / Carnê-Leão (acumulado)', value: annualIr, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
              ] : []),
              ...(profile.workType === 'pj_simples' ? [
                { label: 'DAS – Simples Nacional (acumulado)', value: annualDas, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
              ] : []),
              ...(profile.issApplies && profile.workType !== 'pj_simples' ? [
                { label: `ISS ${profile.issRate}% (acumulado)`, value: annualIss, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100' },
              ] : []),
              { label: 'Reserva de Férias (acumulada)', value: annualFerias, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { label: '13º Salário (acumulado)', value: annualDecimo, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            ].map((row) => (
              <div key={row.label} className={`flex items-center justify-between px-4 py-2.5 ${row.bg} border ${row.border} rounded-xl`}>
                <span className={`text-[11px] font-bold ${row.color}`}>{row.label}</span>
                <span className={`text-[13px] font-black ${row.color}`}>{formatCurrency(row.value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 rounded-xl mt-1">
              <span className="text-[11px] font-black text-white/70 uppercase tracking-widest">Total de obrigações no ano</span>
              <span className="text-[15px] font-black text-amber-400">{formatCurrency(annualTotalObligation)}</span>
            </div>
          </div>
        </div>
      )}

      {/* IR Progressive Table */}
      {profile.workType !== 'pj_simples' && profile.workType !== 'clt' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4">
            📊 Tabela Carnê-Leão 2025 — sua faixa
          </p>
          <div className="space-y-2">
            {IR_BRACKETS.map((faixa) => {
              const baseCalc = Math.max(0, base - inss - 189.59 * profile.dependentCount);
              const isActive = baseCalc >= faixa.min && baseCalc <= faixa.max;
              return (
                <div
                  key={faixa.label}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300'
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className={`w-12 text-center shrink-0 text-[12px] font-black ${isActive ? 'text-amber-700' : 'text-slate-400'}`}>
                    {faixa.aliquota}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[11px] font-bold ${isActive ? 'text-amber-800' : 'text-slate-500'}`}>{faixa.range}</p>
                    {faixa.deducao !== '—' && (
                      <p className="text-[9px] text-slate-400 font-bold">Parcela a deduzir: {faixa.deducao}</p>
                    )}
                  </div>
                  {isActive && (
                    <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg shrink-0">
                      Você está aqui
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-slate-400 font-bold mt-3 flex items-center gap-1">
            <Info size={11} />
            Base de cálculo atual: {formatCurrency(Math.max(0, base - inss - 189.59 * profile.dependentCount))} (receita − INSS − dependentes)
          </p>
        </div>
      )}

      {/* Deductions */}
      {profile.workType === 'autonomo' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4">
            ✂️ Deduções que reduzem seu IR
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
              <div>
                <p className="text-[11px] font-black text-blue-700">INSS Autônomo pago</p>
                <p className="text-[10px] text-slate-400">Deduzido da base do Carnê-Leão todo mês</p>
              </div>
              <span className="text-[13px] font-black text-blue-700">−{formatCurrency(inss)}</span>
            </div>
            {profile.dependentCount > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div>
                  <p className="text-[11px] font-black text-emerald-700">{profile.dependentCount} dependente(s)</p>
                  <p className="text-[10px] text-slate-400">R$189,59 por dependente/mês</p>
                </div>
                <span className="text-[13px] font-black text-emerald-700">−{formatCurrency(189.59 * profile.dependentCount)}</span>
              </div>
            )}
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mt-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Também dedutíveis no IRPF anual (Livro Caixa)
              </p>
              {[
                'Aluguel / sublocação do consultório',
                'Material de escritório e higiene',
                'Cursos, livros e formação profissional',
                'Telefone e internet de uso profissional',
                `Anuidade ${profOption.council}`,
              ].map(item => (
                <div key={item} className="flex items-center gap-2 py-1">
                  <CheckCircle2 size={10} className="text-emerald-400 shrink-0" />
                  <span className="text-[10px] font-bold text-slate-500">{item}</span>
                </div>
              ))}
              <p className="text-[9px] text-amber-600 font-bold mt-2 flex items-center gap-1">
                <AlertCircle size={10} />
                Registre no Livro Caixa com comprovante — reduzem o IR no ajuste anual.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DARF / DAS monthly tracker */}
      {profile.workType !== 'clt' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {profile.workType === 'pj_simples' ? '🗓️ Rastreador de DAS mensais' : '🗓️ Rastreador de DARFs mensais'}
            </p>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
              {darfPaid.size}/{monthSummaries.filter(m => m.income > 0).length} pagos
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {MONTH_NAMES.map((name, idx) => {
              const month = idx + 1;
              const key = `${selectedYear}-${month}`;
              const paid = darfPaid.has(key);
              const hasIncome = monthSummaries.some(m => m.month === month && m.income > 0);
              return (
                <button
                  key={month}
                  onClick={() => hasIncome && toggleDarf(month)}
                  disabled={!hasIncome}
                  title={hasIncome ? (paid ? 'Marcar como pendente' : 'Marcar como pago') : 'Sem receita neste mês'}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-center transition-all ${
                    !hasIncome
                      ? 'opacity-30 cursor-default bg-slate-50 border-slate-100'
                      : paid
                      ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200 hover:bg-emerald-100'
                      : 'bg-rose-50 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <span className={`text-[9px] font-black uppercase tracking-widest ${paid ? 'text-emerald-700' : hasIncome ? 'text-rose-600' : 'text-slate-400'}`}>
                    {name}
                  </span>
                  {hasIncome && (
                    paid
                      ? <CheckCircle2 size={14} className="text-emerald-500" />
                      : <AlertCircle size={14} className="text-rose-400" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[9px] text-slate-400 font-bold mt-3 flex items-center gap-1">
            <Info size={11} />
            Clique em um mês com receita para marcar o {profile.workType === 'pj_simples' ? 'DAS' : 'DARF'} como pago. Salvo localmente.
          </p>
        </div>
      )}

      {/* Session fee suggestion */}
      {sessionSuggestion && profile.monthlySessionCount > 0 && (
        <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-3xl p-5">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
            💡 Quanto cobrar por sessão?
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-600">
                Com <span className="text-slate-900 font-black">{profile.monthlySessionCount} sessões/mês</span> e
                cobrindo todos os impostos e reservas, o valor mínimo sugerido por sessão é:
              </p>
            </div>
            <div className="text-center bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-lg shadow-emerald-100 shrink-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-200 mb-0.5">Valor mínimo/sessão</p>
              <p className="text-3xl font-black">{formatCurrency(sessionSuggestion)}</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-3 flex items-center gap-1">
            <Info size={11} />
            Baseado em {profile.monthlySessionCount} sessões × {workingMonths} meses trabalhados/ano. Ajuste conforme sua realidade.
          </p>
        </div>
      )}

      {/* Obligations checklist */}
      <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4">
          📋 Obrigações mensais para {profOption.label}
        </p>
        <div className="space-y-2">
          {getObligations(profile).map((ob) => (
            <div key={ob.label} className="flex items-start gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${ob.required ? 'bg-amber-100 text-amber-500' : 'bg-slate-100 text-slate-400'}`}>
                {ob.required ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-slate-700">{ob.label}</p>
                  {ob.deadline && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">{ob.deadline}</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{ob.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Setup Modal */}
      {isSetupOpen && (
        <SetupModal
          step={step} setStep={setStep}
          fWorkType={fWorkType} setFWorkType={setFWorkType}
          fProfession={fProfession} setFProfession={setFProfession}
          fEmployees={fEmployees} setFEmployees={setFEmployees}
          fDependents={fDependents} setFDependents={setFDependents}
          fSessions={fSessions} setFSessions={setFSessions}
          fIssApplies={fIssApplies} setFIssApplies={setFIssApplies}
          fIssRate={fIssRate} setFIssRate={setFIssRate}
          onSave={saveProfile}
          onClose={() => setIsSetupOpen(false)}
        />
      )}
    </div>
  );
};

// ─── Obligations helper ───────────────────────────────────────────────────────

function getObligations(profile: FinancialProfile) {
  const items = [];

  if (profile.workType === 'autonomo') {
    items.push(
      { label: 'DARF – Carnê-Leão', desc: 'Pagamento mensal do IR sobre rendimentos de pessoas físicas. Último dia útil do mês seguinte.', deadline: 'Mensal', required: true },
      { label: 'DARF – INSS Autônomo', desc: 'Código 1007 — contribuição de 20% sobre salário de contribuição.', deadline: 'Mensal', required: true },
      { label: 'e-CAC / Meu INSS', desc: 'Acompanhe sua CNIS e competências pagas no gov.br.', deadline: 'Trimestral', required: false },
    );
  }
  if (profile.workType === 'pj_simples') {
    items.push(
      { label: 'DAS – Simples Nacional', desc: 'Guia unificada com IR, INSS, PIS/Cofins e ISS. Vence todo dia 20.', deadline: 'Dia 20', required: true },
      { label: 'DASN-SIMEI / DEFIS', desc: 'Declaração anual do Simples Nacional (ano seguinte, março).', deadline: 'Anual', required: true },
    );
  }
  if (profile.issApplies && profile.workType !== 'pj_simples') {
    items.push(
      { label: 'ISS – Nota Fiscal de Serviço', desc: 'Emita NFS-e por sessão quando o pagador for pessoa física ou jurídica.', deadline: 'Por sessão', required: true },
    );
  }
  items.push(
    { label: `Anuidade ${profile.professionCouncil}`, desc: 'Mantenha o registro regular para exercer a profissão legalmente.', deadline: 'Anual', required: true },
    { label: 'Livro Caixa', desc: 'Mantenha os registros de todas as receitas com CPF do paciente para o IRPF.', deadline: 'Contínuo', required: true },
    { label: 'IRPF – Declaração Anual', desc: 'Entrega até 31 de maio. Obrigatória se usou Carnê-Leão ou renda > limite.', deadline: 'Até 31/mai', required: true },
    { label: 'Guarda de documentos', desc: 'Recibos, comprovantes e livro caixa por no mínimo 5 anos.', deadline: '5 anos', required: false },
  );
  return items;
}

// ─── Setup Modal ──────────────────────────────────────────────────────────────

interface SetupProps {
  step: number; setStep: (n: number) => void;
  fWorkType: FinancialProfile['workType']; setFWorkType: (v: FinancialProfile['workType']) => void;
  fProfession: FinancialProfile['professionType']; setFProfession: (v: FinancialProfile['professionType']) => void;
  fEmployees: number; setFEmployees: (n: number) => void;
  fDependents: number; setFDependents: (n: number) => void;
  fSessions: number; setFSessions: (n: number) => void;
  fIssApplies: boolean; setFIssApplies: (v: boolean) => void;
  fIssRate: number; setFIssRate: (v: number) => void;
  onSave: () => void;
  onClose: () => void;
}

const SetupModal: React.FC<SetupProps> = ({
  step, setStep,
  fWorkType, setFWorkType,
  fProfession, setFProfession,
  fEmployees, setFEmployees,
  fDependents, setFDependents,
  fSessions, setFSessions,
  fIssApplies, setFIssApplies,
  fIssRate, setFIssRate,
  onSave, onClose,
}) => {
  const TOTAL_STEPS = 3;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-white font-black text-sm">Configurar Perfil Profissional</p>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-0.5">
              Passo {step} de {TOTAL_STEPS}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/10 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* Step 1: Work type */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="font-black text-slate-800">Como você atua profissionalmente?</p>
              {WORK_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFWorkType(opt.id as any)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                    fWorkType === opt.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-100 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${fWorkType === opt.id ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {opt.icon}
                  </div>
                  <div>
                    <p className="font-black text-sm text-slate-800">{opt.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                  {fWorkType === opt.id && <CheckCircle2 size={18} className="text-emerald-500 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Profession + dependents */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="font-black text-slate-800 mb-3">Qual é sua profissão?</p>
                <div className="grid grid-cols-2 gap-2">
                  {PROFESSION_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setFProfession(opt.id as any)}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 text-left transition-all ${
                        fProfession === opt.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-100 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <span className="text-lg">{opt.icon}</span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-slate-700 truncate">{opt.label}</p>
                        <p className="text-[9px] text-slate-400 font-bold">{opt.council}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Dependentes (IR)
                  </label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setFDependents(Math.max(0, fDependents - 1))} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black flex items-center justify-center transition-all">−</button>
                    <span className="font-black text-slate-800 w-6 text-center">{fDependents}</span>
                    <button onClick={() => setFDependents(fDependents + 1)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black flex items-center justify-center transition-all">+</button>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">Reduz base do IR</p>
                </div>

                {fWorkType === 'pj_simples' && (
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Funcionários
                    </label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setFEmployees(Math.max(0, fEmployees - 1))} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black flex items-center justify-center transition-all">−</button>
                      <span className="font-black text-slate-800 w-6 text-center">{fEmployees}</span>
                      <button onClick={() => setFEmployees(fEmployees + 1)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black flex items-center justify-center transition-all">+</button>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold mt-1">Afeta alíquota</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Sessions + ISS */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                  Quantas sessões você realiza por mês (em média)?
                </label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setFSessions(Math.max(1, fSessions - 5))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black flex items-center justify-center transition-all">−5</button>
                  <button onClick={() => setFSessions(Math.max(1, fSessions - 1))} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black flex items-center justify-center transition-all">−</button>
                  <span className="font-black text-3xl text-slate-800 w-12 text-center">{fSessions}</span>
                  <button onClick={() => setFSessions(fSessions + 1)} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black flex items-center justify-center transition-all">+</button>
                  <button onClick={() => setFSessions(fSessions + 5)} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black flex items-center justify-center transition-all">+5</button>
                </div>
                <p className="text-[10px] text-slate-400 font-bold mt-1">Usado para calcular o valor sugerido por sessão</p>
              </div>

              {fWorkType !== 'pj_simples' && (
                <div className="border border-slate-100 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-700 text-sm">ISS no seu município?</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Imposto sobre Serviços – cobrado pela prefeitura</p>
                    </div>
                    <button
                      onClick={() => setFIssApplies(!fIssApplies)}
                      className={`w-12 h-6 rounded-full transition-all relative ${fIssApplies ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${fIssApplies ? 'left-6' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {fIssApplies && (
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        Alíquota ISS (%)
                      </label>
                      <div className="flex gap-2">
                        {[2, 2.5, 3, 4, 5].map(r => (
                          <button
                            key={r}
                            onClick={() => setFIssRate(r)}
                            className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all border ${
                              fIssRate === r
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                            }`}
                          >
                            {r}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest transition-colors"
          >
            <ChevronLeft size={14} /> {step > 1 ? 'Voltar' : 'Cancelar'}
          </button>
          {step < TOTAL_STEPS ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Próximo <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={onSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-100"
            >
              <CheckCircle2 size={14} /> Salvar Perfil
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
