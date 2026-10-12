import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import {
  MarketingShell,
  MarketingHeading,
  MarketingCTA,
} from "../../components/Layout/MarketingShell";
import { Reveal } from "../../components/Layout/Reveal";
import heroPhotoUrl from "../../images/hero-consultorio.png";
import { useSEO } from "../../hooks/useSEO";
import { PUBLIC_SEO } from "../../seo/publicSeo.mjs";

const values = [
  {
    icon: HeartHandshake,
    title: "O cuidado vem primeiro",
    text: "O produto existe para apoiar a rotina, sem ocupar o espaço da relação entre profissional e paciente.",
  },
  {
    icon: Sparkles,
    title: "Tecnologia com propósito",
    text: "Automação e IA entram para organizar tarefas. A responsabilidade e o julgamento continuam com o profissional.",
  },
  {
    icon: ShieldCheck,
    title: "Privacidade importa",
    text: "Trabalhar com dados sensíveis pede atenção a acessos, permissões e responsabilidades.",
  },
  {
    icon: Users,
    title: "Diferentes jeitos de trabalhar",
    text: "Consultórios e equipes precisam de uma estrutura que respeite suas funções e formas de atender.",
  },
];
export function Sobre() {
  useSEO(PUBLIC_SEO["/sobre"]);
  return (
    <MarketingShell>
      <section className="ps-page-hero">
        <div className="ps-wrap ps-split">
          <Reveal>
            <span className="ps-eyebrow">Por trás da Plaelo</span>
            <h1>
              A tecnologia cuida
              <br />
              do bastidor.
              <br />
              <em>
                Você cuida
                <br />
                das pessoas.
              </em>
            </h1>
            <p>
              A Plaelo nasceu de uma necessidade real: deixar a rotina clínica
              mais organizada, com menos informação espalhada e mais
              continuidade no cuidado.
            </p>
            <div className="ps-actions">
              <Link to="/funcionalidades" className="ps-button">
                Conhecer a plataforma <ArrowRight size={17} />
              </Link>
            </div>
          </Reveal>
          <Reveal className="ps-about-photo" delay={100}>
            <img
              src={heroPhotoUrl}
              alt="Ambiente de consultório, representação do espaço de cuidado"
              width="1024"
              height="1024"
            />
            <div className="ps-photo-label">
              <strong>Conectando cuidado e gestão.</strong>
              <p>Uma rotina mais simples. Um atendimento com mais presença.</p>
            </div>
          </Reveal>
        </div>
      </section>
      <section className="ps-section">
        <div className="ps-wrap">
          <MarketingHeading
            eyebrow="Da prática para o produto"
            title="A resposta não era mais uma ferramenta. Era conectar as etapas."
            description="Agenda em um lugar, documentos em outro e financeiro em uma planilha. A Plaelo aproxima essas informações para reduzir as interrupções da rotina."
          />
          <div className="ps-steps">
            {[
              {
                title: "Escutar a rotina",
                text: "Começar pelos problemas de quem atende: tarefas repetitivas, dados dispersos e ferramentas desconectadas.",
              },
              {
                title: "Organizar o fluxo",
                text: "Reunir cadastro, atendimento, registros e gestão em uma estrutura com continuidade.",
              },
              {
                title: "Continuar evoluindo",
                text: "Melhorar a experiência a partir do uso e das necessidades de profissionais e clínicas.",
              },
            ].map((item, index) => (
              <Reveal key={item.title} className="ps-step" delay={index * 70}>
                <span>0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="ps-section ps-section-soft">
        <div className="ps-wrap">
          <MarketingHeading
            eyebrow="O que orienta nossas escolhas"
            title="Mais do que recursos, critérios para construir."
          />
          <div
            className="ps-bento"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit,minmax(min(100%,250px),1fr))",
            }}
          >
            {values.map(({ icon: Icon, title, text }, index) => (
              <Reveal
                className="ps-feature-card"
                key={title}
                delay={index * 65}
              >
                <span className="ps-icon">
                  <Icon size={22} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="ps-manifesto">
        <div className="ps-wrap">
          <Reveal>
            <span className="ps-eyebrow">Nossa forma de ver o trabalho</span>
            <blockquote style={{ marginTop: 22 }}>
              A Plaelo não quer ocupar mais espaço na sua rotina.
              <br />
              <span>Quer devolver espaço para o cuidado.</span>
            </blockquote>
          </Reveal>
        </div>
      </section>
      <MarketingCTA />
    </MarketingShell>
  );
}
