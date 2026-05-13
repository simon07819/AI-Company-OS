import type { WorkOrder } from "@/agents/runtime/types";
import type { PreviousDeliverable } from "@/lib/ceoWorkOrder";
import { scoreCandidate } from "./candidate-scorer";
import type { AgentCandidate, CandidateReview } from "./types";

function reviewFor(candidate: AgentCandidate, reviewerRole: CandidateReview["reviewerRole"], score: ReturnType<typeof scoreCandidate>): CandidateReview {
  const issues = score.criticalIssues;
  const decision: CandidateReview["decision"] = issues.length > 0 ? "reject" : score.total >= 85 ? "approve" : "refine";
  return {
    candidateId: candidate.id,
    reviewerRole,
    score: issues.length > 0 ? Math.min(score.total, 59) : score.total,
    strengths: issues.length > 0 ? [] : ["request fit", "brand fit", "usable visual structure"],
    weaknesses: issues,
    issues,
    requiredChanges: issues.map((issue) => {
      if (issue === "text-only-logo") return "Add a symbol, monogram or composition beyond plain text.";
      if (issue === "website-structure-missing") return "Rebuild as a complete page with nav, hero, CTA and sections.";
      if (issue === "wrong-generic-initial") return "Use initials connected to the current brand only.";
      if (issue === "recycled-primary-output") return "Create a new primary artifact for the current deliverable type.";
      return `Fix ${issue}.`;
    }),
    decision,
  };
}

export function runJudgePanel(input: {
  workOrder: WorkOrder;
  candidates: AgentCandidate[];
  previousDeliverable?: PreviousDeliverable | null;
  selectedKnowledge?: unknown;
  mode: "simple" | "details";
}): CandidateReview[] {
  return input.candidates.flatMap((candidate) => {
    const score = scoreCandidate(candidate, input.workOrder, input.previousDeliverable);
    const reviewers: CandidateReview["reviewerRole"][] = input.workOrder.requestType === "website"
      ? ["product_owner", "ux_director", "web_director", "quality_director"]
      : ["product_owner", "creative_director", "quality_director"];
    return reviewers.map((role) => reviewFor(candidate, role, score));
  });
}
