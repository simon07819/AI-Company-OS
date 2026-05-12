import { runAgentMission } from "@/agents/runtime/mission-runtime";
import type { MissionRuntimeResult } from "@/agents/runtime/types";
import type { AgentRunResult } from "@/agents/types";
import type { PreviousDeliverable } from "@/lib/ceoWorkOrder";

export type CompanyWorkflowResult =
  | {
      workflow: "logo" | "website";
      workOrder: MissionRuntimeResult["workOrder"];
      visibleOutput: MissionRuntimeResult["visibleOutput"];
      hiddenDetails: MissionRuntimeResult["hiddenDetails"];
      missionPlan: MissionRuntimeResult["missionPlan"];
      agentRuns: AgentRunResult[];
    }
  | {
      workflow: "unknown";
      workOrder: MissionRuntimeResult["workOrder"];
      visibleOutput: null;
      hiddenDetails: MissionRuntimeResult["hiddenDetails"];
      missionPlan: MissionRuntimeResult["missionPlan"];
      agentRuns: AgentRunResult[];
    };

export function runCompanyWorkflow(userPrompt: string, context?: { previousDeliverable?: PreviousDeliverable | null }): CompanyWorkflowResult {
  const runtime = runAgentMission(userPrompt, { previousDeliverable: context?.previousDeliverable ?? null, mode: "simple" });
  const workflow = runtime.workOrder.requestType === "website"
    ? "website"
    : runtime.workOrder.deliverableType === "logo"
      ? "logo"
      : "unknown";
  const workflowDetails = runtime.hiddenDetails.workflowDetails as { agentRuns?: AgentRunResult[] } | undefined;
  return {
    workflow,
    workOrder: runtime.workOrder,
    visibleOutput: workflow === "unknown" ? null : runtime.visibleOutput,
    hiddenDetails: runtime.hiddenDetails,
    missionPlan: runtime.missionPlan,
    agentRuns: workflowDetails?.agentRuns ?? [],
  } as CompanyWorkflowResult;
}
