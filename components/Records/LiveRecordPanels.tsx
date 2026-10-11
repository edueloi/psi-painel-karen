import React, { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ClipboardCheck, Clock, Edit3, History, Layers, Plus, Send, User, AlertTriangle, CalendarX } from 'lucide-react';
import { api } from '../../services/api';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import { Alert } from '../UI/Alert';
import { EmptyState } from '../UI/EmptyState';
import { ContentCard } from '../UI/PageWrapper';
import { Input, Select, Textarea } from '../UI/Input';
import { COBRAR_OPTIONS, FALTA_MOTIVOS, OCORRENCIAS, dayOfStamp, fmtDay, isFaltaOc } from './liveRecords';

const STATUS_COLOR: Record<string, 'warning' | 'info' | 'purple' | 'success' | 'default'> = {
  Rascunho: 'warning', Organizado: 'info', Revisado: 'purple', Aprovado: 'success', Finalizado: 'info',
};
const strip = (h?: string | null) => (h || '').replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>/gi, '\n').replace(/<[^>]*>/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();
const fmtDT = (d?: string | null) => (d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

export interface LiveRecord {
  id: string; title: string; status: string; created_at: string; updated_at?: string;
  professional_name?: string; content?: string; draft_content?: string; ai_organized_content?: string;
}

/** Aviso discreto + lista recolhível dos registros criados antes da regra de registro único (somente leitura/abrir). */
export const PreviousRecordsNotice: React.FC<{ records: LiveRecord[]; onOpen: (id: string) => void; noun?: string }> = ({ records, onOpen, noun = 'deste tipo' }) => {
  const [open, setOpen] = useState(false);
  if (!records.length) return null;
  const n = records.length;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] text-slate-600">
          <AlertTriangle size={12} className="shrink-0 text-amber-600" />
          Há {n} registro{n === 1 ? '' : 's'} anterior{n === 1 ? '' : 'es'} {noun} (criados antes da regra de registro único). O mais recente é tratado como o atual.
        </p>
        <Button variant="ghost" size="xs" iconRight={open ? <ChevronUp size={14} /> : <ChevronDown size={14} />} onClick={() => setOpen(o => !o)}>Registros anteriores</Button>
      </div>
      {open && (
        <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {records.map(r => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-800">{r.title}</p>
                <p className="text-[11px] text-slate-500">{fmtDay(dayOfStamp(r.created_at))}{r.professional_name ? ` · ${r.professional_name}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge color={STATUS_COLOR[r.status] || 'default'}>{r.status}</Badge>
                <Button variant="outline" size="xs" onClick={() => onOpen(r.id)}>Abrir</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** Autoria/última atualização do registro (cabeçalho leve do histórico). */
function useRecordMeta(recordId?: string | null, tick?: any) {
  const [meta, setMeta] = useState<{ created_by?: string | null; created_at?: string | null; last_by?: string | null; last_at?: string | null } | null>(null);
  useEffect(() => {
    if (!recordId) { setMeta(null); return; }
    let alive = true;
    api.get<any>(`/medical-records/${recordId}/history`, { light: '1' }).then(r => { if (alive) setMeta(r?.meta || null); }).catch(() => {});
    return () => { alive = false; };
  }, [recordId, tick]);
  return meta;
}

/** Anamnese viva: um cartão por paciente + ciclos de envio ao paciente como versões anteriores. */
export const AnamnesisLivePanel: React.FC<{
  current: LiveRecord | null;
  older: LiveRecord[];
  sends: any[];
  onUpdate: (id: string) => void;
  onHistory: (id: string) => void;
  onSend: (r: LiveRecord) => void;
  onFillNow: () => void;
  onStartSend: () => void;
  onViewResponses: (sendId: number) => void;
  onOpenOlder: (id: string) => void;
  extraActions?: (r: LiveRecord) => React.ReactNode;
}> = ({ current, older, sends, onUpdate, onHistory, onSend, onFillNow, onStartSend, onViewResponses, onOpenOlder, extraActions }) => {
  const meta = useRecordMeta(current?.id, current?.updated_at);
  if (!current) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Nenhuma anamnese"
        description="A anamnese é única por paciente: é preenchida uma vez e depois atualizada, mantendo o histórico das versões anteriores."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="primary" size="sm" iconLeft={<Edit3 size={14} />} onClick={onFillNow}>Preencher anamnese</Button>
            <Button variant="outline" size="sm" iconLeft={<Send size={14} />} onClick={onStartSend}>Enviar ao paciente</Button>
          </div>
        }
      />
    );
  }
  const sortedSends = [...sends].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  const lastAnswered = sortedSends.find(s => s.status === 'answered');
  const preview = strip(current.content || current.draft_content || '');
  return (
    <div className="space-y-3">
      <ContentCard padding="md" className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-slate-900">{current.title}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1"><Clock size={11} /> Última atualização: {fmtDT(meta?.last_at || current.updated_at || current.created_at)}</span>
              <span className="inline-flex items-center gap-1"><User size={11} /> {meta?.last_by || current.professional_name || '—'}</span>
            </p>
          </div>
          <Badge color={STATUS_COLOR[current.status] || 'default'}>{current.status}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" iconLeft={<Edit3 size={14} />} onClick={() => onUpdate(current.id)}>Atualizar anamnese</Button>
          <Button variant="outline" size="sm" iconLeft={<Send size={14} />} onClick={() => onSend(current)}>
            {lastAnswered ? 'Enviar para o paciente atualizar' : 'Enviar para o paciente responder'}
          </Button>
          <Button variant="ghost" size="sm" iconLeft={<History size={14} />} onClick={() => onHistory(current.id)}>Ver histórico de alterações</Button>
          {extraActions?.(current)}
        </div>
        {preview && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <p className="mb-1 text-xs font-medium text-slate-600">Respostas mais recentes</p>
            <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-700">{preview.length > 600 ? `${preview.slice(0, 600)}…` : preview}</p>
          </div>
        )}
      </ContentCard>

      {sortedSends.length > 0 && (
        <ContentCard padding="md" className="space-y-2">
          <h3 className="text-sm font-medium text-slate-900">Envios ao paciente</h3>
          <p className="text-[11px] text-slate-500">Cada envio é um ciclo de resposta; os anteriores ficam como versões, não como anamneses separadas.</p>
          <ul className="divide-y divide-slate-100">
            {sortedSends.map((s, i) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-800">{s.title || 'Anamnese'}{i === 0 ? ' · mais recente' : ''}</p>
                  <p className="text-[11px] text-slate-500">Enviado em {fmtDay(dayOfStamp(s.created_at))}{s.completed_at ? ` · respondido em ${fmtDay(dayOfStamp(s.completed_at))}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={s.status === 'answered' ? 'success' : s.status === 'cancelled' || s.status === 'expired' ? 'default' : 'warning'}>
                    {s.status === 'answered' ? 'Respondido' : s.status === 'cancelled' ? 'Cancelado' : s.status === 'expired' ? 'Expirado' : 'Aguardando'}
                  </Badge>
                  <Button variant="outline" size="xs" iconLeft={<ClipboardCheck size={14} />} onClick={() => onViewResponses(s.id)}>
                    {s.status === 'answered' ? 'Ver respostas' : 'Status'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}
      <PreviousRecordsNotice records={older} onOpen={onOpenOlder} noun="de anamnese" />
    </div>
  );
};

/** Plano terapêutico vivo: um por paciente, atualizado com versões. */
export const PlanLivePanel: React.FC<{
  current: LiveRecord | null;
  older: LiveRecord[];
  onOpen: (id: string) => void;
  onHistory: (id: string) => void;
  onCreate: () => void;
  extraActions?: (r: LiveRecord) => React.ReactNode;
}> = ({ current, older, onOpen, onHistory, onCreate, extraActions }) => {
  const meta = useRecordMeta(current?.id, current?.updated_at);
  if (!current) {
    return (
      <EmptyState
        icon={Layers}
        title="Nenhum plano terapêutico"
        description="O plano terapêutico é único por paciente: defina necessidades, metas e intervenções e vá atualizando ao longo do acompanhamento."
        action={<Button onClick={onCreate} variant="primary" size="sm" iconLeft={<Plus size={14} />}>Criar plano terapêutico</Button>}
      />
    );
  }
  let summary = '';
  try { const o = JSON.parse(current.ai_organized_content || '{}'); summary = [o.approach, o.summary].filter(Boolean).join(' — '); } catch { summary = ''; }
  summary = summary || strip(current.content || current.draft_content || '');
  return (
    <div className="space-y-3">
      <ContentCard padding="md" className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-slate-900">{current.title}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1"><Clock size={11} /> Última atualização: {fmtDT(meta?.last_at || current.updated_at || current.created_at)}</span>
              <span className="inline-flex items-center gap-1"><User size={11} /> {meta?.last_by || current.professional_name || '—'}</span>
            </p>
          </div>
          <Badge color={STATUS_COLOR[current.status] || 'default'}>{current.status}</Badge>
        </div>
        {summary && <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-700">{summary.length > 500 ? `${summary.slice(0, 500)}…` : summary}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" iconLeft={<Edit3 size={14} />} onClick={() => onOpen(current.id)}>Abrir plano</Button>
          <Button variant="ghost" size="sm" iconLeft={<History size={14} />} onClick={() => onHistory(current.id)}>Ver histórico de alterações</Button>
          {extraActions?.(current)}
        </div>
      </ContentCard>
      <PreviousRecordsNotice records={older} onOpen={onOpen} noun="de plano terapêutico" />
    </div>
  );
};

/** Seção "Falta / ocorrência" da evolução (no lugar das seções clínicas, que ficam opcionais). */
export const FaltaForm: React.FC<{
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  disabled?: boolean;
}> = ({ values, onChange, disabled }) => {
  const oc = String(values.ocorrencia || '');
  const falta = isFaltaOc(oc);
  const pending = falta && !String(values.falta_motivo || '').trim();
  return (
    <ContentCard padding="md" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium text-slate-900"><CalendarX size={14} className="text-primary-600" /> {falta ? 'Falta' : 'Ocorrência da sessão'}</h3>
        {pending && <Badge color="warning">Motivo da falta pendente</Badge>}
      </div>
      <p className="text-[11px] text-slate-500">Registro apenas informativo: nenhum lançamento financeiro é criado automaticamente.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Select label="Motivo" value={values.falta_motivo || ''} onChange={e => onChange('falta_motivo', e.target.value)} disabled={disabled}>
          <option value="">Selecione...</option>
          {FALTA_MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
        </Select>
        <Select label="Avisou antes?" value={values.falta_avisou || ''} onChange={e => onChange('falta_avisou', e.target.value)} disabled={disabled}>
          <option value="">Selecione...</option>
          <option value="Sim">Sim</option>
          <option value="Não">Não</option>
        </Select>
        {values.falta_avisou === 'Sim' && (
          <Input label="Quando avisou" placeholder="Ex.: na véspera, 2h antes" value={values.falta_avisou_quando || ''} onChange={e => onChange('falta_avisou_quando', e.target.value)} disabled={disabled} />
        )}
        <Select label="Contato realizado pela clínica" value={values.falta_contato || ''} onChange={e => onChange('falta_contato', e.target.value)} disabled={disabled}>
          <option value="">Selecione...</option>
          <option value="Sim">Sim</option>
          <option value="Não">Não</option>
        </Select>
        <Input label="Reposição / remarcação (data sugerida)" type="date" value={values.falta_reposicao || ''} onChange={e => onChange('falta_reposicao', e.target.value)} disabled={disabled} />
        <Select label="Cobrar a sessão?" value={values.falta_cobrar || ''} onChange={e => onChange('falta_cobrar', e.target.value)} disabled={disabled}>
          <option value="">Selecione...</option>
          {COBRAR_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
        </Select>
      </div>
      <Textarea label="Complemento do motivo" rows={2} value={values.falta_motivo_texto || ''} onChange={e => onChange('falta_motivo_texto', e.target.value)} disabled={disabled} />
      {values.falta_contato === 'Sim' && (
        <Textarea label="Observação do contato" rows={2} value={values.falta_contato_obs || ''} onChange={e => onChange('falta_contato_obs', e.target.value)} disabled={disabled} />
      )}
      <Textarea label="Observação clínica (opcional)" rows={3} value={values.falta_obs || ''} onChange={e => onChange('falta_obs', e.target.value)} disabled={disabled} />
    </ContentCard>
  );
};

/** Seletor de ocorrência da evolução. */
export const OcorrenciaSelect: React.FC<{ value: string; onChange: (v: string) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => (
  <Select label="Ocorrência da sessão" value={value || 'Sessão realizada'} onChange={e => onChange(e.target.value)} disabled={disabled}>
    {OCORRENCIAS.map(o => <option key={o} value={o}>{o}</option>)}
  </Select>
);

export const SessionsAlerts: React.FC<{
  pendingMotive: number;
  sessionsWithout: { id: number; day: string; start_hm?: string; end_hm?: string }[];
  absencesWithout: number;
  backfilling: boolean;
  onRegister: (s: { id: number; day: string; start_hm?: string; end_hm?: string }) => void;
  onBackfill: () => void;
}> = ({ pendingMotive, sessionsWithout, absencesWithout, backfilling, onRegister, onBackfill }) => {
  if (!pendingMotive && !sessionsWithout.length && !absencesWithout) return null;
  return (
    <div className="space-y-2">
      {pendingMotive > 0 && (
        <Alert variant="warning">{pendingMotive} falta{pendingMotive === 1 ? '' : 's'} sem motivo preenchido. Use "Preencher motivo" na sessão correspondente.</Alert>
      )}
      {absencesWithout > 0 && (
        <Alert variant="info" title="Faltas sem registro">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>{absencesWithout} falta{absencesWithout === 1 ? '' : 's'} na agenda sem evolução na data.</span>
            <Button variant="outline" size="xs" loading={backfilling} onClick={onBackfill}>Gerar registros das faltas pendentes</Button>
          </div>
        </Alert>
      )}
      {sessionsWithout.length > 0 && (
        <ContentCard padding="md" className="space-y-2">
          <h3 className="text-sm font-medium text-slate-900">Sessão sem evolução ({sessionsWithout.length})</h3>
          <ul className="divide-y divide-slate-100">
            {sessionsWithout.slice(0, 8).map(s => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span className="text-xs text-slate-700">{fmtDay(s.day)}{s.start_hm ? ` · ${s.start_hm}${s.end_hm ? ` – ${s.end_hm}` : ''}` : ''}</span>
                <Button variant="outline" size="xs" onClick={() => onRegister(s)}>Registrar evolução</Button>
              </li>
            ))}
          </ul>
          {sessionsWithout.length > 8 && <p className="text-[11px] text-slate-500">e mais {sessionsWithout.length - 8} sessões.</p>}
        </ContentCard>
      )}
    </div>
  );
};
