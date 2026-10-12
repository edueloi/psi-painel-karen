import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, Sparkles } from "lucide-react";
import { PublicNavbar } from "./PublicNavbar";
import { PublicFooter } from "./PublicFooter";
import { Reveal } from "./Reveal";
import "./publicMarketing.css";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
      ? "auto"
      : "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = previous;
    };
  }, []);
  return (
    <div className="ps-site">
      <a href="#conteudo" className="ps-skip">
        Pular para o conteúdo
      </a>
      <PublicNavbar />
      <main id="conteudo" tabIndex={-1}>
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}

export function MarketingHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
}) {
  return (
    <Reveal className="ps-heading">
      <span className="ps-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </Reveal>
  );
}

export function MarketingCTA() {
  return (
    <section className="ps-section">
      <div className="ps-wrap">
        <Reveal className="ps-cta">
          <div>
            <span className="ps-eyebrow">
              <Sparkles size={14} /> Mais espaço para cuidar
            </span>
            <h2>
              Sua rotina pode
              <br />
              ser mais leve.
            </h2>
            <p>
              Conheça a Plaelo e reúna o que você precisa para organizar o
              consultório ou a clínica.
            </p>
          </div>
          <div className="ps-cta-action">
            <Link className="ps-button ps-button-light" to="/cadastro">
              Começar agora <ArrowRight size={17} />
            </Link>
            <Link className="ps-text-link" to="/planos">
              Encontrar meu plano <ArrowRight size={15} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function MarketingFAQ({
  items,
}: {
  items: readonly { q: string; a: string }[];
}) {
  return (
    <div className="ps-faq">
      {items.map((item) => (
        <details key={item.q}>
          <summary>
            {item.q}
            <ChevronDown size={18} />
          </summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  );
}

export function MarketingChecks({ items }: { items: readonly string[] }) {
  return (
    <ul className="ps-checks">
      {items.map((item) => (
        <li key={item}>
          <Check size={17} />
          {item}
        </li>
      ))}
    </ul>
  );
}
