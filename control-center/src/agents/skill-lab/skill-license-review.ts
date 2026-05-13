import type { SkillCandidate } from "./types";

export function reviewSkillCandidateLicense(candidate: SkillCandidate) {
  const issues: string[] = [];
  const text = JSON.stringify(candidate);
  if (candidate.licenseRisk === "high") issues.push("High license risk is blocked.");
  if (candidate.licenseRisk === "unknown" && candidate.sourceType === "github_pattern") issues.push("GitHub pattern needs explicit license review before promotion.");
  if (/copy|copier|vendored|vendor/i.test(text)) issues.push("Copied or vendored external code is not allowed in the Skill Lab.");
  return {
    status: issues.length ? "blocked" as const : "ok" as const,
    issues,
  };
}

