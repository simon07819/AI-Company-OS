import type { BrandBrief, LogoConcept } from "./brandSchemas";
import { buildVisualDirections } from "./visualDirections";

export function generateLogoConcepts(brief: BrandBrief): LogoConcept[] {
  return buildVisualDirections(brief);
}

