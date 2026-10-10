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
import { PageWrapper, SectionTitle, StatGrid, StatCard, Tabs, PanelCard, ContentCard, Badge, Alert, Button, FilterLine, FilterLineSection, FilterLineSearch, EmptyState } from '../components/UI';

type AccessLevel = 'total' | 'edit' | 'own' | 'view' | 'limited' | 'none';

// Módulos espelham exatamente as permissões usadas nas rotas (App.tsx)
// e os grupos espelham o NAV_SECTIONS do menu (constants.tsx)
const MODULES = [
  // Geral
  { key: 'view_dashboard',          label: 'Dashboard',                         Icon: Boxes,         group: 'Geral' },
  // Clínico
  { key: 'view_patients',           label: 'Pacientes',                         Icon: Users,         group: 'Clínico' },
  { key: 'view_medical_records',    label: 'Prontuário & Estudos de Caso',       Icon: FileText,      group: 'Clínico' },
  { key: 'neuro_access',            label: 'Neurodesenvolvimento (PEI)',         Icon: BrainCircuit,  group: 'Clínico' },
  // Intervenção & Teoria
  { key: 'manage_clinical_tools',   label: 'Ferramentas Clínicas, Instrumentos (DISC, DASS) & Abordagens', Icon: Briefcase, group: 'Intervenção' },
  // Avaliação
  { key: 'manage_forms',            label: 'Formulários',                          Icon: ClipboardList, group: 'Avaliação' },
  // Documentos
  { key: 'manage_documents',        label: 'Documentos, Encaminhamentos & Termos', Icon: FolderOpen,    group: 'Documentos' },
  // Gestão
  { key: 'view_agenda',             label: 'Agenda & Salas Virtuais',            Icon: Calendar,      group: 'Gestão' },
  { key: 'manage_professionals',    label: 'Profissionais',                      Icon: UserCheck,     group: 'Gestão' },
  { key: 'manage_services',         label: 'Serviços',                           Icon: Briefcase,     group: 'Gestão' },
  { key: 'manage_products',         label: 'Produtos',                           Icon: Package,       group: 'Gestão' },
  { key: 'view_all_comandas',       label: 'Comandas',                           Icon: ShoppingBag,   group: 'Gestão' },
  // Financeiro
  { key: 'view_financial_reports',  label: 'Financeiro & Livro Caixa',           Icon: DollarSign,    group: 'Financeiro' },
  { key: 'view_performance_reports',label: 'Relatórios & Desempenho & Melhores Clientes', Icon: BarChart2, group: 'Financeiro' },
  // Comunicação
  { key: 'access_messages',         label: 'Mensagens',                          Icon: MessageCircle, group: 'Comunicação' },
  { key: 'aurora_ai',               label: 'Bia AI',                          Icon: Sparkles,      group: 'Comunicação', requiredFeature: 'aurora_ai' },
  // Sistema
  { key: 'manage_clinic_settings',  label: 'Configurações',                      Icon: Settings,      group: 'Sistema' },
  { key: 'manage_bot_integration',  label: 'WhatsApp Bot',                       Icon: Smartphone,    group: 'Sistema', requiredFeature: 'whatsapp_bot' },
];

const ROLES = [
  {
    id: 'admin',
    title: 'Administrador',
    description: 'Acesso total à clínica, gestão e financeiro.',
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

const accessColor: Record<AccessLevel, 'success' | 'info' | 'primary' | 'default' | 'warning' | 'danger'> = {
  total:   'success',
  edit:    'info',
  own:     'primary',
  view:    'default',
  limited: 'warning',
  none:    'danger'
};

const GROUP_ORDER = ['Geral', 'Clínico', 'Intervenção', 'Avaliação', 'Documentos', 'Gestão', 'Financeiro', 'Comunicação', 'Sistema'];

type PermissionsView = 'cards' | 'matrix';

const VIEW_TABS = [
  { id: 'cards', label: 'Cartões', icon: LayoutGrid },
  { id: 'matrix', label: 'Matriz', icon: Rows },
] as const;

export const Permissions: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [view, setView] = useState<PermissionsView>('cards');
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
    <PageWrapper className="animate-fadeIn font-sans">
      <div className="space-y-4">
        <SectionTitle
          icon={Shield}
          title="Gestão de Permissões"
          description="Controle visual das permissões por cargo. Compare acessos e entenda o que cada perfil pode fazer em cada módulo."
        />

        <StatGrid cols={4}>
          <StatCard title="Cargos" value={ROLES.length} icon={Users} />
          <StatCard title="Módulos" value={filteredModules.length} icon={Boxes} color="info" />
          <StatCard title="Acesso total" value={summary.find(s => s.id === activeRole)?.total ?? 0} icon={Shield} color="success" />
          <StatCard title="Sem acesso" value={summary.find(s => s.id === activeRole)?.none ?? 0} icon={Info} color="danger" />
        </StatGrid>

        <Tabs<PermissionsView> items={VIEW_TABS} value={view} onChange={setView} label="Visão de permissões">
          <div className="space-y-3">
            <FilterLine>
              <FilterLineSection grow>
                <FilterLineSearch
                  value={query}
                  onChange={setQuery}
                  placeholder="Buscar módulo ou grupo..."
                  aria-label="Buscar módulo ou grupo"
                  className="max-w-[280px]"
                />
              </FilterLineSection>
            </FilterLine>

            {groupedModules.length === 0 ? (
              <ContentCard>
                <EmptyState icon={Shield} title="Nenhum módulo encontrado" description="Ajuste a busca para ver as permissões." />
              </ContentCard>
            ) : view === 'cards' ? (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {ROLES.map((role) => (
                  <PanelCard
                    key={role.id}
                    title={role.title}
                    description={role.description}
                    className={activeRole === role.id ? 'ring-2 ring-primary-500' : ''}
                    action={
                      <div className="flex lg:justify-end">
                        <Button size="xs" variant={activeRole === role.id ? 'primary' : 'outline'} onClick={() => setActiveRole(role.id)}>Foco</Button>
                      </div>
                    }
                  >
                    <div className="space-y-4">
                      {groupedModules.map(({ group, items }) => (
                        <div key={group}>
                          <div className="mb-2 text-xs font-medium text-slate-600">{group}</div>
                          <div className="space-y-2">
                            {items.map((mod) => {
                              const access = (role.permissions[mod.key] || 'none') as AccessLevel;
                              return (
                                <div key={mod.key} className="flex items-center justify-between gap-2">
                                  <div className="flex min-w-0 items-center gap-2 text-[13px] text-slate-700">
                                    <span className="shrink-0 text-slate-400"><mod.Icon size={14} /></span>
                                    <span className="min-w-0">{mod.label}</span>
                                  </div>
                                  <Badge size="sm" color={accessColor[access]} className="shrink-0">{accessLabel[access]}</Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </PanelCard>
                ))}
              </div>
            ) : (
              <ContentCard padding="none" className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5">Módulo</th>
                        {ROLES.map(role => (
                          <th key={role.id} className="px-3 py-2.5 text-center">{role.title}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupedModules.map(({ group, items }) => (
                        <React.Fragment key={group}>
                          <tr className="bg-slate-50/80">
                            <td colSpan={ROLES.length + 1} className="px-3 py-1.5 text-[11px] font-medium text-slate-500">
                              {group}
                            </td>
                          </tr>
                          {items.map((mod) => (
                            <tr key={mod.key} className="hover:bg-slate-50/80">
                              <td className="px-3 py-2.5 text-[13px] text-slate-700">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400"><mod.Icon size={14} /></span>
                                  {mod.label}
                                </div>
                              </td>
                              {ROLES.map(role => {
                                const access = (role.permissions[mod.key] || 'none') as AccessLevel;
                                return (
                                  <td key={role.id} className="px-3 py-2.5 text-center">
                                    <Badge size="sm" color={accessColor[access]}>{accessLabel[access]}</Badge>
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
              </ContentCard>
            )}
          </div>
        </Tabs>

        <Alert
          variant="info"
          title="Permissões padrão do sistema"
          action={<Button variant="outline" size="sm">Gerenciar por usuário</Button>}
        >
          As permissões exibidas refletem exatamente as rotas e módulos ativos no menu. Para ajustes finos por usuário, utilize as configurações de acesso da equipe.
        </Alert>
      </div>
    </PageWrapper>
  );
};
