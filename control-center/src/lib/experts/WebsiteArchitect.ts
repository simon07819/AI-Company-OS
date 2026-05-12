import type { AgentOutput, MissionPlan } from "@/lib/orchestrator/types";

export function runWebsiteArchitect(plan: MissionPlan): AgentOutput {
  return {
    id: `${plan.id}-website-architecture`,
    missionId: plan.id,
    expert: "WebsiteArchitect",
    title: "Website architecture",
    kind: "plan",
    summary: `Structure de site pour ${plan.industry}: pages, copy, direction design et prototype local.`,
    content: plan.artifactRequirements.join("\n"),
    artifactPaths: [],
    metadata: { requirements: plan.artifactRequirements },
  };
}
