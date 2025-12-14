import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MOCK_FORMS } from '../constants';
import { ClinicalForm } from '../types';
import { CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';

export const ExternalForm: React.FC = () => {
  const { hash } = useParams<{ hash: string }>();
  const [form, setForm] = useState<ClinicalForm | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
        const found = MOCK_FORMS.find(f => f.hash === hash);
        setForm(found);
        setLoading(false);
    }, 800);
  }, [hash]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    // Here you would send data to backend
  };

  const handleInputChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-rose-50/30 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-200 border-t-rose-800"></div>
                <span className="text-rose-900/60 font-serif animate-pulse">Carregando formulário...</span>
            </div>
        </div>
    );
  }

  if (!form) {
    return (
        <div className="min-h-screen bg-rose-50/30 flex items-center justify-center p-6">
            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl max-w-md w-full text-center border-t-8 border-rose-500">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="h-10 w-10 text-rose-500" />
                </div>
                <h1 className="text-3xl font-serif font-bold text-slate-800 mb-3">Link expirado</h1>
                <p className="text-slate-500 leading-relaxed">O formulário que você tentou acessar não foi encontrado ou não está mais disponível.</p>
            </div>
        </div>
    );
  }

  if (submitted) {
    return (
        <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center p-6 font-sans">
            <div className="bg-white p-10 md:p-14 rounded-[32px] shadow-[0_20px_60px_rgba(90,34,43,0.1)] max-w-lg w-full text-center border border-rose-900/5 animate-[slideUpFade_0.5s_ease-out]">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
                    <CheckCircle size={48} />
                </div>
                <h2 className="text-4xl font-serif font-bold text-[#7A2E3D] mb-4">Obrigado!</h2>
                <p className="text-slate-600 mb-8 text-lg leading-relaxed">Suas respostas foram enviadas com sucesso para a nossa equipe.</p>
                <div className="bg-[#fcfbf9] text-slate-500 p-6 rounded-2xl text-sm font-medium border border-rose-900/5">
                    Seus dados foram salvos de forma segura e sigilosa. Você pode fechar esta página agora.
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfbf9] font-sans text-slate-700 flex flex-col">
        {/* Hero Header */}
        <header className="relative w-full bg-[#7A2E3D] text-white pt-12 pb-24 px-6 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#7A2E3D] to-[#5A222B] opacity-90"></div>
            <div className="absolute -right-20 -top-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-[#F8F5F2] rounded-2xl flex items-center justify-center shadow-lg border border-white/20 mb-6 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                    <span className="text-3xl font-serif font-bold text-[#7A2E3D]">Ψ</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-wide mb-4 leading-tight">{form.title}</h1>
                <p className="text-rose-100/80 max-w-lg text-lg leading-relaxed">{form.description}</p>
            </div>
        </header>

        {/* Form Container */}
        <main className="flex-1 w-full max-w-3xl mx-auto px-4 md:px-6 -mt-16 pb-24 relative z-20">
            <div className="bg-white rounded-[24px] shadow-[0_30px_60px_-15px_rgba(90,34,43,0.15)] border border-rose-900/5 p-6 md:p-12">
                <div className="text-center mb-10 pb-8 border-b border-rose-900/5">
                    <h2 className="font-serif text-2xl text-[#7A2E3D] mb-2">Preencha com atenção</h2>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Campos marcados com <span className="text-rose-500">*</span> são obrigatórios</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {form.questions.map((q, idx) => (
                        <div key={q.id} className="group transition-all duration-300">
                            <label className="block text-[#4a3f43] font-bold mb-4 text-lg md:text-xl">
                                <span className="inline-block w-8 text-rose-300 font-serif">{idx + 1}.</span>
                                {q.text} 
                                {q.required && <span className="text-rose-500 ml-1" title="Obrigatório">*</span>}
                            </label>

                            <div className="pl-8">
                                {q.type === 'text' && (
                                    <input 
                                        type="text" 
                                        required={q.required}
                                        className="w-full px-5 py-4 rounded-xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#a15f6d] focus:ring-4 focus:ring-[#a15f6d]/10 outline-none transition-all text-lg placeholder:text-slate-300"
                                        placeholder="Sua resposta..."
                                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                                    />
                                )}

                                {q.type === 'textarea' && (
                                    <textarea 
                                        required={q.required}
                                        rows={4}
                                        className="w-full px-5 py-4 rounded-xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#a15f6d] focus:ring-4 focus:ring-[#a15f6d]/10 outline-none transition-all text-lg placeholder:text-slate-300 resize-y min-h-[120px]"
                                        placeholder="Digite aqui..."
                                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                                    />
                                )}

                                {q.type === 'number' && (
                                    <input 
                                        type="number" 
                                        required={q.required}
                                        className="w-full md:w-48 px-5 py-4 rounded-xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#a15f6d] focus:ring-4 focus:ring-[#a15f6d]/10 outline-none transition-all text-lg placeholder:text-slate-300"
                                        placeholder="0"
                                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                                    />
                                )}

                                {(q.type === 'radio' || q.type === 'checkbox') && (
                                    <div className="space-y-3">
                                        {q.options?.map((opt, i) => (
                                            <label key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50/50 hover:bg-rose-50/30 cursor-pointer transition-all border-2 border-transparent hover:border-rose-100 group/opt">
                                                <input 
                                                    type={q.type} 
                                                    name={q.id} 
                                                    value={opt}
                                                    className={`w-6 h-6 accent-[#7A2E3D] ${q.type === 'radio' ? '' : 'rounded'} cursor-pointer`}
                                                    required={q.required && q.type === 'radio'}
                                                    onChange={(e) => handleInputChange(q.id, e.target.value)}
                                                />
                                                <span className="text-slate-600 group-hover/opt:text-[#7A2E3D] font-medium text-lg">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {q.type === 'select' && (
                                    <div className="relative">
                                        <select 
                                            required={q.required}
                                            className="w-full px-5 py-4 rounded-xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-[#a15f6d] focus:ring-4 focus:ring-[#a15f6d]/10 outline-none transition-all text-lg appearance-none cursor-pointer"
                                            onChange={(e) => handleInputChange(q.id, e.target.value)}
                                        >
                                            <option value="">Selecione uma opção...</option>
                                            {q.options?.map((opt, i) => (
                                                <option key={i} value={opt}>{opt}</option>
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

                    <div className="pt-10 border-t border-rose-900/5 mt-10">
                        <button 
                            type="submit"
                            className="w-full md:w-auto md:min-w-[280px] px-10 py-5 bg-[#7A2E3D] hover:bg-[#5A222B] text-white font-bold rounded-2xl shadow-[0_20px_40px_-10px_rgba(122,46,61,0.4)] hover:shadow-[0_25px_50px_-10px_rgba(122,46,61,0.5)] hover:-translate-y-1 transition-all active:translate-y-0 text-xl mx-auto block"
                        >
                            Enviar Respostas
                        </button>
                    </div>
                </form>
            </div>
        </main>

        <footer className="text-center pb-12 text-sm text-[#6f6669] px-6">
             <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white border border-rose-100 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#7A2E3D]"></span>
                <span className="font-medium">Psicóloga Karen Gomes • CRP 06/172315</span>
             </div>
        </footer>
    </div>
  );
};