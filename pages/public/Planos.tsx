import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowRight,
  Check,
  CheckCircle,
  ChevronDown,
  CreditCard,
  HeadphonesIcon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';

import { PublicSiteShell } from '../../components/Layout/PublicSiteShell';
import { Reveal } from '../../components/Layout/Reveal';
import { AnimatedNumber } from '../../components/Layout/AnimatedNumber';
import { FEATURE_LABELS, Plan } from './publicSiteData';
import { api } from '../../services/api';
import { useSEO } from '../../hooks/useSEO';

const TRUST_BADGES = [
  { icon: CheckCircle, label: '14 dias grátis' },
  { icon: RefreshCw, label: 'Sem fidelidade' },
  { icon: Sparkles, label: 'IA integrada' },
  { icon: HeadphonesIcon, label: 'Suporte humano' },
];

const FAQ = [
  {
    q: 'Existe período de teste gratuito?',
    a: 'Sim. Você pode conhecer a Plaelo por 14 dias sem custo e sem precisar cadastrar cartão de crédito.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. Não há fidelidade ou multa de cancelamento. Você pode alterar ou cancelar sua assinatura quando precisar.',
  },
  {
    q: 'Como funciona a cobrança?',
    a: 'A assinatura é mensal e pode ser paga pelas formas disponíveis na plataforma. Você também pode trocar de plano conforme sua necessidade.',
  },
  {
    q: 'Meus dados clínicos ficam seguros?',
    a: 'A Plaelo foi pensada para trabalhar com dados sensíveis de saúde, com controles de acesso, privacidade e recursos voltados aos princípios da LGPD.',
  },
];

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      className={`pricing-faq-item${open ? ' open' : ''}`}
      onClick={() => setOpen(value => !value)}
    >
      <span className="pricing-faq-question">
        <strong>{q}</strong>
        <span className="pricing-faq-icon">
          <ChevronDown size={17} />
        </span>
      </span>

      <span className="pricing-faq-answer">{a}</span>
    </button>
  );
};

export const Planos: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  const go = () => navigate(isAuthenticated ? '/dashboard' : '/login');

  useSEO({
    title: 'Planos e Preços — Plaelo',
    description:
      'Conheça os planos da Plaelo para profissionais e clínicas de saúde mental. Sem fidelidade, com IA integrada e 14 dias de teste grátis.',
    path: '/planos',
  });

  useEffect(() => {
    api
      .get<Plan[]>('/plans')
      .then(data => {
        if (Array.isArray(data)) setPlans(data);
      })
      .catch(() => {})
      .finally(() => setPlansLoading(false));
  }, []);

  return (
    <PublicSiteShell>
      <style>{`
        .pricing-page {
          overflow: hidden;
          background: #fff;
        }

        /* ═══ HERO ═══ */
        .pricing-hero {
          position: relative;
          overflow: hidden;
          padding: clamp(86px,9vw,128px) 0 clamp(118px,12vw,172px);
          color: #fff;
          background:
            radial-gradient(circle at 76% 10%, rgba(109,66,245,.34), transparent 30%),
            radial-gradient(circle at 16% 80%, rgba(18,183,106,.08), transparent 25%),
            linear-gradient(135deg, #0B0723 0%, #130D35 50%, #251966 100%);
        }

        .pricing-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: .18;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: linear-gradient(to bottom, #000 0%, transparent 88%);
        }

        .pricing-hero-glow {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(80px);
        }

        .pricing-hero-glow-a {
          width: 380px;
          height: 380px;
          right: 7%;
          top: -120px;
          background: rgba(139,92,246,.23);
        }

        .pricing-hero-glow-b {
          width: 300px;
          height: 300px;
          left: -100px;
          bottom: -120px;
          background: rgba(18,183,106,.08);
        }

        .pricing-hero-inner {
          position: relative;
          z-index: 1;
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }

        .pricing-kicker {
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

        .pricing-hero h1 {
          margin-top: 22px;
          color: #fff;
          font-family: 'Plus Jakarta Sans','Inter',sans-serif;
          font-size: clamp(44px,5.6vw,72px);
          line-height: .99;
          letter-spacing: -.058em;
          font-weight: 800;
        }

        .pricing-hero h1 span {
          background: linear-gradient(90deg, #BBA6FF 0%, #EEE9FF 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .pricing-hero-copy {
          max-width: 650px;
          margin: 22px auto 0;
          color: rgba(255,255,255,.68);
          font-size: 16px;
          line-height: 1.75;
        }

        .pricing-trust {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 9px 20px;
          margin-top: 28px;
        }

        .pricing-trust span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: rgba(255,255,255,.62);
          font-size: 11.5px;
          font-weight: 600;
        }

        .pricing-trust svg {
          color: #63D89F;
        }

        /* ═══ PLANOS ═══ */
        .pricing-plans {
          position: relative;
          z-index: 3;
          margin-top: -78px;
          padding-bottom: clamp(74px,8vw,112px);
        }

        .pricing-plans-inner {
          position: relative;
        }

        .pricing-loading,
        .pricing-empty {
          max-width: 660px;
          margin: 0 auto;
          padding: 44px;
          border: 1px solid var(--border);
          border-radius: 28px;
          background: #fff;
          text-align: center;
          box-shadow: 0 24px 70px rgba(18,12,46,.10);
        }

        .pricing-loading {
          color: var(--muted);
          font-size: 14px;
        }

        .pricing-empty-icon {
          width: 50px;
          height: 50px;
          display: grid;
          place-items: center;
          margin: 0 auto 18px;
          border-radius: 15px;
          color: var(--accent);
          background: var(--accent-soft);
        }

        .pricing-empty h2 {
          font-size: 21px;
          font-weight: 800;
        }

        .pricing-empty p {
          margin: 10px auto 22px;
          max-width: 460px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(245px,1fr));
          gap: 16px;
          align-items: stretch;
        }

        .pricing-card {
          position: relative;
          overflow: hidden;
          min-height: 100%;
          display: flex;
          flex-direction: column;
          padding: 28px;
          border: 1px solid var(--border);
          border-radius: 26px;
          background: #fff;
          box-shadow: 0 18px 58px rgba(18,12,46,.08);
          transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
        }

        .pricing-card:hover {
          transform: translateY(-5px);
          border-color: #D5CBFA;
          box-shadow: 0 28px 72px rgba(18,12,46,.13);
        }

        .pricing-card.highlighted {
          color: #fff;
          border-color: transparent;
          background:
            radial-gradient(circle at 100% 0%, rgba(109,66,245,.34), transparent 34%),
            linear-gradient(155deg, #0D0827 0%, #17103D 54%, #2A1E70 100%);
          box-shadow: 0 28px 78px rgba(18,12,46,.27);
          transform: translateY(-8px);
        }

        .pricing-card.highlighted:hover {
          transform: translateY(-12px);
        }

        .pricing-card::after {
          content: '';
          position: absolute;
          width: 170px;
          height: 170px;
          right: -90px;
          bottom: -90px;
          border-radius: 50%;
          background: var(--accent-soft);
          opacity: .38;
          pointer-events: none;
        }

        .pricing-card.highlighted::after {
          border: 36px solid rgba(255,255,255,.04);
          background: transparent;
          opacity: 1;
        }

        .pricing-card-top,
        .pricing-card-features,
        .pricing-card-button {
          position: relative;
          z-index: 1;
        }

        .pricing-popular {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          align-self: flex-start;
          margin-bottom: 16px;
          padding: 6px 10px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 999px;
          color: #D9CEFF;
          background: rgba(255,255,255,.08);
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .pricing-card-name {
          color: var(--text);
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -.02em;
        }

        .pricing-card.highlighted .pricing-card-name {
          color: #fff;
        }

        .pricing-card-description {
          min-height: 38px;
          margin-top: 7px;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.55;
        }

        .pricing-card.highlighted .pricing-card-description {
          color: rgba(255,255,255,.55);
        }

        .pricing-price {
          display: flex;
          align-items: baseline;
          gap: 5px;
          margin-top: 24px;
        }

        .pricing-price .pricing-number {
          color: var(--text);
          font-family: 'Plus Jakarta Sans','Inter',sans-serif;
          font-size: clamp(34px,3vw,44px);
          font-weight: 800;
          letter-spacing: -.05em;
        }

        .pricing-card.highlighted .pricing-price .pricing-number {
          color: #fff;
        }

        .pricing-price small {
          color: var(--muted);
          font-size: 11px;
        }

        .pricing-card.highlighted .pricing-price small {
          color: rgba(255,255,255,.44);
        }

        .pricing-divider {
          height: 1px;
          margin: 24px 0 18px;
          background: var(--border);
        }

        .pricing-card.highlighted .pricing-divider {
          background: rgba(255,255,255,.10);
        }

        .pricing-features-label {
          display: block;
          margin-bottom: 10px;
          color: var(--muted);
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .pricing-card.highlighted .pricing-features-label {
          color: rgba(255,255,255,.40);
        }

        .pricing-card-features {
          flex: 1;
          list-style: none;
        }

        .pricing-card-features li {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 8px 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.45;
        }

        .pricing-card.highlighted .pricing-card-features li {
          color: rgba(255,255,255,.76);
        }

        .pricing-card-features svg {
          margin-top: 1px;
          color: var(--accent2);
          flex-shrink: 0;
        }

        .pricing-card.highlighted .pricing-card-features svg {
          color: #72E1AA;
        }

        .pricing-card-button {
          width: 100%;
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 25px;
          border: 0;
          border-radius: 999px;
          color: #fff;
          background: var(--ink);
          font-family: 'Plus Jakarta Sans','Inter',sans-serif;
          font-size: 12.5px;
          font-weight: 800;
          cursor: pointer;
          transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
        }

        .pricing-card-button:hover {
          transform: translateY(-2px);
          background: var(--accent);
          box-shadow: 0 12px 28px rgba(109,66,245,.22);
        }

        .pricing-card.highlighted .pricing-card-button {
          color: var(--ink);
          background: #fff;
        }

        .pricing-card.highlighted .pricing-card-button:hover {
          background: #F2EEFF;
        }

        /* ═══ BENEFÍCIOS DE CONTRATAÇÃO ═══ */
        .pricing-benefits {
          padding: 0 0 clamp(78px,8vw,112px);
          background: #fff;
        }

        .pricing-benefit-shell {
          display: grid;
          grid-template-columns: repeat(4,1fr);
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 24px;
          background: #FAF9FF;
        }

        .pricing-benefit {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 105px;
          padding: 20px;
        }

        .pricing-benefit + .pricing-benefit {
          border-left: 1px solid var(--border);
        }

        .pricing-benefit-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 12px;
          color: var(--accent);
          background: var(--accent-soft);
        }

        .pricing-benefit strong,
        .pricing-benefit small {
          display: block;
        }

        .pricing-benefit strong {
          color: var(--text);
          font-size: 11.5px;
        }

        .pricing-benefit small {
          margin-top: 3px;
          color: var(--muted);
          font-size: 9.5px;
          line-height: 1.45;
        }

        /* ═══ ESCOLHA / TEXTO ═══ */
        .pricing-choice {
          position: relative;
          overflow: hidden;
          padding: clamp(86px,9vw,124px) 0;
          background:
            radial-gradient(circle at 12% 12%, rgba(109,66,245,.08), transparent 27%),
            var(--surface);
        }

        .pricing-choice-grid {
          display: grid;
          grid-template-columns: minmax(280px,.8fr) minmax(0,1.2fr);
          gap: clamp(52px,7vw,88px);
          align-items: center;
        }

        .pricing-choice-copy .tag {
          margin-bottom: 20px;
        }

        .pricing-choice-copy h2,
        .pricing-faq-copy h2 {
          font-family: 'Plus Jakarta Sans','Inter',sans-serif;
          font-size: clamp(30px,4vw,46px);
          line-height: 1.08;
          letter-spacing: -.045em;
          font-weight: 800;
        }

        .pricing-choice-copy > p,
        .pricing-faq-copy > p {
          max-width: 540px;
          margin-top: 17px;
          color: var(--muted);
          font-size: 15px;
          line-height: 1.75;
        }

        .pricing-choice-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pricing-choice-item {
          display: grid;
          grid-template-columns: 44px 1fr;
          gap: 14px;
          align-items: center;
          min-height: 106px;
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: rgba(255,255,255,.9);
          box-shadow: 0 14px 42px rgba(18,12,46,.05);
        }

        .pricing-choice-item > span {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: var(--accent);
          background: var(--accent-soft);
        }

        .pricing-choice-item strong {
          display: block;
          color: var(--text);
          font-size: 13px;
        }

        .pricing-choice-item p {
          margin-top: 4px;
          color: var(--muted);
          font-size: 11.5px;
          line-height: 1.55;
        }

        /* ═══ FAQ ═══ */
        .pricing-faq {
          padding: clamp(84px,9vw,124px) 0;
          background: #fff;
        }

        .pricing-faq-grid {
          display: grid;
          grid-template-columns: minmax(250px,.72fr) minmax(0,1.28fr);
          gap: clamp(52px,7vw,92px);
          align-items: start;
        }

        .pricing-faq-copy {
          position: sticky;
          top: 110px;
        }

        .pricing-faq-copy .tag {
          margin-bottom: 20px;
        }

        .pricing-faq-list {
          border-top: 1px solid var(--border);
        }

        .pricing-faq-item {
          width: 100%;
          display: block;
          padding: 23px 2px;
          border: 0;
          border-bottom: 1px solid var(--border);
          background: transparent;
          text-align: left;
          cursor: pointer;
        }

        .pricing-faq-question {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .pricing-faq-question > strong {
          color: var(--text);
          font-family: 'Plus Jakarta Sans','Inter',sans-serif;
          font-size: 14px;
          font-weight: 800;
        }

        .pricing-faq-icon {
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

        .pricing-faq-item.open .pricing-faq-icon {
          transform: rotate(180deg);
          color: #fff;
          background: var(--ink);
          border-color: var(--ink);
        }

        .pricing-faq-answer {
          display: block;
          max-width: 650px;
          max-height: 0;
          overflow: hidden;
          color: var(--muted);
          font-size: 12.5px;
          line-height: 1.75;
          opacity: 0;
          transition: max-height .28s ease, opacity .28s ease, padding-top .28s ease;
        }

        .pricing-faq-item.open .pricing-faq-answer {
          max-height: 220px;
          padding-top: 13px;
          opacity: 1;
        }

        /* ═══ CTA FINAL ═══ */
        .pricing-final {
          position: relative;
          overflow: hidden;
          padding: 0 0 clamp(86px,9vw,124px);
          background: #fff;
        }

        .pricing-final-card {
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: 1.05fr .95fr;
          gap: clamp(36px,5vw,62px);
          align-items: center;
          padding: clamp(38px,5vw,66px);
          border-radius: 36px;
          color: #fff;
          background:
            radial-gradient(circle at 88% 10%, rgba(109,66,245,.28), transparent 31%),
            linear-gradient(135deg, #0D0827 0%, #17103D 52%, #261B67 100%);
          box-shadow: 0 34px 90px rgba(18,12,46,.18);
        }

        .pricing-final-copy,
        .pricing-final-side {
          position: relative;
          z-index: 1;
        }

        .pricing-final-copy > span {
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

        .pricing-final-copy h2 {
          color: #fff;
          font-family: 'Plus Jakarta Sans','Inter',sans-serif;
          font-size: clamp(30px,4vw,48px);
          line-height: 1.08;
          letter-spacing: -.045em;
          font-weight: 800;
        }

        .pricing-final-copy h2 span {
          color: #BCA9FF;
        }

        .pricing-final-copy p {
          max-width: 530px;
          margin-top: 17px;
          color: rgba(255,255,255,.61);
          font-size: 14.5px;
          line-height: 1.75;
        }

        .pricing-final-button {
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

        .pricing-final-copy small {
          display: block;
          margin-top: 13px;
          color: rgba(255,255,255,.36);
          font-size: 10px;
        }

        .pricing-final-side {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .pricing-final-point {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px 16px;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 17px;
          background: rgba(255,255,255,.055);
          backdrop-filter: blur(10px);
        }

        .pricing-final-point > span {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 10px;
          color: #9BFFCB;
          background: rgba(18,183,106,.10);
        }

        .pricing-final-point strong,
        .pricing-final-point small {
          display: block;
        }

        .pricing-final-point strong {
          color: #fff;
          font-size: 11.5px;
        }

        .pricing-final-point small {
          margin-top: 2px;
          color: rgba(255,255,255,.45);
          font-size: 9.5px;
        }

        @media (max-width: 980px) {
          .pricing-choice-grid,
          .pricing-faq-grid,
          .pricing-final-card {
            grid-template-columns: 1fr;
          }

          .pricing-faq-copy {
            position: static;
            max-width: 650px;
          }

          .pricing-benefit-shell {
            grid-template-columns: 1fr 1fr;
          }

          .pricing-benefit:nth-child(3) {
            border-left: 0;
            border-top: 1px solid var(--border);
          }

          .pricing-benefit:nth-child(4) {
            border-top: 1px solid var(--border);
          }
        }

        @media (max-width: 760px) {
          .pricing-hero {
            padding-top: 76px;
            padding-bottom: 116px;
          }

          .pricing-hero h1 {
            font-size: clamp(42px,12vw,58px);
          }

          .pricing-plans {
            margin-top: -58px;
          }

          .pricing-card.highlighted {
            transform: none;
          }

          .pricing-card.highlighted:hover {
            transform: translateY(-5px);
          }
        }

        @media (max-width: 560px) {
          .pricing-benefit-shell {
            grid-template-columns: 1fr;
          }

          .pricing-benefit + .pricing-benefit {
            border-left: 0;
            border-top: 1px solid var(--border);
          }

          .pricing-final-button {
            width: 100%;
          }

          .pricing-card {
            padding: 24px;
          }
        }
      `}</style>

      <main className="pricing-page">
        {/* ═══ HERO ═══ */}
        <section className="pricing-hero">
          <div className="pricing-hero-glow pricing-hero-glow-a" aria-hidden="true" />
          <div className="pricing-hero-glow pricing-hero-glow-b" aria-hidden="true" />

          <div className="wrap">
            <Reveal className="pricing-hero-inner">
              <span className="pricing-kicker">
                <WalletCards size={14} />
                Planos para cada fase da sua rotina
              </span>

              <h1>
                Escolha o que faz sentido
                <br />
                <span>para o seu momento.</span>
              </h1>

              <p className="pricing-hero-copy">
                Comece com o que você precisa hoje e evolua conforme sua prática ou
                sua clínica cresce. Sem fidelidade e sem complicar a contratação.
              </p>

              <div className="pricing-trust">
                {TRUST_BADGES.map(({ icon: Icon, label }) => (
                  <span key={label}>
                    <Icon size={14} />
                    {label}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══ PLANOS ═══ */}
        <section className="pricing-plans">
          <div className="wrap pricing-plans-inner">
            {plansLoading ? (
              <div className="pricing-loading">Carregando planos...</div>
            ) : plans.length === 0 ? (
              <div className="pricing-empty">
                <span className="pricing-empty-icon">
                  <Sparkles size={22} />
                </span>
                <h2>Planos em atualização</h2>
                <p>
                  Estamos atualizando as opções disponíveis. Você ainda pode
                  conhecer a Plaelo e falar com a nossa equipe.
                </p>
                <button className="btn-p" onClick={go}>
                  Quero conhecer a Plaelo
                </button>
              </div>
            ) : (
              <div className="pricing-grid">
                {plans.map((plan, index) => {
                  const highlighted = Boolean(plan.highlighted);

                  return (
                    <Reveal
                      as="article"
                      key={plan.id}
                      delay={index * 70}
                      className={`pricing-card${highlighted ? ' highlighted' : ''}`}
                    >
                      <div className="pricing-card-top">
                        {highlighted && (
                          <span className="pricing-popular">
                            <Sparkles size={11} />
                            Mais escolhido
                          </span>
                        )}

                        <h2 className="pricing-card-name">{plan.name}</h2>

                        <p className="pricing-card-description">
                          {plan.description || 'Uma opção para organizar sua rotina na Plaelo.'}
                        </p>

                        <div className="pricing-price">
                          <AnimatedNumber
                            value={Number(plan.price)}
                            prefix="R$ "
                            className="pricing-number"
                          />
                          <small>/mês</small>
                        </div>

                        <div className="pricing-divider" />
                      </div>

                      <span className="pricing-features-label">
                        O que está incluído
                      </span>

                      <ul className="pricing-card-features">
                        {(plan.features || []).map(feature => (
                          <li key={feature}>
                            <Check size={14} strokeWidth={2.4} />
                            <span>{FEATURE_LABELS[feature] || feature}</span>
                          </li>
                        ))}
                      </ul>

                      <button className="pricing-card-button" onClick={go}>
                        Começar com este plano
                        <ArrowRight size={15} />
                      </button>
                    </Reveal>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ═══ BENEFÍCIOS ═══ */}
        <section className="pricing-benefits">
          <div className="wrap">
            <div className="pricing-benefit-shell">
              {[
                {
                  icon: Sparkles,
                  title: '14 dias grátis',
                  text: 'Conheça a plataforma antes de decidir.',
                },
                {
                  icon: RefreshCw,
                  title: 'Sem fidelidade',
                  text: 'Mude ou cancele quando precisar.',
                },
                {
                  icon: CreditCard,
                  title: 'Pagamento simples',
                  text: 'Use as formas disponíveis na plataforma.',
                },
                {
                  icon: HeadphonesIcon,
                  title: 'Suporte humano',
                  text: 'Ajuda para começar e usar os recursos.',
                },
              ].map(({ icon: Icon, title, text }, index) => (
                <Reveal
                  className="pricing-benefit"
                  key={title}
                  delay={index * 70}
                >
                  <span className="pricing-benefit-icon">
                    <Icon size={17} />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ COMO ESCOLHER ═══ */}
        <section className="pricing-choice">
          <div className="wrap pricing-choice-grid">
            <Reveal className="pricing-choice-copy">
              <span className="tag">Qual plano escolher?</span>
              <h2>Comece pelo seu momento, não pelo número de recursos.</h2>
              <p>
                Pense no tamanho da sua rotina, no quanto você quer automatizar e
                em quantas pessoas precisam trabalhar dentro da plataforma.
              </p>
            </Reveal>

            <div className="pricing-choice-list">
              {[
                {
                  icon: CheckCircle,
                  title: 'Se você está começando',
                  text: 'Priorize organização, agenda e recursos essenciais para tirar a rotina da improvisação.',
                },
                {
                  icon: Sparkles,
                  title: 'Se você quer ganhar tempo',
                  text: 'Escolha uma opção que reúna automações, IA e recursos administrativos no mesmo fluxo.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Se você trabalha em equipe',
                  text: 'Considere os recursos de gestão, permissões e organização compartilhada da clínica.',
                },
              ].map(({ icon: Icon, title, text }, index) => (
                <Reveal
                  className="pricing-choice-item"
                  key={title}
                  delay={index * 85}
                >
                  <span><Icon size={18} /></span>
                  <div>
                    <strong>{title}</strong>
                    <p>{text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section className="pricing-faq">
          <div className="wrap pricing-faq-grid">
            <Reveal className="pricing-faq-copy">
              <span className="tag">Dúvidas frequentes</span>
              <h2>Antes de escolher seu plano.</h2>
              <p>
                Algumas respostas rápidas sobre teste, pagamento, cancelamento e
                segurança da plataforma.
              </p>
            </Reveal>

            <div className="pricing-faq-list">
              {FAQ.map(item => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CTA FINAL ═══ */}
        <section className="pricing-final">
          <div className="wrap">
            <Reveal className="pricing-final-card">
              <div className="pricing-final-copy">
                <span>
                  <Sparkles size={14} />
                  Experimente antes de decidir
                </span>

                <h2>
                  Escolha um plano.
                  <span> A Plaelo cuida do resto da organização.</span>
                </h2>

                <p>
                  Comece seus 14 dias grátis e veja na prática qual conjunto de
                  recursos faz mais sentido para sua rotina.
                </p>

                <button className="pricing-final-button" onClick={go}>
                  Começar grátis por 14 dias
                  <ArrowRight size={17} />
                </button>

                <small>Sem cartão de crédito. Sem fidelidade.</small>
              </div>

              <div className="pricing-final-side">
                {[
                  {
                    icon: RefreshCw,
                    title: 'Evolua quando precisar',
                    text: 'Troque de plano conforme sua rotina crescer.',
                  },
                  {
                    icon: Sparkles,
                    title: 'IA integrada',
                    text: 'Apoio dentro da mesma plataforma.',
                  },
                  {
                    icon: ShieldCheck,
                    title: 'Privacidade em foco',
                    text: 'Estrutura pensada para dados sensíveis.',
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <div className="pricing-final-point" key={title}>
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
