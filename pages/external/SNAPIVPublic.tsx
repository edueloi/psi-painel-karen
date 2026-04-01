import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, getStaticUrl } from '../../services/api';
import { CheckCircle, ArrowRight, ShieldCheck, Activity } from 'lucide-react';

const SNAPIV_ITEMS = [
  { id: 1, text: "Frequentemente deixa de prestar atenção a detalhes ou comete erros por descuido.", subscale: "I" },
  { id: 2, text: "Frequentemente tem dificuldades para manter a atenção em tarefas.", subscale: "I" },
  { id: 3, text: "Frequentemente parece não escutar quando lhe dirigem a palavra.", subscale: "I" },
  { id: 4, text: "Frequentemente não segue instruções até o fim e não termina tarefas.", subscale: "I" },
  { id: 5, text: "Frequentemente tem dificuldade para organizar tarefas e atividades.", subscale: "I" },
  { id: 6, text: "Frequentemente evita ou se recusa a participar de tarefas que exigem esforço mental prolongado.", subscale: "I" },
  { id: 7, text: "Frequentemente perde coisas necessárias para tarefas ou atividades.", subscale: "I" },
  { id: 8, text: "É facilmente distraído por estímulos externos.", subscale: "I" },
  { id: 9, text: "Com frequência é esquecido em atividades do dia a dia.", subscale: "I" },
  { id: 10, text: "Frequentemente agita as mãos ou os pés ou se remexe na cadeira.", subscale: "H" },
  { id: 11, text: "Frequentemente abandona a cadeira em situações nas quais se espera que fique sentado.", subscale: "H" },
  { id: 12, text: "Frequentemente corre ou sobe em coisas de forma excessiva.", subscale: "H" },
  { id: 13, text: "Frequentemente tem dificuldade para brincar em silêncio.", subscale: "H" },
  { id: 14, text: "Frequentemente está 'a mil' ou age como se tivesse com um motor ligado.", subscale: "H" },
  { id: 15, text: "Frequentemente fala em demasia.", subscale: "H" },
  { id: 16, text: "Frequentemente dá respostas precipitadas antes das perguntas serem concluídas.", subscale: "H" },
  { id: 17, text: "Frequentemente tem dificuldade para aguardar a sua vez.", subscale: "H" },
  { id: 18, text: "Frequentemente interrompe ou se intromete em assuntos alheios.", subscale: "H" },
  { id: 19, text: "Frequentemente fica com raiva e 'explode'.", subscale: "O" },
  { id: 20, text: "Frequentemente discute com adultos.", subscale: "O" },
  { id: 21, text: "Frequentemente desafia ou recusa-se a obedecer às solicitações de adultos.", subscale: "O" },
  { id: 22, text: "Frequentemente faz coisas deliberadamente para aborrecer as pessoas.", subscale: "O" },
  { id: 23, text: "Frequentemente culpa os outros por seus erros ou mau comportamento.", subscale: "O" },
  { id: 24, text: "Com frequência fica facilmente irritado pelos outros.", subscale: "O" },
  { id: 25, text: "Frequentemente é raivoso e ressentido.", subscale: "O" },
  { id: 26, text: "Frequentemente é rancoroso ou vingativo.", subscale: "O" },
];

const SCALE_OPTS = [
  { v: 0, l: 'Nada' },
  { v: 1, l: 'Um pouco' },
  { v: 2, l: 'Bastante' },
  { v: 3, l: 'Demais' },
];

const SUBSCALE: Record<string, { label: string; color: string }> = {
  I: { label: 'Desatenção', color: 'text-blue-500 bg-blue-50' },
  H: { label: 'Hiperatividade', color: 'text-indigo-500 bg-indigo-50' },
  O: { label: 'Oposição', color: 'text-violet-500 bg-violet-50' },
};

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
    const profName = professional?.name || 'Psicólogo(a)';
    document.title = professional ? `SNAP-IV | ${profName}` : 'SNAP-IV | PsiFlux';
    if (professional) {
      const setMeta = (attr: string, key: string, content: string) => {
        let el = document.querySelector(`meta[${attr}="${key}"]`);
        if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
        el.setAttribute('content', content);
      };
      setMeta('name', 'description', `SNAP-IV solicitado por ${profName}`);
      setMeta('property', 'og:title', `SNAP-IV | ${profName}`);
      if (professional.clinic_logo_url) setMeta('property', 'og:image', getStaticUrl(professional.clinic_logo_url));
    }
  }, [professional]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(answers).length < 26) { alert('Por favor, responda todas as 26 questões.'); return; }
    setLoading(true);
    try {
      const iSum = [1,2,3,4,5,6,7,8,9].map(i => answers[i] || 0).reduce((a, b) => a + b, 0);
      const hSum = [10,11,12,13,14,15,16,17,18].map(i => answers[i] || 0).reduce((a, b) => a + b, 0);
      const oSum = [19,20,21,22,23,24,25,26].map(i => answers[i] || 0).reduce((a, b) => a + b, 0);
      const finalScores = { inattention: Number((iSum / 9).toFixed(2)), hyperactivity: Number((hSum / 9).toFixed(2)), oppositional: Number((oSum / 8).toFixed(2)) };
      const uParam = professionalId ? `?u=${professionalId}` : '';
      const resp = await api.get<any[]>(`/public-profile/snap-iv/${patientId}${uParam}`);
      const currentHistory = Array.isArray(resp) ? resp : [];
      await api.post(`/public-profile/snap-iv/${patientId}${uParam}`, {
        data: [...currentHistory, { id: Date.now(), date: new Date().toISOString(), answers, scores: finalScores, origin: 'external' }]
      });
      setSubmitted(true);
    } catch { setError('Erro ao enviar. Tente novamente.'); }
    finally { setLoading(false); }
  };

  const answered = Object.keys(answers).length;
  const progress = Math.round((answered / 26) * 100);

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle className="text-blue-500" size={32} />
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
      <div className="bg-gradient-to-br from-blue-700 via-indigo-600 to-slate-800 text-white px-5 pt-8 pb-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-[0.05] pointer-events-none rotate-12"><Activity size={260} /></div>
        <div className="absolute -top-20 -left-16 w-72 h-72 bg-white/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="max-w-2xl mx-auto relative z-10 space-y-5">
          <div className="flex items-center gap-2 bg-white/10 w-fit px-4 py-2 rounded-full border border-white/20 backdrop-blur-md">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">Avaliação TDAH — Swanson, Nolan e Pelham</span>
          </div>
          <div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none uppercase italic drop-shadow-lg">SNAP-IV</h1>
            <p className="text-blue-200 text-sm sm:text-base mt-2 font-medium">Escala de Avaliação de TDAH e Oposição</p>
          </div>
          {professional && (
            <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 border border-white/10 backdrop-blur-sm">
              {professional.clinic_logo_url ? (
                <img src={getStaticUrl(professional.clinic_logo_url)} alt={professional.company_name || professional.name} className="w-12 h-12 rounded-2xl bg-white object-contain p-1 shrink-0 shadow-lg" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center font-black text-lg shrink-0">{professional.name?.[0]}</div>
              )}
              <div className="min-w-0">
                <p className="text-blue-200 text-[9px] font-black uppercase tracking-widest opacity-70">Psicólogo(a) Responsável</p>
                <p className="font-black text-base leading-tight truncate">{professional.name}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  {professional.specialty && <span className="text-[10px] font-bold text-blue-100/80 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">{professional.specialty}</span>}
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
          <p className="text-sm text-slate-600 leading-relaxed">Este instrumento deve ser preenchido por <strong>pais ou professores</strong>. Avalie com que frequência cada comportamento ocorre nos <strong className="text-blue-600">últimos 6 meses</strong>.</p>
          <div className="mt-3 p-2.5 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs font-bold text-blue-700">Respondente: ☐ Pai/Mãe &nbsp; ☐ Responsável &nbsp; ☐ Professor(a)</p>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {SCALE_OPTS.map(o => (
              <div key={o.v} className="bg-blue-50 rounded-xl py-2 text-center">
                <p className="text-blue-600 font-black text-base">{o.v}</p>
                <p className="text-[9px] font-bold text-blue-400 leading-tight">{o.l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-500">{answered} de 26 respondidas</span>
            <span className="text-xs font-black text-blue-600">{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          {SNAPIV_ITEMS.map((item, idx) => {
            const sub = SUBSCALE[item.subscale];
            return (
              <div key={item.id} className={`bg-white rounded-2xl border transition-all duration-200 p-4 ${answers[item.id] !== undefined ? 'border-blue-200 shadow-sm' : 'border-slate-100'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <span className="shrink-0 w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 mt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{item.text}</p>
                    <span className={`inline-block mt-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${sub.color}`}>{sub.label}</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {SCALE_OPTS.map(opt => (
                    <button key={opt.v} type="button" onClick={() => setAnswers({ ...answers, [item.id]: opt.v })}
                      className={`h-11 rounded-xl font-black text-sm transition-all border-2 flex flex-col items-center justify-center gap-0.5 ${
                        answers[item.id] === opt.v ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]' : 'bg-slate-50 text-slate-400 border-slate-100 active:bg-blue-50'
                      }`}>
                      <span>{opt.v}</span><span className="text-[8px] font-bold opacity-70">{opt.l}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="pt-2 pb-4">
            <button type="submit" disabled={loading || answered < 26}
              className="w-full bg-blue-600 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-sm shadow-lg shadow-blue-200 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]">
              {loading ? 'Enviando...' : <><span>Finalizar Avaliação</span><ArrowRight size={16} /></>}
            </button>
            {answered < 26 && !loading && <p className="text-center text-xs text-slate-400 mt-2">Responda todas as {26 - answered} questões restantes</p>}
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
