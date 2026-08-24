import React from 'react';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';

export const PublicSiteShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: '#fff', color: '#150F2E', minHeight: '100vh', overflowX: 'hidden' }}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :root {
        --ink: #120C2E;
        --accent: #6D42F5;
        --accent2: #12B76A;
        --accent-soft: #EFE9FF;
        --text: #150F2E;
        --muted: #665F82;
        --border: #E7E2F7;
        --surface: #F8F6FF;
        --surface2: #F1ECFF;
      }
      html { scroll-behavior: smooth; }
      body { -webkit-font-smoothing: antialiased; }
      h1, h2, h3 { font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
      }

      .btn-p {
        display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
        background: var(--ink); color: #fff; border: none;
        font-weight: 700; font-size: 15px; letter-spacing: -0.01em; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
        padding: 14px clamp(18px, 5vw, 28px); border-radius: 999px; white-space: nowrap;
        box-shadow: 0 8px 24px rgba(18,12,46,.22);
        transition: background .15s, transform .15s, box-shadow .15s;
      }
      .btn-p:hover { background: var(--accent); transform: translateY(-2px); box-shadow: 0 10px 28px rgba(109,66,245,.35); }
      .btn-p:focus-visible { outline: 3px solid rgba(109,66,245,.4); outline-offset: 2px; }
      .btn-g {
        display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
        background: #fff; color: var(--text); border: 1.5px solid var(--border);
        font-weight: 600; font-size: 15px; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
        padding: 13px clamp(16px, 4.5vw, 26px); border-radius: 999px; white-space: nowrap;
        transition: border-color .15s, box-shadow .15s;
      }
      .btn-g:hover { border-color: var(--accent); box-shadow: 0 2px 12px rgba(109,66,245,.12); }
      .btn-g:focus-visible { outline: 3px solid rgba(109,66,245,.3); outline-offset: 2px; }

      .nav-a {
        font-size: 14px; font-weight: 600; color: var(--muted);
        text-decoration: none; transition: color .15s;
      }
      .nav-a:hover { color: var(--text); }
      .nav-a:focus-visible { outline: 2px solid var(--accent); border-radius: 4px; }

      .tag {
        display: inline-flex; align-items: center; gap: 6px;
        background: var(--accent-soft); color: var(--accent);
        font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
        padding: 6px 14px; border-radius: 999px;
      }
      .tag-green { background: #E4F8EE; color: #0D9155; }

      .card {
        background: #fff; border: 1px solid var(--border); border-radius: 22px;
        padding: 28px; transition: box-shadow .2s, transform .2s;
      }
      .card:hover { box-shadow: 0 14px 40px rgba(18,12,46,.10); transform: translateY(-3px); }

      .wrap  { max-width: 1180px; margin: 0 auto; padding: 0 24px; }
      .wrap-sm { max-width: 860px; margin: 0 auto; padding: 0 24px; }
      .wrap-xs { max-width: 660px; margin: 0 auto; padding: 0 24px; }
      @media (max-width: 640px) {
        .wrap, .wrap-sm, .wrap-xs { padding: 0 16px; }
      }

      .section { padding: clamp(64px, 8vw, 112px) 0; }
      .section + .section { border-top: 1px solid var(--border); }

      .feat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
      .plan-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; align-items: stretch; }
      @media (max-width: 520px) { .plan-grid { grid-template-columns: 1fr; } }
      .area-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }

      .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(40px,6vw,80px); align-items: center; }
      @media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } }

      .hero-split { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: clamp(32px,5vw,64px); align-items: center; }
      @media (max-width: 880px) { .hero-split { grid-template-columns: 1fr; } }

      .aurora-band {
        background: linear-gradient(135deg, var(--surface2) 0%, #E4F8EE 100%);
        border-radius: 32px; overflow: hidden;
      }

      /* Floating pill navbar */
      .nav-pill {
        display: flex; align-items: center; justify-content: space-between;
        background: rgba(255,255,255,.88); backdrop-filter: blur(14px);
        border: 1px solid var(--border); border-radius: 999px;
        padding: 10px 10px 10px 22px;
        box-shadow: 0 8px 32px rgba(18,12,46,.08);
      }

      .mob-drawer-overlay {
        position: fixed; inset: 0; z-index: 98;
        background: rgba(18,12,46,.4); backdrop-filter: blur(2px);
        transition: opacity .25s ease;
      }
      .mob-drawer {
        position: fixed; top: 0; right: 0; height: 100dvh;
        width: min(320px, 84vw); z-index: 99;
        background: #fff; box-shadow: -16px 0 48px rgba(18,12,46,.18);
        display: flex; flex-direction: column;
        transition: transform .3s cubic-bezier(.32,.72,0,1);
      }
      .mob-drawer-head {
        display: flex; align-items: center; justify-content: space-between;
        padding: 18px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0;
      }
      .mob-drawer-body {
        flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 2px;
      }
      .mob-drawer-foot {
        padding: 16px 20px; border-top: 1px solid var(--border); flex-shrink: 0;
      }
      .mob-menu-link {
        display: flex; align-items: center; gap: 12px;
        padding: 12px 12px; border-radius: 14px;
        font-size: 15px; font-weight: 600; color: var(--muted);
        text-decoration: none; transition: background .15s, color .15s;
      }
      .mob-menu-link:hover { background: var(--surface); color: var(--text); }
      .mob-menu-icon {
        width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
        background: var(--surface); color: var(--muted);
        display: flex; align-items: center; justify-content: center;
        transition: background .15s, color .15s;
      }

      .hero-accent {
        background: linear-gradient(90deg, var(--accent) 0%, #A78BFA 100%);
        -webkit-background-clip: text; background-clip: text; color: transparent;
      }

      .hero-bg {
        background-color: #fff;
        background-image:
          radial-gradient(circle at 15% 20%, rgba(109,66,245,.10) 0%, transparent 45%),
          radial-gradient(circle at 85% 15%, rgba(18,183,106,.08) 0%, transparent 40%);
      }

      /* Floating collage cards (hero visual) */
      .float-stack { position: relative; min-height: 360px; }
      .float-card {
        position: absolute; background: #fff; border: 1px solid var(--border); border-radius: 20px;
        box-shadow: 0 20px 50px rgba(18,12,46,.14); padding: 18px 20px;
      }

      .footer-dark { background: var(--ink); color: rgba(255,255,255,.7); }
      .footer-dark a { color: rgba(255,255,255,.65); }
      .footer-dark a:hover { color: #fff; }
      .footer-grid {
        display: grid; grid-template-columns: 1fr; gap: 32px;
      }
      .footer-links-grid {
        display: grid; grid-template-columns: repeat(2, 1fr); gap: 28px;
      }
      @media (max-width: 639px) {
        .footer-links-grid > div:last-child { grid-column: 1 / -1; }
        .footer-links-grid > div:last-child > div { flex-direction: row; gap: 28px; }
      }
      @media (min-width: 640px) {
        .footer-grid { grid-template-columns: 1.3fr 1fr; gap: 40px; }
        .footer-links-grid { grid-template-columns: repeat(3, 1fr); gap: clamp(24px, 4vw, 56px); }
      }

      .page-head { padding: clamp(56px,7vw,88px) 0 clamp(24px,3vw,40px); background: var(--surface); }
    `}</style>

    <PublicNavbar />
    {children}
    <PublicFooter />
  </div>
);
