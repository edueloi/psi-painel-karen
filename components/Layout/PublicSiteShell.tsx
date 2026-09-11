import React from 'react';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';

export const PublicSiteShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: '#fff', color: '#150F2E', minHeight: '100vh', overflowX: 'clip' }}>
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
        background: linear-gradient(135deg, var(--surface2) 0%, #E4F8EE 100%);
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
        background: linear-gradient(135deg, var(--ink) 0%, #2A1F6B 100%);
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
        background: linear-gradient(90deg, var(--accent) 0%, #A78BFA 100%);
        -webkit-background-clip: text; background-clip: text; color: transparent;
      }

      .hero-bg {
        background-color: #fff;
        background-image:
          radial-gradient(circle at 15% 20%, rgba(109,66,245,.10) 0%, transparent 45%),
          radial-gradient(circle at 85% 15%, rgba(18,183,106,.08) 0%, transparent 40%);
      }

      .hero-bg::before {
        content: ''; position: absolute; inset: 0; pointer-events: none; opacity: .5;
        background-image: linear-gradient(rgba(109,66,245,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(109,66,245,.05) 1px, transparent 1px);
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
      .site-proof-value { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 800; color: var(--text); line-height: 1.15; }
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
      .journey-card::after { counter-increment: journey; content: '0' counter(journey); position: absolute; top: 14px; right: 18px; font: 800 36px/1 'Plus Jakarta Sans', sans-serif; color: var(--accent-soft); }
      .journey-card p { font-size: 13px; line-height: 1.7; color: var(--muted); max-width: 260px; }
      @media (max-width: 720px) { .journey-grid { grid-template-columns: 1fr; } }

      /* Floating collage cards (hero visual) */
      .float-stack { position: relative; min-height: 360px; isolation: isolate; }
      .float-card {
        position: absolute; background: #fff; border: 1px solid var(--border); border-radius: 20px;
        box-shadow: 0 20px 50px rgba(18,12,46,.14); padding: 18px 20px;
      }
      .float-stack::after { content: ''; position: absolute; width: 110px; height: 110px; border: 18px solid rgba(109,66,245,.14); border-radius: 50%; right: -28px; bottom: 7px; z-index: -1; }
      @media (max-width: 480px) {
        .float-stack { min-height: 320px; margin: 0 -4px; }
        .float-card { padding: 14px; border-radius: 16px; }
      }

      /* Hero da Home — imagem full-bleed em toda a dobra + produto em destaque */
      .hero-home {
        position: relative;
        overflow: clip;
        min-height: clamp(640px, 82vh, 820px);
        display: flex;
        align-items: center;
        isolation: isolate;
        border-bottom: 1px solid rgba(255,255,255,.12);
        background: var(--ink);
      }

      .hero-home-bg {
        position: absolute;
        inset: 0;
        z-index: -5;
        overflow: hidden;
      }
      .hero-home-bg-img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
        object-position: 62% 35%;
        transform: scale(1.01);
      }

      /* Gradiente estilo PsicoManager: protege a leitura sem esconder a fotografia */
      .hero-home-overlay {
        position: absolute;
        inset: 0;
        z-index: -4;
        background:
          linear-gradient(90deg,
            rgba(13,8,38,.94) 0%,
            rgba(13,8,38,.89) 25%,
            rgba(13,8,38,.67) 43%,
            rgba(13,8,38,.28) 64%,
            rgba(13,8,38,.08) 100%),
          linear-gradient(180deg, rgba(15,10,40,.08) 0%, rgba(15,10,40,.22) 100%);
      }
      .hero-home::after {
        content: '';
        position: absolute;
        inset: auto 0 0 0;
        height: 170px;
        z-index: -3;
        pointer-events: none;
        background: linear-gradient(180deg, transparent 0%, rgba(12,8,34,.16) 100%);
      }

      .hero-home-glow {
        position: absolute;
        border-radius: 999px;
        pointer-events: none;
        filter: blur(25px);
        z-index: -2;
      }
      .hero-home-glow-a {
        width: 360px;
        height: 360px;
        right: 24%;
        top: 8%;
        background: rgba(109,66,245,.16);
      }
      .hero-home-glow-b {
        width: 280px;
        height: 280px;
        right: 2%;
        bottom: 2%;
        background: rgba(18,183,106,.08);
      }

      .hero-home-grid {
        width: 100%;
        min-height: inherit;
        display: grid;
        grid-template-columns: minmax(0,.92fr) minmax(520px,1.08fr);
        gap: clamp(32px,5vw,76px);
        align-items: center;
        position: relative;
        z-index: 1;
        padding-top: clamp(62px,7vw,92px);
        padding-bottom: clamp(58px,7vw,88px);
      }

      .hero-home-copy {
        max-width: 590px;
        position: relative;
        z-index: 4;
        color: #fff;
        text-shadow: 0 2px 18px rgba(12,8,34,.12);
      }
      .hero-home-tag {
        margin-bottom: 20px;
        color: #fff;
        background: rgba(255,255,255,.12);
        border: 1px solid rgba(255,255,255,.18);
        backdrop-filter: blur(12px);
        box-shadow: 0 10px 30px rgba(12,8,34,.12);
      }
      .hero-home-title {
        max-width: 690px;
        margin: 0 0 20px;
        color: #fff;
        font-size: clamp(44px,5.2vw,72px);
        line-height: .98;
        letter-spacing: -.058em;
        font-weight: 800;
        text-wrap: balance;
      }
      .hero-home .hero-accent {
        background: linear-gradient(90deg, #BBA6FF 0%, #E0D7FF 100%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .hero-home-subtitle {
        max-width: 585px;
        margin: 0 0 30px;
        color: rgba(255,255,255,.82);
        font-size: clamp(15.5px,1.35vw,18px);
        line-height: 1.72;
      }
      .hero-home-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 11px;
        align-items: center;
        margin-bottom: 14px;
      }
      .hero-home-primary {
        background: #fff;
        color: var(--ink);
        box-shadow: 0 16px 38px rgba(8,4,28,.25);
      }
      .hero-home-primary:hover {
        background: #F3EEFF;
        color: var(--ink);
        box-shadow: 0 18px 42px rgba(8,4,28,.3);
      }
      .hero-home-secondary {
        background: rgba(255,255,255,.10);
        color: #fff;
        border-color: rgba(255,255,255,.30);
        backdrop-filter: blur(12px);
      }
      .hero-home-secondary:hover {
        border-color: rgba(255,255,255,.65);
        background: rgba(255,255,255,.16);
        box-shadow: 0 8px 24px rgba(8,4,28,.15);
      }
      .hero-home-note {
        margin: 0 0 17px;
        color: rgba(255,255,255,.64);
        font-size: 12.5px;
      }
      .hero-home-benefits {
        display: flex;
        flex-wrap: wrap;
        gap: 9px 20px;
        color: rgba(255,255,255,.76);
        font-size: 12.5px;
      }
      .hero-home-benefits span { display: inline-flex; align-items: center; gap: 6px; }
      .hero-home-benefits svg { color: #55D89B; flex-shrink: 0; }

      /* Visual do sistema sobre a fotografia — sem outra foto/card competindo com o fundo */
      .hero-home-visual {
        position: relative;
        min-height: 540px;
        isolation: isolate;
      }
      .hero-home-visual::before {
        content: '';
        position: absolute;
        width: 520px;
        height: 520px;
        right: -5%;
        top: 4%;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(151,121,255,.22), rgba(109,66,245,.06) 54%, transparent 72%);
        filter: blur(4px);
        z-index: -1;
      }

      .hero-product-card {
        position: absolute;
        right: 0;
        bottom: 24px;
        width: min(86%, 590px);
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.60);
        border-radius: 28px;
        background: rgba(255,255,255,.94);
        backdrop-filter: blur(20px);
        box-shadow:
          0 38px 95px rgba(7,3,28,.36),
          0 0 0 1px rgba(255,255,255,.16) inset;
        z-index: 3;
        transform: perspective(1200px) rotateY(-2deg) rotateX(1deg);
      }
      .hero-product-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 15px 18px;
        border-bottom: 1px solid var(--border);
        background: rgba(248,246,255,.86);
      }
      .hero-product-brand { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 12px; color: var(--ink); }
      .hero-product-brand img { width: 24px; height: 24px; object-fit: contain; }
      .hero-product-status { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; color: var(--muted); font-weight: 700; }
      .hero-product-status i { width: 6px; height: 6px; border-radius: 50%; background: var(--accent2); box-shadow: 0 0 0 4px rgba(18,183,106,.10); }
      .hero-product-body { display: grid; grid-template-columns: 118px 1fr; min-height: 270px; }
      .hero-product-sidebar { padding: 16px 10px; background: #FBFAFF; border-right: 1px solid var(--border); display: flex; flex-direction: column; gap: 6px; }
      .hero-product-sidebar span {
        display: flex; align-items: center; gap: 7px;
        color: var(--muted); font-size: 10px; font-weight: 600;
        padding: 8px 9px; border-radius: 9px;
      }
      .hero-product-sidebar span.active { background: var(--accent-soft); color: var(--accent); }
      .hero-product-main { padding: 18px 20px; }
      .hero-product-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 11px; color: var(--accent); }
      .hero-product-heading span { display: block; font-size: 9px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
      .hero-product-heading strong { display: block; margin-top: 2px; font-size: 15px; color: var(--ink); }
      .hero-appointment {
        display: grid; grid-template-columns: 48px 1fr auto; gap: 9px; align-items: center;
        padding: 11px 0; border-top: 1px solid var(--border);
      }
      .hero-appointment time { font-size: 10px; font-weight: 800; color: var(--ink); }
      .hero-appointment div strong { display: block; font-size: 10.5px; color: var(--text); }
      .hero-appointment div span { display: block; margin-top: 2px; font-size: 9px; color: var(--muted); }
      .hero-appointment em {
        font-style: normal; font-size: 8.5px; font-weight: 700;
        color: #0D9155; background: #E4F8EE; border-radius: 999px; padding: 4px 7px;
      }
      .hero-appointment.muted em { color: var(--muted); background: var(--surface2); }

      .hero-float-card {
        position: absolute;
        z-index: 5;
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 200px;
        padding: 12px 14px;
        border: 1px solid rgba(255,255,255,.62);
        border-radius: 16px;
        background: rgba(255,255,255,.94);
        backdrop-filter: blur(16px);
        box-shadow: 0 18px 48px rgba(7,3,28,.24);
      }
      .hero-float-card strong { display: block; font-size: 11px; color: var(--ink); }
      .hero-float-card small { display: block; margin-top: 2px; font-size: 9px; color: var(--muted); white-space: nowrap; }
      .hero-float-icon {
        width: 32px; height: 32px; border-radius: 10px;
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        color: var(--accent); background: var(--accent-soft);
      }
      .hero-float-icon.green { color: #0D9155; background: #E4F8EE; }
      .hero-float-ai { left: 2%; top: 56px; animation: hero-float 5.5s ease-in-out infinite; }
      .hero-float-reminder { right: -4px; bottom: 78px; animation: hero-float 6.3s ease-in-out infinite reverse; }
      @keyframes hero-float {
        0%,100% { transform: translateY(0); }
        50% { transform: translateY(-7px); }
      }

      @media (max-width: 1040px) {
        .hero-home-grid { grid-template-columns: minmax(0,.98fr) minmax(430px,1.02fr); gap: 26px; }
        .hero-product-card { width: 94%; }
        .hero-float-ai { left: -6px; }
      }

      @media (max-width: 860px) {
        .hero-home { min-height: auto; }
        .hero-home-bg-img { object-position: 66% center; }
        .hero-home-overlay {
          background:
            linear-gradient(180deg, rgba(13,8,38,.88) 0%, rgba(13,8,38,.78) 52%, rgba(13,8,38,.88) 100%),
            linear-gradient(90deg, rgba(13,8,38,.45), rgba(13,8,38,.20));
        }
        .hero-home-grid {
          min-height: auto;
          grid-template-columns: 1fr;
          padding-top: 54px;
          padding-bottom: 58px;
        }
        .hero-home-copy { max-width: 650px; }
        .hero-home-title { max-width: 640px; }
        .hero-home-visual { min-height: 410px; margin-top: 10px; }
        .hero-product-card { left: 0; right: auto; width: min(86%, 560px); bottom: 8px; }
        .hero-float-ai { left: auto; right: 12px; top: 8px; }
        .hero-float-reminder { right: 0; bottom: 46px; }
      }

      @media (max-width: 620px) {
        .hero-home-bg-img { object-position: 70% center; }
        .hero-home-grid { padding-top: 42px; padding-bottom: 48px; }
        .hero-home-title { font-size: clamp(40px,12vw,54px); }
        .hero-home-subtitle { font-size: 15px; line-height: 1.62; }
        .hero-home-actions { align-items: stretch; }
        .hero-home-actions .btn-p,
        .hero-home-actions .btn-g { justify-content: center; width: 100%; }
        .hero-home-benefits { gap: 8px 14px; }
        .hero-home-visual { min-height: 355px; }
        .hero-product-card { width: 100%; bottom: 0; transform: none; }
        .hero-product-body { grid-template-columns: 90px 1fr; min-height: 225px; }
        .hero-product-sidebar { padding: 12px 7px; }
        .hero-product-sidebar span { font-size: 9px; padding: 7px; }
        .hero-product-main { padding: 14px 13px; }
        .hero-appointment { grid-template-columns: 40px 1fr; gap: 7px; }
        .hero-appointment em { display: none; }
        .hero-float-card { min-width: 0; padding: 10px 11px; }
        .hero-float-card small { white-space: normal; }
        .hero-float-ai { top: -4px; right: 0; }
        .hero-float-reminder { display: none; }
      }

      @media (max-width: 420px) {
        .hero-home-tag { font-size: 10px; letter-spacing: .045em; }
        .hero-home-title { letter-spacing: -.05em; }
        .hero-home-benefits { font-size: 11.5px; }
        .hero-product-card { border-radius: 20px; }
      }

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
        font-family: 'Plus Jakarta Sans', sans-serif; font-size: clamp(40px,5vw,64px); font-weight: 800;
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
        color: #0D9155; background: #E4F8EE; padding: 3px 9px; border-radius: 999px; white-space: nowrap;
      }
      .mock-quote { font-size: 12.5px; font-style: italic; color: rgba(255,255,255,.75); background: rgba(255,255,255,.05); border-radius: 12px; padding: 10px 12px; margin-bottom: 12px; line-height: 1.6; }
      .mock-list-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
      .mock-list-icon { width: 26px; height: 26px; border-radius: 8px; background: rgba(127,212,247,.14); color: #7FD4F7; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .mock-list-item strong { display: block; font-size: 12.5px; font-weight: 700; color: #fff; }
      .mock-list-item span { font-size: 11px; color: rgba(255,255,255,.5); }
      .mock-insight { display: flex; align-items: flex-start; gap: 6px; font-size: 11.5px; color: #7FD4F7; background: rgba(127,212,247,.08); border-radius: 10px; padding: 10px 12px; margin-top: 10px; line-height: 1.6; }
      .mock-bars { display: flex; align-items: flex-end; gap: 6px; height: 56px; margin-top: 14px; }
      .mock-bars span { flex: 1; background: linear-gradient(180deg, var(--accent) 0%, #A78BFA 100%); border-radius: 4px; }
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
      /* ═══════════════════════════════════════════════════════════════
         FOOTER PREMIUM — substitua o bloco atual do footer por este
         ═══════════════════════════════════════════════════════════════ */
      
      .footer-dark {
        background:
          radial-gradient(circle at 18% 8%, rgba(109,66,245,.22), transparent 34%),
          radial-gradient(circle at 92% 18%, rgba(76,201,240,.08), transparent 26%),
          linear-gradient(135deg, #0B0723 0%, #120C2E 48%, #1D1550 100%);
        color: rgba(255,255,255,.72);
      }
      
      .footer-premium {
        position: relative;
        overflow: hidden;
        padding: clamp(64px,7vw,92px) 0 0;
        border-top: 1px solid rgba(255,255,255,.08);
      }
      
      .footer-premium::before {
        content: '';
        position: absolute;
        top: 0;
        left: 50%;
        width: min(1180px, calc(100% - 48px));
        height: 1px;
        transform: translateX(-50%);
        background: linear-gradient(
          90deg,
          transparent,
          rgba(167,139,250,.65),
          rgba(255,255,255,.16),
          transparent
        );
      }
      
      .footer-premium-glow {
        position: absolute;
        border-radius: 999px;
        pointer-events: none;
        filter: blur(70px);
        opacity: .55;
      }
      
      .footer-premium-glow-a {
        width: 360px;
        height: 360px;
        left: -130px;
        top: -160px;
        background: rgba(109,66,245,.20);
      }
      
      .footer-premium-glow-b {
        width: 300px;
        height: 300px;
        right: -110px;
        bottom: -140px;
        background: rgba(18,183,106,.08);
      }
      
      .footer-premium-inner {
        position: relative;
        z-index: 1;
      }
      
      .footer-premium-top {
        display: grid;
        grid-template-columns: minmax(280px, 1.1fr) minmax(420px, .9fr);
        gap: clamp(56px,8vw,110px);
        align-items: start;
      }
      
      .footer-brand {
        max-width: 410px;
      }
      
      .footer-brand-copy {
        max-width: 390px;
        margin-top: 20px;
        color: rgba(255,255,255,.60);
        font-size: 15px;
        line-height: 1.75;
      }
      
      .footer-brand-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 20px;
      }
      
      .footer-brand-badges span {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 8px 11px;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 999px;
        background: rgba(255,255,255,.055);
        color: rgba(255,255,255,.70);
        font-size: 11.5px;
        font-weight: 600;
        backdrop-filter: blur(10px);
      }
      
      .footer-brand-badges svg {
        color: #55D89B;
      }
      
      .footer-main-cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        margin-top: 24px;
        padding: 12px 20px;
        border: 0;
        border-radius: 999px;
        background: #fff;
        color: var(--ink);
        font-family: 'Plus Jakarta Sans','Inter',sans-serif;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 14px 34px rgba(0,0,0,.18);
        transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
      }
      
      .footer-main-cta:hover {
        transform: translateY(-2px);
        background: #F3EEFF;
        box-shadow: 0 18px 42px rgba(0,0,0,.24);
      }
      
      .footer-main-cta svg {
        transition: transform .18s ease;
      }
      
      .footer-main-cta:hover svg {
        transform: translateX(3px);
      }
      
      .footer-nav {
        display: grid;
        grid-template-columns: repeat(3, minmax(120px,1fr));
        gap: clamp(28px,4vw,48px);
      }
      
      .footer-nav-col {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      
      .footer-nav-title {
        margin-bottom: 4px;
        color: rgba(255,255,255,.34);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .13em;
        text-transform: uppercase;
      }
      
      .footer-nav-col a,
      .footer-nav-col button {
        position: relative;
        padding: 0;
        border: 0;
        background: none;
        color: rgba(255,255,255,.66);
        font: inherit;
        font-size: 13.5px;
        text-decoration: none;
        cursor: pointer;
        transition: color .16s ease, transform .16s ease;
      }
      
      .footer-nav-col a:hover,
      .footer-nav-col button:hover {
        color: #fff;
        transform: translateX(3px);
      }
      
      .footer-highlight {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-top: clamp(44px,6vw,70px);
        padding: 18px 20px;
        border: 1px solid rgba(255,255,255,.09);
        border-radius: 18px;
        background: linear-gradient(
          90deg,
          rgba(255,255,255,.065),
          rgba(255,255,255,.025)
        );
        backdrop-filter: blur(12px);
      }
      
      .footer-highlight-icon {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        color: #BBA6FF;
        background: rgba(167,139,250,.13);
        border: 1px solid rgba(187,166,255,.18);
      }
      
      .footer-highlight strong {
        display: block;
        color: #fff;
        font-size: 13px;
        font-weight: 800;
      }
      
      .footer-highlight span {
        display: block;
        margin-top: 3px;
        color: rgba(255,255,255,.47);
        font-size: 12px;
        line-height: 1.5;
      }
      
      .footer-premium-bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px 28px;
        margin-top: 26px;
        padding: 22px 0 26px;
        border-top: 1px solid rgba(255,255,255,.08);
      }
      
      .footer-premium-bottom p,
      .footer-made-with-care {
        color: rgba(255,255,255,.38);
        font-size: 11.5px;
      }
      
      .footer-made-with-care {
        display: inline-flex;
        align-items: center;
        gap: 7px;
      }
      
      .footer-made-with-care svg {
        color: #A78BFA;
      }
      
      .footer-dark a {
        color: rgba(255,255,255,.66);
      }
      
      .footer-dark a:hover {
        color: #fff;
      }
      
      @media (max-width: 860px) {
        .footer-premium-top {
          grid-template-columns: 1fr;
          gap: 46px;
        }
      
        .footer-brand {
          max-width: 520px;
        }
      
        .footer-nav {
          max-width: 650px;
        }
      }
      
      @media (max-width: 640px) {
        .footer-premium {
          padding-top: 54px;
        }
      
        .footer-nav {
          grid-template-columns: 1fr 1fr;
          gap: 30px 26px;
        }
      
        .footer-nav-col:last-child {
          grid-column: 1 / -1;
        }
      
        .footer-highlight {
          align-items: flex-start;
        }
      
        .footer-premium-bottom {
          flex-direction: column;
          align-items: flex-start;
        }
      }
      
      @media (max-width: 420px) {
        .footer-nav {
          grid-template-columns: 1fr;
        }
      
        .footer-nav-col:last-child {
          grid-column: auto;
        }
      
        .footer-main-cta {
          width: 100%;
        }
      
        .footer-brand-badges {
          gap: 7px;
        }
      }
      

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
        padding: 11px 18px 11px 14px; font-family: 'Plus Jakarta Sans','Inter',sans-serif;
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

      /* ═══════════════════════════════════════════════════════════════
         HOME REDESIGN — seções comerciais da página inicial
         ═══════════════════════════════════════════════════════════════ */

      .home-section {
        position: relative;
        padding: clamp(78px,8vw,118px) 0;
      }

      .home-section-head {
        max-width: 760px;
        margin: 0 auto clamp(42px,5vw,64px);
        text-align: center;
      }

      .home-section-head-left {
        max-width: 720px;
        margin-left: 0;
        text-align: left;
      }

      .home-section-head .tag,
      .home-section-head-left .tag {
        margin-bottom: 18px;
      }

      .home-section-head h2,
      .home-professions-copy h2,
      .home-security-copy h2,
      .home-faq-copy h2,
      .home-final-copy h2 {
        font-family: 'Plus Jakarta Sans','Inter',sans-serif;
        font-size: clamp(30px,4vw,48px);
        line-height: 1.08;
        letter-spacing: -.045em;
        font-weight: 800;
      }

      .home-section-head p,
      .home-professions-copy > p,
      .home-faq-copy > p {
        max-width: 620px;
        margin: 16px auto 0;
        font-size: 16px;
        line-height: 1.75;
        color: var(--muted);
      }

      .home-section-head-left p {
        margin-left: 0;
      }

      /* Público */
      .home-audience {
        background: #fff;
      }

      .home-audience-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 22px;
      }

      .home-audience-card {
        position: relative;
        overflow: hidden;
        min-height: 520px;
        padding: clamp(28px,3.2vw,42px);
        border: 1px solid var(--border);
        border-radius: 30px;
        background: #fff;
        box-shadow: 0 20px 60px rgba(18,12,46,.07);
      }

      .home-audience-card::after {
        content: '';
        position: absolute;
        width: 270px;
        height: 270px;
        right: -100px;
        top: -90px;
        border-radius: 50%;
        background: var(--accent-soft);
        filter: blur(5px);
        opacity: .8;
      }

      .home-audience-card-clinic {
        background:
          radial-gradient(circle at 100% 0%, rgba(109,66,245,.12), transparent 34%),
          linear-gradient(180deg, #FBFAFF 0%, #F6F3FF 100%);
      }

      .home-audience-card > * {
        position: relative;
        z-index: 1;
      }

      .home-audience-icon {
        width: 48px;
        height: 48px;
        display: grid;
        place-items: center;
        margin-bottom: 28px;
        border-radius: 15px;
        color: var(--accent);
        background: var(--accent-soft);
      }

      .home-audience-copy > span {
        display: block;
        margin-bottom: 8px;
        color: var(--accent);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .06em;
        text-transform: uppercase;
      }

      .home-audience-copy h3 {
        max-width: 470px;
        margin-bottom: 13px;
        font-size: clamp(23px,2.6vw,31px);
        line-height: 1.15;
        letter-spacing: -.035em;
        font-weight: 800;
      }

      .home-audience-copy p {
        max-width: 490px;
        color: var(--muted);
        font-size: 14.5px;
        line-height: 1.72;
      }

      .home-audience-mini-ui {
        margin-top: 30px;
        padding: 18px;
        border: 1px solid var(--border);
        border-radius: 20px;
        background: rgba(255,255,255,.88);
        box-shadow: 0 18px 46px rgba(18,12,46,.08);
      }

      .home-mini-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--border);
      }

      .home-mini-top span {
        color: var(--muted);
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: .08em;
      }

      .home-mini-top strong {
        font-size: 12px;
      }

      .home-mini-row {
        display: grid;
        grid-template-columns: 8px 1fr auto;
        gap: 11px;
        align-items: center;
        padding: 13px 0;
        border-bottom: 1px solid var(--border);
      }

      .home-mini-row:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }

      .home-mini-row > i {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--accent);
      }

      .home-mini-row div strong,
      .home-mini-row div span {
        display: block;
      }

      .home-mini-row div strong {
        font-size: 12px;
      }

      .home-mini-row div span {
        margin-top: 2px;
        color: var(--muted);
        font-size: 11px;
      }

      .home-mini-row svg {
        color: var(--accent2);
      }

      .home-clinic-grid {
        display: grid;
        grid-template-columns: repeat(3,1fr);
        gap: 10px;
        margin-top: 30px;
      }

      .home-clinic-grid > div {
        min-height: 115px;
        padding: 16px;
        border: 1px solid rgba(109,66,245,.12);
        border-radius: 18px;
        background: rgba(255,255,255,.72);
      }

      .home-clinic-grid svg {
        color: var(--accent);
      }

      .home-clinic-grid strong,
      .home-clinic-grid span {
        display: block;
      }

      .home-clinic-grid strong {
        margin-top: 14px;
        font-size: 12px;
      }

      .home-clinic-grid span {
        margin-top: 4px;
        color: var(--muted);
        font-size: 10.5px;
        line-height: 1.4;
      }

      .home-text-link {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        margin-top: 26px;
        padding: 0;
        border: 0;
        background: none;
        color: var(--ink);
        font: inherit;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
      }

      .home-text-link svg,
      .home-inline-link svg {
        transition: transform .18s ease;
      }

      .home-text-link:hover svg,
      .home-inline-link:hover svg {
        transform: translateX(4px);
      }

      /* Profissões */
      .home-professions {
        overflow: hidden;
        background:
          radial-gradient(circle at 10% 10%, rgba(109,66,245,.08), transparent 30%),
          var(--surface);
      }

      .home-professions-layout {
        display: grid;
        grid-template-columns: minmax(280px,.78fr) minmax(0,1.22fr);
        gap: clamp(50px,7vw,92px);
        align-items: start;
      }

      .home-professions-copy {
        position: sticky;
        top: 110px;
      }

      .home-professions-copy .tag {
        margin-bottom: 20px;
      }

      .home-professions-copy > p {
        margin-left: 0;
      }

      .home-inline-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 24px;
        color: var(--accent);
        font-size: 13px;
        font-weight: 800;
        text-decoration: none;
      }

      .home-profession-stack {
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 28px;
        background: rgba(255,255,255,.88);
        box-shadow: 0 20px 60px rgba(18,12,46,.06);
      }

      .home-profession-row {
        display: grid;
        grid-template-columns: 44px 1fr auto;
        gap: 15px;
        align-items: center;
        padding: 20px 22px;
      }

      .home-profession-row + .home-profession-row {
        border-top: 1px solid var(--border);
      }

      .home-profession-row-icon {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border-radius: 13px;
      }

      .home-profession-row-main strong,
      .home-profession-row-main span {
        display: block;
      }

      .home-profession-row-main strong {
        font-size: 14px;
        font-weight: 800;
      }

      .home-profession-row-main span {
        margin-top: 4px;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.6;
      }

      .home-profession-row > small {
        padding: 6px 9px;
        border-radius: 999px;
        background: var(--surface);
        color: var(--muted);
        font-size: 10px;
        font-weight: 700;
        white-space: nowrap;
      }

      /* Recursos */
      .home-features {
        overflow: hidden;
        background: #fff;
      }

      .home-feature-glow {
        position: absolute;
        width: 520px;
        height: 520px;
        right: -170px;
        top: 80px;
        border-radius: 50%;
        background: rgba(109,66,245,.08);
        filter: blur(70px);
        pointer-events: none;
      }

      .home-feature-shell {
        display: grid;
        grid-template-columns: 290px minmax(0,1fr);
        gap: 18px;
        padding: 18px;
        border: 1px solid var(--border);
        border-radius: 32px;
        background: #FAF9FF;
        box-shadow: 0 26px 80px rgba(18,12,46,.08);
      }

      .home-feature-tabs {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .home-feature-tab {
        width: 100%;
        display: grid;
        grid-template-columns: 40px 1fr auto;
        gap: 12px;
        align-items: center;
        padding: 13px 14px;
        border: 1px solid transparent;
        border-radius: 16px;
        background: transparent;
        text-align: left;
        cursor: pointer;
        transition: background .18s ease, border-color .18s ease, transform .18s ease;
      }

      .home-feature-tab:hover {
        background: #fff;
        border-color: var(--border);
      }

      .home-feature-tab.active {
        background: var(--ink);
        border-color: var(--ink);
        box-shadow: 0 14px 32px rgba(18,12,46,.18);
      }

      .home-feature-tab-icon {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        border-radius: 11px;
        color: var(--accent);
        background: var(--accent-soft);
      }

      .home-feature-tab.active .home-feature-tab-icon {
        color: #fff;
        background: rgba(255,255,255,.11);
      }

      .home-feature-tab-copy strong,
      .home-feature-tab-copy small {
        display: block;
      }

      .home-feature-tab-copy strong {
        color: var(--text);
        font-size: 13px;
        font-weight: 800;
      }

      .home-feature-tab-copy small {
        margin-top: 2px;
        color: var(--muted);
        font-size: 10.5px;
      }

      .home-feature-tab.active .home-feature-tab-copy strong {
        color: #fff;
      }

      .home-feature-tab.active .home-feature-tab-copy small {
        color: rgba(255,255,255,.55);
      }

      .home-feature-tab-arrow {
        color: var(--muted);
      }

      .home-feature-tab.active .home-feature-tab-arrow {
        color: rgba(255,255,255,.68);
      }

      .home-feature-panel {
        min-height: 540px;
        display: grid;
        grid-template-columns: .88fr 1.12fr;
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 24px;
        background: #fff;
      }

      .home-feature-panel-copy {
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: clamp(28px,3.6vw,48px);
      }

      .home-feature-panel-label {
        align-self: flex-start;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        margin-bottom: 18px;
        padding: 7px 11px;
        border-radius: 999px;
        color: var(--accent);
        background: var(--accent-soft);
        font-size: 11px;
        font-weight: 800;
      }

      .home-feature-panel-copy h3 {
        max-width: 460px;
        margin-bottom: 15px;
        font-size: clamp(26px,3vw,38px);
        line-height: 1.12;
        letter-spacing: -.04em;
        font-weight: 800;
      }

      .home-feature-panel-copy > p {
        max-width: 470px;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.75;
      }

      .home-feature-list {
        display: flex;
        flex-direction: column;
        gap: 11px;
        margin-top: 22px;
      }

      .home-feature-list > div {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        color: var(--text);
        font-size: 12.5px;
        line-height: 1.5;
      }

      .home-feature-list svg {
        margin-top: 1px;
        color: var(--accent2);
        flex-shrink: 0;
      }

      .home-feature-demo {
        position: relative;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: clamp(28px,4vw,50px);
        background:
          radial-gradient(circle at 75% 18%, rgba(109,66,245,.18), transparent 34%),
          linear-gradient(135deg, #F4F0FF 0%, #FBFAFF 52%, #EEF9F5 100%);
      }

      .home-feature-demo-window {
        width: min(100%,520px);
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.9);
        border-radius: 22px;
        background: #fff;
        box-shadow: 0 34px 80px rgba(18,12,46,.18);
        transform: perspective(1200px) rotateY(-3deg) rotateX(1deg);
      }

      .home-feature-demo-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 11px 13px;
        border-bottom: 1px solid var(--border);
        background: #FBFAFF;
      }

      .home-feature-demo-topbar > div {
        display: flex;
        gap: 5px;
      }

      .home-feature-demo-topbar i {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #DDD7EE;
      }

      .home-feature-demo-topbar span {
        color: var(--muted);
        font-size: 9px;
        font-weight: 700;
      }

      .home-feature-demo-body {
        display: grid;
        grid-template-columns: 58px 1fr;
        min-height: 320px;
      }

      .home-feature-demo-body aside {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 16px 9px;
        border-right: 1px solid var(--border);
        background: #FAF9FF;
      }

      .home-feature-demo-body aside img {
        width: 24px;
        height: 24px;
        object-fit: contain;
        margin-bottom: 6px;
      }

      .home-feature-demo-body aside span {
        width: 32px;
        height: 32px;
        display: grid;
        place-items: center;
        border-radius: 10px;
        color: var(--muted);
      }

      .home-feature-demo-body aside span.active {
        color: var(--accent);
        background: var(--accent-soft);
      }

      .home-feature-demo-body main {
        padding: 22px;
      }

      .home-feature-demo-heading span,
      .home-feature-demo-heading strong {
        display: block;
      }

      .home-feature-demo-heading span {
        color: var(--muted);
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: .08em;
      }

      .home-feature-demo-heading strong {
        margin-top: 3px;
        font-size: 17px;
      }

      .home-feature-demo-metrics {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 9px;
        margin-top: 18px;
      }

      .home-feature-demo-metrics > div {
        padding: 13px;
        border-radius: 13px;
        background: var(--surface);
      }

      .home-feature-demo-metrics span,
      .home-feature-demo-metrics strong {
        display: block;
      }

      .home-feature-demo-metrics span {
        color: var(--muted);
        font-size: 8.5px;
      }

      .home-feature-demo-metrics strong {
        margin-top: 3px;
        font-size: 11px;
      }

      .home-feature-demo-card {
        margin-top: 12px;
        padding: 14px;
        border: 1px solid var(--border);
        border-radius: 15px;
      }

      .home-feature-demo-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-bottom: 10px;
        color: var(--accent);
      }

      .home-feature-demo-card-title strong {
        color: var(--text);
        font-size: 10.5px;
      }

      .home-feature-demo-line {
        display: grid;
        grid-template-columns: 6px 1fr auto;
        gap: 8px;
        align-items: center;
        padding: 9px 0;
        border-top: 1px solid var(--border);
      }

      .home-feature-demo-line > span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--accent);
      }

      .home-feature-demo-line p {
        color: var(--muted);
        font-size: 8.5px;
        line-height: 1.35;
      }

      .home-feature-demo-line svg {
        color: var(--accent2);
      }

      .home-feature-float {
        position: absolute;
        right: 24px;
        bottom: 28px;
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 10px 13px;
        border: 1px solid rgba(255,255,255,.85);
        border-radius: 14px;
        background: rgba(255,255,255,.92);
        color: var(--accent);
        box-shadow: 0 18px 40px rgba(18,12,46,.14);
        backdrop-filter: blur(12px);
      }

      .home-feature-float strong,
      .home-feature-float span {
        display: block;
      }

      .home-feature-float strong {
        color: var(--ink);
        font-size: 10.5px;
      }

      .home-feature-float span {
        margin-top: 1px;
        color: var(--muted);
        font-size: 8.5px;
      }

      /* Fluxo */
      .home-flow {
        background: var(--surface);
      }

      .home-flow-grid {
        position: relative;
        display: grid;
        grid-template-columns: repeat(3,1fr);
        gap: 18px;
      }

      .home-flow-grid::before {
        content: '';
        position: absolute;
        left: 16%;
        right: 16%;
        top: 48px;
        height: 1px;
        background: linear-gradient(90deg, transparent, #D8D0F4, transparent);
      }

      .home-flow-card {
        position: relative;
        min-height: 280px;
        padding: 28px;
        border: 1px solid var(--border);
        border-radius: 24px;
        background: rgba(255,255,255,.85);
        box-shadow: 0 16px 50px rgba(18,12,46,.05);
      }

      .home-flow-number {
        position: absolute;
        top: 18px;
        right: 22px;
        color: #EEE9FF;
        font-family: 'Plus Jakarta Sans',sans-serif;
        font-size: 44px;
        font-weight: 800;
        line-height: 1;
      }

      .home-flow-icon {
        position: relative;
        z-index: 1;
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        margin-bottom: 45px;
        border-radius: 13px;
        color: var(--accent);
        background: var(--accent-soft);
      }

      .home-flow-card h3 {
        margin-bottom: 10px;
        font-size: 20px;
        font-weight: 800;
      }

      .home-flow-card p {
        color: var(--muted);
        font-size: 13px;
        line-height: 1.7;
      }

      /* Segurança */
      .home-security {
        position: relative;
        overflow: hidden;
        padding: clamp(84px,9vw,128px) 0;
        color: #fff;
        background:
          radial-gradient(circle at 85% 10%, rgba(109,66,245,.28), transparent 28%),
          radial-gradient(circle at 10% 100%, rgba(18,183,106,.08), transparent 30%),
          linear-gradient(135deg, #0C0825 0%, #151039 50%, #21165C 100%);
      }

      .home-security-grid {
        display: grid;
        grid-template-columns: minmax(0,.8fr) minmax(0,1.2fr);
        gap: clamp(48px,7vw,88px);
        align-items: center;
      }

      .home-security-kicker {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        margin-bottom: 20px;
        color: #8EE6BA;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .06em;
        text-transform: uppercase;
      }

      .home-security-copy h2 {
        max-width: 540px;
        color: #fff;
      }

      .home-security-copy > p {
        max-width: 520px;
        margin-top: 18px;
        color: rgba(255,255,255,.64);
        font-size: 15px;
        line-height: 1.75;
      }

      .home-security-link {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        margin-top: 26px;
        color: #fff;
        font-size: 13px;
        font-weight: 800;
        text-decoration: none;
      }

      .home-security-cards {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .home-security-card {
        min-height: 155px;
        display: flex;
        align-items: flex-start;
        gap: 13px;
        padding: 20px;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 18px;
        background: rgba(255,255,255,.055);
        backdrop-filter: blur(12px);
      }

      .home-security-card > span {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        border-radius: 11px;
        color: #BCA9FF;
        background: rgba(188,169,255,.10);
      }

      .home-security-card strong {
        display: block;
        margin-top: 2px;
        color: #fff;
        font-size: 13px;
      }

      .home-security-card p {
        margin-top: 7px;
        color: rgba(255,255,255,.52);
        font-size: 11.5px;
        line-height: 1.6;
      }

      /* FAQ */
      .home-faq {
        background: #fff;
      }

      .home-faq-grid {
        display: grid;
        grid-template-columns: minmax(250px,.72fr) minmax(0,1.28fr);
        gap: clamp(50px,7vw,90px);
        align-items: start;
      }

      .home-faq-copy {
        position: sticky;
        top: 110px;
      }

      .home-faq-copy .tag {
        margin-bottom: 20px;
      }

      .home-faq-copy > p {
        margin-left: 0;
      }

      .home-faq-list {
        overflow: hidden;
        border-top: 1px solid var(--border);
      }

      .home-faq-item {
        width: 100%;
        display: block;
        padding: 23px 2px;
        border: 0;
        border-bottom: 1px solid var(--border);
        background: transparent;
        text-align: left;
        cursor: pointer;
      }

      .home-faq-question {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
      }

      .home-faq-question > strong {
        color: var(--text);
        font-family: 'Plus Jakarta Sans','Inter',sans-serif;
        font-size: 15px;
        font-weight: 800;
      }

      .home-faq-plus {
        width: 32px;
        height: 32px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        border: 1px solid var(--border);
        border-radius: 50%;
        color: var(--muted);
        transition: transform .2s ease, background .2s ease, color .2s ease;
      }

      .home-faq-item.open .home-faq-plus {
        transform: rotate(45deg);
        color: #fff;
        background: var(--ink);
        border-color: var(--ink);
      }

      .home-faq-answer {
        display: block;
        max-width: 640px;
        max-height: 0;
        overflow: hidden;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.75;
        opacity: 0;
        transition: max-height .28s ease, opacity .28s ease, padding-top .28s ease;
      }

      .home-faq-item.open .home-faq-answer {
        max-height: 220px;
        padding-top: 13px;
        opacity: 1;
      }

      /* CTA final */
      .home-final {
        position: relative;
        overflow: hidden;
        padding: clamp(72px,8vw,108px) 0;
        background:
          radial-gradient(circle at 15% 20%, rgba(109,66,245,.10), transparent 30%),
          linear-gradient(180deg, #F9F7FF 0%, #F3EFFF 100%);
      }

      .home-final-glow {
        position: absolute;
        border-radius: 50%;
        filter: blur(70px);
        pointer-events: none;
      }

      .home-final-glow-a {
        width: 320px;
        height: 320px;
        left: -120px;
        top: -80px;
        background: rgba(109,66,245,.16);
      }

      .home-final-glow-b {
        width: 280px;
        height: 280px;
        right: -90px;
        bottom: -80px;
        background: rgba(18,183,106,.10);
      }

      .home-final-card {
        position: relative;
        overflow: hidden;
        display: grid;
        grid-template-columns: 1.08fr .92fr;
        gap: clamp(36px,5vw,64px);
        align-items: center;
        padding: clamp(38px,5vw,68px);
        border: 1px solid rgba(255,255,255,.10);
        border-radius: clamp(28px,3vw,40px);
        color: #fff;
        background:
          radial-gradient(circle at 82% 16%, rgba(109,66,245,.30), transparent 28%),
          linear-gradient(135deg, #0E0928 0%, #17103E 52%, #261B67 100%);
        box-shadow: 0 34px 90px rgba(18,12,46,.20);
      }

      .home-final-card::before {
        content: '';
        position: absolute;
        inset: 0;
        opacity: .18;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
        background-size: 44px 44px;
        mask-image: linear-gradient(90deg, transparent 0%, #000 55%, #000 100%);
      }

      .home-final-card > * {
        position: relative;
        z-index: 1;
      }

      .home-final-kicker {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        margin-bottom: 18px;
        color: #C9B9FF;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .06em;
        text-transform: uppercase;
      }

      .home-final-copy h2 {
        color: #fff;
      }

      .home-final-copy h2 span {
        color: #BCA9FF;
      }

      .home-final-copy > p {
        max-width: 560px;
        margin-top: 17px;
        color: rgba(255,255,255,.64);
        font-size: 15px;
        line-height: 1.75;
      }

      .home-final-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 28px;
      }

      .home-final-primary,
      .home-final-secondary {
        min-height: 48px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0 21px;
        border-radius: 999px;
        font-family: 'Plus Jakarta Sans','Inter',sans-serif;
        font-size: 13px;
        font-weight: 800;
        text-decoration: none;
      }

      .home-final-primary {
        border: 0;
        background: #fff;
        color: var(--ink);
        cursor: pointer;
        box-shadow: 0 14px 34px rgba(0,0,0,.18);
      }

      .home-final-secondary {
        border: 1px solid rgba(255,255,255,.20);
        color: #fff;
        background: rgba(255,255,255,.06);
      }

      .home-final-copy > small {
        display: block;
        margin-top: 13px;
        color: rgba(255,255,255,.38);
        font-size: 10.5px;
      }

      .home-final-points {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .home-final-point {
        display: flex;
        align-items: center;
        gap: 13px;
        padding: 16px 17px;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 17px;
        background: rgba(255,255,255,.055);
        backdrop-filter: blur(10px);
      }

      .home-final-point > span {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        border-radius: 11px;
        color: #9BFFCB;
        background: rgba(18,183,106,.10);
      }

      .home-final-point strong,
      .home-final-point p {
        display: block;
      }

      .home-final-point strong {
        color: #fff;
        font-size: 12px;
      }

      .home-final-point p {
        margin-top: 3px;
        color: rgba(255,255,255,.48);
        font-size: 10.5px;
      }

      /* Responsividade Home */
      @media (max-width: 980px) {
        .home-audience-grid,
        .home-professions-layout,
        .home-security-grid,
        .home-faq-grid,
        .home-final-card {
          grid-template-columns: 1fr;
        }

        .home-professions-copy,
        .home-faq-copy {
          position: static;
          max-width: 680px;
        }

        .home-feature-shell {
          grid-template-columns: 1fr;
        }

        .home-feature-tabs {
          display: grid;
          grid-template-columns: repeat(3,1fr);
        }

        .home-feature-tab {
          grid-template-columns: 36px 1fr;
        }

        .home-feature-tab-arrow {
          display: none;
        }
      }

      @media (max-width: 760px) {
        .home-section {
          padding: 68px 0;
        }

        .home-audience-card {
          min-height: auto;
        }

        .home-feature-tabs {
          display: flex;
          flex-direction: row;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: none;
        }

        .home-feature-tabs::-webkit-scrollbar {
          display: none;
        }

        .home-feature-tab {
          min-width: 190px;
        }

        .home-feature-panel {
          grid-template-columns: 1fr;
        }

        .home-feature-demo {
          min-height: 420px;
        }

        .home-flow-grid {
          grid-template-columns: 1fr;
        }

        .home-flow-grid::before {
          display: none;
        }

        .home-security-cards {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (max-width: 560px) {
        .home-section-head {
          text-align: left;
        }

        .home-section-head p {
          margin-left: 0;
        }

        .home-clinic-grid {
          grid-template-columns: 1fr;
        }

        .home-clinic-grid > div {
          min-height: auto;
        }

        .home-profession-row {
          grid-template-columns: 42px 1fr;
        }

        .home-profession-row > small {
          display: none;
        }

        .home-security-cards {
          grid-template-columns: 1fr;
        }

        .home-final-actions {
          flex-direction: column;
        }

        .home-final-primary,
        .home-final-secondary {
          width: 100%;
        }

        .home-feature-shell {
          padding: 10px;
          border-radius: 24px;
        }

        .home-feature-panel {
          border-radius: 18px;
        }

        .home-feature-demo {
          padding: 24px 14px;
        }

        .home-feature-demo-window {
          transform: none;
        }

        .home-feature-float {
          right: 14px;
          bottom: 15px;
        }
      }

    `}</style>

    <PublicNavbar />
    {children}
    <PublicFooter />
  </div>
);
