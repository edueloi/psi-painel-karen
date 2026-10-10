
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart2, TrendingUp, TrendingDown, Calendar, Users, Clock, 
  DollarSign, Activity, ChevronDown, Briefcase, Filter, PieChart,
  Loader2, AlertCircle, ArrowUpRight, Sparkles, Zap, Trophy,
  ChevronRight, CalendarDays
} from 'lucide-react';
import { api } from '../services/api';
import {
  Button,
  EmptyState,
  FilterLineSegmented,
  PageWrapper,
  PanelCard,
  SectionTitle,
  StatCard,
  StatGrid,
  Tabs,
} from '../components/UI';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const PERIOD_OPTIONS = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'year', label: 'Ano' },
];

const PERFORMANCE_TABS = [
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'clientes', label: 'Clientes', icon: Trophy },
] as const;

type PerformanceTab = (typeof PERFORMANCE_TABS)[number]['id'];

const dayNamesShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

export const Performance: React.FC = () => {
  const [period, setPeriod] = useState('month'); // week, month, year
  const [activeTab, setActiveTab] = useState<PerformanceTab>('financeiro');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [bestClients, setBestClients] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [perfResult, clientsResult] = await Promise.all([
            api.get<any>(`/finance/analytics/performance?period=${period}`),
            api.get<any[]>('/finance/analytics/best-clients')
        ]);
        setData(perfResult);
        setBestClients(clientsResult || []);
        setError(null);
      } catch (err: any) {
        setError('Erro ao carregar dados de performance.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  const maxVal = useMemo(() => {
    if (!data?.series?.length) return 1;
    return Math.max(...data.series.map((d: any) => Math.max(Number(d.income) || 0, Number(d.expense) || 0)));
  }, [data]);

  const maxHours = useMemo(() => {
    if (!data?.hoursSeries?.length) return 1;
    return Math.max(...data.hoursSeries.map((d: any) => Number(d.hours) || 0));
  }, [data]);

  const maxPeak = useMemo(() => {
    if (!data?.peakDays?.length) return 1;
    return Math.max(...data.peakDays.map((d: any) => Number(d.count) || 0));
  }, [data]);

  const maxPeakHours = useMemo(() => {
    if (!data?.peakHours?.length) return 1;
    return Math.max(...data.peakHours.map((d: any) => Number(d.count) || 0));
  }, [data]);

  if (loading) {
    return (
      <PageWrapper>
        <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin" />
          Analisando métricas de performance...
        </div>
      </PageWrapper>
    );
  }

  if (error || !data) {
    return (
      <PageWrapper>
        <PanelCard>
          <EmptyState
            icon={AlertCircle}
            title={error || 'Nenhum dado encontrado'}
            description="Confira a conexão e tente novamente."
            action={
              <Button variant="outline" onClick={() => window.location.reload()}>
                Tentar novamente
              </Button>
            }
          />
        </PanelCard>
      </PageWrapper>
    );
  }

  const { totals, series, hoursSeries, peakDays, peakHours } = data;

  return (
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={BarChart2}
          title="Performance e Analytics"
          description="Indicadores estratégicos para gestão da sua clínica"
          action={
            <FilterLineSegmented
              size="sm"
              value={period}
              onChange={setPeriod}
              options={PERIOD_OPTIONS}
            />
          }
        />

        <StatGrid cols={4}>
          <StatCard title="Faturamento Bruto" value={formatCurrency(totals.income)} icon={DollarSign} color="success" />
          <StatCard title="Horas em Atendimento" value={`${totals.total_hours.toFixed(1)}h`} description="Horas reais" icon={Clock} />
          <StatCard title="Lucro Líquido" value={formatCurrency(totals.profit)} icon={TrendingUp} color="info" />
          <StatCard
            title="Aproveitamento"
            value={`${(totals.income > 0 ? (totals.profit / totals.income) * 100 : 0).toFixed(1)}%`}
            icon={PieChart}
            color="warning"
          />
        </StatGrid>

        <Tabs<PerformanceTab>
          items={PERFORMANCE_TABS}
          value={activeTab}
          onChange={setActiveTab}
          label="Seções de performance"
        >
          {activeTab === 'financeiro' && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 [&>*]:min-w-0">
              <PanelCard
                title="Fluxo de caixa"
                description="Evolução de receitas e despesas"
                icon={TrendingUp}
                action={
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Receita</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" />Despesa</span>
                  </div>
                }
              >
                <div className="relative flex h-64 items-end gap-2 px-2 pb-8">
                  <div className="pointer-events-none absolute inset-x-2 inset-y-0 flex flex-col justify-between pb-8">
                    {[1, 2, 3, 4, 5].map((i) => <div key={i} className="w-full border-t border-slate-200" />)}
                  </div>

                  {series.map((d: any, i: number) => (
                    <div key={i} className="group relative z-10 flex h-full flex-1 items-end justify-center gap-0.5">
                      <div
                        className="w-full max-w-[12px] rounded-t bg-emerald-500 transition-all duration-500 group-hover:bg-emerald-600"
                        style={{ height: `${(d.income / maxVal) * 100}%` }}
                      />
                      <div
                        className="w-full max-w-[12px] rounded-t bg-rose-400 transition-all duration-500 group-hover:bg-rose-500"
                        style={{ height: `${(d.expense / maxVal) * 100}%` }}
                      />
                      <div className="absolute -bottom-6 left-1/2 origin-left -translate-x-1/2 text-[10px] text-slate-400 whitespace-nowrap">
                        {d.label.split('-').pop()}
                      </div>
                    </div>
                  ))}
                </div>
              </PanelCard>

              <PanelCard
                title="Carga horária"
                description="Horas de atendimento realizadas"
                icon={Clock}
                action={<span className="text-[11px] font-medium text-primary-700">{totals.total_hours.toFixed(1)}h totais</span>}
              >
                <div className="relative flex h-64 items-end gap-3 px-2 pb-8">
                  <div className="pointer-events-none absolute inset-x-2 inset-y-0 flex flex-col justify-between pb-8">
                    {[1, 2, 3, 4, 5].map((i) => <div key={i} className="w-full border-t border-slate-200" />)}
                  </div>

                  {hoursSeries && hoursSeries.map((d: any, i: number) => (
                    <div key={i} className="group relative z-10 flex h-full flex-1 items-end justify-center">
                      <div
                        className="w-full max-w-[16px] rounded-t bg-primary-400 transition-all duration-500 group-hover:bg-primary-600"
                        style={{ height: `${(d.hours / maxHours) * 100}%` }}
                      />
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 whitespace-nowrap">
                        {d.label.split('-').pop()}
                      </div>
                    </div>
                  ))}
                </div>
              </PanelCard>
            </div>
          )}

          {activeTab === 'agenda' && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 [&>*]:min-w-0">
              <PanelCard title="Dias de pico" description="Sazonalidade semanal" icon={Zap}>
                <div className="flex h-56 items-end gap-3 px-1">
                  {dayNamesShort.map((name, i) => {
                    const dayIdx = i + 1; // MySQL DAYOFWEEK is 1-7
                    const dataDay = peakDays?.find((d: any) => d.day_index === dayIdx);
                    const count = dataDay ? dataDay.count : 0;
                    const pct = (count / (maxPeak || 1)) * 100;

                    return (
                      <div key={name} className="flex h-full flex-1 flex-col items-center gap-2">
                        <div className="flex w-full flex-1 items-end justify-center px-0.5">
                          <div
                            className={`w-full rounded transition-all duration-700 ${count === maxPeak ? 'bg-primary-600' : 'border border-slate-200 bg-slate-100'}`}
                            style={{ height: count > 0 ? `${pct}%` : '8px' }}
                          />
                        </div>
                        <span className={`text-[11px] ${count === maxPeak ? 'font-medium text-primary-700' : 'text-slate-500'}`}>{name}</span>
                      </div>
                    );
                  })}
                </div>
              </PanelCard>

              <PanelCard
                title="Horários de pico"
                description="Distribuição por hora"
                icon={Clock}
                action={<span className="text-[11px] font-medium text-primary-700">8h - 21h</span>}
              >
                <div className="flex h-56 items-end gap-1 px-1">
                  {Array.from({ length: 14 }, (_, i) => i + 8).map((hour) => {
                    const dataHour = peakHours?.find((d: any) => d.hour === hour);
                    const count = dataHour ? dataHour.count : 0;
                    const pct = (count / (maxPeakHours || 1)) * 100;

                    return (
                      <div key={hour} className="group flex h-full flex-1 flex-col items-center gap-2">
                        <div className="relative flex w-full flex-1 items-end overflow-hidden rounded border border-slate-100 bg-slate-50">
                          <div
                            className="w-full rounded-t bg-primary-500 opacity-80 transition-all group-hover:opacity-100"
                            style={{ height: count > 0 ? `${pct}%` : '4px' }}
                          />
                          {count > 0 && (
                            <div className="pointer-events-none absolute left-0 top-1 w-full text-center opacity-0 transition-opacity group-hover:opacity-100">
                              <span className="rounded-full border border-primary-100 bg-white px-1.5 py-0.5 text-[10px] font-medium text-primary-700">{count}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">{hour}h</span>
                      </div>
                    );
                  })}
                </div>
              </PanelCard>
            </div>
          )}

          {activeTab === 'clientes' && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 [&>*]:min-w-0">
              <PanelCard title="Melhores clientes" description="Ranking por faturamento" icon={Trophy}>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {bestClients.length === 0 ? (
                    <EmptyState icon={Trophy} title="Nenhum dado real" description="O ranking aparece quando houver faturamento no período." />
                  ) : (
                    bestClients.slice(0, 10).map((client, idx) => (
                      <div key={client.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3 transition-colors hover:bg-white">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-5 text-[11px] text-slate-400">#{idx + 1}</span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-slate-800">{client.name}</p>
                            <p className="text-[11px] text-slate-500">{client.appointmentCount} sessões</p>
                          </div>
                        </div>
                        <p className="shrink-0 text-xs font-semibold tabular-nums text-emerald-700">{formatCurrency(client.totalRevenue)}</p>
                      </div>
                    ))
                  )}
                </div>
              </PanelCard>

              <PanelCard title="Métricas extras" icon={Activity}>
                <div className="space-y-2">
                  <EffortItem label="Dias em clínica" value={`${totals.worked_days || 0} dias`} icon={<Calendar size={14} />} />
                  <EffortItem
                    label="Carga média por dia"
                    value={`${totals.worked_days > 0 ? (totals.total_hours / totals.worked_days).toFixed(1) : 0}h`}
                    icon={<Clock size={14} />}
                  />
                  <EffortItem
                    label="Ticket médio"
                    value={formatCurrency(totals.sessions > 0 ? totals.income / totals.sessions : 0)}
                    icon={<Zap size={14} />}
                  />

                  <div className="border-t border-slate-100 pt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Saúde operacional</span>
                      <span className="text-[11px] font-medium text-emerald-700">Estável</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-2 w-[82%] rounded-full bg-emerald-500" />
                    </div>
                  </div>
                </div>
              </PanelCard>
            </div>
          )}
        </Tabs>
      </div>
    </PageWrapper>
  );
};

const EffortItem = ({ label, value, icon }: any) => (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
        {icon}
      </div>
      <p className="text-xs text-slate-600">{label}</p>
    </div>
    <p className="text-[13px] font-medium text-slate-800">{value}</p>
  </div>
);
