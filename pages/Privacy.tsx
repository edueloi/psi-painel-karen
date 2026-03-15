import React, { useState } from 'react';
import { Shield, Lock, Eye, Key, Smartphone, LogOut, AlertTriangle, FileText } from 'lucide-react';

export const Privacy: React.FC = () => {
  const [isPublic, setIsPublic] = useState(true);
  const [twoFactor, setTwoFactor] = useState(true);

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-[fadeIn_0.5s_ease-out]">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-4 bg-emerald-50 text-emerald-600 rounded-full mb-4 shadow-sm">
            <Shield size={32} />
        </div>
        <h1 className="text-3xl font-display font-bold text-slate-800">Privacidade e Segurança</h1>
        <p className="text-slate-500 max-w-lg mx-auto mt-2">Gerencie como seus dados são vistos e proteja sua conta com padrões bancários de segurança.</p>
      </div>

      <div className="space-y-6">
          
          {/* Visibility Section */}
          <div className="bg-white rounded-[24px] p-8 border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Eye size={20} className="text-indigo-500" /> Visibilidade do Perfil
              </h3>
              
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div>
                      <h4 className="font-bold text-slate-700">Perfil Público de Agendamento</h4>
                      <p className="text-sm text-slate-500 mt-1">Permitir que pacientes encontrem você na busca pública.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={isPublic} onChange={() => setIsPublic(!isPublic)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
              </div>
          </div>

          {/* Security Section */}
          <div className="bg-white rounded-[24px] p-8 border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Lock size={20} className="text-indigo-500" /> Segurança de Acesso
              </h3>

              <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                              <Key size={20} />
                          </div>
                          <div>
                              <h4 className="font-bold text-slate-700">Alterar Senha</h4>
                              <p className="text-xs text-slate-500">Última alteração há 3 meses.</p>
                          </div>
                      </div>
                      <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 group-hover:border-indigo-200 group-hover:text-indigo-600">
                          Atualizar
                      </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                              <Smartphone size={20} />
                          </div>
                          <div>
                              <h4 className="font-bold text-slate-700">Autenticação de Dois Fatores (2FA)</h4>
                              <p className="text-xs text-slate-500">Camada extra de segurança via SMS ou App.</p>
                          </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={twoFactor} onChange={() => setTwoFactor(!twoFactor)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                  </div>
              </div>
          </div>

          {/* Active Sessions */}
          <div className="bg-white rounded-[24px] p-8 border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Smartphone size={20} className="text-indigo-500" /> Dispositivos Ativos
              </h3>
              
              <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                      <div className="flex items-center gap-4">
                          <div className="text-3xl">💻</div>
                          <div>
                              <h4 className="font-bold text-slate-700">MacBook Pro (Este dispositivo)</h4>
                              <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">● Online agora • São Paulo, BR</p>
                          </div>
                      </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl opacity-70">
                      <div className="flex items-center gap-4">
                          <div className="text-3xl">📱</div>
                          <div>
                              <h4 className="font-bold text-slate-700">iPhone 14 Pro</h4>
                              <p className="text-xs text-slate-500">Último acesso: Ontem às 22:45</p>
                          </div>
                      </div>
                      <button className="text-xs font-bold text-red-500 hover:underline">Desconectar</button>
                  </div>
              </div>
          </div>

          {/* Compliance & Data */}
          <div className="bg-white rounded-[24px] p-8 border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <FileText size={20} className="text-indigo-500" /> Dados e LGPD
              </h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  O PsiFlux está em conformidade com a LGPD. Você pode solicitar uma cópia dos seus dados ou a exclusão da conta a qualquer momento.
              </p>
              
              <div className="flex gap-4">
                  <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">
                      Baixar meus dados (JSON)
                  </button>
                  <button className="px-4 py-2 bg-transparent border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:border-slate-300 transition-colors">
                      Termos de Uso
                  </button>
              </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 rounded-[24px] p-8 border border-red-100">
              <h3 className="text-lg font-bold text-red-700 mb-2 flex items-center gap-2">
                  <AlertTriangle size={20} /> Zona de Perigo
              </h3>
              <p className="text-sm text-red-600/80 mb-6">
                  A exclusão da conta é permanente e removerá todos os prontuários, agendamentos e dados financeiros.
              </p>
              <button className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-all">
                  Excluir Conta
              </button>
          </div>

      </div>
    </div>
  );
};