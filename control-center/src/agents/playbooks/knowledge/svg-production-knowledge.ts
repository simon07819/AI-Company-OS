import type { KnowledgePack } from "../types";

export const svgProductionKnowledgePack: KnowledgePack = {
  id: "svg-production-knowledge",
  domain: "svg_production",
  principles: ["viewBox required", "centered content", "safe SVG", "no clipping", "background respected"],
  patterns: ["role img + aria-label", "composed paths plus brand text", "responsive viewBox"],
  antiPatterns: ["script", "dangerous foreignObject", "missing viewBox", "text clipped", "decorative card without mark"],
  checklists: ["viewBox", "safe elements", "brand visible", "symbol present", "background correct"],
  examples: ["Black background requests should include a real dark rect, not text saying black background."],
};
