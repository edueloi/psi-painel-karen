import React, { useMemo, useState } from 'react';
import { BarChart3, ClipboardList, FilePlus2, Layers, Printer, Users, Activity, Gauge, Target, Heart } from 'lucide-react';
import { Tabs } from '../../../components/UI/Tabs';
import { Button } from '../../../components/UI/Button';
import { Select } from '../../../components/UI/Input';
import { Alert } from '../../../components/UI/Alert';
import { EmptyState } from '../../../components/UI/EmptyState';
import { useAuth } from '../../../contexts/AuthContext';
import { INSTRUMENT_ORDER, INSTRUMENTS, type InstrumentId } from './instruments';
import { inventoriesApi, type PatientInventories, type SchemaApplication } from './api';
import { GeneralResultView, InstrumentResultView } from './ResultViews';
import { buildRecordText, buildReportContext, downloadReportPdf } from './report';
import { appDate, fmtDateTime, latestByInstrument, type PatientRef } from './common';
import type { Answers } from './scoring';

type ResultTab = 'general' | InstrumentId;
const resultTabs = [
  { id: 'general', label: 'Resultado geral', icon: Layers },
  { id: 'ysq', label: 'YSQ-S3', icon: BarChart3 },
  { id: 'ypi', label: 'Estilos parentais', icon: Users },
  { id: 'yami', label: 'YAMI', icon: Activity },
  { id: 'yci', label: 'YCI', icon: Gauge },
  { id: 'yrai', label: 'YRAI', icon: Target },
  { id: 'rne', label: 'RNE', icon: Heart },
] as const;

interface Props {
  patient: PatientRef;
  inv: PatientInventories | null;
  onReload: () => void;
  onNotify: (msg: string, type?: 'success' | 'error') => void;
  onGoInventories: () => void;
}

export const ResultsTab: React.FC<Props> = ({ patient, inv, onReload, onNotify, onGoInventories }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<ResultTab>('general');
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<null | 'pdf' | 'attach'>(null);
  const apps = inv?.applications || [];

  // para o resultado geral: concluído mais recente de cada instrumento, senão o mais recente com respostas
  const generalAnswers = useMemo(() => {
    const done = latestByInstrument(apps, true); const any = latestByInstrument(apps, false);
    const out: Partial<Record<InstrumentId, Answers>> = {};
    INSTRUMENT_ORDER.forEach(id => { const a = done[id] || any[id]; if (a) out[id] = a.answers; });
    return out;
  }, [apps]);
  const hasAny = Object.keys(generalAnswers).length > 0;

  const list: SchemaApplication[] = useMemo(() => (tab === 'general' ? [] : apps.filter(a => a.instrument_id === tab && a.answered_count > 0)
    .sort((a, b) => new Date(appDate(b)).getTime() - new Date(appDate(a)).getTime())), [apps, tab]);
  const current: SchemaApplication | undefined = useMemo(() => {
    if (tab === 'general') return undefined;
    const sel = chosen[tab];
    return list.find(a => a.id === sel) || list.find(a => a.status === 'completed') || list[0];
  }, [list, chosen, tab]);

  const pdf = async () => {
    setBusy('pdf');
    try {
      const ctx = { patientName: patient.name, ...(await buildReportContext(patient.name, user)) };
      if (tab === 'general') downloadReportPdf('general', generalAnswers, ctx, null);
      else if (current) downloadReportPdf(tab, { [tab]: current.answers }, ctx, current);
    } catch (e: any) { onNotify(e?.message || 'Erro ao gerar o PDF.', 'error'); }
    finally { setBusy(null); }
  };
  const attach = async () => {
    if (!current || tab === 'general') return;
    setBusy('attach');
    try {
      await inventoriesApi.attachRecord(current.id, `Inventário de Esquemas - ${INSTRUMENTS[tab].name}`, buildRecordText(tab, current.answers, patient.name, current));
      onNotify('Resultado anexado ao prontuário como rascunho de avaliação.', 'success');
      onReload();
    } catch (e: any) { onNotify(e?.message || 'Erro ao anexar ao prontuário.', 'error'); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-3">
      <Tabs<ResultTab> items={resultTabs} value={tab} onChange={setTab} label="Resultados por inventário">
        {!hasAny ? (
          <EmptyState icon={BarChart3} title="Sem resultados ainda" description="Aplique ou envie um inventário. Os resultados aparecem aqui, mesmo parciais, assim que houver respostas."
            action={<Button variant="primary" size="sm" onClick={onGoInventories}>Ir para Inventários</Button>} />
        ) : tab === 'general' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">Síntese integrada dos inventários mais recentes do paciente (aba Resultado GERAL da planilha).</p>
              <Button variant="outline" size="sm" iconLeft={<Printer size={14} />} onClick={pdf} loading={busy === 'pdf'}>Imprimir / PDF</Button>
            </div>
            <GeneralResultView all={generalAnswers} />
          </div>
        ) : !current ? (
          <EmptyState icon={ClipboardList} title={`${INSTRUMENTS[tab].name} ainda sem respostas`} description="Aplique agora ou envie o link ao paciente."
            action={<Button variant="primary" size="sm" onClick={onGoInventories}>Ir para Inventários</Button>} />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <Select label="Aplicação" wrapperClassName="w-full sm:w-72" value={String(current.id)} onChange={e => setChosen(prev => ({ ...prev, [tab]: Number(e.target.value) }))}>
                {list.map(a => <option key={a.id} value={a.id}>{fmtDateTime(appDate(a))} - {a.status === 'completed' ? 'concluído' : `parcial ${a.answered_count}/${a.total_count}`}</option>)}
              </Select>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" iconLeft={<Printer size={14} />} onClick={pdf} loading={busy === 'pdf'}>Imprimir / PDF</Button>
                <Button variant="outline" size="sm" iconLeft={<FilePlus2 size={14} />} onClick={attach} loading={busy === 'attach'} disabled={current.status !== 'completed' || !!current.attached_record_id}
                  title={current.status !== 'completed' ? 'Só é possível anexar inventários concluídos' : undefined}>
                  {current.attached_record_id ? 'Anexado ao prontuário' : 'Anexar ao prontuário'}
                </Button>
              </div>
            </div>
            {current.status !== 'completed' && <Alert variant="warning">Esta aplicação ainda não foi concluída; o resultado é parcial.</Alert>}
            <InstrumentResultView instrumentId={tab} answers={current.answers} />
          </div>
        )}
      </Tabs>
    </div>
  );
};
