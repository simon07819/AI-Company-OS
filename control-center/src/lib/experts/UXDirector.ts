import type { AgentOutput, MissionPlan } from "@/lib/orchestrator/types";

export function runUXDirector(plan: MissionPlan): AgentOutput {
  return {
    id: `${plan.id}-ux-direction`,
    missionId: plan.id,
    expert: "UXDirector",
    title: "UX direction",
    kind: "plan",
    summary: "Prioriser les écrans utiles, une navigation simple et des actions clairement reliées aux artifacts.",
    content: `Audience: ${plan.audience}\nGoal: ${plan.userGoal}`,
    artifactPaths: [],
  };
}
