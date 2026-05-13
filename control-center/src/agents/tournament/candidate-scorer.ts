import type { WorkOrder } from "@/agents/runtime/types";
import type { PreviousDeliverable } from "@/lib/ceoWorkOrder";
import type { AgentCandidate, CandidateScore } from "./types";

function includesInternals(content: string) {
  return /score|quality report|artifact|workspace|toolTrace|checkpoint|runtime|README|JSON|process/i.test(content);
}

function isTextOnlyLogo(content: string) {
  return /<svg\b/i.test(content) && !/<(path|circle|rect|polygon|line|polyline)\b/i.test(content.replace(/<rect[^>]*width="900"[^>]*>/i, ""));
}

function hasWebsiteStructure(content: string) {
  return /aria-label="nav"/i.test(content) && /aria-label="hero"/i.test(content) && /aria-label="sections"/i.test(content) && /Voir la collection|Acheter|CTA|Contact/i.test(content);
}

export function scoreCandidate(candidate: AgentCandidate, workOrder: WorkOrder, previousDeliverable?: PreviousDeliverable | null): CandidateScore {
  const content = candidate.content;
  const brand = workOrder.brandName ?? candidate.brandName ?? "";
  const brandRegex = brand ? new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
  const criticalIssues = [
    ...(/Brand system/i.test(content) ? ["brand-system-output"] : []),
    ...(/Marque à nommer/i.test(content) ? ["brand-placeholder-output"] : []),
    ...(candidate.deliverableType === "logo" && isTextOnlyLogo(content) ? ["text-only-logo"] : []),
    ...(brandRegex && !brandRegex.test(content) && !new RegExp(`>${brand.slice(0, 2)}<|>${brand.slice(0, 1)}<`, "i").test(content) ? ["brand-missing"] : []),
    ...(brand.toUpperCase() === "EKIDA" && />B<|>A</.test(content) ? ["wrong-generic-initial"] : []),
    ...(workOrder.requestType === "website" && !hasWebsiteStructure(content) ? ["website-structure-missing"] : []),
    ...(workOrder.requestType === "website" && previousDeliverable?.primaryVisual && content === previousDeliverable.primaryVisual ? ["recycled-primary-output"] : []),
    ...(includesInternals(content) ? ["simple-mode-internals"] : []),
    ...(!/viewBox=/i.test(content) ? ["viewbox-missing"] : []),
  ];
  const dimensions = {
    requestFit: criticalIssues.includes("website-structure-missing") || criticalIssues.includes("brand-system-output") ? 35 : 92,
    brandFit: criticalIssues.includes("brand-missing") || criticalIssues.includes("brand-placeholder-output") ? 30 : 94,
    originality: candidate.title.toLowerCase().includes("wordmark") ? 82 : 90,
    visualStructure: criticalIssues.includes("text-only-logo") ? 25 : workOrder.requestType === "website" ? 94 : 91,
    technicalValidity: criticalIssues.includes("viewbox-missing") ? 30 : 94,
    noPlaceholder: criticalIssues.some((issue) => /placeholder|brand-system|text-only/.test(issue)) ? 25 : 95,
    noRecycledOutput: criticalIssues.includes("recycled-primary-output") ? 0 : 100,
    simpleModeSafety: criticalIssues.includes("simple-mode-internals") ? 20 : 100,
  };
  const total = Math.round(Object.values(dimensions).reduce((sum, value) => sum + value, 0) / Object.values(dimensions).length);
  return { candidateId: candidate.id, total, dimensions, criticalIssues };
}
