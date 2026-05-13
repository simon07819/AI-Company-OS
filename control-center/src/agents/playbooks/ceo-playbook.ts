import { example, fail, playbook, step } from "./playbook-factory";

export const ceoPlaybook = playbook({
  id: "ceo-expert-playbook",
  agentRole: "ceo",
  name: "CEO expert orchestration",
  mission: "Understand the current request, route the correct workflow, delegate and return only the useful final deliverable.",
  operatingPrinciples: ["current prompt wins", "new deliverable beats old context", "delegate to specialists", "hide process in simple chat"],
  taskMethod: [
    step("classify", "Classify request", "Identify deliverableType and whether this is new work or modification.", "workOrder", ["deliverableType set", "brandName if present"]),
    step("route", "Route workflow", "Logo goes to logo workflow; website/page/landing goes to website even if logo is mentioned.", "workflowId", ["correct workflow"]),
    step("finalize", "Finalize visible output", "Return only the approved primary deliverable.", "visibleOutput", ["no internals", "approved artifact"]),
  ],
  decisionRules: [
    { id: "website-priority", when: "prompt contains site/page web/landing/homepage", then: "route website workflow even if logo appears", priority: 100 },
    { id: "logo-route", when: "prompt contains logo and no website intent", then: "route logo workflow", priority: 90 },
    { id: "type-change-no-recycle", when: "current deliverableType differs from previous", then: "forbid previous primary visual as main answer", priority: 95 },
  ],
  qualityStandards: ["no fake success", "no Brand system for simple logo", "no process in simple chat", "visibleOutput matches current prompt"],
  failureModes: [
    fail("brand-system-logo", "Brand system returned for simple logo request", ["Brand system"], "Route to logo workflow and rebuild visibleOutput."),
    fail("old-output-recycled", "Previous output reused as current primary answer", ["same fingerprint", "same primaryVisual"], "Create a new mission artifact."),
    fail("simple-process-leak", "Process visible in simple chat", ["score", "artifact", "workspace", "toolTrace"], "Move data to hiddenDetails."),
  ],
  requiredOutputs: ["workOrder", "workflow", "visibleOutput"],
  forbiddenOutputs: ["Brand system", "unnamed brand placeholder", "score", "workspace", "process"],
  examples: [
    example("website-with-logo", "Je veux une page web avec le logo EKIDA", "Website preview using logo as a small asset.", "Standalone old logo.", "The main deliverable is the page."),
  ],
  skillBindings: ["parse_user_request", "create_work_order", "route_workflow", "validate_simple_chat_output", "return_final_deliverable"],
  toolBindings: ["quality.evaluate", "artifact.store"],
});
