import React, { useState } from 'react';
import { CalendarClock, Lock, Plus, X, Link2, Tag } from 'lucide-react';
import { Input, Select } from '../UI/Input';
import { Button } from '../UI/Button';
import { Alert } from '../UI/Alert';
import { ContentCard } from '../UI/PageWrapper';

/* ── Utilitários de data/hora (fuso do painel: America/Sao_Paulo) ───────── */
const TZ = 'America/Sao_Paulo';
export const localDateStr = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ });
export const localTimeStr = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ, hour12: false });
export const fmtIsoDate = (iso: string) => { const [y, m, d] = (iso || '').split('-'); return y && m && d ? `${d}/${m}/${y}` : ''; };
export const timeToMin = (t: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
export const minToTime = (mins: number) => {
  const n = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
};
/** Duração em minutos entre início e fim (null se inválida). */
export const diffMinutes = (start: string, end: string): number | null => {
  const a = timeToMin(start); const b = timeToMin(end);
  if (a === null || b === null) return null;
  return b > a ? b - a : null;
};

export interface AppointmentLite {
  id: string;
  start: Date;
  durationMin: number;
  modality?: string;
  label: string;
}

export const FORMATOS = [
  { value: 'individual', label: 'Individual' },
  { value: 'casal', label: 'Casal' },
  { value: 'familiar', label: 'Família' },
  { value: 'grupo', label: 'Grupo' },
] as const;
export const MODALIDADES_SESSAO = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'online', label: 'Online' },
] as const;
export const DEFAULT_TAG_SUGGESTIONS = ['ansiedade', 'depressão', 'luto', 'trabalho', 'família', 'relacionamento', 'autoestima', 'crise', 'sono', 'TCC'];

/* ── Tags como chips (Enter ou vírgula confirmam) ───────────────────────── */
const TagsInput: React.FC<{ value: string[]; onChange: (v: string[]) => void; suggestions: string[] }> = ({ value, onChange, suggestions }) => {
  const [text, setText] = useState('');
  const add = (raw: string) => {
    const parts = raw.split(',').map(t => t.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    parts.forEach(p => { if (!next.some(x => x.toLowerCase() === p.toLowerCase())) next.push(p); });
    onChange(next);
    setText('');
  };
  const free = suggestions.filter(s => !value.some(v => v.toLowerCase() === s.toLowerCase())).slice(0, 8);
  return (
    <div className="space-y-2">
      <span className="ds-label">Tags</span>
      <div className="flex min-h-[34px] flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 focus-within:border-primary-500">
        {value.map(t => (
          <span key={t} className="inline-flex items-center gap-1 rounded-md border border-primary-100 bg-primary-50 px-1.5 py-0.5 text-[11px] text-primary-700">
            {t}
            <button type="button" aria-label={`Remover tag ${t}`} onClick={() => onChange(value.filter(x => x !== t))} className="text-primary-500 hover:text-primary-800">
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          aria-label="Adicionar tag"
          value={text}
          onChange={e => {
            const v = e.target.value;
            if (v.includes(',')) add(v); else setText(v);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); add(text); }
            else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => add(text)}
          placeholder={value.length ? '' : 'Digite e pressione Enter ou vírgula'}
          className="min-w-[120px] flex-1 border-0 bg-transparent p-0 text-xs text-slate-700 outline-none placeholder:text-slate-400"
        />
      </div>
      {free.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500">Sugestões:</span>
          {free.map(s => (
            <button key={s} type="button" onClick={() => onChange([...value, s])} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-600 hover:border-primary-300 hover:text-primary-700">
              <Plus size={10} />{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface Props {
  recordType: string;
  typeLocked: boolean;
  typeLabel: string;
  typeOptions: [string, string][];
  onRecordTypeChange: (v: string) => void;
  mode: 'new' | 'edit';
  patients: { id: string; full_name: string }[];
  patientId: string;
  onPatientChange: (v: string) => void;
  title: string;
  onTitleChange: (v: string) => void;
  autoTitle: string;
  sessionDate: string;
  onDateChange: (v: string) => void;
  startTime: string;
  endTime: string;
  durationMin: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onDurationChange: (v: string) => void;
  formato: string;
  onFormatoChange: (v: string) => void;
  modalidade: string;
  onModalidadeChange: (v: string) => void;
  showSessionNumber: boolean;
  sessionNumber: string;
  suggestedNumber: number;
  onSessionNumberChange: (v: string) => void;
  tags: string[];
  onTagsChange: (v: string[]) => void;
  tagSuggestions: string[];
  locked: boolean;
  lockReason: string;
  appointments: AppointmentLite[];
  appointmentId: string;
  onLinkAppointment: (id: string) => void;
  suggestedAppointment: AppointmentLite | null;
  /** Ícone do tipo (para o cartão de tipo travado). */
  typeIcon: React.ReactNode;
}

/** Aba "Dados" do editor: identificação e metadados da sessão, todos editáveis (exceto registro aprovado). */
export const SessionDataTab: React.FC<Props> = (p) => {
  const todayStr = localDateStr(new Date());
  const durationInvalid = !!(p.startTime && p.endTime && diffMinutes(p.startTime, p.endTime) === null);
  const sug = p.suggestedAppointment;
  const sugDay = sug ? (localDateStr(sug.start) === todayStr ? 'de hoje' : `do dia ${fmtIsoDate(localDateStr(sug.start)).slice(0, 5)}`) : '';
  return (
    <ContentCard padding="md" className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-medium text-slate-900">
        <CalendarClock size={14} className="text-primary-600" /> Identificação e metadados
      </h3>

      {p.locked && (
        <Alert variant="warning" title="Data e horário bloqueados">
          <span className="flex items-start gap-1.5"><Lock size={12} className="mt-0.5 shrink-0" />{p.lockReason}</span>
        </Alert>
      )}

      {sug && !p.appointmentId && !p.locked && (
        <Alert
          variant="info"
          title="Há um agendamento deste paciente nesta data"
          action={
            <Button type="button" size="xs" variant="primary" iconLeft={<Link2 size={14} />} onClick={() => p.onLinkAppointment(sug.id)}>
              Preencher com o agendamento {sugDay} {localTimeStr(sug.start)}
            </Button>
          }
        >
          {sug.label}. Vincular preenche data, horário, duração, modalidade e nº da sessão.
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Select label="Paciente" value={p.patientId} onChange={e => p.onPatientChange(e.target.value)} disabled={p.mode === 'edit'}>
          <option value="">Selecione...</option>
          {p.patients.map(pt => <option key={pt.id} value={pt.id}>{pt.full_name}</option>)}
        </Select>

        {p.typeLocked ? (
          <div className="flex flex-col gap-1">
            <span className="ds-label">Tipo de registro</span>
            <div className="flex h-[34px] items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-2.5 text-[13px] font-medium text-primary-700">
              {p.typeIcon}{p.typeLabel}
            </div>
          </div>
        ) : (
          <Select label="Tipo de registro" value={p.recordType} onChange={e => p.onRecordTypeChange(e.target.value)} disabled={p.mode === 'edit'}>
            {p.typeOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        )}

        <div className="min-w-0">
          <Input label="Título" value={p.title} onChange={e => p.onTitleChange(e.target.value)} />
          {p.title !== p.autoTitle && (
            <button type="button" onClick={() => p.onTitleChange(p.autoTitle)} className="mt-1 text-[11px] text-slate-500 underline-offset-2 hover:text-primary-700 hover:underline">
              Usar sugestão: {p.autoTitle}
            </button>
          )}
        </div>

        <Input label="Data" type="date" value={p.sessionDate} onChange={e => p.onDateChange(e.target.value)} disabled={p.locked} max="2100-12-31" />
        <Input label="Início" type="time" value={p.startTime} onChange={e => p.onStartChange(e.target.value)} disabled={p.locked} />
        <Input label="Fim" type="time" value={p.endTime} onChange={e => p.onEndChange(e.target.value)} disabled={p.locked} error={durationInvalid ? 'O fim deve ser depois do início.' : undefined} />
        <Input
          label="Duração (min)"
          type="number"
          min={1}
          max={600}
          value={p.durationMin}
          onChange={e => p.onDurationChange(e.target.value)}
          disabled={p.locked}
          hint="Ao editar a duração, o horário de fim é recalculado."
        />

        <Select label="Formato da sessão" value={p.formato} onChange={e => p.onFormatoChange(e.target.value)}>
          {FORMATOS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </Select>
        <Select label="Modalidade" value={p.modalidade} onChange={e => p.onModalidadeChange(e.target.value)}>
          {MODALIDADES_SESSAO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>

        {p.showSessionNumber && (
          <div className="min-w-0">
            <Input
              label="Nº da sessão"
              type="number"
              min={1}
              value={p.sessionNumber}
              onChange={e => p.onSessionNumberChange(e.target.value)}
              hint={`Sugestão pela ordem das sessões: ${p.suggestedNumber}.`}
            />
            {p.sessionNumber !== String(p.suggestedNumber) && (
              <button type="button" onClick={() => p.onSessionNumberChange(String(p.suggestedNumber))} className="mt-1 text-[11px] text-slate-500 underline-offset-2 hover:text-primary-700 hover:underline">
                Usar {p.suggestedNumber}
              </button>
            )}
          </div>
        )}

        <Select
          label="Vincular ao agendamento"
          value={p.appointmentId}
          onChange={e => p.onLinkAppointment(e.target.value)}
          disabled={!p.patientId}
          hint={p.patientId ? (p.appointments.length ? 'Agendamentos do paciente nos ±30 dias da data da sessão.' : 'Nenhum agendamento do paciente nesse período.') : 'Selecione o paciente.'}
        >
          <option value="">Sem vínculo</option>
          {p.appointments.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
        </Select>

        <div className="min-w-0 sm:col-span-2 xl:col-span-3">
          <TagsInput value={p.tags} onChange={p.onTagsChange} suggestions={p.tagSuggestions} />
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-slate-500"><Tag size={11} />Data, horário e duração podem ser ajustados enquanto o registro não for aprovado.</p>
    </ContentCard>
  );
};
