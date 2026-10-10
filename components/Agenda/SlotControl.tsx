import React, { useMemo, useState } from 'react';
import { CalendarCheck, CalendarX, Repeat, TrendingDown, Info, Plus, Clock } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { Appointment } from '../../types';
import { PanelCard } from '../UI/PanelCard';
import { StatGrid } from '../UI/PageWrapper';
import { StatCard } from '../UI/StatCard';
import { Button } from '../UI/Button';
import { FilterLine, FilterLineSection, FilterLineSegmented } from '../UI/FilterLine';
import { MonthSlots } from './MonthSlots';

// ─────────────────────────────────────────────────────────────────────────────
// Controle de horários da agenda
//
// Semana tipo (dia da semana × hora) montada com os dias e horários ABERTOS na agenda do
// profissional (Configurações da agenda) e com o histórico de atendimentos: mostra o que é fixo
// (semanal), quinzenal, "às vezes ocupado", pouco atendido e livre — com os pacientes de cada
// horário, observações (ex.: "livre, mas às vezes o paciente X vem"), compromissos/bloqueios e o
// que já está agendado à frente. Só lê os agendamentos; não grava nada.
// ─────────────────────────────────────────────────────────────────────────────

type SlotKind = 'livre' | 'pouco' | 'eventual' | 'quinzenal' | 'semanal';

interface WorkDay {
  dayKey: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  active: boolean;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  breaks?: { start: string; end: string }[];
  lunchStart?: string;
  lunchEnd?: string;
}

interface PatientFreq {
  name: string;
  weeks: number;
  last: Date;
}

interface SlotInfo {
  open: boolean; // dentro do horário aberto da agenda
  onBreak: boolean;
  kind: SlotKind;
  usage: number; // fração das semanas da janela com atendimento
  patients: PatientFreq[];
  upcoming: { name: string; date: Date }[]; // já agendado nas próximas semanas
  commitments: string[]; // bloqueios/compromissos pessoais nesse horário
}

const DOW_TO_KEY: Record<number, WorkDay['dayKey']> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday',
};

const WEEKDAYS = [
  { dow: 1, short: 'Seg', long: 'Segunda' },
  { dow: 2, short: 'Ter', long: 'Terça' },
  { dow: 3, short: 'Qua', long: 'Quarta' },
  { dow: 4, short: 'Qui', long: 'Quinta' },
  { dow: 5, short: 'Sex', long: 'Sexta' },
  { dow: 6, short: 'Sáb', long: 'Sábado' },
  { dow: 0, short: 'Dom', long: 'Domingo' },
];

const KIND_META: Record<SlotKind, { label: string; hint: string; cell: string; swatch: string; note: string }> = {
  semanal: {
    label: 'Fixo (semanal)',
    hint: 'Atendido em quase todas as semanas',
    cell: 'bg-primary-600 border-primary-700 text-white',
    swatch: 'bg-primary-600',
    note: 'fixo',
  },
  quinzenal: {
    label: 'Quinzenal',
    hint: 'Atendido em cerca de metade das semanas',
    cell: 'bg-primary-100 border-primary-300 text-primary-900',
    swatch: 'bg-primary-200 border border-primary-300',
    note: 'quinzenal',
  },
  eventual: {
    label: 'Às vezes ocupado',
    hint: 'O paciente passa de vez em quando e o horário já costuma vir preenchido',
    cell: 'bg-amber-100 border-amber-300 text-amber-900',
    swatch: 'bg-amber-200 border border-amber-300',
    note: 'às vezes',
  },
  pouco: {
    label: 'Pouco atendido',
    hint: 'Quase nunca é usado na janela analisada',
    cell: 'bg-orange-50 border-orange-200 text-orange-800',
    swatch: 'bg-orange-100 border border-orange-200',
    note: 'pouco usado',
  },
  livre: {
    label: 'Livre',
    hint: 'Nenhum atendimento na janela analisada',
    cell: 'bg-emerald-50 border-dashed border-emerald-300 text-emerald-700',
    swatch: 'bg-emerald-50 border border-dashed border-emerald-300',
    note: '',
  },
};

const WINDOW_OPTIONS = [
  { value: '4', label: '4 semanas' },
  { value: '8', label: '8 semanas' },
  { value: '12', label: '12 semanas' },
];

const toMinutes = (hhmm?: string) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null;
};

const startOfWeekMonday = (d: Date) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
};

const weekIndex = (date: Date, anchorMonday: Date) =>
  Math.floor((startOfWeekMonday(date).getTime() - anchorMonday.getTime()) / (7 * 24 * 3600 * 1000));

const shortName = (full: string) => {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0)}.` : parts[0];
};

const patientNameOf = (a: Appointment) =>
  (a.patient_name || a.patientName || a.patient_name_text || a.title || '').trim() || 'Paciente';

const fmtHour = (h: number) => `${String(h).padStart(2, '0')}h`;

interface SlotControlProps {
  appointments: Appointment[];
  /** Dias/horários abertos da agenda (Configurações da agenda). Sem isso, usa só o que já foi atendido. */
  workSchedule?: WorkDay[];
  /** Chamado ao agendar em um horário: dia da semana (0-6) e hora cheia. A agenda abre o novo agendamento. */
  onSlotClick?: (dayOfWeek: number, hour: number) => void;
  /** Agenda em uma data/hora específica (visão Mês). */
  onPickDate?: (date: Date) => void;
}

export const SlotControl: React.FC<SlotControlProps> = ({ appointments, workSchedule, onSlotClick, onPickDate }) => {
  const [mode, setMode] = useState<'mes' | 'semana'>('mes');
  const [windowWeeks, setWindowWeeks] = useState('8');
  const [selected, setSelected] = useState<{ dow: number; hour: number } | null>(null);

  const data = useMemo(() => {
    const weeks = Number(windowWeeks);
    const todayMonday = startOfWeekMonday(new Date());
    const anchor = new Date(todayMonday);
    anchor.setDate(anchor.getDate() - weeks * 7);
    const windowEnd = new Date(todayMonday);
    windowEnd.setDate(windowEnd.getDate() + 7);
    const totalWeeks = weeks + 1;
    const now = new Date();

    const valid = appointments.filter((a) => a.status !== 'cancelled' && a.start instanceof Date && !isNaN(a.start.getTime()));

    const slotWeeks = new Map<string, Set<number>>();
    const slotPatients = new Map<string, Map<string, { weeks: Set<number>; last: Date }>>();
    const slotUpcoming = new Map<string, { name: string; date: Date }[]>();
    const slotCommitments = new Map<string, Set<string>>();
    const dowsWithData = new Set<number>();
    const hoursWithData = new Set<number>();

    for (const a of valid) {
      const start = a.start;
      const hour = start.getHours();
      const dow = start.getDay();
      const key = `${dow}-${hour}`;
      const isPatientSession = a.type === 'consulta' || !a.type;
      const name = patientNameOf(a);

      if (start >= windowEnd) {
        if ((start.getTime() - now.getTime()) / (24 * 3600 * 1000) <= 42 && isPatientSession) {
          const list = slotUpcoming.get(key) ?? [];
          list.push({ name, date: start });
          slotUpcoming.set(key, list);
          dowsWithData.add(dow);
          hoursWithData.add(hour);
        }
        continue;
      }
      if (start < anchor) continue;
      const wi = weekIndex(start, anchor);
      if (wi < 0 || wi >= totalWeeks) continue;

      dowsWithData.add(dow);
      hoursWithData.add(hour);

      if (!isPatientSession) {
        const set = slotCommitments.get(key) ?? new Set<string>();
        set.add(a.title?.trim() || (a.type === 'bloqueio' ? 'Bloqueio' : 'Compromisso'));
        slotCommitments.set(key, set);
        continue;
      }

      const weeksSet = slotWeeks.get(key) ?? new Set<number>();
      weeksSet.add(wi);
      slotWeeks.set(key, weeksSet);

      const byPatient = slotPatients.get(key) ?? new Map<string, { weeks: Set<number>; last: Date }>();
      const entry = byPatient.get(name) ?? { weeks: new Set<number>(), last: start };
      entry.weeks.add(wi);
      if (start > entry.last && start <= now) entry.last = start;
      byPatient.set(name, entry);
      slotPatients.set(key, byPatient);
    }

    // Dias/horários abertos da agenda
    const sched = (workSchedule ?? []).filter((d) => d && d.dayKey);
    const hasSchedule = sched.length > 0;
    const dayConfig = new Map<number, WorkDay>();
    for (const d of sched) {
      const dow = Number(Object.entries(DOW_TO_KEY).find(([, k]) => k === d.dayKey)?.[0]);
      if (!Number.isNaN(dow)) dayConfig.set(dow, d);
    }

    const isDayOpen = (dow: number) => (hasSchedule ? !!dayConfig.get(dow)?.active : dow >= 1 && dow <= 5);
    const dayList = WEEKDAYS.filter((d) => isDayOpen(d.dow) || dowsWithData.has(d.dow));

    // faixa de horas: do menor início ao maior fim dos dias ABERTOS (+ horas onde existe atendimento fora do horário)
    let minHour = 24;
    let maxHour = -1;
    for (const d of dayList) {
      const cfg = dayConfig.get(d.dow);
      if (cfg?.active) {
        const s = toMinutes(cfg.start);
        const e = toMinutes(cfg.end);
        if (s !== null) minHour = Math.min(minHour, Math.floor(s / 60));
        if (e !== null) maxHour = Math.max(maxHour, Math.ceil(e / 60) - 1);
      }
    }
    for (const h of hoursWithData) {
      minHour = Math.min(minHour, h);
      maxHour = Math.max(maxHour, h);
    }
    if (minHour === 24 || maxHour === -1) {
      minHour = 8;
      maxHour = 18;
    }
    const hourList: number[] = [];
    for (let h = minHour; h <= maxHour; h++) hourList.push(h);

    const isOpenSlot = (dow: number, hour: number) => {
      const cfg = dayConfig.get(dow);
      if (!hasSchedule) return dow >= 1 && dow <= 5;
      if (!cfg?.active) return false;
      const s = toMinutes(cfg.start);
      const e = toMinutes(cfg.end);
      if (s === null || e === null) return false;
      return hour * 60 >= s && hour * 60 < e;
    };
    const isBreakSlot = (dow: number, hour: number) => {
      const cfg = dayConfig.get(dow);
      if (!cfg) return false;
      const breaks = cfg.breaks ?? (cfg.lunchStart && cfg.lunchEnd ? [{ start: cfg.lunchStart, end: cfg.lunchEnd }] : []);
      return breaks.some((b) => {
        const bs = toMinutes(b.start);
        const be = toMinutes(b.end);
        return bs !== null && be !== null && hour * 60 >= bs && hour * 60 < be;
      });
    };

    const grid = new Map<string, SlotInfo>();
    const tally = { livre: 0, pouco: 0, eventual: 0, quinzenal: 0, semanal: 0 };

    for (const d of dayList) {
      for (const h of hourList) {
        const key = `${d.dow}-${h}`;
        const usage = (slotWeeks.get(key)?.size ?? 0) / totalWeeks;
        let kind: SlotKind;
        if (usage === 0) kind = 'livre';
        else if (usage < 0.12) kind = 'pouco';
        else if (usage < 0.4) kind = 'eventual';
        else if (usage < 0.75) kind = 'quinzenal';
        else kind = 'semanal';

        const patients: PatientFreq[] = [...(slotPatients.get(key)?.entries() ?? [])]
          .map(([name, v]) => ({ name, weeks: v.weeks.size, last: v.last }))
          .sort((a, b) => b.weeks - a.weeks);
        const upcoming = (slotUpcoming.get(key) ?? []).sort((a, b) => a.date.getTime() - b.date.getTime());
        const commitments = [...(slotCommitments.get(key) ?? [])];
        const open = isOpenSlot(d.dow, h);
        const onBreak = open && isBreakSlot(d.dow, h);

        grid.set(key, { open, onBreak, kind, usage, patients, upcoming, commitments });
        if (open && !onBreak && commitments.length === 0) tally[kind] += 1;
      }
    }

    // vagas sugeridas: horários abertos, sem compromisso, livres ou pouco usados e sem paciente já agendado à frente
    const suggestions = [...grid.entries()]
      .map(([key, info]) => {
        const [dow, hour] = key.split('-').map(Number);
        return { dow, hour, info };
      })
      .filter((s) => s.info.open && !s.info.onBreak && s.info.commitments.length === 0 && s.info.upcoming.length === 0 && (s.info.kind === 'livre' || s.info.kind === 'pouco' || s.info.kind === 'eventual'))
      .sort((a, b) => a.info.usage - b.info.usage || a.dow - b.dow || a.hour - b.hour)
      .slice(0, 10);

    return { grid, hourList, dayList, tally, suggestions, hasSchedule };
  }, [appointments, windowWeeks, workSchedule]);

  const { grid, hourList, dayList, tally, suggestions, hasSchedule } = data;
  const dayLong = (dow: number) => WEEKDAYS.find((d) => d.dow === dow)?.long ?? '';

  const noteFor = (info: SlotInfo) => {
    if (info.patients.length === 0) return '';
    const names = info.patients.slice(0, 2).map((p) => shortName(p.name)).join(', ');
    return `às vezes: ${names}${info.patients.length > 2 ? ` +${info.patients.length - 2}` : ''}`;
  };

  const selectedInfo = selected ? grid.get(`${selected.dow}-${selected.hour}`) : undefined;

  const modeToggle = (
    <FilterLineSegmented
      value={mode}
      onChange={(v) => setMode(String(v) as 'mes' | 'semana')}
      options={[
        { value: 'mes', label: 'Mês à frente' },
        { value: 'semana', label: 'Semana tipo' },
      ]}
      size="sm"
    />
  );

  if (mode === 'mes') {
    return (
      <div className="space-y-4 p-3 sm:p-4">
        <FilterLine>
          <FilterLineSection>{modeToggle}</FilterLineSection>
        </FilterLine>
        <MonthSlots appointments={appointments} workSchedule={workSchedule} onPickSlot={onPickDate} />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <FilterLine>
        <FilterLineSection>
          {modeToggle}
          <span className="ml-2 text-xs font-medium text-slate-600">Janela de análise</span>
          <FilterLineSegmented value={windowWeeks} onChange={(v) => setWindowWeeks(String(v))} options={WINDOW_OPTIONS} size="sm" />
        </FilterLineSection>
      </FilterLine>

      {!hasSchedule && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <Info size={14} className="mt-0.5 shrink-0" />
          Os dias e horários de atendimento ainda não foram configurados em Configurações da agenda. Por enquanto a grade usa segunda a sexta e
          os horários em que já houve atendimento.
        </div>
      )}

      <StatGrid cols={4}>
        <StatCard title="Horários livres" value={tally.livre} icon={CalendarX} color="success" />
        <StatCard title="Pouco / às vezes" value={tally.pouco + tally.eventual} icon={TrendingDown} color="warning" />
        <StatCard title="Quinzenais" value={tally.quinzenal} icon={Repeat} color="info" />
        <StatCard title="Fixos (semanais)" value={tally.semanal} icon={CalendarCheck} color="default" />
      </StatGrid>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
          <Info size={12} /> Legenda
        </span>
        {(['semanal', 'quinzenal', 'eventual', 'pouco', 'livre'] as SlotKind[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-slate-700" title={KIND_META[k].hint}>
            <span className={cn('h-3 w-3 rounded-[3px]', KIND_META[k].swatch)} />
            {KIND_META[k].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-slate-700" title="Compromisso pessoal ou bloqueio nesse horário">
          <span className="h-3 w-3 rounded-[3px] bg-slate-300" />
          Compromisso / bloqueio
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-700" title="Agenda fechada neste horário">
          <span className="h-3 w-3 rounded-[3px] bg-slate-100 border border-slate-200" />
          Fechado
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-700" title="Já existe paciente agendado nesse horário nas próximas semanas">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Já agendado à frente
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* Grade */}
        <div className="min-w-0 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[620px] border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 z-10 w-14 border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-left text-[11px] font-medium text-slate-500">
                  Horário
                </th>
                {dayList.map((d) => (
                  <th key={d.dow} className="border-b border-slate-200 px-2 py-2 text-center text-[11px] font-medium text-slate-600">
                    {d.long}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hourList.map((h) => (
                <tr key={h}>
                  <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-[11px] font-medium tabular-nums text-slate-600">
                    {fmtHour(h)}
                  </td>
                  {dayList.map((d) => {
                    const info = grid.get(`${d.dow}-${h}`)!;
                    const isSelected = selected?.dow === d.dow && selected?.hour === h;

                    // fora do horário aberto da agenda
                    if (!info.open && info.patients.length === 0 && info.upcoming.length === 0 && info.commitments.length === 0) {
                      return (
                        <td key={d.dow} className="border-b border-slate-100 p-1">
                          <div className="flex h-11 items-center justify-center rounded-md border border-slate-100 bg-slate-50 text-[10px] text-slate-300" title="Agenda fechada neste horário">
                            —
                          </div>
                        </td>
                      );
                    }

                    const meta = KIND_META[info.kind];
                    const hasUpcoming = info.upcoming.length > 0;
                    const onlyCommitment = info.commitments.length > 0 && info.patients.length === 0;
                    const names = info.patients.slice(0, 3).map((p) => shortName(p.name));
                    const extra = info.patients.length - names.length;

                    let main: string;
                    let sub = '';
                    let cellClass = meta.cell;
                    if (onlyCommitment) {
                      main = info.commitments[0];
                      sub = 'compromisso';
                      cellClass = 'bg-slate-200 border-slate-300 text-slate-700';
                    } else if (info.onBreak && info.patients.length === 0) {
                      main = 'Intervalo';
                      cellClass = 'bg-slate-100 border-slate-200 text-slate-500';
                    } else if (info.kind === 'livre') {
                      main = hasUpcoming ? shortName(info.upcoming[0].name) : 'Livre';
                      sub = hasUpcoming ? 'agendado' : '';
                    } else if (info.kind === 'semanal' || info.kind === 'quinzenal') {
                      main = names.join(' / ') + (extra > 0 ? ` +${extra}` : '');
                      sub = meta.note;
                    } else {
                      // eventual / pouco: horário livre agora, mas com observação de quem às vezes vem
                      main = hasUpcoming ? names.concat([]).slice(0, 2).join(' / ') : 'Livre';
                      sub = hasUpcoming ? meta.note : noteFor(info);
                      if (!hasUpcoming) cellClass = info.kind === 'eventual' ? 'bg-amber-50 border-dashed border-amber-300 text-amber-900' : 'bg-orange-50 border-dashed border-orange-200 text-orange-800';
                    }

                    const title = [
                      `${dayLong(d.dow)} · ${fmtHour(h)} — ${meta.label}`,
                      info.kind !== 'livre' ? `Ocupação: ${Math.round(info.usage * 100)}% das semanas` : meta.hint,
                      ...info.patients.map((p) => `• ${p.name} (${p.weeks}x)`),
                      ...(info.commitments.length ? [`Compromisso: ${info.commitments.join(', ')}`] : []),
                      ...(hasUpcoming ? [`Já agendado: ${info.upcoming.map((u) => `${u.name} em ${u.date.toLocaleDateString('pt-BR')}`).slice(0, 3).join('; ')}`] : []),
                    ].join('\n');

                    return (
                      <td key={d.dow} className="border-b border-slate-100 p-1">
                        <button
                          type="button"
                          title={title}
                          onClick={() => setSelected({ dow: d.dow, hour: h })}
                          className={cn(
                            'relative flex h-11 w-full flex-col items-center justify-center rounded-md border px-1.5 text-center leading-tight transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
                            cellClass,
                            isSelected && 'ring-2 ring-slate-900 ring-offset-1'
                          )}
                        >
                          <span className="line-clamp-1 w-full break-words text-[11px] font-medium">{main}</span>
                          {sub && <span className="line-clamp-1 w-full text-[9px] font-normal opacity-80">{sub}</span>}
                          {hasUpcoming && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          {/* Detalhe do horário selecionado */}
          <PanelCard
            title={selected ? `${dayLong(selected.dow)} · ${fmtHour(selected.hour)}` : 'Detalhes do horário'}
            description={selected ? KIND_META[selectedInfo?.kind ?? 'livre'].label : 'Clique em um horário da grade.'}
            icon={Clock}
            className="h-fit"
          >
            {selected && selectedInfo ? (
              <div className="space-y-3 text-xs">
                {!selectedInfo.open && <p className="rounded-md bg-slate-100 px-2 py-1.5 text-slate-600">Horário fora do período aberto da agenda.</p>}
                <p className="text-slate-600">
                  {selectedInfo.kind === 'livre'
                    ? 'Sem atendimento nesse horário na janela analisada.'
                    : `Atendido em ${Math.round(selectedInfo.usage * 100)}% das semanas analisadas.`}
                </p>
                {selectedInfo.patients.length > 0 && (
                  <div>
                    <p className="mb-1 text-[11px] font-medium text-slate-500">Pacientes neste horário</p>
                    <ul className="divide-y divide-slate-100">
                      {selectedInfo.patients.map((p) => (
                        <li key={p.name} className="flex items-center justify-between gap-2 py-1.5">
                          <span className="min-w-0 truncate font-medium text-slate-800">{p.name}</span>
                          <span className="shrink-0 text-[11px] text-slate-500">
                            {p.weeks}x · último {p.last.toLocaleDateString('pt-BR')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedInfo.commitments.length > 0 && (
                  <p className="rounded-md bg-slate-100 px-2 py-1.5 text-slate-700">Compromisso/bloqueio: {selectedInfo.commitments.join(', ')}</p>
                )}
                {selectedInfo.upcoming.length > 0 && (
                  <div>
                    <p className="mb-1 text-[11px] font-medium text-slate-500">Já agendado à frente</p>
                    <ul className="space-y-1">
                      {selectedInfo.upcoming.slice(0, 5).map((u, i) => (
                        <li key={i} className="text-slate-700">
                          {u.name} — {u.date.toLocaleDateString('pt-BR')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {onSlotClick && (
                  <Button size="sm" fullWidth iconLeft={<Plus size={14} />} onClick={() => onSlotClick(selected.dow, selected.hour)}>
                    Agendar neste horário
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Veja os pacientes, a frequência e o que já está agendado; daqui você pode agendar no horário.</p>
            )}
          </PanelCard>

          {/* Vagas */}
          <PanelCard title="Onde há vaga" description="Horários abertos livres ou pouco usados, bons para novos pacientes." icon={CalendarX} className="h-fit">
            {suggestions.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum horário livre no período analisado.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {suggestions.map((s) => (
                  <li key={`${s.dow}-${s.hour}`}>
                    <button
                      type="button"
                      onClick={() => setSelected({ dow: s.dow, hour: s.hour })}
                      className="flex w-full items-start justify-between gap-2 py-2 text-left text-xs transition-colors hover:text-primary-700"
                    >
                      <span>
                        <span className="block font-medium text-slate-800">
                          {dayLong(s.dow)} · {fmtHour(s.hour)}
                        </span>
                        {s.info.patients.length > 0 && <span className="block text-[11px] text-amber-700">{noteFor(s.info)}</span>}
                      </span>
                      <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium', s.info.kind === 'livre' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                        {s.info.kind === 'livre' ? 'Livre' : KIND_META[s.info.kind].note}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </PanelCard>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">
        A grade segue os dias e horários abertos da sua agenda e usa os atendimentos das últimas semanas (cancelados não contam; bloqueios e compromissos
        aparecem à parte). Passe o mouse em um horário para ver o resumo; clique para ver os detalhes e agendar. O ponto verde indica paciente já
        agendado nas próximas semanas.
      </p>
    </div>
  );
};

export default SlotControl;
