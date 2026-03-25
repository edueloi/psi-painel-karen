import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PageHeader } from '../../components/UI/PageHeader';
import { Patient } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { 
  Workflow, Plus, Trash2, Edit3, Save, RotateCcw, 
  HelpCircle, Sparkles, CheckCircle2, ArrowRight, 
  ChevronRight, X, Loader2, Smile, Heart, Shield,
  Layers, Filter, Eye, Activity, Share2, Users
} from 'lucide-react';

export const SistemicaPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<'genogram' | 'circular' | 'patterns'>('genogram');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Systemic Specific State
  const [genogramData, setGenogramData] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);

  const [newMember, setNewMember] = useState({ name: '', relation: '', age: '', dynamic: '' });
  const [newQuestion, setNewQuestion] = useState({ context: '', question: '', reflection: '' });

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

  const loadSistemicaData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/clinical-tools/${patientId}/sistemica`);
      setGenogramData(Array.isArray(data?.members) ? data.members : []);
      setQuestions(Array.isArray(data?.questions) ? data.questions : []);
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
    if (selectedPatientId) loadSistemicaData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleSaveMember = async () => {
    if (!selectedPatientId || !newMember.name) return;
    setSaving(true);
    try {
      const updatedMembers = [...genogramData, { id: Date.now().toString(), ...newMember }];
      await api.put(`/clinical-tools/${selectedPatientId}/sistemica`, { members: updatedMembers, questions });
      setGenogramData(updatedMembers);
      setNewMember({ name: '', relation: '', age: '', dynamic: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuestion = async () => {
    if (!selectedPatientId || !newQuestion.question) return;
    setSaving(true);
    try {
      const updatedQuestions = [...questions, { id: Date.now().toString(), ...newQuestion }];
      await api.put(`/clinical-tools/${selectedPatientId}/sistemica`, { members: genogramData, questions: updatedQuestions });
      setQuestions(updatedQuestions);
      setNewQuestion({ context: '', question: '', reflection: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-16 animate-fadeIn">
      <PageHeader
        icon={<Workflow />}
        title="Terapia Sistêmica"
        subtitle={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Vínculos, Padrões & Dinâmicas Familiares"}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        actions={selectedPatient && (
          <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => setActiveSub('genogram')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'genogram' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Users size={14}/> Genograma</div>
              </button>
              <button 
                onClick={() => setActiveSub('circular')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'circular' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Share2 size={14}/> Circulares</div>
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
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                    <Workflow size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Systemic Workspace</h2>
                <p className="text-slate-400 text-sm max-w-md mx-auto">Mapeamento de relações familiares e quebra de padrões transgeracionais.</p>
            </div>
          ) : (
            <>
              {activeSub === 'genogram' && (
                <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4 animate-slideUpFade">
                    <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4">
                        <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Adicionar Membro (Genograma)</h3>
                        <div className="space-y-4">
                            <input className="w-full h-12 px-4 rounded-2xl bg-white border border-slate-100 text-sm font-bold shadow-sm outline-none" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} placeholder="Nome / Identificador" />
                            <select className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm outline-none" value={newMember.relation} onChange={e => setNewMember({...newMember, relation: e.target.value})}>
                                <option value="">Relação...</option>
                                <option value="Pai">Pai</option>
                                <option value="Mae">Mãe</option>
                                <option value="Irmao/a">Irmão/a</option>
                                <option value="Conjuge">Cônjuge</option>
                                <option value="Filho/a">Filho/a</option>
                            </select>
                            <textarea className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm focus:bg-white h-24 resize-none" value={newMember.dynamic} onChange={e => setNewMember({...newMember, dynamic: e.target.value})} placeholder="Dinâmica Relacional (Ex: Conflituoso, Distante...)" />
                            <button onClick={handleSaveMember} className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-indigo-700 transition-all">Registrar Membro</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {genogramData.map(m => (
                            <div key={m.id} className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm group">
                                <div className="flex gap-4 items-center">
                                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">{m.relation.charAt(0)}</div>
                                    <div className="flex-1">
                                        <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">{m.name}</h4>
                                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">{m.relation}</p>
                                    </div>
                                    <div className="text-xs font-medium text-slate-400 italic">"{m.dynamic}"</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              )}

              {activeSub === 'circular' && (
                <div className="space-y-6 animate-slideUpFade">
                    <div className="bg-gradient-to-br from-blue-900 to-indigo-950 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5">
                            <Share2 size={160} />
                        </div>
                        <div className="relative z-10 space-y-8">
                            <h3 className="text-2xl font-black uppercase tracking-tight">Perguntas Circulares</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                     <div className="space-y-2">
                                        <label className="text-[10px] font-black text-blue-300 uppercase tracking-widest">A Pergunta Circular</label>
                                        <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white outline-none focus:bg-white/10 h-24 resize-none" value={newQuestion.question} onChange={e => setNewQuestion({...newQuestion, question: e.target.value})} placeholder="Ex: De que maneira as reações do seu pai influenciam o silêncio da sua mãe?" />
                                     </div>
                                     <button onClick={handleSaveQuestion} className="w-full h-12 bg-white text-blue-900 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-blue-50 transition-all">Registrar Reflexão</button>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Histórico de Circularidade</h4>
                                    {questions.map(q => (
                                        <div key={q.id} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                                            <p className="text-xs font-bold text-white mb-1">"{q.question}"</p>
                                        </div>
                                    ))}
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
