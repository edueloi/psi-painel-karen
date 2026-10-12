import { JSDOM } from 'jsdom';
import { PUBLIC_SEO, SITE_URL } from '../seo/publicSeo.mjs';
await Promise.all(Object.entries(PUBLIC_SEO).map(async ([path, entry]) => {
  const response = await fetch(`${SITE_URL}${path}`);
  const { document } = new JSDOM(await response.text()).window;
  if (response.status !== 200 || document.title !== entry.title || document.querySelectorAll('h1').length !== 1 || document.querySelector('link[rel="canonical"]')?.href !== `${SITE_URL}${path}` || !document.querySelector('meta[name="robots"]')?.content.startsWith('index,')) throw new Error(`SEO inválido em produção: ${path}`);
  console.log(`${path}: HTTP 200, HTML e SEO corretos`);
}));
for (const [path, status] of [['/favicon.svg', 200], ['/sitemap.xml', 200], ['/sitemap-pages.xml', 200], ['/api/sitemap-professionals.xml', 200], ['/encontrar-psicologo', 301], ['/p/perfil-inexistente-teste-seo-2026', 404]]) {
  const response = await fetch(`${SITE_URL}${path}`, { redirect: 'manual' });
  if (response.status !== status) throw new Error(`${path}: HTTP ${response.status}, esperado ${status}`);
  console.log(`${path}: HTTP ${status}`);
}
const www = await fetch('https://www.plaelo.com.br/planos', { redirect: 'manual' });
if (www.status !== 301 || www.headers.get('location') !== `${SITE_URL}/planos`) throw new Error('Redirecionamento www inválido.');
const health = await fetch('https://painel.plaelo.com.br/api/health');
if (health.status !== 200) throw new Error('API indisponível após deploy.');
const directory = await (await fetch(`${SITE_URL}/api/directory?limit=1`)).json();
if (directory.data?.[0]) {
  const path = `/p/${encodeURIComponent(directory.data[0].public_slug)}`;
  const response = await fetch(`${SITE_URL}${path}`);
  const { document } = new JSDOM(await response.text()).window;
  if (response.status !== 200 || !document.querySelector('h1') || document.querySelector('link[rel="canonical"]')?.href !== `${SITE_URL}${path}`) throw new Error('Perfil público sem SEO correto.');
  console.log('Perfil público: HTTP 200, HTML e canonical corretos');
}
console.log('Produção validada. API online e redirecionamentos corretos.');
