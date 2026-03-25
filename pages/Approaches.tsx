import React, { useState } from 'react';
import { 
  BookCheck, Brain, Heart, Target, Sparkles, Layers, 
  ChevronRight, ArrowRight, Plus, BrainCircuit, LayoutGrid, 
  Feather, BookOpen, Settings2, Sun, HelpCircle, Activity, 
  Workflow, Info, Lightbulb, Microscope, Zap, History,
  ClipboardList, RefreshCw, HeartHandshake, Flower2, Search,
  Compass, ShieldCheck, UserCheck, MessageSquare, Gauge
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/UI/PageHeader';

interface ApproachData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  origin: string;
  curiosity: string;
  whenToUse: string;
  howItWorks: string;
  icon: React.ReactNode;
  path: string;
  color: 'indigo' | 'rose' | 'amber' | 'blue' | 'emerald' | 'slate' | 'violet' | 'cyan' | 'orange' | 'fuchsia';
  features: string[];
}

const approaches: ApproachData[] = [
  {
    id: 'tcc',
    title: 'Cognitivo-Comportamental',
    subtitle: 'Reestruturação & Evidência',
    description: 'A TCC é focada na identificação e modificação de padrões de pensamento distorcidos que geram sofrimento emocional.',
    origin: 'Aaron Beck (Anos 60). Começou com estudos sobre depressão e evoluiu para protocolos universais.',
    curiosity: 'É a abordagem com o maior volume de publicações científicas no mundo atualmente.',
    whenToUse: 'Ansiedade, Depressão, TOC, Pânico e Transtornos Alimentares.',
    howItWorks: 'Monitoramento de pensamentos automáticos e testes de realidade comportamentais.',
    icon: <BrainCircuit />,
    path: '/caixa-ferramentas/tcc',
    color: 'indigo',
    features: ['RPD Digital', 'Seta Descendente', 'Experimentos'],
  },
  {
    id: 'case-studies',
    title: 'Estudos de Caso',
    subtitle: 'Supervisão & Evolução Estratégica',
    description: 'Organização estruturada de hipóteses diagnósticas e planejamento clínico a longo prazo.',
    origin: 'Pilar fundamental da formação em psicologia, consolidado pela tradição clínica europeia.',
    curiosity: 'Um bom estudo de caso pode revelar padrões que escapam a meses de sessões isoladas.',
    whenToUse: 'Casos complexos, supervisão clínica e acompanhamento de alta.',
    howItWorks: 'Utiliza formulação de caso e genogramas para traçar a jornada do paciente.',
    icon: <Search />,
    path: '/caixa-ferramentas/estudos-caso',
    color: 'blue',
    features: ['Formulação de Caso', 'Timeline', 'Metas Terapêuticas'],
  },
  {
    id: 'psicanalise',
    title: 'Psicanálise Contemporânea',
    subtitle: 'Inconsciente & Transferência',
    description: 'Investigação do psiquismo humano através da associação livre e análise da transferência.',
    origin: 'Sigmund Freud (Viena). Evoluiu com Lacan, Winnicott e Klein para a clínica atual.',
    curiosity: 'O termo "Complexo de Édipo" foi inspirado na tragédia grega de Sófocles.',
    whenToUse: 'Desejo de autoconhecimento, neuroses, impasses existenciais profundos.',
    howItWorks: 'Foco na escuta flutuante e na interpretação dos significantes inconscientes.',
    icon: <Feather />,
    path: '/caixa-ferramentas/psicanalise',
    color: 'amber',
    features: ['Análise de Sonhos', 'Rastreador de Afetos', 'Setting'],
  },
  {
    id: 'esquemas',
    title: 'Terapia do Esquema',
    subtitle: 'Modos & Padrões Emocionais',
    description: 'Focada em necessidades emocionais não atendidas na infância que geram "Esquemas" na vida adulta.',
    origin: 'Jeffrey Young. Criada para tratar pacientes com transtornos de personalidade que não respondiam bem à TCC.',
    curiosity: 'O trabalho com "Cadeira Vazia" permite dialogar diretamente com partes da nossa personalidade.',
    whenToUse: 'Borderline, Narcisismo, Padrões auto-depreciativos e traumas de infância.',
    howItWorks: 'Identificação de Esquemas Iniciais Desadaptativos (EIDs) e Diálogo de Vozes.',
    icon: <LayoutGrid />,
    path: '/caixa-ferramentas/esquemas',
    color: 'rose',
    features: ['Monitor de Modos', 'Cartão de Enfrentamento', 'Flashcards'],
  },
  {
    id: 'neuro',
    title: 'Neuropsicologia',
    subtitle: 'Avaliação & Funções Cognitivas',
    description: 'Mapeamento das funções cerebrais e sua relação com o comportamento e humor.',
    origin: 'Surgiu da medicina russa e francesa, consolidada por Alexander Luria.',
    curiosity: 'A neuroplasticidade prova que o cérebro pode se "reorganizar" mesmo após lesões.',
    whenToUse: 'TDAH, Autismo, Déficits de Memória, Avaliação pós-lesão e Idosos.',
    howItWorks: 'Testes psicométricos, rastreios cognitivos e treinos de funções executivas.',
    icon: <Brain />,
    path: '/neurodesenvolvimento',
    color: 'cyan',
    features: ['Rastreio Cognitivo', 'Gráficos ABA', 'Análise de Funções'],
  },
  {
    id: 'humanista',
    title: 'Psicologia Humanista',
    subtitle: 'Existencial & Fenomenológica',
    description: 'Abordagem centrada na pessoa, focando na liberdade, responsabilidade e potencial humano.',
    origin: 'Carl Rogers e Maslow. Conhecida como a "Terceira Força" da psicologia.',
    curiosity: 'Rogers acreditava que a qualidade da relação terapeuta-cliente é o fator mais curativo.',
    whenToUse: 'Busca de sentido, luto, transições de carreira e baixa autoestima.',
    howItWorks: 'Escuta empática e aceitação incondicional do "Fenômeno" do cliente.',
    icon: <Sun />,
    path: '/caixa-ferramentas/humanista',
    color: 'emerald',
    features: ['Fenomenologia', 'Logoterapia', 'Aceitação'],
  },
  {
    id: 'escalas',
    title: 'Instrumentos & Escalas',
    subtitle: 'Mensuração & Rastreio Clínico',
    description: 'Repositório de questionários validados para triagem e monitoramento de evolução.',
    origin: 'Psicometria clássica, inspirada na necessidade de dados quantitativos na clínica.',
    curiosity: 'Muitas escalas (como a de Beck) são padrões-ouro globais há mais de 40 anos.',
    whenToUse: 'Primeira sessão (Anamnese), fechamento de laudos e alta.',
    howItWorks: 'Cálculo automático de scores para depressão (BDI), ansiedade (BAI) e estresse.',
    icon: <ClipboardList />,
    path: '/caixa-ferramentas/escalas',
    color: 'slate',
    features: ['Escala BDI/BAI', 'DASS-21', 'Análise Automática'],
  },
  {
    id: 'integrativa',
    title: 'Integrativa / Eclética',
    subtitle: 'Sinergia de Múltiplas Técnicas',
    description: 'Combinação técnica adaptada à singularidade do paciente, usando o melhor de cada abordagem.',
    origin: 'Movimento de integração técnica dos anos 80, focando no que funciona para o sujeito.',
    curiosity: 'A maioria dos terapeutas experientes no mundo se identifica como integrativo hoje.',
    whenToUse: 'Casos que exigem flexibilidade ou onde abordagens puras falharam.',
    howItWorks: 'Uso estratégico de ferramentas de TCC, ACT e Humanista em um único plano.',
    icon: <RefreshCw />,
    path: '/caixa-ferramentas/integrativa',
    color: 'indigo',
    features: ['Custom Toolkit', 'Mix de Técnicas', 'Plano Híbrido'],
  },
  {
    id: 'sistemica',
    title: 'Sistêmica / Familiar',
    subtitle: 'Dinâmicas & Vínculos',
    description: 'Enxerga a família e as relações como um sistema onde todos os membros interagem.',
    origin: 'Inspirada na Teoria Geral dos Sistemas nos anos 50/60.',
    curiosity: 'Dizemos que "o paciente identificado" é apenas quem traz o sintoma que pertence a todo o sistema.',
    whenToUse: 'Terapia de Casal, conflitos familiares e problemas geracionais.',
    howItWorks: 'Mapeamento de alianças, coalizões e padrões de comunicação repetitivos.',
    icon: <Workflow />,
    path: '/caixa-ferramentas/sistemica',
    color: 'blue',
    features: ['Genograma', 'Escultura Familiar', 'Perguntas Circulares'],
  },
  {
    id: 'act',
    title: 'ACT - Aceitação',
    subtitle: 'Aceitação & Compromisso',
    description: 'Focada em não lutar contra pensamentos, mas aceitá-los e agir conforme seus valores.',
    origin: 'Steven Hayes. Baseada na ciência do comportamento funcional.',
    curiosity: 'O objetivo da ACT não é diminuir a dor, mas aumentar a flexibilidade para viver apesar dela.',
    whenToUse: 'Ansiedade crônica, dor física, rigidez psicológica e procrastinação.',
    howItWorks: 'Exercícios de Desfusão (separar você do pensamento) e Bússola de Valores.',
    icon: <Compass />,
    path: '/caixa-ferramentas/act',
    color: 'violet',
    features: ['Bússola de Valores', 'Desfusão', 'Mindfulness'],
  },
  {
    id: 'dbt',
    title: 'DBT - Dialética',
    subtitle: 'Regulação Emocional',
    description: 'Focada em equilibrar aceitação e mudança para pacientes com alta intensidade emocional.',
    origin: 'Marsha Linehan. Originalmente para pacientes com risco de auto-extermínio.',
    curiosity: 'DBT é a única abordagem que utiliza "coaching telefônico" em situações de crise.',
    whenToUse: 'Borderline, Bipolaridade e Desregulação Emocional Severa.',
    howItWorks: 'Treino de Habilidades em 4 pilares: Mindfulness, Tolerância ao Estresse e Eficácia.',
    icon: <Activity />,
    path: '/caixa-ferramentas/dbt',
    color: 'rose',
    features: ['Diário de Emoções', 'Treino Social', 'Habilidades de Crise'],
  },
  {
    id: 'emdr',
    title: 'EMDR - Trauma',
    subtitle: 'Reprocessamento de Memórias',
    description: 'Usa estimulação bilateral para "desbloquear" memórias traumáticas e curar o cérebro.',
    origin: 'Francine Shapiro. Descobriu a técnica ao caminhar num parque movendo os olhos.',
    curiosity: 'O EMDR pode curar fobias específicas em pouquíssimas sessões se o trauma for pontual.',
    whenToUse: 'TEPT, Abuso, Acidentes, Perdas repentinas e Medos paralisantes.',
    howItWorks: 'Dessensibilização através de movimentos oculares ou toques táteis alternados.',
    icon: <Zap />,
    path: '/caixa-ferramentas/emdr',
    color: 'amber',
    features: ['SUD Scale', 'Estimulação Bilateral', 'Recursos Internos'],
  },
  {
    id: 'junguiana',
    title: 'Junguiana / Analítica',
    subtitle: 'Arquetipia & Individuação',
    description: 'Exploração dos símbolos, mitos e do Inconsciente Coletivo para a integração da Sombra.',
    origin: 'Carl Gustav Jung. Rompeu com Freud para focar no propósito e simbolismo.',
    curiosity: 'A ideia de "Arquétipos" inspirou filmes como Star Wars e O Senhor dos Anéis.',
    whenToUse: 'Crises de meia-idade, busca de propósito, sonhos e questões espirituais.',
    howItWorks: 'Imaginação Ativa, Análise de Sonhos e estudo da Sombra e Persona.',
    icon: <ShieldCheck />,
    path: '/caixa-ferramentas/junguiana',
    color: 'indigo',
    features: ['Diário de Símbolos', 'Análise de Sombra', 'Arquétipos'],
  },
  {
    id: 'comportamental',
    title: 'Comportamental',
    subtitle: 'Análise do Comportamento',
    description: 'Estudo das leis que regem o comportamento humano e sua relação com as consequências do ambiente.',
    origin: 'B.F. Skinner e a Teoria do Reforço Positivo/Negativo.',
    curiosity: 'Skinner acreditava que o livre arbítrio é uma ilusão e que somos moldados pelas consequências.',
    whenToUse: 'Mudança de hábitos, Treino de Pais, Fobias e Dificuldades Escolares.',
    howItWorks: 'Análise Funcional (ABC): Antecedente, Comportamento e Consequência.',
    icon: <Settings2 />,
    path: '/caixa-ferramentas/comportamental',
    color: 'slate',
    features: ['Análise ABC', 'Economia de Fichas', 'Reforço'],
  },
  {
    id: 'fap',
    title: 'FAP - Funcional',
    subtitle: 'Analítica Funcional',
    description: 'Focada em usar a relação terapeuta-cliente como ambiente para mudar comportamentos ao vivo.',
    origin: 'Kohlenberg e Tsai. Uma abordagem de terceira onda focada no "aqui e agora" clínico.',
    curiosity: 'Na FAP, os seus sentimentos como terapeuta são usados como bússola para a mudança do paciente.',
    whenToUse: 'Problemas de intimidade, solidão e dificuldades interpessoais.',
    howItWorks: 'Reforço de Comportamentos de Melhora Clínica (CRBs) dentro da própria sessão.',
    icon: <HeartHandshake />,
    path: '/caixa-ferramentas/fap',
    color: 'emerald',
    features: ['Monitor CRB', 'Relação Viva', 'Autenticidade'],
  },
  {
    id: 'mindfulness',
    title: 'Mindfulness',
    subtitle: 'Atenção Plena & Presença',
    description: 'Práticas integrativas para reduzir o estresse e aumentar a consciência do momento presente.',
    origin: 'Jon Kabat-Zinn. Adaptou práticas milenares orientais para a medicina ocidental.',
    curiosity: '8 semanas de mindfulness podem mudar a densidade da matéria cinzenta do cérebro.',
    whenToUse: 'Prevenção de recaída de depressão, estresse, ansiedade e hiperatividade.',
    howItWorks: 'Meditações guiadas, escaneamento corporal e observação de pensamentos sem julgamento.',
    icon: <Flower2 />,
    path: '/caixa-ferramentas/mindfulness',
    color: 'cyan',
    features: ['Meditação Audio', 'Foco Respiratório', 'Body Scan'],
  },
  {
    id: 'positiva',
    title: 'Psicologia Positiva',
    subtitle: 'Forças, Virtudes & Bem-estar',
    description: 'Cientificamente foca no florescimento humano e no que faz a vida valer a pena.',
    origin: 'Martin Seligman. Mudou o foco da psicologia "do que está errado" para "o que está certo".',
    curiosity: 'A felicidade é composta por 5 pilares (PERMA): Emoção, Engajamento, Relações, Sentido e Realização.',
    whenToUse: 'Fortalecimento de recursos, otimismo aprendido e resiliência pós-traumática.',
    howItWorks: 'Identificação de Forças de Caráter (VIA) e Diário de Gratidão.',
    icon: <Sparkles />,
    path: '/caixa-ferramentas/positiva',
    color: 'orange',
    features: ['Mapa de Forças', 'Diário de Gratidão', 'PERMA Check'],
  }
];

const colorVariants = {
    indigo: 'from-indigo-600 to-indigo-700 text-indigo-600 bg-indigo-50 border-indigo-100 shadow-indigo-200/40',
    rose: 'from-rose-600 to-rose-700 text-rose-600 bg-rose-50 border-rose-100 shadow-rose-200/40',
    amber: 'from-amber-600 to-amber-700 text-amber-600 bg-amber-50 border-amber-100 shadow-amber-200/40',
    blue: 'from-blue-600 to-blue-700 text-blue-600 bg-blue-50 border-blue-100 shadow-blue-200/40',
    emerald: 'from-emerald-600 to-emerald-700 text-emerald-600 bg-emerald-50 border-emerald-100 shadow-emerald-200/40',
    slate: 'from-slate-600 to-slate-700 text-slate-600 bg-slate-50 border-slate-100 shadow-slate-200/40',
    violet: 'from-violet-600 to-violet-700 text-violet-600 bg-violet-50 border-violet-100 shadow-violet-200/40',
    cyan: 'from-cyan-600 to-cyan-700 text-cyan-600 bg-cyan-50 border-cyan-100 shadow-cyan-200/40',
    orange: 'from-orange-600 to-orange-700 text-orange-600 bg-orange-50 border-orange-100 shadow-orange-200/40',
    fuchsia: 'from-fuchsia-600 to-fuchsia-700 text-fuchsia-600 bg-fuchsia-50 border-fuchsia-100 shadow-fuchsia-200/40'
};

export const Approaches: React.FC = () => {
  const navigate = useNavigate();
  const { info, success } = useToast();
  const [activeTab, setActiveTab] = useState<'cards' | 'manual'>('cards');

  return (
    <div className="mx-auto max-w-[1600px] px-6 pt-6 pb-24 animate-fadeIn font-sans space-y-12">
      <PageHeader
        icon={<Layers />}
        title="Hub de Epistemologia Clínica"
        subtitle="O ecossistema teórico do PsiFlux está à sua disposição. Explore, aprenda e automatize."
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        containerClassName="mb-0"
        actions={
          <div className="flex items-center gap-2 p-1.5 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto max-w-full">
            <button 
                onClick={() => setActiveTab('cards')}
                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'cards' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <LayoutGrid size={14} /> Painéis Visuais
            </button>
            <button 
                onClick={() => setActiveTab('manual')}
                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'manual' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <BookOpen size={14} /> Enciclopédia Clínica
            </button>
          </div>
        }
      />

      {activeTab === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {approaches.map((app) => (
                <div 
                    key={app.id}
                    className="group relative bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden flex flex-col gap-5 h-full"
                >
                     {/* Dynamic Background Glow */}
                     <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-0 blur-3xl group-hover:opacity-10 transition-opacity bg-indigo-600`} />
                     
                     {/* Top Interaction Layer */}
                     <div className="flex items-start justify-between relative z-10">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ring-4 ring-white shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 bg-gradient-to-br ${colorVariants[app.color].split(' ').slice(0, 2).join(' ')} text-white`}>
                            {React.cloneElement(app.icon as React.ReactElement, { size: 24 })}
                        </div>
                        <div className="flex flex-col items-end">
                             <div className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-slate-50 text-slate-400 border border-slate-100 flex items-center gap-1`}>
                                <ShieldCheck size={10} /> Integrado
                             </div>
                        </div>
                     </div>
 
                     {/* Information Layer */}
                     <div className="space-y-3 flex-1 relative z-10">
                        <section>
                            <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none uppercase mb-1">{app.title}</h2>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">{app.subtitle}</p>
                        </section>
                        
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2 italic">"{app.description}"</p>

                        <div className="flex flex-wrap gap-1.5 pt-2">
                             {app.features.slice(0, 3).map(f => (
                                 <span key={f} className="bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full text-[8px] font-bold border border-slate-100 tracking-tight">#{f}</span>
                             ))}
                        </div>
 
                        <div className="pt-2 space-y-3 border-t border-slate-50 mt-2">
                             <div className="space-y-0.5">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 leading-none">
                                    <History size={10} className="text-slate-300"/> Herança
                                </span>
                                <p className="text-[9px] font-bold text-slate-600 leading-tight line-clamp-1">{app.origin}</p>
                             </div>
                        </div>
                     </div>
 
                     {/* Action Layer */}
                     <div className="pt-3 flex items-center justify-between relative z-10 border-t border-slate-50">
                         <Link 
                            to={app.path}
                            className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all p-2 text-slate-400 hover:text-indigo-600`}
                         >
                            Acessar Painel <ArrowRight size={14} />
                         </Link>
                         <button 
                            onClick={() => info(app.title, app.description)}
                            className="w-8 h-8 rounded-lg bg-slate-50 text-slate-300 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"
                         >
                            <Plus size={14} />
                         </button>
                     </div>
                </div>
            ))}
        </div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-12 animate-slideUpFade px-4">
            <div className="text-center mb-16">
                 <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-4">Manual de Epistemologia Clínica</h2>
                 <p className="text-slate-500 max-w-2xl mx-auto font-medium">Um mergulho profundo nas raízes históricas e curiosidades teóricas que moldam o atendimento psicológico moderno.</p>
            </div>

            {approaches.map((app, idx) => (
                <div key={app.id} className="relative group bg-white border border-slate-100 rounded-[48px] p-8 md:p-12 shadow-sm hover:shadow-xl transition-all duration-700">
                    <div className="flex flex-col lg:flex-row gap-12">
                        <div className="lg:w-1/3 space-y-8">
                             <div className={`w-28 h-28 rounded-[40px] flex items-center justify-center text-white shadow-2xl z-10 relative group-hover:scale-105 transition-all duration-500 bg-gradient-to-br ${colorVariants[app.color].split(' ').slice(0, 2).join(' ')}`}>
                                {React.cloneElement(app.icon as React.ReactElement, { size: 48 })}
                             </div>
                             
                             <div className="space-y-4">
                                <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-[0.9]">{app.title}</h3>
                                <div className="flex items-center gap-4">
                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white shadow-lg`}>{app.subtitle}</span>
                                </div>
                             </div>

                             <div className="pt-8 space-y-6">
                                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 shadow-inner">
                                     <h4 className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                                         <Info size={16}/> Definição Rápida
                                     </h4>
                                     <p className="text-sm text-slate-600 font-bold leading-relaxed">{app.description}</p>
                                </div>
                                
                                <Link to={app.path} className="flex items-center justify-center gap-3 w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all">
                                    Explorar Clínica Personalizada <ArrowRight size={18} />
                                </Link>
                             </div>
                        </div>

                        <div className="flex-1 space-y-12">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <section className="space-y-8">
                                    <div className="space-y-4">
                                        <h4 className="flex items-center gap-3 text-xs font-black text-slate-800 uppercase tracking-widest border-l-4 border-amber-400 pl-4 py-1">
                                            História e Origem
                                        </h4>
                                        <p className="text-base text-slate-500 leading-relaxed font-medium">{app.origin}</p>
                                    </div>

                                    <div className="p-8 bg-blue-50/50 rounded-[40px] border border-blue-100/30 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-5"><Lightbulb size={64}/></div>
                                        <h4 className="flex items-center gap-3 text-xs font-black text-blue-900 uppercase tracking-widest mb-6">
                                            Indicações de Ouro
                                        </h4>
                                        <p className="text-sm text-blue-900/80 font-bold leading-relaxed">{app.whenToUse}</p>
                                    </div>
                                </section>

                                <section className="space-y-8">
                                    <div className="space-y-4">
                                        <h4 className="flex items-center gap-3 text-xs font-black text-indigo-500 uppercase tracking-widest border-l-4 border-indigo-400 pl-4 py-1">
                                            Fatos e Curiosidades
                                        </h4>
                                        <div className="bg-slate-50 rounded-[40px] p-8 border border-slate-100 shadow-inner relative group-hover:bg-white group-hover:shadow-2xl transition-all duration-500">
                                            <p className="text-base font-black leading-relaxed italic text-slate-700">"Você sabia?"</p>
                                            <p className="text-sm font-bold text-slate-400 leading-relaxed mt-4 italic">{app.curiosity}</p>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-indigo-600 rounded-[40px] text-white shadow-2xl shadow-indigo-100/50 relative overflow-hidden">
                                        <div className="absolute -bottom-4 -right-4 opacity-10"><Zap size={100}/></div>
                                        <h4 className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-60 mb-6">
                                            Funcionamento no PsiFlux
                                        </h4>
                                        <p className="text-sm font-black leading-relaxed mb-6 italic">"{app.howItWorks}"</p>
                                        <div className="flex flex-wrap gap-2">
                                            {app.features.map(f => (
                                                <span key={f} className="px-3 py-1 bg-white/10 rounded-lg text-[9px] font-bold border border-white/10">{f}</span>
                                            ))}
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

      {/* NEW FOOTER CTA - SMART AGENT */}
      <div className="bg-slate-950 rounded-[64px] p-12 md:p-20 text-white shadow-2xl relative overflow-hidden mt-20 border border-slate-800">
        <div className="absolute top-0 right-0 p-20 opacity-5 scale-150 rotate-12">
           <Brain size={300} />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-16">
             <div className="lg:w-1/2 space-y-10">
                 <div className="inline-flex items-center gap-3 px-6 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 backdrop-blur-md">
                     <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">
                        Inteligência Teórica Ativa
                     </span>
                 </div>
                 <h2 className="text-6xl font-black tracking-tighter leading-none uppercase">A IA que entende<br />sua conduta.</h2>
                 <p className="text-slate-400 text-lg font-medium leading-relaxed">
                    Sua escolha de abordagem clínica é o coração da nossa IA. Ao selecionar TCC, Psicanálise ou Esquemas, a Aurora ajusta automaticamente os resumos e evoluções para respeitar os termos técnicos e a lógica de cada escola.
                 </p>
                 <div className="flex flex-col sm:flex-row gap-6">
                    <Link 
                        to="/ia-config"
                        className="px-10 py-6 bg-emerald-500 text-slate-950 rounded-[32px] font-black uppercase tracking-widest text-xs shadow-2xl shadow-emerald-500/20 hover:bg-white transition-all flex items-center justify-center gap-3"
                    >
                        Configurar Aurora AI <Sparkles size={18}/>
                    </Link>
                    <button 
                        onClick={() => success('Sincronização Ativa', 'A IA agora está usando a base epistemológica configurada.')}
                        className="px-10 py-6 bg-slate-800 text-white rounded-[32px] font-black uppercase tracking-widest text-[10px] hover:bg-slate-700 transition-all border border-slate-700"
                    >
                        Sincronizar Toolboxes
                    </button>
                 </div>
             </div>
             
             <div className="lg:w-1/2 grid grid-cols-2 gap-6 relative">
                 <div className="absolute inset-0 bg-emerald-500/5 blur-[100px] pointer-events-none"></div>
                 <div className="space-y-6 translate-y-12">
                     <div className="bg-slate-900/50 p-6 rounded-[32px] border border-slate-800 backdrop-blur-sm">
                         <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mb-4"><MessageSquare size={20}/></div>
                         <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Resumos</p>
                         <p className="text-xs font-bold text-slate-300">A IA utiliza termos como "Transferência" ou "Distorção Cognitiva" dependendo da sua escola.</p>
                     </div>
                     <div className="bg-slate-900/50 p-6 rounded-[32px] border border-slate-800 backdrop-blur-sm">
                         <div className="w-10 h-10 bg-rose-500/20 text-rose-400 rounded-xl flex items-center justify-center mb-4"><Target size={20}/></div>
                         <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Metas</p>
                         <p className="text-xs font-bold text-slate-300">Sugestões de metas terapêuticas alinhadas com os protocolos de cada abordagem.</p>
                     </div>
                 </div>
                 <div className="space-y-6">
                     <div className="bg-slate-900/50 p-6 rounded-[32px] border border-slate-800 backdrop-blur-sm">
                         <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center mb-4"><Gauge size={20}/></div>
                         <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Mensuração</p>
                         <p className="text-xs font-bold text-slate-300">Gráficos de evolução que mostram o progresso real em protocolos validados.</p>
                     </div>
                     <div className="bg-slate-900/50 p-6 rounded-[32px] border border-slate-800 backdrop-blur-sm">
                         <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mb-4"><UserCheck size={20}/></div>
                         <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Relatórios</p>
                         <p className="text-xs font-bold text-slate-300">Geração de documentos oficiais com fundamentação teórica pré-carregada.</p>
                     </div>
                 </div>
             </div>
        </div>
      </div>
    </div>
  );
};
