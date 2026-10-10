import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Smile, Check, Loader2, Trash2, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { cn } from '@/src/lib/utils';
import { DarkButton, DarkCard, DarkTextarea } from './Dark';

export const SESSION_MOOD_SCALE = [
  { score: 1, emoji: '😞', label: 'Muito abalado' },
  { score: 2, emoji: '😕', label: 'Abalado' },
  { score: 3, emoji: '😐', label: 'Neutro' },
  { score: 4, emoji: '🙂', label: 'Bem' },
  { score: 5, emoji: '😄', label: 'Muito bem' },
] as const;

// Subconjunto da lista aceita pelo backend (patients.js — MOOD_EMOTIONS).
export const MOOD_EMOTIONS = ['ansioso', 'triste', 'irritado', 'calmo', 'esperançoso', 'cansado', 'confuso'] as const;

type MoodLog = { id: number; appointment_id?: number | null; mood_score: number; emotions?: string | null; note?: string | null; recorded_at: string };

const hhmm = (iso?: string | null) => {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};
const emojiOf = (score: number) => SESSION_MOOD_SCALE.find(m => m.score === score)?.emoji ?? '';

export const SessionMoodPicker: React.FC<{ patientId: number; appointmentId: number | null }> = ({ patientId, appointmentId }) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logId, setLogId] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [wasUpdate, setWasUpdate] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [history, setHistory] = useState<MoodLog[]>([]);
  const logIdRef = useRef<number | null>(null);
  logIdRef.current = logId;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await api.get<MoodLog[]>(`/patients/${patientId}/mood-logs`);
      const rows = Array.isArray(all) ? all : [];
      setHistory(rows.slice(0, 5));
      const current = appointmentId ? rows.find(r => Number(r.appointment_id) === Number(appointmentId)) : null;
      if (current) {
        setLogId(current.id);
        setScore(current.mood_score);
        setEmotions(current.emotions ? current.emotions.split(',').filter(Boolean) : []);
        setNote(current.note || '');
        setSavedAt(current.recorded_at);
        setWasUpdate(true);
      }
    } catch {
      // histórico é contexto opcional; a falha não bloqueia o registro
    } finally {
      setLoading(false);
    }
  }, [patientId, appointmentId]);

  useEffect(() => { load(); }, [load]);

  const persist = async (next: { score: number; emotions: string[]; note: string }) => {
    setSaving(true);
    try {
      const body = { mood_score: next.score, emotions: next.emotions, note: next.note.trim() || undefined, appointment_id: appointmentId || undefined };
      let res: any;
      if (logIdRef.current) res = await api.put<any>(`/patients/${patientId}/mood-logs/${logIdRef.current}`, body);
      else res = await api.post<any>(`/patients/${patientId}/mood-logs`, body);
      const update = !!logIdRef.current || !!res?.updated;
      if (res?.id) setLogId(res.id);
      setWasUpdate(update);
      setSavedAt(new Date().toISOString());
      setDirty(false);
      const fresh = await api.get<MoodLog[]>(`/patients/${patientId}/mood-logs`).catch(() => null);
      if (Array.isArray(fresh)) setHistory(fresh.slice(0, 5));
    } catch (err: any) {
      toastError('Erro ao registrar humor', err?.message || '');
    } finally {
      setSaving(false);
    }
  };

  const pick = (s: number) => {
    if (saving) return;
    setScore(s);
    persist({ score: s, emotions, note });
  };

  const toggleEmotion = (e: string) => {
    setEmotions(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
    setDirty(true);
  };

  const clear = async () => {
    if (!logId) return;
    setSaving(true);
    try {
      await api.delete(`/patients/${patientId}/mood-logs/${logId}`);
      setLogId(null); setScore(null); setEmotions([]); setNote(''); setSavedAt(null); setDirty(false); setWasUpdate(false);
      toastSuccess('Humor removido', 'O registro desta sessão foi apagado.');
      load();
    } catch (err: any) {
      toastError('Erro ao remover humor', err?.message || '');
    } finally {
      setSaving(false);
    }
  };

  // Últimos 5 em ordem cronológica + tendência (último vs. média dos anteriores)
  const trend = useMemo(() => {
    const chrono = [...history].reverse();
    if (chrono.length < 2) return null;
    const last = chrono[chrono.length - 1].mood_score;
    const prev = chrono.slice(0, -1);
    const avg = prev.reduce((a, r) => a + r.mood_score, 0) / prev.length;
    const diff = last - avg;
    if (diff > 0.5) return { Icon: TrendingUp, label: 'Subiu', cls: 'text-emerald-400' };
    if (diff < -0.5) return { Icon: TrendingDown, label: 'Desceu', cls: 'text-red-400' };
    return { Icon: Minus, label: 'Igual', cls: 'text-slate-400' };
  }, [history]);

  return (
    <DarkCard className="flex flex-col gap-2.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
        <Smile size={14} className="text-primary-400" /> Como o paciente pareceu nesta sessão?
      </span>

      {!appointmentId && (
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-300">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          Esta sala não está ligada a um agendamento: o humor será registrado como avulso.
        </p>
      )}

      <div role="group" aria-label="Humor do paciente nesta sessão" className="flex justify-between gap-1.5">
        {SESSION_MOOD_SCALE.map(m => {
          const active = score === m.score;
          return (
            <button
              key={m.score}
              type="button"
              onClick={() => pick(m.score)}
              disabled={saving || loading}
              aria-pressed={active}
              aria-label={`${m.label} (${m.score} de 5)`}
              title={m.label}
              className={cn(
                'flex min-h-[44px] flex-1 flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 disabled:cursor-not-allowed',
                active ? 'border-primary-500 bg-primary-500/20' : 'border-white/10 bg-white/[0.03] hover:bg-white/10',
                saving && !active && 'opacity-50'
              )}
            >
              <span className="text-xl leading-none">{m.emoji}</span>
              <span className="text-[10px] font-medium leading-tight text-slate-400">{m.label}</span>
            </button>
          );
        })}
      </div>

      <div role="group" aria-label="Emoções observadas" className="flex flex-wrap gap-1.5">
        {MOOD_EMOTIONS.map(e => {
          const active = emotions.includes(e);
          return (
            <button
              key={e}
              type="button"
              aria-pressed={active}
              onClick={() => toggleEmotion(e)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                active ? 'border-primary-500 bg-primary-500/20 text-primary-200' : 'border-white/10 text-slate-400 hover:bg-white/10'
              )}
            >
              {e}
            </button>
          );
        })}
      </div>

      <DarkTextarea
        aria-label="Observação sobre o humor (opcional)"
        placeholder="Observação sobre o humor (opcional)"
        rows={2}
        maxLength={500}
        value={note}
        onChange={e => { setNote(e.target.value); setDirty(true); }}
        className="!min-h-[56px] !text-xs"
      />

      <div className="flex flex-wrap items-center gap-2">
        {score !== null && (
          <DarkButton size="xs" variant="primary" onClick={() => persist({ score, emotions, note })} loading={saving} disabled={!dirty && !!savedAt}>
            {logId ? 'Atualizar humor' : 'Registrar humor'}
          </DarkButton>
        )}
        {logId && (
          <DarkButton size="xs" variant="ghost" onClick={clear} disabled={saving} iconLeft={<Trash2 size={12} />}>Limpar</DarkButton>
        )}
        <span aria-live="polite" className="ml-auto text-[11px] text-slate-400">
          {saving ? (
            <span className="flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Salvando...</span>
          ) : savedAt && !dirty ? (
            <span className="flex items-center gap-1 text-emerald-400"><Check size={11} /> {wasUpdate ? 'Atualizado' : 'Registrado'} às {hhmm(savedAt)}</span>
          ) : dirty ? 'Alterações não salvas' : ''}
        </span>
      </div>

      {history.length > 0 && (
        <div className="flex items-center gap-2 border-t border-white/10 pt-2" aria-label="Últimos humores do paciente">
          <span className="text-[11px] text-slate-500">Últimos</span>
          <div className="flex items-center gap-1">
            {[...history].reverse().map(h => (
              <span key={h.id} title={`${new Date(h.recorded_at).toLocaleDateString('pt-BR')} — nota ${h.mood_score}`} className="text-base leading-none">{emojiOf(h.mood_score)}</span>
            ))}
          </div>
          {trend && (
            <span className={cn('ml-auto flex items-center gap-1 text-[11px] font-medium', trend.cls)}>
              <trend.Icon size={12} /> {trend.label}
            </span>
          )}
        </div>
      )}
    </DarkCard>
  );
};
