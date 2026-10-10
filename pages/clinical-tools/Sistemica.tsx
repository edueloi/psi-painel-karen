import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PageWrapper, SectionTitle, ContentCard } from '../../components/UI/PageWrapper';
import { PanelCard } from '../../components/UI/PanelCard';
import { Tabs } from '../../components/UI/Tabs';
import { Button, IconButton } from '../../components/UI/Button';
import { Input, Textarea, Select } from '../../components/UI/Input';
import { Badge } from '../../components/UI/Badge';
import { EmptyState } from '../../components/UI/EmptyState';
import { Patient } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { 
  Workflow, Plus, Trash2, Edit3, Save, RotateCcw, 
  HelpCircle, Sparkles, CheckCircle2, ArrowRight, 
  ChevronRight, X, Loader2, Smile, Heart, Shield,
  Layers, Filter, Eye, Activity, Share2, Users, ArrowLeft
} from 'lucide-react';

type SistemicaTab = 'genogram' | 'circular';

const sistemicaTabs = [
  { id: 'genogram', label: 'Genograma', icon: Users },
  { id: 'circular', label: 'Circulares', icon: Share2 },
] as const;

export const SistemicaPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<SistemicaTab>('genogram');
  
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
    <PageWrapper>
      <div className="space-y-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/caixa-ferramentas')}>
            Voltar
          </Button>
        </div>

        <SectionTitle
          icon={Workflow}
          title="Terapia Sistêmica"
          description={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Vínculos, Padrões & Dinâmicas Familiares"}
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

          <div className="min-w-0 space-y-4">
            {!selectedPatient ? (
              <ContentCard>
                <EmptyState
                  icon={Workflow}
                  title="Systemic Workspace"
                  description="Mapeamento de relações familiares e quebra de padrões transgeracionais."
                />
              </ContentCard>
            ) : (
              <Tabs<SistemicaTab> items={sistemicaTabs} value={activeSub} onChange={setActiveSub} label="Seções da terapia sistêmica">
                {activeSub === 'genogram' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-3">
                    <PanelCard title="Adicionar Membro (Genograma)">
                      <div className="space-y-3">
                        <Input aria-label="Nome / Identificador" value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} placeholder="Nome / Identificador" />
                        <Select aria-label="Relação" value={newMember.relation} onChange={e => setNewMember({ ...newMember, relation: e.target.value })}>
                          <option value="">Relação...</option>
                          <option value="Pai">Pai</option>
                          <option value="Mae">Mãe</option>
                          <option value="Irmao/a">Irmão/a</option>
                          <option value="Conjuge">Cônjuge</option>
                          <option value="Filho/a">Filho/a</option>
                        </Select>
                        <Textarea aria-label="Dinâmica relacional" rows={4} value={newMember.dynamic} onChange={e => setNewMember({ ...newMember, dynamic: e.target.value })} placeholder="Dinâmica Relacional (Ex: Conflituoso, Distante...)" />
                        <Button variant="primary" fullWidth loading={saving} onClick={handleSaveMember}>Registrar Membro</Button>
                      </div>
                    </PanelCard>
                    <div className="min-w-0 grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
                      {genogramData.map(m => (
                        <ContentCard key={m.id}>
                          <div className="flex gap-3 items-center">
                            <div className="w-9 h-9 rounded-lg bg-primary-50 border border-primary-100 text-primary-700 flex items-center justify-center font-medium text-xs shrink-0">{m.relation.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-slate-800 break-words">{m.name}</h4>
                              <p className="text-[11px] text-slate-500">{m.relation}</p>
                            </div>
                          </div>
                          {m.dynamic && <p className="mt-2 text-xs text-slate-500 italic break-words">"{m.dynamic}"</p>}
                        </ContentCard>
                      ))}
                    </div>
                  </div>
                )}

                {activeSub === 'circular' && (
                  <PanelCard title="Perguntas Circulares" icon={Share2}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Textarea label="A Pergunta Circular" rows={4} value={newQuestion.question} onChange={e => setNewQuestion({ ...newQuestion, question: e.target.value })} placeholder="Ex: De que maneira as reações do seu pai influenciam o silêncio da sua mãe?" />
                        <Button variant="primary" fullWidth loading={saving} onClick={handleSaveQuestion}>Registrar Reflexão</Button>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-slate-600">Histórico de Circularidade</h4>
                        {questions.map(q => (
                          <div key={q.id} className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                            <p className="text-xs text-slate-800 break-words">"{q.question}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PanelCard>
                )}
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};
