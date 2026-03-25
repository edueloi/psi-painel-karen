import React, { useState, useMemo, useEffect } from 'react';
import { Trophy, TrendingUp, Users, Calendar, Filter, Star, Medal, Crown, ArrowUpRight, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { PageHeader } from '../components/UI/PageHeader';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const BestClients: React.FC = () => {
  const [metric, setMetric] = useState<'revenue' | 'appointments'>('revenue');
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
        const data = await api.get<any[]>('/finance/analytics/best-clients');
        
        // Add avatar colors based on name hash or just index
        const colors = ['bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-amber-600', 'bg-indigo-600', 'bg-pink-600'];
        const processedData = data.map((c, i) => ({
          ...c,
          avatarColor: colors[i % colors.length]
        }));

        setClients(processedData);
        setError(null);
      } catch (err: any) {
        setError('Ocorreu um erro ao carregar o ranking de clientes.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const getRankIcon = (index: number) => {
      if (index === 0) return <Crown size={24} className="text-yellow-500 fill-yellow-500 animate-pulse" />;
      if (index === 1) return <Medal size={24} className="text-slate-400 fill-slate-400" />;
      if (index === 2) return <Medal size={24} className="text-amber-700 fill-amber-700" />;
      return <span className="text-lg font-bold text-slate-400 w-6 text-center">{index + 1}º</span>;
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Carregando inteligência de mercado...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <AlertCircle className="text-rose-500" size={48} />
        <p className="text-slate-500 font-bold">{error}</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest">Tentar Novamente</button>
      </div>
    );
  }

  const getRankColor = (index: number) => {
      if (index === 0) return 'border-yellow-400 bg-yellow-50/30';
      if (index === 1) return 'border-slate-300 bg-slate-50/30';
      if (index === 2) return 'border-amber-600/30 bg-amber-50/30';
      return 'border-slate-100 bg-white';
  };

  return (
    <div className="mx-auto max-w-[1600px] px-6 pt-6 pb-20 space-y-6">
      <PageHeader
        icon={<Trophy />}
        title="Melhores Clientes"
        subtitle="Ranking de pacientes por faturamento e recorrência"
        iconGradient="from-amber-600 to-amber-100"
        containerClassName="mb-0 text-amber-600"
        actions={
          <div className="flex gap-2">
              <button 
                onClick={() => setMetric(metric === 'revenue' ? 'appointments' : 'revenue')}
                className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-sm hover:border-indigo-200 transition-all active:scale-95 tracking-widest"
              >
                {metric === 'revenue' ? <Calendar size={16} /> : <DollarSign size={16} />} 
                ALTERNAR MÉTRICA
              </button>
          </div>
        }
      />

      {/* STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Users size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pacientes</p>
                  <p className="text-xl font-black text-slate-800">{totalClients}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-amber-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <Star size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black tracking-widest text-amber-500 uppercase">Novos (Mês)</p>
                  <p className="text-xl font-black text-slate-800">+{newClientsMonth}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <DollarSign size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black tracking-widest text-emerald-500 uppercase">Ticket Médio</p>
                  <p className="text-xl font-black text-slate-800">{formatCurrency(avgTicket)}</p>
              </div>
          </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96 group">
              <Star className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors" size={18} />
              <input 
                  type="text" 
                  placeholder="Pesquisar paciente..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-amber-200 transition-all placeholder:text-slate-400" 
              />
          </div>

          <div className="flex gap-3 w-full lg:w-auto">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl flex-1 lg:flex-none">
                  {[
                      { id: 'revenue', label: 'Por Receita', icon: <DollarSign size={14}/> },
                      { id: 'appointments', label: 'Por Presença', icon: <Calendar size={14}/> }
                  ].map(mt => (
                      <button 
                          key={mt.id}
                          onClick={() => setMetric(mt.id as any)}
                          className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${metric === mt.id ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-emerald-400'}`}
                      >
                          {mt.icon}
                          {mt.label}
                      </button>
                  ))}
              </div>

              <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl">
                  {[5, 10, 30].map(val => (
                      <button 
                          key={val}
                          onClick={() => setTopN(val as any)}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${topN === val ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                      >
                          Top {val}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* --- RANKING GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedClients.map((client, index) => {
              const percentage = Math.round(((metric === 'revenue' ? client.totalRevenue : client.appointmentCount) / (maxVal || 1)) * 100);
              const isTop3 = index < 3;

              return (
                  <div 
                    key={client.id} 
                    className={`
                        relative overflow-hidden rounded-[2.5rem] p-7 border transition-all duration-500 group
                        ${index === 0 ? 'bg-amber-50/20 border-amber-200' : 'bg-white border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1'}
                        ${index === 1 ? 'bg-slate-50/50 border-slate-200' : ''}
                        ${index === 2 ? 'bg-orange-50/10 border-orange-100' : ''}
                    `}
                  >
                      {/* Rank Indicator */}
                      <div className="absolute top-6 right-6 opacity-40">
                         {getRankIcon(index)}
                      </div>

                      <div className="flex items-center gap-4 mb-8">
                          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white text-base font-black shadow-lg ${client.avatarColor}`}>
                              {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <div>
                              <h3 className="font-black text-slate-800 text-sm leading-tight">{client.name}</h3>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">#{String(client.id)}</p>
                          </div>
                      </div>

                      <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100 mb-6">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{metric === 'revenue' ? 'Receita Total' : 'Sessões Realizadas'}</p>
                          <div className="flex items-end justify-between">
                              <span className={`text-2xl font-black ${metric === 'revenue' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                  {metric === 'revenue' ? formatCurrency(client.totalRevenue) : client.appointmentCount}
                              </span>
                              <div className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                                  <ArrowUpRight size={14} className="text-emerald-500"/>
                                  {percentage}%
                              </div>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-1000 ${metric === 'revenue' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                          </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-black text-slate-400 px-1 border-t border-slate-50 pt-5">
                          <div className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-indigo-400"/>
                              DESDE {client.since ? new Date(client.since).getFullYear() : '-'}
                          </div>
                          <button className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 uppercase tracking-widest text-[9px]">
                              DETALHES <ArrowUpRight size={12}/>
                          </button>
                      </div>
                  </div>
              );
          })}
      </div>
    </div>
  );
};