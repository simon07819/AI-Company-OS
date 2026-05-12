import { generateStructuredObject } from "./structuredGeneration";
import { CEO_PLANNER_PROMPT, plannerUserPrompt } from "./prompts";
import { prototypeNotice } from "./llmClient";
import { validateExecutionPlan, type CeoExecutionPlan, type CeoIntentResult, type ExecutionArtifact, type InternalExecutionStep } from "./schemas";

function artifactsFor(intent: CeoIntentResult): ExecutionArtifact[] {
  if (intent.requestType === "saas") {
    return [
      { type: "brief", title: "Product brief", description: "ICP, goal, core flows and product scope.", required: true },
      { type: "data_model", title: "Data model", description: "Entities, relationships and storage assumptions.", required: true },
      { type: "api_spec", title: "API spec", description: "Core endpoints and contracts.", required: true },
      { type: "project_scaffold", title: "Project scaffold", description: "Initial app files and runnable structure.", required: true },
      { type: "validation_report", title: "Validation report", description: "Checks for completeness and next build steps.", required: true },
    ];
  }
  if (intent.requestType === "website") {
    return [
      { type: "brief", title: "Website brief", description: "Audience, positioning and conversion goal.", required: true },
      { type: "page", title: "Page structure", description: "Sitemap, sections and content hierarchy.", required: true },
      { type: "component", title: "Homepage components", description: "Hero, CTA, sections and responsive layout.", required: true },
      { type: "validation_report", title: "Launch checklist", description: "Content, responsive and accessibility checks.", required: true },
    ];
  }
  if (intent.requestType === "app") {
    return [
      { type: "brief", title: "App brief", description: "User, use case and key flows.", required: true },
      { type: "component", title: "Screen map", description: "Core screens and navigation.", required: true },
      { type: "data_model", title: "App data model", description: "Objects and user state.", required: true },
    ];
  }
  if (intent.requestType === "automation") {
    return [
      { type: "workflow", title: "Automation workflow", description: "Triggers, actions, guardrails and logs.", required: true },
      { type: "validation_report", title: "Workflow validation", description: "Failure paths and manual review points.", required: true },
    ];
  }
  if (intent.requestType === "logo" || intent.requestType === "branding") {
    return [
      { type: "brief", title: "Brand brief", description: "Brand, industry, audience and creative direction.", required: true },
      { type: "brand_concepts", title: "Logo concepts", description: "Distinct visual concepts with rationale.", required: true },
      { type: "validation_report", title: "Brand review", description: "Readability, coherence and next iteration.", required: true },
    ];
  }
  return [
    { type: "brief", title: "Clarification brief", description: "Structured interpretation and recommended next action.", required: true },
  ];
}

function agentsFor(intent: CeoIntentResult): string[] {
  if (intent.requestType === "saas") return ["ceo", "product_agent", "architect_agent", "frontend_agent", "backend_agent", "qa_agent"];
  if (intent.requestType === "website") return ["ceo", "product_agent", "frontend_agent", "qa_agent"];
  if (intent.requestType === "app") return ["ceo", "product_agent", "frontend_agent", "backend_agent"];
  if (intent.requestType === "automation") return ["ceo", "backend_agent", "qa_agent"];
  if (intent.requestType === "logo" || intent.requestType === "branding") return ["ceo", "cmo", "frontend_agent", "qa_agent"];
  return ["ceo"];
}

function internalPlanFor(intent: CeoIntentResult): InternalExecutionStep[] {
  const artifacts = artifactsFor(intent);
  return artifacts.map((artifact, index) => ({
    id: `step-${index + 1}`,
    title: artifact.title,
    owner: agentsFor(intent)[Math.min(index + 1, agentsFor(intent).length - 1)] ?? "ceo",
    artifactTypes: [artifact.type],
  }));
}

function visibleResponseFor(intent: CeoIntentResult) {
  if (intent.requestType === "logo") {
    return `Parfait. Je prépare un concept de logo structuré${intent.brandName ? ` pour ${intent.brandName}` : ""}. CMO et Designer préparent le brief et les directions visuelles.`;
  }
  if (intent.requestType === "saas") {
    return `Parfait. Je structure le SaaS${intent.projectName ? ` ${intent.projectName}` : ""} avec les fonctionnalités clés et les premiers artifacts.`;
  }
  if (intent.requestType === "website") return "Parfait. Je prépare la structure du site, les pages clés et un premier artifact concret.";
  if (intent.requestType === "app") return "Parfait. Je prépare les écrans, les flux et le premier plan d'application.";
  if (intent.requestType === "branding") return `Parfait. Je prépare une direction branding premium${intent.brandName ? ` pour ${intent.brandName}` : ""}.`;
  if (intent.requestType === "automation") return "Parfait. Je prépare le workflow, ses déclencheurs et les contrôles.";
  return "Parfait. Je clarifie la demande et je prépare la prochaine action concrète.";
}

export function createFallbackExecutionPlan(intent: CeoIntentResult): CeoExecutionPlan {
  return {
    visibleResponse: visibleResponseFor(intent),
    internalPlan: internalPlanFor(intent),
    expectedArtifacts: artifactsFor(intent),
    agents: agentsFor(intent),
    simpleStatus: intent.requestType === "unknown" ? "Clarification requise" : "Plan prêt",
    mode: "prototype",
    prototypeNotice: prototypeNotice(),
  };
}

export async function planCeoExecution(intent: CeoIntentResult): Promise<CeoExecutionPlan> {
  const fallback = createFallbackExecutionPlan(intent);
  const generated = await generateStructuredObject(
    {
      system: CEO_PLANNER_PROMPT,
      user: plannerUserPrompt(intent),
      purpose: "CEO execution planning",
    },
    fallback,
    validateExecutionPlan,
  );

  return {
    ...generated.value,
    internalPlan: fallback.internalPlan,
    expectedArtifacts: fallback.expectedArtifacts,
    mode: generated.mode,
    prototypeNotice: generated.mode === "prototype" ? prototypeNotice() : undefined,
  };
}
