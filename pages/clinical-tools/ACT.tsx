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
  Target, Plus, Trash2, Edit3, Save, RotateCcw, 
  ChevronRight, X, ArrowLeft, Loader2, Compass, Zap, Heart, LayoutGrid, ArrowRight, CheckCircle2
} from 'lucide-react';

type ActTab = 'values' | 'defusion' | 'matrix';

const actTabs = [
  { id: 'values', label: 'Bússola', icon: Compass },
  { id: 'defusion', label: 'Desfusão', icon: Zap },
  { id: 'matrix', label: 'Matriz ACT', icon: LayoutGrid },
] as const;

export const ACTPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<ActTab>('values');
  
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
    <PageWrapper>
      <div className="space-y-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/caixa-ferramentas')}>
            Voltar
          </Button>
        </div>

        <SectionTitle
          icon={Target}
          title="ACT - Aceitação & Compromisso"
          description={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Flexibilidade Psicologia & Valores"}
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
                  icon={Target}
                  title="ACT Workspace"
                  description="Selecione um paciente para iniciar o trabalho com valores, aceitação e flexibilidade psicológica."
                />
              </ContentCard>
            ) : (
              <Tabs<ActTab> items={actTabs} value={activeSub} onChange={setActiveSub} label="Seções da ACT">
                {activeSub === 'values' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-3">
                    <PanelCard title="Mapear Valor">
                      <div className="space-y-3">
                        <Select
                          label="Área da Vida"
                          value={newValue.area}
                          onChange={e => setNewValue({ ...newValue, area: e.target.value })}
                        >
                          <option value="">Selecione...</option>
                          <option value="Familia">Relacionamentos Familiares</option>
                          <option value="Amigos">Amizade/Social</option>
                          <option value="Trabalho">Carreira/Trabalho</option>
                          <option value="Saude">Saúde/Bem-estar</option>
                          <option value="Espiritualidade">Crescimento/Espiritualidade</option>
                        </Select>
                        <Textarea
                          label="O que é importante? (Valor)"
                          rows={4}
                          value={newValue.value}
                          onChange={e => setNewValue({ ...newValue, value: e.target.value })}
                          placeholder="Ex: Ser presente e atencioso."
                        />
                        <Input
                          label="Ação Comprometida"
                          value={newValue.action}
                          onChange={e => setNewValue({ ...newValue, action: e.target.value })}
                          placeholder="Ex: Ligar para meus pais hoje."
                        />
                        <Button variant="primary" fullWidth onClick={handleSaveValue} loading={saving}>
                          Registrar Valor
                        </Button>
                      </div>
                    </PanelCard>
                    <div className="space-y-3 min-w-0">
                      {values.map(v => (
                        <ContentCard key={v.id} className="group relative">
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <IconButton
                              variant="ghost"
                              size="sm"
                              aria-label="Excluir valor"
                              title="Excluir valor"
                              className="hover:text-red-600"
                              onClick={async () => {
                                const next = values.filter(it => it.id !== v.id);
                                await api.put(`/clinical-tools/${selectedPatientId}/act`, { values: next, defusions });
                                setValues(next);
                              }}
                            >
                              <Trash2 size={14} />
                            </IconButton>
                          </div>
                          <div className="flex gap-3">
                            <div className="w-7 h-7 rounded-md border border-primary-100 bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                              <Heart size={14} />
                            </div>
                            <div className="space-y-1.5 min-w-0">
                              <Badge color="primary" size="sm">{v.area}</Badge>
                              <h4 className="text-sm font-medium text-slate-800">{v.value}</h4>
                              {v.action && (
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <ArrowRight size={14} className="text-emerald-500 shrink-0" /> {v.action}
                                </div>
                              )}
                            </div>
                          </div>
                        </ContentCard>
                      ))}
                    </div>
                  </div>
                )}

                {activeSub === 'defusion' && (
                  <PanelCard title="Técnicas de Desfusão" icon={Zap}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-3">
                        <Textarea
                          label={'Pensamento Fusado ("Eu sou...", "Vai dar...")'}
                          rows={4}
                          value={newDefusion.thought}
                          onChange={e => setNewDefusion({ ...newDefusion, thought: e.target.value })}
                        />
                        <Input
                          label="Técnica Aplicada"
                          value={newDefusion.technique}
                          onChange={e => setNewDefusion({ ...newDefusion, technique: e.target.value })}
                          placeholder="Ex: Nomear o pensamento, Voz de desenho animado..."
                        />
                        <Button variant="primary" fullWidth onClick={handleSaveDefusion} loading={saving}>
                          Registrar Exercício
                        </Button>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2 h-full">
                        <h4 className="text-xs font-medium text-slate-600">Histórico de Prática</h4>
                        <div className="space-y-2 overflow-y-auto max-h-[300px]">
                          {defusions.map(d => (
                            <div key={d.id} className="bg-white p-3 rounded-lg border border-slate-200">
                              <p className="text-xs font-medium text-slate-800 mb-1 italic">"{d.thought}"</p>
                              <p className="text-[11px] text-primary-700 flex items-center gap-1"><CheckCircle2 size={12} /> {d.technique}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </PanelCard>
                )}

                {activeSub === 'matrix' && (
                  <PanelCard
                    title="Matriz ACT"
                    icon={LayoutGrid}
                    action={
                      <Button variant="primary" size="sm" loading={saving} iconLeft={<Save size={14} />} onClick={() => handleSaveMatrix(matrix)}>
                        Salvar Matriz
                      </Button>
                    }
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-red-50/50 p-3 rounded-lg border border-red-100 space-y-2">
                        <Badge color="danger" size="sm">Expe. Evitação (Externo)</Badge>
                        <h4 className="font-medium text-slate-800 text-sm">O que você faz para fugir/evitar o mal-estar?</h4>
                        <Textarea aria-label="Experiências de evitação" rows={5} value={matrix.top_left} onChange={e => setMatrix({ ...matrix, top_left: e.target.value })} placeholder="Comportamentos de fuga, distrações..." />
                      </div>

                      <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 space-y-2">
                        <Badge color="success" size="sm">Ação Comprometida (Externo)</Badge>
                        <h4 className="font-medium text-slate-800 text-sm">O que você faz para se mover rumo aos valores?</h4>
                        <Textarea aria-label="Ação comprometida" rows={5} value={matrix.top_right} onChange={e => setMatrix({ ...matrix, top_right: e.target.value })} placeholder="Ações que te movem em direção a quem você quer ser..." />
                      </div>

                      <div className="bg-yellow-50/50 p-3 rounded-lg border border-yellow-100 space-y-2">
                        <Badge color="warning" size="sm">Dor / Barreiras (Interno)</Badge>
                        <h4 className="font-medium text-slate-800 text-sm">Quais pensamentos e emoções te afastam?</h4>
                        <Textarea aria-label="Dor e barreiras" rows={5} value={matrix.bottom_left} onChange={e => setMatrix({ ...matrix, bottom_left: e.target.value })} placeholder="Medos, ansiedade, pensamentos negativos..." />
                      </div>

                      <div className="bg-primary-50/50 p-3 rounded-lg border border-primary-100 space-y-2">
                        <Badge color="primary" size="sm">Valores (Interno)</Badge>
                        <h4 className="font-medium text-slate-800 text-sm">O que é realmente importante? Quem quer ser?</h4>
                        <Textarea aria-label="Valores" rows={5} value={matrix.bottom_right} onChange={e => setMatrix({ ...matrix, bottom_right: e.target.value })} placeholder="Seus valores base, propósitos..." />
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
