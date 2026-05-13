import { createMissionPlan } from "@/agents/runtime/mission-planner";
import type { MissionPlan, WorkOrder } from "@/agents/runtime/types";
import { agentMethods } from "./agent-methods";
import { chooseWorkflowWithPolicy } from "./decision-policy";

export function createMissionPlanWithIntelligence(workOrder: WorkOrder, context?: unknown): MissionPlan {
  const plan = createMissionPlan(workOrder);
  const workflow = chooseWorkflowWithPolicy(workOrder);
  const agents = plan.agents.filter((agent) => agentMethods[agent]);
  return {
    ...plan,
    workflowId: workflow === "clarification" ? plan.workflowId : workflow,
    objective: `${plan.objective}. Methods: ${agents.map((agent) => agentMethods[agent].name).join(" -> ")}`,
    qualityGates: Array.from(new Set([...plan.qualityGates, "critiqueAgentOutput", "createRefinementStrategy"])),
  };
}

export function decomposeTasksWithMethods(plan: MissionPlan) {
  return plan.tasks.map((task) => ({
    taskId: task.id,
    agentRole: task.agentRole,
    methodId: agentMethods[task.agentRole]?.id,
    expectedOutput: task.expectedOutput,
  }));
}
