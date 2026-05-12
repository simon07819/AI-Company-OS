import type { ToolAdapter } from "../types";

export const artifactStoreAdapter: ToolAdapter<unknown, { hiddenDetails: unknown; stored: boolean }> = {
  id: "artifact.store",
  name: "Artifact Store",
  description: "Package artifacts and internal details for hidden details panels only.",
  permissions: [{ id: "artifact.package", description: "Package hidden details in memory.", allowed: true }],
  run(input) {
    return { hiddenDetails: input, stored: true };
  },
};
