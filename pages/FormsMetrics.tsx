
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ClinicalForm } from '../types';
import { BarChart3, TrendingUp, Clock, Calendar, Loader2, Zap, MessageSquare, ListChecks, ArrowUpRight } from 'lucide-react';
import { PageWrapper, SectionTitle, StatGrid, StatCard, PanelCard, Button, EmptyState, FilterLine, FilterLineSection, FilterLineSearch } from '../components/UI';
import { FormsTabs } from '../components/Forms/FormsTabs';

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
              .map((r) => {
                let dateStr = r.created_at;
                if (dateStr && dateStr.includes(' ') && !dateStr.includes('T') && !dateStr.includes('Z')) {
                  dateStr = dateStr.replace(' ', 'T') + 'Z';
                } else if (dateStr && !dateStr.includes('Z') && !dateStr.includes('+') && dateStr.includes('T')) {
                  dateStr = dateStr + 'Z';
                }
                return new Date(dateStr);
              })
              .sort((a, b) => b.getTime() - a.getTime());
            const lastResponseAt = sorted[0]
              ? sorted[0].toLocaleString('pt-BR', { 
                  day: '2-digit', 
                  month: 'short', 
                  hour: '2-digit', 
                  minute: '2-digit',
                  timeZone: 'America/Sao_Paulo'
                })
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
      <PageWrapper>
        <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin" />Consolidando métricas de formulários...
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={BarChart3}
          title="Performance de Dados Clínicos"
          description="Visualize o engajamento e a adesão aos questionários clínicos."
          action={
            <Button variant="outline" size="sm" iconLeft={<ArrowUpRight size={14} />} onClick={() => navigate('/formularios/respostas')}>
              Visualizar respostas
            </Button>
          }
        />

        <StatGrid cols={4}>
          <StatCard title="Total de documentos" value={forms.length} icon={ListChecks} color="info" />
          <StatCard title="Total de respostas" value={totals.totalResponses} icon={MessageSquare} />
          <StatCard title="Atividade (7 dias)" value={totals.totalLast7Days} icon={Zap} color="warning" />
          <StatCard title="Média por formulário" value={totals.avgResponses} icon={TrendingUp} color="success" />
        </StatGrid>

        <FormsTabs />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <PanelCard
            title="Formulários em destaque"
            description="Maiores volumes de engajamento"
            className="lg:col-span-3"
          >
            {topForms.length === 0 ? (
              <EmptyState icon={BarChart3} title="Sem dados disponíveis" />
            ) : (
              <div className="space-y-3">
                {topForms.map((item, i) => {
                  const width = totals.totalResponses ? Math.min(100, Math.round((item.responses / totals.totalResponses) * 100) * 2) : 0;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className="block w-full text-left hover:opacity-80 transition-opacity"
                      onClick={() => navigate(`/formularios/${item.id}/respostas`)}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-800 mb-1.5">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] text-slate-400 w-4 shrink-0">0{i + 1}</span>
                          <span className="truncate">{item.title}</span>
                        </span>
                        <span className="text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md text-[11px] shrink-0">{item.responses} respostas</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-primary-500 transition-all duration-700" style={{ width: `${width}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </PanelCard>

          <PanelCard
            title="Atividade recente"
            description="Últimas interações registradas"
            className="lg:col-span-2"
          >
            <div className="space-y-3">
              <FilterLine>
                <FilterLineSection grow>
                  <FilterLineSearch
                    aria-label="Filtrar formulários por nome"
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Filtrar por nome..."
                  />
                </FilterLineSection>
              </FilterLine>

              <div className="space-y-2 overflow-y-auto max-h-[400px]">
                {filteredMetrics.length === 0 ? (
                  <EmptyState icon={Clock} title="Nenhum resultado" />
                ) : (
                  filteredMetrics.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => navigate(`/formularios/${item.id}/respostas`)}
                      className="flex w-full items-center justify-between gap-3 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-primary-200 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{item.title}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Calendar size={11} className="text-slate-400" />
                          {item.lastResponseAt || 'Nenhuma'}
                        </p>
                      </div>
                      <div className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[11px] font-medium shrink-0">
                        {item.responses}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </PageWrapper>
  );
};
