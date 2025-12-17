
import React from 'react';
import { Shield, Check, X, Lock, User, Briefcase, Eye } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const ROLE_PERMISSIONS = [
    {
        role: 'Administrador',
        desc: 'Acesso total à clínica e gestão financeira.',
        permissions: [
            { module: 'Agenda', access: 'Total' },
            { module: 'Prontuários', access: 'Total' },
            { module: 'Financeiro', access: 'Total' },
            { module: 'Configurações', access: 'Total' },
            { module: 'Relatórios Master', access: 'Sim' },
        ]
    },
    {
        role: 'Profissional',
        desc: 'Acesso clínico aos seus próprios pacientes.',
        permissions: [
            { module: 'Agenda', access: 'Própria' },
            { module: 'Prontuários', access: 'Dos Pacientes Vinculados' },
            { module: 'Financeiro', access: 'Sua Produção' },
            { module: 'Configurações', access: 'Perfil' },
            { module: 'Relatórios Master', access: 'Não' },
        ]
    },
    {
        role: 'Secretário(a)',
        desc: 'Gestão de agenda e recepção de pacientes.',
        permissions: [
            { module: 'Agenda', access: 'Total (Visualização/Edição)' },
            { module: 'Prontuários', access: 'Apenas Cadastro' },
            { module: 'Financeiro', access: 'Apenas Recebimento' },
            { module: 'Configurações', access: 'Não' },
            { module: 'Relatórios Master', access: 'Não' },
        ]
    }
];

export const Permissions: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-8 animate-fadeIn font-sans pb-20">
      <div className="bg-slate-900 rounded-[26px] p-8 text-white shadow-xl">
          <h1 className="text-3xl font-display font-bold">Gestão de Permissões</h1>
          <p className="text-indigo-200 mt-2">Veja o que cada cargo pode acessar no sistema.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {ROLE_PERMISSIONS.map((group) => (
              <div key={group.role} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                      <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Shield size={20}/></div>
                          <h3 className="font-bold text-lg text-slate-800">{group.role}</h3>
                      </div>
                      <p className="text-xs text-slate-500">{group.desc}</p>
                  </div>
                  <div className="flex-1 p-6 space-y-4">
                      {group.permissions.map((p, i) => (
                          <div key={i} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0">
                              <span className="text-slate-500 font-medium">{p.module}</span>
                              <span className={`font-bold ${p.access === 'Não' ? 'text-rose-500' : 'text-indigo-600'}`}>{p.access}</span>
                          </div>
                      ))}
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                      <button className="text-xs font-bold text-slate-400 cursor-not-allowed">As permissões são fixas neste plano</button>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};
