import { buildCompanyMemoryContext } from "@/lib/memory/companyMemory";
import { createTraceableArtifact } from "@/lib/providers/providerRegistry";
import { generateCodexCode } from "@/lib/providers/codexCodeProvider";

function qualityIssues(code?: string) {
  const issues: string[] = [];
  if (!code || code.length < 120) issues.push("code_too_short");
  if (code && !/export\s+default/.test(code)) issues.push("missing_default_export");
  return issues;
}

export async function runCoderAgent(command: string, missionId: string) {
  const started = Date.now();
  const memory = buildCompanyMemoryContext({ missionType: "code", command });
  let retries = 0;
  let result = await generateCodexCode({ command: `${memory.summary}\n${command}`.trim() });
  let issues = qualityIssues(result.output);
  if (result.success && issues.length > 0) {
    retries = 1;
    result = await generateCodexCode({ command: `${command}\nRetry: fix ${issues.join(", ")}` });
    issues = qualityIssues(result.output);
  }

  if (!result.success || issues.length > 0 || !result.output) {
    return {
      ok: true,
      missionId,
      agent: "coder-agent" as const,
      status: result.success ? "failed" as const : "needs_action" as const,
      title: "Agent Coder prêt",
      shortMessage: result.error ?? "Agent Coder n’a pas produit de code validé.",
      providerUsed: result.providerUsed,
      sourceType: result.sourceType,
      artifactId: null,
      outputData: null,
      durationMs: Date.now() - started,
      expert: { providerUsed: result.providerUsed, sourceType: result.sourceType, artifactId: null, durationMs: Date.now() - started, retries, critiques: issues, reviewer: issues.length ? "failed" : "needs_configuration" },
    };
  }

  const artifact = createTraceableArtifact({
    missionId,
    type: "code",
    title: "Code final Agent Coder",
    sourceType: "codex_code",
    providerUsed: "codex_personal",
    content: result.output,
  });
  return {
    ok: true,
    missionId,
    agent: "coder-agent" as const,
    status: "completed" as const,
    title: "Code final",
    shortMessage: "Voici votre code final.",
    providerUsed: "codex_personal",
    sourceType: "codex_code",
    artifactId: artifact.artifactId,
    outputData: result.output,
    durationMs: Date.now() - started,
    expert: { providerUsed: "codex_personal", sourceType: "codex_code", artifactId: artifact.artifactId, durationMs: Date.now() - started, retries, critiques: [], reviewer: "approved" },
  };
}
