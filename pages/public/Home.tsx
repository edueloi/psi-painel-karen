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
    key: 'agenda',
    icon: Calendar,
    title: 'Agenda',
    sub: 'Sua rotina organizada',
    heading: 'Sua agenda trabalha junto com você',
    desc: 'Consultas, disponibilidade, modalidades de atendimento e lembretes automáticos no mesmo fluxo — sem depender de planilhas ou conversas soltas.',
    bullets: [
      'Confirmação de presença automática por WhatsApp',
      'Bloqueios, pausas e disponibilidade em um só calendário',
      'Reagendamento com menos troca de mensagens',
    ],
  },
  {
    key: 'prontuario',
    icon: HeartHandshake,
    title: 'Prontuário',
    sub: 'Histórico em um lugar só',
    heading: 'O contexto clínico fica onde você precisa',
    desc: 'Evoluções, formulários, documentos e planos terapêuticos organizados para reduzir procura manual e manter o histórico do paciente acessível.',
    bullets: [
      'Prontuário eletrônico com histórico de evolução',
      'Formulários e anamneses digitais',
      'Planos terapêuticos individualizados',
    ],
  },
  {
    key: 'ia',
    icon: Sparkles,
    title: 'Bia IA',
    sub: 'Apoio para a rotina',
    heading: 'IA para apoiar tarefas, sem substituir seu julgamento',
    desc: 'A Bia ajuda a organizar informações, estruturar documentos e apoiar rotinas administrativas a partir do que você já registrou.',
    bullets: [
      'Apoio na organização de anotações',
      'Estruturação assistida de relatórios e documentos',
      'Você revisa e aprova antes de salvar',
    ],
  },
  {
    key: 'financeiro',
    icon: BarChart2,
    title: 'Financeiro',
    sub: 'Visão clara do caixa',
    heading: 'Menos planilha para entender o financeiro',
    desc: 'Receitas, recebimentos, repasses e emissão de NFS-e conectados ao atendimento para facilitar a visão do que entrou e do que ainda está pendente.',
    bullets: [
      'Recebimentos vinculados aos atendimentos',
      'Emissão de NFS-e dentro do fluxo',
      'Relatórios financeiros por período',
    ],
  },
  {
    key: 'portal',
    icon: Video,
    title: 'Portal do Paciente',
    sub: 'Mais autonomia',
    heading: 'O paciente encontra o que precisa sem depender do WhatsApp',
    desc: 'Agenda, documentos, pagamentos, notas fiscais e acesso ao atendimento remoto ficam disponíveis em um espaço próprio.',
    bullets: [
      'Agenda e histórico do próprio paciente',
      'Acesso a documentos e notas fiscais',
      'Sala virtual para atendimento remoto',
    ],
  },
  {
    key: 'clinica',
    icon: Building2,
    title: 'Gestão de Clínica',
    sub: 'Equipe em sintonia',
    heading: 'Uma visão para a clínica, outra para cada profissional',
    desc: 'Profissionais, salas, permissões e indicadores em uma única estrutura, respeitando o que cada pessoa precisa acessar.',
    bullets: [
      'Múltiplos profissionais e salas',
      'Permissões de acesso por papel',
      'Indicadores consolidados da operação',
    ],
  },
] as const;

const FAQ_ITEMS = [
  {
    q: 'O que é a Plaelo?',
    a: 'A Plaelo é uma plataforma de gestão para profissionais e clínicas de saúde mental. Reúne agenda, prontuário, financeiro, documentos, comunicação com pacientes e outros recursos em um único ambiente.',
  },
  {
    q: 'Funciona para clínicas com vários profissionais?',
    a: 'Sim. A Plaelo atende tanto profissionais individuais quanto clínicas com múltiplos profissionais, salas e permissões de acesso por perfil.',
  },
  {
    q: 'A Plaelo atende online e presencial?',
    a: 'Sim. É possível organizar consultas presenciais e remotas na mesma agenda e utilizar recursos voltados ao atendimento online.',
  },
  {
    q: 'Como a Plaelo trata os dados dos pacientes?',
    a: 'A plataforma foi pensada para trabalhar com dados sensíveis de saúde, com controles de acesso e recursos voltados à privacidade e aos princípios da LGPD.',
  },
  {
    q: 'Como funciona o suporte?',
    a: 'Durante a configuração e o uso da plataforma, você pode contar com suporte para dúvidas sobre a utilização dos recursos e a organização inicial do sistema.',
  },
] as const;

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const go = () => navigate(isAuthenticated ? '/dashboard' : '/login');

  const [activeTab, setActiveTab] =
    useState<typeof RESOURCE_TABS[number]['key']>('agenda');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const activeResource =
    RESOURCE_TABS.find((item) => item.key === activeTab) || RESOURCE_TABS[0];

  const ActiveResourceIcon = activeResource.icon;

  useSEO({
    title: 'Plaelo — Gestão para Profissionais e Clínicas de Saúde Mental',
    description:
      'Agenda, prontuário, financeiro, documentos, automações e IA em uma única plataforma para profissionais e clínicas de saúde mental.',
    path: '/',
  });

  return (
    <PublicSiteShell>
      {/* ═══ HERO ═══ */}
      <section className="hero-home">
        <div className="hero-home-bg" aria-hidden="true">
          <img src={heroPhotoUrl} alt="" className="hero-home-bg-img" />
        </div>

        <div className="hero-home-overlay" aria-hidden="true" />
        <div className="hero-home-glow hero-home-glow-a" aria-hidden="true" />
        <div className="hero-home-glow hero-home-glow-b" aria-hidden="true" />

        <div className="wrap hero-home-grid">
          <Reveal className="hero-home-copy">
            <span className="tag hero-home-tag">
              <HeartHandshake size={13} />
              Plataforma completa para profissionais da saúde
            </span>

            <h1 className="hero-home-title">
              Menos gestão.
              <span className="hero-accent"> Mais tempo</span>
              <br />
              para cuidar.
            </h1>

            <p className="hero-home-subtitle">
              Agenda, prontuário, financeiro, documentos, NFS-e, lembretes
              automáticos e IA em um só lugar para deixar sua rotina mais leve.
            </p>

            <div className="hero-home-actions">
              <button className="btn-p hero-home-primary" onClick={go}>
                Começar grátis por 14 dias <ArrowRight size={17} />
              </button>

              <Link to="/funcionalidades" className="btn-g hero-home-secondary">
                Conhecer a plataforma
              </Link>
            </div>

            <p className="hero-home-note">
              Sem cartão de crédito. Cancele quando quiser.
            </p>

            <div className="hero-home-benefits">
              {['Sem fidelidade', 'IA integrada', 'Privacidade e LGPD'].map((label) => (
                <span key={label}>
                  <CheckCircle size={14} /> {label}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={100} className="hero-home-visual">
            <div className="hero-product-card">
              <div className="hero-product-topbar">
                <div className="hero-product-brand">
                  <img src={logoUrl} alt="" />
                  <span>Plaelo</span>
                </div>
                <span className="hero-product-status">
                  <i /> Rotina organizada
                </span>
              </div>

              <div className="hero-product-body">
                <div className="hero-product-sidebar">
                  <span className="active"><Calendar size={13} /> Agenda</span>
                  <span><HeartHandshake size={13} /> Pacientes</span>
                  <span><BarChart2 size={13} /> Financeiro</span>
                </div>

                <div className="hero-product-main">
                  <div className="hero-product-heading">
                    <div>
                      <span>Hoje</span>
                      <strong>Sua agenda</strong>
                    </div>
                    <Calendar size={18} />
                  </div>

                  <div className="hero-appointment">
                    <time>09:00</time>
                    <div><strong>Consulta</strong><span>Presencial</span></div>
                    <em>Confirmada</em>
                  </div>

                  <div className="hero-appointment">
                    <time>10:30</time>
                    <div><strong>Retorno</strong><span>Online</span></div>
                    <em>Confirmada</em>
                  </div>

                  <div className="hero-appointment muted">
                    <time>14:00</time>
                    <div><strong>Primeira consulta</strong><span>Online</span></div>
                    <em>Pendente</em>
                  </div>
                </div>
              </div>
            </div>

            <div className="hero-float-card hero-float-ai">
              <span className="hero-float-icon"><Sparkles size={16} /></span>
              <div>
                <strong>Bia IA</strong>
                <small>Resumo pronto para revisão</small>
              </div>
            </div>

            <div className="hero-float-card hero-float-reminder">
              <span className="hero-float-icon green"><CheckCircle size={16} /></span>
              <div>
                <strong>Lembrete automático</strong>
                <small>Paciente avisado pelo WhatsApp</small>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ PARA QUEM É ═══ */}
      <section className="home-section home-audience">
        <div className="wrap">
          <Reveal className="home-section-head">
            <span className="tag">Uma plataforma, duas formas de trabalhar</span>
            <h2>Do consultório individual à clínica com toda a equipe.</h2>
            <p>
              A Plaelo se adapta à sua rotina sem transformar uma operação simples
              em algo complicado.
            </p>
          </Reveal>

          <div className="home-audience-grid">
            <Reveal className="home-audience-card home-audience-card-individual">
              <div className="home-audience-icon">
                <HeartHandshake size={22} />
              </div>

              <div className="home-audience-copy">
                <span>Para quem atende sozinho</span>
                <h3>Seu consultório organizado sem perder a leveza.</h3>
                <p>
                  Agenda, pacientes, prontuário, documentos e financeiro conectados
                  em um fluxo simples para o dia a dia.
                </p>
              </div>

              <div className="home-audience-mini-ui">
                <div className="home-mini-top">
                  <span>Hoje</span>
                  <strong>4 atendimentos</strong>
                </div>
                <div className="home-mini-row">
                  <i />
                  <div><strong>09:00</strong><span>Consulta presencial</span></div>
                  <CheckCircle size={15} />
                </div>
                <div className="home-mini-row">
                  <i />
                  <div><strong>11:30</strong><span>Atendimento online</span></div>
                  <CheckCircle size={15} />
                </div>
              </div>

              <button className="home-text-link" onClick={go}>
                Começar como profissional <ArrowRight size={16} />
              </button>
            </Reveal>

            <Reveal delay={90} className="home-audience-card home-audience-card-clinic">
              <div className="home-audience-icon">
                <Building2 size={22} />
              </div>

              <div className="home-audience-copy">
                <span>Para clínicas e equipes</span>
                <h3>Visão central da operação, sem tirar autonomia do time.</h3>
                <p>
                  Organize profissionais, salas, agenda, permissões e indicadores em
                  uma única estrutura.
                </p>
              </div>

              <div className="home-clinic-grid">
                <div>
                  <UsersRound size={17} />
                  <strong>Equipe</strong>
                  <span>Perfis e permissões</span>
                </div>
                <div>
                  <Calendar size={17} />
                  <strong>Agenda</strong>
                  <span>Salas e profissionais</span>
                </div>
                <div>
                  <BarChart2 size={17} />
                  <strong>Gestão</strong>
                  <span>Visão consolidada</span>
                </div>
              </div>

              <button className="home-text-link" onClick={go}>
                Conhecer para clínicas <ArrowRight size={16} />
              </button>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ PROFISSIONAIS ═══ */}
      <section className="home-section home-professions">
        <div className="wrap">
          <div className="home-professions-layout">
            <Reveal className="home-professions-copy">
              <span className="tag">Para todo o time de cuidado</span>
              <h2>Feita para diferentes rotinas da saúde mental.</h2>
              <p>
                A estrutura da Plaelo acompanha diferentes especialidades sem
                deixar a experiência pesada ou genérica.
              </p>

              <Link to="/funcionalidades" className="home-inline-link">
                Ver funcionalidades <ChevronRight size={17} />
              </Link>
            </Reveal>

            <div className="home-profession-stack">
              {PROFESSIONAL_CATEGORIES.map((cat, index) => (
                <Reveal
                  className="home-profession-row"
                  key={cat.key}
                  delay={index * 55}
                >
                  <div
                    className="home-profession-row-icon"
                    style={{ background: cat.bg, color: cat.color }}
                  >
                    <cat.icon size={18} />
                  </div>

                  <div className="home-profession-row-main">
                    <strong>{cat.title}</strong>
                    <span>{cat.professions.join(' · ')}</span>
                  </div>

                  <small>{cat.professions.length} áreas</small>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ RECURSOS ═══ */}
      <section className="home-section home-features">
        <div className="home-feature-glow" aria-hidden="true" />

        <div className="wrap">
          <Reveal className="home-section-head home-section-head-left">
            <span className="tag">Tudo conectado</span>
            <h2>Uma plataforma que acompanha o atendimento do início ao fim.</h2>
            <p>
              Escolha um recurso para ver como cada parte da rotina se conecta
              dentro da Plaelo.
            </p>
          </Reveal>

          <div className="home-feature-shell">
            <div className="home-feature-tabs">
              {RESOURCE_TABS.map(({ key, icon: Icon, title, sub }) => (
                <button
                  key={key}
                  type="button"
                  className={`home-feature-tab${activeTab === key ? ' active' : ''}`}
                  onClick={() => setActiveTab(key)}
                >
                  <span className="home-feature-tab-icon">
                    <Icon size={17} />
                  </span>

                  <span className="home-feature-tab-copy">
                    <strong>{title}</strong>
                    <small>{sub}</small>
                  </span>

                  <ChevronRight size={17} className="home-feature-tab-arrow" />
                </button>
              ))}
            </div>

            <Reveal key={activeResource.key} className="home-feature-panel">
              <div className="home-feature-panel-copy">
                <span className="home-feature-panel-label">
                  <ActiveResourceIcon size={14} />
                  {activeResource.title}
                </span>

                <h3>{activeResource.heading}</h3>
                <p>{activeResource.desc}</p>

                <div className="home-feature-list">
                  {activeResource.bullets.map((item) => (
                    <div key={item}>
                      <CheckCircle size={16} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <Link to="/funcionalidades" className="home-inline-link">
                  Explorar todos os recursos <ArrowRight size={16} />
                </Link>
              </div>

              <div className="home-feature-demo">
                <div className="home-feature-demo-window">
                  <div className="home-feature-demo-topbar">
                    <div>
                      <i />
                      <i />
                      <i />
                    </div>
                    <span>plaelo.com.br</span>
                  </div>

                  <div className="home-feature-demo-body">
                    <aside>
                      <img src={logoUrl} alt="" />
                      {RESOURCE_TABS.slice(0, 4).map(({ key, icon: Icon }) => (
                        <span
                          key={key}
                          className={key === activeTab ? 'active' : ''}
                        >
                          <Icon size={14} />
                        </span>
                      ))}
                    </aside>

                    <main>
                      <div className="home-feature-demo-heading">
                        <span>Visão geral</span>
                        <strong>{activeResource.title}</strong>
                      </div>

                      <div className="home-feature-demo-metrics">
                        <div>
                          <span>Hoje</span>
                          <strong>Organizado</strong>
                        </div>
                        <div>
                          <span>Status</span>
                          <strong>Em dia</strong>
                        </div>
                      </div>

                      <div className="home-feature-demo-card">
                        <div className="home-feature-demo-card-title">
                          <ActiveResourceIcon size={16} />
                          <strong>{activeResource.heading}</strong>
                        </div>

                        {activeResource.bullets.map((item) => (
                          <div className="home-feature-demo-line" key={item}>
                            <span />
                            <p>{item}</p>
                            <CheckCircle size={14} />
                          </div>
                        ))}
                      </div>
                    </main>
                  </div>
                </div>

                <div className="home-feature-float">
                  <Sparkles size={16} />
                  <div>
                    <strong>Bia</strong>
                    <span>apoio dentro da plataforma</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ FLUXO ═══ */}
      <section className="home-section home-flow">
        <div className="wrap">
          <Reveal className="home-section-head">
            <span className="tag">Uma rotina mais leve</span>
            <h2>Menos troca de ferramenta. Mais continuidade no trabalho.</h2>
            <p>
              A informação acompanha o atendimento para você não precisar
              reconstruir o contexto a cada etapa.
            </p>
          </Reveal>

          <div className="home-flow-grid">
            {[
              {
                icon: Calendar,
                step: '01',
                title: 'Organize',
                desc: 'Agenda, disponibilidade, lembretes e modalidades de atendimento no mesmo fluxo.',
              },
              {
                icon: HeartHandshake,
                step: '02',
                title: 'Atenda',
                desc: 'Acesse prontuário, formulários, documentos e histórico sem sair da rotina.',
              },
              {
                icon: TrendingUp,
                step: '03',
                title: 'Acompanhe',
                desc: 'Visualize financeiro, pendências e indicadores para conduzir a prática com clareza.',
              },
            ].map(({ icon: Icon, step, title, desc }, index) => (
              <Reveal className="home-flow-card" key={step} delay={index * 90}>
                <span className="home-flow-number">{step}</span>
                <div className="home-flow-icon"><Icon size={20} /></div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SEGURANÇA ═══ */}
      <section className="home-security">
        <div className="wrap home-security-grid">
          <Reveal className="home-security-copy">
            <span className="home-security-kicker">
              <ShieldCheck size={15} /> Segurança e privacidade
            </span>

            <h2>Dados de saúde merecem uma estrutura pensada para eles.</h2>

            <p>
              Controles de acesso, privacidade e recursos de proteção fazem parte
              da experiência da Plaelo para profissionais e equipes.
            </p>

            <Link to="/sobre" className="home-security-link">
              Conhecer a Plaelo <ArrowRight size={16} />
            </Link>
          </Reveal>

          <div className="home-security-cards">
            {[
              {
                icon: Lock,
                title: 'Proteção de acesso',
                desc: 'Controle de acesso aos dados e às áreas da plataforma.',
              },
              {
                icon: FileLock2,
                title: 'Privacidade e LGPD',
                desc: 'Fluxos pensados para o tratamento responsável de dados sensíveis.',
              },
              {
                icon: ScanEye,
                title: 'Permissões por perfil',
                desc: 'Cada pessoa da equipe acessa apenas o que precisa para trabalhar.',
              },
              {
                icon: Server,
                title: 'Continuidade da operação',
                desc: 'Estrutura preparada para apoiar a rotina de profissionais e clínicas.',
              },
            ].map(({ icon: Icon, title, desc }, index) => (
              <Reveal
                className="home-security-card"
                key={title}
                delay={index * 60}
              >
                <span><Icon size={18} /></span>
                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="home-section home-faq">
        <div className="wrap home-faq-grid">
          <Reveal className="home-faq-copy">
            <span className="tag">Antes de começar</span>
            <h2>Dúvidas comuns sobre a Plaelo.</h2>
            <p>
              O essencial para entender como a plataforma se encaixa na sua rotina.
            </p>

            <Link to="/ajuda" className="home-inline-link">
              Ver central de ajuda <ArrowRight size={16} />
            </Link>
          </Reveal>

          <div className="home-faq-list">
            {FAQ_ITEMS.map((item, index) => {
              const open = openFaq === index;

              return (
                <button
                  type="button"
                  className={`home-faq-item${open ? ' open' : ''}`}
                  key={item.q}
                  onClick={() => setOpenFaq(open ? null : index)}
                >
                  <span className="home-faq-question">
                    <strong>{item.q}</strong>
                    <span className="home-faq-plus"><Plus size={16} /></span>
                  </span>

                  <span className="home-faq-answer">{item.a}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section className="home-final">
        <div className="home-final-glow home-final-glow-a" aria-hidden="true" />
        <div className="home-final-glow home-final-glow-b" aria-hidden="true" />

        <div className="wrap">
          <Reveal className="home-final-card">
            <div className="home-final-copy">
              <span className="home-final-kicker">
                <Sparkles size={15} /> Comece no seu ritmo
              </span>

              <h2>
                Sua rotina pode ser mais simples
                <span> a partir do próximo atendimento.</span>
              </h2>

              <p>
                Experimente a Plaelo e veja como agenda, prontuário, financeiro,
                documentos e automações podem trabalhar juntos.
              </p>

              <div className="home-final-actions">
                <button className="home-final-primary" onClick={go}>
                  Começar grátis por 14 dias
                  <ArrowRight size={18} />
                </button>

                <Link to="/planos" className="home-final-secondary">
                  Ver planos
                </Link>
              </div>

              <small>Sem cartão de crédito. Sem fidelidade.</small>
            </div>

            <div className="home-final-points">
              {[
                { icon: Calendar, title: 'Tudo em um só lugar', text: 'Menos alternância entre ferramentas.' },
                { icon: Sparkles, title: 'IA integrada', text: 'Apoio para tarefas e documentação.' },
                { icon: Shield, title: 'Privacidade em foco', text: 'Estrutura pensada para dados sensíveis.' },
              ].map(({ icon: Icon, title, text }) => (
                <div className="home-final-point" key={title}>
                  <span><Icon size={18} /></span>
                  <div>
                    <strong>{title}</strong>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </PublicSiteShell>
  );
};
