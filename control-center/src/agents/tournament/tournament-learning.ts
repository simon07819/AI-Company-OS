import type { AgentLearningNote, TournamentResult } from "./types";

export function recordTournamentLessons(result: Omit<TournamentResult, "learningNotes">): AgentLearningNote[] {
  return result.reviews
    .filter((review) => review.decision === "reject")
    .slice(0, 8)
    .map((review, index) => {
      const firstIssue = review.issues[0] ?? "candidate rejected";
      return {
        id: `${result.missionId}-lesson-${index}`,
        missionId: result.missionId,
        source: "candidate_rejection",
        agentRole: review.reviewerRole === "web_director" || review.reviewerRole === "ux_director" ? "frontend_builder" : review.reviewerRole,
        failurePattern: firstIssue,
        correctionRule: review.requiredChanges[0] ?? "Regenerate the candidate with stronger request fit.",
        appliesToDeliverableType: firstIssue.includes("website") ? "website" : "logo",
        severity: review.issues.some((issue) => /recycled|placeholder|wrong|text-only|structure/.test(issue)) ? "high" : "medium",
      };
    });
}
