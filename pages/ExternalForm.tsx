
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MOCK_FORMS, MOCK_PROFESSIONALS, MOCK_PATIENTS } from '../constants';
import { ClinicalForm, Patient, Professional } from '../types';
import { CheckCircle, AlertCircle, ChevronDown, User, Phone, Mail, ShieldCheck } from 'lucide-react';

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
  
  // Form Data
  const [answers, setAnswers] = useState<Record<string, any>>({});
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation for public link
    if (!patient && (!identification.name || !identification.phone)) {
        alert("Por favor, preencha seus dados de identificação.");
        return;
    }

    setSubmitted(true);
    
    const submissionData = {
        formId: form?.id,
        patientId: patient?.id || 'guest',
        patientData: patient ? null : identification,
        answers: answers,
        submittedAt: new Date().toISOString()
    };
    
    console.log("Form Submitted:", submissionData);
  };

  const handleInputChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="bg-white p-10 md:p-14 rounded-[32px] shadow-2xl max-w-lg w-full text-center border border-slate-100 animate-[slideUpFade_0.5s_ease-out]">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
                    <CheckCircle size={48} />
                </div>
                <h2 className="text-3xl font-display font-bold text-slate-800 mb-4">Obrigado pela resposta!</h2>
                <p className="text-slate-600 mb-8 text-lg leading-relaxed">Recebemos suas informações com sucesso. O profissional já foi notificado.</p>
                
                <div className="flex items-center justify-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                        {professional.name.charAt(0)}
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-bold text-slate-700">{professional.name}</p>
                        <p className="text-xs text-slate-500">{professional.profession}</p>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-700 flex flex-col">
        
        {/* --- PROFESSIONAL HEADER --- */}
        <header className="bg-white border-b border-slate-200 pt-8 pb-16 px-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-slate-200 overflow-hidden flex-shrink-0">
                     {/* Mock Avatar Logic */}
                     <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                        {professional.name.charAt(0)}
                     </div>
                </div>
                <div className="text-center md:text-left">
                    <h2 className="text-lg font-bold text-slate-800">{professional.name}</h2>
                    <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-slate-500 mt-1">
                        <span>{professional.profession}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-emerald-500"/> CRP {professional.registrationNumber}</span>
                    </div>
                </div>
            </div>
        </header>

        {/* --- FORM CONTAINER --- */}
        <main className="flex-1 w-full max-w-3xl mx-auto px-4 md:px-6 -mt-8 pb-24 relative z-20">
            <div className="bg-white rounded-[24px] shadow-xl border border-slate-100 p-6 md:p-10">
                
                {/* Form Intro */}
                <div className="mb-10 border-b border-slate-100 pb-8">
                    <h1 className="text-3xl font-display font-bold text-slate-800 mb-3">{form.title}</h1>
                    <p className="text-slate-500 text-lg leading-relaxed">{form.description}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-10">
                    
                    {/* SECTION 1: IDENTIFICATION (Conditional) */}
                    {!patient ? (
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <User size={20} className="text-indigo-600" />
                                Identificação
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-1.5">Seu Nome Completo <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                        placeholder="Digite seu nome..."
                                        value={identification.name}
                                        onChange={e => setIdentification({...identification, name: e.target.value})}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-1.5">WhatsApp / Telefone <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type="tel" 
                                                required 
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                                placeholder="(00) 00000-0000"
                                                value={identification.phone}
                                                onChange={e => setIdentification({...identification, phone: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-1.5">E-mail</label>
                                        <div className="relative">
                                            <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type="email" 
                                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                                placeholder="seu@email.com"
                                                value={identification.email}
                                                onChange={e => setIdentification({...identification, email: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                                {patient.name.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm text-indigo-900 font-medium">Respondendo como:</p>
                                <p className="text-base font-bold text-indigo-700">{patient.name}</p>
                            </div>
                        </div>
                    )}

                    {/* SECTION 2: QUESTIONS */}
                    <div className="space-y-8">
                        {form.questions.map((q, idx) => (
                            <div key={q.id} className="group transition-all duration-300">
                                <label className="block text-slate-800 font-bold mb-3 text-lg">
                                    <span className="text-indigo-500 mr-2">{idx + 1}.</span>
                                    {q.text} 
                                    {q.required && <span className="text-red-500 ml-1" title="Obrigatório">*</span>}
                                </label>

                                <div className="pl-6">
                                    {q.type === 'text' && (
                                        <input 
                                            type="text" 
                                            required={q.required}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                                            placeholder="Sua resposta..."
                                            onChange={(e) => handleInputChange(q.id, e.target.value)}
                                        />
                                    )}

                                    {q.type === 'textarea' && (
                                        <textarea 
                                            required={q.required}
                                            rows={4}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 resize-y min-h-[100px]"
                                            placeholder="Digite aqui..."
                                            onChange={(e) => handleInputChange(q.id, e.target.value)}
                                        />
                                    )}

                                    {q.type === 'number' && (
                                        <input 
                                            type="number" 
                                            required={q.required}
                                            className="w-full md:w-40 px-4 py-3 rounded-xl border border-slate-300 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                                            placeholder="0"
                                            onChange={(e) => handleInputChange(q.id, e.target.value)}
                                        />
                                    )}

                                    {(q.type === 'radio' || q.type === 'checkbox') && (
                                        <div className="space-y-2">
                                            {q.options?.map((opt, i) => (
                                                <label key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-transparent hover:border-indigo-200 hover:bg-white cursor-pointer transition-all group/opt">
                                                    <input 
                                                        type={q.type} 
                                                        name={q.id} 
                                                        value={opt}
                                                        className={`w-5 h-5 accent-indigo-600 ${q.type === 'radio' ? '' : 'rounded'} cursor-pointer`}
                                                        required={q.required && q.type === 'radio'}
                                                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                                                    />
                                                    <span className="text-slate-600 group-hover/opt:text-indigo-700 font-medium">{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {q.type === 'select' && (
                                        <div className="relative">
                                            <select 
                                                required={q.required}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer"
                                                onChange={(e) => handleInputChange(q.id, e.target.value)}
                                            >
                                                <option value="">Selecione uma opção...</option>
                                                {q.options?.map((opt, i) => (
                                                    <option key={i} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <ChevronDown size={20} />
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
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.01] active:scale-95 text-lg"
                        >
                            Enviar Respostas
                        </button>
                        <p className="text-center text-xs text-slate-400 mt-4">
                            Seus dados estão seguros e protegidos.
                        </p>
                    </div>
                </form>
            </div>
        </main>
    </div>
  );
};
