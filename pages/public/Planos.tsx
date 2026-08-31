import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, ShieldCheck, Sparkles, HeadphonesIcon, ChevronDown } from 'lucide-react';
import { PublicSiteShell } from '../../components/Layout/PublicSiteShell';
import { FEATURE_LABELS, Plan } from './publicSiteData';
import { api } from '../../services/api';
import { useSEO } from '../../hooks/useSEO';

const TRUST_BADGES = [
  { icon: CheckCircle, label: 'Sem fidelidade' },
  { icon: Sparkles, label: 'IA inclusa em todos os planos' },
  { icon: ShieldCheck, label: 'LGPD compliant' },
  { icon: HeadphonesIcon, label: 'Suporte humano' },
];

const FAQ = [
  { q: 'Existe período de teste gratuito?', a: 'Sim — você pode começar a usar a Plaelo por 7 dias sem custo e sem precisar cadastrar cartão de crédito.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim. Não há fidelidade ou multa de cancelamento — sua assinatura pode ser cancelada a qualquer momento diretamente pelo painel.' },
  { q: 'Como funciona a cobrança?', a: 'A assinatura é mensal, cobrada via Pix ou cartão. Você pode trocar de plano quando quiser, e o valor é ajustado proporcionalmente.' },
  { q: 'Meus dados clínicos ficam seguros?', a: 'Sim. Todos os dados são criptografados em trânsito e em repouso, seguindo a LGPD — e o profissional é sempre o único detentor do sigilo clínico.' },
];

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{q}</span>
        <ChevronDown size={17} style={{ color: 'var(--muted)', flexShrink: 0, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <p style={{ padding: '0 22px 20px', fontSize: 14, lineHeight: 1.7, color: 'var(--muted)' }}>{a}</p>
      )}
    </div>
  );
};

export const Planos: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const go = () => navigate(isAuthenticated ? '/dashboard' : '/login');

  useSEO({
    title: 'Planos e Preços — Plaelo',
    description: 'Conheça os planos do Plaelo para psicólogos, psiquiatras e clínicas de saúde mental. Sem fidelidade, com IA inclusa e 7 dias de teste grátis.',
    path: '/planos',
  });

  useEffect(() => {
    api.get<Plan[]>('/plans')
      .then((data) => { if (Array.isArray(data)) setPlans(data); })
      .catch(() => {});
  }, []);

  return (
    <PublicSiteShell>
      <section className="page-head">
        <div className="wrap" style={{ textAlign: 'center' }}>
          <span className="tag" style={{ marginBottom: 18, display: 'inline-flex' }}>Planos</span>
          <h1 style={{ fontSize: 'clamp(28px,4.5vw,48px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 16, marginBottom: 14 }}>
            Simples e transparente
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 480, margin: '0 auto 28px' }}>
            A solução completa para sua prática clínica e financeira — escolha o plano e comece hoje.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px 22px' }}>
            {TRUST_BADGES.map(b => (
              <span key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                <b.icon size={14} style={{ color: 'var(--accent2)' }} /> {b.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: '#fff', paddingTop: 'clamp(24px,3vw,40px)' }}>
        <div className="wrap">
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
                background: hl ? 'linear-gradient(160deg, var(--ink) 0%, #2A1F6B 100%)' : '#fff',
                border: `2px solid ${hl ? 'transparent' : 'var(--border)'}`,
                borderRadius: 24, padding: '32px 28px',
                display: 'flex', flexDirection: 'column',
                boxShadow: hl ? '0 24px 60px rgba(18,12,46,.35)' : '0 1px 4px rgba(0,0,0,.04)',
                transition: 'box-shadow .2s, transform .2s',
                transform: hl ? 'scale(1.02)' : 'none',
              }}>
                {hl && (
                  <p style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#fff', background: 'rgba(255,255,255,.15)', borderRadius: 999, padding: '5px 12px', marginBottom: 16, alignSelf: 'flex-start' }}>
                    <Sparkles size={12} /> Mais popular
                  </p>
                )}
                <h3 style={{ fontWeight: 700, fontSize: 20, color: hl ? '#fff' : 'var(--text)', marginBottom: 4 }}>{plan.name}</h3>
                <p style={{ fontSize: 13, color: hl ? 'rgba(255,255,255,.6)' : 'var(--muted)', marginBottom: 22, minHeight: 18 }}>{plan.description || ''}</p>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.04em', color: hl ? '#fff' : 'var(--text)' }}>
                    {Number(plan.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                  <span style={{ fontSize: 13, color: hl ? 'rgba(255,255,255,.5)' : 'var(--muted)', marginLeft: 4 }}>/mês</span>
                </div>
                <ul style={{ listStyle: 'none', flex: 1, marginBottom: 26 }}>
                  {(plan.features || []).map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, padding: '7px 0', color: hl ? 'rgba(255,255,255,.85)' : 'var(--muted)', borderBottom: `1px solid ${hl ? 'rgba(255,255,255,.12)' : 'var(--border)'}` }}>
                      <CheckCircle size={14} style={{ color: hl ? '#6EE7B7' : 'var(--accent2)', flexShrink: 0, marginTop: 1 }} />
                      {FEATURE_LABELS[f] || f}
                    </li>
                  ))}
                </ul>
                <button onClick={go} style={{
                  width: '100%', padding: '14px 0', borderRadius: 999, fontWeight: 700, fontSize: 14,
                  background: hl ? '#fff' : 'var(--ink)',
                  color: hl ? 'var(--ink)' : '#fff',
                  border: 'none', cursor: 'pointer',
                  boxShadow: hl ? 'none' : '0 8px 20px rgba(18,12,46,.25)',
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

      {/* ═══ FAQ ═══ */}
      <section className="section" style={{ background: 'var(--surface)' }}>
        <div className="wrap-sm">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span className="tag" style={{ marginBottom: 18, display: 'inline-flex' }}>Dúvidas frequentes</span>
            <h2 style={{ fontSize: 'clamp(22px,3.4vw,34px)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: 16 }}>
              Perguntas sobre os planos
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQ.map(item => <FaqItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </div>
      </section>
    </PublicSiteShell>
  );
};
