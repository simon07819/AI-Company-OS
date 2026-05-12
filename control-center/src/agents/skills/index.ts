import { createWorkOrderFromPrompt } from "@/lib/ceoWorkOrder";
import type { AgentSkill } from "../types";

function identity<T>(value: T) {
  return value;
}

function parsePrompt(input: unknown) {
  const prompt = typeof input === "string" ? input : typeof input === "object" && input && "prompt" in input ? String((input as { prompt?: unknown }).prompt ?? "") : "";
  return createWorkOrderFromPrompt(prompt || String(input ?? ""));
}

function validateSimpleChat(input: unknown) {
  const text = JSON.stringify(input ?? "");
  const forbidden = /Brand system|Marque à nommer|quality report|score|artifact|README|workspace|runtime|sessionId|projectId|process|logs|LOGO|Prototype visuel/i;
  return { ok: !forbidden.test(text), issues: forbidden.test(text) ? ["internal details visible in simple chat"] : [] };
}

function validateWebsite(input: unknown) {
  const value = input as { visibleOutput?: { kind?: string; deliverableType?: string; brandName?: string | null; primaryVisual?: string | null }; previousPrimaryVisual?: string | null };
  const output = value.visibleOutput ?? {};
  const visual = output.primaryVisual ?? "";
  const issues = [
    ...(output.kind !== "website_preview" ? ["kind website_preview requis"] : []),
    ...(output.deliverableType !== "website" && output.deliverableType !== "landing_page" ? ["deliverableType website requis"] : []),
    ...(!output.brandName || output.brandName === "Marque à nommer" ? ["brandName invalide"] : []),
    ...(!/<svg|<html|<main/i.test(visual) ? ["preview web manquante"] : []),
    ...(!/nav|Collection|À propos|Contact|hero|Voir la collection|CTA|section|Nouveautés/i.test(visual) ? ["structure page manquante"] : []),
    ...(value.previousPrimaryVisual && visual === value.previousPrimaryVisual ? ["primaryVisual précédent recyclé"] : []),
  ];
  return { ok: issues.length === 0, issues };
}

export const agentSkills: Record<string, AgentSkill> = {
  parse_user_request: {
    id: "parse_user_request",
    name: "Parse user request",
    description: "Extract deliverable type, brand, style, background, assets and routing signals from the current prompt.",
    run: parsePrompt,
  },
  create_work_order: {
    id: "create_work_order",
    name: "Create work order",
    description: "Create an isolated turn-level work order so a new deliverable never inherits stale primary visuals.",
    run: identity,
  },
  route_workflow: {
    id: "route_workflow",
    name: "Route workflow",
    description: "Route the work order to logo, website, product or unknown workflows with website priority over logo assets.",
    run: identity,
  },
  select_workflow: {
    id: "select_workflow",
    name: "Select workflow",
    description: "Compatibility alias for route_workflow used by older workflow code.",
    run: identity,
  },
  return_final_deliverable: {
    id: "return_final_deliverable",
    name: "Return final deliverable",
    description: "Return only the useful final deliverable to the simple chat surface.",
    run: identity,
  },
  decide_previous_deliverable_reuse: {
    id: "decide_previous_deliverable_reuse",
    name: "Decide previous deliverable reuse",
    description: "Allow reuse only for explicit compatible edits, never for a new deliverable type.",
    run: identity,
  },
  extract_brand_name: {
    id: "extract_brand_name",
    name: "Extract brand name",
    description: "Find the real brand name without absorbing style, audience or background words.",
    run: identity,
  },
  extract_visual_constraints: {
    id: "extract_visual_constraints",
    name: "Extract visual constraints",
    description: "Extract background, style, audience and visual constraints.",
    run: identity,
  },
  write_design_brief: {
    id: "write_design_brief",
    name: "Write design brief",
    description: "Compatibility alias for generate_design_brief.",
    run: identity,
  },
  generate_design_brief: {
    id: "generate_design_brief",
    name: "Generate design brief",
    description: "Produce a concise brand/logo brief with constraints and acceptance criteria.",
    run: identity,
  },
  generate_brand_positioning: {
    id: "generate_brand_positioning",
    name: "Generate brand positioning",
    description: "Define the energy, audience and strategic position of the visual identity.",
    run: identity,
  },
  generate_creative_territories: {
    id: "generate_creative_territories",
    name: "Generate creative territories",
    description: "Produce multiple distinct creative territories before visual design starts.",
    run: identity,
  },
  generate_logo_concepts: {
    id: "generate_logo_concepts",
    name: "Generate logo concepts",
    description: "Create several distinct logo concepts with symbol, rationale, palette and SVG draft.",
    run: identity,
  },
  compose_symbol: {
    id: "compose_symbol",
    name: "Compose symbol",
    description: "Construct a non-generic symbol related to the brand and use case.",
    run: identity,
  },
  compose_monogram: {
    id: "compose_monogram",
    name: "Compose monogram",
    description: "Construct a monogram related to the brand letters, never a random initial.",
    run: identity,
  },
  compose_badge: {
    id: "compose_badge",
    name: "Compose badge",
    description: "Construct an emblem or badge variant when it improves the brand system.",
    run: identity,
  },
  critique_logo_concepts: {
    id: "critique_logo_concepts",
    name: "Critique logo concepts",
    description: "Compatibility alias for critique_design_concepts.",
    run: identity,
  },
  critique_design_concepts: {
    id: "critique_design_concepts",
    name: "Critique design concepts",
    description: "Critique every design concept against the brief and reject weak directions.",
    run: identity,
  },
  reject_placeholder_design: {
    id: "reject_placeholder_design",
    name: "Reject placeholder design",
    description: "Reject designs that are only text, random shapes or decorative cards.",
    run: identity,
  },
  select_best_concept: {
    id: "select_best_concept",
    name: "Select best concept",
    description: "Compatibility alias for select_best_design_concept.",
    run: identity,
  },
  select_best_design_concept: {
    id: "select_best_design_concept",
    name: "Select best design concept",
    description: "Select the strongest concept based on brief fit, distinctiveness and deliverability.",
    run: identity,
  },
  request_refinement: {
    id: "request_refinement",
    name: "Request refinement",
    description: "Ask for refinement when a concept is promising but incomplete.",
    run: identity,
  },
  render_svg_logo: {
    id: "render_svg_logo",
    name: "Render SVG logo",
    description: "Turn the selected design concept into a clean, centered and responsive SVG.",
    run: identity,
  },
  validate_svg_viewbox: {
    id: "validate_svg_viewbox",
    name: "Validate SVG viewBox",
    description: "Check that the SVG has a usable viewBox and is not clipped.",
    run: identity,
  },
  fit_svg_content: {
    id: "fit_svg_content",
    name: "Fit SVG content",
    description: "Ensure the visual composition fits the SVG viewport.",
    run: identity,
  },
  generate_website_brief: {
    id: "generate_website_brief",
    name: "Generate website brief",
    description: "Extract page type, brand, content mode, assets, industry and constraints for a website deliverable.",
    run: identity,
  },
  generate_website_wireframe: {
    id: "generate_website_wireframe",
    name: "Generate website wireframe",
    description: "Plan header, hero, CTA and sections for a page preview.",
    run: identity,
  },
  render_website_preview: {
    id: "render_website_preview",
    name: "Render website preview",
    description: "Render a website preview SVG/HTML deliverable, not a standalone logo.",
    run: identity,
  },
  validate_logo_deliverable: {
    id: "validate_logo_deliverable",
    name: "Validate logo deliverable",
    description: "Validate the final visible logo output before it can be shown as ready.",
    run: identity,
  },
  detect_generic_placeholder: {
    id: "detect_generic_placeholder",
    name: "Detect generic placeholder",
    description: "Detect placeholder names, generic letters, decorative cards and fake deliverables.",
    run: identity,
  },
  detect_text_only_logo: {
    id: "detect_text_only_logo",
    name: "Detect text-only logo",
    description: "Reject logos that are only a word typed with a font and no symbol/composition.",
    run: identity,
  },
  detect_wrong_brand_name: {
    id: "detect_wrong_brand_name",
    name: "Detect wrong brand name",
    description: "Reject outputs that omit or corrupt the requested brand name.",
    run: identity,
  },
  validate_website_deliverable: {
    id: "validate_website_deliverable",
    name: "Validate website deliverable",
    description: "Block website outputs that are only logos, lack page structure, or recycle previous visuals.",
    run: validateWebsite,
  },
  validate_simple_chat_output: {
    id: "validate_simple_chat_output",
    name: "Validate simple chat output",
    description: "Ensure score, artifacts, workspace links, IDs and process stay out of the simple chat.",
    run: validateSimpleChat,
  },
  validate_hidden_details_only: {
    id: "validate_hidden_details_only",
    name: "Validate hidden details only",
    description: "Compatibility alias for validate_simple_chat_output.",
    run: validateSimpleChat,
  },
  store_artifacts: {
    id: "store_artifacts",
    name: "Store artifacts",
    description: "Prepare internal artifacts without exposing them in simple chat.",
    run: identity,
  },
  prepare_hidden_details: {
    id: "prepare_hidden_details",
    name: "Prepare hidden details",
    description: "Package brief, concepts, critiques and artifacts for a closed details panel.",
    run: identity,
  },
};
