import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Calendar, Video, FileText, Users, BarChart2, Shield,
  CheckCircle, ArrowRight, Menu, X, MessageSquare,
  ClipboardList, Sparkles, Heart, Brain, ChevronRight, Lock,
} from 'lucide-react';
import logoUrl from '../images/logo-psiflux.png';

/* ─── Static data ─── */
const features = [
  { icon: Calendar,      title: 'Agenda Inteligente',  desc: 'Consultas, lembretes automáticos e controle de horários por profissional.', color: '#6355D8', bg: '#EEF0FF' },
  { icon: Video,         title: 'Salas Virtuais',       desc: 'Teleconsulta com lousa interativa, chat e compartilhamento de tela.',       color: '#0EA98B', bg: '#E6F7F4' },
  { icon: Users,         title: 'Prontuário Digital',   desc: 'Histórico clínico, evolução do paciente e documentos em um só lugar.',      color: '#6355D8', bg: '#EEF0FF' },
  { icon: FileText,      title: 'Documentos & PEI',     desc: 'Planos educacionais individualizados e relatórios com um clique.',          color: '#0EA98B', bg: '#E6F7F4' },
  { icon: BarChart2,     title: 'Financeiro',           desc: 'Receitas, despesas, comandas e relatórios financeiros detalhados.',         color: '#6355D8', bg: '#EEF0FF' },
  { icon: Sparkles,      title: 'Aurora IA',            desc: 'Organiza dados clínicos e automatiza relatórios — o julgamento é sempre seu.', color: '#0EA98B', bg: '#E6F7F4' },
  { icon: ClipboardList, title: 'Formulários',          desc: 'Anamneses digitais, avaliações e formulários personalizados.',              color: '#6355D8', bg: '#EEF0FF' },
  { icon: MessageSquare, title: 'Mensagens',            desc: 'Comunicação interna e notificações automáticas para pacientes.',            color: '#0EA98B', bg: '#E6F7F4' },
];

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface Plan {
  id: number;
  name: string;
  description: string | null;
  price: number;
  max_users: number;
  features: string[];
  highlighted: boolean | number;
}

const FEATURE_LABELS: Record<string, string> = {
  agenda: 'Agenda completa',
  pacientes: 'Gestão de pacientes',
  prontuario: 'Prontuário digital',
  formularios: 'Formulários e anamneses',
  salas_virtuais: 'Salas virtuais (teleconsulta)',
  pei: 'PEI e documentos clínicos',
  ferramentas_clinicas: 'Ferramentas clínicas',
  estudos_de_caso: 'Estudos de caso',
  documentos: 'Documentos e encaminhamentos',
  financeiro: 'Financeiro & Livro Caixa',
  relatorios: 'Relatórios & Desempenho',
  mensagens: 'Mensagens internas',
  aurora_ia: 'Aurora IA',
  whatsapp_bot: 'WhatsApp Bot',
  profissionais: 'Múltiplos profissionais',
  servicos: 'Serviços e produtos',
  comandas: 'Comandas',
  instrumentos: 'Instrumentos (DISC, DASS-21)',
};

const painPoints = [
  'Prontuários dispersos em papéis ou planilhas',
  'Conflitos de horário na agenda',
  'Processos repetitivos que roubam tempo de atendimento',
  'Ferramentas desconectadas entre si',
];

/* ─── Logo ─── */
const Logo = ({ size = 44 }: { size?: number }) => (
  <div className="flex items-center gap-2.5">
    <img src={logoUrl} alt="PsiFlux" style={{ width: size, height: size }} className="rounded-xl object-contain" />
    <span className="font-bold text-xl" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>PsiFlux</span>
  </div>
);

/* ─── Main ─── */
export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/plans`)
      .then(r => r.json())
      .then((data: Plan[]) => { if (Array.isArray(data)) setPlans(data); })
      .catch(() => {});
  }, []);

  const go = () => navigate(isAuthenticated ? '/dashboard' : '/login');

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: '#fff', color: '#0F172A', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --accent: #6355D8;
          --accent2: #0EA98B;
          --text: #0F172A;
          --muted: #64748B;
          --border: #E2E8F0;
          --surface: #F7F8FC;
          --surface2: #EEF0F8;
        }
        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
        }

        /* Buttons */
        .btn-p {
          display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
          background: var(--accent); color: #fff; border: none;
          font-weight: 700; font-size: 15px; letter-spacing: -0.01em;
          padding: 14px 28px; border-radius: 14px;
          box-shadow: 0 2px 12px rgba(99,85,216,.28);
          transition: background .15s, transform .15s, box-shadow .15s;
        }
        .btn-p:hover { background: #5447C4; transform: translateY(-2px); box-shadow: 0 6px 24px rgba(99,85,216,.35); }
        .btn-p:focus-visible { outline: 3px solid rgba(99,85,216,.4); outline-offset: 2px; }
        .btn-g {
          display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
          background: #fff; color: var(--text); border: 1.5px solid var(--border);
          font-weight: 600; font-size: 15px;
          padding: 13px 28px; border-radius: 14px;
          transition: border-color .15s, box-shadow .15s;
        }
        .btn-g:hover { border-color: var(--accent); box-shadow: 0 2px 12px rgba(99,85,216,.1); }
        .btn-g:focus-visible { outline: 3px solid rgba(99,85,216,.3); outline-offset: 2px; }

        /* Nav */
        .nav-a {
          font-size: 14px; font-weight: 500; color: var(--muted);
          text-decoration: none; transition: color .15s;
        }
        .nav-a:hover { color: var(--text); }
        .nav-a:focus-visible { outline: 2px solid var(--accent); border-radius: 4px; }

        /* Tags/eyebrows */
        .tag {
          display: inline-flex; align-items: center; gap: 6px;
          background: #EEF0FF; color: var(--accent);
          font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
          padding: 5px 13px; border-radius: 999px;
        }
        .tag-green { background: #E6F7F4; color: var(--accent2); }

        /* Cards */
        .card {
          background: #fff; border: 1px solid var(--border); border-radius: 20px;
          padding: 28px; transition: box-shadow .2s, transform .2s;
        }
        .card:hover { box-shadow: 0 8px 32px rgba(99,85,216,.10); transform: translateY(-3px); }

        /* Layout */
        .wrap  { max-width: 1180px; margin: 0 auto; padding: 0 24px; }
        .wrap-sm { max-width: 860px; margin: 0 auto; padding: 0 24px; }
        .wrap-xs { max-width: 660px; margin: 0 auto; padding: 0 24px; }
        @media (max-width: 640px) {
          .wrap, .wrap-sm, .wrap-xs { padding: 0 16px; }
        }

        /* Section spacing */
        .section { padding: clamp(64px, 8vw, 112px) 0; }
        .section + .section { border-top: 1px solid var(--border); }

        /* Divider label */
        .divider-label {
          display: flex; align-items: center; gap: 12px;
          font-size: 11px; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase; color: var(--muted);
        }
        .divider-label::before, .divider-label::after {
          content: ''; flex: 1; height: 1px; background: var(--border);
        }

        /* Feature grid */
        .feat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }

        /* Plan grid */
        .plan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; align-items: center; max-width: 900px; margin: 0 auto; }
        @media (max-width: 720px) { .plan-grid { grid-template-columns: 1fr; max-width: 420px; } }

        /* Testimonials */
        .testi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }

        /* Responsive two-col grid */
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(40px,6vw,80px); align-items: center; }
        @media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } }

        /* Mockup */
        .mock-sidebar { display: flex; }
        @media (max-width: 600px) { .mock-sidebar { display: none; } }

        /* Aurora gradient band */
        .aurora-band {
          background: linear-gradient(135deg, #F0EEFF 0%, #E8F8F5 100%);
          border-radius: 28px; overflow: hidden;
        }

        /* Mobile menu */
        .mob-menu {
          background: #fff; border-top: 1px solid var(--border);
          padding: 16px 24px 24px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .mob-menu a {
          display: block; padding: 12px 0; font-size: 15px; font-weight: 500;
          color: var(--muted); border-bottom: 1px solid var(--border);
          text-decoration: none; transition: color .15s;
        }
        .mob-menu a:hover { color: var(--text); }

        /* Accent underline on hero */
        .hero-accent { color: var(--accent); position: relative; display: inline-block; }
        .hero-accent::after {
          content: ''; position: absolute; left: 0; bottom: -4px;
          width: 100%; height: 4px; border-radius: 2px;
          background: linear-gradient(90deg, var(--accent) 0%, var(--accent2) 100%);
        }

        /* Subtle dot grid background for hero */
        .hero-bg {
          background-color: #fff;
          background-image: radial-gradient(circle, #CBD5E1 1px, transparent 1px);
          background-size: 28px 28px;
        }

        /* Floating stat chips */
        .stat-chip {
          background: #fff; border: 1px solid var(--border); border-radius: 14px;
          padding: 12px 20px; display: flex; align-items: center; gap: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,.06);
          white-space: nowrap;
        }
      `}</style>

      {/* ═══ NAVBAR ═══ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: scrolled ? 'rgba(255,255,255,0.95)' : '#fff',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: `1px solid ${scrolled ? '#E2E8F0' : 'transparent'}`,
        transition: 'border-color .3s, box-shadow .3s',
        boxShadow: scrolled ? '0 1px 16px rgba(0,0,0,.06)' : 'none',
      }}>
        <div className="wrap" style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo />

          {/* Desktop links */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: 32 }}>
            <a href="#historia" className="nav-a">Nossa história</a>
            <a href="#funcionalidades" className="nav-a">Funcionalidades</a>
            <a href="#planos" className="nav-a">Planos</a>
            <a href="/encontrar-psicologo" className="nav-a" style={{ color: 'var(--accent)', fontWeight: 600 }}>Encontrar Psicólogo</a>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: 10 }}>
            <button onClick={go} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: 'var(--muted)', padding: '8px 12px', transition: 'color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
              Entrar
            </button>
            <button className="btn-p" onClick={go} style={{ padding: '10px 20px', fontSize: 14 }}>
              Demo gratuita <ArrowRight size={15} />
            </button>
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: 'var(--muted)' }}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="mob-menu">
            {[['#historia', 'Nossa história'], ['#funcionalidades', 'Funcionalidades'], ['#planos', 'Planos'], ['/encontrar-psicologo', 'Encontrar Psicólogo']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>
            ))}
            <button className="btn-p" onClick={go} style={{ marginTop: 14, justifyContent: 'center' }}>
              Demo gratuita <ArrowRight size={16} />
            </button>
          </div>
        )}
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="hero-bg" style={{ padding: 'clamp(72px,9vw,120px) 0 clamp(56px,7vw,96px)', position: 'relative', overflow: 'hidden' }}>
        {/* Colour blobs */}
        <div style={{ position: 'absolute', top: -120, right: -80, width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,85,216,.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -60, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,169,139,.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="wrap-xs" style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{ marginBottom: 24 }}>
            <span className="tag">
              <Brain size={13} /> Psicologia clínica &amp; neuropsicologia
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(36px,6vw,76px)', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.06, marginBottom: 22, color: 'var(--text)' }}>
            O sistema criado<br />
            <span className="hero-accent">com psicólogos,</span><br />
            para psicólogos.
          </h1>

          <p style={{ fontSize: 'clamp(16px,2vw,19px)', lineHeight: 1.7, color: 'var(--muted)', maxWidth: 540, margin: '0 auto 36px' }}>
            Agenda, prontuário, teleconsulta, financeiro e IA — tudo em uma plataforma desenvolvida desde o início com participação ativa de profissionais da área.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 40 }}>
            <button className="btn-p" onClick={go}>
              Quero uma demonstração <ArrowRight size={17} />
            </button>
            <button className="btn-g" onClick={go}>Acessar o sistema</button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 20px', fontSize: 13, color: 'var(--muted)' }}>
            {[['Sem fidelidade', '#0EA98B'], ['IA inclusa', '#0EA98B'], ['LGPD compliant', '#0EA98B']].map(([label, c]) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle size={13} style={{ color: c }} /> {label}
              </span>
            ))}
          </div>
        </div>

        {/* App mockup */}
        <div className="wrap" style={{ marginTop: 'clamp(48px,6vw,80px)' }}>
          <div style={{
            background: '#fff', borderRadius: 24,
            border: '1px solid #E2E8F0',
            boxShadow: '0 24px 80px rgba(99,85,216,.12), 0 4px 20px rgba(0,0,0,.06)',
            overflow: 'hidden',
          }}>
            {/* Browser bar */}
            <div style={{ height: 42, background: '#F7F8FC', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px' }}>
              {['#FF5F57', '#FFBD2E', '#28C840'].map(c => (
                <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c, opacity: .85 }} />
              ))}
              <div style={{ marginLeft: 14, flex: 1, maxWidth: 220, height: 24, background: '#EEF0F8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#94A3B8' }}>
                psiflux.com.br
              </div>
            </div>
            {/* Layout */}
            <div style={{ display: 'flex', height: 'clamp(180px,26vw,290px)' }}>
              {/* Sidebar */}
              <div className="mock-sidebar" style={{ width: 164, background: '#F7F8FC', borderRight: '1px solid #E2E8F0', flexDirection: 'column', padding: '16px 12px', gap: 4, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', marginBottom: 16 }}>
                  <img src={logoUrl} alt="" style={{ width: 26, height: 26, borderRadius: 8, objectFit: 'contain' }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>PsiFlux</span>
                </div>
                {[['Dashboard', true], ['Agenda', false], ['Pacientes', false], ['Salas Virtuais', false], ['Financeiro', false]].map(([label, active]) => (
                  <div key={label as string} style={{ padding: '8px 10px', borderRadius: 10, fontSize: 12, fontWeight: 500, background: active ? '#EEF0FF' : 'transparent', color: active ? '#6355D8' : '#94A3B8' }}>
                    {label as string}
                  </div>
                ))}
              </div>
              {/* Content */}
              <div style={{ flex: 1, padding: 'clamp(12px,2vw,22px)', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {[['47', 'Pacientes', '#6355D8'], ['12', 'Hoje', '#0EA98B'], ['R$ 4.2k', 'Mês', '#6355D8']].map(([v, l, c]) => (
                    <div key={l as string} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
                      <div style={{ fontSize: 'clamp(14px,2.5vw,22px)', fontWeight: 700, color: c as string }}>{v as string}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{l as string}</div>
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'flex-end', gap: 4, overflow: 'hidden' }}>
                  {[35, 55, 42, 70, 50, 85, 62, 78, 55, 90, 68, 95].map((h, i) => (
                    <div key={i} style={{ flex: 1, borderRadius: '4px 4px 0 0', background: '#EEF0FF', height: `${h}%`, minWidth: 0, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(99,85,216,.55)', height: `${h * 0.55}%`, borderRadius: '4px 4px 0 0' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HISTORIA ═══ */}
      <section className="section" id="historia" style={{ background: '#fff' }}>
        <div className="wrap">
          <div className="two-col">
            {/* Left */}
            <div>
              <span className="tag" style={{ marginBottom: 24, display: 'inline-flex' }}>
                <Heart size={13} /> Nossa história
              </span>
              <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.12, marginBottom: 20, marginTop: 18 }}>
                Como o PsiFlux surgiu
              </h2>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--muted)', marginBottom: 16 }}>
                Uma das fundadoras do projeto atua na área da psicologia e enfrentava os mesmos desafios que milhares de profissionais enfrentam diariamente.
              </p>
              <p style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--muted)', marginBottom: 28 }}>
                Foi dessa necessidade real que nasceu o PsiFlux — construído pela parceria entre engenheiros de software e profissionais da psicologia, com feedback contínuo de quem vive a rotina do consultório.
              </p>
              <blockquote style={{ borderLeft: '3px solid var(--accent)', paddingLeft: 20, fontStyle: 'italic', fontSize: 15, lineHeight: 1.7, color: '#475569' }}>
                "Não somos apenas mais um software adaptado. O PsiFlux nasceu da prática clínica real."
              </blockquote>
            </div>

            {/* Right — pain points */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 16 }}>
                Os desafios que nos motivaram
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {painPoints.map((pt, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>
                      {i + 1}
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--muted)', paddingTop: 4 }}>{pt}</p>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: 'var(--accent)', borderRadius: 14, padding: '16px 18px' }}>
                  <CheckCircle size={18} style={{ color: 'rgba(255,255,255,.85)', flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,.9)', fontWeight: 500 }}>
                    O PsiFlux resolve cada um desses pontos — por quem vive a rotina clínica.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ NICHO ═══ */}
      <section className="section" style={{ background: 'var(--surface)' }}>
        <div className="wrap-sm" style={{ textAlign: 'center' }}>
          <span className="tag" style={{ marginBottom: 20, display: 'inline-flex' }}>Exclusivamente para saúde mental</span>
          <h2 style={{ fontSize: 'clamp(24px,3.8vw,40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 16, marginBottom: 16 }}>
            Enquanto outros softwares atendem dezenas de segmentos,<br className="hidden sm:block" /> o PsiFlux serve um único
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 520, margin: '0 auto 52px' }}>
            Psicólogos, neuropsicólogos e clínicas multidisciplinares têm necessidades que sistemas genéricos nunca vão entender.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 14, textAlign: 'left' }}>
            {[
              { icon: Brain,  title: 'Psicologia clínica',         desc: 'Prontuário, agenda e PEI pensados para a rotina do consultório psicológico.' },
              { icon: Users,  title: 'Neuropsicologia',             desc: 'Avaliações, instrumentos clínicos e documentação alinhados à prática.' },
              { icon: Shield, title: 'Clínicas multidisciplinares', desc: 'Múltiplos profissionais e especialidades em um ambiente integrado e seguro.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div className="card" key={title}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: 'var(--accent)' }}>
                  <Icon size={19} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--muted)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FUNCIONALIDADES ═══ */}
      <section className="section" id="funcionalidades" style={{ background: '#fff' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,5vw,60px)' }}>
            <span className="tag" style={{ marginBottom: 18, display: 'inline-flex' }}>Funcionalidades</span>
            <h2 style={{ fontSize: 'clamp(24px,3.8vw,40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 16, marginBottom: 14 }}>
              Tudo que sua clínica precisa,<br />em um único lugar
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 500, margin: '0 auto' }}>
              Uma plataforma que substitui múltiplos sistemas — para você focar no cuidado com o paciente.
            </p>
          </div>
          <div className="feat-grid">
            {features.map(({ icon: Icon, title, desc, color, bg }) => (
              <div className="card" key={title}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color }}>
                  <Icon size={20} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--muted)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ AURORA IA ═══ */}
      <section className="section" style={{ background: 'var(--surface)' }}>
        <div className="wrap">
          <div className="aurora-band">
            <div style={{ padding: 'clamp(36px,5vw,64px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 'clamp(32px,5vw,64px)', alignItems: 'center' }}>
              {/* Text */}
              <div>
                <span className="tag-green tag" style={{ marginBottom: 20, display: 'inline-flex' }}>
                  <Sparkles size={13} /> Inteligência artificial
                </span>
                <h2 style={{ fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 16, marginBottom: 18 }}>
                  Conheça a Aurora,<br />sua assistente IA
                </h2>
                <p style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--muted)', marginBottom: 12 }}>
                  A Aurora organiza histórico clínico, automatiza relatórios e sistematiza dados clínicos — sempre como apoio ao profissional, nunca substituindo seu julgamento.
                </p>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fff', border: '1px solid #C7EDE7', borderRadius: 12, padding: '12px 16px', marginBottom: 28 }}>
                  <Lock size={15} style={{ color: 'var(--accent2)', flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: '#0EA98B', fontWeight: 500 }}>
                    Em conformidade com a Resolução CFP nº 009/2024 — o julgamento clínico é sempre do profissional.
                  </p>
                </div>
                <button onClick={go} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent2)', color: '#fff', fontWeight: 700, fontSize: 15, padding: '13px 26px', borderRadius: 13, border: 'none', cursor: 'pointer', transition: 'opacity .15s', boxShadow: '0 4px 16px rgba(14,169,139,.3)' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '.88')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                  Conhecer a Aurora <ChevronRight size={17} />
                </button>
              </div>

              {/* Chat card */}
              <div style={{ background: '#fff', borderRadius: 22, padding: 24, boxShadow: '0 8px 40px rgba(99,85,216,.10)', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #E2E8F0' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: '#E6F7F4', border: '1px solid #C7EDE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent2)' }}>
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Aurora IA</div>
                    <div style={{ fontSize: 12, color: 'var(--accent2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent2)', display: 'inline-block' }} />
                      Online agora
                    </div>
                  </div>
                </div>
                {[
                  { from: 'aurora', text: 'Olá! O paciente João tem consulta amanhã. Deseja que eu prepare o resumo do histórico?' },
                  { from: 'user', text: 'Sim, por favor!' },
                  { from: 'aurora', text: 'Resumo organizado com base nas últimas 3 sessões. Clique para revisar.' },
                ].map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                    <div style={{
                      maxWidth: '82%', padding: '10px 14px', borderRadius: 16, fontSize: 13, lineHeight: 1.55,
                      background: msg.from === 'user' ? 'var(--accent)' : '#F7F8FC',
                      color: msg.from === 'user' ? '#fff' : 'var(--muted)',
                      border: msg.from === 'user' ? 'none' : '1px solid #E2E8F0',
                      borderBottomLeftRadius: msg.from === 'aurora' ? 4 : 16,
                      borderBottomRightRadius: msg.from === 'user' ? 4 : 16,
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PLANOS ═══ */}
      <section className="section" id="planos" style={{ background: '#fff' }}>
        <div className="wrap-sm">
          <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,5vw,60px)' }}>
            <span className="tag" style={{ marginBottom: 18, display: 'inline-flex' }}>Planos</span>
            <h2 style={{ fontSize: 'clamp(24px,3.8vw,40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 16, marginBottom: 14 }}>
              Simples e transparente
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--muted)' }}>
              A solução completa para sua prática clínica e financeira.
            </p>
          </div>

          {plans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
              Carregando planos...
            </div>
          ) : (
          <div className="plan-grid">
            {plans.map(plan => {
              const hl = Boolean(plan.highlighted);
              return (
              <div key={plan.id} style={{
                background: hl ? 'var(--accent)' : '#fff',
                border: `1.5px solid ${hl ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 22, padding: '30px 26px',
                display: 'flex', flexDirection: 'column',
                marginTop: hl ? -12 : 0,
                marginBottom: hl ? -12 : 0,
                boxShadow: hl ? '0 20px 60px rgba(99,85,216,.38)' : '0 1px 4px rgba(0,0,0,.04)',
                transition: 'box-shadow .2s',
              }}>
                {hl && (
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.7)', marginBottom: 12 }}>
                    ⭐ Mais popular
                  </p>
                )}
                <h3 style={{ fontWeight: 700, fontSize: 20, color: hl ? '#fff' : 'var(--text)', marginBottom: 4 }}>{plan.name}</h3>
                <p style={{ fontSize: 13, color: hl ? 'rgba(255,255,255,.65)' : 'var(--muted)', marginBottom: 22, minHeight: 18 }}>{plan.description || ''}</p>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.04em', color: hl ? '#fff' : 'var(--text)' }}>
                    {Number(plan.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                  <span style={{ fontSize: 13, color: hl ? 'rgba(255,255,255,.55)' : 'var(--muted)', marginLeft: 4 }}>/mês</span>
                </div>
                <ul style={{ listStyle: 'none', flex: 1, marginBottom: 26 }}>
                  {(plan.features || []).map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, padding: '7px 0', color: hl ? 'rgba(255,255,255,.85)' : 'var(--muted)', borderBottom: `1px solid ${hl ? 'rgba(255,255,255,.12)' : 'var(--border)'}` }}>
                      <CheckCircle size={14} style={{ color: hl ? 'rgba(255,255,255,.7)' : 'var(--accent2)', flexShrink: 0, marginTop: 1 }} />
                      {FEATURE_LABELS[f] || f}
                    </li>
                  ))}
                </ul>
                <button onClick={go} style={{
                  width: '100%', padding: '13px 0', borderRadius: 12, fontWeight: 700, fontSize: 14,
                  background: hl ? '#fff' : 'var(--accent)',
                  color: hl ? 'var(--accent)' : '#fff',
                  border: 'none', cursor: 'pointer',
                  boxShadow: hl ? 'none' : '0 4px 14px rgba(99,85,216,.28)',
                  transition: 'opacity .15s, transform .15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  Começar
                </button>
              </div>
              );
            })}
          </div>
          )}
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="wrap-xs" style={{ textAlign: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg, #EEF0FF 0%, #E6F7F4 100%)',
            border: '1px solid #D0CCFF', borderRadius: 28,
            padding: 'clamp(40px,6vw,72px) clamp(24px,5vw,60px)',
          }}>
            <img src={logoUrl} alt="PsiFlux" style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 16, margin: '0 auto 24px' }} />
            <h2 style={{ fontSize: 'clamp(24px,3.8vw,40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 16 }}>
              Pronto para simplificar<br />sua rotina clínica?
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 420, margin: '0 auto 32px' }}>
              Agende uma demonstração gratuita e veja o PsiFlux na prática — sem compromisso, sem fidelidade.
            </p>
            <button className="btn-p" onClick={go} style={{ padding: '15px 36px', fontSize: 16 }}>
              Quero uma demonstração <ArrowRight size={18} />
            </button>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 18px', marginTop: 22, fontSize: 13, color: 'var(--muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Shield size={13} /> LGPD compliant</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CheckCircle size={13} style={{ color: 'var(--accent2)' }} /> Gestão completa</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CheckCircle size={13} style={{ color: 'var(--accent2)' }} /> Cancele quando quiser</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: 'clamp(28px,4vw,40px) 0', background: '#F7F8FC' }}>
        <div className="wrap" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <Logo size={30} />
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>© {new Date().getFullYear()} PsiFlux. Todos os direitos reservados.</p>
          <div style={{ display: 'flex', gap: 24 }}>
            {[['Privacidade', '/privacidade'], ['Suporte', '/ajuda']].map(([label, href]) => (
              <a key={href as string} href={href as string} style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none', transition: 'color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                {label as string}
              </a>
            ))}
            <button onClick={go} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--muted)', padding: 0, transition: 'color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
              Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
