import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowRight, Calendar, Video, ClipboardList, Wallet, Brain, FileText, Smartphone, Activity,
  CheckCircle2, Mic, FileCheck, Sparkles as SparklesIcon,
} from 'lucide-react';
import { PublicSiteShell } from '../../components/Layout/PublicSiteShell';
import { Reveal } from '../../components/Layout/Reveal';
import heroPhotoUrl from '../../images/hero-consultorio.png';
import { useSEO } from '../../hooks/useSEO';

const HUB_NODES = [
  { key: 'agenda', label: 'Agenda', icon: Calendar, angle: -90 },
  { key: 'sessoes', label: 'Sessões', icon: Video, angle: -30 },
  { key: 'prontuario', label: 'Prontuário', icon: ClipboardList, angle: 30 },
  { key: 'ia', label: 'IA Clínica', icon: Brain, angle: 90 },
  { key: 'app', label: 'App do Paciente', icon: Smartphone, angle: 150 },
  { key: 'track', label: 'Acompanhamento', icon: Activity, angle: -150 },
  { key: 'financeiro', label: 'Financeiro', icon: Wallet, angle: -210 + 360 },
  { key: 'documentos', label: 'Documentos', icon: FileText, angle: 210 },
] as const;

const HUB_FEATURES = [
  { title: 'Agenda', desc: 'confirmações e lembretes automáticos' },
  { title: 'Prontuário', desc: 'evolução clínica organizada' },
  { title: 'Financeiro', desc: 'cobranças e nota fiscal' },
  { title: 'IA Clínica', desc: 'transcrição, resumo e insights' },
  { title: 'App do Paciente', desc: 'acompanhamento entre sessões' },
  { title: 'Documentos', desc: 'termos, atestados e recibos' },
] as const;

export const Individual: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const go = () => navigate(isAuthenticated ? '/dashboard' : '/login');

  useSEO({
    title: 'Plaelo para Psicólogos Individuais',
    description: 'O sistema para psicólogos que organiza agenda, prontuário, financeiro e atendimento em um só lugar. 14 dias grátis, sem cartão de crédito.',
    path: '/individual',
  });

  return (
    <PublicSiteShell>
      {/* ═══ HERO ═══ */}
      <section className="hero-split" style={{ paddingTop: 'clamp(28px,4vw,48px)' }}>
        <div className="wrap hero-split-grid">
          <Reveal className="hero-split-text">
            <span className="tag" style={{ marginBottom: 16, display: 'inline-flex' }}>Psicólogo individual</span>
            <h1 style={{ fontSize: 'clamp(30px,4.2vw,50px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.08, marginBottom: 16, color: 'var(--ink)' }}>
              Você livre para <span className="hero-accent">crescer</span>.
            </h1>
            <p style={{ fontSize: 'clamp(15px,1.2vw,17px)', lineHeight: 1.6, color: 'var(--muted)', marginBottom: 28 }}>
              O sistema para psicólogos que organiza agenda, prontuário, financeiro e atendimento em um só lugar.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18, marginBottom: 16 }}>
              <button className="btn-p" onClick={go}>
                Criar conta grátis <ArrowRight size={17} />
              </button>
              <a href="#jornada" className="link-arrow" style={{ color: 'var(--ink)', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
                Ver como funciona
              </a>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>14 dias grátis. Sem cartão de crédito.</p>
          </Reveal>

          <Reveal delay={100} className="hero-split-media">
            <img src={heroPhotoUrl} alt="Psicóloga em seu consultório" className="hero-split-media-img" />
            <div className="hero-split-badge">
              <strong>Poliane Rocha</strong>
              <span>CRP 04/56394</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ HUB — "sua prática clínica" (diagrama radial) ═══ */}
      <section className="section hub-section">
        <div className="wrap hub-grid">
          <Reveal>
            <span className="tag" style={{ marginBottom: 18, display: 'inline-flex', background: 'rgba(255,255,255,.1)', color: '#fff' }}>Plataforma completa</span>
            <h2 style={{ fontSize: 'clamp(26px,3.6vw,42px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 16, marginBottom: 16, color: '#fff' }}>
              Tudo o que sustenta o <span style={{ color: '#7FD4F7' }}>seu consultório</span>.
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(255,255,255,.68)', maxWidth: 480, marginBottom: 32 }}>
              Agenda, prontuário eletrônico, financeiro, documentos, inteligência clínica e aplicativo do paciente integrados em um único sistema para psicólogos.
            </p>
            <div className="hub-feature-grid">
              {HUB_FEATURES.map((f) => (
                <div key={f.title}>
                  <strong style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{f.title}</strong>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,.62)' }}>{f.desc}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={100} className="hub-diagram">
            <div className="hub-core">
              <span>SUA</span>
              <strong>prática<br />clínica</strong>
            </div>
            {HUB_NODES.map(({ key, label, icon: Icon, angle }) => (
              <div
                key={key}
                className="hub-node"
                style={{ '--angle': `${angle}deg` } as React.CSSProperties}
              >
                <div className="hub-node-inner">
                  <span className="hub-node-icon"><Icon size={17} /></span>
                  <span className="hub-node-label">{label}</span>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ═══ JORNADA — antes / durante / entre / depois ═══ */}
      <section id="jornada" className="section" style={{ background: '#fff' }}>
        <div className="wrap">
          <Reveal style={{ maxWidth: 640, marginBottom: 'clamp(40px,5vw,64px)' }}>
            <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.12, marginBottom: 16 }}>
              Ganhe duas horas a mais por dia.
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--muted)' }}>
              Tudo o que envolve seus atendimentos psicológicos organizado em um único sistema.
            </p>
          </Reveal>

          <div className="journey-steps">
            {/* ETAPA 1 — Antes da sessão */}
            <Reveal className="journey-step">
              <div className="journey-step-num">01</div>
              <div className="journey-step-info">
                <span className="tag" style={{ marginBottom: 14, display: 'inline-flex' }}>Agenda para psicólogos</span>
                <h3>Menos faltas. Mais previsibilidade.</h3>
                <p>Agenda para psicólogos com confirmações automáticas por WhatsApp, e-mail e SMS, lembretes inteligentes e encaixes sem conflito de horário.</p>
              </div>
              <div className="journey-step-visual">
                <div className="mock-card">
                  <div className="mock-card-head">
                    <span><Calendar size={14} /> Sua agenda · hoje</span>
                    <span className="mock-muted">8 sessões</span>
                  </div>
                  {[
                    { time: '08:00', name: 'Mariana S.', status: 'confirmada' },
                    { time: '09:30', name: 'Rafael T.', status: 'online' },
                    { time: '11:00', name: 'Camila A.', status: 'confirmada' },
                  ].map((row) => (
                    <div className="mock-row" key={row.time}>
                      <span className="mock-time">{row.time}</span>
                      <span className="mock-name">{row.name}</span>
                      <span className="mock-pill">
                        {row.status === 'online' ? <Video size={11} /> : <CheckCircle2 size={11} />} {row.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* ETAPA 2 — Durante a sessão */}
            <Reveal className="journey-step reverse">
              <div className="journey-step-num">02</div>
              <div className="journey-step-info">
                <span className="tag" style={{ marginBottom: 14, display: 'inline-flex' }}>IA Clínica</span>
                <h3>Menos tempo escrevendo. Mais tempo atendendo.</h3>
                <p>A IA para psicólogos transcreve sessões presenciais e online, cria resumos estruturados e gera fichas de evolução para apoiar seus próximos atendimentos.</p>
                <div className="journey-step-chips">
                  {['Transcrição segura', 'Resumo estruturado', 'Insights clínicos'].map((c) => (
                    <span key={c} className="chip">{c}</span>
                  ))}
                </div>
              </div>
              <div className="journey-step-visual">
                <div className="mock-card mock-card-dark">
                  <div className="mock-card-head">
                    <span><Mic size={13} /> IA clínica em ação</span>
                    <span className="mock-muted">~12s</span>
                  </div>
                  <div className="mock-quote">"Esta semana percebi que consegui sustentar o limite com mais calma…"</div>
                  {[
                    { icon: Mic, title: 'Sessão', sub: 'áudio capturado com discrição' },
                    { icon: FileText, title: 'Transcrição', sub: 'texto fiel e estruturado' },
                    { icon: SparklesIcon, title: 'Resumo + Insight', sub: 'pontos centrais destacados' },
                    { icon: FileCheck, title: 'Prontuário', sub: 'evolução pronta para revisar' },
                  ].map((item) => (
                    <div className="mock-list-item" key={item.title}>
                      <span className="mock-list-icon"><item.icon size={14} /></span>
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.sub}</span>
                      </div>
                    </div>
                  ))}
                  <div className="mock-insight">
                    <SparklesIcon size={12} /> Avanço no manejo de limites — reforçar no próximo encontro.
                  </div>
                </div>
              </div>
            </Reveal>

            {/* ETAPA 3 — Entre sessões */}
            <Reveal className="journey-step">
              <div className="journey-step-num">03</div>
              <div className="journey-step-info">
                <span className="tag" style={{ marginBottom: 14, display: 'inline-flex' }}>Acompanhamento</span>
                <h3>Acompanhe a evolução com mais clareza.</h3>
                <p>Escalas psicológicas, tarefas terapêuticas e indicadores clínicos em uma única linha do tempo. Com o app do paciente, o cuidado continua fora do consultório.</p>
              </div>
              <div className="journey-step-visual">
                <div className="mock-card">
                  <div className="mock-card-head">
                    <span>Linha do tempo clínica</span>
                    <span className="mock-muted">Mariana</span>
                  </div>
                  {[
                    { label: 'Humor 4/5', sub: 'registrado às 09:12' },
                    { label: 'Tarefa concluída', sub: 'diário de pensamentos' },
                    { label: 'Escala PHQ-9', sub: 'queda de 14 → 9 pontos' },
                  ].map((item) => (
                    <div className="mock-row" key={item.label}>
                      <span className="mock-name" style={{ fontWeight: 700 }}>{item.label}</span>
                      <span className="mock-muted" style={{ marginLeft: 'auto' }}>{item.sub}</span>
                    </div>
                  ))}
                  <div className="mock-bars">
                    {[40, 55, 35, 62, 70, 85, 78].map((h, i) => (
                      <span key={i} style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            {/* ETAPA 4 — Depois da sessão */}
            <Reveal className="journey-step reverse">
              <div className="journey-step-num">04</div>
              <div className="journey-step-info">
                <span className="tag" style={{ marginBottom: 14, display: 'inline-flex' }}>Financeiro</span>
                <h3>Financeiro em piloto automático.</h3>
                <p>Cobranças automáticas, Pix, boleto, cartão e nota fiscal em um único fluxo integrado, com controle claro do que entrou e do que falta receber.</p>
              </div>
              <div className="journey-step-visual">
                <div className="mock-card">
                  <div className="mock-card-head"><span>Depois da sessão</span></div>
                  <div className="mock-stats-row">
                    {[
                      { label: 'Recebido em junho', value: 'R$ 18.420' },
                      { label: 'A receber', value: 'R$ 2.140' },
                      { label: 'Inadimplência', value: '0,4%' },
                    ].map((s) => (
                      <div className="mock-stat" key={s.label}>
                        <strong>{s.value}</strong>
                        <span>{s.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mock-status-dot">Sistema rodando sozinho · você acompanha o resultado</div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ HERO DE FECHAMENTO ═══ */}
      <section className="hero-photo-bg" style={{ minHeight: 'clamp(420px,52vh,560px)' }}>
        <img src={heroPhotoUrl} alt="Equilíbrio entre vida e consultório" className="hero-photo-bg-img" />
        <div className="hero-photo-bg-overlay" />
        <Reveal className="hero-photo-bg-content" style={{ maxWidth: 560 }}>
          <span className="tag" style={{ marginBottom: 16, display: 'inline-flex', background: 'rgba(255,255,255,.14)', color: '#fff' }}>Presença antes de tudo</span>
          <h2 style={{ fontSize: 'clamp(26px,3.6vw,42px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 16, color: '#fff' }}>
            Seu consultório organizado.<br />
            <span style={{ color: '#7FD4F7' }}>Sua vida em equilíbrio.</span>
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(255,255,255,.82)', maxWidth: 440, marginBottom: 24 }}>
            Menos tempo em tarefas operacionais. Mais espaço para o que só você pode fazer: cuidar.
          </p>
          <button className="btn-p" onClick={go} style={{ background: '#fff', color: 'var(--ink)' }}>
            Criar conta grátis <ArrowRight size={17} />
          </button>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginTop: 12 }}>14 dias grátis. Sem cartão de crédito.</p>
        </Reveal>
      </section>
    </PublicSiteShell>
  );
};
