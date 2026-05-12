import type { WorkOrder } from "./types";
import type { VisibleDeliverableArtifact } from "@/agents/artifacts/types";

export function buildVisibleOutput(workOrder: WorkOrder, output: { primaryVisual?: string; visibleOutput?: unknown; primaryArtifact?: VisibleDeliverableArtifact }) {
  if (output.primaryArtifact) {
    if (output.primaryArtifact.kind === "logo") {
      return {
        kind: "visual",
        deliverableType: "logo",
        brandName: output.primaryArtifact.brandName ?? workOrder.brandName,
        mediaType: output.primaryArtifact.mediaType,
        primaryArtifactId: output.primaryArtifact.artifactId,
        primaryVisual: output.primaryArtifact.content,
        alt: output.primaryArtifact.alt,
      };
    }
    return {
      kind: "website_preview",
      deliverableType: workOrder.deliverableType === "landing_page" ? "landing_page" : "website",
      brandName: output.primaryArtifact.brandName ?? workOrder.brandName,
      mediaType: output.primaryArtifact.mediaType,
      primaryArtifactId: output.primaryArtifact.artifactId,
      primaryVisual: output.primaryArtifact.content,
      alt: output.primaryArtifact.alt,
    };
  }
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
