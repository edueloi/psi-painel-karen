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
import { Patient, SchemaMode, ImageryRescripting } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { 
  Puzzle, Plus, Trash2, Edit3, Save, RotateCcw, RefreshCcw, 
  Layers, Ghost, Heart, Shield, Activity, Sparkles, AlertTriangle, 
  CheckCircle2, ArrowRight, PenLine, ChevronRight, X, Loader2, Camera, User,
  BrainCircuit, ClipboardList
} from 'lucide-react';

const SCHEMA_LIBRARY = [
  'Abandono / Instabilidade', 'Desconfiança / Abuso', 'Privação Emocional', 'Defectividade / Vergonha',
  'Isolamento Social', 'Dependência / Incompetência', 'Vulnerabilidade ao Dano', 'Emaranhamento',
  'Fracasso', 'Arrogo / Grandiosidade', 'Autocontrole Insuficiente', 'Subjugação', 'Auto-sacrifício',
  'Busca de Aprovação', 'Negativismo / Pessimismo', 'Inibição Emocional', 'Padrões Inflexíveis', 'Punição'
];

const DEFAULT_MODES: SchemaMode[] = [
  { id: 'mv', name: 'Criança Vulnerável', group: 'child', active: false, intensity: 5 },
  { id: 'mz', name: 'Criança Zangada', group: 'child', active: false, intensity: 5 },
  { id: 'mi', name: 'Criança Impulsiva', group: 'child', active: false, intensity: 5 },
  { id: 'mf', name: 'Criança Feliz', group: 'child', active: false, intensity: 5 },
  { id: 'pp', name: 'Pais Punitivos', group: 'parent', active: false, intensity: 5 },
  { id: 'pe', name: 'Pais Exigentes', group: 'parent', active: false, intensity: 5 },
  { id: 'pd', name: 'Protetor Desligado', group: 'coping', active: false, intensity: 5 },
  { id: 'sc', name: 'Supercompensador', group: 'coping', active: false, intensity: 5 },
  { id: 'as', name: 'Adulto Saudável', group: 'healthy', active: false, intensity: 5 },
];

const groupBadge = (g: SchemaMode['group']) => {
  switch (g) {
    case 'child': return { cls: 'bg-rose-50 text-rose-600 ring-rose-100', icon: <Ghost size={10}/> };
    case 'parent': return { cls: 'bg-slate-50 text-slate-600 ring-slate-100', icon: <User size={10}/> };
    case 'coping': return { cls: 'bg-amber-50 text-amber-600 ring-amber-100', icon: <Shield size={10}/> };
    case 'healthy': return { cls: 'bg-emerald-50 text-emerald-600 ring-emerald-100', icon: <Heart size={10}/> };
    default: return { cls: 'bg-slate-50', icon: null };
  }
};

type SchemaTab = 'modes' | 'imagery';

const schemaTabs = [
  { id: 'modes', label: 'Esquemas & Modos', icon: Puzzle },
  { id: 'imagery', label: 'Ressignificação', icon: Camera },
] as const;

export const SchemaPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<SchemaTab>('modes');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tools State
  const [activeSchemas, setActiveSchemas] = useState<string[]>([]);
  const [modes, setModes] = useState<SchemaMode[]>(DEFAULT_MODES);
  const [imagery, setImagery] = useState<ImageryRescripting[]>([]);

  // Form States
  const [newImagery, setNewImagery] = useState<Partial<ImageryRescripting>>({ emotionBefore: 5, emotionAfter: 2 });

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

  const loadSchemaData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const resp = await api.get<any>(`/clinical-tools/${patientId}/schema/latest`);
      setActiveSchemas(Array.isArray(resp?.active_schemas) ? resp.active_schemas : []);
      if (Array.isArray(resp?.modes) && resp.modes.length > 0) {
        setModes(resp.modes);
      } else {
        setModes(DEFAULT_MODES);
      }

      // Load imagery tool
      const imgResp = await api.get<any>(`/clinical-tools/${patientId}/schema/imagery`);
      setImagery(Array.isArray(imgResp?.data) ? imgResp.data : []);
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
    if (tab === 'imagery') setActiveSub('imagery');
  }, [searchParams]);

  useEffect(() => {
    if (selectedPatientId) loadSchemaData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleToggleSchema = (name: string) => {
    setActiveSchemas(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
  };

  const handleUpdateMode = (id: string, patch: Partial<SchemaMode>) => {
    setModes(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  const handleSaveSchemaState = async () => {
    if (!selectedPatientId) return;
    setSaving(true);
    try {
      await api.post(`/clinical-tools/${selectedPatientId}/schema/snapshot`, {
        active_schemas: activeSchemas,
        modes: modes
      });
      loadSchemaData(selectedPatientId);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveImagery = async () => {
    if (!selectedPatientId || !newImagery.originalScene) return;
    setSaving(true);
    try {
      const newList = [...imagery, { id: Date.now().toString(), ...newImagery, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/schema/imagery`, { data: newList });
      setNewImagery({ emotionBefore: 5, emotionAfter: 2 });
      setImagery(newList);
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
          icon={Layers}
          title="Terapia do Esquema"
          description={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Conceitualização Clínica & Modos"}
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
                    icon={Layers}
                    title="Conceitualização Clínica do Esquema"
                    description="Selecione um paciente para iniciar o mapeamento. Identifique esquemas desadaptativos, monitore a flutuação de modos e intervenha em traumas através da imagética."
                  />
                </ContentCard>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {[
                    { title: 'Esquemas Iniciais', desc: 'Mapeamento de padrões desadaptativos precoces.', icon: <Puzzle size={14} /> },
                    { title: 'Trabalho com Modos', desc: 'Identificação e gestão de estados emocionais.', icon: <Activity size={14} /> },
                    { title: 'Imagética', desc: 'Ressignificação de cenas traumáticas na cena.', icon: <Camera size={14} /> }
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
              <Tabs<SchemaTab> items={schemaTabs} value={activeSub} onChange={setActiveSub} label="Seções da Terapia do Esquema">
                {activeSub === 'modes' && (
                  <div className="space-y-3">
                    <PanelCard
                      title="Esquemas Ativos"
                      icon={Puzzle}
                      action={
                        <Button variant="primary" size="sm" onClick={handleSaveSchemaState} loading={saving} iconLeft={<Save size={14} />}>
                          Salvar Estado
                        </Button>
                      }
                    >
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                        {SCHEMA_LIBRARY.map(s => {
                          const on = activeSchemas.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              aria-pressed={on}
                              onClick={() => handleToggleSchema(s)}
                              className={`px-3 py-2 min-h-[36px] rounded-lg text-xs font-medium text-left transition-colors border ${on ? 'bg-primary-600 text-white border-primary-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white hover:border-primary-200'}`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </PanelCard>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {modes.map(mode => {
                        const badge = groupBadge(mode.group);
                        return (
                          <ContentCard key={mode.id} className={`relative ${mode.active ? 'ring-1 ring-primary-500' : ''}`}>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${badge.cls}`}>
                                    {badge.icon}
                                  </div>
                                  <h4 className="font-medium text-slate-800 text-sm truncate">{mode.name}</h4>
                                  {!mode.active && <Badge color="default" size="sm">Modo Inativo</Badge>}
                                </div>
                                <IconButton
                                  variant={mode.active ? 'primary' : 'outline'}
                                  size="sm"
                                  aria-label={mode.active ? 'Desativar modo' : 'Ativar modo'}
                                  title={mode.active ? 'Desativar modo' : 'Ativar modo'}
                                  onClick={() => handleUpdateMode(mode.id, { active: !mode.active })}
                                >
                                  <RefreshCcw size={14} />
                                </IconButton>
                              </div>

                              <div className={`space-y-2 transition-opacity ${mode.active ? 'opacity-100' : 'opacity-50'}`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-slate-600">Intensidade do Modo</span>
                                  <span className="font-medium text-slate-800 text-base">{mode.intensity || 0}/10</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="10"
                                  aria-label={`Intensidade do modo ${mode.name}`}
                                  className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-primary-600"
                                  value={mode.intensity || 0}
                                  onChange={e => handleUpdateMode(mode.id, { intensity: parseInt(e.target.value) })}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="h-1 bg-slate-100 rounded-full relative overflow-hidden"><div className="absolute top-0 left-0 h-full bg-rose-500" style={{ width: `${(mode.intensity / 10) * 100}%` }} /></div>
                                  <div className="h-1 bg-slate-100 rounded-full relative overflow-hidden"><div className="absolute top-0 right-0 h-full bg-emerald-500" style={{ width: `${((10 - mode.intensity) / 10) * 100}%` }} /></div>
                                </div>
                              </div>
                            </div>
                          </ContentCard>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeSub === 'imagery' && (
                  <div className="space-y-3">
                    <PanelCard title="Ressignificação Imagética" description="Transforme cenas traumáticas ou gatilhos através da intervenção na cena imaginada." icon={Camera}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Textarea
                          label="Cena Original (Gatilho)"
                          rows={4}
                          placeholder="Descreva a cena como ela ocorre..."
                          value={newImagery.originalScene}
                          onChange={e => setNewImagery({ ...newImagery, originalScene: e.target.value })}
                        />
                        <Textarea
                          label="Cena Ressignificada"
                          rows={4}
                          placeholder="O Adulto Saudável intervém e..."
                          value={newImagery.rescriptedScene}
                          onChange={e => setNewImagery({ ...newImagery, rescriptedScene: e.target.value })}
                        />
                      </div>
                      <div className="flex justify-end mt-3">
                        <Button variant="primary" onClick={handleSaveImagery}>
                          Gravar Ressignificação
                        </Button>
                      </div>
                    </PanelCard>

                    <PanelCard title="Linha do Tempo de Ressignificação" icon={Activity}>
                      {imagery.length === 0 ? (
                        <EmptyState icon={Camera} title="Nenhuma ressignificação imagética documentada." />
                      ) : (
                        <div className="space-y-3">
                          {imagery.slice().reverse().map(img => (
                            <div key={img.id} className="rounded-lg border border-slate-200 p-3 space-y-3">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <Badge color="default" size="sm">1</Badge>
                                    <span className="text-xs font-medium text-slate-600">A Cena Imutável</span>
                                  </div>
                                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">"{img.originalScene}"</p>
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <Badge color="primary" size="sm">2</Badge>
                                    <span className="text-xs font-medium text-primary-700">O Poder de Mudar</span>
                                  </div>
                                  <p className="text-xs font-medium text-slate-800 bg-primary-50/40 p-3 rounded-lg border border-primary-100">"{img.rescriptedScene}"</p>
                                </div>
                              </div>
                              <div className="pt-3 border-t border-slate-100 flex flex-wrap justify-between items-center gap-2 text-[11px] text-slate-500">
                                <span>Data da Sessão: {new Date(img.createdAt || "").toLocaleDateString()}</span>
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={async () => {
                                    const newList = imagery.filter(it => it.id !== img.id);
                                    await api.put(`/clinical-tools/${selectedPatientId}/schema/imagery`, { data: newList });
                                    setImagery(newList);
                                  }}
                                >
                                  Remover Registro
                                </Button>
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
