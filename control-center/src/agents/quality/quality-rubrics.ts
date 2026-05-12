import type { WorkOrder } from "@/agents/runtime/types";
import type { QualityIssue } from "./types";

export function issue(input: Omit<QualityIssue, "severity"> & { severity?: QualityIssue["severity"] }): QualityIssue {
  return { severity: input.severity ?? "fail", ...input };
}

export function createLogoQualityRubric(workOrder: WorkOrder) {
  return {
    requiredBrandName: workOrder.brandName,
    requiresBlackBackground: workOrder.constraints.some((constraint) => /fond noir|background:black/i.test(constraint))
      || /fond noir|black background/i.test(workOrder.originalPrompt),
    forbiddenVisibleTerms: ["Brand system", "Marque à nommer"],
    minimumScore: 85,
  };
}

export function createWebsiteQualityRubric(workOrder: WorkOrder) {
  return {
    requiredBrandName: workOrder.brandName,
    requiresTemporaryContent: workOrder.contentMode === "temporary",
    industry: workOrder.industry,
    requiredMarkers: ["aria-label=\"nav\"", "aria-label=\"hero\"", "aria-label=\"sections\""],
    minimumScore: 85,
  };
}

export function createSimpleChatRubric() {
  return {
    forbiddenPattern: /score|quality report|qualityReport|artifacts|artifactPaths|files|fichiers|JSON|README|workspace|logs|runtime|sessionId|projectId|process|toolTrace|checkpoints|Brand system|Marque à nommer/i,
  };
}
