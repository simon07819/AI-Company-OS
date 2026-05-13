export type AgentThinkingMode = "plan" | "produce" | "critique" | "refine" | "validate" | "finalize";

export type AgentMethod = {
  id: string;
  agentRole: string;
  name: string;
  purpose: string;
  steps: string[];
  qualityChecklist: string[];
  commonFailureModes: string[];
  requiredOutputs: string[];
};

export type AgentBrainInput = {
  agentRole: string;
  task: unknown;
  workOrder: unknown;
  availableSkills: string[];
  availableTools: string[];
  context: unknown;
  mode: AgentThinkingMode;
};

export type AgentBrainOutput = {
  agentRole: string;
  taskId?: string;
  methodId?: string;
  plan?: string[];
  decisions: string[];
  requiredSkillCalls: string[];
  requiredToolCalls: string[];
  expectedOutputShape: string;
  qualityChecklist: string[];
  refusalReasons?: string[];
};

export type CritiqueResult = {
  status: "approved" | "needs_refinement" | "rejected";
  issues: string[];
  requiredChanges: string[];
  recommendedAgent?: string;
  recommendedSkill?: string;
};

export type RefinementStrategy = {
  targetAgents: string[];
  skillIds: string[];
  toolIds: string[];
  requiredChanges: string[];
  maxAttempts: number;
  reason: string;
};

export type AgentLesson = {
  id: string;
  sourceEvalId: string;
  agentRole: string;
  failurePattern: string;
  correctionRule: string;
  appliesToDeliverableType: string;
};
