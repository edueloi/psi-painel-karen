
import React, { useState } from 'react';
import { BrainCircuit, ArrowRight, Mail, Lock, Eye, EyeOff, CheckCircle2, Loader2, Globe } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLogin: (role?: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  
  // Form States - Pre-filled for Demo convenience
  const [email, setEmail] = useState('psi@psimanager.com');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  
  // Transition States
  const [isLoggingIn, setIsLoggingIn] = useState(false); // Spinner no botão
  const [showSuccessTransition, setShowSuccessTransition] = useState(false); // Tela de boas-vindas

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      // 1. Inicia estado de carregamento no botão
      setIsLoggingIn(true);

      // Simulação de delay de rede (validação)
      setTimeout(() => {
          // 2. Se validado com sucesso, ativa a tela de transição (Boas-vindas)
          setShowSuccessTransition(true);

          // 3. Aguarda a animação de boas-vindas terminar antes de trocar a rota
          setTimeout(() => {
              // SUPER ADMIN CHECK (Hardcoded for Demo)
              if (email === 'admin@develoi.com' && password === 'Edu@06051992') {
                  onLogin('SUPER_ADMIN');
              } else {
                  // Aceita qualquer outro login como USUÁRIO para fins de demonstração (sem backend)
                  onLogin('USER');
              }
          }, 3500); // Tempo da animação de boas-vindas
      }, 1000);
  };

  // --- TELA DE TRANSIÇÃO (BOAS-VINDAS) ---
  // Só aparece DEPOIS do sucesso do login
  if (showSuccessTransition) {
      return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden animate-[fadeIn_0.5s_ease-out]">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
            
            {/* Orb Animation */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse"></div>

            <div className="relative z-10 flex flex-col items-center text-center">
                {/* Logo Reveal */}
                <div className="mb-8 relative">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-[0_0_60px_rgba(99,102,241,0.6)] animate-[bounce_2s_infinite]">
                        <BrainCircuit size={48} className="text-white" />
                    </div>
                    {/* Ring Effect */}
                    <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-3xl animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                </div>

                {/* Text Reveal */}
                <div className="space-y-3 animate-[slideUpFade_0.8s_ease-out_0.3s_both]">
                    <h1 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tight">
                        Bem-vindo, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">Doutor(a)</span>
                    </h1>
                    <p className="text-slate-400 text-lg md:text-xl font-light">
                        Preparando seu ambiente clínico seguro...
                    </p>
                </div>

                {/* Loading Bar */}
                <div className="mt-12 w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-[loadingBar_2.5s_ease-in-out_forwards] w-0"></div>
                </div>
            </div>
        </div>
      );
  }

  // --- TELA DE LOGIN (LAYOUT PREMIUM) ---
  return (
    <div className="flex min-h-screen w-full bg-[#F3F4F6] font-sans overflow-hidden">
      
      {/* LANGUAGE SELECTOR (FLOATING) */}
      <div className="absolute top-6 right-6 z-20">
        <div className="group relative">
            <button className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-slate-200 hover:border-indigo-300 transition-all text-sm font-medium text-slate-600 hover:text-indigo-600">
                <Globe size={16} /> 
                <span className="uppercase">{language}</span>
            </button>
            
            {/* Dropdown on Hover */}
            <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-xl border border-slate-100 p-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform translate-y-2 group-hover:translate-y-0">
                {[
                    { code: 'pt', label: 'Português', flag: '🇧🇷' },
                    { code: 'en', label: 'English', flag: '🇺🇸' },
                    { code: 'es', label: 'Español', flag: '🇪🇸' }
                ].map((lang) => (
                    <button 
                        key={lang.code}
                        onClick={() => setLanguage(lang.code as any)} 
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${language === lang.code ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <span className="text-lg">{lang.flag}</span> {lang.label}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* LEFT SIDE: VISUAL / BRANDING */}
      <div className="hidden lg:flex w-[55%] relative bg-slate-900 items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/90 via-slate-900/95 to-purple-950/90"></div>
          
          {/* Animated Shapes */}
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[120px] animate-[pulse_8s_infinite_ease-in-out]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[120px] animate-[pulse_10s_infinite_ease-in-out_reverse]"></div>

          <div className="relative z-10 max-w-xl px-12 text-white">
              <div className="w-20 h-20 bg-gradient-to-tr from-white/10 to-white/5 border border-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-8 shadow-2xl">
                  <BrainCircuit size={40} className="text-indigo-300" />
              </div>
              <h1 className="text-5xl font-display font-bold leading-tight mb-6">
                  Gestão Inteligente para <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">Psicólogos Modernos</span>.
              </h1>
              <p className="text-lg text-indigo-100/80 leading-relaxed border-l-4 border-indigo-500 pl-6">
                  "O PsiManager Pro transformou a maneira como organizo meus atendimentos. Segurança e praticidade em um só lugar."
              </p>
              
              <div className="mt-12 flex items-center gap-4 text-sm font-medium text-indigo-200/60">
                  <div className="flex -space-x-3">
                      {[1,2,3,4].map(i => (
                          <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-xs text-white">
                              User
                          </div>
                      ))}
                  </div>
                  <p>Junte-se a +2.000 profissionais</p>
              </div>
          </div>
      </div>

      {/* RIGHT SIDE: LOGIN FORM */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 relative">
          
          <div className="w-full max-w-[420px] space-y-10 animate-[fadeIn_0.6s_ease-out]">
              
              {/* Mobile Header (Only visible on small screens) */}
              <div className="lg:hidden flex items-center gap-2 mb-8">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                      <BrainCircuit size={20} />
                  </div>
                  <span className="font-display font-bold text-xl text-slate-800">PsiManager Pro</span>
              </div>

              <div>
                  <h2 className="text-3xl font-display font-bold text-slate-900 mb-2">{t('login.welcome')}</h2>
                  <p className="text-slate-500">{t('login.subtitle')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Email Input */}
                  <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide ml-1">{t('login.email')}</label>
                      <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                          </div>
                          <input 
                              type="email" 
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="block w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                              placeholder="nome@clinica.com"
                          />
                      </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1.5">
                      <div className="flex justify-between items-center ml-1">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">{t('login.password')}</label>
                          <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
                              {t('login.forgot')}
                          </button>
                      </div>
                      <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                          </div>
                          <input 
                              type={showPassword ? "text" : "password"} 
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="block w-full pl-11 pr-12 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                              placeholder="••••••••"
                          />
                          <button 
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                          >
                              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                      </div>
                  </div>

                  <div className="flex items-center">
                      <label className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative flex items-center">
                              <input type="checkbox" className="peer sr-only" />
                              <div className="w-5 h-5 border-2 border-slate-300 rounded-md peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all"></div>
                              <CheckCircle2 size={12} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                          </div>
                          <span className="text-sm font-medium text-slate-500 group-hover:text-slate-700 transition-colors">{t('login.remember')}</span>
                      </label>
                  </div>

                  <button 
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-base shadow-xl shadow-slate-900/20 hover:bg-indigo-600 hover:shadow-indigo-600/30 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                  >
                      {isLoggingIn ? (
                          <Loader2 className="animate-spin" />
                      ) : (
                          <>
                              {t('login.submit')} <ArrowRight size={20} />
                          </>
                      )}
                  </button>
              </form>

              <div className="text-center pt-4">
                  <p className="text-sm text-slate-400">
                      Não tem uma conta? <a href="#" className="font-bold text-indigo-600 hover:underline">Fale com vendas</a>
                  </p>
              </div>
          </div>

          <div className="absolute bottom-6 text-center w-full text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-50">
              Secured by SSL • Encrypted Data
          </div>
      </div>

    </div>
  );
};
