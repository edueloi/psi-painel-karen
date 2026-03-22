import React from 'react';
import {
  Sparkles, Calendar, Users, DollarSign, MessageCircle,
  Video, BookOpen, ChevronRight, ArrowRight, Star, Zap
} from 'lucide-react';

interface WelcomeModalProps {
  userName: string;
  onStartTour: () => void;
  onSkip: () => void;
}

const FEATURES = [
  { icon: <Calendar size={20} />, color: 'bg-sky-500',    label: 'Agenda Inteligente',    desc: 'Consultas, lembretes e recorrências automáticas' },
  { icon: <Users size={20} />,    color: 'bg-indigo-500', label: 'Gestão de Pacientes',  desc: 'Prontuários, histórico e formulários clínicos' },
  { icon: <DollarSign size={20} />, color: 'bg-emerald-500', label: 'Financeiro Completo', desc: 'Comandas, NFS-e e relatórios detalhados' },
  { icon: <Video size={20} />,    color: 'bg-violet-500', label: 'Sala Virtual',          desc: 'Videoconsultas integradas sem apps externos' },
  { icon: <BookOpen size={20} />, color: 'bg-amber-500',  label: 'Formulários & DISC',   desc: 'Avaliações com análise inteligente da Aurora' },
  { icon: <Sparkles size={20} />, color: 'bg-rose-500',   label: 'Aurora IA',            desc: 'Assistente que gerencia sua clínica por você' },
];

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ userName, onStartTour, onSkip }) => {
  const firstName = userName?.split(' ')[0] || 'bem-vindo';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-[24px] sm:rounded-[32px] shadow-2xl overflow-hidden animate-[slideDownFade_0.3s_ease-out] my-auto">

        {/* Header gradient */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 px-5 py-5 sm:px-8 sm:py-8 text-white text-center overflow-hidden">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-violet-500 rounded-full blur-[80px] opacity-50" />
          <div className="absolute -left-10 bottom-0 w-36 h-36 bg-sky-400 rounded-full blur-[60px] opacity-30" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-3 py-1 text-[11px] font-bold mb-3 sm:mb-4 backdrop-blur-sm">
              <Star size={11} className="text-amber-300" /> Primeiro Acesso
            </div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3 backdrop-blur-sm border border-white/25 shadow-xl">
              <Sparkles size={22} className="text-white sm:hidden" />
              <Sparkles size={30} className="text-white hidden sm:block" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1.5">
              Olá, {firstName}! 👋
            </h1>
            <p className="text-indigo-200 text-sm sm:text-base max-w-sm mx-auto">
              Seja bem-vindo(a) ao <span className="text-white font-bold">PsiFlux</span> — gestão completa do seu consultório.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-8 py-4 sm:py-6">
          <p className="text-xs sm:text-sm text-slate-500 text-center mb-3 sm:mb-4">
            Tudo disponível para você começar:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl ${f.color} flex items-center justify-center shrink-0 text-white shadow-sm`}>
                  <span className="[&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5">{f.icon}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-[11px] sm:text-xs leading-tight">{f.label}</p>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 leading-tight hidden sm:block">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-5 flex items-start gap-2.5">
            <Zap size={14} className="text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[11px] sm:text-xs text-indigo-700 leading-relaxed">
              <span className="font-bold">Dica:</span> A Aurora pode criar agendamentos e gerar relatórios apenas com texto!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <button
              onClick={onSkip}
              className="flex-1 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all"
            >
              Explorar sozinho
            </button>
            <button
              onClick={onStartTour}
              className="flex-1 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95"
            >
              Fazer o tour guiado <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
