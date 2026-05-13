import type { WorkOrder } from "@/agents/runtime/types";
import type { SkillCandidate } from "./types";
import { logoSkillCandidates } from "./candidates/logo-skill-candidates";
import { memorySkillCandidates } from "./candidates/memory-skill-candidates";
import { qualitySkillCandidates } from "./candidates/quality-skill-candidates";
import { routingSkillCandidates } from "./candidates/routing-skill-candidates";
import { websiteSkillCandidates } from "./candidates/website-skill-candidates";

export const skillCandidateRegistry: Record<string, SkillCandidate> = Object.fromEntries(
  [
    ...routingSkillCandidates,
    ...logoSkillCandidates,
    ...websiteSkillCandidates,
    ...qualitySkillCandidates,
    ...memorySkillCandidates,
  ].map((candidate) => [candidate.id, candidate]),
);

const promotedCandidateIds = new Set<string>();

export function listSkillCandidates() {
  return Object.values(skillCandidateRegistry);
}

export function getSkillCandidate(id: string) {
  return skillCandidateRegistry[id] ?? null;
}

export function promoteSkillCandidate(candidateId: string) {
  const candidate = getSkillCandidate(candidateId);
  if (!candidate) throw new Error(`Unknown skill candidate: ${candidateId}`);
  promotedCandidateIds.add(candidateId);
  candidate.status = "promoted";
  return candidate;
}

export function rejectSkillCandidate(candidateId: string) {
  const candidate = getSkillCandidate(candidateId);
  if (!candidate) throw new Error(`Unknown skill candidate: ${candidateId}`);
  promotedCandidateIds.delete(candidateId);
  candidate.status = "rejected";
  return candidate;
}

export function clearPromotedSkillCandidates() {
  for (const id of Array.from(promotedCandidateIds)) {
    const candidate = getSkillCandidate(id);
    if (candidate) candidate.status = "approved";
  }
  promotedCandidateIds.clear();
}

export function getPromotedSkillCandidates() {
  return Array.from(promotedCandidateIds).map((id) => skillCandidateRegistry[id]).filter(Boolean);
}

export function getActiveSkillLabPromotions(input: { agentRole: string; skillId: string; workOrder: WorkOrder }) {
  return getPromotedSkillCandidates().filter((candidate) => {
    const deliverableMatches = candidate.deliverableTypes.includes("any") || candidate.deliverableTypes.includes(input.workOrder.deliverableType);
    return deliverableMatches && candidate.targetAgentRoles.includes(input.agentRole) && candidate.targetSkillIds.includes(input.skillId);
  });
}
