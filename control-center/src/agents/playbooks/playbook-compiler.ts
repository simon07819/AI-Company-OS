import { skillRegistry } from "@/agents/registry";
import { toolRegistry } from "@/agents/capabilities/registry";
import type { AgentMethod } from "@/agents/intelligence/types";
import type { AgentPlaybook } from "./types";

export function compilePlaybookIntoAgentMethod(playbook: AgentPlaybook): AgentMethod {
  const missingSkill = playbook.skillBindings.find((skillId) => !skillRegistry[skillId]);
  if (missingSkill) throw new Error(`Playbook ${playbook.id} references missing skill ${missingSkill}`);
  const missingTool = playbook.toolBindings.find((toolId) => !toolRegistry[toolId]);
  if (missingTool) throw new Error(`Playbook ${playbook.id} references missing tool ${missingTool}`);

  return {
    id: `${playbook.id}-compiled-method`,
    agentRole: playbook.agentRole,
    name: playbook.name,
    purpose: playbook.mission,
    steps: playbook.taskMethod.map((step) => step.instruction),
    qualityChecklist: playbook.qualityStandards,
    commonFailureModes: playbook.failureModes.map((mode) => `${mode.id}: ${mode.description}`),
    requiredOutputs: playbook.requiredOutputs,
  };
}
