import type { WorkOrder } from "@/agents/runtime/types";
import { knowledgePackRegistry } from "./knowledge";
import { loadAgentPlaybook } from "./playbook-loader";
import type { KnowledgePack, SelectedAgentKnowledge } from "./types";

function relevantKnowledgePackIds(agentRole: string, workOrder: WorkOrder) {
  const ids = new Set<string>();
  if (agentRole === "product_owner") ids.add("brand-strategy-knowledge");
  if (["brand_strategist", "logo_designer", "creative_director"].includes(agentRole)) {
    ids.add("brand-strategy-knowledge");
    ids.add("logo-design-knowledge");
  }
  if (agentRole === "svg_illustrator") ids.add("svg-production-knowledge");
  if (["ux_designer", "web_designer", "frontend_builder"].includes(agentRole) || workOrder.requestType === "website") {
    ids.add("ux-design-knowledge");
    ids.add("website-design-knowledge");
    ids.add("frontend-preview-knowledge");
  }
  if (agentRole === "quality_director") ids.add("quality-review-knowledge");
  if (agentRole === "artifact_manager") ids.add("artifact-production-knowledge");
  if (workOrder.deliverableType === "logo") ids.add("logo-design-knowledge");
  if (workOrder.requestType === "website") ids.add("website-design-knowledge");
  return Array.from(ids);
}

export function selectPlaybookForTask(input: {
  agentRole: string;
  workOrder: WorkOrder;
  task?: unknown;
  availablePlaybooks?: typeof import("./registry").playbookRegistry;
  availableKnowledgePacks?: Record<string, KnowledgePack>;
}): SelectedAgentKnowledge {
  const playbook = input.availablePlaybooks?.[input.agentRole as keyof typeof input.availablePlaybooks] ?? loadAgentPlaybook(input.agentRole);
  if (!playbook) {
    return {
      agentRole: input.agentRole,
      playbookId: "none",
      relevantPrinciples: [],
      relevantSteps: [],
      relevantDecisionRules: [],
      relevantFailureModes: [],
      relevantKnowledgePacks: [],
    };
  }
  const packs = input.availableKnowledgePacks ?? knowledgePackRegistry;
  const packIds = relevantKnowledgePackIds(input.agentRole, input.workOrder).filter((id) => packs[id]);
  const packPrinciples = packIds.flatMap((id) => packs[id].principles);
  const packFailureHints = packIds.flatMap((id) => packs[id].antiPatterns);
  const relevantFailureModes = playbook.failureModes.filter((mode) => {
    const haystack = `${mode.description} ${mode.detectionHints.join(" ")} ${packFailureHints.join(" ")}`.toLowerCase();
    if (input.workOrder.deliverableType === "logo") return /logo|brand|text|initial|svg|placeholder|marque|system/.test(haystack);
    if (input.workOrder.requestType === "website") return /website|page|logo-only|nav|hero|cta|section|recycl/.test(haystack);
    return true;
  });
  return {
    agentRole: input.agentRole,
    playbookId: playbook.id,
    relevantPrinciples: Array.from(new Set([...playbook.operatingPrinciples, ...packPrinciples])).slice(0, 12),
    relevantSteps: playbook.taskMethod,
    relevantDecisionRules: [...playbook.decisionRules].sort((a, b) => b.priority - a.priority),
    relevantFailureModes,
    relevantKnowledgePacks: packIds,
  };
}
