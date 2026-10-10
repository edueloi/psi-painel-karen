import React, { useMemo, useState } from 'react';
import { CalendarCheck, CalendarX, Repeat, TrendingDown, Info } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { Appointment } from '../../types';
import { PanelCard } from '../UI/PanelCard';
import { StatGrid } from '../UI/PageWrapper';
import { StatCard } from '../UI/StatCard';
import { FilterLine, FilterLineSection, FilterLineSegmented } from '../UI/FilterLine';

// ─────────────────────────────────────────────────────────────────────────────
// Controle de horários da agenda
//
// Mostra a "semana tipo" do profissional (dia da semana × hora) a partir do histórico de
// atendimentos: quais horários estão livres, quais são pouco atendidos, quais o paciente só às
// vezes ocupa, quais são quinzenais e quais são fixos (semanais) — com o nome dos pacientes em
// cada horário, como na planilha de controle. Não grava nada: só lê os agendamentos.
// ─────────────────────────────────────────────────────────────────────────────

type SlotKind = 'livre' | 'pouco' | 'eventual' | 'quinzenal' | 'semanal';

interface SlotInfo {
  kind: SlotKind;
  usage: number; // fração das semanas da janela em que o horário teve atendimento
  patients: { name: string; weeks: number }[];
  upcoming: { name: string; date: Date }[]; // já agendados nas próximas semanas
}

const WEEKDAYS = [
  { dow: 1, short: 'Seg', long: 'Segunda' },
  { dow: 2, short: 'Ter', long: 'Terça' },
  { dow: 3, short: 'Qua', long: 'Quarta' },
  { dow: 4, short: 'Qui', long: 'Quinta' },
  { dow: 5, short: 'Sex', long: 'Sexta' },
  { dow: 6, short: 'Sáb', long: 'Sábado' },
  { dow: 0, short: 'Dom', long: 'Domingo' },
];

const KIND_META: Record<SlotKind, { label: string; hint: string; cell: string; swatch: string }> = {
  semanal: {
    label: 'Fixo (semanal)',
    hint: 'Atendido em quase todas as semanas',
    cell: 'bg-primary-600 border-primary-700 text-white',
    swatch: 'bg-primary-600',
  },
  quinzenal: {
    label: 'Quinzenal',
    hint: 'Atendido em cerca de metade das semanas',
    cell: 'bg-primary-200 border-primary-300 text-primary-900',
    swatch: 'bg-primary-200',
  },
  eventual: {
    label: 'Às vezes ocupado',
    hint: 'O paciente passa de vez em quando e já vem preenchido',
    cell: 'bg-amber-100 border-amber-200 text-amber-900',
    swatch: 'bg-amber-200',
  },
  pouco: {
    label: 'Pouco atendido',
    hint: 'Quase nunca é usado na janela analisada',
    cell: 'bg-slate-100 border-slate-200 text-slate-600',
    swatch: 'bg-slate-200',
  },
  livre: {
    label: 'Livre',
    hint: 'Nenhum atendimento na janela analisada',
    cell: 'bg-white border-dashed border-slate-300 text-slate-400',
    swatch: 'bg-white border border-dashed border-slate-300',
  },
};

const WINDOW_OPTIONS = [
  { value: '4', label: '4 semanas' },
  { value: '8', label: '8 semanas' },
  { value: '12', label: '12 semanas' },
];

const startOfWeekMonday = (d: Date) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const diff = (date.getDay() + 6) % 7; // segunda = 0
  date.setDate(date.getDate() - diff);
  return date;
};

const weekIndex = (date: Date, anchorMonday: Date) =>
  Math.floor((startOfWeekMonday(date).getTime() - anchorMonday.getTime()) / (7 * 24 * 3600 * 1000));

const firstName = (full: string) => {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0)}.` : parts[0];
};

const patientNameOf = (a: Appointment) =>
  (a.patient_name || a.patientName || a.patient_name_text || a.title || '').trim();

interface SlotControlProps {
  appointments: Appointment[];
  /** Chamado ao clicar em um horário: dia da semana (0-6) e hora cheia. A agenda abre o novo agendamento. */
  onSlotClick?: (dayOfWeek: number, hour: number) => void;
}

export const SlotControl: React.FC<SlotControlProps> = ({ appointments, onSlotClick }) => {
  const [windowWeeks, setWindowWeeks] = useState('8');

  const { grid, hours, days, counts, suggestions } = useMemo(() => {
    const weeks = Number(windowWeeks);
    const todayMonday = startOfWeekMonday(new Date());
    const anchor = new Date(todayMonday);
    anchor.setDate(anchor.getDate() - weeks * 7); // primeira semana da janela
    const windowEnd = new Date(todayMonday);
    windowEnd.setDate(windowEnd.getDate() + 7); // fim da semana atual (exclusivo)
    const totalWeeks = weeks + 1;
    const now = new Date();

    const used = appointments.filter((a) => a.status !== 'cancelled' && a.start instanceof Date && !isNaN(a.start.getTime()));

    // slot -> { semana -> pacientes }, e agendamentos futuros
    const slotWeeks = new Map<string, Map<number, Set<string>>>();
    const slotUpcoming = new Map<string, { name: string; date: Date }[]>();
    const slotPatientWeeks = new Map<string, Map<string, Set<number>>>();

    let minHour = 24;
    let maxHour = -1;
    const dowsUsed = new Set<number>();

    for (const a of used) {
      const start = a.start;
      const hour = start.getHours();
      const dow = start.getDay();
      const key = `${dow}-${hour}`;
      const name = patientNameOf(a) || 'Paciente';

      if (start >= windowEnd) {
        // próximas semanas: marca como "já agendado" (limite de 6 semanas à frente)
        const ahead = (start.getTime() - now.getTime()) / (24 * 3600 * 1000);
        if (ahead <= 42) {
          const list = slotUpcoming.get(key) ?? [];
          list.push({ name, date: start });
          slotUpcoming.set(key, list);
          minHour = Math.min(minHour, hour);
          maxHour = Math.max(maxHour, hour);
          dowsUsed.add(dow);
        }
        continue;
      }
      if (start < anchor) continue;

      const wi = weekIndex(start, anchor);
      if (wi < 0 || wi >= totalWeeks) continue;

      const byWeek = slotWeeks.get(key) ?? new Map<number, Set<string>>();
      const set = byWeek.get(wi) ?? new Set<string>();
      set.add(name);
      byWeek.set(wi, set);
      slotWeeks.set(key, byWeek);

      const byPatient = slotPatientWeeks.get(key) ?? new Map<string, Set<number>>();
      const pw = byPatient.get(name) ?? new Set<number>();
      pw.add(wi);
      byPatient.set(name, pw);
      slotPatientWeeks.set(key, byPatient);

      minHour = Math.min(minHour, hour);
      maxHour = Math.max(maxHour, hour);
      dowsUsed.add(dow);
    }

    const fromHour = Math.min(8, minHour === 24 ? 8 : minHour);
    const toHour = Math.max(19, maxHour === -1 ? 19 : maxHour);
    const hourList: number[] = [];
    for (let h = fromHour; h <= toHour; h++) hourList.push(h);

    const dayList = WEEKDAYS.filter((d) => d.dow !== 0 || dowsUsed.has(0)).filter((d) => d.dow !== 6 || dowsUsed.has(6) || true);

    const gridMap = new Map<string, SlotInfo>();
    const tally: Record<SlotKind, number> = { livre: 0, pouco: 0, eventual: 0, quinzenal: 0, semanal: 0 };

    for (const d of dayList) {
      for (const h of hourList) {
        const key = `${d.dow}-${h}`;
        const byWeek = slotWeeks.get(key);
        const usage = byWeek ? byWeek.size / totalWeeks : 0;
        let kind: SlotKind;
        if (usage === 0) kind = 'livre';
        else if (usage < 0.12) kind = 'pouco';
        else if (usage < 0.4) kind = 'eventual';
        else if (usage < 0.75) kind = 'quinzenal';
        else kind = 'semanal';

        const patients = [...(slotPatientWeeks.get(key)?.entries() ?? [])]
          .map(([name, ws]) => ({ name, weeks: ws.size }))
          .sort((a, b) => b.weeks - a.weeks);
        const upcoming = (slotUpcoming.get(key) ?? []).sort((a, b) => a.date.getTime() - b.date.getTime());
        gridMap.set(key, { kind, usage, patients, upcoming });
        tally[kind] += 1;
      }
    }

    // sugestões: horários livres ou pouco atendidos dentro do horário comercial já usado
    const suggestionList = [...gridMap.entries()]
      .filter(([, info]) => (info.kind === 'livre' || info.kind === 'pouco') && info.upcoming.length === 0)
      .map(([key, info]) => {
        const [dow, hour] = key.split('-').map(Number);
        return { dow, hour, info };
      })
      .filter((s) => s.dow >= 1 && s.dow <= 5 && s.hour >= 9 && s.hour <= 20)
      .sort((a, b) => a.info.usage - b.info.usage || a.dow - b.dow || a.hour - b.hour)
      .slice(0, 8);

    return { grid: gridMap, hours: hourList, days: dayList, counts: tally, suggestions: suggestionList };
  }, [appointments, windowWeeks]);

  const dayLabel = (dow: number) => WEEKDAYS.find((d) => d.dow === dow)?.long ?? '';

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <FilterLine>
        <FilterLineSection>
          <span className="text-xs font-medium text-slate-600">Janela de análise</span>
          <FilterLineSegmented value={windowWeeks} onChange={(v) => setWindowWeeks(String(v))} options={WINDOW_OPTIONS} size="sm" />
        </FilterLineSection>
      </FilterLine>

      <StatGrid cols={4}>
        <StatCard title="Horários livres" value={counts.livre} icon={CalendarX} color="info" />
        <StatCard title="Pouco atendidos" value={counts.pouco} icon={TrendingDown} color="default" />
        <StatCard title="Quinzenais" value={counts.quinzenal} icon={Repeat} color="purple" />
        <StatCard title="Fixos (semanais)" value={counts.semanal} icon={CalendarCheck} color="success" />
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
        <span className="flex items-center gap-1.5 text-xs text-slate-700" title="Já existe paciente agendado nesse horário nas próximas semanas">
          <span className="h-3 w-3 rounded-[3px] border-2 border-emerald-500 bg-white" />
          Já agendado à frente
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        {/* Grade: semana tipo */}
        <div className="min-w-0 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50">
                <th className="sticky left-0 z-10 w-14 border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-left text-[11px] font-medium text-slate-500">Horário</th>
                {days.map((d) => (
                  <th key={d.dow} className="border-b border-slate-200 px-2 py-2 text-center text-[11px] font-medium text-slate-600">
                    {d.long}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hours.map((h) => (
                <tr key={h}>
                  <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-[11px] font-medium tabular-nums text-slate-600">
                    {String(h).padStart(2, '0')}h
                  </td>
                  {days.map((d) => {
                    const info = grid.get(`${d.dow}-${h}`)!;
                    const meta = KIND_META[info.kind];
                    const names = info.patients.slice(0, 3).map((p) => firstName(p.name));
                    const extra = info.patients.length - names.length;
                    const hasUpcoming = info.upcoming.length > 0;
                    const label = names.length ? names.join(' / ') + (extra > 0 ? ` +${extra}` : '') : hasUpcoming ? firstName(info.upcoming[0].name) : 'Livre';
                    const title = [
                      `${dayLabel(d.dow)} · ${String(h).padStart(2, '0')}h — ${meta.label}`,
                      info.kind !== 'livre' ? `Ocupação: ${Math.round(info.usage * 100)}% das semanas` : meta.hint,
                      ...info.patients.map((p) => `• ${p.name} (${p.weeks}x)`),
                      ...(hasUpcoming ? [`Já agendado: ${info.upcoming.map((u) => `${u.name} em ${u.date.toLocaleDateString('pt-BR')}`).slice(0, 3).join('; ')}`] : []),
                    ].join('\n');
                    return (
                      <td key={d.dow} className="border-b border-slate-100 p-1">
                        <button
                          type="button"
                          title={title}
                          onClick={() => onSlotClick?.(d.dow, h)}
                          className={cn(
                            'flex h-9 w-full items-center justify-center rounded-md border px-1.5 text-center text-[11px] font-medium leading-tight transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
                            meta.cell,
                            hasUpcoming && 'ring-2 ring-emerald-500 ring-offset-1'
                          )}
                        >
                          <span className="line-clamp-2 break-words">{label}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sugestões */}
        <PanelCard title="Onde há vaga" description="Horários livres ou quase sem uso, bons para novos pacientes." icon={CalendarX} className="h-fit">
          {suggestions.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhum horário livre dentro do período analisado.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {suggestions.map((s) => (
                <li key={`${s.dow}-${s.hour}`}>
                  <button
                    type="button"
                    onClick={() => onSlotClick?.(s.dow, s.hour)}
                    className="flex w-full items-center justify-between gap-2 py-2 text-left text-xs transition-colors hover:text-primary-700"
                  >
                    <span className="font-medium text-slate-800">
                      {dayLabel(s.dow)} · {String(s.hour).padStart(2, '0')}h
                    </span>
                    <span className="text-[11px] text-slate-500">{s.info.kind === 'livre' ? 'Livre' : 'Pouco atendido'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-500">
        Calculado com os atendimentos das últimas semanas (cancelados não contam). Passe o mouse em um horário para ver os pacientes e a frequência;
        clique para agendar naquele horário. O contorno verde indica horário que já tem paciente agendado nas próximas semanas.
      </p>
    </div>
  );
};

export default SlotControl;
