import type { SkillCandidate } from "../types";

const createdAt = "2026-05-13T00:00:00.000Z";

export const qualitySkillCandidates: SkillCandidate[] = [
  {
    id: "simple_mode_visibility_guard",
    name: "Simple mode visibility guard",
    description: "Blocks score, artifacts, traces, candidates, coaching and benchmark data from simple chat output.",
    sourceType: "quality_failure",
    targetAgentRoles: ["ceo", "quality_director", "artifact_manager"],
    targetSkillIds: ["validate_simple_chat_output", "validate_hidden_details_only", "prepare_hidden_details"],
    deliverableTypes: ["logo", "website", "landing_page", "any"],
    expectedImprovement: "Keep runtime, process and Skill Lab reports behind details only.",
    riskLevel: "low",
    licenseRisk: "low",
    status: "approved",
    implementationPlan: ["Expand forbidden simple mode terms", "Keep Skill Lab reports in hiddenDetails", "Validate visibleOutput before final approval"],
    testPlan: ["Run visibility benchmarks across logo and website prompts"],
    promotionCriteria: ["No simple mode forbidden term appears", "Details remain accessible when explicitly opened"],
    rollbackPlan: ["Disable candidate promotion and keep baseline simple mode guard"],
    createdAt,
  },
];

