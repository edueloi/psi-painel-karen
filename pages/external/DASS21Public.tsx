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

const DASS_ITEMS = [
  { id: 1, text: "Achei difícil me acalmar", subscale: "Stress" },
  { id: 2, text: "Senti minha boca seca", subscale: "Anxiety" },
  { id: 3, text: "Não consegui vivenciar nenhum sentimento positivo", subscale: "Depression" },
  { id: 4, text: "Tive dificuldade em respirar em alguns momentos (ex. respiração ofegante, falta de ar, sem ter feito nenhum esforço físico)", subscale: "Anxiety" },
  { id: 5, text: "Achei difícil ter iniciativa para fazer as coisas", subscale: "Depression" },
  { id: 6, text: "Tive a tendência de reagir de forma exagerada às situações", subscale: "Stress" },
  { id: 7, text: "Senti tremores (ex. nas mãos)", subscale: "Anxiety" },
  { id: 8, text: "Senti que estava sempre nervoso", subscale: "Stress" },
  { id: 9, text: "Preocupei-me com situações em que eu pudesse entrar em pânico e parecesse ridículo (a)", subscale: "Anxiety" },
  { id: 10, text: "Senti que não tinha nada a desejar", subscale: "Depression" },
  { id: 11, text: "Senti-me agitado", subscale: "Stress" },
  { id: 12, text: "Achei difícil relaxar", subscale: "Stress" },
  { id: 13, text: "Senti-me depressivo (a) e sem ânimo", subscale: "Depression" },
  { id: 14, text: "Fui intolerante com as coisas que me impediam de continuar o que eu estava fazendo", subscale: "Stress" },
  { id: 15, text: "Senti que ia entrar em pânico", subscale: "Anxiety" },
  { id: 16, text: "Não consegui me entusiasmar com nada", subscale: "Depression" },
  { id: 17, text: "Senti que não tinha valor como pessoa", subscale: "Depression" },
  { id: 18, text: "Senti que estava um pouco emotivo/sensível demais", subscale: "Stress" },
  { id: 19, text: "Sabia que meu coração estava alterado mesmo não tendo feito nenhum esforço físico (ex. aumento da frequência cardíaca, disritmia cardíaca)", subscale: "Anxiety" },
  { id: 20, text: "Senti medo sem motivo", subscale: "Anxiety" },
  { id: 21, text: "Senti que a vida não tinha sentido", subscale: "Depression" }
];

export const DASS21Public: React.FC = () => {
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
      const fullTitle = `DASS-21 | ${profName} ${crp}`;
      
      document.title = fullTitle;

      const description = `Escala de Depressão, Ansiedade e Estresse (DASS-21) solicitada por ${profName} (${specialty}). Sua saúde mental em foco.`;
      
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
      document.title = "DASS-21 | PsiFlux";
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
      const scores = { Depression: 0, Anxiety: 0, Stress: 0 };
      DASS_ITEMS.forEach(item => {
        scores[item.subscale as keyof typeof scores] += (answers[item.id] || 0);
      });
      
      const finalScores = {
        Depression: scores.Depression * 2,
        Anxiety: scores.Anxiety * 2,
        Stress: scores.Stress * 2
      };

      const uParam = professionalId ? `?u=${professionalId}` : '';
      const resp = await api.get<any[]>(`/public-profile/dass-21/${patientId}${uParam}`);
      const currentHistory = Array.isArray(resp) ? resp : [];

      const newResult = {
        id: Date.now(),
        date: new Date().toISOString(),
        answers,
        scores: finalScores,
        origin: 'external'
      };

      await api.post(`/public-profile/dass-21/${patientId}${uParam}`, {
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
          <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mx-auto border border-indigo-100 shadow-inner">
            <CheckCircle className="text-indigo-500" size={48} />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none uppercase italic">Enviado!</h2>
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
    <div className="min-h-screen bg-[#fafaff] font-sans pb-24 selection:bg-indigo-100 italic-text-none">
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-slate-800 text-white py-10 md:py-20 px-6 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none rotate-12 scale-125">
            <Activity size={320} />
         </div>
         <div className="absolute -top-24 -left-20 w-96 h-96 bg-white/5 rounded-full blur-[120px] pointer-events-none" />
         
         <div className="max-w-3xl mx-auto space-y-8 relative z-10 animate-in fade-in slide-in-from-top-4 duration-700 text-center md:text-left">
            <div className="flex items-center gap-3 bg-white/10 w-fit px-5 py-2.5 rounded-full border border-white/20 backdrop-blur-md mx-auto md:mx-0 shadow-xl">
               <ShieldCheck size={18} className="text-indigo-200" />
               <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-50">Avaliação Psicológica Protocolada</span>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl md:text-8xl font-black tracking-tighter leading-none uppercase italic transform -skew-x-2 drop-shadow-2xl">DASS-21</h1>
              <p className="text-indigo-100 font-medium text-lg md:text-2xl leading-relaxed italic opacity-90 max-w-2xl mx-auto md:mx-0">
                Escala clínica de Depressão, Ansiedade e Estresse.
              </p>
            </div>

            {professional && (
              <div className="pt-8 flex flex-col md:flex-row items-center gap-6 group">
                 <div className="relative">
                    <div className="absolute -inset-2 bg-gradient-to-tr from-white/30 to-white/10 rounded-[2.2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    {professional.clinic_logo_url ? (
                      <img 
                        src={getStaticUrl(professional.clinic_logo_url)} 
                        alt={professional.company_name || professional.name}
                        className="w-24 h-24 rounded-[2.2rem] bg-white border-8 border-white/20 shadow-2xl object-contain p-2 relative z-10 transform transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-[1.8rem] bg-white/20 border-2 border-white/30 flex items-center justify-center font-black text-3xl relative z-10 backdrop-blur-sm overflow-hidden group-hover:rotate-3 transition-transform">
                          {professional.name?.[0]}
                      </div>
                    )}
                 </div>
                 
                 <div className="text-center md:text-left transition-all group-hover:translate-x-1">
                    <p className="text-indigo-200 font-black uppercase tracking-[0.3em] text-[10px] mb-2 opacity-80">Psicólogo(a) Responsável</p>
                    <p className="font-black text-2xl md:text-4xl tracking-tight leading-tight mb-2">{professional.name}</p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-1.5">
                      {professional.specialty && (
                        <span className="text-[12px] font-bold text-indigo-50/90 bg-white/10 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-sm whitespace-nowrap">{professional.specialty}</span>
                      )}
                      {professional.crp && (
                        <span className="text-[12px] font-black bg-slate-950/40 px-4 py-1.5 rounded-full border border-white/10 text-white leading-none backdrop-blur-md">
                          CRP {professional.crp}
                        </span>
                      )}
                    </div>
                 </div>
              </div>
            )}
         </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
         <div className="bg-white rounded-[2rem] md:rounded-[3rem] border border-slate-100 p-5 md:p-12 shadow-[0_40px_100px_-20px_rgba(30,41,59,0.08)] space-y-5 md:space-y-8 relative z-20 overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 transition-all group-hover:scale-125" />
            <div className="flex items-center gap-5 text-indigo-600">
               <div className="w-16 h-16 bg-indigo-50 rounded-[1.8rem] flex items-center justify-center shadow-inner border border-indigo-100/30">
                  <Info size={32} />
               </div>
               <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-1 leading-none">Guia Clínico</h3>
                  <p className="text-2xl font-black text-indigo-950 uppercase italic tracking-tighter">Instruções de Resposta</p>
               </div>
            </div>
            <p className="text-base text-slate-500 leading-relaxed font-semibold max-w-xl">
               Selecione a opção que indique o quanto cada afirmação se aplicou a você <span className="text-indigo-600 font-black italic underline decoration-indigo-200 underline-offset-4">durante a última semana</span>.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
               {[
                 { v: 0, l: 'Não se aplicou' },
                 { v: 1, l: 'Algum grau' },
                 { v: 2, l: 'Grau considerável' },
                 { v: 3, l: 'Quase sempre' }
               ].map(opt => (
                 <div key={opt.v} className="bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 text-center flex flex-col items-center justify-center group hover:bg-white hover:border-indigo-100 hover:shadow-xl transition-all">
                    <p className="text-indigo-600 font-black text-3xl leading-none mb-2">{opt.v}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{opt.l}</p>
                 </div>
               ))}
            </div>
         </div>

         <form onSubmit={handleSubmit} className="space-y-6">
            {DASS_ITEMS.map((item, idx) => (
              <div key={item.id} className="bg-white rounded-[2rem] md:rounded-[3rem] border-2 border-transparent p-5 md:p-10 shadow-[0_15px_50px_-15px_rgba(30,41,59,0.06)] space-y-5 md:space-y-10 hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-100/30 transition-all duration-500 group relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                 
                 <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="w-14 h-14 rounded-[1.8rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-sm font-black text-slate-400 shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:-rotate-6 transition-all duration-500">
                       {String(idx + 1).padStart(2, '0')}
                    </div>
                    <p className="text-xl md:text-2xl font-black text-indigo-950 leading-tight group-hover:translate-x-1 transition-transform duration-500">
                      {item.text}
                    </p>
                 </div>
                 
                 <div className="grid grid-cols-4 gap-2 md:gap-4">
                    {[0, 1, 2, 3].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [item.id]: val })}
                        className={`h-14 md:h-24 rounded-[1.2rem] md:rounded-[1.8rem] text-base md:text-xl font-black transition-all duration-300 border-2 ${
                          answers[item.id] === val 
                          ? 'bg-slate-950 text-white border-slate-950 shadow-2xl scale-[1.05] ring-8 ring-indigo-50' 
                          : 'bg-white text-slate-300 border-slate-100 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/50'
                        }`}
                      >
                         {val}
                      </button>
                    ))}
                 </div>
              </div>
            ))}

            <div className="pt-4 md:pt-12">
               <button
                 type="submit"
                 disabled={loading}
                 className="w-full bg-indigo-600 hover:bg-slate-950 text-white rounded-[2rem] md:rounded-[3rem] py-5 md:py-12 font-black uppercase tracking-[0.3em] text-sm md:text-lg shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-4 border-b-4 md:border-b-8 border-indigo-800 hover:border-slate-800 active:border-b-0 active:translate-y-2 group"
               >
                  {loading ? 'Sincronizando Respostas...' : (
                    <>
                      Finalizar Avaliação <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
                    </>
                  )}
               </button>
               {error && <p className="text-rose-500 text-center mt-6 text-sm font-black uppercase tracking-widest">{error}</p>}
               <div className="flex flex-col items-center gap-3 mt-10 opacity-40">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] flex items-center gap-3">
                     <ShieldCheck size={18} className="text-indigo-400" /> Protocolo de Sigilo PsiFlux
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Tecnologia Certificada para Prática Clínica</p>
               </div>
            </div>
         </form>
      </div>
    </div>
  );
};
