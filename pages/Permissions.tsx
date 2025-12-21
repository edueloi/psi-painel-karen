import React, { useMemo, useState } from 'react';
import {
  Shield,
  Users,
  Calendar,
  FileText,
  DollarSign,
  Settings,
  ClipboardList,
  FolderOpen,
  BrainCircuit,
  Boxes,
  MessageCircle,
  LayoutGrid,
  Rows,
  Search,
  Info
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

type AccessLevel = 'total' | 'edit' | 'own' | 'view' | 'limited' | 'none';

const MODULES = [
  { key: 'agenda', label: 'Agenda', icon: <Calendar size={16} /> },
  { key: 'patients', label: 'Pacientes', icon: <Users size={16} /> },
  { key: 'records', label: 'Prontuario', icon: <FileText size={16} /> },
  { key: 'neuro', label: 'Neurodesenvolvimento', icon: <BrainCircuit size={16} /> },
  { key: 'tools', label: 'Caixa de Ferramentas', icon: <Boxes size={16} /> },
  { key: 'forms', label: 'Formularios', icon: <ClipboardList size={16} /> },
  { key: 'documents', label: 'Documentos', icon: <FolderOpen size={16} /> },
  { key: 'messages', label: 'Mensagens', icon: <MessageCircle size={16} /> },
  { key: 'finance', label: 'Financeiro', icon: <DollarSign size={16} /> },
  { key: 'settings', label: 'Configuracoes', icon: <Settings size={16} /> }
];

const ROLES = [
  {
    id: 'admin',
    title: 'Administrador',
    description: 'Acesso total a clinica, gestao e financeiro.',
    accent: 'from-indigo-600 to-violet-600',
    permissions: {
      agenda: 'total',
      patients: 'total',
      records: 'total',
      neuro: 'total',
      tools: 'total',
      forms: 'total',
      documents: 'total',
      messages: 'total',
      finance: 'total',
      settings: 'total'
    } as Record<string, AccessLevel>
  },
  {
    id: 'professional',
    title: 'Profissional',
    description: 'Acesso clinico aos seus pacientes e producao.',
    accent: 'from-emerald-500 to-teal-500',
    permissions: {
      agenda: 'own',
      patients: 'own',
      records: 'own',
      neuro: 'own',
      tools: 'own',
      forms: 'view',
      documents: 'own',
      messages: 'view',
      finance: 'limited',
      settings: 'view'
    } as Record<string, AccessLevel>
  },
  {
    id: 'secretary',
    title: 'Secretario(a)',
    description: 'Agenda, cadastro e apoio a recepcao.',
    accent: 'from-sky-500 to-blue-500',
    permissions: {
      agenda: 'edit',
      patients: 'edit',
      records: 'view',
      neuro: 'none',
      tools: 'none',
      forms: 'view',
      documents: 'view',
      messages: 'edit',
      finance: 'limited',
      settings: 'none'
    } as Record<string, AccessLevel>
  }
];

const accessLabel: Record<AccessLevel, string> = {
  total: 'Total',
  edit: 'Edicao',
  own: 'Proprio',
  view: 'Visualizar',
  limited: 'Limitado',
  none: 'Sem acesso'
};

const accessStyles: Record<AccessLevel, string> = {
  total: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  edit: 'bg-sky-50 text-sky-700 border-sky-200',
  own: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  view: 'bg-slate-50 text-slate-600 border-slate-200',
  limited: 'bg-amber-50 text-amber-700 border-amber-200',
  none: 'bg-rose-50 text-rose-600 border-rose-200'
};

export const Permissions: React.FC = () => {
  const { t } = useLanguage();
  const [view, setView] = useState<'cards' | 'matrix'>('cards');
  const [query, setQuery] = useState('');
  const [activeRole, setActiveRole] = useState('admin');

  const filteredModules = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MODULES;
    return MODULES.filter(m => m.label.toLowerCase().includes(q));
  }, [query]);

  const summary = useMemo(() => {
    const totals = ROLES.map(role => {
      const values = Object.values(role.permissions);
      return {
        id: role.id,
        total: values.filter(v => v === 'total').length,
        limited: values.filter(v => v === 'limited' || v === 'view').length,
        none: values.filter(v => v === 'none').length
      };
    });
    return totals;
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn font-sans pb-20">
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-900"></div>
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl"></div>
        <div className="relative z-10 p-8 text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest">
            <Shield size={14} /> Permissoes
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mt-4">Gestao de Permissoes</h1>
          <p className="text-indigo-100 mt-3 max-w-2xl">Controle visual das permissoes por cargo. Compare acessos e entenda rapidamente o que cada perfil pode fazer.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Cargos</div>
          <div className="text-2xl font-display font-bold text-slate-800 mt-2">{ROLES.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Modulos</div>
          <div className="text-2xl font-display font-bold text-slate-800 mt-2">{MODULES.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Acesso total</div>
          <div className="text-2xl font-display font-bold text-slate-800 mt-2">{summary.find(s => s.id === activeRole)?.total ?? 0}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Sem acesso</div>
          <div className="text-2xl font-display font-bold text-slate-800 mt-2">{summary.find(s => s.id === activeRole)?.none ?? 0}</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar modulo..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-medium"
          />
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setView('cards')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${view === 'cards' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
            <LayoutGrid size={16} /> Cartoes
          </button>
          <button onClick={() => setView('matrix')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${view === 'matrix' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
            <Rows size={16} /> Matriz
          </button>
        </div>
      </div>

      {view === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {ROLES.map((role) => (
            <div key={role.id} className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col ${activeRole === role.id ? 'ring-2 ring-indigo-500' : ''}`}>
              <div className={`p-6 bg-gradient-to-r ${role.accent} text-white`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{role.title}</h3>
                    <p className="text-xs text-white/80 mt-1">{role.description}</p>
                  </div>
                  <button onClick={() => setActiveRole(role.id)} className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/15 border border-white/30 rounded-full">Foco</button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {filteredModules.map((mod) => {
                  const access = role.permissions[mod.key] || 'none';
                  return (
                    <div key={mod.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="text-slate-400">{mod.icon}</span>
                        {mod.label}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full border ${accessStyles[access]}`}>
                        {accessLabel[access]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-400 font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Modulo</th>
                  {ROLES.map(role => (
                    <th key={role.id} className="px-6 py-4 text-center">{role.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredModules.map((mod) => (
                  <tr key={mod.key} className="hover:bg-slate-50/80">
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{mod.icon}</span>
                        {mod.label}
                      </div>
                    </td>
                    {ROLES.map(role => {
                      const access = role.permissions[mod.key] || 'none';
                      return (
                        <td key={role.id} className="px-6 py-4 text-center">
                          <span className={`text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full border ${accessStyles[access]}`}>
                            {accessLabel[access]}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Info size={18} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">Permissoes padrao</div>
            <div className="text-xs text-slate-500 max-w-xl">As permissoes exibidas sao o padrao do sistema. Para ajustes finos por usuario, utilize o menu de configuracoes de acesso.</div>
          </div>
        </div>
        <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-700">
          Gerenciar por usuario
        </button>
      </div>
    </div>
  );
};
