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
import { 
  Zap, Plus, Trash2, Edit3, Save, RotateCcw, 
  HelpCircle, Sparkles, CheckCircle2, ArrowRight, 
  ChevronRight, X, Loader2, Smile, Heart, Shield,
  Layers, Filter, Eye, Activity
} from 'lucide-react';

type EmdrTab = 'reprocess' | 'sudar' | 'resources';

const emdrTabs = [
  { id: 'reprocess', label: 'Reprocessar', icon: Eye },
  { id: 'resources', label: 'Recursos', icon: Shield },
] as const;

export const EMDRPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<EmdrTab>('reprocess');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // EMDR Specific State
  const [sessions, setSessions] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);

  const [newSession, setNewSession] = useState({ target: '', sudInitial: 10, sudFinal: 10, belief: '', validity: 1 });
  const [newResource, setNewResource] = useState({ title: '', intensity: 1, type: 'Lugar Seguro' });

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

  const loadEmdrData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/clinical-tools/${patientId}/emdr`);
      setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
      setResources(Array.isArray(data?.resources) ? data.resources : []);
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
    if (selectedPatientId) loadEmdrData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleSaveSession = async () => {
    if (!selectedPatientId || !newSession.target) return;
    setSaving(true);
    try {
      const updatedSessions = [...sessions, { id: Date.now().toString(), ...newSession, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/emdr`, { sessions: updatedSessions, resources });
      setSessions(updatedSessions);
      setNewSession({ target: '', sudInitial: 10, sudFinal: 10, belief: '', validity: 1 });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveResource = async () => {
    if (!selectedPatientId || !newResource.title) return;
    setSaving(true);
    try {
      const updatedResources = [...resources, { id: Date.now().toString(), ...newResource, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/emdr`, { sessions, resources: updatedResources });
      setResources(updatedResources);
      setNewResource({ title: '', intensity: 1, type: 'Lugar Seguro' });
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
          icon={Zap}
          title="EMDR - Reprocessamento de Traumas"
          description={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Dessensibilização & Reprocessamento"}
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
                  icon={Zap}
                  title="EMDR Workspace"
                  description="Workflow automatizado para Reprocessamento de Traumas e Escalameto SUD."
                />
              </ContentCard>
            ) : (
              <Tabs<EmdrTab> items={emdrTabs} value={activeSub} onChange={setActiveSub} label="Seções do EMDR">
                {activeSub === 'reprocess' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-3">
                    <PanelCard title="Sessão de Reprocessamento">
                      <div className="space-y-3">
                        <Textarea label="Alvo / Memória Traumática" rows={4} value={newSession.target} onChange={e => setNewSession({ ...newSession, target: e.target.value })} placeholder="Descrição breve da memória..." />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input label="SUD Inicial (0-10)" type="number" value={newSession.sudInitial} onChange={e => setNewSession({ ...newSession, sudInitial: parseInt(e.target.value) })} />
                          <Input label="SUD Final (0-10)" type="number" value={newSession.sudFinal} onChange={e => setNewSession({ ...newSession, sudFinal: parseInt(e.target.value) })} />
                        </div>
                        <Button variant="primary" fullWidth onClick={handleSaveSession} loading={saving}>Registrar Alvo</Button>
                      </div>
                    </PanelCard>
                    <div className="space-y-3 min-w-0">
                      {sessions.map(s => (
                        <ContentCard key={s.id}>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-slate-800 italic">"{s.target}"</h4>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge color="danger" size="sm">SUD Inicial: {s.sudInitial}</Badge>
                                <ArrowRight size={14} className="text-slate-300" />
                                <Badge color="success" size="sm">SUD Final: {s.sudFinal}</Badge>
                              </div>
                            </div>
                            <div className="sm:border-l sm:border-slate-100 sm:pl-3 sm:text-center">
                              <p className="text-[11px] text-slate-500">Dessensibilização</p>
                              <p className="text-base font-medium text-emerald-600">-{s.sudInitial - s.sudFinal}</p>
                            </div>
                          </div>
                        </ContentCard>
                      ))}
                    </div>
                  </div>
                )}

                {activeSub === 'resources' && (
                  <PanelCard title="Instalação de Recursos" icon={Shield}>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                        <Input label="Recurso / Lugar Seguro" value={newResource.title} onChange={e => setNewResource({ ...newResource, title: e.target.value })} placeholder="Ex: Praia secreta, Montanha..." />
                        <Button variant="primary" fullWidth onClick={handleSaveResource} loading={saving}>Instalar Recurso</Button>
                      </div>
                      {resources.map(r => (
                        <ContentCard key={r.id}>
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-medium text-slate-800">{r.title}</h4>
                            <CheckCircle2 size={14} className="text-primary-600 shrink-0" />
                          </div>
                          <p className="text-[11px] text-slate-500 mt-2">Ponto de Estabilização</p>
                        </ContentCard>
                      ))}
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
