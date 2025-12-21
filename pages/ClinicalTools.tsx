import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { Patient, RPDRecord } from '../types';
import {
  Boxes,
  BrainCircuit,
  LayoutGrid,
  Feather,
  Search,
  Loader2,
  Plus,
  Trash2,
  Edit3,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Moon,
  PenLine,
  ScanSearch,
  RefreshCcw,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSearchParams } from 'react-router-dom';

type ToolTab = 'tcc' | 'schema' | 'psycho';
type TccSubTab = 'rpd' | 'cards';
type SchemaSubTab = 'schemas' | 'modes';
type PsychoSubTab = 'dreams' | 'free' | 'signifiers';

type CopingCard = { id: string; front: string; back: string; createdAt: string };
type DreamRecord = { id: string; title: string; manifest: string; latent: string; createdAt: string };
type Signifier = { id: string; term: string; createdAt: string };

type SchemaMode = {
  id: string;
  name: string;
  group: 'child' | 'parent' | 'coping' | 'healthy';
  active: boolean;
  intensity: number; // 0..10
};

const toIso = (v?: any) => {
  if (!v) return new Date().toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** -------------------- API TYPES (map do backend) -------------------- */
type ApiTccRPD = {
  id: number | string;
  situation: string;
  thought: string;
  emotion?: string;
  intensity?: number;
  created_at?: string;
  date?: string;
};

type ApiTccCard = {
  id: number | string;
  front: string;
  back: string;
  created_at?: string;
  createdAt?: string;
};

type ApiSchemaLatest = {
  id?: number | string;
  active_schemas?: any; // JSON
  modes?: any; // JSON
  created_at?: string;
};

type ApiPsychoDream = {
  id: number | string;
  title?: string;
  manifest?: string;
  latent?: string;
  created_at?: string;
};

type ApiPsychoSignifier = {
  id: number | string;
  term: string;
  created_at?: string;
};

type ApiPsychoGet = {
  dreams?: ApiPsychoDream[];
  freeText?: string;
  signifiers?: ApiPsychoSignifier[];
};

/** -------------------- UI HELPERS -------------------- */
const StatusBadge: React.FC<{ status?: string; t: (k: string) => string }> = ({ status, t }) => {
  const v = (status || '').toLowerCase();
  const isActive = v === 'ativo' || v === 'active';
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide border',
        isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200',
      ].join(' ')}
    >
      <span className={['h-2 w-2 rounded-full', isActive ? 'bg-emerald-500' : 'bg-slate-400'].join(' ')} />
      {isActive ? t('patients.status.active') : t('patients.status.inactive')}
    </span>
  );
};

const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, icon, right, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-extrabold text-slate-900">{title}</h3>
        </div>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const EmptyDashed: React.FC<{ text: string; icon?: React.ReactNode }> = ({ text, icon }) => (
  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/40 min-h-[170px] flex items-center justify-center text-slate-400">
    <div className="flex flex-col items-center gap-2 text-center px-6">
      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
        {icon}
      </div>
      <div className="text-sm font-bold">{text}</div>
    </div>
  </div>
);

const InlineError: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 p-4 text-sm font-bold flex items-center gap-2">
    <AlertTriangle size={16} /> {text}
  </div>
);

/* ------------------------- TCC (RPD + CARTÕES) ------------------------- */

const TCCPanel: React.FC<{
  t: (k: string) => string;
  scopeKey: string; // patientId
}> = ({ t, scopeKey }) => {
  const [activeSub, setActiveSub] = useState<TccSubTab>('rpd');

  // Loading / error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // RPD
  const [records, setRecords] = useState<RPDRecord[]>([]);
  const [newRPD, setNewRPD] = useState<Partial<RPDRecord>>({ intensity: 5 });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Coping cards
  const [cards, setCards] = useState<CopingCard[]>([]);
  const [newCard, setNewCard] = useState({ front: '', back: '' });
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const mapRpd = (r: ApiTccRPD): RPDRecord => ({
    id: String(r.id),
    date: toIso(r.created_at || r.date),
    situation: r.situation || '',
    thought: r.thought || '',
    emotion: r.emotion || '',
    intensity: clamp(Number(r.intensity ?? 5), 0, 10),
  });

  const mapCard = (c: ApiTccCard): CopingCard => ({
    id: String(c.id),
    front: c.front || '',
    back: c.back || '',
    createdAt: toIso(c.created_at || c.createdAt),
  });

  const loadTcc = async () => {
    if (!scopeKey || scopeKey === 'none') return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ records: ApiTccRPD[]; cards: ApiTccCard[] }>(`/clinical-tools/${scopeKey}/tcc`);
      setRecords(Array.isArray(data?.records) ? data.records.map(mapRpd) : []);
      setCards(Array.isArray(data?.cards) ? data.cards.map(mapCard) : []);
    } catch (e) {
      console.error(e);
      setError(t('common.loadError') || 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // reset state ao trocar paciente
    setRecords([]);
    setCards([]);
    setEditingId(null);
    setEditingCardId(null);
    setNewRPD({ intensity: 5 });
    setNewCard({ front: '', back: '' });
    setActiveSub('rpd');
    void loadTcc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey]);

  const clearRPD = () => {
    setEditingId(null);
    setNewRPD({ intensity: 5 });
  };

  const saveRPD = async () => {
    if (!newRPD.situation?.trim() || !newRPD.thought?.trim()) return;

    setLoading(true);
    setError(null);
    try {
      if (editingId) {
        // PUT (update full)
        await api.put(`/clinical-tools/${scopeKey}/tcc/rpd/${editingId}`, {
          situation: newRPD.situation?.trim(),
          thought: newRPD.thought?.trim(),
          emotion: (newRPD.emotion || '').trim(),
          intensity: clamp(Number(newRPD.intensity ?? 5), 0, 10),
        });
        clearRPD();
        await loadTcc();
        return;
      }

      // POST (create)
      await api.post(`/clinical-tools/${scopeKey}/tcc/rpd`, {
        situation: newRPD.situation?.trim(),
        thought: newRPD.thought?.trim(),
        emotion: (newRPD.emotion || '').trim(),
        intensity: clamp(Number(newRPD.intensity ?? 5), 0, 10),
      });

      clearRPD();
      await loadTcc();
    } catch (e) {
      console.error(e);
      setError(t('common.saveError') || 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const editRPD = (r: RPDRecord) => {
    setActiveSub('rpd');
    setEditingId(String(r.id));
    setNewRPD({ situation: r.situation, thought: r.thought, emotion: r.emotion, intensity: r.intensity });
  };

  const deleteRPD = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/clinical-tools/${scopeKey}/tcc/rpd/${id}`);
      await loadTcc();
    } catch (e) {
      console.error(e);
      setError(t('common.deleteError') || 'Erro ao excluir.');
    } finally {
      setLoading(false);
    }
  };

  // EXEMPLO PATCH (útil pra update parcial). Aqui não muda UI, mas fica pronto se quiser usar.
  const patchRPD = async (id: string, patch: Partial<Pick<RPDRecord, 'emotion' | 'intensity'>>) => {
    await api.patch(`/clinical-tools/${scopeKey}/tcc/rpd/${id}`, patch);
  };

  const saveCard = async () => {
    if (!newCard.front.trim() || !newCard.back.trim()) return;

    setLoading(true);
    setError(null);
    try {
      if (editingCardId) {
        await api.put(`/clinical-tools/${scopeKey}/tcc/cards/${editingCardId}`, {
          front: newCard.front.trim(),
          back: newCard.back.trim(),
        });
        setEditingCardId(null);
        setNewCard({ front: '', back: '' });
        await loadTcc();
        return;
      }

      await api.post(`/clinical-tools/${scopeKey}/tcc/cards`, {
        front: newCard.front.trim(),
        back: newCard.back.trim(),
      });

      setNewCard({ front: '', back: '' });
      await loadTcc();
    } catch (e) {
      console.error(e);
      setError(t('common.saveError') || 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const editCard = (c: CopingCard) => {
    setActiveSub('cards');
    setEditingCardId(c.id);
    setNewCard({ front: c.front, back: c.back });
  };

  const deleteCard = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/clinical-tools/${scopeKey}/tcc/cards/${id}`);
      await loadTcc();
    } catch (e) {
      console.error(e);
      setError(t('common.deleteError') || 'Erro ao excluir.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1 flex gap-1 w-full max-w-2xl">
        <button
          onClick={() => setActiveSub('rpd')}
          className={[
            'flex-1 px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all',
            activeSub === 'rpd' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
          ].join(' ')}
        >
          {t('tcc.tabs.rpd')}
        </button>
        <button
          onClick={() => setActiveSub('cards')}
          className={[
            'flex-1 px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all',
            activeSub === 'cards' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
          ].join(' ')}
        >
          {t('tcc.tabs.coping')}
        </button>
      </div>

      {error && <InlineError text={error} />}

      {/* Loading hint */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500 font-bold">
          <Loader2 className="animate-spin" size={16} /> {t('common.loading') || 'Carregando...'}
        </div>
      )}

      {activeSub === 'rpd' && (
        <div className="flex flex-col gap-6">
          <SectionCard
            title={editingId ? t('tcc.rpd.editTitle') : t('tcc.rpd.newTitle')}
            subtitle={t('tcc.rpd.hint')}
            icon={<BrainCircuit size={18} className="text-indigo-600" />}
            right={
              <div className="flex items-center gap-2">
                <button
                  onClick={loadTcc}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-sm hover:bg-slate-50"
                  title={t('common.refresh') || 'Atualizar'}
                >
                  <RefreshCcw size={16} /> {t('common.refresh') || 'Atualizar'}
                </button>
                <button
                  onClick={clearRPD}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-sm hover:bg-slate-50"
                >
                  <RotateCcw size={16} /> {t('common.clear')}
                </button>
              </div>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase mb-1.5">{t('tcc.rpd.situation')}</label>
                <textarea
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 h-28 resize-none text-sm focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none"
                  value={newRPD.situation || ''}
                  onChange={(e) => setNewRPD({ ...newRPD, situation: e.target.value })}
                  placeholder={t('tcc.rpd.situationPh')}
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase mb-1.5">{t('tcc.rpd.thought')}</label>
                <textarea
                  className="w-full p-3 rounded-xl border-2 border-indigo-100 bg-white h-28 resize-none text-sm focus:ring-4 focus:ring-indigo-100 outline-none"
                  value={newRPD.thought || ''}
                  onChange={(e) => setNewRPD({ ...newRPD, thought: e.target.value })}
                  placeholder={t('tcc.rpd.thoughtPh')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase mb-1.5">{t('tcc.rpd.emotion')}</label>

                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      className="flex-1 p-3 rounded-xl border border-slate-200 text-sm focus:ring-4 focus:ring-indigo-100 outline-none"
                      value={newRPD.emotion || ''}
                      onChange={(e) => setNewRPD({ ...newRPD, emotion: e.target.value })}
                      placeholder={t('tcc.rpd.emotionPh')}
                    />

                    <input
                      type="number"
                      min="0"
                      max="10"
                      className="w-20 p-3 rounded-xl border border-slate-200 text-center font-extrabold text-sm focus:ring-4 focus:ring-indigo-100 outline-none"
                      value={Number(newRPD.intensity ?? 5)}
                      onChange={(e) => setNewRPD({ ...newRPD, intensity: clamp(parseInt(e.target.value || '5', 10), 0, 10) })}
                      title={t('tcc.rpd.intensity')}
                    />
                  </div>

                  <p className="text-[12px] text-slate-400 mt-1">{t('tcc.rpd.intensityHint')}</p>
                </div>

                <button
                  onClick={saveRPD}
                  disabled={loading}
                  className={[
                    'w-full md:w-auto md:min-w-[160px] h-11 text-white font-extrabold rounded-xl shadow-sm text-sm inline-flex items-center justify-center gap-2 active:scale-[0.99]',
                    loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700',
                  ].join(' ')}
                >
                  {editingId ? <Save size={16} /> : <Plus size={16} />}
                  {editingId ? t('common.save') : t('tcc.rpd.save')}
                </button>
              </div>

              {(!newRPD.situation?.trim() || !newRPD.thought?.trim()) && (
                <div className="text-[12px] text-amber-600 flex items-center gap-2 justify-end">
                  <AlertTriangle size={14} /> {t('tcc.rpd.requiredHint')}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title={t('tcc.rpd.history')}
            subtitle={t('tcc.rpd.historyHint')}
            icon={<Sparkles size={18} className="text-indigo-600" />}
          >
            {records.length === 0 ? (
              <EmptyDashed text={t('tcc.rpd.empty')} icon={<CheckCircle2 className="opacity-30" />} />
            ) : (
              <div className="space-y-3">
                {records.map((r) => (
                  <div key={r.id} className="border border-slate-200 rounded-2xl p-4 bg-white hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-extrabold uppercase text-slate-400">
                            {new Date(r.date).toLocaleString()}
                          </span>
                          <span className="text-[11px] font-extrabold rounded-full px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {t('tcc.rpd.intensityShort')}: {r.intensity ?? 0}/10
                          </span>
                        </div>

                        <div className="text-sm font-extrabold text-slate-800">
                          {r.emotion ? r.emotion : t('tcc.rpd.noEmotion')}
                        </div>

                        <div className="mt-2 text-sm text-slate-600">
                          <div className="font-bold text-slate-700">{t('tcc.rpd.situation')}</div>
                          <div className="line-clamp-2">{r.situation}</div>
                        </div>

                        <div className="mt-2 text-sm text-slate-600">
                          <div className="font-bold text-slate-700">{t('tcc.rpd.thought')}</div>
                          <div className="line-clamp-2">{r.thought}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => editRPD(r)}
                          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                          title={t('common.edit')}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => deleteRPD(String(r.id))}
                          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                          title={t('common.delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {activeSub === 'cards' && (
        <div className="space-y-6">
          <SectionCard
            title={editingCardId ? t('tcc.cards.editTitle') : t('tcc.cards.newTitle')}
            subtitle={t('tcc.cards.hint')}
            icon={<Sparkles size={18} className="text-indigo-600" />}
            right={
              <div className="flex items-center gap-2">
                <button
                  onClick={loadTcc}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-sm hover:bg-slate-50"
                >
                  <RefreshCcw size={16} /> {t('common.refresh') || 'Atualizar'}
                </button>

                <button
                  onClick={() => {
                    setEditingCardId(null);
                    setNewCard({ front: '', back: '' });
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-sm hover:bg-slate-50"
                >
                  <RotateCcw size={16} /> {t('common.clear')}
                </button>
              </div>
            }
          >
            <div className="rounded-2xl bg-indigo-50/40 border border-indigo-100 p-4">
              <div className="text-xs font-extrabold text-indigo-700 uppercase mb-3">{t('tcc.cards.formTitle')}</div>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end">
                <div className="space-y-3">
                  <input
                    className="w-full h-11 px-4 rounded-xl border border-indigo-200 bg-white text-sm outline-none focus:ring-4 focus:ring-indigo-100"
                    value={newCard.front}
                    onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                    placeholder={t('tcc.cards.frontPh')}
                  />
                  <textarea
                    className="w-full min-h-[92px] p-4 rounded-xl border border-indigo-200 bg-white text-sm outline-none focus:ring-4 focus:ring-indigo-100 resize-none"
                    value={newCard.back}
                    onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                    placeholder={t('tcc.cards.backPh')}
                  />
                </div>

                <button
                  onClick={saveCard}
                  disabled={loading}
                  className={[
                    'h-11 px-6 rounded-xl text-white font-extrabold shadow-sm inline-flex items-center gap-2 justify-center',
                    loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700',
                  ].join(' ')}
                >
                  {editingCardId ? <Save size={16} /> : <Plus size={16} />}
                  {editingCardId ? t('common.save') : t('tcc.cards.create')}
                </button>
              </div>
            </div>

            <div className="mt-5">
              {cards.length === 0 ? (
                <EmptyDashed text={t('tcc.cards.empty')} icon={<CheckCircle2 className="opacity-30" />} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {cards.map((c) => (
                    <div key={c.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-sm transition-all">
                      <div className="p-4 border-b border-slate-100 bg-slate-50/60">
                        <div className="text-[11px] font-extrabold uppercase text-slate-400">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </div>
                        <div className="mt-2 font-extrabold text-slate-900">{c.front}</div>
                      </div>

                      <div className="p-4 text-sm text-slate-600 min-h-[70px]">{c.back}</div>

                      <div className="p-3 border-t border-slate-100 flex gap-2">
                        <button
                          onClick={() => editCard(c)}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 font-extrabold text-xs hover:bg-slate-50"
                        >
                          <Edit3 size={14} /> {t('common.edit')}
                        </button>
                        <button
                          onClick={() => deleteCard(c.id)}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 font-extrabold text-xs hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                        >
                          <Trash2 size={14} /> {t('common.delete')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
};

/* ------------------------- TERAPIA DO ESQUEMA ------------------------- */

const SCHEMA_LIBRARY = [
  'Abandono / Instabilidade',
  'Desconfiança / Abuso',
  'Privação Emocional',
  'Defectividade / Vergonha',
  'Isolamento Social',
  'Dependência / Incompetência',
  'Vulnerabilidade ao Dano',
  'Emaranhamento',
  'Fracasso',
  'Arrogo / Grandiosidade',
  'Autocontrole Insuficiente',
  'Subjugação',
  'Auto-sacrifício',
  'Busca de Aprovação',
  'Negativismo / Pessimismo',
  'Inibição Emocional',
  'Padrões Inflexíveis',
  'Punição',
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
    case 'child':
      return { label: 'CRIANÇA', cls: 'bg-indigo-50 text-indigo-700 border-indigo-100' };
    case 'parent':
      return { label: 'PAIS', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'coping':
      return { label: 'ENFRENTAMENTO', cls: 'bg-amber-50 text-amber-700 border-amber-100' };
    case 'healthy':
      return { label: 'SAUDÁVEL', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
  }
};

const SchemaPanel: React.FC<{ t: (k: string) => string; scopeKey: string }> = ({ t, scopeKey }) => {
  const [sub, setSub] = useState<SchemaSubTab>('schemas');
  const [activeSchemas, setActiveSchemas] = useState<string[]>([]);
  const [modes, setModes] = useState<SchemaMode[]>(DEFAULT_MODES);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedPulse, setSavedPulse] = useState(false);

  const loadLatest = async () => {
    if (!scopeKey || scopeKey === 'none') return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ApiSchemaLatest>(`/clinical-tools/${scopeKey}/schema/latest`);
      const schemas = Array.isArray(data?.active_schemas) ? data.active_schemas : [];
      const md = Array.isArray(data?.modes) ? data.modes : [];
      setActiveSchemas(schemas);
      setModes(md.length ? md : DEFAULT_MODES);
    } catch (e) {
      console.error(e);
      setError(t('common.loadError') || 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActiveSchemas([]);
    setModes(DEFAULT_MODES);
    setSub('schemas');
    void loadLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey]);

  const toggleSchema = (name: string) => {
    setActiveSchemas((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  };

  const toggleMode = (id: string) => {
    setModes((prev) => prev.map((m) => (m.id === id ? { ...m, active: !m.active } : m)));
  };

  const setModeIntensity = (id: string, val: number) => {
    setModes((prev) => prev.map((m) => (m.id === id ? { ...m, intensity: clamp(val, 0, 10) } : m)));
  };

  const activeModesCount = modes.filter((m) => m.active).length;

  const saveRegister = async () => {
    // POST snapshot (registro)
    setLoading(true);
    setError(null);
    try {
      await api.post(`/clinical-tools/${scopeKey}/schema/snapshot`, {
        activeSchemas,
        modes,
      });
      setSavedPulse(true);
      setTimeout(() => setSavedPulse(false), 900);
    } catch (e) {
      console.error(e);
      setError(t('common.saveError') || 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1 flex gap-1 w-full max-w-xl">
        <button
          onClick={() => setSub('schemas')}
          className={[
            'flex-1 px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all',
            sub === 'schemas' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
          ].join(' ')}
        >
          {t('schema.tabs.schemas')}
        </button>
        <button
          onClick={() => setSub('modes')}
          className={[
            'flex-1 px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all',
            sub === 'modes' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
          ].join(' ')}
        >
          {t('schema.tabs.modes')}
        </button>
      </div>

      {error && <InlineError text={error} />}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500 font-bold">
          <Loader2 className="animate-spin" size={16} /> {t('common.loading') || 'Carregando...'}
        </div>
      )}

      {sub === 'schemas' && (
        <div className="space-y-6">
          <SectionCard
            title={t('schema.activeTitle')}
            subtitle={t('schema.activeHint')}
            icon={<LayoutGrid size={18} className="text-rose-600" />}
            right={
              <button
                onClick={loadLatest}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-sm hover:bg-slate-50"
              >
                <RefreshCcw size={16} /> {t('common.refresh') || 'Atualizar'}
              </button>
            }
          >
            {activeSchemas.length === 0 ? (
              <div className="text-slate-400 text-sm">{t('schema.activeEmpty')}</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activeSchemas.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleSchema(s)}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-extrabold"
                    title={t('schema.remove')}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </SectionCard>

          <div>
            <div className="text-[12px] font-extrabold text-slate-500 uppercase mb-2">{t('schema.libraryTitle')}</div>
            <div className="flex flex-wrap gap-2">
              {SCHEMA_LIBRARY.map((s) => {
                const on = activeSchemas.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleSchema(s)}
                    className={[
                      'px-3 py-2 rounded-xl border text-sm font-extrabold transition-all',
                      on
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {sub === 'modes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {modes.map((m) => {
              const badge = groupBadge(m.group);
              return (
                <div
                  key={m.id}
                  className={[
                    'rounded-2xl border shadow-sm bg-white p-4 transition-all',
                    m.active ? 'border-indigo-200 ring-2 ring-indigo-100' : 'border-slate-200',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={['inline-flex items-center px-2 py-1 rounded-full border text-[10px] font-extrabold', badge.cls].join(' ')}>
                        {badge.label}
                      </span>
                      <div className="mt-2 font-extrabold text-slate-900">{m.name}</div>
                    </div>

                    <button
                      onClick={() => toggleMode(m.id)}
                      className={[
                        'w-9 h-9 rounded-xl border flex items-center justify-center',
                        m.active ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-400 hover:bg-slate-50',
                      ].join(' ')}
                      title={m.active ? t('schema.modes.deactivate') : t('schema.modes.activate')}
                    >
                      <CheckCircle2 size={18} className={m.active ? '' : 'opacity-40'} />
                    </button>
                  </div>

                  {m.active && (
                    <div className="mt-4 flex items-center gap-3">
                      <div className="text-xs font-extrabold text-slate-400">0</div>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        value={m.intensity}
                        onChange={(e) => setModeIntensity(m.id, Number(e.target.value))}
                        className="flex-1"
                      />
                      <div className="w-8 text-right font-extrabold text-slate-900">{m.intensity}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-4">
            <div className="bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-800 px-5 py-4 flex items-center justify-between gap-4">
              <div className="font-extrabold text-sm">
                {t('schema.modes.activeCount')}: {activeModesCount}
              </div>
              <button
                onClick={saveRegister}
                disabled={loading}
                className={[
                  'px-5 h-10 rounded-xl font-extrabold text-sm transition-all',
                  loading ? 'bg-slate-700/60 cursor-not-allowed' : savedPulse ? 'bg-emerald-600' : 'bg-slate-700 hover:bg-slate-600',
                ].join(' ')}
              >
                {savedPulse ? t('schema.modes.saved') : t('schema.modes.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------- PSICANÁLISE ------------------------- */

const PsychoPanel: React.FC<{ t: (k: string) => string; scopeKey: string }> = ({ t, scopeKey }) => {
  const [sub, setSub] = useState<PsychoSubTab>('dreams');

  const [dreams, setDreams] = useState<DreamRecord[]>([]);
  const [newDream, setNewDream] = useState({ title: '', manifest: '', latent: '' });
  const [editingDreamId, setEditingDreamId] = useState<string | null>(null);

  const [freeText, setFreeText] = useState('');
  const [signifiers, setSignifiers] = useState<Signifier[]>([]);
  const [newSignifier, setNewSignifier] = useState('');

  const [loading, setLoading] = useState(false);
  const [freeSaving, setFreeSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const loadedRef = useRef(false);
  const debounceRef = useRef<number | null>(null);

  const mapDream = (d: ApiPsychoDream): DreamRecord => ({
    id: String(d.id),
    title: d.title || '',
    manifest: d.manifest || '',
    latent: d.latent || '',
    createdAt: toIso(d.created_at),
  });

  const mapSignifier = (s: ApiPsychoSignifier): Signifier => ({
    id: String(s.id),
    term: s.term || '',
    createdAt: toIso(s.created_at),
  });

  const loadPsycho = async () => {
    if (!scopeKey || scopeKey === 'none') return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ApiPsychoGet>(`/clinical-tools/${scopeKey}/psycho`);
      setDreams(Array.isArray(data?.dreams) ? data.dreams.map(mapDream) : []);
      setFreeText(typeof data?.freeText === 'string' ? data.freeText : '');
      setSignifiers(Array.isArray(data?.signifiers) ? data.signifiers.map(mapSignifier) : []);
      loadedRef.current = true;
    } catch (e) {
      console.error(e);
      setError(t('common.loadError') || 'Erro ao carregar.');
      loadedRef.current = false;
    } finally {
      setLoading(false);
      setFreeSaving('idle');
    }
  };

  useEffect(() => {
    // reset ao trocar paciente
    setDreams([]);
    setFreeText('');
    setSignifiers([]);
    setNewDream({ title: '', manifest: '', latent: '' });
    setEditingDreamId(null);
    setNewSignifier('');
    setError(null);
    loadedRef.current = false;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = null;

    void loadPsycho();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey]);

  // AUTO-SAVE do texto livre usando PATCH (e fallback pra PUT)
  useEffect(() => {
    if (!loadedRef.current) return;
    if (!scopeKey || scopeKey === 'none') return;

    setFreeSaving('saving');
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(async () => {
      try {
        // PATCH (parcial)
        await api.patch(`/clinical-tools/${scopeKey}/psycho/free`, { content: freeText });
        setFreeSaving('saved');
        window.setTimeout(() => setFreeSaving('idle'), 900);
      } catch (e1) {
        try {
          // fallback PUT
          await api.put(`/clinical-tools/${scopeKey}/psycho/free`, { content: freeText });
          setFreeSaving('saved');
          window.setTimeout(() => setFreeSaving('idle'), 900);
        } catch (e2) {
          console.error(e1, e2);
          setFreeSaving('error');
        }
      }
    }, 700);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [freeText, scopeKey]);

  const saveDream = async () => {
    if (!newDream.title.trim() && !newDream.manifest.trim() && !newDream.latent.trim()) return;

    setLoading(true);
    setError(null);
    try {
      if (editingDreamId) {
        // PUT (editar sonho) — precisa existir no backend
        await api.put(`/clinical-tools/${scopeKey}/psycho/dreams/${editingDreamId}`, {
          title: newDream.title.trim(),
          manifest: newDream.manifest.trim(),
          latent: newDream.latent.trim(),
        });
      } else {
        // POST
        await api.post(`/clinical-tools/${scopeKey}/psycho/dreams`, {
          title: newDream.title.trim(),
          manifest: newDream.manifest.trim(),
          latent: newDream.latent.trim(),
        });
      }

      setNewDream({ title: '', manifest: '', latent: '' });
      setEditingDreamId(null);
      await loadPsycho();
    } catch (e) {
      console.error(e);
      setError(t('common.saveError') || 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const editDream = (d: DreamRecord) => {
    setSub('dreams');
    setEditingDreamId(d.id);
    setNewDream({ title: d.title, manifest: d.manifest, latent: d.latent });
  };

  const deleteDream = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // DELETE (precisa existir no backend)
      await api.delete(`/clinical-tools/${scopeKey}/psycho/dreams/${id}`);
      await loadPsycho();
    } catch (e) {
      console.error(e);
      setError(t('common.deleteError') || 'Erro ao excluir.');
    } finally {
      setLoading(false);
    }
  };

  const addSignifier = async () => {
    if (!newSignifier.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await api.post(`/clinical-tools/${scopeKey}/psycho/signifiers`, { term: newSignifier.trim() });
      setNewSignifier('');
      await loadPsycho();
    } catch (e) {
      console.error(e);
      setError(t('common.saveError') || 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const deleteSignifier = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // DELETE (precisa existir no backend)
      await api.delete(`/clinical-tools/${scopeKey}/psycho/signifiers/${id}`);
      await loadPsycho();
    } catch (e) {
      console.error(e);
      setError(t('common.deleteError') || 'Erro ao excluir.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1 flex gap-1 w-full max-w-3xl">
        <button
          onClick={() => setSub('dreams')}
          className={[
            'flex-1 px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all',
            sub === 'dreams' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
          ].join(' ')}
        >
          {t('psycho.tabs.dreams')}
        </button>
        <button
          onClick={() => setSub('free')}
          className={[
            'flex-1 px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all',
            sub === 'free' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
          ].join(' ')}
        >
          {t('psycho.tabs.free')}
        </button>
        <button
          onClick={() => setSub('signifiers')}
          className={[
            'flex-1 px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all',
            sub === 'signifiers' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
          ].join(' ')}
        >
          {t('psycho.tabs.signifiers')}
        </button>
      </div>

      {error && <InlineError text={error} />}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500 font-bold">
          <Loader2 className="animate-spin" size={16} /> {t('common.loading') || 'Carregando...'}
        </div>
      )}

      {sub === 'dreams' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SectionCard
            title={editingDreamId ? t('psycho.dreams.editTitle') : t('psycho.dreams.newTitle')}
            subtitle={t('psycho.dreams.hint')}
            icon={<Moon size={18} className="text-amber-600" />}
            right={
              <div className="flex items-center gap-2">
                <button
                  onClick={loadPsycho}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-sm hover:bg-slate-50"
                >
                  <RefreshCcw size={16} /> {t('common.refresh') || 'Atualizar'}
                </button>
                <button
                  onClick={() => {
                    setEditingDreamId(null);
                    setNewDream({ title: '', manifest: '', latent: '' });
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-sm hover:bg-slate-50"
                >
                  <RotateCcw size={16} /> {t('common.clear')}
                </button>
              </div>
            }
          >
            <div className="space-y-3">
              <input
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-4 focus:ring-amber-100"
                value={newDream.title}
                onChange={(e) => setNewDream((p) => ({ ...p, title: e.target.value }))}
                placeholder={t('psycho.dreams.titlePh')}
              />

              <div>
                <div className="text-[11px] font-extrabold uppercase text-slate-400 mb-1">{t('psycho.dreams.manifest')}</div>
                <textarea
                  className="w-full min-h-[90px] p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:bg-white focus:ring-4 focus:ring-amber-100 resize-none"
                  value={newDream.manifest}
                  onChange={(e) => setNewDream((p) => ({ ...p, manifest: e.target.value }))}
                  placeholder={t('psycho.dreams.manifestPh')}
                />
              </div>

              <div>
                <div className="text-[11px] font-extrabold uppercase text-slate-400 mb-1">{t('psycho.dreams.latent')}</div>
                <textarea
                  className="w-full min-h-[90px] p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:bg-white focus:ring-4 focus:ring-amber-100 resize-none"
                  value={newDream.latent}
                  onChange={(e) => setNewDream((p) => ({ ...p, latent: e.target.value }))}
                  placeholder={t('psycho.dreams.latentPh')}
                />
              </div>

              <button
                onClick={saveDream}
                disabled={loading}
                className={[
                  'w-full h-11 text-white font-extrabold rounded-xl shadow-sm inline-flex items-center justify-center gap-2',
                  loading ? 'bg-amber-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700',
                ].join(' ')}
              >
                <Save size={16} /> {editingDreamId ? (t('common.save') || 'Salvar') : t('psycho.dreams.archive')}
              </button>
            </div>
          </SectionCard>

          <SectionCard title={t('psycho.dreams.history')} subtitle={t('psycho.dreams.historyHint')} icon={<Moon size={18} className="text-amber-600" />}>
            {dreams.length === 0 ? (
              <EmptyDashed text={t('psycho.dreams.empty')} icon={<Moon className="opacity-30" />} />
            ) : (
              <div className="space-y-3">
                {dreams.map((d) => (
                  <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-extrabold uppercase text-slate-400">
                          {new Date(d.createdAt).toLocaleString()}
                        </div>
                        <div className="mt-1 font-extrabold text-slate-900">{d.title || t('psycho.dreams.noTitle')}</div>

                        <div className="mt-3 text-sm text-slate-600">
                          <div className="font-bold text-slate-700">{t('psycho.dreams.manifest')}</div>
                          <div className="line-clamp-2">{d.manifest || '-'}</div>
                        </div>

                        <div className="mt-3 text-sm text-slate-600">
                          <div className="font-bold text-slate-700">{t('psycho.dreams.latent')}</div>
                          <div className="line-clamp-2">{d.latent || '-'}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => editDream(d)}
                          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                          title={t('common.edit')}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => deleteDream(d.id)}
                          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                          title={t('common.delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {sub === 'free' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 overflow-hidden">
          <div className="px-6 py-5 flex items-start justify-between">
            <div>
              <div className="text-2xl font-extrabold text-amber-900">{t('psycho.free.title')}</div>
              <div className="text-sm text-amber-800/70 mt-2">{t('psycho.free.hint')}</div>
              <div className="mt-2 text-xs font-extrabold">
                {freeSaving === 'saving' && <span className="text-amber-700">{t('common.saving') || 'Salvando...'}</span>}
                {freeSaving === 'saved' && <span className="text-emerald-700">{t('common.saved') || 'Salvo'}</span>}
                {freeSaving === 'error' && <span className="text-red-700">{t('common.saveError') || 'Erro ao salvar'}</span>}
              </div>
            </div>

            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
              <PenLine size={18} />
            </div>
          </div>

          <div className="px-6 pb-6">
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder={t('psycho.free.ph')}
              className="w-full min-h-[420px] rounded-2xl border border-amber-200 bg-amber-50/30 p-5 text-sm text-slate-800 outline-none focus:ring-4 focus:ring-amber-100 resize-none"
            />
            <div className="text-xs text-amber-800/60 mt-2 text-right">
              {freeText.length} {t('psycho.free.chars')}
            </div>
          </div>
        </div>
      )}

      {sub === 'signifiers' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex gap-3 items-center">
            <input
              value={newSignifier}
              onChange={(e) => setNewSignifier(e.target.value)}
              placeholder={t('psycho.signifiers.ph')}
              className="flex-1 h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-4 focus:ring-amber-100"
            />
            <button
              onClick={addSignifier}
              disabled={loading}
              className={[
                'h-11 px-5 rounded-xl text-white font-extrabold inline-flex items-center gap-2',
                loading ? 'bg-amber-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700',
              ].join(' ')}
            >
              <Plus size={16} /> {t('psycho.signifiers.add')}
            </button>
          </div>

          {signifiers.length === 0 ? (
            <EmptyDashed text={t('psycho.signifiers.empty')} icon={<ScanSearch className="opacity-30" />} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {signifiers.map((s) => (
                <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-extrabold uppercase text-slate-400">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                      <div className="mt-1 font-extrabold text-slate-900">{s.term}</div>
                    </div>

                    <button
                      onClick={() => deleteSignifier(s.id)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                      title={t('common.delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ------------------------- MAIN PAGE ------------------------- */

export const ClinicalTools: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolTab>('tcc');
  const [isLoading, setIsLoading] = useState(true);
  const [patientSearch, setPatientSearch] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Patient[]>('/patients');
      setPatients(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  useEffect(() => {
    const patientId = searchParams.get('patient_id');
    if (patientId && !selectedPatientId) {
      setSelectedPatientId(patientId);
    }
  }, [searchParams, selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find((p) => p.id === selectedPatientId), [patients, selectedPatientId]);

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => (p.full_name || '').toLowerCase().includes(q));
  }, [patients, patientSearch]);

  const scopeKey = useMemo(() => (selectedPatientId ? String(selectedPatientId) : 'none'), [selectedPatientId]);

  return (
    <div className="space-y-6 pb-20">
      <div className="relative overflow-hidden rounded-3xl p-8 bg-slate-900 shadow-xl border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 opacity-90" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-200 text-[10px] font-extrabold uppercase tracking-widest">
            <Boxes size={12} />
            <span>{t('tools.badge')}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-white mb-2 leading-tight">{t('tools.title')}</h1>
          <p className="text-indigo-200 text-sm leading-relaxed max-w-xl">{t('tools.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 items-start">
        {/* LEFT */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="text-[12px] font-extrabold text-slate-500 uppercase">{t('tools.patientListTitle')}</div>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder={t('tools.patientSearchPh')}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-4 focus:ring-indigo-100 outline-none"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-10 flex justify-center">
                <Loader2 className="animate-spin text-indigo-600" />
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <div className="font-extrabold">{t('tools.noPatients')}</div>
                <div className="text-sm text-slate-400 mt-1">{t('tools.noPatientsHint')}</div>
              </div>
            ) : (
              filteredPatients.map((p) => {
                const selected = selectedPatientId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={[
                      'w-full flex items-center gap-3 p-4 text-left transition-colors',
                      selected ? 'bg-indigo-50/70' : 'hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <div className={['w-1 self-stretch rounded-full', selected ? 'bg-indigo-600' : 'bg-transparent'].join(' ')} />
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-extrabold text-slate-600 shrink-0">
                      {p.full_name?.charAt(0) || '?'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={['text-sm font-extrabold truncate', selected ? 'text-indigo-800' : 'text-slate-800'].join(' ')}>
                        {p.full_name}
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={p.status} t={t} />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-4 min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1 flex gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'tcc', label: t('tools.tcc'), icon: <BrainCircuit size={16} />, activeCls: 'text-indigo-700', onCls: 'bg-indigo-50 border-indigo-100' },
              { id: 'schema', label: t('tools.schema'), icon: <LayoutGrid size={16} />, activeCls: 'text-rose-700', onCls: 'bg-rose-50 border-rose-100' },
              { id: 'psycho', label: t('tools.psycho'), icon: <Feather size={16} />, activeCls: 'text-amber-700', onCls: 'bg-amber-50 border-amber-100' },
            ].map((tab) => {
              const on = activeTool === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTool(tab.id as ToolTab)}
                  className={[
                    'flex-1 min-w-[190px] py-3 px-4 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all whitespace-nowrap border',
                    on ? `${tab.onCls} ${tab.activeCls}` : 'border-transparent text-slate-600 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {tab.icon} {tab.label}
                </button>
              );
            })}
          </div>

          {!selectedPatient ? (
            <EmptyDashed text={t('tools.selectPatientHint')} icon={<Boxes size={22} className="opacity-30" />} />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold">
                    {selectedPatient.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 truncate">{selectedPatient.full_name}</div>
                    <div className="text-sm text-slate-500">{t('tools.patientHeaderHint')}</div>
                  </div>
                </div>
                <StatusBadge status={selectedPatient.status} t={t} />
              </div>

              {activeTool === 'tcc' && <TCCPanel t={t} scopeKey={scopeKey} />}
              {activeTool === 'schema' && <SchemaPanel t={t} scopeKey={scopeKey} />}
              {activeTool === 'psycho' && <PsychoPanel t={t} scopeKey={scopeKey} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
