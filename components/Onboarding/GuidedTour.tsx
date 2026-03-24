import React, { useEffect, useRef, useState, useMemo } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TourStep {
  title: string;
  description: string;
  target?: string;        // CSS selector do elemento a destacar
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  emoji?: string;
  requiredFeature?: string;
}

const ALL_STEPS: TourStep[] = [
  {
    title: 'Sua clínica começa aqui!',
    description: 'O PsiFlux foi projetado para ser intuitivo. Vamos dar uma volta rápida pelos principais recursos para você se sentir em casa.',
    position: 'center',
    emoji: '🚀',
  },
  {
    title: 'Agenda',
    description: 'Gerencie todas as consultas em um único lugar. Crie agendamentos, bloqueie horários, configure recorrências e envie lembretes automáticos para seus pacientes.',
    target: '[data-tour="agenda"]',
    position: 'right',
    emoji: '📅',
    requiredFeature: 'agenda',
  },
  {
    title: 'Pacientes',
    description: 'Cadastre e gerencie seus pacientes com prontuário digital, histórico de consultas, formulários clínicos e importação em massa via planilha.',
    target: '[data-tour="pacientes"]',
    position: 'right',
    emoji: '👥',
    requiredFeature: 'pacientes',
  },
  {
    title: 'Prontuários',
    description: 'Registre evoluções de sessão com assinatura digital, anexe documentos e exporte o prontuário completo em PDF. Seguro e em conformidade com o CFP.',
    target: '[data-tour="prontuarios"]',
    position: 'right',
    emoji: '📋',
    requiredFeature: 'prontuario',
  },
  {
    title: 'Comandas',
    description: 'Crie comandas de atendimento, vincule serviços ao paciente, registre pagamentos e controle o que foi pago ou está em aberto.',
    target: '[data-tour="comandas"]',
    position: 'right',
    emoji: '🧾',
    requiredFeature: 'comandas',
  },
  {
    title: 'Financeiro',
    description: 'Acompanhe o fluxo de caixa da clínica, gere relatórios de receita, emita NFS-e automaticamente e monitore inadimplência em tempo real.',
    target: '[data-tour="financeiro"]',
    position: 'right',
    emoji: '💰',
    requiredFeature: 'financeiro',
  },
  {
    title: 'Serviços & Pacotes',
    description: 'Cadastre os serviços que você oferece com preço e duração. Crie pacotes de sessões com desconto e controle as sessões utilizadas por paciente.',
    target: '[data-tour="servicos"]',
    position: 'right',
    emoji: '🛠️',
    requiredFeature: 'servicos',
  },
  {
    title: 'Formulários & DISC',
    description: 'Aplique formulários clínicos (PHQ-9, GAD-7, Beck) e avaliações DISC. A Aurora analisa os resultados e gera relatórios clínicos detalhados com sugestões terapêuticas.',
    target: '[data-tour="formularios"]',
    position: 'right',
    emoji: '📊',
    requiredFeature: 'formularios',
  },
  {
    title: 'Aurora — Sua IA',
    description: 'A Aurora é sua assistente inteligente. Pergunte qualquer coisa sobre seus pacientes, peça para criar agendamentos, gerar relatórios ou tirar dúvidas sobre o sistema. Toque no botão ✨ no canto da tela.',
    target: '[data-tour="aurora"]',
    position: 'top',
    emoji: '✨',
    requiredFeature: 'aurora_ai',
  },
  {
    title: 'Tudo pronto!',
    description: 'Você conhece os principais recursos do PsiFlux. Se tiver dúvidas, acesse a Central de Ajuda (menu > Ajuda). Bom trabalho! 🎉',
    position: 'center',
    emoji: '🎉',
  },
];

interface GuidedTourProps {
  onFinish: () => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({ onFinish }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [highlight, setHighlight] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const highlightedElRef = useRef<HTMLElement | null>(null);

  // Filtra os passos baseado no plano do usuário
  const STEPS = useMemo(() => {
    const filtered = ALL_STEPS.filter(s => {
      if (!s.requiredFeature) return true;
      return user?.plan_features?.includes(s.requiredFeature);
    });

    // Ajusta o texto final se não houver Aurora
    const last = filtered[filtered.length - 1];
    if (last && last.title === 'Tudo pronto!' && user?.plan_features?.includes('aurora_ai')) {
      last.description = 'Você conhece os principais recursos do PsiFlux. Se tiver dúvidas, acesse a Central de Ajuda (menu > Ajuda) ou converse com a Aurora a qualquer momento. Bom trabalho! 🎉';
    }

    return filtered;
  }, [user]);

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  const clearHighlightEl = () => {
    if (highlightedElRef.current) {
      highlightedElRef.current.style.position = '';
      highlightedElRef.current.style.zIndex = '';
      highlightedElRef.current = null;
    }
  };

  // Find and highlight target element
  useEffect(() => {
    clearHighlightEl();
    if (!current?.target) { setHighlight(null); return; }
    const tryFind = (retries = 0) => {
      const el = document.querySelector(current.target!) as HTMLElement | null;
      if (el) {
        // Scroll first (instant so position is stable), then capture rect in next frame
        el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
        requestAnimationFrame(() => {
          const rect = el.getBoundingClientRect();
          setHighlight(rect);
          el.style.position = 'relative';
          el.style.zIndex = '10002';
          highlightedElRef.current = el;
        });
      } else if (retries < 5) {
        setTimeout(() => tryFind(retries + 1), 200);
      } else {
        setHighlight(null);
      }
    };
    tryFind();
    return () => clearHighlightEl();
  }, [step, current]);

  const goNext = () => {
    if (isLast) { clearHighlightEl(); onFinish(); return; }
    setStep(s => s + 1);
  };

  const goPrev = () => {
    if (!isFirst) setStep(s => s - 1);
  };

  // Compute tooltip position based on highlight rect
  const getTooltipStyle = (): React.CSSProperties => {
    const isMobile = window.innerWidth < 640;

    if (!highlight || current?.position === 'center') {
      return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10001 };
    }

    // On mobile, always anchor tooltip to bottom-center of screen
    if (isMobile) {
      const mw = Math.min(window.innerWidth - 24, 340);
      return {
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10001,
        width: mw,
      };
    }

    const pad = 16;
    const tw = 340;
    const th = 220;
    const pos = current?.position || 'right';

    if (pos === 'right') {
      return {
        position: 'fixed',
        top: Math.min(Math.max(highlight.top + highlight.height / 2 - th / 2, 16), window.innerHeight - th - 16),
        left: Math.min(highlight.right + pad, window.innerWidth - tw - 16),
        zIndex: 10001,
        width: tw,
      };
    }
    if (pos === 'left') {
      return {
        position: 'fixed',
        top: Math.min(Math.max(highlight.top + highlight.height / 2 - th / 2, 16), window.innerHeight - th - 16),
        left: Math.max(highlight.left - tw - pad, 16),
        zIndex: 10001,
        width: tw,
      };
    }
    if (pos === 'top') {
      return {
        position: 'fixed',
        bottom: window.innerHeight - highlight.top + pad,
        left: Math.min(Math.max(highlight.left + highlight.width / 2 - tw / 2, 16), window.innerWidth - tw - 16),
        zIndex: 10001,
        width: tw,
      };
    }
    // bottom
    return {
      position: 'fixed',
      top: highlight.bottom + pad,
      left: Math.min(Math.max(highlight.left + highlight.width / 2 - tw / 2, 16), window.innerWidth - tw - 16),
      zIndex: 10001,
      width: tw,
    };
  };

  if (!current) return null;

  return (
    <>
      {/* Overlay: full dark when no target (center steps) */}
      {!highlight && (
        <div
          className="fixed inset-0 z-[10000] bg-slate-900/75 backdrop-blur-sm"
        />
      )}

      {/* Spotlight: box-shadow creates the dark frame, border highlights the element.
          The element itself is NOT covered — the shadow spreads outward only. */}
      {highlight && (
        <div
          className="fixed z-[10000] rounded-2xl border-2 border-indigo-400 pointer-events-none transition-all duration-300"
          style={{
            top: highlight.top - 6,
            left: highlight.left - 6,
            width: highlight.width + 12,
            height: highlight.height + 12,
            boxShadow: '0 0 0 9999px rgba(2,6,23,0.75), 0 0 0 4px rgba(99,102,241,0.3)',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="bg-white rounded-[24px] shadow-2xl p-6 w-[340px] animate-[slideDownFade_0.25s_ease-out]"
        style={getTooltipStyle()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{current.emoji}</span>
            <div>
              <p className="font-bold text-slate-800 text-sm">{current.title}</p>
              <p className="text-[10px] text-slate-400 font-medium">
                Passo {step + 1} de {STEPS.length}
              </p>
            </div>
          </div>
          <button
            onClick={() => { clearHighlightEl(); onFinish(); }}
            className="p-1.5 rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all"
            title="Fechar tour"
          >
            <X size={15} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 leading-relaxed mb-5">
          {current.description}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={goPrev}
            disabled={isFirst}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={13} /> Anterior
          </button>

          {/* Dots */}
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all ${
                  i === step ? 'w-4 h-2 bg-indigo-500' : 'w-2 h-2 bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={goNext}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              isLast
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-100'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100'
            }`}
          >
            {isLast ? (
              <><CheckCircle size={13} /> Concluir</>
            ) : (
              <>Próximo <ChevronRight size={13} /></>
            )}
          </button>
        </div>
      </div>
    </>
  );
};
