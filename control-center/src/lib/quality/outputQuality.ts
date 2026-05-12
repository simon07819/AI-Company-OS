export type QualityStatus = "ready" | "needs_improvement" | "incomplete";

export interface QualityCheck {
  id: string;
  label: string;
  passed: boolean;
  details: string;
}

export interface OutputQualityReport {
  outputType: "saas" | "website" | "app" | "branding" | "logo" | "unknown";
  score: number;
  status: QualityStatus;
  simpleLabel: "Prêt" | "À améliorer" | "Incomplet";
  checks: QualityCheck[];
  issues: string[];
  recommendedCorrections: string[];
  createdAt: string;
}

export function buildQualityReport(
  outputType: OutputQualityReport["outputType"],
  checks: QualityCheck[],
  recommendedCorrections: string[],
): OutputQualityReport {
  const passed = checks.filter((check) => check.passed).length;
  const score = checks.length === 0 ? 0 : Math.round((passed / checks.length) * 100);
  const criticalFailures = checks.filter((check) => !check.passed && /artifact|brand-name|domain|placeholder|completed-step/i.test(check.id));
  const status: QualityStatus = score >= 85 && criticalFailures.length === 0
    ? "ready"
    : score >= 55
      ? "needs_improvement"
      : "incomplete";

  return {
    outputType,
    score,
    status,
    simpleLabel: status === "ready" ? "Prêt" : status === "needs_improvement" ? "À améliorer" : "Incomplet",
    checks,
    issues: checks.filter((check) => !check.passed).map((check) => `${check.label}: ${check.details}`),
    recommendedCorrections,
    createdAt: new Date().toISOString(),
  };
}

export function containsPlaceholder(value: string): boolean {
  return /nouvelle marque ai|new brand ai|placeholder|lorem ipsum|template generic|generic boilerplate/i.test(value);
}

export function normalizeQualityText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
