import fs from "fs";
import path from "path";
import { getAllProjects, computeStats } from "./projects";
import { getRecentActivity } from "./activity";

const REPO_ROOT = path.resolve(process.cwd(), "..");
const LOG_PATH = path.join(REPO_ROOT, "logs", "agent_activity.jsonl");

export interface SystemStatus {
  ok: boolean;
  timestamp: string;
  projects: number;
  totalTasks: number;
  queued: number;
  running: number;
  failed: number;
  completed: number;
  archived: number;
  successRate: number;
  nvidiaStatus: "online" | "offline" | "unknown";
  logFileExists: boolean;
  logEntries: number;
  lastActivity: string | null;
  workers: number;
}

export function getSystemStatus(): SystemStatus {
  const projects = getAllProjects();
  const stats = computeStats(projects);

  const logExists = fs.existsSync(LOG_PATH);
  let logEntries = 0;
  let lastActivity: string | null = null;

  if (logExists) {
    try {
      const raw = fs.readFileSync(LOG_PATH, "utf-8");
      const lines = raw.split("\n").filter(Boolean);
      logEntries = lines.length;
      const last = lines[lines.length - 1];
      if (last) {
        const parsed = JSON.parse(last) as { timestamp?: string };
        lastActivity = parsed.timestamp ?? null;
      }
    } catch {
      // ignore
    }
  }

  // NVIDIA status: online if we have an API key set
  const nvidiaKey = process.env.NVIDIA_API_KEY ?? "";
  const nvidiaStatus: SystemStatus["nvidiaStatus"] = nvidiaKey.length > 8
    ? "online"
    : "unknown";

  // Count running tasks (locked_by set = a worker has it)
  let running = 0;
  for (const proj of projects) {
    for (const task of proj.tasks) {
      if (task.status === "running") running++;
    }
  }

  return {
    ok: true,
    timestamp: new Date().toISOString(),
    projects: stats.totalProjects,
    totalTasks: stats.totalTasks,
    queued: stats.queued,
    running,
    failed: stats.failed,
    completed: stats.completedReal,
    archived: stats.archived,
    successRate: stats.successRate,
    nvidiaStatus,
    logFileExists: logExists,
    logEntries,
    lastActivity,
    workers: 0,
  };
}

export { LOG_PATH, REPO_ROOT };
