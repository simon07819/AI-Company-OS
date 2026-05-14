import fs from "node:fs";
import path from "node:path";
import { loadLocalEnv, publicEndpoint } from "./nvidia-env";

function bytesFromDataUrl(dataUrl: string) {
  return Buffer.from(dataUrl.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, ""), "base64");
}

async function main() {
  loadLocalEnv();

  const { generateDeepInfraImage, getDeepInfraImageStatus } = await import("../src/lib/providers/deepinfraImageProvider");

  const diagnostic = getDeepInfraImageStatus();
  const outputDir = path.join(process.cwd(), "test-results");

  if (!diagnostic.available) {
    console.error(JSON.stringify({
      ok: false,
      reason: "missing_configuration",
      missing: diagnostic.missing,
      baseURL: publicEndpoint(diagnostic.baseURL),
      endpoint: publicEndpoint(diagnostic.endpoint),
      endpointHost: diagnostic.endpointHost || "(missing)",
      model: diagnostic.model || "(missing)",
      suggestedFix: diagnostic.suggestedFix,
    }, null, 2));
    process.exit(1);
  }

  const result = await generateDeepInfraImage({
    prompt: "minimal black and white logo mark for EKIDA CANADA",
    size: "1024x1024",
  });

  if (!result.success || !result.imageDataUrl) {
    console.error(JSON.stringify({
      ok: false,
      endpoint: publicEndpoint(result.endpoint),
      endpointHost: result.endpointHost,
      model: result.model,
      deepInfraError: result.error,
      expectedFormat: "OpenAI-compatible images.generate response with data[0].b64_json",
      receivedFormat: result.mimeType || "(no image)",
    }, null, 2));
    process.exit(1);
  }

  const mimeType = result.mimeType || "image/png";
  if (!mimeType.startsWith("image/")) {
    console.error(JSON.stringify({
      ok: false,
      endpoint: publicEndpoint(result.endpoint),
      endpointHost: result.endpointHost,
      model: result.model,
      deepInfraError: "Response MIME type is not an image.",
      expectedFormat: "image/*",
      receivedFormat: mimeType,
    }, null, 2));
    process.exit(1);
  }

  const extension = mimeType.includes("webp") ? "webp" : mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  const outputPath = path.join(outputDir, `deepinfra-real-logo-test.${extension}`);
  const bytes = bytesFromDataUrl(result.imageDataUrl);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, bytes);

  const stats = fs.statSync(outputPath);
  if (stats.size <= 1024) {
    console.error(JSON.stringify({
      ok: false,
      endpoint: publicEndpoint(result.endpoint),
      endpointHost: result.endpointHost,
      model: result.model,
      deepInfraError: "Image file is too small.",
      expectedFormat: "image file > 1KB",
      receivedFormat: `${stats.size} bytes`,
      outputPath,
    }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({
    ok: true,
    endpoint: publicEndpoint(result.endpoint),
    endpointHost: result.endpointHost,
    model: result.model,
    providerUsed: result.providerUsed,
    sourceType: result.sourceType,
    mimeType,
    outputPath,
    bytes: stats.size,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
