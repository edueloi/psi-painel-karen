import { useEffect } from 'react';

const SITE_URL = 'https://plaelo.com.br';
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/logo-sistema/logo-plaelo.png`;

interface SEOOptions {
  title: string;
  description: string;
  path: string; // ex: "/planos" (sem domínio)
  image?: string;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

// Cada página pública (marketing + diretório) precisa de título/descrição/
// canonical próprios — sem isso o Google enxerga todo o site com o mesmo
// título e a mesma URL canônica da home, o que atrapalha a indexação de
// páginas internas como /planos ou /funcionalidades.
export function useSEO({ title, description, path, image }: SEOOptions) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`;
    document.title = title;
    upsertMeta('name', 'description', description);
    upsertCanonical(url);

    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image || DEFAULT_OG_IMAGE);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image || DEFAULT_OG_IMAGE);
  }, [title, description, path, image]);
}
