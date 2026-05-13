import type { SkillCandidate } from "../types";

const createdAt = "2026-05-13T00:00:00.000Z";

export const routingSkillCandidates: SkillCandidate[] = [
  {
    id: "improved_brand_name_extraction",
    name: "Improved brand name extraction",
    description: "Extracts brand names without absorbing background, style, audience or full-sentence context.",
    sourceType: "eval_failure",
    targetAgentRoles: ["product_owner", "ceo"],
    targetSkillIds: ["parse_user_request", "extract_brand_name"],
    deliverableTypes: ["logo", "website", "landing_page"],
    expectedImprovement: "Correctly extract EKIDA, ELEVIO, NOVARA and PROSHOTS while preserving context separately.",
    riskLevel: "low",
    licenseRisk: "low",
    status: "approved",
    implementationPlan: ["Prioritize explicit brand tokens", "Strip background/style/audience clauses", "Never emit fallback when prompt contains a clear brand"],
    testPlan: ["Run EKIDA, EKIDA black, ELEVIO sport and PROSHOTS photographer benchmarks"],
    promotionCriteria: ["No Marque à nommer regression", "PROSHOTS not extracted as full sentence", "Website prompt keeps EKIDA as brand"],
    rollbackPlan: ["Disable candidate promotion and return to baseline parser"],
    createdAt,
  },
  {
    id: "strict_visual_deliverable_router",
    name: "Strict visual deliverable router",
    description: "Routes website/page/landing requests to website workflow even when the prompt mentions a logo.",
    sourceType: "quality_failure",
    targetAgentRoles: ["ceo"],
    targetSkillIds: ["route_workflow", "select_workflow", "create_work_order"],
    deliverableTypes: ["logo", "website", "landing_page"],
    expectedImprovement: "Prevent website requests from being answered with a previous logo primary visual.",
    riskLevel: "low",
    licenseRisk: "low",
    status: "approved",
    implementationPlan: ["Give website keywords priority", "Record logo as asset request", "Forbid previous logo as primary when deliverable type changes"],
    testPlan: ["Run website-after-logo routing benchmark", "Assert kind website_preview"],
    promotionCriteria: ["No website-to-logo regression", "No stale primaryVisual reuse"],
    rollbackPlan: ["Remove candidate from promoted Skill Lab registry"],
    createdAt,
  },
];

