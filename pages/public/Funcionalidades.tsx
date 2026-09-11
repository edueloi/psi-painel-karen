import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle,
  ChevronRight,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  Lock,
  MessageCircle,
  Receipt,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Video,
} from 'lucide-react';

import { PublicSiteShell } from '../../components/Layout/PublicSiteShell';
import { Reveal } from '../../components/Layout/Reveal';
import { AnimatedNumber } from '../../components/Layout/AnimatedNumber';
import { features } from './publicSiteData';
import logoUrl from '../../images/logo-sistema/logo.png';
import { useSEO } from '../../hooks/useSEO';

const STATS = [
  { value: 9, suffix: '', label: 'módulos integrados' },
  { value: 100, suffix: '%', label: 'em nuvem' },
  { value: null, display: '24/7', label: 'acesso à plataforma' },
];

const FLOW = [
  {
    icon: Calendar,
    title: 'Organize',
    text: 'Agenda, disponibilidade, pacientes e lembretes no mesmo fluxo.',
  },
  {
    icon: HeartHandshake,
    title: 'Atenda',
    text: 'Prontuário, formulários, documentos e sala virtual conectados.',
  },
  {
    icon: BarChart3,
    title: 'Acompanhe',
    text: 'Financeiro, NFS-e e indicadores para enxergar a rotina com clareza.',
  },
];

export const Funcionalidades: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const go = () => navigate(isAuthenticated ? '/dashboard' : '/login');

  useSEO({
    title: 'Funcionalidades — Plaelo',
    description:
      'Conheça os recursos da Plaelo: agenda, prontuário, atendimento remoto, financeiro, nota fiscal, automações e inteligência artificial para profissionais e clínicas de saúde mental.',
    path: '/funcionalidades',
  });

  return (
    <PublicSiteShell>
      <style>{`
        .fp-page {
          overflow: hidden;
          background: #fff;
        }

        .fp-hero {
          position: relative;
          overflow: hidden;
          min-height: 690px;
          display: flex;
          align-items: center;
          color: #fff;
          background:
            radial-gradient(circle at 78% 16%, rgba(109,66,245,.34), transparent 30%),
            radial-gradient(circle at 88% 82%, rgba(18,183,106,.10), transparent 24%),
            linear-gradient(135deg, #0B0723 0%, #130D35 48%, #251966 100%);
        }

        .fp-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: .22;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: linear-gradient(90deg, transparent 0%, #000 52%, #000 100%);
        }

        .fp-hero-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          pointer-events: none;
        }

        .fp-hero-glow-a {
          width: 380px;
          height: 380px;
          right: 10%;
          top: 3%;
          background: rgba(139,92,246,.22);
        }

        .fp-hero-glow-b {
          width: 280px;
          height: 280px;
          right: -90px;
          bottom: -90px;
          background: rgba(18,183,106,.08);
        }

        .fp-hero-grid {
          position: relative;
          z-index: 1;
          width: 100%;
          display: grid;
          grid-template-columns: minmax(0,.88fr) minmax(520px,1.12fr);
          gap: clamp(44px,6vw,84px);
          align-items: center;
          padding-top: clamp(74px,8vw,110px);
          padding-bottom: clamp(74px,8vw,110px);
        }

        .fp-hero-copy {
          max-width: 590px;
        }

        .fp-kicker {
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

        .fp-hero h1 {
          max-width: 660px;
          margin-top: 22px;
          color: #fff;
          font-size: clamp(44px,5.3vw,72px);
          line-height: .99;
          letter-spacing: -.058em;
          font-weight: 800;
        }

        .fp-hero h1 span {
          background: linear-gradient(90deg, #BBA6FF 0%, #EEE9FF 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .fp-hero-copy > p {
          max-width: 575px;
          margin-top: 22px;
          color: rgba(255,255,255,.70);
          font-size: 16px;
          line-height: 1.75;
        }

        .fp-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 30px;
        }

        .fp-primary,
        .fp-secondary {
          min-height: 50px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 22px;
          border-radius: 999px;
          font-family: 'Plus Jakarta Sans','Inter',sans-serif;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .fp-primary {
          border: 0;
          color: var(--ink);
          background: #fff;
          box-shadow: 0 14px 34px rgba(0,0,0,.20);
        }

        .fp-primary:hover {
          transform: translateY(-2px);
          background: #F3EEFF;
          box-shadow: 0 18px 42px rgba(0,0,0,.27);
        }

        .fp-secondary {
          border: 1px solid rgba(255,255,255,.20);
          color: #fff;
          background: rgba(255,255,255,.07);
          backdrop-filter: blur(10px);
        }

        .fp-secondary:hover {
          transform: translateY(-2px);
          background: rgba(255,255,255,.12);
        }

        .fp-hero-note {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 18px;
          margin-top: 18px;
          color: rgba(255,255,255,.50);
          font-size: 11.5px;
        }

        .fp-hero-note span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .fp-hero-note svg {
          color: #63D89F;
        }

        .fp-product {
          position: relative;
          min-height: 500px;
        }

        .fp-product-window {
          position: absolute;
          right: 0;
          top: 38px;
          width: min(100%, 620px);
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 26px;
          background: rgba(255,255,255,.97);
          box-shadow:
            0 42px 110px rgba(3,0,18,.38),
            0 0 0 1px rgba(255,255,255,.16) inset;
          transform: perspective(1400px) rotateY(-4deg) rotateX(1deg);
        }

        .fp-product-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 13px 16px;
          border-bottom: 1px solid var(--border);
          background: #FBFAFF;
        }

        .fp-product-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--ink);
          font-size: 11px;
          font-weight: 800;
        }

        .fp-product-brand img {
          width: 24px;
          height: 24px;
          object-fit: contain;
        }

        .fp-product-online {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--muted);
          font-size: 9px;
          font-weight: 700;
        }

        .fp-product-online i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent2);
          box-shadow: 0 0 0 4px rgba(18,183,106,.10);
        }

        .fp-product-body {
          display: grid;
          grid-template-columns: 86px 1fr;
          min-height: 390px;
        }

        .fp-product-side {
          padding: 16px 10px;
          border-right: 1px solid var(--border);
          background: #FAF9FF;
        }

        .fp-product-side strong {
          display: block;
          margin: 2px 4px 14px;
          color: var(--muted);
          font-size: 8px;
          letter-spacing: .07em;
          text-transform: uppercase;
        }

        .fp-product-side span {
          width: 100%;
          height: 38px;
          display: grid;
          place-items: center;
          margin-bottom: 6px;
          border-radius: 10px;
          color: var(--muted);
        }

        .fp-product-side span.active {
          color: var(--accent);
          background: var(--accent-soft);
        }

        .fp-product-main {
          padding: 24px;
        }

        .fp-product-heading small,
        .fp-product-heading strong {
          display: block;
        }

        .fp-product-heading small {
          color: var(--muted);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .fp-product-heading strong {
          margin-top: 3px;
          color: var(--ink);
          font-size: 18px;
        }

        .fp-product-stats {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 9px;
          margin-top: 20px;
        }

        .fp-product-stat {
          padding: 14px 13px;
          border-radius: 14px;
          background: var(--surface);
        }

        .fp-product-stat span,
        .fp-product-stat strong {
          display: block;
        }

        .fp-product-stat span {
          color: var(--muted);
          font-size: 8px;
        }

        .fp-product-stat strong {
          margin-top: 4px;
          color: var(--ink);
          font-size: 12px;
        }

        .fp-product-list {
          margin-top: 14px;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 15px;
        }

        .fp-product-row {
          display: grid;
          grid-template-columns: 34px 1fr auto;
          gap: 10px;
          align-items: center;
          padding: 12px 13px;
          border-top: 1px solid var(--border);
        }

        .fp-product-row:first-child {
          border-top: 0;
        }

        .fp-product-row > span {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          color: var(--accent);
          background: var(--accent-soft);
        }

        .fp-product-row strong,
        .fp-product-row small {
          display: block;
        }

        .fp-product-row strong {
          color: var(--text);
          font-size: 10px;
        }

        .fp-product-row small {
          margin-top: 2px;
          color: var(--muted);
          font-size: 8.5px;
        }

        .fp-product-row > svg {
          color: var(--accent2);
        }

        .fp-float {
          position: absolute;
          z-index: 4;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 11px 13px;
          border: 1px solid rgba(255,255,255,.75);
          border-radius: 14px;
          color: var(--accent);
          background: rgba(255,255,255,.95);
          box-shadow: 0 18px 46px rgba(4,1,20,.26);
          backdrop-filter: blur(12px);
        }

        .fp-float strong,
        .fp-float small {
          display: block;
        }

        .fp-float strong {
          color: var(--ink);
          font-size: 10.5px;
        }

        .fp-float small {
          margin-top: 1px;
          color: var(--muted);
          font-size: 8.5px;
        }

        .fp-float-ai {
          left: 4px;
          top: 4px;
        }

        .fp-float-reminder {
          right: -16px;
          bottom: 18px;
          color: var(--accent2);
        }

        .fp-stats {
          position: relative;
          z-index: 2;
          margin-top: -36px;
        }

        .fp-stats-inner {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 22px;
          background: rgba(255,255,255,.96);
          box-shadow: 0 20px 60px rgba(18,12,46,.10);
          backdrop-filter: blur(16px);
        }

        .fp-stat {
          padding: 24px;
          text-align: center;
        }

        .fp-stat + .fp-stat {
          border-left: 1px solid var(--border);
        }

        .fp-stat strong {
          display: block;
          color: var(--accent);
          font-family: 'Plus Jakarta Sans',sans-serif;
          font-size: clamp(24px,3vw,34px);
          letter-spacing: -.04em;
        }

        .fp-stat span {
          display: block;
          margin-top: 5px;
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
        }

        .fp-section {
          position: relative;
          padding: clamp(84px,8vw,120px) 0;
        }

        .fp-section-head {
          max-width: 760px;
          margin-bottom: clamp(38px,5vw,58px);
        }

        .fp-section-head.center {
          margin-left: auto;
          margin-right: auto;
          text-align: center;
        }

        .fp-section-head .tag {
          margin-bottom: 18px;
        }

        .fp-section-head h2,
        .fp-flow-copy h2,
        .fp-ai-copy h2,
        .fp-final-copy h2 {
          font-family: 'Plus Jakarta Sans','Inter',sans-serif;
          font-size: clamp(30px,4vw,48px);
          line-height: 1.08;
          letter-spacing: -.045em;
          font-weight: 800;
        }

        .fp-section-head p {
          max-width: 650px;
          margin-top: 16px;
          color: var(--muted);
          font-size: 16px;
          line-height: 1.75;
        }

        .fp-section-head.center p {
          margin-left: auto;
          margin-right: auto;
        }

        .fp-features {
          background:
            radial-gradient(circle at 90% 5%, rgba(109,66,245,.07), transparent 28%),
            #fff;
        }

        .fp-feature-grid {
          display: grid;
          grid-template-columns: repeat(12,1fr);
          gap: 16px;
        }

        .fp-feature-card {
          position: relative;
          overflow: hidden;
          grid-column: span 4;
          min-height: 235px;
          padding: 24px;
          border: 1px solid var(--border);
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 14px 42px rgba(18,12,46,.05);
          transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
        }

        .fp-feature-card:hover {
          transform: translateY(-5px);
          border-color: #D9D0FB;
          box-shadow: 0 24px 60px rgba(18,12,46,.10);
        }

        .fp-feature-card:nth-child(1),
        .fp-feature-card:nth-child(2) {
          grid-column: span 6;
          min-height: 270px;
        }

        .fp-feature-card::after {
          content: '';
          position: absolute;
          width: 150px;
          height: 150px;
          right: -70px;
          bottom: -70px;
          border-radius: 50%;
          background: var(--accent-soft);
          opacity: .55;
        }

        .fp-feature-icon {
          position: relative;
          z-index: 1;
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          margin-bottom: 24px;
          border-radius: 14px;
        }

        .fp-feature-card h3 {
          position: relative;
          z-index: 1;
          margin-bottom: 10px;
          color: var(--text);
          font-size: 16px;
          font-weight: 800;
        }

        .fp-feature-card p {
          position: relative;
          z-index: 1;
          max-width: 420px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .fp-feature-link {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 18px;
          color: var(--accent);
          font-size: 11.5px;
          font-weight: 800;
        }

        .fp-flow {
          overflow: hidden;
          background: var(--surface);
        }

        .fp-flow-grid {
          display: grid;
          grid-template-columns: minmax(280px,.78fr) minmax(0,1.22fr);
          gap: clamp(52px,7vw,92px);
          align-items: center;
        }

        .fp-flow-copy .tag {
          margin-bottom: 20px;
        }

        .fp-flow-copy > p {
          max-width: 520px;
          margin-top: 17px;
          color: var(--muted);
          font-size: 15px;
          line-height: 1.75;
        }

        .fp-flow-list {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .fp-flow-list::before {
          content: '';
          position: absolute;
          left: 24px;
          top: 40px;
          bottom: 40px;
          width: 1px;
          background: linear-gradient(#CEC3F6, #E7E2F7);
        }

        .fp-flow-item {
          position: relative;
          display: grid;
          grid-template-columns: 50px 1fr;
          gap: 16px;
          align-items: center;
          min-height: 120px;
          padding: 20px;
          border: 1px solid var(--border);
          border-radius: 20px;
          background: rgba(255,255,255,.88);
          box-shadow: 0 14px 40px rgba(18,12,46,.05);
        }

        .fp-flow-icon {
          position: relative;
          z-index: 1;
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: var(--accent);
          background: var(--accent-soft);
        }

        .fp-flow-item strong {
          display: block;
          color: var(--text);
          font-size: 14px;
        }

        .fp-flow-item p {
          margin-top: 5px;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.6;
        }

        .fp-ai {
          position: relative;
          overflow: hidden;
          padding: clamp(88px,9vw,128px) 0;
          color: #fff;
          background:
            radial-gradient(circle at 82% 16%, rgba(18,183,106,.13), transparent 22%),
            radial-gradient(circle at 12% 80%, rgba(109,66,245,.24), transparent 28%),
            linear-gradient(135deg, #0C0825 0%, #15103A 52%, #24175D 100%);
        }

        .fp-ai-grid {
          display: grid;
          grid-template-columns: minmax(0,.82fr) minmax(0,1.18fr);
          gap: clamp(48px,7vw,88px);
          align-items: center;
        }

        .fp-ai-copy .fp-ai-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 20px;
          color: #95E8BF;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .07em;
          text-transform: uppercase;
        }

        .fp-ai-copy h2 {
          color: #fff;
        }

        .fp-ai-copy h2 span {
          color: #BCA9FF;
        }

        .fp-ai-copy > p {
          max-width: 560px;
          margin-top: 18px;
          color: rgba(255,255,255,.64);
          font-size: 15px;
          line-height: 1.75;
        }

        .fp-ai-safety {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          max-width: 520px;
          margin-top: 22px;
          padding: 13px 15px;
          border: 1px solid rgba(142,230,186,.16);
          border-radius: 14px;
          color: rgba(255,255,255,.62);
          background: rgba(18,183,106,.07);
          font-size: 11.5px;
          line-height: 1.6;
        }

        .fp-ai-safety svg {
          margin-top: 2px;
          color: #8EE6BA;
          flex-shrink: 0;
        }

        .fp-ai-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 24px;
          padding: 12px 18px;
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 999px;
          color: #fff;
          background: rgba(255,255,255,.07);
          font-weight: 800;
          font-size: 12px;
          cursor: pointer;
        }

        .fp-ai-chat {
          position: relative;
          max-width: 620px;
          margin-left: auto;
          padding: 18px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 28px;
          background: rgba(255,255,255,.06);
          box-shadow: 0 30px 80px rgba(0,0,0,.24);
          backdrop-filter: blur(18px);
        }

        .fp-ai-window {
          overflow: hidden;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 18px 48px rgba(0,0,0,.20);
        }

        .fp-ai-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 16px 18px;
          border-bottom: 1px solid var(--border);
          background: #FBFAFF;
        }

        .fp-ai-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .fp-ai-brand > span {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: var(--accent);
          background: var(--accent-soft);
        }

        .fp-ai-brand strong,
        .fp-ai-brand small {
          display: block;
        }

        .fp-ai-brand strong {
          color: var(--ink);
          font-size: 12.5px;
        }

        .fp-ai-brand small {
          margin-top: 2px;
          color: var(--accent2);
          font-size: 9.5px;
        }

        .fp-ai-head > small {
          color: var(--muted);
          font-size: 8.5px;
        }

        .fp-ai-messages {
          padding: 20px;
        }

        .fp-message {
          display: flex;
          margin-bottom: 10px;
        }

        .fp-message.user {
          justify-content: flex-end;
        }

        .fp-message > div {
          max-width: 82%;
          padding: 11px 13px;
          border-radius: 16px;
          color: var(--muted);
          background: var(--surface);
          font-size: 11.5px;
          line-height: 1.55;
        }

        .fp-message.user > div {
          color: #fff;
          background: var(--accent);
          border-bottom-right-radius: 5px;
        }

        .fp-message.ai > div {
          border: 1px solid var(--border);
          border-bottom-left-radius: 5px;
        }

        .fp-ai-result {
          display: grid;
          grid-template-columns: 36px 1fr auto;
          gap: 10px;
          align-items: center;
          margin: 4px 20px 20px;
          padding: 12px;
          border: 1px solid #CFEEDD;
          border-radius: 14px;
          background: #F2FBF6;
        }

        .fp-ai-result > span {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          color: #0D9155;
          background: #E4F8EE;
        }

        .fp-ai-result strong,
        .fp-ai-result small {
          display: block;
        }

        .fp-ai-result strong {
          color: var(--ink);
          font-size: 10px;
        }

        .fp-ai-result small {
          margin-top: 2px;
          color: var(--muted);
          font-size: 8.5px;
        }

        .fp-ai-result > svg {
          color: var(--accent2);
        }

        .fp-final {
          position: relative;
          overflow: hidden;
          padding: clamp(76px,8vw,110px) 0;
          background:
            radial-gradient(circle at 18% 20%, rgba(109,66,245,.10), transparent 28%),
            linear-gradient(180deg, #FAF9FF 0%, #F3F0FF 100%);
        }

        .fp-final-card {
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
            radial-gradient(circle at 86% 14%, rgba(109,66,245,.28), transparent 30%),
            linear-gradient(135deg, #0D0827 0%, #17103D 52%, #261B67 100%);
          box-shadow: 0 34px 90px rgba(18,12,46,.19);
        }

        .fp-final-card::after {
          content: '';
          position: absolute;
          width: 300px;
          height: 300px;
          right: -80px;
          bottom: -120px;
          border-radius: 50%;
          border: 50px solid rgba(255,255,255,.035);
        }

        .fp-final-copy,
        .fp-final-points {
          position: relative;
          z-index: 1;
        }

        .fp-final-copy > span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 18px;
          color: #C9B9FF;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .07em;
          text-transform: uppercase;
        }

        .fp-final-copy h2 {
          color: #fff;
        }

        .fp-final-copy h2 span {
          color: #BCA9FF;
        }

        .fp-final-copy p {
          max-width: 540px;
          margin-top: 17px;
          color: rgba(255,255,255,.62);
          font-size: 15px;
          line-height: 1.75;
        }

        .fp-final-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 27px;
        }

        .fp-final-copy small {
          display: block;
          margin-top: 13px;
          color: rgba(255,255,255,.38);
          font-size: 10.5px;
        }

        .fp-final-points {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .fp-final-point {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px 16px;
          border: 1px solid rgba(255,255,255,.10);
          border-radius: 17px;
          background: rgba(255,255,255,.055);
          backdrop-filter: blur(10px);
        }

        .fp-final-point > span {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 10px;
          color: #9BFFCB;
          background: rgba(18,183,106,.10);
        }

        .fp-final-point strong,
        .fp-final-point small {
          display: block;
        }

        .fp-final-point strong {
          color: #fff;
          font-size: 11.5px;
        }

        .fp-final-point small {
          margin-top: 2px;
          color: rgba(255,255,255,.46);
          font-size: 9.5px;
        }

        @media (max-width: 980px) {
          .fp-hero-grid,
          .fp-flow-grid,
          .fp-ai-grid,
          .fp-final-card {
            grid-template-columns: 1fr;
          }

          .fp-hero-grid {
            padding-top: 66px;
          }

          .fp-product {
            min-height: 500px;
          }

          .fp-product-window {
            left: 0;
            right: auto;
            width: min(92%, 650px);
          }

          .fp-flow-copy,
          .fp-ai-copy {
            max-width: 650px;
          }

          .fp-ai-chat {
            margin-left: 0;
          }
        }

        @media (max-width: 760px) {
          .fp-hero {
            min-height: auto;
          }

          .fp-hero h1 {
            font-size: clamp(42px,12vw,58px);
          }

          .fp-product {
            min-height: 420px;
          }

          .fp-product-window {
            top: 44px;
            width: 100%;
            transform: none;
          }

          .fp-float-ai {
            top: 0;
            left: auto;
            right: 10px;
          }

          .fp-float-reminder {
            display: none;
          }

          .fp-stats {
            margin-top: -18px;
          }

          .fp-feature-grid {
            grid-template-columns: 1fr 1fr;
          }

          .fp-feature-card,
          .fp-feature-card:nth-child(1),
          .fp-feature-card:nth-child(2) {
            grid-column: auto;
            min-height: 240px;
          }
        }

        @media (max-width: 560px) {
          .fp-hero-actions {
            flex-direction: column;
          }

          .fp-primary,
          .fp-secondary {
            width: 100%;
          }

          .fp-product-body {
            grid-template-columns: 60px 1fr;
          }

          .fp-product-side strong {
            display: none;
          }

          .fp-product-main {
            padding: 16px;
          }

          .fp-product-stats {
            grid-template-columns: 1fr 1fr;
          }

          .fp-product-stat:last-child {
            display: none;
          }

          .fp-stats-inner {
            grid-template-columns: 1fr;
          }

          .fp-stat + .fp-stat {
            border-left: 0;
            border-top: 1px solid var(--border);
          }

          .fp-feature-grid {
            grid-template-columns: 1fr;
          }

          .fp-feature-card,
          .fp-feature-card:nth-child(1),
          .fp-feature-card:nth-child(2) {
            min-height: auto;
          }

          .fp-section {
            padding: 72px 0;
          }

          .fp-final-actions {
            flex-direction: column;
          }

          .fp-ai-chat {
            padding: 10px;
            border-radius: 22px;
          }
        }
      `}</style>

      <main className="fp-page">
        {/* ═══ HERO ═══ */}
        <section className="fp-hero">
          <div className="fp-hero-glow fp-hero-glow-a" aria-hidden="true" />
          <div className="fp-hero-glow fp-hero-glow-b" aria-hidden="true" />

          <div className="wrap fp-hero-grid">
            <Reveal className="fp-hero-copy">
              <span className="fp-kicker">
                <LayoutDashboard size={14} />
                Tudo conectado em uma única plataforma
              </span>

              <h1>
                Menos ferramentas.
                <br />
                <span>Mais fluidez</span> na rotina.
              </h1>

              <p>
                Da agenda ao financeiro, a Plaelo conecta o que acontece antes,
                durante e depois de cada atendimento para reduzir tarefas manuais
                e deixar sua operação mais simples.
              </p>

              <div className="fp-hero-actions">
                <button className="fp-primary" onClick={go}>
                  Começar grátis por 14 dias
                  <ArrowRight size={17} />
                </button>

                <button
                  className="fp-secondary"
                  onClick={() =>
                    document
                      .getElementById('recursos')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  Explorar recursos
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="fp-hero-note">
                <span><CheckCircle size={13} /> Sem cartão de crédito</span>
                <span><CheckCircle size={13} /> Sem fidelidade</span>
                <span><ShieldCheck size={13} /> Privacidade e LGPD</span>
              </div>
            </Reveal>

            <Reveal delay={100} className="fp-product">
              <div className="fp-product-window">
                <div className="fp-product-top">
                  <div className="fp-product-brand">
                    <img src={logoUrl} alt="" />
                    <span>Plaelo</span>
                  </div>

                  <span className="fp-product-online">
                    <i /> Tudo sincronizado
                  </span>
                </div>

                <div className="fp-product-body">
                  <aside className="fp-product-side">
                    <strong>Menu</strong>
                    <span className="active"><LayoutDashboard size={15} /></span>
                    <span><Calendar size={15} /></span>
                    <span><HeartHandshake size={15} /></span>
                    <span><BarChart3 size={15} /></span>
                    <span><FileText size={15} /></span>
                  </aside>

                  <div className="fp-product-main">
                    <div className="fp-product-heading">
                      <small>Visão geral</small>
                      <strong>Sua rotina hoje</strong>
                    </div>

                    <div className="fp-product-stats">
                      <div className="fp-product-stat">
                        <span>Agenda</span>
                        <strong>Organizada</strong>
                      </div>
                      <div className="fp-product-stat">
                        <span>Financeiro</span>
                        <strong>Em dia</strong>
                      </div>
                      <div className="fp-product-stat">
                        <span>Documentos</span>
                        <strong>Centralizados</strong>
                      </div>
                    </div>

                    <div className="fp-product-list">
                      <div className="fp-product-row">
                        <span><Calendar size={15} /></span>
                        <div>
                          <strong>Próximo atendimento</strong>
                          <small>10:30 · Online</small>
                        </div>
                        <CheckCircle size={14} />
                      </div>

                      <div className="fp-product-row">
                        <span><Receipt size={15} /></span>
                        <div>
                          <strong>NFS-e</strong>
                          <small>Pronta para emissão</small>
                        </div>
                        <CheckCircle size={14} />
                      </div>

                      <div className="fp-product-row">
                        <span><MessageCircle size={15} /></span>
                        <div>
                          <strong>Lembrete automático</strong>
                          <small>Paciente avisado pelo WhatsApp</small>
                        </div>
                        <CheckCircle size={14} />
                      </div>

                      <div className="fp-product-row">
                        <span><Sparkles size={15} /></span>
                        <div>
                          <strong>Bia IA</strong>
                          <small>Resumo disponível para revisão</small>
                        </div>
                        <CheckCircle size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="fp-float fp-float-ai">
                <Sparkles size={16} />
                <div>
                  <strong>Bia IA</strong>
                  <small>apoio dentro da plataforma</small>
                </div>
              </div>

              <div className="fp-float fp-float-reminder">
                <CheckCircle size={16} />
                <div>
                  <strong>Lembrete enviado</strong>
                  <small>automação concluída</small>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══ NÚMEROS ═══ */}
        <section className="fp-stats">
          <div className="wrap">
            <div className="fp-stats-inner">
              {STATS.map((item, index) => (
                <Reveal className="fp-stat" key={item.label} delay={index * 80}>
                  <strong>
                    {item.value !== null ? (
                      <AnimatedNumber value={item.value} suffix={item.suffix} />
                    ) : (
                      item.display
                    )}
                  </strong>
                  <span>{item.label}</span>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ RECURSOS ═══ */}
        <section id="recursos" className="fp-section fp-features">
          <div className="wrap">
            <Reveal className="fp-section-head">
              <span className="tag">Recursos da plataforma</span>
              <h2>Não são módulos soltos. É uma rotina inteira conectada.</h2>
              <p>
                Cada recurso da Plaelo conversa com os outros para reduzir
                retrabalho e manter informações importantes no mesmo fluxo.
              </p>
            </Reveal>

            <div className="fp-feature-grid">
              {features.map(({ icon: Icon, title, desc, color, bg }, index) => (
                <Reveal
                  className="fp-feature-card"
                  key={title}
                  delay={index * 45}
                >
                  <div className="fp-feature-icon" style={{ color, background: bg }}>
                    <Icon size={20} />
                  </div>

                  <h3>{title}</h3>
                  <p>{desc}</p>

                  <span className="fp-feature-link">
                    Integrado à Plaelo
                    <ChevronRight size={14} />
                  </span>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FLUXO ═══ */}
        <section className="fp-section fp-flow">
          <div className="wrap fp-flow-grid">
            <Reveal className="fp-flow-copy">
              <span className="tag">Do início ao fim</span>
              <h2>O atendimento muda de etapa. A informação acompanha.</h2>
              <p>
                Em vez de repetir dados entre ferramentas, a Plaelo mantém o fluxo
                conectado para facilitar o trabalho clínico e administrativo.
              </p>
            </Reveal>

            <div className="fp-flow-list">
              {FLOW.map(({ icon: Icon, title, text }, index) => (
                <Reveal className="fp-flow-item" key={title} delay={index * 90}>
                  <div className="fp-flow-icon">
                    <Icon size={19} />
                  </div>

                  <div>
                    <strong>{title}</strong>
                    <p>{text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ AURORA IA ═══ */}
        <section className="fp-ai">
          <div className="wrap fp-ai-grid">
            <Reveal className="fp-ai-copy">
              <span className="fp-ai-kicker">
                <Sparkles size={14} />
                Inteligência artificial integrada
              </span>

              <h2>
                Conheça a <span>Bia</span>, a IA que apoia sua rotina.
              </h2>

              <p>
                A Bia ajuda a organizar informações, estruturar documentos e
                apoiar tarefas dentro da plataforma. O profissional continua no
                centro das decisões e revisa o que será utilizado.
              </p>

              <div className="fp-ai-safety">
                <Lock size={15} />
                <span>
                  A IA funciona como apoio. A avaliação, revisão e decisão clínica
                  permanecem sob responsabilidade do profissional.
                </span>
              </div>

              <button className="fp-ai-button" onClick={go}>
                Conhecer a Bia
                <ChevronRight size={16} />
              </button>
            </Reveal>

            <Reveal delay={100} className="fp-ai-chat">
              <div className="fp-ai-window">
                <div className="fp-ai-head">
                  <div className="fp-ai-brand">
                    <span><Sparkles size={16} /></span>
                    <div>
                      <strong>Bia IA</strong>
                      <small>Disponível na Plaelo</small>
                    </div>
                  </div>

                  <small>Conteúdo para revisão</small>
                </div>

                <div className="fp-ai-messages">
                  <div className="fp-message ai">
                    <div>
                      Posso organizar as informações registradas neste atendimento
                      e preparar uma estrutura para sua revisão.
                    </div>
                  </div>

                  <div className="fp-message user">
                    <div>
                      Organize os principais pontos e deixe separado por tema.
                    </div>
                  </div>

                  <div className="fp-message ai">
                    <div>
                      Pronto. Estruturei os registros em tópicos para você revisar
                      antes de salvar no prontuário.
                    </div>
                  </div>
                </div>

                <div className="fp-ai-result">
                  <span><FileText size={15} /></span>
                  <div>
                    <strong>Resumo estruturado</strong>
                    <small>aguardando revisão do profissional</small>
                  </div>
                  <CheckCircle size={15} />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══ CTA FINAL ═══ */}
        <section className="fp-final">
          <div className="wrap">
            <Reveal className="fp-final-card">
              <div className="fp-final-copy">
                <span>
                  <Sparkles size={14} />
                  Veja a Plaelo funcionando
                </span>

                <h2>
                  Recursos que fazem sentido
                  <span> quando trabalham juntos.</span>
                </h2>

                <p>
                  Experimente a plataforma e veja como agenda, prontuário,
                  financeiro, documentos, automações e IA podem fazer parte do
                  mesmo fluxo de trabalho.
                </p>

                <div className="fp-final-actions">
                  <button className="fp-primary" onClick={go}>
                    Começar grátis por 14 dias
                    <ArrowRight size={17} />
                  </button>

                  <button className="fp-secondary" onClick={go}>
                    Acessar o sistema
                  </button>
                </div>

                <small>Sem cartão de crédito. Sem fidelidade.</small>
              </div>

              <div className="fp-final-points">
                {[
                  {
                    icon: LayoutDashboard,
                    title: 'Tudo em um só lugar',
                    text: 'Menos alternância entre sistemas.',
                  },
                  {
                    icon: Sparkles,
                    title: 'Bia IA integrada',
                    text: 'Apoio dentro da própria rotina.',
                  },
                  {
                    icon: ShieldCheck,
                    title: 'Privacidade em foco',
                    text: 'Estrutura pensada para dados sensíveis.',
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <div className="fp-final-point" key={title}>
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
