import React, { useState } from 'react';
import { 
  BookCheck, Brain, Heart, Target, Sparkles, Layers, 
  ChevronRight, ArrowRight, Plus, BrainCircuit, LayoutGrid, 
  Feather, BookOpen, Settings2, Sun, HelpCircle, Activity, 
  Workflow, Info, Lightbulb, Microscope, Zap, History
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
  color: 'indigo' | 'rose' | 'amber' | 'blue' | 'emerald' | 'slate' | 'violet';
  features: string[];
}

const approaches: ApproachData[] = [
  {
    id: 'tcc',
    title: 'Cognitivo-Comportamental',
    subtitle: 'Reestruturação & Evidência',
    description: 'A TCC é uma abordagem estruturada e focada no presente que busca equilibrar pensamentos, emoções e comportamentos.',
    origin: 'Desenvolvida por Aaron Beck nos anos 60, originalmente para tratar depressão.',
    curiosity: 'Beck criou a TCC tentando provar cientificamente a eficácia da Psicanálise, mas acabou descobrindo outro caminho.',
    whenToUse: 'Ansiedade, Depressão, TOC, Pânico e fobias específicas.',
    howItWorks: 'Utiliza o RPD e Questionamento Socrático para tratar distorções do pensamento.',
    icon: <BrainCircuit />,
    path: '/caixa-ferramentas/tcc',
    color: 'indigo',
    features: ['RPD Digital', 'Protocolos Estruturados', 'Foco no Agora'],
  },
  {
    id: 'psicanalise',
    title: 'Psicanálise',
    subtitle: 'O Inconsciente & Simbolismo',
    description: 'Exploração dos processos mentais profundos, focando na transferência e na interpretação do sujeito.',
    origin: 'Sigmund Freud, Viena, final do século XIX.',
    curiosity: 'O famoso divã foi usado porque Freud não gostava que os pacientes o encarassem por horas.',
    whenToUse: 'Autoconhecimento profundo, angústias existenciais e sintomas sem causa orgânica.',
    howItWorks: 'Associação Livre e Interpretação de Sonhos para acessar o inconsciente.',
    icon: <Feather />,
    path: '/caixa-ferramentas/psicanalise',
    color: 'amber',
    features: ['Diário de Sonhos', 'Transferência', 'Livre Associação'],
  },
  {
    id: 'esquemas',
    title: 'Terapia do Esquema',
    subtitle: 'Cura de Raízes Emocionais',
    description: 'Integra TCC e Gestalt para tratar transtornos de personalidade e padrões repetitivos.',
    origin: 'Jeffrey Young, como uma expansão da TCC para casos complexos.',
    curiosity: 'Trabalha com "Modos", que são como diferentes estados da nossa mente (ex: Criança Vulnerável).',
    whenToUse: 'Transtorno Borderline, Narcisismo e traumas de infância.',
    howItWorks: 'Foca no Reparentalizamento limitado e cura de necessidades não atendidas.',
    icon: <LayoutGrid />,
    path: '/caixa-ferramentas/esquemas',
    color: 'rose',
    features: ['Mapa de Esquemas', 'Monitor de Modos', 'Imaginação Ativa'],
  },
  {
    id: 'gestalt',
    title: 'Gestalt-Terapia',
    subtitle: 'O Aqui e Agora',
    description: 'Abordagem fenomenológica que foca na percepção holística da experiência do cliente.',
    origin: 'Fritz e Laura Perls, fugindo da rigidez da psicanálise clássica.',
    curiosity: 'O termo "Gestalt" não tem tradução exata, mas significa "Forma" ou "Configuração" total.',
    whenToUse: 'Fechamento de ciclos (gestalts abertas) e consciência corporal.',
    howItWorks: 'Uso de experimentos como a "Cadeira Vazia" para integrar polaridades.',
    icon: <Zap />,
    path: '/caixa-ferramentas/gestalt',
    color: 'emerald',
    features: ['Cadeira Vazia', 'Consciência Sensorial', 'Experimentos'],
  },
  {
    id: 'humanista',
    title: 'Humanista (ACP)',
    subtitle: 'Centrada na Pessoa',
    description: 'Foca no potencial de autorrealização e na tendência atualizante do ser humano.',
    origin: 'Carl Rogers, nos EUA, revolucionando a relação terapeuta-cliente.',
    curiosity: 'Rogers foi o primeiro a usar o termo "Cliente" em vez de "Paciente" para evitar a ideia de doença.',
    whenToUse: 'Baixa estima, buscas existenciais e crescimento pessoal.',
    howItWorks: 'Baseia-se na Empatia, Aceitação Incondicional e Congruência.',
    icon: <Sun />,
    path: '/caixa-ferramentas/humanista',
    color: 'amber',
    features: ['Escuta Empática', 'Congruência', 'Tendência Atualizante'],
  },
  {
    id: 'sistemica',
    title: 'Terapia Sistêmica',
    subtitle: 'Vínculos & Sistemas',
    description: 'Analisa o indivíduo dentro de seu contexto familiar e social como um sistema vivo.',
    origin: 'Escola de Milão e Gregory Bateson (Teoria da Comunicação).',
    curiosity: 'Surgiu da ideia de que mudar uma peça do sistema (família) afeta todas as outras.',
    whenToUse: 'Conflitos familiares, casais e padrões transgeracionais.',
    howItWorks: 'Genogramas e perguntas circulares para quebrar ciclos disfuncionais.',
    icon: <Workflow />,
    path: '/caixa-ferramentas/sistemica',
    color: 'blue',
    features: ['Genograma Digital', 'Intervenção Estratégica', 'Circularidade'],
  },
  {
    id: 'act',
    title: 'ACT',
    subtitle: 'Aceitação & Compromisso',
    description: 'Promove a flexibilidade psicológica através da aceitação e ações guiadas por valores.',
    origin: 'Steven Hayes, baseada na Teoria dos Quadros Relacionais (RFT).',
    curiosity: 'Diz que o sofrimento é uma parte normal da vida, não algo a ser "curado".',
    whenToUse: 'Ansiedade, dor crônica e rigidez mental.',
    howItWorks: 'Uso de metáforas e mindfulness para desfusão cognitiva.',
    icon: <Target />,
    path: '/caixa-ferramentas/act',
    color: 'violet',
    features: ['Bússola de Valores', 'Desfusão', 'Eu Observeur'],
  }
];

const colorVariants = {
    indigo: 'from-indigo-600 to-indigo-700 text-indigo-600 bg-indigo-50 border-indigo-100 shadow-indigo-200/40',
    rose: 'from-rose-600 to-rose-700 text-rose-600 bg-rose-50 border-rose-100 shadow-rose-200/40',
    amber: 'from-amber-600 to-amber-700 text-amber-600 bg-amber-50 border-amber-100 shadow-amber-200/40',
    blue: 'from-blue-600 to-blue-700 text-blue-600 bg-blue-50 border-blue-100 shadow-blue-200/40',
    emerald: 'from-emerald-600 to-emerald-700 text-emerald-600 bg-emerald-50 border-emerald-100 shadow-emerald-200/40',
    slate: 'from-slate-600 to-slate-700 text-slate-600 bg-slate-50 border-slate-100 shadow-slate-200/40',
    violet: 'from-violet-600 to-violet-700 text-violet-600 bg-violet-50 border-violet-100 shadow-violet-200/40'
};

export const Approaches: React.FC = () => {
  const navigate = useNavigate();
  const { info } = useToast();
  const [activeTab, setActiveTab] = useState<'cards' | 'manual'>('cards');

  return (
    <div className="mx-auto max-w-[1600px] px-6 pt-6 pb-24 animate-fadeIn font-sans space-y-12">
      <PageHeader
        icon={<Layers />}
        title="Dossiê de Abordagens"
        subtitle="Fundamentação teórica e curiosidades sobre as principais linhas psicoterapêuticas."
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
                <BookOpen size={14} /> Manual Clínico
            </button>
          </div>
        }
      />

      {activeTab === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {approaches.map((app) => (
                <div 
                    key={app.id}
                    className="group relative bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden flex flex-col gap-6 h-full"
                >
                     {/* Background Glow */}
                     <div className={`absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-5 blur-3xl group-hover:opacity-20 transition-opacity bg-indigo-600`} />
                     
                     {/* Top Section */}
                     <div className="flex items-start justify-between relative z-10">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ring-4 ring-white shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 bg-gradient-to-br ${colorVariants[app.color].split(' ').slice(0, 2).join(' ')} text-white`}>
                            {React.cloneElement(app.icon as React.ReactElement, { size: 24 })}
                        </div>
                        <div className="translate-y-1">
                             <div className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-slate-50 text-slate-400 border border-slate-100`}>
                                {app.id}
                             </div>
                        </div>
                     </div>
 
                     {/* Content Section */}
                     <div className="space-y-4 flex-1 relative z-10">
                        <section>
                            <h2 className="text-base font-black text-slate-800 tracking-tight leading-none uppercase">{app.title}</h2>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{app.subtitle}</p>
                        </section>
                        
                        <div className="space-y-4">
                             <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                                    <History size={10} className="text-slate-300"/> Origem
                                </span>
                                <p className="text-[10px] font-bold text-slate-600 leading-snug">{app.origin}</p>
                             </div>
                             <div className="space-y-1 p-3 bg-indigo-50/30 rounded-2xl border border-indigo-100/20">
                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                                    <Sparkles size={10}/> Curiosidade
                                </span>
                                <p className="text-[10px] font-bold text-indigo-900/70 leading-snug italic">{app.curiosity}</p>
                             </div>
                        </div>
                     </div>
 
                     {/* Footer Section */}
                     <div className="pt-2 flex items-center justify-between relative z-10">
                         <Link 
                            to={app.path}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 bg-slate-900 text-white hover:bg-indigo-600`}
                         >
                            Acessar <ArrowRight size={14} />
                         </Link>
                         <button 
                            onClick={() => info(app.title, app.description)}
                            className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                         >
                            <Info size={16} />
                         </button>
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
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${colorVariants[app.color].split(' ').slice(3, 5).join(' ')} text-slate-600`}>{app.subtitle}</span>
                                    <span className="text-xs text-slate-400 font-bold tracking-tight italic">Referência Epistemológica</span>
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <section className="space-y-6">
                                    <div className="space-y-3">
                                        <h4 className="flex items-center gap-3 text-xs font-black text-slate-800 uppercase tracking-widest">
                                            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><Info size={14}/></div>
                                            Conceito e Definição
                                        </h4>
                                        <p className="text-sm text-slate-500 leading-relaxed font-medium bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">{app.description}</p>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="flex items-center gap-3 text-xs font-black text-slate-800 uppercase tracking-widest">
                                            <div className="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center text-orange-400"><Lightbulb size={14}/></div>
                                            Indicações de Uso
                                        </h4>
                                        <div className="bg-orange-50/30 p-6 rounded-[32px] border border-orange-100/50">
                                            <p className="text-sm text-orange-950 font-bold leading-relaxed">{app.whenToUse}</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <div className="space-y-3">
                                        <h4 className="flex items-center gap-3 text-xs font-black text-slate-800 uppercase tracking-widest">
                                            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-400"><History size={14}/></div>
                                            Contexto Histórico
                                        </h4>
                                        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden">
                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Origem:</p>
                                                    <p className="text-sm font-bold text-slate-700 leading-relaxed italic">"{app.origin}"</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Curiosidade Teórica:</p>
                                                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                                        <p className="text-xs font-bold text-indigo-900 leading-relaxed">{app.curiosity}</p>
                                                    </div>
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
                    <Sparkles size={14} className="text-amber-400"/> Aurora AI Engine
                 </span>
             </div>
             <h2 className="text-4xl font-black tracking-tighter leading-none uppercase">Contextualização<br />Psicoterapêutica</h2>
             <p className="text-indigo-100/70 font-medium leading-relaxed italic text-sm">
                Sua abordagem selecionada não é apenas um guia visual. A Aurora AI utiliza estas premissas epistemológicas para ajustar sugestões, resumos e análises de casos de forma personalizada para sua conduta clínica.
             </p>
             <Link 
                to="/ia-config"
                className="px-10 py-5 bg-white text-indigo-950 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-slate-50 transition-all flex items-center gap-3 active:scale-95"
             >
                Configurações da IA <ArrowRight size={18}/>
             </Link>
        </div>
      </div>
    </div>
  );
};
