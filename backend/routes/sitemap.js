const express = require('express');
const router = express.Router();
const db = require('../db');

const BASE_URL = 'https://plaelo.com.br';

function escapeXml(str) {
  return String(str).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' }[c]));
}

// ── GET /sitemap-professionals.xml — perfis públicos ativos ─────────────────
// Cada psicólogo/psiquiatra com perfil público habilitado vira uma URL indexável
// (/p/:slug) — são as páginas com maior potencial de tráfego orgânico de busca
// local ("psicólogo perto de mim"), então entram num sitemap à parte gerado na
// hora a partir do banco, em vez de um arquivo estático que ficaria desatualizado.
router.get('/sitemap-professionals.xml', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT public_slug FROM users
       WHERE public_profile_enabled = true AND public_slug IS NOT NULL AND public_slug <> ''`
    );

    const urls = rows.map(r =>
      `  <url>\n    <loc>${BASE_URL}/p/${escapeXml(r.public_slug)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`
    ).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
    res.type('application/xml').send(xml);
  } catch (err) {
    console.error('[Sitemap] Erro ao gerar sitemap de profissionais:', err);
    res.status(500).type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});

module.exports = router;
