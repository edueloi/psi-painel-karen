import React from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Logo } from "./PublicNavbar";
import { publicPanelUrl } from "./publicNavigation";

export function PublicFooter() {
  const { isAuthenticated } = useAuth();
  return (
    <footer className="ps-footer">
      <div className="ps-wrap">
        <div className="ps-footer-grid">
          <div className="ps-footer-brand">
            <Logo />
            <p className="ps-footer-copy">
              Conectando cuidado e gestão.
              <br />
              Uma rotina mais leve para quem cuida de pessoas.
            </p>
            <Link to="/cadastro" className="ps-text-link">
              Conheça a Plaelo
            </Link>
          </div>
          <nav className="ps-footer-col" aria-label="Produto">
            <h3>Produto</h3>
            <Link to="/funcionalidades">Funcionalidades</Link>
            <Link to="/planos">Planos e preços</Link>
            <a href={publicPanelUrl(isAuthenticated)}>
              {isAuthenticated ? "Meu painel" : "Entrar no sistema"}
            </a>
          </nav>
          <nav className="ps-footer-col" aria-label="Plaelo">
            <h3>Plaelo</h3>
            <Link to="/sobre">Nossa história</Link>
            <Link to="/encontrar-profissional">Encontrar profissional</Link>
            <Link to="/cadastro">Criar conta</Link>
          </nav>
          <nav className="ps-footer-col" aria-label="Informações legais">
            <h3>Transparência</h3>
            <Link to="/termos-de-uso">Termos de uso</Link>
            <Link to="/politica-privacidade">Privacidade</Link>
          </nav>
        </div>
        <div className="ps-footer-bottom">
          <p>
            © {new Date().getFullYear()} Plaelo. Todos os direitos reservados.
          </p>
          <p>
            <Heart size={12} /> Feito para quem cuida.
          </p>
        </div>
      </div>
    </footer>
  );
}
