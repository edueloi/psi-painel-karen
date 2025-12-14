import React, { useState, useMemo } from 'react';
import { Trophy, TrendingUp, Users, Calendar, Filter, Star, Medal, Crown, ArrowUpRight, DollarSign } from 'lucide-react';

// --- MOCK DATA GENERATOR FOR RANKING ---
// Creating a larger dataset to demonstrate ranking capabilities
const generateRankingData = () => {
  const names = [
    "Ana Silva", "Bruno Santos", "Carla Dias", "Daniel Oliveira", "Eduarda Costa",
    "Felipe Pereira", "Gabriela Martins", "Henrique Souza", "Isabela Lima", "João Ferreira",
    "Karina Alves", "Lucas Rocha", "Mariana Gomes", "Nicolas Ribeiro", "Olivia Carvalho",
    "Pedro Mendes", "Quintino Ramos", "Rafael Teixeira", "Sophia Nunes", "Thiago Barbosa"
  ];

  return names.map((name, i) => ({
    id: `cli-${i}`,
    name,
    totalRevenue: Math.floor(Math.random() * 8000) + 1200, // Revenue between 1200 and 9200
    appointmentCount: Math.floor(Math.random() * 40) + 5, // 5 to 45 appointments
    lastVisit: new Date(2023, Math.floor(Math.random() * 11), Math.floor(Math.random() * 28) + 1),
    since: new Date(2022, 0, 1).toLocaleDateString(),
    status: Math.random() > 0.8 ? 'novo' : 'recorrente',
    avatarColor: ['bg-blue-100 text-blue-600', 'bg-purple-100 text-purple-600', 'bg-emerald-100 text-emerald-600', 'bg-amber-100 text-amber-600'][Math.floor(Math.random() * 4)]
  }));
};

const MOCK_RANKING_DATA = generateRankingData();

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const BestClients: React.FC = () => {
  const [metric, setMetric] = useState<'revenue' | 'appointments'>('revenue');
  const [period, setPeriod] = useState('all');
  const [topN, setTopN] = useState<5 | 10 | 30>(10);
  const [searchTerm, setSearchTerm] = useState('');

  // --- LOGIC ---
  const sortedClients = useMemo(() => {
    let data = [...MOCK_RANKING_DATA];

    // Filter by Search
    if (searchTerm) {
        data = data.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Sort by Metric
    data.sort((a, b) => {
        if (metric === 'revenue') return b.totalRevenue - a.totalRevenue;
        return b.appointmentCount - a.appointmentCount;
    });

    return data.slice(0, topN);
  }, [metric, topN, searchTerm]);

  const maxVal = metric === 'revenue' ? sortedClients[0]?.totalRevenue : sortedClients[0]?.appointmentCount;

  // Stats
  const totalClients = 142; // Mock total
  const newClientsMonth = 12; // Mock new
  const avgTicket = 350; // Mock ticket

  const getRankIcon = (index: number) => {
      if (index === 0) return <Crown size={24} className="text-yellow-500 fill-yellow-500 animate-pulse" />;
      if (index === 1) return <Medal size={24} className="text-slate-400 fill-slate-400" />;
      if (index === 2) return <Medal size={24} className="text-amber-700 fill-amber-700" />;
      return <span className="text-lg font-bold text-slate-400 w-6 text-center">{index + 1}º</span>;
  };

  const getRankColor = (index: number) => {
      if (index === 0) return 'border-yellow-400 bg-yellow-50/30';
      if (index === 1) return 'border-slate-300 bg-slate-50/30';
      if (index === 2) return 'border-amber-600/30 bg-amber-50/30';
      return 'border-slate-100 bg-white';
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-amber-900/20 border border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/80 via-slate-900 to-slate-950 opacity-90"></div>
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-amber-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <Trophy size={14} />
                    <span>Inteligência de Mercado</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">Ranking de Clientes</h1>
                <p className="text-amber-100/70 text-lg leading-relaxed max-w-xl">
                    Identifique seus pacientes mais fiéis e valiosos para criar estratégias de fidelização personalizadas.
                </p>
            </div>

            <div className="flex gap-4">
                 <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-md min-w-[140px]">
                     <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Pacientes</div>
                     <div className="text-2xl font-bold text-white flex items-center gap-2">
                         <Users size={20} className="text-blue-400" /> {totalClients}
                     </div>
                 </div>
                 <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-md min-w-[140px]">
                     <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Novos (Mês)</div>
                     <div className="text-2xl font-bold text-white flex items-center gap-2">
                         <Star size={20} className="text-yellow-400" /> +{newClientsMonth}
                     </div>
                 </div>
            </div>
        </div>
      </div>

      {/* --- TOOLBAR --- */}
      <div className="flex flex-col gap-6 sticky top-0 bg-slate-50/95 backdrop-blur z-20 py-4 -my-4 px-1">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            
            {/* Metric Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-full xl:w-auto">
                <button 
                    onClick={() => setMetric('revenue')}
                    className={`flex-1 xl:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${metric === 'revenue' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <DollarSign size={16} /> Maior Receita
                </button>
                <button 
                    onClick={() => setMetric('appointments')}
                    className={`flex-1 xl:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${metric === 'appointments' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Calendar size={16} /> Mais Assíduos
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0 no-scrollbar">
                <div className="relative group min-w-[120px]">
                     <select 
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium"
                     >
                        <option value="all">Todo Período</option>
                        <option value="year">Este Ano</option>
                        <option value="month">Este Mês</option>
                     </select>
                     <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <div className="flex bg-slate-100 rounded-xl border border-slate-200 p-0.5">
                    {[5, 10, 30].map(val => (
                        <button 
                            key={val}
                            onClick={() => setTopN(val as any)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${topN === val ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                        >
                            Top {val}
                        </button>
                    ))}
                </div>
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
                        relative overflow-hidden rounded-[24px] p-6 border transition-all duration-300 group
                        ${getRankColor(index)}
                        ${isTop3 ? 'shadow-lg scale-[1.02] z-10' : 'shadow-sm hover:shadow-md hover:border-indigo-200'}
                    `}
                  >
                      {/* Rank Badge */}
                      <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                             <div className="flex items-center justify-center w-10 h-10">
                                 {getRankIcon(index)}
                             </div>
                             <div>
                                 <h3 className="font-bold text-lg text-slate-800 leading-tight">{client.name}</h3>
                                 <p className="text-xs text-slate-500">Cliente desde {client.since.split('/')[2]}</p>
                             </div>
                          </div>
                          {client.status === 'novo' && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded-full">Novo</span>
                          )}
                      </div>

                      {/* Metric Display */}
                      <div className="mb-4">
                          <div className="flex justify-between items-end mb-1">
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                  {metric === 'revenue' ? 'Receita Total' : 'Total Sessões'}
                              </span>
                              <span className={`text-2xl font-display font-bold ${metric === 'revenue' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                  {metric === 'revenue' ? formatCurrency(client.totalRevenue) : client.appointmentCount}
                              </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${metric === 'revenue' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                          </div>
                      </div>

                      {/* Footer */}
                      <div className="pt-4 border-t border-slate-200/50 flex justify-between items-center text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                              <Calendar size={12} /> Última: {client.lastVisit.toLocaleDateString()}
                          </span>
                          <button className="flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 transition-colors group-hover:translate-x-1 duration-300">
                              Ver Perfil <ArrowUpRight size={12} />
                          </button>
                      </div>

                      {/* Decorative Background for Top 3 */}
                      {index === 0 && <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none -mr-8 -mt-8"></div>}
                  </div>
              );
          })}
      </div>
    </div>
  );
};