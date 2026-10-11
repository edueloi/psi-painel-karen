import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { History, RotateCcw, User, Loader2, Lock } from 'lucide-react';
import { api } from '../../services/api';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import { Alert } from '../UI/Alert';
import { EmptyState } from '../UI/EmptyState';
import { ConfirmModal } from '../UI/Modal';
import { ContentCard } from '../UI/PageWrapper';
import { getSections, fieldToText, hasValue, SPECIALTY_TEMPLATES, DEFAULT_SPECIALTY, type RecordKind, type SpecialtyId } from './specialtyTemplates';

export interface HistorySnapshot {
  record_type?: string | null; title?: string; status?: string | null; content?: string; draft_content?: string;
  ai_organized_content?: string | null; tags?: string[]; created_at?: string | null; start_time?: string | null; end_time?: string | null;
  appointment_type?: string | null; appointment_id?: string | null;
}
interface VersionRow {
  id: number; version_no: number; saved_by_name?: string | null; saved_at: string; event: string; status?: string | null;
  summary?: string | null; changes: { key: string; label: string }[];
}
const EVENT_LABEL: Record<string, string> = { criado: 'Criado', editado: 'Editado', aprovado: 'Aprovado', restaurado: 'Restaurado', ia: 'IA aplicada', inicial: 'Versão inicial', reavaliacao: 'Reavaliação' };
const EVENT_COLOR: Record<string, 'success' | 'info' | 'purple' | 'warning' | 'default'> = { criado: 'info', editado: 'default', aprovado: 'success', restaurado: 'warning', ia: 'purple', inicial: 'default', reavaliacao: 'info' };
const STATUS_COLOR: Record<string, 'warning' | 'info' | 'purple' | 'success' | 'default'> = { Rascunho: 'warning', Organizado: 'info', Revisado: 'purple', Aprovado: 'success', Finalizado: 'info' };
const LEGACY_LABELS: Record<string, string> = {
  motivo_consulta: 'Motivo da consulta / tema central', contexto_relevante: 'Contexto relevante', observacoes_clinicas: 'Observações clínicas',
  intervencoes_realizadas: 'Intervenções realizadas', evolucao_resposta: 'Evolução / resposta', plano_terapeutico: 'Plano e próximos passos',
  encaminhamentos: 'Encaminhamentos', observacao_complementar: 'Observação complementar',
};
const strip = (h?: string | null) => (h || '').replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>/gi, '\n').replace(/<[^>]*>/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();
const fmtDT = (d: string) => (d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtDay = (d?: string | null) => (d ? d.split('-').reverse().join('/') : '');

interface FieldLine { key: string; label: string; before: string; after: string }

/** Campos legíveis de um snapshot: [chave, rótulo, texto]. */
function linesOf(snap: HistorySnapshot | null, kind: RecordKind): { key: string; label: string; text: string }[] {
  if (!snap) return [];
  const out: { key: string; label: string; text: string }[] = [];
  const add = (key: string, label: string, text: string) => { if (text && text.trim()) out.push({ key, label, text: text.trim() }); };
  add('title', 'Título', snap.title || '');
  add('status', 'Status', snap.status || '');
  add('tags', 'Marcadores', (snap.tags || []).join(', '));
  add('created_at', 'Data da sessão', fmtDay(snap.created_at));
  add('horario', 'Horário', [snap.start_time, snap.end_time].filter(Boolean).join(' – '));
  let ai: any = null;
  try { ai = snap.ai_organized_content ? JSON.parse(snap.ai_organized_content) : null; } catch { ai = null; }
  if (ai && ai._estruturado && ai._estruturado.values) {
    const spec: SpecialtyId = ai._estruturado.template && SPECIALTY_TEMPLATES[ai._estruturado.template as SpecialtyId] ? ai._estruturado.template : DEFAULT_SPECIALTY;
    const values = ai._estruturado.values as Record<string, any>;
    const seen = new Set<string>();
    getSections(spec, kind).forEach(sec => sec.fields.forEach(f => {
      if (seen.has(f.key)) return;
      seen.add(f.key);
      if (hasValue(values[f.key])) add(`v:${f.key}`, `${sec.label}: ${f.label}`, fieldToText(f, values[f.key]));
    }));
    Object.keys(values).forEach(k => { if (!seen.has(k) && k !== 'sessao_numero' && hasValue(values[k])) add(`v:${k}`, k.replace(/_/g, ' '), typeof values[k] === 'string' ? values[k] : JSON.stringify(values[k])); });
    if (values.sessao_numero) add('v:sessao_numero', 'Nº da sessão', String(values.sessao_numero));
  } else if (ai && typeof ai === 'object' && snap.record_type !== 'Plano') {
    Object.keys(LEGACY_LABELS).forEach(k => { if (typeof ai[k] === 'string') add(`l:${k}`, LEGACY_LABELS[k], ai[k]); });
  } else if (ai && snap.record_type === 'Plano') {
    add('plano', 'Plano terapêutico', [ai.approach && `Abordagem: ${ai.approach}`, ai.summary && `Resumo: ${ai.summary}`, ai.current_focus && `Foco: ${ai.current_focus}`, Array.isArray(ai.goals) && ai.goals.length ? `Metas: ${ai.goals.map((g: any) => g.description).filter(Boolean).join('; ')}` : ''].filter(Boolean).join('\n'));
  } else {
    add('content', 'Conteúdo', strip(snap.content));
  }
  add('draft', 'Texto livre', strip(snap.draft_content));
  return out;
}

export function diffLines(prev: HistorySnapshot | null, next: HistorySnapshot, kind: RecordKind): { changed: FieldLine[]; all: FieldLine[] } {
  const a = new Map(linesOf(prev, kind).map(l => [l.key, l]));
  const b = new Map(linesOf(next, kind).map(l => [l.key, l]));
  const keys = Array.from(new Set([...Array.from(b.keys()), ...Array.from(a.keys())]));
  const all = keys.map(k => ({ key: k, label: (b.get(k) || a.get(k))!.label, before: a.get(k)?.text || '', after: b.get(k)?.text || '' }));
  return { all, changed: all.filter(l => l.before !== l.after) };
}

/** Aba Histórico: linha do tempo, comparação por campo e restauração (como alteração pendente no editor). */
export const HistoryPanel: React.FC<{
  recordId: string | null;
  kind: RecordKind;
  /** Registro aprovado/finalizado: histórico somente leitura. */
  locked: boolean;
  onRestore: (snapshot: HistorySnapshot, versionNo: number) => void;
  /** Muda quando o registro é salvo, para recarregar a lista. */
  refreshKey?: number;
}> = ({ recordId, kind, locked, onRestore, refreshKey = 0 }) => {
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ version: VersionRow & { snapshot: HistorySnapshot | null }; previous: HistorySnapshot | null } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    if (!recordId) return;
    setLoading(true); setError('');
    try {
      const r = await api.get<{ versions: VersionRow[] }>(`/medical-records/${recordId}/history`);
      const list = r?.versions || [];
      setVersions(list);
      setSelected(prev => (prev && list.some(v => v.id === prev) ? prev : list[0]?.id ?? null));
    } catch (e: any) { setError(e?.message || 'Não foi possível carregar o histórico.'); }
    finally { setLoading(false); }
  }, [recordId]);
  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => {
    if (!recordId || !selected) { setDetail(null); return; }
    let alive = true;
    setDetailLoading(true);
    api.get<any>(`/medical-records/${recordId}/history/${selected}`)
      .then(d => { if (alive) setDetail(d); })
      .catch(() => { if (alive) setDetail(null); })
      .finally(() => { if (alive) setDetailLoading(false); });
    return () => { alive = false; };
  }, [recordId, selected]);

  const diff = useMemo(() => (detail?.version.snapshot ? diffLines(detail.previous, detail.version.snapshot, kind) : null), [detail, kind]);

  if (!recordId) {
    return <EmptyState icon={History} title="Histórico ainda não iniciado" description="Salve o registro (o rascunho é salvo automaticamente) para começar a registrar as versões." />;
  }
  const onlyBaseline = versions.length === 1 && versions[0].event === 'inicial';
  const current = versions[0]?.id;
  const sel = detail?.version;

  return (
    <div className="space-y-3 animate-fadeIn">
      {locked && <Alert variant="info" title="Histórico somente leitura"><span className="flex items-start gap-1.5"><Lock size={12} className="mt-0.5 shrink-0" />Registros aprovados não podem ser restaurados. Use o histórico para consultar e comparar as versões.</span></Alert>}
      {error && <Alert variant="error">{error}</Alert>}
      {onlyBaseline && <Alert variant="info">Sem histórico anterior; versões passam a ser registradas a partir de agora. A versão abaixo é o estado atual do registro.</Alert>}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
        <ContentCard padding="md" className="min-w-0 space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-medium text-slate-900"><History size={14} className="text-primary-600" /> Linha do tempo</h3>
          {loading && versions.length === 0 ? <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-primary-500" /></div> : (
            <ol className="max-h-[560px] space-y-1.5 overflow-y-auto pr-1">
              {versions.map(v => {
                const active = v.id === selected;
                return (
                  <li key={v.id}>
                    <button type="button" onClick={() => setSelected(v.id)} aria-current={active ? 'true' : undefined}
                      className={`w-full rounded-lg border p-2.5 text-left transition-colors ${active ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white hover:border-primary-300'}`}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-800">v{v.version_no}</span>
                        <Badge color={EVENT_COLOR[v.event] || 'default'}>{EVENT_LABEL[v.event] || v.event}</Badge>
                        {v.status && <Badge color={STATUS_COLOR[v.status] || 'default'}>{v.status}</Badge>}
                        {v.id === current && <span className="text-[11px] text-slate-500">atual</span>}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">{fmtDT(v.saved_at)}</p>
                      <p className="flex items-center gap-1 text-[11px] text-slate-500"><User size={11} />{v.saved_by_name || 'Sistema'}</p>
                      {v.summary && <p className="mt-1 break-words text-[11px] text-slate-700">{v.summary}</p>}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </ContentCard>

        <ContentCard padding="md" className="min-w-0 space-y-3">
          {detailLoading ? <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-primary-500" /></div> : !sel ? (
            <p className="py-8 text-center text-xs text-slate-500">Selecione uma versão para ver o que mudou.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-slate-900">Versão {sel.version_no} · {EVENT_LABEL[sel.event] || sel.event}</h3>
                  <p className="text-[11px] text-slate-500">{fmtDT(sel.saved_at)} · {sel.saved_by_name || 'Sistema'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAll(v => !v)}>{showAll ? 'Só o que mudou' : 'Mostrar todos os campos'}</Button>
                  {!locked && sel.snapshot && sel.id !== current && (
                    <Button variant="outline" size="sm" iconLeft={<RotateCcw size={14} />} onClick={() => setConfirm(true)}>Restaurar esta versão</Button>
                  )}
                </div>
              </div>
              {!detail?.previous && <p className="text-[11px] text-slate-500">Primeira versão registrada: não há versão anterior para comparar.</p>}
              {diff && (showAll ? diff.all : diff.changed).length === 0 && <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-4 text-center text-xs text-slate-500">Nenhuma diferença de conteúdo em relação à versão anterior.</p>}
              <div className="space-y-2">
                {diff && (showAll ? diff.all : diff.changed).map(l => {
                  const changed = l.before !== l.after;
                  return (
                    <div key={l.key} className="rounded-lg border border-slate-200 p-2.5">
                      <p className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-800">{l.label}{changed && <Badge color="warning">Alterado</Badge>}</p>
                      <div className={`grid grid-cols-1 gap-2 ${detail?.previous ? 'md:grid-cols-2' : ''}`}>
                        {detail?.previous && (
                          <div className="min-w-0">
                            <p className="mb-0.5 text-[11px] font-medium text-slate-500">Anterior</p>
                            <p className={`whitespace-pre-wrap break-words rounded-md px-2 py-1.5 text-xs ${changed ? 'bg-red-50 text-slate-700' : 'bg-slate-50 text-slate-600'}`}>{l.before || '—'}</p>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="mb-0.5 text-[11px] font-medium text-slate-500">Esta versão</p>
                          <p className={`whitespace-pre-wrap break-words rounded-md px-2 py-1.5 text-xs ${changed ? 'bg-emerald-50 text-slate-800' : 'bg-slate-50 text-slate-600'}`}>{l.after || '—'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500">O campo restrito (observações privadas) nunca é guardado no histórico.</p>
            </>
          )}
        </ContentCard>
      </div>

      <ConfirmModal
        isOpen={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => { if (sel?.snapshot) onRestore(sel.snapshot, sel.version_no); setConfirm(false); }}
        title="Restaurar esta versão"
        message={`Os valores da versão ${sel?.version_no ?? ''} serão carregados no editor como alteração pendente. Nada é salvo até você salvar; ao salvar, será criada uma nova versão "Restaurado". O campo restrito não é afetado. Continuar?`}
        confirmLabel="Carregar no editor"
        variant="primary"
      />
    </div>
  );
};
