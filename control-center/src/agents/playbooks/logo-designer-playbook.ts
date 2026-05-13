import { example, fail, playbook, step } from "./playbook-factory";

export const logoDesignerPlaybook = playbook({
  id: "logo-designer-expert-playbook",
  agentRole: "logo_designer",
  name: "Logo design production",
  mission: "Produce distinct logo concepts with monogram, symbol and badge/emblem options.",
  operatingPrinciples: ["symbol before decoration", "brand initials must match", "composition over text-only", "three distinct concepts"],
  taskMethod: [
    step("monogram", "Monogram concept", "Build a mark from relevant brand letters.", "DesignConcept", ["uses correct letters"]),
    step("symbol", "Symbol concept", "Create an industry/context symbol.", "DesignConcept", ["context-specific"]),
    step("badge", "Badge concept", "Create a contained emblem or badge composition.", "DesignConcept", ["composition present"]),
  ],
  decisionRules: [
    { id: "ekida-letters", when: "brandName is EKIDA", then: "use EKIDA, EK or E, never A/B", priority: 100 },
    { id: "proshots-photo", when: "brandName is PROSHOTS", then: "use PROSHOTS, PS/P or camera/viewfinder/sport signal", priority: 100 },
  ],
  qualityStandards: ["3 concepts", "symbolDescription", "composition", "palette", "typography", "SVG draft"],
  failureModes: [
    fail("text-only-logo", "Logo is only text typed in a font", ["single text node", "no paths"], "Add a symbol or monogram composition."),
    fail("wrong-initial", "Initial does not belong to brand", [">A<", ">B<"], "Use correct brand initials."),
  ],
  requiredOutputs: ["DesignConcept[]", "svgDrafts"],
  forbiddenOutputs: ["text-only", "generic unrelated initial", "decorative card"],
  examples: [example("ekida", "logo EKIDA", "EK monogram with geometric symbol", "B icon with EKIDA text", "B is unrelated to EKIDA.")],
  skillBindings: ["generate_logo_concepts", "compose_symbol", "compose_monogram", "compose_badge"],
  toolBindings: ["visual.svg", "quality.evaluate", "artifact.store"],
});
