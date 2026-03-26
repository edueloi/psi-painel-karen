import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, getStaticUrl } from '../../services/api';
import {
  CheckCircle,
  Activity,
  ArrowRight,
  ShieldCheck,
  Info,
  Sparkles
} from 'lucide-react';

const BDI_ITEMS = [
  { id: 1, text: "Em relação à tristeza:" },
  { id: 2, text: "Em relação ao pessimismo:" },
  { id: 3, text: "Em relação às falhas passadas:" },
  { id: 4, text: "Em relação à perda de prazer:" },
  { id: 5, text: "Em relação a sentimentos de culpa:" },
  { id: 6, text: "Em relação a sentimentos de punição:" },
  { id: 7, text: "Em relação à autoestima:" },
  { id: 8, text: "Em relação ao autocriticismo:" },
  { id: 9, text: "Em relação a pensamentos ou desejos suicidas:" },
  { id: 10, text: "Em relação ao choro:" },
  { id: 11, text: "Em relação à agitação:" },
  { id: 12, text: "Em relação à perda de interesse:" },
  { id: 13, text: "Em relação à indecisão:" },
  { id: 14, text: "Em relação ao sentimento de inutilidade:" },
  { id: 15, text: "Em relação à perda de energia:" },
  { id: 16, text: "Em relação às mudanças no padrão de sono:" },
  { id: 17, text: "Em relação à irritabilidade:" },
  { id: 18, text: "Em relação às mudanças no apetite:" },
  { id: 19, text: "Em relação à dificuldade de concentração:" },
  { id: 20, text: "Em relação ao cansaço ou fadiga:" },
  { id: 21, text: "Em relação à perda de interesse em sexo:" },
];

export const BDIPublic: React.FC = () => {
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('p');
  const professionalId = searchParams.get('u');

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [professional, setProfessional] = useState<any>(null);

  useEffect(() => {
    if (professionalId) {
      api.get(`/public-profile/token/${professionalId}`).then(setProfessional).catch(() => {});
    }
  }, [professionalId]);

  useEffect(() => {
    if (professional) {
      const profName = professional.name || 'Psicólogo(a)';
      const specialty = professional.specialty || 'Psicologia';
      const crp = professional.crp ? ` (${professional.crp})` : '';
      const fullTitle = `BDI-II | ${profName} ${crp}`;

      document.title = fullTitle;

      const description = `Inventário de Depressão de Beck (BDI-II) solicitado por ${profName} (${specialty}). Sua saúde mental em foco.`;

      const setMeta = (attr: string, key: string, content: string) => {
        let el = document.querySelector(`meta[${attr}="${key}"]`);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute(attr, key);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      };

      setMeta('name', 'description', description);
      setMeta('property', 'og:title', fullTitle);
      setMeta('property', 'og:description', description);
      setMeta('property', 'og:type', 'website');
      setMeta('property', 'og:site_name', 'PsiFlux Clinical');
      if (professional.clinic_logo_url) {
        setMeta('property', 'og:image', getStaticUrl(professional.clinic_logo_url));
        setMeta('property', 'og:image:alt', fullTitle);
        setMeta('property', 'og:image:width', '1200');
        setMeta('property', 'og:image:height', '630');
      }
    } else {
      document.title = "BDI-II | PsiFlux";
    }
  }, [professional]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(answers).length < 21) {
      alert('Por favor, responda todas as questões.');
      return;
    }

    setLoading(true);
    try {
      const total = Object.values(answers).reduce((a, b) => a + b, 0);
      const finalScores = { total };

      const uParam = professionalId ? `?u=${professionalId}` : '';
      const resp = await api.get<any[]>(`/public-profile/bdi-ii/${patientId}${uParam}`);
      const currentHistory = Array.isArray(resp) ? resp : [];

      const newResult = {
        id: Date.now(),
        date: new Date().toISOString(),
        answers,
        scores: finalScores,
        origin: 'external'
      };

      await api.post(`/public-profile/bdi-ii/${patientId}${uParam}`, {
        data: [...currentHistory, newResult]
      });

      setSubmitted(true);
    } catch (err) {
      setError('Ocorreu um erro ao enviar suas respostas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white rounded-[4rem] shadow-2xl p-16 max-w-lg w-full space-y-10 animate-in fade-in zoom-in duration-700">
          <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto border border-rose-100 shadow-inner">
            <CheckCircle className="text-rose-500" size={48} />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none uppercase italic">Concluído!</h2>
            <p className="text-base text-slate-500 font-bold leading-relaxed italic opacity-80">
              Suas respostas foram encaminhadas com segurança ao seu psicólogo(a). Ele(a) discutirá os resultados com você na próxima sessão.
            </p>
          </div>
          <div className="pt-8 border-t border-slate-50 flex items-center justify-center gap-3">
             <ShieldCheck size={18} className="text-slate-300" />
             <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">Criptografia PsiFlux 256-bit</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaff] font-sans pb-24 selection:bg-rose-100 italic-text-none">
      <div className="bg-gradient-to-br from-rose-700 via-rose-600 to-slate-800 text-white py-10 md:py-20 px-6 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none rotate-12 scale-125">
            <Activity size={320} />
         </div>
         <div className="absolute -top-24 -left-20 w-96 h-96 bg-white/5 rounded-full blur-[120px] pointer-events-none" />

         <div className="max-w-3xl mx-auto space-y-8 relative z-10 animate-in fade-in slide-in-from-top-4 duration-700 text-center md:text-left">
            <div className="flex items-center gap-3 bg-white/10 w-fit px-5 py-2.5 rounded-full border border-white/20 backdrop-blur-md mx-auto md:mx-0 shadow-xl">
               <ShieldCheck size={18} className="text-rose-200" />
               <span className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-50">Protocolo Beck — Depressão</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-8xl font-black tracking-tighter leading-none uppercase italic transform -skew-x-2 drop-shadow-2xl">BDI-II</h1>
              <p className="text-rose-100 font-medium text-lg md:text-2xl leading-relaxed italic opacity-90 max-w-2xl mx-auto md:mx-0">
                Avaliação padronizada de sintomas depressivos.
              </p>
            </div>

            {professional && (
              <div className="pt-3 md:pt-8 flex flex-row items-center gap-3 md:gap-6 group">
                 <div className="relative">
                    <div className="absolute -inset-2 bg-gradient-to-tr from-white/30 to-white/10 rounded-[2.2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    {professional.clinic_logo_url ? (
                      <img
                        src={getStaticUrl(professional.clinic_logo_url)}
                        alt={professional.company_name || professional.name}
                        className="w-12 h-12 md:w-24 md:h-24 rounded-2xl md:rounded-[2.2rem] bg-white border-4 md:border-8 border-white/20 shadow-xl object-contain p-1 md:p-2 relative z-10"
                      />
                    ) : (
                      <div className="w-10 h-10 md:w-20 md:h-20 rounded-xl md:rounded-[1.8rem] bg-white/20 border-2 border-white/30 flex items-center justify-center font-black text-xl md:text-3xl relative z-10">
                          {professional.name?.[0]}
                      </div>
                    )}
                 </div>

                 <div className="text-left">
                    <p className="text-rose-200 font-bold uppercase tracking-widest text-[9px] mb-0.5 opacity-70">Psicólogo(a) Responsável</p>
                    <p className="font-black text-base md:text-4xl tracking-tight leading-tight">{professional.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {professional.specialty && (
                        <span className="text-[10px] md:text-[12px] font-bold text-rose-50/90 bg-white/10 px-2 md:px-4 py-1 md:py-1.5 rounded-full border border-white/10 whitespace-nowrap">{professional.specialty}</span>
                      )}
                      {professional.crp && (
                        <span className="text-[10px] md:text-[12px] font-black bg-slate-950/40 px-2 md:px-4 py-1 md:py-1.5 rounded-full border border-white/10 text-white leading-none">
                          CRP {professional.crp}
                        </span>
                      )}
                    </div>
                 </div>
              </div>
            )}
         </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 md:px-4 mt-0 md:-mt-12 space-y-3 md:space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
         <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-12 shadow-lg md:shadow-[0_40px_100px_-20px_rgba(30,41,59,0.08)] space-y-4 md:space-y-8 relative z-20 overflow-hidden">
            <div className="flex items-center gap-3 text-rose-600">
               <div className="w-9 h-9 md:w-16 md:h-16 bg-rose-50 rounded-xl md:rounded-[1.8rem] flex items-center justify-center border border-rose-100/30 shrink-0">
                  <Info size={18} className="md:hidden" />
                  <Info size={32} className="hidden md:block" />
               </div>
               <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none">Guia Clínico</h3>
                  <p className="text-base md:text-2xl font-black text-rose-950 uppercase italic tracking-tight">Instruções de Resposta</p>
               </div>
            </div>
            <p className="text-sm md:text-base text-slate-500 leading-relaxed font-medium">
               Selecione o quanto cada afirmação se aplicou a você <span className="text-rose-600 font-bold italic underline decoration-rose-200 underline-offset-2">durante as últimas duas semanas</span>.
            </p>
            <div className="grid grid-cols-4 gap-2 md:gap-4">
               {[
                 { v: 0, l: 'Nada' },
                 { v: 1, l: 'Leve' },
                 { v: 2, l: 'Moderado' },
                 { v: 3, l: 'Grave' }
               ].map(opt => (
                 <div key={opt.v} className="bg-slate-50 py-3 md:p-6 rounded-xl md:rounded-[1.5rem] border border-slate-100 text-center flex flex-col items-center justify-center gap-1">
                    <p className="text-rose-600 font-black text-xl md:text-3xl leading-none">{opt.v}</p>
                    <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase leading-tight">{opt.l}</p>
                 </div>
               ))}
            </div>
         </div>

         <form onSubmit={handleSubmit} className="space-y-3 md:space-y-6">
            {BDI_ITEMS.map((item, idx) => (
              <div key={item.id} className={`bg-white rounded-2xl md:rounded-[3rem] border-2 p-4 md:p-10 shadow-sm md:shadow-[0_15px_50px_-15px_rgba(30,41,59,0.06)] space-y-3 md:space-y-10 transition-all duration-300 ${
                answers[item.id] !== undefined ? 'border-rose-100' : 'border-transparent'
              }`}>
                 <div className="flex items-start gap-3">
                    <span className="shrink-0 w-7 h-7 md:w-14 md:h-14 rounded-xl md:rounded-[1.8rem] bg-slate-100 flex items-center justify-center text-xs md:text-sm font-black text-slate-400 mt-0.5">
                       {String(idx + 1).padStart(2, '0')}
                    </span>
                    <p className="text-base md:text-2xl font-bold md:font-black text-slate-800 leading-snug pt-0.5">
                      {item.text}
                    </p>
                 </div>

                 <div className="grid grid-cols-4 gap-2 md:gap-4">
                    {[0, 1, 2, 3].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [item.id]: val })}
                        className={`h-12 md:h-24 rounded-xl md:rounded-[1.8rem] text-lg md:text-xl font-black transition-all duration-200 border-2 ${
                          answers[item.id] === val
                          ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-200 scale-[1.04]'
                          : 'bg-slate-50 text-slate-400 border-slate-100 active:bg-rose-50 active:text-rose-600'
                        }`}
                      >
                         {val}
                      </button>
                    ))}
                 </div>
              </div>
            ))}

            <div className="pt-2 md:pt-12">
               <button
                 type="submit"
                 disabled={loading}
                 className="w-full bg-rose-600 text-white rounded-2xl md:rounded-[3rem] py-4 md:py-12 font-black uppercase tracking-widest text-sm md:text-lg shadow-lg shadow-rose-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
               >
                  {loading ? 'Enviando...' : (
                    <>
                      Finalizar Avaliação <ArrowRight size={18} />
                    </>
                  )}
               </button>
               {error && <p className="text-rose-500 text-center mt-4 text-sm font-bold">{error}</p>}
               <div className="flex items-center justify-center gap-2 mt-6 opacity-30">
                  <ShieldCheck size={14} className="text-rose-400" />
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Protocolo de Sigilo PsiFlux</p>
               </div>
            </div>
         </form>
      </div>
    </div>
  );
};
