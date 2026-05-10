export type Plan = "starter" | "pro" | "enterprise";

export interface PlanConfig {
  price: number;
  maxMembers: number;
  features: string[];
}

export const PLANS: Record<Plan, PlanConfig> = {
  starter: {
    price: 29,
    maxMembers: 100,
    features: ["Member management", "Basic reporting", "Email support"],
  },
  pro: {
    price: 79,
    maxMembers: 500,
    features: ["Everything in Starter", "Class scheduling", "Billing automation", "Priority support"],
  },
  enterprise: {
    price: 199,
    maxMembers: -1,
    features: ["Everything in Pro", "Unlimited members", "Custom integrations", "Dedicated support"],
  },
};

export function getPlanConfig(plan: Plan): PlanConfig {
  return PLANS[plan];
}

export function isWithinPlanLimit(plan: Plan, memberCount: number): boolean {
  const config = PLANS[plan];
  return config.maxMembers === -1 || memberCount <= config.maxMembers;
}
