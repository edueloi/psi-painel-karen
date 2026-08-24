import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowRight, CheckCircle, HeartHandshake, Shield, ChevronRight,
  Calendar, Sparkles, TrendingUp,
} from 'lucide-react';
import { PublicSiteShell } from '../../components/Layout/PublicSiteShell';
import { features, PROFESSIONAL_CATEGORIES } from './publicSiteData';
import logoUrl from '../../images/logo-sistema/logo.png';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const go = () => navigate(isAuthenticated ? '/dashboard' : '/login');

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
                <span style={{ fontSize: 12, fontWeight: 700 }}>Aurora IA</span>
              </div>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--muted)' }}>
                "Resumo da última sessão pronto para revisão."
              </p>
            </div>
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
          <div className="area-grid" style={{ textAlign: 'left', alignItems: 'stretch' }}>
            {PROFESSIONAL_CATEGORIES.map(cat => {
              const MAX_SHOWN = 4;
              const shown = cat.professions.slice(0, MAX_SHOWN);
              const extra = cat.professions.length - shown.length;
              return (
                <div key={cat.key} style={{
                  display: 'flex', flexDirection: 'column', height: '100%',
                  background: '#fff', border: '1px solid var(--border)', borderRadius: 22,
                  padding: '26px 26px 24px', position: 'relative', overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(18,12,46,.04)', transition: 'box-shadow .2s, transform .2s',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: cat.color }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 13, background: cat.bg, color: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <cat.icon size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{cat.title}</h3>
                      <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{cat.professions.length} profissões</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto' }}>
                    {shown.map(p => (
                      <span key={p} style={{ fontSize: 12, fontWeight: 600, color: cat.color, background: cat.bg, borderRadius: 999, padding: '5px 11px' }}>
                        {p}
                      </span>
                    ))}
                    {extra > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999, padding: '5px 11px' }}>
                        +{extra}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
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

      {/* ═══ CTA FINAL ═══ */}
      <section className="section" style={{ background: 'var(--surface)' }}>
        <div className="wrap-xs" style={{ textAlign: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--ink) 0%, #2A1F6B 100%)',
            borderRadius: 32,
            padding: 'clamp(40px,6vw,72px) clamp(24px,5vw,60px)',
          }}>
            <img src={logoUrl} alt="Plaelo" style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 16, margin: '0 auto 24px', background: '#fff', padding: 6 }} />
            <h2 style={{ fontSize: 'clamp(24px,3.8vw,40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 16, color: '#fff', fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
              Pronto para simplificar<br />sua rotina clínica?
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: 'rgba(255,255,255,.7)', maxWidth: 420, margin: '0 auto 32px' }}>
              Agende uma demonstração gratuita e veja a Plaelo na prática — sem compromisso, sem fidelidade.
            </p>
            <button className="btn-p" onClick={go} style={{ fontSize: 16, background: '#fff', color: 'var(--ink)' }}>
              Quero uma demonstração <ArrowRight size={18} />
            </button>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 18px', marginTop: 22, fontSize: 13, color: 'rgba(255,255,255,.6)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Shield size={13} /> LGPD compliant</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CheckCircle size={13} /> Gestão completa</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CheckCircle size={13} /> Cancele quando quiser</span>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteShell>
  );
};
