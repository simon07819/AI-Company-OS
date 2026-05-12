import type { WorkOrder } from "./types";

export function buildVisibleOutput(workOrder: WorkOrder, output: { primaryVisual?: string; visibleOutput?: unknown }) {
  if (output.visibleOutput) return output.visibleOutput;
  if (workOrder.deliverableType === "logo") {
    return {
      kind: "visual",
      deliverableType: "logo",
      brandName: workOrder.brandName,
      mediaType: "svg",
      primaryVisual: output.primaryVisual,
      alt: `Logo ${workOrder.brandName ?? ""}`.trim(),
    };
  }
  if (workOrder.requestType === "website") {
    return {
      kind: "website_preview",
      deliverableType: workOrder.deliverableType,
      brandName: workOrder.brandName,
      mediaType: "svg",
      primaryVisual: output.primaryVisual,
      alt: `Preview site web ${workOrder.brandName ?? ""}`.trim(),
    };
  }
  return { kind: "unknown", deliverableType: workOrder.deliverableType };
}
