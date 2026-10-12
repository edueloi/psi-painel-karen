const SITE_URL = "https://plaelo.com.br";
function escapeHtml(value) {
  return String(value || "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function renderPublicProfile(template, user) {
  let theme = {};
  try {
    theme =
      typeof user.profile_theme === "string"
        ? JSON.parse(user.profile_theme)
        : user.profile_theme || {};
  } catch {}
  const name = theme.public_name || user.name || "Profissional de saúde";
  const title = `${name} — Perfil profissional na Plaelo`;
  const description = String(
    user.bio ||
      `Conheça o perfil de ${name}, suas informações de atendimento e canais de contato.`,
  ).slice(0, 160);
  const url = `${SITE_URL}/p/${encodeURIComponent(user.public_slug)}`;
  const image = user.avatar_url
    ? /^https?:\/\//.test(user.avatar_url)
      ? user.avatar_url
      : `${SITE_URL}${user.avatar_url.startsWith("/uploads-static/") ? "/api" : ""}${user.avatar_url}`
    : `${SITE_URL}/images/logo-sistema/logo-plaelo.png`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url,
    name: title,
    description,
    inLanguage: "pt-BR",
    mainEntity: {
      "@type": "Person",
      name,
      ...(user.specialty ? { knowsAbout: user.specialty } : {}),
    },
  };
  const head = `<title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <meta property="og:type" content="profile" /><meta property="og:locale" content="pt_BR" />
    <meta property="og:title" content="${escapeHtml(title)}" /><meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(url)}" /><meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:site_name" content="Plaelo" />
    <meta name="twitter:card" content="summary" /><meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" /><meta name="twitter:image" content="${escapeHtml(image)}" />
    <script id="public-structured-data" type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>
    <style>#pwa-splash{display:none!important}.public-profile-initial{max-width:900px;margin:60px auto;padding:32px;font-family:Inter,system-ui,sans-serif;line-height:1.8;color:#222038}.public-profile-initial p{white-space:pre-line}</style>`;
  return template
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(
      /<meta\s[^>]*(?:name|property)="(?:description|robots|keywords|og:[^"]+|twitter:[^"]+)"[^>]*>/gi,
      "",
    )
    .replace(/<link\s[^>]*rel="canonical"[^>]*>/gi, "")
    .replace(
      /<script\s[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi,
      "",
    )
    .replace("</head>", `${head}</head>`)
    .replace(
      '<div id="root"></div>',
      `<div id="root"><main class="public-profile-initial"><a href="/encontrar-profissional">Encontrar profissional</a><h1>${escapeHtml(name)}</h1>${user.company_name ? `<h2>${escapeHtml(user.company_name)}</h2>` : ""}${user.specialty ? `<p>${escapeHtml(user.specialty)}</p>` : ""}${user.bio ? `<p>${escapeHtml(user.bio)}</p>` : ""}</main></div>`,
    );
}
module.exports = { renderPublicProfile, escapeHtml };
