
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Patient, RPDRecord, SchemaItem, DreamEntry } from '../types';
import { 
  Boxes, ChevronDown, Plus, Save, Brain, LayoutGrid, Feather, 
  ArrowRight, Activity, Smile, Frown, Meh, AlertTriangle, Cloud, 
  Moon, Edit3, Trash2, CheckCircle, BrainCircuit, X, Zap, RotateCcw,
  Thermometer, Tag, FileText, BarChart, Loader2
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

// --- MOCK CONSTANTS (INTERNAS AO ARQUIVO PARA DEMONSTRAÇÃO) ---
const SCHEMAS_LIST = [
    { id: 's1', name: 'Abandono / Instabilidade', domain: 'Desconexão e Rejeição' },
    { id: 's2', name: 'Desconfiança / Abuso', domain: 'Desconexão e Rejeição' },
    { id: 's3', name: 'Privação Emocional', domain: 'Desconexão e Rejeição' },
    { id: 's4', name: 'Defectividade / Vergonha', domain: 'Desconexão e Rejeição' },
];

const COGNITIVE_DISTORTIONS = [
    { id: 'd1', label: 'Pensamento Tudo ou Nada', desc: 'Pensar em extremos.' },
    { id: 'd2', label: 'Catastrofização', desc: 'Esperar o pior.' },
];

// --- COMPONENTS ---

const TCCPanel = () => {
    const { t } = useLanguage();
    const [activeSubTab, setActiveSubTab] = useState<'rpd' | 'cards'>('rpd');
    const [records, setRecords] = useState<RPDRecord[]>([]);
    const [newRPD, setNewRPD] = useState<Partial<RPDRecord>>({ intensity: 5 });
    
    const [cards, setCards] = useState<{id: string, front: string, back: string, flipped: boolean}[]>([]);
    const [newCard, setNewCard] = useState({ front: '', back: '' });

    const handleSaveRPD = () => {
        if (!newRPD.thought || !newRPD.situation) return;
        setRecords([{ ...newRPD, id: Math.random().toString(36), date: new Date().toISOString() } as RPDRecord, ...records]);
        setNewRPD({ intensity: 5 });
    };

    const handleAddCard = () => {
        if(!newCard.front || !newCard.back) return;
        setCards([...cards, { id: Math.random().toString(36), front: newCard.front, back: newCard.back, flipped: false }]);
        setNewCard({ front: '', back: '' });
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
                <button onClick={() => setActiveSubTab('rpd')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeSubTab === 'rpd' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-50'}`}>{t('tcc.rpd')}</button>
                <button onClick={() => setActiveSubTab('cards')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeSubTab === 'cards' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-50'}`}>{t('tcc.coping')}</button>
            </div>

            {activeSubTab === 'rpd' && (
                <>
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                            <BrainCircuit size={18} className="text-indigo-600" /> {t('tcc.rpd')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{t('tcc.situation')}</label>
                                    <textarea className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 h-24 resize-none text-sm" value={newRPD.situation || ''} onChange={e => setNewRPD({...newRPD, situation: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{t('tcc.emotion')}</label>
                                    <div className="flex gap-2 items-center">
                                        <input type="text" className="flex-1 p-2.5 rounded-lg border border-slate-200 text-sm" value={newRPD.emotion || ''} onChange={e => setNewRPD({...newRPD, emotion: e.target.value})} />
                                        <input type="number" min="0" max="10" className="w-16 p-2.5 rounded-lg border border-slate-200 text-center font-bold text-sm" value={newRPD.intensity} onChange={e => setNewRPD({...newRPD, intensity: parseInt(e.target.value)})} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{t('tcc.thought')}</label>
                                    <textarea className="w-full p-2.5 rounded-lg border-2 border-indigo-50 bg-white h-24 resize-none text-sm" value={newRPD.thought || ''} onChange={e => setNewRPD({...newRPD, thought: e.target.value})} />
                                </div>
                                <div className="flex items-end">
                                    <button onClick={handleSaveRPD} className="w-full h-10 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-sm text-sm">{t('tcc.addEntry')}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeSubTab === 'cards' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100 flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full space-y-3">
                            <label className="block text-xs font-bold text-indigo-800 uppercase">{t('tcc.addCard')}</label>
                            <input type="text" placeholder={t('tcc.cardFront')} className="w-full p-2.5 rounded-lg border border-indigo-200 text-sm" value={newCard.front} onChange={e => setNewCard({...newCard, front: e.target.value})} />
                            <textarea placeholder={t('tcc.cardBack')} className="w-full p-2.5 rounded-lg border border-indigo-200 resize-none h-16 text-sm" value={newCard.back} onChange={e => setNewCard({...newCard, back: e.target.value})} />
                        </div>
                        <button onClick={handleAddCard} className="w-full md:w-auto px-5 h-10 bg-indigo-600 text-white font-bold rounded-lg text-sm">Criar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export const ClinicalTools: React.FC = () => {
  const { t } = useLanguage();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'tcc' | 'schema' | 'psycho'>('tcc');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
      setIsLoading(true);
      try {
          const data = await api.get<Patient[]>('/patients');
          setPatients(data);
      } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const patient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      <div className="relative overflow-hidden rounded-2xl p-8 bg-slate-900 shadow-xl border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 opacity-90"></div>
        <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-300 text-[10px] font-bold uppercase tracking-widest">
                <Boxes size={12} />
                <span>Clínica Integrada</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-2 leading-tight">{t('tools.title')}</h1>
            <p className="text-indigo-200 text-sm leading-relaxed max-w-xl">{t('tools.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-3 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wide">Meus Pacientes</h3>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                      {isLoading ? (
                          <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>
                      ) : patients.map(p => (
                          <button
                            key={p.id}
                            onClick={() => setSelectedPatientId(p.id)}
                            className={`w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left ${selectedPatientId === p.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
                          >
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
                                  {p.full_name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-bold truncate ${selectedPatientId === p.id ? 'text-indigo-700' : 'text-slate-700'}`}>{p.full_name}</p>
                              </div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>

          <div className="lg:col-span-3">
              {selectedPatientId ? (
                  <div className="space-y-6 animate-fadeIn">
                      <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                          {[
                              { id: 'tcc', label: t('tools.tcc'), icon: <BrainCircuit size={16} />, color: 'text-indigo-600' },
                              { id: 'schema', label: t('tools.schema'), icon: <LayoutGrid size={16} />, color: 'text-rose-600' },
                              { id: 'psycho', label: t('tools.psycho'), icon: <Feather size={16} />, color: 'text-amber-600' },
                          ].map(tool => (
                              <button 
                                key={tool.id}
                                onClick={() => setActiveTool(tool.id as any)}
                                className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                                    activeTool === tool.id ? `bg-slate-50 ${tool.color} shadow-sm border border-slate-100` : 'text-slate-500'
                                }`}
                              >
                                  {tool.icon} {tool.label}
                              </button>
                          ))}
                      </div>

                      <div className="min-h-[400px]">
                          {activeTool === 'tcc' && <TCCPanel />}
                          {activeTool === 'schema' && <div className="p-10 text-center text-slate-400">Módulo de Terapia do Esquema em desenvolvimento.</div>}
                          {activeTool === 'psycho' && <div className="p-10 text-center text-slate-400">Módulo de Psicanálise em desenvolvimento.</div>}
                      </div>
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                      <Boxes size={40} className="mb-3 opacity-20" />
                      <p className="font-medium text-base">{t('tools.selectPatient')}</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
