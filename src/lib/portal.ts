// URL base do Portal do Paciente — domínio dedicado, separado do painel do
// profissional (window.location.origin aponta para painel.psiflux.com.br
// quando o link é gerado de dentro do painel, não para o domínio do portal).
export const PORTAL_BASE_URL =
  import.meta.env.VITE_PORTAL_URL || 'https://portal.psiflux.com.br';

// painel.<dominio> -> portal do paciente correspondente. Duas famílias de
// domínio convivem hoje (psiflux.com.br legado + plaelo.com.br novo) — o
// link do portal deve sempre abrir na mesma família que o profissional está
// usando no painel, nunca fixo no domínio antigo.
const PAINEL_HOST_TO_PORTAL_ROOT: Record<string, string> = {
  'painel.psiflux.com.br': 'https://portal.psiflux.com.br',
  'painel.plaelo.com.br': 'https://portal.plaelo.com.br',
};

// Resolve o domínio do Portal do Paciente de acordo com o host atual do
// painel — cai para PORTAL_BASE_URL (env var) quando o host não é
// reconhecido, ex: localhost em desenvolvimento.
export function getPortalBaseUrl(): string {
  if (typeof window === 'undefined') return PORTAL_BASE_URL;
  return PAINEL_HOST_TO_PORTAL_ROOT[window.location.hostname] || PORTAL_BASE_URL;
}
