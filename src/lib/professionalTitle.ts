// Ajusta o título profissional (ex: "Psicólogo"/"Psicóloga") conforme o gênero
// cadastrado no perfil, para mensagens automáticas (WhatsApp, e-mail, etc).
// A área de atuação (specialty) é cadastrada em texto livre — aqui só tratamos
// o caso mais comum (Psicólogo/a); qualquer outro texto é devolvido como está.

const FEMININE_OVERRIDES: Record<string, string> = {
  'psicólogo': 'Psicóloga',
  'psicologo': 'Psicóloga',
  'psicopedagogo': 'Psicopedagoga',
  'terapeuta ocupacional': 'Terapeuta Ocupacional',
  'fonoaudiólogo': 'Fonoaudióloga',
  'nutricionista': 'Nutricionista',
};

export function getGenderedSpecialty(
  specialty: string | null | undefined,
  gender: 'male' | 'female' | 'other' | null | undefined
): string {
  const base = (specialty || '').trim();
  if (!base) return '';
  if (gender !== 'female') return base;

  const key = base.toLowerCase();
  if (FEMININE_OVERRIDES[key]) return FEMININE_OVERRIDES[key];

  // Masculino terminado em "o" -> troca para "a" (Nutricionologo -> ...a).
  // Fallback simples; a lista acima cobre os casos conhecidos do sistema.
  if (key.endsWith('o')) return base.slice(0, -1) + 'a';
  return base;
}
