import type { WorkOrder } from "@/agents/runtime/types";
import { sanitizeContextForAgent } from "./memory-sanitizer";
import type { ContextSelection } from "./types";

export function selectContextForAgent(agentRole: string, workOrder: WorkOrder, context: ContextSelection) {
  const reusableAssets = agentRole === "ux_designer" || agentRole === "web_designer" || agentRole === "frontend_builder"
    ? context.selectedReusableAssets.filter((asset) => asset.canBeSecondaryFor.includes(workOrder.deliverableType))
    : agentRole === "logo_designer"
      ? context.selectedReusableAssets.filter((asset) => asset.canBePrimaryFor.includes("logo"))
      : context.selectedReusableAssets;

  return sanitizeContextForAgent({
    agentRole,
    prompt: workOrder.originalPrompt,
    deliverableType: workOrder.deliverableType,
    brandName: workOrder.brandName,
    constraints: workOrder.constraints,
    reusableAssets,
    forbiddenPrimaryArtifactFingerprints: context.forbiddenPrimaryArtifactFingerprints,
  });
}
