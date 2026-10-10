
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, User, Building2, Briefcase, ChevronRight, ChevronLeft,
  Edit3, TrendingUp, TrendingDown, Wallet, Calculator, Star,
  AlertCircle, CheckCircle2, Info, X, RefreshCw, Landmark,
  Heart, GraduationCap, Stethoscope, BookOpen, HelpCircle,
  Users, Baby, Receipt, Calendar, ClipboardList
} from 'lucide-react';
import {
  Button, Modal, ModalFooter, Switch, Badge, Alert, Tabs, PanelCard, ContentCard,
  EmptyState, StatGrid, StatCard,
} from '../UI';

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

const HEALTH_TABS = [
  { id: 'reservas', label: 'Reservas', icon: Wallet },
  { id: 'anual', label: 'Visão anual', icon: Calendar },
  { id: 'impostos', label: 'Impostos', icon: Calculator },
  { id: 'obrigacoes', label: 'Obrigações', icon: ClipboardList },
] as const;
type HealthTab = typeof HEALTH_TABS[number]['id'];

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'psiflux_financial_profile';

const PROFESSION_OPTIONS = [
  { id: 'psicologo',     label: 'Psicólogo(a)',        council: 'CRP',     icon: '',  councilFee: 40  },
  { id: 'psiquiatra',    label: 'Psiquiatra',           council: 'CRM',     icon: '',  councilFee: 75  },
  { id: 'psicopedagogo', label: 'Psicopedagogo(a)',     council: 'ABPp/CRP',icon: '',  councilFee: 40  },
  { id: 'terapeuta',     label: 'Terapeuta Ocup.',      council: 'CREFITO', icon: '',  councilFee: 45  },
  { id: 'outro',         label: 'Outra profissão',      council: '—',       icon: '',  councilFee: 30  },
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
  const [healthTab, setHealthTab] = useState<HealthTab>('reservas');
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

  // A sugestão de preço não pode usar o mês em andamento nem projeções.
  // Ela é sempre calculada com o último mês calendário já encerrado.
  const now = new Date();
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const referenceMonth = monthSummaries.find(m =>
    m.year === previousMonthDate.getFullYear() && m.month === previousMonthDate.getMonth() + 1
  );
  const referenceIncome = Number(referenceMonth?.income) || 0;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const pct = (v: number, base: number) =>
    base > 0 ? ((v / base) * 100).toFixed(1) + '%' : '—';

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  if (!profile) {
    return (
      <ContentCard>
        <EmptyState
          icon={ShieldCheck}
          title="Planejamento Financeiro"
          description="Configure seu perfil profissional para receber um painel personalizado com quanto guardar para impostos, férias, 13º e muito mais."
          action={<Button variant="primary" size="sm" iconLeft={<User size={14} />} onClick={() => openSetup()}>Configurar meu perfil</Button>}
        />
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
      </ContentCard>
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
        color: 'primary',
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
        color: 'primary',
        formula: `Alíquota estimada: ${((das / base) * 100).toFixed(1)}%`,
      },
    ] : []),
    ...(profile.issApplies && profile.workType !== 'pj_simples' ? [
      {
        label: `ISS – ${profile.issRate}%`,
        desc: 'Imposto sobre Serviços (município)',
        value: iss,
        icon: <Landmark size={16} />,
        color: 'primary',
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
    primary: { bg: 'bg-primary-50', text: 'text-primary-700', border: 'border-primary-100', icon: 'text-primary-500' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-100',  icon: 'text-amber-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100',icon: 'text-emerald-500' },
    purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-100', icon: 'text-purple-500' },
    rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-100',   icon: 'text-rose-500' },
    slate:   { bg: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-100',  icon: 'text-slate-400' },
  };

  // Session fee suggestion
  const workingMonths = 11; // accounting for 1 month vacation
  const referenceInss = calcInss(referenceIncome, profile.workType);
  const referenceIr = calcIr(referenceIncome, referenceInss, profile.dependentCount, profile.workType);
  const referenceDas = calcDas(referenceIncome, profile.workType);
  const referenceIss = calcIss(referenceIncome, profile.issApplies, profile.issRate);
  const referenceAnnualNeeded = (referenceIncome + council) * 12
    + (referenceInss + referenceIr + referenceDas + referenceIss) * 12;
  const sessionSuggestion = profile.monthlySessionCount > 0 && referenceIncome > 0
    ? Math.ceil(referenceAnnualNeeded / (profile.monthlySessionCount * workingMonths) / 5) * 5
    : null;

  const annualRows = [
    ...(profile.workType === 'autonomo' ? [
      { label: 'INSS Autônomo (acumulado)', value: annualInss },
      { label: 'IR / Carnê-Leão (acumulado)', value: annualIr },
    ] : []),
    ...(profile.workType === 'pj_simples' ? [
      { label: 'DAS – Simples Nacional (acumulado)', value: annualDas },
    ] : []),
    ...(profile.issApplies && profile.workType !== 'pj_simples' ? [
      { label: `ISS ${profile.issRate}% (acumulado)`, value: annualIss },
    ] : []),
    { label: 'Reserva de Férias (acumulada)', value: annualFerias },
    { label: '13º Salário (acumulado)', value: annualDecimo },
  ];

  const obligations = getObligations(profile);
  const healthTabs = HEALTH_TABS.map(tab =>
    tab.id === 'obrigacoes' ? { ...tab, badge: obligations.length } : tab
  );

  return (
    <div className="space-y-3">
      {/* Cabeçalho do perfil */}
      <ContentCard padding="md" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-700 shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-800 text-sm">{profOption.label}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <Badge size="sm">{WORK_OPTIONS.find(w => w.id === profile.workType)?.label}</Badge>
              {profile.dependentCount > 0 && (
                <Badge size="sm" icon={<Baby size={10} />}>{profile.dependentCount} dependente(s)</Badge>
              )}
              {profile.employeeCount > 0 && (
                <Badge size="sm" icon={<Users size={10} />}>{profile.employeeCount} func.</Badge>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" iconLeft={<Edit3 size={14} />} onClick={() => openSetup(profile)}>
          Editar Perfil
        </Button>
      </ContentCard>

      {lastSixMonths.length === 0 ? (
        <Alert variant="warning">
          Sem lançamentos registrados ainda. Adicione receitas para ativar o planejamento.
        </Alert>
      ) : (
        <StatGrid cols={4}>
          <StatCard title="Receita média/mês" value={formatCurrency(avgIncome)} description={`últimos ${lastSixMonths.length} meses`} icon={TrendingUp} color="success" />
          <StatCard title="Despesa média/mês" value={formatCurrency(avgExpense)} description="média operacional" icon={TrendingDown} color="danger" />
          <StatCard
            title="Último mês"
            value={latestMonth ? `${MONTH_NAMES[latestMonth.month - 1]}/${latestMonth.year}` : '—'}
            description={latestMonth ? formatCurrency(latestMonth.income) : '—'}
            icon={Wallet}
            color="info"
          />
          <StatCard title="Total a reservar" value={formatCurrency(totalReserve)} description={`${pct(totalReserve, base)} da receita`} icon={Landmark} color="warning" />
        </StatGrid>
      )}

      <Tabs<HealthTab> items={healthTabs} value={healthTab} onChange={setHealthTab} label="Planejamento financeiro">
        {healthTab === 'reservas' && (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-500">
              Separe por mês — baseado na sua receita média de {formatCurrency(avgIncome)}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {reserveItems.map((item) => {
                const c = colorMap[item.color];
                return (
                  <div key={item.label} className={`${c.bg} border ${c.border} rounded-lg p-3`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center bg-white/70 border ${c.border}`}>
                        <span className={c.icon}>{item.icon}</span>
                      </div>
                      <span className={`text-[11px] font-medium ${c.text} bg-white/60 px-2 py-0.5 rounded-md`}>
                        {pct(item.value, base)}
                      </span>
                    </div>
                    <p className={`font-medium text-base tabular-nums ${c.text}`}>{formatCurrency(item.value)}</p>
                    <p className="font-medium text-xs text-slate-700 mt-0.5">{item.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                    <p className={`text-[11px] mt-2 ${c.icon}`}>{item.formula}</p>
                  </div>
                );
              })}
            </div>

            <PanelCard title="Resumo mensal" icon={Wallet}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">Receita bruta</p>
                  <p className="text-base font-medium text-emerald-700 tabular-nums">{formatCurrency(base)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">Reservas totais</p>
                  <p className="text-base font-medium text-amber-700 tabular-nums">{formatCurrency(totalReserve)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">Despesas oper.</p>
                  <p className="text-base font-medium text-red-600 tabular-nums">{formatCurrency(avgExpense)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">Disponível real</p>
                  <p className={`text-base font-medium tabular-nums ${disponivel >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCurrency(disponivel)}
                  </p>
                </div>
              </div>
              <div className="mt-3 bg-slate-100 rounded-full overflow-hidden h-2 flex">
                {[
                  { value: totalReserve, color: 'bg-amber-400' },
                  { value: avgExpense, color: 'bg-rose-400' },
                  { value: Math.max(0, disponivel), color: 'bg-emerald-500' },
                ].map((seg, i) => (
                  <div
                    key={i}
                    className={`${seg.color} transition-all`}
                    style={{ width: base > 0 ? `${Math.min(100, (seg.value / base) * 100)}%` : '0%' }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-4 mt-2">
                {[
                  { color: 'bg-amber-400', label: 'Reservas' },
                  { color: 'bg-rose-400', label: 'Despesas' },
                  { color: 'bg-emerald-500', label: 'Disponível' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${l.color}`} />
                    <span className="text-[11px] text-slate-500">{l.label}</span>
                  </div>
                ))}
              </div>
            </PanelCard>

            {sessionSuggestion && referenceMonth && profile.monthlySessionCount > 0 && (
              <PanelCard title="Quanto cobrar por sessão?" icon={Calculator}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <p className="flex-1 text-xs text-slate-600">
                    Com <span className="font-semibold text-slate-900">{profile.monthlySessionCount} sessões/mês</span> e
                    usando a receita do último mês fechado, o valor mínimo sugerido por sessão é:
                  </p>
                  <div className="text-center bg-primary-50 border border-primary-100 text-primary-700 px-6 py-3 rounded-lg shrink-0">
                    <p className="text-[11px] mb-0.5">Valor mínimo/sessão</p>
                    <p className="text-base font-medium tabular-nums">{formatCurrency(sessionSuggestion)}</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1">
                  <Info size={11} />
                  Baseado em {MONTH_NAMES[referenceMonth.month - 1]}/{referenceMonth.year}: {formatCurrency(referenceIncome)} de receita, {profile.monthlySessionCount} sessões × {workingMonths} meses trabalhados/ano. O mês atual e meses futuros não entram no cálculo.
                </p>
              </PanelCard>
            )}
            {!sessionSuggestion && profile.monthlySessionCount > 0 && (
              <Alert variant="info" title="Aguardando o último mês fechado">
                A sugestão por sessão será calculada quando houver receita registrada em {MONTH_NAMES[previousMonthDate.getMonth()]}/{previousMonthDate.getFullYear()}. O mês atual e meses futuros são ignorados.
              </Alert>
            )}
          </div>
        )}

        {healthTab === 'anual' && (
          <div className="space-y-3">
            {monthsWithData > 0 ? (
              <PanelCard
                title={`Visão anual — ${selectedYear}`}
                icon={Calendar}
                action={<Badge size="sm">{monthsWithData} {monthsWithData === 1 ? 'mês' : 'meses'} com dados</Badge>}
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                    <p className="text-[11px] font-medium text-emerald-700 mb-1">Faturamento acumulado</p>
                    <p className="text-base font-medium text-slate-800 tabular-nums">{formatCurrency(annualIncome)}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Total recebido em {selectedYear}</p>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <p className="text-[11px] font-medium text-red-700 mb-1">Despesas acumuladas</p>
                    <p className="text-base font-medium text-slate-800 tabular-nums">{formatCurrency(annualExpense)}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Total de custos no ano</p>
                  </div>
                  <div className="bg-primary-50 border border-primary-100 rounded-lg p-3">
                    <p className="text-[11px] font-medium text-primary-700 mb-1">Projeção para 12 meses</p>
                    <p className="text-base font-medium text-slate-800 tabular-nums">{formatCurrency(projectedIncome)}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Baseado na média dos {monthsWithData} meses</p>
                  </div>
                </div>

                <h4 className="text-xs font-semibold text-slate-700 mb-2">Obrigações acumuladas no ano</h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {annualRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="text-xs text-slate-600">{row.label}</span>
                      <span className="text-xs font-semibold text-slate-800 tabular-nums">{formatCurrency(row.value)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 rounded-b-lg">
                    <span className="text-xs font-medium text-slate-700">Total de obrigações no ano</span>
                    <span className="text-sm font-medium text-amber-700 tabular-nums">{formatCurrency(annualTotalObligation)}</span>
                  </div>
                </div>
              </PanelCard>
            ) : (
              <ContentCard>
                <EmptyState icon={Calendar} title="Sem dados no ano" description="Registre receitas para ver a visão anual." />
              </ContentCard>
            )}

            {profile.workType !== 'clt' && (
              <PanelCard
                title={profile.workType === 'pj_simples' ? 'Rastreador de DAS mensais' : 'Rastreador de DARFs mensais'}
                icon={Receipt}
                action={<Badge size="sm">{darfPaid.size}/{monthSummaries.filter(m => m.income > 0).length} pagos</Badge>}
              >
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {MONTH_NAMES.map((name, idx) => {
                    const month = idx + 1;
                    const key = `${selectedYear}-${month}`;
                    const paid = darfPaid.has(key);
                    const hasIncome = monthSummaries.some(m => m.month === month && m.income > 0);
                    return (
                      <button
                        key={month}
                        type="button"
                        onClick={() => hasIncome && toggleDarf(month)}
                        disabled={!hasIncome}
                        title={hasIncome ? (paid ? 'Marcar como pendente' : 'Marcar como pago') : 'Sem receita neste mês'}
                        className={`flex flex-col items-center gap-1 py-2.5 px-1 min-h-[44px] rounded-lg border text-center transition-colors ${
                          !hasIncome
                            ? 'opacity-40 bg-slate-50 border-slate-100'
                            : paid
                            ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-red-50 border-red-200 hover:bg-red-100'
                        }`}
                      >
                        <span className={`text-[11px] font-medium ${paid ? 'text-emerald-700' : hasIncome ? 'text-red-600' : 'text-slate-400'}`}>
                          {name}
                        </span>
                        {hasIncome && (
                          paid
                            ? <CheckCircle2 size={14} className="text-emerald-500" />
                            : <AlertCircle size={14} className="text-red-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1">
                  <Info size={11} />
                  Clique em um mês com receita para marcar o {profile.workType === 'pj_simples' ? 'DAS' : 'DARF'} como pago. Salvo localmente.
                </p>
              </PanelCard>
            )}
          </div>
        )}

        {healthTab === 'impostos' && (
          <div className="space-y-3">
            {profile.workType !== 'pj_simples' && profile.workType !== 'clt' ? (
              <PanelCard title="Tabela Carnê-Leão 2025 — sua faixa" icon={Calculator}>
                <div className="space-y-2">
                  {IR_BRACKETS.map((faixa) => {
                    const baseCalc = Math.max(0, base - inss - 189.59 * profile.dependentCount);
                    const isActive = baseCalc >= faixa.min && baseCalc <= faixa.max;
                    return (
                      <div
                        key={faixa.label}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                          isActive ? 'bg-primary-50 border-primary-300' : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <div className={`w-12 text-center shrink-0 text-xs font-semibold ${isActive ? 'text-primary-700' : 'text-slate-500'}`}>
                          {faixa.aliquota}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium ${isActive ? 'text-primary-800' : 'text-slate-600'}`}>{faixa.range}</p>
                          {faixa.deducao !== '—' && (
                            <p className="text-[11px] text-slate-500">Parcela a deduzir: {faixa.deducao}</p>
                          )}
                        </div>
                        {isActive && <Badge color="primary" size="sm">Você está aqui</Badge>}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1">
                  <Info size={11} />
                  Base de cálculo atual: {formatCurrency(Math.max(0, base - inss - 189.59 * profile.dependentCount))} (receita − INSS − dependentes)
                </p>
              </PanelCard>
            ) : (
              <ContentCard>
                <EmptyState icon={Calculator} title="Tabela do Carnê-Leão não se aplica" description="Para o seu regime de atuação o imposto é recolhido de outra forma (DAS ou folha)." />
              </ContentCard>
            )}

            {profile.workType === 'autonomo' && (
              <PanelCard title="Deduções que reduzem seu IR" icon={Receipt}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-primary-50 border border-primary-100 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-primary-700">INSS Autônomo pago</p>
                      <p className="text-[11px] text-slate-500">Deduzido da base do Carnê-Leão todo mês</p>
                    </div>
                    <span className="text-xs font-semibold text-primary-700 tabular-nums">−{formatCurrency(inss)}</span>
                  </div>
                  {profile.dependentCount > 0 && (
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                      <div>
                        <p className="text-xs font-medium text-emerald-700">{profile.dependentCount} dependente(s)</p>
                        <p className="text-[11px] text-slate-500">R$189,59 por dependente/mês</p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 tabular-nums">−{formatCurrency(189.59 * profile.dependentCount)}</span>
                    </div>
                  )}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                    <p className="text-xs font-medium text-slate-600 mb-2">
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
                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                        <span className="text-[11px] text-slate-600">{item}</span>
                      </div>
                    ))}
                    <p className="text-[11px] text-amber-700 mt-2 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Registre no Livro Caixa com comprovante — reduzem o IR no ajuste anual.
                    </p>
                  </div>
                </div>
              </PanelCard>
            )}
          </div>
        )}

        {healthTab === 'obrigacoes' && (
          <PanelCard title={`Obrigações mensais para ${profOption.label}`} icon={ClipboardList}>
            <div className="divide-y divide-slate-100">
              {obligations.map((ob) => (
                <div key={ob.label} className="flex items-start gap-3 py-2.5">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${ob.required ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                    {ob.required ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-medium text-slate-700">{ob.label}</p>
                      {ob.deadline && <Badge size="sm">{ob.deadline}</Badge>}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{ob.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </PanelCard>
        )}
      </Tabs>

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

const Stepper: React.FC<{ label: string; hint?: string; value: number; onChange: (n: number) => void; min?: number; steps?: number[] }> = ({ label, hint, value, onChange, min = 0, steps = [1] }) => (
  <div>
    <span className="block text-xs font-medium text-slate-600 mb-1.5">{label}</span>
    <div className="flex items-center gap-2">
      {[...steps].reverse().map(s => (
        <Button key={`-${s}`} variant="outline" size="sm" aria-label={`Diminuir ${s}`} onClick={() => onChange(Math.max(min, value - s))}>
          {s === 1 ? '−' : `−${s}`}
        </Button>
      ))}
      <span className="text-sm font-medium text-slate-800 w-10 text-center tabular-nums">{value}</span>
      {steps.map(s => (
        <Button key={`+${s}`} variant="outline" size="sm" aria-label={`Aumentar ${s}`} onClick={() => onChange(value + s)}>
          {s === 1 ? '+' : `+${s}`}
        </Button>
      ))}
    </div>
    {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
  </div>
);

const optionTile = (selected: boolean) =>
  `w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
    selected ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300 bg-white'
  }`;

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
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      title="Configurar Perfil Profissional"
      subtitle={`Passo ${step} de ${TOTAL_STEPS}`}
      footer={
        <ModalFooter align="between">
          <Button
            variant="ghost"
            size="sm"
            iconLeft={<ChevronLeft size={14} />}
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
          >
            {step > 1 ? 'Voltar' : 'Cancelar'}
          </Button>
          {step < TOTAL_STEPS ? (
            <Button variant="primary" size="sm" iconRight={<ChevronRight size={14} />} onClick={() => setStep(step + 1)}>
              Próximo
            </Button>
          ) : (
            <Button variant="primary" size="sm" iconLeft={<CheckCircle2 size={14} />} onClick={onSave}>
              Salvar Perfil
            </Button>
          )}
        </ModalFooter>
      }
    >
      <div className="space-y-4">
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>

        {/* Passo 1: tipo de atuação */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-800">Como você atua profissionalmente?</p>
            {WORK_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFWorkType(opt.id as any)}
                className={optionTile(fWorkType === opt.id)}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${fWorkType === opt.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'}`}>
                  {opt.icon}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[13px] text-slate-800">{opt.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                </div>
                {fWorkType === opt.id && <CheckCircle2 size={16} className="text-primary-600 ml-auto shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {/* Passo 2: profissão + dependentes */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-800 mb-3">Qual é sua profissão?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PROFESSION_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFProfession(opt.id as any)}
                    className={optionTile(fProfession === opt.id)}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{opt.label}</p>
                      <p className="text-[11px] text-slate-500">{opt.council}</p>
                    </div>
                    {fProfession === opt.id && <CheckCircle2 size={14} className="text-primary-600 ml-auto shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Stepper label="Dependentes (IR)" hint="Reduz base do IR" value={fDependents} onChange={setFDependents} />
              {fWorkType === 'pj_simples' && (
                <Stepper label="Funcionários" hint="Afeta alíquota" value={fEmployees} onChange={setFEmployees} />
              )}
            </div>
          </div>
        )}

        {/* Passo 3: sessões + ISS */}
        {step === 3 && (
          <div className="space-y-4">
            <Stepper
              label="Quantas sessões você realiza por mês (em média)?"
              hint="Usado para calcular o valor sugerido por sessão"
              value={fSessions}
              onChange={setFSessions}
              min={1}
              steps={[1, 5]}
            />

            {fWorkType !== 'pj_simples' && (
              <div className="border border-slate-200 rounded-lg p-3 space-y-3">
                <Switch
                  checked={fIssApplies}
                  onCheckedChange={setFIssApplies}
                  label="ISS no seu município?"
                  description="Imposto sobre Serviços – cobrado pela prefeitura"
                />
                {fIssApplies && (
                  <div>
                    <span className="block text-xs font-medium text-slate-600 mb-2">Alíquota ISS (%)</span>
                    <div className="flex gap-2">
                      {[2, 2.5, 3, 4, 5].map(r => (
                        <Button
                          key={r}
                          size="sm"
                          variant={fIssRate === r ? 'primary' : 'outline'}
                          className="flex-1"
                          onClick={() => setFIssRate(r)}
                        >
                          {r}%
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
