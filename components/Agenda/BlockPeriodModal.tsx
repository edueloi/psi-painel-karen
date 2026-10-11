import React, { useEffect, useMemo, useState } from 'react';
import { CalendarOff, Clock } from 'lucide-react';
import { api } from '../../services/api';
import { Modal, ModalFooter } from '../UI/Modal';
import { Button } from '../UI/Button';
import { Input, Select } from '../UI/Input';
import { DatePicker } from '../UI/DatePicker';
import { Switch } from '../UI/Switch';
import { Alert } from '../UI/Alert';
import {
  ClosedEntry, ClosedItem, ClosedType, CLOSED_TYPE_LABEL, CLOSED_TYPE_OPTIONS, MAX_LABEL,
  expandPeriod, formatBR, formatShort, newGroupId, toMinutes,
} from '../../src/lib/closedDates';

export type ScheduleDayLite = { dayKey: string; active: boolean };

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const v = `${String(Math.floor((i * 15) / 60)).padStart(2, '0')}:${String((i * 15) % 60).padStart(2, '0')}`;
  return { value: v, label: v };
});

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Item sendo editado (grupo ou dia único); null = novo bloqueio. */
  editing: ClosedItem | null;
  schedule: ScheduleDayLite[];
  professionalId?: number | string | null;
  /** Aplica a alteração: remove as entradas antigas e adiciona as novas. */
  onSave: (remove: ClosedEntry[], add: ClosedEntry[]) => Promise<void>;
}

interface ConflictApt { date: string; time: string }

const parseUtc = (v: string) => new Date(v.includes('T') ? v : v.replace(' ', 'T') + 'Z');
const toUtcParam = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');

export function BlockPeriodModal({ isOpen, onClose, editing, schedule, professionalId, onSave }: Props) {
  const [type, setType] = useState<ClosedType>('ferias');
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [timeFrom, setTimeFrom] = useState('14:00');
  const [timeTo, setTimeTo] = useState('16:00');
  const [includeAll, setIncludeAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictApt[]>([]);
  const [checking, setChecking] = useState(false);

  // Inicializa ao abrir (novo ou edição).
  useEffect(() => {
    if (!isOpen) return;
    setTouched(false); setSaving(false); setConflicts([]);
    if (editing) {
      const first = editing.entries[0];
      setType(editing.type); setFrom(editing.start); setTo(editing.end !== editing.start ? editing.end : null);
      setLabel(editing.label); setAllDay(!editing.partial);
      setTimeFrom(first.from || '14:00'); setTimeTo(first.to || '16:00');
      const off = editing.entries.some(e => !expandPeriod(e.date, e.date, schedule, false).days.length);
      setIncludeAll(off);
    } else {
      setType('ferias'); setFrom(null); setTo(null); setLabel(''); setAllDay(true);
      setTimeFrom('14:00'); setTimeTo('16:00'); setIncludeAll(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editing]);

  const endDate = to || from;
  const { days, skipped } = useMemo(
    () => (from && endDate ? expandPeriod(from, endDate, schedule, includeAll || !to) : { days: [] as string[], skipped: [] as string[] }),
    [from, endDate, schedule, includeAll, to],
  );

  const errors = {
    from: !from ? 'Informe a data inicial.' : '',
    to: from && to && to < from ? 'A data final deve ser igual ou posterior à inicial.' : '',
    time: !allDay && toMinutes(timeFrom) >= toMinutes(timeTo) ? 'O horário inicial deve ser anterior ao final.' : '',
    label: label.length > MAX_LABEL ? `Máximo de ${MAX_LABEL} caracteres.` : '',
    range: from && endDate && endDate >= from && days.length > 366 ? 'O período não pode passar de 366 dias.' : '',
    days: from && endDate && endDate >= from && days.length === 0 ? 'Nenhum dia atendido no período. Ative "Incluir dias sem atendimento".' : '',
  };
  const invalid = Object.values(errors).some(Boolean);

  // Consulta agendamentos já marcados no período (somente aviso; nunca cancela).
  useEffect(() => {
    if (!isOpen || !from || invalid || days.length === 0 || !professionalId) { setConflicts([]); return; }
    let cancelled = false;
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const start = new Date(`${days[0]}T00:00:00`);
        const end = new Date(`${days[days.length - 1]}T23:59:59`);
        const rows = await api.get<any[]>(`/appointments?professional_id=${encodeURIComponent(String(professionalId))}&start=${encodeURIComponent(toUtcParam(start))}&end=${encodeURIComponent(toUtcParam(end))}`);
        if (cancelled) return;
        const daySet = new Set(days);
        const a = toMinutes(timeFrom); const b = toMinutes(timeTo);
        const found: ConflictApt[] = [];
        (rows || []).forEach(r => {
          if (!r?.start_time || r.status === 'cancelled' || r.type === 'pessoal') return;
          const s = parseUtc(String(r.start_time));
          if (isNaN(s.getTime())) return;
          const e = r.end_time ? parseUtc(String(r.end_time)) : new Date(s.getTime() + 50 * 60000);
          const iso = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
          if (!daySet.has(iso)) return;
          const sm = s.getHours() * 60 + s.getMinutes();
          const em = sm + Math.max(1, Math.round((e.getTime() - s.getTime()) / 60000));
          if (!allDay && !(sm < b && em > a)) return;
          found.push({ date: iso, time: `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}` });
        });
        setConflicts(found.sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time)));
      } catch { if (!cancelled) setConflicts([]); }
      finally { if (!cancelled) setChecking(false); }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [isOpen, from, days, allDay, timeFrom, timeTo, professionalId, invalid]);

  const submit = async () => {
    setTouched(true);
    if (invalid || !from || saving) return;
    const group = days.length > 1 ? (editing?.groupId || newGroupId()) : undefined;
    const finalLabel = label.trim() || CLOSED_TYPE_LABEL[type];
    const add: ClosedEntry[] = days.map(date => ({
      date, label: finalLabel, type, allDay,
      ...(allDay ? {} : { from: timeFrom, to: timeTo }),
      ...(group ? { groupId: group, groupStart: days[0], groupEnd: days[days.length - 1] } : {}),
      source: 'manual', year: Number(date.slice(0, 4)),
    }));
    setSaving(true);
    try { await onSave(editing ? editing.entries : [], add); onClose(); }
    catch { /* o toast de erro é exibido por quem salva */ }
    finally { setSaving(false); }
  };

  const preview = (() => {
    if (!from || errors.to || errors.range) return null;
    const n = days.length;
    const when = allDay ? '' : ` (das ${timeFrom} às ${timeTo} em cada dia)`;
    if (n === 0) return null;
    const range = !to || to === from ? formatBR(from) : `${formatShort(from)} a ${formatBR(to)}`;
    const extra = skipped.length ? ` ${skipped.length} ${skipped.length === 1 ? 'dia sem atendimento foi ignorado' : 'dias sem atendimento foram ignorados'}.` : '';
    return `${range}: ${n} ${n === 1 ? 'dia será fechado' : 'dias serão fechados'}${when}.${extra}`;
  })();

  return (
    <Modal isOpen={isOpen} onClose={saving ? () => {} : onClose} size="lg" mobileStyle="fullscreen"
      title={editing ? 'Editar bloqueio' : 'Bloquear período'}
      subtitle="Feche dias inteiros ou apenas alguns horários da sua agenda."
      footer={<ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={submit} loading={saving} iconLeft={<CalendarOff size={14} />}>{editing ? 'Salvar alterações' : 'Bloquear'}</Button>
      </ModalFooter>}>
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Tipo" value={type} onChange={e => setType(e.target.value as ClosedType)} options={CLOSED_TYPE_OPTIONS} />
          <Input label="Motivo / rótulo" value={label} maxLength={MAX_LABEL} placeholder={CLOSED_TYPE_LABEL[type]} onChange={e => setLabel(e.target.value)} error={touched ? errors.label : undefined} />
          <DatePicker label="De" value={from} onChange={v => { setFrom(v); if (v && to && to < v) setTo(null); }} error={touched ? errors.from : undefined} />
          <DatePicker label="Até (opcional)" value={to} min={from || undefined} onChange={setTo} error={touched ? errors.to : undefined} hint="Deixe vazio para bloquear um dia só." />
        </div>

        <div className="rounded-lg border border-slate-200 p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-slate-700">Dia inteiro</p>
              <p className="text-[11px] text-slate-500">Desligue para bloquear só alguns horários (vale para cada dia do período).</p>
            </div>
            <Switch aria-label="Dia inteiro" checked={allDay} onCheckedChange={setAllDay} />
          </div>
          {!allDay && <div className="grid grid-cols-2 gap-3">
            <Select label="Das" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} options={TIME_OPTIONS} iconLeft={<Clock size={14} />} />
            <Select label="Às" value={timeTo} onChange={e => setTimeTo(e.target.value)} options={TIME_OPTIONS} iconLeft={<Clock size={14} />} error={errors.time || undefined} />
          </div>}
          {to && to !== from && <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-slate-700">Incluir dias sem atendimento</p>
              <p className="text-[11px] text-slate-500">Por padrão, fins de semana e dias fechados na rotina semanal são ignorados.</p>
            </div>
            <Switch aria-label="Incluir dias sem atendimento" checked={includeAll} onCheckedChange={setIncludeAll} />
          </div>}
        </div>

        {(touched && (errors.range || errors.days)) && <Alert variant="error">{errors.range || errors.days}</Alert>}
        {preview && <Alert variant="info">{preview}</Alert>}
        {conflicts.length > 0 && <Alert variant="warning">
          <p className="font-medium">{conflicts.length} {conflicts.length === 1 ? 'agendamento já marcado' : 'agendamentos já marcados'} nesse período.</p>
          <p className="mt-0.5">Eles não serão cancelados automaticamente; reagende ou cancele manualmente na Agenda.</p>
          <p className="mt-1 text-[11px]">{conflicts.slice(0, 6).map(c => `${formatShort(c.date)} às ${c.time}`).join(' · ')}{conflicts.length > 6 ? ` · e mais ${conflicts.length - 6}` : ''}</p>
        </Alert>}
        {checking && conflicts.length === 0 && <p className="text-[11px] text-slate-400">Verificando agendamentos no período...</p>}
        {editing && editing.isGroup && editing.count > 1 && <p className="text-[11px] text-slate-500">Ao salvar, os {editing.count} dias deste período são recriados com os novos dados.</p>}
      </div>
    </Modal>
  );
}
