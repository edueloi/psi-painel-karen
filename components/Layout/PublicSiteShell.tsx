import React from 'react';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';

export const PublicSiteShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: '#FBF6EF', color: '#33291D', minHeight: '100vh', overflowX: 'clip' }}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700;9..144,800&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :root {
        --ink: #2B2318;
        --accent: #C1613D;
        --accent2: #6B8F71;
        --accent-soft: #F3E4D8;
        --text: #33291D;
        --muted: #8A7A68;
        --border: #E8DDD0;
        --surface: #FBF6EF;
        --surface2: #F5EAE0;
      }
      html { scroll-behavior: smooth; }
      body { -webkit-font-smoothing: antialiased; }
      h1, h2, h3 { font-family: 'Fraunces', 'Georgia', serif; }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
      }

      .btn-p {
        display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
        background: var(--ink); color: #fff; border: none;
        font-weight: 700; font-size: 15px; letter-spacing: -0.01em; font-family: 'Inter', sans-serif;
        padding: 14px clamp(18px, 5vw, 28px); border-radius: 999px; white-space: nowrap;
        box-shadow: 0 8px 24px rgba(43,35,24,.20);
        transition: background .15s, transform .15s, box-shadow .15s;
      }
      .btn-p:hover { background: var(--accent); transform: translateY(-2px); box-shadow: 0 10px 28px rgba(193,97,61,.32); }
      .btn-p:focus-visible { outline: 3px solid rgba(193,97,61,.4); outline-offset: 2px; }
      .btn-g {
        display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
        background: #fff; color: var(--text); border: 1.5px solid var(--border);
        font-weight: 600; font-size: 15px; font-family: 'Inter', sans-serif;
        padding: 13px clamp(16px, 4.5vw, 26px); border-radius: 999px; white-space: nowrap;
        transition: border-color .15s, box-shadow .15s;
      }
      .btn-g:hover { border-color: var(--accent); box-shadow: 0 2px 12px rgba(193,97,61,.12); }
      .btn-g:focus-visible { outline: 3px solid rgba(193,97,61,.3); outline-offset: 2px; }

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
      .tag-green { background: #E5EDE3; color: #4C6650; }

      .card {
        background: #fff; border: 1px solid var(--border); border-radius: 22px;
        padding: 28px; transition: box-shadow .2s, transform .2s;
      }
      .card:hover { box-shadow: 0 14px 40px rgba(18,12,46,.10); transform: translateY(-3px); }

      /* Micro-interação de hover reutilizável — usada em cards de destaque */
      .hover-lift { transition: box-shadow .25s ease, transform .25s ease, border-color .25s ease; }
      .hover-lift:hover { transform: translateY(-5px); box-shadow: 0 18px 44px rgba(18,12,46,.12); border-color: var(--accent-soft); }

      .link-arrow svg { transition: transform .2s ease; }
      .link-arrow:hover svg { transform: translateX(4px); }

      /* Formas flutuantes decorativas de fundo — usadas nas seções de marketing */
      .bg-blob { position: absolute; border-radius: 50%; filter: blur(60px); pointer-events: none; z-index: 0; opacity: .5; animation: bg-blob-float 14s ease-in-out infinite; }
      @keyframes bg-blob-float {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(-18px, 22px) scale(1.06); }
      }
      @media (prefers-reduced-motion: reduce) {
        .bg-blob { animation: none; }
      }

      .wrap  { max-width: 1180px; margin: 0 auto; padding: 0 24px; }
      .wrap-sm { max-width: 860px; margin: 0 auto; padding: 0 24px; }
      .wrap-xs { max-width: 660px; margin: 0 auto; padding: 0 24px; }
      @media (max-width: 640px) {
        .wrap, .wrap-sm, .wrap-xs { padding: 0 16px; }
      }

      .section { padding: clamp(64px, 8vw, 112px) 0; position: relative; }
      .section > .wrap, .section > .wrap-sm { position: relative; z-index: 1; }
      .section + .section { border-top: 1px solid var(--border); }

      .feat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
      .plan-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; align-items: stretch; }
      @media (max-width: 520px) { .plan-grid { grid-template-columns: 1fr; } }
      .area-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }

      /* Lista de áreas atendidas — uma linha por categoria, sem pills nem corte */
      .area-list { display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: 22px; background: #fff; overflow: hidden; }
      .area-row { display: grid; grid-template-columns: 260px 1fr; gap: 28px; align-items: center; padding: 22px 28px; }
      .area-row + .area-row { border-top: 1px solid var(--border); }
      .area-row-head { display: flex; align-items: center; gap: 13px; }
      .area-row-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .area-row-title { font-weight: 700; font-size: 15px; line-height: 1.3; }
      .area-row-count { font-size: 12px; color: var(--muted); font-weight: 500; }
      .area-row-professions { font-size: 14px; line-height: 1.7; color: var(--muted); }
      @media (max-width: 720px) {
        .area-row { grid-template-columns: 1fr; gap: 10px; padding: 18px 20px; }
        .area-row-professions { font-size: 13px; }
      }

      .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(40px,6vw,80px); align-items: center; }
      @media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } }

      .aurora-band {
        background: linear-gradient(135deg, var(--surface2) 0%, #E5EDE3 100%);
        border-radius: 32px; overflow: hidden;
      }

      /* Navbar mobile/tablet — barra fixa cheia, sem pill flutuante nem margens.
         display fica de fora daqui de propósito: é controlado via classe
         Tailwind (flex/hidden) no JSX, pra não competir em especificidade com
         md:hidden — como os dois viram regras "uma classe" (0,1,0), a ordem de
         injeção do Tailwind CDN decide quem ganha, o que é frágil/imprevisível. */
      .nav-pill {
        align-items: center; justify-content: space-between;
        background: rgba(255,255,255,.96); backdrop-filter: blur(14px);
        border-bottom: 1px solid var(--border);
        padding: 14px 20px;
        box-shadow: 0 2px 16px rgba(18,12,46,.06);
      }

      /* Desktop header — barra plana e ampla, sem tudo empilhado numa pill só */
      .site-header {
        background: rgba(255,255,255,.85); backdrop-filter: blur(14px);
        border-bottom: 1px solid var(--border);
      }
      .site-header-inner {
        display: flex; align-items: center; justify-content: space-between;
        gap: 40px; padding: 16px 24px;
      }
      .site-header-nav { display: flex; align-items: center; gap: 32px; }
      .site-header-tab { display: inline-flex; flex-direction: column; align-items: center; gap: 8px; }
      .site-header-tab-underline {
        width: 100%; height: 2px; border-radius: 2px; background: var(--accent);
        transition: opacity .15s;
      }
      .site-header-actions { display: flex; align-items: center; gap: 22px; }
      .site-header-find {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 14px; font-weight: 600; color: var(--muted);
        text-decoration: none; transition: color .15s;
      }
      .site-header-find:hover { color: var(--accent); }
      .site-header-login {
        background: none; border: none; cursor: pointer;
        font-size: 14px; font-weight: 600; color: var(--muted);
        transition: color .15s;
      }
      .site-header-login:hover { color: var(--text); }

      /* CTA final — largura ampla em telas grandes, texto + prova social lado a lado */
      .cta-final {
        background: linear-gradient(135deg, var(--ink) 0%, #4A3D2C 100%);
        border-radius: 32px;
        padding: clamp(40px,5vw,64px) clamp(28px,5vw,64px);
        display: grid; grid-template-columns: 1.3fr 1fr; gap: 40px; align-items: center;
      }
      .cta-final-proof { display: flex; flex-direction: column; gap: 14px; justify-self: end; width: 100%; max-width: 280px; }
      .cta-final-proof-item {
        display: flex; align-items: center; gap: 12px;
        padding: 14px 18px; border-radius: 16px;
        background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
        color: #fff; font-size: 14px; font-weight: 600;
      }
      .cta-final-proof-item svg { color: var(--accent2); flex-shrink: 0; }
      @media (max-width: 860px) {
        .cta-final { grid-template-columns: 1fr; text-align: center; }
        .cta-final-text { display: flex; flex-direction: column; align-items: center; }
        .cta-final-text img { margin-left: auto; margin-right: auto; }
        .cta-final-proof { justify-self: center; max-width: 360px; }
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
        background: linear-gradient(90deg, var(--accent) 0%, #6B8F71 100%);
        -webkit-background-clip: text; background-clip: text; color: transparent;
      }

      .hero-bg {
        background-color: #fff;
        background-image:
          radial-gradient(circle at 15% 20%, rgba(193,97,61,.10) 0%, transparent 45%),
          radial-gradient(circle at 85% 15%, rgba(107,143,113,.10) 0%, transparent 40%);
      }

      .hero-bg::before {
        content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .5;
        background-image: linear-gradient(rgba(193,97,61,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(193,97,61,.05) 1px, transparent 1px);
        background-size: 44px 44px;
        mask-image: linear-gradient(to bottom, #000, transparent 78%);
      }

      .site-proof {
        display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;
        border: 1px solid var(--border); border-radius: 22px; overflow: hidden;
        background: rgba(255,255,255,.9); box-shadow: 0 14px 36px rgba(18,12,46,.06);
      }
      .site-proof-item { padding: 18px 20px; display: flex; align-items: center; gap: 11px; }
      .site-proof-item + .site-proof-item { border-left: 1px solid var(--border); }
      .site-proof-icon { width: 34px; height: 34px; border-radius: 11px; background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .site-proof-value { font-family: 'Fraunces', serif; font-size: 15px; font-weight: 800; color: var(--text); line-height: 1.15; }
      .site-proof-label { font-size: 11px; color: var(--muted); margin-top: 2px; line-height: 1.35; }
      @media (max-width: 720px) {
        .site-proof { grid-template-columns: repeat(2, 1fr); }
        .site-proof-item + .site-proof-item { border-left: 0; }
        .site-proof-item:nth-child(even) { border-left: 1px solid var(--border); }
        .site-proof-item:nth-child(n+3) { border-top: 1px solid var(--border); }
      }
      @media (max-width: 390px) { .site-proof { grid-template-columns: 1fr; } .site-proof-item:nth-child(even) { border-left: 0; } .site-proof-item + .site-proof-item { border-top: 1px solid var(--border); } }

      .journey-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; counter-reset: journey; }
      .journey-card { position: relative; padding: 28px; border: 1px solid var(--border); background: #fff; border-radius: 22px; overflow: hidden; }
      .journey-card::after { counter-increment: journey; content: '0' counter(journey); position: absolute; top: 14px; right: 18px; font: 800 36px/1 'Fraunces', serif; color: var(--accent-soft); }
      .journey-card p { font-size: 13px; line-height: 1.7; color: var(--muted); max-width: 260px; }
      @media (max-width: 720px) { .journey-grid { grid-template-columns: 1fr; } }

      /* Floating collage cards (hero visual) */
      .float-stack { position: relative; min-height: 360px; isolation: isolate; }
      .float-card {
        position: absolute; background: #fff; border: 1px solid var(--border); border-radius: 20px;
        box-shadow: 0 20px 50px rgba(18,12,46,.14); padding: 18px 20px;
      }
      .float-stack::after { content: ''; position: absolute; width: 110px; height: 110px; border: 18px solid rgba(193,97,61,.14); border-radius: 50%; right: -28px; bottom: 7px; z-index: -1; }
      @media (max-width: 480px) {
        .float-stack { min-height: 320px; margin: 0 -4px; }
        .float-card { padding: 14px; border-radius: 16px; }
      }

      /* Hero — texto à esquerda dentro do container, foto em tela cheia (full-bleed) à direita */
      .hero-split {
        position: relative; background: #fff; overflow: clip;
        min-height: clamp(520px, 74vh, 680px); display: flex; align-items: center;
        padding: clamp(28px,4vw,48px) 0;
      }
      .hero-split-media {
        position: absolute; top: 0; right: 0; bottom: 0;
        left: max(56%, calc((100vw - 1180px) / 2 + 620px));
      }
      .hero-split-media-img { width: 100%; height: 100%; object-fit: cover; object-position: center 25%; display: block; }
      .hero-split-media-overlay {
        position: absolute; inset: 0;
        background: linear-gradient(90deg, #fff 0%, rgba(255,255,255,0) 8%);
      }
      .hero-split-grid { position: relative; z-index: 1; max-width: 1180px; margin: 0 auto; }
      .hero-split-text { max-width: 460px; }
      .hero-split-badge {
        position: absolute; z-index: 1; top: 24px; right: 24px;
        background: #fff; border-radius: 14px; padding: 10px 16px;
        box-shadow: 0 14px 34px rgba(18,12,46,.16);
      }
      .hero-split-badge strong { display: block; font-size: 13px; font-weight: 800; color: var(--ink); }
      .hero-split-badge span { display: block; font-size: 11px; color: var(--muted); margin-top: 1px; }
      @media (max-width: 860px) {
        .hero-split { flex-direction: column; min-height: auto; padding-top: 0; }
        .hero-split-media { position: relative; left: 0; height: 46vh; min-height: 280px; order: -1; margin-bottom: 28px; }
        .hero-split-media-overlay { background: linear-gradient(180deg, rgba(255,255,255,0) 55%, rgba(255,255,255,1) 100%); }
        .hero-split-badge { top: auto; bottom: 16px; right: 16px; }
        .hero-split-grid { padding: 0 24px; }
      }

      /* Hero editorial da Home — foto com recorte orgânico, tipografia serifada */
      .home-hero { position: relative; background: var(--surface); overflow: clip; padding: clamp(48px,7vw,88px) 0 clamp(56px,7vw,96px); }
      .home-hero-grid {
        display: grid; grid-template-columns: minmax(0,1.15fr) minmax(0,0.85fr);
        gap: clamp(32px,5vw,72px); align-items: center;
      }
      .home-hero-text { max-width: 560px; }
      .home-hero-title {
        font-family: 'Fraunces', 'Georgia', serif; font-weight: 600;
        font-size: clamp(32px,4.6vw,58px); letter-spacing: -0.02em; line-height: 1.08;
        color: var(--ink); margin-bottom: 20px;
      }
      .home-hero-title em { font-style: italic; color: var(--accent); font-weight: 500; }
      .home-hero-lede { font-size: clamp(16px,1.3vw,18px); line-height: 1.65; color: var(--muted); margin-bottom: 28px; max-width: 480px; }
      .home-hero-visual { position: relative; }
      .home-hero-photo {
        position: relative; aspect-ratio: 4/4.6; overflow: hidden;
        border-radius: 168px 32px 168px 32px;
        box-shadow: 0 28px 64px rgba(43,35,24,.18);
      }
      .home-hero-photo img { width: 100%; height: 100%; object-fit: cover; object-position: center 25%; display: block; }
      .home-hero-photo::after {
        content: ''; position: absolute; inset: 0; border-radius: inherit;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.5);
      }
      .home-hero-note {
        position: absolute; left: -28px; bottom: 28px; z-index: 1;
        display: flex; align-items: flex-start; gap: 10px; max-width: 230px;
        background: #fff; border-radius: 16px; padding: 12px 14px;
        box-shadow: 0 16px 36px rgba(43,35,24,.16);
      }
      .home-hero-note-icon {
        width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; margin-top: 1px;
        display: flex; align-items: center; justify-content: center;
        background: var(--accent-soft); color: var(--accent);
      }
      .home-hero-note strong { display: block; font-size: 12.5px; font-weight: 800; color: var(--ink); font-family: 'Inter', sans-serif; }
      .home-hero-note span { display: block; font-size: 11.5px; color: var(--muted); line-height: 1.5; margin-top: 2px; font-style: italic; }
      @media (max-width: 860px) {
        .home-hero-grid { grid-template-columns: 1fr; }
        .home-hero-visual { order: -1; max-width: 320px; margin: 0 auto 12px; }
        .home-hero-photo { aspect-ratio: 4/3.6; border-radius: 120px 24px 120px 24px; }
        .home-hero-note { left: 12px; bottom: -18px; max-width: 200px; }
        .home-hero-text { max-width: 100%; }
      }

      .home-h2 { font-size: clamp(24px,3.6vw,38px); font-weight: 600; letter-spacing: -0.01em; line-height: 1.2; margin-top: 16px; margin-bottom: 14px; }

      /* Hub radial — página /individual, "sua prática clínica" */
      .hub-section { background: linear-gradient(180deg, #0F0B2E 0%, #150F3D 100%); overflow: clip; }
      .hub-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: clamp(32px,5vw,64px); align-items: center; }
      .hub-feature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px 28px; max-width: 460px; }
      .hub-diagram {
        position: relative; width: 100%; aspect-ratio: 1/1; max-width: 460px; margin: 0 auto;
      }
      .hub-core {
        position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
        width: clamp(96px,20%,132px); height: clamp(96px,20%,132px); border-radius: 50%;
        background: radial-gradient(circle, rgba(127,212,247,.35) 0%, rgba(127,212,247,.06) 62%, transparent 72%);
        display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
        z-index: 1;
      }
      .hub-core::before {
        content: ''; position: absolute; inset: 14%; border-radius: 50%;
        background: #171240; border: 1px solid rgba(127,212,247,.35); z-index: -1;
      }
      .hub-core span { font-size: 10px; font-weight: 700; letter-spacing: .1em; color: rgba(255,255,255,.55); }
      .hub-core strong { font-size: clamp(13px,2vw,15px); font-weight: 800; color: #fff; line-height: 1.25; margin-top: 2px; }
      .hub-node {
        position: absolute; top: 50%; left: 50%; width: 0; height: 0;
        transform: rotate(var(--angle)) translate(clamp(120px,42%,190px)) rotate(calc(-1 * var(--angle)));
      }
      .hub-node-inner {
        transform: translate(-50%,-50%); display: flex; flex-direction: column; align-items: center; gap: 6px; width: max-content;
      }
      .hub-node-icon {
        width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
        background: #1B1650; border: 1px solid rgba(127,212,247,.4); color: #7FD4F7;
      }
      .hub-node-label { font-size: 10.5px; font-weight: 600; color: rgba(255,255,255,.72); text-align: center; }
      @media (max-width: 760px) {
        .hub-grid { grid-template-columns: 1fr; }
        .hub-feature-grid { max-width: 100%; }
        .hub-diagram { max-width: 340px; }
      }
      @media (max-width: 420px) {
        .hub-node-label { display: none; }
      }

      /* Jornada em 4 etapas — página /individual */
      .journey-steps { display: flex; flex-direction: column; gap: clamp(56px,7vw,88px); }
      .journey-step {
        display: grid; grid-template-columns: auto minmax(0,1fr) minmax(0,1fr);
        gap: clamp(20px,3vw,40px); align-items: center;
      }
      .journey-step.reverse { grid-template-columns: auto minmax(0,1fr) minmax(0,1fr); }
      .journey-step.reverse .journey-step-visual { order: -1; }
      .journey-step-num {
        font-family: 'Fraunces', serif; font-size: clamp(40px,5vw,64px); font-weight: 800;
        color: var(--accent-soft); line-height: 1;
      }
      .journey-step-info h3 { font-size: clamp(20px,2.4vw,28px); font-weight: 800; letter-spacing: -0.02em; line-height: 1.25; margin-bottom: 12px; }
      .journey-step-info p { font-size: 15px; line-height: 1.7; color: var(--muted); }
      .journey-step-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
      .chip { font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--border); color: var(--muted); }
      @media (max-width: 860px) {
        .journey-step, .journey-step.reverse { grid-template-columns: 1fr; }
        .journey-step-num { font-size: 34px; }
        .journey-step.reverse .journey-step-visual { order: 0; }
      }

      /* Mockups de produto usados na jornada */
      .mock-card {
        background: #fff; border: 1px solid var(--border); border-radius: 20px; padding: 18px;
        box-shadow: 0 20px 50px rgba(18,12,46,.10);
      }
      .mock-card-dark { background: #171240; border-color: rgba(127,212,247,.2); }
      .mock-card-head { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; font-weight: 700; color: var(--ink); margin-bottom: 14px; gap: 6px; }
      .mock-card-dark .mock-card-head { color: #fff; }
      .mock-card-head span:first-child { display: flex; align-items: center; gap: 6px; }
      .mock-muted { font-size: 11px; font-weight: 600; color: var(--muted); }
      .mock-card-dark .mock-muted { color: rgba(255,255,255,.5); }
      .mock-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid var(--border); font-size: 13px; }
      .mock-row:first-of-type { border-top: none; }
      .mock-time { font-weight: 700; color: var(--ink); width: 42px; flex-shrink: 0; }
      .mock-name { color: var(--text); }
      .mock-pill {
        margin-left: auto; display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600;
        color: #4C6650; background: #E5EDE3; padding: 3px 9px; border-radius: 999px; white-space: nowrap;
      }
      .mock-quote { font-size: 12.5px; font-style: italic; color: rgba(255,255,255,.75); background: rgba(255,255,255,.05); border-radius: 12px; padding: 10px 12px; margin-bottom: 12px; line-height: 1.6; }
      .mock-list-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
      .mock-list-icon { width: 26px; height: 26px; border-radius: 8px; background: rgba(127,212,247,.14); color: #7FD4F7; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .mock-list-item strong { display: block; font-size: 12.5px; font-weight: 700; color: #fff; }
      .mock-list-item span { font-size: 11px; color: rgba(255,255,255,.5); }
      .mock-insight { display: flex; align-items: flex-start; gap: 6px; font-size: 11.5px; color: #7FD4F7; background: rgba(127,212,247,.08); border-radius: 10px; padding: 10px 12px; margin-top: 10px; line-height: 1.6; }
      .mock-bars { display: flex; align-items: flex-end; gap: 6px; height: 56px; margin-top: 14px; }
      .mock-bars span { flex: 1; background: linear-gradient(180deg, var(--accent) 0%, #6B8F71 100%); border-radius: 4px; }
      .mock-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 4px; }
      .mock-stat { background: var(--surface); border-radius: 12px; padding: 12px 10px; }
      .mock-stat strong { display: block; font-size: 14px; font-weight: 800; color: var(--ink); }
      .mock-stat span { display: block; font-size: 10px; color: var(--muted); margin-top: 3px; text-transform: uppercase; letter-spacing: .03em; }
      .mock-status-dot { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--muted); margin-top: 14px; }
      .mock-status-dot::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--accent2); flex-shrink: 0; }
      @media (max-width: 420px) { .mock-stats-row { grid-template-columns: 1fr; } }

      /* Banner de fechamento com foto de fundo — usado no fim de páginas como /individual */
      .hero-photo-bg { position: relative; min-height: clamp(420px, 52vh, 560px); height: auto; display: flex; align-items: center; overflow: clip; }
      .hero-photo-bg-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 30%; }
      .hero-photo-bg-overlay {
        position: absolute; inset: 0;
        background: linear-gradient(90deg, rgba(21,15,46,.72) 0%, rgba(21,15,46,.5) 42%, rgba(21,15,46,.14) 68%, rgba(21,15,46,0) 100%);
      }
      .hero-photo-bg-content {
        position: relative; z-index: 1; max-width: 620px; flex-shrink: 0;
        padding: clamp(40px,6vw,64px) 24px clamp(40px,6vw,64px) max(24px, calc((100vw - 1180px) / 2));
      }
      .hero-photo-bg-content .tag { background: rgba(255,255,255,.14); color: #fff; }
      @media (max-width: 720px) {
        .hero-photo-bg { min-height: 480px; height: auto; }
        .hero-photo-bg-overlay { background: linear-gradient(180deg, rgba(21,15,46,.35) 0%, rgba(21,15,46,.78) 62%, rgba(21,15,46,.9) 100%); }
        .hero-photo-bg-content { padding-top: clamp(160px,36vw,220px); padding-bottom: 32px; max-width: 100%; }
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
      .footer-bottom { border-top: 1px solid rgba(255,255,255,.12); padding: 22px 0; }
      .footer-bottom-inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 24px; }

      .page-head { padding: clamp(56px,7vw,88px) 0 clamp(24px,3vw,40px); background: var(--surface); }

      /* "Para quem é" — duas personas (individual / clínica) lado a lado */
      .persona-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      @media (max-width: 760px) { .persona-grid { grid-template-columns: 1fr; } }
      .persona-card {
        position: relative; border-radius: 28px; overflow: hidden; min-height: 420px;
        display: flex; align-items: flex-end; text-decoration: none;
      }
      .persona-card-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
      .persona-card-overlay {
        position: absolute; inset: 0;
        background: linear-gradient(180deg, rgba(18,12,46,0) 30%, rgba(18,12,46,.86) 100%);
      }
      .persona-card-tag {
        position: absolute; top: 18px; left: 18px; z-index: 1;
        background: rgba(255,255,255,.92); backdrop-filter: blur(6px);
        border-radius: 14px; padding: 8px 14px;
      }
      .persona-card-tag strong { display: block; font-size: 12.5px; font-weight: 800; color: var(--text); }
      .persona-card-tag span { font-size: 11px; color: var(--muted); }
      .persona-card-content { position: relative; z-index: 1; padding: 32px; color: #fff; }
      .persona-card-content h3 { font-size: clamp(20px,2.4vw,26px); font-weight: 800; letter-spacing: -0.02em; margin-bottom: 10px; }
      .persona-card-content p { font-size: 14px; line-height: 1.65; color: rgba(255,255,255,.78); max-width: 340px; margin-bottom: 20px; }
      .persona-card-cta {
        display: inline-flex; align-items: center; gap: 7px;
        background: #fff; color: var(--ink); font-weight: 700; font-size: 14px;
        padding: 11px 20px; border-radius: 999px; transition: transform .15s, box-shadow .15s;
      }
      .persona-card:hover .persona-card-cta { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(0,0,0,.25); }

      /* Recursos — tabs horizontais + preview de produto ao lado */
      .res-tabs { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-bottom: 40px; }
      .res-tab {
        display: inline-flex; align-items: center; gap: 9px; cursor: pointer;
        background: #fff; border: 1.5px solid var(--border); border-radius: 999px;
        padding: 11px 18px 11px 14px; font-family: 'Inter',sans-serif;
        transition: border-color .15s, background .15s, box-shadow .15s;
      }
      .res-tab-icon {
        width: 26px; height: 26px; border-radius: 9px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        background: var(--accent-soft); color: var(--accent);
      }
      .res-tab-title { font-size: 13.5px; font-weight: 700; color: var(--text); }
      .res-tab-sub { font-size: 11px; color: var(--muted); display: block; }
      .res-tab.active { border-color: var(--ink); background: var(--ink); box-shadow: 0 10px 26px rgba(18,12,46,.22); }
      .res-tab.active .res-tab-icon { background: rgba(255,255,255,.14); color: #fff; }
      .res-tab.active .res-tab-title { color: #fff; }
      .res-tab.active .res-tab-sub { color: rgba(255,255,255,.65); }

      .res-panel { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 0; border: 1px solid var(--border); border-radius: 28px; overflow: hidden; background: #fff; }
      @media (max-width: 860px) { .res-panel { grid-template-columns: 1fr; } }
      .res-panel-visual { position: relative; background: var(--surface); padding: clamp(24px,3vw,40px); display: flex; align-items: center; }
      .res-panel-visual img { width: 100%; border-radius: 16px; box-shadow: 0 20px 50px rgba(18,12,46,.14); }
      .res-panel-info { padding: clamp(28px,3.5vw,44px); display: flex; flex-direction: column; justify-content: center; gap: 18px; }
      .res-panel-info h3 { font-size: clamp(20px,2.4vw,26px); font-weight: 800; letter-spacing: -0.02em; }
      .res-panel-info p { font-size: 15px; line-height: 1.7; color: var(--muted); }
      .res-panel-list { display: flex; flex-direction: column; gap: 12px; }
      .res-panel-list-item { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: var(--text); }
      .res-panel-list-item svg { color: var(--accent2); flex-shrink: 0; margin-top: 2px; }

      /* Segurança — grid de itens com ícone */
      .security-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
      @media (max-width: 760px) { .security-grid { grid-template-columns: repeat(2, 1fr); } }
      @media (max-width: 480px) { .security-grid { grid-template-columns: 1fr; } }
      .security-item { display: flex; align-items: flex-start; gap: 13px; padding: 20px; border-radius: 18px; background: #fff; border: 1px solid var(--border); }
      .security-item-icon { width: 38px; height: 38px; border-radius: 11px; background: var(--accent-soft); color: var(--accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .security-item h4 { font-size: 14px; font-weight: 700; margin-bottom: 3px; }
      .security-item p { font-size: 12.5px; color: var(--muted); line-height: 1.5; }

      /* FAQ — accordion simples */
      .faq-list { display: flex; flex-direction: column; }
      .faq-item { border-bottom: 1px solid var(--border); padding: 22px 0; cursor: pointer; }
      .faq-item:first-child { border-top: 1px solid var(--border); }
      .faq-q { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
      .faq-q h4 { font-size: 15.5px; font-weight: 700; letter-spacing: -0.01em; }
      .faq-q-icon {
        width: 30px; height: 30px; border-radius: 999px; flex-shrink: 0;
        border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: center;
        color: var(--muted); transition: transform .2s, background .2s, color .2s, border-color .2s;
      }
      .faq-item.open .faq-q-icon { background: var(--ink); border-color: var(--ink); color: #fff; transform: rotate(45deg); }
      .faq-a { font-size: 14px; line-height: 1.7; color: var(--muted); max-width: 640px; overflow: hidden; max-height: 0; transition: max-height .3s ease, margin-top .3s ease; }
      .faq-item.open .faq-a { max-height: 240px; margin-top: 14px; }
    `}</style>

    <PublicNavbar />
    {children}
    <PublicFooter />
  </div>
);
