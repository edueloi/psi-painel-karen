import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PageHeader } from '../../components/UI/PageHeader';
import { Patient, PhenomenonRecord, ActualizationGoal } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { 
  Heart, Plus, Trash2, Edit3, Save, RotateCcw, RefreshCcw, 
  Sun, Target, Users, Activity, Sparkles, AlertTriangle, 
  CheckCircle2, ArrowRight, PenLine, ChevronRight, X, Loader2, Smile, Zap,
  Compass, BrainCircuit
} from 'lucide-react';

export const HumanismPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<'phenomenon' | 'goals'>('phenomenon');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tools State
  const [phenomenons, setPhenomenons] = useState<PhenomenonRecord[]>([]);
  const [goals, setGoals] = useState<ActualizationGoal[]>([]);

  // Form States
  const [newPhenomenon, setNewPhenomenon] = useState({ experience: '', perception: '' });
  const [newGoal, setNewGoal] = useState('');

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

  const loadHumanismData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const resp = await api.get<any>(`/clinical-tools/${patientId}/humanism/data`);
      // Use generic clinical-tools format
      setPhenomenons(Array.isArray(resp?.data?.phenomenons) ? resp.data.phenomenons : []);
      setGoals(Array.isArray(resp?.data?.goals) ? resp.data.goals : []);
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
    if (tab === 'goals') setActiveSub('goals');
  }, [searchParams]);

  useEffect(() => {
    if (selectedPatientId) loadHumanismData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleSavePhenomenon = async () => {
    if (!selectedPatientId || !newPhenomenon.experience) return;
    setSaving(true);
    try {
      const newList = [...phenomenons, { id: Date.now().toString(), ...newPhenomenon, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/humanism/data`, { 
          data: { phenomenons: newList, goals }
      });
      setNewPhenomenon({ experience: '', perception: '' });
      setPhenomenons(newList);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGoal = async () => {
    if (!selectedPatientId || !newGoal.trim()) return;
    setSaving(true);
    try {
      const newList = [...goals, { id: Date.now().toString(), goal: newGoal, status: 'pending', createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/humanism/data`, { 
          data: { phenomenons, goals: newList }
      });
      setNewGoal('');
      setGoals(newList);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleGoal = async (id: string) => {
    if (!selectedPatientId) return;
    const newList = goals.map(g => g.id === id ? { ...g, status: g.status === 'pending' ? 'achieved' : 'pending' } as ActualizationGoal : g);
    setGoals(newList);
    await api.put(`/clinical-tools/${selectedPatientId}/humanism/data`, { 
        data: { phenomenons, goals: newList }
    });
  };

  return (
    <div className="flex flex-col gap-4 pb-16 animate-fadeIn">
      <PageHeader
        icon={<Heart />}
        title="Abordagem Humanista"
        subtitle={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Existencialismo & Fenomenologia"}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        actions={selectedPatient && (
          <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => setActiveSub('phenomenon')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'phenomenon' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Sun size={14}/> Experiência</div>
              </button>
              <button 
                onClick={() => setActiveSub('goals')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'goals' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Target size={14}/> Projeto de Ser</div>
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
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Heart size={120} />
                    </div>
                    <div className="relative z-10 max-w-2xl space-y-4">
                        <div className="px-3 py-1 bg-white/10 rounded-full border border-white/20 w-fit backdrop-blur-md">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100 italic">Existencialismo & Fenomenologia</span>
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter leading-none uppercase">Clínica da Presença<br/>e Autonomia</h2>
                        <p className="text-emerald-100/70 text-[11px] font-medium leading-relaxed">
                            Explore a experiência imediata, o projeto de vida e a responsabilidade existencial através do encontro terapêutico.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { title: 'Experiência Vivida', desc: 'Registro do encontro fenomenológico imediato.', icon: <Activity size={22}/> },
                        { title: 'Projeto de Ser', desc: 'Mapeamento de metas de autonomia e sentido.', icon: <Target size={22}/> },
                        { title: 'Aqui e Agora', desc: 'Foco na percepção e consciência do presente.', icon: <Smile size={22}/> }
                    ].map((feat, i) => (
                        <div key={i} className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                             <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
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
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-loose italic">Selecione um paciente para iniciar o encontro clínico.</p>
                </div>
            </div>
          ) : (
            <>
              {activeSub === 'phenomenon' && (
                <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6 animate-slideUpFade">
                    {/* NOVO FENOMENO */}
                    <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm space-y-6 h-fit">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="w-20 h-20 bg-emerald-50 rounded-[32px] flex items-center justify-center text-emerald-600 shadow-inner">
                                <Smile size={40} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">O Aqui e Agora</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Fenomenologia da Experiência</p>
                            </div>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Experiência Vivida</label>
                                <textarea 
                                    className="w-full h-32 p-6 rounded-[32px] bg-slate-50 border border-slate-100 text-sm font-medium focus:bg-white outline-none resize-none shadow-inner"
                                    value={newPhenomenon.experience}
                                    onChange={e => setNewPhenomenon({...newPhenomenon, experience: e.target.value})}
                                    placeholder="Descreva o que acontece no encontro terapêutico..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Percepção Terapêutica</label>
                                <textarea 
                                    className="w-full h-32 p-6 rounded-[32px] bg-emerald-50/20 border border-emerald-100 text-sm font-bold text-emerald-900 focus:bg-white outline-none resize-none shadow-inner"
                                    value={newPhenomenon.perception}
                                    onChange={e => setNewPhenomenon({...newPhenomenon, perception: e.target.value})}
                                    placeholder="Sua percepção sobre essa vivência..."
                                />
                            </div>
                            <button 
                                onClick={handleSavePhenomenon}
                                className="w-full h-12 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all"
                            >
                                Registrar Experiência
                            </button>
                        </div>
                    </div>
                    
                    {/* HISTORICO FENOMENO */}
                    <div className="space-y-6">
                        <div className="flex flex-wrap gap-6">
                            {phenomenons.length === 0 ? (
                                 <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-16 text-center">
                                    <p className="text-[11px] font-black text-slate-400 uppercase italic">Nenhuma experiência registrada.</p>
                                </div>
                            ) : (
                                phenomenons.slice().reverse().map(p => (
                                    <div key={p.id} className="w-full bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-2xl transition-all relative group overflow-hidden flex flex-col gap-4">
                                        <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                              onClick={async () => {
                                                  const newList = phenomenons.filter(it => it.id !== p.id);
                                                  await api.put(`/clinical-tools/${selectedPatientId}/humanism/data`, { data: { phenomenons: newList, goals } });
                                                  setPhenomenons(newList);
                                              }}
                                              className="w-10 h-10 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Trash2 size={18}/>
                                            </button>
                                        </div>
                                        
                                        <div className="flex flex-col lg:flex-row gap-8">
                                             <div className="flex-1 space-y-3">
                                                 <span className="text-[10px] font-black text-slate-300 uppercase underline decoration-emerald-200 underline-offset-4">O Vivido</span>
                                                 <p className="text-base text-slate-600 font-medium leading-relaxed italic">"{p.experience}"</p>
                                             </div>
                                             <div className="w-px bg-slate-100 self-stretch hidden lg:block" />
                                             <div className="flex-1 space-y-3">
                                                 <span className="text-[10px] font-black text-emerald-500 uppercase underline decoration-emerald-600 underline-offset-4">A Compreensão</span>
                                                 <p className="text-base font-black text-slate-800 leading-relaxed border-l-4 border-emerald-500 pl-6">"{p.perception}"</p>
                                             </div>
                                        </div>
                                        
                                        <div className="pt-6 border-t border-slate-50 flex justify-between items-center text-[10px] font-black uppercase text-slate-300">
                                            <span>Sessão de {new Date(p.createdAt || "").toLocaleDateString()}</span>
                                            <Sparkles size={16} className="text-emerald-300 animate-pulse" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
              )}

              {activeSub === 'goals' && (
                <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-10 animate-slideUpFade">
                    {/* PROJETO DE SER */}
                    <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden h-fit">
                        <div className="absolute top-0 right-0 p-8 opacity-5 scale-125 rotate-12">
                             <Target size={140} />
                        </div>
                        <div className="relative z-10 space-y-6">
                             <div className="space-y-2 text-center md:text-left">
                                <h3 className="text-2xl font-black leading-none uppercase tracking-tighter">Projeto de Ser</h3>
                                <p className="text-indigo-200 text-[11px] font-medium leading-relaxed italic">Metas de autorealização e autonomia.</p>
                             </div>
                             
                             <div className="bg-white/5 border border-white/10 rounded-[28px] p-4 space-y-4">
                                <textarea 
                                    className="w-full bg-white/10 border border-white/10 rounded-xl p-4 text-xs font-black placeholder:text-white/20 outline-none focus:bg-white/20 transition-all h-24 resize-none shadow-inner leading-relaxed"
                                    value={newGoal}
                                    onChange={e => setNewGoal(e.target.value)}
                                    placeholder="Ex: Assumir responsabilidade existencial..."
                                />
                                <button 
                                    onClick={handleSaveGoal}
                                    className="w-full h-12 bg-white text-indigo-950 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={16}/> Adicionar Objetivo
                                </button>
                             </div>
                        </div>
                    </div>

                    {/* LISTA GOALS */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 px-6 py-4 bg-white rounded-[32px] border border-slate-100 shadow-sm mb-6">
                             <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><Zap size={20}/></div>
                             <h3 className="font-black text-slate-800 uppercase tracking-tight">Caminho da Autorealização</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {goals.length === 0 ? (
                                <div className="md:col-span-2 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px] p-24 text-center">
                                    <p className="text-sm font-black text-slate-400 uppercase italic">Aguardando a emersão de projetos de vida.</p>
                                </div>
                            ) : (
                                goals.slice().reverse().map(g => (
                                    <div key={g.id} className={`bg-white rounded-[40px] border p-8 shadow-sm hover:shadow-2xl transition-all group flex flex-col gap-6 relative ${g.status === 'achieved' ? 'border-emerald-200 bg-emerald-50/10 shadow-emerald-50' : 'border-slate-100'}`}>
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                              onClick={async () => {
                                                  const newList = goals.filter(it => it.id !== g.id);
                                                  await api.put(`/clinical-tools/${selectedPatientId}/humanism/data`, { data: { phenomenons, goals: newList } });
                                                  setGoals(newList);
                                              }}
                                              className="text-red-200 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>

                                        <div className="flex items-start gap-4">
                                            <button 
                                              onClick={() => toggleGoal(g.id)}
                                              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shrink-0 ${g.status === 'achieved' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 shadow-inner'}`}
                                            >
                                                <CheckCircle2 size={24}/>
                                            </button>
                                            <div className="space-y-2">
                                                <p className={`text-lg font-black leading-tight tracking-tight ${g.status === 'achieved' ? 'text-emerald-900 line-through opacity-50' : 'text-slate-800'}`}>{g.goal}</p>
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{new Date(g.createdAt || "").toLocaleDateString()}</span>
                                            </div>
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
