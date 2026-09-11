import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowRight,
  CheckCircle,
  Heart,
  HeartHandshake,
  Lightbulb,
  Lock,
  ShieldCheck,
  Sparkles,
  Users2,
  Workflow,
} from 'lucide-react';

import { PublicSiteShell } from '../../components/Layout/PublicSiteShell';
import { Reveal } from '../../components/Layout/Reveal';
import logoUrl from '../../images/logo-sistema/logo.png';
import { useSEO } from '../../hooks/useSEO';

const PAIN_POINTS = [
  {
    title: 'Informação espalhada',
    text: 'Prontuários, documentos e registros divididos entre papéis, planilhas e ferramentas diferentes.',
  },
  {
    title: 'Agenda que exige atenção manual',
    text: 'Conflitos de horário, confirmações e reagendamentos consumindo tempo que poderia estar no cuidado.',
  },
  {
    title: 'Burocracia repetitiva',
    text: 'Tarefas administrativas que se repetem todos os dias e tornam a rotina mais pesada do que precisa ser.',
  },
  {
    title: 'Ferramentas desconectadas',
    text: 'Agenda, financeiro, documentos e comunicação funcionando separados, sem continuidade entre as etapas.',
  },
];

const PILLARS = [
  {
    icon: Users2,
    title: 'Cuidado multiprofissional',
    desc: 'Pensada para diferentes profissionais da rede de saúde mental e para realidades de consultório ou clínica.',
  },
  {
    icon: Sparkles,
    title: 'Tecnologia com propósito',
    desc: 'Automação e IA para apoiar tarefas e organização, sem substituir o julgamento do profissional.',
  },
  {
    icon: Lock,
    title: 'Privacidade desde a estrutura',
    desc: 'A experiência da plataforma considera o cuidado necessário no tratamento de dados sensíveis de saúde.',
  },
  {
    icon: ShieldCheck,
    title: 'Respeito ao sigilo',
    desc: 'O acesso às informações deve acompanhar responsabilidades, permissões e limites profissionais.',
  },
];

const JOURNEY = [
  {
    step: '01',
    title: 'A dor veio da prática',
    text: 'A rotina clínica mostrou que o problema não era falta de ferramenta, mas excesso de tarefas desconectadas.',
  },
  {
    step: '02',
    title: 'Tecnologia entrou para organizar',
    text: 'A parceria entre saúde mental e engenharia de software transformou necessidades reais em fluxos digitais mais simples.',
  },
  {
    step: '03',
    title: 'A visão ficou maior',
    text: 'O que começou com demandas da psicologia evoluiu para atender diferentes profissionais e equipes da saúde mental.',
  },
];

export const Sobre: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const go = () => navigate(isAuthenticated ? '/dashboard' : '/login');

  useSEO({
    title: 'Sobre — Plaelo',
    description:
      'Conheça a história, os valores e o propósito por trás da Plaelo, plataforma de gestão criada a partir de necessidades reais da rotina em saúde mental.',
    path: '/sobre',
  });

  return (
    <PublicSiteShell>
      <style>{`
        .about-page {
          overflow: hidden;
          background: #fff;
        }

        /* ═══ HERO ═══ */
        .about-hero {
          position: relative;
          overflow: hidden;
          min-height: 660px;
          display: flex;
          align-items: center;
          color: #fff;
          background:
            radial-gradient(circle at 82% 18%, rgba(109,66,245,.34), transparent 29%),
            radial-gradient(circle at 14% 85%, rgba(18,183,106,.08), transparent 26%),
            linear-gradient(135deg, #0B0723 0%, #130D35 48%, #251966 100%);
        }

        .about-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: .20;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: linear-gradient(90deg, transparent 0%, #000 48%, #000 100%);
        }

        .about-hero-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(75px);
          pointer-events: none;
        }

        .about-hero-glow-a {
          width: 380px;
          height: 380px;
          right: 8%;
          top: -90px;
          background: rgba(139,92,246,.22);
        }

        .about-hero-glow-b {
          width: 280px;
          height: 280px;
          left: -100px;
          bottom: -110px;
          background: rgba(18,183,106,.08);
        }

        .about-hero-grid {
          position: relative;
          z-index: 1;
          width: 100%;
          display: grid;
          grid-template-columns: minmax(0,.9fr) minmax(480px,1.1fr);
          gap: clamp(44px,6vw,82px);
          align-items: center;
          padding-top: clamp(72px,8vw,108px);
          padding-bottom: clamp(72px,8vw,108px);
        }

        .about-hero-copy {
          max-width: 610px;
        }

        .about-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 12px;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 999px;
          color: #D8CCFF;
          background: rgba(255,255,255,.07);
          backdrop-filter: blur(12px);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .about-hero h1 {
          max-width: 650px;
          margin-top: 22px;
          color: #fff;
          font-family: 'Plus Jakarta Sans','Inter',sans-serif;
          font-size: clamp(44px,5.3vw,72px);
          line-height: .99;
          letter-spacing: -.058em;
          font-weight: 800;
        }

        .about-hero h1 span {
          background: linear-gradient(90deg, #BBA6FF 0%, #EEE9FF 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .about-hero-copy > p {
          max-width: 570px;
          margin-top: 22px;
          color: rgba(255,255,255,.70);
          font-size: 16px;
          line-height: 1.75;
        }

        .about-hero-proof {
          display: flex;
          flex-wrap: wrap;
          gap: 9px 18px;
          margin-top: 25px;
          color: rgba(255,255,255,.54);
          font-size: 11.5px;
        }

        .about-hero-proof span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .about-hero-proof svg {
          color: #63D89F;
        }

        .about-story-card {
          position: relative;
          overflow: hidden;
          min-height: 430px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: clamp(30px,4vw,46px);
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 30px;
          background:
            radial-gradient(circle at 90% 10%, rgba(255,255,255,.10), transparent 30%),
            rgba(255,255,255,.065);
          box-shadow: 0 34px 90px rgba(0,0,0,.22);
          backdrop-filter: blur(18px);
        }

        .about-story-card::after {
          content: '';
          position: absolute;
          width: 260px;
          height: 260px;
          right: -95px;
          bottom: -120px;
          border-radius: 50%;
          border: 42px solid rgba(255,255,255,.04);
        }

        .about-story-logo {
          position: relative;
          z-index: 1;
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          border-radius: 17px;
          background: #fff;
          box-shadow: 0 14px 32px rgba(0,0,0,.18);
        }

        .about-story-logo img {
          width: 42px;
          height: 42px;
          object-fit: contain;
        }

        .about-story-quote {
          position: relative;
          z-index: 1;
          max-width: 500px;
          margin-top: 46px;
        }

        .about-story-quote > span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 16px;
          color: #C9B9FF;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: .07em;
          text-transform: uppercase;
        }

        .about-story-quote p {
          color: #fff;
          font-family: 'Plus Jakarta Sans','Inter',sans-serif;
          font-size: clamp(24px,3vw,36px);
          line-height: 1.16;
          letter-spacing: -.035em;
          font-weight: 800;
        }

        .about-story-quote small {
          display: block;
          margin-top: 18px;
          color: rgba(255,255,255,.48);
          font-size: 11px;
          line-height: 1.5;
        }

        /* ═══ ORIGEM ═══ */
        .about-section {
          position: relative;
          padding: clamp(84px,8vw,122px) 0;
        }

        .about-origin {
          background: #fff;
        }

        .about-origin-grid {
          display: grid;
          grid-template-columns: minmax(280px,.78fr) minmax(0,1.22fr);
          gap: clamp(52px,7vw,96px);
          align-items: start;
        }

        .about-origin-copy .tag {
          margin-bottom: 20px;
        }

        .about-origin-copy h2,
        .about-pain-copy h2,
        .about-pillars-copy h2,
        .about-final-copy h2 {
          font-family: 'Plus Jakarta Sans','Inter',sans-serif;
          font-size: clamp(30px,4vw,48px);
          line-height: 1.08;
          letter-spacing: -.045em;
          font-weight: 800;
        }

        .about-origin-copy > p {
          max-width: 520px;
          margin-top: 18px;
          color: var(--muted);
          font-size: 15px;
          line-height: 1.8;
        }

        .about-journey {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .about-journey::before {
          content: '';
          position: absolute;
          left: 25px;
          top: 46px;
          bottom: 46px;
          width: 1px;
          background: linear-gradient(#CFC4F7, #E7E2F7);
        }

        .about-journey-item {
          position: relative;
          display: grid;
          grid-template-columns: 54px 1fr;
          gap: 17px;
          align-items: center;
          min-height: 135px;
          padding: 20px 22px;
          border: 1px solid var(--border);
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 16px 46px rgba(18,12,46,.05);
        }

        .about-journey-step {
          position: relative;
          z-index: 1;
          width: 50px;
          height: 50px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          color: var(--accent);
          background: var(--accent-soft);
          font-family: 'Plus Jakarta Sans',sans-serif;
          font-size: 11px;
          font-weight: 800;
        }

        .about-journey-item strong {
          display: block;
          color: var(--text);
          font-size: 14px;
          font-weight: 800;
        }

        .about-journey-item p {
          margin-top: 6px;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.65;
        }

        /* ═══ DORES ═══ */
        .about-pain {
          overflow: hidden;
          background:
            radial-gradient(circle at 92% 12%, rgba(109,66,245,.08), transparent 28%),
            var(--surface);
        }

        .about-pain-grid {
          display: grid;
          grid-template-columns: minmax(280px,.8fr) minmax(0,1.2fr);
          gap: clamp(52px,7vw,90px);
          align-items: center;
        }

        .about-pain-copy .tag {
          margin-bottom: 20px;
        }

        .about-pain-copy > p {
          max-width: 520px;
          margin-top: 18px;
          color: var(--muted);
          font-size: 15px;
          line-height: 1.75;
        }

        .about-pain-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .about-pain-card {
          min-height: 205px;
          padding: 22px;
          border: 1px solid var(--border);
          border-radius: 20px;
          background: rgba(255,255,255,.90);
          box-shadow: 0 14px 42px rgba(18,12,46,.05);
        }

        .about-pain-number {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          margin-bottom: 22px;
          border-radius: 11px;
          color: var(--accent);
          background: var(--accent-soft);
          font-size: 10px;
          font-weight: 800;
        }

        .about-pain-card strong {
          display: block;
          color: var(--text);
          font-size: 13px;
        }

        .about-pain-card p {
          margin-top: 8px;
          color: var(--muted);
          font-size: 11.5px;
          line-height: 1.65;
        }

        .about-solution {
          grid-column: 1 / -1;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 18px;
          border: 1px solid rgba(109,66,245,.14);
          border-radius: 18px;
          color: var(--ink);
          background: linear-gradient(90deg, #F3EEFF, #FAF8FF);
        }

        .about-solution > span {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 11px;
          color: var(--accent);
          background: #fff;
        }

        .about-solution strong,
        .about-solution p {
          display: block;
        }

        .about-solution strong {
          font-size: 12.5px;
        }

        .about-solution p {
          margin-top: 4px;
          color: var(--muted);
          font-size: 11px;
          line-height: 1.55;
        }

        /* ═══ PILARES ═══ */
        .about-pillars {
          position: relative;
          overflow: hidden;
          padding: clamp(88px,9vw,128px) 0;
          color: #fff;
          background:
            radial-gradient(circle at 84% 16%, rgba(109,66,245,.28), transparent 27%),
            radial-gradient(circle at 10% 90%, rgba(18,183,106,.07), transparent 24%),
            linear-gradient(135deg, #0C0825 0%, #15103A 52%, #24175D 100%);
        }

        .about-pillars-grid {
          display: grid;
          grid-template-columns: minmax(280px,.75fr) minmax(0,1.25fr);
          gap: clamp(50px,7vw,88px);
          align-items: start;
        }

        .about-pillars-copy {
          position: sticky;
          top: 110px;
        }

        .about-pillars-copy > span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 20px;
          color: #9BE7C0;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .07em;
          text-transform: uppercase;
        }

        .about-pillars-copy h2 {
          color: #fff;
        }

        .about-pillars-copy p {
          max-width: 500px;
          margin-top: 18px;
          color: rgba(255,255,255,.60);
          font-size: 15px;
          line-height: 1.75;
        }

        .about-pillars-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .about-pillar-card {
          min-height: 220px;
          padding: 22px;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 20px;
          background: rgba(255,255,255,.055);
          backdrop-filter: blur(12px);
        }

        .about-pillar-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          margin-bottom: 24px;
          border-radius: 13px;
          color: #BCA9FF;
          background: rgba(188,169,255,.10);
        }

        .about-pillar-card strong {
          display: block;
          color: #fff;
          font-size: 13px;
        }

        .about-pillar-card p {
          margin-top: 8px;
          color: rgba(255,255,255,.50);
          font-size: 11.5px;
          line-height: 1.65;
        }

        /* ═══ MANIFESTO ═══ */
        .about-manifesto {
          background: #fff;
        }

        .about-manifesto-card {
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: .86fr 1.14fr;
          gap: clamp(34px,5vw,60px);
          align-items: center;
          padding: clamp(34px,5vw,58px);
          border: 1px solid var(--border);
          border-radius: 32px;
          background:
            radial-gradient(circle at 90% 5%, rgba(109,66,245,.10), transparent 30%),
            linear-gradient(135deg, #FBFAFF 0%, #F5F1FF 100%);
        }

        .about-manifesto-logo {
          width: 74px;
          height: 74px;
          display: grid;
          place-items: center;
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 18px 46px rgba(18,12,46,.12);
        }

        .about-manifesto-logo img {
          width: 54px;
          height: 54px;
          object-fit: contain;
        }

        .about-manifesto-copy > span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 16px;
          color: var(--accent);
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: .07em;
          text-transform: uppercase;
        }

        .about-manifesto-copy h3 {
          max-width: 650px;
          color: var(--ink);
          font-size: clamp(25px,3.3vw,40px);
          line-height: 1.14;
          letter-spacing: -.04em;
          font-weight: 800;
        }

        .about-manifesto-copy p {
          max-width: 650px;
          margin-top: 15px;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.75;
        }

        /* ═══ CTA ═══ */
        .about-final {
          position: relative;
          overflow: hidden;
          padding: 0 0 clamp(88px,9vw,126px);
          background: #fff;
        }

        .about-final-card {
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: 1.08fr .92fr;
          gap: clamp(38px,5vw,62px);
          align-items: center;
          padding: clamp(38px,5vw,66px);
          border-radius: 36px;
          color: #fff;
          background:
            radial-gradient(circle at 88% 10%, rgba(109,66,245,.28), transparent 31%),
            linear-gradient(135deg, #0D0827 0%, #17103D 52%, #261B67 100%);
          box-shadow: 0 34px 90px rgba(18,12,46,.18);
        }

        .about-final-copy,
        .about-final-points {
          position: relative;
          z-index: 1;
        }

        .about-final-copy > span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 18px;
          color: #C9B9FF;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: .07em;
          text-transform: uppercase;
        }

        .about-final-copy h2 {
          color: #fff;
        }

        .about-final-copy h2 span {
          color: #BCA9FF;
        }

        .about-final-copy p {
          max-width: 530px;
          margin-top: 17px;
          color: rgba(255,255,255,.61);
          font-size: 14.5px;
          line-height: 1.75;
        }

        .about-final-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 49px;
          margin-top: 26px;
          padding: 0 21px;
          border: 0;
          border-radius: 999px;
          color: var(--ink);
          background: #fff;
          font-family: 'Plus Jakarta Sans','Inter',sans-serif;
          font-size: 12.5px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 14px 34px rgba(0,0,0,.18);
        }

        .about-final-points {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .about-final-point {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px 16px;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 17px;
          background: rgba(255,255,255,.055);
          backdrop-filter: blur(10px);
        }

        .about-final-point > span {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 10px;
          color: #9BFFCB;
          background: rgba(18,183,106,.10);
        }

        .about-final-point strong,
        .about-final-point small {
          display: block;
        }

        .about-final-point strong {
          color: #fff;
          font-size: 11.5px;
        }

        .about-final-point small {
          margin-top: 2px;
          color: rgba(255,255,255,.45);
          font-size: 9.5px;
        }

        @media (max-width: 980px) {
          .about-hero-grid,
          .about-origin-grid,
          .about-pain-grid,
          .about-pillars-grid,
          .about-manifesto-card,
          .about-final-card {
            grid-template-columns: 1fr;
          }

          .about-story-card {
            max-width: 720px;
          }

          .about-pillars-copy {
            position: static;
            max-width: 650px;
          }
        }

        @media (max-width: 720px) {
          .about-hero {
            min-height: auto;
          }

          .about-hero h1 {
            font-size: clamp(42px,12vw,58px);
          }

          .about-pain-list,
          .about-pillars-list {
            grid-template-columns: 1fr;
          }

          .about-pain-card,
          .about-pillar-card {
            min-height: auto;
          }

          .about-story-card {
            min-height: 360px;
          }
        }

        @media (max-width: 520px) {
          .about-section {
            padding: 72px 0;
          }

          .about-final-button {
            width: 100%;
          }

          .about-manifesto-card,
          .about-final-card {
            border-radius: 26px;
          }
        }
      `}</style>

      <main className="about-page">
        {/* ═══ HERO ═══ */}
        <section className="about-hero">
          <div className="about-hero-glow about-hero-glow-a" aria-hidden="true" />
          <div className="about-hero-glow about-hero-glow-b" aria-hidden="true" />

          <div className="wrap about-hero-grid">
            <Reveal className="about-hero-copy">
              <span className="about-kicker">
                <Heart size={14} />
                Nossa história
              </span>

              <h1>
                A Plaelo nasceu de uma rotina real.
                <br />
                <span>Evoluiu para cuidar de quem cuida.</span>
              </h1>

              <p>
                O ponto de partida foi simples: reunir, em um único lugar, tarefas
                que antes ficavam espalhadas pela rotina clínica. A proposta
                cresceu junto com profissionais e necessidades reais da saúde mental.
              </p>

              <div className="about-hero-proof">
                <span><CheckCircle size={13} /> Saúde mental + tecnologia</span>
                <span><CheckCircle size={13} /> Construção a partir da prática</span>
                <span><ShieldCheck size={13} /> Privacidade em foco</span>
              </div>
            </Reveal>

            <Reveal delay={100} className="about-story-card">
              <div className="about-story-logo">
                <img src={logoUrl} alt="Plaelo" />
              </div>

              <div className="about-story-quote">
                <span>
                  <HeartHandshake size={14} />
                  O que nos move
                </span>

                <p>
                  Tecnologia só faz sentido quando deixa mais espaço para o trabalho
                  que realmente importa.
                </p>

                <small>
                  Esse princípio orienta a forma como pensamos cada fluxo da Plaelo.
                </small>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══ ORIGEM ═══ */}
        <section className="about-section about-origin">
          <div className="wrap about-origin-grid">
            <Reveal className="about-origin-copy">
              <span className="tag">Como tudo começou</span>

              <h2>
                Da necessidade do consultório para uma plataforma inteira.
              </h2>

              <p>
                Uma das fundadoras do projeto atua na psicologia e vivenciava,
                no dia a dia, desafios comuns a diferentes profissionais da saúde
                mental: organização da agenda, registros clínicos, documentos,
                financeiro e tarefas administrativas.
              </p>

              <p>
                A partir dessa experiência, a construção da Plaelo uniu profissionais
                de saúde mental e engenharia de software para transformar problemas
                recorrentes em fluxos mais claros, conectados e simples de usar.
              </p>
            </Reveal>

            <div className="about-journey">
              {JOURNEY.map(({ step, title, text }, index) => (
                <Reveal
                  className="about-journey-item"
                  key={step}
                  delay={index * 90}
                >
                  <span className="about-journey-step">{step}</span>
                  <div>
                    <strong>{title}</strong>
                    <p>{text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ DESAFIOS ═══ */}
        <section className="about-section about-pain">
          <div className="wrap about-pain-grid">
            <Reveal className="about-pain-copy">
              <span className="tag">O ponto de partida</span>

              <h2>Os problemas eram pequenos isoladamente. Juntos, pesavam na rotina.</h2>

              <p>
                A Plaelo começou olhando justamente para os pontos que mais geravam
                retrabalho, dispersão e perda de tempo no dia a dia.
              </p>
            </Reveal>

            <div className="about-pain-list">
              {PAIN_POINTS.map((item, index) => (
                <Reveal
                  className="about-pain-card"
                  key={item.title}
                  delay={index * 70}
                >
                  <span className="about-pain-number">0{index + 1}</span>
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </Reveal>
              ))}

              <Reveal delay={PAIN_POINTS.length * 70} className="about-solution">
                <span><Workflow size={17} /></span>
                <div>
                  <strong>A resposta foi conectar o fluxo.</strong>
                  <p>
                    Agenda, prontuário, documentos, financeiro, automações e IA
                    passaram a fazer sentido quando começaram a trabalhar juntos.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ═══ PILARES ═══ */}
        <section className="about-pillars">
          <div className="wrap about-pillars-grid">
            <Reveal className="about-pillars-copy">
              <span>
                <Lightbulb size={14} />
                O que nos guia
              </span>

              <h2>Nossos pilares não são slogans. São critérios de produto.</h2>

              <p>
                Cada decisão de experiência, automação e acesso precisa respeitar
                a realidade de quem trabalha com cuidado, dados sensíveis e
                responsabilidades profissionais.
              </p>
            </Reveal>

            <div className="about-pillars-list">
              {PILLARS.map(({ icon: Icon, title, desc }, index) => (
                <Reveal
                  className="about-pillar-card"
                  key={title}
                  delay={index * 75}
                >
                  <span className="about-pillar-icon">
                    <Icon size={19} />
                  </span>

                  <strong>{title}</strong>
                  <p>{desc}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ MANIFESTO ═══ */}
        <section className="about-section about-manifesto">
          <div className="wrap">
            <Reveal className="about-manifesto-card">
              <div className="about-manifesto-logo">
                <img src={logoUrl} alt="Plaelo" />
              </div>

              <div className="about-manifesto-copy">
                <span>
                  <HeartHandshake size={14} />
                  Nosso jeito de construir
                </span>

                <h3>
                  A Plaelo não quer ocupar mais espaço na rotina. Quer devolver espaço.
                </h3>

                <p>
                  Menos alternância entre sistemas, menos repetição de tarefas e
                  mais continuidade entre as etapas do trabalho. A tecnologia entra
                  para organizar o bastidor — e deixar o profissional mais presente
                  onde sua atuação é insubstituível.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══ CTA FINAL ═══ */}
        <section className="about-final">
          <div className="wrap">
            <Reveal className="about-final-card">
              <div className="about-final-copy">
                <span>
                  <Sparkles size={14} />
                  Conheça a Plaelo na prática
                </span>

                <h2>
                  Uma plataforma construída a partir da rotina
                  <span> para tornar essa rotina mais leve.</span>
                </h2>

                <p>
                  Experimente a Plaelo e veja como organização, tecnologia e cuidado
                  podem coexistir no mesmo fluxo de trabalho.
                </p>

                <button className="about-final-button" onClick={go}>
                  Começar grátis por 14 dias
                  <ArrowRight size={17} />
                </button>
              </div>

              <div className="about-final-points">
                {[
                  {
                    icon: HeartHandshake,
                    title: 'Feita para a saúde mental',
                    text: 'Pensada a partir de necessidades reais da rotina.',
                  },
                  {
                    icon: Sparkles,
                    title: 'Tecnologia com propósito',
                    text: 'Automação e IA para apoiar, não substituir.',
                  },
                  {
                    icon: ShieldCheck,
                    title: 'Privacidade em foco',
                    text: 'Estrutura voltada ao cuidado com dados sensíveis.',
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <div className="about-final-point" key={title}>
                    <span><Icon size={17} /></span>
                    <div>
                      <strong>{title}</strong>
                      <small>{text}</small>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </PublicSiteShell>
  );
};
