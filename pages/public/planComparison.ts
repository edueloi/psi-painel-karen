export interface PlanFeatures {
  id: number;
  name: string;
  price: number;
  features: string[];
}
export function sharedPlanFeatures(plans: PlanFeatures[]): string[] {
  if (plans.length < 2) return [];
  return plans[0].features.filter((feature) =>
    plans.every((plan) => plan.features.includes(feature)),
  );
}
export function planFeatureSummary(
  plan: PlanFeatures,
  plans: PlanFeatures[],
  common: string[],
) {
  const previous = plans.slice(
    0,
    plans.findIndex((item) => item.id === plan.id),
  );
  const parent = previous
    .filter(
      (item) =>
        item.features.length > 0 &&
        item.features.every((feature) => plan.features.includes(feature)),
    )
    .sort((a, b) => b.features.length - a.features.length)[0];
  const inherited = parent?.features || common;
  return {
    parent,
    extra: plan.features.filter((feature) => !inherited.includes(feature)),
  };
}
