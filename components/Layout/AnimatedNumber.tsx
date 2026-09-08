import React, { useEffect, useState } from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

/**
 * Anima um número subindo de 0 até `value` quando entra na viewport.
 * `prefix`/`suffix` decoram o valor final (ex: "R$", "/mês", "+").
 */
export const AnimatedNumber: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ value, prefix = '', suffix = '', decimals = 0, duration = 1100, className, style }) => {
  const { ref, visible } = useScrollReveal<HTMLSpanElement>();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setDisplay(value); return; }

    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, value, duration]);

  return (
    <span ref={ref} className={className} style={{ ...style, fontVariantNumeric: 'tabular-nums' }}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  );
};
