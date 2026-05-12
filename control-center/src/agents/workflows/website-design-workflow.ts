import { createWorkOrderFromPrompt } from "@/lib/ceoWorkOrder";
import { agentRegistry, runAgentSkill } from "@/agents/registry";
import { defaultToolContext, runToolAdapter } from "@/agents/capabilities/registry";
import type { ToolTraceEntry } from "@/agents/capabilities/types";
import type { AgentRunResult } from "@/agents/types";
import { validateWebsiteDeliverable } from "@/agents/quality/gates";

export interface WebsiteBrief {
  originalPrompt: string;
  brandName: string;
  pageType: "landing_page" | "homepage" | "website";
  style?: string;
  industry?: string;
  contentMode?: "temporary" | "real";
  assetRequests: string[];
  constraints: string[];
}

export interface WebsiteTeamResult {
  brief: WebsiteBrief;
  wireframe: {
    nav: string[];
    hero: string;
    cta: string;
    sections: string[];
  };
  designDirection: {
    palette: string[];
    tone: string;
    layout: string;
  };
  primaryVisual: string;
  visibleOutput: {
    kind: "website_preview";
    deliverableType: "website" | "landing_page";
    brandName: string;
    mediaType: "svg";
    primaryVisual: string;
  };
  hiddenDetails: {
    brief: WebsiteBrief;
    uxNotes: unknown;
    designNotes: unknown;
    agentRuns: AgentRunResult[];
    toolTrace: ToolTraceEntry[];
    qualityChecks: string[];
  };
}

function createBrief(input: string): WebsiteBrief {
  const workOrder = createWorkOrderFromPrompt(input);
  const brandName = workOrder.brandName ?? "EKIDA";
  return {
    originalPrompt: input,
    brandName,
    pageType: workOrder.deliverableType === "landing_page" ? "landing_page" : "website",
    style: workOrder.style,
    industry: workOrder.industry,
    contentMode: workOrder.contentMode,
    assetRequests: workOrder.assetRequests,
    constraints: [
      "Créer une preview de page web, pas un logo seul.",
      "Inclure header/nav, hero, CTA et sections.",
      `Respecter la marque ${brandName}.`,
      ...(workOrder.assetRequests.includes("logo") ? ["Utiliser le logo comme petit asset de marque, pas comme livrable principal."] : []),
      ...(workOrder.contentMode === "temporary" ? ["Utiliser du contenu temporaire propre et assumé."] : []),
      ...(workOrder.industry === "apparel" ? ["Adapter la page à une compagnie de linge/vêtements."] : []),
    ],
  };
}

export function runWebsiteDesignWorkflow(input: string, previousPrimaryVisual?: string | null): WebsiteTeamResult {
  const agentRuns: AgentRunResult[] = [];
  const toolTrace: ToolTraceEntry[] = [];
  const run = <TInput, TOutput>(agentId: string, skillId: string, payload: TInput) => {
    const result = runAgentSkill<TInput, TOutput>(agentId, skillId, payload);
    agentRuns.push(result);
    return result.output;
  };
  const runTool = <TInput, TOutput>(agentId: string, toolId: string, payload: TInput, capabilityPackId?: string) => {
    const agent = agentRegistry[agentId];
    const result = runToolAdapter<TInput, TOutput>(toolId, payload, defaultToolContext({
      agentId,
      role: agent.role,
      userPrompt: input,
      mode: "details",
    }), agent.toolsAllowed, capabilityPackId);
    toolTrace.push(result);
    return result.output;
  };

  run("ceo", "parse_user_request", input);
  run("ceo", "create_work_order", { originalPrompt: input, deliverableType: "website" });
  run("ceo", "route_workflow", { workflow: "website-design", reason: "website/page request wins over logo asset" });

  const brief = createBrief(input);
  run("product_owner", "generate_website_brief", brief);
  const wireframe = {
    nav: ["Collection", "À propos", "Contact"],
    hero: "Hero avec proposition de valeur et CTA",
    cta: "Voir la collection",
    sections: ["Nouveautés", "Confort quotidien", "Lookbook"],
  };
  run("ux_designer", "generate_website_wireframe", wireframe);
  const designDirection = {
    palette: ["#fffdf8", "#111827", "#d7b98c"],
    tone: brief.style === "simple" ? "simple, éditorial, premium calme" : "premium business",
    layout: "header compact, hero sombre, cartes de collection",
  };
  run("web_designer", "generate_website_wireframe", { brief, wireframe, designDirection });
  const preview = runTool<{ brandName: string; industry?: string; contentMode?: "temporary" | "real" }, { primaryVisual: string }>("frontend_builder", "website.preview", {
    brandName: brief.brandName,
    industry: brief.industry,
    contentMode: brief.contentMode,
  }, "website-production");
  const primaryVisual = preview?.primaryVisual ?? "";
  run("web_designer", "render_website_preview", primaryVisual);
  run("frontend_builder", "render_website_preview", primaryVisual);

  const visibleOutput = {
    kind: "website_preview" as const,
    deliverableType: brief.pageType === "landing_page" ? "landing_page" as const : "website" as const,
    brandName: brief.brandName,
    mediaType: "svg" as const,
    primaryVisual,
  };
  const qualityInput = { brandName: brief.brandName, visibleOutput, previousPrimaryVisual };
  const quality = validateWebsiteDeliverable(qualityInput);
  run("quality_director", "validate_website_deliverable", qualityInput);
  runTool("quality_director", "quality.evaluate", { kind: "website", payload: qualityInput }, "quality-core");
  run("quality_director", "validate_simple_chat_output", { visibleOutput: { ...visibleOutput, primaryVisual: "[svg]" } });
  run("artifact_manager", "prepare_hidden_details", { brief, wireframe, designDirection, quality });
  runTool("artifact_manager", "artifact.store", { brief, wireframe, designDirection, quality }, "git-repo");
  run("ceo", "return_final_deliverable", visibleOutput);

  return {
    brief,
    wireframe,
    designDirection,
    primaryVisual,
    visibleOutput,
    hiddenDetails: {
      brief,
      uxNotes: wireframe,
      designNotes: designDirection,
      agentRuns,
      toolTrace,
      qualityChecks: quality.issues,
    },
  };
}
