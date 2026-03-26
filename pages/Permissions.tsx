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
  Info,
  Sparkles,
  Smartphone,
  BarChart2,
  Package,
  ShoppingBag,
  UserCheck,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

type AccessLevel = 'total' | 'edit' | 'own' | 'view' | 'limited' | 'none';

// Módulos espelham exatamente as permissões usadas nas rotas (App.tsx)
// e os grupos espelham o NAV_SECTIONS do menu (constants.tsx)
const MODULES = [
  // Geral
  { key: 'view_dashboard',          label: 'Dashboard',                         icon: <Boxes size={16} />,       group: 'Geral' },
  // Clínico
  { key: 'view_patients',           label: 'Pacientes',                         icon: <Users size={16} />,       group: 'Clínico' },
  { key: 'view_medical_records',    label: 'Prontuário & Estudos de Caso',       icon: <FileText size={16} />,    group: 'Clínico' },
  { key: 'neuro_access',            label: 'Neurodesenvolvimento (PEI)',         icon: <BrainCircuit size={16} />, group: 'Clínico' },
  // Intervenção & Teoria
  { key: 'manage_clinical_tools',   label: 'Ferramentas Clínicas, Instrumentos (DISC, DASS) & Abordagens', icon: <Briefcase size={16} />, group: 'Intervenção' },
  // Avaliação
  { key: 'manage_forms',            label: 'Formulários',                          icon: <ClipboardList size={16} />, group: 'Avaliação' },
  // Documentos
  { key: 'manage_documents',        label: 'Documentos, Encaminhamentos & Termos', icon: <FolderOpen size={16} />, group: 'Documentos' },
  // Gestão
  { key: 'view_agenda',             label: 'Agenda & Salas Virtuais',            icon: <Calendar size={16} />,   group: 'Gestão' },
  { key: 'manage_professionals',    label: 'Profissionais',                      icon: <UserCheck size={16} />,  group: 'Gestão' },
  { key: 'manage_services',         label: 'Serviços',                           icon: <Briefcase size={16} />,  group: 'Gestão' },
  { key: 'manage_products',         label: 'Produtos',                           icon: <Package size={16} />,    group: 'Gestão' },
  { key: 'view_all_comandas',       label: 'Comandas',                           icon: <ShoppingBag size={16} />, group: 'Gestão' },
  // Financeiro
  { key: 'view_financial_reports',  label: 'Financeiro & Livro Caixa',           icon: <DollarSign size={16} />, group: 'Financeiro' },
  { key: 'view_performance_reports',label: 'Relatórios & Desempenho & Melhores Clientes', icon: <BarChart2 size={16} />, group: 'Financeiro' },
  // Comunicação
  { key: 'access_messages',         label: 'Mensagens',                          icon: <MessageCircle size={16} />, group: 'Comunicação' },
  { key: 'aurora_ai',               label: 'Aurora AI',                          icon: <Sparkles size={16} />,   group: 'Comunicação', requiredFeature: 'aurora_ai' },
  // Sistema
  { key: 'manage_clinic_settings',  label: 'Configurações',                      icon: <Settings size={16} />,   group: 'Sistema' },
  { key: 'manage_bot_integration',  label: 'WhatsApp Bot',                       icon: <Smartphone size={16} />, group: 'Sistema', requiredFeature: 'whatsapp_bot' },
];

const ROLES = [
  {
    id: 'admin',
    title: 'Administrador',
    description: 'Acesso total à clínica, gestão e financeiro.',
    accent: 'from-indigo-600 to-violet-600',
    permissions: {
      view_dashboard:           'total',
      view_patients:            'total',
      view_medical_records:     'total',
      neuro_access:             'total',
      manage_clinical_tools:    'total',
      manage_forms:             'total',
      manage_instruments:       'total',
      manage_documents:         'total',
      view_agenda:              'total',
      manage_professionals:     'total',
      manage_services:          'total',
      manage_products:          'total',
      view_all_comandas:        'total',
      view_financial_reports:   'total',
      view_performance_reports: 'total',
      access_messages:          'total',
      aurora_ai:                'total',
      manage_clinic_settings:   'total',
      manage_bot_integration:   'total',
    } as Record<string, AccessLevel>
  },
  {
    id: 'professional',
    title: 'Profissional',
    description: 'Acesso clínico aos seus pacientes e produção.',
    accent: 'from-emerald-500 to-teal-500',
    permissions: {
      view_dashboard:           'view',
      view_patients:            'own',
      view_medical_records:     'own',
      neuro_access:             'own',
      manage_clinical_tools:    'total',
      manage_forms:             'view',
      manage_instruments:       'total',
      manage_documents:         'own',
      view_agenda:              'own',
      manage_professionals:     'none',
      manage_services:          'none',
      manage_products:          'none',
      view_all_comandas:        'none',
      view_financial_reports:   'none',
      view_performance_reports: 'limited',
      access_messages:          'view',
      aurora_ai:                'view',
      manage_clinic_settings:   'none',
      manage_bot_integration:   'none',
    } as Record<string, AccessLevel>
  },
  {
    id: 'secretary',
    title: 'Secretário(a)',
    description: 'Agenda, cadastro e apoio à recepção.',
    accent: 'from-sky-500 to-blue-500',
    permissions: {
      view_dashboard:           'view',
      view_patients:            'edit',
      view_medical_records:     'view',
      neuro_access:             'none',
      manage_clinical_tools:    'none',
      manage_forms:             'view',
      manage_instruments:       'none',
      manage_documents:         'view',
      view_agenda:              'edit',
      manage_professionals:     'view',
      manage_services:          'view',
      manage_products:          'view',
      view_all_comandas:        'limited',
      view_financial_reports:   'none',
      view_performance_reports: 'none',
      access_messages:          'edit',
      aurora_ai:                'none',
      manage_clinic_settings:   'none',
      manage_bot_integration:   'none',
    } as Record<string, AccessLevel>
  }
];

const accessLabel: Record<AccessLevel, string> = {
  total:   'Total',
  edit:    'Edição',
  own:     'Próprio',
  view:    'Visualizar',
  limited: 'Limitado',
  none:    'Sem acesso'
};

const accessStyles: Record<AccessLevel, string> = {
  total:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  edit:    'bg-sky-50 text-sky-700 border-sky-200',
  own:     'bg-indigo-50 text-indigo-700 border-indigo-200',
  view:    'bg-slate-50 text-slate-600 border-slate-200',
  limited: 'bg-amber-50 text-amber-700 border-amber-200',
  none:    'bg-rose-50 text-rose-600 border-rose-200'
};

const GROUP_ORDER = ['Geral', 'Clínico', 'Intervenção', 'Avaliação', 'Documentos', 'Gestão', 'Financeiro', 'Comunicação', 'Sistema'];

export const Permissions: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [view, setView] = useState<'cards' | 'matrix'>('cards');
  const [query, setQuery] = useState('');
  const [activeRole, setActiveRole] = useState('admin');

  const filteredModules = useMemo(() => {
    const q = query.trim().toLowerCase();
    const available = MODULES.filter((m: any) => {
      if (!m.requiredFeature) return true;
      return user?.plan_features?.includes(m.requiredFeature);
    });
    if (!q) return available;
    return available.filter(m => m.label.toLowerCase().includes(q) || m.group.toLowerCase().includes(q));
  }, [query, user?.plan_features]);

  // Agrupa os módulos filtrados por seção
  const groupedModules = useMemo(() => {
    const map: Record<string, typeof MODULES> = {};
    for (const g of GROUP_ORDER) map[g] = [];
    for (const m of filteredModules) {
      if (!map[m.group]) map[m.group] = [];
      map[m.group].push(m);
    }
    return GROUP_ORDER.filter(g => map[g].length > 0).map(g => ({ group: g, items: map[g] }));
  }, [filteredModules]);

  const summary = useMemo(() => {
    return ROLES.map(role => {
      const values = Object.values(role.permissions);
      return {
        id: role.id,
        total:   values.filter(v => v === 'total').length,
        limited: values.filter(v => v === 'limited' || v === 'view' || v === 'own' || v === 'edit').length,
        none:    values.filter(v => v === 'none').length
      };
    });
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn font-sans pb-20">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-900"></div>
        <div className="absolute -top-24 -right-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl"></div>
        <div className="relative z-10 p-8 text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest">
            <Shield size={14} /> Permissões
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mt-4">Gestão de Permissões</h1>
          <p className="text-indigo-100 mt-3 max-w-2xl">Controle visual das permissões por cargo. Compare acessos e entenda rapidamente o que cada perfil pode fazer em cada módulo do sistema.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Cargos</div>
          <div className="text-2xl font-display font-bold text-slate-800 mt-2">{ROLES.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Módulos</div>
          <div className="text-2xl font-display font-bold text-slate-800 mt-2">{filteredModules.length}</div>
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

      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar módulo ou grupo..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-medium"
          />
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setView('cards')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${view === 'cards' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>
            <LayoutGrid size={16} /> Cartões
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
              <div className="p-6 space-y-5">
                {groupedModules.map(({ group, items }) => (
                  <div key={group}>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{group}</div>
                    <div className="space-y-2.5">
                      {items.map((mod) => {
                        const access = (role.permissions[mod.key] || 'none') as AccessLevel;
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
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-400 font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Módulo</th>
                  {ROLES.map(role => (
                    <th key={role.id} className="px-6 py-4 text-center">{role.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedModules.map(({ group, items }) => (
                  <React.Fragment key={group}>
                    <tr className="bg-slate-50/80">
                      <td colSpan={ROLES.length + 1} className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {group}
                      </td>
                    </tr>
                    {items.map((mod) => (
                      <tr key={mod.key} className="hover:bg-slate-50/80">
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">{mod.icon}</span>
                            {mod.label}
                          </div>
                        </td>
                        {ROLES.map(role => {
                          const access = (role.permissions[mod.key] || 'none') as AccessLevel;
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
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Info size={18} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">Permissões padrão do sistema</div>
            <div className="text-xs text-slate-500 max-w-xl">As permissões exibidas refletem exatamente as rotas e módulos ativos no menu. Para ajustes finos por usuário, utilize as configurações de acesso da equipe.</div>
          </div>
        </div>
        <button className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-700">
          Gerenciar por usuário
        </button>
      </div>
    </div>
  );
};
