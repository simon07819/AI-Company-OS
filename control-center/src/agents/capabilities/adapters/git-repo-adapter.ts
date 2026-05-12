import type { ToolAdapter } from "../types";
import { assertSafeShellCommand } from "../guards";

export const gitRepoAdapter: ToolAdapter<{ command: "status" | "log" | "diff" }, { command: string }> = {
  id: "git.repo",
  name: "Git Repo",
  description: "Prepare safe git inspection commands. Push/deploy is never allowed.",
  permissions: [{ id: "git.inspect", description: "Inspect status, recent log and diff.", allowed: true }],
  run(input) {
    const command = input.command === "status" ? "git status --short" : input.command === "log" ? "git log --oneline -10" : "git diff";
    assertSafeShellCommand(command);
    return { command };
  },
};
