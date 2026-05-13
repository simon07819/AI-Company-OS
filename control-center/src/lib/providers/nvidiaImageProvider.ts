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
  return normalizeProviderName(process.env.IMAGE_PROVIDER) === "nvidia"
    && Boolean(process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.length >= 8)
    && Boolean(imageEndpoint());
}

export function getNvidiaImageProviderStatus() {
  const providerSelected = normalizeProviderName(process.env.IMAGE_PROVIDER) === "nvidia";
  return {
    providerUsed: providerSelected ? "nvidia" : "none",
    available: hasNvidiaImageProvider(),
    model: getNvidiaImageModel(),
    endpointConfigured: Boolean(imageEndpoint()),
    preparedProviders: NVIDIA_PROVIDER_NAMES,
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

export async function generateNvidiaImage(input: NvidiaImageInput): Promise<NvidiaImageResult> {
  const started = Date.now();
  const endpoint = imageEndpoint();
  const model = getNvidiaImageModel();

  if (!hasNvidiaImageProvider()) {
    return {
      success: false,
      providerUsed: "nvidia_unavailable",
      sourceType: "provider_unavailable",
      capability: "image",
      model,
      error: "NVIDIA image provider unavailable. Configure IMAGE_PROVIDER=nvidia, NVIDIA_API_KEY and NVIDIA_IMAGE_ENDPOINT.",
      durationMs: Date.now() - started,
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt: buildPrompt(input),
        size: process.env.NVIDIA_IMAGE_SIZE?.trim() || "1024x1024",
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        providerUsed: "nvidia_unavailable",
        sourceType: "provider_unavailable",
        capability: "image",
        model,
        error: sanitizeProviderError(`NVIDIA image provider failed with status ${response.status}.`),
        durationMs: Date.now() - started,
      };
    }

    const payload = await response.json();
    const image = extractImage(payload);
    if (!image.dataUrl && !image.url) {
      return {
        success: false,
        providerUsed: "nvidia_unavailable",
        sourceType: "provider_unavailable",
        capability: "image",
        model,
        error: "NVIDIA image provider returned no image artifact.",
        durationMs: Date.now() - started,
      };
    }

    return {
      success: true,
      providerUsed: "nvidia",
      sourceType: "nvidia_image",
      capability: "image",
      model,
      imageDataUrl: image.dataUrl,
      imageUrl: image.url,
      mimeType: image.mimeType,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return {
      success: false,
      providerUsed: "nvidia_unavailable",
      sourceType: "provider_unavailable",
      capability: "image",
      model,
      error: sanitizeProviderError(error instanceof Error ? error.message : "NVIDIA image provider failed."),
      durationMs: Date.now() - started,
    };
  }
}
