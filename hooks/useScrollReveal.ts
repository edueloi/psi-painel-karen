import { useEffect, useRef, useState } from "react";

/**
 * Detecta quando um elemento entra na viewport para animar fade-in/slide-up
 * de forma leve — usado nas páginas públicas de marketing (Home,
 * Funcionalidades, Planos, Sobre). Respeita prefers-reduced-motion.
 */
export function useScrollReveal<
  T extends HTMLElement = HTMLDivElement,
>(options?: { threshold?: number; rootMargin?: string }) {
  const ref = useRef<T | null>(null);
  // O HTML pré-renderizado deve permanecer legível, mesmo sem JavaScript.
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    if (el.getBoundingClientRect().top > window.innerHeight) setVisible(false);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: options?.threshold ?? 0.15,
        rootMargin: options?.rootMargin ?? "0px 0px -40px 0px",
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [options?.threshold, options?.rootMargin]);

  return { ref, visible };
}
