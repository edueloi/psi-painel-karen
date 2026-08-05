// URL base do Portal do Paciente — domínio dedicado, separado do painel do
// profissional (window.location.origin aponta para app.psiflux.com.br quando
// o link é gerado de dentro do painel, não para o domínio do portal).
export const PORTAL_BASE_URL =
  import.meta.env.VITE_PORTAL_URL || 'https://portal.psiflux.com.br';
