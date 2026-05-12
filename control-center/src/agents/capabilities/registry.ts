import { artifactStoreAdapter } from "./adapters/artifact-store-adapter";
import { browserPreviewAdapter } from "./adapters/browser-preview-adapter";
import { filesystemProjectAdapter } from "./adapters/filesystem-project-adapter";
import { gitRepoAdapter } from "./adapters/git-repo-adapter";
import { githubMcpAdapter, mcpAdapter, playwrightMcpAdapter } from "./adapters/mcp-adapter";
import { qualityEvaluatorAdapter } from "./adapters/quality-evaluator-adapter";
import { shellCommandAdapter } from "./adapters/shell-command-adapter";
import { visualSvgAdapter } from "./adapters/visual-svg-adapter";
import { websitePreviewAdapter } from "./adapters/website-preview-adapter";
import { assertToolAllowedForAgent } from "./guards";
import type { CapabilityPack, ToolAdapter, ToolRunContext, ToolRunResult, ToolTraceEntry } from "./types";

export const toolRegistry: Record<string, ToolAdapter<any, any>> = {
  "filesystem.project": filesystemProjectAdapter,
  "shell.safe": shellCommandAdapter,
  "git.repo": gitRepoAdapter,
  "browser.preview": browserPreviewAdapter,
  "visual.svg": visualSvgAdapter,
  "website.preview": websitePreviewAdapter,
  "quality.evaluate": qualityEvaluatorAdapter,
  "artifact.store": artifactStoreAdapter,
  "mcp.generic": mcpAdapter,
  "mcp.github": githubMcpAdapter,
  "mcp.playwright": playwrightMcpAdapter,
};

export const capabilityPacks: Record<string, CapabilityPack> = {
  "ceo-core": {
    id: "ceo-core",
    name: "CEO Capability Pack",
    description: "Routing, delegation and final visible-output validation.",
    agentRoles: ["ceo"],
    tools: ["quality.evaluate", "artifact.store"],
    skills: ["parse_user_request", "create_work_order", "route_workflow", "validate_simple_chat_output"],
    guardrails: ["no_simple_mode_internals", "no_fake_success"],
    mustNeverDo: ["fabriquer seul un faux livrable", "exposer le process en chat simple"],
  },
  "product-brief": {
    id: "product-brief",
    name: "Product Capability Pack",
    description: "Turn prompts into typed briefs and acceptance criteria.",
    agentRoles: ["product_owner"],
    tools: ["artifact.store"],
    skills: ["parse_user_request", "generate_design_brief", "generate_website_brief"],
    guardrails: ["strict_brand_extraction"],
    mustNeverDo: ["absorber le style, l'audience ou le fond dans le nom de marque"],
  },
  "design-system": {
    id: "design-system",
    name: "Design Capability Pack",
    description: "Create, critique and render visual identity concepts.",
    agentRoles: ["brand_strategist", "creative_director", "logo_designer", "svg_illustrator"],
    tools: ["visual.svg", "quality.evaluate", "artifact.store"],
    skills: ["generate_logo_concepts", "critique_design_concepts", "select_best_design_concept", "render_svg_logo"],
    guardrails: ["no_text_only_logo", "no_generic_initial"],
    mustNeverDo: ["valider une carte décorative comme logo"],
  },
  "logo-production": {
    id: "logo-production",
    name: "Logo Capability Pack",
    description: "Produce and validate SVG logo prototypes.",
    agentRoles: ["logo_designer", "svg_illustrator", "quality_director"],
    tools: ["visual.svg", "quality.evaluate", "artifact.store"],
    skills: ["generate_logo_concepts", "render_svg_logo", "validate_logo_deliverable"],
    guardrails: ["svg_viewbox_required", "brand_name_required"],
    mustNeverDo: ["retourner Brand system en réponse logo simple"],
  },
  "website-production": {
    id: "website-production",
    name: "Website Capability Pack",
    description: "Produce website previews with page structure and quality checks.",
    agentRoles: ["ux_designer", "web_designer", "frontend_builder"],
    tools: ["website.preview", "visual.svg", "quality.evaluate", "artifact.store"],
    skills: ["generate_website_brief", "generate_website_wireframe", "render_website_preview"],
    guardrails: ["website_not_logo_only", "no_recycled_primary_visual"],
    mustNeverDo: ["retourner seulement un logo pour une demande de page web"],
  },
  "browser-qa": {
    id: "browser-qa",
    name: "Browser QA Capability Pack",
    description: "Optional browser visual QA when runtime tooling is configured.",
    agentRoles: ["quality_director", "browser_agent"],
    tools: ["browser.preview", "mcp.playwright"],
    skills: ["parse_user_request"],
    guardrails: ["optional_only", "no_implicit_browser"],
    mustNeverDo: ["prétendre avoir navigué sans outil configuré"],
  },
  "git-repo": {
    id: "git-repo",
    name: "Git Repo Capability Pack",
    description: "Safe repository inspection only.",
    agentRoles: ["ceo", "quality_director", "artifact_manager"],
    tools: ["git.repo", "shell.safe", "filesystem.project"],
    skills: ["parse_user_request"],
    guardrails: ["no_push", "no_deploy", "no_secrets"],
    mustNeverDo: ["push ou déployer automatiquement", "lire des secrets"],
  },
  "code-builder": {
    id: "code-builder",
    name: "Code Builder Capability Pack",
    description: "Controlled project file and preview capabilities for builders.",
    agentRoles: ["frontend_builder"],
    tools: ["filesystem.project", "shell.safe", "website.preview"],
    skills: ["render_website_preview"],
    guardrails: ["repo_scoped_filesystem", "allowlisted_shell_only"],
    mustNeverDo: ["déployer", "accéder aux secrets", "écrire hors repo"],
  },
  "quality-core": {
    id: "quality-core",
    name: "Quality Capability Pack",
    description: "Block fake deliverables and simple-mode leaks.",
    agentRoles: ["quality_director"],
    tools: ["quality.evaluate", "browser.preview"],
    skills: ["validate_logo_deliverable", "validate_website_deliverable", "validate_simple_chat_output"],
    guardrails: ["block_placeholders", "hidden_details_only"],
    mustNeverDo: ["marquer prêt si le livrable est faux ou incomplet"],
  },
};

export function defaultToolContext(overrides: Partial<ToolRunContext> = {}): ToolRunContext {
  return {
    turnId: "turn-local",
    missionId: "mission-local",
    agentId: "system",
    role: "system",
    userPrompt: "",
    mode: "details",
    repoRoot: process.cwd(),
    allowNetwork: false,
    allowShell: false,
    allowFilesystemWrite: false,
    ...overrides,
  };
}

export function runToolAdapter<TInput, TOutput>(
  toolId: string,
  input: TInput,
  context: ToolRunContext,
  allowedTools: string[],
  capabilityPackId?: string,
): ToolTraceEntry<TOutput> {
  const tool = toolRegistry[toolId];
  if (!tool) throw new Error(`Unknown tool: ${toolId}`);
  try {
    assertToolAllowedForAgent(context.role, toolId, allowedTools);
    const output = tool.run(input, context) as TOutput;
    return {
      toolId,
      agentId: context.agentId,
      role: context.role,
      capabilityPackId,
      status: "ok",
      output,
      hiddenLog: [`${context.role} used ${toolId}`],
    };
  } catch (error) {
    return {
      toolId,
      agentId: context.agentId,
      role: context.role,
      capabilityPackId,
      status: error instanceof Error && /blocked|not allowed|disabled|unsafe|secret|outside|allowlist/i.test(error.message) ? "blocked" : "failed",
      error: error instanceof Error ? error.message : "Unknown tool error",
      hiddenLog: [`${context.role} could not use ${toolId}`],
    };
  }
}
