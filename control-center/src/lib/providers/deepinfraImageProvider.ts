export const DEEPINFRA_IMAGE_PROVIDER = "deepinfra";
export const DEEPINFRA_IMAGE_SOURCE = "deepinfra_image";
export const DEEPINFRA_IMAGE_MODEL = "black-forest-labs/FLUX-2-klein-9b";
export const DEEPINFRA_IMAGE_ENDPOINT = "https://api.deepinfra.com/v1/openai/images/generations";

export interface DeepInfraImageResult {
  success: boolean;
  providerUsed: "deepinfra" | "deepinfra_unavailable";
  sourceType: "deepinfra_image" | "provider_unavailable";
  model: string;
  endpointHost: string;
  imageDataUrl?: string;
  mimeType?: string;
  error?: string;
  durationMs: number;
}

function sanitizeProviderError(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/DEEPINFRA_API_KEY/gi, "DeepInfra credentials")
    .slice(0, 1400);
}

export function hasDeepInfraImageProvider() {
  return Boolean(process.env.DEEPINFRA_API_KEY && process.env.DEEPINFRA_API_KEY.length >= 8);
}

export function getDeepInfraImageStatus() {
  return {
    providerUsed: DEEPINFRA_IMAGE_PROVIDER,
    available: hasDeepInfraImageProvider(),
    model: DEEPINFRA_IMAGE_MODEL,
    endpoint: DEEPINFRA_IMAGE_ENDPOINT,
    endpointHost: new URL(DEEPINFRA_IMAGE_ENDPOINT).host,
    missing: hasDeepInfraImageProvider() ? [] : ["DEEPINFRA_API_KEY"],
  };
}

function dataUrlFromBase64(value: string, mimeType = "image/png") {
  const cleaned = value.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
  return `data:${mimeType};base64,${cleaned}`;
}

function extractImage(payload: unknown): { dataUrl?: string; mimeType?: string } {
  if (!payload || typeof payload !== "object") return {};
  const record = payload as Record<string, unknown>;
  const data = Array.isArray(record.data) ? record.data[0] : undefined;
  const candidate = data && typeof data === "object" ? data as Record<string, unknown> : record;
  const mimeType = typeof candidate.mime_type === "string"
    ? candidate.mime_type
    : typeof candidate.mimeType === "string"
      ? candidate.mimeType
      : "image/png";
  const base64 = typeof candidate.b64_json === "string"
    ? candidate.b64_json
    : typeof candidate.base64 === "string"
      ? candidate.base64
      : typeof candidate.image === "string" && !/^https?:\/\//i.test(candidate.image)
        ? candidate.image
        : undefined;
  return base64 ? { dataUrl: dataUrlFromBase64(base64, mimeType), mimeType } : {};
}

export async function generateDeepInfraImage(input: { prompt: string; size?: string }): Promise<DeepInfraImageResult> {
  const started = Date.now();
  const status = getDeepInfraImageStatus();
  if (!status.available) {
    return {
      success: false,
      providerUsed: "deepinfra_unavailable",
      sourceType: "provider_unavailable",
      model: status.model,
      endpointHost: status.endpointHost,
      error: "Agent Graphiste prêt, mais aucun moteur de rendu image n’est configuré.",
      durationMs: Date.now() - started,
    };
  }

  try {
    const response = await fetch(DEEPINFRA_IMAGE_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.DEEPINFRA_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        model: DEEPINFRA_IMAGE_MODEL,
        prompt: input.prompt,
        size: input.size ?? "1024x1024",
        n: 1,
        response_format: "b64_json",
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      return {
        success: false,
        providerUsed: "deepinfra_unavailable",
        sourceType: "provider_unavailable",
        model: status.model,
        endpointHost: status.endpointHost,
        error: sanitizeProviderError(`DeepInfra image failed with status ${response.status}. ${text}`),
        durationMs: Date.now() - started,
      };
    }

    const image = extractImage(JSON.parse(text) as unknown);
    if (!image.dataUrl) {
      return {
        success: false,
        providerUsed: "deepinfra_unavailable",
        sourceType: "provider_unavailable",
        model: status.model,
        endpointHost: status.endpointHost,
        error: "DeepInfra image response did not contain an image artifact.",
        durationMs: Date.now() - started,
      };
    }

    return {
      success: true,
      providerUsed: "deepinfra",
      sourceType: "deepinfra_image",
      model: status.model,
      endpointHost: status.endpointHost,
      imageDataUrl: image.dataUrl,
      mimeType: image.mimeType,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return {
      success: false,
      providerUsed: "deepinfra_unavailable",
      sourceType: "provider_unavailable",
      model: status.model,
      endpointHost: status.endpointHost,
      error: sanitizeProviderError(error instanceof Error ? error.message : "DeepInfra image generation failed."),
      durationMs: Date.now() - started,
    };
  }
}
