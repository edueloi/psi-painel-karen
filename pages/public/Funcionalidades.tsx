import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sparkles, Lock, ChevronRight, ArrowRight, CheckCircle } from 'lucide-react';
import { PublicSiteShell } from '../../components/Layout/PublicSiteShell';
import { features } from './publicSiteData';
import logoUrl from '../../images/logo-sistema/logo.png';
import { useSEO } from '../../hooks/useSEO';

const STATS = [
  { value: '8', label: 'módulos integrados' },
  { value: '100%', label: 'em nuvem' },
  { value: '24/7', label: 'acesso de onde estiver' },
];

export const Funcionalidades: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const go = () => navigate(isAuthenticated ? '/dashboard' : '/login');

  useSEO({
    title: 'Funcionalidades — Plaelo',
    description: 'Conheça os módulos do Plaelo: agenda inteligente, prontuário digital, atendimento remoto, financeiro, nota fiscal e inteligência artificial para clínicas e profissionais de saúde mental.',
    path: '/funcionalidades',
  });

  return (
    <PublicSiteShell>
      <section className="page-head">
        <div className="wrap" style={{ textAlign: 'center' }}>
          <span className="tag" style={{ marginBottom: 18, display: 'inline-flex' }}>Funcionalidades</span>
          <h1 style={{ fontSize: 'clamp(28px,4.5vw,48px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 16, marginBottom: 14 }}>
            Tudo que sua clínica precisa,<br />em um único lugar
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 560, margin: '0 auto 32px' }}>
            Uma plataforma que substitui múltiplos sistemas — para você focar no cuidado com o paciente.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'clamp(12px,4vw,48px)', maxWidth: 460, margin: '0 auto' }}>
            {STATS.map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 'clamp(20px,5vw,28px)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--accent)' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: '#fff', paddingTop: 'clamp(24px,3vw,40px)' }}>
        <div className="wrap">
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

              <div style={{ background: '#fff', borderRadius: 22, padding: 24, boxShadow: '0 8px 40px rgba(109,66,245,.12)', border: '1px solid #E2E8F0' }}>
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

      {/* ═══ CTA FINAL ═══ */}
      <section className="section" style={{ background: 'var(--surface)' }}>
        <div className="wrap-xs" style={{ textAlign: 'center' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--ink) 0%, #2A1F6B 100%)', borderRadius: 32, padding: 'clamp(40px,6vw,64px) clamp(24px,5vw,56px)' }}>
            <img src={logoUrl} alt="Plaelo" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 14, margin: '0 auto 22px', background: '#fff', padding: 6 }} />
            <h2 style={{ fontSize: 'clamp(22px,3.4vw,34px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 14, color: '#fff' }}>
              Veja todas as funcionalidades em ação
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(255,255,255,.7)', maxWidth: 400, margin: '0 auto 28px' }}>
              Agende uma demonstração gratuita e conheça a Plaelo na prática.
            </p>
            <button className="btn-p" onClick={go} style={{ fontSize: 15, background: '#fff', color: 'var(--ink)' }}>
              Quero uma demonstração <ArrowRight size={17} />
            </button>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 18px', marginTop: 22, fontSize: 13, color: 'rgba(255,255,255,.6)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CheckCircle size={13} /> Sem fidelidade</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CheckCircle size={13} /> 7 dias grátis</span>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteShell>
  );
};
