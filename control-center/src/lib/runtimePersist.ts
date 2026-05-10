import fs from "fs";
import path from "path";

const REPO_ROOT = path.resolve(process.cwd(), "..");
const DATA_DIR = path.join(REPO_ROOT, "data");
export const RUNTIME_STATE_PATH = path.join(DATA_DIR, "runtime-state.json");

export interface RuntimeStateFile {
  agents: Record<string, unknown>[];
  queue: Record<string, unknown>[];
  pausedAgents: string[];
  stats: { totalEventsEmitted: number };
  savedAt: string;
}

function emptyState(): RuntimeStateFile {
  return {
    agents: [],
    queue: [],
    pausedAgents: [],
    stats: { totalEventsEmitted: 0 },
    savedAt: new Date().toISOString(),
  };
}

export function loadRuntimeState(): RuntimeStateFile {
  try {
    if (!fs.existsSync(RUNTIME_STATE_PATH)) return emptyState();
    const raw = fs.readFileSync(RUNTIME_STATE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as RuntimeStateFile;
    return {
      agents: Array.isArray(parsed.agents) ? parsed.agents : [],
      queue: Array.isArray(parsed.queue) ? parsed.queue : [],
      pausedAgents: Array.isArray(parsed.pausedAgents) ? parsed.pausedAgents : [],
      stats: parsed.stats ?? { totalEventsEmitted: 0 },
      savedAt: parsed.savedAt ?? new Date().toISOString(),
    };
  } catch {
    return emptyState();
  }
}

export function saveRuntimeState(patch: Partial<RuntimeStateFile>): void {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const current = loadRuntimeState();
    const merged: RuntimeStateFile = {
      ...current,
      ...patch,
      savedAt: new Date().toISOString(),
    };
    fs.writeFileSync(RUNTIME_STATE_PATH, JSON.stringify(merged, null, 2) + "\n", "utf-8");
  } catch {
    // non-fatal — runtime state is restored on next cold start
  }
}
