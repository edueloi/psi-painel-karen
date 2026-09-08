import React from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

/**
 * Envolve qualquer conteúdo com uma animação de entrada (fade + slide-up)
 * disparada quando o elemento entra na viewport. `delay` (ms) permite
 * escalonar itens de uma lista/grid para não aparecerem todos de uma vez.
 */
export const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  as?: keyof React.JSX.IntrinsicElements;
}> = ({ children, delay = 0, className, style, as = 'div' }) => {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();
  const Tag = as as React.ElementType;

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(22px)',
        transition: `opacity .6s ease ${delay}ms, transform .6s cubic-bezier(.22,1,.36,1) ${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
};
