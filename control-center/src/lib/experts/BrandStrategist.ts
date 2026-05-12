import { generateBrandBrief } from "@/lib/brand-builder";
import type { AgentOutput, MissionPlan } from "@/lib/orchestrator/types";

export function runBrandStrategist(plan: MissionPlan): AgentOutput {
  const brief = generateBrandBrief(plan.sourcePrompt);
  return {
    id: `${plan.id}-brand-strategy`,
    missionId: plan.id,
    expert: "BrandStrategist",
    title: "Brand strategy brief",
    kind: "brief",
    summary: `${brief.brandName} doit être positionné avec une personnalité ${brief.brandPersonality.join(", ")} pour ${brief.targetAudience}.`,
    content: JSON.stringify(brief, null, 2),
    artifactPaths: [],
    metadata: { brief },
  };
}
