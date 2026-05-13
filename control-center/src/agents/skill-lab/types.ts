import type { MissionRuntimeResult } from "@/agents/runtime/types";

export type SkillCandidateStatus =
  | "discovered"
  | "draft"
  | "experimental"
  | "benchmarking"
  | "approved"
  | "rejected"
  | "promoted"
  | "retired";

export type SkillSourceType =
  | "internal_lesson"
  | "eval_failure"
  | "manual_idea"
  | "github_pattern"
  | "local_repo_pattern"
  | "playbook_gap"
  | "quality_failure";

export interface SkillCandidate {
  id: string;
  name: string;
  description: string;
  sourceType: SkillSourceType;
  sourceReference?: string;
  targetAgentRoles: string[];
  targetSkillIds: string[];
  deliverableTypes: string[];
  expectedImprovement: string;
  riskLevel: "low" | "medium" | "high";
  licenseRisk: "unknown" | "low" | "medium" | "high";
  status: SkillCandidateStatus;
  implementationPlan: string[];
  testPlan: string[];
  promotionCriteria: string[];
  rollbackPlan: string[];
  createdAt: string;
}

export interface SkillBenchmarkCase {
  id: string;
  name: string;
  prompt: string;
  previousTurns?: { prompt: string; expectedDeliverableType: string; expectedBrandName?: string }[];
  expectedDeliverableType: string;
  expectedVisibleOutputKind: string;
  expectedBrandName?: string;
  mustPass: string[];
  mustNotExposeInSimpleMode: string[];
}

export interface SkillBenchmarkResult {
  candidateId: string;
  benchmarkId: string;
  baselineStatus: "pass" | "fail";
  candidateStatus: "pass" | "fail";
  improvements: string[];
  regressions: string[];
  safetyIssues: string[];
  approvedForPromotion: boolean;
}

export interface SkillPromotionDecision {
  candidateId: string;
  decision: "promote" | "reject" | "needs_more_tests";
  reason: string;
  requiredFollowups: string[];
}

export interface SkillExperimentRecord {
  id: string;
  candidateId: string;
  benchmarkResults: SkillBenchmarkResult[];
  promotionDecision: SkillPromotionDecision;
  status: SkillCandidateStatus;
  createdAt: string;
  hiddenReport: unknown;
}

export interface SkillLabTraceEntry {
  taskId: string;
  agentRole: string;
  skillId: string;
  activeCandidateIds: string[];
  expectedImprovements: string[];
  status: "active_promoted" | "none";
}

export type SkillLabRuntime = (
  prompt: string,
  context?: { previousDeliverable?: unknown; experimentalCandidateIds?: string[] },
) => MissionRuntimeResult;

