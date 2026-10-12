import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, Users, Calendar, Star, Medal, Crown, ArrowUpRight, DollarSign, Loader2, AlertCircle, FileText, UserRound, CalendarClock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Alert,
  Button,
  ContentCard,
  EmptyState,
  FilterLine,
  FilterLineItem,
  FilterLineSearch,
  FilterLineSection,
  FilterLineSegmented,
  PageWrapper,
  SectionTitle,
  StatCard,
  StatGrid,
  Tabs,
} from '../components/UI';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const METRIC_TABS = [
  { id: 'revenue', label: 'Por receita', icon: DollarSign },
  { id: 'appointments', label: 'Por presença', icon: Calendar },
] as const;

const PERIOD_OPTIONS = [
  { value: 'week', label: '7 dias' },
  { value: 'month', label: 'Mês' },
  { value: 'year', label: 'Ano' },
  { value: 'all', label: 'Histórico' },
] as const;

const formatShortDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};

export const BestClients: React.FC = () => {
  const navigate = useNavigate();
  const [metric, setMetric] = useState<typeof METRIC_TABS[number]['id']>('revenue');
  const [period, setPeriod] = useState('all');
  const [topN, setTopN] = useState<5 | 10 | 30>(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await api.get<any>('/finance/analytics/best-clients?period=' + period);
        setClients(Array.isArray(result) ? result : (result?.clients || []));
        setError(null);
      } catch (err: any) {
        setError('Ocorreu um erro ao carregar o ranking de clientes.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  // --- LOGIC ---
  const sortedClients = useMemo(() => {
    let data = [...clients];

    // Filter by Search
    if (searchTerm) {
      data = data.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Filter zeros: receita esconde R$0, presença esconde 0 sessões
    if (metric === 'revenue') {
      data = data.filter(c => Number(c.totalRevenue) > 0);
    } else {
      data = data.filter(c => Number(c.appointmentCount) > 0);
    }

    // Sort by Metric
    data.sort((a, b) => {
      if (metric === 'revenue') return Number(b.totalRevenue) - Number(a.totalRevenue);
      return Number(b.appointmentCount) - Number(a.appointmentCount);
    });

    return data.slice(0, topN);
  }, [metric, topN, searchTerm, clients]);

  const maxVal = metric === 'revenue' ? sortedClients[0]?.totalRevenue : sortedClients[0]?.appointmentCount;

  // Stats
  const totalClients = clients.length;
  const newClientsMonth = clients.filter(c => {
    const sinceDate = new Date(c.since);
    const now = new Date();
    return sinceDate.getMonth() === now.getMonth() && sinceDate.getFullYear() === now.getFullYear();
  }).length;

  const avgTicket = useMemo(() => {
    const totalRev = clients.reduce((acc, c) => acc + (Number(c.totalRevenue) || 0), 0);
    const totalApps = clients.reduce((acc, c) => acc + (Number(c.appointmentCount) || 0), 0);
    return totalApps > 0 ? totalRev / totalApps : 0;
  }, [clients]);

  const clientsWithoutNextAppointment = useMemo(
    () => clients.filter(client => !client.nextAppointment).length,
    [clients],
  );

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown size={18} className="text-yellow-500 fill-yellow-500" />;
    if (index === 1) return <Medal size={18} className="text-slate-400 fill-slate-400" />;
    if (index === 2) return <Medal size={18} className="text-amber-700 fill-amber-700" />;
    return <span className="text-xs font-medium text-slate-400 w-6 text-center">{index + 1}º</span>;
  };

  if (loading) {
    return (
      <PageWrapper>
        <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin" />Carregando ranking de clientes…
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <ContentCard>
          <EmptyState
            icon={AlertCircle}
            title={error}
            description="Confira a conexão e tente novamente."
            action={<Button type="button" variant="outline" size="sm" onClick={() => window.location.reload()}>Tentar novamente</Button>}
          />
        </ContentCard>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={Trophy}
          title="Relacionamento com pacientes"
          description="Priorize acompanhamento, agenda e prontuário a partir de presença e receita real"
        />

        {/* STATS BAR */}
        <StatGrid cols={3}>
          <StatCard title="Pacientes no período" value={totalClients} description="Com sessão ou pagamento registrado" icon={Users} color="default" />
          <StatCard title="Sem próximo atendimento" value={clientsWithoutNextAppointment} description="Revise o vínculo e a agenda" icon={CalendarClock} color="warning" />
          <StatCard title="Receita por sessão" value={formatCurrency(avgTicket)} description={`${newClientsMonth} novos cadastros neste mês`} icon={DollarSign} color="success" />
        </StatGrid>

        {/* VISÕES */}
        <Tabs<typeof METRIC_TABS[number]['id']> items={METRIC_TABS} value={metric} onChange={setMetric} label="Métrica do ranking" />

        {/* FILTERS & SEARCH */}
        <FilterLine>
          <FilterLineSection grow>
            <FilterLineItem grow minWidth={200}>
              <FilterLineSearch
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Pesquisar paciente..."
                aria-label="Pesquisar paciente"
              />
            </FilterLineItem>
          </FilterLineSection>
          <FilterLineSection align="right">
            <FilterLineSegmented<'week' | 'month' | 'year' | 'all'>
              value={period as 'week' | 'month' | 'year' | 'all'}
              onChange={setPeriod}
              options={[...PERIOD_OPTIONS]}
              size="sm"
            />
            <FilterLineSegmented<'5' | '10' | '30'>
              value={String(topN) as '5' | '10' | '30'}
              onChange={(v) => setTopN(Number(v) as 5 | 10 | 30)}
              options={[
                { value: '5', label: 'Top 5' },
                { value: '10', label: 'Top 10' },
                { value: '30', label: 'Top 30' },
              ]}
              size="sm"
            />
          </FilterLineSection>
        </FilterLine>

        {/* --- RANKING GRID --- */}
        {sortedClients.length === 0 ? (
          <ContentCard>
            <EmptyState icon={Trophy} title="Nenhum paciente no ranking" description="Ajuste a busca ou aguarde novos atendimentos." />
          </ContentCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {sortedClients.map((client, index) => {
              const percentage = Math.round(((metric === 'revenue' ? client.totalRevenue : client.appointmentCount) / (maxVal || 1)) * 100);
              const rankTone =
                index === 0 ? 'border-yellow-300 bg-yellow-50/40'
                : index === 1 ? 'border-slate-300 bg-slate-50/50'
                : index === 2 ? 'border-amber-200 bg-amber-50/30'
                : 'border-slate-200 bg-white';

              return (
                <div
                  key={client.id}
                  className={`relative overflow-hidden rounded-lg border p-3 lg:p-4 transition-colors hover:border-primary-200 ${rankTone}`}
                >
                  {/* Rank Indicator */}
                  <div className="absolute top-3 right-3 opacity-70">
                    {getRankIcon(index)}
                  </div>

                  <div className="flex items-center gap-3 mb-3 pr-8">
                    <div className="h-10 w-10 shrink-0 rounded-lg border border-primary-100 bg-primary-50 flex items-center justify-center text-primary-700 text-sm font-medium">
                      {client.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-slate-800 text-sm leading-tight truncate">{client.name}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">#{String(client.id)}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 mb-3">
                    <p className="text-[11px] text-slate-500 mb-1">{metric === 'revenue' ? 'Receita recebida' : 'Sessões concluídas'}</p>
                    <div className="flex items-end justify-between">
                      <span className={`text-base font-medium ${metric === 'revenue' ? 'text-emerald-600' : 'text-primary-600'}`}>
                        {metric === 'revenue' ? formatCurrency(client.totalRevenue) : client.appointmentCount}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <ArrowUpRight size={14} className="text-emerald-500" />
                        {percentage}%
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${metric === 'revenue' ? 'bg-emerald-500' : 'bg-primary-500'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-primary-500" />
                        {client.nextAppointment
                          ? `Próximo: ${formatShortDate(client.nextAppointment)}`
                          : 'Sem próximo atendimento'}
                      </div>
                      {Number(client.missedCount) > 0 && (
                        <span className="flex items-center gap-1 font-medium text-amber-700">
                          <AlertTriangle size={13} /> {client.missedCount} falta{Number(client.missedCount) > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">Última sessão: {formatShortDate(client.lastVisit) || 'sem registro'}</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      <Button type="button" variant="outline" size="xs" iconLeft={<UserRound size={13} />} onClick={() => navigate(`/pacientes/${client.id}`)}>
                        Perfil
                      </Button>
                      <Button type="button" variant="outline" size="xs" iconLeft={<Calendar size={13} />} onClick={() => navigate(`/agenda?patient_id=${client.id}`)}>
                        Agenda
                      </Button>
                      <Button type="button" variant="ghost" size="xs" iconLeft={<FileText size={13} />} onClick={() => navigate(`/prontuario?patient_id=${client.id}`)}>
                        Prontuário
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
};
