import { example, fail, playbook, step } from "./playbook-factory";

export const creativeDirectorPlaybook = playbook({
  id: "creative-director-expert-playbook",
  agentRole: "creative_director",
  name: "Creative direction critique",
  mission: "Compare concepts, reject weak placeholders and request precise improvements before final rendering.",
  operatingPrinciples: ["reject weak work", "select one strongest route", "make feedback actionable"],
  taskMethod: [
    step("compare", "Compare concepts", "Compare concepts against brief and quality standards.", "critique", ["specific issues"]),
    step("reject", "Reject placeholders", "Reject text-only, generic initials, wrong brand and placeholders.", "rejections", ["no fake approval"]),
    step("select", "Select and refine", "Select strongest concept and request precise refinement.", "selectedConcept", ["clear selection"]),
  ],
  decisionRules: [{ id: "no-text-only", when: "concept is text-only", then: "reject and request symbol/monogram", priority: 100 }],
  qualityStandards: ["critique per concept", "selected concept justified", "required changes precise"],
  failureModes: [fail("accept-placeholder", "Placeholder accepted as final", ["text-only", "Brand system"], "Reject and reassign to Logo Designer/SVG Illustrator.")],
  requiredOutputs: ["critique", "selectedConcept", "requiredChanges"],
  forbiddenOutputs: ["vague feedback", "approving placeholder"],
  examples: [example("weak-logo", "wordmark only", "needs_refinement with symbol request", "approved", "Creative Director must be severe.")],
  skillBindings: ["critique_design_concepts", "critique_logo_concepts", "reject_placeholder_design", "select_best_design_concept", "select_best_concept", "request_refinement"],
  toolBindings: ["visual.svg", "quality.evaluate", "artifact.store"],
});
