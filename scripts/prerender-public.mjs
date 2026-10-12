import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  PUBLIC_SEO,
  SITE_URL,
  SHARE_IMAGE,
  structuredData,
} from "../seo/publicSeo.mjs";
import { renderPage } from "../dist-ssr/public-entry.js";

const escape = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
const template = await readFile(
  new URL("../dist/index.html", import.meta.url),
  "utf8",
);
await mkdir(new URL("../dist/public-pages/", import.meta.url), {
  recursive: true,
});
for (const [path, entry] of Object.entries(PUBLIC_SEO)) {
  const url = `${SITE_URL}${path}`;
  const metas = {
    description: entry.description,
    robots: "index, follow, max-image-preview:large",
    "og:type": "website",
    "og:locale": "pt_BR",
    "og:site_name": "Plaelo",
    "og:title": entry.title,
    "og:description": entry.description,
    "og:url": url,
    "og:image": SHARE_IMAGE,
    "og:image:alt": "Plaelo — Conectando cuidado e gestão",
    "twitter:card": "summary",
    "twitter:title": entry.title,
    "twitter:description": entry.description,
    "twitter:url": url,
    "twitter:image": SHARE_IMAGE,
  };
  // Mantém assets/PWA do build e substitui metadados sem acumular duplicatas.
  let html = template
    .replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${escape(entry.title)}</title>`,
    )
    .replace(
      /<meta\s[^>]*(?:name|property)="(?:description|robots|keywords|og:[^"]+|twitter:[^"]+)"[^>]*>/gi,
      "",
    )
    .replace(/<link\s[^>]*rel="canonical"[^>]*>/gi, "")
    .replace(
      /<script\s[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi,
      "",
    );
  const head = Object.entries(metas)
    .map(
      ([key, value]) =>
        `<meta ${key.startsWith("og:") ? "property" : "name"}="${key}" content="${escape(value)}" />`,
    )
    .join("\n");
  const schema = JSON.stringify(structuredData(entry)).replace(/</g, "\\u003c");
  html = html
    .replace(
      "</head>",
      `${head}\n<link rel="canonical" href="${escape(url)}" />\n<script id="public-structured-data" type="application/ld+json">${schema}</script>\n</head>`,
    )
    .replace(
      '<div id="root"></div>',
      `<div id="root">${renderPage(path)}</div>`,
    );
  if (!html.includes("<h1")) throw new Error(`Página sem H1: ${path}`);
  // O splash do painel não deve ocultar o conteúdo público pré-renderizado.
  html = html.replace(
    "</head>",
    "<style>#pwa-splash{display:none!important}</style></head>",
  );
  const filename = path === "/" ? "home" : path.slice(1);
  await writeFile(
    new URL(`../dist/public-pages/${filename}.html`, import.meta.url),
    html,
    "utf8",
  );
  console.log(`SEO + HTML: ${path}`);
}
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(
  PUBLIC_SEO,
)
  .map((path) => `  <url><loc>${escape(`${SITE_URL}${path}`)}</loc></url>`)
  .join("\n")}\n</urlset>\n`;
await writeFile(
  new URL("../dist/sitemap-pages.xml", import.meta.url),
  xml,
  "utf8",
);
