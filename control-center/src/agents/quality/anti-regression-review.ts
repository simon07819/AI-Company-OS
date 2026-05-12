import { createArtifactFingerprint } from "@/agents/artifacts/artifact-fingerprint";
import type { MissionArtifact } from "@/agents/artifacts/types";
import type { WorkOrder } from "@/agents/runtime/types";
import type { PreviousDeliverable } from "@/lib/ceoWorkOrder";
import { issue } from "./quality-rubrics";
import type { QualityIssue } from "./types";

export function reviewNoPreviousDeliverableRegression(input: {
  workOrder: WorkOrder;
  primaryArtifact?: MissionArtifact | null;
  previousDeliverable?: PreviousDeliverable | null;
}) {
  const issues: QualityIssue[] = [];
  if (!input.previousDeliverable?.primaryVisual || !input.primaryArtifact) return issues;
  const previousFingerprint = createArtifactFingerprint(input.previousDeliverable.primaryVisual);
  if (input.primaryArtifact.fingerprint === previousFingerprint && input.previousDeliverable.deliverableType !== input.workOrder.deliverableType) {
    issues.push(issue({
      id: "previous-primary-visual-reused",
      category: "recycled_output",
      message: "Le livrable primaire recycle un ancien visuel incompatible.",
      suggestedFix: "Créer un nouvel artifact primaire pour la demande actuelle.",
    }));
  }
  if (input.workOrder.forbiddenPrimaryArtifactFingerprints?.includes(input.primaryArtifact.fingerprint)) {
    issues.push(issue({
      id: "forbidden-primary-artifact",
      category: "recycled_output",
      message: "Le livrable primaire utilise un fingerprint interdit par la mémoire.",
      suggestedFix: "Créer un nouvel artifact primaire pour ce tour.",
    }));
  }
  return issues;
}
