import { buildCompanyMemoryContext } from "@/lib/memory/companyMemory";
import { readBrandMemory } from "@/lib/brand/brandMemory";
import { listTraceableArtifacts } from "@/lib/providers/providerRegistry";
import { runAssetsAgent } from "@/lib/agents/assets-agent/assetsAgent";
import { isGraphicDesignerRequest, runGraphicDesignerAgent } from "@/lib/agents/graphic-designer/graphicDesignerAgent";
import { runCoderAgent } from "@/lib/agents/coder-agent/coderAgent";

export type CeoWorkflowType = "graphic" | "assets" | "code" | "copywriting" | "none";

function normalize(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function detectCeoWorkflowType(command: string): CeoWorkflowType {
  const lower = normalize(command);
  // Business card / follow-up branding print materials \u2192 HTML code
  if (/carte\s*(d[''e]|de)\s*(affaire|visite|business)|business\s*card|carte\s*pro(fessionnelle)?|carte\s*de\s*visite/i.test(lower)) return "code";
  if (/\b(code|module|api|composant|component|typescript|react|fonction|endpoint)\b/.test(lower)) return "code";
  if (/\b(asset|assets|hero image|illustration site|image site|visuel site|image app|asset app)\b/.test(lower)) return "assets";
  if (isGraphicDesignerRequest(command)) return "graphic";
  if (/\b(copywriting|copy|texte|article|email|newsletter|slogan)\b/.test(lower)) return "copywriting";
  return "none";
}

function buildBrandContextBlock(): string {
  const brand = readBrandMemory();
  const allArtifacts = listTraceableArtifacts();

  // Find latest logo artifact
  const latestLogo = allArtifacts
    .filter((a) => a.type === "logo" || /logo/i.test(a.title) || a.sourceType === "nvidia_image" || a.sourceType === "deepinfra_image")
    .at(-1);

  const lines: string[] = ["=== CONTEXTE DE MARQUE ACTIF ==="];
  if (brand.name) lines.push(`Nom de la marque: ${brand.name} \u2014 NE JAMAIS utiliser un placeholder comme "ME" ou "LOGO"`);
  if (brand.industry) lines.push(`Secteur: ${brand.industry}`);
  if (brand.tagline) lines.push(`Tagline: ${brand.tagline}`);
  if (brand.colors.length) lines.push(`Couleurs de la charte: ${brand.colors.join(", ")}`);
  if (brand.typography.heading) lines.push(`Police titre: ${brand.typography.heading}`);
  if (brand.typography.body) lines.push(`Police corps: ${brand.typography.body}`);
  if (brand.tone) lines.push(`Ton: ${brand.tone}`);
  if (brand.styleKeywords.length) lines.push(`Mots-cl\u00e9s style: ${brand.styleKeywords.join(", ")}`);

  if (latestLogo) {
    lines.push(`Logo approuv\u00e9: "${latestLogo.title}" (id: ${latestLogo.artifactId})`);
    if (latestLogo.content) {
      const isSvg = /<svg[\s>]/i.test(latestLogo.content);
      const isDataUri = /^data:image\//i.test(latestLogo.content);
      if (isSvg) {
        lines.push(`SVG du logo (\u00e0 int\u00e9grer inline ou via <img>):\n${latestLogo.content.slice(0, 2000)}`);
      } else if (isDataUri) {
        lines.push(`Logo (data URI, \u00e0 utiliser dans <img src="...">): ${latestLogo.content.slice(0, 300)}...`);
      }
    }
  }

  lines.push("=== FIN CONTEXTE MARQUE ===");
  lines.push("R\u00c8GLE ABSOLUE: utilise TOUJOURS le vrai nom de la marque ci-dessus dans le code. Jamais de placeholder g\u00e9n\u00e9rique.");
  return lines.join("\n");
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

export async function runCeoWorkflow(command: string, inputMissionId?: string, conversationContext = "", streamId?: string) {
  const type = detectCeoWorkflowType(command);
  if (type === "none" || type === "copywriting") return null;
  const id = inputMissionId ?? missionId();
  const memory = buildCompanyMemoryContext({ missionType: type, command });

  // For code requests that reference branding/logo context, always inject the brand block
  const isBrandingFollowUp = type === "code" && /carte|logo|marque|brand|couleur|charte|visuel/i.test(command);
  const brandBlock = isBrandingFollowUp ? buildBrandContextBlock() : "";

  const combinedMemory = [brandBlock, conversationContext, memory.summary].filter(Boolean).join("\n");
  const enrichedCommand = [combinedMemory, command].filter(Boolean).join("\n");
  const result = type === "graphic"
    ? await runGraphicDesignerAgent(command, id, combinedMemory)
    : type === "assets"
      ? await runAssetsAgent(enrichedCommand, id)
      : await runCoderAgent(enrichedCommand, id, streamId);
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
