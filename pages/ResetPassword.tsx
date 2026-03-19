import React, { useState, useEffect } from 'react';
import { BrainCircuit, Lock, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Link de recuperação inválido ou incompleto.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Link inválido ou expirado. Solicite um novo link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden flex font-sans">
      {/* Background */}
      <div className="fixed inset-0 z-[-2] bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent" />
      </div>
      <div className="fixed w-[40vw] h-[40vw] rounded-full blur-[100px] opacity-20 z-[-1] bg-indigo-600 top-[-10%] left-[-10%] animate-[float_20s_infinite_ease-in-out_alternate]" />
      <div className="fixed w-[40vw] h-[40vw] rounded-full blur-[100px] opacity-20 z-[-1] bg-purple-600 bottom-[-10%] right-[-10%] animate-[float_20s_infinite_ease-in-out_alternate] delay-[-5s]" />

      <div className="w-full h-full flex items-center justify-center p-4">
        <div className="relative bg-white flex flex-col justify-center items-center p-8 md:p-12 shadow-2xl rounded-3xl z-20 w-full max-w-md animate-[scaleIn_0.3s_ease-out]">

          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="h-16 w-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/20">
              <BrainCircuit className="h-9 w-9 text-white" />
            </div>
          </div>

          {/* Sucesso */}
          {status === 'success' && (
            <div className="text-center animate-[fadeIn_0.5s_ease-out]">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} />
              </div>
              <h1 className="font-bold text-slate-900 text-2xl mb-3">Senha redefinida!</h1>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                Sua senha foi atualizada com sucesso. Você já pode entrar com a nova senha.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all"
              >
                Ir para o Login
              </button>
            </div>
          )}

          {/* Erro de token inválido */}
          {status === 'error' && (
            <div className="text-center animate-[fadeIn_0.5s_ease-out]">
              <div className="w-20 h-20 bg-red-50 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle size={40} />
              </div>
              <h1 className="font-bold text-slate-900 text-2xl mb-3">Link inválido</h1>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">{errorMsg}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
              >
                Voltar ao Login
              </button>
            </div>
          )}

          {/* Formulário */}
          {status === 'idle' && (
            <div className="w-full">
              <div className="text-center mb-8">
                <h1 className="font-bold text-slate-900 text-2xl mb-2">Criar nova senha</h1>
                <p className="text-slate-400 text-sm">Escolha uma senha segura para sua conta PsiFlux.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Nova senha */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nova senha</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-11 pr-11 py-3.5 rounded-xl text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirmar senha */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirmar senha</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repita a nova senha"
                      className={`w-full pl-11 pr-11 py-3.5 rounded-xl text-sm bg-slate-50 border text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                        confirm && confirm !== password
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                      }`}
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirm && confirm !== password && (
                    <p className="text-xs text-red-500 font-medium ml-1">As senhas não coincidem</p>
                  )}
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !password || !confirm}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Salvando...</> : 'Salvar nova senha'}
                </button>
              </form>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 w-full flex justify-center">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">PsiFlux Segurança</p>
          </div>
        </div>
      </div>
    </div>
  );
};
