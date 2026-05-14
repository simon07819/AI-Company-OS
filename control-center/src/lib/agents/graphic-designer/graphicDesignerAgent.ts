import { createTraceableImageArtifact } from "@/lib/providers/providerRegistry";
import {
  DEEPINFRA_IMAGE_MODEL,
  DEEPINFRA_IMAGE_PROVIDER,
  DEEPINFRA_IMAGE_SOURCE,
  generateDeepInfraImage,
  getDeepInfraImageStatus,
} from "@/lib/providers/deepinfraImageProvider";

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
  };
}

const GRAPHIC_KEYWORDS = /\b(logo|design|visuel|banni[eè]re|image|branding|affiche|illustration)\b/i;

function normalize(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function isGraphicDesignerRequest(command: string) {
  return GRAPHIC_KEYWORDS.test(normalize(command));
}

function id(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createInternalBrief(command: string) {
  return [
    "Objectif: produire un visuel final prêt à présenter.",
    "Style: premium, professionnel, lisible, sans mockup, sans watermark.",
    "Contraintes: respecter exactement la demande utilisateur, éviter les placeholders et le texte illisible.",
    `Demande: ${command}`,
  ].join("\n");
}

function createDeepInfraPrompt(command: string, retry = false) {
  const retryInstruction = retry
    ? "Regenerate with stronger composition, cleaner edges, sharper contrast, and fewer decorative distractions."
    : "";
  return [
    "Premium professional graphic design, final image only, no mockup, no watermark.",
    "Clean composition, strong hierarchy, production-ready visual, high quality.",
    "If text is included, keep it minimal, readable, and exactly aligned with the requested brand.",
    retryInstruction,
    `User request: ${command}`,
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

export async function runGraphicDesignerAgent(command: string, missionId = id("graphic-mission")): Promise<GraphicDesignerResult> {
  const status = getDeepInfraImageStatus();
  const started = Date.now();
  const internalBrief = createInternalBrief(command);
  const visualReference = styleReferenceFromCommand(command);

  if (!status.available) {
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
      },
    };
  }

  let retries = 0;
  const referenceInstruction = visualReference ? `Reference direction to preserve: ${visualReference}\n` : "";
  let finalPrompt = createDeepInfraPrompt(`${internalBrief}\n${referenceInstruction}${command}`);
  let image = await generateDeepInfraImage({ prompt: finalPrompt });
  if (!imageQualityOk(image.imageDataUrl)) {
    retries = 1;
    finalPrompt = createDeepInfraPrompt(`${internalBrief}\n${referenceInstruction}${command}`, true);
    image = await generateDeepInfraImage({ prompt: finalPrompt });
  }

  if (!image.success || !imageQualityOk(image.imageDataUrl)) {
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
      qualityCheck: "image_data_url_gt_1kb",
    },
  });

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
    },
  };
}
