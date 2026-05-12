import type { LogoConcept } from "./brandSchemas";

export function generateLogoImagePrompt(concept: LogoConcept): string {
  const colors = concept.palette.map((color) => `${color.name} ${color.hex}`).join(", ");
  return [
    `Create a premium vector-style logo concept for ${concept.brandName}.`,
    `Direction: ${concept.title}.`,
    `Style keywords: ${concept.keywords.join(", ")}.`,
    `Use palette: ${colors}.`,
    `Typography recommendation: ${concept.typography}.`,
    `Design rationale: ${concept.rationale}.`,
    "Make it suitable for web, vehicles, uniforms, signage and proposal documents.",
    "No mockup scene, no stock photo, no copied stock mark, clean brand presentation.",
  ].join(" ");
}
