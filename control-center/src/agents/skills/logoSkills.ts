import type { AgentSkill } from "../types";

function identity<T>(value: T) {
  return value;
}

export const logoAgentSkills: Record<string, AgentSkill> = {
  parse_user_request: {
    id: "parse_user_request",
    name: "Parse user request",
    description: "Extract deliverable type, brand name, visual style, background and constraints from the user prompt.",
    run: identity,
  },
  create_work_order: {
    id: "create_work_order",
    name: "Create work order",
    description: "Turn a user prompt into a delegated creative work order with acceptance criteria.",
    run: identity,
  },
  select_workflow: {
    id: "select_workflow",
    name: "Select workflow",
    description: "Choose the correct operational workflow for the requested deliverable.",
    run: identity,
  },
  return_final_deliverable: {
    id: "return_final_deliverable",
    name: "Return final deliverable",
    description: "Return only the useful final deliverable to the simple chat surface.",
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
    description: "Produce a concise design brief with constraints and acceptance criteria.",
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
  critique_logo_concepts: {
    id: "critique_logo_concepts",
    name: "Critique logo concepts",
    description: "Critique every logo concept against the brief and reject weak directions.",
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
    description: "Select the strongest concept based on brief fit, distinctiveness and deliverability.",
    run: identity,
  },
  request_refinement: {
    id: "request_refinement",
    name: "Request refinement",
    description: "Ask for refinement when a concept is promising but incomplete.",
    run: identity,
  },
  validate_logo_deliverable: {
    id: "validate_logo_deliverable",
    name: "Validate logo deliverable",
    description: "Validate the final visible output before it can be shown as ready.",
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
  validate_hidden_details_only: {
    id: "validate_hidden_details_only",
    name: "Validate hidden details only",
    description: "Ensure scores, artifacts, workspace links and process stay out of simple chat.",
    run: identity,
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
