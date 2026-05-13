import type { EvalResult } from "@/agents/evals/types";
import type { QualityReviewResult } from "@/agents/quality/types";
import type { CandidateReview } from "@/agents/tournament/types";
import type { AgentLesson } from "./types";
import { failurePatterns, roleForFailurePattern } from "./failure-patterns";

function now() {
  return new Date().toISOString();
}

function lesson(input: Omit<AgentLesson, "id" | "createdAt">): AgentLesson {
  return {
    ...input,
    id: `${input.source}-${input.sourceId}-${input.failurePattern}`.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 160),
    createdAt: now(),
  };
}

function patternFromFailure(text: string) {
  if (/Brand system/i.test(text)) return failurePatterns.brandSystemLogo;
  if (/Marque à nommer|brandName invalide|Missing real brand/i.test(text)) return failurePatterns.unnamedBrand;
  if (/B générique|B generic|wrong initial|generic initial|Unrelated/i.test(text)) return failurePatterns.wrongInitial;
  if (/Black background|fond noir|background/i.test(text)) return failurePatterns.missingBlackBackground;
  if (/text-only|texte-seulement|plain text/i.test(text)) return failurePatterns.textOnlyLogo;
  if (/logo-only|seulement un logo/i.test(text)) return failurePatterns.websiteLogoOnly;
  if (/header|hero|CTA|section|structure/i.test(text)) return failurePatterns.websiteMissingStructure;
  if (/recycled|previous|identique|ancien/i.test(text)) return failurePatterns.previousVisualRecycled;
  if (/score|artifact|process|workspace|toolTrace|checkpoint|internals/i.test(text)) return failurePatterns.simpleModeLeak;
  if (/PROSHOTS|full sentence|phrase/i.test(text)) return failurePatterns.brandNameFullSentence;
  return "general_quality_failure";
}

function correctionFor(pattern: string) {
  switch (pattern) {
    case failurePatterns.brandSystemLogo:
      return "For logo requests, route to logo workflow and never return brandSystem visibleOutput.";
    case failurePatterns.unnamedBrand:
      return "Extract and use the explicit brand name; never use an unnamed-brand placeholder when a name is present.";
    case failurePatterns.wrongInitial:
      return "Use only symbols or initials connected to the current brand; for EKIDA use EKIDA, EK or E.";
    case failurePatterns.missingBlackBackground:
      return "When black background is requested, render a real black/near-black background in the SVG.";
    case failurePatterns.textOnlyLogo:
      return "Logo concepts must include a symbol, monogram or composition beyond plain text.";
    case failurePatterns.websiteLogoOnly:
      return "Website primary output must include header/nav, hero, CTA and sections; logo can only be a secondary asset.";
    case failurePatterns.websiteMissingStructure:
      return "Render website previews with header/nav, hero, CTA and content sections.";
    case failurePatterns.previousVisualRecycled:
      return "Never reuse an incompatible previous primary visual as the current primary output.";
    case failurePatterns.simpleModeLeak:
      return "Simple mode visibleOutput must hide scores, artifacts, process, traces, checkpoints, workspace and reports.";
    case failurePatterns.brandNameFullSentence:
      return "For prompts with context after the brand, keep only the explicit brand token as brandName.";
    default:
      return "Apply the relevant playbook quality checklist before approval.";
  }
}

function deliverableFor(pattern: string) {
  if (/website|previous_primary/.test(pattern)) return "website";
  if (/logo|initial|background/.test(pattern)) return "logo";
  return "any";
}

export function extractLessonsFromEvalFailure(evalResult: EvalResult): AgentLesson[] {
  return evalResult.failures.map((failure) => {
    const pattern = patternFromFailure(failure);
    return lesson({
      source: "eval_failure",
      sourceId: evalResult.id,
      agentRole: roleForFailurePattern(pattern),
      deliverableType: deliverableFor(pattern),
      failurePattern: pattern,
      correctionRule: correctionFor(pattern),
      detectionHints: [failure],
      appliesWhen: [evalResult.id],
      priority: 100,
      severity: "critical",
    });
  });
}

export function extractLessonsFromQualityReview(review: QualityReviewResult, sourceId = "quality-review"): AgentLesson[] {
  return review.issues.map((issue) => {
    const text = `${issue.category} ${issue.message}`;
    const pattern = patternFromFailure(text);
    return lesson({
      source: "quality_review",
      sourceId,
      agentRole: roleForFailurePattern(pattern),
      deliverableType: deliverableFor(pattern),
      failurePattern: pattern,
      correctionRule: issue.suggestedFix || correctionFor(pattern),
      detectionHints: [issue.message],
      appliesWhen: [issue.category],
      priority: issue.severity === "fail" ? 90 : 60,
      severity: issue.severity === "fail" ? "high" : "medium",
    });
  });
}

export function extractLessonsFromCandidateRejection(review: CandidateReview, deliverableType = "any"): AgentLesson[] {
  if (review.decision !== "reject") return [];
  return review.issues.map((issue) => {
    const pattern = patternFromFailure(issue);
    return lesson({
      source: "candidate_rejection",
      sourceId: review.candidateId,
      agentRole: roleForFailurePattern(pattern),
      deliverableType: deliverableType === "any" ? deliverableFor(pattern) : deliverableType,
      failurePattern: pattern,
      correctionRule: review.requiredChanges[0] || correctionFor(pattern),
      detectionHints: [issue],
      appliesWhen: [review.reviewerRole],
      priority: 80,
      severity: "high",
    });
  });
}

export function extractLessonsFromRefinementAttempt(attempt: { attempt?: number; issuesBefore?: { message?: string; id?: string }[]; status?: string }, sourceId = "refinement"): AgentLesson[] {
  return (attempt.issuesBefore ?? []).map((issue) => {
    const pattern = patternFromFailure(`${issue.id ?? ""} ${issue.message ?? ""}`);
    return lesson({
      source: "refinement_attempt",
      sourceId: `${sourceId}-${attempt.attempt ?? 0}`,
      agentRole: roleForFailurePattern(pattern),
      deliverableType: deliverableFor(pattern),
      failurePattern: pattern,
      correctionRule: correctionFor(pattern),
      detectionHints: [issue.message ?? issue.id ?? pattern],
      appliesWhen: ["refinement"],
      priority: 70,
      severity: attempt.status === "failed" ? "high" : "medium",
    });
  });
}

export function extractLessonsFromApprovedSuccess(result: { workOrder?: { deliverableType?: string; requestType?: string }; visibleOutput?: { kind?: string; deliverableType?: string } }, sourceId = "approved-success"): AgentLesson[] {
  const deliverableType = result.visibleOutput?.deliverableType ?? result.workOrder?.deliverableType ?? "any";
  return [lesson({
    source: "approved_success",
    sourceId,
    agentRole: result.workOrder?.requestType === "website" ? "frontend_builder" : "quality_director",
    deliverableType,
    failurePattern: `approved_${deliverableType}_pattern`,
    correctionRule: "Preserve the validated structure and visibility boundaries that led to approval.",
    detectionHints: ["approved"],
    appliesWhen: [deliverableType],
    priority: 30,
    severity: "low",
  })];
}
