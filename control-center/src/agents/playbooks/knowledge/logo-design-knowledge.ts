import type { KnowledgePack } from "../types";

export const logoDesignKnowledgePack: KnowledgePack = {
  id: "logo-design-knowledge",
  domain: "logo_design",
  principles: ["simplicity", "readability", "contrast", "scalability", "composition", "monogram", "symbol", "brandName coherence"],
  patterns: ["monogram built from brand initials", "dynamic symbol tied to industry", "badge or emblem with clear geometry"],
  antiPatterns: ["text-only without graphic work", "generic unrelated letter", "decorative card", "Brand system instead of logo", "wrong brand name", "SVG without viewBox"],
  checklists: ["correct brand", "requested background respected", "viewBox present", "symbol or monogram present", "not clipped"],
  examples: ["EKIDA should use EKIDA, EK or E.", "PROSHOTS should use PROSHOTS, PS/P, camera, viewfinder or sport movement."],
};
