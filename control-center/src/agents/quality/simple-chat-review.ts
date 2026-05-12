import { createSimpleChatRubric, issue } from "./quality-rubrics";
import type { QualityIssue } from "./types";

export function reviewSimpleChatOutput(visibleOutput: unknown) {
  const rubric = createSimpleChatRubric();
  const text = JSON.stringify(visibleOutput);
  const issues: QualityIssue[] = [];
  if (rubric.forbiddenPattern.test(text)) {
    issues.push(issue({
      id: "simple-chat-internals",
      category: "hidden_details_leak",
      message: "Le visibleOutput expose des détails internes.",
      suggestedFix: "Déplacer scores, traces, artifacts et process dans hiddenDetails.",
    }));
  }
  return issues;
}
