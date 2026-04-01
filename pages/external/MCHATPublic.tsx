import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, getStaticUrl } from '../../services/api';
import { CheckCircle, ArrowRight, ShieldCheck, Activity } from 'lucide-react';

const MCHAT_ITEMS = [
  { id: 1, text: "Se você apontar para algo no outro lado do cômodo, a criança olha para o que você apontou?", failAnswer: false },
  { id: 2, text: "Você já se perguntou se a criança pode ter algum problema de audição?", failAnswer: true },
  { id: 3, text: "A criança brinca de faz de conta? (ex.: fingir que está bebendo de uma xícara vazia)", failAnswer: false },
  { id: 4, text: "A criança gosta de subir nas coisas? (ex.: móveis, brinquedos, escadas)", failAnswer: false },
  { id: 5, text: "A criança realiza movimentos incomuns com os dedos perto dos olhos?", failAnswer: true },
  { id: 6, text: "A criança aponta com o dedo para pedir alguma coisa ou para pedir ajuda?", failAnswer: false },
  { id: 7, text: "A criança aponta com o dedo para mostrar algo interessante para você?", failAnswer: false },
  { id: 8, text: "A criança se interessa por outras crianças?", failAnswer: false },
  { id: 9, text: "A criança mostra objetos a você apenas para compartilhar o interesse (não para pedir ajuda)?", failAnswer: false },
  { id: 10, text: "A criança responde quando você a chama pelo nome?", failAnswer: false },
  { id: 11, text: "Quando você sorri para a criança, ela sorri de volta?", failAnswer: false },
  { id: 12, text: "A criança fica chateada com ruídos comuns do dia a dia? (ex.: aspirador, música alta)", failAnswer: true },
  { id: 13, text: "A criança consegue andar?", failAnswer: false },
  { id: 14, text: "A criança olha nos seus olhos quando você está falando, brincando ou vestindo-a?", failAnswer: false },
  { id: 15, text: "A criança tenta copiar o que você faz?", failAnswer: false },
  { id: 16, text: "Se você virar a cabeça para olhar para algo, a criança olha ao redor para ver o que você está olhando?", failAnswer: false },
  { id: 17, text: "A criança tenta chamar sua atenção?", failAnswer: false },
  { id: 18, text: "A criança entende quando você pede para ela fazer alguma coisa?", failAnswer: false },
  { id: 19, text: "Se acontecer alguma coisa nova, a criança olha para o seu rosto para ver como você reage?", failAnswer: false },
  { id: 20, text: "A criança gosta de atividades com movimento? (ex.: ser balançada, pulada nos joelhos)", failAnswer: false },
];

export const MCHATPublic: React.FC = () => {
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('p');
  const professionalId = searchParams.get('u');

  const [answers, setAnswers] = useState<Record<number, boolean>>({});
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
    document.title = professional ? `M-CHAT-R/F | ${profName}` : 'M-CHAT-R/F | PsiFlux';
    if (professional) {
      const setMeta = (attr: string, key: string, content: string) => {
        let el = document.querySelector(`meta[${attr}="${key}"]`);
        if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
        el.setAttribute('content', content);
      };
      setMeta('name', 'description', `M-CHAT-R/F solicitado por ${profName}`);
      setMeta('property', 'og:title', `M-CHAT-R/F | ${profName}`);
      if (professional.clinic_logo_url) setMeta('property', 'og:image', getStaticUrl(professional.clinic_logo_url));
    }
  }, [professional]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(answers).length < 20) { alert('Por favor, responda todas as 20 questões.'); return; }
    setLoading(true);
    try {
      let total = 0;
      MCHAT_ITEMS.forEach(item => { if (answers[item.id] === item.failAnswer) total++; });
      const riskLevel = total <= 2 ? 'Baixo' : total <= 7 ? 'Médio' : 'Alto';
      const uParam = professionalId ? `?u=${professionalId}` : '';
      const resp = await api.get<any[]>(`/public-profile/m-chat-r/${patientId}${uParam}`);
      const currentHistory = Array.isArray(resp) ? resp : [];
      await api.post(`/public-profile/m-chat-r/${patientId}${uParam}`, {
        data: [...currentHistory, { id: Date.now(), date: new Date().toISOString(), answers, scores: { total, riskLevel }, origin: 'external' }]
      });
      setSubmitted(true);
    } catch { setError('Erro ao enviar. Tente novamente.'); }
    finally { setLoading(false); }
  };

  const answered = Object.keys(answers).length;
  const progress = Math.round((answered / 20) * 100);

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle className="text-teal-500" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Enviado!</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">Suas respostas foram encaminhadas com segurança. Os resultados serão discutidos na próxima consulta.</p>
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
    <div className="min-h-screen bg-[#f0fdfb] font-sans pb-8">
      <div className="bg-gradient-to-br from-teal-700 via-emerald-600 to-slate-800 text-white px-5 pt-8 pb-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-[0.05] pointer-events-none rotate-12"><Activity size={260} /></div>
        <div className="absolute -top-20 -left-16 w-72 h-72 bg-white/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="max-w-2xl mx-auto relative z-10 space-y-5">
          <div className="flex items-center gap-2 bg-white/10 w-fit px-4 py-2 rounded-full border border-white/20 backdrop-blur-md">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-100">Protocolo de Triagem — Autismo</span>
          </div>
          <div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none uppercase italic drop-shadow-lg">M-CHAT-R/F</h1>
            <p className="text-teal-200 text-sm sm:text-base mt-2 font-medium">Triagem para sinais de autismo em crianças pequenas</p>
          </div>
          {professional && (
            <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 border border-white/10 backdrop-blur-sm">
              {professional.clinic_logo_url ? (
                <img src={getStaticUrl(professional.clinic_logo_url)} alt={professional.company_name || professional.name} className="w-12 h-12 rounded-2xl bg-white object-contain p-1 shrink-0 shadow-lg" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center font-black text-lg shrink-0">{professional.name?.[0]}</div>
              )}
              <div className="min-w-0">
                <p className="text-teal-200 text-[9px] font-black uppercase tracking-widest opacity-70">Responsável</p>
                <p className="font-black text-base leading-tight truncate">{professional.name}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  {professional.specialty && <span className="text-[10px] font-bold text-teal-100/80 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">{professional.specialty}</span>}
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
          <p className="text-sm text-slate-600 leading-relaxed">Este instrumento deve ser preenchido pelos <strong>pais ou responsáveis</strong> de crianças entre <strong className="text-teal-600">16 e 30 meses</strong>. Responda SIM ou NÃO para cada comportamento.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-500">{answered} de 20 respondidas</span>
            <span className="text-xs font-black text-teal-600">{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          {MCHAT_ITEMS.map((item, idx) => (
            <div key={item.id} className={`bg-white rounded-2xl border transition-all duration-200 p-4 ${answers[item.id] !== undefined ? 'border-teal-200 shadow-sm' : 'border-slate-100'}`}>
              <div className="flex items-start gap-3 mb-3">
                <span className="shrink-0 w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 mt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                <p className="text-sm font-semibold text-slate-800 leading-snug flex-1">{item.text}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[true, false].map(val => (
                  <button key={String(val)} type="button" onClick={() => setAnswers({ ...answers, [item.id]: val })}
                    className={`h-12 rounded-xl font-black text-sm transition-all border-2 ${
                      answers[item.id] === val ? 'bg-teal-600 text-white border-teal-600 shadow-md scale-[1.02]' : 'bg-slate-50 text-slate-400 border-slate-100 active:bg-teal-50'
                    }`}>
                    {val ? 'SIM' : 'NÃO'}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="pt-2 pb-4">
            <button type="submit" disabled={loading || answered < 20}
              className="w-full bg-teal-600 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-sm shadow-lg shadow-teal-200 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]">
              {loading ? 'Enviando...' : <><span>Finalizar Avaliação</span><ArrowRight size={16} /></>}
            </button>
            {answered < 20 && !loading && <p className="text-center text-xs text-slate-400 mt-2">Responda todas as {20 - answered} questões restantes</p>}
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
