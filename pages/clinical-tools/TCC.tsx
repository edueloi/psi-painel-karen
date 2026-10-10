import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Patient, RPDRecord, CopingCard, SocraticQuestioning } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { 
  Brain, Plus, Trash2, Edit3, Save, RotateCcw, RefreshCcw, 
  HelpCircle, MessageSquare, Layout, Sparkles, AlertTriangle, 
  CheckCircle2, ArrowRight, PenLine, ChevronRight, X, Loader2,
  BrainCircuit, ClipboardList, Target, Feather, ScanSearch, Camera,
  Sun, Smile, Zap, LayoutGrid, ArrowLeft
} from 'lucide-react';
import { Badge, Button, ContentCard, EmptyState, IconButton, Input, PageWrapper, PanelCard, SectionTitle, Tabs, Textarea } from '../../components/UI';

const toIso = (v?: any) => {
  if (!v) return new Date().toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

type TccTab = 'rpd' | 'cards' | 'socratic';

const tccTabs = [
  { id: 'rpd', label: 'RPD', icon: Layout },
  { id: 'cards', label: 'Cartões', icon: Sparkles },
  { id: 'socratic', label: 'Socrático', icon: HelpCircle },
] as const;

export const TCCPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<TccTab>('rpd');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tools State
  const [records, setRecords] = useState<RPDRecord[]>([]);
  const [cards, setCards] = useState<CopingCard[]>([]);
  const [socratic, setSocratic] = useState<SocraticQuestioning[]>([]);

  // Form States
  const [newRPD, setNewRPD] = useState<Partial<RPDRecord>>({ intensity: 5 });
  const [editingRPDId, setEditingRPDId] = useState<string | null>(null);
  const [newCard, setNewCard] = useState({ front: '', back: '' });
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [newSocratic, setNewSocratic] = useState({ question: '', answer: '' });

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

  const loadTccData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/clinical-tools/${patientId}/tcc`);
      setRecords(Array.isArray(data?.records) ? data.records : []);
      setCards(Array.isArray(data?.cards) ? data.cards : []);
      
      // Load socratic tool
      const socr = await api.get<any>(`/clinical-tools/${patientId}/tcc/socratic`);
      setSocratic(Array.isArray(socr?.data) ? socr.data : []);
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
    if (tab === 'cards' || tab === 'socratic') setActiveSub(tab);
  }, [searchParams]);

  useEffect(() => {
    if (selectedPatientId) loadTccData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleSaveRPD = async () => {
    if (!selectedPatientId || !newRPD.situation || !newRPD.thought) return;
    setSaving(true);
    try {
      const url = editingRPDId 
        ? `/clinical-tools/${selectedPatientId}/tcc/rpd/${editingRPDId}`
        : `/clinical-tools/${selectedPatientId}/tcc/rpd`;
      
      await (editingRPDId ? api.put(url, newRPD) : api.post(url, newRPD));
      setEditingRPDId(null);
      setNewRPD({ intensity: 5 });
      loadTccData(selectedPatientId);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCard = async () => {
    if (!selectedPatientId || !newCard.front || !newCard.back) return;
    setSaving(true);
    try {
      const url = editingCardId 
        ? `/clinical-tools/${selectedPatientId}/tcc/cards/${editingCardId}`
        : `/clinical-tools/${selectedPatientId}/tcc/cards`;
      
      await (editingCardId ? api.put(url, newCard) : api.post(url, newCard));
      setEditingCardId(null);
      setNewCard({ front: '', back: '' });
      loadTccData(selectedPatientId);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSocratic = async () => {
    if (!selectedPatientId || !newSocratic.question) return;
    setSaving(true);
    try {
      const newList = [...socratic, { id: Date.now().toString(), ...newSocratic, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/tcc/socratic`, { data: newList });
      setNewSocratic({ question: '', answer: '' });
      setSocratic(newList);
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
          icon={Brain}
          title="Terapia Cognitivo-Comportamental"
          description={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : 'Registros de pensamentos, cartões de enfrentamento e questionamento socrático.'}
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
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary-100 bg-primary-50 text-primary-700"><BrainCircuit size={14} /></div>
                    <div>
                      <h2 className="text-sm font-medium text-slate-900">Fluxo clínico estruturado</h2>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">Organize pensamentos, reestruture crenças e acompanhe a evolução comportamental com protocolos da TCC.</p>
                    </div>
                  </div>
                </ContentCard>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {[
                    { title: 'RPD digital', desc: 'Registro de pensamentos disfuncionais estruturado.', icon: ClipboardList },
                    { title: 'Questionamento socrático', desc: 'Estruture o diálogo para desafiar distorções.', icon: MessageSquare },
                    { title: 'Cartões de enfrentamento', desc: 'Cards para o paciente utilizar fora da sessão.', icon: Target }
                  ].map((feat, i) => (
                    <ContentCard key={i}>
                      <div className="flex h-7 w-7 items-center justify-center rounded-md border border-primary-100 bg-primary-50 text-primary-700"><feat.icon size={14} /></div>
                      <h3 className="mt-3 text-sm font-medium text-slate-900">{feat.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{feat.desc}</p>
                    </ContentCard>
                  ))}
                </div>

                <ContentCard><EmptyState icon={Brain} title="Selecione um paciente para iniciar" description="Escolha um paciente na coluna ao lado para visualizar e registrar os dados clínicos." /></ContentCard>
              </div>
            ) : (
              <Tabs<TccTab> items={tccTabs} value={activeSub} onChange={setActiveSub} label="Ferramentas da TCC">
                {activeSub === 'rpd' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-3">
                    <PanelCard
                      title="Novo Registro"
                      className="h-fit"
                      action={<IconButton aria-label="Limpar registro" title="Limpar registro" size="sm" onClick={() => { setEditingRPDId(null); setNewRPD({ intensity: 5 }); }}><RotateCcw size={14} /></IconButton>}
                    >
                      <div className="space-y-3">
                        <Textarea
                          label="Situação"
                          rows={4}
                          value={newRPD.situation || ''}
                          onChange={e => setNewRPD({ ...newRPD, situation: e.target.value })}
                          placeholder="O que aconteceu? Onde? Com quem?"
                        />
                        <Textarea
                          label="Pensamento Automático"
                          rows={4}
                          value={newRPD.thought || ''}
                          onChange={e => setNewRPD({ ...newRPD, thought: e.target.value })}
                          placeholder="O que passou pela sua cabeça no momento?"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input
                            label="Emoção"
                            type="text"
                            value={newRPD.emotion || ''}
                            onChange={e => setNewRPD({ ...newRPD, emotion: e.target.value })}
                            placeholder="Tristeza, medo..."
                          />
                          <Input
                            label="Intensidade (0-10)"
                            type="number"
                            value={newRPD.intensity || 5}
                            onChange={e => setNewRPD({ ...newRPD, intensity: parseInt(e.target.value) })}
                          />
                        </div>
                        <Button
                          onClick={handleSaveRPD}
                          loading={saving}
                          fullWidth
                          size="sm"
                          iconLeft={editingRPDId ? <Save size={14} /> : <Plus size={14} />}
                        >
                          {editingRPDId ? 'Salvar' : 'Adicionar'}
                        </Button>
                      </div>
                    </PanelCard>

                    <PanelCard
                      title="Registros Clínicos"
                      icon={Sparkles}
                      className="min-w-0"
                      action={<IconButton aria-label="Atualizar registros" title="Atualizar registros" size="sm" onClick={() => loadTccData(selectedPatientId)}><RefreshCcw size={14} /></IconButton>}
                    >
                      {records.length === 0 ? (
                        <EmptyState icon={MessageSquare} title="Nenhum registro encontrado" description="Adicione um registro para acompanhar o pensamento clínico." />
                      ) : (
                        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                          {records.slice().reverse().map(r => (
                            <div key={r.id} className="group relative rounded-lg border border-slate-200 p-3 hover:border-primary-200 transition-colors space-y-3">
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <IconButton aria-label="Editar registro" title="Editar registro" size="xs" variant="outline" onClick={() => { setEditingRPDId(r.id); setNewRPD(r); }}><Edit3 size={14} /></IconButton>
                                <IconButton aria-label="Excluir registro" title="Excluir registro" size="xs" variant="danger" onClick={async () => { await api.delete(`/clinical-tools/${selectedPatientId}/tcc/rpd/${r.id}`); loadTccData(selectedPatientId); }}><Trash2 size={14} /></IconButton>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 pr-16">
                                <span className="text-[11px] text-slate-500">{new Date(r.date || "").toLocaleDateString()}</span>
                                <Badge color={r.intensity > 7 ? 'danger' : 'primary'} size="sm">
                                  Intensidade: {r.intensity}/10
                                </Badge>
                              </div>

                              <div>
                                <p className="text-[11px] text-slate-500 mb-0.5">Pensamento Alvo</p>
                                <p className="text-sm font-medium text-slate-800 italic">"{r.thought}"</p>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <p className="text-[11px] text-slate-500 mb-0.5">Situação</p>
                                  <p className="text-xs text-slate-600">{r.situation}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] text-slate-500 mb-0.5">Emoção</p>
                                  <p className="text-xs font-medium text-slate-800">{r.emotion || '-'}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </PanelCard>
                  </div>
                )}

                {activeSub === 'cards' && (
                  <div className="space-y-3">
                    <ContentCard>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-medium text-slate-900">Cartões de Enfrentamento</h2>
                          <p className="text-[11px] text-slate-500">Lembretes para o paciente utilizar fora da sessão.</p>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          iconLeft={<Plus size={14} />}
                          onClick={() => { setEditingCardId(null); setNewCard({ front: '', back: '' }); }}
                        >
                          Novo Cartão
                        </Button>
                      </div>
                    </ContentCard>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      <PanelCard title={editingCardId ? 'Editar cartão' : 'Novo cartão'} className="h-fit">
                        <div className="space-y-3">
                          <Input
                            label="Frente / Gatilho"
                            value={newCard.front}
                            onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                            placeholder="Ex: Quando me sinto sozinho..."
                          />
                          <Textarea
                            label="Verso / Enfrentamento"
                            rows={5}
                            value={newCard.back}
                            onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                            placeholder="Ex: Respire fundo e lembre que esse sentimento é passageiro..."
                          />
                          <Button variant="primary" fullWidth onClick={handleSaveCard}>
                            {editingCardId ? 'Salvar' : 'Criar Cartão'}
                          </Button>
                        </div>
                      </PanelCard>

                      {cards.map(c => (
                        <ContentCard key={c.id} padding="none" className="overflow-hidden flex flex-col h-full group">
                          <div className="p-3 bg-primary-50/40 flex-1 relative">
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                              <IconButton aria-label="Editar cartão" title="Editar cartão" size="xs" variant="outline" onClick={() => { setEditingCardId(c.id); setNewCard(c); }}><Edit3 size={14} /></IconButton>
                              <IconButton aria-label="Excluir cartão" title="Excluir cartão" size="xs" variant="danger" onClick={async () => { await api.delete(`/clinical-tools/${selectedPatientId}/tcc/cards/${c.id}`); loadTccData(selectedPatientId); }}><Trash2 size={14} /></IconButton>
                            </div>
                            <h4 className="text-sm font-medium text-slate-800 mb-2 pr-16">{c.front}</h4>
                            <div className="h-px bg-slate-200/60 mb-2" />
                            <p className="text-xs text-slate-600">{c.back}</p>
                          </div>
                          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[11px] text-slate-500 flex items-center gap-1.5"><CheckCircle2 size={12} /> Lembrete Terapêutico</span>
                            <span className="text-[11px] text-slate-500">{new Date(c.createdAt || "").toLocaleDateString()}</span>
                          </div>
                        </ContentCard>
                      ))}
                    </div>
                  </div>
                )}

                {activeSub === 'socratic' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <PanelCard title="Questionamento Socrático" description="Exploração de Evidências" icon={HelpCircle}>
                        <div className="space-y-3">
                          <p className="text-xs text-slate-500">Use as perguntas guia abaixo para estimular a reflexão do paciente sobre seus pensamentos disfuncionais:</p>
                          <div className="grid grid-cols-1 gap-2">
                            {[
                              "Quais evidências apoiam esse pensamento?",
                              "Quais evidências contrariam esse pensamento?",
                              "Existe uma explicação alternativa?",
                              "Qual o pior que pode acontecer? E o melhor?",
                              "O que eu diria a um amigo se ele estivesse nessa situação?",
                              "Qual o efeito de acreditar nesse pensamento?"
                            ].map((q, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setNewSocratic({ ...newSocratic, question: q })}
                                className="px-3 py-2 min-h-[36px] rounded-lg bg-slate-50 hover:bg-primary-50 border border-slate-200 hover:border-primary-200 text-left text-xs text-slate-600 hover:text-primary-700 transition-colors group flex items-center justify-between gap-2"
                              >
                                {q}
                                <ChevronRight size={14} className="text-slate-300 group-hover:text-primary-400 shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </PanelCard>

                      <PanelCard title="Resposta do Paciente" icon={PenLine}>
                        <div className="space-y-3">
                          <Input
                            label="Pergunta Selecionada"
                            value={newSocratic.question}
                            onChange={e => setNewSocratic({ ...newSocratic, question: e.target.value })}
                            placeholder="Selecione ao lado ou digite..."
                          />
                          <Textarea
                            label="Resposta do Paciente"
                            rows={8}
                            value={newSocratic.answer}
                            onChange={e => setNewSocratic({ ...newSocratic, answer: e.target.value })}
                            placeholder="Registre aqui a reflexão do paciente..."
                          />
                          <Button variant="primary" fullWidth iconLeft={<Save size={14} />} onClick={handleSaveSocratic}>
                            Registrar Reflexão
                          </Button>
                        </div>
                      </PanelCard>
                    </div>

                    <PanelCard title="Desafios Cognitivos">
                      {socratic.length === 0 ? (
                        <EmptyState icon={HelpCircle} title="Nenhum questionamento registrado ainda." />
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {socratic.slice().reverse().map(s => (
                            <div key={s.id} className="group relative rounded-lg border border-slate-200 p-3 space-y-2">
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Excluir questionamento"
                                  title="Excluir questionamento"
                                  className="hover:text-red-600"
                                  onClick={async () => {
                                    const newList = socratic.filter(it => it.id !== s.id);
                                    await api.put(`/clinical-tools/${selectedPatientId}/tcc/socratic`, { data: newList });
                                    setSocratic(newList);
                                  }}
                                >
                                  <Trash2 size={14} />
                                </IconButton>
                              </div>
                              <div className="flex items-start gap-2 pr-8">
                                <Badge color="primary" size="sm">?</Badge>
                                <p className="text-xs font-medium text-slate-800">{s.question}</p>
                              </div>
                              <div className="pl-3 border-l-2 border-primary-100">
                                <p className="text-xs text-slate-600 italic">"{s.answer}"</p>
                              </div>
                              <div className="flex justify-end">
                                <span className="text-[11px] text-slate-500">{new Date(s.createdAt || "").toLocaleDateString()}</span>
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
