/**
 * Conceituação de caso (modelo anterior da Terapia do Esquema, preservado): esquemas ativos, modos com
 * intensidade e ressignificação imagética. Usa as mesmas rotas e o mesmo formato de dados de antes
 * (/clinical-tools/:paciente/schema/latest | snapshot | imagery), então registros antigos continuam acessíveis.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Camera, Ghost, Heart, Puzzle, RefreshCcw, Save, Shield, Sparkles, User } from 'lucide-react';
import { api } from '../../../services/api';
import { PanelCard } from '../../../components/UI/PanelCard';
import { ContentCard } from '../../../components/UI/PageWrapper';
import { Tabs } from '../../../components/UI/Tabs';
import { Button, IconButton } from '../../../components/UI/Button';
import { Textarea } from '../../../components/UI/Input';
import { Badge } from '../../../components/UI/Badge';
import { Alert } from '../../../components/UI/Alert';
import { EmptyState } from '../../../components/UI/EmptyState';
import { ConfirmModal } from '../../../components/UI/Modal';
import type { SchemaMode, ImageryRescripting } from '../../../types';
import type { SchemaApplication } from './api';
import { scoreInstrument, type ScaleScore } from './scoring';

export const SCHEMA_LIBRARY = [
  'Abandono / Instabilidade', 'Desconfiança / Abuso', 'Privação Emocional', 'Defectividade / Vergonha',
  'Isolamento Social', 'Dependência / Incompetência', 'Vulnerabilidade ao Dano', 'Emaranhamento',
  'Fracasso', 'Arrogo / Grandiosidade', 'Autocontrole Insuficiente', 'Subjugação', 'Auto-sacrifício',
  'Busca de Aprovação', 'Negativismo / Pessimismo', 'Inibição Emocional', 'Padrões Inflexíveis', 'Punição',
];

/** Esquema do inventário (id) -> nome usado na biblioteca da conceituação. */
const LIBRARY_BY_SCHEMA: Record<string, string> = {
  privacao: 'Privação Emocional', abandono: 'Abandono / Instabilidade', desconfianca: 'Desconfiança / Abuso', isolamento: 'Isolamento Social',
  defectividade: 'Defectividade / Vergonha', fracasso: 'Fracasso', dependencia: 'Dependência / Incompetência', vulnerabilidade: 'Vulnerabilidade ao Dano',
  emaranhamento: 'Emaranhamento', subjugacao: 'Subjugação', autosacrificio: 'Auto-sacrifício', inibicao: 'Inibição Emocional',
  padroes: 'Padrões Inflexíveis', arrogo: 'Arrogo / Grandiosidade', autocontrole: 'Autocontrole Insuficiente', busca: 'Busca de Aprovação',
  negativismo: 'Negativismo / Pessimismo', punitiva: 'Punição',
};
/** Modo do YAMI (id) -> modo da conceituação (id). Pais Exigentes não tem correspondente no YAMI. */
const MODE_BY_YAMI: Record<string, string> = {
  crianca_vulneravel: 'mv', crianca_zangada: 'mz', crianca_impulsiva: 'mi', crianca_satisfeita: 'mf',
  pai_punitivo: 'pp', protetor_desligado: 'pd', hipercompensador: 'sc', adulto_feliz: 'as',
};

export const DEFAULT_MODES: SchemaMode[] = [
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
    case 'child': return { cls: 'bg-rose-50 text-rose-600 ring-rose-100', icon: <Ghost size={10} /> };
    case 'parent': return { cls: 'bg-slate-50 text-slate-600 ring-slate-100', icon: <User size={10} /> };
    case 'coping': return { cls: 'bg-amber-50 text-amber-600 ring-amber-100', icon: <Shield size={10} /> };
    case 'healthy': return { cls: 'bg-emerald-50 text-emerald-600 ring-emerald-100', icon: <Heart size={10} /> };
    default: return { cls: 'bg-slate-50', icon: null };
  }
};

/* ───────────── Estado carregado (compartilhado com a Visão geral) ───────────── */
export interface ConceptState {
  loading: boolean;
  activeSchemas: string[];
  setActiveSchemas: React.Dispatch<React.SetStateAction<string[]>>;
  modes: SchemaMode[];
  setModes: React.Dispatch<React.SetStateAction<SchemaMode[]>>;
  imagery: ImageryRescripting[];
  setImagery: React.Dispatch<React.SetStateAction<ImageryRescripting[]>>;
  updatedAt: string | null;
  reload: () => Promise<void>;
}

export function useConcept(patientId: string | null): ConceptState {
  const [loading, setLoading] = useState(false);
  const [activeSchemas, setActiveSchemas] = useState<string[]>([]);
  const [modes, setModes] = useState<SchemaMode[]>(DEFAULT_MODES);
  const [imagery, setImagery] = useState<ImageryRescripting[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const resp = await api.get<any>(`/clinical-tools/${patientId}/schema/latest`);
      setActiveSchemas(Array.isArray(resp?.active_schemas) ? resp.active_schemas : []);
      setModes(Array.isArray(resp?.modes) && resp.modes.length > 0 ? resp.modes : DEFAULT_MODES);
      setUpdatedAt(resp?.updated_at || null);
      const imgResp = await api.get<any>(`/clinical-tools/${patientId}/schema/imagery`);
      setImagery(Array.isArray(imgResp?.data) ? imgResp.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    setActiveSchemas([]); setModes(DEFAULT_MODES); setImagery([]); setUpdatedAt(null);
    if (patientId) void reload();
  }, [patientId, reload]);

  return { loading, activeSchemas, setActiveSchemas, modes, setModes, imagery, setImagery, updatedAt, reload };
}

type ConceptSub = 'modes' | 'imagery';
const conceptTabs = [
  { id: 'modes', label: 'Esquemas & Modos', icon: Puzzle },
  { id: 'imagery', label: 'Ressignificação', icon: Camera },
] as const;

interface Props {
  patientId: string;
  state: ConceptState;
  initialSub?: ConceptSub;
  /** Último YSQ / YAMI concluídos, para sugerir esquemas ativos e intensidade dos modos. */
  latestYsq?: SchemaApplication;
  latestYami?: SchemaApplication;
}

export const Conceptualization: React.FC<Props> = ({ patientId, state, initialSub = 'modes', latestYsq, latestYami }) => {
  const { activeSchemas, setActiveSchemas, modes, setModes, imagery, setImagery, reload } = state;
  const [sub, setSub] = useState<ConceptSub>(initialSub);
  const [saving, setSaving] = useState(false);
  const [newImagery, setNewImagery] = useState<Partial<ImageryRescripting>>({ emotionBefore: 5, emotionAfter: 2 });
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleToggleSchema = (name: string) => {
    setActiveSchemas(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
  };
  const handleUpdateMode = (id: string, patch: Partial<SchemaMode>) => {
    setModes(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  const handleSaveSchemaState = async () => {
    setSaving(true);
    try {
      await api.post(`/clinical-tools/${patientId}/schema/snapshot`, { active_schemas: activeSchemas, modes });
      await reload();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveImagery = async () => {
    if (!newImagery.originalScene) return;
    setSaving(true);
    try {
      const newList = [...imagery, { id: Date.now().toString(), ...newImagery, createdAt: new Date().toISOString() } as ImageryRescripting];
      await api.put(`/clinical-tools/${patientId}/schema/imagery`, { data: newList });
      setNewImagery({ emotionBefore: 5, emotionAfter: 2 });
      setImagery(newList);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveImagery = async () => {
    if (!removeId) return;
    const newList = imagery.filter(it => it.id !== removeId);
    try {
      await api.put(`/clinical-tools/${patientId}/schema/imagery`, { data: newList });
      setImagery(newList);
    } catch (e) { console.error(e); }
    setRemoveId(null);
  };

  /* Sugestões a partir dos inventários: só preenchem a tela; nada é gravado até "Salvar Estado". */
  const ysqScore = useMemo(() => (latestYsq ? scoreInstrument('ysq', latestYsq.answers) as ScaleScore : null), [latestYsq]);
  const yamiScore = useMemo(() => (latestYami ? scoreInstrument('yami', latestYami.answers) as ScaleScore : null), [latestYami]);
  const suggestSchemas = () => {
    if (!ysqScore) return;
    const names = ysqScore.subscales.filter(s => s.activated).map(s => LIBRARY_BY_SCHEMA[s.id]).filter(Boolean);
    setActiveSchemas(prev => Array.from(new Set([...prev, ...names])));
    setNotice(`${names.length} esquema(s) ativado(s) no YSQ foram marcados. Revise e clique em "Salvar Estado".`);
  };
  const suggestModes = () => {
    if (!yamiScore) return;
    setModes(prev => prev.map(m => {
      const yid = Object.keys(MODE_BY_YAMI).find(k => MODE_BY_YAMI[k] === m.id);
      const mean = yid ? yamiScore.subscales.find(s => s.id === yid)?.mean : null;
      return mean == null ? m : { ...m, intensity: Math.round(((mean - 1) / 5) * 10) };
    }));
    setNotice('Intensidades dos modos preenchidas a partir da frequência média do YAMI (escala 0 a 10). Ative os modos que fizerem sentido clínico e clique em "Salvar Estado".');
  };

  return (
    <Tabs<ConceptSub> items={conceptTabs} value={sub} onChange={setSub} label="Seções da conceituação">
      {sub === 'modes' && (
        <div className="space-y-3">
          {(ysqScore || yamiScore) && (
            <Alert variant="info" title="Preencher a partir dos inventários"
              action={<>
                {ysqScore && <Button size="xs" variant="outline" iconLeft={<Sparkles size={14} />} onClick={suggestSchemas}>Marcar esquemas ativados do YSQ</Button>}
                {yamiScore && <Button size="xs" variant="outline" iconLeft={<Sparkles size={14} />} onClick={suggestModes}>Preencher intensidade dos modos (YAMI)</Button>}
              </>}>
              Usa o último inventário concluído como apoio; a decisão clínica e o salvamento continuam com você.
            </Alert>
          )}
          {notice && <Alert variant="success">{notice}</Alert>}
          <PanelCard
            title="Esquemas Ativos"
            icon={Puzzle}
            action={<Button variant="primary" size="sm" onClick={handleSaveSchemaState} loading={saving} iconLeft={<Save size={14} />}>Salvar Estado</Button>}
          >
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
              {SCHEMA_LIBRARY.map(s => {
                const on = activeSchemas.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() => handleToggleSchema(s)}
                    className={`min-h-[36px] rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${on ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-primary-200 hover:bg-white'}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </PanelCard>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {modes.map(mode => {
              const badge = groupBadge(mode.group);
              return (
                <ContentCard key={mode.id} className={`relative ${mode.active ? 'ring-1 ring-primary-500' : ''}`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${badge.cls}`}>{badge.icon}</div>
                        <h4 className="truncate text-sm font-medium text-slate-800">{mode.name}</h4>
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
                        <span className="text-base font-medium text-slate-800">{mode.intensity || 0}/10</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        aria-label={`Intensidade do modo ${mode.name}`}
                        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-100 accent-primary-600"
                        value={mode.intensity || 0}
                        onChange={e => handleUpdateMode(mode.id, { intensity: parseInt(e.target.value) })}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative h-1 overflow-hidden rounded-full bg-slate-100"><div className="absolute left-0 top-0 h-full bg-rose-500" style={{ width: `${((mode.intensity || 0) / 10) * 100}%` }} /></div>
                        <div className="relative h-1 overflow-hidden rounded-full bg-slate-100"><div className="absolute right-0 top-0 h-full bg-emerald-500" style={{ width: `${((10 - (mode.intensity || 0)) / 10) * 100}%` }} /></div>
                      </div>
                    </div>
                  </div>
                </ContentCard>
              );
            })}
          </div>
        </div>
      )}

      {sub === 'imagery' && (
        <div className="space-y-3">
          <PanelCard title="Ressignificação Imagética" description="Transforme cenas traumáticas ou gatilhos através da intervenção na cena imaginada." icon={Camera}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Textarea
                label="Cena Original (Gatilho)"
                rows={4}
                placeholder="Descreva a cena como ela ocorre..."
                value={newImagery.originalScene || ''}
                onChange={e => setNewImagery({ ...newImagery, originalScene: e.target.value })}
              />
              <Textarea
                label="Cena Ressignificada"
                rows={4}
                placeholder="O Adulto Saudável intervém e..."
                value={newImagery.rescriptedScene || ''}
                onChange={e => setNewImagery({ ...newImagery, rescriptedScene: e.target.value })}
              />
            </div>
            <div className="mt-3 flex justify-end">
              <Button variant="primary" onClick={handleSaveImagery} loading={saving}>Gravar Ressignificação</Button>
            </div>
          </PanelCard>

          <PanelCard title="Linha do Tempo de Ressignificação" icon={Activity}>
            {imagery.length === 0 ? (
              <EmptyState icon={Camera} title="Nenhuma ressignificação imagética documentada." />
            ) : (
              <div className="space-y-3">
                {imagery.slice().reverse().map(img => (
                  <div key={img.id} className="space-y-3 rounded-lg border border-slate-200 p-3">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Badge color="default" size="sm">1</Badge>
                          <span className="text-xs font-medium text-slate-600">A Cena Imutável</span>
                        </div>
                        <p className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs italic text-slate-600">"{img.originalScene}"</p>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Badge color="primary" size="sm">2</Badge>
                          <span className="text-xs font-medium text-primary-700">O Poder de Mudar</span>
                        </div>
                        <p className="rounded-lg border border-primary-100 bg-primary-50/40 p-3 text-xs font-medium text-slate-800">"{img.rescriptedScene}"</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                      <span>Data da Sessão: {new Date(img.createdAt || '').toLocaleDateString()}</span>
                      <Button variant="ghost" size="xs" className="text-red-600 hover:text-red-700" onClick={() => setRemoveId(img.id)}>Remover Registro</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>
          <ConfirmModal isOpen={!!removeId} onClose={() => setRemoveId(null)} onConfirm={handleRemoveImagery} title="Remover este registro?"
            message="A ressignificação será removida da linha do tempo. Esta ação não pode ser desfeita." confirmLabel="Remover registro" />
        </div>
      )}
    </Tabs>
  );
};
