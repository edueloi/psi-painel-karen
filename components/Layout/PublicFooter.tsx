import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from './PublicNavbar';

export const PublicFooter: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const go = () => navigate(isAuthenticated ? '/dashboard' : '/login');

  return (
    <footer className="footer-dark" style={{ padding: 'clamp(48px,6vw,72px) 0 clamp(28px,4vw,36px)', marginTop: 0 }}>
      <div className="wrap footer-grid" style={{ paddingBottom: 32, borderBottom: '1px solid rgba(255,255,255,.12)' }}>
        <div style={{ maxWidth: 320 }}>
          <Logo size={32} wordmarkColor="#fff" />
          <p style={{ fontSize: 13, lineHeight: 1.7, marginTop: 14, color: 'rgba(255,255,255,.55)' }}>
            Sistema de gestão para profissionais e clínicas de saúde mental.
          </p>
        </div>
        <div className="footer-links-grid">
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 14 }}>Produto</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/funcionalidades" style={{ fontSize: 14, textDecoration: 'none' }}>Funcionalidades</Link>
              <Link to="/planos" style={{ fontSize: 14, textDecoration: 'none' }}>Planos</Link>
              <Link to="/encontrar-profissional" style={{ fontSize: 14, textDecoration: 'none' }}>Encontrar Profissional</Link>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 14 }}>Empresa</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/sobre" style={{ fontSize: 14, textDecoration: 'none' }}>Sobre</Link>
              <Link to="/ajuda" style={{ fontSize: 14, textDecoration: 'none' }}>Suporte</Link>
              <button onClick={go} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, textAlign: 'left', padding: 0, color: 'rgba(255,255,255,.65)' }}>Login</button>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 14 }}>Legal</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/termos-de-uso" style={{ fontSize: 14, textDecoration: 'none' }}>Termos de Uso</Link>
              <Link to="/politica-privacidade" style={{ fontSize: 14, textDecoration: 'none' }}>Privacidade</Link>
            </div>
          </div>
        </div>
      </div>
      <div className="wrap" style={{ paddingTop: 24 }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)' }}>© {new Date().getFullYear()} Plaelo. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
};
