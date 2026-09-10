// Resolve a URL pública (site institucional) a partir da origem da
// requisição — painel.psiflux.com.br -> psiflux.com.br, painel.plaelo.com.br
// -> plaelo.com.br. Duas famílias de domínio convivem hoje e o link enviado
// ao paciente/profissional deve sempre abrir na mesma família de onde a
// ação partiu, nunca fixo no domínio antigo (espelha
// src/lib/publicLinks.ts::getPublicBaseUrl no frontend).
const PAINEL_HOST_TO_PUBLIC_ROOT = {
  'painel.psiflux.com.br': 'https://psiflux.com.br',
  'painel.plaelo.com.br': 'https://plaelo.com.br',
  // Requisições feitas direto do site público (ex: paciente preenchendo um
  // formulário público, sem estar logado no painel) já chegam com o host
  // correto — mapeia pra si mesmo em vez de cair no fallback fixo.
  'psiflux.com.br': 'https://psiflux.com.br',
  'www.psiflux.com.br': 'https://psiflux.com.br',
  'plaelo.com.br': 'https://plaelo.com.br',
  'www.plaelo.com.br': 'https://plaelo.com.br',
};

const PAINEL_HOST_TO_PORTAL_ROOT = {
  'painel.psiflux.com.br': 'https://portal.psiflux.com.br',
  'painel.plaelo.com.br': 'https://portal.plaelo.com.br',
  'portal.psiflux.com.br': 'https://portal.psiflux.com.br',
  'portal.plaelo.com.br': 'https://portal.plaelo.com.br',
};

const PAINEL_HOST_TO_APP_ROOT = {
  'painel.psiflux.com.br': 'https://painel.psiflux.com.br',
  'painel.plaelo.com.br': 'https://painel.plaelo.com.br',
};

function extractHost(req) {
  const source = req.get('origin') || req.get('referer') || '';
  try {
    return new URL(source).hostname;
  } catch {
    return '';
  }
}

function getFrontendUrl(req) {
  const host = extractHost(req);
  return PAINEL_HOST_TO_PUBLIC_ROOT[host] || process.env.FRONTEND_URL || 'https://plaelo.com.br';
}

function getPortalUrl(req) {
  const host = extractHost(req);
  return PAINEL_HOST_TO_PORTAL_ROOT[host] || process.env.PORTAL_URL || 'https://portal.plaelo.com.br';
}

function getAppBaseUrl(req) {
  const host = extractHost(req);
  return PAINEL_HOST_TO_APP_ROOT[host] || process.env.APP_BASE_URL || 'https://painel.plaelo.com.br';
}

module.exports = { getFrontendUrl, getPortalUrl, getAppBaseUrl };
