// URL base para links públicos (formulários, avaliações, salas de vídeo) —
// domínio institucional, separado do painel (window.location.origin aponta
// para painel.psiflux.com.br quando o link é gerado de dentro do painel,
// não para o domínio onde o link público de fato deve abrir).
export const PUBLIC_BASE_URL =
  import.meta.env.VITE_PUBLIC_URL || 'https://psiflux.com.br';

// painel.<dominio> -> domínio raiz correspondente. Duas famílias de domínio
// convivem hoje (psiflux.com.br legado + plaelo.com.br novo) — o link público
// deve sempre abrir na mesma família que o profissional está usando no
// painel, nunca fixo no domínio antigo (ver App.tsx PUBLIC_ROOT_TO_PAINEL_HOST).
const PAINEL_HOST_TO_PUBLIC_ROOT: Record<string, string> = {
  'painel.psiflux.com.br': 'https://psiflux.com.br',
  'painel.plaelo.com.br': 'https://plaelo.com.br',
};

// Resolve o domínio público a usar de acordo com o host atual do painel —
// cai para PUBLIC_BASE_URL (env var) quando o host não é reconhecido, ex:
// localhost em desenvolvimento.
export function getPublicBaseUrl(): string {
  if (typeof window === 'undefined') return PUBLIC_BASE_URL;
  return PAINEL_HOST_TO_PUBLIC_ROOT[window.location.hostname] || PUBLIC_BASE_URL;
}
