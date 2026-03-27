import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, getStaticUrl } from '../../services/api';
import {
  CheckCircle, ShieldCheck, AlertTriangle, ChevronRight, ChevronLeft,
  Save, Heart, Info, Clock, Send, ArrowRight, Loader2, ClipboardList,
  Phone, MessageSquare, Star, Minus, Plus, Calendar
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────── */
interface FormData {
  send_id: number;
  title: string;
  custom_message: string | null;
  template_type: 'full' | 'short';
  approach: string | null;
  allow_resume: boolean;
  allow_edit_after_submit: boolean;
  consent_required: boolean;
  fields_config: any[] | null;
  patient_name: string;
  professional: {
    name: string; specialty?: string; crp?: string;
    company_name?: string; avatar_url?: string; clinic_logo_url?: string;
  } | null;
  already_submitted: boolean;
  can_edit: boolean;
  has_progress: boolean;
  progress_data: Record<string, any> | null;
}

const FULL_ANAMNESIS_FIELDS = [
  {
    section: 'Identificação e Contexto',
    questions: [
      { id: 'motivo_busca', label: 'O que te motivou a buscar atendimento psicológico agora?', type: 'textarea', required: true, placeholder: 'Descreva com suas palavras o que está sentindo ou passando...' },
      { id: 'queixa_principal', label: 'Qual é a principal dificuldade ou sofrimento que está enfrentando?', type: 'textarea', required: true, placeholder: 'Pode ser uma situação, um sentimento, um pensamento recorrente...' },
      { id: 'tempo_sofrimento', label: 'Há quanto tempo está enfrentando essa situação?', type: 'short', required: false, placeholder: 'Ex: 3 meses, 1 ano, desde a infância...' },
    ]
  },
  {
    section: 'História Pessoal',
    questions: [
      { id: 'historico_tratamentos', label: 'Já fez algum acompanhamento psicológico ou psiquiátrico antes?', type: 'radio', required: true, options: ['Sim', 'Não', 'Estou em tratamento atualmente'] },
      { id: 'tratamentos_detalhes', label: 'Se sim, como foi essa experiência?', type: 'textarea', required: false, placeholder: 'Quando foi, quanto tempo durou, como se sentiu...' },
      { id: 'medicamentos', label: 'Faz uso de algum medicamento atualmente?', type: 'radio', required: true, options: ['Sim', 'Não'] },
      { id: 'medicamentos_quais', label: 'Se sim, quais medicamentos?', type: 'short', required: false, placeholder: 'Nome e dose, se souber...' },
      { id: 'historico_saude', label: 'Tem alguma condição de saúde (física ou mental) diagnosticada?', type: 'textarea', required: false, placeholder: 'Doenças, diagnósticos, cirurgias relevantes...' },
    ]
  },
  {
    section: 'Vida Atual',
    questions: [
      { id: 'sono', label: 'Como está seu sono?', type: 'scale', required: true, scaleMin: 'Muito ruim', scaleMax: 'Excelente' },
      { id: 'alimentacao', label: 'Como está sua alimentação?', type: 'scale', required: true, scaleMin: 'Muito ruim', scaleMax: 'Excelente' },
      { id: 'atividade_fisica', label: 'Pratica atividade física?', type: 'radio', required: true, options: ['Regularmente', 'Às vezes', 'Raramente', 'Não pratico'] },
      { id: 'trabalho_estudo', label: 'Está trabalhando ou estudando atualmente?', type: 'radio', required: true, options: ['Trabalhando', 'Estudando', 'Trabalhando e estudando', 'Nenhum dos dois'] },
      { id: 'satisfacao_trabalho', label: 'Como se sente em relação ao trabalho/estudo?', type: 'textarea', required: false, placeholder: 'Gosta do que faz, pressões, relações...' },
    ]
  },
  {
    section: 'Relacionamentos',
    questions: [
      { id: 'relacionamento_atual', label: 'Está em um relacionamento afetivo atualmente?', type: 'radio', required: true, options: ['Sim, estável', 'Sim, com dificuldades', 'Não', 'Prefiro não informar'] },
      { id: 'apoio_social', label: 'Tem pessoas próximas (família, amigos) com quem pode contar?', type: 'scale', required: true, scaleMin: 'Muito isolado(a)', scaleMax: 'Muita rede de apoio' },
      { id: 'relacoes_familiares', label: 'Como são suas relações familiares?', type: 'textarea', required: false, placeholder: 'Família de origem, filhos, conflitos, vínculos importantes...' },
    ]
  },
  {
    section: 'Saúde Emocional',
    questions: [
      { id: 'humor_geral', label: 'Como descreveria seu humor na maior parte do tempo?', type: 'scale', required: true, scaleMin: 'Muito triste', scaleMax: 'Muito bem' },
      { id: 'ansiedade', label: 'Com que frequência sente ansiedade?', type: 'radio', required: true, options: ['Raramente', 'Às vezes', 'Frequentemente', 'Quase sempre'] },
      { id: 'pensamentos_intrusivos', label: 'Tem pensamentos que te incomodam ou que ficam na mente repetidamente?', type: 'radio', required: true, options: ['Não', 'Às vezes', 'Frequentemente', 'Sempre'] },
      { id: 'pensamentos_descricao', label: 'Se sim, pode descrever brevemente o tipo de pensamento?', type: 'textarea', required: false, placeholder: 'Ex: pensamentos de preocupação, autocrítica, medo de situações...' },
      { id: 'bem_estar_geral', label: 'De forma geral, como avalia seu bem-estar hoje?', type: 'scale', required: true, scaleMin: '0 - Muito ruim', scaleMax: '10 - Ótimo' },
    ]
  },
  {
    section: 'Objetivos',
    questions: [
      { id: 'objetivos_terapia', label: 'O que espera alcançar com a terapia?', type: 'textarea', required: true, placeholder: 'Quais mudanças gostaria de ver em sua vida, pensamentos, emoções...' },
      { id: 'urgencia', label: 'Existe alguma situação urgente ou de crise que precise de atenção imediata?', type: 'radio', required: true, options: ['Não, estou estável', 'Sim, há algo urgente'] },
      { id: 'urgencia_descricao', label: 'Se sim, pode descrever?', type: 'textarea', required: false, placeholder: 'Qualquer situação de risco, crise aguda ou necessidade imediata...' },
    ]
  }
];

const SHORT_ANAMNESIS_FIELDS = [
  {
    section: 'Contexto Inicial',
    questions: [
      { id: 'motivo_busca', label: 'O que te trouxe à terapia?', type: 'textarea', required: true, placeholder: 'Descreva brevemente...' },
      { id: 'queixa_principal', label: 'Qual é sua principal dificuldade no momento?', type: 'textarea', required: true, placeholder: '' },
      { id: 'humor_geral', label: 'Como está se sentindo emocionalmente?', type: 'scale', required: true, scaleMin: 'Muito mal', scaleMax: 'Muito bem' },
      { id: 'objetivos_terapia', label: 'O que espera da terapia?', type: 'textarea', required: true, placeholder: '' },
      { id: 'urgencia', label: 'Existe algo urgente que precisa de atenção?', type: 'radio', required: true, options: ['Não, estou estável', 'Sim, há algo urgente'] },
    ]
  }
];

const CONSENT_ITEMS = [
  'Estou ciente de que este formulário coletará informações pessoais e de saúde mental.',
  'Compreendo que este formulário não substitui atendimento de urgência. Em caso de crise, ligue 188 (CVV) ou vá à UPA mais próxima.',
  'Autorizo que as informações preenchidas sejam analisadas exclusivamente pelo(a) profissional responsável pelo meu atendimento.',
  'Entendo que minhas respostas serão tratadas com sigilo profissional, conforme o Código de Ética do CFP.',
];

const CRITICAL_TERMS = ['suicid', 'me matar', 'quero morrer', 'me machucar', 'não quero mais viver', 'autoagressão', 'violência', 'abuso'];

function detectCriticalContent(answers: Record<string, any>): boolean {
  const txt = JSON.stringify(answers).toLowerCase();
  return CRITICAL_TERMS.some(t => txt.includes(t));
}

/* ─── Scale Component ────────────────────────────────── */
const ScaleInput: React.FC<{ value: number | null; onChange: (v: number) => void; min?: string; max?: string }> = ({ value, onChange, min, max }) => (
  <div className="space-y-3">
    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
      <span>{min || 'Ruim'}</span>
      <span>{max || 'Ótimo'}</span>
    </div>
    <div className="flex gap-2">
      {[1,2,3,4,5,6,7,8,9,10].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl font-black text-sm transition-all duration-200 border-2 ${
            value === n
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 scale-105'
              : n <= (value || 0)
                ? 'bg-indigo-50 text-indigo-400 border-indigo-100'
                : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-200'
          }`}
        >{n}</button>
      ))}
    </div>
  </div>
);

/* ─── Radio Component ────────────────────────────────── */
const RadioInput: React.FC<{ value: string; options: string[]; onChange: (v: string) => void }> = ({ value, options, onChange }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {options.map(opt => (
      <button
        key={opt}
        type="button"
        onClick={() => onChange(opt)}
        className={`p-4 rounded-2xl border-2 text-left text-sm font-bold transition-all duration-200 ${
          value === opt
            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
            : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${value === opt ? 'border-white bg-white' : 'border-slate-300'}`}>
            {value === opt && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
          </div>
          {opt}
        </div>
      </button>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export const AnamnesisPublic: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t');

  const [step, setStep] = useState<'loading' | 'error' | 'already_done' | 'consent' | 'form' | 'critical_alert' | 'submitted' | 'cancelled'>('loading');
  const [formData, setFormData] = useState<FormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState<boolean[]>([false, false, false, false]);
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasCritical, setHasCritical] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sections = formData?.template_type === 'short' ? SHORT_ANAMNESIS_FIELDS : FULL_ANAMNESIS_FIELDS;
  const currentSectionData = sections[currentSection];
  const totalSections = sections.length;

  /* Load form data from token */
  useEffect(() => {
    if (!token) { setError('Link inválido. Solicite um novo link ao(à) seu(sua) psicólogo(a).'); setStep('error'); return; }

    api.get(`/public-profile/anamnese/validate?t=${token}`)
      .then((data: any) => {
        setFormData(data);
        if (data.already_submitted && !data.can_edit) {
          setStep('already_done');
        } else {
          if (data.has_progress && data.progress_data) {
            setAnswers(data.progress_data);
          }
          setStep(data.consent_required ? 'consent' : 'form');
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.error || err?.message || 'Erro ao carregar formulário.';
        setError(msg);
        setStep('error');
      });
  }, [token]);

  /* Auto-save progress */
  const triggerAutoSave = useCallback((currentAnswers: Record<string, any>) => {
    if (!token || !formData?.allow_resume) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      try {
        await api.post(`/public-profile/anamnese/progress?t=${token}`, { progress_data: currentAnswers });
        setLastSaved(new Date());
      } catch { /* silent */ }
    }, 3000);
  }, [token, formData]);

  const updateAnswer = (id: string, value: any) => {
    const updated = { ...answers, [id]: value };
    setAnswers(updated);
    triggerAutoSave(updated);
  };

  /* SEO */
  useEffect(() => {
    if (formData) {
      const profName = formData.professional?.name || 'Psicólogo(a)';
      document.title = `${formData.title} | ${profName}`;
    } else {
      document.title = 'Anamnese Clínica | PsiFlux';
    }
  }, [formData]);

  /* Cancel form */
  const handleCancel = async () => {
    if (!token) return;
    try {
      await api.post(`/public-profile/anamnese/cancel?t=${token}`, {});
    } catch { /* se já cancelado ou erro, mostra tela de qualquer forma */ }
    setStep('cancelled');
  };

  /* Consent accept */
  const handleConsentSubmit = async () => {
    setSaving(true);
    try {
      await api.post(`/public-profile/anamnese/consent?t=${token}`, {});
      setStep('form');
    } catch { setError('Erro ao registrar consentimento. Tente novamente.'); }
    finally { setSaving(false); }
  };

  /* Navigation */
  const goNext = () => {
    if (currentSection < totalSections - 1) {
      setCurrentSection(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const goPrev = () => {
    if (currentSection > 0) { setCurrentSection(s => s - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };

  /* Submit */
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const resp: any = await api.post(`/public-profile/anamnese/submit?t=${token}`, { answers });
      if (resp.has_critical_content || detectCriticalContent(answers)) {
        setHasCritical(true);
        setStep('critical_alert');
      } else {
        setStep('submitted');
      }
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setStep('already_done');
      } else {
        setError(e?.response?.data?.error || 'Erro ao enviar. Tente novamente.');
      }
    } finally { setSubmitting(false); }
  };

  const allConsentChecked = consentChecked.every(Boolean);
  const prof = formData?.professional;
  const progressPercent = totalSections > 0 ? Math.round(((currentSection + 1) / totalSections) * 100) : 0;

  /* ── LOADING ── */
  if (step === 'loading') return (
    <div className="min-h-screen bg-[#fafaff] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-200">
          <Loader2 size={28} className="text-white animate-spin" />
        </div>
        <p className="text-slate-500 font-bold text-sm">Carregando seu formulário...</p>
      </div>
    </div>
  );

  /* ── ERROR ── */
  if (step === 'error') return (
    <div className="min-h-screen bg-[#fafaff] flex items-center justify-center p-6">
      <div className="bg-white rounded-[3rem] shadow-2xl p-12 max-w-md w-full space-y-6 text-center">
        <div className="w-20 h-20 bg-rose-50 rounded-[1.8rem] flex items-center justify-center mx-auto">
          <AlertTriangle size={36} className="text-rose-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Link Inválido</h2>
          <p className="text-slate-500 font-medium leading-relaxed">{error}</p>
        </div>
        <div className="pt-4 flex items-center justify-center gap-2 text-slate-300">
          <ShieldCheck size={16} />
          <span className="text-[11px] font-black uppercase tracking-widest">Segurança & Privacidade PsiFlux</span>
        </div>
      </div>
    </div>
  );

  /* ── ALREADY DONE ── */
  if (step === 'already_done') return (
    <div className="min-h-screen bg-[#fafaff] flex items-center justify-center p-6">
      <div className="bg-white rounded-[3rem] shadow-2xl p-12 max-w-md w-full space-y-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto border border-emerald-100">
          <CheckCircle size={48} className="text-emerald-500" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-slate-800">Já Respondido!</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            Você já preencheu este formulário. Suas respostas foram recebidas com segurança e serão analisadas pelo(a) seu(sua) psicólogo(a).
            <br /><br />
            Se precisar alterar algo, entre em contato diretamente.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-slate-300">
          <ShieldCheck size={16} />
          <span className="text-[11px] font-black uppercase tracking-widest">Sigilo Profissional CFP</span>
        </div>
      </div>
    </div>
  );

  /* ── SUBMITTED ── */
  if (step === 'submitted') return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-6">
      <div className="bg-white rounded-[3rem] shadow-2xl p-12 max-w-lg w-full space-y-10 text-center animate-in fade-in zoom-in duration-700">
        <div className="relative">
          <div className="w-28 h-28 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl shadow-indigo-200">
            <Heart size={52} className="text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-10 h-10 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg animate-bounce">
            <CheckCircle size={20} className="text-white" />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none">Enviado com sucesso!</h2>
          <p className="text-slate-500 font-medium leading-relaxed text-base">
            Obrigado por compartilhar. Suas respostas foram enviadas com segurança e passarão por análise clínica cuidadosa antes da sua próxima sessão.
          </p>
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-left space-y-2">
            <p className="text-indigo-700 font-black text-xs uppercase tracking-widest">O que acontece agora?</p>
            <ul className="space-y-2">
              {[
                'Seu(sua) psicólogo(a) receberá um aviso de resposta',
                'As informações serão revisadas com cuidado e sigilo',
                'Na sessão, vocês poderão aprofundar os pontos mais importantes'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-indigo-700 font-medium">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-center gap-2 opacity-40">
          <ShieldCheck size={14} className="text-indigo-400" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sigilo Psicológico CFP • Criptografia PsiFlux</span>
        </div>
      </div>
    </div>
  );

  /* ── CRITICAL ALERT ── */
  if (step === 'critical_alert') return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-[3rem] shadow-2xl p-10 max-w-lg w-full space-y-8 text-center animate-in fade-in zoom-in duration-500 border-2 border-rose-100">
        <div className="w-24 h-24 bg-rose-100 rounded-[2rem] flex items-center justify-center mx-auto">
          <AlertTriangle size={48} className="text-rose-500" />
        </div>
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-rose-800">Atenção — Respostas Recebidas</h2>
          <p className="text-rose-700 font-medium leading-relaxed">
            Suas respostas foram enviadas. Identificamos que você mencionou algo que pode precisar de atenção especial.
          </p>
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-left space-y-3">
            <p className="font-black text-rose-700 text-sm uppercase tracking-wide">Importante</p>
            <p className="text-rose-600 text-sm font-medium leading-relaxed">
              Este formulário não substitui atendimento de emergência. Se estiver em crise ou risco, entre em contato imediatamente:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-rose-100">
                <Phone size={18} className="text-rose-500 shrink-0" />
                <div>
                  <p className="font-black text-rose-700 text-sm">CVV — Centro de Valorização da Vida</p>
                  <p className="text-rose-600 text-xs font-bold">Ligue 188 — 24h por dia</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-rose-100">
                <MessageSquare size={18} className="text-rose-500 shrink-0" />
                <div>
                  <p className="font-black text-rose-700 text-sm">CAPS ou UPA mais próxima</p>
                  <p className="text-rose-600 text-xs font-bold">Atendimento presencial imediato</p>
                </div>
              </div>
            </div>
            <p className="text-rose-500 text-xs font-medium">Seu(sua) psicólogo(a) foi notificado(a) e dará atenção prioritária às suas respostas.</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 opacity-40">
          <ShieldCheck size={14} />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PsiFlux • Segurança Clínica</span>
        </div>
      </div>
    </div>
  );

  /* ── CONSENT ── */
  if (step === 'consent') return (
    <div className="min-h-screen bg-[#fafaff] font-sans pb-16">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-slate-800 text-white py-12 md:py-20 px-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -left-20 w-96 h-96 bg-white/5 rounded-full blur-[120px]" />
        <div className="max-w-2xl mx-auto space-y-6 relative z-10 text-center">
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20 w-fit mx-auto">
            <ShieldCheck size={16} className="text-indigo-200" />
            <span className="text-[11px] font-black uppercase tracking-widest text-indigo-50">Formulário Seguro e Sigiloso</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none">{formData?.title || 'Anamnese Clínica'}</h1>
          {formData?.custom_message && (
            <p className="text-indigo-100 font-medium text-lg leading-relaxed opacity-90">{formData.custom_message}</p>
          )}
          {prof && (
            <div className="flex items-center gap-4 pt-4 justify-center">
              {prof.clinic_logo_url ? (
                <img src={getStaticUrl(prof.clinic_logo_url)} alt={prof.name} className="w-12 h-12 rounded-xl bg-white/10 object-contain p-1 border-2 border-white/20" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-white/20 border-2 border-white/30 flex items-center justify-center font-black text-xl">{prof.name?.[0]}</div>
              )}
              <div className="text-left">
                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">Solicitado por</p>
                <p className="font-black text-lg">{prof.name}</p>
                {prof.crp && <p className="text-indigo-200 text-xs font-bold">CRP {prof.crp}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Consent form */}
      <div className="max-w-2xl mx-auto px-4 -mt-8 relative z-10">
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
              <ClipboardList size={22} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Antes de começar</p>
              <h2 className="text-xl font-black text-slate-800">Termo de Ciência</h2>
            </div>
          </div>

          <p className="text-slate-600 font-medium leading-relaxed text-sm">
            Para continuar, confirme que você leu e compreendeu os itens abaixo. Seu consentimento é registrado com data, hora e dados técnicos conforme a LGPD.
          </p>

          <div className="space-y-3">
            {CONSENT_ITEMS.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const next = [...consentChecked];
                  next[i] = !next[i];
                  setConsentChecked(next);
                }}
                className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
                  consentChecked[i] ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100 hover:border-indigo-100'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  consentChecked[i] ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
                }`}>
                  {consentChecked[i] && <CheckCircle size={14} className="text-white" />}
                </div>
                <p className={`text-sm font-medium leading-relaxed ${consentChecked[i] ? 'text-indigo-700' : 'text-slate-600'}`}>{item}</p>
              </button>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 font-medium leading-relaxed">
              <strong>Emergência?</strong> Este formulário não atende situações de crise imediata. Se estiver em risco, ligue <strong>188</strong> (CVV) ou vá à UPA mais próxima.
            </p>
          </div>

          <button
            onClick={handleConsentSubmit}
            disabled={!allConsentChecked || saving}
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3"
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
            {saving ? 'Registrando...' : 'Li e aceito — Começar'}
          </button>

          <div className="text-center pt-2">
            <button
              onClick={handleCancel}
              className="text-slate-400 text-xs font-medium underline underline-offset-2 hover:text-slate-600 transition"
            >
              Não consigo preencher agora — cancelar formulário
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── FORM ── */
  if (step === 'form' && currentSectionData) {
    const isLastSection = currentSection === totalSections - 1;

    return (
      <div className="min-h-screen bg-[#fafaff] font-sans pb-24">
        {/* Header compacto */}
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-800 text-white py-6 px-4 shadow-xl sticky top-0 z-20">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">{formData?.title}</p>
                <h2 className="font-black text-lg leading-tight">{currentSectionData.section}</h2>
              </div>
              <div className="text-right">
                <span className="text-indigo-200 text-[10px] font-bold uppercase">Parte</span>
                <p className="text-2xl font-black leading-none">{currentSection + 1}<span className="text-indigo-300 text-sm">/{totalSections}</span></p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
          {/* Auto-save indicator */}
          {lastSaved && (
            <div className="flex items-center gap-2 text-emerald-600 text-[11px] font-bold animate-in fade-in duration-300">
              <Save size={12} />
              <span>Progresso salvo às {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}

          {/* Questions */}
          <div className="space-y-4">
            {currentSectionData.questions.map((q, qi) => (
              <div
                key={q.id}
                className={`bg-white rounded-[1.5rem] border-2 p-6 shadow-sm transition-all duration-300 ${
                  answers[q.id] !== undefined && answers[q.id] !== ''
                    ? 'border-indigo-100 shadow-indigo-50'
                    : 'border-transparent'
                }`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <span className="shrink-0 w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-xs font-black text-indigo-500 mt-0.5">
                    {String(qi + 1).padStart(2, '0')}
                  </span>
                  <p className="text-base font-bold text-slate-800 leading-snug pt-0.5">
                    {q.label}
                    {q.required && <span className="text-rose-400 ml-1">*</span>}
                  </p>
                </div>

                {q.type === 'textarea' && (
                  <textarea
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium resize-none outline-none focus:bg-white focus:border-indigo-300 transition min-h-[100px] leading-relaxed text-slate-700"
                    placeholder={(q as any).placeholder || ''}
                    value={answers[q.id] || ''}
                    onChange={e => updateAnswer(q.id, e.target.value)}
                  />
                )}

                {q.type === 'short' && (
                  <input
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium outline-none focus:bg-white focus:border-indigo-300 transition text-slate-700"
                    placeholder={(q as any).placeholder || ''}
                    value={answers[q.id] || ''}
                    onChange={e => updateAnswer(q.id, e.target.value)}
                  />
                )}

                {q.type === 'radio' && (q as any).options && (
                  <RadioInput
                    value={answers[q.id] || ''}
                    options={(q as any).options}
                    onChange={v => updateAnswer(q.id, v)}
                  />
                )}

                {q.type === 'scale' && (
                  <ScaleInput
                    value={answers[q.id] || null}
                    onChange={v => updateAnswer(q.id, v)}
                    min={(q as any).scaleMin}
                    max={(q as any).scaleMax}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Custom fields if any */}
          {formData?.fields_config && Array.isArray(formData.fields_config) && formData.fields_config.map((field: any) => (
            <div key={field.id} className="bg-white rounded-[1.5rem] border-2 border-transparent p-6 shadow-sm">
              <p className="font-bold text-slate-800 mb-4">
                {field.label}
                {field.required && <span className="text-rose-400 ml-1">*</span>}
              </p>
              {field.type === 'textarea' && (
                <textarea className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none focus:bg-white focus:border-indigo-300 min-h-[100px] resize-none"
                  value={answers[field.id] || ''} onChange={e => updateAnswer(field.id, e.target.value)} />
              )}
              {field.type === 'short' && (
                <input className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none focus:bg-white focus:border-indigo-300"
                  value={answers[field.id] || ''} onChange={e => updateAnswer(field.id, e.target.value)} />
              )}
            </div>
          ))}

          {/* Navigation */}
          <div className="flex gap-3 pt-4 pb-8">
            {currentSection > 0 && (
              <button
                onClick={goPrev}
                className="flex items-center gap-2 h-14 px-8 rounded-2xl border-2 border-slate-200 bg-white text-slate-600 font-black text-sm uppercase tracking-widest hover:border-indigo-200 transition-all"
              >
                <ChevronLeft size={18} /> Anterior
              </button>
            )}
            <button
              onClick={isLastSection ? handleSubmit : goNext}
              disabled={submitting}
              className={`flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all flex items-center justify-center gap-3 ${
                isLastSection
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
              } disabled:opacity-50`}
            >
              {submitting ? <Loader2 size={20} className="animate-spin" /> : isLastSection ? <Send size={20} /> : <ChevronRight size={20} />}
              {submitting ? 'Enviando...' : isLastSection ? 'Enviar Respostas' : 'Próxima Parte'}
            </button>
          </div>

          {/* "Save and continue later" */}
          {formData?.allow_resume && !isLastSection && (
            <div className="text-center pb-2">
              <button onClick={() => { /* Progresso já é salvo automaticamente */ }} className="text-slate-400 text-xs font-bold underline underline-offset-2">
                Seu progresso é salvo automaticamente — pode continuar mais tarde
              </button>
            </div>
          )}

          {/* Cancelar formulário */}
          <div className="text-center pb-6">
            <button
              onClick={handleCancel}
              className="text-slate-300 text-xs font-medium underline underline-offset-2 hover:text-slate-500 transition"
            >
              Não vou conseguir preencher — cancelar este formulário
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── CANCELLED ── */
  if (step === 'cancelled') return (
    <div className="min-h-screen bg-[#fafaff] font-sans flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto border border-slate-200">
          <Info size={36} className="text-slate-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-700">Formulário cancelado</h2>
          <p className="text-slate-500 font-medium leading-relaxed text-sm">
            Tudo bem! O formulário foi cancelado e você não receberá mais lembretes sobre ele.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">
            Se quiser preencher em outro momento, solicite um novo link ao(à) seu(sua) psicólogo(a).
          </p>
        </div>
        {prof && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-lg shrink-0">
              {prof.name?.[0]}
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável pelo atendimento</p>
              <p className="font-bold text-slate-700 text-sm">{prof.name}</p>
              {prof.crp && <p className="text-slate-400 text-xs">CRP {prof.crp}</p>}
            </div>
          </div>
        )}
        <div className="flex items-center justify-center gap-2 opacity-30">
          <ShieldCheck size={14} />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PsiFlux • Segurança Clínica</span>
        </div>
      </div>
    </div>
  );

  return null;
};
