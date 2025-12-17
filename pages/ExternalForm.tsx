
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MOCK_FORMS, MOCK_PROFESSIONALS, MOCK_PATIENTS } from '../constants';
import { ClinicalForm, Patient, Professional, InterpretationRule } from '../types';
import { CheckCircle, AlertCircle, ChevronDown, User, Phone, Mail, ShieldCheck, ArrowRight, Calendar, MapPin, Calculator, Info } from 'lucide-react';

export const ExternalForm: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('p'); // Get patient ID from URL if exists

  // States
  const [form, setForm] = useState<ClinicalForm | undefined>(undefined);
  const [professional, setProfessional] = useState<Professional | undefined>(undefined);
  const [patient, setPatient] = useState<Patient | undefined>(undefined);
  
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [scoreResult, setScoreResult] = useState<{ total: number, interpretation?: InterpretationRule } | null>(null);
  
  // Form Data
  const [answers, setAnswers] = useState<Record<string, any>>({});
  // Store values of selected options separately to calculate score
  const [answerValues, setAnswerValues] = useState<Record<string, number>>({});

  const [identification, setIdentification] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
        // 1. Load Form
        const foundForm = MOCK_FORMS.find(f => f.hash === hash);
        setForm(foundForm);

        // 2. Load Professional (Owner of the form)
        // In a real app, this would come from the form relationship
        setProfessional(MOCK_PROFESSIONALS[0]); 

        // 3. Load Patient (if link is specific)
        if (patientId) {
            const foundPatient = MOCK_PATIENTS.find(p => p.id === patientId);
            setPatient(foundPatient);
        }

        setLoading(false);
    }, 800);
  }, [hash, patientId]);

  const calculateScore = () => {
      let total = 0;
      Object.values(answerValues).forEach(val => total += val);
      
      let interpretation = undefined;
      if (form?.interpretations) {
          interpretation = form.interpretations.find(rule => total >= rule.minScore && total <= rule.maxScore);
      }
      
      return { total, interpretation };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation for public link
    if (!patient && (!identification.name || !identification.phone)) {
        alert("Por favor, preencha seus dados de identificação.");
        return;
    }

    const result = calculateScore();
    setScoreResult(result);
    setSubmitted(true);
    
    const submissionData = {
        formId: form?.id,
        patientId: patient?.id || 'guest',
        patientData: patient ? null : identification,
        answers: answers,
        score: result.total,
        interpretationId: result.interpretation?.id,
        submittedAt: new Date().toISOString()
    };
    
    console.log("Form Submitted:", submissionData);
  };

  const handleInputChange = (questionId: string, value: any, scoreValue: number = 0) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setAnswerValues(prev => ({ ...prev, [questionId]: scoreValue }));
  };

  const handleCheckboxChange = (questionId: string, value: string, score: number, checked: boolean) => {
      const currentAnswer = (answers[questionId] as string[]) || [];
      const currentScore = (answerValues[questionId] as number) || 0;

      if (checked) {
          setAnswers(prev => ({ ...prev, [questionId]: [...currentAnswer, value] }));
          setAnswerValues(prev => ({ ...prev, [questionId]: currentScore + score }));
      } else {
          setAnswers(prev => ({ ...prev, [questionId]: currentAnswer.filter(v => v !== value) }));
          setAnswerValues(prev => ({ ...prev, [questionId]: currentScore - score }));
      }
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
                <span className="text-indigo-900/60 font-sans animate-pulse font-medium">Carregando formulário...</span>
            </div>
        </div>
    );
  }

  if (!form || !professional) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl max-w-md w-full text-center border-t-8 border-red-500">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="h-10 w-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 mb-3">Formulário Indisponível</h1>
                <p className="text-slate-500 leading-relaxed">O link que você acessou pode ter expirado ou não existe mais. Entre em contato com o profissional.</p>
            </div>
        </div>
    );
  }

  if (submitted) {
    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-br from-indigo-600 to-purple-700"></div>
            
            <div className="bg-white p-10 md:p-14 rounded-[32px] shadow-2xl max-w-lg w-full text-center border border-slate-100 animate-[slideUpFade_0.5s_ease-out] relative z-10 mt-20">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm border-4 border-emerald-100 -mt-24 bg-white">
                    <CheckCircle size={48} className="text-emerald-500" />
                </div>
                <h2 className="text-3xl font-display font-bold text-slate-800 mb-4">Recebido com Sucesso!</h2>
                <p className="text-slate-500 mb-8 text-lg leading-relaxed">Suas respostas foram enviadas para <strong>{professional.name}</strong> de forma segura.</p>
                
                {scoreResult && scoreResult.interpretation && (
                    <div className={`p-6 rounded-2xl border mb-6 text-left ${scoreResult.interpretation.color}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-widest opacity-70">Resultado</span>
                            <span className="font-mono font-bold text-xl">{scoreResult.total} pts</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2">{scoreResult.interpretation.resultTitle}</h3>
                        <p className="text-sm opacity-90 leading-relaxed">{scoreResult.interpretation.description}</p>
                    </div>
                )}

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-2">Protocolo</p>
                    <p className="font-mono text-slate-700 font-bold tracking-widest">#REQ-{Math.floor(Math.random() * 10000)}</p>
                </div>

                <p className="text-xs text-slate-400">Você pode fechar esta página agora.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-700 flex flex-col relative">
        
        {/* --- HERO BACKGROUND --- */}
        <div className="absolute top-0 left-0 w-full h-[320px] bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 overflow-hidden z-0">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            <div className="absolute -right-20 -top-20 w-96 h-96 bg-indigo-500/30 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute left-10 bottom-10 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none"></div>
        </div>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-12 relative z-10">
            
            {/* Header Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-6 text-white shadow-xl">
                <div className="w-24 h-24 rounded-full border-4 border-white/20 shadow-lg bg-indigo-600 overflow-hidden flex-shrink-0 flex items-center justify-center text-3xl font-bold">
                     {professional.name.charAt(0)}
                </div>
                <div className="text-center md:text-left flex-1">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                        <h2 className="text-2xl font-display font-bold">{professional.name}</h2>
                        <ShieldCheck size={18} className="text-emerald-400" />
                    </div>
                    <p className="text-indigo-100 font-medium mb-3">{professional.profession} • CRP {professional.registrationNumber}</p>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-medium border border-white/10">
                            <MapPin size={12} /> São Paulo, SP
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-medium border border-white/10">
                            <Calendar size={12} /> Atendimento Presencial & Online
                        </span>
                    </div>
                </div>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-[32px] shadow-2xl shadow-indigo-900/10 border border-white overflow-hidden animate-[slideUpFade_0.3s_ease-out]">
                
                {/* Form Intro */}
                <div className="bg-slate-50 border-b border-slate-100 p-8 md:p-10">
                    <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold uppercase tracking-wider mb-4">
                        Formulário Seguro
                    </span>
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-800 mb-4 leading-tight">{form.title}</h1>
                    <p className="text-slate-500 text-lg leading-relaxed max-w-2xl">{form.description}</p>
                    
                    {form.interpretations && form.interpretations.length > 0 && (
                        <div className="mt-6 flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg w-fit">
                            <Calculator size={14} />
                            <span>Este questionário gera um resultado automático ao final.</span>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-12">
                    
                    {/* SECTION 1: IDENTIFICATION (Conditional) */}
                    {!patient ? (
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm relative group hover:border-indigo-200 transition-colors">
                            <div className="absolute -top-4 left-8 bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-md">
                                Passo 1: Sua Identificação
                            </div>
                            
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Nome Completo <span className="text-red-500">*</span></label>
                                    <div className="relative group/input">
                                        <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-600 transition-colors" />
                                        <input 
                                            type="text" 
                                            required 
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                            placeholder="Digite seu nome..."
                                            value={identification.name}
                                            onChange={e => setIdentification({...identification, name: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Telefone / WhatsApp <span className="text-red-500">*</span></label>
                                    <div className="relative group/input">
                                        <Phone size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-600 transition-colors" />
                                        <input 
                                            type="tel" 
                                            required 
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                            placeholder="(00) 00000-0000"
                                            value={identification.phone}
                                            onChange={e => setIdentification({...identification, phone: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">E-mail</label>
                                    <div className="relative group/input">
                                        <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-600 transition-colors" />
                                        <input 
                                            type="email" 
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 placeholder:text-slate-400"
                                            placeholder="seu@email.com"
                                            value={identification.email}
                                            onChange={e => setIdentification({...identification, email: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex items-center gap-4 animate-fadeIn">
                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 text-lg shadow-sm">
                                {patient.name.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm text-indigo-900 font-medium opacity-80">Respondendo como:</p>
                                <p className="text-xl font-bold text-indigo-800">{patient.name}</p>
                            </div>
                            <CheckCircle className="ml-auto text-indigo-400 opacity-50" size={32} />
                        </div>
                    )}

                    {/* SECTION 2: QUESTIONS */}
                    <div className="space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="h-px bg-slate-100 flex-1"></div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Questionário</span>
                            <div className="h-px bg-slate-100 flex-1"></div>
                        </div>

                        {form.questions.map((q, idx) => (
                            <div key={q.id} className="group transition-all duration-500">
                                <label className="block text-slate-800 font-bold mb-4 text-xl leading-snug">
                                    <span className="inline-block w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 text-center leading-8 text-sm mr-3 font-mono">{idx + 1}</span>
                                    {q.text} 
                                    {q.required && <span className="text-red-500 ml-1" title="Obrigatório">*</span>}
                                </label>

                                <div className="pl-0 md:pl-11">
                                    {q.type === 'text' && (
                                        <input 
                                            type="text" 
                                            required={q.required}
                                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 text-lg shadow-sm"
                                            placeholder="Sua resposta..."
                                            onChange={(e) => handleInputChange(q.id, e.target.value)}
                                        />
                                    )}

                                    {q.type === 'textarea' && (
                                        <textarea 
                                            required={q.required}
                                            rows={4}
                                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 resize-y min-h-[120px] text-lg shadow-sm leading-relaxed"
                                            placeholder="Digite aqui..."
                                            onChange={(e) => handleInputChange(q.id, e.target.value)}
                                        />
                                    )}

                                    {q.type === 'number' && (
                                        <input 
                                            type="number" 
                                            required={q.required}
                                            className="w-full md:w-48 px-5 py-4 rounded-2xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 text-lg shadow-sm font-mono"
                                            placeholder="0"
                                            onChange={(e) => handleInputChange(q.id, e.target.value)}
                                        />
                                    )}

                                    {q.type === 'radio' && (
                                        <div className="space-y-3">
                                            {q.options?.map((opt, i) => (
                                                <label key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-transparent hover:border-indigo-200 hover:bg-white cursor-pointer transition-all group/opt shadow-sm hover:shadow-md">
                                                    <div className="relative flex items-center justify-center">
                                                        <input 
                                                            type="radio" 
                                                            name={q.id} 
                                                            value={opt.label}
                                                            className="peer appearance-none w-6 h-6 border-2 border-slate-300 rounded-full checked:border-indigo-600 checked:bg-indigo-600 transition-all cursor-pointer"
                                                            required={q.required}
                                                            onChange={(e) => handleInputChange(q.id, e.target.value, opt.value)}
                                                        />
                                                        <div className="absolute w-2.5 h-2.5 bg-white rounded-full opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"></div>
                                                    </div>
                                                    <span className="text-slate-700 group-hover/opt:text-indigo-800 font-medium text-lg">{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {q.type === 'checkbox' && (
                                        <div className="space-y-3">
                                            {q.options?.map((opt, i) => (
                                                <label key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-transparent hover:border-indigo-200 hover:bg-white cursor-pointer transition-all group/opt shadow-sm hover:shadow-md">
                                                    <div className="relative flex items-center justify-center">
                                                        <input 
                                                            type="checkbox" 
                                                            name={q.id} 
                                                            value={opt.label}
                                                            className="peer appearance-none w-6 h-6 border-2 border-slate-300 rounded-md checked:border-indigo-600 checked:bg-indigo-600 transition-all cursor-pointer"
                                                            onChange={(e) => handleCheckboxChange(q.id, opt.label, opt.value, e.target.checked)}
                                                        />
                                                        <CheckCircle size={16} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                                                    </div>
                                                    <span className="text-slate-700 group-hover/opt:text-indigo-800 font-medium text-lg">{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {q.type === 'select' && (
                                        <div className="relative">
                                            <select 
                                                required={q.required}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer text-lg text-slate-700 shadow-sm"
                                                onChange={(e) => {
                                                    const selectedOption = q.options?.find(o => o.label === e.target.value);
                                                    handleInputChange(q.id, e.target.value, selectedOption?.value || 0);
                                                }}
                                            >
                                                <option value="">Selecione uma opção...</option>
                                                {q.options?.map((opt, i) => (
                                                    <option key={i} value={opt.label}>{opt.label}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <ChevronDown size={24} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 border-t border-slate-100">
                        <button 
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 rounded-2xl shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all hover:-translate-y-1 active:translate-y-0 text-xl flex items-center justify-center gap-3 group"
                        >
                            Enviar Respostas
                            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <p className="text-center text-xs text-slate-400 mt-6 flex items-center justify-center gap-2">
                            <ShieldCheck size={14} /> Seus dados estão seguros e protegidos pela LGPD.
                        </p>
                    </div>
                </form>
            </div>
            
            <div className="text-center mt-8 text-slate-400 text-sm font-medium">
                Powered by <span className="text-slate-500 font-bold">PsiManager Pro</span>
            </div>
        </main>
    </div>
  );
};
