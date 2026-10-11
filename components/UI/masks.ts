// Máscaras de digitação compartilhadas (aplique no onChange: setX(maskCpf(e.target.value))).
// Todas aceitam o texto cru ou já mascarado e devolvem o texto mascarado.
const digits = (v: string, max?: number) => {
  const d = String(v ?? '').replace(/\D/g, '');
  return max ? d.slice(0, max) : d;
};

export const maskCpf = (v: string) => {
  const d = digits(v, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

export const maskCnpj = (v: string) => {
  const d = digits(v, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

/** CPF até 11 dígitos, CNPJ acima disso. */
export const maskCpfCnpj = (v: string) => (digits(v).length > 11 ? maskCnpj(v) : maskCpf(v));

/** Telefone BR: (11) 99999-9999 ou (11) 9999-9999. */
export const maskPhoneBR = (v: string) => {
  const d = digits(v, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export const maskCep = (v: string) => {
  const d = digits(v, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

/** Data dd/mm/aaaa. */
export const maskDate = (v: string) => {
  const d = digits(v, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};

/** Hora HH:mm (limita a 23:59). */
export const maskTime = (v: string) => {
  let d = digits(v, 4);
  if (d.length >= 1 && Number(d[0]) > 2) d = `0${d}`.slice(0, 4); // 9 -> 09
  if (d.length >= 2 && Number(d.slice(0, 2)) > 23) d = `23${d.slice(2)}`;
  if (d.length >= 4 && Number(d.slice(2, 4)) > 59) d = `${d.slice(0, 2)}59`;
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
};

/** Período 'dd/mm/aaaa a dd/mm/aaaa'. */
export const maskDateRange = (v: string) => {
  const d = digits(v, 16);
  const first = maskDate(d.slice(0, 8));
  if (d.length <= 8) return first;
  return `${first} a ${maskDate(d.slice(8))}`;
};

/** Valor em reais digitando só números: 125075 -> 1.250,75. */
export const maskCurrency = (v: string) => {
  const d = digits(v);
  if (!d) return '';
  return (parseInt(d, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/** Escolhe a máscara pelo nome da variável/campo (cpf, telefone, cep, data, hora, valor, período...). */
export function maskByFieldName(name: string): ((v: string) => string) | null {
  const k = String(name || '').toLowerCase();
  if (/cnpj/.test(k)) return maskCnpj;
  if (/cpf/.test(k)) return maskCpfCnpj;
  if (/telefone|celular|whats|fone|phone/.test(k)) return maskPhoneBR;
  if (/cep|zip/.test(k)) return maskCep;
  if (/periodo|período/.test(k)) return maskDateRange;
  if (/(^|_)(data|date)(_|$)|nascimento/.test(k) && !/extenso|texto/.test(k)) return maskDate;
  if (/hora|horario|horário|time/.test(k)) return maskTime;
  if (/(^|_)(valor|amount|preco|preço)(_|$)/.test(k) && !/extenso|texto|text/.test(k)) return maskCurrency;
  return null;
}
