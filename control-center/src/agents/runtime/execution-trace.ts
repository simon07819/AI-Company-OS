import type { AgentRunResult } from "@/agents/types";
import type { ToolTraceEntry } from "@/agents/capabilities/types";
import type { ExecutionTrace, RuntimeCheckpoint, WorkOrder } from "./types";

export function buildExecutionTrace(input: {
  workOrder: WorkOrder;
  agentRuns: AgentRunResult[];
  toolTrace: ToolTraceEntry[];
  checkpoints: RuntimeCheckpoint[];
  qualityResults: unknown[];
}): ExecutionTrace {
  return {
    workOrderId: input.workOrder.id,
    missionId: input.workOrder.missionId,
    agentsCalled: Array.from(new Set(input.agentRuns.map((run) => run.role))),
    skillsCalled: Array.from(new Set(input.agentRuns.map((run) => run.skillId))),
    toolsCalled: Array.from(new Set(input.toolTrace.map((trace) => trace.toolId))),
    checkpoints: input.checkpoints,
    qualityResults: input.qualityResults,
  };
}
