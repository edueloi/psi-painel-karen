import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const require = createRequire(import.meta.url);
const { renderPublicProfile } = require("./public-profile-seo.js");
describe("SEO de perfis públicos", () => {
  it("remove canonical genérico e escapa dados publicados no HTML e no JSON-LD", () => {
    const template =
      '<html><head><title>Início</title><meta name="robots" content="noindex" /><link rel="canonical" href="https://plaelo.com.br/" /></head><body><div id="root"></div></body></html>';
    const html = renderPublicProfile(template, {
      name: "Ana <script>alert(1)</script>",
      public_slug: "ana",
      bio: "Texto </script><script>ruim</script>",
      company_name: "A & B",
    });
    expect(html).toContain('href="https://plaelo.com.br/p/ana"');
    expect(html).not.toContain('href="https://plaelo.com.br/"');
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("</script><script>ruim</script>");
    expect(html).toContain("<h1>Ana &lt;script&gt;");
    expect(html).toContain("index, follow");
    expect(html).toContain("A &amp; B");
  });
});
