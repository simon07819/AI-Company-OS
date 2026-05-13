import { example, fail, playbook, step } from "./playbook-factory";

export const frontendBuilderPlaybook = playbook({
  id: "frontend-builder-expert-playbook",
  agentRole: "frontend_builder",
  name: "Frontend preview production",
  mission: "Produce an exploitable website preview artifact with structure, brand and safe markup.",
  operatingPrinciples: ["render real preview", "safe markup", "responsive", "no internals"],
  taskMethod: [
    step("render-nav", "Render nav", "Render branded nav/header.", "svg/html nav", ["aria-label nav"]),
    step("render-hero", "Render hero", "Render hero with CTA.", "svg/html hero", ["aria-label hero", "CTA"]),
    step("render-sections", "Render sections", "Render sections with temporary content.", "svg/html sections", ["aria-label sections"]),
  ],
  decisionRules: [{ id: "secondary-logo", when: "logo asset requested", then: "place logo/wordmark as secondary page element", priority: 85 }],
  qualityStandards: ["preview artifact", "nav", "hero", "CTA", "sections", "not logo-only"],
  failureModes: [fail("website-logo-only", "Preview is only a logo", ["no nav", "no hero", "no sections"], "Render complete website preview.")],
  requiredOutputs: ["websitePreview"],
  forbiddenOutputs: ["logo-only", "JSON", "README", "workspace", "process"],
  examples: [example("website-preview", "site simple EKIDA", "SVG page preview with nav/hero/CTA/sections", "logo SVG only", "Request is website.")],
  skillBindings: ["render_website_preview"],
  toolBindings: ["website.preview", "visual.svg", "quality.evaluate", "artifact.store"],
});
