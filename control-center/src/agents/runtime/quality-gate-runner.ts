import { assertNoPreviousDeliverableLeak, assertSimpleModeDoesNotExposeInternals } from "@/agents/capabilities/guards";
import { validateWebsiteDeliverable } from "@/agents/quality/gates";
import { validateLogoDeliverable } from "@/agents/quality/logo-quality-gates";
import type { PreviousDeliverable } from "@/lib/ceoWorkOrder";
import type { WorkOrder } from "./types";

export function runQualityGates(input: {
  workOrder: WorkOrder;
  visibleOutput: { kind?: string; deliverableType?: string; brandName?: string; primaryVisual?: string };
  previousDeliverable?: PreviousDeliverable | null;
}) {
  const qualityResults: { gate: string; ok: boolean; issues: string[] }[] = [];
  const payload = { brandName: input.workOrder.brandName, visibleOutput: input.visibleOutput, previousPrimaryVisual: input.previousDeliverable?.primaryVisual };

  if (input.workOrder.deliverableType === "logo") {
    const result = validateLogoDeliverable(payload);
    qualityResults.push({ gate: "validateLogoDeliverable", ok: result.ok, issues: result.issues });
  }

  if (input.workOrder.requestType === "website") {
    const result = validateWebsiteDeliverable(payload);
    qualityResults.push({ gate: "validateWebsiteDeliverable", ok: result.ok, issues: result.issues });
  }

  try {
    assertNoPreviousDeliverableLeak(input.visibleOutput, input.previousDeliverable);
    qualityResults.push({ gate: "validateNoPreviousDeliverableLeak", ok: true, issues: [] });
  } catch (error) {
    qualityResults.push({ gate: "validateNoPreviousDeliverableLeak", ok: false, issues: [error instanceof Error ? error.message : "previous deliverable leak"] });
  }

  try {
    assertSimpleModeDoesNotExposeInternals({ ...input.visibleOutput, primaryVisual: "[media]" });
    qualityResults.push({ gate: "validateSimpleChatOutput", ok: true, issues: [] });
  } catch (error) {
    qualityResults.push({ gate: "validateSimpleChatOutput", ok: false, issues: [error instanceof Error ? error.message : "simple mode leak"] });
  }

  return qualityResults;
}
