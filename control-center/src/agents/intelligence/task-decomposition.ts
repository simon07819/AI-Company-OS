import type { MissionPlan } from "@/agents/runtime/types";
import { decomposeTasksWithMethods } from "./planning-engine";

export function summarizeTaskDecomposition(plan: MissionPlan) {
  return decomposeTasksWithMethods(plan).map((task) => `${task.agentRole}:${task.methodId ?? "default"}:${task.expectedOutput}`);
}
