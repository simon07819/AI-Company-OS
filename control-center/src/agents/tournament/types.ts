export type CandidateKind =
  | "logo_concept"
  | "logo_svg"
  | "website_wireframe"
  | "website_preview"
  | "copy_direction"
  | "brand_direction";

export type CandidateStatus =
  | "draft"
  | "reviewed"
  | "rejected"
  | "selected_for_refinement"
  | "refined"
  | "approved"
  | "failed";

export interface AgentCandidate {
  id: string;
  missionId: string;
  turnId: string;
  kind: CandidateKind;
  deliverableType: string;
  brandName?: string;
  createdByAgentRole: string;
  title: string;
  rationale: string;
  content: string;
  artifactId?: string;
  status: CandidateStatus;
  metadata: Record<string, unknown>;
}

export interface CandidateReview {
  candidateId: string;
  reviewerRole: "product_owner" | "creative_director" | "quality_director" | "ux_director" | "web_director";
  score: number;
  strengths: string[];
  weaknesses: string[];
  issues: string[];
  requiredChanges: string[];
  decision: "reject" | "refine" | "approve";
}

export interface AgentLearningNote {
  id: string;
  missionId: string;
  source: "quality_review" | "eval_failure" | "candidate_rejection" | "manual_feedback";
  agentRole: string;
  failurePattern: string;
  correctionRule: string;
  appliesToDeliverableType: string;
  severity: "low" | "medium" | "high";
}

export interface TournamentResult {
  missionId: string;
  candidates: AgentCandidate[];
  reviews: CandidateReview[];
  selectedCandidateId?: string;
  refinedCandidateIds: string[];
  approvedCandidateId?: string;
  status: "approved" | "failed";
  learningNotes: AgentLearningNote[];
}

export interface CandidateScore {
  candidateId: string;
  total: number;
  dimensions: {
    requestFit: number;
    brandFit: number;
    originality: number;
    visualStructure: number;
    technicalValidity: number;
    noPlaceholder: number;
    noRecycledOutput: number;
    simpleModeSafety: number;
  };
  criticalIssues: string[];
}
