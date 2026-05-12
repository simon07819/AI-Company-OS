import type { MissionArtifact, VisibleDeliverableArtifact } from "@/agents/artifacts/types";
import type { PreviousDeliverable } from "@/lib/ceoWorkOrder";
import type { WorkOrder } from "@/agents/runtime/types";

export type QualitySeverity = "pass" | "warning" | "fail";

export type QualityIssue = {
  id: string;
  severity: QualitySeverity;
  category:
    | "request_mismatch"
    | "wrong_deliverable_type"
    | "placeholder"
    | "text_only"
    | "generic_symbol"
    | "brand_extraction"
    | "recycled_output"
    | "visual_structure"
    | "hidden_details_leak"
    | "security";
  message: string;
  suggestedFix: string;
};

export type QualityReviewResult = {
  status: "approved" | "needs_refinement" | "rejected";
  score: number;
  issues: QualityIssue[];
  requiredChanges: string[];
  reviewerRole: "quality_director" | "creative_director" | "web_director";
};

export type RefinementAttempt = {
  attempt: number;
  inputArtifactId?: string;
  outputArtifactId?: string;
  issuesBefore: QualityIssue[];
  changesApplied: string[];
  status: "improved" | "failed";
};

export type RefinementLoopResult = {
  finalStatus: "approved" | "failed";
  finalVisibleOutput?: unknown;
  finalArtifactId?: string;
  finalArtifact?: MissionArtifact;
  reviews: QualityReviewResult[];
  attempts: RefinementAttempt[];
};

export type DeliverableEvaluationInput = {
  workOrder: WorkOrder;
  visibleOutput: {
    kind?: string;
    deliverableType?: string;
    brandName?: string;
    mediaType?: string;
    primaryArtifactId?: string;
    primaryVisual?: string;
  };
  primaryArtifact?: MissionArtifact | null;
  previousDeliverable?: PreviousDeliverable | null;
  mode: "simple" | "details";
};

export type RefinementLoopInput = {
  workOrder: WorkOrder;
  visibleOutput: DeliverableEvaluationInput["visibleOutput"];
  primaryArtifact?: MissionArtifact | null;
  previousDeliverable?: PreviousDeliverable | null;
  maxAttempts?: number;
};

export type FinalApprovalInput = {
  workOrder: WorkOrder;
  visibleOutput: DeliverableEvaluationInput["visibleOutput"];
  primaryArtifact?: MissionArtifact | null;
  qualityReview: QualityReviewResult;
  mode: "simple" | "details";
};

export type ApprovedDeliverable = {
  visibleOutput: DeliverableEvaluationInput["visibleOutput"];
  primaryArtifact: MissionArtifact;
  visibleDeliverable?: VisibleDeliverableArtifact;
};
