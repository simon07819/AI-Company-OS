export type CapabilityId =
  | "filesystem.project"
  | "shell.safe"
  | "git.repo"
  | "browser.preview"
  | "visual.svg"
  | "website.preview"
  | "quality.evaluate"
  | "artifact.store"
  | "mcp.generic"
  | "mcp.github"
  | "mcp.playwright";

export interface ToolPermission {
  id: string;
  description: string;
  allowed: boolean;
  reason?: string;
}

export interface ToolRunContext {
  turnId: string;
  missionId: string;
  agentId: string;
  role: string;
  userPrompt: string;
  mode: "simple" | "details";
  repoRoot: string;
  allowNetwork?: boolean;
  allowShell?: boolean;
  allowFilesystemWrite?: boolean;
}

export type ToolRunStatus = "ok" | "failed" | "blocked";

export interface ToolRunResult<Output = unknown> {
  toolId: string;
  status: ToolRunStatus;
  output?: Output;
  error?: string;
  hiddenLog?: string[];
}

export interface ToolAdapter<Input = unknown, Output = unknown> {
  id: CapabilityId | string;
  name: string;
  description: string;
  permissions: ToolPermission[];
  inputSchema?: unknown;
  outputSchema?: unknown;
  run: (input: Input, context: ToolRunContext) => Promise<Output> | Output;
}

export interface CapabilityPack {
  id: string;
  name: string;
  description: string;
  agentRoles: string[];
  tools: string[];
  skills: string[];
  guardrails: string[];
  mustNeverDo: string[];
}

export interface ToolTraceEntry<Output = unknown> extends ToolRunResult<Output> {
  agentId: string;
  role: string;
  capabilityPackId?: string;
}
