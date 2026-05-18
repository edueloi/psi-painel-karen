interface Holiday {
  name: string;
  date: string; // MM-DD
}

const HOLIDAYS: Holiday[] = [
  { name: "Confraternização Universal", date: "01-01" },
  { name: "Tiradentes", date: "04-21" },
  { name: "Dia do Trabalho", date: "05-01" },
  { name: "Independência do Brasil", date: "09-07" },
  { name: "Nossa Sra. Aparecida", date: "10-12" },
  { name: "Finados", date: "11-02" },
  { name: "Proclamação da República", date: "11-15" },
  { name: "Natal", date: "12-25" },
];

export function isHoliday(date: Date): Holiday | undefined {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return HOLIDAYS.find((h) => h.date === `${mm}-${dd}`);
}
