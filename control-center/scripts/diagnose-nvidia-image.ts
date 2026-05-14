import { loadLocalEnv, publicEndpoint } from "./nvidia-env";

async function main() {
  loadLocalEnv();

  const { getNvidiaImageDiagnostics } = await import("../src/lib/providers/nvidiaImageProvider");
  const { hasImageProvider, getProviderRegistry } = await import("../src/lib/providers/providerRegistry");

  const diagnostic = getNvidiaImageDiagnostics();
  const registry = getProviderRegistry();

  const report = {
    IMAGE_PROVIDER: diagnostic.imageProviderEnv || "(missing)",
    NVIDIA_API_KEY_present: diagnostic.apiKeyPresent,
    NVIDIA_IMAGE_ENDPOINT_present: diagnostic.endpointPresent,
    NVIDIA_IMAGE_MODEL_present: diagnostic.modelPresent,
    endpointFinalUsed: publicEndpoint(diagnostic.endpoint),
    endpointHost: diagnostic.endpointHost || "(missing)",
    modelUsed: diagnostic.model,
    authHeaderPresent: diagnostic.authHeaderPresent,
    NODE_ENV: diagnostic.nodeEnv,
    providerRegistryImageAvailable: registry.image.available,
    hasImageProvider: hasImageProvider(),
    whyHasImageProviderFalse: diagnostic.providerAvailable ? [] : diagnostic.reasons,
    missing: diagnostic.missing,
    suggestedFix: diagnostic.suggestedFix,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(diagnostic.providerAvailable ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
