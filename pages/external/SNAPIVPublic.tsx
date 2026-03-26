import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, getStaticUrl } from '../../services/api';
import {
  CheckCircle,
  Activity,
  ArrowRight,
  ShieldCheck,
  Info,
} from 'lucide-react';

const SNAPIV_ITEMS = [
  // Desatenção (itens 1-9)
  { id: 1, text: "Frequentemente deixa de prestar atenção a detalhes ou comete erros por descuido em atividades escolares, de trabalho ou outras.", subscale: "I" },
  { id: 2, text: "Frequentemente tem dificuldades para manter a atenção em tarefas ou atividades lúdicas.", subscale: "I" },
  { id: 3, text: "Frequentemente parece não escutar quando lhe dirigem a palavra diretamente.", subscale: "I" },
  { id: 4, text: "Frequentemente não segue instruções até o fim e não termina tarefas escolares, obrigações ou deveres.", subscale: "I" },
  { id: 5, text: "Frequentemente tem dificuldade para organizar tarefas e atividades.", subscale: "I" },
  { id: 6, text: "Frequentemente evita, não gosta ou se recusa a participar de tarefas que exigem esforço mental prolongado.", subscale: "I" },
  { id: 7, text: "Frequentemente perde coisas necessárias para tarefas ou atividades.", subscale: "I" },
  { id: 8, text: "É facilmente distraído por estímulos externos.", subscale: "I" },
  { id: 9, text: "Com frequência é esquecido em atividades do dia a dia.", subscale: "I" },
  // Hiperatividade/Impulsividade (itens 10-18)
  { id: 10, text: "Frequentemente agita as mãos ou os pés ou se remexe na cadeira.", subscale: "H" },
  { id: 11, text: "Frequentemente abandona a cadeira em sala de aula ou em outras situações nas quais se espera que fique sentado.", subscale: "H" },
  { id: 12, text: "Frequentemente corre ou sobe em coisas de forma excessiva em situações nas quais isso é inadequado.", subscale: "H" },
  { id: 13, text: "Frequentemente tem dificuldade para brincar ou participar de atividades de lazer em silêncio.", subscale: "H" },
  { id: 14, text: "Frequentemente está 'a mil' ou age como se tivesse com um motor ligado.", subscale: "H" },
  { id: 15, text: "Frequentemente fala em demasia.", subscale: "H" },
  { id: 16, text: "Frequentemente dá respostas precipitadas antes de as perguntas serem concluídas.", subscale: "H" },
  { id: 17, text: "Frequentemente tem dificuldade para aguardar a sua vez.", subscale: "H" },
  { id: 18, text: "Frequentemente interrompe ou se intromete em assuntos alheios.", subscale: "H" },
  // Oposição/Desafio (itens 19-26)
  { id: 19, text: "Frequentemente fica com raiva e 'explode'.", subscale: "O" },
  { id: 20, text: "Frequentemente discute com adultos.", subscale: "O" },
  { id: 21, text: "Frequentemente desafia ativamente ou recusa-se a obedecer às solicitações de adultos.", subscale: "O" },
  { id: 22, text: "Frequentemente faz coisas deliberadamente para aborrecer as pessoas.", subscale: "O" },
  { id: 23, text: "Frequentemente culpa os outros por seus erros ou mau comportamento.", subscale: "O" },
  { id: 24, text: "Com frequência é suscetível ou fica facilmente irritado pelos outros.", subscale: "O" },
  { id: 25, text: "Frequentemente é raivoso e ressentido.", subscale: "O" },
  { id: 26, text: "Frequentemente é rancoroso ou vingativo.", subscale: "O" },
];

export const SNAPIVPublic: React.FC = () => {
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
      const fullTitle = `SNAP-IV | ${profName} ${crp}`;

      document.title = fullTitle;

      const description = `Escala de Avaliação de TDAH e Oposição/Desafio (SNAP-IV) solicitada por ${profName} (${specialty}). Avaliação clínica estruturada.`;

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
      document.title = "SNAP-IV | PsiFlux";
    }
  }, [professional]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(answers).length < 26) {
      alert('Por favor, responda todas as 26 questões.');
      return;
    }

    setLoading(true);
    try {
      const iSum = [1,2,3,4,5,6,7,8,9].map(i => answers[i] || 0).reduce((a, b) => a + b, 0);
      const hSum = [10,11,12,13,14,15,16,17,18].map(i => answers[i] || 0).reduce((a, b) => a + b, 0);
      const oSum = [19,20,21,22,23,24,25,26].map(i => answers[i] || 0).reduce((a, b) => a + b, 0);

      const finalScores = {
        inattention: Number((iSum / 9).toFixed(2)),
        hyperactivity: Number((hSum / 9).toFixed(2)),
        oppositional: Number((oSum / 8).toFixed(2)),
      };

      const uParam = professionalId ? `?u=${professionalId}` : '';
      const resp = await api.get<any[]>(`/public-profile/snap-iv/${patientId}${uParam}`);
      const currentHistory = Array.isArray(resp) ? resp : [];

      const newResult = {
        id: Date.now(),
        date: new Date().toISOString(),
        answers,
        scores: finalScores,
        origin: 'external',
      };

      await api.post(`/public-profile/snap-iv/${patientId}${uParam}`, {
        data: [...currentHistory, newResult],
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
          <div className="w-24 h-24 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mx-auto border border-blue-100 shadow-inner">
            <CheckCircle className="text-blue-500" size={48} />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none uppercase italic">Enviado!</h2>
            <p className="text-base text-slate-500 font-bold leading-relaxed italic opacity-80">
              Suas respostas foram encaminhadas com segurança ao psicólogo(a) responsável. Ele(a) discutirá os resultados com você na próxima sessão.
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

  const scaleOptions = [
    { v: 0, l: 'Nada' },
    { v: 1, l: 'Um pouco' },
    { v: 2, l: 'Bastante' },
    { v: 3, l: 'Demais' },
  ];

  const subscaleLabels: Record<string, string> = { I: 'Desatenção', H: 'Hiperatividade', O: 'Oposição' };

  return (
    <div className="min-h-screen bg-[#fafaff] font-sans pb-24 selection:bg-blue-100">
      <div className="bg-gradient-to-br from-blue-700 via-indigo-600 to-slate-800 text-white py-10 md:py-20 px-6 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none rotate-12 scale-125">
            <Activity size={320} />
         </div>
         <div className="absolute -top-24 -left-20 w-96 h-96 bg-white/5 rounded-full blur-[120px] pointer-events-none" />

         <div className="max-w-3xl mx-auto space-y-8 relative z-10 animate-in fade-in slide-in-from-top-4 duration-700 text-center md:text-left">
            <div className="flex items-center gap-3 bg-white/10 w-fit px-5 py-2.5 rounded-full border border-white/20 backdrop-blur-md mx-auto md:mx-0 shadow-xl">
               <ShieldCheck size={18} className="text-blue-200" />
               <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-50">Avaliação TDAH — Swanson, Nolan e Pelham</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-8xl font-black tracking-tighter leading-none uppercase italic transform -skew-x-2 drop-shadow-2xl">SNAP-IV</h1>
              <p className="text-blue-100 font-medium text-lg md:text-2xl leading-relaxed italic opacity-90 max-w-2xl mx-auto md:mx-0">
                Escala de Avaliação de TDAH e Oposição/Desafio.
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
                    <p className="text-blue-200 font-bold uppercase tracking-widest text-[9px] mb-0.5 opacity-70">Psicólogo(a) Responsável</p>
                    <p className="font-black text-base md:text-4xl tracking-tight leading-tight">{professional.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {professional.specialty && (
                        <span className="text-[10px] md:text-[12px] font-bold text-blue-50/90 bg-white/10 px-2 md:px-4 py-1 md:py-1.5 rounded-full border border-white/10 whitespace-nowrap">{professional.specialty}</span>
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
         {/* Instructions Card */}
         <div className="bg-white rounded-2xl border border-slate-100 p-4 md:p-12 shadow-lg md:shadow-[0_40px_100px_-20px_rgba(30,41,59,0.08)] space-y-4 md:space-y-8 relative z-20 overflow-hidden">
            <div className="flex items-center gap-3 text-blue-600">
               <div className="w-9 h-9 md:w-16 md:h-16 bg-blue-50 rounded-xl md:rounded-[1.8rem] flex items-center justify-center border border-blue-100/30 shrink-0">
                  <Info size={18} className="md:hidden" />
                  <Info size={32} className="hidden md:block" />
               </div>
               <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none">Guia Clínico</h3>
                  <p className="text-base md:text-2xl font-black text-blue-950 uppercase italic tracking-tight">Instruções de Resposta</p>
               </div>
            </div>
            <p className="text-sm md:text-base text-slate-500 leading-relaxed font-medium">
               Este instrumento deve ser preenchido por <span className="text-blue-600 font-bold italic underline decoration-blue-200 underline-offset-2">pais ou professores</span>. Avalie com que frequência cada comportamento ocorre. Baseie-se nos <span className="text-blue-600 font-bold italic underline decoration-blue-200 underline-offset-2">últimos 6 meses</span>.
            </p>
            <div className="p-3 md:p-4 bg-blue-50 border border-blue-100 rounded-xl md:rounded-2xl">
               <p className="text-xs md:text-sm font-bold text-blue-700 leading-relaxed">
                 Respondente: ☐ Pai/Mãe &nbsp;&nbsp;☐ Responsável &nbsp;&nbsp;☐ Professor(a)
               </p>
            </div>
            <div className="grid grid-cols-4 gap-2 md:gap-4">
               {scaleOptions.map(opt => (
                 <div key={opt.v} className="bg-slate-50 py-3 md:p-6 rounded-xl md:rounded-[1.5rem] border border-slate-100 text-center flex flex-col items-center justify-center gap-1">
                    <p className="text-blue-600 font-black text-xl md:text-3xl leading-none">{opt.v}</p>
                    <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase leading-tight">{opt.l}</p>
                 </div>
               ))}
            </div>
         </div>

         <form onSubmit={handleSubmit} className="space-y-3 md:space-y-6">
            {SNAPIV_ITEMS.map((item, idx) => {
              const subscaleColor = item.subscale === 'I'
                ? 'text-blue-500 bg-blue-50'
                : item.subscale === 'H'
                ? 'text-indigo-500 bg-indigo-50'
                : 'text-violet-500 bg-violet-50';

              return (
                <div key={item.id} className={`bg-white rounded-2xl md:rounded-[3rem] border-2 p-4 md:p-10 shadow-sm md:shadow-[0_15px_50px_-15px_rgba(30,41,59,0.06)] space-y-3 md:space-y-10 transition-all duration-300 ${
                  answers[item.id] !== undefined ? 'border-blue-100' : 'border-transparent'
                }`}>
                   <div className="flex items-start gap-3">
                      <span className="shrink-0 w-7 h-7 md:w-14 md:h-14 rounded-xl md:rounded-[1.8rem] bg-slate-100 flex items-center justify-center text-xs md:text-sm font-black text-slate-400 mt-0.5">
                         {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1">
                        <p className="text-base md:text-2xl font-bold md:font-black text-slate-800 leading-snug pt-0.5">
                          {item.text}
                        </p>
                        <span className={`inline-block mt-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${subscaleColor}`}>
                          {subscaleLabels[item.subscale]}
                        </span>
                      </div>
                   </div>

                   <div className="grid grid-cols-4 gap-2 md:gap-4">
                      {scaleOptions.map(opt => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setAnswers({ ...answers, [item.id]: opt.v })}
                          className={`h-12 md:h-24 rounded-xl md:rounded-[1.8rem] text-lg md:text-xl font-black transition-all duration-200 border-2 flex flex-col items-center justify-center gap-0.5 ${
                            answers[item.id] === opt.v
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 scale-[1.04]'
                            : 'bg-slate-50 text-slate-400 border-slate-100 active:bg-blue-50 active:text-blue-600'
                          }`}
                        >
                           <span>{opt.v}</span>
                           <span className="text-[8px] md:text-[9px] font-bold opacity-70 hidden md:block">{opt.l}</span>
                        </button>
                      ))}
                   </div>
                </div>
              );
            })}

            <div className="pt-2 md:pt-12">
               <button
                 type="submit"
                 disabled={loading}
                 className="w-full bg-blue-600 text-white rounded-2xl md:rounded-[3rem] py-4 md:py-12 font-black uppercase tracking-widest text-sm md:text-lg shadow-lg shadow-blue-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
               >
                  {loading ? 'Enviando...' : (
                    <>
                      Finalizar Avaliação <ArrowRight size={18} />
                    </>
                  )}
               </button>
               {error && <p className="text-rose-500 text-center mt-4 text-sm font-bold">{error}</p>}
               <div className="flex items-center justify-center gap-2 mt-6 opacity-30">
                  <ShieldCheck size={14} className="text-blue-400" />
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Protocolo de Sigilo PsiFlux</p>
               </div>
            </div>
         </form>
      </div>
    </div>
  );
};
