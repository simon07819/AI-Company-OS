import type { ToolTraceEntry } from "@/agents/capabilities/types";
import type { AgentBrainOutput, CritiqueResult, RefinementStrategy } from "@/agents/intelligence/types";
import type { PlaybookTraceEntry, SelectedAgentKnowledge } from "@/agents/playbooks/types";
import type { TournamentResult } from "@/agents/tournament/types";

export interface WorkOrder {
  id: string;
  turnId: string;
  missionId: string;
  originalPrompt: string;
  requestType: string;
  deliverableType: string;
  brandName?: string;
  currentMode: "simple" | "details";
  isNewDeliverable: boolean;
  mayReusePreviousDeliverable: boolean;
  previousDeliverableId?: string;
  constraints: string[];
  assetRequests: string[];
  contentMode?: "temporary" | "real";
  industry?: string;
  style?: string;
  metadata: Record<string, unknown>;
  forbiddenPrimaryArtifactFingerprints?: string[];
  selectedReusableAssets?: unknown[];
  contextSelection?: unknown;
}

export interface MissionTask {
  id: string;
  agentRole: string;
  skillId: string;
  toolIds: string[];
  dependsOn: string[];
  input: unknown;
  expectedOutput: string;
  status: "pending" | "running" | "ok" | "failed" | "blocked";
}

export interface MissionPlan {
  id: string;
  workOrderId: string;
  workflowId: string;
  objective: string;
  agents: string[];
  tasks: MissionTask[];
  qualityGates: string[];
}

export interface TaskGraph {
  nodes: MissionTask[];
  edges: { from: string; to: string }[];
}

export interface RuntimeCheckpoint {
  id: string;
  workOrderId: string;
  taskId: string;
  status: "ok" | "failed" | "blocked";
  output?: unknown;
  error?: string;
  createdAt: string;
}

export interface ExecutionTrace {
  workOrderId: string;
  missionId: string;
  agentsCalled: string[];
  skillsCalled: string[];
  toolsCalled: string[];
  checkpoints: RuntimeCheckpoint[];
  qualityResults: unknown[];
}

export interface MissionRuntimeResult<VisibleOutput = unknown> {
  workOrder: WorkOrder;
  missionPlan: MissionPlan;
  visibleOutput: VisibleOutput;
  hiddenDetails: {
    executionTrace: ExecutionTrace;
    artifacts?: unknown[];
    qualityResults?: unknown[];
    checkpoints?: RuntimeCheckpoint[];
    toolTrace?: ToolTraceEntry[];
    workflowDetails?: unknown;
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
  };
}
