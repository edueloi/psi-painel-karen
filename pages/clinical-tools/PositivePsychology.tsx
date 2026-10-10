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
import { Star, Plus, Trash2, Heart, Smile, Save, Loader2, SunMedium, BookOpen, ArrowLeft } from 'lucide-react';

const VIA_STRENGTHS = [
  'Criatividade', 'Curiosidade', 'Julgamento Crítico', 'Amor ao Aprendizado',
  'Perspectiva', 'Coragem / Bravura', 'Persistência', 'Integridade / Autenticidade',
  'Vitalidade / Entusiasmo', 'Amor / Capacidade de Amar', 'Gentileza', 'Inteligência Social',
  'Trabalho em Equipe', 'Equanimidade / Justiça', 'Liderança',
  'Perdão / Misericórdia', 'Humildade / Modéstia', 'Prudência',
  'Autorregulação', 'Apreciação da Beleza', 'Gratidão',
  'Esperança / Otimismo', 'Humor / Alegria', 'Espiritualidade / Propósito'
];

type PositiveTab = 'strengths' | 'gratitude' | 'wellbeing';

const positiveTabs = [
  { id: 'strengths', label: 'Forças VIA', icon: Star },
  { id: 'gratitude', label: 'Gratidão', icon: Heart },
  { id: 'wellbeing', label: 'PERMA', icon: SunMedium },
] as const;

export const PositivePsychologyPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<PositiveTab>('strengths');

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State
  const [strengths, setStrengths] = useState<any[]>([]);
  const [gratitudeEntries, setGratitudeEntries] = useState<any[]>([]);
  const [wellbeing, setWellbeing] = useState({
    positive_emotions: '', engagement: '', relationships: '', meaning: '', achievement: '',
    perma_notes: ''
  });

  const [newStrength, setNewStrength] = useState({ virtue: '', usage_context: '', growth_plan: '', frequency: 'Diário' });
  const [newGratitude, setNewGratitude] = useState({ date: new Date().toISOString().split('T')[0], entries: ['', '', ''], intensity: 8 });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const raw = await api.get<any[]>('/patients');
      setPatients((raw || []).map((p: any) => ({ ...p, full_name: p.name || p.full_name || '' })));
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const loadData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/clinical-tools/${patientId}/positivepsych`);
      setStrengths(Array.isArray(data?.strengths) ? data.strengths : []);
      setGratitudeEntries(Array.isArray(data?.gratitude_entries) ? data.gratitude_entries : []);
      setWellbeing(data?.wellbeing || { positive_emotions: '', engagement: '', relationships: '', meaning: '', achievement: '', perma_notes: '' });
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); const pid = searchParams.get('patient_id'); if (pid) setSelectedPatientId(pid); }, [searchParams]);
  useEffect(() => { if (selectedPatientId) loadData(selectedPatientId); }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const saveAll = async (patch: any) => {
    if (!selectedPatientId) return;
    setSaving(true);
    try {
      await api.put(`/clinical-tools/${selectedPatientId}/positivepsych`, {
        strengths: patch.strengths ?? strengths,
        gratitude_entries: patch.gratitude_entries ?? gratitudeEntries,
        wellbeing: patch.wellbeing ?? wellbeing,
      });
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const addStrength = () => {
    if (!newStrength.virtue) return;
    const upd = [...strengths, { id: Date.now().toString(), ...newStrength, mapped_at: new Date().toISOString() }];
    setStrengths(upd);
    setNewStrength({ virtue: '', usage_context: '', growth_plan: '', frequency: 'Diário' });
    saveAll({ strengths: upd });
  };

  const addGratitude = () => {
    if (!newGratitude.entries[0]) return;
    const upd = [...gratitudeEntries, { id: Date.now().toString(), ...newGratitude }];
    setGratitudeEntries(upd);
    setNewGratitude({ date: new Date().toISOString().split('T')[0], entries: ['', '', ''], intensity: 8 });
    saveAll({ gratitude_entries: upd });
  };

  const saveWellbeing = () => saveAll({ wellbeing });

  return (
    <PageWrapper>
      <div className="space-y-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/caixa-ferramentas')}>
            Voltar
          </Button>
        </div>

        <SectionTitle
          icon={Star}
          title="Psicologia Positiva"
          description={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Forças VIA · Diário de Gratidão · Modelo PERMA"}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
          <ClinicalSidebar patients={patients} selectedPatientId={selectedPatientId} onSelectPatient={setSelectedPatientId} patientSearch={patientSearch} setPatientSearch={setPatientSearch} isLoading={isLoading && patients.length === 0} t={t} />

          <div className="min-w-0 space-y-4">
            {!selectedPatient ? (
              <ContentCard>
                <EmptyState
                  icon={Star}
                  title="Psicologia Positiva"
                  description="Mapeie Forças VIA, pratique gratidão e monitore o florescimento com o modelo PERMA."
                />
              </ContentCard>
            ) : (
              <Tabs<PositiveTab> items={positiveTabs} value={activeSub} onChange={setActiveSub} label="Seções da psicologia positiva">
                {/* FORÇAS VIA */}
                {activeSub === 'strengths' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-3">
                    <PanelCard title="Mapear Força VIA">
                      <div className="space-y-3">
                        <Select label="Força / Virtude" value={newStrength.virtue} onChange={e => setNewStrength({ ...newStrength, virtue: e.target.value })}>
                          <option value="">Selecione...</option>
                          {VIA_STRENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                        <Textarea label="Em que contexto o paciente usa essa força?" rows={3}
                          placeholder="Ex: No trabalho quando ajuda colegas, em casa com os filhos..." value={newStrength.usage_context} onChange={e => setNewStrength({ ...newStrength, usage_context: e.target.value })} />
                        <Textarea label="Plano de expansão / uso criativo" rows={3}
                          placeholder="Como poderia usar mais essa força de forma nova?" value={newStrength.growth_plan} onChange={e => setNewStrength({ ...newStrength, growth_plan: e.target.value })} />
                        <Select label="Frequência de uso" value={newStrength.frequency} onChange={e => setNewStrength({ ...newStrength, frequency: e.target.value })}>
                          {['Raramente', 'Semanal', 'Diário', 'Múltiplas vezes ao dia'].map(f => <option key={f}>{f}</option>)}
                        </Select>
                        <Button variant="primary" fullWidth loading={saving} iconLeft={<Plus size={14} />} onClick={addStrength}>Mapear Força</Button>
                      </div>
                    </PanelCard>

                    <div className="min-w-0 space-y-3">
                      {strengths.length === 0 ? (
                        <ContentCard><EmptyState icon={Star} title="Nenhuma força mapeada." /></ContentCard>
                      ) : strengths.map(s => (
                        <ContentCard key={s.id}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-7 h-7 rounded-md border border-primary-100 bg-primary-50 text-primary-700 flex items-center justify-center shrink-0"><Star size={14} /></div>
                              <div className="min-w-0">
                                <h4 className="font-medium text-slate-800 text-sm break-words">{s.virtue}</h4>
                                <Badge color="default">{s.frequency}</Badge>
                              </div>
                            </div>
                            <IconButton variant="ghost" size="sm" aria-label="Remover força" title="Remover força" className="hover:text-red-600"
                              onClick={() => { const upd = strengths.filter(x => x.id !== s.id); setStrengths(upd); saveAll({ strengths: upd }); }}>
                              <Trash2 size={14} />
                            </IconButton>
                          </div>
                          {s.usage_context && <p className="text-xs text-slate-600 mb-1"><span className="font-medium text-slate-800">Como usa: </span>{s.usage_context}</p>}
                          {s.growth_plan && <p className="text-xs text-primary-700 italic"><span className="font-medium">Plano: </span>{s.growth_plan}</p>}
                        </ContentCard>
                      ))}
                    </div>
                  </div>
                )}

                {/* GRATIDÃO */}
                {activeSub === 'gratitude' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-3">
                    <PanelCard title="Diário de Gratidão">
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input label="Data" type="date" value={newGratitude.date} onChange={e => setNewGratitude({ ...newGratitude, date: e.target.value })} />
                          <Input label="Intensidade (1-10)" type="number" min="1" max="10" value={newGratitude.intensity} onChange={e => setNewGratitude({ ...newGratitude, intensity: Number(e.target.value) })} />
                        </div>
                        {newGratitude.entries.map((entry, idx) => (
                          <Input key={idx} label={`Gratidão #${idx + 1}`}
                            placeholder={`Sou grato(a) por...`}
                            value={entry}
                            onChange={e => { const upd = [...newGratitude.entries]; upd[idx] = e.target.value; setNewGratitude({ ...newGratitude, entries: upd }); }}
                          />
                        ))}
                        <Button variant="primary" fullWidth loading={saving} iconLeft={<Heart size={14} />} onClick={addGratitude}>Registrar Gratidão</Button>
                      </div>
                    </PanelCard>

                    <div className="min-w-0 space-y-3">
                      {gratitudeEntries.length === 0 ? (
                        <ContentCard><EmptyState icon={Heart} title="Nenhum registro de gratidão ainda." /></ContentCard>
                      ) : gratitudeEntries.map(g => (
                        <ContentCard key={g.id}>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge color="default">{g.date ? new Date(g.date).toLocaleDateString() : ''}</Badge>
                              <Badge color="primary">Intensidade: {g.intensity}/10</Badge>
                            </div>
                            <IconButton variant="ghost" size="sm" aria-label="Remover registro" title="Remover registro" className="hover:text-red-600"
                              onClick={() => { const upd = gratitudeEntries.filter(x => x.id !== g.id); setGratitudeEntries(upd); saveAll({ gratitude_entries: upd }); }}>
                              <Trash2 size={14} />
                            </IconButton>
                          </div>
                          <ul className="space-y-1">
                            {(g.entries || []).filter((e: string) => e).map((e: string, idx: number) => (
                              <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                                <span className="text-primary-600 font-medium">#{idx + 1}</span> {e}
                              </li>
                            ))}
                          </ul>
                        </ContentCard>
                      ))}
                    </div>
                  </div>
                )}

                {/* PERMA */}
                {activeSub === 'wellbeing' && (
                  <PanelCard
                    title="Modelo PERMA"
                    description="Mapeie os 5 pilares do florescimento de Seligman"
                    icon={SunMedium}
                    action={
                      <Button variant="primary" size="sm" loading={saving} iconLeft={<Save size={14} />} onClick={saveWellbeing}>Salvar PERMA</Button>
                    }
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {[
                        { key: 'positive_emotions', label: 'P — Emoções Positivas', desc: 'Sentimentos de alegria, amor, esperança, gratidão...' },
                        { key: 'engagement', label: 'E — Engajamento / Flow', desc: 'Atividades que causam imersão total, time flies...' },
                        { key: 'relationships', label: 'R — Relacionamentos', desc: 'Conexões positivas e suporte social...' },
                        { key: 'meaning', label: 'M — Sentido e Propósito', desc: 'Pertencer a algo maior, valores, missão de vida...' },
                        { key: 'achievement', label: 'A — Conquistas / Realização', desc: 'Metas alcançadas, progresso, autodeterminação...' },
                      ].map(p => (
                        <div key={p.key} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3">
                          <div>
                            <h4 className="font-medium text-slate-800 text-sm">{p.label}</h4>
                            <p className="text-[11px] text-slate-500 mt-1">{p.desc}</p>
                          </div>
                          <Textarea
                            aria-label={p.label}
                            rows={5}
                            placeholder="Como está esse pilar para o paciente?"
                            value={(wellbeing as any)[p.key]}
                            onChange={e => setWellbeing({ ...wellbeing, [p.key]: e.target.value })}
                          />
                        </div>
                      ))}
                      <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3 md:col-span-2 xl:col-span-1">
                        <h4 className="font-medium text-slate-800 text-sm flex items-center gap-2"><BookOpen size={14} className="text-slate-500" /> Notas Gerais PERMA</h4>
                        <Textarea
                          aria-label="Notas gerais PERMA"
                          rows={6}
                          placeholder="Observações gerais, áreas de intervenção prioritária..."
                          value={wellbeing.perma_notes}
                          onChange={e => setWellbeing({ ...wellbeing, perma_notes: e.target.value })}
                        />
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
