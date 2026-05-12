import { runDesignTeamWorkflow } from "@/lib/design-team/logoWorkflow";
import { type PreviousDeliverable } from "@/lib/ceoWorkOrder";
import { runWebsiteDesignWorkflow } from "@/agents/workflows/website-design-workflow";
import type { AgentRunResult } from "@/agents/types";
import type { ToolTraceEntry } from "@/agents/capabilities/types";
import { InMemoryCheckpointStore } from "./checkpoint-store";
import { buildExecutionTrace } from "./execution-trace";
import { buildHiddenDetails } from "./hidden-details-builder";
import { createMissionPlan } from "./mission-planner";
import { runQualityGates } from "./quality-gate-runner";
import { decideRetry } from "./retry-policy";
import { buildTaskGraph, sortTasksForExecution } from "./task-graph";
import { runMissionTask } from "./task-runner";
import type { MissionRuntimeResult } from "./types";
import { buildVisibleOutput } from "./visible-output-builder";
import { createWorkOrderFromPrompt } from "./work-order";

export function runAgentMission(userPrompt: string, context?: { previousDeliverable?: PreviousDeliverable | null; mode?: "simple" | "details" }): MissionRuntimeResult {
  const workOrder = createWorkOrderFromPrompt(userPrompt, context);
  const missionPlan = createMissionPlan(workOrder);
  const graph = buildTaskGraph(missionPlan);
  const store = new InMemoryCheckpointStore();
  const runtimeAgentRuns: AgentRunResult[] = [];
  const runtimeToolTrace: ToolTraceEntry[] = [];

  for (const task of sortTasksForExecution(graph)) {
    store.add(runMissionTask(task, { workOrder, agentRuns: runtimeAgentRuns, toolTrace: runtimeToolTrace }));
  }

  const workflow = workOrder.requestType === "website"
    ? runWebsiteDesignWorkflow(userPrompt, context?.previousDeliverable?.primaryVisual ?? null)
    : workOrder.deliverableType === "logo"
      ? runDesignTeamWorkflow(userPrompt)
      : null;
  const visibleOutput = buildVisibleOutput(workOrder, workflow ?? {});
  const workflowDetails = workflow?.hiddenDetails ?? {};
  const workflowAgentRuns = "agentRuns" in workflowDetails && Array.isArray(workflowDetails.agentRuns) ? workflowDetails.agentRuns as AgentRunResult[] : [];
  const workflowToolTrace = "toolTrace" in workflowDetails && Array.isArray(workflowDetails.toolTrace) ? workflowDetails.toolTrace as ToolTraceEntry[] : [];
  const agentRuns = [...runtimeAgentRuns, ...workflowAgentRuns];
  const toolTrace = [...runtimeToolTrace, ...workflowToolTrace];
  const qualityResults = runQualityGates({
    workOrder,
    visibleOutput: visibleOutput as { kind?: string; deliverableType?: string; brandName?: string; primaryVisual?: string },
    previousDeliverable: context?.previousDeliverable ?? null,
  });
  const retry = decideRetry(qualityResults, 0);
  const checkpoints = store.all();
  const executionTrace = buildExecutionTrace({ workOrder, agentRuns, toolTrace, checkpoints, qualityResults: [...qualityResults, retry] });

  return {
    workOrder,
    missionPlan,
    visibleOutput,
    hiddenDetails: buildHiddenDetails({
      workOrder,
      missionPlan,
      executionTrace,
      qualityResults: [...qualityResults, retry],
      checkpoints,
      workflowDetails,
      artifacts: [],
    }),
  };
}
