import React, { useState } from 'react';
import { 
  BookCheck, Brain, Heart, Target, Sparkles, Layers, 
  ChevronRight, ArrowRight, Plus, BrainCircuit, LayoutGrid, 
  Feather, BookOpen, Settings2, Sun, HelpCircle, Activity, 
  Workflow, Info, Lightbulb, Microscope, Zap
} from 'lucide-react';
import { AppCard } from '../components/UI/AppCard';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/UI/PageHeader';

interface ApproachData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  whenToUse: string;
  howItWorks: string;
  icon: React.ReactNode;
  path: string;
  color: 'indigo' | 'rose' | 'amber' | 'blue' | 'emerald' | 'slate';
  features: string[];
  stats: { label: string; value: string }[];
}

const approaches: ApproachData[] = [
  {
    id: 'tcc',
    title: 'Terapia Cognitivo-Comportamental',
    subtitle: 'Reestruturação Cognitiva & Evidência',
    description: 'A TCC é uma abordagem estruturada e focada no presente que busca equilibrar pensamentos, emoções e comportamentos.',
    whenToUse: 'Ideal para Transtornos de Ansiedade, Depressão, TOC, Pânico e fobias específicas.',
    howItWorks: 'Utiliza o RPD, Questionamento Socrático e Desafios Cognitivos para tratar distorções do pensamento em tempo real.',
    icon: <BrainCircuit />,
    path: '/caixa-ferramentas/tcc',
    color: 'indigo',
    features: ['RPD Digital', 'Protocolos Estruturados', 'Foco no Agora'],
    stats: [
        { label: 'Eficácia', value: '88%' },
        { label: 'Sessões', value: '12-24' }
    ]
  },
  {
    id: 'esquemas',
    title: 'Terapia do Esquema',
    subtitle: 'Cura de Raízes Emocionais Profundas',
    description: 'Integra TCC, Psicanálise e Gestalt para tratar transtornos de personalidade e padrões emocionais repetitivos.',
    whenToUse: 'Transtorno Bipolar, Borderline, Padrões Auto-derrotistas e traumas complexos de infância.',
    howItWorks: 'Foca na identificação de Esquemas Iniciais Desadaptativos e no trabalho com Modos para curar necessidades emocionais não atendidas.',
    icon: <LayoutGrid />,
    path: '/caixa-ferramentas/esquemas',
    color: 'rose',
    features: ['Mapa de Esquemas', 'Monitor de Modos', 'Cadeira Vazia'],
    stats: [
        { label: 'Profundidade', value: 'Máxima' },
        { label: 'Foco', value: 'Trauma' }
    ]
  },
  {
    id: 'psicanalise',
    title: 'Psicanálise Contemporânea',
    subtitle: 'Exploração do Inconsciente & Simbolismos',
    description: 'Estudo dos processos mentais inconscientes, focando na transferência e na interpretação dos significantes do sujeito.',
    whenToUse: 'Desejo de autoconhecimento profundo, angústias existenciais e sintomas sem causa orgânica aparente.',
    howItWorks: 'Associação Livre, Interpretação de Sonhos e Análise da Transferência para trazer o inconsciente ao campo do saber.',
    icon: <Feather />,
    path: '/caixa-ferramentas/psicanalise',
    color: 'amber',
    features: ['Diário de Sonhos', 'Gestão de Transferência', 'Livre Associação'],
    stats: [
        { label: 'Abordagem', value: 'Dinâmica' },
        { label: 'Tempo', value: 'Contínuo' }
    ]
  },
  {
    id: 'neuro',
    title: 'Neuropsicologia & Avaliação',
    subtitle: 'Avaliação Cognitiva & Funcional',
    description: 'Área focada em avaliar e compreender a relação entre o cérebro e o comportamento, funções cognitivas e neurológicas.',
    whenToUse: 'Déficits de atenção, memória, funções executivas, avaliação neuropsicológica e reabilitação cognitiva.',
    howItWorks: 'Utiliza testes psicométricos, escalas e inventários para mapear o funcionamento neurológico e planejar intervenções.',
    icon: <Brain />,
    path: '/neurodesenvolvimento',
    color: 'blue',
    features: ['PEI Automatizado', 'Gráficos de Evolução', 'ABA Principles'],
    stats: [
        { label: 'Científico', value: 'Alto' },
        { label: 'Público', value: 'Kids/Adults' }
    ]
  },
  {
    id: 'humanista',
    title: 'Psicologia Humanista',
    subtitle: 'Fenomenologia & Experiência Imediata',
    description: 'Abordagem centrada na pessoa, focando no potencial de autorealização e na responsabilidade existencial do ser.',
    whenToUse: 'Crises de identidade, luto, transições de vida e busca por sentido existencial (Logoterapia).',
    howItWorks: 'Escuta empática, aceitação incondicional e foco na experiência imediata do "aqui-e-agora".',
    icon: <Sun />,
    path: '/caixa-ferramentas/humanista',
    color: 'emerald',
    features: ['Reg. Fenomenológico', 'Projeto de Ser', 'Logoterapia'],
    stats: [
        { label: 'Eixo', value: 'Empatia' },
        { label: 'Ser', value: 'Potencial' }
    ]
  },
  {
    id: 'sistemica',
    title: 'Sistêmica / Familiar',
    subtitle: 'Vínculos, Padrões & Sistemas',
    description: 'Foca no indivíduo dentro de seus sistemas (família, casal, trabalho), analisando padrões de comunicação e papéis relacionais.',
    whenToUse: 'Conflitos familiares, terapia de casal, dificuldades de relacionamento e padrões geracionais.',
    howItWorks: 'Utiliza o Genograma e Perguntas Circulares para mapear e reestruturar dinâmicas relacionais e papéis familiares.',
    icon: <Workflow />,
    path: '/caixa-ferramentas/sistemica',
    color: 'blue',
    features: ['Genograma Digital', 'Análise de Vínculos', 'Padrões de Comunicação'],
    stats: [
        { label: 'Foco', value: 'Relacional' },
        { label: 'Impacto', value: 'Circular' }
    ]
  },
  {
    id: 'act',
    title: 'ACT (Aceitação e Compromisso)',
    subtitle: 'Valores & Flexibilidade Psicologia',
    description: 'Abordagem baseada na aceitação de pensamentos e sentimentos, focando em ações comprometidas com valores pessoais.',
    whenToUse: 'Rigidez psicológica, ansiedade, dor crônica e busca por sentido e valores.',
    howItWorks: 'Promove a desfusão cognitiva, aceitação e contato com o momento presente para aumentar a flexibilidade psicológica.',
    icon: <Target />,
    path: '/caixa-ferramentas/act',
    color: 'emerald',
    features: ['Bússola de Valores', 'Desfusão Cognitiva', 'Ação Comprometida'],
    stats: [
        { label: 'Flexibilidade', value: 'Alta' },
        { label: 'Valores', value: 'Centro' }
    ]
  },
  {
    id: 'dbt',
    title: 'DBT (Comportamental Dialética)',
    subtitle: 'Regulação Emocional & Eficácia',
    description: 'Focada em equilibrar a aceitação e a mudança, especialmente para casos de desregulação emocional intensa.',
    whenToUse: 'Transtorno Borderline, impulsividade, risco de auto-extermínio e sofrimento emocional extremo.',
    howItWorks: 'Ensina mindfulness, tolerância ao mal-estar, regulação emocional e eficácia interpessoal através de habilidades práticas.',
    icon: <Activity />,
    path: '/caixa-ferramentas/dbt',
    color: 'rose',
    features: ['Diário de Emoções', 'Treino de Habilidades', 'Tolerância ao Estresse'],
    stats: [
        { label: 'Regulação', value: '85%' },
        { label: 'Foco', value: 'Intensidade' }
    ]
  },
  {
    id: 'emdr',
    title: 'EMDR',
    subtitle: 'Processamento & Dessensibilização de Traumas',
    description: 'Abordagem estruturada para o reprocessamento de memórias traumáticas através de estimulação bilateral.',
    whenToUse: 'TEPT (Trauma), fobias, lutos complicados e memórias perturbadoras recorrentes.',
    howItWorks: 'Utiliza movimentos oculares ou outros estímulos para ajudar o cérebro a reprocessar informações traumáticas.',
    icon: <Zap />,
    path: '/caixa-ferramentas/emdr',
    color: 'amber',
    features: ['Rastreio de Escala SUD', 'Estimulação Bilateral', 'Instalação de Recursos'],
    stats: [
        { label: 'Rapidez', value: 'Alta' },
        { label: 'Foco', value: 'Memória' }
    ]
  },
  {
    id: 'junguiana',
    title: 'Junguiana / Analítica',
    subtitle: 'Individuação & Arquetipia',
    description: 'Baseada na psicologia profunda de C.G. Jung, foca na integração da sombra e no processo de individuação.',
    whenToUse: 'Crises de meia-idade, busca por propósito, sonhos recorrentes e integração de polaridades da personalidade.',
    howItWorks: 'Trabalha com a análise de sonhos, símbolos, arquétipos e expressões artísticas para o equilíbrio psíquico.',
    icon: <Feather />,
    path: '/caixa-ferramentas/junguiana',
    color: 'indigo',
    features: ['Análise Arquetípica', 'Diário de Símbolos', 'Processo de Sombra'],
    stats: [
        { label: 'Profundidade', value: 'Psíquica' },
        { label: 'Símbolos', value: 'Chave' }
    ]
  },
  {
    id: 'psicodinamica',
    title: 'Psicodinâmica',
    subtitle: 'Conflitos Internos & Relações',
    description: 'Derivada da psicanálise, foca nos processos inconscientes que se manifestam no comportamento e sofrimento atual do paciente.',
    whenToUse: 'Dificuldades interpessoais recorrentes, conflitos internos e sofrimento emocional com raízes históricas.',
    howItWorks: 'Trabalha a interpretação, análise de defesas e a relação terapêutica como campo de mudança emocional.',
    icon: <Feather />,
    path: '/caixa-ferramentas/psicodinamica',
    color: 'amber',
    features: ['Análise de Defesas', 'Interpretação Ativa', 'Foco Relações'],
    stats: [
        { label: 'Abordagem', value: 'Focada' },
        { label: 'Eixo', value: 'Conflito' }
    ]
  },
  {
    id: 'comportamental',
    title: 'Psicologia Comportamental',
    subtitle: 'Análise do Comportamento & Ambiente',
    description: 'Focada no estudo do comportamento observável e na relação entre o indivíduo e seu ambiente.',
    whenToUse: 'Dificuldades de aprendizagem, fobias, hábitos, treinamento de pais e modificação de comportamento.',
    howItWorks: 'Utiliza análise funcional (ABC), reforçamento e modelagem para promover novos aprendizados e mudanças ambientais.',
    icon: <Settings2 />,
    path: '/caixa-ferramentas/comportamental',
    color: 'slate',
    features: ['Análise Funcional', 'Reforço Positivo', 'Modificação Amb.'],
    stats: [
        { label: 'Clareza', value: 'Total' },
        { label: 'Eixo', value: 'Ação' }
    ]
  },
  {
    id: 'positiva',
    title: 'Psicologia Positiva',
    subtitle: 'Forças, Virtudes & Bem-estar',
    description: 'Foca no desenvolvimento de virtudes, forças de caráter e no florescimento humano, além da remissão de sintomas.',
    whenToUse: 'Busca por qualidade de vida, resiliência, otimismo e fortalecimento de recursos emocionais.',
    howItWorks: 'Utiliza intervenções baseadas em gratidão, mindfulness e identificação de forças (VIA) para aumentar o bem-estar.',
    icon: <Sun />,
    path: '/caixa-ferramentas/positiva',
    color: 'emerald',
    features: ['Mapa de Forças', 'Diário de Gratidão', 'Flow Tracking'],
    stats: [
        { label: 'Bem-estar', value: 'Alto' },
        { label: 'Foco', value: 'Virtudes' }
    ]
  }
];

const colorVariants = {
    indigo: 'from-indigo-500 to-indigo-600 text-indigo-600 bg-indigo-50 border-indigo-100 shadow-indigo-100',
    rose: 'from-rose-500 to-rose-600 text-rose-600 bg-rose-50 border-rose-100 shadow-rose-100',
    amber: 'from-amber-500 to-amber-600 text-amber-600 bg-amber-50 border-amber-100 shadow-amber-100',
    blue: 'from-blue-500 to-blue-600 text-blue-600 bg-blue-50 border-blue-100 shadow-blue-100',
    emerald: 'from-emerald-500 to-emerald-600 text-emerald-600 bg-emerald-50 border-emerald-100 shadow-emerald-100',
    slate: 'from-slate-500 to-slate-600 text-slate-600 bg-slate-50 border-slate-100 shadow-slate-100'
};

export const Approaches: React.FC = () => {
  const navigate = useNavigate();
  const { info } = useToast();
  const [activeTab, setActiveTab] = useState<'cards' | 'manual'>('cards');

  return (
    <div className="mx-auto max-w-[1600px] px-6 pt-6 pb-24 animate-fadeIn font-sans space-y-12">
      <PageHeader
        icon={<Layers />}
        title="Hub de Abordagens"
        subtitle="Teoria aplicada à prática clínica. Explore e ative metodologias para seu consultório."
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        containerClassName="mb-0"
        actions={
          <div className="flex items-center gap-2 p-1.5 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <button 
                onClick={() => setActiveTab('cards')}
                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-2 ${activeTab === 'cards' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <LayoutGrid size={14} /> Painéis
            </button>
            <button 
                onClick={() => setActiveTab('manual')}
                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-2 ${activeTab === 'manual' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <BookOpen size={14} /> Manual Epistemológico
            </button>
          </div>
        }
      />

      {activeTab === 'cards' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8">
            {approaches.map((app) => (
                <div 
                    key={app.id}
                    className="group relative bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden flex flex-col gap-8 h-full"
                >
                     {/* Background Glow */}
                     <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-5 blur-3xl group-hover:opacity-20 transition-opacity bg-${app.color}-500`} />
                     
                     {/* Top Section */}
                     <div className="flex items-start justify-between relative z-10">
                        <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center ring-1 ring-${app.color}-100 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ${colorVariants[app.color].split(' ').slice(2, 4).join(' ')}`}>
                            {React.cloneElement(app.icon as React.ReactElement, { size: 40, className: colorVariants[app.color].split(' ')[2] })}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">Ativado</span>
                            <div className="flex gap-1.5">
                                {app.stats.map(s => (
                                    <div key={s.label} className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 flex flex-col items-center">
                                        <span className="text-[7px] font-black text-slate-400 uppercase leading-none">{s.label}</span>
                                        <span className="text-[10px] font-black text-slate-800 tracking-tighter">{s.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                     </div>

                     {/* Content Section */}
                     <div className="space-y-4 flex-1 relative z-10">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none uppercase">{app.title}</h2>
                            <p className="text-[11px] font-bold text-slate-400 mt-1 italic">{app.subtitle}</p>
                        </div>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">{app.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 pt-2">
                             <div className="space-y-1.5 p-4 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    <Target size={12}/> Quando Usar
                                </div>
                                <p className="text-[10px] font-bold text-slate-600 leading-tight">{app.whenToUse}</p>
                             </div>
                             <div className="space-y-1.5 p-4 bg-indigo-50/20 rounded-3xl border border-indigo-100/30 shadow-inner">
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                                    <Microscope size={12}/> Como Atua
                                </div>
                                <p className="text-[10px] font-bold text-indigo-900 leading-tight">{app.howItWorks}</p>
                             </div>
                        </div>
                     </div>

                     {/* Footer Section */}
                     <div className="pt-6 border-t border-slate-50 flex items-center justify-between relative z-10">
                         <Link 
                            to={app.path}
                            className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all group-hover:shadow-lg active:scale-95 ${colorVariants[app.color].split(' ').slice(2, 5).join(' ')} hover:${colorVariants[app.color].split(' ')[2]} hover:text-white group-hover:bg-gradient-to-r ${colorVariants[app.color].split(' ').slice(0, 2).join(' ')} group-hover:text-white`}
                         >
                            Acessar Painel <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                         </Link>

                         <div className="flex -space-x-2">
                            {app.features.slice(0, 2).map((f, i) => (
                                <div key={f} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-400 shadow-sm" title={f}>
                                    {f.charAt(0)}
                                </div>
                            ))}
                            <div className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-lg">+</div>
                         </div>
                     </div>
                </div>
            ))}
        </div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-12 animate-slideUpFade">
            {approaches.map((app, idx) => (
                <div key={app.id} className="relative group">
                    {/* Line connector */}
                    {idx !== approaches.length - 1 && (
                        <div className="absolute left-[39px] top-24 bottom-0 w-px bg-slate-200 border-dashed border" />
                    )}

                    <div className="flex gap-6">
                        <div className="shrink-0 relative">
                             <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center text-white shadow-xl z-10 relative group-hover:animate-pulse bg-gradient-to-br ${colorVariants[app.color].split(' ').slice(0, 2).join(' ')}`}>
                                {React.cloneElement(app.icon as React.ReactElement, { size: 36 })}
                             </div>
                        </div>

                        <div className="space-y-8 pb-16 flex-1">
                             <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">{app.title}</h3>
                                    <Link to={app.path} className="flex items-center gap-2 group/link text-indigo-600 font-black text-xs uppercase tracking-widest p-4 bg-indigo-50 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all">
                                        Explorar Clínica <ArrowRight size={18} />
                                    </Link>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${colorVariants[app.color].split(' ').slice(3, 5).join(' ')} text-${app.color}-600`}>{app.subtitle}</span>
                                    <span className="text-xs text-slate-400 font-bold tracking-tight">Manual do Profissional v2.5</span>
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <section className="space-y-6">
                                    <div className="space-y-3">
                                        <h4 className="flex items-center gap-3 text-xs font-black text-slate-800 uppercase tracking-widest">
                                            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><Info size={14}/></div>
                                            Conceito Epistemológico
                                        </h4>
                                        <p className="text-sm text-slate-500 leading-relaxed font-medium bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">{app.description}</p>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="flex items-center gap-3 text-xs font-black text-slate-800 uppercase tracking-widest">
                                            <div className="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center text-orange-400"><Lightbulb size={14}/></div>
                                            Critérios de Indicação
                                        </h4>
                                        <div className="bg-orange-50/30 p-6 rounded-[32px] border border-orange-100/50">
                                            <p className="text-sm text-orange-950 font-bold leading-relaxed">{app.whenToUse}</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <div className="space-y-3">
                                        <h4 className="flex items-center gap-3 text-xs font-black text-slate-800 uppercase tracking-widest">
                                            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-400"><Microscope size={14}/></div>
                                            Operacionalização no PsiFlux
                                        </h4>
                                        <div className="bg-indigo-600 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                                            <Sparkles className="absolute top-0 right-0 p-8 opacity-10" size={80} />
                                            <p className="text-sm font-black leading-relaxed italic mb-6">"{app.howItWorks}"</p>
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Toolkit Integrado:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {app.features.map(f => (
                                                        <span key={f} className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold border border-white/10 whitespace-nowrap">{f}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                             </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* FOOTER CTA */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden mt-12">
        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12">
           <Zap size={200} />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center space-y-8 max-w-2xl mx-auto">
             <div className="px-5 py-2 bg-indigo-500/20 rounded-full border border-indigo-500/30 backdrop-blur-md">
                 <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-400"/> Aurora AI Context Engine
                 </span>
             </div>
             <h2 className="text-4xl font-black tracking-tighter leading-none uppercase">Contextualização<br />Inteligente Habilitada</h2>
             <p className="text-indigo-100/70 font-medium leading-relaxed italic">
                Sua abordagem selecionada não é apenas um guia visual. A Aurora AI utiliza estas premissas epistemológicas para ajustar sugestões, resumos e análises de casos de forma personalizada para você.
             </p>
             <button 
                onClick={() => info('Inteligência Teórica', 'O motor Aurora está sincronizado com sua base clínica.')}
                className="px-10 py-5 bg-white text-indigo-950 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-slate-50 transition-all flex items-center gap-3 active:scale-95"
             >
                Ver Configurações da IA <ArrowRight size={18}/>
             </button>
        </div>
      </div>
    </div>
  );
};
