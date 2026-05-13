import type { WorkOrder } from "@/agents/runtime/types";
import type { PreviousDeliverable } from "@/lib/ceoWorkOrder";
import { generateCandidatesForWorkOrder } from "./candidate-generator";
import { refineTopCandidates } from "./candidate-refinement";
import { selectFinalCandidate } from "./final-candidate-selector";
import { runJudgePanel } from "./judge-panel";
import { recordTournamentLessons } from "./tournament-learning";
import type { TournamentResult } from "./types";

export function runCandidateTournament(input: {
  workOrder: WorkOrder;
  previousDeliverable?: PreviousDeliverable | null;
  selectedKnowledge?: unknown;
  mode?: "simple" | "details";
  maxRefinements?: number;
}): TournamentResult {
  const candidates = generateCandidatesForWorkOrder(input.workOrder);
  const firstReviews = runJudgePanel({
    workOrder: input.workOrder,
    candidates,
    previousDeliverable: input.previousDeliverable,
    selectedKnowledge: input.selectedKnowledge,
    mode: input.mode ?? "simple",
  });
  const refined = refineTopCandidates({
    workOrder: input.workOrder,
    candidates,
    reviews: firstReviews,
    maxRefinements: input.maxRefinements ?? 2,
  });
  const secondReviews = runJudgePanel({
    workOrder: input.workOrder,
    candidates: refined,
    previousDeliverable: input.previousDeliverable,
    selectedKnowledge: input.selectedKnowledge,
    mode: input.mode ?? "simple",
  });
  const allCandidates = [
    ...candidates.map((candidate) => ({
      ...candidate,
      status: firstReviews.some((review) => review.candidateId === candidate.id && review.decision === "reject") ? "rejected" as const : "reviewed" as const,
    })),
    ...refined,
  ];
  const allReviews = [...firstReviews, ...secondReviews];
  const finalCandidate = selectFinalCandidate({ workOrder: input.workOrder, candidates: refined, reviews: secondReviews })
    ?? selectFinalCandidate({ workOrder: input.workOrder, candidates: allCandidates, reviews: allReviews });
  const resultWithoutLessons = {
    missionId: input.workOrder.missionId,
    candidates: finalCandidate
      ? allCandidates.map((candidate) => candidate.id === finalCandidate.id ? { ...candidate, status: "approved" as const } : candidate)
      : allCandidates,
    reviews: allReviews,
    selectedCandidateId: finalCandidate?.id,
    refinedCandidateIds: refined.map((candidate) => candidate.id),
    approvedCandidateId: finalCandidate?.id,
    status: finalCandidate ? "approved" as const : "failed" as const,
  };
  return {
    ...resultWithoutLessons,
    learningNotes: recordTournamentLessons(resultWithoutLessons),
  };
}

export function getApprovedCandidate(result: TournamentResult) {
  return result.candidates.find((candidate) => candidate.id === result.approvedCandidateId) ?? null;
}
