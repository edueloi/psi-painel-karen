import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Minus, Sparkles, Users } from "lucide-react";
import {
  MarketingShell,
  MarketingCTA,
  MarketingHeading,
  MarketingFAQ,
  MarketingChecks,
} from "../../components/Layout/MarketingShell";
import { Reveal } from "../../components/Layout/Reveal";
import {
  planFeatureLabel,
  visiblePlanFeatures,
  type Plan,
} from "./publicSiteData";
import { api } from "../../services/api";
import { useSEO } from "../../hooks/useSEO";
import { PUBLIC_SEO } from "../../seo/publicSeo.mjs";
import { sharedPlanFeatures, planFeatureSummary } from "./planComparison";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
const faq = [
  {
    q: "O preço mostrado é mensal?",
    a: "Sim. Os valores desta página são os preços mensais cadastrados para os planos ativos da plataforma. As condições de contratação devem ser conferidas antes de finalizar a assinatura.",
  },
  {
    q: "Todos os planos têm os mesmos recursos?",
    a: "Não necessariamente. Confira a lista de recursos de cada plano e use a comparação para identificar as diferenças.",
  },
  {
    q: "Como escolho uma opção para a clínica?",
    a: "Considere quantas pessoas vão usar o sistema e quais recursos são necessários para sua rotina. O limite de usuários e os recursos cadastrados estão indicados em cada plano.",
  },
  {
    q: "A IA substitui a avaliação profissional?",
    a: "Não. Ela oferece apoio para organizar e estruturar informações. O profissional revisa o conteúdo e mantém a responsabilidade pelas decisões clínicas.",
  },
];
export function Planos() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [compare, setCompare] = useState(false);
  const [expandedPlans, setExpandedPlans] = useState<number[]>([]);
  useSEO(PUBLIC_SEO["/planos"]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    api
      .get<Plan[]>("/plans")
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Resposta inválida");
        const normalized = data
          .map((plan) => ({
            ...plan,
            price: Number(plan.price),
            features: visiblePlanFeatures(plan.features),
          }))
          .sort((a, b) => a.price - b.price);
        if (
          normalized.some(
            (plan) => !Number.isFinite(plan.price) || plan.price < 0,
          )
        )
          throw new Error("Preço inválido");
        if (active) setPlans(normalized);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);
  const allFeatures = Array.from(
    new Set(plans.flatMap((plan) => plan.features)),
  );
  const commonFeatures = sharedPlanFeatures(plans);
  return (
    <MarketingShell>
      <section className="ps-page-hero">
        <Reveal className="ps-wrap ps-centered">
          <span className="ps-eyebrow">Uma escolha para o seu momento</span>
          <h1>
            Sua rotina, seu ritmo.
            <br />
            <em>Um plano que acompanha.</em>
          </h1>
          <p>
            Compare os recursos e escolha a estrutura que faz sentido para o seu
            consultório ou sua clínica. Valores e recursos apresentados com
            clareza para você decidir.
          </p>
        </Reveal>
      </section>
      <section className="ps-section" style={{ paddingTop: 0 }}>
        <div className="ps-wrap">
          {loading ? (
            <div
              className="ps-plans"
              role="status"
              aria-label="Carregando planos"
            >
              {[0, 1, 2].map((key) => (
                <div key={key} className="ps-skeleton" />
              ))}
            </div>
          ) : error ? (
            <div role="alert" className="ps-empty">
              <strong>Não foi possível carregar os planos.</strong>
              <p>Tente novamente para consultar os preços atualizados.</p>
              <button
                type="button"
                className="ps-button"
                onClick={() => setReload((value) => value + 1)}
              >
                Tentar novamente
              </button>
            </div>
          ) : !plans.length ? (
            <div className="ps-empty">
              <strong>Planos em atualização.</strong>
              <p>
                Conheça os recursos da plataforma enquanto as opções são
                atualizadas.
              </p>
              <Link to="/funcionalidades" className="ps-button">
                Explorar recursos <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <>
              {commonFeatures.length > 0 && (
                <section
                  className="ps-plan-common"
                  aria-label="Recursos comuns aos planos"
                >
                  <div>
                    <span className="ps-eyebrow">Sua base de cuidado</span>
                    <h2>Incluído em todos os planos</h2>
                    <p>
                      Estes recursos já fazem parte de qualquer opção abaixo.
                    </p>
                  </div>
                  <MarketingChecks
                    items={commonFeatures.map(planFeatureLabel)}
                  />
                </section>
              )}
              <div className="ps-plans">
                {plans.map((plan, index) => {
                  const summary = planFeatureSummary(
                    plan,
                    plans,
                    commonFeatures,
                  );
                  const expanded = expandedPlans.includes(plan.id);
                  const specific = summary.extra;
                  const highlighted =
                    plan.highlighted === true || Number(plan.highlighted) === 1;
                  return (
                    <Reveal
                      key={plan.id}
                      as="article"
                      className={`ps-plan${highlighted ? " is-highlighted" : ""}`}
                      delay={Math.min(index, 3) * 60}
                    >
                      {highlighted && (
                        <span className="ps-plan-badge">
                          <Sparkles size={11} /> Em destaque
                        </span>
                      )}
                      <h2>{plan.name}</h2>
                      <p>
                        {plan.description ||
                          "Recursos para organizar o atendimento e a gestão."}
                      </p>
                      <div className="ps-plan-price">
                        <strong>{money(plan.price)}</strong>
                        <small>/mês</small>
                      </div>
                      <div className="ps-plan-users">
                        <Users
                          size={13}
                          style={{ verticalAlign: "middle", marginRight: 5 }}
                        />
                        {Number(plan.max_users) > 0
                          ? `Até ${plan.max_users} usuário(s)`
                          : "Consulte o limite de usuários"}
                      </div>
                      <div className="ps-plan-features">
                        {summary.parent ? (
                          <p className="ps-plan-includes">
                            <Check size={15} />
                            Todos os recursos do{" "}
                            <strong>{summary.parent.name}</strong>
                          </p>
                        ) : commonFeatures.length > 0 ? (
                          <p className="ps-plan-includes">
                            <Check size={15} />
                            Inclui os recursos comuns acima
                          </p>
                        ) : null}
                        {specific.length > 0 && !expanded && (
                          <span className="ps-plan-extras-label">
                            {summary.parent || commonFeatures.length
                              ? "Além disso, você tem:"
                              : "Recursos incluídos:"}
                          </span>
                        )}
                        <MarketingChecks
                          items={(expanded
                            ? plan.features
                            : specific.slice(0, 5)
                          ).map(planFeatureLabel)}
                        />
                        {!expanded && !specific.length && (
                          <p className="ps-plan-same">
                            A base de recursos já está completa nesta opção.
                            Confira o limite de usuários acima.
                          </p>
                        )}
                        {plan.features.length > 5 && (
                          <button
                            type="button"
                            className="ps-plan-expand"
                            aria-expanded={expanded}
                            onClick={() =>
                              setExpandedPlans((current) =>
                                current.includes(plan.id)
                                  ? current.filter((id) => id !== plan.id)
                                  : [...current, plan.id],
                              )
                            }
                          >
                            {expanded
                              ? "Mostrar resumo"
                              : `Ver todos os ${plan.features.length} recursos`}
                          </button>
                        )}
                      </div>
                      <Link
                        to="/cadastro"
                        className={`ps-button${highlighted ? "" : " ps-button-outline"}`}
                      >
                        Começar agora <ArrowRight size={15} />
                      </Link>
                    </Reveal>
                  );
                })}
              </div>
              <p className="ps-pricing-note">
                Preços mensais e recursos consultados no cadastro de planos
                ativos.
                <br />
                Configurações fiscais e integrações podem exigir configuração
                adicional.
              </p>
              <div
                className="ps-actions"
                style={{ justifyContent: "center", marginTop: 35 }}
              >
                <button
                  type="button"
                  className="ps-button ps-button-outline"
                  aria-expanded={compare}
                  aria-controls="plan-comparison"
                  onClick={() => setCompare((value) => !value)}
                >
                  {compare ? "Fechar comparação" : "Comparar todos os recursos"}
                </button>
              </div>
              {compare && (
                <div
                  id="plan-comparison"
                  className="ps-compare"
                  role="region"
                  aria-label="Comparação dos planos"
                  tabIndex={0}
                >
                  <table>
                    <caption style={{ padding: 18, fontWeight: 500 }}>
                      Recursos incluídos em cada plano
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Recurso</th>
                        {plans.map((plan) => (
                          <th key={plan.id} scope="col">
                            {plan.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allFeatures.map((feature) => (
                        <tr key={feature}>
                          <th scope="row">{planFeatureLabel(feature)}</th>
                          {plans.map((plan) => (
                            <td key={plan.id}>
                              {plan.features.includes(feature) ? (
                                <Check size={17} aria-label="Incluído" />
                              ) : (
                                <Minus size={17} aria-label="Não incluído" />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </section>
      <section className="ps-section ps-section-soft">
        <div className="ps-wrap ps-split">
          <MarketingHeading
            eyebrow="Clareza para escolher"
            title="O plano certo começa pela sua rotina."
            description="Pense nos recursos que você usa, nas tarefas que quer organizar e em quantas pessoas precisam acessar a plataforma."
          />
          <MarketingFAQ items={faq} />
        </div>
      </section>
      <MarketingCTA />
    </MarketingShell>
  );
}
