import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Clock, Loader2, Lock, PauseCircle, Save, ShieldCheck } from 'lucide-react';
import { getStaticUrl } from '../../services/api';
import { Button } from '../../components/UI/Button';
import { Alert } from '../../components/UI/Alert';
import { INSTRUMENTS, CREDITS, type InstrumentId } from '../clinical-tools/schema/instruments';
import { getProgress, pct, type Answers } from '../clinical-tools/schema/scoring';
import { publicInventoriesApi, type PublicInstrumentState, type PublicLinkData } from '../clinical-tools/schema/api';
import { useAnswerSync } from '../clinical-tools/schema/useAnswerSync';
import { InventoryRunner } from '../clinical-tools/schema/InventoryRunner';

type Phase = 'intro' | 'instructions' | 'answer' | 'paused' | 'finished';

/* ───────────── Resposta de um inventário (autosave) ───────────── */
const InstrumentFlow: React.FC<{
  token: string;
  state: PublicInstrumentState;
  index: number;
  total: number;
  onPause: (id: InstrumentId, answers: Answers) => void;
  onCompleted: (id: InstrumentId, answers: Answers, allCompleted: boolean) => void;
}> = ({ token, state, index, total, onPause, onCompleted }) => {
  const id = state.instrument_id;
  const inst = INSTRUMENTS[id];
  const { answers, setAnswer, status, lastError, flush, hasPending } = useAnswerSync(
    state.answers,
    async patch => { await publicInventoriesApi.saveAnswers(token, id, patch); },
  );
  const [busy, setBusy] = useState<'pause' | 'finish' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progress = getProgress(id, answers);

  const pause = async () => {
    setBusy('pause'); setError(null);
    const ok = await flush();
    setBusy(null);
    if (!ok && hasPending()) { setError('Não foi possível salvar agora. Verifique a conexão e tente novamente: suas respostas continuam na tela.'); return; }
    onPause(id, answers);
  };

  const finish = async () => {
    setError(null);
    if (!progress.complete) { setError(`Ainda faltam ${progress.total - progress.answered} resposta(s). Use "Ir ao primeiro sem resposta" ou responda depois.`); return; }
    setBusy('finish');
    try {
      if (!(await flush())) throw new Error('Não foi possível salvar as respostas. Verifique a conexão e tente novamente.');
      const r = await publicInventoriesApi.complete(token, id);
      onCompleted(id, answers, !!r.all_completed);
    } catch (e: any) { setError(e?.message || 'Não foi possível concluir. Tente novamente.'); }
    finally { setBusy(null); }
  };

  const syncText = status === 'saving' ? 'Salvando...' : status === 'saved' ? 'Respostas salvas' : status === 'error' ? 'Sem conexão - tentando salvar de novo' : 'Salvamento automático';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500">Inventário {index + 1} de {total}</p>
          <h2 className="text-base font-medium text-slate-900">{inst.fullName}</h2>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-[11px] ${status === 'error' ? 'text-red-600' : 'text-slate-500'}`} role="status" aria-live="polite">
          {status === 'saving' ? <Loader2 size={12} className="animate-spin" /> : status === 'error' ? <AlertCircle size={12} /> : <Save size={12} />}
          {syncText}
        </span>
      </div>
      {status === 'error' && lastError && <Alert variant="warning">{lastError} Suas respostas continuam na tela e serão reenviadas automaticamente.</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
      <InventoryRunner
        instrumentId={id}
        answers={answers}
        onAnswer={setAnswer}
        onFinish={finish}
        finishLabel="Finalizar este inventário"
        finishLoading={busy === 'finish'}
        footerExtra={<Button variant="outline" size="md" iconLeft={<PauseCircle size={14} />} onClick={pause} loading={busy === 'pause'}>Salvar e continuar depois</Button>}
      />
    </div>
  );
};

/* ───────────── Página ───────────── */
export const SchemaInventoryPublic: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const [data, setData] = useState<PublicLinkData | null>(null);
  const [states, setStates] = useState<PublicInstrumentState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentId, setCurrentId] = useState<InstrumentId | null>(null);

  const load = useCallback(async () => {
    if (!token) { setError('Link inválido. Peça um novo link ao seu psicólogo(a).'); setLoading(false); return; }
    setLoading(true);
    try {
      const d = await publicInventoriesApi.open(token);
      setData(d); setStates(d.instruments); setError(null);
      if (d.all_completed) setPhase('finished');
    } catch (e: any) { setError(e?.message || 'Não foi possível abrir o link.'); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const clinic = data?.professional?.clinic_name || data?.professional?.name;
    document.title = clinic ? `Inventários | ${clinic}` : 'Inventários | Plaelo';
    const robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    return () => { robots.remove(); };
  }, [data]);

  const updateState = (id: InstrumentId, answers: Answers, completed: boolean) => {
    setStates(prev => prev.map(s => {
      if (s.instrument_id !== id) return s;
      const p = getProgress(id, answers);
      return { ...s, answers, answered_count: p.answered, total_count: p.total, status: completed ? 'completed' : p.answered > 0 ? 'in_progress' : s.status };
    }));
  };

  const overall = useMemo(() => {
    const a = states.reduce((acc, s) => acc + getProgress(s.instrument_id, s.answers).answered, 0);
    const t = states.reduce((acc, s) => acc + getProgress(s.instrument_id, s.answers).total, 0);
    return { a, t, p: t ? Math.round((a / t) * 100) : 0 };
  }, [states]);
  const nextPending = states.find(s => s.status !== 'completed');
  const prof = data?.professional;
  const logo = prof?.clinic_logo_url ? getStaticUrl(prof.clinic_logo_url) : null;
  const firstName = data?.patient_first_name;

  const start = (id: InstrumentId) => {
    setCurrentId(id);
    const st = states.find(s => s.instrument_id === id);
    setPhase(st && st.answered_count > 0 ? 'answer' : 'instructions');
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
          {logo ? <img src={logo} alt={prof?.clinic_name || prof?.name || 'Clínica'} className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-0.5" />
            : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-sm font-medium text-white" aria-hidden="true">{(prof?.name || 'P')[0]}</div>}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{prof?.clinic_name || prof?.name || 'Inventários da Terapia do Esquema'}</p>
            {prof && <p className="truncate text-[11px] text-slate-500">{prof.name}{prof.crp ? ` - CRP ${prof.crp}` : ''}</p>}
          </div>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[11px] text-slate-500"><Lock size={12} /> Sigilo</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-3 px-4 pb-16 pt-4">
        {loading ? (
          <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" /> Carregando...</div>
        ) : error || !data ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
            <AlertCircle className="mx-auto mb-2 text-red-500" size={28} />
            <h1 className="text-base font-medium text-slate-900">Não foi possível abrir o link</h1>
            <p className="mt-1 text-xs text-slate-600">{error}</p>
            <div className="mt-3"><Button variant="outline" size="md" onClick={() => void load()}>Tentar novamente</Button></div>
          </div>
        ) : phase === 'finished' ? (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-center">
            <CheckCircle2 className="mx-auto mb-2 text-primary-600" size={36} />
            <h1 className="text-lg font-medium text-slate-900">Obrigado{firstName ? `, ${firstName}` : ''}!</h1>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-slate-600">Suas respostas foram enviadas com segurança. {prof?.name ? `${prof.name} conversará com você sobre elas nas próximas sessões.` : 'Seu(sua) psicólogo(a) conversará com você sobre elas nas próximas sessões.'}</p>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500"><ShieldCheck size={13} /> Você já pode fechar esta página.</p>
          </div>
        ) : phase === 'answer' && currentId ? (
          <InstrumentFlow
            key={currentId}
            token={token}
            state={states.find(s => s.instrument_id === currentId)!}
            index={states.findIndex(s => s.instrument_id === currentId)}
            total={states.length}
            onPause={(id, answers) => { updateState(id, answers, false); setPhase('paused'); window.scrollTo({ top: 0 }); }}
            onCompleted={(id, answers, all) => {
              updateState(id, answers, true);
              setPhase(all ? 'finished' : 'intro'); setCurrentId(null); window.scrollTo({ top: 0 });
            }}
          />
        ) : phase === 'instructions' && currentId ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-[11px] text-slate-500">Inventário {states.findIndex(s => s.instrument_id === currentId) + 1} de {states.length}</p>
              <h1 className="text-base font-medium text-slate-900">{INSTRUMENTS[currentId].fullName}</h1>
              <p className="text-[11px] text-slate-500">{INSTRUMENTS[currentId].reference}</p>
              <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-slate-700">
                <h2 className="text-xs font-medium text-slate-600">Instruções</h2>
                {INSTRUMENTS[currentId].instructions.map((p, i) => <p key={i}>{p}</p>)}
              </div>
              {INSTRUMENTS[currentId].responseType !== 'needs' && (
                <ul className="mt-3 space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  {INSTRUMENTS[currentId].scale.map(s => <li key={s.value}><span className="font-medium text-slate-800">{s.value}.</span> {s.description}</li>)}
                </ul>
              )}
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500"><Clock size={12} /> {INSTRUMENTS[currentId].itemCount} {INSTRUMENTS[currentId].responseType === 'needs' ? 'necessidades' : 'itens'} - cerca de {INSTRUMENTS[currentId].minutes} minutos. Você pode parar e continuar depois.</p>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="outline" size="lg" onClick={() => { setPhase('intro'); setCurrentId(null); }}>Voltar</Button>
              <Button variant="primary" size="lg" iconRight={<ArrowRight size={14} />} onClick={() => setPhase('answer')}>Começar</Button>
            </div>
          </div>
        ) : phase === 'paused' ? (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-center">
            <PauseCircle className="mx-auto mb-2 text-primary-600" size={34} />
            <h1 className="text-base font-medium text-slate-900">Respostas salvas</h1>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-slate-600">Tudo o que você respondeu foi guardado. Quando quiser continuar, abra este mesmo link e você retoma de onde parou.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button variant="primary" size="lg" onClick={() => setPhase('intro')}>Voltar ao início</Button>
            </div>
          </div>
        ) : (
          /* intro */
          <>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h1 className="text-lg font-medium text-slate-900">Olá{firstName ? `, ${firstName}` : ''}!</h1>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                {prof?.name ? `${prof.name} pediu que você respondesse` : 'Seu(sua) psicólogo(a) pediu que você respondesse'} {states.length > 1 ? `a ${states.length} inventários` : 'a um inventário'} da Terapia do Esquema.
                Não há respostas certas ou erradas. Responda com base no que sente.
              </p>
              {data.message && <p className="mt-3 rounded-lg bg-primary-50 p-3 text-[13px] leading-relaxed text-primary-900">{data.message}</p>}
              <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                <li className="flex items-start gap-2"><Save size={14} className="mt-0.5 shrink-0 text-primary-600" /> Cada resposta é salva na hora. Você pode parar e voltar depois pelo mesmo link.</li>
                <li className="flex items-start gap-2"><Lock size={14} className="mt-0.5 shrink-0 text-primary-600" /> Suas respostas são sigilosas e só são vistas pelo(a) seu(sua) psicólogo(a). Não é preciso criar conta.</li>
                {data.expires_at && <li className="flex items-start gap-2"><Clock size={14} className="mt-0.5 shrink-0 text-primary-600" /> O link vale até {new Date(data.expires_at).toLocaleDateString('pt-BR')}.</li>}
              </ul>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-medium text-slate-700">Seu progresso</span><span className="font-medium text-primary-700">{overall.p}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={overall.p} aria-label="Progresso geral">
                <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${overall.p}%` }} />
              </div>
              <ul className="mt-3 divide-y divide-slate-100">
                {states.map((s, i) => {
                  const inst = INSTRUMENTS[s.instrument_id];
                  const p = getProgress(s.instrument_id, s.answers);
                  const done = s.status === 'completed';
                  return (
                    <li key={s.instrument_id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${done ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{done ? <CheckCircle2 size={15} /> : i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-slate-800">{inst.fullName}</p>
                        <p className="text-[11px] text-slate-500">{done ? 'Concluído' : p.answered > 0 ? `${p.answered} de ${p.total} (${pct(p)}%)` : `${inst.itemCount} ${inst.responseType === 'needs' ? 'necessidades' : 'itens'} - cerca de ${inst.minutes} min`}</p>
                      </div>
                      {!done && <Button variant={nextPending?.instrument_id === s.instrument_id ? 'primary' : 'outline'} size="md" onClick={() => start(s.instrument_id)}>{p.answered > 0 ? 'Continuar' : 'Começar'}</Button>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}

        <footer className="space-y-1 pt-2 text-center text-[11px] leading-relaxed text-slate-500">
          <p className="flex items-center justify-center gap-1.5"><ShieldCheck size={12} /> Instrumento de rastreio: não substitui a avaliação clínica nem emite diagnóstico.</p>
          <p>{CREDITS}</p>
        </footer>
      </main>
    </div>
  );
};
