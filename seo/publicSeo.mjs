export const SITE_URL = "https://plaelo.com.br";
export const SHARE_IMAGE = `${SITE_URL}/images/logo-sistema/logo-plaelo.png`;
export const PUBLIC_SEO = {
  "/": {
    path: "/",
    title: "Plaelo — Sistema para clínicas e profissionais de saúde mental",
    description:
      "Conecte cuidado e gestão: agenda, prontuário digital, sala virtual, financeiro e IA para profissionais e clínicas de saúde mental.",
    name: "Início",
  },
  "/funcionalidades": {
    path: "/funcionalidades",
    title: "Agenda, prontuário e gestão clínica — Funcionalidades Plaelo",
    description:
      "Explore os recursos da Plaelo: agenda clínica, prontuário, anamnese, evolução, sala virtual, documentos, financeiro e apoio de IA.",
    name: "Funcionalidades",
  },
  "/planos": {
    path: "/planos",
    title: "Planos e preços para consultórios e clínicas — Plaelo",
    description:
      "Compare os planos da Plaelo, preços mensais, recursos e limites de usuários. Encontre a opção para seu consultório ou clínica.",
    name: "Planos e preços",
  },
  "/sobre": {
    path: "/sobre",
    title: "Sobre a Plaelo — Conectando cuidado e gestão",
    description:
      "Conheça a Plaelo e sua proposta: tornar a rotina de profissionais e clínicas de saúde mental mais organizada, conectada e humana.",
    name: "Sobre",
  },
  "/encontrar-profissional": {
    path: "/encontrar-profissional",
    title: "Encontre um profissional de saúde mental — Plaelo",
    description:
      "Encontre profissionais de saúde mental por especialidade, abordagem, cidade e modalidade. Conheça os perfis e entre em contato diretamente.",
    name: "Encontrar profissional",
  },
  "/cadastro": {
    path: "/cadastro",
    title: "Criar conta na Plaelo — Organize sua rotina clínica",
    description:
      "Crie sua conta na Plaelo, configure seu perfil profissional e organize sua agenda e clínica. Conheça a plataforma com 14 dias de teste sem cartão.",
    name: "Criar conta",
  },
  "/termos-de-uso": {
    path: "/termos-de-uso",
    title: "Termos de Uso — Plaelo",
    description:
      "Confira os Termos de Uso da Plaelo e as condições de utilização da plataforma de gestão para profissionais e clínicas.",
    name: "Termos de Uso",
  },
  "/politica-privacidade": {
    path: "/politica-privacidade",
    title: "Política de Privacidade — Plaelo",
    description:
      "Saiba como a Plaelo trata dados pessoais e conheça nossa Política de Privacidade, direitos e canais de contato.",
    name: "Política de Privacidade",
  },
};

export function structuredData({ title, description, path }) {
  const url = `${SITE_URL}${path}`;
  const graph = [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Plaelo",
      url: SITE_URL,
      logo: SHARE_IMAGE,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Plaelo",
      url: `${SITE_URL}/`,
      inLanguage: "pt-BR",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type":
        path === "/encontrar-profissional"
          ? "CollectionPage"
          : path === "/sobre"
            ? "AboutPage"
            : "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: title,
      description,
      inLanguage: "pt-BR",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      ...(path === "/" ? {} : { breadcrumb: { "@id": `${url}#breadcrumb` } }),
    },
  ];
  if (path !== "/")
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Início",
          item: `${SITE_URL}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: PUBLIC_SEO[path]?.name || title,
          item: url,
        },
      ],
    });
  if (path === "/" || path === "/funcionalidades")
    graph.push({
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#application`,
      name: "Plaelo",
      url: SITE_URL,
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      inLanguage: "pt-BR",
      description: PUBLIC_SEO["/"].description,
      publisher: { "@id": `${SITE_URL}/#organization` },
    });
  return { "@context": "https://schema.org", "@graph": graph };
}

export function robotsForHost(hostname) {
  return hostname === "plaelo.com.br" ||
    hostname === "www.plaelo.com.br" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
    ? "index, follow, max-image-preview:large"
    : "noindex, nofollow";
}
