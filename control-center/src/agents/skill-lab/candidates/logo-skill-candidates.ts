import type { SkillCandidate } from "../types";

const createdAt = "2026-05-13T00:00:00.000Z";

export const logoSkillCandidates: SkillCandidate[] = [
  {
    id: "multi_concept_logo_generation",
    name: "Multi-concept logo generation",
    description: "Forces logo work to generate distinct monogram, symbol, badge, wordmark and dynamic concepts before selection.",
    sourceType: "quality_failure",
    targetAgentRoles: ["logo_designer", "creative_director"],
    targetSkillIds: ["generate_logo_concepts", "compose_monogram", "compose_symbol", "compose_badge"],
    deliverableTypes: ["logo"],
    expectedImprovement: "Reduce text-only and random-initial logos by requiring several structured concepts.",
    riskLevel: "low",
    licenseRisk: "low",
    status: "approved",
    implementationPlan: ["Add concept diversity constraints", "Reject unrelated initials", "Expose candidate count only in hidden details"],
    testPlan: ["Run EKIDA, EKIDA black background and PROSHOTS logo benchmarks", "Assert no text-only candidate is promoted"],
    promotionCriteria: ["At least one logo benchmark improvement", "No simple mode leak", "No wrong initial regression"],
    rollbackPlan: ["Disable candidate promotion in the Skill Lab active registry"],
    createdAt,
  },
  {
    id: "svg_logo_quality_renderer",
    name: "SVG logo quality renderer",
    description: "Tightens SVG rendering requirements: viewBox, centering, responsive fit, requested background and no script.",
    sourceType: "quality_failure",
    targetAgentRoles: ["svg_illustrator", "quality_director"],
    targetSkillIds: ["render_svg_logo", "validate_svg_viewbox", "fit_svg_content"],
    deliverableTypes: ["logo"],
    expectedImprovement: "Prevent clipped, unsafe or background-mismatched logo SVGs.",
    riskLevel: "low",
    licenseRisk: "low",
    status: "approved",
    implementationPlan: ["Make viewBox mandatory", "Apply requested background", "Sanitize SVG before artifact creation"],
    testPlan: ["Assert viewBox exists", "Assert black background is respected", "Assert no script/foreignObject leaks"],
    promotionCriteria: ["All SVG safety checks pass", "No regression on logo artifact builder"],
    rollbackPlan: ["Remove candidate from promoted Skill Lab registry"],
    createdAt,
  },
];

