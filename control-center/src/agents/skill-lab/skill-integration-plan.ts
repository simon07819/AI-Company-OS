import { getPromotedSkillCandidates } from "./skill-candidate-registry";
import type { SkillCandidate } from "./types";

export function createSkillIntegrationPlan(candidate: SkillCandidate) {
  return {
    candidateId: candidate.id,
    activeOnlyWhenPromoted: true,
    targetAgentRoles: candidate.targetAgentRoles,
    targetSkillIds: candidate.targetSkillIds,
    runtimeControls: ["experimental candidates are benchmark-only", "promoted candidates enrich task context", "simple chat never receives Skill Lab data"],
    rollbackPlan: candidate.rollbackPlan,
  };
}

export function listActiveSkillIntegrations() {
  return getPromotedSkillCandidates().map(createSkillIntegrationPlan);
}

