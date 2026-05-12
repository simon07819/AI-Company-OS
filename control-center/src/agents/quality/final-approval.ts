import { evaluateDeliverable } from "./deliverable-evaluator";
import type { FinalApprovalInput } from "./types";

export function approveFinalDeliverable(input: FinalApprovalInput) {
  if (input.qualityReview.status !== "approved") {
    throw new Error("Final deliverable is not approved");
  }
  if (!input.primaryArtifact?.id) {
    throw new Error("Final deliverable has no primary artifact");
  }
  const finalCheck = evaluateDeliverable({
    workOrder: input.workOrder,
    visibleOutput: input.visibleOutput,
    primaryArtifact: input.primaryArtifact,
    mode: input.mode,
  });
  if (finalCheck.status !== "approved") {
    throw new Error(`Final approval failed: ${finalCheck.issues.map((issue) => issue.message).join("; ")}`);
  }
  return {
    approved: true,
    primaryArtifactId: input.primaryArtifact.id,
    qualityReview: finalCheck,
  };
}
