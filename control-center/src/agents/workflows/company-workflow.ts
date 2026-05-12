import { createWorkOrderFromPrompt, type PreviousDeliverable } from "@/lib/ceoWorkOrder";
import { runDesignTeamWorkflow } from "@/lib/design-team/logoWorkflow";
import { runAgentSkill } from "@/agents/registry";
import type { AgentRunResult } from "@/agents/types";
import { runWebsiteDesignWorkflow } from "./website-design-workflow";

export type CompanyWorkflowResult =
  | {
      workflow: "logo";
      workOrder: ReturnType<typeof createWorkOrderFromPrompt>;
      visibleOutput: ReturnType<typeof runDesignTeamWorkflow>["visibleOutput"];
      hiddenDetails: ReturnType<typeof runDesignTeamWorkflow>["hiddenDetails"];
      agentRuns: AgentRunResult[];
    }
  | {
      workflow: "website";
      workOrder: ReturnType<typeof createWorkOrderFromPrompt>;
      visibleOutput: ReturnType<typeof runWebsiteDesignWorkflow>["visibleOutput"];
      hiddenDetails: ReturnType<typeof runWebsiteDesignWorkflow>["hiddenDetails"];
      agentRuns: AgentRunResult[];
    }
  | {
      workflow: "unknown";
      workOrder: ReturnType<typeof createWorkOrderFromPrompt>;
      visibleOutput: null;
      hiddenDetails: { agentRuns: AgentRunResult[] };
      agentRuns: AgentRunResult[];
    };

export function runCompanyWorkflow(userPrompt: string, context?: { previousDeliverable?: PreviousDeliverable | null }): CompanyWorkflowResult {
  const workOrder = createWorkOrderFromPrompt(userPrompt, context?.previousDeliverable ?? null);
  const routerRuns: AgentRunResult[] = [];
  routerRuns.push(runAgentSkill("ceo", "parse_user_request", userPrompt));
  routerRuns.push(runAgentSkill("ceo", "create_work_order", workOrder));
  routerRuns.push(runAgentSkill("ceo", "decide_previous_deliverable_reuse", {
    workOrder,
    previousDeliverable: context?.previousDeliverable ?? null,
    allowed: workOrder.shouldReusePreviousLogo,
  }));
  routerRuns.push(runAgentSkill("ceo", "route_workflow", { requestType: workOrder.requestType, deliverableType: workOrder.deliverableType }));

  if (workOrder.requestType === "website") {
    const website = runWebsiteDesignWorkflow(userPrompt, context?.previousDeliverable?.primaryVisual ?? null);
    return {
      workflow: "website",
      workOrder,
      visibleOutput: website.visibleOutput,
      hiddenDetails: website.hiddenDetails,
      agentRuns: [...routerRuns, ...website.hiddenDetails.agentRuns],
    };
  }

  if (workOrder.deliverableType === "logo") {
    const logo = runDesignTeamWorkflow(userPrompt);
    return {
      workflow: "logo",
      workOrder,
      visibleOutput: logo.visibleOutput,
      hiddenDetails: logo.hiddenDetails,
      agentRuns: [...routerRuns, ...logo.hiddenDetails.agentRuns],
    };
  }

  return {
    workflow: "unknown",
    workOrder,
    visibleOutput: null,
    hiddenDetails: { agentRuns: routerRuns },
    agentRuns: routerRuns,
  };
}
