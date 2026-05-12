import { readRuntimeJson, writeRuntimeJson } from "./runtimeFileStore";
import type { AgentTask } from "@/lib/orchestrator/types";

const FILE = "agent-tasks.json";

export function listAgentTasks(): AgentTask[] {
  return readRuntimeJson<AgentTask[]>(FILE, []);
}

export function saveAgentTasks(tasks: AgentTask[]): AgentTask[] {
  const existing = listAgentTasks().filter((task) => !tasks.some((next) => next.id === task.id));
  const next = [...tasks, ...existing].slice(0, 500);
  writeRuntimeJson(FILE, next);
  return tasks;
}
