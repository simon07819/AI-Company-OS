import type { KnowledgePack } from "../types";

export const frontendPreviewKnowledgePack: KnowledgePack = {
  id: "frontend-preview-knowledge",
  domain: "frontend_preview",
  principles: ["executable preview", "safe markup", "responsive framing", "no internal data"],
  patterns: ["SVG preview with semantic aria labels", "HTML/React preview when supported"],
  antiPatterns: ["JSON as visible output", "README as visible output", "workspace link as main answer", "logo-only website"],
  checklists: ["safe preview", "nav/hero/sections", "CTA", "no script", "no process text"],
  examples: ["WebsitePreviewReply receives the page preview, not an artifact grid."],
};
