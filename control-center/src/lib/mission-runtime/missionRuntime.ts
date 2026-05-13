import { createWorkOrderFromPrompt } from "@/agents/runtime/work-order";
import {
  runMissionAgentFlow,
  type AgentRun,
  type CriticResult,
  type ReviewerResult,
} from "@/lib/agents/agentRegistry";
import {
  createTraceableArtifact,
  getProviderRegistry,
  imageProviderUnavailable,
  localPrototypeProviderResult,
  runTextProvider,
  type ProviderResult,
} from "@/lib/providers/providerRegistry";

export type MissionType = "logo" | "website" | "general";

export type MissionStatus =
  | "queued"
  | "planning"
  | "running"
  | "reviewing"
  | "needs_action"
  | "completed"
  | "failed";

export type MissionAction =
  | "prepare_brief"
  | "create_visual_prompts"
  | "request_local_prototype"
  | "modify_current_deliverable";

export type MissionSourceType =
  | "none"
  | "real_image_provider"
  | "nvidia_text"
  | "provider_unavailable"
  | "local_svg"
  | "local_storage"
  | "local_preview"
  | "code_artifact"
  | "artifact";

export interface MissionStep {
  id: string;
  label: string;
  status: "queued" | "running" | "completed" | "blocked" | "failed";
  detail?: string;
  updatedAt: string;
}

export interface MissionAgent {
  id: string;
  role: string;
  status: "queued" | "running" | "completed" | "blocked" | "failed";
}

export interface MissionEvent {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface MissionDeliverable {
  id: string;
  type: "brief" | "directions" | "visual_prompts" | "local_prototype" | "website_preview" | "artifact" | "message";
  title: string;
  content?: string;
  mediaType?: "text" | "svg" | "html";
  sourceType: MissionSourceType;
  providerUsed: string;
  artifactId?: string;
  createdAt: string;
}

export interface MissionRuntime {
  missionId: string;
  command: string;
  type: MissionType;
  status: MissionStatus;
  steps: MissionStep[];
  agents: MissionAgent[];
  events: MissionEvent[];
  deliverables: MissionDeliverable[];
  providerUsed: string;
  sourceType: MissionSourceType;
  providerResults: ProviderResult[];
  agentRuns: AgentRun[];
  criticResult?: CriticResult;
  reviewerResult?: ReviewerResult;
  retryEvents: Array<{ attempt: number; issues: string[]; changedDirection: string }>;
  finalDecision?: string;
  retries: number;
  logs: string[];
  createdAt: string;
  updatedAt: string;
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

export function detectMissionType(command: string): MissionType {
  const lower = normalize(command);
  if (/site web|site internet|website|landing|page web|homepage|page d'accueil/.test(lower)) return "website";
  if (/\blogo\b|branding|identite|marque/.test(lower)) return "logo";
  return "general";
}

function baseSteps(type: MissionType): Array<Pick<MissionStep, "id" | "label">> {
  if (type === "logo") {
    return [
      { id: "analyse_demande", label: "analyse demande" },
      { id: "brief", label: "brief" },
      { id: "directions_creatives", label: "directions créatives" },
      { id: "prompts_visuels", label: "prompts visuels" },
      { id: "validation_provider", label: "validation provider" },
      { id: "livrable_ou_action", label: "livrable ou action requise" },
    ];
  }
  if (type === "website") {
    return [
      { id: "analyse_demande", label: "analyse demande" },
      { id: "architecture", label: "architecture" },
      { id: "design_direction", label: "design direction" },
      { id: "preview", label: "preview" },
      { id: "review", label: "review" },
    ];
  }
  return [
    { id: "analyse_demande", label: "analyse demande" },
    { id: "plan", label: "plan" },
    { id: "execution", label: "execution" },
    { id: "review", label: "review" },
  ];
}

function agentsFor(type: MissionType): MissionAgent[] {
  if (type === "logo") {
    return [
      { id: "product_owner", role: "analyse demande", status: "queued" },
      { id: "brand_strategist", role: "brief et directions", status: "queued" },
      { id: "creative_director", role: "prompts visuels", status: "queued" },
      { id: "quality_director", role: "validation provider", status: "queued" },
    ];
  }
  if (type === "website") {
    return [
      { id: "product_owner", role: "analyse demande", status: "queued" },
      { id: "website_architect", role: "architecture", status: "queued" },
      { id: "ux_director", role: "design direction", status: "queued" },
      { id: "quality_director", role: "review", status: "queued" },
    ];
  }
  return [
    { id: "product_owner", role: "analyse demande", status: "queued" },
    { id: "operator", role: "execution", status: "queued" },
    { id: "quality_director", role: "review", status: "queued" },
  ];
}

export function createMissionRuntime(command: string, missionId?: string): MissionRuntime {
  const createdAt = now();
  const type = detectMissionType(command);
  return {
    missionId: missionId ?? id("mission"),
    command,
    type,
    status: "queued",
    steps: baseSteps(type).map((step) => ({ ...step, status: "queued", updatedAt: createdAt })),
    agents: agentsFor(type),
    events: [{
      id: id("event"),
      type: "mission_queued",
      message: "Mission queued.",
      createdAt,
    }],
    deliverables: [],
    providerUsed: "none",
    sourceType: "none",
    providerResults: [],
    agentRuns: [],
    retryEvents: [],
    retries: 0,
    logs: ["queued"],
    createdAt,
    updatedAt: createdAt,
  };
}

export function runMissionAgents(mission: MissionRuntime, options: { imageProviderAvailable: boolean; localPrototypeRequested?: boolean; reset?: boolean }) {
  if (options.reset) {
    mission.agentRuns = [];
    mission.retryEvents = [];
    mission.criticResult = undefined;
    mission.reviewerResult = undefined;
    mission.finalDecision = undefined;
    mission.retries = 0;
  }
  const flow = runMissionAgentFlow({
    missionId: mission.missionId,
    missionType: mission.type,
    command: mission.command,
    sourceType: mission.sourceType,
    providerUsed: mission.providerUsed,
    imageProviderAvailable: options.imageProviderAvailable,
    localPrototypeRequested: options.localPrototypeRequested,
    deliverables: mission.deliverables,
  });
  mission.agentRuns.push(...flow.runs);
  mission.criticResult = flow.critic;
  mission.reviewerResult = flow.reviewer;
  mission.retryEvents.push(...flow.retryEvents);
  mission.retries += flow.retries;
  mission.finalDecision = flow.finalDecision;
  for (const retry of flow.retryEvents) {
    addMissionEvent(mission, "retry", `Retry ${retry.attempt}: ${retry.changedDirection}`, {
      attempt: retry.attempt,
      issues: retry.issues,
    });
  }
  addMissionEvent(mission, "critic_result", flow.critic.passed ? "Critic passed." : "Critic blocked output.", {
    passed: flow.critic.passed,
    issues: flow.critic.issues,
    retryable: flow.critic.retryable,
  });
  addMissionEvent(mission, "reviewer_result", flow.reviewer.summary, {
    passed: flow.reviewer.passed,
    decision: flow.reviewer.decision,
    issues: flow.reviewer.issues,
  });
  return mission;
}

export function addMissionEvent(
  mission: MissionRuntime,
  type: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  const updatedAt = now();
  mission.events.push({ id: id("event"), type, message, createdAt: updatedAt, metadata });
  mission.logs.push(`${type}: ${message}`);
  mission.updatedAt = updatedAt;
  return mission;
}

export function setMissionStatus(mission: MissionRuntime, status: MissionStatus) {
  mission.status = status;
  mission.updatedAt = now();
  mission.logs.push(`status:${status}`);
  return mission;
}

export function completeMissionStep(mission: MissionRuntime, stepId: string, detail?: string) {
  const step = mission.steps.find((item) => item.id === stepId);
  if (step) {
    step.status = "completed";
    step.detail = detail ?? step.detail;
    step.updatedAt = now();
    mission.updatedAt = step.updatedAt;
  }
  return mission;
}

export function blockMissionStep(mission: MissionRuntime, stepId: string, detail?: string) {
  const step = mission.steps.find((item) => item.id === stepId);
  if (step) {
    step.status = "blocked";
    step.detail = detail ?? step.detail;
    step.updatedAt = now();
    mission.updatedAt = step.updatedAt;
  }
  return mission;
}

export function addDeliverable(mission: MissionRuntime, deliverable: Omit<MissionDeliverable, "id" | "createdAt">) {
  mission.deliverables.push({ id: id("deliverable"), createdAt: now(), ...deliverable });
  mission.updatedAt = now();
  return mission;
}

export function addProviderResult(mission: MissionRuntime, result: ProviderResult) {
  mission.providerResults.push(result);
  mission.providerUsed = result.providerUsed;
  mission.sourceType = result.sourceType === "real_image_provider"
    || result.sourceType === "provider_unavailable"
    || result.sourceType === "local_svg"
    || result.sourceType === "local_storage"
    || result.sourceType === "local_preview"
    || result.sourceType === "code_artifact"
    || result.sourceType === "nvidia_text"
    ? result.sourceType
    : mission.sourceType;
  addMissionEvent(mission, "provider_result", `${result.capability} provider: ${result.providerUsed}`, {
    providerUsed: result.providerUsed,
    sourceType: result.sourceType,
    capability: result.capability,
    success: result.success,
    artifactId: result.artifactId,
    error: result.error,
    durationMs: result.durationMs,
  });
  return mission;
}

export function buildLogoBriefText(command: string, brandName?: string | null, constraints: string[] = []) {
  const brand = brandName ?? "la marque";
  return [
    `Brief logo - ${brand}`,
    `Objectif: créer une identité visuelle simple, distinctive et exploitable pour ${brand}.`,
    "Livrable attendu: directions créatives, prompts visuels et guide pour designer humain. Aucun logo final n'est généré sans provider visuel réel.",
    "Directions créatives:",
    "1. Monogramme: travailler les initiales et une structure géométrique propriétaire.",
    "2. Symbole propriétaire: créer une marque abstraite liée à la promesse et au contexte métier.",
    "3. Emblème moderne: développer un badge simple utilisable sur vêtement, web ou support imprimé.",
    "Palette: noir profond, blanc doux, gris neutre, accent unique adapté au positionnement.",
    "Typographie: sans-serif contemporaine, lisible, avec graisse forte pour le wordmark.",
    constraints.length ? `Contraintes détectées: ${constraints.join(", ")}` : "Contraintes détectées: marque lisible, pas de texte-only, pas d'initiale sans rapport.",
    `Demande source: ${command}`,
  ].join("\n");
}

export function buildLogoDirectionsText(brandName?: string | null) {
  const brand = brandName ?? "la marque";
  return [
    `Directions créatives - ${brand}`,
    "Monogramme: créer une marque courte, lisible et propriétaire à partir des lettres utiles.",
    "Symbole propriétaire: développer un signe abstrait relié à la promesse métier, pas une icône générique.",
    "Emblème moderne: produire une version badge simple pour vêtement, web et social.",
  ].join("\n");
}

export function buildLogoPromptsText(brandName?: string | null, context?: string) {
  const brand = brandName ?? "la marque";
  const base = `Prototype de logo vectoriel pour ${brand}. Composition propriétaire, symbole ou monogramme lié au nom, lisible en petit format, pas de carte décorative, pas de texte-only.${context ? ` Contexte: ${context}.` : ""}`;
  return [
    `Prompts visuels - ${brand}`,
    `Midjourney: ${base} Direction premium, contraste fort, logo mark centered, clean vector geometry, black and neutral presentation, no mockup, no extra text.`,
    `Ideogram: ${base} Créer 3 explorations: monogramme, symbole géométrique, emblème moderne. Respecter strictement le nom ${brand}.`,
    `DALL-E: ${base} Générer un logo prototype propre avec symbole construit, wordmark ${brand}, fond demandé respecté, rendu vectoriel simple.`,
    "Guide designer humain: produire d'abord 12 croquis rapides, sélectionner 3 axes, vectoriser 2 versions, tester en petit format, puis vérifier contraste, lisibilité et usage monochrome.",
  ].join("\n\n");
}

export async function planLogoMissionWithoutProvider(command: string, missionId?: string) {
  const workOrder = createWorkOrderFromPrompt(command);
  const mission = createMissionRuntime(command, missionId ?? workOrder.missionId);
  const registry = getProviderRegistry();
  setMissionStatus(mission, "planning");
  const textProvider = await runTextProvider({
    system: "Prépare une analyse courte et utile pour une mission de logo. Ne génère aucune image.",
    user: command,
    purpose: "ceo_logo_text_reasoning",
  });
  addProviderResult(mission, textProvider);
  const imageProvider = imageProviderUnavailable();
  addProviderResult(mission, imageProvider);
  completeMissionStep(mission, "analyse_demande", "Demande logo analysée.");
  completeMissionStep(mission, "brief", "Brief texte disponible.");
  completeMissionStep(mission, "directions_creatives", "Directions créatives disponibles.");
  completeMissionStep(mission, "prompts_visuels", "Prompts visuels disponibles.");
  blockMissionStep(mission, "validation_provider", "Aucun provider image réel configuré.");
  blockMissionStep(mission, "livrable_ou_action", "Action utilisateur requise pour brancher un provider ou demander un prototype local.");
  mission.agents = mission.agents.map((agent) => ({
    ...agent,
    status: agent.id === "quality_director" ? "blocked" : "completed",
  }));
  addDeliverable(mission, {
    type: "brief",
    title: "Brief disponible",
    content: buildLogoBriefText(command, workOrder.brandName, workOrder.constraints),
    mediaType: "text",
    sourceType: "local_storage",
    providerUsed: "local_storage",
    artifactId: createTraceableArtifact({
      missionId: mission.missionId,
      type: "brief",
      title: "Brief disponible",
      sourceType: "local_storage",
      providerUsed: "local_storage",
      content: buildLogoBriefText(command, workOrder.brandName, workOrder.constraints),
    }).artifactId,
  });
  addDeliverable(mission, {
    type: "directions",
    title: "Directions disponibles",
    content: buildLogoDirectionsText(workOrder.brandName),
    mediaType: "text",
    sourceType: "local_storage",
    providerUsed: "local_storage",
    artifactId: createTraceableArtifact({
      missionId: mission.missionId,
      type: "directions",
      title: "Directions disponibles",
      sourceType: "local_storage",
      providerUsed: "local_storage",
      content: buildLogoDirectionsText(workOrder.brandName),
    }).artifactId,
  });
  addDeliverable(mission, {
    type: "visual_prompts",
    title: "Prompts disponibles",
    content: buildLogoPromptsText(workOrder.brandName),
    mediaType: "text",
    sourceType: "local_storage",
    providerUsed: "local_storage",
    artifactId: createTraceableArtifact({
      missionId: mission.missionId,
      type: "visual_prompts",
      title: "Prompts disponibles",
      sourceType: "local_storage",
      providerUsed: "local_storage",
      content: buildLogoPromptsText(workOrder.brandName),
    }).artifactId,
  });
  mission.providerUsed = registry.image.providerUsed;
  mission.sourceType = "none";
  setMissionStatus(mission, "needs_action");
  addMissionEvent(mission, "provider_missing", "Aucun provider image réel configuré.", {
    sourceType: "none",
    localSvgAutomatic: false,
    preparedProviders: registry.image.preparedProviders,
  });
  runMissionAgents(mission, { imageProviderAvailable: false });
  return { mission, workOrder };
}

export async function applyMissionAction(command: string, action: MissionAction, missionId?: string) {
  const { mission, workOrder } = await planLogoMissionWithoutProvider(command, missionId);
  addMissionEvent(mission, "action_requested", `Action requested: ${action}.`, { action });
  if (action === "prepare_brief") {
    setMissionStatus(mission, "completed");
    mission.deliverables = mission.deliverables.filter((deliverable) => deliverable.type === "brief");
    runMissionAgents(mission, { imageProviderAvailable: false, reset: true });
  }
  if (action === "create_visual_prompts") {
    setMissionStatus(mission, "completed");
    mission.deliverables = mission.deliverables.filter((deliverable) => deliverable.type === "visual_prompts");
    runMissionAgents(mission, { imageProviderAvailable: false, reset: true });
  }
  if (action === "modify_current_deliverable") {
    setMissionStatus(mission, "needs_action");
    addMissionEvent(mission, "modification_waiting_for_instruction", "Modification requires a specific instruction.");
    runMissionAgents(mission, { imageProviderAvailable: false, reset: true });
  }
  if (action === "request_local_prototype") {
    mission.sourceType = "local_svg";
    mission.providerUsed = "local_svg_renderer_explicit";
    addProviderResult(mission, localPrototypeProviderResult());
    setMissionStatus(mission, "reviewing");
    runMissionAgents(mission, { imageProviderAvailable: false, localPrototypeRequested: true, reset: true });
  }
  return { mission, workOrder };
}

export function normalizeMissionAction(value: unknown): MissionAction | undefined {
  if (value === "prepare_brief" || value === "brief") return "prepare_brief";
  if (value === "create_visual_prompts" || value === "prompts") return "create_visual_prompts";
  if (value === "request_local_prototype" || value === "local_svg") return "request_local_prototype";
  if (value === "modify_current_deliverable") return "modify_current_deliverable";
  return undefined;
}
