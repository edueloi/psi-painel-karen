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
import { ArrowLeft } from 'lucide-react';
import { Patient } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { Heart, Save, Plus, Trash2, Sun, Sparkles, Activity, Anchor, MapPin } from 'lucide-react';

type MindfulnessTab = 'practices' | 'bodyscan' | 'anchor';

const mindfulnessTabs = [
  { id: 'practices', label: 'Diário de Prática', icon: Sparkles },
  { id: 'bodyscan', label: 'Body Scan', icon: Activity },
  { id: 'anchor', label: 'Ancoragem', icon: Anchor },
] as const;

export const MindfulnessPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<MindfulnessTab>('practices');
  
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
    <PageWrapper>
      <div className="space-y-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/caixa-ferramentas')}>
            Voltar
          </Button>
        </div>

        <SectionTitle
          icon={Sun}
          title="Atenção Plena (Mindfulness)"
          description={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Práticas, Escaneamento Corporal e Ancoragem"}
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
                  icon={Sun}
                  title="Mindfulness Workspace"
                  description="Acompanhamento completo de meditação, atenção plena corporificada e regulação por enraizamento."
                />
              </ContentCard>
            ) : (
              <Tabs<MindfulnessTab> items={mindfulnessTabs} value={activeSub} onChange={setActiveSub} label="Seções de Mindfulness">
                {activeSub === 'practices' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-3">
                    <PanelCard title="Registrar Prática">
                      <div className="space-y-3">
                        <Input
                          aria-label="Nome da prática"
                          placeholder="Nome (Ex: Meditação Guiada, Caminhada)"
                          value={newPractice.name}
                          onChange={e => setNewPractice({ ...newPractice, name: e.target.value })}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input
                            label="Duração (Min)"
                            type="number"
                            placeholder="Ex: 15"
                            value={newPractice.duration}
                            onChange={e => setNewPractice({ ...newPractice, duration: e.target.value })}
                          />
                          <Input
                            label="Foco (1 a 10)"
                            type="number"
                            min="1"
                            max="10"
                            value={newPractice.focus_level}
                            onChange={e => setNewPractice({ ...newPractice, focus_level: Number(e.target.value) })}
                          />
                        </div>
                        <Textarea
                          label="Observações / Distrações"
                          rows={4}
                          placeholder="Desafios, onde a mente foi parar, como retornou ao foco..."
                          value={newPractice.observation}
                          onChange={e => setNewPractice({ ...newPractice, observation: e.target.value })}
                        />
                        <Button variant="primary" fullWidth iconLeft={<Plus size={14} />} onClick={addPractice}>
                          Salvar Prática
                        </Button>
                      </div>
                    </PanelCard>

                    <div className="space-y-3 min-w-0">
                      {practices.length === 0 ? (
                        <ContentCard>
                          <EmptyState icon={Sparkles} title="Nenhuma prática registrada ainda." />
                        </ContentCard>
                      ) : (
                        practices.map(p => (
                          <ContentCard key={p.id} className="group relative">
                            <div className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-md border border-primary-100 bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                                <Sparkles size={14} />
                              </div>
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="flex flex-wrap justify-between items-center gap-2">
                                  <h4 className="text-sm font-medium text-slate-800">{p.name}</h4>
                                  <span className="text-[11px] text-slate-500">{new Date(p.date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge color="default" size="sm">{p.duration} min</Badge>
                                  <Badge color={p.focus_level >= 7 ? 'primary' : 'warning'} size="sm">Foco: {p.focus_level}/10</Badge>
                                </div>
                                <p className="text-xs text-slate-600">"{p.observation}"</p>
                              </div>
                              <IconButton
                                variant="ghost"
                                size="sm"
                                aria-label="Excluir prática"
                                title="Excluir prática"
                                className="hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                onClick={() => removePractice(p.id)}
                              >
                                <Trash2 size={14} />
                              </IconButton>
                            </div>
                          </ContentCard>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeSub === 'bodyscan' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-3">
                    <PanelCard title="Body Scan (Escaneamento)">
                      <div className="space-y-3">
                        <Input
                          label="Onde está ocorrendo?"
                          placeholder="Peito, garganta, estômago, nuca..."
                          value={newBodyscan.body_part}
                          onChange={e => setNewBodyscan({ ...newBodyscan, body_part: e.target.value })}
                        />
                        <Input
                          label="Sensação Física"
                          placeholder="Aperto, calor, formigamento..."
                          value={newBodyscan.sensation}
                          onChange={e => setNewBodyscan({ ...newBodyscan, sensation: e.target.value })}
                        />
                        <Input
                          label="Intensidade (1-10)"
                          type="number"
                          min="1"
                          max="10"
                          value={newBodyscan.intensity}
                          onChange={e => setNewBodyscan({ ...newBodyscan, intensity: Number(e.target.value) })}
                        />
                        <Textarea
                          label="Interpretação Mental"
                          rows={3}
                          placeholder="O que a mente está contando sobre essa sensação?"
                          value={newBodyscan.interpretation}
                          onChange={e => setNewBodyscan({ ...newBodyscan, interpretation: e.target.value })}
                        />
                        <Button variant="primary" fullWidth onClick={addBodyscan}>
                          Mapear Corpo
                        </Button>
                      </div>
                    </PanelCard>

                    <div className="min-w-0">
                      {bodyscans.length === 0 ? (
                        <ContentCard>
                          <EmptyState icon={Activity} title="Nenhum escaneamento salvo." />
                        </ContentCard>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {bodyscans.map(b => (
                            <ContentCard key={b.id} className="group relative">
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Excluir escaneamento"
                                  title="Excluir escaneamento"
                                  className="hover:text-red-600"
                                  onClick={() => removeBodyscan(b.id)}
                                >
                                  <Trash2 size={14} />
                                </IconButton>
                              </div>
                              <div className="flex items-center gap-2 mb-2 pr-8">
                                <MapPin size={14} className="text-primary-600 shrink-0" />
                                <h4 className="font-medium text-slate-800 text-sm">{b.body_part}</h4>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-xs text-slate-600"><span className="font-medium text-slate-800">Sensação:</span> {b.sensation}</p>
                                <p className="text-xs text-slate-600"><span className="font-medium text-slate-800">Intensidade:</span> {b.intensity}/10</p>
                                {b.interpretation && (
                                  <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">"{b.interpretation}"</p>
                                )}
                              </div>
                            </ContentCard>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeSub === 'anchor' && (
                  <PanelCard
                    title="Técnicas de Ancoragem"
                    description="Voltar ao presente quando a mente se perde ou acelera."
                    icon={Anchor}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
                      <div className="space-y-3">
                        <Input
                          label="Gatilho (Quando a mente viajou)"
                          placeholder="Ex: Ansiedade sobre o futuro..."
                          value={newAnchor.trigger}
                          onChange={e => setNewAnchor({ ...newAnchor, trigger: e.target.value })}
                        />
                        <Input
                          label="Técnica Usada (A Âncora)"
                          placeholder="Ex: 5-4-3-2-1, Som da respiração..."
                          value={newAnchor.grounding_technique}
                          onChange={e => setNewAnchor({ ...newAnchor, grounding_technique: e.target.value })}
                        />
                        <Input
                          label="Eficácia (1-10)"
                          type="number"
                          min="1"
                          max="10"
                          value={newAnchor.effectiveness}
                          onChange={e => setNewAnchor({ ...newAnchor, effectiveness: Number(e.target.value) })}
                        />
                        <Button variant="primary" fullWidth onClick={addAnchor}>
                          Registrar Retorno
                        </Button>
                      </div>

                      <div className="space-y-2 min-w-0">
                        <h4 className="text-xs font-medium text-slate-600">Histórico de Ancoragem</h4>
                        {anchors.map(a => (
                          <div key={a.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-2 group">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge color="info" size="sm">Gatilho</Badge>
                                <span className="text-xs font-medium text-slate-800">{a.trigger}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge color="success" size="sm">Âncora</Badge>
                                <span className="text-xs text-slate-600">{a.grounding_technique} (Eficácia: {a.effectiveness}/10)</span>
                              </div>
                            </div>
                            <IconButton
                              variant="ghost"
                              size="sm"
                              aria-label="Excluir registro de ancoragem"
                              title="Excluir registro de ancoragem"
                              className="hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                              onClick={() => removeAnchor(a.id)}
                            >
                              <Trash2 size={14} />
                            </IconButton>
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
