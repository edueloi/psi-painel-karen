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
import { Save, Plus, Trash2, HeartHandshake, Eye, MessageSquare, Activity, Loader2, ArrowLeft } from 'lucide-react';

const CRB_COLORS: Record<string, string> = {
  CRB1: 'bg-rose-100 text-rose-700 border-rose-200',
  CRB2: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CRB3: 'bg-blue-100 text-blue-700 border-blue-200',
};

type FapTab = 'crb' | 'five_rules' | 'session_notes';

const fapTabs = [
  { id: 'crb', label: 'CRBs', icon: Activity },
  { id: 'five_rules', label: '5 Regras', icon: Eye },
  { id: 'session_notes', label: 'Notas de Sessão', icon: MessageSquare },
] as const;

export const FAPPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<FapTab>('crb');

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // FAP state
  const [crbs, setCrbs] = useState<any[]>([]);
  const [fiveRules, setFiveRules] = useState({
    rule1: '', rule2: '', rule3: '', rule4: '', rule5: ''
  });
  const [sessionNotes, setSessionNotes] = useState<any[]>([]);

  const [newCrb, setNewCrb] = useState({ type: 'CRB1', description: '', context: '', intervention: '', patient_response: '' });
  const [newNote, setNewNote] = useState({ date: new Date().toISOString().split('T')[0], relationship_quality: 7, observation: '', patient_emotion: '', therapist_reaction: '' });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const raw = await api.get<any[]>('/patients');
      setPatients((raw || []).map((p: any) => ({ ...p, full_name: p.name || p.full_name || '' })));
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const loadFAPData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/clinical-tools/${patientId}/fap`);
      setCrbs(Array.isArray(data?.crbs) ? data.crbs : []);
      setFiveRules(data?.five_rules || { rule1: '', rule2: '', rule3: '', rule4: '', rule5: '' });
      setSessionNotes(Array.isArray(data?.session_notes) ? data.session_notes : []);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const pid = searchParams.get('patient_id');
    if (pid) setSelectedPatientId(pid);
  }, [searchParams]);

  useEffect(() => { if (selectedPatientId) loadFAPData(selectedPatientId); }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const saveAll = async (patch: any) => {
    if (!selectedPatientId) return;
    setSaving(true);
    try {
      await api.put(`/clinical-tools/${selectedPatientId}/fap`, {
        crbs: patch.crbs ?? crbs,
        five_rules: patch.five_rules ?? fiveRules,
        session_notes: patch.session_notes ?? sessionNotes,
      });
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const addCRB = () => {
    if (!newCrb.description) return;
    const upd = [...crbs, { id: Date.now().toString(), date: new Date().toISOString(), ...newCrb }];
    setCrbs(upd);
    setNewCrb({ type: 'CRB1', description: '', context: '', intervention: '', patient_response: '' });
    saveAll({ crbs: upd });
  };
  const removeCRB = (id: string) => { const upd = crbs.filter(c => c.id !== id); setCrbs(upd); saveAll({ crbs: upd }); };

  const saveFiveRules = () => saveAll({ five_rules: fiveRules });

  const addNote = () => {
    if (!newNote.observation) return;
    const upd = [...sessionNotes, { id: Date.now().toString(), ...newNote }];
    setSessionNotes(upd);
    setNewNote({ date: new Date().toISOString().split('T')[0], relationship_quality: 7, observation: '', patient_emotion: '', therapist_reaction: '' });
    saveAll({ session_notes: upd });
  };
  const removeNote = (id: string) => { const upd = sessionNotes.filter(n => n.id !== id); setSessionNotes(upd); saveAll({ session_notes: upd }); };

  return (
    <PageWrapper>
      <div className="space-y-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/caixa-ferramentas')}>
            Voltar
          </Button>
        </div>

        <SectionTitle
          icon={HeartHandshake}
          title="FAP — Psicoterapia Analítica Funcional"
          description={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "CRBs · 5 Regras da FAP · Notas de Sessão"}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
          <ClinicalSidebar patients={patients} selectedPatientId={selectedPatientId} onSelectPatient={setSelectedPatientId} patientSearch={patientSearch} setPatientSearch={setPatientSearch} isLoading={isLoading && patients.length === 0} t={t} />

          <div className="min-w-0 space-y-4">
            {!selectedPatient ? (
              <ContentCard>
                <EmptyState
                  icon={HeartHandshake}
                  title="FAP Workspace"
                  description="Mapeie CRBs ao vivo na sessão, aplique as 5 Regras da FAP e registre a qualidade da relação terapêutica."
                />
              </ContentCard>
            ) : (
              <Tabs<FapTab> items={fapTabs} value={activeSub} onChange={setActiveSub} label="Seções da FAP">
                {/* CRBs */}
                {activeSub === 'crb' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-3">
                    <PanelCard title="Novo CRB — Em Sessão">
                      <div className="space-y-3">
                        <Select aria-label="Tipo de CRB" value={newCrb.type} onChange={e => setNewCrb({ ...newCrb, type: e.target.value })}>
                          <option value="CRB1">CRB1 — Comportamento Problema (Sessão)</option>
                          <option value="CRB2">CRB2 — Melhoria / Comportamento alvo</option>
                          <option value="CRB3">CRB3 — Interpretação do Paciente</option>
                        </Select>
                        {[
                          { field: 'description', label: 'Descrição do Comportamento (o que ocorreu?)' },
                          { field: 'context', label: 'Contexto / Antecedente na sessão' },
                          { field: 'intervention', label: 'Sua Intervenção Terapêutica (Regra 3 / 4)' },
                          { field: 'patient_response', label: 'Resposta do Paciente à Intervenção' },
                        ].map(f => (
                          <Textarea key={f.field} label={f.label} rows={3}
                            value={(newCrb as any)[f.field]} onChange={e => setNewCrb({ ...newCrb, [f.field]: e.target.value })} />
                        ))}
                        <Button variant="primary" fullWidth loading={saving} iconLeft={<Plus size={14} />} onClick={addCRB}>Registrar CRB</Button>
                      </div>
                    </PanelCard>

                    <div className="min-w-0 space-y-3">
                      {crbs.length === 0 ? (
                        <ContentCard><EmptyState icon={Activity} title="Nenhum CRB registrado ainda." /></ContentCard>
                      ) : crbs.map(c => (
                        <ContentCard key={c.id}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${CRB_COLORS[c.type]}`}>{c.type}</span>
                              <span className="text-[11px] text-slate-500">{c.date ? new Date(c.date).toLocaleDateString() : ''}</span>
                            </div>
                            <IconButton variant="ghost" size="sm" aria-label="Remover CRB" title="Remover CRB" className="hover:text-red-600" onClick={() => removeCRB(c.id)}>
                              <Trash2 size={14} />
                            </IconButton>
                          </div>
                          <p className="text-[13px] font-medium text-slate-800 mb-2 break-words">{c.description}</p>
                          {c.context && <p className="text-xs text-slate-500 mb-1"><span className="font-medium text-slate-700">Contexto: </span>{c.context}</p>}
                          {c.intervention && <p className="text-xs text-slate-500 mb-1"><span className="font-medium text-slate-700">Intervenção: </span>{c.intervention}</p>}
                          {c.patient_response && <p className="text-xs text-emerald-600 italic"><span className="font-medium text-emerald-700">Resposta: </span>"{c.patient_response}"</p>}
                        </ContentCard>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5 Regras */}
                {activeSub === 'five_rules' && (
                  <PanelCard
                    title="5 Regras da FAP"
                    icon={Eye}
                    action={
                      <Button variant="primary" size="sm" loading={saving} iconLeft={<Save size={14} />} onClick={saveFiveRules}>Salvar</Button>
                    }
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {[
                        { key: 'rule1', num: '1', title: 'Observar CRBs', desc: 'Identificar quando surgem CRBs durante a sessão.' },
                        { key: 'rule2', num: '2', title: 'Evocar CRBs', desc: 'Criar condições para que CRBs ocorram na sessão.' },
                        { key: 'rule3', num: '3', title: 'Reforçar CRB2s', desc: 'Reforçar naturalmente os comportamentos de melhoria.' },
                        { key: 'rule4', num: '4', title: 'Observar Efeitos', desc: 'Observar seus efeitos no comportamento do paciente.' },
                        { key: 'rule5', num: '5', title: 'Interpretar', desc: 'Ajudar o paciente a fazer análises funcionais.' },
                      ].map(r => (
                        <div key={r.key} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-md border border-primary-100 bg-primary-50 text-primary-700 flex items-center justify-center font-medium text-xs shrink-0">{r.num}</div>
                            <div className="min-w-0">
                              <h4 className="font-medium text-slate-800 text-sm">{r.title}</h4>
                              <p className="text-[11px] text-slate-500">{r.desc}</p>
                            </div>
                          </div>
                          <Textarea
                            aria-label={`Regra ${r.num}: ${r.title}`}
                            rows={4}
                            placeholder={`O que você fez sobre a Regra ${r.num} nesta sessão?`}
                            value={(fiveRules as any)[r.key]}
                            onChange={e => setFiveRules({ ...fiveRules, [r.key]: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>
                  </PanelCard>
                )}

                {/* Session Notes */}
                {activeSub === 'session_notes' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-3">
                    <PanelCard title="Nota de Sessão">
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input label="Data" type="date" value={newNote.date} onChange={e => setNewNote({ ...newNote, date: e.target.value })} />
                          <Input label="Qualidade Relação (1-10)" type="number" min="1" max="10" value={newNote.relationship_quality} onChange={e => setNewNote({ ...newNote, relationship_quality: Number(e.target.value) })} />
                        </div>
                        {[
                          { field: 'observation', label: 'Observação Geral da Sessão', ph: 'O que aconteceu de mais relevante?' },
                          { field: 'patient_emotion', label: 'Estado Emocional do Paciente', ph: 'Ex: Ansioso, aberto, defensivo...' },
                          { field: 'therapist_reaction', label: 'Sua Reação como Terapeuta (Regra 4)', ph: 'O que você sentiu? Como respondeu?' },
                        ].map(f => (
                          <Textarea key={f.field} label={f.label} rows={3}
                            placeholder={f.ph} value={(newNote as any)[f.field]} onChange={e => setNewNote({ ...newNote, [f.field]: e.target.value })} />
                        ))}
                        <Button variant="primary" fullWidth loading={saving} iconLeft={<Plus size={14} />} onClick={addNote}>Registrar Sessão</Button>
                      </div>
                    </PanelCard>

                    <div className="min-w-0 space-y-3">
                      {sessionNotes.length === 0 ? (
                        <ContentCard><EmptyState icon={MessageSquare} title="Nenhuma nota registrada." /></ContentCard>
                      ) : sessionNotes.map(n => (
                        <ContentCard key={n.id}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge color="default">{n.date ? new Date(n.date).toLocaleDateString() : ''}</Badge>
                              <Badge color={n.relationship_quality >= 7 ? 'success' : 'warning'}>Relação: {n.relationship_quality}/10</Badge>
                            </div>
                            <IconButton variant="ghost" size="sm" aria-label="Remover nota" title="Remover nota" className="hover:text-red-600" onClick={() => removeNote(n.id)}>
                              <Trash2 size={14} />
                            </IconButton>
                          </div>
                          <p className="text-[13px] font-medium text-slate-800 mb-2 break-words">{n.observation}</p>
                          {n.patient_emotion && <p className="text-xs text-slate-500 mb-1"><span className="font-medium text-slate-700">Estado: </span>{n.patient_emotion}</p>}
                          {n.therapist_reaction && <p className="text-xs text-slate-500 italic"><span className="font-medium text-slate-700">Reação: </span>"{n.therapist_reaction}"</p>}
                        </ContentCard>
                      ))}
                    </div>
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
