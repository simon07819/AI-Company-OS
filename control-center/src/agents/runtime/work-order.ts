import { createWorkOrderFromPrompt as createCeoWorkOrder, type PreviousDeliverable } from "@/lib/ceoWorkOrder";
import type { WorkOrder } from "./types";

function idSafe(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "mission";
}

export function createWorkOrderFromPrompt(
  userPrompt: string,
  context?: { previousDeliverable?: PreviousDeliverable | null; mode?: "simple" | "details" } | PreviousDeliverable | null,
): WorkOrder {
  const runtimeContext = context && ("previousDeliverable" in context || "mode" in context)
    ? context
    : { previousDeliverable: context as PreviousDeliverable | null | undefined };
  const previousDeliverable = runtimeContext?.previousDeliverable ?? null;
  const base = createCeoWorkOrder(userPrompt, previousDeliverable);
  const stamp = Date.now().toString(36);
  const turnId = base.turnId;
  const missionId = `mission-${idSafe(userPrompt)}-${stamp}`;
  return {
    id: `work-${idSafe(userPrompt)}-${stamp}`,
    turnId,
    missionId,
    originalPrompt: userPrompt,
    requestType: base.requestType,
    deliverableType: base.deliverableType,
    brandName: base.brandName ?? undefined,
    currentMode: runtimeContext?.mode ?? "simple",
    isNewDeliverable: !base.shouldReusePreviousLogo,
    mayReusePreviousDeliverable: base.shouldReusePreviousLogo,
    previousDeliverableId: previousDeliverable?.primaryVisual || previousDeliverable?.primaryArtifactFingerprint ? "previous-primary-visual" : undefined,
    constraints: [
      `visibleKind:${base.visibleKind}`,
      ...(base.style ? [`style:${base.style}`] : []),
      ...(base.industry ? [`industry:${base.industry}`] : []),
      ...(base.contentMode ? [`contentMode:${base.contentMode}`] : []),
      ...(base.assetRequests.length ? base.assetRequests.map((asset) => `asset:${asset}`) : []),
    ],
    assetRequests: base.assetRequests,
    contentMode: base.contentMode,
    industry: base.industry,
    style: base.style,
    metadata: { ...base },
  };
}
