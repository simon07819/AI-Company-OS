import type { AgentLesson, SkillOptimizationResult } from "./types";
import { failurePatterns } from "./failure-patterns";

export function optimizeSkillBehavior(input: {
  agentRole: string;
  skillId: string;
  failures?: string[];
  successes?: string[];
  lessons: AgentLesson[];
}): SkillOptimizationResult {
  const patterns = new Set([...(input.failures ?? []), ...input.lessons.map((lesson) => lesson.failurePattern)]);
  const changes: string[] = [];

  if (input.skillId === "generate_logo_concepts" && (patterns.has(failurePatterns.textOnlyLogo) || patterns.has(failurePatterns.wrongInitial))) {
    changes.push("Require multiple concepts with monogram, symbol and badge coverage.");
    changes.push("Forbid unrelated initials in generated concepts.");
  }
  if (input.skillId === "render_svg_logo" && (patterns.has(failurePatterns.missingBlackBackground) || patterns.has(failurePatterns.textOnlyLogo))) {
    changes.push("Require SVG viewBox, composed symbol and requested background.");
  }
  if (input.skillId === "render_website_preview" && (patterns.has(failurePatterns.websiteLogoOnly) || patterns.has(failurePatterns.websiteMissingStructure) || patterns.has(failurePatterns.previousVisualRecycled))) {
    changes.push("Require header/nav, hero, CTA and sections.");
    changes.push("Forbid previous logo as primary website output.");
  }
  if (input.skillId === "parse_user_request" && patterns.has(failurePatterns.brandNameFullSentence)) {
    changes.push("Extract only the explicit uppercase brand token before context text.");
  }

  return {
    agentRole: input.agentRole,
    skillId: input.skillId,
    status: changes.length ? "improved" : "unchanged",
    changes,
    reason: changes.length ? "Lessons matched known skill failure patterns." : "No relevant lesson for this skill.",
  };
}
