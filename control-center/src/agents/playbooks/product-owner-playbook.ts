import { example, fail, playbook, step } from "./playbook-factory";

export const productOwnerPlaybook = playbook({
  id: "product-owner-expert-playbook",
  agentRole: "product_owner",
  name: "Product owner brief extraction",
  mission: "Extract the real user goal, brandName, deliverable type, constraints and acceptance criteria.",
  operatingPrinciples: ["separate name from descriptors", "make briefs testable", "preserve exact brand casing"],
  taskMethod: [
    step("extract-type", "Extract deliverable type", "Detect logo vs website vs app.", "deliverableType", ["website terms have priority over logo asset terms"]),
    step("extract-brand", "Extract brand", "Keep only the brandName, not background/style/audience.", "brandName", ["no descriptor in brandName"]),
    step("criteria", "Acceptance criteria", "Turn prompt into measurable checks.", "acceptanceCriteria", ["testable criteria"]),
  ],
  decisionRules: [
    { id: "no-background-name", when: "prompt says sur fond noir/en noir", then: "store as background constraint, not brandName", priority: 100 },
    { id: "no-audience-name", when: "prompt says pour photographes sportifs", then: "store as context, not brandName", priority: 100 },
  ],
  qualityStandards: ["brandName exact", "deliverableType correct", "constraints separated", "acceptance criteria explicit"],
  failureModes: [
    fail("marque-a-nommer", "Fallback brand used despite visible name", ["unnamed brand placeholder"], "Re-run extraction from prompt tokens."),
    fail("descriptor-in-brand", "Descriptor included in brandName", ["sur fond noir", "photographes sportifs"], "Move descriptor to constraints/context."),
  ],
  requiredOutputs: ["brief", "constraints", "acceptanceCriteria"],
  forbiddenOutputs: ["unnamed brand placeholder when a name is present", "sur fond noir in brandName", "photographes sportifs in brandName"],
  examples: [example("proshots", "fais-moi un logo pour PROSHOTS ses des photographes sportifs", "brandName PROSHOTS, context photo/sport", "brandName PROSHOTS ses des photographes sportifs", "Audience is context.")],
  skillBindings: ["parse_user_request", "generate_design_brief", "generate_website_brief", "extract_brand_name", "extract_visual_constraints", "write_design_brief"],
  toolBindings: ["artifact.store"],
});
