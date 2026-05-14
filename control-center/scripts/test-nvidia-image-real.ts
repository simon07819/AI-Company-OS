import fs from "node:fs";
import path from "node:path";
import { loadLocalEnv, publicEndpoint } from "./nvidia-env";

async function main() {
  loadLocalEnv();

  const { getNvidiaImageDiagnostics, invokeNvidiaImageGeneration } = await import("../src/lib/providers/nvidiaImageProvider");

  const diagnostic = getNvidiaImageDiagnostics();
  const outputDir = path.join(process.cwd(), "test-results");

  if (!diagnostic.canAttemptGeneration) {
    console.error(JSON.stringify({
      ok: false,
      reason: "missing_configuration",
      missing: diagnostic.missing,
      endpoint: publicEndpoint(diagnostic.endpoint),
      endpointHost: diagnostic.endpointHost || "(missing)",
      model: diagnostic.model,
      suggestedFix: diagnostic.suggestedFix,
    }, null, 2));
    process.exit(1);
  }

  const result = await invokeNvidiaImageGeneration({
    missionId: `real-nvidia-test-${Date.now()}`,
    kind: "logo",
    brandName: "EKIDA CANADA",
    title: "NVIDIA real logo test",
    prompt: "minimal black and white logo mark for EKIDA CANADA",
  });

  if (!result.success || (!result.imageBytes && !result.imageDataUrl)) {
    console.error(JSON.stringify({
      ok: false,
      statusCode: result.statusCode,
      endpoint: publicEndpoint(result.endpoint),
      model: result.model,
      nvidiaError: result.error,
      expectedFormat: result.expectedFormat,
      receivedFormat: result.receivedFormat,
      mimeType: result.mimeType || result.rawContentType || "(unknown)",
    }, null, 2));
    process.exit(1);
  }

  const mimeType = result.mimeType || "image/png";
  if (!mimeType.startsWith("image/")) {
    console.error(JSON.stringify({
      ok: false,
      statusCode: result.statusCode,
      endpoint: publicEndpoint(result.endpoint),
      model: result.model,
      nvidiaError: "Response MIME type is not an image.",
      expectedFormat: "image/*",
      receivedFormat: mimeType,
    }, null, 2));
    process.exit(1);
  }

  const extension = mimeType.includes("webp") ? "webp" : mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  const outputPath = path.join(outputDir, `nvidia-real-logo-test.${extension}`);
  const bytes = result.imageBytes ?? Buffer.from((result.imageDataUrl || "").replace(/^data:image\/[a-z0-9.+-]+;base64,/i, ""), "base64");

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, bytes);

  const stats = fs.statSync(outputPath);
  if (stats.size <= 1024) {
    console.error(JSON.stringify({
      ok: false,
      statusCode: result.statusCode,
      endpoint: publicEndpoint(result.endpoint),
      model: result.model,
      nvidiaError: "Image file is too small.",
      expectedFormat: "image file > 1KB",
      receivedFormat: `${stats.size} bytes`,
      outputPath,
    }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({
    ok: true,
    statusCode: result.statusCode,
    endpoint: publicEndpoint(result.endpoint),
    endpointHost: diagnostic.endpointHost,
    model: result.model,
    mimeType,
    outputPath,
    bytes: stats.size,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
