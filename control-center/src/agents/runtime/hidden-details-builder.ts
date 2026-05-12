import type { ToolTraceEntry } from "@/agents/capabilities/types";
import type { ExecutionTrace, MissionPlan, RuntimeCheckpoint, WorkOrder } from "./types";

export function buildHiddenDetails(input: {
  workOrder: WorkOrder;
  missionPlan: MissionPlan;
  executionTrace: ExecutionTrace;
  workflowDetails?: unknown;
  qualityResults: unknown[];
  checkpoints: RuntimeCheckpoint[];
  artifacts?: unknown[];
  qualityReview?: unknown;
  refinement?: unknown;
  finalApproval?: unknown;
  contextSelection?: unknown;
}) {
  return {
    workOrder: input.workOrder,
    missionPlan: input.missionPlan,
    executionTrace: input.executionTrace,
    qualityResults: input.qualityResults,
    checkpoints: input.checkpoints,
    toolTrace: ((input.workflowDetails as { toolTrace?: ToolTraceEntry[] } | undefined)?.toolTrace ?? input.executionTrace.toolsCalled.map((toolId) => ({
      toolId,
      agentId: "runtime",
      role: "runtime",
      status: "ok" as const,
    }))),
    artifacts: input.artifacts ?? [],
    qualityReview: input.qualityReview,
    refinement: input.refinement,
    finalApproval: input.finalApproval,
    contextSelection: input.contextSelection,
    workflowDetails: input.workflowDetails,
  };
}
