import type { AgentOutput, MissionPlan } from "@/lib/orchestrator/types";

export function runBusinessStrategist(plan: MissionPlan): AgentOutput {
  return {
    id: `${plan.id}-business-strategy`,
    missionId: plan.id,
    expert: "BusinessStrategist",
    title: "Business strategy",
    kind: "brief",
    summary: `Cadrage métier: ${plan.userGoal}. Succès attendu: ${plan.successCriteria[0] ?? "artifact réel validé"}`,
    content: JSON.stringify({ audience: plan.audience, criteria: plan.successCriteria }, null, 2),
    artifactPaths: [],
  };
}
