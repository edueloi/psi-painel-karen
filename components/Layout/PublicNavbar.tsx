import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowRight, Menu, X, Search, Home, Sparkles, CreditCard, Info } from 'lucide-react';
import logoUrl from '../../images/logo-sistema/logo.png';

const NAV_LINKS: [string, string, React.ComponentType<{ size?: number }>][] = [
  ['/', 'Início', Home],
  // '/individual' ainda em construção — reativar o link quando a página estiver pronta.
  ['/funcionalidades', 'Funcionalidades', Sparkles],
  ['/planos', 'Planos', CreditCard],
  ['/sobre', 'Sobre', Info],
];

export const Logo: React.FC<{ size?: number; wordmarkColor?: string }> = ({ size = 36, wordmarkColor }) => (
  <Link to="/" className="flex items-center gap-2.5" style={{ textDecoration: 'none' }}>
    <img src={logoUrl} alt="Plaelo" style={{ width: size, height: size }} className="rounded-xl object-contain" />
    <span className="font-bold text-xl" style={{ color: wordmarkColor || '#150F2E', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>Plaelo</span>
  </Link>
);

export const PublicNavbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Login/dashboard vivem só em painel.<dominio> (token em localStorage é
  // isolado por domínio) — navegação real de browser, não SPA, evita cair
  // no /login deste domínio e ter que ser redirecionado de novo depois.
  // Dois domínios convivem hoje (psiflux.com.br legado + plaelo.com.br novo),
  // cada um vai pro próprio painel, nunca cruzando pra família errada.
  const PUBLIC_ROOT_TO_PAINEL_HOST: Record<string, string> = {
    'psiflux.com.br': 'painel.psiflux.com.br',
    'www.psiflux.com.br': 'painel.psiflux.com.br',
    'plaelo.com.br': 'painel.plaelo.com.br',
    'www.plaelo.com.br': 'painel.plaelo.com.br',
  };
  const go = () => {
    setMenuOpen(false);
    const path = isAuthenticated ? '/dashboard' : '/login';
    // Só força ir pro domínio painel em produção — em localhost/dev isso
    // mandaria o desenvolvedor pra produção sem querer.
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const painelHost = PUBLIC_ROOT_TO_PAINEL_HOST[hostname];
    if (!painelHost) {
      navigate(path);
    } else {
      window.location.href = `https://${painelHost}${path}`;
    }
  };

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const navTabStyle = ({ isActive }: { isActive: boolean }) => ({
    fontSize: 14.5, fontWeight: isActive ? 700 : 600,
    color: isActive ? 'var(--text)' : 'var(--muted)',
    textDecoration: 'none',
    padding: '6px 2px',
    position: 'relative' as const,
  });

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      {/* Desktop — barra ampla e respirada, sem tudo empilhado numa única pill */}
      <header className="hidden md:block site-header">
        <div className="wrap site-header-inner">
          <Logo size={32} />

          <nav className="site-header-nav">
            {NAV_LINKS.map(([href, label]) => (
              <NavLink key={href} to={href} end className="site-header-tab" style={navTabStyle}>
                {({ isActive }: any) => (
                  <>
                    {label}
                    <span className="site-header-tab-underline" style={{ opacity: isActive ? 1 : 0 }} />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="site-header-actions">
            <NavLink to="/encontrar-profissional" className="site-header-find">
              <Search size={14} /> Encontrar Profissional
            </NavLink>
            <button onClick={go} className="site-header-login">
              Entrar
            </button>
            <button className="btn-p" onClick={go} style={{ padding: '11px 20px', fontSize: 14 }}>
              Demo gratuita <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile/tablet — barra fixa cheia, colada no topo */}
      <nav className="nav-pill flex md:hidden">
        <Logo size={34} />
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: 'var(--text)' }}
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
        >
          <Menu size={22} />
        </button>
      </nav>

      {/* Overlay — só existe no mobile; no desktop o menu lateral não é usado */}
      <div
        onClick={() => setMenuOpen(false)}
        className="mob-drawer-overlay md:hidden"
        style={{ opacity: menuOpen ? 1 : 0, pointerEvents: menuOpen ? 'auto' : 'none' }}
      />

      {/* Drawer lateral — mobile only */}
      <aside className="mob-drawer md:hidden" style={{ transform: menuOpen ? 'translateX(0)' : 'translateX(100%)' }}>
        <div className="mob-drawer-head">
          <Logo size={30} />
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
            style={{ background: 'var(--surface2)', border: 'none', borderRadius: 999, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', cursor: 'pointer' }}
          >
            <X size={17} />
          </button>
        </div>

        <div className="mob-drawer-body">
          {NAV_LINKS.map(([href, label, Icon]) => {
            const active = location.pathname === href;
            return (
              <Link
                key={href}
                to={href}
                className="mob-menu-link"
                style={active ? { background: 'var(--surface2)', color: 'var(--text)' } : {}}
              >
                <span className="mob-menu-icon" style={active ? { background: 'var(--accent)', color: '#fff' } : {}}>
                  <Icon size={16} />
                </span>
                {label}
              </Link>
            );
          })}
          <Link to="/encontrar-profissional" className="mob-menu-link" style={{ color: 'var(--accent)', fontWeight: 700 }}>
            <span className="mob-menu-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <Search size={16} />
            </span>
            Encontrar Profissional
          </Link>
        </div>

        <div className="mob-drawer-foot">
          <button onClick={go} className="btn-g" style={{ width: '100%', justifyContent: 'center' }}>
            Entrar
          </button>
          <button onClick={go} className="btn-p" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
            Demo gratuita <ArrowRight size={16} />
          </button>
        </div>
      </aside>
    </div>
  );
};
