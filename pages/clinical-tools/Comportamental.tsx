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
  Settings2, Plus, Trash2, Edit3, Save, RotateCcw, 
  HelpCircle, Sparkles, CheckCircle2, ArrowRight, 
  ChevronRight, X, Loader2, Smile, Heart, Shield,
  Layers, Filter, Eye, Activity, Share2, Users, Moon,
  Star, ClipboardList, Target, ArrowLeft
} from 'lucide-react';

type ComportamentalTab = 'abc' | 'contingency';

const comportamentalTabs = [
  { id: 'abc', label: 'Análise ABC', icon: ClipboardList },
  { id: 'contingency', label: 'Contingência', icon: Target },
] as const;

export const ComportamentalPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<ComportamentalTab>('abc');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Behavioral Specific State
  const [abcData, setAbcData] = useState<any[]>([]);
  const [contingencies, setContingencies] = useState<any[]>([]);

  const [newAbc, setNewAbc] = useState({ antecedent: '', behavior: '', consequence: '', function: 'Reforço Positivo' });
  const [newContingency, setNewContingency] = useState({ behavior: '', reward: '', frequency: '' });

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

  const loadComportamentalData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/clinical-tools/${patientId}/comportamental`);
      setAbcData(Array.isArray(data?.abc) ? data.abc : []);
      setContingencies(Array.isArray(data?.contingencies) ? data.contingencies : []);
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
    if (selectedPatientId) loadComportamentalData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleSaveAbc = async () => {
    if (!selectedPatientId || !newAbc.behavior) return;
    setSaving(true);
    try {
      const updatedAbc = [...abcData, { id: Date.now().toString(), ...newAbc, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/comportamental`, { abc: updatedAbc, contingencies });
      setAbcData(updatedAbc);
      setNewAbc({ antecedent: '', behavior: '', consequence: '', function: 'Reforço Positivo' });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContingency = async () => {
    if (!selectedPatientId || !newContingency.behavior) return;
    setSaving(true);
    try {
      const updatedConts = [...contingencies, { id: Date.now().toString(), ...newContingency, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/comportamental`, { abc: abcData, contingencies: updatedConts });
      setContingencies(updatedConts);
      setNewContingency({ behavior: '', reward: '', frequency: '' });
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
          icon={Settings2}
          title="Psicologia Comportamental"
          description={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Análise Funcional (ABC) & Contingências"}
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
                  icon={Settings2}
                  title="Behavioral Workspace"
                  description="Módulo de Análise do Comportamento, focado em antecedentes, comportamentos e consequências."
                />
              </ContentCard>
            ) : (
              <Tabs<ComportamentalTab> items={comportamentalTabs} value={activeSub} onChange={setActiveSub} label="Seções da psicologia comportamental">
                {activeSub === 'abc' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-3">
                    <PanelCard title="Nova Análise ABC">
                      <div className="space-y-3">
                        <Textarea label="A - Antecedente" rows={3} value={newAbc.antecedent} onChange={e => setNewAbc({ ...newAbc, antecedent: e.target.value })} placeholder="O que aconteceu antes?" />
                        <Textarea label="B - Comportamento" rows={3} value={newAbc.behavior} onChange={e => setNewAbc({ ...newAbc, behavior: e.target.value })} placeholder="Qual foi a ação?" />
                        <Textarea label="C - Consequência" rows={3} value={newAbc.consequence} onChange={e => setNewAbc({ ...newAbc, consequence: e.target.value })} placeholder="O que aconteceu depois?" />
                        <Select label="Função Hipotética" value={newAbc.function} onChange={e => setNewAbc({ ...newAbc, function: e.target.value })}>
                          <option value="Reforço Positivo">Reforço Positivo (Atenção/Ganho)</option>
                          <option value="Reforço Negativo">Reforço Negativo (Fuga/Esquiva)</option>
                          <option value="Punição">Punição</option>
                          <option value="Extinção">Extinção</option>
                        </Select>
                        <Button variant="primary" fullWidth loading={saving} onClick={handleSaveAbc}>Registrar Análise</Button>
                      </div>
                    </PanelCard>
                    <div className="min-w-0 space-y-3 overflow-y-auto max-h-[70vh] custom-scrollbar">
                      {abcData.map(a => (
                        <ContentCard key={a.id}>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <span className="text-[11px] font-medium text-slate-500 block mb-1">Antecedente</span>
                              <p className="text-xs text-slate-700 leading-relaxed break-words">{a.antecedent}</p>
                            </div>
                            <div className="p-3 bg-primary-50 border border-primary-100 rounded-lg">
                              <span className="text-[11px] font-medium text-primary-700 block mb-1">Comportamento</span>
                              <p className="text-xs font-medium text-primary-900 leading-relaxed break-words">{a.behavior}</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <span className="text-[11px] font-medium text-slate-500 block mb-1">Consequência</span>
                              <p className="text-xs text-slate-700 leading-relaxed break-words">{a.consequence}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                            <Badge color="primary">{a.function}</Badge>
                            <span className="text-[11px] text-slate-500">{new Date(a.createdAt || "").toLocaleDateString()}</span>
                          </div>
                        </ContentCard>
                      ))}
                    </div>
                  </div>
                )}

                {activeSub === 'contingency' && (
                  <PanelCard title="Acordo de Contingência" icon={Target}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Input label="Comportamento Alvo" value={newContingency.behavior} onChange={e => setNewContingency({ ...newContingency, behavior: e.target.value })} placeholder="Qual comportamento queremos aumentar/diminuir?" />
                        <Input label="Reforçador / Recompensa" value={newContingency.reward} onChange={e => setNewContingency({ ...newContingency, reward: e.target.value })} placeholder="O que o paciente ganha ao cumprir?" />
                        <Button variant="primary" fullWidth loading={saving} onClick={handleSaveContingency}>Firmar Compromisso</Button>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
                        <h4 className="text-xs font-medium text-slate-600">Mural de Contingências</h4>
                        {contingencies.map(c => (
                          <div key={c.id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-800 break-words">{c.behavior}</p>
                              <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1"><Sparkles size={10} /> Reward: {c.reward}</p>
                            </div>
                            <div className="w-7 h-7 rounded-md bg-primary-600 flex items-center justify-center text-white shrink-0"><CheckCircle2 size={14} /></div>
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
