import type { ToolTraceEntry } from "@/agents/capabilities/types";
import type { AgentBrainOutput, CritiqueResult, RefinementStrategy } from "@/agents/intelligence/types";
import type { PlaybookTraceEntry, SelectedAgentKnowledge } from "@/agents/playbooks/types";
import type { TournamentResult } from "@/agents/tournament/types";
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
  tournament?: TournamentResult | null;
  contextSelection?: unknown;
  intelligence?: {
      brainOutputs: AgentBrainOutput[];
      critiques: CritiqueResult[];
      refinementStrategies: RefinementStrategy[];
      playbookTrace?: PlaybookTraceEntry[];
      selectedKnowledge?: SelectedAgentKnowledge[];
      taskDecomposition?: string[];
    };
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
    tournament: input.tournament,
    contextSelection: input.contextSelection,
    intelligence: input.intelligence,
    workflowDetails: input.workflowDetails,
  };
}
