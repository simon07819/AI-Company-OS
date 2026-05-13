import type { KnowledgePack } from "../types";

export const qualityReviewKnowledgePack: KnowledgePack = {
  id: "quality-review-knowledge",
  domain: "quality_review",
  principles: ["current prompt match", "artifact exists", "anti-placeholder", "anti-recycle", "simple mode visibility"],
  patterns: ["rubric before final approval", "reject then refine", "forbid incompatible previous fingerprints"],
  antiPatterns: ["Brand system", "unnamed brand placeholder", "text-only logo", "website logo-only", "score/process visible"],
  checklists: ["no placeholder", "no recycled primary", "no internals", "correct deliverable type", "approved artifact"],
  examples: ["Website after logo must be website_preview and not the previous logo SVG."],
};
