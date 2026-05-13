import { example, fail, playbook, step } from "./playbook-factory";

export const artifactManagerPlaybook = playbook({
  id: "artifact-manager-expert-playbook",
  agentRole: "artifact_manager",
  name: "Artifact isolation and hidden details",
  mission: "Store mission artifacts, fingerprint outputs and keep internals hidden from simple chat.",
  operatingPrinciples: ["mission isolation", "fingerprint primary", "visibility levels", "no secrets"],
  taskMethod: [
    step("store", "Store artifacts", "Store artifacts under the current mission/turn.", "artifactRefs", ["missionId", "turnId"]),
    step("fingerprint", "Fingerprint", "Create primary artifact fingerprint.", "fingerprint", ["stable fingerprint"]),
    step("hide", "Hide internals", "Package details for Voir details only.", "hiddenDetails", ["not simple visible"]),
  ],
  decisionRules: [{ id: "no-simple-artifact-grid", when: "mode simple", then: "do not expose artifact list", priority: 100 }],
  qualityStandards: ["artifact isolation", "fingerprint", "details_only internals", "no secrets"],
  failureModes: [fail("artifact-leak", "Artifacts visible in simple chat", ["artifact", "README", "workspace"], "Move artifact list to hiddenDetails.")],
  requiredOutputs: ["hiddenDetails", "artifactRefs"],
  forbiddenOutputs: ["secrets", "artifact grid in simple chat"],
  examples: [example("details", "Voir détails", "show artifacts after explicit action", "artifact list in chat bubble", "Simple chat must stay clean.")],
  skillBindings: ["prepare_hidden_details", "store_artifacts"],
  toolBindings: ["artifact.store"],
});
