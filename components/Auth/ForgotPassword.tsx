
import React, { useState } from 'react';
import { BrainCircuit, Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
        setIsLoading(false);
        setIsSubmitted(true);
    }, 1500);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex font-sans">
      {/* BACKGROUND ANIMADO (Mesmo do Login) */}
      <div className="fixed inset-0 z-[-2] bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 opacity-100"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-slate-900/0 to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-500/20 via-slate-900/0 to-transparent"></div>
      </div>
      
      {/* PARTICULAS (Bokehs) */}
      <div className="fixed w-[40vw] h-[40vw] rounded-full blur-[100px] opacity-20 z-[-1] bg-indigo-600 top-[-10%] left-[-10%] animate-[float_20s_infinite_ease-in-out_alternate]"></div>
      <div className="fixed w-[40vw] h-[40vw] rounded-full blur-[100px] opacity-20 z-[-1] bg-purple-600 bottom-[-10%] right-[-10%] animate-[float_20s_infinite_ease-in-out_alternate] delay-[-5s]"></div>

      <div className="w-full h-full flex items-center justify-center p-4">
        
        <div className="relative bg-white flex flex-col justify-center items-center p-8 md:p-12 shadow-2xl rounded-3xl z-20 w-full max-w-md animate-[scaleIn_0.3s_ease-out]">
            
            <button 
                onClick={() => navigate('/login')}
                className="absolute top-6 left-6 text-slate-400 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-slate-50"
            >
                <ArrowLeft size={20} />
            </button>

            <div className="mb-8 flex justify-center">
              <div className="h-16 w-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/20">
                 <BrainCircuit className="h-9 w-9 text-white" />
              </div>
            </div>
            
            {isSubmitted ? (
                <div className="text-center animate-[fadeIn_0.5s_ease-out]">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h1 className="font-display font-bold text-slate-900 text-2xl mb-3">Verifique seu E-mail</h1>
                    <p className="text-slate-500 text-sm leading-relaxed mb-8">
                        Enviamos instruções de recuperação de senha para <strong>{email}</strong>. Por favor, verifique sua caixa de entrada e spam.
                    </p>
                    <button 
                        onClick={() => navigate('/login')}
                        className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all duration-300"
                    >
                        Voltar para o Login
                    </button>
                </div>
            ) : (
                <div className="w-full">
                    <div className="text-center mb-8">
                        <h1 className="font-display font-bold text-slate-900 text-2xl mb-3">Recuperar Senha</h1>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            Informe seu e-mail cadastrado e enviaremos um link seguro para você redefinir sua senha.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-5">
                            <div className="relative group">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">E-mail Cadastrado</label>
                                <div className="relative">
                                    <input 
                                        type="email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="seu@email.com" 
                                        required
                                        className="w-full px-4 py-3.5 pl-11 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 placeholder:text-slate-400 text-slate-900 font-semibold"
                                    />
                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                        <Mail size={20} />
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={isLoading || !email}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 mt-4"
                            >
                                {isLoading ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                ) : (
                                    <>
                                        <span>Enviar Link</span>
                                        <Send className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-100 w-full flex justify-center">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">PsiManager Pro Segurança</p>
            </div>
        </div>
      </div>
    </div>
  );
};
