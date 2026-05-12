import { runDesignTeamWorkflow, type DesignTeamResult } from "@/lib/design-team/logoWorkflow";
import { type PreviousDeliverable } from "@/lib/ceoWorkOrder";
import { buildLogoArtifact } from "@/agents/artifacts/logo-artifact-builder";
import { createMissionArtifactStore } from "@/agents/artifacts/artifact-store";
import { buildHiddenArtifacts } from "@/agents/artifacts/hidden-artifacts-builder";
import {
  validateArtifactIsolation,
  validateLogoArtifact,
  validateNoArtifactRecycle,
  validatePrimaryArtifactExists,
  validateSimpleChatDoesNotExposeArtifacts,
  validateWebsiteArtifact,
} from "@/agents/artifacts/artifact-quality";
import { buildWebsiteArtifact } from "@/agents/artifacts/website-artifact-builder";
import { runWebsiteDesignWorkflow, type WebsiteTeamResult } from "@/agents/workflows/website-design-workflow";
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

  const workflow: WebsiteTeamResult | DesignTeamResult | null = workOrder.requestType === "website"
    ? runWebsiteDesignWorkflow(userPrompt, context?.previousDeliverable?.primaryVisual ?? null)
    : workOrder.deliverableType === "logo"
      ? runDesignTeamWorkflow(userPrompt)
      : null;
  const websiteWorkflow = workOrder.requestType === "website" ? workflow as WebsiteTeamResult : null;
  const logoWorkflow = workOrder.deliverableType === "logo" ? workflow as DesignTeamResult : null;
  const artifactStore = createMissionArtifactStore({ missionId: workOrder.missionId, turnId: workOrder.turnId });
  const primaryArtifactBuild = workOrder.requestType === "website"
    ? buildWebsiteArtifact({
      missionId: workOrder.missionId,
      turnId: workOrder.turnId,
      brandName: workOrder.brandName ?? "AI Company",
      industry: workOrder.industry,
      style: workOrder.style,
      contentMode: workOrder.contentMode,
      assetRequests: workOrder.assetRequests,
      workflow: websiteWorkflow,
      previousPrimaryVisual: context?.previousDeliverable?.primaryVisual ?? null,
      store: artifactStore,
    })
    : workOrder.deliverableType === "logo"
      ? buildLogoArtifact({
        missionId: workOrder.missionId,
        turnId: workOrder.turnId,
        brandName: workOrder.brandName ?? "AI Company",
        style: workOrder.style,
        background: typeof logoWorkflow?.brief?.background === "string" ? logoWorkflow.brief.background : undefined,
        selectedConcept: logoWorkflow?.selectedConcept,
        primaryVisual: logoWorkflow?.primaryVisual,
        constraints: workOrder.constraints,
        store: artifactStore,
      })
      : null;
  const visibleOutput = buildVisibleOutput(workOrder, primaryArtifactBuild
    ? { primaryArtifact: primaryArtifactBuild.visibleDeliverable }
    : workflow ?? {});
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
  const artifactList = artifactStore.list();
  const primaryArtifact = primaryArtifactBuild?.artifact ?? null;
  const artifactQualityResults = [
    validatePrimaryArtifactExists({ primaryArtifactId: primaryArtifact?.id, artifacts: artifactList }),
    workOrder.deliverableType === "logo"
      ? validateLogoArtifact({ artifact: primaryArtifact, brandName: workOrder.brandName })
      : validateWebsiteArtifact({ artifact: primaryArtifact, brandName: workOrder.brandName }),
    validateArtifactIsolation({ artifacts: artifactList, missionId: workOrder.missionId, turnId: workOrder.turnId }),
    validateNoArtifactRecycle({
      artifact: primaryArtifact,
      previousPrimaryVisual: context?.previousDeliverable?.primaryVisual ?? null,
      previousDeliverableType: context?.previousDeliverable?.deliverableType ?? null,
      currentDeliverableType: workOrder.deliverableType,
    }),
    validateSimpleChatDoesNotExposeArtifacts(visibleOutput),
  ];
  const retry = decideRetry(qualityResults, 0);
  const checkpoints = store.all();
  const executionTrace = buildExecutionTrace({ workOrder, agentRuns, toolTrace, checkpoints, qualityResults: [...qualityResults, ...artifactQualityResults, retry] });

  return {
    workOrder,
    missionPlan,
    visibleOutput,
    hiddenDetails: buildHiddenDetails({
      workOrder,
      missionPlan,
      executionTrace,
      qualityResults: [...qualityResults, ...artifactQualityResults, retry],
      checkpoints,
      workflowDetails,
      artifacts: buildHiddenArtifacts(artifactList),
    }),
  };
}
