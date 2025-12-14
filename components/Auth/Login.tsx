
import React, { useState } from 'react';
import { BrainCircuit, ArrowRight, Activity, Calendar, Users, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLogin: (role?: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      // SUPER ADMIN CHECK
      if (email === 'admin@develoi.com' && password === 'Edu@06051992') {
          onLogin('SUPER_ADMIN');
      } else {
          // Regular Login
          onLogin('USER');
      }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex font-sans">
      {/* BACKGROUND ANIMADO */}
      <div className="fixed inset-0 z-[-2] bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 opacity-100"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-slate-900/0 to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-500/20 via-slate-900/0 to-transparent"></div>
      </div>
      
      {/* PARTICULAS (Bokehs) - Suavizadas */}
      <div className="fixed w-[40vw] h-[40vw] rounded-full blur-[100px] opacity-20 z-[-1] bg-indigo-600 top-[-10%] left-[-10%] animate-[float_20s_infinite_ease-in-out_alternate]"></div>
      <div className="fixed w-[40vw] h-[40vw] rounded-full blur-[100px] opacity-20 z-[-1] bg-purple-600 bottom-[-10%] right-[-10%] animate-[float_20s_infinite_ease-in-out_alternate] delay-[-5s]"></div>

      {/* LANGUAGE SELECTOR - ABSOLUTE POSITION */}
      <div className="absolute top-6 right-6 z-30 flex gap-3">
        <button 
            onClick={() => setLanguage('pt')} 
            className={`w-10 h-10 rounded-full border-2 overflow-hidden transition-all transform hover:scale-110 ${language === 'pt' ? 'border-white shadow-lg scale-110' : 'border-white/30 opacity-70 hover:opacity-100'}`}
            title="Português"
        >
            <img src="https://flagcdn.com/br.svg" alt="Português" className="w-full h-full object-cover" />
        </button>
        <button 
            onClick={() => setLanguage('en')} 
            className={`w-10 h-10 rounded-full border-2 overflow-hidden transition-all transform hover:scale-110 ${language === 'en' ? 'border-white shadow-lg scale-110' : 'border-white/30 opacity-70 hover:opacity-100'}`}
            title="English"
        >
            <img src="https://flagcdn.com/us.svg" alt="English" className="w-full h-full object-cover" />
        </button>
        <button 
            onClick={() => setLanguage('es')} 
            className={`w-10 h-10 rounded-full border-2 overflow-hidden transition-all transform hover:scale-110 ${language === 'es' ? 'border-white shadow-lg scale-110' : 'border-white/30 opacity-70 hover:opacity-100'}`}
            title="Español"
        >
            <img src="https://flagcdn.com/es.svg" alt="Español" className="w-full h-full object-cover" />
        </button>
      </div>

      {/* CONTAINER PRINCIPAL */}
      <div className="w-full h-full grid grid-cols-1 lg:grid-cols-[480px_1fr]">
        
        {/* LADO ESQUERDO (LOGIN FORM) - Contraste Aumentado */}
        <div className="relative bg-white flex flex-col justify-center items-center p-8 md:p-12 shadow-[20px_0_40px_rgba(0,0,0,0.3)] z-20">
          <div className="w-full max-w-[380px]">
            <div className="mb-10 flex justify-center">
              <div className="h-16 w-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/20 transform hover:scale-105 transition-transform duration-500">
                 <BrainCircuit className="h-9 w-9 text-white" />
              </div>
            </div>
            
            <div className="text-center mb-10">
              <h1 className="font-display font-bold text-slate-900 text-3xl mb-3 tracking-tight">{t('login.welcome')}</h1>
              <p className="text-slate-500 text-base leading-relaxed">{t('login.subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div className="relative group">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{t('login.email')}</label>
                  <div className="relative">
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com" 
                        className="w-full px-4 py-3.5 pl-11 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 placeholder:text-slate-400 text-slate-900 font-semibold"
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <Mail size={20} />
                    </div>
                  </div>
                </div>

                <div className="relative group">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{t('login.password')}</label>
                  <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full px-4 py-3.5 pl-11 pr-11 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 placeholder:text-slate-400 text-slate-900 font-semibold"
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <Lock size={20} />
                    </div>
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm pt-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                        <span className="text-slate-500 group-hover:text-slate-700 transition-colors">{t('login.remember')}</span>
                    </label>
                    <button 
                      type="button" 
                      onClick={() => navigate('/forgot-password')}
                      className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline"
                    >
                      {t('login.forgot')}
                    </button>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 mt-4"
                >
                  <span>{t('login.submit')}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>

            <div className="mt-12 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
              <span>PsiManager Pro</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span>v2.0.0</span>
            </div>
          </div>
        </div>

        {/* LADO DIREITO (VISUAL PANEL) - Layout Melhorado */}
        <div className="hidden lg:flex relative items-center justify-center bg-slate-900/50 backdrop-blur-sm overflow-hidden perspective-[1000px]">
          {/* Decorative Grid */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          
          <div className="relative z-10 w-[500px] transform hover:scale-[1.02] transition-transform duration-700 ease-out">
            {/* Main Glass Card */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[3rem] p-10 shadow-2xl text-white relative overflow-hidden">
                {/* Glossy Effect */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="mb-10 space-y-2">
                        <h2 className="font-display font-bold text-4xl leading-tight">
                            {t('login.footer')}
                        </h2>
                        <p className="text-indigo-200 text-lg leading-relaxed">
                            Otimize seu tempo e foque no que realmente importa: seus pacientes.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                            <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-300">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">{t('login.feature1.title')}</h3>
                                <p className="text-sm text-slate-300">{t('login.feature1.desc')}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                            <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">{t('login.feature2.title')}</h3>
                                <p className="text-sm text-slate-300">{t('login.feature2.desc')}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                            <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                                <Users size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">{t('login.feature3.title')}</h3>
                                <p className="text-sm text-slate-300">{t('login.feature3.desc')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Elements for Depth */}
            <div className="absolute -right-12 -top-12 h-24 w-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl shadow-lg rotate-12 animate-[float_8s_infinite_ease-in-out] z-20 flex items-center justify-center border border-white/20">
                <div className="text-white/90 font-bold text-2xl">Psi</div>
            </div>
            
             <div className="absolute -left-8 -bottom-8 h-20 w-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-lg -rotate-12 animate-[float_10s_infinite_ease-in-out_reverse] z-0 opacity-80 blur-sm"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
