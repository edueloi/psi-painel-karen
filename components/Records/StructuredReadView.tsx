import React from 'react';
import { Info } from 'lucide-react';
import { Badge } from '../UI/Badge';
import { Alert } from '../UI/Alert';
import { ContentCard } from '../UI/PageWrapper';
import { type FieldDef, type SectionDef, type StructuredValues, fieldToText, hasValue } from './specialtyTemplates';

const ReadField: React.FC<{ f: FieldDef; value: any }> = ({ f, value }) => {
  let body: React.ReactNode;
  if (f.type === 'multi' || f.type === 'goals') {
    body = (
      <div className="flex flex-wrap gap-1.5">
        {(value as string[]).filter(Boolean).map(v => <Badge key={v} color={f.type === 'goals' ? 'primary' : 'default'}>{v}</Badge>)}
      </div>
    );
  } else if (f.type === 'rows') {
    const rows = (value as Record<string, string>[]).filter(r => Object.values(r).some(Boolean));
    body = (
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead className="bg-slate-50 text-[11px] text-slate-500">
            <tr>{(f.columns || []).map(c => <th key={c.key} className="px-2.5 py-1.5 font-medium">{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                {(f.columns || []).map(c => <td key={c.key} className="px-2.5 py-1.5 text-slate-700">{r[c.key] || '—'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    body = <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-700">{fieldToText(f, value)}</p>;
  }
  return (
    <div className={`min-w-0 space-y-1 ${f.type === 'textarea' || f.type === 'rows' || f.type === 'multi' || f.type === 'goals' ? 'sm:col-span-2' : ''}`}>
      <p className="text-[11px] font-medium text-slate-500">{f.label}</p>
      {body}
    </div>
  );
};

/** Leitura estruturada: um cartão por seção; seções sem conteúdo ficam de fora. */
export const StructuredReadView: React.FC<{ sections: SectionDef[]; values: StructuredValues }> = ({ sections, values }) => {
  const visible = sections.filter(s => s.fields.some(f => hasValue(values[f.key])));
  const hidden = sections.length - visible.length;
  if (visible.length === 0) {
    return <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-4 text-center text-xs text-slate-500">Nenhuma seção preenchida.</p>;
  }
  return (
    <div className="space-y-3">
      {visible.map(s => {
        const Icon = s.icon;
        return (
          <ContentCard key={s.id} padding="md" className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-primary-100 bg-primary-50 text-primary-700"><Icon size={13} /></span>
              {s.label}
            </h4>
            {s.notice && (
              <div className="flex items-start gap-1.5 text-[11px] text-slate-500"><Info size={12} className="mt-0.5 shrink-0" />{s.notice}</div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {s.fields.filter(f => hasValue(values[f.key])).map(f => <ReadField key={f.key} f={f} value={values[f.key]} />)}
            </div>
          </ContentCard>
        );
      })}
      {hidden > 0 && <p className="text-[11px] text-slate-500">{hidden} {hidden === 1 ? 'seção sem preenchimento oculta' : 'seções sem preenchimento ocultas'}.</p>}
    </div>
  );
};

export const HypothesisNotice: React.FC = () => (
  <Alert variant="info">
    Hipóteses diagnósticas e formulações são provisórias e não constituem conclusão diagnóstica até a finalização do processo avaliativo.
  </Alert>
);
