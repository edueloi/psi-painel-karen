import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PageHeader } from '../../components/UI/PageHeader';
import { Patient } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { 
  Activity, Plus, Trash2, Edit3, Save, RotateCcw, 
  HelpCircle, Sparkles, CheckCircle2, ArrowRight, 
  ChevronRight, X, Loader2, Smile, Zap, Heart, Shield,
  Layers, Filter
} from 'lucide-react';

export const DBTPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<'diary' | 'skills' | 'behavior'>('diary');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // DBT Specific State
  const [diaryCards, setDiaryCards] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);

  const [newDiary, setNewDiary] = useState({ date: new Date().toISOString().split('T')[0], mood: 5, urges: '', actions: '' });
  const [newSkill, setNewSkill] = useState({ area: 'Mindfulness', skill: '', implementation: '' });

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

  const loadDbtData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const resp = await api.get<any>(`/clinical-tools/${patientId}/dbt/data`);
      const data = resp?.data || {};
      setDiaryCards(Array.isArray(data?.diaryCards) ? data.diaryCards : []);
      setSkills(Array.isArray(data?.skills) ? data.skills : []);
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
    if (selectedPatientId) loadDbtData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleSaveDiary = async () => {
    if (!selectedPatientId) return;
    setSaving(true);
    try {
      const updatedDiary = [...diaryCards, { id: Date.now().toString(), ...newDiary }];
      await api.put(`/clinical-tools/${selectedPatientId}/dbt/data`, { data: { diaryCards: updatedDiary, skills } });
      setDiaryCards(updatedDiary);
      setNewDiary({ date: new Date().toISOString().split('T')[0], mood: 5, urges: '', actions: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSkill = async () => {
    if (!selectedPatientId || !newSkill.skill) return;
    setSaving(true);
    try {
      const updatedSkills = [...skills, { id: Date.now().toString(), ...newSkill }];
      await api.put(`/clinical-tools/${selectedPatientId}/dbt/data`, { data: { diaryCards, skills: updatedSkills } });
      setSkills(updatedSkills);
      setNewSkill({ area: 'Mindfulness', skill: '', implementation: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-16 animate-fadeIn">
      <PageHeader
        icon={<Activity />}
        title="DBT - Comportamental Dialética"
        subtitle={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Regulação Emocional & Eficácia Interpessoal"}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        actions={selectedPatient && (
          <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => setActiveSub('diary')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'diary' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Layers size={14}/> Diário</div>
              </button>
              <button 
                onClick={() => setActiveSub('skills')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'skills' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Filter size={14}/> Skills</div>
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
                <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6">
                    <Activity size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">DBT Workspace</h2>
                <p className="text-slate-400 text-sm max-w-md mx-auto">Módulo focado em regulação emocional e manejo de comportamentos impulsivos.</p>
            </div>
          ) : (
            <>
              {activeSub === 'diary' && (
                <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4 animate-slideUpFade">
                    <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4">
                        <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Cartão de Diário</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</label>
                                <input type="date" className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm outline-none" value={newDiary.date} onChange={e => setNewDiary({...newDiary, date: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Humor (1-10)</label>
                                <input type="number" className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm outline-none" value={newDiary.mood} onChange={e => setNewDiary({...newDiary, mood: parseInt(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Impulsos/Urgências</label>
                                <textarea className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm focus:bg-white h-24 resize-none" value={newDiary.urges} onChange={e => setNewDiary({...newDiary, urges: e.target.value})} placeholder="Ex: Pensamentos de autolesão, raiva intensa..." />
                            </div>
                            <button onClick={handleSaveDiary} className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-indigo-700 transition-all">Registrar Dia</button>
                        </div>
                    </div>
                    <div className="space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar px-1">
                        {diaryCards.map(d => (
                            <div key={d.id} className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[10px] font-black p-2 bg-indigo-50 text-indigo-600 rounded-xl leading-none">{new Date(d.date).toLocaleDateString()}</span>
                                    <div className={`p-2 rounded-xl text-[10px] font-black ${d.mood > 7 ? 'bg-emerald-50 text-emerald-600' : d.mood > 4 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>Mood: {d.mood}/10</div>
                                </div>
                                <p className="text-xs font-bold text-slate-800 leading-relaxed mb-2 uppercase tracking-widest opacity-40">Impulsos</p>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed">{d.urges || 'Nenhum impulso registrado.'}</p>
                            </div>
                        ))}
                    </div>
                </div>
              )}

              {activeSub === 'skills' && (
                <div className="space-y-6 animate-slideUpFade">
                    <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Shield size={24} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Treino de Habilidades</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Treinamento</label>
                                    <select className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm outline-none" value={newSkill.area} onChange={e => setNewSkill({...newSkill, area: e.target.value})}>
                                        <option value="Mindfulness">Mindfulness</option>
                                        <option value="Eficacia Interpessoal">Eficácia Interpessoal</option>
                                        <option value="Regulacao Emocional">Regulação Emocional</option>
                                        <option value="Tolerancia ao Mal-estar">Tolerância ao Mal-estar</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Habilidade (Skill)</label>
                                    <input className="w-full h-12 px-4 rounded-2xl bg-white border border-slate-100 text-sm font-bold shadow-inner outline-none" value={newSkill.skill} onChange={e => setNewSkill({...newSkill, skill: e.target.value})} placeholder="Ex: DEAR MAN, TIPP..." />
                                </div>
                                <button onClick={handleSaveSkill} className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-indigo-700 transition-all">Adicionar Skill</button>
                            </div>
                            <div className="space-y-4">
                                {skills.map(s => (
                                    <div key={s.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.area}</p>
                                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{s.skill}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-indigo-500 shadow-sm"><CheckCircle2 size={16}/></div>
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
