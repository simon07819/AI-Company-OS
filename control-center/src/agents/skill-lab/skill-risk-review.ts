import type { SkillCandidate } from "./types";

const forbiddenRiskTerms = [/\.env/i, /NVIDIA_API_KEY/i, /secret/i, /free shell|shell libre|unrestricted shell/i, /filesystem libre|unrestricted filesystem/i, /network libre|unrestricted network/i, /deploy/i, /push automatique/i, /massive dependency|gros framework|heavy framework/i];

export function reviewSkillCandidateRisk(candidate: SkillCandidate) {
  const text = JSON.stringify(candidate);
  const issues = forbiddenRiskTerms.filter((term) => term.test(text)).map((term) => `Blocked risk pattern: ${term}`);
  if (candidate.riskLevel === "high") issues.push("High risk candidates require explicit approval and cannot be auto-promoted.");
  if (!candidate.rollbackPlan.length) issues.push("Missing rollback plan.");
  const heavyDependency = /install|dependency|framework|package/i.test(text) && /heavy|massive|gros framework/i.test(text);
  const status: "ok" | "blocked" | "needs_more_tests" = issues.length ? (heavyDependency ? "needs_more_tests" : "blocked") : "ok";
  return {
    status,
    issues,
  };
}
