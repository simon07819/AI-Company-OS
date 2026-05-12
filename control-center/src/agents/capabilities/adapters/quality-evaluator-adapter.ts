import { validateLogoDeliverable } from "@/agents/quality/logo-quality-gates";
import { validateSimpleChatOutput, validateWebsiteDeliverable } from "@/agents/quality/gates";
import type { ToolAdapter } from "../types";

export const qualityEvaluatorAdapter: ToolAdapter<
  { kind: "logo" | "website" | "simple-chat"; payload: unknown },
  { ok: boolean; issues: string[] }
> = {
  id: "quality.evaluate",
  name: "Quality Evaluator",
  description: "Evaluate deliverables and block placeholders, recycled outputs and simple-chat leaks.",
  permissions: [{ id: "quality.local", description: "Run deterministic local quality gates.", allowed: true }],
  run(input) {
    if (input.kind === "logo") return validateLogoDeliverable(input.payload as Parameters<typeof validateLogoDeliverable>[0]);
    if (input.kind === "website") return validateWebsiteDeliverable(input.payload as Parameters<typeof validateWebsiteDeliverable>[0]);
    return validateSimpleChatOutput(input.payload as Parameters<typeof validateSimpleChatOutput>[0]);
  },
};
