import React, { useEffect, useMemo, useState } from 'react';
import { Brain, Calendar, Copy, Edit3, Plus, Loader2 } from 'lucide-react';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import { EmptyState } from '../UI/EmptyState';
import { ContentCard } from '../UI/PageWrapper';
import { StructuredReadView, HypothesisNotice } from './StructuredReadView';
import { SPECIALTY_TEMPLATES, DEFAULT_SPECIALTY, getSections, parseStructured } from './specialtyTemplates';

export interface AssessmentRecord {
  id: string;
  title: string;
  status: string;
  created_at: string;
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

/** Avaliação clínica: versões à esquerda, documento por seções (leitura) à direita. */
export const AssessmentPanel: React.FC<{
  records: AssessmentRecord[];
  fetchFull: (id: string) => Promise<AssessmentRecord | null>;
  onNew: () => void;
  onEdit: (id: string) => void;
  onNewVersion: (base: AssessmentRecord) => void;
  extraActions?: (r: AssessmentRecord) => React.ReactNode;
}> = ({ records, fetchFull, onNew, onEdit, onNewVersion, extraActions }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [full, setFull] = useState<AssessmentRecord | null>(null);
  const [loading, setLoading] = useState(false);

  // versões em ordem cronológica: v1 = mais antiga
  const versions = useMemo(() => {
    const total = records.length;
    return records.map((r, i) => ({ r, v: total - i }));
  }, [records]);

  useEffect(() => {
    if (!records.length) { setSelectedId(null); return; }
    if (!selectedId || !records.some(r => r.id === selectedId)) setSelectedId(records[0].id);
  }, [records, selectedId]);

  useEffect(() => {
    if (!selectedId) { setFull(null); return; }
    let alive = true;
    setLoading(true);
    fetchFull(selectedId)
      .then(d => { if (alive) setFull(d); })
      .catch(() => { if (alive) setFull(records.find(r => r.id === selectedId) || null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (!records.length) {
    return (
      <EmptyState
        icon={Brain}
        title="Nenhuma avaliação clínica"
        description="A avaliação reúne queixa, formulação do caso, exame do estado mental, instrumentos, riscos e conclusão em um documento estruturado."
        action={<Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={onNew}>Nova avaliação</Button>}
      />
    );
  }

  const current = full && full.id === selectedId ? full : records.find(r => r.id === selectedId) || null;
  const structured = current ? parseStructured(current.ai_organized_content) : null;
  const specId = structured?.template || DEFAULT_SPECIALTY;
  const sections = getSections(specId, 'Avaliacao');
  let legacy: Record<string, string> | null = null;
  if (current && !structured && current.ai_organized_content) {
    try { legacy = JSON.parse(current.ai_organized_content); } catch { legacy = null; }
  }
  const legacyFields = legacy ? LEGACY_LABELS.filter(([k]) => typeof legacy![k] === 'string' && legacy![k]) : [];

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-600">Versões ({records.length})</p>
          <Button variant="outline" size="xs" iconLeft={<Plus size={14} />} onClick={onNew}>Nova</Button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {versions.map(({ r, v }) => {
            const active = r.id === selectedId;
            const s = parseStructured(r.ai_organized_content);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedId(r.id)}
                aria-current={active ? 'true' : undefined}
                className={`min-w-[200px] shrink-0 rounded-lg border p-2.5 text-left transition-colors lg:min-w-0 ${active ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white hover:border-primary-300'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-800">Versão {v}</span>
                  <Badge color={STATUS_COLOR[r.status] || 'default'}>{r.status}</Badge>
                </div>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><Calendar size={11} /> {fmtDate(r.created_at)}</p>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">{s ? SPECIALTY_TEMPLATES[s.template]?.label : 'Modelo anterior'}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 space-y-3">
        {current && (
          <ContentCard padding="md" className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-medium text-slate-900">{current.title}</h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Avaliação de {fmtDate(current.created_at)}{current.professional_name ? ` · ${current.professional_name}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {extraActions?.(current)}
                <Button variant="outline" size="sm" iconLeft={<Copy size={14} />} onClick={() => onNewVersion(current)}>Nova versão</Button>
                <Button variant="primary" size="sm" iconLeft={<Edit3 size={14} />} onClick={() => onEdit(current.id)}>Editar</Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge color="teal" icon={<Brain size={11} />}>{SPECIALTY_TEMPLATES[specId]?.label}</Badge>
              <Badge color={STATUS_COLOR[current.status] || 'default'}>{current.status}</Badge>
            </div>
          </ContentCard>
        )}
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
    </div>
  );
};
