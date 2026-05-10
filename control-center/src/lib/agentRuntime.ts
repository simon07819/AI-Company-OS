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

const runtimeMap = new Map<string, AgentRuntimeState>(
  DEFAULT_AGENTS.map((id) => [id, makeDefaultState(id)])
);

const pausedAgents = new Set<string>();

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
  const updated: AgentRuntimeState = {
    ...current,
    ...patch,
    agentId,
    lastActivity: new Date().toISOString(),
  };
  runtimeMap.set(agentId, updated);
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
}
