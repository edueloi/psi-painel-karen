// Ajusta o título profissional (ex: "Psicólogo"/"Psicóloga") conforme o gênero
// cadastrado no perfil, para mensagens automáticas (WhatsApp, e-mail, etc).
// Espelha backend/../src/lib/professionalTitle.ts (frontend) — mantenha os dois em sincronia.

const FEMININE_OVERRIDES = {
  'psicólogo': 'Psicóloga',
  'psicologo': 'Psicóloga',
  'psicopedagogo': 'Psicopedagoga',
  'terapeuta ocupacional': 'Terapeuta Ocupacional',
  'fonoaudiólogo': 'Fonoaudióloga',
  'nutricionista': 'Nutricionista',
};

function getGenderedSpecialty(specialty, gender) {
  const base = String(specialty || '').trim();
  if (!base) return '';
  if (gender !== 'female') return base;

  const key = base.toLowerCase();
  if (FEMININE_OVERRIDES[key]) return FEMININE_OVERRIDES[key];

  if (key.endsWith('o')) return base.slice(0, -1) + 'a';
  return base;
}

module.exports = { getGenderedSpecialty };
