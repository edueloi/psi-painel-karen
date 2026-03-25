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

import { PageHeader } from '../components/UI/PageHeader';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { Modal } from '../components/UI/Modal';
import { Button } from '../components/UI/Button';
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
    description: 'Questionários (BDI, BAI, DASS) e inventários estruturados.',
    icon: <ClipboardList />,
    path: '/formularios',
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
    id: 'disc',
    title: 'Perfil DISC',
    category: 'assessment',
    description: 'Avaliação comportamental baseada em Dominância, Influência, Estabilidade e Conformidade.',
    icon: <Gauge />,
    path: '/disc',
    color: 'violet',
    tags: ['Comportamento', 'Personalidade', 'Corporativo']
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
  assessment: 'Testes & DISC',
  neuro: 'Neurociência',
  management: 'Gestão de Evolução'
};

const colorVariants: Record<string, string> = {
    indigo: 'from-indigo-600 to-indigo-800 bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-600/20',
    rose: 'from-rose-600 to-rose-800 bg-rose-50 text-rose-600 border-rose-100 shadow-rose-600/20',
    amber: 'from-amber-600 to-amber-800 bg-amber-50 text-amber-600 border-amber-100 shadow-amber-600/20',
    blue: 'from-blue-600 to-blue-800 bg-blue-50 text-blue-600 border-blue-100 shadow-blue-600/20',
    emerald: 'from-emerald-600 to-emerald-800 bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-600/20',
    slate: 'from-slate-600 to-slate-800 bg-slate-50 text-slate-600 border-slate-100 shadow-slate-600/20',
    violet: 'from-violet-600 to-violet-800 bg-violet-50 text-violet-600 border-violet-100 shadow-violet-600/20',
    cyan: 'from-cyan-600 to-cyan-800 bg-cyan-50 text-cyan-600 border-cyan-100 shadow-cyan-600/20',
    orange: 'from-orange-600 to-orange-800 bg-orange-50 text-orange-600 border-orange-100 shadow-orange-600/20',
    fuchsia: 'from-fuchsia-600 to-fuchsia-800 bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100 shadow-fuchsia-600/20'
};

export const ClinicalTools: React.FC = () => {
  const navigate = useNavigate();
  const { preferences, updatePreference } = useUserPreferences();
  const [filter, setFilter] = useState<keyof typeof categoryLabels>('all');
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
    <div className="mx-auto max-w-[1700px] px-6 pt-6 pb-24 animate-fadeIn font-sans space-y-12">
      <PageHeader
        icon={<Boxes className="text-indigo-600" />}
        title="Caixa de Ferramentas Clínica"
        subtitle="Protocolos e recursos avançados sincronizados com o histórico do seu paciente."
        showBackButton
        onBackClick={() => navigate('/')}
        actions={
          <div className="flex items-center gap-4 flex-wrap">
              <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                  <input 
                      type="text"
                      placeholder="Pesquisar módulo..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-[20px] text-sm font-bold w-full md:w-80 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all shadow-sm"
                  />
              </div>
              <button 
                onClick={() => setIsCustomizerOpen(true)}
                className="p-3.5 bg-white border border-slate-200 rounded-[20px] text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm hover:shadow-xl"
                title="Personalizar layout"
              >
                  <SlidersHorizontal size={22} />
              </button>
          </div>
        }
      />

      {/* FILTERS */}
      <div className="flex items-center gap-3 overflow-x-auto pb-6 scrollbar-hide">
        {(Object.keys(categoryLabels) as Array<keyof typeof categoryLabels>).map(cat => (
            <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-8 py-4 rounded-[24px] text-[11px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${filter === cat ? 'bg-slate-950 text-white border-slate-950 shadow-2xl scale-105' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
            >
                {categoryLabels[cat]}
            </button>
        ))}
      </div>

      {/* TOOLS GRID - 4 cards on laptop (lg), 3 huge cards on larger (2xl) */}
      {displayedTools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-3 gap-10">
            {displayedTools.map((tool) => (
                <div 
                    key={tool.id}
                    onClick={() => navigate(tool.path)}
                    className="group relative bg-white/70 backdrop-blur-xl rounded-[56px] p-10 border border-white shadow-xl hover:shadow-[0_80px_160px_rgba(0,0,0,0.1)] hover:-translate-y-4 transition-all duration-700 cursor-pointer overflow-hidden flex flex-col h-[380px] group/card"
                >
                    {/* Watermark */}
                    <div className="absolute -right-12 -bottom-12 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-1000 rotate-12 scale-[3]">
                        {tool.icon}
                    </div>

                    <div className="flex items-start justify-between mb-8 relative z-10">
                        <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center shadow-2xl ring-4 ring-white group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 bg-gradient-to-br ${colorVariants[tool.color].split(' ').slice(0, 2).join(' ')} text-white`}>
                            {React.cloneElement(tool.icon as React.ReactElement, { size: 40 })}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                             <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100 shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">Ativo PRO</span>
                             </div>
                             <div className="flex items-center gap-1 group-hover:scale-110 transition-transform">
                                <Lock size={12} className="text-slate-300" />
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Protegido</span>
                             </div>
                        </div>
                    </div>

                    <div className="space-y-4 flex-1 relative z-10">
                        <section className="space-y-1">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-none uppercase group-hover:text-indigo-600 transition-colors">{tool.title}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{categoryLabels[tool.category]}</p>
                        </section>
                        <p className="text-sm text-slate-500 font-bold leading-relaxed italic line-clamp-2">"{tool.description}"</p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
                        <div className="flex flex-wrap gap-2">
                            {tool.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="px-3 py-1.5 bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-xl border border-slate-100 group-hover:border-indigo-100 group-hover:bg-indigo-50/50 group-hover:text-indigo-500 transition-all">#{tag}</span>
                            ))}
                        </div>
                        <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center bg-slate-950 text-white shadow-2xl group-hover:bg-indigo-600 transition-all group-hover:scale-110 active:scale-95`}>
                            <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* Left Border Glow */}
                    <div className={`absolute top-10 bottom-10 left-0 w-1.5 rounded-r-full transition-all bg-gradient-to-b ${colorVariants[tool.color].split(' ').slice(0, 2).join(' ')} opacity-20 group-hover:opacity-100 group-hover:w-2`}></div>
                </div>
            ))}
        </div>
      ) : (
        <div className="bg-white rounded-[64px] p-24 flex flex-col items-center text-center space-y-8 border border-slate-50 shadow-inner">
             <div className="w-32 h-32 bg-slate-50 rounded-[48px] flex items-center justify-center text-slate-100">
                 <Search size={64} />
             </div>
             <div className="space-y-4">
                <h3 className="text-4xl font-black text-slate-950 uppercase tracking-tighter leading-none">Silêncio Clínico</h3>
                <p className="text-slate-400 text-lg font-medium max-w-lg">Nenhuma ferramenta foi encontrada com o termo "{search}". Tente buscar por abordagem ou recurso.</p>
             </div>
             <Button 
                variant="primary"
                onClick={() => {setFilter('all'); setSearch('');}}
                className="rounded-[24px] px-12 py-6 text-xs uppercase tracking-widest font-black"
            >
                Restaurar Ecossistema
            </Button>
        </div>
      )}

      {/* FOOTER INTELLIGENCE - ULTRA PREMIUM */}
      <div className="bg-slate-950 rounded-[80px] p-16 md:p-24 text-white shadow-[0_80px_160px_rgba(0,0,0,0.3)] relative overflow-hidden mt-16 border border-white/5">
         <div className="absolute -left-20 -bottom-20 opacity-5 scale-[2] rotate-12">
            <Sparkles size={400} />
         </div>
         <div className="flex flex-col lg:flex-row items-center gap-20 relative z-10">
             <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[48px] shadow-2xl flex items-center justify-center shrink-0 relative group">
                 <div className="absolute inset-0 bg-white/20 blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                 <Zap size={56} className="text-white relative z-10 animate-float" />
             </div>
             <div className="space-y-8 text-center lg:text-left flex-1">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-3 px-6 py-2 bg-indigo-500/20 rounded-full border border-indigo-500/30">
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-400">Aurora AI High Performance</span>
                    </div>
                    <h2 className="text-6xl font-black tracking-tighter leading-none uppercase">A inteligência que<br /><span className="text-indigo-500">potencializa</span> sua clínica.</h2>
                </div>
                <p className="text-indigo-100/60 font-medium italic text-xl max-w-3xl leading-relaxed">
                    "Todas as ferramentas da sua caixa estão vivas. Elas retroalimentam o motor de IA do PsiFlux para sugerir condutas baseadas em anos de prática clínica e ciência do comportamento."
                </p>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6">
                    <div className="flex items-center gap-3 px-5 py-2.5 bg-white/5 rounded-2xl text-xs font-black uppercase tracking-widest border border-white/10 group hover:bg-white/10 transition-colors">
                        <RefreshCw size={18} className="text-emerald-400 group-hover:rotate-180 transition-transform duration-700" /> Sincronização em Tempo Real
                    </div>
                    <div className={`flex items-center gap-3 px-5 py-2.5 bg-white/5 rounded-2xl text-xs font-black uppercase tracking-widest border border-white/10 group hover:bg-white/10 transition-colors`}>
                        <ExternalLink size={18} className="text-amber-400" /> Exportação Multiformato
                    </div>
                </div>
             </div>
             <div className="lg:ml-auto">
                 <button className="px-12 py-8 bg-white text-indigo-950 rounded-[40px] font-black uppercase tracking-widest text-[11px] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 group">
                    Tutorial Assistido <Info size={20} className="text-indigo-600 group-hover:rotate-12 transition-transform" />
                 </button>
             </div>
         </div>
      </div>

      {/* CUSTOMIZER MODAL */}
      <Modal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        title="Escalabilidade do Workspace"
        subtitle="Organize as ferramentas de acordo com a sua demanda clínica atual."
        maxWidth="lg"
        footer={
            <div className="flex justify-between w-full items-center p-2">
                <Button variant="ghost" size="sm" onClick={resetPreferences} className="text-slate-400 hover:text-rose-500 font-black uppercase tracking-widest text-[10px]">
                    Resetar Ordem Padrão
                </Button>
                <Button variant="primary" size="sm" onClick={() => setIsCustomizerOpen(false)} className="rounded-[20px] px-10 py-5">
                    Confirmar Layout
                </Button>
            </div>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 scrollbar-hide py-2">
            {toolsForCustomizer.map((tool) => {
                const isHidden = hiddenIds.includes(tool.id);
                return (
                    <div 
                        key={tool.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, tool.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, tool.id)}
                        className={`flex items-center gap-6 p-6 rounded-[32px] border transition-all cursor-move group ${
                            isHidden ? 'bg-slate-50 border-slate-100 opacity-40 shadow-inner' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-2xl'
                        }`}
                    >
                        <div className="text-slate-200 group-hover:text-indigo-400 transition-colors">
                            <GripVertical size={28} />
                        </div>
                        
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl bg-gradient-to-br ${colorVariants[tool.color].split(' ').slice(0, 2).join(' ')} group-hover:rotate-6 transition-transform`}>
                            {React.cloneElement(tool.icon as React.ReactElement, { size: 28 })}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className="text-base font-black text-slate-800 truncate uppercase tracking-tight">{tool.title}</h4>
                            <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest">{categoryLabels[tool.category]}</p>
                        </div>

                        <button 
                            onClick={(e) => { e.stopPropagation(); toggleVisibility(tool.id); }}
                            className={`w-12 h-12 rounded-[18px] transition-all flex items-center justify-center ${
                                isHidden ? 'text-slate-400 bg-slate-100 hover:bg-slate-200' : 'text-indigo-500 bg-indigo-50 hover:bg-indigo-100'
                            }`}
                            title={isHidden ? 'Ativar Módulo' : 'Ocultar Módulo'}
                        >
                            {isHidden ? <EyeOff size={22} /> : <Eye size={22} />}
                        </button>
                    </div>
                );
            })}
        </div>
      </Modal>
    </div>
  );
};
