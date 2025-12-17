
import React, { useState } from 'react';
import { MOCK_PATIENTS } from '../constants';
import { 
  Boxes, ChevronDown, Plus, Save, Brain, LayoutGrid, Feather, 
  ArrowRight, Activity, Smile, Frown, Meh, AlertTriangle, Cloud, 
  Moon, Edit3, Trash2, CheckCircle, BrainCircuit, X
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

const COGNITIVE_DISTORTIONS = [
    { id: 'd1', label: 'tcc.distortions.allOrNothing', desc: 'Pensar em extremos (8 ou 80).' },
    { id: 'd2', label: 'tcc.distortions.catastrophizing', desc: 'Esperar sempre o pior cenário.' },
    { id: 'd3', label: 'tcc.distortions.emotionalReasoning', desc: 'Sentir como prova da realidade.' },
    { id: 'd4', label: 'tcc.distortions.personalization', desc: 'Assumir culpa excessiva.' },
];

// --- COMPONENTS ---

const TCCPanel = () => {
    const { t } = useLanguage();
    const [records, setRecords] = useState<RPDRecord[]>([]);
    const [newRPD, setNewRPD] = useState<Partial<RPDRecord>>({ intensity: 5 });

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

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Input Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                    <BrainCircuit className="text-indigo-600" /> {t('tcc.rpd')}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('tcc.situation')}</label>
                            <textarea 
                                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 h-24 resize-none focus:bg-white focus:border-indigo-500 transition-colors"
                                placeholder="Onde? Quando? O que aconteceu?"
                                value={newRPD.situation || ''}
                                onChange={e => setNewRPD({...newRPD, situation: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('tcc.emotion')}</label>
                            <div className="flex gap-2 items-center">
                                <input 
                                    type="text" 
                                    className="flex-1 p-3 rounded-xl border border-slate-200"
                                    placeholder="Ex: Raiva, Medo"
                                    value={newRPD.emotion || ''}
                                    onChange={e => setNewRPD({...newRPD, emotion: e.target.value})}
                                />
                                <input 
                                    type="number" min="0" max="10"
                                    className="w-16 p-3 rounded-xl border border-slate-200 text-center font-bold"
                                    value={newRPD.intensity}
                                    onChange={e => setNewRPD({...newRPD, intensity: parseInt(e.target.value)})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('tcc.thought')}</label>
                            <textarea 
                                className="w-full p-3 rounded-xl border-2 border-indigo-100 bg-white h-24 resize-none focus:border-indigo-500"
                                placeholder="O que passou pela sua cabeça?"
                                value={newRPD.thought || ''}
                                onChange={e => setNewRPD({...newRPD, thought: e.target.value})}
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('tcc.distortion')}</label>
                                <select 
                                    className="w-full p-3 rounded-xl border border-slate-200 bg-white"
                                    value={newRPD.distortion}
                                    onChange={e => setNewRPD({...newRPD, distortion: e.target.value})}
                                >
                                    <option value="">Selecione...</option>
                                    {COGNITIVE_DISTORTIONS.map(d => (
                                        <option key={d.id} value={d.label}>{t(d.label)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">&nbsp;</label>
                                <button 
                                    onClick={handleSaveRPD}
                                    className="w-full p-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-colors flex justify-center items-center gap-2"
                                >
                                    <Plus size={18} /> {t('tcc.addEntry')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* History List */}
            <div className="space-y-4">
                {records.map(rec => (
                    <div key={rec.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 relative overflow-hidden group">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                        <div className="flex-1">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs font-bold text-slate-400">{new Date(rec.date).toLocaleDateString()}</span>
                                {rec.distortion && <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold">{t(rec.distortion)}</span>}
                            </div>
                            <p className="font-bold text-slate-800 mb-1">"{rec.thought}"</p>
                            <p className="text-sm text-slate-600">Situação: {rec.situation}</p>
                        </div>
                        <div className="flex items-center gap-4 border-l border-slate-100 pl-4">
                            <div className="text-center">
                                <span className="block text-xs font-bold text-slate-400 uppercase">Emoção</span>
                                <span className="block font-bold text-slate-700">{rec.emotion}</span>
                            </div>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${rec.intensity > 7 ? 'bg-red-500' : rec.intensity > 4 ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                                {rec.intensity}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SchemaPanel = () => {
    const { t } = useLanguage();
    const [activeSchemas, setActiveSchemas] = useState<Record<string, SchemaItem>>({});

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

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Selected / Active */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
                    <LayoutGrid className="text-rose-500" /> Esquemas Ativos
                </h3>
                {Object.keys(activeSchemas).length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">Clique nos esquemas abaixo para ativá-los.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.values(activeSchemas).map(s => (
                            <div key={s.id} className="p-4 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-rose-900 text-sm">{s.name}</h4>
                                    <p className="text-xs text-rose-700/70">{s.domain}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="range" min="1" max="10" 
                                        className="w-24 accent-rose-600"
                                        value={s.intensity}
                                        onChange={e => updateIntensity(s.id, parseInt(e.target.value))}
                                    />
                                    <span className="font-bold text-rose-800 w-6 text-center">{s.intensity}</span>
                                    <button onClick={() => toggleSchema(s)} className="p-1 hover:bg-rose-200 rounded text-rose-700 ml-2"><X size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* List */}
            <div>
                <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wide">Biblioteca de Esquemas</h3>
                <div className="flex flex-wrap gap-2">
                    {SCHEMAS_LIST.map(s => (
                        <button
                            key={s.id}
                            onClick={() => toggleSchema(s)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                                activeSchemas[s.id] 
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-md transform scale-105' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:text-rose-600'
                            }`}
                        >
                            {s.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const PsychoPanel = () => {
    const { t } = useLanguage();
    const [dreams, setDreams] = useState<DreamEntry[]>([]);
    const [newDream, setNewDream] = useState<Partial<DreamEntry>>({});
    const [activeTab, setActiveTab] = useState<'dream' | 'free'>('dream');
    const [freeText, setFreeText] = useState('');

    const handleSaveDream = () => {
        if (!newDream.title) return;
        setDreams([{
            ...newDream,
            id: Math.random().toString(36),
            date: new Date().toISOString()
        } as DreamEntry, ...dreams]);
        setNewDream({});
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                <button 
                    onClick={() => setActiveTab('dream')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dream' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                >
                    {t('psycho.dreams')}
                </button>
                <button 
                    onClick={() => setActiveTab('free')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'free' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                >
                    {t('psycho.association')}
                </button>
            </div>

            {activeTab === 'dream' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <Moon className="text-purple-600" />
                            <h3 className="font-bold text-slate-800 text-lg">Novo Registro Onírico</h3>
                        </div>
                        <div className="space-y-4">
                            <input 
                                type="text" 
                                placeholder="Título / Tema Central"
                                className="w-full p-3 border-b-2 border-slate-100 focus:border-purple-500 outline-none font-bold text-lg bg-transparent"
                                value={newDream.title || ''}
                                onChange={e => setNewDream({...newDream, title: e.target.value})}
                            />
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t('psycho.manifest')}</label>
                                <textarea 
                                    className="w-full p-3 rounded-xl bg-slate-50 border-none outline-none h-32 resize-none"
                                    placeholder="Descrição literal do sonho..."
                                    value={newDream.manifestContent || ''}
                                    onChange={e => setNewDream({...newDream, manifestContent: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{t('psycho.latent')}</label>
                                <textarea 
                                    className="w-full p-3 rounded-xl bg-purple-50/50 border-none outline-none h-24 resize-none"
                                    placeholder="Associações, sentimentos, resíduos diurnos..."
                                    value={newDream.associations || ''}
                                    onChange={e => setNewDream({...newDream, associations: e.target.value})}
                                />
                            </div>
                            <button onClick={handleSaveDream} className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors">
                                {t('psycho.saveDream')}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {dreams.map(dream => (
                            <div key={dream.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer">
                                <div className="flex justify-between mb-2">
                                    <h4 className="font-bold text-slate-800">{dream.title}</h4>
                                    <span className="text-xs text-slate-400">{new Date(dream.date).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-slate-600 line-clamp-3 italic">"{dream.manifestContent}"</p>
                            </div>
                        ))}
                        {dreams.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                                <Cloud className="mb-2 opacity-30" size={48} />
                                <p>Nenhum sonho registrado.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'free' && (
                <div className="bg-amber-50 rounded-2xl p-8 border border-amber-100 shadow-sm relative min-h-[500px]">
                    <Feather className="absolute top-8 right-8 text-amber-200 opacity-50" size={64} />
                    <h3 className="font-serif font-bold text-2xl text-amber-900 mb-6 italic">Associação Livre</h3>
                    <textarea 
                        className="w-full h-[400px] bg-transparent border-none outline-none text-amber-900 text-lg leading-relaxed font-serif resize-none placeholder:text-amber-800/30"
                        placeholder="Comece a escrever o que vier à mente, sem censura..."
                        value={freeText}
                        onChange={e => setFreeText(e.target.value)}
                    />
                    <div className="absolute bottom-4 right-6 text-xs text-amber-800/50">
                        {freeText.length} caracteres
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
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-indigo-900/20 border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 opacity-90"></div>
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <Boxes size={14} />
                    <span>Clínica Integrada</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">{t('tools.title')}</h1>
                <p className="text-indigo-200 text-lg leading-relaxed max-w-xl">
                    {t('tools.subtitle')}
                </p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Paciente</h3>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
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
                              </div>
                              {selectedPatientId === p.id && <ChevronDown className="text-indigo-600 -rotate-90" size={16} />}
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
                      <div className="flex bg-white p-2 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                          {[
                              { id: 'tcc', label: t('tools.tcc'), icon: <BrainCircuit size={18} />, color: 'text-indigo-600' },
                              { id: 'schema', label: t('tools.schema'), icon: <LayoutGrid size={18} />, color: 'text-rose-600' },
                              { id: 'psycho', label: t('tools.psycho'), icon: <Feather size={18} />, color: 'text-amber-600' },
                          ].map(tool => (
                              <button 
                                key={tool.id}
                                onClick={() => setActiveTool(tool.id as any)}
                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                                    activeTool === tool.id ? `bg-slate-50 ${tool.color} shadow-inner` : 'text-slate-500 hover:text-slate-800'
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
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                      <Boxes size={48} className="mb-4 opacity-20" />
                      <p className="font-medium text-lg">Selecione um paciente</p>
                      <p className="text-sm">Escolha na lista ao lado para acessar as ferramentas clínicas.</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
