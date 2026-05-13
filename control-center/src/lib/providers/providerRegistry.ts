import path from "path";
import { generateWithLlm } from "@/lib/ai/llmClient";
import { readRuntimeJson, writeRuntimeJson } from "@/lib/runtime/runtimeFileStore";

export type ProviderCapability = "text" | "image" | "website" | "localPrototype";

export type ProviderSourceType =
  | "nvidia_text"
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
  error?: string;
  output?: string;
  durationMs: number;
}

export interface TraceableArtifact {
  artifactId: string;
  missionId: string;
  type: string;
  title: string;
  sourceType: ProviderSourceType | string;
  providerUsed: string;
  createdAt: string;
  path?: string;
  content?: string;
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

export function hasNvidiaTextProvider() {
  return Boolean(process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.length >= 8);
}

export function hasImageProvider() {
  return false;
}

export function getProviderRegistry() {
  return {
    text: {
      capability: "text" as const,
      providerUsed: hasNvidiaTextProvider() ? "nvidia" : "nvidia_unavailable",
      available: hasNvidiaTextProvider(),
    },
    image: {
      capability: "image" as const,
      providerUsed: "none",
      available: false,
      preparedProviders: ["ideogram", "midjourney_external", "dalle", "stability"],
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
  return {
    providerUsed: "none",
    sourceType: "provider_unavailable",
    capability: "image",
    success: false,
    error: "No real image provider is configured.",
    durationMs: 0,
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
