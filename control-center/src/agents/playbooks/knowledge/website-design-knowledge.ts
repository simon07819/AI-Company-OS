import type { KnowledgePack } from "../types";

export const websiteDesignKnowledgePack: KnowledgePack = {
  id: "website-design-knowledge",
  domain: "website_design",
  principles: ["visual hierarchy", "responsive preview", "brand coherence", "spacing discipline"],
  patterns: ["structured page preview", "brand asset as secondary element", "CTA visible inside hero"],
  antiPatterns: ["only a logo", "old logo recycled as full page", "no CTA", "no section", "process visible"],
  checklists: ["nav present", "hero present", "CTA present", "sections present", "brand visible", "not logo-only"],
  examples: ["A page web with logo EKIDA should show a web page and can place the logo in nav."],
};
