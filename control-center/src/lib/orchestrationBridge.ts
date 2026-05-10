import fs from "fs";
import path from "path";
import { getRecentActivity } from "@/lib/activity";
import { getAllProjects } from "@/lib/projects";
import { runAction, type RunResult } from "@/lib/runner";
import { getSystemStatus } from "@/lib/systemStatus";

const REPO_ROOT = path.resolve(process.cwd(), "..");
const PROJECT_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export type BridgeResult = {
  ok: boolean;
  mode: "real" | "mock";
  action: string;
  project: string | null;
  message: string;
  command?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  data?: unknown;
};

export function sanitizeProjectName(value: unknown) {
  const raw = String(value ?? "").trim();
  const normalized = raw
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return normalized || `Project-${Date.now()}`;
}

export function resolveProjectName(candidate?: unknown) {
  const requested = typeof candidate === "string" ? candidate.trim() : "";
  if (requested && PROJECT_RE.test(requested)) return requested;

  const projects = getAllProjects();
  const active = projects.find((project) => project.meta.status === "active");
  return active?.name ?? projects[0]?.name ?? null;
}

export function bridgeFromRun(action: string, project: string | null, result: RunResult): BridgeResult {
  return {
    ok: result.ok,
    mode: "real",
    action,
    project,
    message: result.ok
      ? `${action} completed through local orchestration bridge.`
      : `${action} failed in local orchestration bridge.`,
    command: result.command,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
  };
}

export async function runProjectAction(action: string, projectCandidate?: unknown, extra: Record<string, string> = {}) {
  const project = resolveProjectName(projectCandidate);
  if (!project) {
    return {
      ok: false,
      mode: "mock",
      action,
      project: null,
      message: "No project is available yet. Create or launch a project first.",
      stderr: "Missing project",
      exitCode: 1,
    } satisfies BridgeResult;
  }

  const result = await runAction(action, { project, ...extra });
  return bridgeFromRun(action, project, result);
}

export function bridgeStatus(): BridgeResult {
  const status = getSystemStatus();
  const projects = getAllProjects();
  return {
    ok: true,
    mode: "real",
    action: "status",
    project: resolveProjectName(),
    message: "Control Center status loaded from local backend state.",
    data: {
      ...status,
      projectNames: projects.map((project) => project.name),
      nvidiaProvider: status.nvidiaStatus,
    },
  };
}

export function retryFailedTasks(projectCandidate?: unknown): BridgeResult {
  const projectFilter = typeof projectCandidate === "string" && PROJECT_RE.test(projectCandidate)
    ? projectCandidate
    : null;
  const projects = getAllProjects().filter((project) => !projectFilter || project.name === projectFilter);
  let retried = 0;
  const errors: string[] = [];

  for (const project of projects) {
    const tasksDir = path.join(REPO_ROOT, "projects", project.name, "tasks");
    if (!fs.existsSync(tasksDir)) continue;

    for (const file of fs.readdirSync(tasksDir).filter((entry) => entry.endsWith(".json"))) {
      const taskPath = path.join(tasksDir, file);
      try {
        const task = JSON.parse(fs.readFileSync(taskPath, "utf-8")) as Record<string, unknown>;
        if (task.status !== "failed") continue;

        for (const key of ["error", "failed_at", "locked_by", "locked_at", "started_at"] as const) {
          delete task[key];
        }

        const next = {
          ...task,
          status: "queued",
          retried_at: new Date().toISOString(),
          retry_count: Number(task.retry_count ?? 0) + 1,
        };

        fs.writeFileSync(taskPath, JSON.stringify(next, null, 2) + "\n", "utf-8");
        retried += 1;
      } catch (error) {
        errors.push(`${project.name}/${file}: ${String(error)}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    mode: "real",
    action: "retry-failed",
    project: projectFilter,
    message: retried > 0
      ? `Requeued ${retried} failed task${retried === 1 ? "" : "s"}.`
      : "No failed tasks found to retry.",
    data: { retried, errors },
    stderr: errors.join("\n"),
    exitCode: errors.length === 0 ? 0 : 1,
  };
}

export function recentLogs(limit = 80): BridgeResult {
  const entries = getRecentActivity(limit);
  return {
    ok: true,
    mode: "real",
    action: "logs",
    project: resolveProjectName(),
    message: entries.length > 0
      ? `Loaded ${entries.length} backend log entries.`
      : "No backend log entries found. Simulation stream remains available.",
    data: { entries },
  };
}

export function localControl(action: string): BridgeResult {
  return {
    ok: true,
    mode: "mock",
    action,
    project: resolveProjectName(),
    message: `${action} is acknowledged locally. Worker process control is pending a persistent supervisor bridge.`,
    data: { bridge: "local-control-pending" },
  };
}
