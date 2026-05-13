import { defaultToolContext, runToolAdapter } from "@/agents/capabilities/registry";
import { coachAgentBeforeTask, compileRuntimePlaybookView, defaultLessonStore, optimizeSkillBehavior, selectLessonsForTask } from "@/agents/coaching";
import type { AgentCoachingProfile, CoachingTraceEntry, SkillOptimizationResult } from "@/agents/coaching/types";
import { getAgentMethod, runAgentBrain, critiqueAgentOutput, createRefinementStrategy } from "@/agents/intelligence";
import type { AgentBrainOutput, CritiqueResult, RefinementStrategy } from "@/agents/intelligence/types";
import { compilePlaybookIntoAgentMethod, loadAgentPlaybook, selectPlaybookForTask } from "@/agents/playbooks";
import type { PlaybookTraceEntry, SelectedAgentKnowledge } from "@/agents/playbooks/types";
import { agentRegistry, runAgentSkill, skillRegistry } from "@/agents/registry";
import type { AgentRunResult } from "@/agents/types";
import type { ToolTraceEntry } from "@/agents/capabilities/types";
import type { MissionTask, RuntimeCheckpoint, WorkOrder } from "./types";

export interface TaskRuntimeContext {
  workOrder: WorkOrder;
  agentRuns: AgentRunResult[];
  toolTrace: ToolTraceEntry[];
  brainOutputs?: AgentBrainOutput[];
  critiques?: CritiqueResult[];
  refinementStrategies?: RefinementStrategy[];
  playbookTrace?: PlaybookTraceEntry[];
  selectedKnowledge?: SelectedAgentKnowledge[];
  coachingTrace?: CoachingTraceEntry[];
  coachingProfiles?: AgentCoachingProfile[];
  skillOptimizations?: SkillOptimizationResult[];
}

export function runMissionTask(task: MissionTask, context: TaskRuntimeContext): RuntimeCheckpoint {
  const agent = Object.values(agentRegistry).find((candidate) => candidate.role === task.agentRole || candidate.id === task.agentRole);
  if (!agent) return blockedCheckpoint(context.workOrder.id, task.id, `Unknown agent role: ${task.agentRole}`);
  if (!skillRegistry[task.skillId] || !agent.skills.includes(task.skillId)) {
    return blockedCheckpoint(context.workOrder.id, task.id, `Skill ${task.skillId} is not allowed for ${agent.id}`);
  }

  for (const toolId of task.toolIds) {
    if (!agent.toolsAllowed.includes(toolId)) return blockedCheckpoint(context.workOrder.id, task.id, `Tool ${toolId} is not allowed for ${agent.id}`);
  }

  const selectedKnowledge = selectPlaybookForTask({ agentRole: agent.role, workOrder: context.workOrder, task });
  const playbook = loadAgentPlaybook(agent.role);
  const selectedLessons = selectLessonsForTask({ agentRole: agent.role, workOrder: context.workOrder, task, playbook, lessons: defaultLessonStore.all() });
  const skillOptimization = optimizeSkillBehavior({ agentRole: agent.role, skillId: task.skillId, lessons: selectedLessons });
  const compiledMethod = playbook
    ? selectedLessons.length
      ? compileRuntimePlaybookView(playbook, selectedLessons)
      : compilePlaybookIntoAgentMethod(playbook)
    : getAgentMethod(agent.role);
  const coaching = coachAgentBeforeTask({
    agentRole: agent.role,
    method: compiledMethod,
    selectedLessons,
    skillOptimizations: [skillOptimization],
  });
  context.coachingProfiles?.push(coaching.profile);
  context.skillOptimizations?.push(skillOptimization);
  context.coachingTrace?.push({
    agentRole: agent.role,
    taskId: task.id,
    lessonIds: selectedLessons.map((lesson) => lesson.id),
    checklist: coaching.profile.updatedChecklist,
    activeFailureModes: coaching.profile.updatedFailureModes,
    skillOptimizations: [skillOptimization],
  });
  context.selectedKnowledge?.push(selectedKnowledge);
  context.playbookTrace?.push({
    agentRole: agent.role,
    taskId: task.id,
    playbookId: selectedKnowledge.playbookId,
    knowledgePackIds: selectedKnowledge.relevantKnowledgePacks,
    appliedFailureModeIds: selectedKnowledge.relevantFailureModes.map((mode) => mode.id),
    qualityStandards: coaching.method?.qualityChecklist ?? compiledMethod?.qualityChecklist ?? [],
  });

  const brain = runAgentBrain({
    agentRole: agent.role,
    task,
    workOrder: context.workOrder,
    availableSkills: agent.skills,
    availableTools: agent.toolsAllowed,
    context: { constraints: context.workOrder.constraints, expectedOutput: task.expectedOutput, selectedKnowledge, coaching: coaching.skillInputPatch.coaching },
    mode: task.agentRole === "quality_director" ? "validate" : task.agentRole === "creative_director" ? "critique" : "produce",
    methodOverride: coaching.method ?? compiledMethod,
    selectedKnowledge,
  });
  context.brainOutputs?.push(brain);

  const skillInput = typeof task.input === "object" && task.input !== null && !Array.isArray(task.input)
    ? { ...(task.input as Record<string, unknown>), ...coaching.skillInputPatch }
    : task.input;
  const skillRun = runAgentSkill(agent.id, task.skillId, skillInput, {
    turnId: context.workOrder.turnId,
    missionId: context.workOrder.missionId,
    userPrompt: context.workOrder.originalPrompt,
    mode: "details",
    agentId: agent.id,
  });
  context.agentRuns.push(skillRun);
  const critique = critiqueAgentOutput({
    agentRole: agent.role,
    output: skillRun.output,
    workOrder: context.workOrder,
    method: coaching.method ?? compiledMethod ?? getAgentMethod(agent.role),
    selectedKnowledge,
  });
  context.critiques?.push(critique);
  if (critique.status !== "approved") context.refinementStrategies?.push(createRefinementStrategy(critique, context.workOrder, selectedKnowledge.relevantFailureModes));

  for (const toolId of task.toolIds) {
    const trace = runToolAdapter(toolId, task.input, defaultToolContext({
      turnId: context.workOrder.turnId,
      missionId: context.workOrder.missionId,
      agentId: agent.id,
      role: agent.role,
      userPrompt: context.workOrder.originalPrompt,
      mode: "details",
    }), agent.toolsAllowed, agent.capabilityPacks[0]);
    context.toolTrace.push(trace);
    if (trace.status === "blocked" || trace.status === "failed") return blockedCheckpoint(context.workOrder.id, task.id, trace.error ?? `Tool ${toolId} failed`);
  }

  return {
    id: `${context.workOrder.id}-${task.id}`,
    workOrderId: context.workOrder.id,
    taskId: task.id,
    status: skillRun.status === "ok" ? "ok" : "failed",
    output: skillRun.output,
    error: skillRun.notes?.join("; "),
    createdAt: new Date().toISOString(),
  };
}

function blockedCheckpoint(workOrderId: string, taskId: string, error: string): RuntimeCheckpoint {
  return {
    id: `${workOrderId}-${taskId}`,
    workOrderId,
    taskId,
    status: "blocked",
    error,
    createdAt: new Date().toISOString(),
  };
}
