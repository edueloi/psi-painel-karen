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
import { Patient, DreamRecord, CounterTransference } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { 
  Feather, Plus, Trash2, Edit3, Save, RotateCcw, RefreshCcw, 
  Moon, MessagesSquare, ScanSearch, Activity, Sparkles, AlertTriangle, 
  CheckCircle2, ArrowRight, PenLine, ChevronRight, X, Loader2, Quote, Ghost, Eye,
  MessageSquare, BrainCircuit
} from 'lucide-react';

type PsychoTab = 'dreams' | 'free' | 'signifiers' | 'counter';

const psychoTabs = [
  { id: 'dreams', label: 'Sonhos', icon: Moon },
  { id: 'free', label: 'Livre', icon: MessagesSquare },
  { id: 'signifiers', label: 'Significantes', icon: ScanSearch },
  { id: 'counter', label: 'Contra-Transf', icon: Eye },
] as const;

export const PsychoanalysisPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<PsychoTab>('dreams');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tools State
  const [dreams, setDreams] = useState<DreamRecord[]>([]);
  const [freeText, setFreeText] = useState('');
  const [signifiers, setSignifiers] = useState<any[]>([]);
  const [counterTransference, setCounterTransference] = useState<CounterTransference[]>([]);

  // Form States
  const [newDream, setNewDream] = useState<Partial<DreamRecord>>({});
  const [editingDreamId, setEditingDreamId] = useState<string | null>(null);
  const [newSignifier, setNewSignifier] = useState('');
  const [newCounter, setNewCounter] = useState({ feeling: '', observation: '' });

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

  const loadPsychoData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/clinical-tools/${patientId}/psycho`);
      setDreams(Array.isArray(data?.dreams) ? data.dreams : []);
      setFreeText(data?.freeText || '');
      setSignifiers(Array.isArray(data?.signifiers) ? data.signifiers : []);

      // Load counter tool
      const counterResp = await api.get<any>(`/clinical-tools/${patientId}/psycho/counter`);
      setCounterTransference(Array.isArray(counterResp?.data) ? counterResp.data : []);
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
    if (['dreams', 'free', 'signifiers', 'counter'].includes(tab as string)) setActiveSub(tab as any);
  }, [searchParams]);

  useEffect(() => {
    if (selectedPatientId) loadPsychoData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleSaveDream = async () => {
    if (!selectedPatientId || !newDream.title) return;
    setSaving(true);
    try {
      const url = editingDreamId 
        ? `/clinical-tools/${selectedPatientId}/psycho/dreams/${editingDreamId}`
        : `/clinical-tools/${selectedPatientId}/psycho/dreams`;
      
      await (editingDreamId ? api.put(url, newDream) : api.post(url, newDream));
      setEditingDreamId(null);
      setNewDream({});
      loadPsychoData(selectedPatientId);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSignifier = async () => {
    if (!selectedPatientId || !newSignifier.trim()) return;
    setSaving(true);
    try {
      await api.post(`/clinical-tools/${selectedPatientId}/psycho/signifiers`, { term: newSignifier });
      setNewSignifier('');
      loadPsychoData(selectedPatientId);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFreeText = async () => {
    if (!selectedPatientId) return;
    setSaving(true);
    try {
      await api.put(`/clinical-tools/${selectedPatientId}/psycho/free`, { content: freeText });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCounter = async () => {
    if (!selectedPatientId || !newCounter.feeling) return;
    setSaving(true);
    try {
      const newList = [...counterTransference, { id: Date.now().toString(), ...newCounter, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/psycho/counter`, { data: newList });
      setNewCounter({ feeling: '', observation: '' });
      setCounterTransference(newList);
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
          icon={Feather}
          title="Abordagem Psicanalítica"
          description={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Exploração do Inconsciente & Transferência"}
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
                    icon={Feather}
                    title="Clínica da Escuta Psicanalítica"
                    description="Selecione um paciente para iniciar a análise. Mapeie a cadeia de significantes, analise o material onírico e sustente o lugar da transferência no setting analítico."
                  />
                </ContentCard>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {[
                    { title: 'Material Onírico', desc: 'Onirógrafo para registro e análise de sonhos.', icon: <Activity size={14} /> },
                    { title: 'Livre Associação', desc: 'Espaço para a fala sem censura do sujeito.', icon: <MessageSquare size={14} /> },
                    { title: 'Significantes', desc: 'Mapeamento de palavras-chave estruturantes.', icon: <ScanSearch size={14} /> }
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
              <Tabs<PsychoTab> items={psychoTabs} value={activeSub} onChange={setActiveSub} label="Seções da abordagem psicanalítica">
                {activeSub === 'dreams' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-3">
                    <PanelCard
                      title="Relato do Sonho"
                      className="h-fit"
                      action={
                        <IconButton
                          variant="ghost"
                          size="sm"
                          aria-label="Limpar formulário"
                          title="Limpar formulário"
                          onClick={() => { setEditingDreamId(null); setNewDream({}); }}
                        >
                          <RotateCcw size={14} />
                        </IconButton>
                      }
                    >
                      <div className="space-y-3">
                        <Input
                          label="Título / Identificador"
                          value={newDream.title || ''}
                          onChange={e => setNewDream({ ...newDream, title: e.target.value })}
                          placeholder="Ex: O Labirinto sem Fim"
                        />
                        <Textarea
                          label="Conteúdo Manifesto (O Sonho)"
                          rows={5}
                          value={newDream.manifest || ''}
                          onChange={e => setNewDream({ ...newDream, manifest: e.target.value })}
                          placeholder="O que o paciente relatou ter sonhado?"
                        />
                        <Textarea
                          label="Associações (Latente)"
                          rows={5}
                          value={newDream.latent || ''}
                          onChange={e => setNewDream({ ...newDream, latent: e.target.value })}
                          placeholder="Quais sentidos surgiram durante a associação livre?"
                        />
                        <Button
                          variant="primary"
                          fullWidth
                          onClick={handleSaveDream}
                          loading={saving}
                          iconLeft={editingDreamId ? <Save size={14} /> : <Plus size={14} />}
                        >
                          {editingDreamId ? 'Atualizar' : 'Registrar'}
                        </Button>
                      </div>
                    </PanelCard>

                    <PanelCard
                      title="Material Onírico"
                      icon={Moon}
                      className="min-w-0"
                      action={
                        <IconButton
                          variant="ghost"
                          size="sm"
                          aria-label="Atualizar sonhos"
                          title="Atualizar sonhos"
                          onClick={() => loadPsychoData(selectedPatientId)}
                        >
                          <RefreshCcw size={14} />
                        </IconButton>
                      }
                    >
                      {dreams.length === 0 ? (
                        <EmptyState icon={Moon} title="Nenhum sonho mapeado." />
                      ) : (
                        <div className="space-y-3 max-h-[75vh] overflow-y-auto">
                          {dreams.slice().reverse().map(d => (
                            <div key={d.id} className="rounded-lg border border-slate-200 p-3 group relative space-y-3">
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Editar sonho"
                                  title="Editar sonho"
                                  onClick={() => { setEditingDreamId(d.id); setNewDream(d); }}
                                >
                                  <Edit3 size={14} />
                                </IconButton>
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Excluir sonho"
                                  title="Excluir sonho"
                                  className="hover:text-red-600"
                                  onClick={async () => { await api.delete(`/clinical-tools/${selectedPatientId}/psycho/dreams/${d.id}`); loadPsychoData(selectedPatientId); }}
                                >
                                  <Trash2 size={14} />
                                </IconButton>
                              </div>
                              <div className="space-y-0.5 pr-16">
                                <span className="text-[11px] text-slate-500">{new Date(d.createdAt || "").toLocaleDateString()}</span>
                                <h4 className="text-sm font-medium text-slate-800">{d.title}</h4>
                              </div>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge color="default" size="sm">M</Badge>
                                    <span className="text-xs font-medium text-slate-600">Conteúdo Manifesto</span>
                                  </div>
                                  <p className="text-xs text-slate-600 italic">"{d.manifest}"</p>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge color="primary" size="sm">L</Badge>
                                    <span className="text-xs font-medium text-primary-700">Interpretação Latente</span>
                                  </div>
                                  <p className="text-xs font-medium text-slate-800 border-l-2 border-primary-200 pl-3">"{d.latent || 'Agurdando associações...'}"</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </PanelCard>
                  </div>
                )}

                {activeSub === 'free' && (
                  <PanelCard
                    title="Livre Associação"
                    description="Notas do analista durante a sessão"
                    icon={Quote}
                    action={
                      <Button variant="primary" size="sm" onClick={handleSaveFreeText} loading={saving} iconLeft={<Save size={14} />}>
                        Gravar Reflexões
                      </Button>
                    }
                  >
                    <Textarea
                      aria-label="Livre associação"
                      rows={16}
                      className="min-h-[320px]"
                      value={freeText}
                      onChange={e => setFreeText(e.target.value)}
                      placeholder="Abra espaço para a fala do sujeito. O que emerge sem censura?"
                    />
                  </PanelCard>
                )}

                {activeSub === 'signifiers' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-3">
                    <PanelCard
                      title="Cadeia de Significantes"
                      description="Mapeie as palavras-chave que se repetem e sustentam a estrutura do sujeito."
                      icon={ScanSearch}
                      className="min-w-0"
                    >
                      <div className="space-y-3">
                        <div className="flex gap-2 max-w-md">
                          <Input
                            aria-label="Novo significante"
                            placeholder="Novo significante..."
                            value={newSignifier}
                            onChange={e => setNewSignifier(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveSignifier()}
                          />
                          <Button variant="primary" iconLeft={<Plus size={14} />} onClick={handleSaveSignifier}>
                            Adicionar
                          </Button>
                        </div>

                        {signifiers.length === 0 ? (
                          <EmptyState icon={ScanSearch} title="Aguardando marcações do Simbólico..." />
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {signifiers.slice().reverse().map(s => (
                              <div key={s.id} className="inline-flex items-center gap-1 pl-3 pr-1 h-9 bg-white border border-slate-200 rounded-lg hover:border-primary-200 transition-colors">
                                <span className="text-xs font-medium text-slate-800 lowercase">#{s.term}</span>
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Excluir significante"
                                  title="Excluir significante"
                                  className="hover:text-red-600"
                                  onClick={async () => { await api.delete(`/clinical-tools/${selectedPatientId}/psycho/signifiers/${s.id}`); loadPsychoData(selectedPatientId); }}
                                >
                                  <Trash2 size={14} />
                                </IconButton>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </PanelCard>

                    <PanelCard title="Dica Clínica" icon={ScanSearch} className="h-fit">
                      <div className="space-y-2">
                        <p className="text-xs text-slate-600 italic">"O significante é o que representa o sujeito para outro significante."</p>
                        <p className="text-xs font-medium text-slate-800">— Jacques Lacan</p>
                        <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">Identifique os pontos de estofo onde o sentido é interrompido.</p>
                      </div>
                    </PanelCard>
                  </div>
                )}

                {activeSub === 'counter' && (
                  <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-3">
                    <PanelCard title="O Olhar do Analista" description="Contra-Transferência" icon={Eye} className="h-fit">
                      <div className="space-y-3">
                        <Input
                          label="O que senti?"
                          value={newCounter.feeling}
                          onChange={e => setNewCounter({ ...newCounter, feeling: e.target.value })}
                          placeholder="Ex: Tédio, urgência, maternal..."
                        />
                        <Textarea
                          label="Observação Subjetiva"
                          rows={6}
                          value={newCounter.observation}
                          onChange={e => setNewCounter({ ...newCounter, observation: e.target.value })}
                          placeholder="Como esse sentimento ilumina a estrutura do paciente?"
                        />
                        <Button variant="primary" fullWidth onClick={handleSaveCounter}>
                          Arquivar Auto-Análise
                        </Button>
                      </div>
                    </PanelCard>

                    <PanelCard title="Notas de Super-Ego Clínico" icon={Activity} className="min-w-0">
                      {counterTransference.length === 0 ? (
                        <EmptyState icon={Eye} title="Use este espaço para monitorar sua própria contratransferência." />
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {counterTransference.slice().reverse().map(c => (
                            <div key={c.id} className="rounded-lg border border-slate-200 p-3 space-y-2">
                              <div className="flex justify-between items-start gap-2">
                                <Badge color="default" size="md">{c.feeling}</Badge>
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Excluir nota"
                                  title="Excluir nota"
                                  className="hover:text-red-600"
                                  onClick={async () => {
                                    const newList = counterTransference.filter(it => it.id !== c.id);
                                    await api.put(`/clinical-tools/${selectedPatientId}/psycho/counter`, { data: newList });
                                    setCounterTransference(newList);
                                  }}
                                >
                                  <Trash2 size={14} />
                                </IconButton>
                              </div>
                              <p className="text-xs text-slate-600 italic">"{c.observation}"</p>
                              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 text-right">
                                Registrado em {new Date(c.createdAt || "").toLocaleDateString()}
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
