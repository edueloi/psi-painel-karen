// Feriados nacionais e pontos facultativos do Brasil calculados por ano.
// Móveis derivam da Páscoa (algoritmo gregoriano anônimo / Meeus-Jones-Butcher).
// Não inclui feriados estaduais/municipais (o usuário os adiciona manualmente).

export type HolidayKind = 'feriado_nacional' | 'facultativo';

export interface GeneratedHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  kind: HolidayKind;
  weekday: number; // 0 = domingo
  /** Nota curta exibida junto do item (ex.: "Ponto facultativo até 14h"). */
  note?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

export function generateBrazilHolidays(year: number): GeneratedHoliday[] {
  const easter = easterSunday(year);
  const list: Omit<GeneratedHoliday, 'weekday'>[] = [
    { date: `${year}-01-01`, name: 'Confraternização Universal', kind: 'feriado_nacional' },
    { date: iso(addDays(easter, -48)), name: 'Carnaval (segunda-feira)', kind: 'facultativo' },
    { date: iso(addDays(easter, -47)), name: 'Carnaval (terça-feira)', kind: 'facultativo' },
    { date: iso(addDays(easter, -46)), name: 'Quarta-feira de Cinzas', kind: 'facultativo', note: 'Ponto facultativo até as 14h' },
    { date: iso(addDays(easter, -2)), name: 'Sexta-feira Santa', kind: 'feriado_nacional' },
    { date: iso(easter), name: 'Páscoa', kind: 'feriado_nacional', note: 'Domingo' },
    { date: `${year}-04-21`, name: 'Tiradentes', kind: 'feriado_nacional' },
    { date: `${year}-05-01`, name: 'Dia do Trabalho', kind: 'feriado_nacional' },
    { date: iso(addDays(easter, 60)), name: 'Corpus Christi', kind: 'facultativo' },
    { date: `${year}-09-07`, name: 'Independência do Brasil', kind: 'feriado_nacional' },
    { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida', kind: 'feriado_nacional' },
    { date: `${year}-10-28`, name: 'Dia do Servidor Público', kind: 'facultativo' },
    { date: `${year}-11-02`, name: 'Finados', kind: 'feriado_nacional' },
    { date: `${year}-11-15`, name: 'Proclamação da República', kind: 'feriado_nacional' },
    year >= 2024
      ? { date: `${year}-11-20`, name: 'Dia da Consciência Negra', kind: 'feriado_nacional' }
      : { date: `${year}-11-20`, name: 'Dia da Consciência Negra', kind: 'facultativo', note: 'Feriado nacional somente a partir de 2024' },
    { date: `${year}-12-24`, name: 'Véspera de Natal', kind: 'facultativo' },
    { date: `${year}-12-25`, name: 'Natal', kind: 'feriado_nacional' },
    { date: `${year}-12-31`, name: 'Véspera de Ano Novo', kind: 'facultativo' },
  ];
  return list
    .map(h => ({ ...h, weekday: new Date(`${h.date}T12:00:00Z`).getUTCDay() }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
