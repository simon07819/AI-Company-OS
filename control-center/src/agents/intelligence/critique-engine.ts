import type { WorkOrder } from "@/agents/runtime/types";
import type { AgentMethod } from "./types";
import type { CritiqueResult } from "./types";

function textOf(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value ?? {});
}

export function critiqueAgentOutput(input: {
  agentRole: string;
  output: unknown;
  workOrder: WorkOrder;
  method?: AgentMethod;
  previousOutputs?: unknown[];
}): CritiqueResult {
  const text = textOf(input.output);
  const issues: string[] = [];
  const requiredChanges: string[] = [];

  if (/Brand system/i.test(text)) {
    issues.push("Brand system placeholder detected");
    requiredChanges.push("Route to the requested deliverable workflow and remove brand-system framing.");
  }
  if (/Marque à nommer/i.test(text) && input.workOrder.brandName) {
    issues.push("Missing real brand name");
    requiredChanges.push(`Use exact brandName ${input.workOrder.brandName}.`);
  }
  if (input.workOrder.deliverableType === "logo") {
    const pathCount = (text.match(/<path\b/g) ?? []).length;
    if (/<svg/i.test(text) && /<text/i.test(text) && pathCount < 2) {
      issues.push("Logo output is text-only");
      requiredChanges.push("Add symbol, monogram or composed mark.");
    }
    if (input.workOrder.brandName === "EKIDA" && />\s*[AB]\s*</.test(text)) {
      issues.push("Unrelated generic initial for EKIDA");
      requiredChanges.push("Use EKIDA, EK or E as the brand mark.");
    }
  }
  if (input.workOrder.requestType === "website") {
    if (/<svg/i.test(text) && !/aria-label="nav"|aria-label="hero"|aria-label="sections"/.test(text)) {
      issues.push("Website output is missing page structure");
      requiredChanges.push("Render nav, hero, CTA and sections.");
    }
    if (input.previousOutputs?.some((previous) => previous && text === textOf(previous))) {
      issues.push("Previous output recycled as current primary visual");
      requiredChanges.push("Create a new website preview artifact.");
    }
  }
  if (/score|quality report|toolTrace|checkpoints|workspace|README|JSON|process/i.test(text)) {
    issues.push("Internal details visible");
    requiredChanges.push("Move internals to hiddenDetails only.");
  }

  if (issues.length === 0) {
    return { status: "approved", issues: [], requiredChanges: [] };
  }

  return {
    status: issues.some((issue) => /Brand system|text-only|recycled|Missing real brand/i.test(issue)) ? "rejected" : "needs_refinement",
    issues,
    requiredChanges,
    recommendedAgent: recommendedAgentFor(input.workOrder),
    recommendedSkill: recommendedSkillFor(input.workOrder),
  };
}

function recommendedAgentFor(workOrder: WorkOrder) {
  if (workOrder.requestType === "website") return "frontend_builder";
  if (workOrder.deliverableType === "logo") return "svg_illustrator";
  return "quality_director";
}

function recommendedSkillFor(workOrder: WorkOrder) {
  if (workOrder.requestType === "website") return "render_website_preview";
  if (workOrder.deliverableType === "logo") return "render_svg_logo";
  return "validate_simple_chat_output";
}
