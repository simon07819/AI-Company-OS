import { createTraceableArtifact } from "@/lib/providers/providerRegistry";
import { generateNvidiaImage, getNvidiaImageProviderStatus } from "@/lib/providers/nvidiaImageProvider";

export async function runAssetsAgent(command: string, missionId: string) {
  const started = Date.now();
  const status = getNvidiaImageProviderStatus();
  if (!status.available) {
    return {
      ok: true,
      missionId,
      agent: "assets-agent" as const,
      status: "needs_action" as const,
      title: "Agent Assets prêt",
      shortMessage: "Agent Assets prêt, mais aucun provider NVIDIA image n’est configuré.",
      providerUsed: status.providerUsed === "nvidia" ? "nvidia_unavailable" : "none",
      sourceType: "provider_unavailable",
      artifactId: null,
      outputData: null,
      durationMs: Date.now() - started,
      expert: { model: status.model, providerUsed: status.providerUsed, sourceType: "provider_unavailable", artifactId: null, durationMs: Date.now() - started, retries: 0 },
    };
  }

  const image = await generateNvidiaImage({
    missionId,
    kind: "website_hero",
    title: "Asset site/app",
    prompt: `Generate a polished site/app asset only. No code. Request: ${command}`,
  });
  if (!image.success || !image.imageDataUrl) {
    return {
      ok: true,
      missionId,
      agent: "assets-agent" as const,
      status: "failed" as const,
      title: "Agent Assets indisponible",
      shortMessage: "Le provider NVIDIA n’a pas retourné d’asset exploitable.",
      providerUsed: image.providerUsed,
      sourceType: image.sourceType,
      artifactId: null,
      outputData: null,
      durationMs: Date.now() - started,
      expert: { model: image.model, providerUsed: image.providerUsed, sourceType: image.sourceType, artifactId: null, durationMs: Date.now() - started, retries: 0, error: image.error },
    };
  }

  const artifact = createTraceableArtifact({
    missionId,
    type: "nvidia_asset",
    title: "Asset final NVIDIA",
    sourceType: "nvidia_image",
    providerUsed: "nvidia",
    content: image.imageDataUrl,
  });
  return {
    ok: true,
    missionId,
    agent: "assets-agent" as const,
    status: "completed" as const,
    title: "Asset final",
    shortMessage: "Voici votre asset final.",
    providerUsed: "nvidia",
    sourceType: "nvidia_image",
    artifactId: artifact.artifactId,
    outputData: image.imageDataUrl,
    durationMs: Date.now() - started,
    expert: { model: image.model, providerUsed: "nvidia", sourceType: "nvidia_image", artifactId: artifact.artifactId, durationMs: Date.now() - started, retries: 0 },
  };
}
