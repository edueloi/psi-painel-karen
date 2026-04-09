import { useEffect, useRef, useCallback } from 'react';

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'touchmove',
  'scroll',
  'click',
  'wheel',
] as const;

/**
 * Desloga o usuário após `timeoutMs` de inatividade (padrão: 120 minutos).
 * O timer é resetado a cada interação do usuário com a página.
 */
export function useInactivityTimeout(
  onLogout: () => void,
  timeoutMs: number = 2 * 60 * 60 * 1000 // 120 minutos
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutRef = useRef(onLogout);

  // Mantém a referência atualizada sem re-registrar os listeners
  useEffect(() => {
    logoutRef.current = onLogout;
  }, [onLogout]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      logoutRef.current();
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    // Inicia o timer ao montar
    resetTimer();

    // Adiciona listeners em modo passivo (sem custo de performance)
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer]);
}
