import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/serverAuth";
import { getNvidiaImageDiagnostics } from "@/lib/providers/nvidiaImageProvider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  const diagnostic = getNvidiaImageDiagnostics();
  return NextResponse.json({
    ok: true,
    configured: diagnostic.configured,
    providerAvailable: diagnostic.providerAvailable,
    endpointHost: diagnostic.endpointHost ?? null,
    model: diagnostic.model,
    lastError: diagnostic.reasons.join(" ") || null,
    suggestedFix: diagnostic.suggestedFix,
    canAttemptGeneration: diagnostic.canAttemptGeneration,
    missing: diagnostic.missing,
    IMAGE_PROVIDER: diagnostic.imageProviderEnv ? "present" : "missing",
    NVIDIA_API_KEY: diagnostic.apiKeyPresent ? "present" : "missing",
    NVIDIA_IMAGE_ENDPOINT: diagnostic.endpointPresent ? "present" : "missing",
    NVIDIA_IMAGE_MODEL: diagnostic.modelPresent ? "present" : "default_used",
  });
}
