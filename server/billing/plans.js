/**
 * Canonical plan definitions for PeopleCore SaaS tiers.
 */

export const PLANS = {
  free: {
    label: "Free",
    max_seats: 10,
    ai_limit: 50,
    ats: false,
    audit: false,
    price_monthly: 0,
    stripe_price: null,
  },
  pro: {
    label: "Pro",
    max_seats: 50,
    ai_limit: 500,
    ats: true,
    audit: true,
    price_monthly: 29,
    stripe_price: process.env.STRIPE_PRICE_PRO || null,
  },
  enterprise: {
    label: "Enterprise",
    max_seats: 500,
    ai_limit: -1,
    ats: true,
    audit: true,
    price_monthly: 99,
    stripe_price: process.env.STRIPE_PRICE_ENTERPRISE || null,
  },
};

export const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS || "14", 10);

export function getPlanConfig(planKey) {
  return PLANS[planKey?.toLowerCase()] || PLANS.free;
}

export function effectiveMaxSeats(org) {
  const plan = getPlanConfig(org?.plan);
  return org?.max_seats ?? plan.max_seats;
}

export function hasFeature(org, feature) {
  const plan = getPlanConfig(org?.plan);
  return Boolean(plan[feature]);
}

export function aiLimitForOrg(org) {
  return getPlanConfig(org?.plan).ai_limit;
}

export function planListForPricing() {
  return Object.entries(PLANS).map(([id, p]) => ({
    id,
    label: p.label,
    max_seats: p.max_seats,
    ai_limit: p.ai_limit === -1 ? "Unlimited" : p.ai_limit,
    ats: p.ats,
    audit: p.audit,
    price_monthly: p.price_monthly,
  }));
}
