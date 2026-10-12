import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import {
  MarketingShell,
  MarketingHeading,
  MarketingCTA,
  MarketingChecks,
} from "../../components/Layout/MarketingShell";
import { ProductPreview } from "../../components/Layout/ProductPreview";
import { Reveal } from "../../components/Layout/Reveal";
import { MARKETING_FEATURES } from "./marketingData";
import { useSEO } from "../../hooks/useSEO";
import { PUBLIC_SEO } from "../../seo/publicSeo.mjs";

const groups = [
  { key: "todos", label: "Todos" },
  { key: "rotina", label: "Rotina" },
  { key: "clinica", label: "Clínica" },
  { key: "gestao", label: "Gestão" },
];
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export function Funcionalidades() {
  const [group, setGroup] = useState("todos");
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () =>
      MARKETING_FEATURES.filter(
        (feature) =>
          (group === "todos" || feature.group === group) &&
          normalize(
            [feature.title, feature.description, ...feature.bullets].join(" "),
          ).includes(normalize(search)),
      ),
    [group, search],
  );
  useSEO(PUBLIC_SEO["/funcionalidades"]);
  return (
    <MarketingShell>
      <section className="ps-page-hero">
        <div className="ps-wrap ps-hero-grid">
          <Reveal>
            <span className="ps-eyebrow">
              Uma plataforma. Uma rotina conectada.
            </span>
            <h1>
              Recursos que fazem
              <br />
              mais sentido
              <br />
              <em>trabalhando juntos.</em>
            </h1>
            <p>
              Explore o que a Plaelo reúne para organizar o atendimento,
              acompanhar o paciente e cuidar da gestão.
            </p>
            <div className="ps-actions">
              <a href="#catalogo" className="ps-button">
                Explorar funcionalidades <ArrowRight size={16} />
              </a>
              <Link to="/planos" className="ps-text-link">
                Ver os planos <ArrowRight size={15} />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <ProductPreview />
          </Reveal>
        </div>
      </section>
      <section id="catalogo" className="ps-section ps-section-soft">
        <div className="ps-wrap">
          <MarketingHeading
            eyebrow="Encontre o que facilita seu dia"
            title="O essencial, com espaço para ir além."
            description="Escolha uma área ou pesquise um recurso. A disponibilidade depende do plano contratado e das configurações da clínica."
          />
          <div className="ps-toolbar">
            <div
              className="ps-segments"
              role="group"
              aria-label="Áreas dos recursos"
            >
              {groups.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  aria-pressed={group === item.key}
                  onClick={() => setGroup(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label className="ps-search">
              <Search size={16} />
              <input
                aria-label="Buscar funcionalidade"
                placeholder="Buscar recurso..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
          <p
            className="ps-pricing-note"
            style={{ textAlign: "left", marginBottom: 22 }}
            aria-live="polite"
          >
            {filtered.length} recurso(s) encontrado(s)
          </p>
          <div className="ps-bento">
            {filtered.map(
              ({ key, icon: Icon, title, description, bullets }, index) => (
                <Reveal
                  key={key}
                  as="article"
                  className="ps-feature-card"
                  delay={Math.min(index, 3) * 55}
                >
                  <span className="ps-icon">
                    <Icon size={22} />
                  </span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <MarketingChecks items={bullets} />
                </Reveal>
              ),
            )}
          </div>
          {!filtered.length && (
            <div className="ps-empty">
              <strong>Nenhum recurso encontrado.</strong>
              <p>Tente outro nome ou consulte todas as áreas.</p>
              <button
                type="button"
                className="ps-button ps-button-outline"
                onClick={() => {
                  setGroup("todos");
                  setSearch("");
                }}
              >
                Limpar busca
              </button>
            </div>
          )}
        </div>
      </section>
      <MarketingCTA />
    </MarketingShell>
  );
}
