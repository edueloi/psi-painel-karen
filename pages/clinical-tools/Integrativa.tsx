import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PageWrapper, SectionTitle, ContentCard } from '../../components/UI/PageWrapper';
import { PanelCard } from '../../components/UI/PanelCard';
import { Tabs } from '../../components/UI/Tabs';
import { Button, IconButton } from '../../components/UI/Button';
import { Input, Textarea } from '../../components/UI/Input';
import { EmptyState } from '../../components/UI/EmptyState';
import { Patient } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import {
  Trash2, Save, Sparkles, Target, Heart, LayoutDashboard, Brain, ArrowLeft
} from 'lucide-react';

type IntegrativaTab = 'plan' | 'techniques';

const integrativaTabs = [
  { id: 'plan', label: 'Formulação', icon: Target },
  { id: 'techniques', label: 'Técnicas', icon: Sparkles },
] as const;

export const IntegrativaPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<IntegrativaTab>('plan');

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
    <PageWrapper>
      <div className="space-y-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/caixa-ferramentas')}>
            Voltar
          </Button>
        </div>

        <SectionTitle
          icon={LayoutDashboard}
          title="Clínica Eclética / Integrativa"
          description={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Formulação Integrativa e Seleção de Ferramentas"}
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
                  icon={LayoutDashboard}
                  title="Workspace Integrativo"
                  description="Desenvolva uma abordagem sob medida, mesclando diferentes técnicas e teorias para atender às necessidades específicas."
                />
              </ContentCard>
            ) : (
              <Tabs<IntegrativaTab> items={integrativaTabs} value={activeSub} onChange={setActiveSub} label="Seções da clínica integrativa">
                {activeSub === 'plan' && (
                  <PanelCard
                    title="Formulação de Caso Integrativa"
                    icon={Brain}
                    action={
                      <Button variant="primary" size="sm" loading={saving} iconLeft={<Save size={14} />} onClick={() => handleSaveWorkspace()}>
                        Salvar Formulação
                      </Button>
                    }
                  >
                    <Textarea
                      aria-label="Formulação de caso integrativa"
                      rows={16}
                      placeholder="Construa aqui a lógica de intervenção, fatores mantenedores, hipóteses diagnósticas de diferentes abordagens..."
                      value={formulation}
                      onChange={e => setFormulation(e.target.value)}
                    />
                  </PanelCard>
                )}

                {activeSub === 'techniques' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <PanelCard title="Plano de Técnicas" icon={Sparkles}>
                      <div className="space-y-3">
                        <p className="text-[11px] text-slate-500">Registre e combine as técnicas a serem utilizadas.</p>
                        <Input
                          aria-label="Adicionar técnica"
                          value={newTechnique}
                          onChange={e => setNewTechnique(e.target.value)}
                          placeholder="Adicionar técnica (e.g. Dessensibilização, ABC...)"
                          onKeyDown={e => e.key === 'Enter' && addTechnique()}
                        />
                        <Button variant="primary" fullWidth onClick={addTechnique}>Adicionar Técnica</Button>
                      </div>
                    </PanelCard>

                    <PanelCard title="Técnicas Selecionadas">
                      {techniques.length === 0 ? (
                        <EmptyState icon={Sparkles} title="Nenhuma técnica adicionada." />
                      ) : (
                        <div className="space-y-2">
                          {techniques.map(t => (
                            <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-7 h-7 rounded-md border border-primary-100 bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                                  <Heart size={14} />
                                </div>
                                <p className="text-[13px] font-medium text-slate-700 break-words min-w-0">{t.text}</p>
                              </div>
                              <IconButton variant="ghost" size="sm" aria-label="Remover técnica" title="Remover técnica" className="hover:text-red-600" onClick={() => removeTechnique(t.id)}>
                                <Trash2 size={14} />
                              </IconButton>
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
