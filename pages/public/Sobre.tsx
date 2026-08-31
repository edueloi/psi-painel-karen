import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Heart, CheckCircle, ShieldCheck, Sparkles, Users2, Lock, ArrowRight, Quote } from 'lucide-react';
import { PublicSiteShell } from '../../components/Layout/PublicSiteShell';
import logoUrl from '../../images/logo-sistema/logo.png';
import { useSEO } from '../../hooks/useSEO';

const painPoints = [
  'Prontuários dispersos em papéis ou planilhas',
  'Conflitos de horário na agenda',
  'Processos repetitivos que roubam tempo de atendimento',
  'Ferramentas desconectadas entre si',
];

const PILLARS = [
  { icon: Users2, title: 'Cuidado multiprofissional', desc: 'Pensada para toda a rede de saúde mental — não só para um tipo de profissional.', color: '#6D42F5', bg: '#EFE9FF' },
  { icon: Sparkles, title: 'Tecnologia com propósito', desc: 'IA e automação que economizam tempo, sem nunca substituir o julgamento clínico.', color: '#0D9155', bg: '#E4F8EE' },
  { icon: Lock, title: 'Segurança de dados', desc: 'Criptografia e conformidade com a LGPD em cada dado clínico armazenado.', color: '#2563EB', bg: '#DBEAFE' },
  { icon: ShieldCheck, title: 'Sigilo profissional', desc: 'O profissional é sempre o único detentor do sigilo sobre os dados de seus pacientes.', color: '#D97706', bg: '#FEF3C7' },
];

export const Sobre: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const go = () => navigate(isAuthenticated ? '/dashboard' : '/login');

  useSEO({
    title: 'Sobre — Plaelo',
    description: 'Conheça a Plaelo: a proposta, os valores e o propósito por trás do sistema de gestão criado para toda a rede de cuidado em saúde mental.',
    path: '/sobre',
  });

  return (
    <PublicSiteShell>
      <section className="page-head">
        <div className="wrap-sm" style={{ textAlign: 'center' }}>
          <span className="tag" style={{ marginBottom: 18, display: 'inline-flex' }}>
            <Heart size={13} /> Nossa história
          </span>
          <h1 style={{ fontSize: 'clamp(28px,4.5vw,48px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 16, marginBottom: 18 }}>
            Como a Plaelo surgiu
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 560, margin: '0 auto' }}>
            Nascemos da prática clínica real — e crescemos para cuidar de toda a rede que cuida da saúde mental.
          </p>
        </div>
      </section>

      {/* ═══ HISTÓRIA + PULL QUOTE ═══ */}
      <section className="section" style={{ background: '#fff', paddingTop: 'clamp(32px,4vw,48px)' }}>
        <div className="wrap two-col">
          <div>
            <p style={{ fontSize: 17, lineHeight: 1.85, color: 'var(--text)', marginBottom: 24 }}>
              Uma das fundadoras do projeto atua na área da psicologia e enfrentava, no dia a dia do consultório, os mesmos desafios que profissionais de saúde mental — de diferentes especialidades — encontram na rotina clínica.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.85, color: 'var(--text)' }}>
              Foi dessa necessidade real que nasceu a Plaelo — construída pela parceria entre engenheiros de software e profissionais de saúde mental, com feedback contínuo de quem vive a rotina clínica.
            </p>
          </div>

          <blockquote style={{
            position: 'relative', padding: '32px 28px', borderRadius: 24,
            background: 'linear-gradient(160deg, var(--ink) 0%, #2A1F6B 100%)',
          }}>
            <Quote size={30} style={{ color: 'rgba(255,255,255,.25)', marginBottom: 14 }} fill="currentColor" />
            <p style={{ fontSize: 19, lineHeight: 1.55, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
              A plataforma cresceu para além da psicologia: hoje acompanha psiquiatras, terapeutas ocupacionais, assistentes sociais e todos os profissionais que compõem a rede de cuidado em saúde mental.
            </p>
          </blockquote>
        </div>
      </section>

      {/* ═══ DESAFIOS ═══ */}
      <section className="section" style={{ background: 'var(--surface)' }}>
        <div className="wrap-sm">
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <span className="tag" style={{ marginBottom: 18, display: 'inline-flex' }}>O ponto de partida</span>
            <h2 style={{ fontSize: 'clamp(24px,3.5vw,36px)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: 16 }}>
              Os desafios que nos motivaram
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {painPoints.map((pt, i) => (
              <div key={i} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '20px 22px' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--accent)', fontSize: 13, fontWeight: 700 }}>
                  {i + 1}
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--muted)', paddingTop: 4 }}>{pt}</p>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, background: 'var(--ink)', borderRadius: 18, padding: '22px 24px', marginTop: 8 }}>
              <CheckCircle size={20} style={{ color: '#6EE7B7', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,.9)', fontWeight: 600 }}>
                É exatamente nesses pontos que a Plaelo concentra agenda, prontuário, financeiro e IA — em um só lugar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PILARES ═══ */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 'clamp(40px,5vw,56px)' }}>
            <span className="tag" style={{ marginBottom: 18, display: 'inline-flex' }}>O que nos guia</span>
            <h2 style={{ fontSize: 'clamp(24px,3.8vw,40px)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: 16 }}>
              Nossos pilares
            </h2>
          </div>
          <div className="area-grid">
            {PILLARS.map(p => (
              <div className="card" key={p.title}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: p.bg, color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <p.icon size={20} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{p.title}</h3>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--muted)' }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section className="section" style={{ background: 'var(--surface)' }}>
        <div className="wrap-xs" style={{ textAlign: 'center' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--ink) 0%, #2A1F6B 100%)', borderRadius: 32, padding: 'clamp(40px,6vw,64px) clamp(24px,5vw,56px)' }}>
            <img src={logoUrl} alt="Plaelo" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 14, margin: '0 auto 22px', background: '#fff', padding: 6 }} />
            <h2 style={{ fontSize: 'clamp(22px,3.4vw,34px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: 14, color: '#fff' }}>
              Vem fazer parte da rede Plaelo
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(255,255,255,.7)', maxWidth: 400, margin: '0 auto 28px' }}>
              Comece hoje mesmo — sem cartão de crédito, sem fidelidade.
            </p>
            <button className="btn-p" onClick={go} style={{ fontSize: 15, background: '#fff', color: 'var(--ink)' }}>
              Quero uma demonstração <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </section>
    </PublicSiteShell>
  );
};
