export const qualityKnowledge = {
  principles: [
    "Approve only the deliverable requested in the current prompt.",
    "Reject placeholders and old outputs reused as a primary result.",
    "Keep process, score, artifacts and runtime data out of simple chat.",
    "Require a primary artifact for every approved mission.",
  ],
  failureModes: [
    "Brand system visible",
    "unnamed brand placeholder visible",
    "score visible in simple chat",
    "artifact grid visible in simple chat",
    "previous primary visual leaked",
  ],
  qualityChecklist: ["current request match", "no internals in simple output", "artifact exists", "not recycled"],
};
