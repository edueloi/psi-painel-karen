import React, { useState } from 'react';
import {
  BookCheck, Brain, Heart, Target, Sparkles, Layers,
  ChevronRight, ArrowRight, Plus, BrainCircuit, LayoutGrid,
  Feather, BookOpen, Settings2, Sun, HelpCircle, Activity,
  Workflow, Info, Lightbulb, Microscope, Zap, History,
  ClipboardList, RefreshCw, HeartHandshake, Flower2, Search,
  Compass, ShieldCheck, UserCheck, MessageSquare, Gauge, Baby, Users,
  Star, Quote, ZapOff, CheckCircle2
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
  },
  {
    id: 'disc',
    title: 'Perfil DISC',
    subtitle: 'Comportamento & Dominância',
    description: 'A metodologia DISC é uma ferramenta de avaliação comportamental que identifica padrões de resposta em quatro dimensões fundamentais.',
    origin: 'William Moulton Marston (1928), o mesmo criador da Mulher-Maravilha e do Detector de Mentiras.',
    curiosity: 'Marston criou o DISC baseado não em patologias, mas no comportamento de pessoas "normais" em diferentes ambientes.',
    whenToUse: 'Orientação profissional, desenvolvimento de liderança e conflitos interpessoais.',
    howItWorks: 'Mapeamento de Dominância, Influência, Estabilidade e Conformidade.',
    icon: <Gauge />,
    path: '/disc',
    color: 'violet',
    features: ['Gráfico de Perfil', 'Análise de Stress', 'Match de Cargos'],
  },
  {
    id: 'infantil',
    title: 'Ludoterapia / Infantil',
    subtitle: 'O Brincar Terapêutico',
    description: 'Abordagem que utiliza o jogo e a atividade lúdica como meio natural de autoexpressão da criança.',
    origin: 'Melanie Klein e Anna Freud, adaptando a técnica analítica para o mundo infantil.',
    curiosity: 'Na ludoterapia, o brinquedo é para a criança o que a palavra é para o adulto.',
    whenToUse: 'Dificuldades escolares, traumas infantis, divórcio dos pais e TDAH.',
    howItWorks: 'Uso da "Hora do Jogo" diagnóstica e manejo de limites através do lúdico.',
    icon: <Baby />,
    path: '/caixa-ferramentas/infantil',
    color: 'rose',
    features: ['Caixa de Brinquedos', 'Desenho Livre', 'Contação Histórias'],
  },
  {
    id: 'casal',
    title: 'Terapia de Casal',
    subtitle: 'Vínculo & Conjugalidade',
    description: 'Focada nos padrões de interação do sistema conjugal e na reconstrução da conexão emocional.',
    origin: 'Influenciada pela Terapia Sistêmica e pelos estudos de John Gottman (Lab do Amor).',
    curiosity: 'Gottman consegue prever divórcios com 90% de precisão observando apenas 15 minutos de uma discussão.',
    whenToUse: 'Infidelidade, falhas na comunicação, crises de ciclo vital e divórcio consciente.',
    howItWorks: 'Treino de Comunicação Não-Violenta e mapeamento de mapas do amor.',
    icon: <Users />,
    path: '/caixa-ferramentas/casal',
    color: 'emerald',
    features: ['Contrato de Casal', 'Feedback Seguro', 'Mapa do Amor'],
  },
  {
    id: 'orientacao',
    title: 'Orientação de Pais',
    subtitle: 'Parentalidade Consciente',
    description: 'Consultoria terapêutica focada no manejo de contingências e no fortalecimento do vínculo pais-filhos.',
    origin: 'Baseada na Disciplina Positiva de Jane Nelsen e Alfred Adler.',
    curiosity: 'Estudos mostram que mudar o comportamento dos pais é mais eficaz que tratar a criança isoladamente em muitos casos.',
    whenToUse: 'Dificuldades de manejo, birras severas, adolescência conflituosa e depressão pós-parto.',
    howItWorks: 'Treino de habilidades sociais parentais e psicoeducação sobre desenvolvimento.',
    icon: <UserCheck />,
    path: '/caixa-ferramentas/pais',
    color: 'amber',
    features: ['Plano de Contingências', 'Rotina Visual', 'Cuidado Parental'],
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
  const [searchTerm, setSearchTerm] = useState('');

  const filteredApproaches = approaches.filter(app => 
    app.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    app.subtitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-6 pt-6 pb-24 animate-fadeIn space-y-8 md:space-y-12">
      <PageHeader
        icon={<Layers className="text-indigo-600" />}
        title="Dossiê Clânico de Epistemologia"
        subtitle="Explore o ecossistema teórico do PsiFlux. Sua abordagem define o cérebro da nossa IA."
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        containerClassName="mb-0"
        actions={
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative group hidden sm:block">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
               <input 
                  type="text"
                  placeholder="Pesquisar abordagem..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold w-48 lg:w-64 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all shadow-sm"
               />
            </div>
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button 
                    onClick={() => setActiveTab('cards')}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'cards' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <LayoutGrid size={14} /> Painéis
                </button>
                <button 
                    onClick={() => setActiveTab('manual')}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'manual' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    <BookOpen size={14} /> Manual
                </button>
            </div>
          </div>
        }
      />

      {activeTab === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {filteredApproaches.map((app) => (
                <div 
                    key={app.id}
                    className="group relative bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-2 transition-all duration-500 flex flex-col overflow-hidden min-h-[480px]"
                >
                     {/* Status & Badge */}
                     <div className="absolute top-6 right-6 flex flex-col items-end gap-1.5 z-20">
                         <div className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1 shadow-sm`}>
                            <CheckCircle2 size={10} /> Integrado
                         </div>
                         <span className="text-[9px] text-slate-300 font-black uppercase tracking-widest opacity-30">v.3.1</span>
                     </div>

                     <div className="p-8 pb-4 flex-1 flex flex-col">
                         {/* Icon Box */}
                         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 bg-gradient-to-br ${colorVariants[app.color].split(' ').slice(0, 2).join(' ')} text-white`}>
                            {React.cloneElement(app.icon as React.ReactElement, { size: 28 })}
                         </div>
    
                         {/* Text Content */}
                         <div className="space-y-4 flex-1">
                            <div className="space-y-1.5">
                                <h2 className="text-lg lg:text-xl font-black text-slate-900 tracking-tight leading-[1.1] uppercase group-hover:text-indigo-600 transition-colors">{app.title}</h2>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{app.subtitle}</p>
                            </div>
                            
                            <p className="text-xs text-slate-500 font-bold leading-relaxed pr-2 line-clamp-3">
                                {app.description}
                            </p>

                            <div className="flex flex-wrap gap-1.5 pt-2">
                                 {app.features.slice(0, 3).map(f => (
                                     <span key={f} className="bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-tight px-2.5 py-1.5 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">#{f}</span>
                                 ))}
                            </div>
                         </div>

                         {/* Epistemology Info */}
                         <div className="mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:border-indigo-100 transition-colors">
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 text-indigo-600">
                                    <History size={14} />
                                </div>
                                <div className="space-y-0.5 min-w-0">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Origem</span>
                                    <p className="text-[10px] font-bold text-slate-900 truncate uppercase">{app.origin.split('(')[0]}</p>
                                </div>
                             </div>
                         </div>
                     </div>
 
                     {/* Integrated Bottom Action Footer */}
                     <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between group-hover:bg-indigo-600 transition-all duration-500">
                         <Link 
                            to={app.path}
                            className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors`}
                         >
                            Acessar Painel <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                         </Link>
                         <button 
                            onClick={() => info(app.title, app.curiosity)}
                            className="w-10 h-10 rounded-xl bg-white text-slate-300 hover:text-indigo-600 hover:scale-105 transition-all flex items-center justify-center shadow-sm"
                            title="Ver curiosidade"
                         >
                            <Lightbulb size={20} />
                         </button>
                     </div>
                </div>
            ))}
        </div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-12 animate-slideUpFade px-4">
            <div className="text-center relative py-6">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-100 rounded-full blur-[60px] opacity-30" />
                 <h2 className="text-3xl md:text-4xl font-black text-slate-950 tracking-tighter uppercase mb-4 relative">Manual de Epistemologia Clínica</h2>
                 <p className="text-slate-500 max-w-xl mx-auto text-sm font-medium leading-relaxed">O guia definitivo sobre as bases teóricas que alimentam o motor clínico da nossa plataforma inteligente.</p>
            </div>

            {filteredApproaches.map((app) => (
                <div key={app.id} className="relative group bg-white border border-slate-100 rounded-[3rem] p-8 md:p-12 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-700 overflow-hidden">
                    {/* Watermark Icon */}
                    <div className="absolute -top-12 -right-12 p-12 opacity-[0.02] scale-150 rotate-12 group-hover:opacity-5 transition-opacity">
                        {app.icon}
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-16 relative z-10">
                        {/* Information Section */}
                        <div className="lg:col-span-5 space-y-8 flex flex-col items-center lg:items-start text-center lg:text-left">
                             <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center text-white shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-700 bg-gradient-to-br ${colorVariants[app.color].split(' ').slice(0, 2).join(' ')}`}>
                                {React.cloneElement(app.icon as React.ReactElement, { size: 40 })}
                             </div>
                             
                             <div className="space-y-4">
                                <h3 className="text-3xl md:text-4xl font-black text-slate-950 tracking-tight uppercase leading-none">{app.title}</h3>
                                <div className="flex items-center gap-3 justify-center lg:justify-start">
                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-950 text-white shadow-lg`}>{app.subtitle}</span>
                                </div>
                                <p className="text-sm md:text-base text-slate-500 font-medium leading-relaxed border-l-4 md:border-l-8 border-indigo-50 pl-6 transition-all group-hover:border-indigo-600 italic">
                                    "{app.description}"
                                </p>
                             </div>

                             <div className="pt-4 flex flex-col gap-3 w-full max-w-md">
                                <Link to={app.path} className="flex items-center justify-center gap-3 w-full py-5 bg-indigo-600 shadow-lg shadow-indigo-600/20 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-950 transition-all hover:scale-[1.02]">
                                    Configurar Clínica <ArrowRight size={16} />
                                </Link>
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Ajusta o motor Aurora AI automaticamente</p>
                             </div>
                        </div>

                        {/* Details Section */}
                        <div className="lg:col-span-7 space-y-8">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                <section className="space-y-8">
                                    <div className="space-y-3">
                                        <h4 className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">
                                            <History size={14} className="text-amber-500" /> História & Origem
                                        </h4>
                                        <p className="text-sm text-slate-600 leading-relaxed font-bold">{app.origin}</p>
                                    </div>

                                    <div className="p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100/50 group/box">
                                        <h4 className="flex items-center gap-2 text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-4">
                                            <Target size={14} className="text-indigo-600" /> Indicações Ouro
                                        </h4>
                                        <p className="text-xs md:text-sm text-indigo-900/70 font-black leading-relaxed italic">{app.whenToUse}</p>
                                    </div>
                                </section>

                                <section className="space-y-8">
                                    <div className="space-y-3">
                                        <h4 className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">
                                            <Lightbulb size={14} className="text-indigo-500" /> Curiosidade
                                        </h4>
                                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-md group-hover:shadow-lg transition-all duration-500">
                                            <p className="text-xs md:text-sm font-black leading-relaxed italic text-slate-700">"{app.curiosity}"</p>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-slate-950 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group/box">
                                        <div className="absolute -bottom-4 -right-4 opacity-10 group-hover/box:rotate-12 transition-transform"><Sparkles size={64}/></div>
                                        <h4 className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest opacity-40 mb-4">
                                            Interpretação da IA
                                        </h4>
                                        <p className="text-[11px] font-bold leading-relaxed mb-6 italic opacity-80">"{app.howItWorks}"</p>
                                        <div className="flex flex-wrap gap-2">
                                            {app.features.map(f => (
                                                <span key={f} className="px-3 py-1.5 bg-white/10 rounded-xl text-[8px] font-black border border-white/5 uppercase tracking-widest hover:bg-indigo-600 transition-colors cursor-default">{f}</span>
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

      {/* SMART AGENT CTA */}
      <div className="bg-gradient-to-br from-slate-950 to-indigo-950 rounded-[80px] p-16 md:p-24 text-white shadow-[0_80px_160px_rgba(0,0,0,0.3)] relative overflow-hidden mt-20 border border-slate-800 animate-pulse-subtle">
        <div className="absolute top-0 right-0 p-24 opacity-5 scale-[2] rotate-12">
           <Brain size={400} />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-20">
             <div className="lg:w-3/5 space-y-10 text-center lg:text-left">
                 <div className="inline-flex items-center gap-4 px-8 py-3 bg-indigo-600/20 rounded-full border border-indigo-500/30 backdrop-blur-2xl">
                     <span className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-400">
                        Sincronização Ativa 3.1
                     </span>
                 </div>
                 <h2 className="text-7xl font-black tracking-tighter leading-none uppercase">Neuro-Epistemologia<br /><span className="text-indigo-500">Aumentada por IA.</span></h2>
                 <p className="text-slate-400 text-xl font-medium leading-[1.8] max-w-2xl mx-auto lg:mx-0">
                    A Aurora não apenas escreve resumos, ela **pensa** como você. Sua abordagem clínica é o filtro intelectual que define como o sistema analisa padrões de fala, sonhos e distorções cognitivas.
                 </p>
                 <div className="flex flex-col sm:flex-row gap-8 justify-center lg:justify-start">
                    <Link 
                        to="/configuracoes"
                        className="px-14 py-8 bg-indigo-600 text-white rounded-[40px] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-indigo-600/20 hover:bg-white hover:text-indigo-900 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-4 group"
                    >
                        Configurar Aurora <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                    </Link>
                    <button 
                        onClick={() => success('Base Teórica Sincronizada', 'A Aurora IA agora opera sob o paradigma clínico selecionado.')}
                        className="px-14 py-8 bg-slate-900 text-indigo-400 rounded-[40px] font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-800 transition-all border border-slate-800 hover:border-indigo-500/50"
                    >
                        Calibrar Motor Clínico
                    </button>
                 </div>
             </div>
             
             <div className="lg:w-2/5 grid grid-cols-2 gap-8 relative lg:pt-20">
                 <div className="absolute inset-0 bg-indigo-500/10 blur-[150px] pointer-events-none"></div>
                 <div className="space-y-8 animate-float">
                     <div className="bg-slate-900/40 p-8 rounded-[48px] border border-slate-800 backdrop-blur-3xl hover:border-indigo-500/50 transition-all group">
                         <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><MessageSquare size={24}/></div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">Linguagem Técnica</p>
                         <p className="text-xs font-bold text-slate-200 leading-relaxed">Vocabulário ajustado perfeitamente ao seu referencial teórico (RPD, Interpretação, Modos).</p>
                     </div>
                     <div className="bg-slate-900/40 p-8 rounded-[48px] border border-slate-800 backdrop-blur-3xl hover:border-rose-500/50 transition-all group">
                         <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Target size={24}/></div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">Estratégia de Caso</p>
                         <p className="text-xs font-bold text-slate-200 leading-relaxed">Sugestões de hipóteses e planejamentos terapêuticos baseados em evidência da sua escola.</p>
                     </div>
                 </div>
                 <div className="space-y-8 lg:translate-y-24 animate-float-delayed">
                     <div className="bg-slate-900/40 p-8 rounded-[48px] border border-slate-800 backdrop-blur-3xl hover:border-amber-500/50 transition-all group">
                         <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Gauge size={24}/></div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">Análise Métrica</p>
                         <p className="text-xs font-bold text-slate-200 leading-relaxed">Dashboards que mostram a evolução do paciente nos indicadores próprios da sua abordagem.</p>
                     </div>
                     <div className="bg-slate-900/40 p-8 rounded-[48px] border border-slate-800 backdrop-blur-3xl hover:border-emerald-500/50 transition-all group">
                         <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><UserCheck size={24}/></div>
                         <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">Relatórios Pro</p>
                         <p className="text-xs font-bold text-slate-200 leading-relaxed">Geração de documentos oficiais com fundamentação ética e teórica automática.</p>
                     </div>
                 </div>
             </div>
        </div>
      </div>
    </div>
  );
};
