import type { AgentId } from "@/lib/agents/agentRegistry";

export type MissionPlaybookType =
  | "logo"
  | "website"
  | "app"
  | "copywriting"
  | "strategy"
  | "product"
  | "code"
  | "general";

export interface TeamPlaybook {
  id: string;
  type: MissionPlaybookType;
  name: string;
  agents: AgentId[];
  steps: string[];
  qualityCriteria: string[];
  expectedDeliverables: string[];
  providerRequirement: {
    capability: "text" | "image" | "website" | "code" | "none";
    required: boolean;
    providerUsed?: string;
  };
}

export const teamPlaybooks: Record<MissionPlaybookType, TeamPlaybook> = {
  logo: {
    id: "logo-branding-team-playbook",
    type: "logo",
    name: "Logo / branding full team",
    agents: ["ceo", "planner", "brand_strategist", "creative_director", "visual_prompt_engineer", "nvidia_image_agent", "critic", "reviewer", "artifact_manager"],
    steps: ["intake", "planning", "brand brief", "creative directions", "visual prompts", "NVIDIA image generation", "critic", "review", "artifact registration"],
    qualityCriteria: ["brand name is explicit", "brief is useful", "prompts are inspectable", "no fake local visual", "image artifact requires NVIDIA image provider", "critic and reviewer passed"],
    expectedDeliverables: ["brief", "directions", "visual prompts", "image artifact when NVIDIA image is available"],
    providerRequirement: { capability: "image", required: true, providerUsed: "nvidia" },
  },
  website: {
    id: "website-team-playbook",
    type: "website",
    name: "Website full team",
    agents: ["ceo", "product_owner", "ux_strategist", "ui_designer", "frontend_architect", "critic", "qa", "reviewer", "artifact_manager"],
    steps: ["intake", "product framing", "UX strategy", "UI direction", "frontend architecture", "critic", "QA", "review", "artifact registration"],
    qualityCriteria: ["page structure is present", "preview is not a logo reuse", "artifact has sourceType", "providerUsed is clear", "critic, QA and reviewer passed"],
    expectedDeliverables: ["architecture", "design direction", "website preview", "traceable artifact"],
    providerRequirement: { capability: "website", required: false, providerUsed: "artifact_pipeline" },
  },
  app: {
    id: "app-team-playbook",
    type: "app",
    name: "App full team",
    agents: ["ceo", "product_owner", "ux_strategist", "ui_designer", "frontend_architect", "critic", "qa", "reviewer", "artifact_manager"],
    steps: ["intake", "product framing", "user flows", "UI direction", "app architecture", "critic", "QA", "review", "artifact registration"],
    qualityCriteria: ["primary user flow is clear", "screens are listed", "technical scope is traceable", "review is complete"],
    expectedDeliverables: ["product brief", "app map", "screen plan", "code artifact or implementation plan"],
    providerRequirement: { capability: "code", required: false, providerUsed: "artifact_pipeline" },
  },
  copywriting: {
    id: "copywriting-team-playbook",
    type: "copywriting",
    name: "Copywriting full team",
    agents: ["ceo", "planner", "specialist", "critic", "reviewer", "artifact_manager"],
    steps: ["intake", "message strategy", "draft", "critic", "review", "artifact registration"],
    qualityCriteria: ["audience is explicit", "copy has a concrete use", "tone is coherent", "review is complete"],
    expectedDeliverables: ["copy brief", "draft copy", "revision notes"],
    providerRequirement: { capability: "text", required: false, providerUsed: "nvidia" },
  },
  strategy: {
    id: "strategy-team-playbook",
    type: "strategy",
    name: "Strategy full team",
    agents: ["ceo", "planner", "specialist", "critic", "reviewer", "artifact_manager"],
    steps: ["intake", "diagnosis", "options", "recommendation", "critic", "review", "artifact registration"],
    qualityCriteria: ["tradeoffs are explicit", "recommendation is actionable", "risks are listed", "review is complete"],
    expectedDeliverables: ["strategy memo", "decision options", "next actions"],
    providerRequirement: { capability: "text", required: false, providerUsed: "nvidia" },
  },
  product: {
    id: "product-team-playbook",
    type: "product",
    name: "Product full team",
    agents: ["ceo", "product_owner", "ux_strategist", "specialist", "critic", "qa", "reviewer", "artifact_manager"],
    steps: ["intake", "problem framing", "requirements", "roadmap", "critic", "QA", "review", "artifact registration"],
    qualityCriteria: ["problem is clear", "requirements are testable", "scope is realistic", "review is complete"],
    expectedDeliverables: ["PRD", "roadmap", "acceptance criteria"],
    providerRequirement: { capability: "text", required: false, providerUsed: "nvidia" },
  },
  code: {
    id: "code-team-playbook",
    type: "code",
    name: "Code full team",
    agents: ["ceo", "planner", "frontend_architect", "specialist", "critic", "qa", "reviewer", "artifact_manager"],
    steps: ["intake", "technical plan", "implementation outline", "critic", "QA", "review", "artifact registration"],
    qualityCriteria: ["scope is bounded", "files or artifacts are traceable", "tests are identified", "review is complete"],
    expectedDeliverables: ["technical plan", "code artifact or patch plan", "test notes"],
    providerRequirement: { capability: "code", required: false, providerUsed: "artifact_pipeline" },
  },
  general: {
    id: "general-team-playbook",
    type: "general",
    name: "General full team",
    agents: ["ceo", "planner", "specialist", "critic", "reviewer", "artifact_manager"],
    steps: ["intake", "plan", "execution notes", "critic", "review", "artifact registration"],
    qualityCriteria: ["deliverable is useful", "sourceType is clear", "providerUsed is clear", "review is complete"],
    expectedDeliverables: ["answer", "action plan", "traceable notes"],
    providerRequirement: { capability: "text", required: false, providerUsed: "nvidia" },
  },
};

function normalize(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function detectPlaybookType(command: string, fallback: MissionPlaybookType = "general"): MissionPlaybookType {
  const lower = normalize(command);
  if (/site web|site internet|website|landing|page web|homepage|page d'accueil/.test(lower)) return "website";
  if (/\blogo\b|branding|identite|identite visuelle|marque/.test(lower)) return "logo";
  if (/\bapp\b|application|mobile|ios|android/.test(lower)) return "app";
  if (/copywriting|copy|texte|article|email|newsletter|post|caption|slogan/.test(lower)) return "copywriting";
  if (/strategie|strategy|go[- ]?to[- ]?market|positionnement|business plan/.test(lower)) return "strategy";
  if (/product|produit|prd|roadmap|feature|fonctionnalite/.test(lower)) return "product";
  if (/\bcode\b|api|bug|refactor|implementation|typescript|react|next\.?js/.test(lower)) return "code";
  return fallback;
}

export function selectTeamPlaybook(command: string, fallback: MissionPlaybookType = "general") {
  return teamPlaybooks[detectPlaybookType(command, fallback)];
}
