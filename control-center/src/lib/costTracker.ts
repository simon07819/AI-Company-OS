import { readRuntimeJson, writeRuntimeJson } from "@/lib/runtime/runtimeFileStore";

const FILE = "api-costs.json";
const MAX_ENTRIES = 2000;

// Approximate cost per call in USD
const COST_ESTIMATE: Record<string, number> = {
  nvidia_llm: 0.002,
  deepinfra_llm: 0.002,
  prototype_llm: 0.000,
  flux_image: 0.030,
};

export interface CostEntry {
  id: string;
  timestamp: string;
  type: "llm_text" | "image_generation";
  provider: "nvidia" | "deepinfra" | "prototype";
  conversationId?: string;
  purpose: string;
  estimatedCost: number;
}

interface CostStore {
  entries: CostEntry[];
}

function readStore(): CostStore {
  return readRuntimeJson<CostStore>(FILE, { entries: [] });
}

function writeStore(store: CostStore) {
  writeRuntimeJson(FILE, store);
}

function costKey(type: CostEntry["type"], provider: CostEntry["provider"]): string {
  if (type === "image_generation") return "flux_image";
  return `${provider}_llm`;
}

export function recordCost(entry: Omit<CostEntry, "id" | "timestamp" | "estimatedCost">): CostEntry {
  const store = readStore();
  const cost: CostEntry = {
    ...entry,
    id: `cost-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    estimatedCost: COST_ESTIMATE[costKey(entry.type, entry.provider)] ?? 0,
  };
  store.entries = [cost, ...store.entries].slice(0, MAX_ENTRIES);
  writeStore(store);
  return cost;
}

export interface CostSummary {
  totalUsd: number;
  byProject: Record<string, number>;
  byProvider: Record<string, number>;
  callCount: number;
  imageCount: number;
  alertProjects: string[];
  recentEntries: CostEntry[];
}

const PROJECT_ALERT_THRESHOLD = 5.0; // USD

export function getCostSummary(): CostSummary {
  const { entries } = readStore();
  const byProject: Record<string, number> = {};
  const byProvider: Record<string, number> = {};
  let totalUsd = 0;
  let imageCount = 0;

  for (const e of entries) {
    totalUsd += e.estimatedCost;
    if (e.type === "image_generation") imageCount++;
    if (e.conversationId) {
      byProject[e.conversationId] = (byProject[e.conversationId] ?? 0) + e.estimatedCost;
    }
    byProvider[e.provider] = (byProvider[e.provider] ?? 0) + e.estimatedCost;
  }

  const alertProjects = Object.entries(byProject)
    .filter(([, v]) => v >= PROJECT_ALERT_THRESHOLD)
    .map(([k]) => k);

  return {
    totalUsd,
    byProject,
    byProvider,
    callCount: entries.length,
    imageCount,
    alertProjects,
    recentEntries: entries.slice(0, 20),
  };
}
