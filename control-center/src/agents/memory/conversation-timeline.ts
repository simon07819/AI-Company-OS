import type { ConversationTurn, MissionMemoryEntry } from "./types";

export function appendConversationTurn(turns: ConversationTurn[], turn: ConversationTurn) {
  return [...turns.filter((item) => item.id !== turn.id), turn].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function latestApprovedMemory(memories: MissionMemoryEntry[]) {
  return [...memories].reverse().find((entry) => entry.primaryArtifactId) ?? null;
}

export function memoriesForBrand(memories: MissionMemoryEntry[], brandName?: string) {
  const normalized = brandName?.toLowerCase();
  return memories.filter((entry) => !normalized || entry.brandName?.toLowerCase() === normalized);
}
