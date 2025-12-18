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
  X,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  User,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

type CopingCard = { id: string; front: string; back: string; flipped: boolean; createdAt: string };
type ToolTab = 'tcc' | 'schema' | 'psycho';
type TccSubTab = 'rpd' | 'cards';

const uid = () => Math.random().toString(36).slice(2);

const StatusBadge: React.FC<{ status?: string; t: (k: string) => string }> = ({ status, t }) => {
  const isActive = (status || '').toLowerCase() === 'ativo' || (status || '').toLowerCase() === 'active';
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide',
        isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200',
      ].join(' ')}
    >
      <span className={['h-2 w-2 rounded-full', isActive ? 'bg-emerald-500' : 'bg-slate-400'].join(' ')} />
      {isActive ? t('patients.status.active') : t('patients.status.inactive')}
    </span>
  );
};

const EmptyState: React.FC<{ title: string; desc?: string; icon?: React.ReactNode }> = ({ title, desc, icon }) => (
  <div className="flex flex-col items-center justify-center min-h-[340px] bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 px-6 text-center">
    <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-4">
      {icon}
    </div>
    <div className="font-extrabold text-lg text-slate-700">{title}</div>
    {desc && <div className="mt-1 text-sm text-slate-500 max-w-md">{desc}</div>}
  </div>
);

const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, icon, right, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50/60 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-extrabold text-slate-800">{title}</h3>
        </div>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
    <div className="p-4 md:p-5">{children}</div>
  </div>
);

const TCCPanel: React.FC<{ patientName: string; t: (k: string) => string }> = ({ patientName, t }) => {
  const [activeSubTab, setActiveSubTab] = useState<TccSubTab>('rpd');

  // RPD
  const [records, setRecords] = useState<RPDRecord[]>([]);
  const [newRPD, setNewRPD] = useState<Partial<RPDRecord>>({ intensity: 5 });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Cards
  const [cards, setCards] = useState<CopingCard[]>([]);
  const [newCard, setNewCard] = useState({ front: '', back: '' });
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // Persistência local (por paciente)
  const storageKey = useMemo(() => `clinical_tools_${patientName.replace(/\s+/g, '_').toLowerCase()}`, [patientName]);

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

  const resetNewRPD = () => setNewRPD({ intensity: 5 });

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
      setEditingId(null);
      resetNewRPD();
      return;
    }

    const record: RPDRecord = {
      id: uid(),
      date: new Date().toISOString(),
      situation: newRPD.situation!,
      thought: newRPD.thought!,
      emotion: newRPD.emotion || '',
      intensity: Number(newRPD.intensity ?? 5),
    } as RPDRecord;

    setRecords((prev) => [record, ...prev]);
    resetNewRPD();
  };

  const editRPD = (r: RPDRecord) => {
    setActiveSubTab('rpd');
    setEditingId(r.id);
    setNewRPD({ situation: r.situation, thought: r.thought, emotion: r.emotion, intensity: r.intensity });
  };

  const deleteRPD = (id: string) => setRecords((prev) => prev.filter((r) => r.id !== id));

  const addOrSaveCard = () => {
    if (!newCard.front.trim() || !newCard.back.trim()) return;

    if (editingCardId) {
      setCards((prev) =>
        prev.map((c) => (c.id === editingCardId ? { ...c, front: newCard.front, back: newCard.back } : c)),
      );
      setEditingCardId(null);
      setNewCard({ front: '', back: '' });
      return;
    }

    setCards((prev) => [
      { id: uid(), front: newCard.front, back: newCard.back, flipped: false, createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setNewCard({ front: '', back: '' });
  };

  const flipCard = (id: string) => setCards((prev) => prev.map((c) => (c.id === id ? { ...c, flipped: !c.flipped } : c)));
  const editCard = (c: CopingCard) => {
    setActiveSubTab('cards');
    setEditingCardId(c.id);
    setNewCard({ front: c.front, back: c.back });
  };
  const deleteCard = (id: string) => setCards((prev) => prev.filter((c) => c.id !== id));

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
        <button
          onClick={() => setActiveSubTab('rpd')}
          className={[
            'px-4 py-2 rounded-lg text-sm font-extrabold transition-all',
            activeSubTab === 'rpd' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-800',
          ].join(' ')}
        >
          {t('tcc.rpd')}
        </button>
        <button
          onClick={() => setActiveSubTab('cards')}
          className={[
            'px-4 py-2 rounded-lg text-sm font-extrabold transition-all',
            activeSubTab === 'cards' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-800',
          ].join(' ')}
        >
          {t('tcc.coping')}
        </button>
      </div>

      {activeSubTab === 'rpd' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SectionCard
            title={editingId ? t('tcc.editEntry') : t('tcc.newEntry')}
            subtitle={t('tcc.rpdHint')}
            icon={<BrainCircuit size={18} className="text-indigo-600" />}
            right={
              <button
                onClick={() => {
                  setEditingId(null);
                  resetNewRPD();
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-white"
              >
                <RotateCcw size={16} /> {t('common.clear')}
              </button>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase mb-1.5">{t('tcc.situation')}</label>
                  <textarea
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 h-28 resize-none text-sm focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none"
                    value={newRPD.situation || ''}
                    onChange={(e) => setNewRPD({ ...newRPD, situation: e.target.value })}
                    placeholder={t('tcc.situationPh')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase mb-1.5">{t('tcc.emotion')}</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      className="flex-1 p-3 rounded-xl border border-slate-200 text-sm focus:ring-4 focus:ring-indigo-100 outline-none"
                      value={newRPD.emotion || ''}
                      onChange={(e) => setNewRPD({ ...newRPD, emotion: e.target.value })}
                      placeholder={t('tcc.emotionPh')}
                    />
                    <input
                      type="number"
                      min="0"
                      max="10"
                      className="w-20 p-3 rounded-xl border border-slate-200 text-center font-extrabold text-sm focus:ring-4 focus:ring-indigo-100 outline-none"
                      value={Number(newRPD.intensity ?? 5)}
                      onChange={(e) => setNewRPD({ ...newRPD, intensity: parseInt(e.target.value || '5', 10) })}
                      title={t('tcc.intensity')}
                    />
                  </div>
                  <p className="text-[12px] text-slate-400 mt-1">{t('tcc.intensityHint')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-500 uppercase mb-1.5">{t('tcc.thought')}</label>
                  <textarea
                    className="w-full p-3 rounded-xl border-2 border-indigo-100 bg-white h-28 resize-none text-sm focus:ring-4 focus:ring-indigo-100 outline-none"
                    value={newRPD.thought || ''}
                    onChange={(e) => setNewRPD({ ...newRPD, thought: e.target.value })}
                    placeholder={t('tcc.thoughtPh')}
                  />
                </div>

                <button
                  onClick={saveRPD}
                  className="w-full h-11 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-700 shadow-sm text-sm inline-flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  {editingId ? <Save size={16} /> : <Plus size={16} />}
                  {editingId ? t('common.save') : t('tcc.addEntry')}
                </button>

                {(!newRPD.situation?.trim() || !newRPD.thought?.trim()) && (
                  <div className="text-[12px] text-amber-600 flex items-center gap-2">
                    <AlertTriangle size={14} /> {t('tcc.requiredHint')}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title={t('tcc.history')}
            subtitle={t('tcc.historyHint')}
            icon={<Sparkles size={18} className="text-indigo-600" />}
          >
            {records.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 mb-3">
                  <CheckCircle className="opacity-40" />
                </div>
                <div className="font-bold">{t('tcc.noEntries')}</div>
                <div className="text-sm text-slate-400 mt-1">{t('tcc.noEntriesHint')}</div>
              </div>
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
                            {t('tcc.intensityShort')}: {r.intensity ?? 0}/10
                          </span>
                        </div>
                        <div className="text-sm font-extrabold text-slate-800 truncate">{r.emotion ? r.emotion : t('tcc.noEmotion')}</div>
                        <div className="mt-2 text-sm text-slate-600">
                          <div className="font-bold text-slate-700">{t('tcc.situation')}</div>
                          <div className="line-clamp-2">{r.situation}</div>
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          <div className="font-bold text-slate-700">{t('tcc.thought')}</div>
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

      {activeSubTab === 'cards' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SectionCard
            title={editingCardId ? t('tcc.editCard') : t('tcc.addCard')}
            subtitle={t('tcc.cardsHint')}
            icon={<Sparkles size={18} className="text-indigo-600" />}
            right={
              <button
                onClick={() => {
                  setEditingCardId(null);
                  setNewCard({ front: '', back: '' });
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-white"
              >
                <RotateCcw size={16} /> {t('common.clear')}
              </button>
            }
          >
            <div className="space-y-3">
              <label className="block text-xs font-extrabold text-slate-500 uppercase">{t('tcc.cardFront')}</label>
              <input
                type="text"
                className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:ring-4 focus:ring-indigo-100 outline-none"
                value={newCard.front}
                onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                placeholder={t('tcc.cardFrontPh')}
              />

              <label className="block text-xs font-extrabold text-slate-500 uppercase">{t('tcc.cardBack')}</label>
              <textarea
                className="w-full p-3 rounded-xl border border-slate-200 resize-none h-28 text-sm focus:ring-4 focus:ring-indigo-100 outline-none"
                value={newCard.back}
                onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                placeholder={t('tcc.cardBackPh')}
              />

              <button
                onClick={addOrSaveCard}
                className="w-full h-11 bg-indigo-600 text-white font-extrabold rounded-xl hover:bg-indigo-700 shadow-sm text-sm inline-flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                {editingCardId ? <Save size={16} /> : <Plus size={16} />}
                {editingCardId ? t('common.save') : t('common.create')}
              </button>
            </div>
          </SectionCard>

          <SectionCard title={t('tcc.cards')} subtitle={t('tcc.cardsListHint')} icon={<Sparkles size={18} className="text-indigo-600" />}>
            {cards.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <div className="font-bold">{t('tcc.noCards')}</div>
                <div className="text-sm text-slate-400 mt-1">{t('tcc.noCardsHint')}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cards.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-slate-200 overflow-hidden bg-white hover:shadow-sm transition-all">
                    <button
                      onClick={() => flipCard(c.id)}
                      className="w-full text-left p-4 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                      title={t('tcc.flip')}
                    >
                      <div className="text-[11px] font-extrabold uppercase text-slate-400">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                      <div className="mt-2 font-extrabold text-slate-800">
                        {c.flipped ? c.back : c.front}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">{t('tcc.tapToFlip')}</div>
                    </button>

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
          </SectionCard>
        </div>
      )}
    </div>
  );
};

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

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] pb-20">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl p-8 bg-slate-900 shadow-xl border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 opacity-90" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-300 text-[10px] font-extrabold uppercase tracking-widest">
            <Boxes size={12} />
            <span>{t('tools.badge')}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-white mb-2 leading-tight">{t('tools.title')}</h1>
          <p className="text-indigo-200 text-sm leading-relaxed max-w-xl">{t('tools.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT: PATIENT LIST */}
        <div className="lg:col-span-1 space-y-4">
          <SectionCard
            title={t('tools.myPatients')}
            subtitle={t('tools.myPatientsHint')}
            icon={<User size={18} className="text-indigo-600" />}
          >
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder={t('tools.patientSearchPh')}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:ring-4 focus:ring-indigo-100 outline-none"
              />
            </div>

            <div className="max-h-[520px] overflow-y-auto custom-scrollbar rounded-xl border border-slate-200">
              {isLoading ? (
                <div className="p-10 flex justify-center">
                  <Loader2 className="animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredPatients.map((p) => {
                    const selected = selectedPatientId === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPatientId(p.id)}
                        className={[
                          'w-full flex items-center gap-3 p-4 text-left transition-colors',
                          selected ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-slate-50',
                        ].join(' ')}
                      >
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
                  })}

                  {filteredPatients.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                      <div className="font-extrabold">{t('tools.noPatients')}</div>
                      <div className="text-sm text-slate-400 mt-1">{t('tools.noPatientsHint')}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-3">
          {!selectedPatient ? (
            <EmptyState
              title={t('tools.selectPatient')}
              desc={t('tools.selectPatientHint')}
              icon={<Boxes size={28} className="opacity-30" />}
            />
          ) : (
            <div className="space-y-6 animate-fadeIn">
              {/* Patient header */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-lg shrink-0">
                    {selectedPatient.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="text-lg md:text-xl font-extrabold text-slate-900 truncate">{selectedPatient.full_name}</div>
                      <StatusBadge status={selectedPatient.status} t={t} />
                    </div>
                    <div className="text-sm text-slate-500 mt-1">{t('tools.patientHeaderHint')}</div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPatientId(null)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-extrabold text-sm hover:bg-slate-50"
                >
                  <X size={16} /> {t('tools.clearSelection')}
                </button>
              </div>

              {/* Tabs */}
              <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                {[
                  { id: 'tcc', label: t('tools.tcc'), icon: <BrainCircuit size={16} />, color: 'text-indigo-700' },
                  { id: 'schema', label: t('tools.schema'), icon: <LayoutGrid size={16} />, color: 'text-rose-700' },
                  { id: 'psycho', label: t('tools.psycho'), icon: <Feather size={16} />, color: 'text-amber-700' },
                ].map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id as ToolTab)}
                    className={[
                      'flex-1 py-3 px-4 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all whitespace-nowrap',
                      activeTool === tool.id ? `bg-slate-50 ${tool.color} shadow-sm border border-slate-100` : 'text-slate-600 hover:text-slate-900',
                    ].join(' ')}
                  >
                    {tool.icon} {tool.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="min-h-[420px]">
                {activeTool === 'tcc' && <TCCPanel patientName={selectedPatient.full_name} t={t} />}

                {activeTool === 'schema' && (
                  <EmptyState
                    title={t('tools.moduleDevTitle')}
                    desc={t('tools.schemaDev')}
                    icon={<LayoutGrid size={28} className="opacity-30" />}
                  />
                )}

                {activeTool === 'psycho' && (
                  <EmptyState
                    title={t('tools.moduleDevTitle')}
                    desc={t('tools.psychoDev')}
                    icon={<Feather size={28} className="opacity-30" />}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
