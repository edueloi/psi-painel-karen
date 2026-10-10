import React, { useState } from 'react';
import {
  BookCheck, Brain, Heart, Target, Sparkles, Layers,
  ChevronRight, ArrowRight, Plus, BrainCircuit, LayoutGrid,
  Feather, BookOpen, Settings2, Sun, HelpCircle, Activity,
  Workflow, Info, Lightbulb, Microscope, Zap, History,
  ClipboardList, RefreshCw, HeartHandshake, Flower2, Search,
  Compass, ShieldCheck, UserCheck, MessageSquare, Gauge, Baby, Users,
  Star, Quote, ZapOff, CheckCircle2, ArrowLeft
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import {
  Badge,
  Button,
  ContentCard,
  EmptyState,
  FilterLine,
  FilterLineItem,
  FilterLineSearch,
  FilterLineSection,
  IconButton,
  PageWrapper,
  PanelCard,
  SectionTitle,
  Tabs,
} from '../components/UI';

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
  }
];

const VIEW_TABS = [
  { id: 'cards', label: 'Painéis', icon: LayoutGrid },
  { id: 'manual', label: 'Manual', icon: BookOpen },
] as const;

const renderIcon = (icon: React.ReactNode, size: number) =>
  React.cloneElement(icon as React.ReactElement<any>, { size });

export const Approaches: React.FC = () => {
  const navigate = useNavigate();
  const { info, success } = useToast();
  const [activeTab, setActiveTab] = useState<typeof VIEW_TABS[number]['id']>('cards');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredApproaches = approaches.filter(app =>
    app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.subtitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageWrapper>
      <div className="space-y-4">
        <div>
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/caixa-ferramentas')} iconLeft={<ArrowLeft size={14} />}>
            Voltar
          </Button>
        </div>

        <SectionTitle
          icon={Layers}
          title="Dossiê clínico de epistemologia"
          description="Explore o ecossistema teórico do Plaelo. Sua abordagem define o cérebro da nossa IA."
        />

        <Tabs<typeof VIEW_TABS[number]['id']> items={VIEW_TABS} value={activeTab} onChange={setActiveTab} label="Visões das abordagens" />

        <FilterLine>
          <FilterLineSection grow>
            <FilterLineItem grow minWidth={200}>
              <FilterLineSearch
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Pesquisar abordagem..."
                aria-label="Pesquisar abordagem"
              />
            </FilterLineItem>
          </FilterLineSection>
        </FilterLine>

        {filteredApproaches.length === 0 && (
          <ContentCard>
            <EmptyState icon={Search} title="Nenhuma abordagem encontrada" description="Tente buscar por outro termo." />
          </ContentCard>
        )}

        {activeTab === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredApproaches.map((app) => (
              <ContentCard
                key={app.id}
                padding="none"
                className="group flex h-full flex-col overflow-hidden hover:border-primary-200 transition-colors"
              >
                <div className="p-3 lg:p-4 flex-1 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 text-primary-600">
                      {renderIcon(app.icon, 18)}
                    </div>
                    <Badge color="primary" size="sm"><CheckCircle2 size={10} className="mr-1" />Integrado</Badge>
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-sm font-medium text-slate-900 group-hover:text-primary-700 transition-colors">{app.title}</h2>
                    <p className="text-[11px] text-slate-500">{app.subtitle}</p>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{app.description}</p>

                  <div className="flex flex-wrap gap-1.5">
                    {app.features.slice(0, 3).map(f => (
                      <Badge key={f} color="default" size="sm">#{f}</Badge>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                    <History size={14} className="text-primary-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="block text-[11px] text-slate-500 leading-none">Origem</span>
                      <p className="mt-1 text-xs font-medium text-slate-800 truncate">{app.origin.split('(')[0]}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 p-3">
                  <Link
                    to={app.path}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:underline"
                  >
                    Acessar painel <ArrowRight size={14} />
                  </Link>
                  <IconButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => info(app.title, app.curiosity)}
                    title="Ver curiosidade"
                    aria-label="Ver curiosidade"
                  >
                    <Lightbulb size={14} />
                  </IconButton>
                </div>
              </ContentCard>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="py-2">
              <h2 className="text-sm font-medium text-slate-900">Manual de epistemologia clínica</h2>
              <p className="mt-1 text-xs text-slate-500">O guia definitivo sobre as bases teóricas que alimentam o motor clínico da nossa plataforma inteligente.</p>
            </div>

            {filteredApproaches.map((app) => (
              <ContentCard key={app.id} padding="md">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Information Section */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 text-primary-600">
                        {renderIcon(app.icon, 20)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-slate-900">{app.title}</h3>
                        <Badge color="default" size="sm" className="mt-1">{app.subtitle}</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed border-l-2 border-primary-200 pl-3 italic">
                      "{app.description}"
                    </p>
                    <div className="space-y-1.5">
                      <Link to={app.path} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary-600 px-3 text-xs font-medium text-white hover:bg-primary-700 transition-colors">
                        Configurar clínica <ArrowRight size={14} />
                      </Link>
                      <p className="text-[11px] text-slate-500">Ajusta o motor Bia AI automaticamente</p>
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <PanelCard title="História e origem" icon={History}>
                      <p className="text-xs text-slate-600 leading-relaxed">{app.origin}</p>
                    </PanelCard>
                    <PanelCard title="Indicações ouro" icon={Target}>
                      <p className="text-xs text-slate-600 leading-relaxed italic">{app.whenToUse}</p>
                    </PanelCard>
                    <PanelCard title="Curiosidade" icon={Lightbulb}>
                      <p className="text-xs text-slate-600 leading-relaxed italic">"{app.curiosity}"</p>
                    </PanelCard>
                    <PanelCard title="Interpretação da IA" icon={Sparkles}>
                      <p className="text-xs text-slate-600 leading-relaxed italic mb-2">"{app.howItWorks}"</p>
                      <div className="flex flex-wrap gap-1.5">
                        {app.features.map(f => (
                          <Badge key={f} color="primary" size="sm">{f}</Badge>
                        ))}
                      </div>
                    </PanelCard>
                  </div>
                </div>
              </ContentCard>
            ))}
          </div>
        )}

        {/* SMART AGENT CTA */}
        <PanelCard title="Neuro-epistemologia aumentada por IA" description="Sincronização ativa 3.1" icon={Brain}>
          <div className="space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              A Bia não apenas escreve resumos, ela <strong>pensa</strong> como você. Sua abordagem clínica é o filtro intelectual que define como o sistema analisa padrões de fala, sonhos e distorções cognitivas.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/configuracoes"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary-600 px-3 text-xs font-medium text-white hover:bg-primary-700 transition-colors"
              >
                Configurar Bia <Sparkles size={14} />
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => success('Base Teórica Sincronizada', 'A Bia IA agora opera sob o paradigma clínico selecionado.')}
              >
                Calibrar motor clínico
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                { icon: MessageSquare, title: 'Linguagem técnica', text: 'Vocabulário ajustado perfeitamente ao seu referencial teórico (RPD, Interpretação, Modos).' },
                { icon: Target, title: 'Estratégia de caso', text: 'Sugestões de hipóteses e planejamentos terapêuticos baseados em evidência da sua escola.' },
                { icon: Gauge, title: 'Análise métrica', text: 'Dashboards que mostram a evolução do paciente nos indicadores próprios da sua abordagem.' },
                { icon: UserCheck, title: 'Relatórios pro', text: 'Geração de documentos oficiais com fundamentação ética e teórica automática.' },
              ].map(item => (
                <div key={item.title} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                  <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-md border border-primary-100 bg-primary-50 text-primary-600">
                    <item.icon size={14} />
                  </div>
                  <p className="text-xs font-medium text-slate-800">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </PanelCard>
      </div>
    </PageWrapper>
  );
};
