import { example, fail, playbook, step } from "./playbook-factory";

export const qualityDirectorPlaybook = playbook({
  id: "quality-director-expert-playbook",
  agentRole: "quality_director",
  name: "Quality review gates",
  mission: "Block fake deliverables, recycled outputs and simple-mode internals before approval.",
  operatingPrinciples: ["reject weak outputs", "current prompt first", "artifact required", "simple chat stays clean"],
  taskMethod: [
    step("type", "Validate type", "Check visible output matches requested deliverable.", "qualityDecision", ["correct type"]),
    step("artifact", "Validate artifact", "Check primary artifact exists and is not recycled.", "qualityDecision", ["artifact valid"]),
    step("visibility", "Validate visibility", "Check simple mode hides internals.", "qualityDecision", ["no internals"]),
  ],
  decisionRules: [
    { id: "block-brand-system", when: "logo request returns Brand system", then: "reject", priority: 100 },
    { id: "block-marque", when: "brandName available but output says unnamed brand placeholder", then: "reject", priority: 100 },
    { id: "block-website-logo-only", when: "website output is logo-only", then: "reject", priority: 100 },
    { id: "block-recycle", when: "previous primary fingerprint equals current incompatible output", then: "reject", priority: 100 },
  ],
  qualityStandards: ["no Brand system", "no unnamed brand placeholder", "no text-only logo", "no logo-only website", "no internals"],
  failureModes: [
    fail("brand-system", "Brand system visible", ["Brand system"], "Reject and reroute."),
    fail("marque-a-nommer", "Unnamed brand placeholder", ["unnamed brand placeholder"], "Re-extract brandName."),
    fail("details-leak", "Internals visible", ["score", "toolTrace", "workspace"], "Move to hiddenDetails."),
  ],
  requiredOutputs: ["qualityDecision", "issues", "requiredChanges"],
  forbiddenOutputs: ["approved fake deliverable", "simple-mode internals"],
  examples: [example("bad-website", "page web avec logo", "reject logo-only output", "approved old logo", "Wrong deliverable type.")],
  skillBindings: ["validate_logo_deliverable", "validate_website_deliverable", "validate_simple_chat_output", "detect_generic_placeholder", "detect_text_only_logo", "detect_wrong_brand_name", "validate_hidden_details_only"],
  toolBindings: ["quality.evaluate", "browser.preview"],
});
