import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, FilePlus2, ListChecks, Loader2, Printer, RotateCcw, Save, BarChart3, AlertCircle } from 'lucide-react';
import { Modal, ModalFooter, ConfirmModal } from '../../../components/UI/Modal';
import { Tabs } from '../../../components/UI/Tabs';
import { Button } from '../../../components/UI/Button';
import { Alert } from '../../../components/UI/Alert';
import { Badge } from '../../../components/UI/Badge';
import { PanelCard } from '../../../components/UI/PanelCard';
import { INSTRUMENTS, CREDITS, SCREENING_NOTE } from './instruments';
import { getProgress, pct } from './scoring';
import { inventoriesApi, type SchemaApplication } from './api';
import { useAnswerSync } from './useAnswerSync';
import { InventoryRunner } from './InventoryRunner';
import { InstrumentResultView } from './ResultViews';
import { buildRecordText, buildReportContext, downloadReportPdf } from './report';
import { useAuth } from '../../../contexts/AuthContext';

type ApplyTab = 'info' | 'items' | 'result';
const applyTabs = [
  { id: 'info', label: 'Instrumento', icon: ClipboardList },
  { id: 'items', label: 'Itens', icon: ListChecks },
  { id: 'result', label: 'Resultado', icon: BarChart3 },
] as const;

interface Props {
  application: SchemaApplication;
  patientName: string;
  onClose: () => void;
  /** Chamado ao fechar ou concluir para a lista recarregar. */
  onChanged: () => void;
  notify?: (msg: string, type?: 'success' | 'error') => void;
}

export const ApplyModal: React.FC<Props> = ({ application, patientName, onClose, onChanged, notify }) => {
  const { user } = useAuth();
  const inst = INSTRUMENTS[application.instrument_id];
  const [app, setApp] = useState<SchemaApplication>(application);
  const completed = app.status === 'completed';
  const [tab, setTab] = useState<ApplyTab>(() => (application.status === 'completed' ? 'result' : application.answered_count > 0 ? 'items' : 'info'));
  const [busy, setBusy] = useState<null | 'complete' | 'reopen' | 'attach' | 'pdf' | 'close'>(null);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { answers, setAnswers, setAnswer, status, lastError, flush, hasPending } = useAnswerSync(
    application.answers,
    async patch => { await inventoriesApi.saveAnswers(app.id, patch); },
    !completed,
  );
  const progress = getProgress(app.instrument_id, answers);

  const close = useCallback(async () => {
    setBusy('close');
    if (hasPending()) await flush();
    setBusy(null);
    if (hasPending() && !window.confirm('Algumas respostas ainda não foram salvas. Fechar mesmo assim?')) return;
    onChanged();
    onClose();
  }, [flush, hasPending, onChanged, onClose]);

  const complete = async () => {
    setError(null); setBusy('complete');
    try {
      if (!(await flush())) throw new Error('Não foi possível salvar as respostas. Tente novamente.');
      await inventoriesApi.complete(app.id);
      const fresh = await inventoriesApi.get(app.id);
      setApp(fresh); setAnswers(fresh.answers); setTab('result');
      notify?.('Inventário concluído.', 'success');
      onChanged();
    } catch (e: any) { setError(e?.message || 'Erro ao concluir.'); }
    finally { setBusy(null); }
  };

  const reopen = async () => {
    setBusy('reopen');
    try {
      await inventoriesApi.reopen(app.id);
      const fresh = await inventoriesApi.get(app.id);
      setApp(fresh); setAnswers(fresh.answers); setTab('items'); setConfirmReopen(false);
      onChanged();
    } catch (e: any) { setError(e?.message || 'Erro ao reabrir.'); }
    finally { setBusy(null); }
  };

  const pdf = async () => {
    setBusy('pdf');
    try {
      const ctx = { patientName, ...(await buildReportContext(patientName, user)) };
      downloadReportPdf(app.instrument_id, { [app.instrument_id]: answers }, ctx, app);
    } catch (e: any) { setError(e?.message || 'Erro ao gerar o PDF.'); }
    finally { setBusy(null); }
  };

  const attach = async () => {
    setBusy('attach');
    try {
      await inventoriesApi.attachRecord(app.id, `Inventário de Esquemas - ${inst.name}`, buildRecordText(app.instrument_id, answers, patientName, app));
      const fresh = await inventoriesApi.get(app.id);
      setApp(fresh);
      notify?.('Resultado anexado ao prontuário como rascunho de avaliação.', 'success');
      onChanged();
    } catch (e: any) { setError(e?.message || 'Erro ao anexar ao prontuário.'); }
    finally { setBusy(null); }
  };

  // se o app foi concluído em outro lugar (ex.: paciente via link) enquanto estava aberto, só recarrega ao abrir
  useEffect(() => { setApp(application); }, [application.id]);

  const syncLabel = completed ? 'Concluído'
    : status === 'saving' ? 'Salvando...'
      : status === 'saved' ? 'Salvo automaticamente'
        : status === 'error' ? 'Erro ao salvar - tentando novamente' : 'Salvamento automático ativo';

  return (
    <>
      <Modal
        isOpen
        onClose={close}
        persistent={busy !== null}
        title={`${inst.name} - ${patientName}`}
        subtitle={`${inst.fullName} - ${progress.answered} de ${progress.total} (${pct(progress)}%)`}
        className="!w-[95vw] !max-w-[95vw] h-[95dvh]"
        mobileStyle="fullscreen"
        footer={
          <ModalFooter align="between">
            <span className={`inline-flex items-center gap-1.5 text-[11px] ${status === 'error' ? 'text-red-600' : 'text-slate-500'}`} role="status" aria-live="polite">
              {status === 'saving' ? <Loader2 size={12} className="animate-spin" /> : status === 'error' ? <AlertCircle size={12} /> : <Save size={12} />}
              {syncLabel}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={close} loading={busy === 'close'}>{completed ? 'Fechar' : 'Salvar e continuar depois'}</Button>
              {completed ? (
                <Button variant="outline" size="sm" iconLeft={<RotateCcw size={14} />} onClick={() => setConfirmReopen(true)}>Reabrir para editar</Button>
              ) : (
                <Button variant="primary" size="sm" iconLeft={<CheckCircle2 size={14} />} onClick={complete} loading={busy === 'complete'} disabled={!progress.complete}
                  title={progress.complete ? undefined : `Faltam ${progress.total - progress.answered} resposta(s)`}>
                  Concluir inventário
                </Button>
              )}
            </div>
          </ModalFooter>
        }
      >
        <div className="space-y-3">
          <Tabs<ApplyTab> items={applyTabs} value={tab} onChange={setTab} label="Seções da aplicação do inventário">
            {error && <Alert variant="error" className="mb-3">{error}</Alert>}
            {status === 'error' && lastError && <Alert variant="warning" className="mb-3" title="Falha ao salvar">{lastError} As respostas continuam na tela e serão reenviadas automaticamente.</Alert>}

            {tab === 'info' && (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_340px]">
                <PanelCard title={inst.fullName} description={inst.reference} icon={ClipboardList}>
                  <div className="space-y-3 text-[13px] leading-relaxed text-slate-700">
                    {inst.instructions.map((p, i) => <p key={i}>{p}</p>)}
                    {inst.responseType !== 'needs' && (
                      <div>
                        <h4 className="mb-1 text-xs font-medium text-slate-700">{inst.scaleTitle}{inst.questionPrompt ? ` - ${inst.questionPrompt}` : ''}</h4>
                        <ul className="space-y-1 text-xs text-slate-600">
                          {inst.scale.map(s => <li key={s.value}><span className="font-medium text-slate-800">{s.value}.</span> {s.description}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </PanelCard>
                <div className="space-y-3">
                  <PanelCard title="Dados do instrumento" icon={ListChecks}>
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <div><dt className="text-[11px] text-slate-500">Itens</dt><dd className="font-medium text-slate-800">{inst.itemCount}</dd></div>
                      <div><dt className="text-[11px] text-slate-500">Tempo estimado</dt><dd className="font-medium text-slate-800">{inst.minutes} min</dd></div>
                      <div><dt className="text-[11px] text-slate-500">Respostas</dt><dd className="font-medium text-slate-800">{progress.answered}/{progress.total}</dd></div>
                      <div><dt className="text-[11px] text-slate-500">Situação</dt><dd><Badge color={completed ? 'success' : progress.answered > 0 ? 'warning' : 'default'} size="sm">{completed ? 'Concluído' : progress.answered > 0 ? 'Em andamento' : 'Não iniciado'}</Badge></dd></div>
                    </dl>
                    <div className="mt-3"><Button variant="primary" size="md" fullWidth onClick={() => setTab('items')} iconLeft={<ListChecks size={14} />}>{progress.answered > 0 && !completed ? 'Continuar de onde parou' : completed ? 'Ver respostas' : 'Começar'}</Button></div>
                  </PanelCard>
                  <Alert variant="info" title="Instrumento de rastreio">{SCREENING_NOTE}</Alert>
                  <p className="text-[11px] leading-relaxed text-slate-500">{CREDITS}</p>
                </div>
              </div>
            )}

            {tab === 'items' && (
              <div className="mx-auto w-full max-w-3xl">
                <InventoryRunner
                  instrumentId={app.instrument_id}
                  answers={answers}
                  onAnswer={setAnswer}
                  readOnly={completed}
                  onFinish={completed ? undefined : () => setTab('result')}
                  finishLabel="Ver resultado"
                />
              </div>
            )}

            {tab === 'result' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">{completed ? 'Resultado do inventário concluído.' : 'Resultado parcial: conclua o inventário para o resultado oficial.'}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" iconLeft={<Printer size={14} />} onClick={pdf} loading={busy === 'pdf'}>Imprimir / PDF</Button>
                    <Button variant="outline" size="sm" iconLeft={<FilePlus2 size={14} />} onClick={attach} loading={busy === 'attach'} disabled={!completed || !!app.attached_record_id}
                      title={!completed ? 'Conclua o inventário para anexar' : app.attached_record_id ? 'Já anexado ao prontuário' : undefined}>
                      {app.attached_record_id ? 'Anexado ao prontuário' : 'Anexar ao prontuário'}
                    </Button>
                  </div>
                </div>
                <InstrumentResultView instrumentId={app.instrument_id} answers={answers} />
              </div>
            )}
          </Tabs>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmReopen}
        onClose={() => setConfirmReopen(false)}
        onConfirm={reopen}
        loading={busy === 'reopen'}
        variant="primary"
        title="Reabrir inventário para edição?"
        message="O inventário volta para 'em andamento' e o resultado oficial é recalculado ao concluir novamente. As respostas atuais são mantidas."
        confirmLabel="Reabrir"
      />
    </>
  );
};

