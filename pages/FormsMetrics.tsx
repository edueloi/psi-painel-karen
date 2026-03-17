
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ClinicalForm } from '../types';
import { 
  ArrowLeft, BarChart3, TrendingUp, Clock, ClipboardList, 
  ChevronRight, Calendar, Activity, Loader2, Search,
  Zap, MessageSquare, ListChecks, ArrowUpRight
} from 'lucide-react';

type FormMetric = {
  id: string;
  title: string;
  responses: number;
  lastResponseAt?: string;
  last7Days: number;
};

export const FormsMetrics: React.FC = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState<ClinicalForm[]>([]);
  const [metrics, setMetrics] = useState<FormMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const formsData = await api.get<any[]>('/forms');
        const mappedForms = formsData.map((f) => ({
          id: String(f.id),
          title: f.title,
          hash: f.hash,
          description: f.description || '',
          questions: [],
          interpretations: [],
          responseCount: f.response_count ?? 0,
          isGlobal: Boolean(f.is_global)
        })) as ClinicalForm[];
        setForms(mappedForms);

        const metricRows = await Promise.all(
          mappedForms.map(async (form) => {
            const responses = await api.get<any[]>(`/forms/${form.id}/responses`);
            const sorted = responses
              .map((r) => new Date(r.created_at))
              .sort((a, b) => b.getTime() - a.getTime());
            const lastResponseAt = sorted[0]
              ? sorted[0].toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
              : undefined;
            const now = Date.now();
            const last7Days = responses.filter((r) => {
              const diff = now - new Date(r.created_at).getTime();
              return diff <= 7 * 24 * 60 * 60 * 1000;
            }).length;
            return {
              id: form.id,
              title: form.title,
              responses: responses.length,
              lastResponseAt,
              last7Days
            };
          })
        );
        setMetrics(metricRows);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const totals = useMemo(() => {
    const totalResponses = metrics.reduce((sum, item) => sum + item.responses, 0);
    const avgResponses = forms.length ? Math.round(totalResponses / forms.length) : 0;
    const totalLast7Days = metrics.reduce((sum, item) => sum + item.last7Days, 0);
    const mostActive = [...metrics].sort((a, b) => b.responses - a.responses)[0]?.title || 'Sem dados';
    return { totalResponses, avgResponses, totalLast7Days, mostActive };
  }, [metrics, forms.length]);

  const filteredMetrics = useMemo(() => {
    return metrics.filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [metrics, searchTerm]);

  const topForms = [...metrics].sort((a, b) => b.responses - a.responses).slice(0, 5);

  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-sky-500" size={48} />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Consolidando métricas de formulários...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20 px-4 max-w-7xl mx-auto">
      
      {/* PREMIUM HERO HEADER */}
      <div className="relative overflow-hidden rounded-[40px] p-8 md:p-12 bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.15),transparent)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.1),transparent)]"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="max-w-xl">
                <button
                    onClick={() => navigate('/formularios')}
                    className="group mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-white/60 text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/10 hover:text-white transition-all active:scale-95"
                >
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform"/> 
                    Voltar para formulários
                </button>

                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">
                    <Activity size={12} />
                    <span>Analytics e Performance</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-display font-black text-white mb-4 leading-tight tracking-tight">
                    Performance de <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Dados Clínicos</span>
                </h1>
                <p className="text-slate-400 text-lg leading-relaxed font-medium">
                    Visualize o engajamento e a adesão aos questionários clínicos em tempo real.
                </p>
            </div>

            <div className="flex flex-col gap-3 w-full md:w-auto">
                <button
                    onClick={() => navigate('/formularios/respostas')}
                    className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-white text-slate-900 font-black text-xs uppercase tracking-widest hover:bg-sky-50 transition-all shadow-xl shadow-white/5 active:scale-95"
                >
                    <ClipboardList size={20} />
                    Visualizar Respostas
                </button>
            </div>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIMetricCard 
           label="Total de Documentos" 
           value={forms.length} 
           icon={<ListChecks size={22}/>} 
           color="sky"
        />
        <KPIMetricCard 
           label="Total de Respostas" 
           value={totals.totalResponses} 
           icon={<MessageSquare size={22}/>} 
           color="indigo"
           trend="+12%"
        />
        <KPIMetricCard 
           label="Atividade (7 dias)" 
           value={totals.totalLast7Days} 
           icon={<Zap size={22}/>} 
           color="orange"
           isFresh
        />
        <KPIMetricCard 
           label="Média p/ Form." 
           value={totals.avgResponses} 
           icon={<TrendingUp size={22}/>} 
           color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* LEFT COMPONENT: TOP FORMS */}
        <div className="lg:col-span-3 bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 flex flex-col h-full">
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <TrendingUp size={20} className="text-indigo-600" /> 
                        Formulários em Destaque
                    </h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Maiores volumes de engajamento</p>
                </div>
            </div>

            <div className="space-y-6 flex-1">
                {topForms.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 opacity-50 py-20">
                        <BarChart3 size={48} />
                        <p className="font-bold text-xs uppercase tracking-widest">Sem dados disponíveis</p>
                    </div>
                ) : (
                    topForms.map((item, i) => {
                        const width = totals.totalResponses ? Math.min(100, Math.round((item.responses / totals.totalResponses) * 100) * 2) : 0;
                        return (
                            <div key={item.id} className="group relative">
                                <div className="flex items-center justify-between text-sm font-black text-slate-800 mb-2.5 px-1">
                                    <span className="flex items-center gap-3">
                                        <span className="text-[10px] text-slate-300 w-4">0{i+1}</span>
                                        {item.title}
                                    </span>
                                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg text-[10px]">{item.responses} respostas</span>
                                </div>
                                <div className="h-4 w-full rounded-full bg-slate-50 border border-slate-100 overflow-hidden relative">
                                    <div 
                                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 shadow-lg shadow-indigo-100 transition-all duration-1000 ease-out" 
                                        style={{ width: `${width}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            <div className="mt-10 p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group cursor-pointer hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <ArrowUpRight size={16}/>
                    </div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none pt-1">Relatórios Detalhados</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform"/>
            </div>
        </div>

        {/* RIGHT COMPONENT: RECENT ACTIVITY */}
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <Clock size={20} className="text-slate-700" /> 
                        Atividade Recente
                    </h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Últimas interações registradas</p>
                </div>
            </div>

            {/* SEARCH INSIDE COMPONENT */}
            <div className="relative mb-6">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Filtrar por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-[10px] font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-sky-50 focus:border-sky-200 transition-all outline-none"
                />
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                {filteredMetrics.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest italic">
                        Nenhum resultado
                    </div>
                ) : (
                    filteredMetrics.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-50 hover:border-sky-100 hover:shadow-md transition-all group">
                            <div className="min-w-0">
                                <p className="text-xs font-black text-slate-800 truncate mb-1">{item.title}</p>
                                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 uppercase tracking-tighter">
                                    <Calendar size={12} className="text-slate-300" /> 
                                    {item.lastResponseAt || 'Nenhuma'}
                                </p>
                            </div>
                            <div className="px-3 py-1.5 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                                {item.responses}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

const KPIMetricCard = ({ label, value, icon, color, trend, isFresh }: any) => {
    const colors: any = {
        sky: 'bg-sky-50 text-sky-600 ring-sky-100',
        indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
        orange: 'bg-orange-50 text-orange-600 ring-orange-100',
        emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    };

    return (
        <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group relative overflow-hidden">
            {isFresh && (
                <div className="absolute -right-8 -top-8 w-24 h-24 bg-orange-400/5 rounded-full blur-2xl group-hover:bg-orange-400/10 active:transition-all"></div>
            )}
            
            <div className="flex justify-between items-start mb-6">
                <div className={`p-3.5 rounded-2xl ring-1 shadow-sm ${colors[color]} group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                {trend && (
                    <span className="text-[9px] font-black px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg flex items-center gap-1">
                        <TrendingUp size={10}/> {trend}
                    </span>
                )}
            </div>
            
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">{label}</p>
            <h3 className="text-3xl font-black text-slate-800">{value}</h3>
        </div>
    );
};
