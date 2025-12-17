
import React, { useState } from 'react';
import { MOCK_PEIS, MOCK_PATIENTS, ASSESSMENTS_DATA } from '../constants';
import { PEI as PEIType, ClinicalGoal, ABCRecord, GoalStatus } from '../types';
import { 
  BrainCircuit, Plus, Search, ChevronDown, CheckCircle, TrendingUp, 
  Target, Calendar, Activity, ArrowRight, User, List, Layers, ClipboardCheck, 
  AlertTriangle, Radar, Eye, Volume2, Hand, Footprints, Smile, MessageSquare,
  Clock, FileText, ChevronRight, X, Save, ArrowLeft, Zap, Box, Brain
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

// --- COMPONENTS FOR SUB-TABS ---

// 1. Goals (Enhanced with Modal)
const GoalsTab: React.FC<{ pei: PEIType, onUpdate: (id: string, val: number) => void, onAdd: (goal: ClinicalGoal) => void }> = ({ pei, onUpdate, onAdd }) => {
    const { t } = useLanguage();
    const [inputVal, setInputVal] = useState('');
    const [targetGoal, setTargetGoal] = useState('');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newGoal, setNewGoal] = useState<Partial<ClinicalGoal>>({
        area: 'Comunicação',
        status: 'acquisition',
        currentValue: 0,
        targetValue: 80,
        startDate: new Date().toISOString().split('T')[0]
    });

    const handleSaveNewGoal = () => {
        if (!newGoal.title) return;
        const goal: ClinicalGoal = {
            ...newGoal,
            id: Math.random().toString(36).substr(2, 9),
            history: [{ date: new Date().toISOString().split('T')[0], value: newGoal.currentValue || 0 }]
        } as ClinicalGoal;
        onAdd(goal);
        setIsModalOpen(false);
        setNewGoal({ area: 'Comunicação', status: 'acquisition', currentValue: 0, targetValue: 80, startDate: new Date().toISOString().split('T')[0] });
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <Target size={20} className="text-indigo-600" /> {t('pei.goals')}
                </h3>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2"
                >
                    <Plus size={16} /> {t('pei.addGoal')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pei.goals.map(goal => {
                    const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
                    return (
                        <div key={goal.id} className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-indigo-200 shadow-sm transition-all group">
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
                                    value={targetGoal === goal.id ? inputVal : ''}
                                    onChange={(e) => { setTargetGoal(goal.id); setInputVal(e.target.value); }}
                                />
                                <button 
                                    onClick={() => {
                                        if(targetGoal === goal.id && inputVal) {
                                            onUpdate(goal.id, parseInt(inputVal));
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
                })}
            </div>

            {/* ADD GOAL MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-800">{t('pei.addGoal')}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pei.goal.area')}</label>
                                <select 
                                    className="w-full p-3 rounded-xl border border-slate-200 bg-white"
                                    value={newGoal.area}
                                    onChange={e => setNewGoal({...newGoal, area: e.target.value})}
                                >
                                    <option>Comunicação</option>
                                    <option>Social</option>
                                    <option>Motor</option>
                                    <option>Autonomia</option>
                                    <option>Cognitivo</option>
                                    <option>Acadêmico</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pei.goal.title')}</label>
                                <input 
                                    type="text" 
                                    className="w-full p-3 rounded-xl border border-slate-200"
                                    value={newGoal.title || ''}
                                    onChange={e => setNewGoal({...newGoal, title: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pei.goal.desc')}</label>
                                <textarea 
                                    className="w-full p-3 rounded-xl border border-slate-200 h-24 resize-none"
                                    value={newGoal.description || ''}
                                    onChange={e => setNewGoal({...newGoal, description: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pei.goal.initial')}</label>
                                    <input 
                                        type="number" 
                                        className="w-full p-3 rounded-xl border border-slate-200"
                                        value={newGoal.currentValue}
                                        onChange={e => setNewGoal({...newGoal, currentValue: parseInt(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pei.goal.target')}</label>
                                    <input 
                                        type="number" 
                                        className="w-full p-3 rounded-xl border border-slate-200"
                                        value={newGoal.targetValue}
                                        onChange={e => setNewGoal({...newGoal, targetValue: parseInt(e.target.value)})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pei.status')}</label>
                                <select 
                                    className="w-full p-3 rounded-xl border border-slate-200 bg-white"
                                    value={newGoal.status}
                                    onChange={e => setNewGoal({...newGoal, status: e.target.value as GoalStatus})}
                                >
                                    <option value="acquisition">{t('pei.acquisition')}</option>
                                    <option value="maintenance">{t('pei.maintenance')}</option>
                                    <option value="generalization">{t('pei.generalization')}</option>
                                    <option value="completed">{t('pei.completed')}</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded-lg">{t('common.cancel')}</button>
                            <button onClick={handleSaveNewGoal} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">{t('pei.goal.save')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 2. ABC Recording (Enhanced with Modal)
const ABCTab: React.FC<{ pei: PEIType, onAdd: (abc: ABCRecord) => void }> = ({ pei, onAdd }) => {
    const { t } = useLanguage();
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newABC, setNewABC] = useState<Partial<ABCRecord>>({
        intensity: 'medium',
        date: new Date().toISOString().slice(0, 16) // datetime-local format
    });

    const handleSaveABC = () => {
        if (!newABC.antecedent || !newABC.behavior) return;
        const abc: ABCRecord = {
            ...newABC,
            id: Math.random().toString(36).substr(2, 9),
        } as ABCRecord;
        onAdd(abc);
        setIsModalOpen(false);
        setNewABC({ intensity: 'medium', date: new Date().toISOString().slice(0, 16) });
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <List size={20} className="text-amber-500" /> {t('pei.tab.abc')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Análise funcional do comportamento</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-amber-500/20"
                >
                    <Plus size={16} /> {t('pei.abc.new')}
                </button>
            </div>

            <div className="relative border-l-2 border-slate-200 ml-4 space-y-8">
                {pei.abcRecords?.map((abc, idx) => (
                    <div key={abc.id} className="relative pl-8">
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                            abc.intensity === 'high' ? 'bg-red-500' : abc.intensity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                        }`}></div>
                        
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                    <Clock size={12} /> {new Date(abc.date).toLocaleString()}
                                </span>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                    abc.intensity === 'high' ? 'bg-red-50 text-red-600 border-red-100' : 
                                    abc.intensity === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                    'bg-blue-50 text-blue-600 border-blue-100'
                                }`}>
                                    Intensidade: {abc.intensity}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-slate-50 p-3 rounded-xl">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t('pei.abc.antecedent')}</span>
                                    <p className="text-sm font-medium text-slate-700">{abc.antecedent}</p>
                                </div>
                                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase block mb-1">{t('pei.abc.behavior')}</span>
                                    <p className="text-sm font-bold text-indigo-900">{abc.behavior}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t('pei.abc.consequence')}</span>
                                    <p className="text-sm font-medium text-slate-700">{abc.consequence}</p>
                                </div>
                            </div>
                            
                            {abc.duration && (
                                <div className="mt-3 text-right">
                                    <span className="text-xs text-slate-500 font-medium">Duração: {abc.duration}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {(!pei.abcRecords || pei.abcRecords.length === 0) && (
                    <div className="pl-8 text-slate-400 italic text-sm">Nenhum registro comportamental encontrado.</div>
                )}
            </div>

            {/* NEW ABC MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-white w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-amber-50/50">
                            <div>
                                <h3 className="font-bold text-slate-800">{t('pei.abc.title')}</h3>
                                <p className="text-xs text-slate-500">{t('pei.abc.subtitle')}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        <div className="p-6 space-y-5 overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pei.abc.date')}</label>
                                <input 
                                    type="datetime-local" 
                                    className="w-full p-3 rounded-xl border border-slate-200"
                                    value={newABC.date}
                                    onChange={e => setNewABC({...newABC, date: e.target.value})}
                                />
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pei.abc.antecedent')}</label>
                                    <textarea 
                                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 h-20 resize-none"
                                        placeholder="O que aconteceu imediatamente antes?"
                                        value={newABC.antecedent || ''}
                                        onChange={e => setNewABC({...newABC, antecedent: e.target.value})}
                                    />
                                </div>
                                <div className="text-center text-slate-300"><ArrowRight className="mx-auto rotate-90" size={16} /></div>
                                <div>
                                    <label className="block text-xs font-bold text-indigo-500 uppercase mb-1">{t('pei.abc.behavior')}</label>
                                    <textarea 
                                        className="w-full p-3 rounded-xl border-2 border-indigo-100 bg-white h-20 resize-none focus:border-indigo-500 outline-none"
                                        placeholder="Descrição detalhada do comportamento..."
                                        value={newABC.behavior || ''}
                                        onChange={e => setNewABC({...newABC, behavior: e.target.value})}
                                    />
                                </div>
                                <div className="text-center text-slate-300"><ArrowRight className="mx-auto rotate-90" size={16} /></div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pei.abc.consequence')}</label>
                                    <textarea 
                                        className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 h-20 resize-none"
                                        placeholder="O que aconteceu imediatamente depois?"
                                        value={newABC.consequence || ''}
                                        onChange={e => setNewABC({...newABC, consequence: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pei.abc.intensity')}</label>
                                    <div className="flex gap-2">
                                        {['low', 'medium', 'high'].map(lvl => (
                                            <button 
                                                key={lvl}
                                                onClick={() => setNewABC({...newABC, intensity: lvl as any})}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border ${
                                                    newABC.intensity === lvl 
                                                        ? lvl === 'high' ? 'bg-red-500 text-white border-red-500' : lvl === 'medium' ? 'bg-amber-500 text-white border-amber-500' : 'bg-blue-500 text-white border-blue-500'
                                                        : 'bg-white text-slate-500 border-slate-200'
                                                }`}
                                            >
                                                {lvl}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pei.abc.duration')}</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: 5 min"
                                        className="w-full p-2.5 rounded-xl border border-slate-200"
                                        value={newABC.duration || ''}
                                        onChange={e => setNewABC({...newABC, duration: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded-lg">{t('common.cancel')}</button>
                            <button onClick={handleSaveABC} className="px-6 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 shadow-lg shadow-amber-200">{t('pei.abc.save')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 3. Sensory Profile (Enhanced: Interactive & Diet)
const SensoryTab: React.FC<{ pei: PEIType }> = ({ pei }) => {
    const { t } = useLanguage();
    const [profile, setProfile] = useState(pei.sensoryProfile || {
        auditory: 50, visual: 50, tactile: 50, vestibular: 50, oral: 50, social: 50,
        proprioceptive: 50, lastAssessmentDate: new Date().toISOString()
    });
    const [diet, setDiet] = useState<Record<string, string>>({}); // Stores strategies per sense

    const updateProfile = (key: string, value: number) => {
        setProfile(prev => ({...prev, [key]: value}));
    };

    const updateDiet = (key: string, text: string) => {
        setDiet(prev => ({...prev, [key]: text}));
    };

    const sensoryTypes = [
        { key: 'auditory', label: t('pei.sensory.auditory'), icon: <Volume2 size={18}/>, color: 'text-purple-600', bg: 'bg-purple-100', accent: 'accent-purple-600' },
        { key: 'visual', label: t('pei.sensory.visual'), icon: <Eye size={18}/>, color: 'text-blue-600', bg: 'bg-blue-100', accent: 'accent-blue-600' },
        { key: 'tactile', label: t('pei.sensory.tactile'), icon: <Hand size={18}/>, color: 'text-emerald-600', bg: 'bg-emerald-100', accent: 'accent-emerald-600' },
        { key: 'vestibular', label: t('pei.sensory.vestibular'), icon: <Footprints size={18}/>, color: 'text-orange-600', bg: 'bg-orange-100', accent: 'accent-orange-600' },
        { key: 'oral', label: t('pei.sensory.oral'), icon: <Smile size={18}/>, color: 'text-pink-600', bg: 'bg-pink-100', accent: 'accent-pink-600' },
        { key: 'social', label: t('pei.sensory.social'), icon: <MessageSquare size={18}/>, color: 'text-indigo-600', bg: 'bg-indigo-100', accent: 'accent-indigo-600' },
    ];

    const getStatus = (value: number) => {
        if (value < 35) return { text: t('pei.sensory.hypo') + ' / ' + t('pei.sensory.seeking'), color: 'text-blue-600 font-bold' };
        if (value > 65) return { text: t('pei.sensory.hyper') + ' / ' + t('pei.sensory.avoiding'), color: 'text-red-600 font-bold' };
        return { text: 'Regulado / Padrão', color: 'text-slate-400' };
    };

    return (
        <div className="animate-fadeIn space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <Activity size={20} className="text-indigo-500" /> {t('pei.tab.sensory')}
                    </h3>
                    <p className="text-sm text-slate-500">Mapeamento do perfil sensorial e estratégias de regulação (Dieta Sensorial).</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200">{t('common.save')}</button>
                </div>
            </div>

            {/* Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sliders Area */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-700 mb-6 uppercase text-xs tracking-wider border-b border-slate-100 pb-2">{t('pei.sensory.register')}</h4>
                    <div className="space-y-6">
                        {sensoryTypes.map(s => {
                            // @ts-ignore
                            const val = profile[s.key] as number;
                            const status = getStatus(val);
                            
                            return (
                                <div key={s.key} className="group">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${s.bg} ${s.color}`}>{s.icon}</div>
                                            <span className="font-bold text-slate-700">{s.label}</span>
                                        </div>
                                        <span className={`text-xs ${status.color}`}>{status.text}</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="100" 
                                        value={val}
                                        onChange={(e) => updateProfile(s.key, parseInt(e.target.value))}
                                        className={`w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer ${s.accent}`} 
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 uppercase font-bold">
                                        <span>Busca</span>
                                        <span>Neutro</span>
                                        <span>Evitação</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sensory Diet / Strategies */}
                <div className="space-y-6">
                    <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 flex items-center gap-4">
                        <div className="p-3 bg-white rounded-full text-indigo-600 shadow-sm"><Zap size={24} /></div>
                        <div>
                            <h4 className="font-bold text-indigo-900">{t('pei.sensory.diet')}</h4>
                            <p className="text-xs text-indigo-700/80">Registre atividades regulatórias para cada sistema sensorial alterado.</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-h-[600px] overflow-y-auto custom-scrollbar">
                        {sensoryTypes.filter(s => {
                            // Only show inputs for non-neutral senses
                            // @ts-ignore
                            const val = profile[s.key];
                            return val < 40 || val > 60;
                        }).length === 0 ? (
                            <div className="text-center py-10 text-slate-400">
                                <CheckCircle size={48} className="mx-auto mb-2 opacity-20" />
                                <p>Nenhuma alteração significativa detectada para sugerir dieta.</p>
                            </div>
                        ) : (
                            sensoryTypes.filter(s => {
                                // @ts-ignore
                                const val = profile[s.key];
                                return val < 40 || val > 60;
                            }).map(s => (
                                <div key={s.key} className="mb-6 last:mb-0">
                                    <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${s.bg.replace('bg-', 'bg-').replace('100', '500')}`}></span>
                                        Estratégias para: {s.label}
                                    </label>
                                    <textarea 
                                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:bg-white focus:border-indigo-300 outline-none transition-all resize-none h-24"
                                        placeholder={`Ex: Atividades para regular ${s.label.toLowerCase()}...`}
                                        value={diet[s.key] || ''}
                                        onChange={(e) => updateDiet(s.key, e.target.value)}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// 4. ASSESSMENT RUNNER (Functional)
const AssessmentRunner: React.FC<{ assessmentId: string, onBack: () => void }> = ({ assessmentId, onBack }) => {
    const { t } = useLanguage();
    const data = ASSESSMENTS_DATA[assessmentId];
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [finished, setFinished] = useState(false);
    const [result, setResult] = useState<{score: number, risk: string} | null>(null);

    if (!data) return <div>Erro: Escala não encontrada.</div>;

    const handleAnswer = (qId: string, val: any) => {
        setAnswers(prev => ({...prev, [qId]: val}));
    };

    const calculateResult = () => {
        let score = 0;
        
        if (data.type === 'risk') {
            // M-CHAT Logic: Count mismatch with riskAnswer
            data.questions.forEach(q => {
                const ans = answers[q.id];
                if (ans && q.riskAnswer && ans === q.riskAnswer) {
                    score++;
                }
            });
        } else {
            // Likert Sum Logic
            Object.values(answers).forEach(val => score += (val as number));
        }

        let risk = 'Baixo Risco / Dentro do Esperado';
        if (data.cutoff && score >= data.cutoff) {
            risk = 'Risco Elevado / Indicativo Clínico';
        } else if (data.cutoff && score >= (data.cutoff / 2)) {
            risk = 'Risco Moderado';
        }

        setResult({ score, risk });
        setFinished(true);
    };

    if (finished && result) {
        return (
            <div className="animate-fadeIn space-y-6">
                <button onClick={onBack} className="text-slate-500 hover:text-slate-700 flex items-center gap-2 text-sm font-bold mb-4">
                    <ArrowLeft size={16} /> {t('pei.assessments.back')}
                </button>

                <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${result.score >= (data.cutoff || 0) ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        <ClipboardCheck size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('pei.assessments.result')}</h2>
                    <p className="text-lg text-slate-600 mb-6">{data.name}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                        <div className="bg-slate-50 p-4 rounded-xl">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t('pei.assessments.score')}</p>
                            <p className="text-3xl font-display font-bold text-indigo-600">{result.score}</p>
                        </div>
                        <div className={`p-4 rounded-xl ${result.score >= (data.cutoff || 0) ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'}`}>
                            <p className="text-xs font-bold uppercase tracking-wide opacity-70">{t('pei.assessments.interpretation')}</p>
                            <p className={`text-lg font-bold ${result.score >= (data.cutoff || 0) ? 'text-red-700' : 'text-emerald-700'}`}>{result.risk}</p>
                        </div>
                    </div>

                    <button className="mt-8 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg">
                        {t('pei.assessments.saveToRecord')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <button onClick={onBack} className="text-slate-400 hover:text-indigo-600 flex items-center gap-1 text-xs font-bold mb-2 transition-colors">
                        <ArrowLeft size={12} /> {t('pei.assessments.back')}
                    </button>
                    <h3 className="font-bold text-slate-800 text-xl">{data.name}</h3>
                    <p className="text-sm text-slate-500">{data.description}</p>
                </div>
                <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 uppercase">Progresso</span>
                    <p className="text-lg font-bold text-indigo-600">
                        {Object.keys(answers).length} / {data.questions.length}
                    </p>
                </div>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2 pb-4">
                {data.questions.map((q, idx) => (
                    <div key={q.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <p className="font-bold text-slate-800 mb-4 flex gap-3">
                            <span className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs text-slate-500 shrink-0">{idx + 1}</span>
                            {q.text}
                        </p>
                        
                        <div className="flex flex-wrap gap-2 ml-9">
                            {data.options ? (
                                data.options.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => handleAnswer(q.id, opt.value)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                                            answers[q.id] === opt.value 
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))
                            ) : (
                                // Default Yes/No for M-CHAT
                                <>
                                    <button
                                        onClick={() => handleAnswer(q.id, 'Sim')}
                                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all border ${
                                            answers[q.id] === 'Sim' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        Sim
                                    </button>
                                    <button
                                        onClick={() => handleAnswer(q.id, 'Não')}
                                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all border ${
                                            answers[q.id] === 'Não' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        Não
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
                <button 
                    onClick={calculateResult}
                    disabled={Object.keys(answers).length < data.questions.length}
                    className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {t('pei.assessments.calculate')}
                </button>
            </div>
        </div>
    );
};

const AssessmentsTab = () => {
    const { t } = useLanguage();
    const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);

    if (activeAssessmentId) {
        return <AssessmentRunner assessmentId={activeAssessmentId} onBack={() => setActiveAssessmentId(null)} />;
    }

    const assessmentsList = [
        { id: 'mchat', name: 'M-CHAT-R/F', desc: 'Rastreio de Autismo (16-30 meses)', color: 'bg-blue-500' },
        { id: 'snap', name: 'SNAP-IV', desc: 'Avaliação de Sintomas TDAH', color: 'bg-orange-500' },
        { id: 'ata', name: 'Escala ATA', desc: 'Avaliação de Traços Autísticos', color: 'bg-emerald-500' },
        { id: 'vineland', name: 'Vineland-3', desc: 'Comportamento Adaptativo (Indisponível na Demo)', color: 'bg-purple-500', disabled: true },
    ];

    return (
        <div className="animate-fadeIn">
            <h3 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                <ClipboardCheck size={20} className="text-emerald-600" /> {t('pei.assessments.available')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assessmentsList.map(item => (
                    <div 
                        key={item.id} 
                        onClick={() => !item.disabled && setActiveAssessmentId(item.id)}
                        className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all group flex items-center justify-between ${
                            item.disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-indigo-300 hover:shadow-md cursor-pointer'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
                                {item.name.charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{item.name}</h4>
                                <p className="text-xs text-slate-500">{item.desc}</p>
                            </div>
                        </div>
                        {!item.disabled && <ChevronRight className="text-slate-300 group-hover:text-indigo-500" size={20} />}
                    </div>
                ))}
            </div>
        </div>
    );
};


export const PEI: React.FC = () => {
  const { t } = useLanguage();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'goals' | 'abc' | 'sensory' | 'assessments'>('goals');
  const [peis, setPeis] = useState<PEIType[]>(MOCK_PEIS);

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

  const handleAddGoal = (newGoal: ClinicalGoal) => {
      if (!selectedPei) return;
      setPeis(prev => prev.map(p => {
          if (p.id === selectedPei.id) {
              return { ...p, goals: [...p.goals, newGoal] };
          }
          return p;
      }));
  };

  const handleAddABC = (newABC: ABCRecord) => {
      if (!selectedPei) return;
      setPeis(prev => prev.map(p => {
          if (p.id === selectedPei.id) {
              return { ...p, abcRecords: [...(p.abcRecords || []), newABC] };
          }
          return p;
      }));
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
                    <BrainCircuit size={14} />
                    <span>Neurodiversidade & TEA</span>
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
                                  <p className="text-xs text-slate-400 truncate">Ver Prontuário</p>
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
                  <div className="space-y-6 animate-fadeIn">
                      
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
                      </div>

                      {/* TABS NAVIGATION */}
                      <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
                          {[
                              { id: 'goals', label: t('pei.tab.goals'), icon: <Target size={16} /> },
                              { id: 'abc', label: t('pei.tab.abc'), icon: <List size={16} /> },
                              { id: 'sensory', label: t('pei.tab.sensory'), icon: <Activity size={16} /> },
                              { id: 'assessments', label: t('pei.tab.assessments'), icon: <ClipboardCheck size={16} /> },
                          ].map(tab => (
                              <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                                    activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                              >
                                  {tab.icon} {tab.label}
                              </button>
                          ))}
                      </div>

                      {/* TABS CONTENT */}
                      <div className="min-h-[400px]">
                          {activeTab === 'goals' && <GoalsTab pei={selectedPei} onUpdate={handleUpdateGoal} onAdd={handleAddGoal} />}
                          {activeTab === 'abc' && <ABCTab pei={selectedPei} onAdd={handleAddABC} />}
                          {activeTab === 'sensory' && <SensoryTab pei={selectedPei} />}
                          {activeTab === 'assessments' && <AssessmentsTab />}
                      </div>

                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                      <BrainCircuit size={48} className="mb-4 opacity-20" />
                      <p className="font-medium text-lg">{t('pei.selectPatient')}</p>
                      <p className="text-sm">Selecione um paciente na lista ao lado para gerenciar o plano.</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
