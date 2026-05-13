import type { WorkOrder } from "@/agents/runtime/types";
import type { AgentCandidate, CandidateReview } from "./types";
import { generateCandidatesForWorkOrder } from "./candidate-generator";

function averageScore(candidateId: string, reviews: CandidateReview[]) {
  const own = reviews.filter((review) => review.candidateId === candidateId);
  if (own.length === 0) return 0;
  return own.reduce((sum, review) => sum + review.score, 0) / own.length;
}

export function refineTopCandidates(input: {
  workOrder: WorkOrder;
  candidates: AgentCandidate[];
  reviews: CandidateReview[];
  maxRefinements?: number;
}): AgentCandidate[] {
  const max = input.maxRefinements ?? 2;
  const rejected = new Set(input.reviews.filter((review) => review.decision === "reject").map((review) => review.candidateId));
  const ranked = input.candidates
    .filter((candidate) => !rejected.has(candidate.id))
    .sort((a, b) => averageScore(b.id, input.reviews) - averageScore(a.id, input.reviews))
    .slice(0, max);

  if (ranked.length === 0) {
    return generateCandidatesForWorkOrder(input.workOrder).slice(0, max).map((candidate) => ({
      ...candidate,
      id: `${candidate.id}-refined`,
      artifactId: `${candidate.artifactId}-refined`,
      status: "refined",
      metadata: { ...candidate.metadata, refinement: "rebuilt from clean generator after all candidates were rejected" },
    }));
  }

  return ranked.map((candidate) => ({
    ...candidate,
    id: `${candidate.id}-refined`,
    artifactId: `${candidate.artifactId}-refined`,
    status: "refined",
    metadata: {
      ...candidate.metadata,
      refinement: "top candidate tightened after judge panel review",
      requiredChanges: input.reviews.filter((review) => review.candidateId === candidate.id).flatMap((review) => review.requiredChanges),
    },
  }));
}
