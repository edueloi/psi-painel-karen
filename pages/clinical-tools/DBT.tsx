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
  Activity, Plus, Trash2, Edit3, Save, RotateCcw, 
  HelpCircle, Sparkles, CheckCircle2, ArrowRight, 
  ChevronRight, X, Loader2, Smile, Zap, Heart, Shield, ArrowLeft,
  Layers, Filter, GitMerge
} from 'lucide-react';

type DbtTab = 'diary' | 'skills' | 'chain';

const dbtTabs = [
  { id: 'diary', label: 'Diário', icon: Layers },
  { id: 'skills', label: 'Skills', icon: Filter },
  { id: 'chain', label: 'Análise em Cadeia', icon: GitMerge },
] as const;

export const DBTPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<DbtTab>('diary');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // DBT Specific State
  const [diaryCards, setDiaryCards] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [chains, setChains] = useState<any[]>([]);

  const [newDiary, setNewDiary] = useState({ date: new Date().toISOString().split('T')[0], mood: 5, urges: '', actions: '' });
  const [newSkill, setNewSkill] = useState({ area: 'Mindfulness', skill: '', implementation: '' });
  const [newChain, setNewChain] = useState({ vulnerability: '', trigger: '', thought: '', feeling: '', behavior: '', consequence: '', solution: '' });

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
      setChains(Array.isArray(data?.chains) ? data.chains : []);
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
      await api.put(`/clinical-tools/${selectedPatientId}/dbt/data`, { data: { diaryCards, skills: updatedSkills, chains } });
      setSkills(updatedSkills);
      setNewSkill({ area: 'Mindfulness', skill: '', implementation: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChain = async () => {
    if (!selectedPatientId || !newChain.behavior || !newChain.trigger) return;
    setSaving(true);
    try {
      const updatedChains = [...chains, { id: Date.now().toString(), ...newChain, created_at: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/dbt/data`, { data: { diaryCards, skills, chains: updatedChains } });
      setChains(updatedChains);
      setNewChain({ vulnerability: '', trigger: '', thought: '', feeling: '', behavior: '', consequence: '', solution: '' });
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
          icon={Activity}
          title="DBT - Comportamental Dialética"
          description={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Regulação Emocional & Eficácia Interpessoal"}
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
                  icon={Activity}
                  title="DBT Workspace"
                  description="Módulo focado em regulação emocional e manejo de comportamentos impulsivos."
                />
              </ContentCard>
            ) : (
              <Tabs<DbtTab> items={dbtTabs} value={activeSub} onChange={setActiveSub} label="Seções da DBT">
                {activeSub === 'diary' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-3">
                    <PanelCard title="Cartão de Diário">
                      <div className="space-y-3">
                        <Input label="Data" type="date" value={newDiary.date} onChange={e => setNewDiary({ ...newDiary, date: e.target.value })} />
                        <Input label="Humor (1-10)" type="number" value={newDiary.mood} onChange={e => setNewDiary({ ...newDiary, mood: parseInt(e.target.value) })} />
                        <Textarea label="Impulsos/Urgências" rows={4} value={newDiary.urges} onChange={e => setNewDiary({ ...newDiary, urges: e.target.value })} placeholder="Ex: Pensamentos de autolesão, raiva intensa..." />
                        <Button variant="primary" fullWidth onClick={handleSaveDiary} loading={saving}>Registrar Dia</Button>
                      </div>
                    </PanelCard>
                    <div className="space-y-3 min-w-0 overflow-y-auto max-h-[70vh]">
                      {diaryCards.map(d => (
                        <ContentCard key={d.id}>
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <Badge color="primary" size="sm">{new Date(d.date).toLocaleDateString()}</Badge>
                            <Badge color={d.mood > 7 ? 'success' : d.mood > 4 ? 'warning' : 'danger'} size="sm">Mood: {d.mood}/10</Badge>
                          </div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Impulsos</p>
                          <p className="text-xs text-slate-700">{d.urges || 'Nenhum impulso registrado.'}</p>
                        </ContentCard>
                      ))}
                    </div>
                  </div>
                )}

                {activeSub === 'skills' && (
                  <PanelCard title="Treino de Habilidades" icon={Shield}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-3">
                        <Select label="Treinamento" value={newSkill.area} onChange={e => setNewSkill({ ...newSkill, area: e.target.value })}>
                          <option value="Mindfulness">Mindfulness</option>
                          <option value="Eficacia Interpessoal">Eficácia Interpessoal</option>
                          <option value="Regulacao Emocional">Regulação Emocional</option>
                          <option value="Tolerancia ao Mal-estar">Tolerância ao Mal-estar</option>
                        </Select>
                        <Input label="Habilidade (Skill)" value={newSkill.skill} onChange={e => setNewSkill({ ...newSkill, skill: e.target.value })} placeholder="Ex: DEAR MAN, TIPP..." />
                        <Button variant="primary" fullWidth onClick={handleSaveSkill} loading={saving}>Adicionar Skill</Button>
                      </div>
                      <div className="space-y-2">
                        {skills.map(s => (
                          <div key={s.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] text-slate-500">{s.area}</p>
                              <p className="text-xs font-medium text-slate-800">{s.skill}</p>
                            </div>
                            <CheckCircle2 size={14} className="text-primary-600 shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </PanelCard>
                )}

                {activeSub === 'chain' && (
                  <PanelCard
                    title="Análise Funcional em Cadeia"
                    icon={GitMerge}
                    action={
                      <Button variant="primary" size="sm" onClick={handleSaveChain} loading={saving} iconLeft={<Plus size={14} />}>
                        Registrar Cadeia
                      </Button>
                    }
                  >
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        <Textarea label="1. Fatores Vulnerabilidade" rows={4} value={newChain.vulnerability} onChange={e => setNewChain({ ...newChain, vulnerability: e.target.value })} placeholder="Fome, sono, doença..." />
                        <Textarea label="2. Evento Desencadeante" rows={4} value={newChain.trigger} onChange={e => setNewChain({ ...newChain, trigger: e.target.value })} placeholder="O que aconteceu antes?" />
                        <Textarea label="3. Links (Pensamentos/Afetos)" rows={4} value={newChain.thought} onChange={e => setNewChain({ ...newChain, thought: e.target.value })} placeholder="O que pensou/sentiu?" />
                        <Textarea label="4. Comportamento Problema" rows={4} value={newChain.behavior} onChange={e => setNewChain({ ...newChain, behavior: e.target.value })} placeholder="Ação exata..." />
                        <Textarea label="5. Consequências" rows={4} value={newChain.consequence} onChange={e => setNewChain({ ...newChain, consequence: e.target.value })} placeholder="Curto/Longo prazo?" />
                        <Textarea label="6. Resoluções / Habilidades" rows={4} value={newChain.solution} onChange={e => setNewChain({ ...newChain, solution: e.target.value })} placeholder="Como quebrar a corrente?" />
                      </div>

                      {chains.length > 0 && (
                        <div className="space-y-3 pt-3 border-t border-slate-100">
                          <h4 className="text-xs font-medium text-slate-600">Análises Anteriores</h4>
                          <div className="space-y-2">
                            {chains.map(c => (
                              <div key={c.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-start gap-3 relative group">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                  <IconButton
                                    variant="ghost"
                                    size="sm"
                                    aria-label="Excluir análise"
                                    title="Excluir análise"
                                    className="hover:text-red-600"
                                    onClick={async () => {
                                      const next = chains.filter(it => it.id !== c.id);
                                      await api.put(`/clinical-tools/${selectedPatientId}/dbt/data`, { data: { diaryCards, skills, chains: next } });
                                      setChains(next);
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </IconButton>
                                </div>
                                <div className="w-7 h-7 rounded-md border border-primary-100 bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                                  <GitMerge size={14} />
                                </div>
                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge color="default" size="sm">{new Date(c.created_at || Date.now()).toLocaleDateString()}</Badge>
                                    <h4 className="font-medium text-slate-800 text-sm">Comportamento: {c.behavior}</h4>
                                  </div>
                                  <p className="text-xs text-slate-600"><span className="font-medium text-slate-700">Gatilho:</span> {c.trigger}</p>
                                  <p className="text-xs text-emerald-700"><span className="font-medium">Solução:</span> {c.solution}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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
