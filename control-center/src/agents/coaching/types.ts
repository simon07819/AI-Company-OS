import type { AgentPlaybook, FailureMode } from "@/agents/playbooks/types";

export type AgentLessonSource =
  | "eval_failure"
  | "quality_review"
  | "candidate_rejection"
  | "refinement_attempt"
  | "manual_feedback"
  | "approved_success";

export type AgentLesson = {
  id: string;
  source: AgentLessonSource;
  sourceId: string;
  agentRole: string;
  deliverableType: string;
  failurePattern: string;
  correctionRule: string;
  detectionHints: string[];
  appliesWhen: string[];
  priority: number;
  severity: "low" | "medium" | "high" | "critical";
  createdAt: string;
};

export type AgentCoachingProfile = {
  agentRole: string;
  activeLessons: AgentLesson[];
  recurrentFailures: string[];
  strongestSkills: string[];
  weakSkills: string[];
  updatedChecklist: string[];
  updatedFailureModes: string[];
};

export type SkillOptimizationResult = {
  agentRole: string;
  skillId: string;
  status: "unchanged" | "improved" | "disabled" | "needs_review";
  changes: string[];
  reason: string;
};

export type CoachingRunResult = {
  lessonsCreated: AgentLesson[];
  coachingProfiles: AgentCoachingProfile[];
  skillOptimizations: SkillOptimizationResult[];
  hiddenReport: unknown;
};

export type CoachingTraceEntry = {
  agentRole: string;
  taskId?: string;
  lessonIds: string[];
  checklist: string[];
  activeFailureModes: string[];
  skillOptimizations: SkillOptimizationResult[];
};

export type RuntimePlaybookView = AgentPlaybook & {
  runtimeLessons: AgentLesson[];
  runtimeFailureModes: FailureMode[];
};
