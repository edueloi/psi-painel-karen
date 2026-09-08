import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowRight, CheckCircle, HeartHandshake, Shield, ChevronRight,
  Calendar, Sparkles, TrendingUp, ShieldCheck, Clock3, FileCheck2, UsersRound,
} from 'lucide-react';
import { PublicSiteShell } from '../../components/Layout/PublicSiteShell';
import { features, PROFESSIONAL_CATEGORIES } from './publicSiteData';
import logoUrl from '../../images/logo-sistema/logo.png';
import { useSEO } from '../../hooks/useSEO';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const go = () => navigate(isAuthenticated ? '/dashboard' : '/login');

  useSEO({
    title: 'Plaelo — Sistema para Clínicas de Saúde Mental',
    description: 'Plaelo é o sistema completo para profissionais e clínicas de saúde mental — psicólogos, psiquiatras, terapeutas e toda a rede de cuidado. Agenda inteligente, prontuário digital, atendimento remoto, financeiro e IA integrada.',
    path: '/',
  });

  return (
    <PublicSiteShell>
      {/* ═══ HERO ═══ */}
      <section className="hero-bg" style={{ padding: 'clamp(48px,7vw,88px) 0 clamp(56px,7vw,96px)', position: 'relative', overflow: 'hidden' }}>
        <div className="wrap hero-split">
          {/* Text */}
          <div>
            <span className="tag" style={{ marginBottom: 22, display: 'inline-flex' }}>
              <HeartHandshake size={13} /> Gestão para saúde mental
            </span>

            <h1 style={{ fontSize: 'clamp(34px,5.4vw,64px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.08, marginBottom: 22, color: 'var(--text)', fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
              O sistema criado para <span className="hero-accent">o cuidado</span> em saúde mental.
            </h1>

            <p style={{ fontSize: 'clamp(16px,1.6vw,18px)', lineHeight: 1.7, color: 'var(--muted)', maxWidth: 460, marginBottom: 32 }}>
              Agenda, prontuário, atendimento remoto, financeiro e IA — em uma plataforma pensada para psicólogos, psiquiatras, terapeutas e toda a rede de cuidado em saúde mental.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
              <button className="btn-p" onClick={go}>
                Quero uma demonstração <ArrowRight size={17} />
              </button>
              <button className="btn-g" onClick={go}>Acessar o sistema</button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', fontSize: 13, color: 'var(--muted)' }}>
              {['Sem fidelidade', 'IA inclusa', 'LGPD compliant'].map(label => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle size={13} style={{ color: 'var(--accent2)' }} /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* Visual collage */}
          <div className="float-stack">
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 32,
              background: 'linear-gradient(135deg, var(--accent-soft) 0%, #E4F8EE 100%)',
            }} />

            <div className="float-card" style={{ top: '6%', left: '4%', width: 'min(280px, 62%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <Calendar size={16} />
                </div>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Agenda de hoje</span>
              </div>
              {[['09:00', 'Sessão · Ana P.'], ['10:30', 'Retorno · Marcos S.'], ['14:00', 'Avaliação · Beatriz L.']].map(([time, label]) => (
                <div key={time} style={{ display: 'flex', gap: 10, fontSize: 12, padding: '7px 0', borderTop: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{time}</span>
                  <span style={{ color: 'var(--muted)' }}>{label}</span>
                </div>
              ))}
            </div>

            <div className="float-card" style={{ top: '46%', right: '2%', width: 'min(220px, 58%)', transform: 'rotate(2deg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0D9155', marginBottom: 8 }}>
                <TrendingUp size={16} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>Financeiro do mês</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>R$ 18.240</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>42 atendimentos</div>
            </div>

            <div className="float-card" style={{ bottom: '4%', left: '14%', width: 'min(260px, 70%)', transform: 'rotate(-2deg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: '#E4F8EE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0D9155' }}>
                  <Sparkles size={13} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700 }}>Bia IA</span>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--muted)' }}>
                "Resumo da última sessão pronto para revisão."
              </p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: '#fff', padding: '0 0 clamp(56px,7vw,88px)' }}>
        <div className="wrap">
          <div className="site-proof">
            {[
              { icon: Clock3, value: '24/7', label: 'Acesso seguro em qualquer lugar' },
              { icon: ShieldCheck, value: 'LGPD', label: 'Proteção para dados sensíveis' },
              { icon: FileCheck2, value: 'Tudo integrado', label: 'Da agenda ao financeiro' },
              { icon: UsersRound, value: 'Para sua equipe', label: 'Profissionais e clínicas' },
            ].map(({ icon: Icon, value, label }) => (
              <div className="site-proof-item" key={value}>
                <span className="site-proof-icon"><Icon size={16} /></span>
                <div>
                  <div className="site-proof-value">{value}</div>
                  <div className="site-proof-label">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ÁREAS ATENDIDAS ═══ */}
      <section className="section" style={{ background: 'var(--surface)' }}>
        <div className="wrap-sm" style={{ textAlign: 'center' }}>
          <span className="tag" style={{ marginBottom: 20, display: 'inline-flex' }}>Para todo o time de cuidado</span>
          <h2 style={{ fontSize: 'clamp(24px,3.8vw,40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 16, marginBottom: 16, fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
            Feito para quem cuida da saúde mental
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 560, margin: '0 auto 52px' }}>
            De psicólogos a psiquiatras, de terapeutas ocupacionais a assistentes sociais — a Plaelo se adapta ao registro profissional e à rotina de cada especialidade.
          </p>
          <div className="area-list">
            {PROFESSIONAL_CATEGORIES.map(cat => (
              <div className="area-row" key={cat.key}>
                <div className="area-row-head">
                  <div className="area-row-icon" style={{ background: cat.bg, color: cat.color }}>
                    <cat.icon size={19} />
                  </div>
                  <div>
                    <h3 className="area-row-title">{cat.title}</h3>
                    <span className="area-row-count">{cat.professions.length} profissões</span>
                  </div>
                </div>
                <p className="area-row-professions">
                  {cat.professions.join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FUNCIONALIDADES (resumo) ═══ */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,5vw,60px)' }}>
            <span className="tag" style={{ marginBottom: 18, display: 'inline-flex' }}>Funcionalidades</span>
            <h2 style={{ fontSize: 'clamp(24px,3.8vw,40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 16, marginBottom: 14, fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
              Tudo que sua clínica precisa,<br />em um único lugar
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 500, margin: '0 auto' }}>
              Uma plataforma que substitui múltiplos sistemas — para você focar no cuidado com o paciente.
            </p>
          </div>
          <div className="feat-grid">
            {features.slice(0, 4).map(({ icon: Icon, title, desc, color, bg }) => (
              <div className="card" key={title}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color }}>
                  <Icon size={20} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--muted)' }}>{desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link to="/funcionalidades" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
              Ver todas as funcionalidades <ChevronRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--surface)' }}>
        <div className="wrap">
          <div style={{ maxWidth: 600, marginBottom: 38 }}>
            <span className="tag" style={{ marginBottom: 18, display: 'inline-flex' }}>Uma rotina mais leve</span>
            <h2 style={{ fontSize: 'clamp(24px,3.8vw,40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 16, marginBottom: 14 }}>
              Da primeira consulta ao acompanhamento financeiro, tudo conversa entre si.
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--muted)' }}>
              Menos alternância entre ferramentas e mais tempo para decisões que realmente fazem diferença no cuidado.
            </p>
          </div>
          <div className="journey-grid">
            {[
              { icon: Calendar, title: 'Organize sua agenda', desc: 'Centralize horários, modalidades de atendimento, lembretes e a disponibilidade de toda a equipe.' },
              { icon: HeartHandshake, title: 'Cuide com contexto', desc: 'Acesse prontuários, formulários, planos terapêuticos e documentos no mesmo fluxo de trabalho.' },
              { icon: TrendingUp, title: 'Acompanhe sua evolução', desc: 'Visualize indicadores clínicos e financeiros para conduzir sua prática com mais clareza.' },
            ].map(({ icon: Icon, title, desc }) => (
              <article className="journey-card" key={title}>
                <div style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', background: 'var(--accent-soft)', marginBottom: 18 }}>
                  <Icon size={19} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.02em', marginBottom: 9 }}>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section className="section" style={{ background: 'var(--surface)' }}>
        <div className="wrap">
          <div className="cta-final">
            <div className="cta-final-text">
              <img src={logoUrl} alt="Plaelo" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 15, marginBottom: 24, background: '#fff', padding: 6 }} />
              <h2 style={{ fontSize: 'clamp(28px,3.6vw,42px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.12, marginBottom: 16, color: '#fff', fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
                Pronto para simplificar<br />sua rotina clínica?
              </h2>
              <p style={{ fontSize: 17, lineHeight: 1.7, color: 'rgba(255,255,255,.7)', maxWidth: 420, marginBottom: 32 }}>
                Agende uma demonstração gratuita e veja a Plaelo na prática — sem compromisso, sem fidelidade.
              </p>
              <button className="btn-p" onClick={go} style={{ fontSize: 16, background: '#fff', color: 'var(--ink)' }}>
                Quero uma demonstração <ArrowRight size={18} />
              </button>
            </div>
            <div className="cta-final-proof">
              {[
                { icon: Shield, label: 'LGPD compliant' },
                { icon: CheckCircle, label: 'Gestão completa' },
                { icon: CheckCircle, label: 'Cancele quando quiser' },
              ].map(({ icon: Icon, label }) => (
                <div className="cta-final-proof-item" key={label}>
                  <Icon size={17} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicSiteShell>
  );
};
