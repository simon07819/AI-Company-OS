import { getAgentMethod } from "./agent-methods";
import type { AgentBrainInput, AgentBrainOutput } from "./types";

function taskId(task: unknown) {
  return typeof task === "object" && task && "id" in task ? String((task as { id?: unknown }).id ?? "") : undefined;
}

export function runAgentBrain(input: AgentBrainInput): AgentBrainOutput {
  const method = getAgentMethod(input.agentRole);
  const requiredSkillCalls = input.availableSkills.slice(0, 3);
  const requiredToolCalls = input.availableTools.slice(0, 3);
  return {
    agentRole: input.agentRole,
    taskId: taskId(input.task),
    methodId: method?.id,
    plan: method?.steps ?? ["Inspect task", "Produce typed output", "Validate against quality checklist"],
    decisions: [
      method ? `Use method: ${method.name}` : "Use default structured execution method",
      input.mode === "validate" ? "Prioritize rejection over weak approval" : "Produce only the expected task output",
    ],
    requiredSkillCalls,
    requiredToolCalls,
    expectedOutputShape: method?.requiredOutputs.join(", ") ?? "typed task output",
    qualityChecklist: method?.qualityChecklist ?? ["output exists", "no simple-mode internals"],
    refusalReasons: method ? [] : [`No dedicated method for ${input.agentRole}`],
  };
}
