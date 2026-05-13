import type { SkillCandidate } from "../types";

const createdAt = "2026-05-13T00:00:00.000Z";

export const websiteSkillCandidates: SkillCandidate[] = [
  {
    id: "website_preview_structure_builder",
    name: "Website preview structure builder",
    description: "Requires website previews to contain header/nav, hero, CTA, sections and contextual temporary copy.",
    sourceType: "eval_failure",
    targetAgentRoles: ["ux_designer", "web_designer", "frontend_builder"],
    targetSkillIds: ["generate_website_wireframe", "render_website_preview"],
    deliverableTypes: ["website", "landing_page"],
    expectedImprovement: "Block logo-only website outputs and strengthen first-pass page previews.",
    riskLevel: "low",
    licenseRisk: "low",
    status: "approved",
    implementationPlan: ["Add strict page structure requirements", "Treat requested logo as secondary asset", "Validate preview structure before final output"],
    testPlan: ["Run website-after-logo and direct EKIDA website benchmarks", "Assert header/hero/CTA/sections"],
    promotionCriteria: ["Website benchmarks pass", "Previous logo is not primary output", "No simple mode leak"],
    rollbackPlan: ["Disable candidate promotion and use baseline website builder"],
    createdAt,
  },
];

