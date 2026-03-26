import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, getStaticUrl } from '../../services/api';
import { 
  CheckCircle, 
  ShieldCheck, 
  ArrowRight, 
  Info,
  Brain,
  Sparkles
} from 'lucide-react';

const DISC_ITEMS = [
  { id: 1, text: "Gosto de resolver as coisas rapidamente.", type: "D" },
  { id: 2, text: "Fico incomodado(a) quando percebo lentidão ou indecisão nos outros.", type: "D" },
  { id: 3, text: "Gosto de assumir a liderança em projetos.", type: "D" },
  { id: 4, text: "Sinto-me motivado(a) por desafios e metas difíceis.", type: "D" },
  { id: 5, text: "Expressar minha opinião de forma direta é natural para mim.", type: "D" },
  { id: 6, text: "Foco mais nos resultados do que nos sentimentos alheios.", type: "D" },
  { id: 7, text: "Gosto de influenciar as decisões das pessoas.", type: "D" },
  { id: 8, text: "Sou entusiasmado(a) e gosto de animar o grupo.", type: "I" },
  { id: 9, text: "Gosto de conhecer novas pessoas e socializar.", type: "I" },
  { id: 10, text: "Falo bastante e me expresso com facilidade.", type: "I" },
  { id: 11, text: "Prefiro trabalhar em equipe do que sozinho(a).", type: "I" },
  { id: 12, text: "Sinto-me bem sendo o centro das atenções em eventos.", type: "I" },
  { id: 13, text: "Sou uma pessoa otimista e procuro ver o lado bom das coisas.", type: "I" },
  { id: 14, text: "Gosto de convencer os outros sobre minhas ideias.", type: "I" },
  { id: 15, text: "Prefiro uma rotina estável a mudanças frequentes.", type: "S" },
  { id: 16, text: "Sou um(a) bom(boa) ouvinte e as pessoas confiam em mim.", type: "S" },
  { id: 17, text: "Evito conflitos e prefiro um ambiente harmonioso.", type: "S" },
  { id: 18, text: "Gosto de ajudar os outros, mesmo que isso me custe tempo.", type: "S" },
  { id: 19, text: "Sou paciente e dificilmente perco a calma.", type: "S" },
  { id: 20, text: "Termino o que começo e sou muito persistente.", type: "S" },
  { id: 21, text: "Sinto-me desconfortável quando as regras mudam sem aviso.", type: "S" },
  { id: 22, text: "Sou muito detalhista em tudo que faço.", type: "C" },
  { id: 23, text: "Prezo pela exatidão e qualidade acima da rapidez.", type: "C" },
  { id: 24, text: "Gosto de analisar todas as possibilidades antes de decidir.", type: "C" },
  { id: 25, text: "Sigo regras e procedimentos à risca.", type: "C" },
  { id: 26, text: "Prefiro trabalhar de forma independente e técnica.", type: "C" },
  { id: 27, text: "Sou crítico(a) e observador(a) em relação aos processos.", type: "C" },
  { id: 28, text: "Sinto necessidade de organização e ordem ao meu redor.", type: "C" },
  { id: 29, text: "Uso a lógica em vez da emoção para resolver problemas.", type: "C" },
  { id: 30, text: "Sou cauteloso(a) e prefiro não arriscar sem dados.", type: "C" }
];

export const DISCPublic: React.FC = () => {
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
      const fullTitle = `DISC: Perfil Marston | ${profName} ${crp}`;
      
      document.title = fullTitle;

      // Update Meta Tags for SEO and Social Media sharing
      const description = `Mapeamento de Perfil DISC solicitado por ${profName} (${specialty}). Responda com segurança e confidencialidade.`;
      
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
      document.title = "DISC Avaliativo | PsiFlux";
    }
  }, [professional]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(answers).length < 30) {
      alert('Por favor, responda todas as questões.');
      return;
    }

    setLoading(true);
    try {
      const counts = { D: 0, I: 0, S: 0, C: 0 };
      const raw = { D: 0, I: 0, S: 0, C: 0 };
      
      DISC_ITEMS.forEach(item => {
        const type = item.type as keyof typeof counts;
        raw[type] += (answers[item.id] || 0);
        counts[type]++;
      });

      const finalScores = {
        D: Number((raw.D / counts.D).toFixed(2)),
        I: Number((raw.I / counts.I).toFixed(2)),
        S: Number((raw.S / counts.S).toFixed(2)),
        C: Number((raw.C / counts.C).toFixed(2)),
      };

      // Get current history avec a share token for public access
      const uParam = professionalId ? `?u=${professionalId}` : '';
      const resp = await api.get<any[]>(`/clinical-tools/${patientId}/disc-evaluative${uParam}`);
      const currentHistory = Array.isArray(resp) ? resp : [];
      
      const newResult = {
        id: Date.now(),
        date: new Date().toISOString(),
        scores: finalScores,
        origin: 'external',
        type: 'evaluative'
      };

      await api.put(`/clinical-tools/${patientId}/disc-evaluative?u=${professionalId}`, {
        patient_id: patientId,
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
          <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto border border-emerald-100 shadow-inner">
            <CheckCircle className="text-emerald-500" size={48} />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none uppercase">Concluído!</h2>
            <p className="text-base text-slate-500 font-bold leading-relaxed italic">
              Seu perfil comportamental foi mapeado e enviado com sucesso. Seu profissional analisará os dados para melhor atendê-lo(a).
            </p>
          </div>
          <div className="pt-8 border-t border-slate-100 flex items-center justify-center gap-3">
             <ShieldCheck size={18} className="text-slate-300" />
             <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">Criptografia PsiFlux Ativa</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcff] font-sans pb-24 selection:bg-violet-100 italic-text-none">
      <div className="bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 text-white py-20 px-6 shadow-[0_20px_60px_-15px_rgba(109,40,217,0.3)] relative overflow-hidden">
         <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none rotate-12 scale-150 transform-gpu">
            <Brain size={400} />
         </div>
         <div className="absolute -bottom-24 -left-20 w-80 h-80 bg-white/10 rounded-full blur-[100px] pointer-events-none" />
         
         <div className="max-w-3xl mx-auto space-y-8 relative z-10 text-center md:text-left animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-3 bg-white/10 w-fit px-5 py-2.5 rounded-full border border-white/20 mx-auto md:mx-0 backdrop-blur-md shadow-xl">
               <Sparkles size={18} className="text-violet-200 animate-pulse" />
               <span className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-50">Protocolo Técnico Marston</span>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] uppercase italic transform -skew-x-2 drop-shadow-2xl">
                DISC <span className="text-violet-200">Avaliativo</span>
              </h1>
              <p className="text-violet-100 font-medium text-lg md:text-xl leading-relaxed italic opacity-95 max-w-2xl mx-auto md:mx-0">
                 Mapeamento avançado de tendências comportamentais e inteligência emocional.
              </p>
            </div>

            {professional && (
              <div className="pt-8 flex flex-col md:flex-row items-center gap-6 md:gap-7 group">
                 <div className="relative">
                   <div className="absolute -inset-2 bg-gradient-to-tr from-white/40 to-white/10 rounded-[2.2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                   {professional.clinic_logo_url ? (
                     <img 
                      src={getStaticUrl(professional.clinic_logo_url)} 
                      alt={professional.company_name || professional.name}
                      className="w-24 h-24 rounded-[2rem] bg-white border-8 border-white/20 shadow-2xl object-contain p-2 relative z-10 transform transition-transform group-hover:scale-105"
                     />
                   ) : (
                     <div className="w-20 h-20 rounded-[1.8rem] bg-white/20 border-2 border-white/30 flex items-center justify-center font-black text-3xl shadow-lg ring-8 ring-white/5 relative z-10 overflow-hidden group-hover:rotate-3 transition-transform">
                        {professional.name?.[0]}
                     </div>
                   )}
                 </div>
                 
                 <div className="text-center md:text-left transition-all group-hover:translate-x-1">
                    <p className="text-violet-200 font-black uppercase tracking-[0.3em] text-[10px] mb-2 opacity-80">Psicólogo(a) Responsável</p>
                    <p className="font-black text-2xl md:text-4xl leading-[1.1] tracking-tight text-white mb-2">{professional.name}</p>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                      {professional.specialty && (
                        <span className="text-[12px] font-bold text-violet-100 bg-white/10 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-sm whitespace-nowrap">
                          {professional.specialty}
                        </span>
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
         <div className="bg-white rounded-[3rem] border border-slate-100 p-8 md:p-12 shadow-[0_40px_100px_-20px_rgba(30,41,59,0.08)] space-y-8 relative z-20 overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-50/50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 transition-all group-hover:scale-125" />
            <div className="flex items-center gap-5 text-violet-600">
               <div className="w-16 h-16 bg-violet-50 rounded-[1.8rem] flex items-center justify-center shadow-inner border border-violet-100/30">
                  <Info size={32} />
               </div>
               <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-1 leading-none">Guia de Percepção</h3>
                  <p className="text-2xl font-black text-indigo-950">Instruções Técnicas</p>
               </div>
            </div>
            <p className="text-base text-slate-500 leading-relaxed font-semibold max-w-xl">
               Não existem respostas certas ou erradas. Responda de acordo com sua <span className="text-violet-600 font-black">percepção natural</span> sobre si mesmo(a) em contextos de rotina.
            </p>
            <div className="grid grid-cols-5 gap-3 md:gap-4">
               {[1, 2, 3, 4, 5].map(v => (
                 <div key={v} className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 text-center flex flex-col items-center justify-center">
                    <p className="text-violet-600 font-black text-2xl leading-none">{v}</p>
                 </div>
               ))}
            </div>
         </div>

         <form onSubmit={handleSubmit} className="space-y-6">
            {DISC_ITEMS.map((item, idx) => (
              <div key={item.id} className="bg-white rounded-[3rem] border-2 border-transparent p-10 shadow-[0_15px_40px_-10px_rgba(30,41,59,0.04)] space-y-8 hover:border-violet-100 hover:shadow-2xl hover:shadow-violet-100/30 transition-all duration-500 group relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-2 h-full bg-violet-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                 
                 <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="w-14 h-14 rounded-[1.8rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-sm font-black text-slate-400 shrink-0 group-hover:bg-violet-600 group-hover:text-white group-hover:rotate-6 transition-all duration-500">
                       {String(idx + 1).padStart(2, '0')}
                    </div>
                    <p className="text-xl md:text-2xl font-black text-indigo-950 leading-tight group-hover:translate-x-1 transition-transform duration-500">
                      {item.text}
                    </p>
                 </div>
                 
                 <div className="grid grid-cols-5 gap-2 md:gap-4">
                    {[1, 2, 3, 4, 5].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [item.id]: val })}
                        className={`h-20 rounded-[1.8rem] text-sm md:text-lg font-black transition-all duration-300 border-2 ${
                          answers[item.id] === val 
                          ? 'bg-indigo-950 text-white border-indigo-950 shadow-2xl scale-[1.05] ring-8 ring-indigo-50' 
                          : 'bg-white text-slate-300 border-slate-100 hover:border-violet-200 hover:text-violet-600 hover:bg-violet-50/50'
                        }`}
                      >
                         {val}
                      </button>
                    ))}
                 </div>
              </div>
            ))}

            <div className="pt-12">
               <button
                 type="submit"
                 disabled={loading}
                 className="w-full bg-violet-600 hover:bg-slate-950 text-white rounded-[2.5rem] py-10 font-black uppercase tracking-[0.3em] text-sm md:text-lg shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-4 border-b-8 border-violet-800 hover:border-slate-800 active:border-b-0 active:translate-y-2 group"
               >
                  {loading ? 'Processando Mapeamento...' : (
                    <>
                      Encerrar e Enviar Perfil <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
                    </>
                  )}
               </button>
               {error && <p className="text-rose-500 text-center mt-6 text-sm font-black uppercase tracking-widest">{error}</p>}
               <div className="flex flex-col items-center gap-2 mt-8 opacity-40">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] flex items-center gap-3">
                     <ShieldCheck size={16} /> Protocolo de Segurança SSL Ativo
                  </p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">© 2026 PsiFlux • Inteligência Clínica</p>
               </div>
            </div>
         </form>
      </div>
    </div>
  );
};
