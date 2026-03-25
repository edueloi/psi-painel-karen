import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PageHeader } from '../../components/UI/PageHeader';
import { Patient, DreamRecord, CounterTransference } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { 
  Feather, Plus, Trash2, Edit3, Save, RotateCcw, RefreshCcw, 
  Moon, MessagesSquare, ScanSearch, Activity, Sparkles, AlertTriangle, 
  CheckCircle2, ArrowRight, PenLine, ChevronRight, X, Loader2, Quote, Ghost, Eye,
  MessageSquare, BrainCircuit
} from 'lucide-react';

export const PsychoanalysisPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<'dreams' | 'free' | 'signifiers' | 'counter'>('dreams');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tools State
  const [dreams, setDreams] = useState<DreamRecord[]>([]);
  const [freeText, setFreeText] = useState('');
  const [signifiers, setSignifiers] = useState<any[]>([]);
  const [counterTransference, setCounterTransference] = useState<CounterTransference[]>([]);

  // Form States
  const [newDream, setNewDream] = useState<Partial<DreamRecord>>({});
  const [editingDreamId, setEditingDreamId] = useState<string | null>(null);
  const [newSignifier, setNewSignifier] = useState('');
  const [newCounter, setNewCounter] = useState({ feeling: '', observation: '' });

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

  const loadPsychoData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/clinical-tools/${patientId}/psycho`);
      setDreams(Array.isArray(data?.dreams) ? data.dreams : []);
      setFreeText(data?.freeText || '');
      setSignifiers(Array.isArray(data?.signifiers) ? data.signifiers : []);

      // Load counter tool
      const counterResp = await api.get<any>(`/clinical-tools/${patientId}/psycho/counter`);
      setCounterTransference(Array.isArray(counterResp?.data) ? counterResp.data : []);
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
    if (['dreams', 'free', 'signifiers', 'counter'].includes(tab as string)) setActiveSub(tab as any);
  }, [searchParams]);

  useEffect(() => {
    if (selectedPatientId) loadPsychoData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleSaveDream = async () => {
    if (!selectedPatientId || !newDream.title) return;
    setSaving(true);
    try {
      const url = editingDreamId 
        ? `/clinical-tools/${selectedPatientId}/psycho/dreams/${editingDreamId}`
        : `/clinical-tools/${selectedPatientId}/psycho/dreams`;
      
      await (editingDreamId ? api.put(url, newDream) : api.post(url, newDream));
      setEditingDreamId(null);
      setNewDream({});
      loadPsychoData(selectedPatientId);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSignifier = async () => {
    if (!selectedPatientId || !newSignifier.trim()) return;
    setSaving(true);
    try {
      await api.post(`/clinical-tools/${selectedPatientId}/psycho/signifiers`, { term: newSignifier });
      setNewSignifier('');
      loadPsychoData(selectedPatientId);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFreeText = async () => {
    if (!selectedPatientId) return;
    setSaving(true);
    try {
      await api.put(`/clinical-tools/${selectedPatientId}/psycho/free`, { content: freeText });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCounter = async () => {
    if (!selectedPatientId || !newCounter.feeling) return;
    setSaving(true);
    try {
      const newList = [...counterTransference, { id: Date.now().toString(), ...newCounter, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/psycho/counter`, { data: newList });
      setNewCounter({ feeling: '', observation: '' });
      setCounterTransference(newList);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-16 animate-fadeIn">
      <PageHeader
        icon={<Feather />}
        title="Abordagem Psicanalítica"
        subtitle={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Exploração do Inconsciente & Transferência"}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        actions={selectedPatient && (
          <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => setActiveSub('dreams')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'dreams' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Moon size={14}/> Sonhos</div>
              </button>
              <button 
                onClick={() => setActiveSub('free')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'free' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><MessagesSquare size={14}/> Livre</div>
              </button>
              <button 
                onClick={() => setActiveSub('signifiers')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'signifiers' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><ScanSearch size={14}/> Significantes</div>
              </button>
              <button 
                onClick={() => setActiveSub('counter')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'counter' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Eye size={14}/> Contra-Transf</div>
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
                <div className="bg-gradient-to-br from-amber-600 to-amber-900 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Feather size={120} />
                    </div>
                    <div className="relative z-10 max-w-2xl space-y-4">
                        <div className="px-3 py-1 bg-white/10 rounded-full border border-white/20 w-fit backdrop-blur-md">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-100 italic">Exploração do Inconsciente</span>
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter leading-none uppercase">Clínica da Escuta<br/>Psicanalítica</h2>
                        <p className="text-amber-100/70 text-[11px] font-medium leading-relaxed">
                            Mapeie a cadeia de significantes, analise o material onírico e sustente o lugar da transferência no setting analítico.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { title: 'Material Onírico', desc: 'Onirógrafo para registro e análise de sonhos.', icon: <Activity size={22}/> },
                        { title: 'Livre Associação', desc: 'Espaço para a fala sem censura do sujeito.', icon: <MessageSquare size={22}/> },
                        { title: 'Significantes', desc: 'Mapeamento de palavras-chave estruturantes.', icon: <ScanSearch size={22}/> }
                    ].map((feat, i) => (
                        <div key={i} className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                             <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-amber-50 group-hover:text-amber-600 transition-all">
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
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-loose italic">Selecione um paciente para iniciar a análise.</p>
                </div>
            </div>
          ) : (
            <>
              {activeSub === 'dreams' && (
                <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 animate-slideUpFade">
                    {/* NOVO SONHO */}
                    <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm space-y-6 h-fit">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-slate-800 text-lg tracking-tight uppercase">Relato do Sonho</h3>
                            <button onClick={() => { setEditingDreamId(null); setNewDream({}); }} className="text-slate-400 hover:text-amber-600 transition-colors"><RotateCcw size={18}/></button>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título / Identificador</label>
                                <input 
                                    className="w-full h-14 px-6 rounded-3xl bg-slate-50 border border-slate-100 text-sm font-black focus:bg-white focus:ring-4 focus:ring-amber-500/5 focus:border-amber-400 outline-none transition-all shadow-inner"
                                    value={newDream.title || ''}
                                    onChange={e => setNewDream({...newDream, title: e.target.value})}
                                    placeholder="Ex: O Labirinto sem Fim"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Conteúdo Manifesto (O Sonho)</label>
                                <textarea 
                                    className="w-full p-6 rounded-[32px] bg-slate-50 border border-slate-100 text-base font-medium focus:bg-white focus:ring-4 focus:ring-amber-500/5 focus:border-amber-400 outline-none transition-all h-32 resize-none shadow-inner leading-relaxed"
                                    value={newDream.manifest || ''}
                                    onChange={e => setNewDream({...newDream, manifest: e.target.value})}
                                    placeholder="O que o paciente relatou ter sonhado?"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Associações (Latente)</label>
                                <textarea 
                                    className="w-full p-6 rounded-[32px] bg-amber-50/20 border border-amber-100 text-base font-medium text-amber-900 focus:bg-white focus:ring-4 focus:ring-amber-500/5 focus:border-amber-400 outline-none transition-all h-32 resize-none shadow-inner leading-relaxed"
                                    value={newDream.latent || ''}
                                    onChange={e => setNewDream({...newDream, latent: e.target.value})}
                                    placeholder="Quais sentidos surgiram durante a associação livre?"
                                />
                            </div>
                            
                            <button 
                                onClick={handleSaveDream}
                                disabled={saving}
                                className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-amber-100 transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin"/> : editingDreamId ? <Save size={16}/> : <Plus size={16}/>}
                                {editingDreamId ? 'Atualizar' : 'Registrar'}
                            </button>
                        </div>
                    </div>
                    
                    {/* HISTORICO SONHOS */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-6 mb-2 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                            <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-3"><Moon size={20} className="text-indigo-900"/> Material Onírico</h3>
                            <button onClick={() => loadPsychoData(selectedPatientId)} className="p-2 text-slate-400 hover:text-amber-600 transition-colors"><RefreshCcw size={18}/></button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-6 max-h-[75vh] overflow-y-auto px-1 custom-scrollbar pb-10">
                            {dreams.length === 0 ? (
                                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-16 text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-loose">Nenhum sonho mapeado.</p>
                                </div>
                            ) : (
                                dreams.slice().reverse().map(d => (
                                    <div key={d.id} className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-xl transition-all group relative animate-slideInRight">
                                        <div className="absolute top-0 right-0 p-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                                            <button onClick={() => { setEditingDreamId(d.id); setNewDream(d); }} className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center hover:bg-amber-600 hover:text-white transition-all shadow-sm shadow-amber-100 ring-2 ring-white"><Edit3 size={18}/></button>
                                            <button onClick={async () => { await api.delete(`/clinical-tools/${selectedPatientId}/psycho/dreams/${d.id}`); loadPsychoData(selectedPatientId); }} className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm shadow-red-100 ring-2 ring-white"><Trash2 size={18}/></button>
                                        </div>
                                        
                                        <div className="space-y-8">
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">{new Date(d.createdAt || "").toLocaleDateString()}</span>
                                                <h4 className="text-2xl font-black text-slate-800 leading-none tracking-tighter mb-4 pr-12">{d.title}</h4>
                                                <div className="h-1 w-12 bg-amber-500 rounded-full" />
                                            </div>
                                            
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">M</div>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conteúdo Manifesto</span>
                                                    </div>
                                                    <p className="text-base text-slate-600 italic leading-relaxed font-medium">"{d.manifest}"</p>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-lg bg-amber-600 flex items-center justify-center text-[10px] font-black text-white">L</div>
                                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest font-black">Interpretação Latente</span>
                                                    </div>
                                                    <p className="text-base font-black text-slate-800 leading-relaxed border-l-4 border-amber-100 pl-6">"{d.latent || 'Agurdando associações...'}"</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
              )}

              {activeSub === 'free' && (
                <div className="flex flex-col gap-6 animate-slideUpFade">
                    <div className="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm space-y-6 flex-1 flex flex-col min-h-[70vh]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-900 rounded-[20px] flex items-center justify-center">
                                    <Quote size={24}/>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-none">Livre Associação</h3>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Notas do analista durante a sessão</p>
                                </div>
                            </div>
                            <button 
                                onClick={handleSaveFreeText} 
                                disabled={saving}
                                className="px-8 py-4 bg-indigo-950 hover:bg-black text-white rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all flex items-center gap-3"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Gravar Reflexões
                            </button>
                        </div>
                        
                        <div className="flex-1 relative">
                             <div className="absolute top-6 left-6 opacity-5 pointer-events-none">
                                <Feather size={200} />
                             </div>
                             <textarea 
                                className="w-full h-full min-h-[400px] bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 text-sm font-medium text-slate-800 tracking-tight leading-relaxed focus:bg-white focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-200 outline-none transition-all placeholder:text-slate-200 resize-none shadow-inner"
                                value={freeText}
                                onChange={e => setFreeText(e.target.value)}
                                placeholder="Abra espaço para a fala do sujeito. O que emerge sem censura?"
                             />
                        </div>
                    </div>
                </div>
              )}

              {activeSub === 'signifiers' && (
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 animate-slideUpFade">
                    {/* GRID DE SIGNIFICANTES */}
                    <div className="space-y-6">
                        <div className="bg-amber-600 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden">
                             <div className="absolute top-0 left-0 p-6 opacity-10">
                                <ScanSearch size={80} />
                             </div>
                             <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                                <div className="space-y-1 flex-1 text-center md:text-left">
                                     <h2 className="text-xl font-black leading-none uppercase tracking-tighter">Cadeia de Significantes</h2>
                                     <p className="text-amber-100 font-medium text-[11px] max-w-sm">Mapeie as palavras-chave que se repetem e sustentam a estrutura do sujeito.</p>
                                </div>
                                <div className="bg-white p-1 rounded-2xl shadow-xl flex items-center pr-2">
                                    <input 
                                        type="text"
                                        className="h-10 px-4 bg-transparent text-slate-800 font-black outline-none w-[180px] lg:w-[240px] text-sm placeholder:text-slate-300"
                                        placeholder="Novo significante..."
                                        value={newSignifier}
                                        onChange={e => setNewSignifier(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSaveSignifier()}
                                    />
                                    <button 
                                        onClick={handleSaveSignifier}
                                        className="w-8 h-8 bg-amber-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-900 transition-all shadow-lg active:scale-90"
                                    >
                                        <Plus size={18}/>
                                    </button>
                                </div>
                             </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-4">
                            {signifiers.length === 0 ? (
                                <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px] p-32 text-center text-slate-300 font-black uppercase tracking-widest text-[10px]">Aguardando marcações do Simbólico...</div>
                            ) : (
                                signifiers.slice().reverse().map(s => (
                                    <div key={s.id} className="group relative">
                                        <div className="flex items-center gap-2 px-4 py-3 h-12 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-lg hover:border-amber-200 hover:-translate-y-1 transition-all cursor-default pr-12 relative overflow-hidden">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                            <span className="text-sm font-black text-slate-800 lowercase tracking-tight">#{s.term}</span>
                                            
                                            <button 
                                                onClick={async () => { await api.delete(`/clinical-tools/${selectedPatientId}/psycho/signifiers/${s.id}`); loadPsychoData(selectedPatientId); }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* INFOTIP ANALISE */}
                    <div className="space-y-6">
                        <div className="bg-indigo-50 rounded-[40px] p-10 border border-indigo-100 space-y-8 animate-slideInRight duration-1000">
                             <div className="flex flex-col items-center text-center gap-3">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 shadow-pulse">
                                    <ScanSearch size={22}/>
                                </div>
                                <h4 className="font-black text-indigo-900 uppercase text-[10px] tracking-widest">Dica Clínica</h4>
                             </div>
                             <p className="text-xs text-indigo-700/80 font-medium leading-relaxed text-center italic">"O significante é o que representa o sujeito para outro significante." <br/><br/> <span className="font-black text-indigo-900">— Jacques Lacan</span></p>
                             <div className="h-px bg-indigo-200" />
                             <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest leading-loose">Identifique os pontos de estofo onde o sentido é interrompido.</p>
                        </div>
                    </div>
                </div>
              )}

              {activeSub === 'counter' && (
                <div className="space-y-8 animate-slideUpFade">
                    <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
                        {/* FORM CONTRA-TRANSF */}
                        <div className="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm space-y-8 h-fit">
                            <div className="flex flex-col items-center gap-4 text-center">
                                <div className="w-16 h-16 bg-slate-900 rounded-[28px] flex items-center justify-center text-white shadow-xl">
                                    <Eye size={30} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">O Olhar do Analista</h3>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Contra-Transferência</p>
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">O que senti?</label>
                                    <input 
                                        className="w-full h-14 px-6 rounded-3xl bg-slate-50 border border-slate-100 text-sm font-bold focus:bg-white outline-none transition-all shadow-inner"
                                        value={newCounter.feeling}
                                        onChange={e => setNewCounter({...newCounter, feeling: e.target.value})}
                                        placeholder="Ex: Tédio, urgência, maternal..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observação Subjetiva</label>
                                    <textarea 
                                        className="w-full h-40 p-6 rounded-[32px] bg-slate-50 border border-slate-100 text-base font-medium focus:bg-white outline-none resize-none shadow-inner leading-relaxed"
                                        value={newCounter.observation}
                                        onChange={e => setNewCounter({...newCounter, observation: e.target.value})}
                                        placeholder="Como esse sentimento ilumina a estrutura do paciente?"
                                    />
                                </div>
                                <button 
                                    onClick={handleSaveCounter}
                                    className="w-full h-16 bg-slate-900 text-white rounded-[32px] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
                                >
                                    Arquivar Auto-Análise
                                </button>
                            </div>
                        </div>

                        {/* LISTA CONTRA-TRANSF */}
                        <div className="space-y-6">
                            <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-3 px-6 py-4 bg-white rounded-[32px] border border-slate-100 shadow-sm">
                                <Activity size={20} className="text-indigo-900"/> Notas de Super-Ego Clínico
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {counterTransference.length === 0 ? (
                                    <div className="md:col-span-2 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px] p-24 text-center">
                                         <p className="text-[10px] font-black text-slate-400 uppercase">Use este espaço para monitorar sua própria contratransferência.</p>
                                    </div>
                                ) : (
                                    counterTransference.slice().reverse().map(c => (
                                        <div key={c.id} className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm hover:border-slate-900 transition-all group">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="px-5 py-2.5 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-100">
                                                    {c.feeling}
                                                </div>
                                                <button 
                                                   onClick={async () => {
                                                        const newList = counterTransference.filter(it => it.id !== c.id);
                                                        await api.put(`/clinical-tools/${selectedPatientId}/psycho/counter`, { data: newList });
                                                        setCounterTransference(newList);
                                                   }}
                                                   className="text-slate-200 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                            <p className="text-sm font-medium text-slate-600 leading-relaxed italic">"{c.observation}"</p>
                                            <div className="mt-8 pt-4 border-t border-slate-50 text-[9px] font-black text-slate-300 uppercase tracking-widest text-right italic">
                                                Registrado em {new Date(c.createdAt || "").toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
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
