
import React, { useState } from 'react';
import { MOCK_PATIENTS } from '../constants';
import { 
  Boxes, ChevronDown, Plus, Save, Brain, LayoutGrid, Feather, 
  ArrowRight, Activity, Smile, Frown, Meh, AlertTriangle, Cloud, 
  Moon, Edit3, Trash2, CheckCircle, BrainCircuit, X, Zap, RotateCcw,
  Thermometer, Tag, FileText, BarChart
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { RPDRecord, SchemaItem, DreamEntry } from '../types';

// --- MOCK DATA ---
const SCHEMAS_LIST = [
    { id: 's1', name: 'Abandono / Instabilidade', domain: 'Desconexão e Rejeição' },
    { id: 's2', name: 'Desconfiança / Abuso', domain: 'Desconexão e Rejeição' },
    { id: 's3', name: 'Privação Emocional', domain: 'Desconexão e Rejeição' },
    { id: 's4', name: 'Defectividade / Vergonha', domain: 'Desconexão e Rejeição' },
    { id: 's5', name: 'Isolamento Social', domain: 'Desconexão e Rejeição' },
    { id: 's6', name: 'Dependência / Incompetência', domain: 'Autonomia Prejudicada' },
    { id: 's7', name: 'Vulnerabilidade ao Dano', domain: 'Autonomia Prejudicada' },
    { id: 's8', name: 'Emaranhamento', domain: 'Autonomia Prejudicada' },
    { id: 's9', name: 'Fracasso', domain: 'Autonomia Prejudicada' },
    { id: 's10', name: 'Arrogo / Grandiosidade', domain: 'Limites Prejudicados' },
    { id: 's11', name: 'Autocontrole Insuficiente', domain: 'Limites Prejudicados' },
    { id: 's12', name: 'Subjugação', domain: 'Direcionamento para o Outro' },
    { id: 's13', name: 'Auto-sacrifício', domain: 'Direcionamento para o Outro' },
    { id: 's14', name: 'Busca de Aprovação', domain: 'Direcionamento para o Outro' },
    { id: 's15', name: 'Negativismo / Pessimismo', domain: 'Supervigilância e Inibição' },
    { id: 's16', name: 'Inibição Emocional', domain: 'Supervigilância e Inibição' },
    { id: 's17', name: 'Padrões Inflexíveis', domain: 'Supervigilância e Inibição' },
    { id: 's18', name: 'Punição', domain: 'Supervigilância e Inibição' },
];

const SCHEMA_MODES = [
    { id: 'm1', name: 'Criança Vulnerável', category: 'Criança', color: 'bg-indigo-100 text-indigo-700' },
    { id: 'm2', name: 'Criança Zangada', category: 'Criança', color: 'bg-red-100 text-red-700' },
    { id: 'm3', name: 'Criança Impulsiva', category: 'Criança', color: 'bg-orange-100 text-orange-700' },
    { id: 'm4', name: 'Criança Feliz', category: 'Criança', color: 'bg-emerald-100 text-emerald-700' },
    { id: 'm5', name: 'Pais Punitivos', category: 'Pais', color: 'bg-slate-200 text-slate-700' },
    { id: 'm6', name: 'Pais Exigentes', category: 'Pais', color: 'bg-slate-200 text-slate-700' },
    { id: 'm7', name: 'Protetor Desligado', category: 'Enfrentamento', color: 'bg-blue-100 text-blue-700' },
    { id: 'm8', name: 'Supercompensador', category: 'Enfrentamento', color: 'bg-amber-100 text-amber-700' },
    { id: 'm9', name: 'Adulto Saudável', category: 'Saudável', color: 'bg-green-100 text-green-800' },
];

const COGNITIVE_DISTORTIONS = [
    { id: 'd1', label: 'tcc.distortions.allOrNothing', desc: 'Pensar em extremos (8 ou 80).' },
    { id: 'd2', label: 'tcc.distortions.catastrophizing', desc: 'Esperar sempre o pior cenário.' },
    { id: 'd3', label: 'tcc.distortions.emotionalReasoning', desc: 'Sentir como prova da realidade.' },
    { id: 'd4', label: 'tcc.distortions.personalization', desc: 'Assumir culpa excessiva.' },
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
        const record: RPDRecord = {
            ...newRPD,
            id: Math.random().toString(36),
            date: new Date().toISOString(),
        } as RPDRecord;
        setRecords([record, ...records]);
        setNewRPD({ intensity: 5 });
    };

    const handleAddCard = () => {
        if(!newCard.front || !newCard.back) return;
        setCards([...cards, { id: Math.random().toString(36), front: newCard.front, back: newCard.back, flipped: false }]);
        setNewCard({ front: '', back: '' });
    };

    const flipCard = (id: string) => {
        setCards(prev => prev.map(c => c.id === id ? { ...c, flipped: !c.flipped } : c));
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Sub-Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
                <button onClick={() => setActiveSubTab('rpd')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeSubTab === 'rpd' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>{t('tcc.rpd')}</button>
                <button onClick={() => setActiveSubTab('cards')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeSubTab === 'cards' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>{t('tcc.coping')}</button>
            </div>

            {/* RPD CONTENT */}
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
                                    <textarea className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 h-24 resize-none focus:bg-white focus:border-indigo-500 transition-colors text-sm" placeholder="Onde? Quando? O que aconteceu?" value={newRPD.situation || ''} onChange={e => setNewRPD({...newRPD, situation: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{t('tcc.emotion')}</label>
                                    <div className="flex gap-2 items-center">
                                        <input type="text" className="flex-1 p-2.5 rounded-lg border border-slate-200 text-sm" placeholder="Ex: Raiva, Medo" value={newRPD.emotion || ''} onChange={e => setNewRPD({...newRPD, emotion: e.target.value})} />
                                        <input type="number" min="0" max="10" className="w-16 p-2.5 rounded-lg border border-slate-200 text-center font-bold text-sm" value={newRPD.intensity} onChange={e => setNewRPD({...newRPD, intensity: parseInt(e.target.value)})} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{t('tcc.thought')}</label>
                                    <textarea className="w-full p-2.5 rounded-lg border-2 border-indigo-50 bg-white h-24 resize-none focus:border-indigo-500 text-sm" placeholder="O que passou pela sua cabeça?" value={newRPD.thought || ''} onChange={e => setNewRPD({...newRPD, thought: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{t('tcc.distortion')}</label>
                                        <select className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-sm" value={newRPD.distortion} onChange={e => setNewRPD({...newRPD, distortion: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            {COGNITIVE_DISTORTIONS.map(d => (<option key={d.id} value={d.label}>{t(d.label)}</option>))}
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <button onClick={handleSaveRPD} className="w-full h-10 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors flex justify-center items-center gap-2 text-sm"><Plus size={16} /> {t('tcc.addEntry')}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {records.map(rec => (
                            <div key={rec.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 relative overflow-hidden group">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs font-bold text-slate-400">{new Date(rec.date).toLocaleDateString()}</span>
                                        {rec.distortion && <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase">{t(rec.distortion)}</span>}
                                    </div>
                                    <p className="font-bold text-slate-800 text-sm mb-1">"{rec.thought}"</p>
                                    <p className="text-xs text-slate-600">Situação: {rec.situation}</p>
                                </div>
                                <div className="flex items-center gap-3 border-l border-slate-100 pl-4">
                                    <div className="text-center">
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase">Emoção</span>
                                        <span className="block font-bold text-slate-700 text-sm">{rec.emotion}</span>
                                    </div>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${rec.intensity > 7 ? 'bg-red-500' : rec.intensity > 4 ? 'bg-amber-500' : 'bg-emerald-500'}`}>{rec.intensity}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* COPING CARDS CONTENT */}
            {activeSubTab === 'cards' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100 flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full space-y-3">
                            <label className="block text-xs font-bold text-indigo-800 uppercase">{t('tcc.addCard')}</label>
                            <input type="text" placeholder={t('tcc.cardFront')} className="w-full p-2.5 rounded-lg border border-indigo-200 outline-none text-sm" value={newCard.front} onChange={e => setNewCard({...newCard, front: e.target.value})} />
                            <textarea placeholder={t('tcc.cardBack')} className="w-full p-2.5 rounded-lg border border-indigo-200 outline-none resize-none h-16 text-sm" value={newCard.back} onChange={e => setNewCard({...newCard, back: e.target.value})} />
                        </div>
                        <button onClick={handleAddCard} className="w-full md:w-auto px-5 h-10 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-sm text-sm">Criar Cartão</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cards.map(card => (
                            <div key={card.id} className="relative h-56 perspective-1000 group cursor-pointer" onClick={() => flipCard(card.id)}>
                                <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${card.flipped ? 'rotate-y-180' : ''}`}>
                                    {/* Front */}
                                    <div className="absolute w-full h-full bg-white rounded-xl p-6 border border-slate-200 shadow-sm backface-hidden flex flex-col items-center justify-center text-center">
                                        <AlertTriangle size={24} className="text-amber-500 mb-3" />
                                        <p className="font-bold text-slate-800 text-base leading-snug">{card.front}</p>
                                        <p className="text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest">{t('tcc.flip')}</p>
                                    </div>
                                    {/* Back */}
                                    <div className="absolute w-full h-full bg-indigo-600 rounded-xl p-6 shadow-md backface-hidden rotate-y-180 flex flex-col items-center justify-center text-center text-white">
                                        <CheckCircle size={24} className="text-indigo-200 mb-3" />
                                        <p className="font-medium text-base leading-relaxed">{card.back}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {cards.length === 0 && (
                            <div className="col-span-full py-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl text-sm">
                                <p>Nenhum cartão criado.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const SchemaPanel = () => {
    const { t } = useLanguage();
    const [activeSubTab, setActiveSubTab] = useState<'schemas' | 'modes'>('schemas');
    const [activeSchemas, setActiveSchemas] = useState<Record<string, SchemaItem>>({});
    const [activeModes, setActiveModes] = useState<Record<string, number>>({}); 

    const toggleSchema = (schema: any) => {
        const current = activeSchemas[schema.id];
        if (current) {
            const newState = { ...activeSchemas };
            delete newState[schema.id];
            setActiveSchemas(newState);
        } else {
            setActiveSchemas({
                ...activeSchemas,
                [schema.id]: { ...schema, active: true, intensity: 5 }
            });
        }
    };

    const updateIntensity = (id: string, val: number) => {
        if (!activeSchemas[id]) return;
        setActiveSchemas({
            ...activeSchemas,
            [id]: { ...activeSchemas[id], intensity: val }
        });
    };

    const toggleMode = (modeId: string) => {
        if (activeModes[modeId]) {
            const newModes = { ...activeModes };
            delete newModes[modeId];
            setActiveModes(newModes);
        } else {
            setActiveModes({ ...activeModes, [modeId]: 5 });
        }
    };

    const updateModeIntensity = (modeId: string, val: number) => {
        setActiveModes(prev => ({ ...prev, [modeId]: val }));
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Sub-Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
                <button onClick={() => setActiveSubTab('schemas')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeSubTab === 'schemas' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500'}`}>Esquemas</button>
                <button onClick={() => setActiveSubTab('modes')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeSubTab === 'modes' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500'}`}>Modos (Estados)</button>
            </div>

            {/* SCHEMAS CONTENT */}
            {activeSubTab === 'schemas' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                            <LayoutGrid size={18} className="text-rose-500" /> Esquemas Ativos
                        </h3>
                        {Object.keys(activeSchemas).length === 0 ? (
                            <p className="text-slate-400 text-sm text-center py-4">Clique nos esquemas abaixo para ativá-los.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Fixed type error: cast s to any to ensure properties like id/name/domain are accessible when inference is incomplete */}
                                {Object.values(activeSchemas).map((s: any) => (
                                    <div key={s.id} className="p-3 bg-rose-50 rounded-lg border border-rose-100 flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-rose-900 text-sm">{s.name}</h4>
                                            <p className="text-[10px] text-rose-700/70">{s.domain}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input type="range" min="1" max="10" className="w-20 accent-rose-600 h-1.5 bg-rose-200 rounded-lg appearance-none" value={s.intensity} onChange={e => updateIntensity(s.id, parseInt(e.target.value))} />
                                            <span className="font-bold text-rose-800 w-5 text-center text-sm">{s.intensity}</span>
                                            <button onClick={() => toggleSchema(s)} className="p-1 hover:bg-rose-200 rounded text-rose-700 ml-1"><X size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-700 mb-3 text-xs uppercase tracking-wide">Biblioteca de Esquemas</h3>
                        <div className="flex flex-wrap gap-2">
                            {SCHEMAS_LIST.map(s => (
                                <button key={s.id} onClick={() => toggleSchema(s)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${activeSchemas[s.id] ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:text-rose-600'}`}>{s.name}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODES CONTENT */}
            {activeSubTab === 'modes' && (
                <div className="space-y-5 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {SCHEMA_MODES.map(mode => {
                            const isActive = !!activeModes[mode.id];
                            return (
                                <div key={mode.id} className={`p-3 rounded-xl border transition-all cursor-pointer ${isActive ? 'bg-white border-slate-300 shadow-sm ring-1 ring-indigo-500/20' : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`} onClick={() => toggleMode(mode.id)}>
                                    <div className="flex justify-between items-start mb-1.5">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${mode.color}`}>{mode.category}</span>
                                        {isActive && <CheckCircle size={14} className="text-indigo-600" />}
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm">{mode.name}</h4>
                                    
                                    {isActive && (
                                        <div className="mt-3 pt-3 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-2">
                                                <Thermometer size={12} className="text-slate-400" />
                                                <input 
                                                    type="range" min="0" max="10" 
                                                    value={activeModes[mode.id]} 
                                                    onChange={e => updateModeIntensity(mode.id, parseInt(e.target.value))}
                                                    className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                />
                                                <span className="text-xs font-bold w-5 text-right">{activeModes[mode.id]}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {Object.keys(activeModes).length > 0 && (
                        <div className="bg-slate-800 text-white p-3 rounded-lg flex justify-between items-center shadow-md">
                            <span className="font-bold text-xs pl-2">Modos ativos: {Object.keys(activeModes).length}</span>
                            <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-xs font-bold transition-colors">Salvar Registro</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const PsychoPanel = () => {
    const { t } = useLanguage();
    const [dreams, setDreams] = useState<DreamEntry[]>([]);
    const [newDream, setNewDream] = useState<Partial<DreamEntry>>({});
    const [activeTab, setActiveTab] = useState<'dream' | 'free' | 'signifiers'>('dream');
    const [freeText, setFreeText] = useState('');
    
    // Signifiers
    const [signifiers, setSignifiers] = useState<{id: string, text: string, count: number}[]>([]);
    const [newSignifier, setNewSignifier] = useState('');

    const handleSaveDream = () => {
        if (!newDream.title) return;
        setDreams([{
            ...newDream,
            id: Math.random().toString(36),
            date: new Date().toISOString()
        } as DreamEntry, ...dreams]);
        setNewDream({});
    };

    const addSignifier = () => {
        if(!newSignifier.trim()) return;
        const exists = signifiers.find(s => s.text.toLowerCase() === newSignifier.toLowerCase());
        if(exists) {
            setSignifiers(prev => prev.map(s => s.id === exists.id ? {...s, count: s.count + 1} : s));
        } else {
            setSignifiers([...signifiers, { id: Math.random().toString(36), text: newSignifier, count: 1 }]);
        }
        setNewSignifier('');
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex bg-slate-100 p-1 rounded-lg w-fit flex-wrap">
                <button onClick={() => setActiveTab('dream')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'dream' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>{t('psycho.dreams')}</button>
                <button onClick={() => setActiveTab('free')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'free' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>{t('psycho.association')}</button>
                <button onClick={() => setActiveTab('signifiers')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'signifiers' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>{t('psycho.signifiers')}</button>
            </div>

            {activeTab === 'dream' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Moon size={18} className="text-purple-600" />
                            <h3 className="font-bold text-slate-800 text-base">Novo Registro Onírico</h3>
                        </div>
                        <div className="space-y-3">
                            <input type="text" placeholder="Título / Tema Central" className="w-full p-2.5 border-b-2 border-slate-100 focus:border-purple-500 outline-none font-bold text-base bg-transparent" value={newDream.title || ''} onChange={e => setNewDream({...newDream, title: e.target.value})} />
                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t('psycho.manifest')}</label><textarea className="w-full p-2.5 rounded-lg bg-slate-50 border-none outline-none h-24 resize-none text-sm" placeholder="Descrição literal do sonho..." value={newDream.manifestContent || ''} onChange={e => setNewDream({...newDream, manifestContent: e.target.value})} /></div>
                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t('psycho.latent')}</label><textarea className="w-full p-2.5 rounded-lg bg-purple-50/50 border-none outline-none h-20 resize-none text-sm" placeholder="Associações, sentimentos, resíduos diurnos..." value={newDream.associations || ''} onChange={e => setNewDream({...newDream, associations: e.target.value})} /></div>
                            <button onClick={handleSaveDream} className="w-full h-10 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors text-sm">{t('psycho.saveDream')}</button>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {dreams.map(dream => (
                            <div key={dream.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer">
                                <div className="flex justify-between mb-1"><h4 className="font-bold text-slate-800 text-sm">{dream.title}</h4><span className="text-xs text-slate-400">{new Date(dream.date).toLocaleDateString()}</span></div>
                                <p className="text-xs text-slate-600 line-clamp-3 italic">"{dream.manifestContent}"</p>
                            </div>
                        ))}
                        {dreams.length === 0 && (<div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl p-8"><Cloud className="mb-2 opacity-30" size={32} /><p className="text-sm">Nenhum sonho registrado.</p></div>)}
                    </div>
                </div>
            )}

            {activeTab === 'free' && (
                <div className="bg-amber-50 rounded-xl p-6 border border-amber-100 shadow-sm relative min-h-[400px]">
                    <Feather className="absolute top-6 right-6 text-amber-200 opacity-50" size={48} />
                    <h3 className="font-serif font-bold text-xl text-amber-900 mb-4 italic">Associação Livre</h3>
                    <textarea className="w-full h-[300px] bg-transparent border-none outline-none text-amber-900 text-base leading-relaxed font-serif resize-none placeholder:text-amber-800/30" placeholder="Comece a escrever o que vier à mente, sem censura..." value={freeText} onChange={e => setFreeText(e.target.value)} />
                    <div className="absolute bottom-4 right-6 text-xs text-amber-800/50">{freeText.length} caracteres</div>
                </div>
            )}

            {activeTab === 'signifiers' && (
                <div className="space-y-5">
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                        <div className="flex gap-3">
                            <input type="text" placeholder="Palavra ou termo recorrente..." className="flex-1 p-2.5 bg-slate-50 rounded-lg border-none outline-none focus:ring-2 focus:ring-amber-200 text-sm" value={newSignifier} onChange={e => setNewSignifier(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSignifier()} />
                            <button onClick={addSignifier} className="px-5 h-10 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors text-sm">{t('psycho.addSignifier')}</button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {signifiers.map(sig => (
                            <div key={sig.id} className="group relative bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:border-amber-300 transition-all">
                                <span className="text-base font-serif italic text-slate-800">{sig.text}</span>
                                <span className="absolute -top-1.5 -right-1.5 bg-amber-100 text-amber-800 text-[9px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-white shadow-sm">{sig.count}</span>
                                <button onClick={() => setSignifiers(prev => prev.filter(s => s.id !== sig.id))} className="absolute inset-0 bg-red-50/90 flex items-center justify-center rounded-xl opacity-0 group-hover:opacity-100 transition-opacity text-red-500"><Trash2 size={16} /></button>
                            </div>
                        ))}
                         {signifiers.length === 0 && <p className="text-slate-400 w-full text-center py-8 text-sm">Nenhum significante rastreado ainda.</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export const ClinicalTools: React.FC = () => {
  const { t } = useLanguage();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'tcc' | 'schema' | 'psycho'>('tcc');

  const patient = MOCK_PATIENTS.find(p => p.id === selectedPatientId);

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl p-6 bg-slate-900 shadow-xl shadow-indigo-900/10 border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 opacity-90"></div>
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-300 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm">
                    <Boxes size={12} />
                    <span>Clínica Integrada</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-2 leading-tight">{t('tools.title')}</h1>
                <p className="text-indigo-200 text-sm leading-relaxed max-w-xl">
                    {t('tools.subtitle')}
                </p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-3 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wide">Paciente</h3>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
                      {MOCK_PATIENTS.map(p => (
                          <button
                            key={p.id}
                            onClick={() => setSelectedPatientId(p.id)}
                            className={`w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left ${selectedPatientId === p.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
                          >
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                                  {p.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-bold truncate ${selectedPatientId === p.id ? 'text-indigo-700' : 'text-slate-700'}`}>{p.name}</p>
                              </div>
                              {selectedPatientId === p.id && <ChevronDown className="text-indigo-600 -rotate-90" size={14} />}
                          </button>
                      ))}
                  </div>
              </div>
          </div>

          {/* Main Area */}
          <div className="lg:col-span-3">
              {selectedPatientId ? (
                  <div className="space-y-6 animate-fadeIn">
                      {/* Tool Tabs */}
                      <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                          {[
                              { id: 'tcc', label: t('tools.tcc'), icon: <BrainCircuit size={16} />, color: 'text-indigo-600' },
                              { id: 'schema', label: t('tools.schema'), icon: <LayoutGrid size={16} />, color: 'text-rose-600' },
                              { id: 'psycho', label: t('tools.psycho'), icon: <Feather size={16} />, color: 'text-amber-600' },
                          ].map(tool => (
                              <button 
                                key={tool.id}
                                onClick={() => setActiveTool(tool.id as any)}
                                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                                    activeTool === tool.id ? `bg-slate-50 ${tool.color} shadow-sm border border-slate-100` : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                  {tool.icon} {tool.label}
                              </button>
                          ))}
                      </div>

                      {/* Tool Content */}
                      <div>
                          {activeTool === 'tcc' && <TCCPanel />}
                          {activeTool === 'schema' && <SchemaPanel />}
                          {activeTool === 'psycho' && <PsychoPanel />}
                      </div>
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                      <Boxes size={40} className="mb-3 opacity-20" />
                      <p className="font-medium text-base">Selecione um paciente</p>
                      <p className="text-xs">Escolha na lista ao lado para acessar as ferramentas clínicas.</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
