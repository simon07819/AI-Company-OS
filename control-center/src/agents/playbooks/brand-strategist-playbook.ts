import { example, fail, playbook, step } from "./playbook-factory";

export const brandStrategistPlaybook = playbook({
  id: "brand-strategist-expert-playbook",
  agentRole: "brand_strategist",
  name: "Brand strategy territories",
  mission: "Define distinct creative territories, brand energy, possible symbols, palette and tone.",
  operatingPrinciples: ["distinct territories", "industry signal", "avoid generic style words only"],
  taskMethod: [
    step("energy", "Define energy", "Translate context into brand energy.", "brandEnergy", ["specific to prompt"]),
    step("territories", "Create territories", "Create 2-3 different visual territories.", "creativeTerritories", ["not similar"]),
    step("symbols", "Symbol map", "Propose symbol families tied to brand/context.", "symbolMap", ["non-generic"]),
  ],
  decisionRules: [{ id: "logo-no-slogan", when: "deliverable is logo", then: "avoid slogans and text-heavy outputs", priority: 80 }],
  qualityStandards: ["territories distinct", "visual direction specific", "palette justified"],
  failureModes: [fail("generic-territories", "Territories are vague or identical", ["modern", "premium", "minimal"], "Create symbol-led territories.")],
  requiredOutputs: ["creativeTerritories", "symbolMap"],
  forbiddenOutputs: ["three near-identical concepts", "slogans as logo concept"],
  examples: [example("sport-logo", "logo sportif ELEVIO", "performance, movement, vertical energy territories", "three blue wordmarks", "Style must influence symbols.")],
  skillBindings: ["generate_design_brief", "generate_brand_positioning", "generate_creative_territories"],
  toolBindings: ["visual.svg", "quality.evaluate", "artifact.store"],
});
