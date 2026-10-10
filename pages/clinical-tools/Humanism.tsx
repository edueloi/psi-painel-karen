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
import { Patient, PhenomenonRecord, ActualizationGoal } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { 
  Heart, Plus, Trash2, Edit3, Save, RotateCcw, RefreshCcw, 
  Sun, Target, Users, Activity, Sparkles, AlertTriangle, 
  CheckCircle2, ArrowRight, PenLine, ChevronRight, X, Loader2, Smile, Zap,
  Compass, BrainCircuit
} from 'lucide-react';

type HumanismTab = 'phenomenon' | 'goals';

const humanismTabs = [
  { id: 'phenomenon', label: 'Experiência', icon: Sun },
  { id: 'goals', label: 'Projeto de Ser', icon: Target },
] as const;

export const HumanismPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<HumanismTab>('phenomenon');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tools State
  const [phenomenons, setPhenomenons] = useState<PhenomenonRecord[]>([]);
  const [goals, setGoals] = useState<ActualizationGoal[]>([]);

  // Form States
  const [newPhenomenon, setNewPhenomenon] = useState({ experience: '', perception: '' });
  const [newGoal, setNewGoal] = useState('');

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

  const loadHumanismData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const resp = await api.get<any>(`/clinical-tools/${patientId}/humanism/data`);
      // Use generic clinical-tools format
      setPhenomenons(Array.isArray(resp?.data?.phenomenons) ? resp.data.phenomenons : []);
      setGoals(Array.isArray(resp?.data?.goals) ? resp.data.goals : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const pid = searchParams.get('patient_id');
    const tab = searchParams.get('sub');
    if (pid) setSelectedPatientId(pid);
    if (tab === 'goals') setActiveSub('goals');
  }, [searchParams]);

  useEffect(() => {
    if (selectedPatientId) loadHumanismData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleSavePhenomenon = async () => {
    if (!selectedPatientId || !newPhenomenon.experience) return;
    setSaving(true);
    try {
      const newList = [...phenomenons, { id: Date.now().toString(), ...newPhenomenon, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/humanism/data`, { 
          data: { phenomenons: newList, goals }
      });
      setNewPhenomenon({ experience: '', perception: '' });
      setPhenomenons(newList);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGoal = async () => {
    if (!selectedPatientId || !newGoal.trim()) return;
    setSaving(true);
    try {
      const newList = [...goals, { id: Date.now().toString(), goal: newGoal, status: 'pending', createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/humanism/data`, { 
          data: { phenomenons, goals: newList }
      });
      setNewGoal('');
      setGoals(newList);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleGoal = async (id: string) => {
    if (!selectedPatientId) return;
    const newList = goals.map(g => g.id === id ? { ...g, status: g.status === 'pending' ? 'achieved' : 'pending' } as ActualizationGoal : g);
    setGoals(newList);
    await api.put(`/clinical-tools/${selectedPatientId}/humanism/data`, { 
        data: { phenomenons, goals: newList }
    });
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
          icon={Heart}
          title="Abordagem Humanista"
          description={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Existencialismo & Fenomenologia"}
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
              <div className="space-y-3">
                <ContentCard>
                  <EmptyState
                    icon={Heart}
                    title="Clínica da Presença e Autonomia"
                    description="Selecione um paciente para iniciar o encontro clínico. Explore a experiência imediata, o projeto de vida e a responsabilidade existencial através do encontro terapêutico."
                  />
                </ContentCard>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {[
                    { title: 'Experiência Vivida', desc: 'Registro do encontro fenomenológico imediato.', icon: <Activity size={14} /> },
                    { title: 'Projeto de Ser', desc: 'Mapeamento de metas de autonomia e sentido.', icon: <Target size={14} /> },
                    { title: 'Aqui e Agora', desc: 'Foco na percepção e consciência do presente.', icon: <Smile size={14} /> }
                  ].map((feat, i) => (
                    <ContentCard key={i}>
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-md border border-primary-100 bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                          {feat.icon}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-medium text-slate-800">{feat.title}</h3>
                          <p className="text-[11px] text-slate-500">{feat.desc}</p>
                        </div>
                      </div>
                    </ContentCard>
                  ))}
                </div>
              </div>
            ) : (
              <Tabs<HumanismTab> items={humanismTabs} value={activeSub} onChange={setActiveSub} label="Seções da abordagem humanista">
                {activeSub === 'phenomenon' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-3">
                    <PanelCard title="O Aqui e Agora" description="Fenomenologia da Experiência" icon={Smile} className="h-fit">
                      <div className="space-y-3">
                        <Textarea
                          label="Experiência Vivida"
                          rows={5}
                          value={newPhenomenon.experience}
                          onChange={e => setNewPhenomenon({ ...newPhenomenon, experience: e.target.value })}
                          placeholder="Descreva o que acontece no encontro terapêutico..."
                        />
                        <Textarea
                          label="Percepção Terapêutica"
                          rows={5}
                          value={newPhenomenon.perception}
                          onChange={e => setNewPhenomenon({ ...newPhenomenon, perception: e.target.value })}
                          placeholder="Sua percepção sobre essa vivência..."
                        />
                        <Button variant="primary" fullWidth onClick={handleSavePhenomenon}>
                          Registrar Experiência
                        </Button>
                      </div>
                    </PanelCard>

                    <div className="space-y-3 min-w-0">
                      {phenomenons.length === 0 ? (
                        <ContentCard>
                          <EmptyState icon={Smile} title="Nenhuma experiência registrada." />
                        </ContentCard>
                      ) : (
                        phenomenons.slice().reverse().map(p => (
                          <ContentCard key={p.id} className="group relative">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                              <IconButton
                                variant="ghost"
                                size="sm"
                                aria-label="Excluir experiência"
                                title="Excluir experiência"
                                className="hover:text-red-600"
                                onClick={async () => {
                                  const newList = phenomenons.filter(it => it.id !== p.id);
                                  await api.put(`/clinical-tools/${selectedPatientId}/humanism/data`, { data: { phenomenons: newList, goals } });
                                  setPhenomenons(newList);
                                }}
                              >
                                <Trash2 size={14} />
                              </IconButton>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pr-8">
                              <div className="space-y-1">
                                <span className="text-xs font-medium text-slate-600">O Vivido</span>
                                <p className="text-xs text-slate-600 italic">"{p.experience}"</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs font-medium text-primary-700">A Compreensão</span>
                                <p className="text-xs font-medium text-slate-800 border-l-2 border-primary-500 pl-3">"{p.perception}"</p>
                              </div>
                            </div>
                            <div className="pt-3 mt-3 border-t border-slate-100 text-[11px] text-slate-500">
                              Sessão de {new Date(p.createdAt || "").toLocaleDateString()}
                            </div>
                          </ContentCard>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeSub === 'goals' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-3">
                    <PanelCard title="Projeto de Ser" description="Metas de autorealização e autonomia." icon={Target} className="h-fit">
                      <div className="space-y-3">
                        <Textarea
                          aria-label="Novo objetivo"
                          rows={4}
                          value={newGoal}
                          onChange={e => setNewGoal(e.target.value)}
                          placeholder="Ex: Assumir responsabilidade existencial..."
                        />
                        <Button variant="primary" fullWidth iconLeft={<Plus size={14} />} onClick={handleSaveGoal}>
                          Adicionar Objetivo
                        </Button>
                      </div>
                    </PanelCard>

                    <PanelCard title="Caminho da Autorealização" icon={Zap}>
                      {goals.length === 0 ? (
                        <EmptyState icon={Target} title="Aguardando a emersão de projetos de vida." />
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {goals.slice().reverse().map(g => (
                            <div
                              key={g.id}
                              className={`group relative rounded-lg border p-3 flex items-start gap-3 ${g.status === 'achieved' ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'}`}
                            >
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Excluir objetivo"
                                  title="Excluir objetivo"
                                  className="hover:text-red-600"
                                  onClick={async () => {
                                    const newList = goals.filter(it => it.id !== g.id);
                                    await api.put(`/clinical-tools/${selectedPatientId}/humanism/data`, { data: { phenomenons, goals: newList } });
                                    setGoals(newList);
                                  }}
                                >
                                  <Trash2 size={14} />
                                </IconButton>
                              </div>
                              <IconButton
                                variant={g.status === 'achieved' ? 'primary' : 'outline'}
                                size="sm"
                                aria-label="Alternar objetivo alcançado"
                                title="Alternar objetivo alcançado"
                                onClick={() => toggleGoal(g.id)}
                              >
                                <CheckCircle2 size={14} />
                              </IconButton>
                              <div className="space-y-1 min-w-0 pr-6">
                                <p className={`text-sm font-medium ${g.status === 'achieved' ? 'text-emerald-900 line-through opacity-60' : 'text-slate-800'}`}>{g.goal}</p>
                                <span className="text-[11px] text-slate-500">{new Date(g.createdAt || "").toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </PanelCard>
                  </div>
                )}
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};
