import { loadRuntimeState, saveRuntimeState } from "./runtimePersist";
import { emitEvent } from "./runtimeEvents";

export type AgentRuntimeStatus =
  | "idle"
  | "planning"
  | "executing"
  | "waiting"
  | "blocked"
  | "retrying"
  | "completed"
  | "failed";

export interface AgentRuntimeState {
  agentId: string;
  status: AgentRuntimeStatus;
  currentTaskId: string | null;
  currentMissionId: string | null;
  progress: number;
  startedAt: string | null;
  lastActivity: string;
  retryCount: number;
  estimatedCompletion: string | null;
}

const DEFAULT_AGENTS = [
  "product_agent",
  "architect_agent",
  "frontend_agent",
  "backend_agent",
  "qa_agent",
  "devops_agent",
];

function makeDefaultState(agentId: string): AgentRuntimeState {
  return {
    agentId,
    status: "idle",
    currentTaskId: null,
    currentMissionId: null,
    progress: 0,
    startedAt: null,
    lastActivity: new Date().toISOString(),
    retryCount: 0,
    estimatedCompletion: null,
  };
}

const runtimeMap = new Map<string, AgentRuntimeState>();
const pausedAgents = new Set<string>();

function initFromPersistedState(): void {
  const saved = loadRuntimeState();
  const savedById = new Map(
    saved.agents.map((a) => {
      const state = a as unknown as AgentRuntimeState;
      return [state.agentId, state] as [string, AgentRuntimeState];
    })
  );
  for (const id of DEFAULT_AGENTS) {
    runtimeMap.set(id, savedById.get(id) ?? makeDefaultState(id));
  }
  for (const id of saved.pausedAgents) {
    if (DEFAULT_AGENTS.includes(id)) pausedAgents.add(id);
  }
}

initFromPersistedState();

function persist(): void {
  saveRuntimeState({
    agents: Array.from(runtimeMap.values()) as unknown as Record<string, unknown>[],
    pausedAgents: Array.from(pausedAgents),
  });
}

export function getAllAgentStates(): AgentRuntimeState[] {
  return Array.from(runtimeMap.values());
}

export function getAgentState(agentId: string): AgentRuntimeState | null {
  return runtimeMap.get(agentId) ?? null;
}

export function updateAgentState(
  agentId: string,
  patch: Partial<AgentRuntimeState>
): AgentRuntimeState {
  const current = runtimeMap.get(agentId) ?? makeDefaultState(agentId);
  const prevStatus = current.status;
  const updated: AgentRuntimeState = {
    ...current,
    ...patch,
    agentId,
    lastActivity: new Date().toISOString(),
  };
  runtimeMap.set(agentId, updated);
  persist();

  if (patch.status !== undefined && patch.status !== prevStatus) {
    emitEvent(
      "agent.status_changed",
      { from: prevStatus, to: updated.status, progress: updated.progress },
      { agentId, sessionId: updated.currentMissionId ?? undefined, taskId: updated.currentTaskId ?? undefined }
    );
  }

  return updated;
}

export function pauseAgent(agentId: string): boolean {
  if (!runtimeMap.has(agentId)) return false;
  pausedAgents.add(agentId);
  updateAgentState(agentId, { status: "idle" });
  return true;
}

export function resumeAgent(agentId: string): boolean {
  if (!runtimeMap.has(agentId)) return false;
  pausedAgents.delete(agentId);
  persist();
  emitEvent("agent.status_changed", { action: "resumed" }, { agentId });
  return true;
}

export function isAgentPaused(agentId: string): boolean {
  return pausedAgents.has(agentId);
}

export function isAgentAvailable(agentId: string): boolean {
  if (pausedAgents.has(agentId)) return false;
  const state = runtimeMap.get(agentId);
  if (!state) return false;
  return (
    state.status === "idle" ||
    state.status === "completed" ||
    state.status === "failed"
  );
}

export function resetRuntime(): void {
  runtimeMap.clear();
  pausedAgents.clear();
  for (const id of DEFAULT_AGENTS) {
    runtimeMap.set(id, makeDefaultState(id));
  }
  persist();
  emitEvent("runtime.reset", { agents: DEFAULT_AGENTS.length });
}
