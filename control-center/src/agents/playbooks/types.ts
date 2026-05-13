export type PlaybookStep = {
  id: string;
  name: string;
  instruction: string;
  expectedOutput: string;
  qualityCheck: string[];
};

export type DecisionRule = {
  id: string;
  when: string;
  then: string;
  priority: number;
};

export type FailureMode = {
  id: string;
  description: string;
  detectionHints: string[];
  severity: "warning" | "fail";
  correctionStrategy: string;
};

export type PlaybookExample = {
  id: string;
  input: string;
  goodOutputDescription: string;
  badOutputDescription: string;
  reason: string;
};

export type KnowledgePack = {
  id: string;
  domain: string;
  principles: string[];
  patterns: string[];
  antiPatterns: string[];
  checklists: string[];
  examples: string[];
};

export type AgentPlaybook = {
  id: string;
  agentRole: string;
  name: string;
  mission: string;
  operatingPrinciples: string[];
  taskMethod: PlaybookStep[];
  decisionRules: DecisionRule[];
  qualityStandards: string[];
  failureModes: FailureMode[];
  requiredOutputs: string[];
  forbiddenOutputs: string[];
  examples: PlaybookExample[];
  skillBindings: string[];
  toolBindings: string[];
};

export type SelectedAgentKnowledge = {
  agentRole: string;
  playbookId: string;
  relevantPrinciples: string[];
  relevantSteps: PlaybookStep[];
  relevantDecisionRules: DecisionRule[];
  relevantFailureModes: FailureMode[];
  relevantKnowledgePacks: string[];
};

export type PlaybookTraceEntry = {
  agentRole: string;
  taskId: string;
  playbookId: string;
  knowledgePackIds: string[];
  appliedFailureModeIds: string[];
  qualityStandards: string[];
};
