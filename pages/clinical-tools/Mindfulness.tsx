import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PageHeader } from '../../components/UI/PageHeader';
import { Patient } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { Heart, Save, Plus, Trash2, Sun, Sparkles, Activity, Anchor, MapPin } from 'lucide-react';

export const MindfulnessPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<'practices' | 'bodyscan' | 'anchor'>('practices');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Mindfulness State
  const [practices, setPractices] = useState<any[]>([]);
  const [bodyscans, setBodyscans] = useState<any[]>([]);
  const [anchors, setAnchors] = useState<any[]>([]);

  const [newPractice, setNewPractice] = useState({ name: '', duration: '', focus_level: 5, observation: '' });
  const [newBodyscan, setNewBodyscan] = useState({ body_part: '', sensation: '', intensity: 5, interpretation: '' });
  const [newAnchor, setNewAnchor] = useState({ trigger: '', grounding_technique: '', effectiveness: 5 });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const raw = await api.get<any[]>('/patients');
      setPatients((raw || []).map((p: any) => ({
        ...p,
        full_name: p.name || p.full_name || '',
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/clinical-tools/${patientId}/mindfulness`);
      setPractices(Array.isArray(data?.practices) ? data.practices : []);
      setBodyscans(Array.isArray(data?.bodyscans) ? data.bodyscans : []);
      setAnchors(Array.isArray(data?.anchors) ? data.anchors : []);
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
    if (selectedPatientId) loadData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleSaveData = async (updatedState: any) => {
    if (!selectedPatientId) return;
    try {
       await api.put(`/clinical-tools/${selectedPatientId}/mindfulness`, {
        practices: updatedState.practices || practices,
        bodyscans: updatedState.bodyscans || bodyscans,
        anchors: updatedState.anchors || anchors
       });
    } catch (e) {
      console.error(e);
    } 
  };

  const addPractice = () => {
    if (!newPractice.name) return;
    const upd = [...practices, { id: Date.now().toString(), date: new Date().toISOString(), ...newPractice }];
    setPractices(upd);
    setNewPractice({ name: '', duration: '', focus_level: 5, observation: '' });
    handleSaveData({ practices: upd });
  };

  const addBodyscan = () => {
    if (!newBodyscan.body_part) return;
    const upd = [...bodyscans, { id: Date.now().toString(), date: new Date().toISOString(), ...newBodyscan }];
    setBodyscans(upd);
    setNewBodyscan({ body_part: '', sensation: '', intensity: 5, interpretation: '' });
    handleSaveData({ bodyscans: upd });
  };

  const addAnchor = () => {
    if (!newAnchor.trigger) return;
    const upd = [...anchors, { id: Date.now().toString(), date: new Date().toISOString(), ...newAnchor }];
    setAnchors(upd);
    setNewAnchor({ trigger: '', grounding_technique: '', effectiveness: 5 });
    handleSaveData({ anchors: upd });
  };

  const removePractice = (id: string) => {
    const upd = practices.filter(p => p.id !== id);
    setPractices(upd);
    handleSaveData({ practices: upd });
  };

  const removeBodyscan = (id: string) => {
    const upd = bodyscans.filter(p => p.id !== id);
    setBodyscans(upd);
    handleSaveData({ bodyscans: upd });
  };

  const removeAnchor = (id: string) => {
    const upd = anchors.filter(p => p.id !== id);
    setAnchors(upd);
    handleSaveData({ anchors: upd });
  };

  return (
    <div className="flex flex-col gap-4 pb-16 animate-fadeIn">
      <PageHeader
        icon={<Sun />}
        title="Atenção Plena (Mindfulness)"
        subtitle={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Práticas, Escaneamento Corporal e Ancoragem"}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        actions={selectedPatient && (
          <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => setActiveSub('practices')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'practices' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Sparkles size={14}/> Diário de Prática</div>
              </button>
              <button 
                onClick={() => setActiveSub('bodyscan')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'bodyscan' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Activity size={14}/> Body Scan</div>
              </button>
              <button 
                onClick={() => setActiveSub('anchor')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'anchor' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Anchor size={14}/> Ancoragem</div>
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
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                    <Sun size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Mindfulness Workspace</h2>
                <p className="text-slate-400 text-sm max-w-md mx-auto">Acompanhamento completo de meditação, atenção plena corporificada e regulação por enraizamento.</p>
            </div>
          ) : (
            <>
              {activeSub === 'practices' && (
                 <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4 animate-slideUpFade">
                    <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4">
                       <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Registrar Prática</h3>
                       <div className="space-y-4">
                          <input 
                            className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none" 
                            placeholder="Nome (Ex: Meditação Guiada, Caminhada)"
                            value={newPractice.name}
                            onChange={e => setNewPractice({...newPractice, name: e.target.value})}
                          />
                          <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Duração (Min)</label>
                                  <input 
                                    type="number"
                                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" 
                                    placeholder="Ex: 15"
                                    value={newPractice.duration}
                                    onChange={e => setNewPractice({...newPractice, duration: e.target.value})}
                                  />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Foco (1 a 10)</label>
                                  <input 
                                    type="number"
                                    min="1" max="10"
                                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" 
                                    value={newPractice.focus_level}
                                    onChange={e => setNewPractice({...newPractice, focus_level: Number(e.target.value)})}
                                  />
                              </div>
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Observações / Distrações</label>
                              <textarea 
                                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm focus:bg-white h-24 resize-none outline-none focus:border-emerald-300 transition-all" 
                                placeholder="Desafios, onde a mente foi parar, como retornou ao foco..."
                                value={newPractice.observation}
                                onChange={e => setNewPractice({...newPractice, observation: e.target.value})}
                              />
                          </div>
                          <button onClick={addPractice} className="w-full h-12 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                            <Plus size={16} /> Salvar Prática
                          </button>
                       </div>
                    </div>

                    <div className="space-y-4">
                        {practices.length === 0 ? (
                          <div className="bg-white rounded-[32px] border border-slate-100 p-10 shadow-sm text-center">
                             <p className="text-slate-400 font-bold">Nenhuma prática registrada ainda.</p>
                          </div>
                        ) : (
                          <div className="grid gap-4">
                             {practices.map(p => (
                                <div key={p.id} className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm group relative flex items-start gap-4">
                                   <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                       <Sparkles size={20} />
                                   </div>
                                   <div className="flex-1">
                                      <div className="flex justify-between items-center mb-1">
                                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{p.name}</h4>
                                          <span className="text-[10px] text-slate-400 font-bold">{new Date(p.date).toLocaleDateString()}</span>
                                      </div>
                                      <div className="flex gap-2 mb-2">
                                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-black">{p.duration} min</span>
                                          <span className={`text-[10px] px-2 py-0.5 rounded font-black ${p.focus_level >= 7 ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>Foco: {p.focus_level}/10</span>
                                      </div>
                                      <p className="text-xs text-slate-600 font-medium">"{p.observation}"</p>
                                   </div>
                                   <button onClick={() => removePractice(p.id)} className="p-2 bg-rose-50 text-rose-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Trash2 size={14} />
                                   </button>
                                </div>
                             ))}
                          </div>
                        )}
                    </div>
                 </div>
              )}

              {activeSub === 'bodyscan' && (
                 <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4 animate-slideUpFade">
                    <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4">
                       <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Body Scan (Escaneamento)</h3>
                       <div className="space-y-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Onde está ocorrendo?</label>
                              <input 
                                className="w-full h-12 px-4 rounded-xl bg-orange-50/50 border border-orange-100 text-sm font-bold outline-none focus:bg-white focus:border-orange-300" 
                                placeholder="Peito, garganta, estômago, nuca..."
                                value={newBodyscan.body_part}
                                onChange={e => setNewBodyscan({...newBodyscan, body_part: e.target.value})}
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sensação Física</label>
                              <input 
                                className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" 
                                placeholder="Aperto, calor, formigamento..."
                                value={newBodyscan.sensation}
                                onChange={e => setNewBodyscan({...newBodyscan, sensation: e.target.value})}
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Intensidade (1-10)</label>
                              <input 
                                type="number" min="1" max="10"
                                className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" 
                                value={newBodyscan.intensity}
                                onChange={e => setNewBodyscan({...newBodyscan, intensity: Number(e.target.value)})}
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Interpretação Mental</label>
                              <textarea 
                                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm h-20 resize-none outline-none" 
                                placeholder="O que a mente está contando sobre essa sensação?"
                                value={newBodyscan.interpretation}
                                onChange={e => setNewBodyscan({...newBodyscan, interpretation: e.target.value})}
                              />
                          </div>
                          <button onClick={addBodyscan} className="w-full h-12 bg-orange-500 text-white rounded-xl font-black uppercase text-xs shadow-lg hover:bg-orange-600 transition-all flex items-center justify-center gap-2">
                             Mapear Corpo
                          </button>
                       </div>
                    </div>

                    <div className="space-y-4">
                        {bodyscans.length === 0 ? (
                          <div className="bg-white rounded-[32px] border border-slate-100 p-10 shadow-sm text-center">
                             <p className="text-slate-400 font-bold">Nenhum escaneamento salvo.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {bodyscans.map(b => (
                                <div key={b.id} className="bg-white rounded-[24px] border border-slate-200 shadow-sm group p-5 relative">
                                   <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => removeBodyscan(b.id)} className="text-red-400 hover:text-red-600">
                                         <Trash2 size={16} />
                                      </button>
                                   </div>
                                   <div className="flex items-center gap-2 mb-3">
                                       <MapPin size={16} className="text-orange-500" />
                                       <h4 className="font-bold text-slate-800 text-sm uppercase tracking-tight">{b.body_part}</h4>
                                   </div>
                                   <div className="space-y-2">
                                       <p className="text-xs text-slate-600"><span className="font-black text-slate-800">Sensação:</span> {b.sensation}</p>
                                       <p className="text-xs text-slate-600"><span className="font-black text-slate-800">Intensidade:</span> {b.intensity}/10</p>
                                       {b.interpretation && (
                                          <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-xl mt-2 border border-slate-100">"{b.interpretation}"</p>
                                       )}
                                   </div>
                                </div>
                             ))}
                          </div>
                        )}
                    </div>
                 </div>
              )}

              {activeSub === 'anchor' && (
                 <div className="animate-slideUpFade">
                    <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Anchor size={24} />
                            </div>
                            <div>
                               <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Técnicas de Ancoragem</h3>
                               <p className="text-sm font-medium text-slate-500">Voltar ao presente quando a mente se perde ou acelera.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Gatilho (Quando a mente viajou)</label>
                                    <input 
                                      className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none" 
                                      placeholder="Ex: Ansiedade sobre o futuro..."
                                      value={newAnchor.trigger}
                                      onChange={e => setNewAnchor({...newAnchor, trigger: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Técnica Usada (A Âncora)</label>
                                    <input 
                                      className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" 
                                      placeholder="Ex: 5-4-3-2-1, Som da respiração..."
                                      value={newAnchor.grounding_technique}
                                      onChange={e => setNewAnchor({...newAnchor, grounding_technique: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest pl-1">Eficácia (1-10)</label>
                                    <input 
                                      type="number" min="1" max="10"
                                      className="w-full h-12 px-4 rounded-xl bg-emerald-50/50 border border-emerald-100 text-sm outline-none text-emerald-700 font-bold" 
                                      value={newAnchor.effectiveness}
                                      onChange={e => setNewAnchor({...newAnchor, effectiveness: Number(e.target.value)})}
                                    />
                                </div>
                                <button onClick={addAnchor} className="w-full h-12 bg-blue-600 text-white rounded-xl font-black uppercase text-xs shadow-lg hover:bg-blue-700 transition-all">
                                   Registrar Retorno
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Histórico de Ancoragem</h4>
                                {anchors.map(a => (
                                    <div key={a.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between group">
                                       <div>
                                          <div className="flex items-center gap-2 mb-1">
                                             <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-100 px-2 rounded">Gatilho</span>
                                             <span className="text-xs font-bold text-slate-800">{a.trigger}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                             <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-100 px-2 rounded">Âncora</span>
                                             <span className="text-xs font-medium text-slate-600">{a.grounding_technique} (Eficácia: {a.effectiveness}/10)</span>
                                          </div>
                                       </div>
                                       <button onClick={() => removeAnchor(a.id)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                          <Trash2 size={16} />
                                       </button>
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
