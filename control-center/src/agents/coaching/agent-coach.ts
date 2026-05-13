import type { AgentMethod } from "@/agents/intelligence/types";
import type { AgentLesson, AgentCoachingProfile, SkillOptimizationResult } from "./types";

export function coachAgentBeforeTask(input: {
  agentRole: string;
  method?: AgentMethod;
  selectedLessons: AgentLesson[];
  skillOptimizations?: SkillOptimizationResult[];
}) {
  const updatedChecklist = [
    ...(input.method?.qualityChecklist ?? []),
    ...input.selectedLessons.map((lesson) => lesson.correctionRule),
    ...(input.skillOptimizations ?? []).flatMap((optimization) => optimization.changes),
  ];
  const updatedFailureModes = [
    ...(input.method?.commonFailureModes ?? []),
    ...input.selectedLessons.map((lesson) => lesson.failurePattern),
  ];
  const profile: AgentCoachingProfile = {
    agentRole: input.agentRole,
    activeLessons: input.selectedLessons,
    recurrentFailures: Array.from(new Set(input.selectedLessons.map((lesson) => lesson.failurePattern))),
    strongestSkills: [],
    weakSkills: Array.from(new Set((input.skillOptimizations ?? []).filter((item) => item.status !== "unchanged").map((item) => item.skillId))),
    updatedChecklist,
    updatedFailureModes,
  };
  const coachedMethod: AgentMethod | undefined = input.method ? {
    ...input.method,
    qualityChecklist: updatedChecklist,
    commonFailureModes: updatedFailureModes,
  } : undefined;

  return {
    profile,
    method: coachedMethod,
    skillInputPatch: {
      coaching: {
        lessonIds: input.selectedLessons.map((lesson) => lesson.id),
        constraints: updatedChecklist,
        forbiddenOutputs: updatedFailureModes,
      },
    },
  };
}
