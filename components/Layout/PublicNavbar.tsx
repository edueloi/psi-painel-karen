import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowRight, Menu, Search, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { publicPanelUrl } from "./publicNavigation";
import logoUrl from "../../images/logo-sistema/logo.png";
import "./publicMarketing.css";

const links = [
  ["/", "Início"],
  ["/funcionalidades", "Funcionalidades"],
  ["/planos", "Planos"],
  ["/sobre", "Sobre"],
] as const;
export const Logo: React.FC<{ size?: number; wordmarkColor?: string }> = ({
  size = 30,
  wordmarkColor,
}) => (
  <Link to="/" className="ps-logo" aria-label="Plaelo — início">
    <img src={logoUrl} alt="" width={size} height={size} />
    <span style={{ color: wordmarkColor }}>Plaelo</span>
  </Link>
);

export function PublicNavbar() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelUrl = publicPanelUrl(isAuthenticated);
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    if (menuOpen) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else if (dialog.open) {
      dialog.close();
      toggleRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1121px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  const navLinks = links.map(([path, label]) => (
    <NavLink key={path} to={path} end className="ps-nav-link">
      {label}
    </NavLink>
  ));
  return (
    <header className="ps-nav">
      <div className="ps-nav-inner">
        <Logo />
        <nav className="ps-nav-links" aria-label="Navegação principal">
          {navLinks}
        </nav>
        <div className="ps-nav-actions">
          <Link to="/encontrar-profissional" className="ps-nav-find">
            <Search size={13} />
            Encontrar profissional
          </Link>
          <a href={panelUrl} className="ps-nav-link">
            {isAuthenticated ? "Meu painel" : "Entrar"}
          </a>
          {isAuthenticated ? (
            <a href={panelUrl} className="ps-button">
              Acessar sistema <ArrowRight size={14} />
            </a>
          ) : (
            <Link to="/cadastro" className="ps-button">
              Começar agora <ArrowRight size={14} />
            </Link>
          )}
        </div>
        <button
          ref={toggleRef}
          className="ps-nav-toggle"
          type="button"
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          aria-controls="public-menu"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={21} />
        </button>
        <dialog
          id="public-menu"
          ref={dialogRef}
          className="ps-menu"
          aria-label="Menu do site"
          onClose={() => setMenuOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setMenuOpen(false);
          }}
        >
          <div className="ps-menu-head">
            <Logo />
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setMenuOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <nav className="ps-menu-links" aria-label="Navegação móvel">
            {navLinks}
            <Link to="/encontrar-profissional" className="ps-nav-link">
              Encontrar profissional
            </Link>
          </nav>
          <a href={panelUrl} className="ps-button ps-button-outline">
            {isAuthenticated ? "Meu painel" : "Entrar no sistema"}
          </a>
          {!isAuthenticated && (
            <Link to="/cadastro" className="ps-button">
              Começar agora <ArrowRight size={16} />
            </Link>
          )}
        </dialog>
      </div>
    </header>
  );
}
