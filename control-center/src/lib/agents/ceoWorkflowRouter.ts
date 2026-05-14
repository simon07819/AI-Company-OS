import { buildCompanyMemoryContext } from "@/lib/memory/companyMemory";
import { runAssetsAgent } from "@/lib/agents/assets-agent/assetsAgent";
import { isGraphicDesignerRequest, runGraphicDesignerAgent } from "@/lib/agents/graphic-designer/graphicDesignerAgent";
import { runCoderAgent } from "@/lib/agents/coder-agent/coderAgent";

export type CeoWorkflowType = "graphic" | "assets" | "code" | "copywriting" | "none";

function normalize(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function detectCeoWorkflowType(command: string): CeoWorkflowType {
  const lower = normalize(command);
  if (/\b(code|module|api|composant|component|typescript|react|fonction|endpoint)\b/.test(lower)) return "code";
  if (/\b(asset|assets|hero image|illustration site|image site|visuel site|image app|asset app)\b/.test(lower)) return "assets";
  if (isGraphicDesignerRequest(command)) return "graphic";
  if (/\b(copywriting|copy|texte|article|email|newsletter|slogan)\b/.test(lower)) return "copywriting";
  return "none";
}

function missionId() {
  return `mission-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function timeline(agent: string, providerUsed: string, sourceType: string, durationMs: number, artifactId: string | null, retries = 0, agencyOutputs?: Array<{ agent: string; role: string; status: string; summary: string; durationMs: number; providerUsed: string }>) {
  if (agencyOutputs?.length) {
    return [
      { agent: "ceo", role: "Central router", status: "completed", providerUsed: "local_rules", durationMs: 0, summary: "Mission créative détectée; agency mode activé." },
      ...agencyOutputs.map((output) => ({
        ...output,
        sourceType,
        artifactId: output.agent === "image_designer" || output.agent === "artifact_manager" ? artifactId : undefined,
        retries: output.agent === "image_designer" ? retries : undefined,
      })),
      { agent: "artifact_manager", role: "Artifact Manager", status: artifactId ? "completed" : "needs_action", providerUsed: "local_storage", sourceType, durationMs: 0, artifactId, summary: artifactId ? "Artifact image réel stocké et relié à la mission." : "Aucun artifact stocké sans sortie provider." },
    ];
  }
  return [
    { agent: "ceo", role: "Central router", status: "completed", providerUsed: "local_rules", durationMs: 0, summary: "Mission classified and playbook selected." },
    { agent: "product_owner", role: "Prioritisation", status: "completed", providerUsed: "local_rules", durationMs: 0, summary: "Output final first; internal process hidden in simple mode." },
    { agent: "ux_designer", role: "Design advice", status: "completed", providerUsed: "local_rules", durationMs: 0, summary: "Simple mode keeps only the final output and short text." },
    { agent, role: "Specialist execution", status: artifactId ? "completed" : "needs_action", providerUsed, sourceType, durationMs, artifactId, retries },
    { agent: "qa", role: "Quality checks", status: artifactId ? "completed" : "needs_action", providerUsed: "local_rules", durationMs: 0, summary: artifactId ? "Artifact present and traceable." : "Provider configuration required." },
    { agent: "critic", role: "Critic", status: artifactId ? "completed" : "needs_action", providerUsed: "local_rules", durationMs: 0, summary: artifactId ? "No fake fallback detected." : "No fallback generated." },
    { agent: "reviewer", role: "Reviewer", status: artifactId ? "completed" : "needs_action", providerUsed: "local_rules", durationMs: 0, summary: artifactId ? "Approved." : "Waiting for provider configuration." },
    { agent: "artifact_manager", role: "Artifact Manager", status: artifactId ? "completed" : "needs_action", providerUsed: "local_storage", durationMs: 0, artifactId, summary: artifactId ? "Artifact stored with missionId." : "No artifact stored without provider output." },
  ];
}

export async function runCeoWorkflow(command: string, inputMissionId?: string) {
  const type = detectCeoWorkflowType(command);
  if (type === "none" || type === "copywriting") return null;
  const id = inputMissionId ?? missionId();
  const memory = buildCompanyMemoryContext({ missionType: type, command });
  const enrichedCommand = [memory.summary, command].filter(Boolean).join("\n");
  const result = type === "graphic"
    ? await runGraphicDesignerAgent(command, id, memory.summary)
    : type === "assets"
      ? await runAssetsAgent(enrichedCommand, id)
      : await runCoderAgent(enrichedCommand, id);
  const agency = "agency" in result.expert ? result.expert.agency : undefined;
  const runtime = {
    missionId: result.missionId,
    playbookType: type,
    agent: result.agent,
    providerUsed: result.providerUsed,
    sourceType: result.sourceType,
    artifactId: result.artifactId,
    durationMs: result.durationMs,
    retries: result.expert.retries,
    memoryContext: {
      summary: memory.summary,
      preferences: memory.preferences,
      avoidStyles: memory.avoidStyles,
      retainedBranding: memory.retainedBranding,
      effectivePrompts: memory.effectivePrompts,
      acceptedArtifacts: memory.acceptedArtifacts,
    },
    timeline: timeline(result.agent, result.providerUsed, result.sourceType, result.durationMs, result.artifactId, result.expert.retries, agency?.agentOutputs),
    creativeAgency: agency,
    critic: agency?.critiqueReport
      ? { passed: agency.critiqueReport.decision === "approve", issues: agency.critiqueReport.weaknesses }
      : result.artifactId ? { passed: true, issues: [] } : { passed: false, issues: ["provider_not_configured_or_no_output"] },
    reviewer: agency?.critiqueReport
      ? { passed: agency.critiqueReport.decision === "approve", decision: agency.critiqueReport.decision === "approve" ? "approved" : result.artifactId ? "needs_revision" : "needs_action" }
      : result.artifactId ? { passed: true, decision: "approved" } : { passed: false, decision: "needs_action" },
  };
  return { ...result, workflowType: type, runtime };
}
