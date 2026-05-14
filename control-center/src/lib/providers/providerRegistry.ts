import fs from "fs";
import path from "path";
import { generateWithLlm } from "@/lib/ai/llmClient";
import {
  generateNvidiaImage,
  getNvidiaImageProviderStatus,
  hasNvidiaImageProvider,
  type NvidiaImageKind,
} from "@/lib/providers/nvidiaImageProvider";
import { readRuntimeJson, writeRuntimeJson } from "@/lib/runtime/runtimeFileStore";

export type ProviderCapability = "text" | "image" | "website" | "localPrototype";

export type ProviderSourceType =
  | "nvidia_text"
  | "nvidia_image"
  | "real_image_provider"
  | "provider_unavailable"
  | "local_svg"
  | "local_preview"
  | "code_artifact"
  | "local_storage";

export interface ProviderResult {
  providerUsed: string;
  sourceType: ProviderSourceType;
  capability: ProviderCapability;
  success: boolean;
  artifactId?: string;
  agentId?: string;
  error?: string;
  output?: string;
  model?: string;
  mimeType?: string;
  durationMs: number;
}

export interface TraceableArtifact {
  artifactId: string;
  missionId: string;
  projectId?: string | null;
  type: string;
  title: string;
  sourceType: ProviderSourceType | string;
  providerUsed: string;
  createdAt: string;
  path?: string;
  url?: string;
  content?: string;
  mimeType?: string;
  promptUsed?: string;
  metadata?: Record<string, unknown>;
}

const ARTIFACT_STORE_FILE = "ceo-traceable-artifacts.json";

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeProviderError(value: string) {
  return value.replace(/NVIDIA_API_KEY/gi, "NVIDIA credentials").replace(/nvapi-[A-Za-z0-9._-]+/g, "[redacted]");
}

export function listTraceableArtifacts(): TraceableArtifact[] {
  return readRuntimeJson<TraceableArtifact[]>(ARTIFACT_STORE_FILE, []);
}

export function createTraceableArtifact(input: Omit<TraceableArtifact, "artifactId" | "createdAt"> & { artifactId?: string }) {
  const artifact: TraceableArtifact = {
    ...input,
    artifactId: input.artifactId ?? id("artifact"),
    path: input.path ? path.normalize(input.path) : undefined,
    createdAt: now(),
  };
  const existing = listTraceableArtifacts().filter((item) => item.artifactId !== artifact.artifactId);
  writeRuntimeJson(ARTIFACT_STORE_FILE, [artifact, ...existing].slice(0, 1000));
  return artifact;
}

function extensionForMime(mimeType?: string) {
  if (mimeType?.includes("webp")) return "webp";
  if (mimeType?.includes("jpeg") || mimeType?.includes("jpg")) return "jpg";
  return "png";
}

function imageBytesFromDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return null;
  return {
    mimeType: match[1],
    bytes: Buffer.from(match[2], "base64"),
  };
}

export function createTraceableImageArtifact(input: {
  missionId: string;
  projectId?: string | null;
  type: string;
  title: string;
  sourceType: ProviderSourceType | string;
  providerUsed: string;
  imageDataUrl: string;
  mimeType?: string;
  promptUsed?: string;
  metadata?: Record<string, unknown>;
}) {
  const parsed = imageBytesFromDataUrl(input.imageDataUrl);
  if (!parsed || parsed.bytes.length <= 1024) {
    throw new Error("Image artifact rejected: invalid or empty image data.");
  }

  const artifactId = id("artifact");
  const mimeType = input.mimeType || parsed.mimeType;
  const extension = extensionForMime(mimeType);
  const relativePath = path.join("public", "generated-artifacts", "ceo-images", input.missionId, `${artifactId}.${extension}`);
  const absolutePath = path.resolve(process.cwd(), relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, parsed.bytes);

  return createTraceableArtifact({
    artifactId,
    missionId: input.missionId,
    projectId: input.projectId ?? null,
    type: input.type,
    title: input.title,
    sourceType: input.sourceType,
    providerUsed: input.providerUsed,
    path: relativePath,
    url: `/${path.posix.join("generated-artifacts", "ceo-images", input.missionId, `${artifactId}.${extension}`)}`,
    content: input.imageDataUrl,
    mimeType,
    promptUsed: input.promptUsed,
    metadata: input.metadata,
  });
}

export function hasNvidiaTextProvider() {
  return Boolean(process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.length >= 8);
}

export function hasImageProvider() {
  return hasNvidiaImageProvider();
}

export function getProviderRegistry() {
  const imageStatus = getNvidiaImageProviderStatus();
  return {
    text: {
      capability: "text" as const,
      providerUsed: hasNvidiaTextProvider() ? "nvidia" : "nvidia_unavailable",
      available: hasNvidiaTextProvider(),
    },
    image: {
      capability: "image" as const,
      providerUsed: imageStatus.available ? "nvidia" : imageStatus.providerUsed,
      available: imageStatus.available,
      sourceType: imageStatus.available ? "nvidia_image" as const : "provider_unavailable" as const,
      model: imageStatus.model,
      endpointConfigured: imageStatus.endpointConfigured,
      preparedProviders: imageStatus.preparedProviders,
    },
    website: {
      capability: "website" as const,
      providerUsed: "artifact_pipeline",
      available: true,
      sourceType: "code_artifact" as const,
    },
    localPrototype: {
      capability: "localPrototype" as const,
      providerUsed: "local_svg_renderer_explicit",
      available: true,
      sourceType: "local_svg" as const,
    },
  };
}

export async function runImageProvider(input: {
  missionId: string;
  prompt: string;
  kind: NvidiaImageKind;
  title?: string;
  brandName?: string | null;
}): Promise<ProviderResult> {
  const result = await generateNvidiaImage(input);
  return {
    providerUsed: result.providerUsed,
    sourceType: result.sourceType,
    capability: "image",
    success: result.success,
    output: result.imageDataUrl ?? result.imageUrl,
    error: result.error,
    durationMs: result.durationMs,
    model: result.model,
    mimeType: result.mimeType,
  };
}

export async function runTextProvider(input: {
  system: string;
  user: string;
  purpose: string;
}): Promise<ProviderResult> {
  const started = Date.now();
  if (!hasNvidiaTextProvider()) {
    return {
      providerUsed: "nvidia_unavailable",
      sourceType: "provider_unavailable",
      capability: "text",
      success: false,
      error: "NVIDIA text provider unavailable.",
      durationMs: Date.now() - started,
    };
  }

  try {
    const response = await generateWithLlm(input);
    if (!response.ok || response.mode !== "nvidia") {
      return {
        providerUsed: "nvidia_unavailable",
        sourceType: "provider_unavailable",
        capability: "text",
        success: false,
        error: sanitizeProviderError(response.warnings.join(" ")),
        durationMs: Date.now() - started,
      };
    }

    return {
      providerUsed: "nvidia",
      sourceType: "nvidia_text",
      capability: "text",
      success: true,
      output: response.text,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return {
      providerUsed: "nvidia_unavailable",
      sourceType: "provider_unavailable",
      capability: "text",
      success: false,
      error: sanitizeProviderError(error instanceof Error ? error.message : "NVIDIA text provider failed."),
      durationMs: Date.now() - started,
    };
  }
}

export function imageProviderUnavailable(): ProviderResult {
  const status = getNvidiaImageProviderStatus();
  return {
    providerUsed: status.providerUsed === "nvidia" ? "nvidia_unavailable" : "none",
    sourceType: "provider_unavailable",
    capability: "image",
    success: false,
    error: status.providerUsed === "nvidia"
      ? "NVIDIA image provider is selected but unavailable."
      : "No real image provider is configured.",
    durationMs: 0,
    model: status.providerUsed === "nvidia" ? status.model : undefined,
  };
}

export function localPrototypeProviderResult(artifactId?: string): ProviderResult {
  return {
    providerUsed: "local_svg_renderer_explicit",
    sourceType: "local_svg",
    capability: "localPrototype",
    success: true,
    artifactId,
    durationMs: 0,
  };
}

export function websiteArtifactProviderResult(artifactId?: string): ProviderResult {
  return {
    providerUsed: "artifact_pipeline",
    sourceType: "code_artifact",
    capability: "website",
    success: true,
    artifactId,
    durationMs: 0,
  };
}
