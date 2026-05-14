export type NvidiaImageKind = "logo" | "concept" | "website_hero";

export interface NvidiaImageInput {
  missionId: string;
  prompt: string;
  kind: NvidiaImageKind;
  title?: string;
  brandName?: string | null;
}

export interface NvidiaImageResult {
  success: boolean;
  providerUsed: "nvidia" | "nvidia_unavailable";
  sourceType: "nvidia_image" | "provider_unavailable";
  capability: "image";
  model?: string;
  artifactId?: string;
  imageDataUrl?: string;
  imageUrl?: string;
  mimeType?: string;
  error?: string;
  durationMs: number;
}

export interface NvidiaImageDiagnostics {
  configured: boolean;
  providerSelected: boolean;
  providerAvailable: boolean;
  canAttemptGeneration: boolean;
  imageProviderEnv?: string;
  apiKeyPresent: boolean;
  endpointPresent: boolean;
  modelPresent: boolean;
  endpoint?: string;
  endpointHost?: string;
  model: string;
  authHeaderPresent: boolean;
  nodeEnv: string;
  missing: string[];
  reasons: string[];
  suggestedFix: string;
}

export interface NvidiaImageInvocation {
  success: boolean;
  statusCode?: number;
  endpoint: string;
  model: string;
  mimeType?: string;
  imageDataUrl?: string;
  imageUrl?: string;
  imageBytes?: Buffer;
  rawContentType?: string;
  error?: string;
  expectedFormat?: string;
  receivedFormat?: string;
  durationMs: number;
}

const DEFAULT_MODEL = "black-forest-labs/flux.1-dev";
const NVIDIA_PROVIDER_NAMES = ["nvidia:qwen-image", "nvidia:flux", "nvidia:visual-genai-nim"];

function normalizeProviderName(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

function imageEndpoint() {
  return process.env.NVIDIA_IMAGE_ENDPOINT?.trim() || "";
}

export function getNvidiaImageModel() {
  return process.env.NVIDIA_IMAGE_MODEL?.trim() || DEFAULT_MODEL;
}

export function hasNvidiaImageProvider() {
  return getNvidiaImageDiagnostics().providerAvailable;
}

export function getNvidiaImageProviderStatus() {
  const diagnostic = getNvidiaImageDiagnostics();
  return {
    providerUsed: diagnostic.providerSelected ? "nvidia" : "none",
    available: diagnostic.providerAvailable,
    model: diagnostic.model,
    endpointConfigured: diagnostic.endpointPresent,
    preparedProviders: NVIDIA_PROVIDER_NAMES,
    reasons: diagnostic.reasons,
    missing: diagnostic.missing,
    endpointHost: diagnostic.endpointHost,
  };
}

export function getNvidiaImageDiagnostics(): NvidiaImageDiagnostics {
  const providerValue = process.env.IMAGE_PROVIDER?.trim();
  const providerSelected = normalizeProviderName(providerValue) === "nvidia";
  const apiKeyPresent = Boolean(process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.length >= 8);
  const endpoint = imageEndpoint();
  const endpointPresent = Boolean(endpoint);
  const modelValue = process.env.NVIDIA_IMAGE_MODEL?.trim();
  const modelPresent = Boolean(modelValue);
  const model = getNvidiaImageModel();
  const missing: string[] = [];
  const reasons: string[] = [];

  if (!providerSelected) {
    missing.push("IMAGE_PROVIDER");
    reasons.push("IMAGE_PROVIDER is not set to nvidia.");
  }
  if (!apiKeyPresent) {
    missing.push("NVIDIA_API_KEY");
    reasons.push("NVIDIA_API_KEY is missing or too short.");
  }
  if (!endpointPresent) {
    missing.push("NVIDIA_IMAGE_ENDPOINT");
    reasons.push("NVIDIA_IMAGE_ENDPOINT is missing.");
  }
  if (!modelPresent) {
    reasons.push(`NVIDIA_IMAGE_MODEL is not set; default model ${DEFAULT_MODEL} will be used.`);
  }

  let endpointHost: string | undefined;
  if (endpoint) {
    try {
      endpointHost = new URL(endpoint).host;
    } catch {
      reasons.push("NVIDIA_IMAGE_ENDPOINT is not a valid URL.");
      missing.push("NVIDIA_IMAGE_ENDPOINT");
    }
  }

  const providerAvailable = providerSelected && apiKeyPresent && endpointPresent && Boolean(endpointHost);
  return {
    configured: providerAvailable,
    providerSelected,
    providerAvailable,
    canAttemptGeneration: providerAvailable,
    imageProviderEnv: providerValue || undefined,
    apiKeyPresent,
    endpointPresent,
    modelPresent,
    endpoint: endpoint || undefined,
    endpointHost,
    model,
    authHeaderPresent: apiKeyPresent,
    nodeEnv: process.env.NODE_ENV || "development",
    missing: Array.from(new Set(missing)),
    reasons,
    suggestedFix: providerAvailable
      ? "NVIDIA image provider can attempt generation."
      : `Set ${Array.from(new Set(missing)).join(", ") || "valid NVIDIA image configuration"} in .env.local. Example keys: IMAGE_PROVIDER=nvidia, NVIDIA_IMAGE_ENDPOINT=<NVIDIA image endpoint>, NVIDIA_IMAGE_MODEL=${model}.`,
  };
}

function sanitizeProviderError(value: string) {
  return value
    .replace(/NVIDIA_API_KEY/gi, "NVIDIA credentials")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/nvapi-[A-Za-z0-9._-]+/g, "[redacted]");
}

function buildPrompt(input: NvidiaImageInput) {
  const kindInstruction = input.kind === "logo"
    ? "Generate a clean logo image, centered mark and wordmark when useful, no mockup, no stock photo, no extra UI."
    : input.kind === "website_hero"
      ? "Generate a website hero image concept, polished product visual, no fake UI text, no watermark."
      : "Generate a visual concept image, polished, inspectable, no watermark.";
  return [
    kindInstruction,
    input.brandName ? `Brand: ${input.brandName}.` : "",
    input.title ? `Title: ${input.title}.` : "",
    input.prompt,
    "Use a professional design style. Avoid placeholder text and generic brand-system labels.",
  ].filter(Boolean).join("\n");
}

function dataUrlFromBase64(value: string, mimeType = "image/png") {
  const cleaned = value.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
  return `data:${mimeType};base64,${cleaned}`;
}

function dataUrlFromBuffer(value: Buffer, mimeType = "image/png") {
  return `data:${mimeType};base64,${value.toString("base64")}`;
}

function extractImage(payload: unknown): { dataUrl?: string; url?: string; mimeType?: string } {
  if (!payload || typeof payload !== "object") return {};
  const record = payload as Record<string, unknown>;
  const data = Array.isArray(record.data) ? record.data[0] : undefined;
  const image = Array.isArray(record.images) ? record.images[0] : undefined;
  const candidate = (data && typeof data === "object" ? data as Record<string, unknown> : undefined)
    ?? (image && typeof image === "object" ? image as Record<string, unknown> : undefined)
    ?? record;
  const mimeType = typeof candidate.mime_type === "string"
    ? candidate.mime_type
    : typeof candidate.mimeType === "string"
      ? candidate.mimeType
      : "image/png";
  const b64 = typeof candidate.b64_json === "string"
    ? candidate.b64_json
    : typeof candidate.base64 === "string"
      ? candidate.base64
      : typeof candidate.b64 === "string"
        ? candidate.b64
        : typeof candidate.image === "string" && !/^https?:\/\//i.test(candidate.image)
          ? candidate.image
          : undefined;
  if (b64) return { dataUrl: dataUrlFromBase64(b64, mimeType), mimeType };
  const url = typeof candidate.url === "string"
    ? candidate.url
    : typeof candidate.image === "string" && /^https?:\/\//i.test(candidate.image)
      ? candidate.image
      : undefined;
  return { url, mimeType };
}

function requestPayload(input: NvidiaImageInput, model: string) {
  return {
    model,
    prompt: buildPrompt(input),
    size: process.env.NVIDIA_IMAGE_SIZE?.trim() || "1024x1024",
    response_format: "b64_json",
  };
}

function compactErrorBody(value: string) {
  return sanitizeProviderError(value.replace(/\s+/g, " ").trim()).slice(0, 1600);
}

async function parseNvidiaImageResponse(response: Response): Promise<Pick<NvidiaImageInvocation, "success" | "mimeType" | "imageDataUrl" | "imageUrl" | "imageBytes" | "error" | "expectedFormat" | "receivedFormat" | "rawContentType">> {
  const contentType = response.headers?.get?.("content-type") || "";
  if (contentType.toLowerCase().startsWith("image/")) {
    const bytes = Buffer.from(await response.arrayBuffer());
    return {
      success: bytes.length > 0,
      mimeType: contentType.split(";")[0],
      imageBytes: bytes,
      imageDataUrl: dataUrlFromBuffer(bytes, contentType.split(";")[0]),
      rawContentType: contentType,
      expectedFormat: "image/* or JSON with b64_json/base64/url",
      receivedFormat: contentType,
    };
  }

  const text = typeof response.text === "function"
    ? await response.text()
    : typeof response.json === "function"
      ? JSON.stringify(await response.json())
      : "";
  if (!response.ok) {
    return {
      success: false,
      error: compactErrorBody(text || `HTTP ${response.status}`),
      rawContentType: contentType,
      expectedFormat: "successful image/* or JSON with b64_json/base64/url",
      receivedFormat: contentType || "empty",
    };
  }

  try {
    const payload = JSON.parse(text) as unknown;
    const image = extractImage(payload);
    if (!image.dataUrl && !image.url) {
      return {
        success: false,
        error: compactErrorBody(text || "JSON response contained no image artifact."),
        rawContentType: contentType,
        expectedFormat: "JSON with data[0].b64_json, base64, image, images[0], or url",
        receivedFormat: contentType || "json_without_image",
      };
    }
    const imageBytes = image.dataUrl
      ? Buffer.from(image.dataUrl.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, ""), "base64")
      : undefined;
    return {
      success: true,
      mimeType: image.mimeType,
      imageDataUrl: image.dataUrl,
      imageUrl: image.url,
      imageBytes,
      rawContentType: contentType,
      expectedFormat: "JSON with image artifact",
      receivedFormat: contentType || "json",
    };
  } catch {
    return {
      success: false,
      error: compactErrorBody(text || "Response was not valid JSON."),
      rawContentType: contentType,
      expectedFormat: "image/* or JSON with b64_json/base64/url",
      receivedFormat: contentType || "non_json",
    };
  }
}

export async function invokeNvidiaImageGeneration(input: NvidiaImageInput): Promise<NvidiaImageInvocation> {
  const started = Date.now();
  const diagnostic = getNvidiaImageDiagnostics();
  const endpoint = diagnostic.endpoint ?? "";
  const model = diagnostic.model;

  if (!diagnostic.canAttemptGeneration) {
    return {
      success: false,
      endpoint,
      model,
      error: `NVIDIA image provider unavailable: ${diagnostic.reasons.join(" ") || diagnostic.suggestedFix}`,
      expectedFormat: "configured NVIDIA image endpoint",
      receivedFormat: "missing_configuration",
      durationMs: Date.now() - started,
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json, image/*",
      },
      body: JSON.stringify(requestPayload(input, model)),
    });
    const parsed = await parseNvidiaImageResponse(response);
    return {
      statusCode: response.status,
      endpoint,
      model,
      ...parsed,
      success: response.ok && parsed.success,
      error: parsed.error ? sanitizeProviderError(parsed.error) : undefined,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return {
      success: false,
      endpoint,
      model,
      error: sanitizeProviderError(error instanceof Error ? error.message : "NVIDIA image provider failed."),
      expectedFormat: "reachable NVIDIA image endpoint",
      receivedFormat: "network_or_runtime_error",
      durationMs: Date.now() - started,
    };
  }
}

export async function generateNvidiaImage(input: NvidiaImageInput): Promise<NvidiaImageResult> {
  const started = Date.now();
  const diagnostic = getNvidiaImageDiagnostics();
  const model = diagnostic.model;

  if (!diagnostic.canAttemptGeneration) {
    return {
      success: false,
      providerUsed: "nvidia_unavailable",
      sourceType: "provider_unavailable",
      capability: "image",
      model,
      error: `NVIDIA image provider unavailable: ${diagnostic.reasons.join(" ") || diagnostic.suggestedFix}`,
      durationMs: Date.now() - started,
    };
  }

  const invocation = await invokeNvidiaImageGeneration(input);
  if (!invocation.success || (!invocation.imageDataUrl && !invocation.imageUrl)) {
    return {
      success: false,
      providerUsed: "nvidia_unavailable",
      sourceType: "provider_unavailable",
      capability: "image",
      model,
      error: sanitizeProviderError([
        invocation.statusCode ? `NVIDIA image provider failed with status ${invocation.statusCode}.` : "NVIDIA image provider failed.",
        invocation.error,
        invocation.expectedFormat ? `Expected: ${invocation.expectedFormat}.` : "",
        invocation.receivedFormat ? `Received: ${invocation.receivedFormat}.` : "",
      ].filter(Boolean).join(" ")),
      durationMs: Date.now() - started,
    };
  }

  return {
    success: true,
    providerUsed: "nvidia",
    sourceType: "nvidia_image",
    capability: "image",
    model,
    imageDataUrl: invocation.imageDataUrl,
    imageUrl: invocation.imageUrl,
    mimeType: invocation.mimeType,
    durationMs: Date.now() - started,
  };
}
