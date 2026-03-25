import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PageHeader } from '../../components/UI/PageHeader';
import { Patient } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { 
  Zap, Plus, Trash2, Edit3, Save, RotateCcw, 
  HelpCircle, Sparkles, CheckCircle2, ArrowRight, 
  ChevronRight, X, Loader2, Smile, Heart, Shield,
  Layers, Filter, Eye, Activity
} from 'lucide-react';

export const EMDRPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<'reprocess' | 'sudar' | 'resources'>('reprocess');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // EMDR Specific State
  const [sessions, setSessions] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);

  const [newSession, setNewSession] = useState({ target: '', sudInitial: 10, sudFinal: 10, belief: '', validity: 1 });
  const [newResource, setNewResource] = useState({ title: '', intensity: 1, type: 'Lugar Seguro' });

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

  const loadEmdrData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/clinical-tools/${patientId}/emdr`);
      setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
      setResources(Array.isArray(data?.resources) ? data.resources : []);
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
    if (selectedPatientId) loadEmdrData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleSaveSession = async () => {
    if (!selectedPatientId || !newSession.target) return;
    setSaving(true);
    try {
      const updatedSessions = [...sessions, { id: Date.now().toString(), ...newSession, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/emdr`, { sessions: updatedSessions, resources });
      setSessions(updatedSessions);
      setNewSession({ target: '', sudInitial: 10, sudFinal: 10, belief: '', validity: 1 });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveResource = async () => {
    if (!selectedPatientId || !newResource.title) return;
    setSaving(true);
    try {
      const updatedResources = [...resources, { id: Date.now().toString(), ...newResource, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/emdr`, { sessions, resources: updatedResources });
      setResources(updatedResources);
      setNewResource({ title: '', intensity: 1, type: 'Lugar Seguro' });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-16 animate-fadeIn">
      <PageHeader
        icon={<Zap />}
        title="EMDR - Reprocessamento de Traumas"
        subtitle={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Dessensibilização & Reprocessamento"}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        actions={selectedPatient && (
          <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => setActiveSub('reprocess')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'reprocess' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Eye size={14}/> Reprocessar</div>
              </button>
              <button 
                onClick={() => setActiveSub('resources')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'resources' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Shield size={14}/> Recursos</div>
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
                <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-6">
                    <Zap size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">EMDR Workspace</h2>
                <p className="text-slate-400 text-sm max-w-md mx-auto">Workflow automatizado para Reprocessamento de Traumas e Escalameto SUD.</p>
            </div>
          ) : (
            <>
              {activeSub === 'reprocess' && (
                <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4 animate-slideUpFade">
                    <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4">
                        <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Sessão de Reprocessamento</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alvo / Memória Traumática</label>
                                <textarea className="w-full p-4 rounded-2xl bg-rose-50/50 border border-rose-100/50 text-sm font-bold text-rose-900 focus:bg-white transition-all h-24 resize-none" value={newSession.target} onChange={e => setNewSession({...newSession, target: e.target.value})} placeholder="Descrição breve da memória..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SUD Inicial (0-10)</label>
                                    <input type="number" className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-black text-center outline-none" value={newSession.sudInitial} onChange={e => setNewSession({...newSession, sudInitial: parseInt(e.target.value)})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SUD Final (0-10)</label>
                                    <input type="number" className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-black text-center outline-none" value={newSession.sudFinal} onChange={e => setNewSession({...newSession, sudFinal: parseInt(e.target.value)})} />
                                </div>
                            </div>
                            <button onClick={handleSaveSession} className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-indigo-700 transition-all">Registrar Alvo</button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {sessions.map(s => (
                            <div key={s.id} className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm group">
                                <div className="flex gap-6 items-center">
                                    <div className="space-y-1 flex-1">
                                        <h4 className="text-base font-black text-slate-800 uppercase tracking-tight italic">"{s.target}"</h4>
                                        <div className="flex items-center gap-4">
                                            <span className="text-[9px] font-black p-2 bg-rose-50 text-rose-600 rounded-xl leading-none">SUD Inicial: {s.sudInitial}</span>
                                            <ArrowRight size={14} className="text-slate-300"/>
                                            <span className="text-[9px] font-black p-2 bg-emerald-50 text-emerald-600 rounded-xl leading-none">SUD Final: {s.sudFinal}</span>
                                        </div>
                                    </div>
                                    <div className="w-px h-12 bg-slate-100" />
                                    <div className="text-center">
                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Dessensibilização</p>
                                        <p className="text-xl font-black text-emerald-600">-{s.sudInitial - s.sudFinal}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              )}

              {activeSub === 'resources' && (
                <div className="space-y-6 animate-slideUpFade">
                    <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Shield size={24} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Instalação de Recursos</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* FORM RECURSO */}
                            <div className="bg-slate-50 p-6 rounded-[28px] border border-slate-100 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recurso / Lugar Seguro</label>
                                    <input className="w-full h-12 px-4 rounded-2xl bg-white border border-slate-100 text-sm font-bold shadow-sm outline-none" value={newResource.title} onChange={e => setNewResource({...newResource, title: e.target.value})} placeholder="Ex: Praia secreta, Montanha..." />
                                </div>
                                <button onClick={handleSaveResource} className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-indigo-700 transition-all">Instalar Recurso</button>
                            </div>
                            {resources.map(r => (
                                <div key={r.id} className="bg-white rounded-[28px] border border-indigo-100 p-6 shadow-sm flex flex-col justify-between hover:scale-105 transition-all group">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">{r.title}</h4>
                                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center"><CheckCircle2 size={16}/></div>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-4">Ponto de Estabilização</span>
                                </div>
                            ))}
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
