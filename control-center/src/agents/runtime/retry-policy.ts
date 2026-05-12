export interface RetryDecision {
  shouldRetry: boolean;
  reason?: string;
}

export function decideRetry(qualityResults: { ok: boolean; issues: string[] }[], attempt: number, maxRetries = 2): RetryDecision {
  const failed = qualityResults.find((result) => !result.ok);
  if (!failed) return { shouldRetry: false };
  if (attempt >= maxRetries) return { shouldRetry: false, reason: "max retries reached" };
  return { shouldRetry: true, reason: failed.issues.join("; ") || "quality gate failed" };
}
