import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, getStaticUrl } from '../../services/api';
import { CheckCircle, ArrowRight, ShieldCheck, Activity } from 'lucide-react';

const BAI_ITEMS = [
  { id: 1, text: "Dormência ou formigamento" },
  { id: 2, text: "Sensação de calor" },
  { id: 3, text: "Tremor nas pernas" },
  { id: 4, text: "Incapaz de relaxar" },
  { id: 5, text: "Medo que o pior aconteça" },
  { id: 6, text: "Tonturas ou vertigens" },
  { id: 7, text: "Batimento cardíaco acelerado ou palpitações" },
  { id: 8, text: "Sem equilíbrio" },
  { id: 9, text: "Aterrorizado" },
  { id: 10, text: "Nervoso" },
  { id: 11, text: "Sensação de sufocamento" },
  { id: 12, text: "Tremor nas mãos" },
  { id: 13, text: "Trêmulo" },
  { id: 14, text: "Medo de perder o controle" },
  { id: 15, text: "Dificuldade de respirar" },
  { id: 16, text: "Medo de morrer" },
  { id: 17, text: "Assustado" },
  { id: 18, text: "Indigestão ou desconforto abdominal" },
  { id: 19, text: "Sensação de desmaio" },
  { id: 20, text: "Rosto afogueado" },
  { id: 21, text: "Suando (não pelo calor)" },
];

const SCALE_OPTS = [
  { v: 0, l: 'Nunca' },
  { v: 1, l: 'Leve' },
  { v: 2, l: 'Moderado' },
  { v: 3, l: 'Grave' },
];

export const BAIPublic: React.FC = () => {
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
    const profName = professional?.name || 'Psicólogo(a)';
    document.title = professional ? `BAI | ${profName}` : 'BAI | PsiFlux';
    if (professional) {
      const setMeta = (attr: string, key: string, content: string) => {
        let el = document.querySelector(`meta[${attr}="${key}"]`);
        if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
        el.setAttribute('content', content);
      };
      setMeta('name', 'description', `Inventário BAI solicitado por ${profName}`);
      setMeta('property', 'og:title', `BAI | ${profName}`);
      if (professional.clinic_logo_url) setMeta('property', 'og:image', getStaticUrl(professional.clinic_logo_url));
    }
  }, [professional]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(answers).length < 21) { alert('Por favor, responda todas as questões.'); return; }
    setLoading(true);
    try {
      const total = Object.values(answers).reduce((a: number, b: number) => a + b, 0);
      const uParam = professionalId ? `?u=${professionalId}` : '';
      const resp = await api.get<any[]>(`/public-profile/bai/${patientId}${uParam}`);
      const currentHistory = Array.isArray(resp) ? resp : [];
      await api.post(`/public-profile/bai/${patientId}${uParam}`, {
        data: [...currentHistory, { id: Date.now(), date: new Date().toISOString(), answers, scores: { total }, origin: 'external' }]
      });
      setSubmitted(true);
    } catch { setError('Erro ao enviar. Tente novamente.'); }
    finally { setLoading(false); }
  };

  const answered = Object.keys(answers).length;
  const progress = Math.round((answered / 21) * 100);

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle className="text-amber-500" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Enviado!</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">Suas respostas foram encaminhadas com segurança. O profissional discutirá os resultados na próxima sessão.</p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2 opacity-40">
            <ShieldCheck size={13} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocolo PsiFlux</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaff] font-sans pb-8">
      <div className="bg-gradient-to-br from-amber-600 via-orange-500 to-slate-800 text-white px-5 pt-8 pb-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-[0.05] pointer-events-none rotate-12"><Activity size={260} /></div>
        <div className="absolute -top-20 -left-16 w-72 h-72 bg-white/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="max-w-2xl mx-auto relative z-10 space-y-5">
          <div className="flex items-center gap-2 bg-white/10 w-fit px-4 py-2 rounded-full border border-white/20 backdrop-blur-md">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100">Protocolo Beck — Ansiedade</span>
          </div>
          <div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none uppercase italic drop-shadow-lg">BAI</h1>
            <p className="text-amber-100 text-sm sm:text-base mt-2 font-medium">Inventário de Ansiedade de Beck</p>
          </div>
          {professional && (
            <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 border border-white/10 backdrop-blur-sm">
              {professional.clinic_logo_url ? (
                <img src={getStaticUrl(professional.clinic_logo_url)} alt={professional.company_name || professional.name} className="w-12 h-12 rounded-2xl bg-white object-contain p-1 shrink-0 shadow-lg" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center font-black text-lg shrink-0">{professional.name?.[0]}</div>
              )}
              <div className="min-w-0">
                <p className="text-amber-200 text-[9px] font-black uppercase tracking-widest opacity-70">Psicólogo(a) Responsável</p>
                <p className="font-black text-base leading-tight truncate">{professional.name}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  {professional.specialty && <span className="text-[10px] font-bold text-amber-100/80 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">{professional.specialty}</span>}
                  {professional.crp && <span className="text-[10px] font-black bg-slate-950/40 px-2 py-0.5 rounded-full border border-white/10">CRP {professional.crp}</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-8 space-y-3">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 relative z-10">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Instruções</p>
          <p className="text-sm text-slate-600 leading-relaxed">Indique o quanto você foi incomodado por cada sintoma <strong className="text-amber-600">na última semana, incluindo hoje</strong>.</p>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {SCALE_OPTS.map(o => (
              <div key={o.v} className="bg-amber-50 rounded-xl py-2 text-center">
                <p className="text-amber-600 font-black text-base">{o.v}</p>
                <p className="text-[9px] font-bold text-amber-400 leading-tight">{o.l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-500">{answered} de 21 respondidas</span>
            <span className="text-xs font-black text-amber-600">{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          {BAI_ITEMS.map((item, idx) => (
            <div key={item.id} className={`bg-white rounded-2xl border transition-all duration-200 p-4 ${answers[item.id] !== undefined ? 'border-amber-200 shadow-sm' : 'border-slate-100'}`}>
              <div className="flex items-start gap-3 mb-3">
                <span className="shrink-0 w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 mt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                <p className="text-sm font-semibold text-slate-800 leading-snug flex-1">{item.text}</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {SCALE_OPTS.map(opt => (
                  <button key={opt.v} type="button" onClick={() => setAnswers({ ...answers, [item.id]: opt.v })}
                    className={`h-11 rounded-xl font-black text-sm transition-all border-2 flex flex-col items-center justify-center gap-0.5 ${
                      answers[item.id] === opt.v ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-[1.02]' : 'bg-slate-50 text-slate-400 border-slate-100 active:bg-amber-50'
                    }`}>
                    <span>{opt.v}</span><span className="text-[8px] font-bold opacity-70">{opt.l}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="pt-2 pb-4">
            <button type="submit" disabled={loading || answered < 21}
              className="w-full bg-amber-500 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-sm shadow-lg shadow-amber-200 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]">
              {loading ? 'Enviando...' : <><span>Finalizar Avaliação</span><ArrowRight size={16} /></>}
            </button>
            {answered < 21 && !loading && <p className="text-center text-xs text-slate-400 mt-2">Responda todas as {21 - answered} questões restantes</p>}
            {error && <p className="text-rose-500 text-center mt-3 text-xs font-bold">{error}</p>}
            <div className="flex items-center justify-center gap-1.5 mt-4 opacity-30">
              <ShieldCheck size={12} className="text-slate-400" />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Protocolo de Sigilo PsiFlux</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
