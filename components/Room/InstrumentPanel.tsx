import React, { useEffect, useMemo, useState } from 'react';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { ClipboardList, ExternalLink, Link as LinkIcon, Loader2, Pencil, Search, UserRound } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { getPublicBaseUrl } from '@/src/lib/publicLinks';
import { cn } from '@/src/lib/utils';
import { EmptyState } from '../UI/EmptyState';
import { DarkBadge, DarkButton, DarkCard, DarkInput, DarkPanel, DarkTabs } from './Dark';
import { TestSessionView, type TestQuestion, useTestSession } from './TestSession';

type FormListItem = { id: number; title: string; description?: string; category?: string; hash: string; is_global?: number | boolean };

const ORIGIN_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'own', label: 'Da clínica' },
  { id: 'global', label: 'Do sistema' },
] as const;
type Origin = typeof ORIGIN_TABS[number]['id'];

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ── Painel "Aplicar teste" ───────────────────────────────────────────────────
// O estado do teste em andamento vive em RoomInner (useTestSession) para o paciente
// receber o teste mesmo com o painel fechado; aqui só renderizamos e disparamos.
export const InstrumentPanel: React.FC<{
  patientId: number | null; isHost: boolean; onClose: () => void;
  ts: ReturnType<typeof useTestSession>;
}> = ({ patientId, isHost, onClose, ts }) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [forms, setForms] = useState<FormListItem[] | null>(null);
  const [sentForm, setSentForm] = useState<{ title: string; url: string } | null>(null);
  const [received, setReceived] = useState<{ title: string; url: string } | null>(null);
  const [starting, setStarting] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [origin, setOrigin] = useState<Origin>('all');
  const { success: toastSuccess, error: toastError } = useToast();

  useEffect(() => {
    if (!isHost) return;
    api.get<FormListItem[]>('/forms').then(setForms).catch(() => setForms([]));
  }, [isHost]);

  useEffect(() => {
    if (!room) return;
    const onData = (payload: Uint8Array) => {
      let msg: any;
      try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (msg?.type !== 'psi-instrument') return;
      setReceived({ title: msg.title, url: msg.url });
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => { room.off(RoomEvent.DataReceived, onData); };
  }, [room]);

  const handleSendLink = (form: FormListItem) => {
    const base = `${getPublicBaseUrl()}/f/${form.hash}`;
    const url = patientId ? `${base}?p=${patientId}` : base;
    try {
      localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'psi-instrument', title: form.title, url })), { reliable: true });
    } catch {}
    setSentForm({ title: form.title, url });
    toastSuccess('Instrumento enviado', `${form.title} foi enviado — o paciente responde numa página própria.`);
  };

  // Carrega as perguntas do mesmo endpoint usado pelo módulo de Formulários.
  const handleStartInRoom = async (form: FormListItem, answeredBy: 'host' | 'guest') => {
    setStarting(form.id);
    try {
      const full = await api.get<any>(`/forms/${form.id}`);
      const questions: TestQuestion[] = (full?.questions || []).map((q: any) => ({
        id: String(q.id), type: q.type, text: q.text, required: !!q.required,
        options: Array.isArray(q.options) ? q.options.map((o: any) => ({ label: String(o.label), value: Number(o.value) })) : undefined,
      }));
      ts.start({ title: form.title, formId: form.id, hash: form.hash, questions, answeredBy });
      if (!questions.length) toastSuccess('Aplicação iniciada', 'As perguntas deste modelo não estão disponíveis na sala; o progresso será sincronizado.');
    } catch (err: any) {
      toastError('Erro ao iniciar o teste', err?.message || '');
    } finally {
      setStarting(null);
    }
  };

  const categories = useMemo(
    () => Array.from(new Set((forms || []).map(f => (f.category || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [forms]
  );

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return (forms || []).filter(f => {
      if (origin === 'own' && f.is_global) return false;
      if (origin === 'global' && !f.is_global) return false;
      if (category && (f.category || '').trim() !== category) return false;
      if (!q) return true;
      return norm(`${f.title} ${f.description || ''} ${f.category || ''}`).includes(q);
    });
  }, [forms, query, category, origin]);

  const filtersActive = !!query.trim() || !!category || origin !== 'all';

  return (
    <DarkPanel title="Aplicar teste" icon={<ClipboardList size={16} />} onClose={onClose}>
      {ts.session && (
        <TestSessionView
          session={ts.session}
          canEdit={ts.canEdit}
          isHost={isHost}
          onAnswer={ts.answer}
          onGoTo={ts.goTo}
          onEnd={isHost ? () => ts.end(true) : undefined}
        />
      )}

      {isHost ? (
        <>
          {!ts.session && (
            <p className="text-[11px] leading-snug text-slate-500">
              Aplique na própria sala (os dois lados acompanham as marcações em tempo real) ou envie o link para o paciente responder numa página própria.
            </p>
          )}

          {ts.session ? (
            <p className="text-[11px] text-slate-500">Encerre a aplicação atual para iniciar outro teste.</p>
          ) : (
            <>
              <DarkInput
                aria-label="Buscar teste"
                placeholder="Buscar teste ou formulário"
                value={query}
                onChange={e => setQuery(e.target.value)}
                iconLeft={<Search size={14} />}
              />
              <DarkTabs<Origin> label="Origem dos testes" items={ORIGIN_TABS} value={origin} onChange={setOrigin} />
              {categories.length > 0 && (
                <div role="group" aria-label="Categoria" className="flex flex-wrap gap-1.5">
                  {['', ...categories].map(c => (
                    <button
                      key={c || 'all'}
                      type="button"
                      aria-pressed={category === c}
                      onClick={() => setCategory(c)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
                        category === c ? 'border-primary-500 bg-primary-500/20 text-primary-200' : 'border-white/10 text-slate-400 hover:bg-white/10'
                      )}
                    >
                      {c || 'Todas as categorias'}
                    </button>
                  ))}
                </div>
              )}

              {forms === null ? (
                <div className="flex justify-center p-6"><Loader2 size={20} className="animate-spin text-slate-500" /></div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title={filtersActive ? 'Nenhum teste encontrado' : 'Nenhum formulário cadastrado'}
                  description={filtersActive ? 'Ajuste a busca ou os filtros.' : 'Crie um em Formulários, na tela principal do sistema.'}
                  className="!border-white/10 !bg-white/[0.03] [&_p]:!text-slate-300 [&_div]:!border-white/10 [&_div]:!bg-transparent"
                  action={filtersActive ? <DarkButton size="xs" onClick={() => { setQuery(''); setCategory(''); setOrigin('all'); }}>Limpar filtros</DarkButton> : undefined}
                />
              ) : (
                filtered.map(f => (
                  <DarkCard key={f.id} className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-medium text-slate-100">{f.title}</span>
                      <div className="flex shrink-0 gap-1">
                        {f.category && <DarkBadge>{f.category}</DarkBadge>}
                        {f.is_global ? <DarkBadge tone="primary">Sistema</DarkBadge> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <DarkButton size="xs" variant="primary" loading={starting === f.id} onClick={() => handleStartInRoom(f, 'host')} iconLeft={<Pencil size={12} />}>Eu marco</DarkButton>
                      <DarkButton size="xs" loading={starting === f.id} onClick={() => handleStartInRoom(f, 'guest')} iconLeft={<UserRound size={12} />}>Paciente marca</DarkButton>
                      <DarkButton size="xs" variant="ghost" onClick={() => handleSendLink(f)} iconLeft={<LinkIcon size={12} />}>Enviar link</DarkButton>
                    </div>
                  </DarkCard>
                ))
              )}
            </>
          )}

          {sentForm && (
            <DarkCard className="!border-emerald-500/25 !bg-emerald-500/10">
              <p className="text-[13px] font-medium text-emerald-400">{sentForm.title} enviado</p>
              <a href={sentForm.url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 underline">Ver a página do paciente</a>
            </DarkCard>
          )}
        </>
      ) : (
        <>
          {received && (
            <DarkCard className="flex flex-col gap-2.5 !border-primary-500/25 !bg-primary-500/10">
              <p className="text-[13px] text-slate-200">Seu profissional pediu que você responda: <strong>{received.title}</strong></p>
              <a href={received.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-3.5 py-2.5 text-[13px] font-medium text-white no-underline transition-colors hover:bg-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50">
                Responder agora <ExternalLink size={14} />
              </a>
              <p className="text-[11px] text-slate-500">Abre em outra aba — você pode voltar pra chamada quando terminar.</p>
            </DarkCard>
          )}
          {!ts.session && !received && <p className="text-[13px] text-slate-500">Nenhum teste enviado nesta sessão ainda.</p>}
        </>
      )}
    </DarkPanel>
  );
};
