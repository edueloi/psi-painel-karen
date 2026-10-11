import { useCallback, useEffect, useRef, useState } from 'react';
import type { Answers } from './scoring';
import { mergeAnswers, type AnswerPatch } from './api';

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Salvamento automático a cada resposta: aplica o patch na hora (UI otimista) e envia ao servidor em fila
 * (uma requisição por vez, acumulando patches). Em caso de falha mantém o patch pendente e tenta de novo
 * sozinho; nada se perde enquanto a aba estiver aberta (e há aviso ao fechar com pendências).
 */
export function useAnswerSync(initial: Answers, save: (patch: AnswerPatch) => Promise<void>, enabled = true) {
  const [answers, setAnswers] = useState<Answers>(initial);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const pending = useRef<AnswerPatch>({});
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; if (timer.current) clearTimeout(timer.current); }; }, []);

  const flush = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) return false;
    if (Object.keys(pending.current).length === 0) return true;
    inFlight.current = true;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const patch = pending.current;
    pending.current = {};
    if (alive.current) setStatus('saving');
    try {
      await saveRef.current(patch);
      inFlight.current = false;
      if (Object.keys(pending.current).length > 0) return flush();
      if (alive.current) { setStatus('saved'); setLastError(null); }
      return true;
    } catch (e: any) {
      inFlight.current = false;
      // devolve o patch à fila (respostas mais novas vencem)
      pending.current = { ...patch, ...pending.current };
      // erro de regra (ex.: inventário concluído/link inválido) não adianta repetir
      const fatal = e?.status === 409 || e?.status === 410 || e?.status === 404;
      if (alive.current) {
        setStatus('error');
        setLastError(e?.message || 'Não foi possível salvar.');
        if (!fatal) timer.current = setTimeout(() => { void flush(); }, 5000);
      }
      return false;
    }
  }, []);

  const setAnswer = useCallback((patch: AnswerPatch) => {
    if (!enabled) return;
    setAnswers(prev => mergeAnswers(prev, patch));
    pending.current = { ...pending.current, ...patch };
    void flush();
  }, [enabled, flush]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length > 0 || inFlight.current) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const hasPending = () => Object.keys(pending.current).length > 0 || inFlight.current;
  return { answers, setAnswers, setAnswer, status, lastError, flush, hasPending };
}
