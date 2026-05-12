import type { AgentContextSelection, MissionMemoryEntry, MissionMemorySnapshot } from "./types";

const SECRET_PATTERN = /NVIDIA_API_KEY|OPENAI_API_KEY|BEGIN [A-Z ]*PRIVATE KEY|\.env(?:\.local)?/i;
const SIMPLE_FORBIDDEN = /hiddenDetails|executionTrace|toolTrace|checkpoints|qualityReport|artifacts|artifactPaths|runtime|logs|README|JSON|workspace/i;

export function assertSafeMemoryText(value: string) {
  if (SECRET_PATTERN.test(value)) throw new Error("Memory contains a blocked secret marker");
}

export function sanitizeMemoryEntry(entry: MissionMemoryEntry): MissionMemoryEntry {
  assertSafeMemoryText(JSON.stringify({
    summary: entry.summary,
    brandName: entry.brandName,
    reusableAssets: entry.reusableAssets,
  }));
  return {
    ...entry,
    hiddenDetailsRef: entry.hiddenDetailsRef ? `hidden:${entry.missionId}` : undefined,
  };
}

export function sanitizeMemoryForSimpleMode(snapshot: MissionMemorySnapshot) {
  return {
    conversationId: snapshot.conversationId,
    turns: snapshot.turns.map((turn) => ({
      id: turn.id,
      userPrompt: turn.userPrompt,
      deliverableType: turn.deliverableType,
      brandName: turn.brandName,
      visibleOutputKind: turn.visibleOutputKind,
      status: turn.status,
    })),
  };
}

export function sanitizeContextForAgent(context: AgentContextSelection) {
  const safe = JSON.stringify(context);
  assertSafeMemoryText(safe);
  if (SIMPLE_FORBIDDEN.test(safe)) {
    return {
      ...context,
      reusableAssets: context.reusableAssets.map((asset) => ({
        ...asset,
        constraints: asset.constraints.filter((item) => !SIMPLE_FORBIDDEN.test(item)),
      })),
    };
  }
  return context;
}
