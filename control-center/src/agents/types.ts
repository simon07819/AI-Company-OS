export type AgentRole =
  | "ceo"
  | "product_owner"
  | "brand_strategist"
  | "creative_director"
  | "logo_designer"
  | "svg_illustrator"
  | "quality_director"
  | "artifact_manager";

export type AgentSkillRun<Input = unknown, Output = unknown> = (input: Input) => Output;

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
