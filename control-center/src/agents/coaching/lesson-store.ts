import type { AgentLesson } from "./types";

const SECRET_PATTERN = /NVIDIA_API_KEY|\.env|secret|api[_-]?key/i;

export interface LessonStore {
  addLesson(lesson: AgentLesson): AgentLesson;
  lessonsForAgent(agentRole: string): AgentLesson[];
  lessonsForDeliverable(deliverableType: string): AgentLesson[];
  lessonsForFailurePattern(failurePattern: string): AgentLesson[];
  all(): AgentLesson[];
  clear(): void;
}

function sanitizeLesson(lesson: AgentLesson): AgentLesson {
  const scrub = (value: string) => SECRET_PATTERN.test(value) ? "[redacted]" : value;
  return {
    ...lesson,
    failurePattern: scrub(lesson.failurePattern),
    correctionRule: scrub(lesson.correctionRule),
    detectionHints: lesson.detectionHints.map(scrub),
    appliesWhen: lesson.appliesWhen.map(scrub),
  };
}

export function createLessonStore(initialLessons: AgentLesson[] = []): LessonStore {
  const lessons = new Map<string, AgentLesson>();
  for (const lesson of initialLessons) lessons.set(lesson.id, sanitizeLesson(lesson));

  return {
    addLesson(lesson) {
      const clean = sanitizeLesson(lesson);
      lessons.set(clean.id, clean);
      return clean;
    },
    lessonsForAgent(agentRole) {
      return Array.from(lessons.values()).filter((lesson) => lesson.agentRole === agentRole);
    },
    lessonsForDeliverable(deliverableType) {
      return Array.from(lessons.values()).filter((lesson) => lesson.deliverableType === deliverableType || lesson.deliverableType === "any");
    },
    lessonsForFailurePattern(failurePattern) {
      return Array.from(lessons.values()).filter((lesson) => lesson.failurePattern === failurePattern);
    },
    all() {
      return Array.from(lessons.values());
    },
    clear() {
      lessons.clear();
    },
  };
}

export const defaultLessonStore = createLessonStore();

export function clearDefaultLessons() {
  defaultLessonStore.clear();
}
