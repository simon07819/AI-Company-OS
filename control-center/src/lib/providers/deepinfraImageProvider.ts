import OpenAI from "openai";

export const DEEPINFRA_IMAGE_PROVIDER = "deepinfra";
export const DEEPINFRA_IMAGE_SOURCE = "deepinfra_image";
export const DEEPINFRA_IMAGE_MODEL = "black-forest-labs/FLUX-2-klein-9b";
export const DEEPINFRA_BASE_URL = "https://api.deepinfra.com/v1/openai";
export const DEEPINFRA_IMAGE_ENDPOINT = `${DEEPINFRA_BASE_URL}/images/generations`;

export interface DeepInfraImageResult {
  success: boolean;
  providerUsed: "deepinfra" | "deepinfra_unavailable";
  sourceType: "deepinfra_image" | "provider_unavailable";
  model: string;
  baseURL: string;
  endpoint: string;
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

function configuredBaseURL() {
  return process.env.DEEPINFRA_BASE_URL || "";
}

function configuredModel() {
  return process.env.DEEPINFRA_IMAGE_MODEL || "";
}

function configuredEndpoint(baseURL = configuredBaseURL()) {
  return baseURL ? `${baseURL.replace(/\/$/, "")}/images/generations` : "";
}

function endpointHost(value: string) {
  try {
    return value ? new URL(value).host : "(missing)";
  } catch {
    return "(invalid)";
  }
}

export function getDeepInfraMissingConfig() {
  const missing: string[] = [];
  if (process.env.IMAGE_PROVIDER !== "deepinfra") missing.push("IMAGE_PROVIDER=deepinfra");
  if (!process.env.DEEPINFRA_API_KEY || process.env.DEEPINFRA_API_KEY.length < 8) missing.push("DEEPINFRA_API_KEY");
  if (!configuredBaseURL()) missing.push("DEEPINFRA_BASE_URL");
  if (!configuredModel()) missing.push("DEEPINFRA_IMAGE_MODEL");
  return missing;
}

export function hasDeepInfraImageProvider() {
  return getDeepInfraMissingConfig().length === 0;
}

export function getDeepInfraImageStatus() {
  const baseURL = configuredBaseURL();
  const model = configuredModel();
  const endpoint = configuredEndpoint(baseURL);
  const missing = getDeepInfraMissingConfig();
  return {
    providerUsed: DEEPINFRA_IMAGE_PROVIDER,
    available: missing.length === 0,
    imageProviderEnv: process.env.IMAGE_PROVIDER || "",
    apiKeyPresent: Boolean(process.env.DEEPINFRA_API_KEY && process.env.DEEPINFRA_API_KEY.length >= 8),
    baseURL,
    baseURLPresent: Boolean(baseURL),
    model,
    modelPresent: Boolean(model),
    endpoint,
    endpointHost: endpointHost(endpoint || DEEPINFRA_IMAGE_ENDPOINT),
    authHeaderPresent: Boolean(process.env.DEEPINFRA_API_KEY && process.env.DEEPINFRA_API_KEY.length >= 8),
    missing,
    suggestedFix: [
      "IMAGE_PROVIDER=deepinfra",
      "DEEPINFRA_BASE_URL=https://api.deepinfra.com/v1/openai",
      "DEEPINFRA_IMAGE_MODEL=black-forest-labs/FLUX-2-klein-9b",
      "DEEPINFRA_API_KEY=<your DeepInfra key>",
    ],
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
      model: status.model || DEEPINFRA_IMAGE_MODEL,
      baseURL: status.baseURL || DEEPINFRA_BASE_URL,
      endpoint: status.endpoint || DEEPINFRA_IMAGE_ENDPOINT,
      endpointHost: status.endpointHost,
      error: "Agent Graphiste prêt, mais aucun moteur DeepInfra n’est configuré.",
      durationMs: Date.now() - started,
    };
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.DEEPINFRA_API_KEY,
      baseURL: status.baseURL,
      fetch: globalThis.fetch,
      dangerouslyAllowBrowser: true,
    });

    const response = await openai.images.generate({
      model: status.model,
      prompt: input.prompt,
      size: "1024x1024",
      n: 1,
    });
    const image = extractImage(response as unknown);
    if (!image.dataUrl) {
      return {
        success: false,
        providerUsed: "deepinfra_unavailable",
        sourceType: "provider_unavailable",
        model: status.model,
        baseURL: status.baseURL,
        endpoint: status.endpoint,
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
      baseURL: status.baseURL,
      endpoint: status.endpoint,
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
      model: status.model || DEEPINFRA_IMAGE_MODEL,
      baseURL: status.baseURL || DEEPINFRA_BASE_URL,
      endpoint: status.endpoint || DEEPINFRA_IMAGE_ENDPOINT,
      endpointHost: status.endpointHost,
      error: sanitizeProviderError(error instanceof Error ? error.message : "DeepInfra image generation failed."),
      durationMs: Date.now() - started,
    };
  }
}
