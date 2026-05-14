import { loadLocalEnv, publicEndpoint } from "./nvidia-env";

async function main() {
  loadLocalEnv();

  const { getDeepInfraImageStatus, hasDeepInfraImageProvider } = await import("../src/lib/providers/deepinfraImageProvider");

  const diagnostic = getDeepInfraImageStatus();
  const report = {
    IMAGE_PROVIDER: diagnostic.imageProviderEnv || "(missing)",
    DEEPINFRA_API_KEY_present: diagnostic.apiKeyPresent,
    DEEPINFRA_BASE_URL_present: diagnostic.baseURLPresent,
    DEEPINFRA_IMAGE_MODEL_present: diagnostic.modelPresent,
    baseURL: publicEndpoint(diagnostic.baseURL),
    endpointFinalUsed: publicEndpoint(diagnostic.endpoint),
    endpointHost: diagnostic.endpointHost || "(missing)",
    modelUsed: diagnostic.model || "(missing)",
    authHeaderPresent: diagnostic.authHeaderPresent,
    NODE_ENV: process.env.NODE_ENV || "(unset)",
    deepInfraImageAvailable: hasDeepInfraImageProvider(),
    missing: diagnostic.missing,
    suggestedFix: diagnostic.suggestedFix,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(diagnostic.available ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
