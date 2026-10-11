import React, { useEffect, useState } from 'react';
import { Brain, Calendar, Edit3, Plus, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import { EmptyState } from '../UI/EmptyState';
import { ContentCard } from '../UI/PageWrapper';
import { Tabs } from '../UI/Tabs';
import { Input } from '../UI/Input';
import { StructuredReadView, HypothesisNotice } from './StructuredReadView';
import { HistoryPanel } from './HistoryPanel';
import { PreviousRecordsNotice } from './LiveRecordPanels';
import { dayOfStamp, dueOverrideOf, fmtDay, reassessInfo } from './liveRecords';
import { SPECIALTY_TEMPLATES, DEFAULT_SPECIALTY, getSections, parseStructured } from './specialtyTemplates';

export interface AssessmentRecord {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at?: string;
  professional_name?: string;
  content?: string;
  draft_content?: string;
  ai_organized_content?: string;
}

const LEGACY_LABELS: [string, string][] = [
  ['motivo_consulta', 'Motivo da consulta / tema central'],
  ['contexto_relevante', 'Contexto relevante'],
  ['observacoes_clinicas', 'Observações clínicas'],
  ['intervencoes_realizadas', 'Intervenções realizadas'],
  ['evolucao_resposta', 'Evolução / resposta'],
  ['plano_terapeutico', 'Plano e próximos passos'],
  ['encaminhamentos', 'Encaminhamentos'],
  ['observacao_complementar', 'Observação complementar'],
];
const STATUS_COLOR: Record<string, 'warning' | 'info' | 'purple' | 'success' | 'default'> = {
  Rascunho: 'warning', Organizado: 'info', Revisado: 'purple', Aprovado: 'success', Finalizado: 'info',
};
const strip = (h: string) => (h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

const VIEW_TABS = [
  { id: 'atual', label: 'Avaliação atual', icon: Brain },
  { id: 'historico', label: 'Histórico e comparação', icon: Calendar },
] as const;

/** Avaliação clínica viva: uma por paciente, reavaliada a cada 6 meses; versões anteriores ficam no histórico. */
export const AssessmentPanel: React.FC<{
  records: AssessmentRecord[];
  fetchFull: (id: string) => Promise<AssessmentRecord | null>;
  onNew: () => void;
  onEdit: (id: string) => void;
  onReassess: (id: string) => void;
  onSaveDue: (id: string, due: string) => Promise<void>;
  onOpenOlder: (id: string) => void;
  extraActions?: (r: AssessmentRecord) => React.ReactNode;
}> = ({ records, fetchFull, onNew, onEdit, onReassess, onSaveDue, onOpenOlder, extraActions }) => {
  const [full, setFull] = useState<AssessmentRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'atual' | 'historico'>('atual');
  const [editingDue, setEditingDue] = useState(false);
  const [dueDraft, setDueDraft] = useState('');
  const [savingDue, setSavingDue] = useState(false);
  const currentRec = records[0] || null;
  const older = records.slice(1);
  const selectedId = currentRec?.id || null;

  useEffect(() => {
    if (!selectedId) { setFull(null); return; }
    let alive = true;
    setLoading(true);
    fetchFull(selectedId)
      .then(d => { if (alive) setFull(d); })
      .catch(() => { if (alive) setFull(currentRec); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, currentRec?.created_at, currentRec?.updated_at]);

  if (!records.length) {
    return (
      <EmptyState
        icon={Brain}
        title="Nenhuma avaliação clínica"
        description="A avaliação é única por paciente e reavaliada a cada 6 meses. Ela reúne queixa, formulação do caso, exame do estado mental, instrumentos, riscos e conclusão."
        action={<Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={onNew}>Criar avaliação clínica</Button>}
      />
    );
  }

  const current = full && full.id === selectedId ? full : currentRec;
  const refDay = dayOfStamp(current?.created_at);
  const info = refDay ? reassessInfo(refDay, dueOverrideOf(current?.ai_organized_content ?? currentRec?.ai_organized_content)) : null;
  const structured = current ? parseStructured(current.ai_organized_content) : null;
  const specId = structured?.template || DEFAULT_SPECIALTY;
  const sections = getSections(specId, 'Avaliacao');
  let legacy: Record<string, string> | null = null;
  if (current && !structured && current.ai_organized_content) {
    try { legacy = JSON.parse(current.ai_organized_content); } catch { legacy = null; }
  }
  const legacyFields = legacy ? LEGACY_LABELS.filter(([k]) => typeof legacy![k] === 'string' && legacy![k]) : [];
  const badgeColor = info?.state === 'late' ? 'danger' : info?.state === 'soon' ? 'warning' : 'success';

  return (
    <div className="space-y-3">
      <Tabs<'atual' | 'historico'> items={VIEW_TABS} value={view} onChange={setView} label="Visão da avaliação" />
      {view === 'historico' && (
        <div className="space-y-3">
          <p className="text-[11px] text-slate-500">Cada versão do histórico é uma avaliação anterior. Selecione uma versão para ver o que mudou em relação à anterior.</p>
          <HistoryPanel recordId={selectedId} kind="Avaliacao" locked onRestore={() => {}} refreshKey={0} />
        </div>
      )}
      {view === 'atual' && (
        <div className="min-w-0 space-y-3">
          {current && (
            <ContentCard padding="md" className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-medium text-slate-900">{current.title}</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Última avaliação em {fmtDate(current.created_at)}{current.professional_name ? ` · ${current.professional_name}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {extraActions?.(current)}
                  <Button variant="outline" size="sm" iconLeft={<Edit3 size={14} />} onClick={() => onEdit(current.id)}>Editar</Button>
                  <Button variant="primary" size="sm" iconLeft={<RefreshCw size={14} />} onClick={() => onReassess(current.id)}>Reavaliar</Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge color="teal" icon={<Brain size={11} />}>{SPECIALTY_TEMPLATES[specId]?.label}</Badge>
                <Badge color={STATUS_COLOR[current.status] || 'default'}>{current.status}</Badge>
                {info && <Badge color={badgeColor}>{info.label}</Badge>}
              </div>
              {info && (
                <div className="flex flex-wrap items-end gap-2">
                  {!editingDue ? (
                    <p className="text-xs text-slate-600">
                      Próxima reavaliação prevista: <span className="font-medium text-slate-900">{fmtDay(info.due)}</span>{' '}
                      <button type="button" className="text-primary-700 underline-offset-2 hover:underline" onClick={() => { setDueDraft(info.due); setEditingDue(true); }}>alterar</button>
                    </p>
                  ) : (
                    <>
                      <Input label="Próxima reavaliação" type="date" value={dueDraft} onChange={e => setDueDraft(e.target.value)} />
                      <Button size="sm" variant="primary" loading={savingDue} onClick={async () => {
                        if (!dueDraft) return;
                        setSavingDue(true);
                        try { await onSaveDue(current.id, dueDraft); setEditingDue(false); } finally { setSavingDue(false); }
                      }}>Salvar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingDue(false)}>Cancelar</Button>
                    </>
                  )}
                </div>
              )}
            </ContentCard>
          )}
          <PreviousRecordsNotice records={older as any} onOpen={onOpenOlder} noun="de avaliação" />
          <HypothesisNotice />
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-primary-500" /></div>
          ) : structured ? (
            <StructuredReadView sections={sections} values={structured.values} />
          ) : legacyFields.length > 0 ? (
            <div className="space-y-3">
              {legacyFields.map(([k, label]) => (
                <ContentCard key={k} padding="md" className="space-y-1">
                  <h4 className="text-sm font-medium text-slate-900">{label}</h4>
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-700">{legacy![k]}</p>
                </ContentCard>
              ))}
            </div>
          ) : (
            <ContentCard padding="md" className="space-y-1">
              <h4 className="text-sm font-medium text-slate-900">Conteúdo do registro</h4>
              <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-700">
                {strip(current?.content || current?.draft_content || '') || 'Sem conteúdo registrado.'}
              </p>
            </ContentCard>
          )}
        </div>
      )}
    </div>
  );
};
