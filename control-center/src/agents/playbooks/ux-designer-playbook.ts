import { example, fail, playbook, step } from "./playbook-factory";

export const uxDesignerPlaybook = playbook({
  id: "ux-designer-expert-playbook",
  agentRole: "ux_designer",
  name: "UX page structure",
  mission: "Create page structure with header/nav, hero, CTA, sections and coherent temporary content.",
  operatingPrinciples: ["user goal first", "clear hierarchy", "CTA visible", "logo is secondary asset"],
  taskMethod: [
    step("nav", "Header/nav", "Define simple page navigation.", "nav", ["brand visible"]),
    step("hero", "Hero", "Define hero value and CTA.", "hero", ["CTA present"]),
    step("sections", "Sections", "Define content sections matching industry.", "sections", ["domain relevant"]),
  ],
  decisionRules: [{ id: "website-not-logo", when: "website requested with logo", then: "logo may be header asset, not main output", priority: 100 }],
  qualityStandards: ["nav", "hero", "CTA", "sections", "temporary copy if requested"],
  failureModes: [fail("logo-only-page", "Website structure replaced by standalone logo", ["only logo"], "Build nav, hero, CTA and sections.")],
  requiredOutputs: ["wireframe", "sections", "CTA"],
  forbiddenOutputs: ["logo-only website", "missing CTA"],
  examples: [example("ekida-site", "page web avec logo EKIDA", "landing structure for clothing company", "full-screen logo only", "Website needs page structure.")],
  skillBindings: ["generate_website_wireframe"],
  toolBindings: ["website.preview", "artifact.store"],
});
