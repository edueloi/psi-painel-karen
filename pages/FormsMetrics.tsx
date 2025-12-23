import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ClinicalForm } from '../types';
import { ArrowLeft, BarChart3, TrendingUp, Clock, ClipboardList } from 'lucide-react';

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

  const topForms = [...metrics].sort((a, b) => b.responses - a.responses).slice(0, 6);

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-10">
      <div className="relative overflow-hidden rounded-[26px] p-6 md:p-10 bg-slate-900 border border-slate-700/40 shadow-[0_22px_45px_-20px_rgba(15,23,42,0.6)]">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900"></div>
        <div className="absolute -top-[60px] -right-[40px] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/formularios/respostas')}
              className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold border border-white/10 hover:bg-white/20"
            >
              Ver todas respostas
            </button>
          </div>
          <button
            onClick={() => navigate('/formularios')}
            className="w-fit inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold border border-white/10 hover:bg-white/20"
          >
            <ArrowLeft size={16} /> Voltar para visao geral
          </button>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-white/10 border border-white/10 text-indigo-200 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
              <BarChart3 size={12} className="text-sky-400" />
              <span>Resultados e metricas</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-slate-50 mb-3 leading-tight">
              Desempenho dos formularios
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed max-w-2xl">
              Acompanhe volume de respostas, formularios mais usados e o ritmo da ultima semana.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">Formularios</p>
          <p className="text-2xl font-extrabold text-slate-800">{forms.length}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">Total de respostas</p>
          <p className="text-2xl font-extrabold text-indigo-600">{totals.totalResponses}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">Ultimos 7 dias</p>
          <p className="text-2xl font-extrabold text-emerald-600">{totals.totalLast7Days}</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase">Media por formulario</p>
          <p className="text-2xl font-extrabold text-slate-700">{totals.avgResponses}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-600" /> Formularios mais ativos
            </h2>
            <span className="text-xs text-slate-400 font-semibold">Top 6</span>
          </div>
          {isLoading ? (
            <div className="text-sm text-slate-400">Carregando...</div>
          ) : topForms.length === 0 ? (
            <div className="text-sm text-slate-400">Sem dados ainda.</div>
          ) : (
            <div className="space-y-3">
              {topForms.map((item) => {
                const width = totals.totalResponses ? Math.round((item.responses / totals.totalResponses) * 100) : 0;
                return (
                  <div key={item.id} className="rounded-2xl border border-slate-100 p-3">
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
                      <span className="line-clamp-1">{item.title}</span>
                      <span className="text-xs text-slate-400">{item.responses} resp.</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${width}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList size={18} className="text-slate-700" /> Ultimas respostas por formulario
          </h2>
          {isLoading ? (
            <div className="text-sm text-slate-400">Carregando...</div>
          ) : metrics.length === 0 ? (
            <div className="text-sm text-slate-400">Sem respostas ainda.</div>
          ) : (
            <div className="space-y-3">
              {metrics.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{item.title}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={12} /> {item.lastResponseAt || 'Sem respostas'}
                    </p>
                  </div>
                  <div className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                    {item.responses} resp.
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
