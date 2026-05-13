import type { EvalResult } from "./types";

export function generateEvalReport(results: EvalResult[]) {
  const failed = results.filter((result) => result.status === "fail");
  return {
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    failures: failed.map((result) => ({
      id: result.id,
      summary: result.summary,
      failures: result.failures,
    })),
  };
}
