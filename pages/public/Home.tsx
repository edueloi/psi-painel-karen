import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowRight, CheckCircle, HeartHandshake, Shield, ChevronRight, Plus,
  Calendar, Sparkles, TrendingUp, ShieldCheck, UsersRound,
  Building2, Video, BarChart2, Lock, FileLock2, Server, ScanEye,
} from 'lucide-react';
import { PublicSiteShell } from '../../components/Layout/PublicSiteShell';
import { Reveal } from '../../components/Layout/Reveal';
import { PROFESSIONAL_CATEGORIES } from './publicSiteData';
import logoUrl from '../../images/logo-sistema/logo.png';
import heroPhotoUrl from '../../images/hero-consultorio.png';
import { useSEO } from '../../hooks/useSEO';

const RESOURCE_TABS = [
  {
    key: 'agenda', icon: Calendar, title: 'Agenda', sub: 'Sua rotina organizada',
    heading: 'A manhã já começa organizada',
    desc: 'Consultas, lembretes automáticos e disponibilidade de cada profissional em um só calendário — online e presencial, sem conflito de horário.',
    bullets: ['Confirmação de presença automática por WhatsApp', 'Bloqueios de agenda e pausas protegidas', 'Reagendamento sem trocar mensagens manuais'],
  },
  {
    key: 'prontuario', icon: HeartHandshake, title: 'Prontuário', sub: 'Histórico em um lugar só',
    heading: 'Todo o histórico do paciente, sempre à mão',
    desc: 'Evolução clínica, documentos, formulários e planos terapêuticos no mesmo fluxo — sem pasta física e sem procurar em outro sistema.',
    bullets: ['Prontuário eletrônico com histórico de evolução', 'Formulários e anamneses digitais', 'Planos terapêuticos individualizados (PEI)'],
  },
  {
    key: 'ia', icon: Sparkles, title: 'Bia IA', sub: 'Apoio na documentação',
    heading: 'Apoio na burocracia, sem substituir seu julgamento clínico',
    desc: 'A Bia organiza anotações e ajuda a estruturar relatórios a partir do que você já registrou — a decisão clínica continua sempre sua.',
    bullets: ['Organização de anotações de sessão', 'Apoio na estruturação de relatórios', 'Você revisa e aprova tudo antes de salvar'],
  },
  {
    key: 'financeiro', icon: BarChart2, title: 'Financeiro', sub: 'Contas em dia',
    heading: 'O financeiro se fecha sem depender de planilha',
    desc: 'Receitas, comandas, repasses e emissão de NFS-e direto do atendimento — visão clara de quanto entrou e quanto falta receber.',
    bullets: ['Comandas vinculadas ao atendimento', 'Emissão de nota fiscal de serviço (NFS-e)', 'Relatórios financeiros por período'],
  },
  {
    key: 'portal', icon: Video, title: 'Portal do Paciente', sub: 'Autonomia pro paciente',
    heading: 'O cuidado continua entre as sessões',
    desc: 'Seu paciente acessa a própria agenda, documentos, pagamentos e notas fiscais sem precisar te chamar no WhatsApp para cada dúvida.',
    bullets: ['Agenda e histórico próprios do paciente', 'Download de documentos e nota fiscal', 'Sala virtual para atendimento remoto'],
  },
  {
    key: 'clinica', icon: Building2, title: 'Gestão de Clínica', sub: 'Toda a equipe junta',
    heading: 'Toda a equipe em sintonia, com a visão que cada um precisa',
    desc: 'Múltiplos profissionais, salas e permissões por papel — cada pessoa vê exatamente o que precisa para trabalhar, sem bagunça.',
    bullets: ['Múltiplos profissionais e salas na mesma conta', 'Permissões de acesso por papel', 'Indicadores consolidados da clínica'],
  },
] as const;

const FAQ_ITEMS = [
  {
    q: 'O que é a Plaelo?',
    a: 'A Plaelo é um sistema de gestão para profissionais e clínicas de saúde mental — psicólogos, psiquiatras, terapeutas e toda a rede de cuidado. Reúne agenda, prontuário, financeiro, documentos e comunicação com pacientes em um único lugar.',
  },
  {
    q: 'Funciona para clínicas com vários profissionais?',
    a: 'Sim. Além do plano individual, a Plaelo atende clínicas com múltiplos profissionais, salas e permissões de acesso configuráveis por papel dentro da equipe.',
  },
  {
    q: 'A Plaelo atende online e presencial?',
    a: 'Sim, os dois. Você organiza consultas presenciais e remotas na mesma agenda, e conta com sala virtual integrada para o atendimento online.',
  },
  {
    q: 'É seguro guardar dados de pacientes na Plaelo?',
    a: 'Sim. Os dados são tratados com criptografia e a plataforma segue os princípios da LGPD para dados sensíveis de saúde.',
  },
  {
    q: 'Como funciona o suporte da Plaelo?',
    a: 'Você fala diretamente com nosso time durante a configuração inicial e sempre que precisar de ajuda — sem depender só de central de ajuda automatizada.',
  },
] as const;

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const go = () => navigate(isAuthenticated ? '/dashboard' : '/login');
  const [activeTab, setActiveTab] = useState<typeof RESOURCE_TABS[number]['key']>('agenda');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const activeResource = RESOURCE_TABS.find((t) => t.key === activeTab) || RESOURCE_TABS[0];

  useSEO({
    title: 'Plaelo — Sistema para Clínicas de Saúde Mental',
    description: 'Plaelo é o sistema completo para profissionais e clínicas de saúde mental — psicólogos, psiquiatras, terapeutas e toda a rede de cuidado. Agenda inteligente, prontuário digital, atendimento remoto, financeiro e IA integrada.',
    path: '/',
  });

  return (
    <PublicSiteShell>
      {/* ═══ HERO — texto à esquerda, foto em tela cheia à direita ═══ */}
      <section className="hero-split">
        <Reveal delay={100} className="hero-split-media">
          <img src={heroPhotoUrl} alt="Consultório acolhedor de saúde mental" className="hero-split-media-img" />
          <div className="hero-split-media-overlay" />
          <div className="hero-split-badge">
            <strong>Bia IA</strong>
            <span>Resumo pronto p/ revisão</span>
          </div>
        </Reveal>

        <div className="wrap hero-split-grid">
          <Reveal className="hero-split-text">
            <span className="tag" style={{ marginBottom: 16, display: 'inline-flex' }}>
              <HeartHandshake size={13} /> Gestão para saúde mental
            </span>

            <h1 style={{ fontSize: 'clamp(30px,4.2vw,50px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.08, marginBottom: 16, color: 'var(--ink)', fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
              Profissionais livres para <span className="hero-accent">cuidar</span>.
            </h1>

            <p style={{ fontSize: 'clamp(15px,1.2vw,17px)', lineHeight: 1.6, color: 'var(--muted)', marginBottom: 28 }}>
              Agenda, prontuário, financeiro e IA em uma única plataforma para psicólogos, psiquiatras e terapeutas.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              <button className="btn-p" onClick={go}>
                Criar conta grátis <ArrowRight size={17} />
              </button>
              <button className="btn-g" onClick={go}>
                Acessar o sistema
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>14 dias grátis. Sem cartão de crédito.</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', fontSize: 13, color: 'var(--muted)' }}>
              {['Sem fidelidade', 'IA inclusa', 'LGPD compliant'].map((label) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle size={13} style={{ color: 'var(--accent2)' }} /> {label}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ PARA QUEM É ═══ */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="wrap">
          <Reveal style={{ textAlign: 'center', marginBottom: 'clamp(36px,4.5vw,52px)' }}>
            <span className="tag" style={{ marginBottom: 18, display: 'inline-flex' }}>Cada jornada, uma plataforma</span>
            <h2 style={{ fontSize: 'clamp(24px,3.8vw,40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 16, fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
              Para quem é a Plaelo?
            </h2>
          </Reveal>
          <div className="persona-grid">
            <Reveal as="a" className="persona-card hover-lift" style={{ cursor: 'pointer' }} onClick={go}>
              <img src={heroPhotoUrl} alt="Psicólogo atendendo individualmente" className="persona-card-img" />
              <div className="persona-card-overlay" />
              <div className="persona-card-tag">
                <strong>Ana Beatriz</strong>
                <span>Psicóloga clínica</span>
              </div>
              <div className="persona-card-content">
                <h3>Para psicólogos individuais</h3>
                <p>Para quem atende sozinho e quer organizar agenda, pacientes, prontuário e financeiro em um único sistema.</p>
                <span className="persona-card-cta">Sou individual <ArrowRight size={15} /></span>
              </div>
            </Reveal>
            <Reveal as="a" delay={90} className="persona-card hover-lift" style={{ cursor: 'pointer' }} onClick={go}>
              <img src={heroPhotoUrl} alt="Equipe de clínica de psicologia" className="persona-card-img" />
              <div className="persona-card-overlay" />
              <div className="persona-card-tag">
                <strong>Clínica EntreNós</strong>
                <span>Equipe multiprofissional</span>
              </div>
              <div className="persona-card-content">
                <h3>Para clínicas de psicologia</h3>
                <p>Para clínicas com vários profissionais, salas, atendimentos e gestão financeira centralizados.</p>
                <span className="persona-card-cta">Sou clínica <ArrowRight size={15} /></span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ ÁREAS ATENDIDAS ═══ */}
      <section className="section" style={{ background: 'var(--surface)' }}>
        <div className="wrap-sm" style={{ textAlign: 'center' }}>
          <Reveal>
            <span className="tag" style={{ marginBottom: 20, display: 'inline-flex' }}>Para todo o time de cuidado</span>
            <h2 style={{ fontSize: 'clamp(24px,3.8vw,40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 16, marginBottom: 16, fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
              Feito para quem cuida da saúde mental
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 560, margin: '0 auto 52px' }}>
              De psicólogos a psiquiatras, de terapeutas ocupacionais a assistentes sociais — a Plaelo se adapta ao registro profissional e à rotina de cada especialidade.
            </p>
          </Reveal>
          <div className="area-list">
            {PROFESSIONAL_CATEGORIES.map((cat, i) => (
              <Reveal className="area-row" key={cat.key} delay={i * 70}>
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
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ RECURSOS (tabs interativas) ═══ */}
      <section className="section" style={{ background: '#fff' }}>
        <span className="bg-blob" style={{ width: 280, height: 280, top: -60, right: '-6%', background: 'var(--accent-soft)' }} />
        <span className="bg-blob" style={{ width: 200, height: 200, bottom: 20, left: '-4%', background: '#E4F8EE', animationDelay: '-6s' }} />
        <div className="wrap">
          <Reveal style={{ textAlign: 'center', marginBottom: 'clamp(36px,4.5vw,52px)' }}>
            <span className="tag" style={{ marginBottom: 18, display: 'inline-flex' }}>Recursos</span>
            <h2 style={{ fontSize: 'clamp(24px,3.8vw,40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 16, marginBottom: 14, fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
              Toda a rotina clínica, acontecendo em silêncio
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 560, margin: '0 auto' }}>
              Agenda, prontuário, financeiro, pacientes e IA trabalhando juntos em um único sistema para saúde mental.
            </p>
          </Reveal>

          <div className="res-tabs">
            {RESOURCE_TABS.map(({ key, icon: Icon, title, sub }) => (
              <button
                key={key}
                type="button"
                className={`res-tab${activeTab === key ? ' active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                <span className="res-tab-icon"><Icon size={13} /></span>
                <span>
                  <span className="res-tab-title">{title}</span>
                  <span className="res-tab-sub">{sub}</span>
                </span>
              </button>
            ))}
          </div>

          <Reveal key={activeResource.key} className="res-panel">
            <div className="res-panel-visual">
              <img src={heroPhotoUrl} alt={activeResource.heading} />
            </div>
            <div className="res-panel-info">
              <span className="tag" style={{ alignSelf: 'flex-start' }}>
                <activeResource.icon size={13} /> {activeResource.title}
              </span>
              <h3>{activeResource.heading}</h3>
              <p>{activeResource.desc}</p>
              <div className="res-panel-list">
                {activeResource.bullets.map((b) => (
                  <div className="res-panel-list-item" key={b}>
                    <CheckCircle size={16} /> <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link to="/funcionalidades" className="link-arrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
              Ver todas as funcionalidades <ChevronRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--surface)' }}>
        <span className="bg-blob" style={{ width: 320, height: 320, top: '10%', right: '-8%', background: '#fff', animationDelay: '-3s' }} />
        <div className="wrap">
          <Reveal style={{ maxWidth: 600, marginBottom: 38 }}>
            <span className="tag" style={{ marginBottom: 18, display: 'inline-flex' }}>Uma rotina mais leve</span>
            <h2 style={{ fontSize: 'clamp(24px,3.8vw,40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 16, marginBottom: 14 }}>
              Da primeira consulta ao acompanhamento financeiro, tudo conversa entre si.
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--muted)' }}>
              Menos alternância entre ferramentas e mais tempo para decisões que realmente fazem diferença no cuidado.
            </p>
          </Reveal>
          <div className="journey-grid">
            {[
              { icon: Calendar, title: 'Organize sua agenda', desc: 'Centralize horários, modalidades de atendimento, lembretes e a disponibilidade de toda a equipe.' },
              { icon: HeartHandshake, title: 'Cuide com contexto', desc: 'Acesse prontuários, formulários, planos terapêuticos e documentos no mesmo fluxo de trabalho.' },
              { icon: TrendingUp, title: 'Acompanhe sua evolução', desc: 'Visualize indicadores clínicos e financeiros para conduzir sua prática com mais clareza.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <Reveal as="article" className="journey-card hover-lift" key={title} delay={i * 100}>
                <div style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', background: 'var(--accent-soft)', marginBottom: 18 }}>
                  <Icon size={19} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.02em', marginBottom: 9 }}>{title}</h3>
                <p>{desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SEGURANÇA ═══ */}
      <section className="section" style={{ background: 'var(--surface)' }}>
        <div className="wrap-sm" style={{ textAlign: 'center' }}>
          <Reveal>
            <span className="tag tag-green" style={{ marginBottom: 18, display: 'inline-flex' }}>
              <ShieldCheck size={13} /> Infraestrutura Plaelo
            </span>
            <h2 style={{ fontSize: 'clamp(24px,3.8vw,40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 16, marginBottom: 14, fontFamily: "'Plus Jakarta Sans','Inter',sans-serif" }}>
              Máxima segurança
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 480, margin: '0 auto 40px' }}>
              Segurança para prontuários, documentos e dados clínicos dos seus pacientes.
            </p>
          </Reveal>
          <div className="security-grid">
            {[
              { icon: Lock, title: 'Criptografia', desc: 'Dados protegidos em trânsito e em repouso.' },
              { icon: FileLock2, title: 'Conformidade com a LGPD', desc: 'Tratamento de dados sensíveis de saúde dentro da lei.' },
              { icon: ScanEye, title: 'Os dados pertencem a você', desc: 'Exportação e portabilidade dos seus dados quando precisar.' },
              { icon: Server, title: 'Infraestrutura dedicada', desc: 'Ambiente preparado para a demanda da sua clínica.' },
              { icon: Shield, title: 'Backups regulares', desc: 'Rotina de backup para reduzir risco de perda de dado.' },
              { icon: UsersRound, title: 'Permissões por papel', desc: 'Cada pessoa da equipe acessa só o que precisa.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <Reveal className="security-item" key={title} delay={i * 60}>
                <span className="security-item-icon"><Icon size={17} /></span>
                <div>
                  <h4>{title}</h4>
                  <p>{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="wrap-sm">
          <Reveal style={{ marginBottom: 36 }}>
            <span className="tag" style={{ marginBottom: 18, display: 'inline-flex' }}>Antes de começar</span>
            <h2 style={{ fontSize: 'clamp(24px,3.8vw,40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 16 }}>
              Algumas respostas importantes
            </h2>
          </Reveal>
          <div className="faq-list">
            {FAQ_ITEMS.map((item, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={item.q}
                  className={`faq-item${open ? ' open' : ''}`}
                  onClick={() => setOpenFaq(open ? null : i)}
                >
                  <div className="faq-q">
                    <h4>{item.q}</h4>
                    <span className="faq-q-icon"><Plus size={14} /></span>
                  </div>
                  <p className="faq-a">{item.a}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section className="section" style={{ background: 'var(--surface)' }}>
        <div className="wrap">
          <Reveal className="cta-final">
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
          </Reveal>
        </div>
      </section>
    </PublicSiteShell>
  );
};
