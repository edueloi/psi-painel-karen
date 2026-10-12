import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Check,
} from "lucide-react";
import {
  MarketingShell,
  MarketingHeading,
  MarketingCTA,
  MarketingFAQ,
  MarketingChecks,
} from "../../components/Layout/MarketingShell";
import { ProductPreview } from "../../components/Layout/ProductPreview";
import { Reveal } from "../../components/Layout/Reveal";
import { MARKETING_FEATURES, MARKETING_FAQ } from "./marketingData";
import { PROFESSIONAL_CATEGORIES } from "./publicSiteData";
import { useSEO } from "../../hooks/useSEO";
import { PUBLIC_SEO } from "../../seo/publicSeo.mjs";

export function Home() {
  useSEO(PUBLIC_SEO["/"]);
  return (
    <MarketingShell>
      <section className="ps-hero">
        <div className="ps-wrap ps-hero-grid">
          <Reveal className="ps-hero-copy">
            <span className="ps-eyebrow">
              <span aria-hidden="true">✳</span> Conectando cuidado e gestão
            </span>
            <h1>
              Mais presença
              <br />
              no cuidado.
              <br />
              <em>
                Menos peso
                <br />
                na rotina.
              </em>
            </h1>
            <p>
              Agenda, prontuário e financeiro trabalhando juntos. Um espaço para
              organizar sua clínica e se dedicar ao que realmente importa: as
              pessoas.
            </p>
            <div className="ps-actions">
              <Link to="/cadastro" className="ps-button">
                Conhecer a Plaelo <ArrowRight size={17} />
              </Link>
              <a href="#recursos" className="ps-button ps-button-outline">
                Explorar os recursos
              </a>
            </div>
            <div className="ps-hero-note">
              <span>
                <Check size={13} /> Para consultórios e clínicas
              </span>
              <span>
                <Check size={13} /> Online e presencial
              </span>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <ProductPreview />
          </Reveal>
        </div>
      </section>
      <div className="ps-wrap ps-trust-strip">
        <p>O essencial da sua rotina, conectado.</p>
        <div>
          <span>
            <CalendarDays size={16} /> Agenda
          </span>
          <span>
            <FileText size={16} /> Prontuário
          </span>
          <span>
            <Wallet size={16} /> Financeiro
          </span>
          <span>
            <Sparkles size={16} /> IA integrada
          </span>
        </div>
      </div>
      <section id="recursos" className="ps-section ps-section-soft">
        <div className="ps-wrap">
          <div className="ps-section-top">
            <MarketingHeading
              eyebrow="Tudo encontra seu lugar"
              title={
                <>
                  Menos ferramentas soltas.
                  <br />
                  Mais continuidade.
                </>
              }
              description="Do agendamento ao acompanhamento, cada etapa conversa com a próxima."
            />
            <Link to="/funcionalidades" className="ps-text-link">
              Ver todos os recursos <ArrowRight size={16} />
            </Link>
          </div>
          <div className="ps-bento">
            {MARKETING_FEATURES.slice(0, 3).map(
              ({ key, icon: Icon, title, description, bullets }, index) => (
                <Reveal
                  key={key}
                  as="article"
                  className="ps-feature-card"
                  delay={index * 70}
                >
                  <span className="ps-icon">
                    <Icon size={22} />
                  </span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <MarketingChecks items={bullets} />
                </Reveal>
              ),
            )}
          </div>
        </div>
      </section>
      <section className="ps-section">
        <div className="ps-wrap ps-split">
          <Reveal className="ps-dark-card">
            <span className="ps-eyebrow">
              <Sparkles size={14} /> Bia IA
            </span>
            <h3>
              O contexto já está aqui.
              <br />A IA ajuda a organizar.
            </h3>
            <div className="ps-ai-source">
              <FileText size={17} /> Anamnese e avaliação
            </div>
            <div className="ps-ai-source">
              <CalendarDays size={17} /> Relatos e evoluções
            </div>
            <div className="ps-ai-result">
              <strong>Sugestão para revisão profissional</strong>
              <p>
                Informações reunidas em uma estrutura que facilita a leitura e o
                acompanhamento.
              </p>
              <small>Exemplo ilustrativo · você revisa e aprova.</small>
            </div>
          </Reveal>
          <div>
            <MarketingHeading
              eyebrow="Tecnologia com propósito"
              title={
                <>
                  Um apoio para o trabalho.
                  <br />O olhar clínico continua seu.
                </>
              }
              description="A IA ajuda a estruturar anotações e sugerir conteúdo a partir do histórico. Ela não substitui sua avaliação nem aprova os registros por você."
            />
            <MarketingChecks
              items={[
                "Informações do próprio paciente como contexto",
                "Sugestões editáveis antes de salvar",
                "Decisões e aprovação nas mãos do profissional",
              ]}
            />
            <Link
              to="/funcionalidades"
              className="ps-text-link"
              style={{ marginTop: 28 }}
            >
              Conhecer os recursos de IA <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
      <section className="ps-section ps-section-soft">
        <div className="ps-wrap">
          <MarketingHeading
            eyebrow="Uma rotina com começo, meio e continuidade"
            title="Tudo flui melhor quando está conectado."
          />
          <div className="ps-steps">
            {[
              {
                title: "Organize o dia",
                text: "Cadastre pacientes, planeje os horários e acompanhe os próximos atendimentos.",
              },
              {
                title: "Atenda com contexto",
                text: "Abra o prontuário, encontre o histórico e registre cada etapa do cuidado.",
              },
              {
                title: "Acompanhe a rotina",
                text: "Consulte pagamentos, documentos e informações para os próximos passos.",
              },
            ].map((step, index) => (
              <Reveal key={step.title} className="ps-step" delay={index * 90}>
                <span>0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="ps-section">
        <div className="ps-wrap ps-split">
          <div>
            <MarketingHeading
              eyebrow="Seu jeito de cuidar tem espaço aqui"
              title="Do seu consultório à sua equipe."
              description="Para profissionais individuais e clínicas multiprofissionais, com organização e permissões que acompanham cada responsabilidade."
            />
            <div className="ps-areas">
              {PROFESSIONAL_CATEGORIES.slice(0, 4).map((category) => (
                <span key={category.key}>{category.title}</span>
              ))}
            </div>
          </div>
          <Reveal className="ps-feature-card">
            <span className="ps-icon">
              <ShieldCheck size={23} />
            </span>
            <h3>Cuidado também é responsabilidade com os dados.</h3>
            <p>
              Permissões por perfil, registros restritos e histórico de
              alterações ajudam a organizar o acesso às informações clínicas.
            </p>
            <MarketingChecks
              items={[
                "Acessos conforme a função na clínica",
                "Informações vinculadas ao paciente",
                "Profissional no controle dos registros",
              ]}
            />
            <Link
              to="/sobre"
              className="ps-text-link"
              style={{ marginTop: 25 }}
            >
              Nosso jeito de construir <ArrowRight size={15} />
            </Link>
          </Reveal>
        </div>
      </section>
      <section className="ps-section ps-section-soft">
        <div className="ps-wrap ps-split">
          <MarketingHeading
            eyebrow="Vamos esclarecer"
            title="Antes de começar."
            description="Respostas rápidas para conhecer melhor a plataforma."
          />
          <MarketingFAQ items={MARKETING_FAQ} />
        </div>
      </section>
      <MarketingCTA />
    </MarketingShell>
  );
}
