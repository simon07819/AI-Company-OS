import type { ToolAdapter } from "../types";
import { assertSafeShellCommand } from "../guards";

export const shellCommandAdapter: ToolAdapter<{ command: string }, { command: string; executable: boolean }> = {
  id: "shell.safe",
  name: "Safe Shell",
  description: "Allowlisted shell command planner. It validates commands but never grants free shell execution to agents.",
  permissions: [{ id: "shell.allowlisted", description: "Validate allowlisted diagnostic commands only.", allowed: false, reason: "Execution is controlled by Codex/runtime, not by agents." }],
  run(input, context) {
    assertSafeShellCommand(input.command);
    if (!context.allowShell) throw new Error("Shell execution is disabled for this tool context.");
    return { command: input.command, executable: true };
  },
};
