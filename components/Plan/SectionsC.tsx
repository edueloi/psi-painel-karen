import React, { useState } from 'react';
import { CheckCircle2, FileText, HeartHandshake, History, RefreshCw } from 'lucide-react';
import { Badge, Button, Input, Textarea } from '../UI';
import { addVersion, formatDate, formatDateTime, todayISO, uid, type PlanReview } from './model';
import { Empty, EthicsNote, Grid, Hint, ChipMulti, SectionShell, Span, type SectionProps } from './fields';

/* ───────────── 7. Revisões e ajustes ───────────── */
const blankReview = (): Omit<PlanReview, 'id' | 'author' | 'created_at' | 'version_id'> => ({
  date: todayISO(), objective_ids: [], evidence: '', strategies_kept: '', strategies_modified: '',
  new_objectives: '', closed_objectives: '', justification: '', next_review: '',
});

export const ReviewsSection: React.FC<SectionProps & { author: string }> = ({ v2, patch, author }) => {
  const [draft, setDraft] = useState(blankReview);
  const [open, setOpen] = useState(false);
  const set = (changes: Partial<typeof draft>) => setDraft(d => ({ ...d, ...changes }));
  const canSave = draft.justification.trim() || draft.evidence.trim() || draft.objective_ids.length > 0;

  const register = () => {
    const id = uid();
    const snapshotAuthor = author || 'Profissional';
    patch(v => {
      const reviewed = v.objectives.map(o => (draft.objective_ids.includes(o.id) ? { ...o, reviewed_at: draft.date } : o));
      const withReview = {
        ...v, objectives: reviewed,
        overview: draft.next_review ? { ...v.overview, review_date: draft.next_review } : v.overview,
        reviews: [...v.reviews, { ...draft, id, author: snapshotAuthor, created_at: new Date().toISOString(), version_id: '' }],
      };
      const { v2: withVersion, version } = addVersion(withReview, 'revisao', draft.justification.trim() || 'Revisão do plano', snapshotAuthor);
      return { ...withVersion, reviews: withVersion.reviews.map(r => (r.id === id ? { ...r, version_id: version.id } : r)) };
    });
    setDraft(blankReview());
    setOpen(false);
  };

  const versionNumber = (versionId: string) => v2.versions.find(v => v.id === versionId)?.number;

  return (
    <SectionShell id="reviews" v2={v2} patch={patch} icon={RefreshCw}
      actions={!open && <Button type="button" size="sm" iconLeft={<RefreshCw size={14} />} onClick={() => setOpen(true)}>Nova revisão</Button>}>
      <EthicsNote>
        Cada revisão registrada preserva uma versão completa do plano nesse momento. Versões anteriores não são alteradas nem apagadas.
      </EthicsNote>
      {open && (
        <div className="space-y-3 rounded-lg border border-primary-200 bg-primary-50/30 p-3">
          <h4 className="text-sm font-medium text-slate-900">Registrar revisão</h4>
          <Grid>
            <Input label="Data da revisão" type="date" value={draft.date} onChange={e => set({ date: e.target.value })} />
            <Input label="Próxima revisão" type="date" value={draft.next_review} onChange={e => set({ next_review: e.target.value })} hint="Opcional" />
            <Span>
              {v2.objectives.length > 0
                ? <ChipMulti label="Objetivos reavaliados" value={draft.objective_ids} onChange={v => set({ objective_ids: v })}
                    options={v2.objectives.map(o => ({ value: o.id, label: (o.description || 'Objetivo sem descrição').slice(0, 50) }))} />
                : <Hint>Nenhum objetivo cadastrado para reavaliar.</Hint>}
            </Span>
            <Span><Textarea label="Evidências consideradas" rows={2} value={draft.evidence} onChange={e => set({ evidence: e.target.value })} /></Span>
            <Textarea label="Estratégias mantidas" rows={2} value={draft.strategies_kept} onChange={e => set({ strategies_kept: e.target.value })} />
            <Textarea label="Estratégias modificadas" rows={2} value={draft.strategies_modified} onChange={e => set({ strategies_modified: e.target.value })} />
            <Textarea label="Novos objetivos" rows={2} value={draft.new_objectives} onChange={e => set({ new_objectives: e.target.value })} />
            <Textarea label="Objetivos encerrados" rows={2} value={draft.closed_objectives} onChange={e => set({ closed_objectives: e.target.value })} />
            <Span><Textarea label="Justificativa clínica" rows={3} value={draft.justification} onChange={e => set({ justification: e.target.value })} /></Span>
          </Grid>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => { setOpen(false); setDraft(blankReview()); }}>Cancelar</Button>
            <Button type="button" size="sm" iconLeft={<CheckCircle2 size={14} />} disabled={!canSave} onClick={register}>Registrar revisão e criar versão</Button>
          </div>
        </div>
      )}
      {v2.reviews.length === 0 && !open && <Empty icon={History} title="Nenhuma revisão registrada" description="Registre revisões periódicas para documentar ajustes no plano." />}
      <div className="space-y-2">
        {[...v2.reviews].reverse().map(r => (
          <article key={r.id} className="min-w-0 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-medium text-slate-800">Revisão de {formatDate(r.date) || 'data não informada'}</h4>
              <div className="flex flex-wrap items-center gap-1.5">
                {versionNumber(r.version_id) && <Badge color="primary">Versão {versionNumber(r.version_id)}</Badge>}
                {r.author && <span className="text-[11px] text-slate-500">por {r.author}{r.created_at ? ` em ${formatDateTime(r.created_at)}` : ''}</span>}
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              {([
                ['Objetivos reavaliados', r.objective_ids.map(id => v2.objectives.find(o => o.id === id)?.description || 'Objetivo removido').join('; ')],
                ['Evidências', r.evidence], ['Estratégias mantidas', r.strategies_kept], ['Estratégias modificadas', r.strategies_modified],
                ['Novos objetivos', r.new_objectives], ['Objetivos encerrados', r.closed_objectives], ['Justificativa', r.justification],
                ['Próxima revisão', formatDate(r.next_review)],
              ] as Array<[string, string]>).filter(([, val]) => val).map(([k, val]) => (
                <div key={k} className="min-w-0"><dt className="text-[11px] text-slate-500">{k}</dt><dd className="whitespace-pre-wrap break-words text-slate-800">{val}</dd></div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </SectionShell>
  );
};

/* ───────────── 8. Previsão de alta ───────────── */
export const DischargeSection: React.FC<SectionProps> = ({ v2, patch }) => {
  const d = v2.discharge;
  const set = (changes: Partial<typeof d>) => patch(v => ({ ...v, discharge: { ...v.discharge, ...changes } }));
  return (
    <SectionShell id="discharge" v2={v2} patch={patch} icon={CheckCircle2}>
      <EthicsNote>
        A alta é uma decisão clínica compartilhada. Não há data obrigatória e o sistema nunca sugere ou define alta automaticamente.
      </EthicsNote>
      <Grid>
        <Textarea label="Critérios para a alta" rows={3} value={d.criteria} onChange={e => set({ criteria: e.target.value })} />
        <Textarea label="Objetivos alcançados" rows={3} value={d.achieved} onChange={e => set({ achieved: e.target.value })} />
        <Textarea label="Necessidades remanescentes" rows={3} value={d.remaining} onChange={e => set({ remaining: e.target.value })} />
        <Textarea label="Prevenção de recaída" rows={3} value={d.relapse_prevention} onChange={e => set({ relapse_prevention: e.target.value })} />
        <Textarea label="Continuidade do cuidado" rows={3} value={d.continuity} onChange={e => set({ continuity: e.target.value })} />
        <Textarea label="Encaminhamentos" rows={3} value={d.referrals} onChange={e => set({ referrals: e.target.value })} />
      </Grid>
    </SectionShell>
  );
};

/* ───────────── 9. Participação do paciente ───────────── */
export const ParticipationSection: React.FC<SectionProps> = ({ v2, patch }) => {
  const p = v2.participation;
  const set = (changes: Partial<typeof p>) => patch(v => ({ ...v, participation: { ...v.participation, ...changes } }));
  return (
    <SectionShell id="participation" v2={v2} patch={patch} icon={HeartHandshake}>
      <EthicsNote variant="warning">
        Este registro documenta a participação do paciente na construção do plano e não substitui o consentimento formal (termo de consentimento/contrato terapêutico).
      </EthicsNote>
      <Grid>
        <Textarea label="Objetivos discutidos com o paciente" rows={3} value={p.discussed} onChange={e => set({ discussed: e.target.value })} />
        <Textarea label="Preferências do paciente" rows={3} value={p.preferences} onChange={e => set({ preferences: e.target.value })} />
        <Textarea label="Concordâncias" rows={3} value={p.agreements} onChange={e => set({ agreements: e.target.value })} />
        <Textarea label="Divergências" rows={3} value={p.divergences} onChange={e => set({ divergences: e.target.value })} />
        <Textarea label="Barreiras percebidas pelo paciente" rows={3} value={p.perceived_barriers} onChange={e => set({ perceived_barriers: e.target.value })} />
        <Textarea label="Ajustes acordados" rows={3} value={p.adjustments} onChange={e => set({ adjustments: e.target.value })} />
      </Grid>
    </SectionShell>
  );
};

/* ───────────── 10. Observações ───────────── */
export const NotesSection: React.FC<SectionProps> = ({ v2, patch }) => (
  <SectionShell id="notes" v2={v2} patch={patch} icon={FileText}>
    <Textarea label="Observações adicionais" rows={10} maxLength={8000} value={v2.notes} onChange={e => patch(v => ({ ...v, notes: e.target.value }))}
      hint="Texto livre. Conteúdo de planos no formato anterior é preservado aqui quando não tinha campo equivalente." />
  </SectionShell>
);
