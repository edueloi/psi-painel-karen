import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RoomEvent, type Room, type LocalParticipant } from 'livekit-client';
import { ChevronLeft, ChevronRight, Eye, Pencil, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { DarkBadge, DarkButton, DarkCard, DarkTextarea } from './Dark';

// ─────────────────────────────────────────────────────────────────────────────
// Teste em aplicação durante a chamada: estado compartilhado em tempo real pelo
// canal de dados do LiveKit (tópico 'test-session').
// Quem responde (psicólogo ou paciente) edita; o outro lado acompanha em leitura.
// Não calcula escore nem interpretação — só espelha perguntas e marcações.
// ─────────────────────────────────────────────────────────────────────────────

export const TEST_SESSION_TOPIC = 'test-session';
// Limite seguro p/ mensagens reliable do LiveKit (~15 KiB).
const MAX_PAYLOAD_BYTES = 14000;

export type TestQuestion = {
  id: string;
  type: string;
  text: string;
  required?: boolean;
  options?: { label: string; value: number }[];
};

export type TestSessionState = {
  title: string;
  formId?: number;
  hash?: string;
  questions: TestQuestion[];
  /** índice da opção (radio/select), lista de índices (checkbox) ou texto/número */
  answers: Record<string, any>;
  current: number;
  total: number;
  answeredCount: number;
  answeredBy: 'host' | 'guest';
};

type Msg =
  | { type: 'psi-test-session'; kind: 'start'; title: string; formId?: number; hash?: string; questions: TestQuestion[]; total: number; answers: Record<string, any>; current: number; answeredCount: number; answeredBy: 'host' | 'guest' }
  | { type: 'psi-test-session'; kind: 'answer'; qid: string; value: any; answeredCount: number }
  | { type: 'psi-test-session'; kind: 'nav'; index: number }
  | { type: 'psi-test-session'; kind: 'end' };

const isAnswered = (v: any) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== '');

export function useTestSession(room: Room, localParticipant: LocalParticipant, isHost: boolean, remoteCount: number) {
  const [session, setSession] = useState<TestSessionState | null>(null);
  const [incomingStart, setIncomingStart] = useState(0); // incrementa quando o paciente recebe um teste novo (abre o painel)
  const sessionRef = useRef<TestSessionState | null>(null);
  sessionRef.current = session;

  const publish = useCallback((msg: Msg) => {
    try {
      const data = new TextEncoder().encode(JSON.stringify(msg));
      void localParticipant.publishData(data, { reliable: true, topic: TEST_SESSION_TOPIC }).catch(() => {});
    } catch {}
  }, [localParticipant]);

  const publishStart = useCallback((s: TestSessionState) => {
    const base = { type: 'psi-test-session' as const, kind: 'start' as const, title: s.title, formId: s.formId, hash: s.hash, total: s.total, answers: s.answers, current: s.current, answeredCount: s.answeredCount, answeredBy: s.answeredBy };
    let msg: Msg = { ...base, questions: s.questions };
    // Estrutura grande demais: sincroniza só nome, progresso e respostas.
    if (new TextEncoder().encode(JSON.stringify(msg)).length > MAX_PAYLOAD_BYTES) msg = { ...base, questions: [], answers: {} };
    publish(msg);
  }, [publish]);

  useEffect(() => {
    const onData = (payload: Uint8Array, _p?: unknown, _k?: unknown, topic?: string) => {
      let msg: any;
      try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (msg?.type !== 'psi-test-session' && topic !== TEST_SESSION_TOPIC) return;
      if (msg.type !== 'psi-test-session') return;
      if (msg.kind === 'start') {
        setSession({
          title: msg.title, formId: msg.formId, hash: msg.hash, questions: msg.questions || [], answers: msg.answers || {},
          current: msg.current || 0, total: msg.total || (msg.questions || []).length, answeredCount: msg.answeredCount || 0, answeredBy: msg.answeredBy,
        });
        setIncomingStart(n => n + 1);
      } else if (msg.kind === 'answer') {
        setSession(prev => prev ? { ...prev, answers: { ...prev.answers, [msg.qid]: msg.value }, answeredCount: msg.answeredCount ?? prev.answeredCount } : prev);
      } else if (msg.kind === 'nav') {
        setSession(prev => prev ? { ...prev, current: msg.index } : prev);
      } else if (msg.kind === 'end') {
        setSession(null);
      }
    };
    room.on(RoomEvent.DataReceived, onData as any);
    return () => { room.off(RoomEvent.DataReceived, onData as any); };
  }, [room]);

  // Quem entra no meio do teste (ou reconecta) recebe o estado atual.
  useEffect(() => {
    if (isHost && sessionRef.current && remoteCount > 0) {
      const t = window.setTimeout(() => sessionRef.current && publishStart(sessionRef.current), 600);
      return () => window.clearTimeout(t);
    }
  }, [isHost, remoteCount, publishStart]);

  const start = useCallback((init: { title: string; formId?: number; hash?: string; questions: TestQuestion[]; answeredBy: 'host' | 'guest' }) => {
    const s: TestSessionState = { ...init, answers: {}, current: 0, total: init.questions.length, answeredCount: 0 };
    setSession(s);
    publishStart(s);
  }, [publishStart]);

  const canEdit = !!session && ((session.answeredBy === 'host') === isHost);

  const answer = useCallback((qid: string, value: any) => {
    const cur = sessionRef.current;
    if (!cur) return;
    const answers = { ...cur.answers, [qid]: value };
    const answeredCount = Object.values(answers).filter(isAnswered).length;
    setSession({ ...cur, answers, answeredCount });
    publish({ type: 'psi-test-session', kind: 'answer', qid, value, answeredCount });
  }, [publish]);

  const goTo = useCallback((index: number) => {
    const cur = sessionRef.current;
    if (!cur) return;
    const i = Math.max(0, Math.min(index, Math.max(cur.total - 1, 0)));
    setSession({ ...cur, current: i });
    publish({ type: 'psi-test-session', kind: 'nav', index: i });
  }, [publish]);

  const end = useCallback((notify = true) => {
    setSession(null);
    if (notify) publish({ type: 'psi-test-session', kind: 'end' });
  }, [publish]);

  return { session, canEdit, incomingStart, start, answer, goTo, end };
}

// ── Visual do teste em andamento (perguntas + marcações) ─────────────────────
export const TestSessionView: React.FC<{
  session: TestSessionState;
  canEdit: boolean;
  isHost: boolean;
  onAnswer: (qid: string, value: any) => void;
  onGoTo: (index: number) => void;
  onEnd?: () => void;
}> = ({ session, canEdit, isHost, onAnswer, onGoTo, onEnd }) => {
  const q = session.questions[session.current];
  const value = q ? session.answers[q.id] : undefined;
  const who = session.answeredBy === 'host' ? 'o profissional' : 'o paciente';
  const pct = session.total ? Math.round((session.answeredCount / session.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      <DarkCard className="flex flex-col gap-2 !border-primary-500/30 !bg-primary-500/[0.08]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-primary-300">Teste em aplicação</p>
            <p className="text-sm font-medium text-white">{session.title}</p>
          </div>
          <DarkBadge tone={canEdit ? 'success' : 'neutral'}>
            {canEdit ? <><Pencil size={10} /> Você responde</> : <><Eye size={10} /> Só leitura</>}
          </DarkBadge>
        </div>
        <p className="text-[11px] text-slate-400">
          {canEdit ? 'As marcações aparecem em tempo real para a outra pessoa.' : `Você acompanha em tempo real o que ${who} está marcando.`}
        </p>
        <div className="flex items-center gap-2" aria-label="Progresso do teste">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-primary-500 transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] text-slate-400">{session.answeredCount}/{session.total || '?'}</span>
        </div>
      </DarkCard>

      {!q ? (
        <DarkCard>
          <p className="text-xs text-slate-300">
            {session.total
              ? `Pergunta ${Math.min(session.current + 1, session.total)} de ${session.total}.`
              : 'Aplicação em andamento.'}{' '}
            As perguntas não puderam ser exibidas nesta sala; o progresso é sincronizado em tempo real.
          </p>
        </DarkCard>
      ) : (
        <DarkCard className="flex flex-col gap-3">
          <p className="text-[11px] text-slate-500">Pergunta {session.current + 1} de {session.total}</p>
          <p className="text-[13px] font-medium leading-snug text-slate-100">{q.text}</p>

          {(q.type === 'radio' || q.type === 'select') && (
            <div role="radiogroup" aria-label={q.text} className="flex flex-col gap-1.5">
              {(q.options || []).map((o, i) => {
                const active = value === i;
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!canEdit}
                    onClick={() => onAnswer(q.id, i)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                      active ? 'border-primary-500 bg-primary-500/20 text-white' : 'border-white/10 bg-white/[0.03] text-slate-300',
                      canEdit ? 'hover:bg-white/10' : 'cursor-default'
                    )}
                  >
                    <span className={cn('h-3.5 w-3.5 shrink-0 rounded-full border', active ? 'border-primary-400 bg-primary-500' : 'border-slate-500')} />
                    {o.label}
                  </button>
                );
              })}
            </div>
          )}

          {q.type === 'checkbox' && (
            <div role="group" aria-label={q.text} className="flex flex-col gap-1.5">
              {(q.options || []).map((o, i) => {
                const list: number[] = Array.isArray(value) ? value : [];
                const active = list.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    role="checkbox"
                    aria-checked={active}
                    disabled={!canEdit}
                    onClick={() => onAnswer(q.id, active ? list.filter(x => x !== i) : [...list, i])}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                      active ? 'border-primary-500 bg-primary-500/20 text-white' : 'border-white/10 bg-white/[0.03] text-slate-300',
                      canEdit ? 'hover:bg-white/10' : 'cursor-default'
                    )}
                  >
                    <span className={cn('h-3.5 w-3.5 shrink-0 rounded border', active ? 'border-primary-400 bg-primary-500' : 'border-slate-500')} />
                    {o.label}
                  </button>
                );
              })}
            </div>
          )}

          {(q.type === 'text' || q.type === 'number') && (
            <input
              aria-label={q.text}
              type={q.type === 'number' ? 'number' : 'text'}
              value={value ?? ''}
              readOnly={!canEdit}
              onChange={e => onAnswer(q.id, e.target.value)}
              className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-[13px] text-slate-100 outline-none focus:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/30"
            />
          )}
          {q.type === 'textarea' && (
            <DarkTextarea aria-label={q.text} rows={3} value={value ?? ''} readOnly={!canEdit} onChange={e => onAnswer(q.id, e.target.value)} />
          )}

          <div className="flex items-center justify-between gap-2">
            <DarkButton size="sm" onClick={() => onGoTo(session.current - 1)} disabled={session.current <= 0 || !canEdit} iconLeft={<ChevronLeft size={14} />}>Anterior</DarkButton>
            <DarkButton size="sm" onClick={() => onGoTo(session.current + 1)} disabled={session.current >= session.total - 1 || !canEdit} iconRight={<ChevronRight size={14} />}>Próxima</DarkButton>
          </div>
        </DarkCard>
      )}

      {isHost && onEnd && (
        <DarkButton fullWidth onClick={onEnd} iconLeft={<X size={14} />}>Encerrar aplicação</DarkButton>
      )}
    </div>
  );
};
