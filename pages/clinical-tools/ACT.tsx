import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PageHeader } from '../../components/UI/PageHeader';
import { Patient } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { 
  Target, Plus, Trash2, Edit3, Save, RotateCcw, 
  ChevronRight, X, Loader2, Compass, Zap, Heart, LayoutGrid, ArrowRight, CheckCircle2
} from 'lucide-react';

export const ACTPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<'values' | 'defusion' | 'matrix'>('values');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [values, setValues] = useState<any[]>([]);
  const [defusions, setDefusions] = useState<any[]>([]);
  const [matrix, setMatrix] = useState({ bottom_left: '', bottom_right: '', top_left: '', top_right: '' });

  const [newValue, setNewValue] = useState({ area: '', value: '', action: '' });
  const [newDefusion, setNewDefusion] = useState({ thought: '', technique: '', outcome: '' });

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

  const loadActData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/clinical-tools/${patientId}/act`);
      setValues(Array.isArray(data?.values) ? data.values : []);
      setDefusions(Array.isArray(data?.defusions) ? data.defusions : []);
      setMatrix(data?.matrix || { bottom_left: '', bottom_right: '', top_left: '', top_right: '' });
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
    if (selectedPatientId) loadActData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleSaveValue = async () => {
    if (!selectedPatientId || !newValue.area || !newValue.value) return;
    setSaving(true);
    try {
      const updatedValues = [...values, { id: Date.now().toString(), ...newValue, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/act`, { values: updatedValues, defusions });
      setValues(updatedValues);
      setNewValue({ area: '', value: '', action: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDefusion = async () => {
    if (!selectedPatientId || !newDefusion.thought) return;
    setSaving(true);
    try {
      const updatedDefusions = [...defusions, { id: Date.now().toString(), ...newDefusion, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/act`, { values, defusions: updatedDefusions, matrix });
      setDefusions(updatedDefusions);
      setNewDefusion({ thought: '', technique: '', outcome: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMatrix = async (newMatrix: any) => {
    if (!selectedPatientId) return;
    setSaving(true);
    try {
      await api.put(`/clinical-tools/${selectedPatientId}/act`, { values, defusions, matrix: newMatrix });
      setMatrix(newMatrix);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-16 animate-fadeIn">
      <PageHeader
        icon={<Target />}
        title="ACT - Aceitação & Compromisso"
        subtitle={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Flexibilidade Psicologia & Valores"}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        actions={selectedPatient && (
          <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => setActiveSub('values')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'values' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Compass size={14}/> Bússola</div>
              </button>
              <button 
                onClick={() => setActiveSub('defusion')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'defusion' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Zap size={14}/> Desfusão</div>
              </button>
              <button 
                onClick={() => setActiveSub('matrix')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'matrix' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><LayoutGrid size={14}/> Matriz ACT</div>
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
            <div className="space-y-6 animate-fadeIn text-center py-20 bg-white rounded-[40px] border border-slate-100 shadow-sm font-sans flex flex-col items-center">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6">
                    <Target size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">ACT Workspace</h2>
                <p className="text-slate-400 text-sm max-w-md mx-auto">Selecione um paciente para iniciar o trabalho com valores, aceitação e flexibilidade psicológica.</p>
            </div>
          ) : (
            <>
              {activeSub === 'values' && (
                <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4 animate-slideUpFade">
                    <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4">
                        <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Mapear Valor</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Área da Vida</label>
                                <select 
                                    className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm outline-none"
                                    value={newValue.area}
                                    onChange={e => setNewValue({...newValue, area: e.target.value})}
                                >
                                    <option value="">Selecione...</option>
                                    <option value="Familia">Relacionamentos Familiares</option>
                                    <option value="Amigos">Amizade/Social</option>
                                    <option value="Trabalho">Carreira/Trabalho</option>
                                    <option value="Saude">Saúde/Bem-estar</option>
                                    <option value="Espiritualidade">Crescimento/Espiritualidade</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase">O que é importante? (Valor)</label>
                                <textarea 
                                    className="w-full p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100 text-sm focus:bg-white transition-all h-24 resize-none font-bold"
                                    value={newValue.value}
                                    onChange={e => setNewValue({...newValue, value: e.target.value})}
                                    placeholder="Ex: Ser presente e atencioso."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Ação Comprometida</label>
                                <input 
                                    className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm outline-none"
                                    value={newValue.action}
                                    onChange={e => setNewValue({...newValue, action: e.target.value})}
                                    placeholder="Ex: Ligar para meus pais hoje."
                                />
                            </div>
                            <button onClick={handleSaveValue} className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-indigo-700 transition-all">
                                Registrar Valor
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {values.map(v => (
                            <div key={v.id} className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm group relative">
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={async () => {
                                        const next = values.filter(it => it.id !== v.id);
                                        await api.put(`/clinical-tools/${selectedPatientId}/act`, { values: next, defusions });
                                        setValues(next);
                                    }} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                        <Heart size={24}/>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-lg">{v.area}</span>
                                        <h4 className="text-base font-black text-slate-800 uppercase tracking-tight leading-tight">{v.value}</h4>
                                        {v.action && (
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                <ArrowRight size={14} className="text-emerald-500"/> {v.action}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              )}

              {activeSub === 'defusion' && (
                <div className="space-y-6 animate-slideUpFade">
                    <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <Zap size={24} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Técnicas de Desfusão</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Pensamento Fusado ("Eu sou...", "Vai dar...")</label>
                                    <textarea 
                                        className="w-full p-4 rounded-2xl bg-rose-50/30 border border-rose-100 text-sm focus:bg-white h-24 resize-none"
                                        value={newDefusion.thought}
                                        onChange={e => setNewDefusion({...newDefusion, thought: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Técnica Aplicada</label>
                                    <input 
                                        className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm outline-none"
                                        value={newDefusion.technique}
                                        onChange={e => setNewDefusion({...newDefusion, technique: e.target.value})}
                                        placeholder="Ex: Nomear o pensamento, Voz de desenho animado..."
                                    />
                                </div>
                                <button onClick={handleSaveDefusion} className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-indigo-700 transition-all">
                                    Registrar Exercício
                                </button>
                            </div>
                            <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100 space-y-4 h-full">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Histórico de Prática</h4>
                                <div className="space-y-3 overflow-y-auto max-h-[300px]">
                                    {defusions.map(d => (
                                        <div key={d.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative group">
                                            <p className="text-xs font-bold text-slate-800 mb-1 italic">"{d.thought}"</p>
                                            <p className="text-[10px] text-indigo-500 font-black uppercase tracking-tight flex items-center gap-1"><CheckCircle2 size={12}/> {d.technique}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
              )}

              {activeSub === 'matrix' && (
                <div className="space-y-6 animate-slideUpFade">
                    <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                                <LayoutGrid className="text-indigo-600" /> Matriz ACT
                            </h3>
                            <button onClick={() => handleSaveMatrix(matrix)} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black uppercase text-xs shadow-lg hover:bg-indigo-700 transition flex items-center gap-2">
                               {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar Matriz
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 relative">
                            {/* Lines */}
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200 -translate-y-1/2 hidden md:block" />
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 -translate-x-1/2 hidden md:block" />

                            <div className="bg-rose-50/50 p-6 rounded-3xl border border-rose-100 space-y-3 z-10 hover:bg-white hover:shadow-xl transition-all h-full">
                                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-100 px-3 py-1 rounded-full">Expe. Evitação (Externo)</span>
                                <h4 className="font-bold text-slate-800 text-sm">O que você faz para fugir/evitar o mal-estar?</h4>
                                <textarea value={matrix.top_left} onChange={e => setMatrix({...matrix, top_left: e.target.value})} className="w-full h-32 p-4 rounded-xl bg-white border border-rose-100 text-sm outline-none focus:border-rose-400 resize-none" placeholder="Comportamentos de fuga, distrações..." />
                            </div>

                            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 space-y-3 z-10 hover:bg-white hover:shadow-xl transition-all h-full">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-100 px-3 py-1 rounded-full">Ação Comprometida (Externo)</span>
                                <h4 className="font-bold text-slate-800 text-sm">O que você faz para se mover rumo aos valores?</h4>
                                <textarea value={matrix.top_right} onChange={e => setMatrix({...matrix, top_right: e.target.value})} className="w-full h-32 p-4 rounded-xl bg-white border border-emerald-100 text-sm outline-none focus:border-emerald-400 resize-none" placeholder="Ações que te movem em direção a quem você quer ser..." />
                            </div>

                            <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 space-y-3 z-10 hover:bg-white hover:shadow-xl transition-all h-full">
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-100 px-3 py-1 rounded-full">Dor / Barreiras (Interno)</span>
                                <h4 className="font-bold text-slate-800 text-sm">Quais pensamentos e emoções te afastam?</h4>
                                <textarea value={matrix.bottom_left} onChange={e => setMatrix({...matrix, bottom_left: e.target.value})} className="w-full h-32 p-4 rounded-xl bg-white border border-amber-100 text-sm outline-none focus:border-amber-400 resize-none" placeholder="Medos, ansiedade, pensamentos negativos..." />
                            </div>

                            <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 space-y-3 z-10 hover:bg-white hover:shadow-xl transition-all h-full">
                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-100 px-3 py-1 rounded-full">Valores (Interno)</span>
                                <h4 className="font-bold text-slate-800 text-sm">O que é realmente importante? Quem quer ser?</h4>
                                <textarea value={matrix.bottom_right} onChange={e => setMatrix({...matrix, bottom_right: e.target.value})} className="w-full h-32 p-4 rounded-xl bg-white border border-blue-100 text-sm outline-none focus:border-blue-400 resize-none" placeholder="Seus valores base, propósitos..." />
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
