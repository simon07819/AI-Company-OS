import type { EvalCase, EvalResult } from "@/agents/evals/types";
import { runCeoAgentEvalCase } from "@/agents/evals/eval-runner";
import { defaultLessonStore } from "./lesson-store";
import { extractLessonsFromEvalFailure } from "./lesson-extractor";
import type { CoachingRunResult } from "./types";

export function runEvalsWithCoaching(cases: EvalCase[]): CoachingRunResult {
  const lessonsCreated = [];
  const rerunResults: EvalResult[] = [];

  for (const evalCase of cases) {
    const first = runCeoAgentEvalCase(evalCase);
    if (first.status === "fail") {
      const lessons = extractLessonsFromEvalFailure(first);
      for (const lesson of lessons) defaultLessonStore.addLesson(lesson);
      lessonsCreated.push(...lessons);
    }
    rerunResults.push(runCeoAgentEvalCase(evalCase));
  }

  return {
    lessonsCreated,
    coachingProfiles: [],
    skillOptimizations: [],
    hiddenReport: { rerunResults },
  };
}
