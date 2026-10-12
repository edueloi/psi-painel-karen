import { describe, expect, it } from "vitest";
import { planFeatureSummary, sharedPlanFeatures } from "./planComparison";
describe("Resumo honesto dos recursos dos planos", () => {
  const basic = {
    id: 1,
    name: "Básico",
    price: 99,
    features: ["agenda", "prontuario"],
  };
  const pro = {
    id: 2,
    name: "Pro",
    price: 149,
    features: ["agenda", "prontuario", "financeiro"],
  };
  it("resume apenas herança real e mostra o que foi acrescentado", () => {
    const plans = [basic, pro];
    expect(sharedPlanFeatures(plans)).toEqual(["agenda", "prontuario"]);
    expect(planFeatureSummary(pro, plans, sharedPlanFeatures(plans))).toEqual({
      parent: basic,
      extra: ["financeiro"],
    });
  });
  it("não anuncia todos os recursos de outro plano quando falta um", () => {
    const partial = {
      id: 3,
      name: "Outro",
      price: 199,
      features: ["agenda", "whatsapp_bot"],
    };
    const plans = [basic, pro, partial];
    expect(
      planFeatureSummary(partial, plans, sharedPlanFeatures(plans)),
    ).toEqual({ parent: undefined, extra: ["whatsapp_bot"] });
  });
  it("não cria herança circular nem oculta recursos de um plano único", () => {
    expect(sharedPlanFeatures([basic])).toEqual([]);
    expect(planFeatureSummary(basic, [basic], [])).toEqual({
      parent: undefined,
      extra: basic.features,
    });
  });
});
