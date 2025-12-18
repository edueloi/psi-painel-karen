import React, { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

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

const uid = () => Math.random().toString(36).slice(2);

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

/* ------------------------- TCC (RPD + CARTÕES) ------------------------- */

const TCCPanel: React.FC<{
  t: (k: string) => string;
  scopeKey: string;
}> = ({ t, scopeKey }) => {
  const [activeSub, setActiveSub] = useState<TccSubTab>('rpd');

  // RPD
  const [records, setRecords] = useState<RPDRecord[]>([]);
  const [newRPD, setNewRPD] = useState<Partial<RPDRecord>>({ intensity: 5 });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Coping cards
  const [cards, setCards] = useState<CopingCard[]>([]);
  const [newCard, setNewCard] = useState({ front: '', back: '' });
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const storageKey = useMemo(() => `clinical_tools_tcc_${scopeKey}`, [scopeKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.records)) setRecords(parsed.records);
      if (Array.isArray(parsed.cards)) setCards(parsed.cards);
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ records, cards }));
    } catch {}
  }, [storageKey, records, cards]);

  const clearRPD = () => {
    setEditingId(null);
    setNewRPD({ intensity: 5 });
  };

  const saveRPD = () => {
    if (!newRPD.situation?.trim() || !newRPD.thought?.trim()) return;

    if (editingId) {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? ({
                ...r,
                situation: newRPD.situation!,
                thought: newRPD.thought!,
                emotion: newRPD.emotion || '',
                intensity: Number(newRPD.intensity ?? 5),
              } as RPDRecord)
            : r,
        ),
      );
      clearRPD();
      return;
    }

    const rec: RPDRecord = {
      id: uid(),
      date: new Date().toISOString(),
      situation: newRPD.situation!,
      thought: newRPD.thought!,
      emotion: newRPD.emotion || '',
      intensity: Number(newRPD.intensity ?? 5),
    } as RPDRecord;

    setRecords((prev) => [rec, ...prev]);
    clearRPD();
  };

  const editRPD = (r: RPDRecord) => {
    setActiveSub('rpd');
    setEditingId(r.id);
    setNewRPD({ situation: r.situation, thought: r.thought, emotion: r.emotion, intensity: r.intensity });
  };

  const deleteRPD = (id: string) => setRecords((prev) => prev.filter((r) => r.id !== id));

  const saveCard = () => {
    if (!newCard.front.trim() || !newCard.back.trim()) return;

    if (editingCardId) {
      setCards((prev) => prev.map((c) => (c.id === editingCardId ? { ...c, front: newCard.front, back: newCard.back } : c)));
      setEditingCardId(null);
      setNewCard({ front: '', back: '' });
      return;
    }

    setCards((prev) => [{ id: uid(), front: newCard.front, back: newCard.back, createdAt: new Date().toISOString() }, ...prev]);
    setNewCard({ front: '', back: '' });
  };

  const editCard = (c: CopingCard) => {
    setActiveSub('cards');
    setEditingCardId(c.id);
    setNewCard({ front: c.front, back: c.back });
  };

  const deleteCard = (id: string) => setCards((prev) => prev.filter((c) => c.id !== id));

  return (
    <div className="space-y-4">
      {/* Sub tabs (igual imagem) */}
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

      {/* Content */}
      {activeSub === 'rpd' && (
        <div className="flex flex-col gap-6">
          <SectionCard
            title={editingId ? t('tcc.rpd.editTitle') : t('tcc.rpd.newTitle')}
            subtitle={t('tcc.rpd.hint')}
            icon={<BrainCircuit size={18} className="text-indigo-600" />}
            right={
              <button
                onClick={clearRPD}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-sm hover:bg-slate-50"
              >
                <RotateCcw size={16} /> {t('common.clear')}
              </button>
            }
          >
            {/* NOVO BLOCO RPD - campos empilhados, botão ao lado da emoção/intensidade */}
            <div className="space-y-4">
              {/* SITUAÇÃO */}
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase mb-1.5">
                  {t('tcc.rpd.situation')}
                </label>
                <textarea
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 h-28 resize-none text-sm focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none"
                  value={newRPD.situation || ''}
                  onChange={(e) => setNewRPD({ ...newRPD, situation: e.target.value })}
                  placeholder={t('tcc.rpd.situationPh')}
                />
              </div>

              {/* PENSAMENTO */}
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase mb-1.5">
                  {t('tcc.rpd.thought')}
                </label>
                <textarea
                  className="w-full p-3 rounded-xl border-2 border-indigo-100 bg-white h-28 resize-none text-sm focus:ring-4 focus:ring-indigo-100 outline-none"
                  value={newRPD.thought || ''}
                  onChange={(e) => setNewRPD({ ...newRPD, thought: e.target.value })}
                  placeholder={t('tcc.rpd.thoughtPh')}
                />
              </div>

              {/* EMOÇÃO/INTENSIDADE + BOTÃO (lado a lado no desktop) */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase mb-1.5">
                    {t('tcc.rpd.emotion')}
                  </label>

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
                      onChange={(e) =>
                        setNewRPD({ ...newRPD, intensity: parseInt(e.target.value || '5', 10) })
                      }
                      title={t('tcc.rpd.intensity')}
                    />
                  </div>

                  <p className="text-[12px] text-slate-400 mt-1">{t('tcc.rpd.intensityHint')}</p>
                </div>

                <button
                  onClick={saveRPD}
                  className="w-full md:w-auto md:min-w-[160px] h-11 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-700 shadow-sm text-sm inline-flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  {editingId ? <Save size={16} /> : <Plus size={16} />}
                  {editingId ? t('common.save') : t('tcc.rpd.save')}
                </button>
              </div>

              {/* Aviso */}
              {(!newRPD.situation?.trim() || !newRPD.thought?.trim()) && (
                <div className="text-[12px] text-amber-600 flex items-center gap-2 justify-end">
                  <AlertTriangle size={14} /> {t('tcc.rpd.requiredHint')}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title={t('tcc.rpd.history')} subtitle={t('tcc.rpd.historyHint')} icon={<Sparkles size={18} className="text-indigo-600" />}>
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
                          onClick={() => deleteRPD(r.id)}
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
              <button
                onClick={() => {
                  setEditingCardId(null);
                  setNewCard({ front: '', back: '' });
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-sm hover:bg-slate-50"
              >
                <RotateCcw size={16} /> {t('common.clear')}
              </button>
            }
          >
            {/* igual imagem: 2 inputs e botão à direita */}
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
                  className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold shadow-sm inline-flex items-center gap-2 justify-center"
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
  const [savedPulse, setSavedPulse] = useState(false);

  const storageKey = useMemo(() => `clinical_tools_schema_${scopeKey}`, [scopeKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.activeSchemas)) setActiveSchemas(parsed.activeSchemas);
      if (Array.isArray(parsed.modes)) setModes(parsed.modes);
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ activeSchemas, modes }));
    } catch {}
  }, [storageKey, activeSchemas, modes]);

  const toggleSchema = (name: string) => {
    setActiveSchemas((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  };

  const toggleMode = (id: string) => {
    setModes((prev) => prev.map((m) => (m.id === id ? { ...m, active: !m.active } : m)));
  };

  const setModeIntensity = (id: string, val: number) => {
    setModes((prev) => prev.map((m) => (m.id === id ? { ...m, intensity: val } : m)));
  };

  const activeModesCount = modes.filter((m) => m.active).length;

  const saveRegister = () => {
    // já persiste automaticamente, aqui é só UX como na imagem
    setSavedPulse(true);
    setTimeout(() => setSavedPulse(false), 900);
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

      {sub === 'schemas' && (
        <div className="space-y-6">
          <SectionCard
            title={t('schema.activeTitle')}
            subtitle={t('schema.activeHint')}
            icon={<LayoutGrid size={18} className="text-rose-600" />}
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
                      on ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
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

          {/* bottom bar igual imagem */}
          <div className="sticky bottom-4">
            <div className="bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-800 px-5 py-4 flex items-center justify-between gap-4">
              <div className="font-extrabold text-sm">
                {t('schema.modes.activeCount')}: {activeModesCount}
              </div>
              <button
                onClick={saveRegister}
                className={[
                  'px-5 h-10 rounded-xl font-extrabold text-sm transition-all',
                  savedPulse ? 'bg-emerald-600' : 'bg-slate-700 hover:bg-slate-600',
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

  const [freeText, setFreeText] = useState('');
  const [signifiers, setSignifiers] = useState<Signifier[]>([]);
  const [newSignifier, setNewSignifier] = useState('');

  const storageKey = useMemo(() => `clinical_tools_psycho_${scopeKey}`, [scopeKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.dreams)) setDreams(parsed.dreams);
      if (typeof parsed.freeText === 'string') setFreeText(parsed.freeText);
      if (Array.isArray(parsed.signifiers)) setSignifiers(parsed.signifiers);
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ dreams, freeText, signifiers }));
    } catch {}
  }, [storageKey, dreams, freeText, signifiers]);

  const addDream = () => {
    if (!newDream.title.trim() && !newDream.manifest.trim() && !newDream.latent.trim()) return;
    setDreams((prev) => [
      { id: uid(), createdAt: new Date().toISOString(), title: newDream.title, manifest: newDream.manifest, latent: newDream.latent },
      ...prev,
    ]);
    setNewDream({ title: '', manifest: '', latent: '' });
  };

  const addSignifier = () => {
    if (!newSignifier.trim()) return;
    setSignifiers((prev) => [{ id: uid(), createdAt: new Date().toISOString(), term: newSignifier.trim() }, ...prev]);
    setNewSignifier('');
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

      {sub === 'dreams' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SectionCard
            title={t('psycho.dreams.newTitle')}
            subtitle={t('psycho.dreams.hint')}
            icon={<Moon size={18} className="text-amber-600" />}
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
                onClick={addDream}
                className="w-full h-11 bg-amber-600 text-white font-extrabold rounded-xl hover:bg-amber-700 shadow-sm inline-flex items-center justify-center gap-2"
              >
                <Save size={16} /> {t('psycho.dreams.archive')}
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
                    <div className="text-[11px] font-extrabold uppercase text-slate-400">{new Date(d.createdAt).toLocaleString()}</div>
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
            <div className="text-xs text-amber-800/60 mt-2 text-right">{freeText.length} {t('psycho.free.chars')}</div>
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
              className="h-11 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold inline-flex items-center gap-2"
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
                  <div className="text-[11px] font-extrabold uppercase text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</div>
                  <div className="mt-1 font-extrabold text-slate-900">{s.term}</div>
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

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolTab>('tcc');
  const [isLoading, setIsLoading] = useState(true);
  const [patientSearch, setPatientSearch] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Patient[]>('/patients');
      setPatients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId),
    [patients, selectedPatientId],
  );

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => (p.full_name || '').toLowerCase().includes(q));
  }, [patients, patientSearch]);

  const scopeKey = useMemo(() => (selectedPatientId ? String(selectedPatientId) : 'none'), [selectedPatientId]);

  return (
    <div className="space-y-6 pb-20">
      {/* HERO (igual imagem) */}
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

      {/* LAYOUT (2 colunas igual imagem; no mobile empilha) */}
      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 items-start">
        {/* LEFT: PACIENTES */}
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

        {/* RIGHT: FERRAMENTAS */}
        <div className="space-y-4 min-w-0">
          {/* Tabs principais (igual imagem) */}
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

          {/* Conteúdo */}
          {!selectedPatient ? (
            <EmptyDashed text={t('tools.selectPatientHint')} icon={<Boxes size={22} className="opacity-30" />} />
          ) : (
            <div className="space-y-6">
              {/* opcional: header do paciente (leve) */}
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
