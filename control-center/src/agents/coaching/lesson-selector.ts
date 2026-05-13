import type { AgentPlaybook } from "@/agents/playbooks/types";
import type { MissionTask, WorkOrder } from "@/agents/runtime/types";
import { defaultLessonStore } from "./lesson-store";
import type { AgentLesson } from "./types";

export function selectLessonsForTask(input: {
  agentRole: string;
  workOrder: WorkOrder;
  task?: MissionTask;
  playbook?: AgentPlaybook | null;
  previousFailures?: string[];
  lessons?: AgentLesson[];
  maxLessons?: number;
}) {
  const allLessons = input.lessons ?? defaultLessonStore.all();
  const deliverable = input.workOrder.requestType === "website" ? "website" : input.workOrder.deliverableType;
  const prompt = input.workOrder.originalPrompt.toLowerCase();

  return allLessons
    .filter((lesson) => lesson.agentRole === input.agentRole)
    .filter((lesson) => lesson.deliverableType === "any" || lesson.deliverableType === deliverable || (deliverable === "landing_page" && lesson.deliverableType === "website"))
    .filter((lesson) => {
      if (lesson.appliesWhen.some((item) => /ekida/i.test(item))) return /ekida/.test(prompt);
      if (lesson.appliesWhen.some((item) => /proshots/i.test(item))) return /proshots/.test(prompt);
      return true;
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, input.maxLessons ?? 8);
}
