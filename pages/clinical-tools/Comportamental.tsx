import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PageHeader } from '../../components/UI/PageHeader';
import { Patient } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { 
  Settings2, Plus, Trash2, Edit3, Save, RotateCcw, 
  HelpCircle, Sparkles, CheckCircle2, ArrowRight, 
  ChevronRight, X, Loader2, Smile, Heart, Shield,
  Layers, Filter, Eye, Activity, Share2, Users, Moon,
  Star, ClipboardList, Target
} from 'lucide-react';

export const ComportamentalPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<'abc' | 'contingency' | 'tokens'>('abc');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Behavioral Specific State
  const [abcData, setAbcData] = useState<any[]>([]);
  const [contingencies, setContingencies] = useState<any[]>([]);

  const [newAbc, setNewAbc] = useState({ antecedent: '', behavior: '', consequence: '', function: 'Reforço Positivo' });
  const [newContingency, setNewContingency] = useState({ behavior: '', reward: '', frequency: '' });

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

  const loadComportamentalData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/clinical-tools/${patientId}/comportamental`);
      setAbcData(Array.isArray(data?.abc) ? data.abc : []);
      setContingencies(Array.isArray(data?.contingencies) ? data.contingencies : []);
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
    if (selectedPatientId) loadComportamentalData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleSaveAbc = async () => {
    if (!selectedPatientId || !newAbc.behavior) return;
    setSaving(true);
    try {
      const updatedAbc = [...abcData, { id: Date.now().toString(), ...newAbc, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/comportamental`, { abc: updatedAbc, contingencies });
      setAbcData(updatedAbc);
      setNewAbc({ antecedent: '', behavior: '', consequence: '', function: 'Reforço Positivo' });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContingency = async () => {
    if (!selectedPatientId || !newContingency.behavior) return;
    setSaving(true);
    try {
      const updatedConts = [...contingencies, { id: Date.now().toString(), ...newContingency, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/comportamental`, { abc: abcData, contingencies: updatedConts });
      setContingencies(updatedConts);
      setNewContingency({ behavior: '', reward: '', frequency: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-16 animate-fadeIn">
      <PageHeader
        icon={<Settings2 />}
        title="Psicologia Comportamental"
        subtitle={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Análise Funcional (ABC) & Contingências"}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        actions={selectedPatient && (
          <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-lg border border-slate-200 shadow-sm">
              <button 
                onClick={() => setActiveSub('abc')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold   transition-all ${activeSub === 'abc' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><ClipboardList size={14}/> Análise ABC</div>
              </button>
              <button 
                onClick={() => setActiveSub('contingency')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold   transition-all ${activeSub === 'contingency' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Target size={14}/> Contingência</div>
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
                <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-6">
                    <Settings2 size={40} />
                </div>
                <h2 className="text-2xl font-semibold text-slate-800">Behavioral Workspace</h2>
                <p className="text-slate-400 text-sm max-w-md mx-auto">Módulo de Análise do Comportamento, focado em antecedentes, comportamentos e consequências.</p>
            </div>
          ) : (
            <>
              {activeSub === 'abc' && (
                <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4 animate-slideUpFade">
                    <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4">
                        <h3 className="font-semibold text-slate-800 text-lg">Nova Análise ABC</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-slate-400">A - Antecedente</label>
                                <textarea className="w-full p-4 rounded-lg bg-slate-50 border border-slate-100 text-sm focus:bg-white h-20 resize-none" value={newAbc.antecedent} onChange={e => setNewAbc({...newAbc, antecedent: e.target.value})} placeholder="O que aconteceu antes?" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-slate-400">B - Comportamento</label>
                                <textarea className="w-full p-4 rounded-lg bg-white border border-slate-100 text-sm font-semibold shadow-sm h-20 resize-none outline-none focus:ring-4 focus:ring-indigo-50" value={newAbc.behavior} onChange={e => setNewAbc({...newAbc, behavior: e.target.value})} placeholder="Qual foi a ação?" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-slate-400">C - Consequência</label>
                                <textarea className="w-full p-4 rounded-lg bg-slate-50 border border-slate-100 text-sm focus:bg-white h-20 resize-none" value={newAbc.consequence} onChange={e => setNewAbc({...newAbc, consequence: e.target.value})} placeholder="O que aconteceu depois?" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-semibold text-slate-400">Função Hipotética</label>
                                <select className="w-full h-12 px-4 rounded-lg bg-slate-50 border border-slate-100 text-sm outline-none" value={newAbc.function} onChange={e => setNewAbc({...newAbc, function: e.target.value})}>
                                    <option value="Reforço Positivo">Reforço Positivo (Atenção/Ganho)</option>
                                    <option value="Reforço Negativo">Reforço Negativo (Fuga/Esquiva)</option>
                                    <option value="Punição">Punição</option>
                                    <option value="Extinção">Extinção</option>
                                </select>
                            </div>
                            <button onClick={handleSaveAbc} className="w-full h-12 bg-indigo-600 text-white rounded-lg font-semibold text-xs shadow-sm hover:bg-indigo-700 transition-all">Registrar Análise</button>
                        </div>
                    </div>
                    <div className="space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar px-1">
                        {abcData.map(a => (
                            <div key={a.id} className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm group hover:border-indigo-100 transition-all">
                                <div className="grid grid-cols-3 gap-6 mb-6">
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <span className="text-[11px] font-semibold text-slate-400 block mb-2 underline decoration-slate-300 decoration-2 underline-offset-4">Antecedente</span>
                                        <p className="text-xs font-medium text-slate-600 leading-relaxed">{a.antecedent}</p>
                                    </div>
                                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                                        <span className="text-[11px] font-semibold text-indigo-400 block mb-2 underline decoration-indigo-200 decoration-2 underline-offset-4">Comportamento</span>
                                        <p className="text-xs font-semibold text-indigo-900 leading-relaxed">{a.behavior}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg">
                                        <span className="text-[11px] font-semibold text-slate-400 block mb-2 underline decoration-slate-300 decoration-2 underline-offset-4">Consequência</span>
                                        <p className="text-xs font-medium text-slate-600 leading-relaxed">{a.consequence}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                                    <span className="text-[11px] font-semibold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">{a.function}</span>
                                    <span className="text-[11px] font-semibold text-slate-300">{new Date(a.createdAt || "").toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              )}

              {activeSub === 'contingency' && (
                <div className="space-y-6 animate-slideUpFade">
                    <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Target size={24} />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-800">Acordo de Contingência</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-semibold text-slate-400">Comportamento Alvo</label>
                                    <input className="w-full h-12 px-4 rounded-lg bg-white border border-slate-100 text-sm font-semibold shadow-sm outline-none" value={newContingency.behavior} onChange={e => setNewContingency({...newContingency, behavior: e.target.value})} placeholder="Qual comportamento queremos aumentar/diminuir?" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-semibold text-slate-400">Reforçador / Recompensa</label>
                                    <input className="w-full h-12 px-4 rounded-lg bg-slate-50 border border-slate-100 text-sm outline-none" value={newContingency.reward} onChange={e => setNewContingency({...newContingency, reward: e.target.value})} placeholder="O que o paciente ganha ao cumprir?" />
                                </div>
                                <button onClick={handleSaveContingency} className="w-full h-12 bg-indigo-600 text-white rounded-lg font-semibold text-xs shadow-sm hover:bg-indigo-700 transition-all">Firmar Compromisso</button>
                            </div>
                            <div className="bg-indigo-50 rounded-[32px] p-8 border border-indigo-100 space-y-4 shadow-inner">
                                <h4 className="text-[11px] font-semibold text-indigo-400 text-center underline decoration-indigo-200 decoration-2 underline-offset-4 mb-4">Mural de Contingências</h4>
                                {contingencies.map(c => (
                                    <div key={c.id} className="bg-white p-4 rounded-lg border border-indigo-100 flex items-center justify-between shadow-sm">
                                        <div>
                                            <p className="text-[11px] font-semibold text-slate-800">{c.behavior}</p>
                                            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1"><Sparkles size={10}/> Reward: {c.reward}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white"><CheckCircle2 size={20}/></div>
                                    </div>
                                ))}
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
