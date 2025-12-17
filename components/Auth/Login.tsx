
import React, { useState } from 'react';
import { BrainCircuit, ArrowRight, Mail, Lock, Eye, EyeOff, Loader2, Globe } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export const Login: React.FC<{ onLogin: () => void }> = () => {
  const { language, setLanguage, t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError('');

      try {
          const response = await api.post<{ token: string }>('/auth/login', { email, password });
          login(response.token);
          navigate('/');
      } catch (err: any) {
          setError(err.message || 'Credenciais inválidas');
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50 font-sans overflow-hidden">
      <div className="absolute top-6 right-6 z-20">
        <button className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full shadow-sm border border-slate-200 text-sm font-medium text-slate-600">
            <Globe size={16} /> <span className="uppercase">{language}</span>
        </button>
      </div>

      <div className="hidden lg:flex w-1/2 relative bg-slate-900 items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 opacity-90"></div>
          <div className="relative z-10 text-center p-12">
              <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                  <BrainCircuit size={40} className="text-white" />
              </div>
              <h1 className="text-4xl font-display font-bold text-white mb-4">PsiManager Pro</h1>
              <p className="text-indigo-200 text-lg max-w-md">Gestão clínica inteligente e segura para psicólogos modernos.</p>
          </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md space-y-8 animate-fadeIn">
              <div>
                  <h2 className="text-3xl font-display font-bold text-slate-900">{t('login.welcome')}</h2>
                  <p className="text-slate-500 mt-2">{t('login.subtitle')}</p>
              </div>

              {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium animate-shake">
                      {error}
                  </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">{t('login.email')}</label>
                      <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                          <input 
                              type="email" required value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                              placeholder="exemplo@email.com"
                          />
                      </div>
                  </div>

                  <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">{t('login.password')}</label>
                      <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                          <input 
                              type={showPassword ? "text" : "password"} required value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                              placeholder="••••••••"
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                      </div>
                  </div>

                  <button 
                      type="submit" disabled={isLoading}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                  >
                      {isLoading ? <Loader2 className="animate-spin" /> : <>{t('login.submit')} <ArrowRight size={20} /></>}
                  </button>
              </form>
          </div>
      </div>
    </div>
  );
};
