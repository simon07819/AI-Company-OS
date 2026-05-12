export type AgentRole =
  | "ceo"
  | "product_owner"
  | "brand_strategist"
  | "creative_director"
  | "logo_designer"
  | "ux_designer"
  | "web_designer"
  | "frontend_builder"
  | "svg_illustrator"
  | "research_agent"
  | "browser_agent"
  | "quality_director"
  | "artifact_manager";

export interface AgentRunContext {
  turnId: string;
  missionId: string;
  userPrompt: string;
  conversationContext?: unknown;
  previousDeliverable?: unknown;
  mode: "simple" | "details";
}

export type AgentSkillRun<Input = unknown, Output = unknown> = (input: Input, context: AgentRunContext) => Promise<Output> | Output;

export interface AgentSkill<Input = unknown, Output = unknown> {
  id: string;
  name: string;
  description: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
  run: AgentSkillRun<Input, Output>;
}

export interface AgentMission {
  id: string;
  role: AgentRole;
  name: string;
  mission: string;
  responsibilities: string[];
  skills: string[];
  toolsAllowed: string[];
  mustProduce: string[];
  mustNeverDo: string[];
  qualityChecklist: string[];
}

export interface AgentRunResult<Output = unknown> {
  agentId: string;
  role: AgentRole;
  skillId: string;
  status: "ok" | "failed";
  output: Output;
  notes?: string[];
}
