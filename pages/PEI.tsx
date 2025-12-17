
import React, { useState } from 'react';
import { MOCK_PEIS, MOCK_PATIENTS } from '../constants';
import { PEI as PEIType, ClinicalGoal } from '../types';
import { 
  BookCheck, Plus, Search, ChevronDown, CheckCircle, TrendingUp, 
  Target, Calendar, Activity, ArrowRight, User
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const GoalCard: React.FC<{ goal: ClinicalGoal, onAddData: (val: number) => void }> = ({ goal, onAddData }) => {
    const { t } = useLanguage();
    const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
    const [inputVal, setInputVal] = useState('');

    return (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-indigo-200 shadow-sm transition-all group">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{goal.area}</span>
                    <h4 className="font-bold text-slate-800 mt-2 text-base leading-snug">{goal.title}</h4>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border uppercase ${
                    goal.status === 'acquisition' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    goal.status === 'maintenance' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    'bg-emerald-50 text-emerald-600 border-emerald-100'
                }`}>
                    {t(`pei.${goal.status}`)}
                </span>
            </div>
            
            <p className="text-xs text-slate-500 mb-4 line-clamp-2">{goal.description}</p>

            <div className="mb-4">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                    <span>{t('pei.current')}: {goal.currentValue}%</span>
                    <span>{t('pei.target')}: {goal.targetValue}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                <input 
                    type="number" 
                    placeholder="%"
                    className="w-16 p-2 text-sm text-center font-bold bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                />
                <button 
                    onClick={() => {
                        if(inputVal) {
                            onAddData(parseInt(inputVal));
                            setInputVal('');
                        }
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                >
                    {t('pei.save')}
                </button>
            </div>
        </div>
    );
};

export const PEI: React.FC = () => {
  const { t } = useLanguage();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [peis, setPeis] = useState<PEIType[]>(MOCK_PEIS);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedPei = peis.find(p => p.patientId === selectedPatientId);
  const patient = MOCK_PATIENTS.find(p => p.id === selectedPatientId);

  const handleUpdateGoal = (goalId: string, newValue: number) => {
      if (!selectedPei) return;
      
      const updatedGoals = selectedPei.goals.map(g => {
          if (g.id === goalId) {
              return {
                  ...g,
                  currentValue: newValue,
                  history: [...g.history, { date: new Date().toISOString().split('T')[0], value: newValue }]
              };
          }
          return g;
      });

      setPeis(prev => prev.map(p => p.id === selectedPei.id ? { ...p, goals: updatedGoals } : p));
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-indigo-900/20 border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-slate-900 to-slate-950 opacity-90"></div>
        <div className="absolute right-0 top-0 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-violet-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <BookCheck size={14} />
                    <span>Plano Terapêutico (ABA/TEA)</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">{t('pei.title')}</h1>
                <p className="text-violet-200 text-lg leading-relaxed max-w-xl">
                    {t('pei.subtitle')}
                </p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar: Patient Selector */}
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Selecione o Paciente</h3>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                      {MOCK_PATIENTS.map(p => (
                          <button
                            key={p.id}
                            onClick={() => setSelectedPatientId(p.id)}
                            className={`w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left ${selectedPatientId === p.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
                          >
                              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
                                  {p.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-bold truncate ${selectedPatientId === p.id ? 'text-indigo-700' : 'text-slate-700'}`}>{p.name}</p>
                                  <p className="text-xs text-slate-400 truncate">Ver PEI</p>
                              </div>
                              {selectedPatientId === p.id && <ChevronDown className="text-indigo-600 -rotate-90" size={16} />}
                          </button>
                      ))}
                  </div>
              </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
              {selectedPatientId && selectedPei ? (
                  <div className="space-y-8 animate-fadeIn">
                      
                      {/* Header Status */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
                          <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-bold">
                                  {patient?.name.charAt(0)}
                              </div>
                              <div>
                                  <h2 className="text-xl font-bold text-slate-800">{patient?.name}</h2>
                                  <p className="text-sm text-slate-500 flex items-center gap-2">
                                      <Calendar size={14} /> Início: {new Date(selectedPei.startDate).toLocaleDateString()}
                                      <span className="text-slate-300">|</span>
                                      Revisão: {new Date(selectedPei.reviewDate).toLocaleDateString()}
                                  </p>
                              </div>
                          </div>
                          <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2">
                              <Plus size={18} /> {t('pei.addGoal')}
                          </button>
                      </div>

                      {/* Goals Grid */}
                      <div>
                          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-lg">
                              <Target size={20} className="text-indigo-600" /> {t('pei.goals')}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {selectedPei.goals.map(goal => (
                                  <GoalCard key={goal.id} goal={goal} onAddData={(val) => handleUpdateGoal(goal.id, val)} />
                              ))}
                          </div>
                      </div>

                      {/* History / Chart Placeholder */}
                      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                              <TrendingUp size={20} className="text-emerald-500" /> {t('pei.history')}
                          </h3>
                          <div className="h-64 flex items-end gap-2 border-b border-slate-100 pb-2 relative">
                              {/* Simple Bar Chart Visualization */}
                              <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-300 font-bold pointer-events-none">
                                  <span>100%</span>
                                  <span>50%</span>
                                  <span>0%</span>
                              </div>
                              {selectedPei.goals[0]?.history.map((h, i) => (
                                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                                      <div className="w-full max-w-[30px] bg-indigo-500 rounded-t-sm hover:opacity-80 transition-all" style={{ height: `${h.value}%` }}></div>
                                      <span className="text-[10px] text-slate-400 mt-2 rotate-45 origin-left translate-y-2">{new Date(h.date).toLocaleDateString(undefined, {day:'2-digit', month:'2-digit'})}</span>
                                      <div className="absolute -top-8 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                          {h.value}%
                                      </div>
                                  </div>
                              ))}
                              {(!selectedPei.goals[0]?.history || selectedPei.goals[0].history.length === 0) && (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                                      Nenhum dado histórico registrado para a primeira meta.
                                  </div>
                              )}
                          </div>
                      </div>

                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                      <User size={48} className="mb-4 opacity-20" />
                      <p className="font-medium text-lg">{t('pei.selectPatient')}</p>
                      <p className="text-sm">Selecione um paciente na lista ao lado para gerenciar o plano.</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
