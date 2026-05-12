import type { AgentOutput, MissionPlan } from "@/lib/orchestrator/types";

export function runCreativeDirector(plan: MissionPlan): AgentOutput {
  const sport = /sport|performance|fitness|athlet/i.test(plan.industry);
  const direction = sport
    ? "Explorer une identité active: vitesse, tension, précision, contraste fort et signal visuel immédiatement lisible."
    : "Explorer une identité premium: simplicité, lisibilité, confiance et différenciation nette entre les directions.";
  return {
    id: `${plan.id}-creative-direction`,
    missionId: plan.id,
    expert: "CreativeDirector",
    title: "Creative direction",
    kind: "plan",
    summary: direction,
    content: direction,
    artifactPaths: [],
    metadata: { industry: plan.industry, sport },
  };
}
