// URL base para links públicos (formulários, avaliações, salas de vídeo) —
// domínio institucional, separado do painel (window.location.origin aponta
// para painel.psiflux.com.br quando o link é gerado de dentro do painel,
// não para o domínio onde o link público de fato deve abrir).
export const PUBLIC_BASE_URL =
  import.meta.env.VITE_PUBLIC_URL || 'https://psiflux.com.br';
