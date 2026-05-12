import { sanitizeMemoryEntry, assertSafeMemoryText } from "./memory-sanitizer";
import type { ConversationTurn, MissionMemoryEntry, MissionMemorySnapshot, ReusableAsset } from "./types";

const stores = new Map<string, MissionMemoryStore>();

export class MissionMemoryStore {
  private turns: ConversationTurn[] = [];
  private memories: MissionMemoryEntry[] = [];

  constructor(public readonly conversationId: string) {}

  addTurn(turn: Omit<ConversationTurn, "conversationId" | "createdAt"> & { createdAt?: string }) {
    assertSafeMemoryText(turn.userPrompt);
    const entry: ConversationTurn = {
      ...turn,
      conversationId: this.conversationId,
      createdAt: turn.createdAt ?? new Date().toISOString(),
    };
    this.turns.push(entry);
    return entry;
  }

  addApprovedMission(entry: Omit<MissionMemoryEntry, "conversationId" | "createdAt"> & { createdAt?: string }) {
    const memory = sanitizeMemoryEntry({
      ...entry,
      conversationId: this.conversationId,
      createdAt: entry.createdAt ?? new Date().toISOString(),
    });
    this.memories.push(memory);
    return memory;
  }

  lastApprovedDeliverable() {
    return [...this.memories].reverse().find((entry) => entry.primaryArtifactId) ?? null;
  }

  assetsByBrandName(brandName?: string | null) {
    const normalized = brandName?.toLowerCase();
    return this.memories
      .flatMap((entry) => entry.reusableAssets)
      .filter((asset) => !normalized || asset.brandName?.toLowerCase() === normalized);
  }

  compatibleAssets(deliverableType: string, brandName?: string | null) {
    return this.assetsByBrandName(brandName).filter((asset) => asset.canBePrimaryFor.includes(deliverableType) || asset.canBeSecondaryFor.includes(deliverableType));
  }

  snapshot(): MissionMemorySnapshot {
    return {
      conversationId: this.conversationId,
      turns: [...this.turns],
      memories: [...this.memories],
    };
  }
}

export function createMissionMemoryStore(context: { conversationId: string }) {
  if (!stores.has(context.conversationId)) stores.set(context.conversationId, new MissionMemoryStore(context.conversationId));
  return stores.get(context.conversationId)!;
}

export function clearMissionMemoryStore(conversationId?: string) {
  if (conversationId) stores.delete(conversationId);
  else stores.clear();
}

export function reusableAssetFromMission(input: {
  id: string;
  deliverableType: string;
  brandName?: string;
  primaryArtifactId: string;
  primaryArtifactFingerprint: string;
  constraints?: string[];
}): ReusableAsset {
  const kind = input.deliverableType === "logo" ? "logo" : input.deliverableType === "website" || input.deliverableType === "landing_page" ? "website_preview" : "brand_asset";
  return {
    id: input.id,
    kind,
    brandName: input.brandName,
    artifactId: input.primaryArtifactId,
    fingerprint: input.primaryArtifactFingerprint,
    canBePrimaryFor: input.deliverableType === "logo" ? ["logo"] : [input.deliverableType],
    canBeSecondaryFor: input.deliverableType === "logo" ? ["website", "landing_page", "app"] : [],
    constraints: input.constraints ?? [],
  };
}
