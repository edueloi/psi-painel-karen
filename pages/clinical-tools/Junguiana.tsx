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
import { Feather, Trash2, Moon, Star, ArrowLeft } from 'lucide-react';

type JungTab = 'dreams' | 'symbols';

const jungTabs = [
  { id: 'dreams', label: 'Sonhos', icon: Moon },
  { id: 'symbols', label: 'Símbolos', icon: Star },
] as const;

export const JunguianaPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<JungTab>('dreams');

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Jungian Specific State
  const [dreams, setDreams] = useState<any[]>([]);
  const [symbols, setSymbols] = useState<any[]>([]);

  const [newDream, setNewDream] = useState({ title: '', content: '', symbols: '', interpretation: '' });
  const [newSymbol, setNewSymbol] = useState({ name: '', meaning: '', personalConnection: '' });

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

  const loadJunguianaData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/clinical-tools/${patientId}/junguiana`);
      setDreams(Array.isArray(data?.dreams) ? data.dreams : []);
      setSymbols(Array.isArray(data?.symbols) ? data.symbols : []);
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
    if (selectedPatientId) loadJunguianaData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleSaveDream = async () => {
    if (!selectedPatientId || !newDream.content) return;
    setSaving(true);
    try {
      const updatedDreams = [...dreams, { id: Date.now().toString(), ...newDream, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/junguiana`, { dreams: updatedDreams, symbols });
      setDreams(updatedDreams);
      setNewDream({ title: '', content: '', symbols: '', interpretation: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSymbol = async () => {
    if (!selectedPatientId || !newSymbol.name) return;
    setSaving(true);
    try {
      const updatedSymbols = [...symbols, { id: Date.now().toString(), ...newSymbol, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/junguiana`, { dreams, symbols: updatedSymbols });
      setSymbols(updatedSymbols);
      setNewSymbol({ name: '', meaning: '', personalConnection: '' });
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
          title="Psicologia Analítica (Jung)"
          description={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Símbolos, Sonhos & Individuação"}
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
                  icon={Feather}
                  title="Jungian Workspace"
                  description="Exploração dos símbolos do inconsciente e acompanhamento do processo de individuação."
                />
              </ContentCard>
            ) : (
              <Tabs<JungTab> items={jungTabs} value={activeSub} onChange={setActiveSub} label="Seções da psicologia analítica">
                {activeSub === 'dreams' && (
                  <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-3">
                    <PanelCard title="Registrar Sonho">
                      <div className="space-y-3">
                        <Input aria-label="Título do sonho" value={newDream.title} onChange={e => setNewDream({ ...newDream, title: e.target.value })} placeholder="Título do Sonho" />
                        <Textarea aria-label="Relato do sonho" rows={5} value={newDream.content} onChange={e => setNewDream({ ...newDream, content: e.target.value })} placeholder="Relato do Sonho..." />
                        <Textarea aria-label="Símbolos e imaginário" rows={4} value={newDream.symbols} onChange={e => setNewDream({ ...newDream, symbols: e.target.value })} placeholder="Símbolos e Imaginário..." />
                        <Button variant="primary" fullWidth onClick={handleSaveDream} loading={saving}>Sincronizar Inconsciente</Button>
                      </div>
                    </PanelCard>
                    <div className="space-y-3 min-w-0">
                      {dreams.map(d => (
                        <ContentCard key={d.id} className="group relative">
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <IconButton
                              variant="ghost"
                              size="sm"
                              aria-label="Excluir sonho"
                              title="Excluir sonho"
                              className="hover:text-red-600"
                              onClick={async () => {
                                const next = dreams.filter(it => it.id !== d.id);
                                await api.put(`/clinical-tools/${selectedPatientId}/junguiana`, { dreams: next, symbols });
                                setDreams(next);
                              }}
                            >
                              <Trash2 size={14} />
                            </IconButton>
                          </div>
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3 pr-8">
                              <div className="w-7 h-7 rounded-md border border-primary-100 bg-primary-50 text-primary-700 flex items-center justify-center shrink-0"><Moon size={14} /></div>
                              <h4 className="text-sm font-medium text-slate-800 italic break-words min-w-0">"{d.title || 'Sem título'}"</h4>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed break-words">{d.content}</p>
                            <div className="p-3 bg-primary-50/50 rounded-lg border border-primary-100">
                              <span className="text-[11px] font-medium text-primary-700 block mb-1">Simbolismo</span>
                              <p className="text-xs text-slate-700 leading-relaxed italic break-words">{d.symbols}</p>
                            </div>
                          </div>
                        </ContentCard>
                      ))}
                    </div>
                  </div>
                )}

                {activeSub === 'symbols' && (
                  <PanelCard title="Dicionário de Símbolos Pessoal" icon={Star}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-3">
                        <Input label="Símbolo / Arquétipo" value={newSymbol.name} onChange={e => setNewSymbol({ ...newSymbol, name: e.target.value })} placeholder="Ex: A Grande Mãe, Labirinto, Raposa..." />
                        <Textarea label="Significado / Conexão Pessoal" rows={4} value={newSymbol.meaning} onChange={e => setNewSymbol({ ...newSymbol, meaning: e.target.value })} placeholder="O que esse símbolo evoca ao paciente?" />
                        <Button variant="primary" fullWidth onClick={handleSaveSymbol} loading={saving}>Fixar Arquetipia</Button>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-slate-600">Simbolismos Mapeados</h4>
                        <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[300px]">
                          {symbols.map(s => (
                            <div key={s.id} className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                              <p className="text-[13px] font-medium text-slate-800 mb-1">{s.name}</p>
                              <p className="text-xs text-slate-600 leading-relaxed italic break-words">"{s.meaning}"</p>
                            </div>
                          ))}
                        </div>
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
