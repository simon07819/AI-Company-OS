import type { MissionMemoryEntry } from "./types";

export function summarizeMissionMemory(entry: Pick<MissionMemoryEntry, "deliverableType" | "brandName" | "primaryArtifactId">) {
  const brand = entry.brandName ? ` ${entry.brandName}` : "";
  return `${entry.deliverableType}${brand} approuvé avec artifact ${entry.primaryArtifactId ?? "n/a"}.`;
}
