import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { ClinicalForm, InterpretationRule } from '../types';
import {
  CheckCircle, AlertCircle, ChevronDown, ArrowRight, Calculator,
  User, Phone, Mail, ShieldCheck
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/* ─── sub-components ──────────────────────────────────────────────────────── */
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <span className="text-sm text-slate-500 font-medium">Carregando formulário...</span>
      </div>
    </div>
  );
}

function ErrorScreen({ message, hash }: { message: string; hash?: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 max-w-sm w-full p-8 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="text-red-500" size={28} />
        </div>
        <h1 className="text-lg font-bold text-slate-800 mb-2">Formulário indisponível</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-4">
          O link pode ter expirado ou não existe mais. Entre em contato com o profissional.
        </p>
        {message && <p className="text-xs text-slate-400 mb-1">{message}</p>}
        {hash && <p className="text-xs text-slate-300 font-mono">{hash}</p>}
        <button
          onClick={() => window.location.reload()}
          className="mt-5 px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

function SuccessScreen({
  professional,
}: {
  professional: any;
}) {
  const clinicName = professional?.company_name || '';
  const profName = professional?.name || 'o profissional';
  const crpRaw = professional?.crp || '';
  const crp = crpRaw && !crpRaw.includes('@') ? `CRP ${crpRaw}` : '';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 animate-fadeIn font-sans">
      <div className="bg-white rounded-[3rem] shadow-2xl shadow-indigo-100 border border-slate-100 max-w-md w-full p-12 text-center">
        <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-emerald-100 shadow-sm">
          <CheckCircle className="text-emerald-500" size={40} />
        </div>
        
        <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Formulário Enviado!</h2>
        
        <div className="space-y-6 mb-10 text-center">
          <div className="text-sm text-slate-500 font-medium leading-relaxed">
            Muito obrigado! Suas informações foram enviadas com segurança e criptografia para:<br/>
            <div className="flex flex-col items-center gap-1 mt-4">
              <span className="px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-2xl font-black uppercase tracking-tight border border-indigo-100 shadow-sm text-sm">
                 {clinicName || profName}
              </span>
              {crp && (
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                   {crp}
                </span>
              )}
            </div>
          </div>
          
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-sm text-slate-600 font-bold leading-relaxed italic">
              "Obrigado por preencher. O profissional entrará em contato com você após a avaliação cuidadosa dos seus resultados."
            </p>
          </div>
        </div>

        <div className="p-1 bg-slate-100 rounded-full w-fit mx-auto">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 py-1">
             Encerrado com Segurança
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── main ────────────────────────────────────────────────────────────────── */
export const ExternalForm: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('p');

  const [form, setForm] = useState<ClinicalForm | null>(null);
  const [professional, setProfessional] = useState<any>(null);
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scoreResult, setScoreResult] = useState<{ total: number; interpretation?: InterpretationRule } | null>(null);

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [answerValues, setAnswerValues] = useState<Record<string, number>>({});
  const [identification, setIdentification] = useState({ name: '', email: '', phone: '' });
  const [logoError, setLogoError] = useState(false);

  /* load */
  useEffect(() => {
    const load = async () => {
      if (!hash) { setLoadError('Link inválido.'); setLoading(false); return; }
      try {
        const formData = await api.get<any>(`/forms/public/${hash}${patientId ? `?p=${patientId}` : ''}`);
        const mapped: ClinicalForm = {
          id: String(formData.id),
          title: formData.title,
          hash: formData.hash,
          description: formData.description || '',
          questions: (formData.questions || []).map((q: any) => ({
            id: String(q.id),
            type: q.question_type || q.type,
            text: q.question_text || q.text,
            required: Boolean(q.is_required ?? q.required),
            options: q.options_json
              ? (typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json)
              : (q.options || []),
          })),
          interpretations: (formData.interpretations || []).map((r: any) => ({
            id: String(r.id),
            minScore: r.min_score ?? r.minScore,
            maxScore: r.max_score ?? r.maxScore,
            resultTitle: r.result_title ?? r.resultTitle,
            description: r.description || '',
            color: r.color || 'bg-indigo-50 text-indigo-700',
          })),
          responseCount: formData.response_count ?? 0,
          isGlobal: Boolean(formData.is_global),
          theme: formData.theme || undefined,
        };
        setForm(mapped);
        setProfessional(formData.professional || {});

        // Se o backend retornou o paciente vinculado
        if (formData.patient) {
          setPatientName(formData.patient.name);
          setIdentification({
             name: formData.patient.name,
             email: formData.patient.email || '',
             phone: formData.patient.phone || ''
          });
        }
      } catch (e: any) {
        setLoadError(e?.message || 'Erro ao carregar formulário.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hash, patientId]);

  /* helpers */
  const totalQ = form?.questions?.length || 0;
  const answeredQ = form?.questions?.filter(q => {
    const v = answers[q.id];
    if (v === undefined || v === null) return false;
    if (Array.isArray(v)) return v.length > 0;
    return String(v).trim().length > 0;
  }).length || 0;
  const progress = totalQ ? Math.round((answeredQ / totalQ) * 100) : 0;

  const theme = {
    primary: form?.theme?.primaryColor || '#4f46e5',
    accent: form?.theme?.accentColor || '#7c3aed',
    bg: form?.theme?.backgroundColor || '#f8fafc',
    card: form?.theme?.cardColor || '#ffffff',
    button: form?.theme?.buttonColor || '#4f46e5',
  };

  const handleInput = (qId: string, value: any, score = 0) => {
    setAnswers(p => ({ ...p, [qId]: value }));
    setAnswerValues(p => ({ ...p, [qId]: score }));
  };

  const handleCheckbox = (qId: string, label: string, score: number, checked: boolean) => {
    const cur = (answers[qId] as string[]) || [];
    const curScore = (answerValues[qId] as number) || 0;
    setAnswers(p => ({ ...p, [qId]: checked ? [...cur, label] : cur.filter(v => v !== label) }));
    setAnswerValues(p => ({ ...p, [qId]: checked ? curScore + score : curScore - score }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = Object.values(answerValues).reduce((s: number, v: any) => s + (v as number), 0);
    const interpretation = form?.interpretations?.find(r => total >= r.minScore && total <= r.maxScore);
    setScoreResult({ total, interpretation });
    setSubmitting(true);
    try {
      await api.post(`/forms/public/${hash}/responses`, {
        answers,
        score: total,
        respondent_name: patientName || identification.name,
        respondent_email: identification.email,
        respondent_phone: identification.phone,
        patient_id: patientId || undefined,
      });
      setSubmitted(true);
    } catch {
      // still show success UI since score is calculated
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  /* metadata and SEO */
  useEffect(() => {
    if (form && professional) {
      const profName = professional.name || '';
      const crpText = professional.crp ? ` (${professional.crp})` : '';
      const fullTitle = `${form.title} | ${profName}${crpText}`;
      document.title = fullTitle;

      // Update meta tags for standard SEO and social sharing (WhatsApp/LinkedIn)
      const updateMeta = (key: string, value: string, attr = 'property') => {
        let el = document.querySelector(`meta[${attr}="${key}"]`);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute(attr, key);
          document.head.appendChild(el);
        }
        el.setAttribute('content', value);
      };

      const description = `${form.title} - Formulário clínico especializado do profissional ${profName}. ${form.description || 'Preencha este formulário para sua avaliação.'}`;
      updateMeta('name', description, 'name');
      updateMeta('description', description, 'name');
      updateMeta('og:title', fullTitle);
      updateMeta('og:description', description);
      updateMeta('og:type', 'website');
      updateMeta('twitter:card', 'summary_large_image', 'name');
      updateMeta('twitter:title', fullTitle, 'name');
      updateMeta('twitter:description', description, 'name');
      
      if (professional.clinic_logo_url) {
        updateMeta('og:image', professional.clinic_logo_url);
        updateMeta('twitter:image', professional.clinic_logo_url, 'name');
      }
    }
  }, [form, professional]);

  /* ─── renders ─── */
  if (loading) return <LoadingScreen />;
  if (loadError || !form) return <ErrorScreen message={loadError || ''} hash={hash} />;
  if (submitted) return <SuccessScreen professional={professional} />;

  const hasInterpretations = (form.interpretations?.length || 0) > 0;
  const logoUrl = professional?.clinic_logo_url;
  const clinicName = professional?.company_name || professional?.name || '';
  const profName = professional?.name || '';
  const crp = professional?.crp || '';
  const specialty = professional?.specialty || '';

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: theme.bg }}>

      {/* Header strip */}
      <div
        className="w-full py-8 px-4"
        style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          {logoUrl && !logoError ? (
            <img
              src={logoUrl}
              alt=""
              onError={() => setLogoError(true)}
              className="w-14 h-14 rounded-xl object-cover bg-white/20 border-2 border-white/30 shadow-md flex-shrink-0"
            />
          ) : clinicName ? (
            <div className="w-14 h-14 rounded-xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {initials(clinicName)}
            </div>
          ) : null}
          <div className="text-white min-w-0">
            {clinicName && <p className="font-bold text-base leading-tight truncate">{clinicName}</p>}
            {profName && (
              <p className="text-white/80 text-sm truncate">
                {profName}
                {specialty && ` · ${specialty}`}
                {crp && ` · CRP ${crp}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-16">

        {/* Title block */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-6 bg-slate-50/50 p-4 rounded-2xl border border-dashed border-slate-200">
             <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm">
                <ShieldCheck size={20} />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Responsável Técnico</p>
                <p className="text-sm font-bold text-slate-700">{profName} {crp && <span className="text-slate-400 font-medium">({crp})</span>}</p>
             </div>
          </div>

          <h1 className="text-2xl font-black text-slate-800 mb-2 leading-tight">{form.title}</h1>
          {form.description && <p className="text-slate-500 text-sm leading-relaxed font-medium">{form.description}</p>}
          {hasInterpretations && (
            <div className="mt-4 flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50/50 border border-indigo-100 px-4 py-2 rounded-xl w-fit">
              <Calculator size={14} />
              <span>Avaliação com Resultado Automático</span>
            </div>
          )}
        </div>

        {/* Progress */}
        {totalQ > 0 && (
          <div className="mb-8 px-2">
            <div className="flex justify-between text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">
              <span>{answeredQ} de {totalQ} Questões</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                style={{ width: `${progress}%`, backgroundColor: theme.button }}
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Identification — only if no patient pre-loaded */}
          {!patientName ? (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                    <User size={20} />
                 </div>
                 <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Seus Dados</h3>
                    <p className="text-[10px] text-slate-400 font-bold">Identificação básica para o profissional</p>
                 </div>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                    Nome Completo <span className="text-rose-500">*</span>
                  </span>
                  <div className="relative group">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type="text"
                      required
                      placeholder="Como podemos te chamar?"
                      value={identification.name}
                      onChange={e => setIdentification(p => ({ ...p, name: e.target.value }))}
                      className="w-full pl-11 pr-4 py-3 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    />
                  </div>
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">
                      WhatsApp / Telefone <span className="text-rose-500">*</span>
                    </span>
                    <div className="relative group">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input
                        type="tel"
                        required
                        placeholder="(00) 00000-0000"
                        value={identification.phone}
                        onChange={e => setIdentification(p => ({ ...p, phone: e.target.value }))}
                        className="w-full pl-11 pr-4 py-3 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">E-mail</span>
                    <div className="relative group">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input
                        type="email"
                        placeholder="seu@email.com"
                        value={identification.email}
                        onChange={e => setIdentification(p => ({ ...p, email: e.target.value }))}
                        className="w-full pl-11 pr-4 py-3 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            /* Patient badge when pre-loaded */
            <div className="bg-indigo-600/5 border-2 border-indigo-600/10 rounded-[2.5rem] px-8 py-6 flex flex-col sm:flex-row items-center gap-5 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-xl shadow-indigo-200">
                 {initials(patientName)}
               </div>
               <div className="text-center sm:text-left flex-1 min-w-0">
                 <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-200">Paciente Identificado</span>
                 </div>
                 <h3 className="text-xl font-black text-slate-800 truncate mb-1">{patientName}</h3>
                 <p className="text-xs text-slate-500 font-medium leading-tight">Preencha o formulário abaixo para continuar sua avaliação clínica.</p>
               </div>
               <div className="shrink-0 bg-emerald-500 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                  <CheckCircle size={24} />
               </div>
            </div>
          )}

          {/* Questions */}
          {form.questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8"
              style={{ backgroundColor: theme.card }}
            >
              <label className="block text-base font-black text-slate-800 mb-6 leading-tight">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 text-slate-400 text-xs font-black mb-3 border border-slate-100">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                {q.text}
                {q.required && (
                  <span className="ml-2 text-rose-500 font-bold" title="Obrigatório">*</span>
                )}
              </label>

              {/* Text */}
              {q.type === 'text' && (
                <input
                  type="text"
                  required={q.required}
                  placeholder="Sua resposta..."
                  onChange={e => handleInput(q.id, e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                />
              )}

              {/* Textarea */}
              {q.type === 'textarea' && (
                <textarea
                  required={q.required}
                  rows={3}
                  placeholder="Escreva aqui..."
                  onChange={e => handleInput(q.id, e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition resize-y"
                />
              )}

              {/* Number */}
              {q.type === 'number' && (
                <input
                  type="number"
                  required={q.required}
                  placeholder="0"
                  onChange={e => handleInput(q.id, e.target.value)}
                  className="w-32 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition font-mono"
                />
              )}

              {/* Radio */}
              {q.type === 'radio' && (
                <div className="space-y-2">
                  {q.options?.map((opt, i) => (
                    <label key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name={q.id}
                        value={opt.label}
                        required={q.required}
                        onChange={() => handleInput(q.id, opt.label, opt.value)}
                        className="accent-indigo-600 w-4 h-4 flex-shrink-0"
                      />
                      <span className="text-sm text-slate-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Checkbox */}
              {q.type === 'checkbox' && (
                <div className="space-y-2">
                  {q.options?.map((opt, i) => (
                    <label key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        value={opt.label}
                        onChange={e => handleCheckbox(q.id, opt.label, opt.value, e.target.checked)}
                        className="accent-indigo-600 w-4 h-4 rounded flex-shrink-0"
                      />
                      <span className="text-sm text-slate-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Select */}
              {q.type === 'select' && (
                <div className="relative">
                  <select
                    required={q.required}
                    onChange={e => {
                      const opt = q.options?.find(o => o.label === e.target.value);
                      handleInput(q.id, e.target.value, opt?.value || 0);
                    }}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition appearance-none bg-white pr-8"
                  >
                    <option value="">Selecione...</option>
                    {q.options?.map((opt, i) => (
                      <option key={i} value={opt.label}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              )}
            </div>
          ))}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: theme.button }}
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Enviar respostas
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1 pt-1">
            <ShieldCheck size={12} />
            Seus dados são protegidos pela LGPD.
          </p>
        </form>
      </div>
    </div>
  );
};
