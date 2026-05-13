import { playbookRegistry } from "./registry";

export function loadAgentPlaybook(agentRole: string) {
  return playbookRegistry[agentRole as keyof typeof playbookRegistry] ?? null;
}

export function listAgentPlaybooks() {
  return Object.values(playbookRegistry);
}
