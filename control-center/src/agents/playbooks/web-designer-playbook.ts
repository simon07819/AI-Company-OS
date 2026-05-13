import { example, fail, playbook, step } from "./playbook-factory";

export const webDesignerPlaybook = playbook({
  id: "web-designer-expert-playbook",
  agentRole: "web_designer",
  name: "Web visual direction",
  mission: "Create visual hierarchy, layout, spacing, palette and responsive preview direction.",
  operatingPrinciples: ["structured layout", "brand coherence", "spacing discipline", "industry fit"],
  taskMethod: [
    step("palette", "Palette", "Choose palette tied to brand and industry.", "palette", ["not arbitrary"]),
    step("layout", "Layout", "Compose nav, hero, CTA and sections.", "layout", ["visual hierarchy"]),
    step("responsive", "Responsive preview", "Keep preview legible and contained.", "previewDirection", ["no clipping"]),
  ],
  decisionRules: [{ id: "no-old-logo-page", when: "previous logo exists", then: "use it only as secondary asset", priority: 90 }],
  qualityStandards: ["hierarchy", "spacing", "palette", "responsive preview", "not logo-only"],
  failureModes: [fail("recycled-logo-page", "Old logo used as whole website", ["same primary visual", "logo-only"], "Rebuild website preview.")],
  requiredOutputs: ["designDirection", "previewDirection"],
  forbiddenOutputs: ["old logo as full page", "process text"],
  examples: [example("apparel", "compagnie de linge", "warm apparel landing page", "generic admin card", "Industry should shape visuals.")],
  skillBindings: ["generate_website_wireframe", "render_website_preview"],
  toolBindings: ["website.preview", "visual.svg", "quality.evaluate", "artifact.store"],
});
