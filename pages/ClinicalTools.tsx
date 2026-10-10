import React, { useState } from 'react';
import { 
  Boxes, BrainCircuit, LayoutGrid, Feather, Search, 
  Sparkles, Target, Activity, ArrowRight, Brain, 
  Microscope, Compass, PenTool, ClipboardList, 
  MessageSquare, SlidersHorizontal, Filter, Grid, 
  Menu, Info, Zap, Workflow, Sun, Shield, Settings2,
  HeartHandshake, Flower2, Star, ShieldCheck, UserCheck,
  ZapOff, Palette, Baby, Users, GraduationCap, Gauge,
  Lock, ExternalLink, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { PageWrapper, SectionTitle, ContentCard } from '../components/UI/PageWrapper';
import { Tabs } from '../components/UI/Tabs';
import { Badge } from '../components/UI/Badge';
import { EmptyState } from '../components/UI/EmptyState';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { Modal } from '../components/UI/Modal';
import { Button, IconButton } from '../components/UI/Button';
import { FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch } from '../components/UI/FilterLine';
import { GripVertical, Eye, EyeOff } from 'lucide-react';

interface Tool {
  id: string;
  title: string;
  category: 'clinical' | 'assessment' | 'neuro' | 'management';
  description: string;
  icon: React.ReactNode;
  path: string;
  color: 'indigo' | 'rose' | 'amber' | 'blue' | 'emerald' | 'slate' | 'violet' | 'cyan' | 'orange' | 'fuchsia';
  tags: string[];
}

const tools: Tool[] = [
  {
    id: 'tcc',
    title: 'Terapia Cognitivo-Comportamental',
    category: 'clinical',
    description: 'Protocolos de RPD, Seta Descendente e Experimentos Comportamentais validados.',
    icon: <BrainCircuit />,
    path: '/caixa-ferramentas/tcc',
    color: 'indigo',
    tags: ['RPD', 'CBT', 'Evidência']
  },
  {
    id: 'esquemas',
    title: 'Terapia do Esquema',
    category: 'clinical',
    description: 'Trabalho com Modos, Cartões de Enfrentamento e Diálogo de Vozes.',
    icon: <LayoutGrid />,
    path: '/caixa-ferramentas/esquemas',
    color: 'rose',
    tags: ['Modos', 'Trauma', 'Padrões']
  },
  {
    id: 'psicanalise',
    title: 'Psicanálise Contemporânea',
    category: 'clinical',
    description: 'Análise de Sonhos, Rastreio de Significantes e Gestão de Transferência.',
    icon: <Feather />,
    path: '/caixa-ferramentas/psicanalise',
    color: 'amber',
    tags: ['Inconsciente', 'Sonhos', 'Setting']
  },
  {
    id: 'neuro',
    title: 'Neuropsicologia & Avaliação',
    category: 'neuro',
    description: 'Gestão de testes, escalas e mapeamento de funções cognitivas.',
    icon: <Brain />,
    path: '/neurodesenvolvimento',
    color: 'cyan',
    tags: ['Avaliação', 'Testes', 'Métricas']
  },
  {
    id: 'integrativa',
    title: 'Integrativa / Eclética',
    category: 'clinical',
    description: 'Combinação técnica de múltiplas abordagens adaptada ao sujeito.',
    icon: <Sparkles />,
    path: '/caixa-ferramentas/integrativa',
    color: 'indigo',
    tags: ['Flexibilidade', 'Sinergia', 'Personalizado']
  },
  {
    id: 'humanista',
    title: 'Psicologia Humanista',
    category: 'clinical',
    description: 'Abordagem centrada na pessoa, fenomenologia e Aceitação Incondicional.',
    icon: <Sun />,
    path: '/caixa-ferramentas/humanista',
    color: 'emerald',
    tags: ['Empatia', 'Aqui-Agora', 'Logoterapia']
  },
  {
    id: 'escalas',
    title: 'Instrumentos & Escalas',
    category: 'assessment',
    description: 'DISC, DASS-21 e outros instrumentos psicológicos padronizados.',
    icon: <ClipboardList />,
    path: '/instrumentos',
    color: 'slate',
    tags: ['Avaliação', 'Testes', 'Mensuração']
  },
  {
    id: 'case-studies',
    title: 'Estudos de Caso',
    category: 'management',
    description: 'Organização de supervisão, hipóteses diagnósticas e evolução estratégica.',
    icon: <Search />,
    path: '/estudos-de-caso',
    color: 'blue',
    tags: ['Supervisão', 'Estratégia', 'Análise']
  },
  {
    id: 'sistemica',
    title: 'Sistêmica / Familiar',
    category: 'clinical',
    description: 'Genograma Digital, Perguntas Circulares e Análise de Sistemas.',
    icon: <Workflow />,
    path: '/caixa-ferramentas/sistemica',
    color: 'blue',
    tags: ['Família', 'Vínculos', 'Padrões']
  },
  {
    id: 'act',
    title: 'ACT - Aceitação',
    category: 'clinical',
    description: 'Bússola de Valores, Desfusão Cognitiva e Ação Comprometida.',
    icon: <Compass />,
    path: '/caixa-ferramentas/act',
    color: 'violet',
    tags: ['Flexibilidade', 'Valores', 'Aceitação']
  },
  {
    id: 'dbt',
    title: 'DBT - Comportamental Dialética',
    category: 'clinical',
    description: 'Treino de Habilidades, Tolerância ao Mal-estar e Regulação Emocional.',
    icon: <Activity />,
    path: '/caixa-ferramentas/dbt',
    color: 'rose',
    tags: ['Borderline', 'Emoções', 'Eficácia']
  },
  {
    id: 'emdr',
    title: 'EMDR - Trauma & Memória',
    category: 'clinical',
    description: 'Reprocessamento com Estimulação Bilateral e Rastreio de SUD.',
    icon: <Zap />,
    path: '/caixa-ferramentas/emdr',
    color: 'amber',
    tags: ['Trauma', 'Reprocessamento', 'TEPT']
  },
  {
    id: 'junguiana',
    title: 'Junguiana / Analítica',
    category: 'clinical',
    description: 'Análise de Sonhos, Arquétipos e Integração de Sombra.',
    icon: <ShieldCheck />,
    path: '/caixa-ferramentas/junguiana',
    color: 'indigo',
    tags: ['Individuação', 'Inconsciente', 'Arquétipos']
  },
  {
    id: 'comportamental',
    title: 'Análise do Comportamento',
    category: 'clinical',
    description: 'Análise Funcional (ABC), Economia de Fichas e Reforço Positivo.',
    icon: <Settings2 />,
    path: '/caixa-ferramentas/comportamental',
    color: 'slate',
    tags: ['Reforço', 'Ambiente', 'Aprendizagem']
  },
  {
    id: 'fap',
    title: 'FAP - Analítica Funcional',
    category: 'clinical',
    description: 'Foco na relação terapêutica e comportamentos de melhora clínica (CRB).',
    icon: <HeartHandshake />,
    path: '/caixa-ferramentas/fap',
    color: 'emerald',
    tags: ['CRB', 'Relação Terapêutica', 'Contexto']
  },
  {
    id: 'mindfulness',
    title: 'Mindfulness',
    category: 'clinical',
    description: 'Práticas de Atenção Plena, Body Scan e Redução de Estresse.',
    icon: <Flower2 />,
    path: '/caixa-ferramentas/mindfulness',
    color: 'cyan',
    tags: ['Atenção Plena', 'Presente', 'Aceitação']
  },
  {
    id: 'positiva',
    title: 'Psicologia Positiva',
    category: 'clinical',
    description: 'Identificação de Forças de Caráter, Virtudes e Bem-estar (PERMA).',
    icon: <Sparkles />,
    path: '/caixa-ferramentas/positiva',
    color: 'orange',
    tags: ['Flow', 'Forças', 'Bem-estar']
  },
  {
    id: 'infantil',
    title: 'Ludoterapia / Infantil',
    category: 'clinical',
    description: 'Recursos lúdicos, hora do jogo e manejo comportamental infantil.',
    icon: <Baby />,
    path: '/caixa-ferramentas/infantil',
    color: 'rose',
    tags: ['Lúdico', 'Desenvolvimento', 'Crianças']
  },
  {
    id: 'casal',
    title: 'Terapia de Casal',
    category: 'clinical',
    description: 'Mediação de conflitos, comunicação não-violenta e dinâmicas relacionais.',
    icon: <Users />,
    path: '/caixa-ferramentas/casal',
    color: 'emerald',
    tags: ['Vínculo', 'Comunicação', 'Relacionamento']
  },
  {
    id: 'orientacao',
    title: 'Orientação de Pais',
    category: 'management',
    description: 'Treino de habilidades parentais, psicoeducação e manejo de contingências.',
    icon: <UserCheck />,
    path: '/caixa-ferramentas/pais',
    color: 'amber',
    tags: ['Família', 'Educativo', 'Prevenção']
  }
];

const categoryLabels = {
  all: 'Ecossistema Completo',
  clinical: 'Módulos Clínicos',
  assessment: 'Instrumentos & Avaliação',
  neuro: 'Neurociência',
  management: 'Gestão de Evolução'
};

type ToolCategoryTab = keyof typeof categoryLabels;

const categoryTabs = [
  { id: 'all', label: categoryLabels.all, icon: Boxes },
  { id: 'clinical', label: categoryLabels.clinical, icon: BrainCircuit },
  { id: 'assessment', label: categoryLabels.assessment, icon: ClipboardList },
  { id: 'neuro', label: categoryLabels.neuro, icon: Brain },
  { id: 'management', label: categoryLabels.management, icon: Workflow },
] as const;

export const ClinicalTools: React.FC = () => {
  const navigate = useNavigate();
  const { preferences, updatePreference } = useUserPreferences();
  const [filter, setFilter] = useState<ToolCategoryTab>('all');
  const [search, setSearch] = useState('');
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  const { orderedIds, hiddenIds } = preferences.clinicalTools;

  const allToolIds = tools.map(t => t.id);
  const currentOrder = orderedIds.length > 0 
    ? [...orderedIds, ...allToolIds.filter(id => !orderedIds.includes(id))] 
    : allToolIds;

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('toolId', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('toolId');
    if (draggedId === targetId) return;

    const newOrder = [...currentOrder];
    const draggedIdx = newOrder.indexOf(draggedId);
    const targetIdx = newOrder.indexOf(targetId);

    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedId);

    updatePreference('clinicalTools', { orderedIds: newOrder });
  };

  const toggleVisibility = (id: string) => {
    const newHidden = hiddenIds.includes(id)
      ? hiddenIds.filter(h => h !== id)
      : [...hiddenIds, id];
    updatePreference('clinicalTools', { hiddenIds: newHidden });
  };

  const resetPreferences = () => {
    updatePreference('clinicalTools', { orderedIds: allToolIds, hiddenIds: [] });
  };

  const displayedTools = currentOrder
    .map(id => tools.find(t => t.id === id)!)
    .filter(t => t && !hiddenIds.includes(t.id))
    .filter(t => {
      const matchesFilter = filter === 'all' || t.category === filter;
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                            t.description.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });

  const toolsForCustomizer = currentOrder.map(id => tools.find(t => t.id === id)!).filter(Boolean);

  return (
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={Boxes}
          title="Caixa de Ferramentas Clínica"
          description="Protocolos e recursos avançados sincronizados com o histórico do seu paciente."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomizerOpen(true)}
              iconLeft={<SlidersHorizontal size={14} />}
            >
              Personalizar layout
            </Button>
          }
        />

        <Tabs<ToolCategoryTab>
          items={categoryTabs}
          value={filter}
          onChange={setFilter}
          label="Categorias de ferramentas"
        >
          <div className="space-y-3">
            <FilterLine>
              <FilterLineSection grow>
                <FilterLineItem grow minWidth={220}>
                  <FilterLineSearch
                    value={search}
                    onChange={setSearch}
                    placeholder="Pesquisar módulo..."
                  />
                </FilterLineItem>
              </FilterLineSection>
            </FilterLine>

            {displayedTools.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {displayedTools.map((tool) => (
                  <ContentCard
                    key={tool.id}
                    padding="none"
                    onClick={() => navigate(tool.path)}
                    className="group hover:border-primary-200 transition-all overflow-hidden flex flex-col h-full cursor-pointer"
                  >
                    <div className="p-3 flex-1 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-7 h-7 rounded-md border border-primary-100 bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                          {React.cloneElement(tool.icon as React.ReactElement, { size: 14 })}
                        </div>
                        <Badge color="success" size="sm" dot>PRO</Badge>
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-medium text-slate-900 group-hover:text-primary-700 transition-colors">{tool.title}</h3>
                        <p className="text-[11px] text-slate-500">{categoryLabels[tool.category]}</p>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-3">{tool.description}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {tool.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} color="default" size="sm">#{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600 group-hover:text-primary-700 transition-colors">Executar Módulo</span>
                      <ArrowRight size={14} className="text-slate-400 group-hover:text-primary-700 transition-colors" />
                    </div>
                  </ContentCard>
                ))}
              </div>
            ) : (
              <ContentCard>
                <EmptyState
                  icon={Search}
                  title="Silêncio Clínico"
                  description={`Nenhuma ferramenta foi encontrada com o termo "${search}". Tente buscar por abordagem ou recurso.`}
                  action={
                    <Button variant="primary" size="sm" onClick={() => { setFilter('all'); setSearch(''); }}>
                      Restaurar Ecossistema
                    </Button>
                  }
                />
              </ContentCard>
            )}
          </div>
        </Tabs>

        <ContentCard>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="w-7 h-7 rounded-md border border-primary-100 bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
              <Zap size={14} />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-medium text-slate-900">A inteligência que potencializa sua clínica.</h2>
                <Badge color="primary" size="sm">Bia AI High Performance</Badge>
              </div>
              <p className="text-xs text-slate-600">
                Todas as ferramentas da sua caixa estão vivas. Elas retroalimentam o motor de IA do Plaelo para organizar dados clínicos, sistematizar informações e apoiar a documentação — o julgamento clínico é sempre do profissional.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                <span className="inline-flex items-center gap-1.5"><RefreshCw size={12} className="text-emerald-600" /> Sincronização em Tempo Real</span>
                <span className="inline-flex items-center gap-1.5"><ExternalLink size={12} className="text-amber-600" /> Exportação Multiformato</span>
              </div>
            </div>
            <Button variant="outline" size="sm" iconRight={<Info size={14} />} className="shrink-0">
              Tutorial Assistido
            </Button>
          </div>
        </ContentCard>
      </div>

      {/* CUSTOMIZER MODAL */}
      <Modal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        title="Escalabilidade do Workspace"
        size="lg"
        footer={
          <div className="flex justify-between w-full items-center gap-2">
            <Button variant="ghost" size="sm" onClick={resetPreferences}>
              Resetar Ordem Padrão
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsCustomizerOpen(false)}>
              Confirmar Layout
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          {toolsForCustomizer.map((tool) => {
            const isHidden = hiddenIds.includes(tool.id);
            return (
              <div
                key={tool.id}
                draggable
                onDragStart={(e) => handleDragStart(e, tool.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, tool.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-move group ${
                  isHidden ? 'bg-slate-50 border-slate-100 opacity-50' : 'bg-white border-slate-200 hover:border-primary-200'
                }`}
              >
                <div className="text-slate-300 group-hover:text-primary-500 transition-colors">
                  <GripVertical size={16} />
                </div>
                <div className="w-7 h-7 rounded-md border border-primary-100 bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                  {React.cloneElement(tool.icon as React.ReactElement, { size: 14 })}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-slate-800 truncate">{tool.title}</h4>
                  <p className="text-[11px] text-slate-500">{categoryLabels[tool.category]}</p>
                </div>
                <IconButton
                  variant={isHidden ? 'ghost' : 'outline'}
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); toggleVisibility(tool.id); }}
                  title={isHidden ? 'Ativar Módulo' : 'Ocultar Módulo'}
                  aria-label={isHidden ? 'Ativar Módulo' : 'Ocultar Módulo'}
                >
                  {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </IconButton>
              </div>
            );
          })}
        </div>
      </Modal>
    </PageWrapper>
  );
};