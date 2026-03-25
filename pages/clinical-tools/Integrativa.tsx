import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PageHeader } from '../../components/UI/PageHeader';
import { Patient } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { 
  Plus, Trash2, Save, Sparkles, X, Target, Heart, LayoutDashboard, Brain
} from 'lucide-react';

export const IntegrativaPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<'plan' | 'techniques'>('plan');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [techniques, setTechniques] = useState<any[]>([]);
  const [formulation, setFormulation] = useState('');
  
  const [newTechnique, setNewTechnique] = useState('');

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

  const loadIntegrativaData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/clinical-tools/${patientId}/integrativa`);
      setTechniques(Array.isArray(data?.techniques) ? data.techniques : []);
      setFormulation(data?.formulation || '');
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
    if (selectedPatientId) loadIntegrativaData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleSaveWorkspace = async (override?: any) => {
    if (!selectedPatientId) return;
    setSaving(true);
    try {
      const payload = {
        techniques: override?.techniques || techniques,
        formulation: override?.formulation !== undefined ? override.formulation : formulation
      };
      await api.put(`/clinical-tools/${selectedPatientId}/integrativa`, payload);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const addTechnique = () => {
    if (!newTechnique.trim()) return;
    const upd = [...techniques, { id: Date.now().toString(), text: newTechnique, active: true }];
    setTechniques(upd);
    setNewTechnique('');
    handleSaveWorkspace({ techniques: upd });
  };

  const removeTechnique = (id: string) => {
    const upd = techniques.filter(t => t.id !== id);
    setTechniques(upd);
    handleSaveWorkspace({ techniques: upd });
  };

  return (
    <div className="flex flex-col gap-4 pb-16 animate-fadeIn">
      <PageHeader
        icon={<LayoutDashboard />}
        title="Clínica Eclética / Integrativa"
        subtitle={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Formulação Integrativa e Seleção de Ferramentas"}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        actions={selectedPatient && (
          <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => setActiveSub('plan')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'plan' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Target size={14}/> Formulação</div>
              </button>
              <button 
                onClick={() => setActiveSub('techniques')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'techniques' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Sparkles size={14}/> Técnicas</div>
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
                    <LayoutDashboard size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Workspace Integrativo</h2>
                <p className="text-slate-400 text-sm max-w-md mx-auto">Desenvolva uma abordagem sob medida, mesclando diferentes técnicas e teorias para atender às necessidades específicas.</p>
            </div>
          ) : (
            <>
              {activeSub === 'plan' && (
                <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4 animate-slideUpFade">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight flex items-center gap-2">
                        <Brain className="text-indigo-500" size={20} /> Formulação de Caso Integrativa
                      </h3>
                      <button onClick={() => handleSaveWorkspace()} className="bg-indigo-600 text-white px-6 py-2 rounded-2xl font-black uppercase text-xs shadow-lg flex items-center gap-2 hover:bg-indigo-700 transition">
                         {saving ? <Sparkles size={14} className="animate-spin" /> : <Save size={14} />} Salvar Formulação
                      </button>
                    </div>
                    <textarea 
                      className="w-full min-h-[400px] p-6 rounded-2xl bg-slate-50 border border-slate-100 font-sans text-sm leading-relaxed outline-none focus:bg-white focus:border-indigo-400 transition-all custom-scrollbar resize-none"
                      placeholder="Construa aqui a lógica de intervenção, fatores mantenedores, hipóteses diagnósticas de diferentes abordagens..."
                      value={formulation}
                      onChange={e => setFormulation(e.target.value)}
                    />
                </div>
              )}

              {activeSub === 'techniques' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slideUpFade">
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[32px] p-8 shadow-xl text-white">
                        <h3 className="text-xl font-black uppercase tracking-tight mb-2">Plano de Técnicas</h3>
                        <p className="text-xs font-bold text-indigo-200 mb-6">Registre e combine as técnicas a serem utilizadas.</p>

                        <div className="space-y-4">
                            <input 
                              className="w-full h-12 px-4 rounded-xl bg-white/10 border border-white/20 text-sm font-bold text-white outline-none placeholder:text-white/40 focus:bg-white/20" 
                              value={newTechnique} 
                              onChange={e => setNewTechnique(e.target.value)} 
                              placeholder="Adicionar técnica (e.g. Dessensibilização, ABC...)" 
                              onKeyDown={e => e.key === 'Enter' && addTechnique()}
                            />
                            <button onClick={addTechnique} className="w-full h-12 bg-white text-indigo-900 rounded-xl font-black uppercase text-xs shadow-lg hover:bg-indigo-50 transition-all">Adicionar Técnica</button>
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Técnicas Selecionadas</h4>
                        {techniques.length === 0 ? (
                           <p className="text-sm font-medium text-slate-400 py-10 text-center">Nenhuma técnica adicionada.</p>
                        ) : (
                           <div className="space-y-3">
                              {techniques.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                   <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                         <Heart size={14} />
                                      </div>
                                      <p className="text-sm font-bold text-slate-700">{t.text}</p>
                                   </div>
                                   <button onClick={() => removeTechnique(t.id)} className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors">
                                      <Trash2 size={14} />
                                   </button>
                                </div>
                              ))}
                           </div>
                        )}
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
