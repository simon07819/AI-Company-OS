import { createTraceableImageArtifact } from "@/lib/providers/providerRegistry";
import {
  DEEPINFRA_IMAGE_MODEL,
  DEEPINFRA_IMAGE_PROVIDER,
  DEEPINFRA_IMAGE_SOURCE,
  generateDeepInfraImage,
  getDeepInfraImageStatus,
} from "@/lib/providers/deepinfraImageProvider";
import {
  buildCreativeAgencyWorkflow,
  createCritiqueReport,
  createFinalCEOCard,
  sanitizeCreativeAgencyForClient,
  type CreativeAgencyWorkflow,
} from "@/lib/agents/creative-agency/creativeAgencyWorkflow";

export interface GraphicDesignerResult {
  ok: boolean;
  missionId: string;
  agent: "graphic-designer";
  status: "completed" | "needs_action" | "failed";
  title: string;
  shortMessage: string;
  providerUsed: string;
  sourceType: string;
  artifactId: string | null;
  artifactPath?: string | null;
  artifactUrl?: string | null;
  outputData: string | null;
  mimeType?: string;
  durationMs: number;
  expert: {
    model: string;
    providerUsed: string;
    sourceType: string;
    artifactId: string | null;
    durationMs: number;
    retries: number;
    error?: string;
    agency?: ReturnType<typeof sanitizeCreativeAgencyForClient>;
  };
}

const GRAPHIC_KEYWORDS = /\b(logo|design|visuel|banni[eè]re|image|branding|affiche|illustration|variante|version|regenerer|regeneration|direction)\b|meme esprit/i;

function normalize(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function isGraphicDesignerRequest(command: string) {
  return GRAPHIC_KEYWORDS.test(normalize(command));
}

function id(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDeepInfraPrompt(planPrompt: string, retry = false) {
  const retryInstruction = retry
    ? "Regenerate with stronger composition, cleaner edges, sharper contrast, and fewer decorative distractions."
    : "";
  return [
    planPrompt,
    retryInstruction,
  ].filter(Boolean).join("\n");
}

function styleReferenceFromCommand(command: string) {
  const lines = command.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines
    .filter((line) => /Préférences|Branding retenu|Prompts efficaces|Artifacts acceptés|style|composition|palette|typographie/i.test(line))
    .slice(0, 8)
    .join(" ");
}

function imageQualityOk(imageDataUrl?: string) {
  if (!imageDataUrl?.startsWith("data:image/")) return false;
  const base64 = imageDataUrl.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
  return Buffer.byteLength(base64, "base64") > 1024;
}

function appendImageAgentRun(workflow: CreativeAgencyWorkflow, status: "completed" | "needs_action", summary: string, durationMs: number, providerUsed: string) {
  workflow.agentOutputs.push({
    agent: "image_designer",
    role: "Image Designer / Logo Design Agent",
    status,
    summary,
    durationMs,
    providerUsed,
  });
}

function appendCriticAndCeo(workflow: CreativeAgencyWorkflow, status: "completed" | "needs_action", durationMs: number) {
  workflow.agentOutputs.push({
    agent: "creative_critic",
    role: "Creative Critic / Brand QA",
    status,
    summary: workflow.critiqueReport
      ? `${workflow.critiqueReport.decision}: alignement ${workflow.critiqueReport.brandAlignmentScore}, clarté ${workflow.critiqueReport.clarityScore}.`
      : "Critique non disponible.",
    durationMs,
    providerUsed: "local_quality",
  });
  workflow.agentOutputs.push({
    agent: "ceo_synthesis",
    role: "CEO Synthesis Agent",
    status,
    summary: workflow.finalCEOCard?.whyItWorks ?? "Synthèse préparée.",
    durationMs: 0,
    providerUsed: "local_strategy",
  });
}

export async function runGraphicDesignerAgent(command: string, missionId = id("graphic-mission"), memorySummary = ""): Promise<GraphicDesignerResult> {
  const status = getDeepInfraImageStatus();
  const started = Date.now();
  const visualReference = [styleReferenceFromCommand(command), styleReferenceFromCommand(memorySummary)].filter(Boolean).join(" ");
  const agencyWorkflow = await buildCreativeAgencyWorkflow(command, memorySummary);
  const selectedDirection = agencyWorkflow.recommendedDirection;

  if (!status.available) {
    agencyWorkflow.critiqueReport = createCritiqueReport({
      imageDataUrl: null,
      plan: agencyWorkflow.imageGenerationPlan,
      brief: agencyWorkflow.creativeBrief,
      retries: 0,
    });
    agencyWorkflow.finalCEOCard = createFinalCEOCard({
      artifactId: null,
      selected: selectedDirection,
      critique: agencyWorkflow.critiqueReport,
    });
    appendImageAgentRun(agencyWorkflow, "needs_action", "DeepInfra non configuré; aucune image générée.", Date.now() - started, "deepinfra_unavailable");
    appendCriticAndCeo(agencyWorkflow, "needs_action", 0);
    return {
      ok: true,
      missionId,
      agent: "graphic-designer",
      status: "needs_action",
      title: "Agent Graphiste prêt",
      shortMessage: "Agent Graphiste prêt, mais aucun moteur DeepInfra n’est configuré.",
      providerUsed: "deepinfra_unavailable",
      sourceType: "provider_unavailable",
      artifactId: null,
      artifactPath: null,
      artifactUrl: null,
      outputData: null,
      durationMs: Date.now() - started,
      expert: {
        model: status.model || DEEPINFRA_IMAGE_MODEL,
        providerUsed: "deepinfra_unavailable",
        sourceType: "provider_unavailable",
        artifactId: null,
        durationMs: Date.now() - started,
        retries: 0,
        error: status.missing.join(", "),
        agency: sanitizeCreativeAgencyForClient(agencyWorkflow),
      },
    };
  }

  let retries = 0;
  const referenceInstruction = visualReference ? `\nReference direction to preserve: ${visualReference}` : "";
  let finalPrompt = createDeepInfraPrompt(`${agencyWorkflow.imageGenerationPlan.finalCreativePrompt}${referenceInstruction}`);
  let image = await generateDeepInfraImage({ prompt: finalPrompt });
  if (!imageQualityOk(image.imageDataUrl)) {
    retries = 1;
    finalPrompt = createDeepInfraPrompt(`${agencyWorkflow.imageGenerationPlan.finalCreativePrompt}${referenceInstruction}`, true);
    image = await generateDeepInfraImage({ prompt: finalPrompt });
  }

  if (!image.success || !imageQualityOk(image.imageDataUrl)) {
    agencyWorkflow.critiqueReport = createCritiqueReport({
      imageDataUrl: image.imageDataUrl,
      plan: agencyWorkflow.imageGenerationPlan,
      brief: agencyWorkflow.creativeBrief,
      retries,
    });
    agencyWorkflow.finalCEOCard = createFinalCEOCard({
      artifactId: null,
      selected: selectedDirection,
      critique: agencyWorkflow.critiqueReport,
    });
    appendImageAgentRun(agencyWorkflow, "needs_action", "DeepInfra n’a pas retourné d’image exploitable.", Date.now() - started, image.providerUsed);
    appendCriticAndCeo(agencyWorkflow, "needs_action", 0);
    return {
      ok: true,
      missionId,
      agent: "graphic-designer",
      status: "failed",
      title: "Agent Graphiste indisponible",
      shortMessage: "Le moteur DeepInfra n’a pas retourné d’image exploitable.",
      providerUsed: image.providerUsed,
      sourceType: image.sourceType,
      artifactId: null,
      artifactPath: null,
      artifactUrl: null,
      outputData: null,
      durationMs: Date.now() - started,
      expert: {
        model: image.model,
        providerUsed: image.providerUsed,
        sourceType: image.sourceType,
        artifactId: null,
        durationMs: Date.now() - started,
        retries,
        error: image.error,
        agency: sanitizeCreativeAgencyForClient(agencyWorkflow),
      },
    };
  }

  const imageDataUrl = image.imageDataUrl;
  if (!imageDataUrl) {
    throw new Error("DeepInfra image passed validation without image data.");
  }

  const artifact = createTraceableImageArtifact({
    missionId,
    type: "graphic_image",
    title: "Visuel final Agent Graphiste",
    sourceType: DEEPINFRA_IMAGE_SOURCE,
    providerUsed: DEEPINFRA_IMAGE_PROVIDER,
    imageDataUrl,
    mimeType: image.mimeType,
    promptUsed: finalPrompt,
    metadata: {
      agent: "graphic-designer",
      model: image.model,
      styleReference: visualReference,
      creativeAgency: sanitizeCreativeAgencyForClient(agencyWorkflow),
      selectedDirection: agencyWorkflow.imageGenerationPlan.selectedDirection,
      reuseReferenceArtifacts: agencyWorkflow.imageGenerationPlan.reuseReferenceArtifacts,
      qualityCheck: "image_data_url_gt_1kb",
    },
  });
  agencyWorkflow.critiqueReport = createCritiqueReport({
    imageDataUrl,
    plan: agencyWorkflow.imageGenerationPlan,
    brief: agencyWorkflow.creativeBrief,
    retries,
  });
  agencyWorkflow.finalCEOCard = createFinalCEOCard({
    artifactId: artifact.artifactId,
    selected: selectedDirection,
    critique: agencyWorkflow.critiqueReport,
  });
  appendImageAgentRun(agencyWorkflow, "completed", `Image générée selon ${agencyWorkflow.imageGenerationPlan.selectedDirection}.`, Date.now() - started, "deepinfra");
  appendCriticAndCeo(agencyWorkflow, agencyWorkflow.critiqueReport.decision === "approve" ? "completed" : "needs_action", 0);

  return {
    ok: true,
    missionId,
    agent: "graphic-designer",
    status: "completed",
    title: "Visuel final",
    shortMessage: "Voici votre visuel final.",
    providerUsed: "deepinfra",
    sourceType: "deepinfra_image",
    artifactId: artifact.artifactId,
    artifactPath: artifact.path,
    artifactUrl: artifact.url,
    outputData: imageDataUrl,
    mimeType: image.mimeType,
    durationMs: Date.now() - started,
    expert: {
      model: image.model,
      providerUsed: "deepinfra",
      sourceType: "deepinfra_image",
      artifactId: artifact.artifactId,
      durationMs: Date.now() - started,
      retries,
      agency: sanitizeCreativeAgencyForClient(agencyWorkflow),
    },
  };
}
