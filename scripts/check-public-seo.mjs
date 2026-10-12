import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { PUBLIC_SEO, SITE_URL } from '../seo/publicSeo.mjs';
for (const [path, entry] of Object.entries(PUBLIC_SEO)) {
  const filename = path === '/' ? 'home' : path.slice(1);
  const html = await readFile(new URL(`../dist/public-pages/${filename}.html`, import.meta.url), 'utf8');
  const { document } = new JSDOM(html).window;
  const assert = (condition, label) => { if (!condition) throw new Error(`${path}: ${label}`); };
  assert(document.title === entry.title, 'título diferente');
  assert(document.querySelectorAll('link[rel="canonical"]').length === 1, 'canonical duplicado');
  assert(document.querySelector('link[rel="canonical"]').href === `${SITE_URL}${path}`, 'canonical incorreto');
  assert(document.querySelectorAll('h1').length === 1, 'exatamente um H1 esperado');
  assert(document.querySelector('#root').textContent.trim().length > 150, 'conteúdo vazio sem JavaScript');
  assert(document.querySelector('meta[name="robots"]').content.startsWith('index,'), 'página pública não indexável');
  assert(document.querySelectorAll('script[type="application/ld+json"]').length === 1, 'schema duplicado');
  JSON.parse(document.querySelector('#public-structured-data').textContent);
  assert(!html.includes('\uFFFD'), 'caractere UTF-8 inválido');
  assert(!document.querySelector('#root [style*="opacity:0"]'), 'conteúdo oculto sem JavaScript');
  console.log(`Verificado: ${path}`);
}
console.log('8 páginas públicas com SEO e conteúdo HTML válidos.');
