import type { SkillCandidate } from "../types";

const createdAt = "2026-05-13T00:00:00.000Z";

export const memorySkillCandidates: SkillCandidate[] = [
  {
    id: "previous_deliverable_reuse_guard",
    name: "Previous deliverable reuse guard",
    description: "Allows previous artifacts only for explicit compatible edits or secondary assets, never stale primary outputs.",
    sourceType: "internal_lesson",
    targetAgentRoles: ["ceo", "quality_director", "artifact_manager"],
    targetSkillIds: ["decide_previous_deliverable_reuse", "validate_logo_deliverable", "validate_website_deliverable"],
    deliverableTypes: ["logo", "website", "landing_page"],
    expectedImprovement: "Prevent old logo artifacts from becoming the primary response to a new website mission.",
    riskLevel: "low",
    licenseRisk: "low",
    status: "approved",
    implementationPlan: ["Compare deliverable types", "Forbid previous primary fingerprints on type change", "Permit logo only as secondary website asset"],
    testPlan: ["Run logo-to-website and new-brand-after-logo memory benchmarks"],
    promotionCriteria: ["No previous primaryVisual leak", "Compatible logo modification still works"],
    rollbackPlan: ["Disable candidate promotion and use baseline memory policy"],
    createdAt,
  },
];

