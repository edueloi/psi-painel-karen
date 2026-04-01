import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, getStaticUrl } from '../../services/api';
import { CheckCircle, ArrowRight, ShieldCheck, Activity, Sparkles } from 'lucide-react';

const DASS_ITEMS = [
  { id: 1, text: "Achei difícil me acalmar", subscale: "Stress" },
  { id: 2, text: "Senti minha boca seca", subscale: "Anxiety" },
  { id: 3, text: "Não consegui vivenciar nenhum sentimento positivo", subscale: "Depression" },
  { id: 4, text: "Tive dificuldade em respirar em alguns momentos", subscale: "Anxiety" },
  { id: 5, text: "Achei difícil ter iniciativa para fazer as coisas", subscale: "Depression" },
  { id: 6, text: "Tive a tendência de reagir de forma exagerada às situações", subscale: "Stress" },
  { id: 7, text: "Senti tremores (ex.: nas mãos)", subscale: "Anxiety" },
  { id: 8, text: "Senti que estava sempre nervoso", subscale: "Stress" },
  { id: 9, text: "Preocupei-me com situações em que eu pudesse entrar em pânico", subscale: "Anxiety" },
  { id: 10, text: "Senti que não tinha nada a desejar", subscale: "Depression" },
  { id: 11, text: "Senti-me agitado", subscale: "Stress" },
  { id: 12, text: "Achei difícil relaxar", subscale: "Stress" },
  { id: 13, text: "Senti-me depressivo(a) e sem ânimo", subscale: "Depression" },
  { id: 14, text: "Fui intolerante com as coisas que me impediam de continuar o que eu estava fazendo", subscale: "Stress" },
  { id: 15, text: "Senti que ia entrar em pânico", subscale: "Anxiety" },
  { id: 16, text: "Não consegui me entusiasmar com nada", subscale: "Depression" },
  { id: 17, text: "Senti que não tinha valor como pessoa", subscale: "Depression" },
  { id: 18, text: "Senti que estava um pouco emotivo/sensível demais", subscale: "Stress" },
  { id: 19, text: "Sabia que meu coração estava alterado sem esforço físico", subscale: "Anxiety" },
  { id: 20, text: "Senti medo sem motivo", subscale: "Anxiety" },
  { id: 21, text: "Senti que a vida não tinha sentido", subscale: "Depression" },
];

const SCALE_OPTS = [
  { v: 0, l: 'Nunca' },
  { v: 1, l: 'Às vezes' },
  { v: 2, l: 'Bastante' },
  { v: 3, l: 'Sempre' },
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
    const profName = professional?.name || 'Psicólogo(a)';
    document.title = professional ? `DASS-21 | ${profName}` : 'DASS-21 | PsiFlux';
    if (professional) {
      const setMeta = (attr: string, key: string, content: string) => {
        let el = document.querySelector(`meta[${attr}="${key}"]`);
        if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
        el.setAttribute('content', content);
      };
      setMeta('name', 'description', `Escala DASS-21 solicitada por ${profName}`);
      setMeta('property', 'og:title', `DASS-21 | ${profName}`);
      if (professional.clinic_logo_url) setMeta('property', 'og:image', getStaticUrl(professional.clinic_logo_url));
    }
  }, [professional]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(answers).length < 21) { alert('Por favor, responda todas as questões.'); return; }
    setLoading(true);
    try {
      const scores = { Depression: 0, Anxiety: 0, Stress: 0 };
      DASS_ITEMS.forEach(item => { scores[item.subscale as keyof typeof scores] += (answers[item.id] || 0); });
      const finalScores = { Depression: scores.Depression * 2, Anxiety: scores.Anxiety * 2, Stress: scores.Stress * 2 };
      const uParam = professionalId ? `?u=${professionalId}` : '';
      const resp = await api.get<any[]>(`/public-profile/dass-21/${patientId}${uParam}`);
      const currentHistory = Array.isArray(resp) ? resp : [];
      await api.post(`/public-profile/dass-21/${patientId}${uParam}`, {
        data: [...currentHistory, { id: Date.now(), date: new Date().toISOString(), answers, scores: finalScores, origin: 'external' }]
      });
      setSubmitted(true);
    } catch { setError('Erro ao enviar. Tente novamente.'); }
    finally { setLoading(false); }
  };

  const answered = Object.keys(answers).length;
  const progress = Math.round((answered / 21) * 100);

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle className="text-indigo-500" size={32} />
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
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-slate-800 text-white px-5 pt-8 pb-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-[0.05] pointer-events-none rotate-12">
          <Activity size={260} />
        </div>
        <div className="absolute -top-20 -left-16 w-72 h-72 bg-white/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="max-w-2xl mx-auto relative z-10 space-y-5">
          <div className="flex items-center gap-2 bg-white/10 w-fit px-4 py-2 rounded-full border border-white/20 backdrop-blur-md">
            <ShieldCheck size={14} className="text-indigo-200" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">Avaliação Psicológica Protocolada</span>
          </div>
          <div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none uppercase italic drop-shadow-lg">DASS-21</h1>
            <p className="text-indigo-200 text-sm sm:text-base mt-2 font-medium">Escala de Depressão, Ansiedade e Estresse</p>
          </div>
          {professional && (
            <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 border border-white/10 backdrop-blur-sm">
              {professional.clinic_logo_url ? (
                <img src={getStaticUrl(professional.clinic_logo_url)} alt={professional.company_name || professional.name} className="w-12 h-12 rounded-2xl bg-white object-contain p-1 shrink-0 shadow-lg" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center font-black text-lg shrink-0">{professional.name?.[0]}</div>
              )}
              <div className="min-w-0">
                <p className="text-indigo-200 text-[9px] font-black uppercase tracking-widest opacity-70">Psicólogo(a) Responsável</p>
                <p className="font-black text-base leading-tight truncate">{professional.name}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  {professional.specialty && <span className="text-[10px] font-bold text-indigo-100/80 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">{professional.specialty}</span>}
                  {professional.crp && <span className="text-[10px] font-black bg-slate-950/40 px-2 py-0.5 rounded-full border border-white/10">CRP {professional.crp}</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-8 space-y-3">
        {/* Instructions */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 relative z-10">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Instruções</p>
          <p className="text-sm text-slate-600 leading-relaxed">Selecione com que frequência cada situação se aplicou a você <strong className="text-indigo-600">na última semana</strong>.</p>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {SCALE_OPTS.map(o => (
              <div key={o.v} className="bg-indigo-50 rounded-xl py-2 text-center">
                <p className="text-indigo-600 font-black text-base">{o.v}</p>
                <p className="text-[9px] font-bold text-indigo-400 leading-tight">{o.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-500">{answered} de 21 respondidas</span>
            <span className="text-xs font-black text-indigo-600">{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Questions */}
        <form onSubmit={handleSubmit} className="space-y-2">
          {DASS_ITEMS.map((item, idx) => (
            <div key={item.id} className={`bg-white rounded-2xl border transition-all duration-200 p-4 ${answers[item.id] !== undefined ? 'border-indigo-200 shadow-sm' : 'border-slate-100'}`}>
              <div className="flex items-start gap-3 mb-3">
                <span className="shrink-0 w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 mt-0.5">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <p className="text-sm font-semibold text-slate-800 leading-snug flex-1">{item.text}</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {SCALE_OPTS.map(opt => (
                  <button key={opt.v} type="button" onClick={() => setAnswers({ ...answers, [item.id]: opt.v })}
                    className={`h-11 rounded-xl font-black text-sm transition-all border-2 flex flex-col items-center justify-center gap-0.5 ${
                      answers[item.id] === opt.v ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.02]' : 'bg-slate-50 text-slate-400 border-slate-100 active:bg-indigo-50'
                    }`}>
                    <span>{opt.v}</span>
                    <span className="text-[8px] font-bold opacity-70">{opt.l}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-2 pb-4">
            <button type="submit" disabled={loading || answered < 21}
              className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-sm shadow-lg shadow-indigo-200 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]">
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
