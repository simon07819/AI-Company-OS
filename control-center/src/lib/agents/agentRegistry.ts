export type AgentId =
  | "planner"
  | "brand_strategist"
  | "creative_director"
  | "visual_prompt_engineer"
  | "ui_designer"
  | "frontend_architect"
  | "specialist"
  | "critic"
  | "reviewer";

export interface AgentInput {
  missionId: string;
  missionType: "logo" | "website" | "general";
  command: string;
  sourceType: string;
  providerUsed: string;
  imageProviderAvailable: boolean;
  localPrototypeRequested?: boolean;
  deliverables: Array<{
    type?: string;
    title: string;
    content?: string;
    sourceType?: string;
    providerUsed?: string;
    artifactId?: string;
  }>;
  attempt: number;
  priorIssues?: string[];
}

export interface AgentOutput {
  summary: string;
  artifacts: Array<{ type: string; title: string; content: string }>;
  decisions: string[];
  issues: string[];
}

export interface AgentRun {
  id: string;
  agentId: AgentId;
  name: string;
  role: string;
  capabilities: string[];
  input: {
    missionId: string;
    missionType: string;
    sourceType: string;
    providerUsed: string;
    deliverableCount: number;
    attempt: number;
  };
  output: AgentOutput;
  providerUsed: string;
  durationMs: number;
  confidence: number;
  createdAt: string;
}

export interface CriticResult {
  passed: boolean;
  issues: string[];
  retryable: boolean;
  decisions: string[];
}

export interface ReviewerResult {
  passed: boolean;
  decision: "approved" | "needs_action" | "failed";
  issues: string[];
  summary: string;
}

export interface AgentDefinition {
  id: AgentId;
  name: string;
  role: string;
  capabilities: string[];
  run: (input: AgentInput) => AgentOutput;
}

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalize(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function combinedText(input: AgentInput) {
  return [
    input.command,
    input.sourceType,
    input.providerUsed,
    ...input.deliverables.flatMap((deliverable) => [
      deliverable.title,
      deliverable.type ?? "",
      deliverable.content ?? "",
      deliverable.sourceType ?? "",
      deliverable.providerUsed ?? "",
    ]),
  ].join("\n");
}

function hasUsefulDeliverable(input: AgentInput) {
  return input.deliverables.some((deliverable) => {
    const text = `${deliverable.title}\n${deliverable.content ?? ""}`.trim();
    return text.length >= 40 || Boolean(deliverable.artifactId);
  });
}

export function critiqueMissionOutput(input: AgentInput): CriticResult {
  const text = combinedText(input);
  const lower = normalize(text);
  const issues: string[] = [];
  const decisions: string[] = [];

  if (/marque a nommer|marque à nommer/i.test(text)) issues.push("blocked_placeholder_marque_a_nommer");
  if (/brand system/i.test(text)) issues.push("blocked_legacy_brand_system");
  if (/lorem ipsum|placeholder|template generic|template générique|coming soon/i.test(lower)) issues.push("blocked_placeholder_or_generic");
  const claimsFinalLogo = /voici le logo|logo final (pret|prêt|cree|créé|genere|généré|livre|livré)|final logo/i.test(lower);
  if (claimsFinalLogo && !input.imageProviderAvailable) issues.push("blocked_final_logo_without_image_provider");
  if (/local_svg|local svg/i.test(lower) && !input.localPrototypeRequested) issues.push("blocked_automatic_local_svg");
  if (!input.providerUsed || input.providerUsed === "unknown") issues.push("missing_provider_used");
  if (!input.sourceType || input.sourceType === "unknown") issues.push("missing_source_type");
  if (!hasUsefulDeliverable(input)) issues.push("missing_useful_deliverable");
  if (input.missionType === "logo" && !input.imageProviderAvailable && input.sourceType === "real_image_provider") {
    issues.push("blocked_fake_image_provider");
  }
  if (input.missionType === "logo" && !input.imageProviderAvailable && /<svg[\s>]/i.test(text) && !input.localPrototypeRequested) {
    issues.push("blocked_svg_logo_without_explicit_action");
  }

  if (issues.length === 0) decisions.push("Critic passed.");
  if (issues.length > 0) decisions.push(`Critic blocked ${issues.length} issue(s).`);

  const retryable = issues.some((issue) => issue === "blocked_placeholder_or_generic" || issue === "missing_useful_deliverable");
  return { passed: issues.length === 0, issues, retryable, decisions };
}

export function reviewMissionOutput(input: AgentInput, critic: CriticResult): ReviewerResult {
  const issues = [...critic.issues];
  if (!critic.passed) {
    return {
      passed: false,
      decision: critic.retryable && input.attempt < 2 ? "needs_action" : "failed",
      issues,
      summary: "Review refused because critic did not pass.",
    };
  }
  if (!input.sourceType || input.sourceType === "unknown") issues.push("review_missing_source_type");
  if (!input.providerUsed || input.providerUsed === "unknown") issues.push("review_missing_provider_used");
  if (!hasUsefulDeliverable(input)) issues.push("review_missing_useful_deliverable");
  if (input.missionType === "logo" && !input.imageProviderAvailable && /voici le logo|logo final (pret|prêt|cree|créé|genere|généré|livre|livré)|final logo/i.test(normalize(combinedText(input)))) {
    issues.push("review_logo_final_without_provider");
  }
  return {
    passed: issues.length === 0,
    decision: issues.length === 0 ? "approved" : "needs_action",
    issues,
    summary: issues.length === 0 ? "Review approved." : "Review requires action.",
  };
}

function genericAgentOutput(agent: AgentDefinition, input: AgentInput): AgentOutput {
  const retryNote = input.attempt > 0 ? `Retry ${input.attempt}: direction resserrée pour éviter les sorties génériques.` : "Direction initiale.";
  return {
    summary: `${agent.name}: ${retryNote}`,
    artifacts: [{
      type: `${agent.id}_note`,
      title: `${agent.name} output`,
      content: `${retryNote} Mission ${input.missionType}: ${input.command}`,
    }],
    decisions: [`${agent.id} completed structured local analysis.`],
    issues: [],
  };
}

export const agentRegistry: Record<AgentId, AgentDefinition> = {
  planner: {
    id: "planner",
    name: "Mission Planner",
    role: "Planifie la mission et les critères de sortie.",
    capabilities: ["planning", "scope", "acceptance_criteria"],
    run: (input) => genericAgentOutput(agentRegistry.planner, input),
  },
  brand_strategist: {
    id: "brand_strategist",
    name: "Brand Strategist",
    role: "Structure le brief de marque.",
    capabilities: ["brief", "positioning", "constraints"],
    run: (input) => genericAgentOutput(agentRegistry.brand_strategist, input),
  },
  creative_director: {
    id: "creative_director",
    name: "Creative Director",
    role: "Définit les directions créatives.",
    capabilities: ["creative_direction", "visual_system"],
    run: (input) => genericAgentOutput(agentRegistry.creative_director, input),
  },
  visual_prompt_engineer: {
    id: "visual_prompt_engineer",
    name: "Visual Prompt Engineer",
    role: "Produit les prompts visuels sans générer d'image.",
    capabilities: ["visual_prompts", "provider_handoff"],
    run: (input) => genericAgentOutput(agentRegistry.visual_prompt_engineer, input),
  },
  ui_designer: {
    id: "ui_designer",
    name: "UI Designer",
    role: "Définit la direction UI.",
    capabilities: ["ui_direction", "layout"],
    run: (input) => genericAgentOutput(agentRegistry.ui_designer, input),
  },
  frontend_architect: {
    id: "frontend_architect",
    name: "Frontend Architect",
    role: "Structure les artifacts code et preview.",
    capabilities: ["frontend_architecture", "code_artifacts"],
    run: (input) => genericAgentOutput(agentRegistry.frontend_architect, input),
  },
  specialist: {
    id: "specialist",
    name: "Specialist",
    role: "Traite les demandes générales.",
    capabilities: ["general_analysis", "execution_notes"],
    run: (input) => genericAgentOutput(agentRegistry.specialist, input),
  },
  critic: {
    id: "critic",
    name: "Critic",
    role: "Bloque les sorties faibles, fake ou non traçables.",
    capabilities: ["quality_critique", "fake_detection", "retry_decision"],
    run: (input) => {
      const result = critiqueMissionOutput(input);
      return {
        summary: result.passed ? "Critic passed." : "Critic blocked output.",
        artifacts: [],
        decisions: result.decisions,
        issues: result.issues,
      };
    },
  },
  reviewer: {
    id: "reviewer",
    name: "Reviewer",
    role: "Valide la décision finale après critic.",
    capabilities: ["final_review", "traceability", "simple_mode_check"],
    run: (input) => {
      const critic = critiqueMissionOutput(input);
      const result = reviewMissionOutput(input, critic);
      return {
        summary: result.summary,
        artifacts: [],
        decisions: [`final_decision:${result.decision}`],
        issues: result.issues,
      };
    },
  },
};

export function agentsForMission(type: AgentInput["missionType"]): AgentId[] {
  if (type === "logo") return ["planner", "brand_strategist", "creative_director", "visual_prompt_engineer", "critic", "reviewer"];
  if (type === "website") return ["planner", "ui_designer", "frontend_architect", "critic", "reviewer"];
  return ["planner", "specialist", "critic", "reviewer"];
}

export function runAgent(agentId: AgentId, input: AgentInput): AgentRun {
  const agent = agentRegistry[agentId];
  const started = Date.now();
  const output = agent.run(input);
  const confidence = output.issues.length > 0 ? 0.52 : input.providerUsed === "none" ? 0.74 : 0.86;
  return {
    id: id("agent-run"),
    agentId,
    name: agent.name,
    role: agent.role,
    capabilities: agent.capabilities,
    input: {
      missionId: input.missionId,
      missionType: input.missionType,
      sourceType: input.sourceType,
      providerUsed: input.providerUsed,
      deliverableCount: input.deliverables.length,
      attempt: input.attempt,
    },
    output,
    providerUsed: "local_rules",
    durationMs: Date.now() - started,
    confidence,
    createdAt: now(),
  };
}

export function runMissionAgentFlow(input: Omit<AgentInput, "attempt" | "priorIssues"> & { maxRetries?: number }) {
  const maxRetries = input.maxRetries ?? 2;
  const runs: AgentRun[] = [];
  const retryEvents: Array<{ attempt: number; issues: string[]; changedDirection: string }> = [];
  let critic: CriticResult = { passed: false, issues: [], retryable: false, decisions: [] };
  let reviewer: ReviewerResult = { passed: false, decision: "failed", issues: [], summary: "Not reviewed." };
  let finalAttempt = 0;
  let priorIssues: string[] = [];

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    finalAttempt = attempt;
    const attemptInput: AgentInput = { ...input, attempt, priorIssues };
    const sequence = agentsForMission(input.missionType);
    for (const agentId of sequence) {
      const run = runAgent(agentId, attemptInput);
      runs.push(run);
      if (agentId === "critic") {
        critic = critiqueMissionOutput(attemptInput);
      }
      if (agentId === "reviewer") {
        reviewer = reviewMissionOutput(attemptInput, critic);
      }
    }
    if (reviewer.passed || !critic.retryable || attempt >= maxRetries) break;
    priorIssues = critic.issues;
    retryEvents.push({
      attempt: attempt + 1,
      issues: critic.issues,
      changedDirection: "Resserer le brief, supprimer placeholders et ajouter un livrable utile traçable.",
    });
  }

  return {
    runs,
    critic,
    reviewer,
    retries: retryEvents.length,
    retryEvents,
    finalAttempt,
    finalDecision: reviewer.decision,
  };
}
