import type { KnowledgePack } from "../types";

export const artifactProductionKnowledgePack: KnowledgePack = {
  id: "artifact-production-knowledge",
  domain: "artifact_production",
  principles: ["mission isolation", "fingerprints", "visibility levels", "secret-safe storage"],
  patterns: ["primary artifact for simple visible deliverable", "details_only for internals", "internal_only for traces"],
  antiPatterns: ["mixing artifacts between messages", "exposing files in simple chat", "storing secrets"],
  checklists: ["missionId", "turnId", "fingerprint", "visibility", "no secrets"],
  examples: ["Artifacts appear in details, simple chat shows only the primary visual."],
};
