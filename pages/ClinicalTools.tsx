import React, { useState } from 'react';
import { 
  Boxes, BrainCircuit, LayoutGrid, Feather, Search, 
  Sparkles, Target, Activity, ArrowRight, Brain, 
  Microscope, Compass, PenTool, ClipboardList, 
  MessageSquare, SlidersHorizontal, Filter, Grid, 
  Menu, Info, Zap, Workflow, Sun, Shield, Settings2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '../components/UI/PageHeader';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { Modal } from '../components/UI/Modal';
import { Button } from '../components/UI/Button';
import { GripVertical, Eye, EyeOff, HeartHandshake, Star } from 'lucide-react';

interface Tool {
  id: string;
  title: string;
  category: 'clinical' | 'assessment' | 'neuro' | 'management';
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  tags: string[];
}

const tools: Tool[] = [
  {
    id: 'tcc',
    title: 'Terapia Cognitivo-Comportamental',
    category: 'clinical',
    description: 'RPD Digital, Cartões de Enfrentamento e Questionamento Socrático integrados.',
    icon: <BrainCircuit />,
    path: '/caixa-ferramentas/tcc',
    color: 'indigo',
    tags: ['RPD', 'CBT', 'Evidência']
  },
  {
    id: 'esquemas',
    title: 'Terapia do Esquema',
    category: 'clinical',
    description: 'Trabalho com Modos, Mapa de Esquemas e intervenções focadas em trauma.',
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
    color: 'blue',
    tags: ['Avaliação', 'Testes', 'Métricas']
  },
  {
    id: 'integrativa',
    title: 'Integrativa / Eclética',
    category: 'clinical',
    description: 'Combinação técnica de múltiplas abordagens adaptada à necessidade do paciente.',
    icon: <Sparkles />,
    path: '/caixa-ferramentas/integrativa',
    color: 'emerald',
    tags: ['Flexibilidade', 'Sinergia', 'Personalizado']
  },
  {
    id: 'humanista',
    title: 'Psicologia Humanista',
    category: 'clinical',
    description: 'Abordagem centrada na pessoa, fenomenologia e busca de sentido.',
    icon: <Compass />,
    path: '/caixa-ferramentas/humanista',
    color: 'emerald',
    tags: ['Empatia', 'Aqui-Agora', 'Logoterapia']
  },
  {
    id: 'instrumentos',
    title: 'Instrumentos & Escalas',
    category: 'assessment',
    description: 'Questionários (DISC, DASS, etc) e inventários estruturados.',
    icon: <ClipboardList />,
    path: '/formularios',
    color: 'slate',
    tags: ['Avaliação', 'Testes', 'Mensuração']
  },
  {
    id: 'estudos',
    title: 'Estudos de Caso',
    category: 'management',
    description: 'Organização de supervisão, hipóteses diagnósticas e evolução estratégica.',
    icon: <Target />,
    path: '/estudos-de-caso',
    color: 'violet',
    tags: ['Supervisão', 'Estratégia', 'Análise']
  },
  {
    id: 'sistemica',
    title: 'Sistêmica / Familiar',
    category: 'clinical',
    description: 'Genograma Digital, Perguntas Circulares e Análise de Dinâmicas Relacionais.',
    icon: <Workflow />,
    path: '/caixa-ferramentas/sistemica',
    color: 'blue',
    tags: ['Família', 'Vínculos', 'Padrões']
  },
  {
    id: 'act',
    title: 'ACT - Aceitação & Compromisso',
    category: 'clinical',
    description: 'Bússola de Valores, Desfusão e Ação Comprometida.',
    icon: <Target />,
    path: '/caixa-ferramentas/act',
    color: 'emerald',
    tags: ['Flexibilidade', 'Valores', 'Aceitação']
  },
  {
    id: 'dbt',
    title: 'DBT - Comportamental Dialética',
    category: 'clinical',
    description: 'Diário de Cartão, Treino de Habilidades e Regulação Emocional.',
    icon: <Activity />,
    path: '/caixa-ferramentas/dbt',
    color: 'rose',
    tags: ['Borderline', 'Emoções', 'Eficácia']
  },
  {
    id: 'emdr',
    title: 'EMDR - Trauma & Memória',
    category: 'clinical',
    description: 'Reprocessamento com Estimulação Bilateral e Rastreio SUD.',
    icon: <Zap />,
    path: '/caixa-ferramentas/emdr',
    color: 'amber',
    tags: ['Trauma', 'Reprocessamento', 'TEPT']
  },
  {
    id: 'junguiana',
    title: 'Junguiana / Analítica',
    category: 'clinical',
    description: 'Análise de Sonhos, Símbolos e Integração de Sombra.',
    icon: <Feather />,
    path: '/caixa-ferramentas/junguiana',
    color: 'indigo',
    tags: ['Individuação', 'Inconsciente', 'Arquétipos']
  },
  {
    id: 'comportamental',
    title: 'Psicologia Comportamental',
    category: 'clinical',
    description: 'Análise Funcional (ABC), Economia de Fichas e Modelagem.',
    icon: <Settings2 />,
    path: '/caixa-ferramentas/comportamental',
    color: 'slate',
    tags: ['Reforço', 'Ambiente', 'Aprendizagem']
  },
  {
    id: 'fap',
    title: 'FAP - Analítica Funcional',
    category: 'clinical',
    description: 'Trabalho focado na relação terapêutica e mapeamento de CRBs ao vivo.',
    icon: <HeartHandshake />,
    path: '/caixa-ferramentas/fap',
    color: 'emerald',
    tags: ['CRB', 'Relação Terapêutica', 'Contexto']
  },
  {
    id: 'mindfulness',
    title: 'Mindfulness',
    category: 'clinical',
    description: 'Mapeamento de práticas focadas no presente e atenção plena.',
    icon: <Sun />,
    path: '/caixa-ferramentas/mindfulness',
    color: 'emerald',
    tags: ['Atenção Plena', 'Presente', 'Aceitação']
  },
  {
    id: 'positiva',
    title: 'Psicologia Positiva',
    category: 'clinical',
    description: 'Identificação de forças, virtudes e intervenções focadas no bem-estar.',
    icon: <Star />,
    path: '/caixa-ferramentas/positiva',
    color: 'amber',
    tags: ['Flow', 'Forças', 'Bem-estar']
  }
];

const categoryLabels = {
  all: 'Todas as Ferramentas',
  clinical: 'Abordagens Clínicas',
  assessment: 'Avaliação & Testes',
  neuro: 'Neuropsicologia',
  management: 'Gestão de Casos'
};

const colorVariants: Record<string, string> = {
    indigo: 'from-indigo-500 to-indigo-600 bg-indigo-50 text-indigo-600 border-indigo-100',
    rose: 'from-rose-500 to-rose-600 bg-rose-50 text-rose-600 border-rose-100',
    amber: 'from-amber-500 to-amber-600 bg-amber-50 text-amber-600 border-amber-100',
    blue: 'from-blue-500 to-blue-600 bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'from-emerald-500 to-emerald-600 bg-emerald-50 text-emerald-600 border-emerald-100',
    slate: 'from-slate-500 to-slate-600 bg-slate-50 text-slate-600 border-slate-100',
    violet: 'from-violet-500 to-violet-600 bg-violet-50 text-violet-600 border-violet-100'
};

export const ClinicalTools: React.FC = () => {
  const navigate = useNavigate();
  const { preferences, updatePreference } = useUserPreferences();
  const [filter, setFilter] = useState<keyof typeof categoryLabels>('all');
  const [search, setSearch] = useState('');
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  const { orderedIds, hiddenIds } = preferences.clinicalTools;

  // Sync orderedIds if new tools are added or if empty
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
    <div className="space-y-8 pb-24 animate-fadeIn">
      <PageHeader
        icon={<Boxes />}
        title="Caixa de Ferramentas"
        showBackButton
        onBackClick={() => navigate('/')}
        actions={
          <div className="flex items-center gap-4">
              <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <input 
                      type="text"
                      placeholder="Buscar ferramenta..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium w-full md:w-64 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                  />
              </div>
              <button 
                onClick={() => setIsCustomizerOpen(true)}
                className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
                title="Personalizar layout"
              >
                  <SlidersHorizontal size={20} />
              </button>
          </div>
        }
      />

      {/* FILTERS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {(Object.keys(categoryLabels) as Array<keyof typeof categoryLabels>).map(cat => (
            <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-tight transition-all border whitespace-nowrap ${filter === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
            >
                {categoryLabels[cat]}
            </button>
        ))}
      </div>

      {/* TOOLS GRID */}
      {displayedTools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {displayedTools.map((tool) => (
                <div 
                    key={tool.id}
                    onClick={() => navigate(tool.path)}
                    className="group relative bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full"
                >
                    {/* Background Icon Watermark */}
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12 scale-150">
                        {tool.icon}
                    </div>

                    <div className="flex items-start justify-between mb-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ring-1 ring-white/50 group-hover:scale-110 transition-transform ${colorVariants[tool.color].split(' ').slice(2, 5).join(' ')}`}>
                            {React.cloneElement(tool.icon as React.ReactElement, { size: 28 })}
                        </div>
                        <div className="flex items-center gap-1">
                             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Integrado</span>
                        </div>
                    </div>

                    <div className="space-y-2 flex-1 relative z-10">
                        <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">{tool.title}</h3>
                        <p className="text-[13px] text-slate-500 font-medium leading-relaxed">{tool.description}</p>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between relative z-10">
                        <div className="flex flex-wrap gap-1.5">
                            {tool.tags.map(tag => (
                                <span key={tag} className="px-2.5 py-1 bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-lg">#{tag}</span>
                            ))}
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-gradient-to-r group-hover:text-white transition-all ${colorVariants[tool.color].split(' ').slice(0, 2).join(' ')} shadow-inner`}>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* Progress Indicator (Mock) */}
                    <div className="absolute top-0 left-0 h-1 bg-gradient-to-r transition-all duration-500 opacity-0 group-hover:opacity-100" style={{ width: '100%', backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` }}></div>
                </div>
            ))}
        </div>
      ) : (
        <div className="bg-white rounded-[40px] p-20 flex flex-col items-center text-center space-y-4 border border-dashed border-slate-300">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                 <Search size={40} />
             </div>
             <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Nenhuma ferramenta encontrada</h3>
                <p className="text-slate-400 font-medium">Tente ajustar seus filtros ou mude o termo de busca.</p>
             </div>
             <button 
                onClick={() => {setFilter('all'); setSearch('');}}
                className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-tight hover:bg-slate-200 transition-all"
            >
                Limpar Filtros
            </button>
        </div>
      )}

      {/* FOOTER INTELLIGENCE */}
      <div className="bg-indigo-600 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
         <div className="absolute -left-10 -bottom-10 opacity-10">
            <Sparkles size={200} />
         </div>
         <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
             <div className="w-24 h-24 bg-white/10 rounded-[32px] backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
                 <Zap size={40} className="text-amber-400" />
             </div>
             <div className="space-y-4 text-center md:text-left">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black tracking-tighter uppercase">Clínica Integrada 3.0</h2>
                    <p className="text-indigo-100/70 font-medium italic">"Sua caixa de ferramentas sincroniza automaticamente com o prontuário do paciente selecionado."</p>
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                        <Activity size={14} className="text-emerald-400" /> Sincronização Ativa
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                        <Microscope size={14} className="text-amber-400" /> Análise de Dados
                    </div>
                </div>
             </div>
             <div className="md:ml-auto">
                 <button className="px-8 py-4 bg-white text-indigo-900 rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-slate-50 transition-all active:scale-95">
                    Modo Supervisão <Info size={16} className="ml-2 inline" />
                 </button>
             </div>
         </div>
      </div>

      {/* CUSTOMIZER MODAL */}
      <Modal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        title="Personalizar Ferramentas"
        subtitle="Arraste para reordenar ou use o olho para ocultar ferramentas da sua visão principal."
        maxWidth="lg"
        footer={
            <div className="flex justify-between w-full items-center">
                <Button variant="ghost" size="sm" onClick={resetPreferences} className="text-slate-400 hover:text-rose-500">
                    Resetar Padrão
                </Button>
                <Button variant="primary" size="sm" onClick={() => setIsCustomizerOpen(false)}>
                    Concluir
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
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-move group ${
                            isHidden ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md'
                        }`}
                    >
                        <div className="text-slate-300 group-hover:text-indigo-400 transition-colors">
                            <GripVertical size={20} />
                        </div>
                        
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorVariants[tool.color].split(' ').slice(2, 5).join(' ')}`}>
                            {React.cloneElement(tool.icon as React.ReactElement, { size: 20 })}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-800 truncate uppercase tracking-tight">{tool.title}</h4>
                            <p className="text-[10px] text-slate-400 font-medium truncate">{categoryLabels[tool.category]}</p>
                        </div>

                        <button 
                            onClick={(e) => { e.stopPropagation(); toggleVisibility(tool.id); }}
                            className={`p-2 rounded-lg transition-all ${
                                isHidden ? 'text-slate-400 hover:bg-slate-200' : 'text-indigo-500 hover:bg-indigo-50'
                            }`}
                            title={isHidden ? 'Mostrar' : 'Ocultar'}
                        >
                            {isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                );
            })}
        </div>
      </Modal>
    </div>
  );
};
