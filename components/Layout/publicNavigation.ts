const panelHosts: Record<string, string> = {
  "plaelo.com.br": "painel.plaelo.com.br",
  "www.plaelo.com.br": "painel.plaelo.com.br",
  "psiflux.com.br": "painel.psiflux.com.br",
  "www.psiflux.com.br": "painel.psiflux.com.br",
};

export function publicPanelUrl(
  authenticated: boolean,
  hostname = typeof window === "undefined"
    ? "plaelo.com.br"
    : window.location.hostname,
) {
  const path = authenticated ? "/visao-geral" : "/login";
  return panelHosts[hostname] ? `https://${panelHosts[hostname]}${path}` : path;
}
