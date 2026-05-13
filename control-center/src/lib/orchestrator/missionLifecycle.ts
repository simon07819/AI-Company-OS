import type { WorkOrder } from "@/agents/runtime/types";

export type MissionLifecycleState =
  | "queued"
  | "planning"
  | "researching"
  | "generating"
  | "reviewing"
  | "improving"
  | "validating"
  | "completed"
  | "failed";

export type MissionAgentRole =
  | "strategist"
  | "branding"
  | "designer"
  | "critic"
  | "reviewer"
  | "planner"
  | "ui_designer"
  | "frontend";

export interface MissionLifecycleStep {
  id: string;
  state: MissionLifecycleState;
  label: string;
  agentRole: MissionAgentRole;
  status: "queued" | "running" | "completed" | "blocked" | "failed";
  startedAt?: string;
  completedAt?: string;
  summary: string;
  outputs: string[];
  critiques: string[];
  decisions: string[];
}

export interface MissionLifecycleTrace {
  missionId: string;
  turnId: string;
  deliverableType: string;
  requestType: string;
  provider: {
    nvidiaConfigured: boolean;
    visualProviderConfigured: boolean;
    textProvider: "nvidia" | "unavailable";
    visualProvider: "configured" | "unavailable";
  };
  currentState: MissionLifecycleState;
  finalStatus: "completed" | "blocked" | "failed";
  steps: MissionLifecycleStep[];
  blockers: string[];
  retryPolicy: {
    maxRetries: number;
    attempts: number;
    reasons: string[];
  };
}

function now() {
  return new Date().toISOString();
}

function step(input: Omit<MissionLifecycleStep, "startedAt" | "completedAt">): MissionLifecycleStep {
  const timestamp = now();
  return {
    ...input,
    startedAt: input.status === "queued" ? undefined : timestamp,
    completedAt: input.status === "completed" || input.status === "blocked" || input.status === "failed" ? timestamp : undefined,
  };
}

function logoSteps(blocked: boolean): MissionLifecycleStep[] {
  const terminalStatus = blocked ? "blocked" : "completed";
  return [
    step({
      id: "queued",
      state: "queued",
      label: "Mission queued",
      agentRole: "strategist",
      status: "completed",
      summary: "Mission créée et placée dans le runtime.",
      outputs: ["workOrder"],
      critiques: [],
      decisions: ["Créer une mission dédiée au prompt actuel."],
    }),
    step({
      id: "planning",
      state: "planning",
      label: "Brief",
      agentRole: "strategist",
      status: "completed",
      summary: "Objectif, marque, contraintes et critères d'acceptation extraits.",
      outputs: ["brief"],
      critiques: [],
      decisions: ["Un logo exige un provider visuel réel avant affichage."],
    }),
    step({
      id: "researching",
      state: "researching",
      label: "Recherche",
      agentRole: "branding",
      status: terminalStatus,
      summary: blocked ? "Recherche visuelle bloquée: provider visuel absent." : "Références et direction de marque préparées.",
      outputs: blocked ? [] : ["research_notes"],
      critiques: blocked ? ["Impossible de produire des références visuelles réelles sans provider."] : [],
      decisions: blocked ? ["Ne pas utiliser le générateur SVG local instantané."] : ["Continuer vers les concepts."],
    }),
    step({
      id: "generating",
      state: "generating",
      label: "Concepts",
      agentRole: "designer",
      status: terminalStatus,
      summary: blocked ? "Concepts non générés: aucun générateur visuel réel branché." : "Concepts produits par le provider configuré.",
      outputs: blocked ? [] : ["visual_candidates"],
      critiques: blocked ? ["Aucun candidat visuel validable."] : [],
      decisions: blocked ? ["Ne pas afficher de logo simulé."] : ["Envoyer les candidats à la critique."],
    }),
    step({
      id: "reviewing",
      state: "reviewing",
      label: "Critique",
      agentRole: "critic",
      status: terminalStatus,
      summary: blocked ? "Critique non lancée: pas de candidat réel." : "Critique des candidats et rejet des placeholders.",
      outputs: blocked ? [] : ["critique"],
      critiques: blocked ? ["Le résultat serait faux si un logo était affiché."] : [],
      decisions: blocked ? ["Mission non terminée."] : ["Raffiner les meilleurs candidats."],
    }),
    step({
      id: "validating",
      state: "validating",
      label: "Validation",
      agentRole: "reviewer",
      status: terminalStatus,
      summary: blocked ? "Validation refusée: aucun artifact visuel réel." : "Livrable validé avant affichage.",
      outputs: blocked ? [] : ["quality_decision"],
      critiques: blocked ? ["primaryArtifact absent", "provider visuel absent"] : [],
      decisions: blocked ? ["Afficher un statut honnête, pas un faux livrable."] : ["Publier le livrable utile."],
    }),
  ];
}

function websiteSteps(completed: boolean): MissionLifecycleStep[] {
  const terminalStatus = completed ? "completed" : "failed";
  return [
    step({
      id: "queued",
      state: "queued",
      label: "Mission queued",
      agentRole: "planner",
      status: "completed",
      summary: "Mission website créée dans le runtime.",
      outputs: ["workOrder"],
      critiques: [],
      decisions: ["Website prioritaire si le prompt contient site/page web/landing."],
    }),
    step({
      id: "planning",
      state: "planning",
      label: "Plan",
      agentRole: "planner",
      status: "completed",
      summary: "Brief, sections et objectifs de page préparés.",
      outputs: ["website_brief"],
      critiques: [],
      decisions: ["Logo éventuel traité comme asset secondaire."],
    }),
    step({
      id: "generating",
      state: "generating",
      label: "Preview",
      agentRole: "frontend",
      status: terminalStatus,
      summary: completed ? "Preview web/artifacts produits par le pipeline website." : "Preview non produite.",
      outputs: completed ? ["website_artifact"] : [],
      critiques: completed ? [] : ["Pas d'artifact website validable."],
      decisions: completed ? ["Envoyer en review."] : ["Ne pas afficher de faux site."],
    }),
    step({
      id: "reviewing",
      state: "reviewing",
      label: "Critique",
      agentRole: "critic",
      status: terminalStatus,
      summary: completed ? "Critique structure: nav, hero, CTA, sections, anti-recyclage." : "Critique bloquée.",
      outputs: completed ? ["review"] : [],
      critiques: completed ? [] : ["website artifact absent"],
      decisions: completed ? ["Valider si la structure est présente."] : ["Mission non terminée."],
    }),
    step({
      id: "validating",
      state: "validating",
      label: "Validation",
      agentRole: "reviewer",
      status: terminalStatus,
      summary: completed ? "Validation finale exécutée." : "Validation refusée.",
      outputs: completed ? ["quality_decision"] : [],
      critiques: completed ? [] : ["quality gate failed"],
      decisions: completed ? ["Afficher uniquement le livrable utile."] : ["Afficher une erreur courte."],
    }),
  ];
}

export function buildMissionLifecycleTrace(input: {
  workOrder: WorkOrder;
  nvidiaConfigured: boolean;
  visualProviderConfigured: boolean;
  completed: boolean;
  blockers?: string[];
  retryReasons?: string[];
  attempts?: number;
}): MissionLifecycleTrace {
  const isLogo = input.workOrder.deliverableType === "logo";
  const steps = isLogo ? logoSteps(!input.visualProviderConfigured || !input.completed) : websiteSteps(input.completed);
  const failed = steps.some((item) => item.status === "failed");
  const blocked = steps.some((item) => item.status === "blocked");
  return {
    missionId: input.workOrder.missionId,
    turnId: input.workOrder.turnId,
    deliverableType: input.workOrder.deliverableType,
    requestType: input.workOrder.requestType,
    provider: {
      nvidiaConfigured: input.nvidiaConfigured,
      visualProviderConfigured: input.visualProviderConfigured,
      textProvider: input.nvidiaConfigured ? "nvidia" : "unavailable",
      visualProvider: input.visualProviderConfigured ? "configured" : "unavailable",
    },
    currentState: input.completed ? "completed" : blocked ? "validating" : failed ? "failed" : "validating",
    finalStatus: input.completed ? "completed" : blocked ? "blocked" : "failed",
    steps,
    blockers: input.blockers ?? [],
    retryPolicy: {
      maxRetries: 2,
      attempts: input.attempts ?? 0,
      reasons: input.retryReasons ?? [],
    },
  };
}
