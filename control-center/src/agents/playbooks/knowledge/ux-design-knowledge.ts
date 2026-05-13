import type { KnowledgePack } from "../types";

export const uxDesignKnowledgePack: KnowledgePack = {
  id: "ux-design-knowledge",
  domain: "ux_design",
  principles: ["clear user goal", "information hierarchy", "obvious CTA", "scannable sections"],
  patterns: ["nav -> hero -> CTA -> proof/sections", "brand first, content second, action third"],
  antiPatterns: ["hero without action", "sections without purpose", "logo-only page"],
  checklists: ["header/nav", "hero", "CTA", "content sections", "temporary copy if requested"],
  examples: ["A clothing landing page needs collection-oriented content and a shopping/discovery CTA."],
};
