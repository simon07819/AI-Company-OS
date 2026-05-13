import type { WorkOrder } from "@/agents/runtime/types";
import type { AgentCandidate, CandidateReview } from "./types";

function averageApprovedScore(candidateId: string, reviews: CandidateReview[]) {
  const own = reviews.filter((review) => review.candidateId === candidateId);
  if (own.length === 0 || own.some((review) => review.decision === "reject")) return -1;
  return own.reduce((sum, review) => sum + review.score, 0) / own.length;
}

export function selectFinalCandidate(input: {
  workOrder: WorkOrder;
  candidates: AgentCandidate[];
  reviews: CandidateReview[];
}): AgentCandidate | null {
  return [...input.candidates]
    .filter((candidate) => candidate.artifactId && averageApprovedScore(candidate.id, input.reviews) >= 85)
    .sort((a, b) => averageApprovedScore(b.id, input.reviews) - averageApprovedScore(a.id, input.reviews))[0] ?? null;
}
