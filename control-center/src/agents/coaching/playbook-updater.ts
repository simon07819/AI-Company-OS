import type { AgentMethod } from "@/agents/intelligence/types";
import { compilePlaybookIntoAgentMethod } from "@/agents/playbooks";
import type { AgentPlaybook, FailureMode } from "@/agents/playbooks/types";
import type { AgentLesson, RuntimePlaybookView } from "./types";

function failureModeFromLesson(lesson: AgentLesson): FailureMode {
  return {
    id: `lesson-${lesson.failurePattern}`,
    description: lesson.failurePattern,
    detectionHints: lesson.detectionHints,
    severity: lesson.severity === "low" ? "warning" : "fail",
    correctionStrategy: lesson.correctionRule,
  };
}

export function applyLessonsToPlaybookRuntimeView(playbook: AgentPlaybook, lessons: AgentLesson[]): RuntimePlaybookView {
  const failureModes = lessons.map(failureModeFromLesson);
  return {
    ...playbook,
    qualityStandards: Array.from(new Set([...playbook.qualityStandards, ...lessons.map((lesson) => lesson.correctionRule)])),
    failureModes: [...playbook.failureModes, ...failureModes],
    forbiddenOutputs: Array.from(new Set([...playbook.forbiddenOutputs, ...lessons.map((lesson) => lesson.failurePattern)])),
    taskMethod: playbook.taskMethod.map((step) => ({
      ...step,
      qualityCheck: Array.from(new Set([...step.qualityCheck, ...lessons.map((lesson) => lesson.correctionRule)])),
    })),
    runtimeLessons: lessons,
    runtimeFailureModes: failureModes,
  };
}

export function compileRuntimePlaybookView(playbook: AgentPlaybook, lessons: AgentLesson[]): AgentMethod {
  return compilePlaybookIntoAgentMethod(applyLessonsToPlaybookRuntimeView(playbook, lessons));
}
