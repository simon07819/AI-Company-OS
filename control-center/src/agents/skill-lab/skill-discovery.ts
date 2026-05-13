import { failurePatterns } from "@/agents/coaching/failure-patterns";
import type { AgentLesson } from "@/agents/coaching/types";
import { listSkillCandidates } from "./skill-candidate-registry";
import type { SkillCandidate } from "./types";

export function discoverSkillCandidates(context?: {
  lessons?: AgentLesson[];
  evalFailures?: string[];
  qualityFailures?: string[];
  candidateRejections?: string[];
  playbookGaps?: string[];
  manualIdeas?: string[];
}) {
  const signals = [
    ...(context?.lessons ?? []).map((lesson) => lesson.failurePattern),
    ...(context?.evalFailures ?? []),
    ...(context?.qualityFailures ?? []),
    ...(context?.candidateRejections ?? []),
    ...(context?.playbookGaps ?? []),
    ...(context?.manualIdeas ?? []),
  ].join("\n");
  if (!signals.trim()) return listSkillCandidates();

  const candidates = new Set<SkillCandidate>();
  const add = (id: string) => {
    const found = listSkillCandidates().find((candidate) => candidate.id === id);
    if (found) candidates.add(found);
  };

  if (/brand|PROSHOTS|Marque à nommer|full sentence/i.test(signals) || signals.includes(failurePatterns.brandNameFullSentence)) add("improved_brand_name_extraction");
  if (/route|website|page web|landing|logo-only/i.test(signals) || signals.includes(failurePatterns.websiteLogoOnly)) add("strict_visual_deliverable_router");
  if (/text-only|wrong initial|unrelated|B générique/i.test(signals) || signals.includes(failurePatterns.textOnlyLogo)) add("multi_concept_logo_generation");
  if (/viewBox|fond noir|background|svg/i.test(signals) || signals.includes(failurePatterns.missingBlackBackground)) add("svg_logo_quality_renderer");
  if (/header|hero|CTA|sections|website_missing|logo-only|logo only/i.test(signals) || signals.includes(failurePatterns.websiteMissingStructure)) add("website_preview_structure_builder");
  if (/simple mode|process|score|artifact|toolTrace|benchmark/i.test(signals)) add("simple_mode_visibility_guard");
  if (/previous|recycled|ancien|reuse/i.test(signals) || signals.includes(failurePatterns.previousVisualRecycled)) add("previous_deliverable_reuse_guard");

  return candidates.size ? Array.from(candidates) : listSkillCandidates();
}
