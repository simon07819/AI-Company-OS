import type { WorkOrder } from "@/agents/runtime/types";
import type { FailureMode } from "@/agents/playbooks/types";
import type { CritiqueResult, RefinementStrategy } from "./types";

export function createRefinementStrategy(critique: CritiqueResult, workOrder: WorkOrder, failureModes: FailureMode[] = []): RefinementStrategy {
  if (critique.status === "approved") {
    return { targetAgents: [], skillIds: [], toolIds: [], requiredChanges: [], maxAttempts: 0, reason: "No refinement required." };
  }
  if (workOrder.requestType === "website") {
    return {
      targetAgents: ["ux_designer", "web_designer", "frontend_builder"],
      skillIds: ["generate_website_wireframe", "render_website_preview"],
      toolIds: ["website.preview", "quality.evaluate"],
      requiredChanges: [...critique.requiredChanges, ...failureModes.map((mode) => mode.correctionStrategy)],
      maxAttempts: 2,
      reason: "Website output needs structural correction.",
    };
  }
  if (workOrder.deliverableType === "logo") {
    const brandFix = critique.issues.some((issue) => /brand/i.test(issue));
    return {
      targetAgents: brandFix ? ["product_owner", "logo_designer", "svg_illustrator"] : ["logo_designer", "svg_illustrator"],
      skillIds: brandFix ? ["extract_brand_name", "generate_logo_concepts", "render_svg_logo"] : ["generate_logo_concepts", "render_svg_logo"],
      toolIds: ["visual.svg", "quality.evaluate"],
      requiredChanges: [...critique.requiredChanges, ...failureModes.map((mode) => mode.correctionStrategy)],
      maxAttempts: 2,
      reason: brandFix ? "Logo needs brand extraction and visual correction." : "Logo needs visual refinement.",
    };
  }
  return {
    targetAgents: ["quality_director"],
    skillIds: ["validate_simple_chat_output"],
    toolIds: ["quality.evaluate"],
    requiredChanges: [...critique.requiredChanges, ...failureModes.map((mode) => mode.correctionStrategy)],
    maxAttempts: 1,
    reason: "Visible output must hide internal details.",
  };
}
