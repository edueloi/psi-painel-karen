import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PageHeader } from '../../components/UI/PageHeader';
import { Patient, SchemaMode, ImageryRescripting } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { 
  Puzzle, Plus, Trash2, Edit3, Save, RotateCcw, RefreshCcw, 
  Layers, Ghost, Heart, Shield, Activity, Sparkles, AlertTriangle, 
  CheckCircle2, ArrowRight, PenLine, ChevronRight, X, Loader2, Camera, User,
  BrainCircuit, ClipboardList
} from 'lucide-react';

const SCHEMA_LIBRARY = [
  'Abandono / Instabilidade', 'Desconfiança / Abuso', 'Privação Emocional', 'Defectividade / Vergonha',
  'Isolamento Social', 'Dependência / Incompetência', 'Vulnerabilidade ao Dano', 'Emaranhamento',
  'Fracasso', 'Arrogo / Grandiosidade', 'Autocontrole Insuficiente', 'Subjugação', 'Auto-sacrifício',
  'Busca de Aprovação', 'Negativismo / Pessimismo', 'Inibição Emocional', 'Padrões Inflexíveis', 'Punição'
];

const DEFAULT_MODES: SchemaMode[] = [
  { id: 'mv', name: 'Criança Vulnerável', group: 'child', active: false, intensity: 5 },
  { id: 'mz', name: 'Criança Zangada', group: 'child', active: false, intensity: 5 },
  { id: 'mi', name: 'Criança Impulsiva', group: 'child', active: false, intensity: 5 },
  { id: 'mf', name: 'Criança Feliz', group: 'child', active: false, intensity: 5 },
  { id: 'pp', name: 'Pais Punitivos', group: 'parent', active: false, intensity: 5 },
  { id: 'pe', name: 'Pais Exigentes', group: 'parent', active: false, intensity: 5 },
  { id: 'pd', name: 'Protetor Desligado', group: 'coping', active: false, intensity: 5 },
  { id: 'sc', name: 'Supercompensador', group: 'coping', active: false, intensity: 5 },
  { id: 'as', name: 'Adulto Saudável', group: 'healthy', active: false, intensity: 5 },
];

const groupBadge = (g: SchemaMode['group']) => {
  switch (g) {
    case 'child': return { cls: 'bg-rose-50 text-rose-600 ring-rose-100', icon: <Ghost size={10}/> };
    case 'parent': return { cls: 'bg-slate-50 text-slate-600 ring-slate-100', icon: <User size={10}/> };
    case 'coping': return { cls: 'bg-amber-50 text-amber-600 ring-amber-100', icon: <Shield size={10}/> };
    case 'healthy': return { cls: 'bg-emerald-50 text-emerald-600 ring-emerald-100', icon: <Heart size={10}/> };
    default: return { cls: 'bg-slate-50', icon: null };
  }
};

export const SchemaPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<'modes' | 'imagery'>('modes');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tools State
  const [activeSchemas, setActiveSchemas] = useState<string[]>([]);
  const [modes, setModes] = useState<SchemaMode[]>(DEFAULT_MODES);
  const [imagery, setImagery] = useState<ImageryRescripting[]>([]);

  // Form States
  const [newImagery, setNewImagery] = useState<Partial<ImageryRescripting>>({ emotionBefore: 5, emotionAfter: 2 });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const raw = await api.get<any[]>('/patients');
      setPatients((raw || []).map((p: any) => ({
        ...p,
        full_name: p.name || p.full_name || '',
        status: p.status === 'active' ? 'ativo' : p.status === 'inactive' ? 'inativo' : (p.status || ''),
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchemaData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const resp = await api.get<any>(`/clinical-tools/${patientId}/schema/latest`);
      setActiveSchemas(Array.isArray(resp?.active_schemas) ? resp.active_schemas : []);
      if (Array.isArray(resp?.modes) && resp.modes.length > 0) {
        setModes(resp.modes);
      } else {
        setModes(DEFAULT_MODES);
      }

      // Load imagery tool
      const imgResp = await api.get<any>(`/clinical-tools/${patientId}/schema/imagery`);
      setImagery(Array.isArray(imgResp?.data) ? imgResp.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const pid = searchParams.get('patient_id');
    const tab = searchParams.get('sub');
    if (pid) setSelectedPatientId(pid);
    if (tab === 'imagery') setActiveSub('imagery');
  }, [searchParams]);

  useEffect(() => {
    if (selectedPatientId) loadSchemaData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleToggleSchema = (name: string) => {
    setActiveSchemas(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
  };

  const handleUpdateMode = (id: string, patch: Partial<SchemaMode>) => {
    setModes(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  const handleSaveSchemaState = async () => {
    if (!selectedPatientId) return;
    setSaving(true);
    try {
      await api.post(`/clinical-tools/${selectedPatientId}/schema/snapshot`, {
        active_schemas: activeSchemas,
        modes: modes
      });
      loadSchemaData(selectedPatientId);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveImagery = async () => {
    if (!selectedPatientId || !newImagery.originalScene) return;
    setSaving(true);
    try {
      const newList = [...imagery, { id: Date.now().toString(), ...newImagery, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/schema/imagery`, { data: newList });
      setNewImagery({ emotionBefore: 5, emotionAfter: 2 });
      setImagery(newList);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-16 animate-fadeIn">
      <PageHeader
        icon={<Layers />}
        title="Terapia do Esquema"
        subtitle={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Conceitualização Clínica & Modos"}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        actions={selectedPatient && (
          <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => setActiveSub('modes')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'modes' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Puzzle size={14}/> Esquemas & Modos</div>
              </button>
              <button 
                onClick={() => setActiveSub('imagery')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'imagery' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Camera size={14}/> Ressignificação</div>
              </button>
          </div>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        {/* SIDEBAR */}
        <ClinicalSidebar 
            patients={patients}
            selectedPatientId={selectedPatientId}
            onSelectPatient={setSelectedPatientId}
            patientSearch={patientSearch}
            setPatientSearch={setPatientSearch}
            isLoading={isLoading && patients.length === 0}
            t={t}
        />

        {/* CONTENT */}
        <div className="space-y-6">
          {!selectedPatient ? (
            <div className="space-y-6 animate-fadeIn">
                <div className="bg-gradient-to-br from-rose-600 to-rose-900 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Layers size={120} />
                    </div>
                    <div className="relative z-10 max-w-2xl space-y-4">
                        <div className="px-3 py-1 bg-white/10 rounded-full border border-white/20 w-fit backdrop-blur-md">
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-100 italic">Psicoterapia Integrativa Profunda</span>
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter leading-none uppercase">Conceitualização Clínica<br/>do Esquema</h2>
                        <p className="text-rose-100/70 text-[11px] font-medium leading-relaxed">
                            Identifique esquemas desadaptativos, monitore a flutuação de modos e intervenha em traumas através da imagética.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { title: 'Esquemas Iniciais', desc: 'Mapeamento de padrões desadaptativos precoces.', icon: <Puzzle size={22}/> },
                        { title: 'Trabalho com Modos', desc: 'Identificação e gestão de estados emocionais.', icon: <Activity size={22}/> },
                        { title: 'Imagética', desc: 'Ressignificação de cenas traumáticas na cena.', icon: <Camera size={22}/> }
                    ].map((feat, i) => (
                        <div key={i} className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                             <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-rose-50 group-hover:text-rose-600 transition-all">
                                {feat.icon}
                             </div>
                             <h3 className="font-black text-slate-800 uppercase text-[11px] tracking-tight mb-1">{feat.title}</h3>
                             <p className="text-[9px] text-slate-400 font-medium leading-relaxed">{feat.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-8 text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-200 mx-auto mb-4 shadow-sm">
                        <Plus size={32} />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-loose italic">Selecione um paciente para iniciar o mapeamento.</p>
                </div>
            </div>
          ) : (
            <>
              {activeSub === 'modes' && (
                <div className="space-y-4 animate-slideUpFade">
                    {/* ESQUEMAS SELECIONADOS */}
                    <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                    <Puzzle size={18} />
                                </div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase">Esquemas Ativos</h3>
                            </div>
                            <button 
                                onClick={handleSaveSchemaState} 
                                disabled={saving}
                                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-100 flex items-center gap-2 active:scale-95"
                            >
                                {saving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Salvar Estado
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {SCHEMA_LIBRARY.map(s => {
                                const on = activeSchemas.includes(s);
                                return (
                                    <button 
                                        key={s}
                                        onClick={() => handleToggleSchema(s)}
                                        className={`px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-tight text-left transition-all border ${on ? 'bg-rose-600 text-white border-rose-500 shadow-md ring-2 ring-rose-50' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-white hover:border-rose-200'}`}
                                    >
                                        {s}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* MODOS */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {modes.map(mode => {
                            const badge = groupBadge(mode.group);
                            return (
                                <div key={mode.id} className={`bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm transition-all hover:bg-slate-50/50 flex flex-col gap-6 relative group ${mode.active ? 'ring-2 ring-indigo-500' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${badge.cls} ring-4 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12`}>
                                                {badge.icon}
                                            </div>
                                            <h4 className="font-black text-slate-800 tracking-tight text-lg">{mode.name}</h4>
                                        </div>
                                        <button 
                                            onClick={() => handleUpdateMode(mode.id, { active: !mode.active })}
                                            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${mode.active ? 'bg-indigo-600 text-white rotate-90' : 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
                                        >
                                            <RefreshCcw size={16}/>
                                        </button>
                                    </div>
                                    
                                    <div className={`space-y-4 transition-all duration-500 ${mode.active ? 'opacity-100' : 'opacity-40 blur-[2px]'}`}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intensidade do Modo</span>
                                            <span className="font-black text-slate-800 text-xl tracking-tighter">{mode.intensity || 0}/10</span>
                                        </div>
                                        <input 
                                            type="range"
                                            min="0"
                                            max="10"
                                            className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-rose-600"
                                            value={mode.intensity || 0}
                                            onChange={e => handleUpdateMode(mode.id, { intensity: parseInt(e.target.value) })}
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                             <div className="h-1 bg-slate-100 rounded-full relative overflow-hidden"><div className="absolute top-0 left-0 h-full bg-rose-500" style={{ width: `${(mode.intensity / 10) * 100}%` }} /></div>
                                             <div className="h-1 bg-slate-100 rounded-full relative overflow-hidden"><div className="absolute top-0 right-0 h-full bg-emerald-500" style={{ width: `${((10-mode.intensity) / 10) * 100}%` }} /></div>
                                        </div>
                                    </div>
                                    
                                    {!mode.active && (
                                        <div className="absolute inset-0 bg-white/40 flex items-center justify-center pointer-events-none rounded-[32px]">
                                             <span className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full opacity-60">Modo Inativo</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
              )}

              {activeSub === 'imagery' && (
                <div className="space-y-6 animate-slideUpFade">
                    <div className="bg-gradient-to-br from-rose-600 to-rose-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <Camera size={100} />
                        </div>
                        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-center">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black tracking-tight leading-none uppercase">Ressignificação Imagetica</h2>
                                <p className="text-rose-100/90 text-[11px] font-medium leading-relaxed max-w-sm">Transforme cenas traumáticas ou gatilhos através da intervenção na cena imaginada.</p>
                            </div>
                            
                            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-[24px] space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-rose-200 uppercase tracking-widest">Cena Original (Gatilho)</label>
                                    <textarea 
                                        className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 text-xs font-bold placeholder:text-white/30 outline-none focus:bg-white/20 transition-all h-24 resize-none"
                                        placeholder="Descreva a cena como ela ocorre..."
                                        value={newImagery.originalScene}
                                        onChange={e => setNewImagery({...newImagery, originalScene: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-rose-200 uppercase tracking-widest">Cena Ressignificada</label>
                                    <textarea 
                                        className="w-full bg-white/20 border border-white/20 rounded-2xl p-4 text-xs font-black placeholder:text-white/40 outline-none focus:bg-white/30 transition-all h-24 resize-none"
                                        placeholder="O Adulto Saudável intervém e..."
                                        value={newImagery.rescriptedScene}
                                        onChange={e => setNewImagery({...newImagery, rescriptedScene: e.target.value})}
                                    />
                                </div>
                                <button 
                                    onClick={handleSaveImagery}
                                    className="w-full h-14 bg-white text-rose-900 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all"
                                >
                                    Gravar Ressignificação
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 px-4 shadow-sm py-4 bg-white rounded-3xl border border-rose-100">
                             <Activity size={18} className="text-rose-500" /> Linha do Tempo de Ressignificação
                        </h3>
                        
                        <div className="grid grid-cols-1 gap-6">
                            {imagery.length === 0 ? (
                                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px] p-24 text-center">
                                    <p className="text-sm font-black text-slate-400 uppercase">Nenhuma ressignificação imagética documentada.</p>
                                </div>
                            ) : (
                                imagery.slice().reverse().map(img => (
                                    <div key={img.id} className="bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm hover:shadow-2xl transition-all group overflow-hidden">
                                        <div className="flex flex-col lg:flex-row gap-10 items-start">
                                             <div className="flex-1 space-y-4">
                                                 <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 font-black text-[10px]">1</div>
                                                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">A Cena Imutável</span>
                                                 </div>
                                                 <p className="text-base font-medium text-slate-500 bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 italic leading-relaxed">"{img.originalScene}"</p>
                                             </div>
                                             
                                             <div className="flex flex-col items-center justify-center pt-20 hidden lg:flex">
                                                 <ArrowRight size={32} className="text-rose-200 animate-pulse" />
                                             </div>

                                             <div className="flex-1 space-y-4">
                                                 <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center text-white font-black text-[10px]">2</div>
                                                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">O Poder de Mudar</span>
                                                 </div>
                                                 <p className="text-base font-black text-rose-900 bg-rose-50/30 p-6 rounded-[32px] border border-rose-100 leading-relaxed shadow-inner">"{img.rescriptedScene}"</p>
                                             </div>
                                        </div>
                                        
                                        <div className="mt-8 pt-8 border-t border-slate-50 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-300">
                                             <span>Data da Sessão: {new Date(img.createdAt || "").toLocaleDateString()}</span>
                                             <button 
                                                onClick={async () => {
                                                    const newList = imagery.filter(it => it.id !== img.id);
                                                    await api.put(`/clinical-tools/${selectedPatientId}/schema/imagery`, { data: newList });
                                                    setImagery(newList);
                                                }}
                                                className="text-slate-200 hover:text-red-500 transition-colors"
                                             >
                                                Remover Registro
                                             </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
