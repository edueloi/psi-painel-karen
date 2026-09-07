export function maskPhoneBR(raw: string): string {
  let v = raw.replace(/\D/g, '').slice(0, 11);
  if (v.length > 10) return v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (v.length > 5) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  if (v.length > 2) return v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
  return v;
}

export function maskCpf(raw: string): string {
  const v = raw.replace(/\D/g, '').slice(0, 11);
  return v
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCpfCnpj(raw: string): string {
  const v = raw.replace(/\D/g, '').slice(0, 14);
  if (v.length <= 11) {
    return v
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return v
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}
