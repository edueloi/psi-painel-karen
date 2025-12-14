import React, { useState } from 'react';
import { HelpCircle, MessageCircle, FileText, ChevronDown, CheckCircle, Mail } from 'lucide-react';

const FAQS = [
  { 
    q: 'Como alterar minha senha?', 
    a: 'Acesse Configurações > Segurança ou vá até a aba Privacidade e clique em "Alterar Senha". Você receberá um e-mail de confirmação.' 
  },
  { 
    q: 'O sistema funciona offline?', 
    a: 'O PsiManager Pro é uma aplicação web progressiva (PWA). Você pode acessar dados armazenados em cache, mas precisa de conexão para sincronizar novos agendamentos.' 
  },
  { 
    q: 'Como exportar o prontuário de um paciente?', 
    a: 'No perfil do paciente, vá até a aba "Histórico" e clique no botão "Exportar PDF" no canto superior direito.' 
  },
  { 
    q: 'Posso adicionar mais usuários?', 
    a: 'Sim! Se você for o administrador, vá em Configurações > Equipe para adicionar secretários ou outros profissionais (dependendo do seu plano).' 
  }
];

export const Help: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-[fadeIn_0.5s_ease-out]">
        
        {/* Header */}
        <div className="bg-indigo-900 rounded-[32px] p-10 text-center text-white mb-10 relative overflow-hidden shadow-2xl shadow-indigo-900/30">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-50"></div>
            
            <div className="relative z-10">
                <h1 className="text-4xl font-display font-bold mb-4">Como podemos ajudar?</h1>
                <p className="text-indigo-200 text-lg max-w-xl mx-auto">Encontre respostas rápidas ou entre em contato com nossa equipe de especialistas.</p>
                
                {/* Search Help (Visual) */}
                <div className="max-w-md mx-auto mt-8 relative">
                    <input 
                        type="text" 
                        placeholder="Digite sua dúvida..." 
                        className="w-full py-4 pl-6 pr-12 rounded-2xl text-slate-800 focus:outline-none shadow-xl"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 rounded-xl text-white">
                        <HelpCircle size={18} />
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Col: FAQs */}
            <div className="lg:col-span-2 space-y-6">
                <h2 className="text-xl font-bold text-slate-800 px-2">Perguntas Frequentes</h2>
                <div className="space-y-4">
                    {FAQS.map((faq, idx) => (
                        <div 
                            key={idx} 
                            className={`bg-white border transition-all duration-300 rounded-2xl overflow-hidden ${openFaq === idx ? 'border-indigo-200 shadow-md' : 'border-slate-100'}`}
                        >
                            <button 
                                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                className="w-full flex items-center justify-between p-5 text-left font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                {faq.q}
                                <ChevronDown size={20} className={`text-slate-400 transition-transform ${openFaq === idx ? 'rotate-180 text-indigo-500' : ''}`} />
                            </button>
                            <div 
                                className={`px-5 text-slate-500 text-sm leading-relaxed overflow-hidden transition-all duration-300 ${openFaq === idx ? 'max-h-40 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}
                            >
                                {faq.a}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Documentation Links */}
                <div className="pt-8">
                    <h2 className="text-xl font-bold text-slate-800 px-2 mb-4">Tutoriais e Guias</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <FileText size={20} />
                            </div>
                            <h4 className="font-bold text-slate-700">Guia do Iniciante</h4>
                            <p className="text-xs text-slate-500 mt-1">Configure sua clínica em 5 passos.</p>
                        </div>
                        <div className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group">
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <FileText size={20} />
                            </div>
                            <h4 className="font-bold text-slate-700">Financeiro Avançado</h4>
                            <p className="text-xs text-slate-500 mt-1">Como gerar relatórios fiscais.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Col: Contact */}
            <div className="space-y-6">
                <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                        <Mail size={20} className="text-indigo-500" /> Contato
                    </h3>
                    <form className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Assunto</label>
                            <select className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100">
                                <option>Dúvida sobre Funcionalidade</option>
                                <option>Problema Técnico</option>
                                <option>Sugestão de Melhoria</option>
                                <option>Financeiro</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Mensagem</label>
                            <textarea 
                                className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 resize-none h-32"
                                placeholder="Descreva como podemos ajudar..."
                            ></textarea>
                        </div>
                        <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all">
                            Enviar Mensagem
                        </button>
                    </form>
                </div>

                <div className="bg-slate-50 rounded-[24px] p-6 border border-slate-100">
                    <h3 className="font-bold text-sm text-slate-700 mb-3">Status do Sistema</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-medium">
                            <span className="flex items-center gap-2 text-slate-600">
                                <CheckCircle size={14} className="text-emerald-500" /> Plataforma Web
                            </span>
                            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Operacional</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-medium">
                            <span className="flex items-center gap-2 text-slate-600">
                                <CheckCircle size={14} className="text-emerald-500" /> API / Dados
                            </span>
                            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Operacional</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};