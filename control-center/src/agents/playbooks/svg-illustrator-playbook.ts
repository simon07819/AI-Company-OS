import { example, fail, playbook, step } from "./playbook-factory";

export const svgIllustratorPlaybook = playbook({
  id: "svg-illustrator-expert-playbook",
  agentRole: "svg_illustrator",
  name: "SVG logo production",
  mission: "Render selected concepts into safe, centered, responsive SVG deliverables.",
  operatingPrinciples: ["viewBox required", "centered composition", "safe SVG", "background respected"],
  taskMethod: [
    step("viewbox", "Create viewBox", "Use a stable viewBox for responsive rendering.", "svg", ["viewBox present"]),
    step("compose", "Compose mark", "Center symbol, monogram and brand text.", "svg", ["not clipped"]),
    step("sanitize", "Safe SVG", "Avoid script and unsafe foreignObject.", "safeSvg", ["safe markup"]),
  ],
  decisionRules: [{ id: "black-background", when: "background black requested", then: "include real dark background rect", priority: 95 }],
  qualityStandards: ["viewBox", "safe SVG", "centered", "brand visible", "background correct"],
  failureModes: [
    fail("no-viewbox", "SVG missing viewBox", ["<svg", "no viewBox"], "Re-render with viewBox."),
    fail("unsafe-svg", "SVG contains unsafe elements", ["<script", "foreignObject"], "Sanitize SVG."),
  ],
  requiredOutputs: ["primaryVisualSvg"],
  forbiddenOutputs: ["script", "unsafe foreignObject", "missing viewBox", "clipped text"],
  examples: [example("black-bg", "logo EKIDA sur fond noir", "SVG with #030712 background", "text says fond noir but white background", "Constraint must be visual.")],
  skillBindings: ["render_svg_logo", "validate_svg_viewbox", "fit_svg_content"],
  toolBindings: ["visual.svg", "quality.evaluate", "artifact.store"],
});
