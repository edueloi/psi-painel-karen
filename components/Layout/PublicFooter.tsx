import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Heart, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { Logo } from './PublicNavbar';

export const PublicFooter: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const go = () => navigate(isAuthenticated ? '/dashboard' : '/login');

  return (
    <footer className="footer-dark footer-premium">
      <div className="footer-premium-glow footer-premium-glow-a" />
      <div className="footer-premium-glow footer-premium-glow-b" />

      <div className="wrap footer-premium-inner">
        <div className="footer-premium-top">
          <div className="footer-brand">
            <Logo size={36} wordmarkColor="#fff" />

            <p className="footer-brand-copy">
              Gestão mais simples para quem dedica o dia a cuidar de pessoas.
            </p>

            <div className="footer-brand-badges">
              <span><ShieldCheck size={14} /> LGPD</span>
              <span><LockKeyhole size={14} /> Dados protegidos</span>
            </div>

            <button className="footer-main-cta" onClick={go}>
              {isAuthenticated ? 'Ir para o sistema' : 'Começar agora'}
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="footer-nav">
            <div className="footer-nav-col">
              <p className="footer-nav-title">Produto</p>
              <Link to="/funcionalidades">Funcionalidades</Link>
              <Link to="/planos">Planos</Link>
              <Link to="/encontrar-profissional">Encontrar profissional</Link>
            </div>

            <div className="footer-nav-col">
              <p className="footer-nav-title">Plaelo</p>
              <Link to="/sobre">Sobre</Link>
              <Link to="/ajuda">Suporte</Link>
              <button onClick={go}>Entrar</button>
            </div>

            <div className="footer-nav-col">
              <p className="footer-nav-title">Legal</p>
              <Link to="/termos-de-uso">Termos de uso</Link>
              <Link to="/politica-privacidade">Privacidade</Link>
            </div>
          </div>
        </div>

        <div className="footer-highlight">
          <div className="footer-highlight-icon">
            <Sparkles size={18} />
          </div>
          <div>
            <strong>Menos burocracia. Mais presença.</strong>
            <span>Agenda, prontuário, financeiro e tecnologia trabalhando juntos.</span>
          </div>
        </div>

        <div className="footer-premium-bottom">
          <p>© {new Date().getFullYear()} Plaelo. Todos os direitos reservados.</p>

          <div className="footer-made-with-care">
            <Heart size={14} fill="currentColor" />
            <span>Feito para quem cuida da saúde mental.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
