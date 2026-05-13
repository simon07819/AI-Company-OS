import type { WorkOrder } from "@/agents/runtime/types";

export function chooseWorkflowWithPolicy(workOrder: WorkOrder) {
  if (workOrder.requestType === "website") return "website_design";
  if (workOrder.deliverableType === "logo") return "logo_design";
  return "clarification";
}

export function shouldAskHumanForClarification(workOrder: WorkOrder) {
  return workOrder.deliverableType === "unknown" || (!workOrder.brandName && (workOrder.deliverableType === "logo" || workOrder.requestType === "website"));
}
