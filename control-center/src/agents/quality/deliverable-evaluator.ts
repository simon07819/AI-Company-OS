import { reviewNoPreviousDeliverableRegression } from "./anti-regression-review";
import { reviewLogoDeliverable } from "./logo-review";
import { reviewSimpleChatOutput } from "./simple-chat-review";
import { reviewWebsiteDeliverable } from "./website-review";
import type { DeliverableEvaluationInput, QualityIssue, QualityReviewResult } from "./types";

function scoreFromIssues(issues: QualityIssue[]) {
  const penalty = issues.reduce((total, item) => total + (item.severity === "fail" ? 28 : item.severity === "warning" ? 10 : 0), 0);
  return Math.max(0, 100 - penalty);
}

function statusFrom(score: number, issues: QualityIssue[]): QualityReviewResult["status"] {
  if (issues.some((item) => item.severity === "fail" && ["wrong_deliverable_type", "placeholder", "recycled_output", "brand_extraction", "security"].includes(item.category))) {
    return "rejected";
  }
  if (score >= 85 && !issues.some((item) => item.severity === "fail")) return "approved";
  if (score >= 60) return "needs_refinement";
  return "rejected";
}

export function evaluateDeliverable(input: DeliverableEvaluationInput): QualityReviewResult {
  const issues = [
    ...(input.workOrder.deliverableType === "logo" ? reviewLogoDeliverable(input) : []),
    ...(input.workOrder.requestType === "website" ? reviewWebsiteDeliverable(input) : []),
    ...reviewNoPreviousDeliverableRegression(input),
    ...(input.mode === "simple" ? reviewSimpleChatOutput(input.visibleOutput) : []),
  ];
  const score = scoreFromIssues(issues);
  const status = statusFrom(score, issues);
  return {
    status,
    score,
    issues,
    requiredChanges: issues.map((item) => item.suggestedFix),
    reviewerRole: input.workOrder.requestType === "website" ? "web_director" : "quality_director",
  };
}
