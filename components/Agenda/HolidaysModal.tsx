import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { Modal, ModalFooter } from '../UI/Modal';
import { Button } from '../UI/Button';
import { Select } from '../UI/Input';
import { Badge } from '../UI/Badge';
import { EmptyState } from '../UI/EmptyState';
import { GeneratedHoliday, generateBrazilHolidays } from '../../src/lib/brHolidays';
import { ClosedEntry, WEEKDAYS_LONG, formatShort } from '../../src/lib/closedDates';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Datas de dia inteiro já bloqueadas (YYYY-MM-DD) — não são duplicadas. */
  blockedDates: Set<string>;
  onApply: (entries: ClosedEntry[]) => Promise<void>;
}

const isWeekend = (h: GeneratedHoliday) => h.weekday === 0 || h.weekday === 6;

export function HolidaysModal({ isOpen, onClose, blockedDates, onApply }: Props) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const holidays = useMemo(() => generateBrazilHolidays(year), [year]);
  const nacionais = holidays.filter(h => h.kind === 'feriado_nacional');
  const facultativos = holidays.filter(h => h.kind === 'facultativo');

  // Seleção padrão: feriados nacionais em dias úteis ainda não bloqueados.
  useEffect(() => {
    if (!isOpen) return;
    setSelected(new Set(generateBrazilHolidays(year).filter(h => h.kind === 'feriado_nacional' && !isWeekend(h) && !blockedDates.has(h.date)).map(h => h.date)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, year]);

  const toggle = (date: string) => setSelected(prev => { const n = new Set(prev); n.has(date) ? n.delete(date) : n.add(date); return n; });
  const setGroup = (list: GeneratedHoliday[], on: boolean) => setSelected(prev => {
    const n = new Set(prev);
    list.filter(h => !blockedDates.has(h.date)).forEach(h => (on ? n.add(h.date) : n.delete(h.date)));
    return n;
  });

  const apply = async () => {
    const entries: ClosedEntry[] = holidays
      .filter(h => selected.has(h.date) && !blockedDates.has(h.date))
      .map(h => ({ date: h.date, label: h.name, type: h.kind, allDay: true, source: 'auto', year }));
    if (!entries.length) return;
    setSaving(true);
    try { await onApply(entries); onClose(); } catch { /* toast tratado por quem salva */ } finally { setSaving(false); }
  };

  const renderGroup = (title: string, hint: string, list: GeneratedHoliday[]) => {
    const available = list.filter(h => !blockedDates.has(h.date));
    const allOn = available.length > 0 && available.every(h => selected.has(h.date));
    return (
      <section className="space-y-2" aria-label={title}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-slate-900">{title}</h3>
            <p className="text-[11px] text-slate-500">{hint}</p>
          </div>
          <Button size="xs" variant="ghost" onClick={() => setGroup(list, !allOn)} disabled={available.length === 0}>{allOn ? 'Desmarcar todos' : 'Marcar todos'}</Button>
        </div>
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {list.map(h => {
            const blocked = blockedDates.has(h.date);
            const id = `hol-${h.date}`;
            return (
              <li key={h.date}>
                <label htmlFor={id} className={`flex min-h-[44px] cursor-pointer items-center gap-3 px-3 py-2 ${blocked ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-50'}`}>
                  <input id={id} type="checkbox" className="h-4 w-4 shrink-0 rounded border-slate-300 accent-[var(--c-600)]"
                    checked={selected.has(h.date) && !blocked} disabled={blocked} onChange={() => toggle(h.date)} />
                  <span className="w-12 shrink-0 text-[13px] font-medium text-slate-700 tabular-nums">{formatShort(h.date)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-slate-800">{h.name}</span>
                    <span className="block text-[11px] text-slate-500">{WEEKDAYS_LONG[h.weekday]}{h.note ? ` · ${h.note}` : ''}</span>
                  </span>
                  {blocked && <Badge color="default">Já bloqueado</Badge>}
                  {!blocked && isWeekend(h) && <Badge color="default">Fim de semana</Badge>}
                </label>
              </li>
            );
          })}
        </ul>
      </section>
    );
  };

  const count = holidays.filter(h => selected.has(h.date) && !blockedDates.has(h.date)).length;

  return (
    <Modal isOpen={isOpen} onClose={saving ? () => {} : onClose} size="lg" mobileStyle="fullscreen"
      title="Gerar feriados do ano" subtitle="Os feriados móveis (Carnaval, Páscoa, Corpus Christi) são calculados para o ano escolhido."
      footer={<ModalFooter align="between">
        <span className="hidden text-[11px] text-slate-500 sm:inline">{count} {count === 1 ? 'data selecionada' : 'datas selecionadas'}</span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={apply} loading={saving} disabled={count === 0} iconLeft={<CalendarCheck size={14} />}>Aplicar selecionados</Button>
        </div>
      </ModalFooter>}>
      <div className="space-y-4">
        <Select label="Ano" value={String(year)} onChange={e => setYear(Number(e.target.value))} wrapperClassName="sm:max-w-[200px]"
          options={[thisYear, thisYear + 1].map(y => ({ value: String(y), label: String(y) }))} />
        {holidays.length === 0 ? <EmptyState title="Nenhum feriado para o ano escolhido." /> : <>
          {renderGroup('Feriados nacionais', 'Marcados por padrão (exceto os que caem no fim de semana). Feriados estaduais e municipais não entram aqui: adicione-os em "Bloquear período".', nacionais)}
          {renderGroup('Pontos facultativos', 'Desmarcados por padrão. Marque os que você não atende.', facultativos)}
        </>}
      </div>
    </Modal>
  );
}
