import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/serverAuth";
import { getNvidiaImageDiagnostics, invokeNvidiaImageGeneration } from "@/lib/providers/nvidiaImageProvider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function extensionFromMime(mimeType?: string) {
  if (mimeType?.includes("webp")) return "webp";
  if (mimeType?.includes("jpeg") || mimeType?.includes("jpg")) return "jpg";
  return "png";
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  const diagnostic = getNvidiaImageDiagnostics();
  if (!diagnostic.canAttemptGeneration) {
    return NextResponse.json({
      ok: false,
      configured: false,
      artifactCreated: false,
      endpointHost: diagnostic.endpointHost ?? null,
      model: diagnostic.model,
      error: diagnostic.reasons.join(" ") || diagnostic.suggestedFix,
      suggestedFix: diagnostic.suggestedFix,
      missing: diagnostic.missing,
    }, { status: 400 });
  }

  const result = await invokeNvidiaImageGeneration({
    missionId: `diagnostic-nvidia-image-${Date.now()}`,
    kind: "logo",
    brandName: "EKIDA CANADA",
    title: "Diagnostic NVIDIA image",
    prompt: "minimal black and white logo mark for EKIDA CANADA",
  });

  if (!result.success || (!result.imageBytes && !result.imageDataUrl)) {
    return NextResponse.json({
      ok: false,
      configured: true,
      artifactCreated: false,
      statusCode: result.statusCode,
      endpointHost: diagnostic.endpointHost ?? null,
      model: result.model,
      error: result.error,
      expectedFormat: result.expectedFormat,
      receivedFormat: result.receivedFormat,
      mimeType: result.mimeType ?? result.rawContentType ?? null,
    }, { status: 502 });
  }

  const mimeType = result.mimeType ?? "image/png";
  const bytes = result.imageBytes ?? Buffer.from((result.imageDataUrl ?? "").replace(/^data:image\/[a-z0-9.+-]+;base64,/i, ""), "base64");
  const outputDir = path.join(process.cwd(), "test-results");
  const outputPath = path.join(outputDir, `nvidia-diagnostic-logo-test.${extensionFromMime(mimeType)}`);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, bytes);

  return NextResponse.json({
    ok: true,
    configured: true,
    artifactCreated: true,
    outputPath,
    bytes: bytes.length,
    statusCode: result.statusCode,
    endpointHost: diagnostic.endpointHost ?? null,
    model: result.model,
    mimeType,
  });
}
