import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PageHeader } from '../../components/UI/PageHeader';
import { Patient } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { 
  Feather, Plus, Trash2, Edit3, Save, RotateCcw, 
  HelpCircle, Sparkles, CheckCircle2, ArrowRight, 
  ChevronRight, X, Loader2, Smile, Heart, Shield,
  Layers, Filter, Eye, Activity, Share2, Users, Moon,
  Star
} from 'lucide-react';

export const JunguianaPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<'dreams' | 'symbols' | 'shadow'>('dreams');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Jungian Specific State
  const [dreams, setDreams] = useState<any[]>([]);
  const [symbols, setSymbols] = useState<any[]>([]);

  const [newDream, setNewDream] = useState({ title: '', content: '', symbols: '', interpretation: '' });
  const [newSymbol, setNewSymbol] = useState({ name: '', meaning: '', personalConnection: '' });

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

  const loadJunguianaData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/clinical-tools/${patientId}/junguiana`);
      setDreams(Array.isArray(data?.dreams) ? data.dreams : []);
      setSymbols(Array.isArray(data?.symbols) ? data.symbols : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const pid = searchParams.get('patient_id');
    if (pid) setSelectedPatientId(pid);
  }, [searchParams]);

  useEffect(() => {
    if (selectedPatientId) loadJunguianaData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleSaveDream = async () => {
    if (!selectedPatientId || !newDream.content) return;
    setSaving(true);
    try {
      const updatedDreams = [...dreams, { id: Date.now().toString(), ...newDream, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/junguiana`, { dreams: updatedDreams, symbols });
      setDreams(updatedDreams);
      setNewDream({ title: '', content: '', symbols: '', interpretation: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSymbol = async () => {
    if (!selectedPatientId || !newSymbol.name) return;
    setSaving(true);
    try {
      const updatedSymbols = [...symbols, { id: Date.now().toString(), ...newSymbol, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/junguiana`, { dreams, symbols: updatedSymbols });
      setSymbols(updatedSymbols);
      setNewSymbol({ name: '', meaning: '', personalConnection: '' });
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
        title="Psicologia Analítica (Jung)"
        subtitle={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Símbolos, Sonhos & Individuação"}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        actions={selectedPatient && (
          <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => setActiveSub('dreams')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'dreams' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Moon size={14}/> Sonhos</div>
              </button>
              <button 
                onClick={() => setActiveSub('symbols')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'symbols' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Star size={14}/> Símbolos</div>
              </button>
          </div>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        <ClinicalSidebar 
            patients={patients}
            selectedPatientId={selectedPatientId}
            onSelectPatient={setSelectedPatientId}
            patientSearch={patientSearch}
            setPatientSearch={setPatientSearch}
            isLoading={isLoading && patients.length === 0}
            t={t}
        />

        <div className="space-y-6">
          {!selectedPatient ? (
            <div className="space-y-6 animate-fadeIn text-center py-20 bg-white rounded-[40px] border border-slate-100 shadow-sm flex flex-col items-center">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6">
                    <Feather size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Jungian Workspace</h2>
                <p className="text-slate-400 text-sm max-w-md mx-auto">Exploração dos símbolos do inconsciente e acompanhamento do processo de individuação.</p>
            </div>
          ) : (
            <>
              {activeSub === 'dreams' && (
                <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4 animate-slideUpFade">
                    <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4">
                        <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Registrar Sonho</h3>
                        <div className="space-y-4">
                            <input className="w-full h-12 px-4 rounded-2xl bg-white border border-slate-100 text-sm font-bold shadow-sm outline-none" value={newDream.title} onChange={e => setNewDream({...newDream, title: e.target.value})} placeholder="Título do Sonho" />
                            <textarea className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm focus:bg-white h-32 resize-none" value={newDream.content} onChange={e => setNewDream({...newDream, content: e.target.value})} placeholder="Relato do Sonho..." />
                            <textarea className="w-full p-4 rounded-2xl bg-indigo-50/20 border border-indigo-100/30 text-sm focus:bg-white h-24 resize-none italic font-bold text-indigo-900" value={newDream.symbols} onChange={e => setNewDream({...newDream, symbols: e.target.value})} placeholder="Símbolos e Imaginário..." />
                            <button onClick={handleSaveDream} className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-indigo-700 transition-all">Sincronizar Inconsciente</button>
                        </div>
                    </div>
                    <div className="space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar px-1">
                        {dreams.map(d => (
                            <div key={d.id} className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm group hover:border-indigo-200 transition-all relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={async () => {
                                        const next = dreams.filter(it => it.id !== d.id);
                                        await api.put(`/clinical-tools/${selectedPatientId}/junguiana`, { dreams: next, symbols });
                                        setDreams(next);
                                    }} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center"><Moon size={20}/></div>
                                        <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none italic">"{d.title || 'Sem título'}"</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">{d.content}</p>
                                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Simbolismo</span>
                                        <p className="text-xs font-bold text-indigo-900 leading-relaxed italic">{d.symbols}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              )}

              {activeSub === 'symbols' && (
                <div className="space-y-6 animate-slideUpFade">
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-10">
                            <Star size={160} />
                        </div>
                        <div className="relative z-10 space-y-8">
                             <h3 className="text-2xl font-black uppercase tracking-tight">Dicionário de Símbolos Pessoal</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-indigo-300 uppercase tracking-widest">Símbolo / Arquétipo</label>
                                        <input className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-6 text-sm font-bold text-white outline-none focus:bg-white/10 transition-all shadow-inner" value={newSymbol.name} onChange={e => setNewSymbol({...newSymbol, name: e.target.value})} placeholder="Ex: A Grande Mãe, Labirinto, Raposa..." />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-indigo-300 uppercase tracking-widest">Significado / Conexão Pessoal</label>
                                        <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-sm font-medium text-white outline-none focus:bg-white/10 transition-all h-24 resize-none shadow-inner" value={newSymbol.meaning} onChange={e => setNewSymbol({...newSymbol, meaning: e.target.value})} placeholder="O que esse símbolo evoca ao paciente?" />
                                    </div>
                                    <button onClick={handleSaveSymbol} className="w-full h-14 bg-white text-indigo-900 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-slate-50 transition-all">Fixar Arquetipia</button>
                                </div>
                                <div className="space-y-4">
                                     <h4 className="text-[10px] font-black text-indigo-200/40 uppercase tracking-widest">Simbolismos Mapeados</h4>
                                     <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                                         {symbols.map(s => (
                                             <div key={s.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md">
                                                 <p className="text-sm font-black text-white uppercase tracking-tight mb-2 underline decoration-indigo-500 decoration-2 underline-offset-4">{s.name}</p>
                                                 <p className="text-xs text-indigo-100/70 font-medium leading-relaxed italic">"{s.meaning}"</p>
                                             </div>
                                         ))}
                                     </div>
                                </div>
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
