import type { AgentOutput, MissionPlan } from "@/lib/orchestrator/types";

export function runSaaSArchitect(plan: MissionPlan): AgentOutput {
  return {
    id: `${plan.id}-saas-architecture`,
    missionId: plan.id,
    expert: "SaaSArchitect",
    title: "SaaS architecture",
    kind: "plan",
    summary: `Architecture produit pour ${plan.industry}: routes métier, données mockées, dashboard et starter Next.js traçable.`,
    content: plan.artifactRequirements.join("\n"),
    artifactPaths: [],
    metadata: { requirements: plan.artifactRequirements },
  };
}
