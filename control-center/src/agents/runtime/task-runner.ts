import { defaultToolContext, runToolAdapter } from "@/agents/capabilities/registry";
import { agentRegistry, runAgentSkill, skillRegistry } from "@/agents/registry";
import type { AgentRunResult } from "@/agents/types";
import type { ToolTraceEntry } from "@/agents/capabilities/types";
import type { MissionTask, RuntimeCheckpoint, WorkOrder } from "./types";

export interface TaskRuntimeContext {
  workOrder: WorkOrder;
  agentRuns: AgentRunResult[];
  toolTrace: ToolTraceEntry[];
}

export function runMissionTask(task: MissionTask, context: TaskRuntimeContext): RuntimeCheckpoint {
  const agent = Object.values(agentRegistry).find((candidate) => candidate.role === task.agentRole || candidate.id === task.agentRole);
  if (!agent) return blockedCheckpoint(context.workOrder.id, task.id, `Unknown agent role: ${task.agentRole}`);
  if (!skillRegistry[task.skillId] || !agent.skills.includes(task.skillId)) {
    return blockedCheckpoint(context.workOrder.id, task.id, `Skill ${task.skillId} is not allowed for ${agent.id}`);
  }

  for (const toolId of task.toolIds) {
    if (!agent.toolsAllowed.includes(toolId)) return blockedCheckpoint(context.workOrder.id, task.id, `Tool ${toolId} is not allowed for ${agent.id}`);
  }

  const skillRun = runAgentSkill(agent.id, task.skillId, task.input, {
    turnId: context.workOrder.turnId,
    missionId: context.workOrder.missionId,
    userPrompt: context.workOrder.originalPrompt,
    mode: "details",
    agentId: agent.id,
  });
  context.agentRuns.push(skillRun);

  for (const toolId of task.toolIds) {
    const trace = runToolAdapter(toolId, task.input, defaultToolContext({
      turnId: context.workOrder.turnId,
      missionId: context.workOrder.missionId,
      agentId: agent.id,
      role: agent.role,
      userPrompt: context.workOrder.originalPrompt,
      mode: "details",
    }), agent.toolsAllowed, agent.capabilityPacks[0]);
    context.toolTrace.push(trace);
    if (trace.status === "blocked" || trace.status === "failed") return blockedCheckpoint(context.workOrder.id, task.id, trace.error ?? `Tool ${toolId} failed`);
  }

  return {
    id: `${context.workOrder.id}-${task.id}`,
    workOrderId: context.workOrder.id,
    taskId: task.id,
    status: skillRun.status === "ok" ? "ok" : "failed",
    output: skillRun.output,
    error: skillRun.notes?.join("; "),
    createdAt: new Date().toISOString(),
  };
}

function blockedCheckpoint(workOrderId: string, taskId: string, error: string): RuntimeCheckpoint {
  return {
    id: `${workOrderId}-${taskId}`,
    workOrderId,
    taskId,
    status: "blocked",
    error,
    createdAt: new Date().toISOString(),
  };
}
