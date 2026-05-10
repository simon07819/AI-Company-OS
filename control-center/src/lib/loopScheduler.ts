import fs from "fs";
import path from "path";
import type { AutopilotSession, AutopilotTask, AutopilotLog } from "./autopilotStore";
import { appendLog, updateSession, getSession } from "./autopilotStore";
import {
  type LoopConfig,
  type LoopMode,
  type LoopHistoryEntry,
  LOOP_TYPES,
  getLoopType,
  computeNextRun,
  isLoopDue,
} from "./missionLoops";
import { emitEvent } from "./runtimeEvents";

// ─── Paths ────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(process.cwd(), "..");
const DATA_DIR = path.join(REPO_ROOT, "data");
const LOOPS_PATH = path.join(DATA_DIR, "loop-state.json");

// ─── Types ────────────────────────────────────────────────────────────────

export interface LoopState {
  sessionId: string;
  loop: LoopConfig;
  updatedAt: string;
}

// ─── Persistence ──────────────────────────────────────────────────────────

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readLoopStates(): LoopState[] {
  ensureDataDir();
  if (!fs.existsSync(LOOPS_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(LOOPS_PATH, "utf-8")) as LoopState[];
  } catch {
    return [];
  }
}

function writeLoopStates(states: LoopState[]) {
  ensureDataDir();
  fs.writeFileSync(LOOPS_PATH, JSON.stringify(states, null, 2) + "\n", "utf-8");
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Get all loop states.
 */
export function listLoopStates(): LoopState[] {
  return readLoopStates();
}

/**
 * Get loop state for a session.
 */
export function getLoopState(sessionId: string): LoopState | null {
  return readLoopStates().find((s) => s.sessionId === sessionId) ?? null;
}

/**
 * Activate a loop for a session.
 */
export function activateLoop(sessionId: string, mode: LoopMode): LoopState | null {
  const session = getSession(sessionId);
  if (!session) return null;

  const loopType = getLoopType(mode);
  if (!loopType) return null;

  // Check if mission type is applicable
  if (!loopType.applicableMissions.includes(session.missionType)) {
    return null;
  }

  const loop: LoopConfig = {
    mode,
    status: "active",
    nextRunAt: mode === "one_shot" ? null : computeNextRun(mode),
    lastRunAt: null,
    history: [],
  };

  const state: LoopState = {
    sessionId,
    loop,
    updatedAt: new Date().toISOString(),
  };

  const states = readLoopStates().filter((s) => s.sessionId !== sessionId);
  states.push(state);
  writeLoopStates(states);

  // Update session with loop fields
  updateSession(sessionId, {
    loopMode: mode,
    loopStatus: "active",
    nextRunAt: loop.nextRunAt,
    lastRunAt: null,
    loopHistory: [],
  } as Partial<AutopilotSession>);

  appendLog(sessionId, {
    timestamp: new Date().toISOString(),
    level: "info",
    agent: "autopilot",
    message: `Loop activated: ${loopType.label} [${mode}]`,
    source: "loop",
  });

  return state;
}

/**
 * Pause an active loop.
 */
export function pauseLoop(sessionId: string): LoopState | null {
  const states = readLoopStates();
  const index = states.findIndex((s) => s.sessionId === sessionId);
  if (index === -1) return null;

  states[index].loop.status = "paused";
  states[index].updatedAt = new Date().toISOString();
  writeLoopStates(states);

  updateSession(sessionId, {
    loopStatus: "paused",
  } as Partial<AutopilotSession>);

  appendLog(sessionId, {
    timestamp: new Date().toISOString(),
    level: "warning",
    agent: "autopilot",
    message: "Loop paused",
    source: "loop",
  });

  return states[index];
}

/**
 * Resume a paused loop.
 */
export function resumeLoop(sessionId: string): LoopState | null {
  const states = readLoopStates();
  const index = states.findIndex((s) => s.sessionId === sessionId);
  if (index === -1) return null;

  const mode = states[index].loop.mode;
  states[index].loop.status = "active";
  states[index].loop.nextRunAt = computeNextRun(mode);
  states[index].updatedAt = new Date().toISOString();
  writeLoopStates(states);

  updateSession(sessionId, {
    loopStatus: "active",
    nextRunAt: states[index].loop.nextRunAt,
  } as Partial<AutopilotSession>);

  appendLog(sessionId, {
    timestamp: new Date().toISOString(),
    level: "info",
    agent: "autopilot",
    message: `Loop resumed: ${getLoopType(mode)?.label ?? mode}`,
    source: "loop",
  });

  return states[index];
}

/**
 * Run the scheduler: find all due loops and execute them.
 * Returns the number of loops executed.
 */
export function runScheduler(): { executed: number; results: { sessionId: string; tasksCreated: number }[] } {
  const states = readLoopStates();
  const due = states.filter((s) => isLoopDue(s.loop));
  const results: { sessionId: string; tasksCreated: number }[] = [];

  for (const state of due) {
    const result = executeLoop(state.sessionId);
    results.push({
      sessionId: state.sessionId,
      tasksCreated: result.tasksCreated,
    });
  }

  return { executed: due.length, results };
}

/**
 * Execute a single loop iteration for a session.
 * Creates new tasks from the loop's task templates.
 */
export function executeLoop(sessionId: string): { tasksCreated: number; message: string } {
  const session = getSession(sessionId);
  if (!session) return { tasksCreated: 0, message: "Session not found" };

  const state = getLoopState(sessionId);
  if (!state) return { tasksCreated: 0, message: "No loop state found" };

  const loopType = getLoopType(state.loop.mode);
  if (!loopType) return { tasksCreated: 0, message: "Unknown loop type" };

  // Create new tasks from templates
  const now = new Date().toISOString();
  let taskIdCounter = session.tasks.length;
  const newTasks: AutopilotTask[] = loopType.taskTemplates.map((tmpl) => ({
    id: `AP-${String(++taskIdCounter).padStart(3, "0")}`,
    title: tmpl.title,
    description: tmpl.description,
    phase: tmpl.phase as AutopilotTask["phase"],
    agent: tmpl.agent,
    status: "queued" as const,
    priority: 1,
    progress: 0,
    dependencies: [],
    createdAt: now,
    updatedAt: now,
  }));

  // Add new tasks to session
  if (newTasks.length > 0) {
    const allTasks = [...session.tasks, ...newTasks];
    // Mark first new task as running if no other running tasks
    if (!allTasks.some((t) => t.status === "running")) {
      allTasks[allTasks.length - newTasks.length].status = "running";
      allTasks[allTasks.length - newTasks.length].progress = 10;
    }

    updateSession(sessionId, {
      tasks: allTasks,
      status: "running",
      runtime: {
        ...session.runtime,
        lastEvent: `Loop executed: ${newTasks.length} new tasks created [${loopType.label}]`,
        activeWorkers: Math.min(allTasks.filter((t) => t.status === "running").length, 3),
      },
    } as Partial<AutopilotSession>);
  }

  // Update loop state
  const historyEntry: LoopHistoryEntry = {
    ranAt: now,
    tasksCreated: newTasks.length,
    result: newTasks.length > 0 ? "success" : "failed",
    message: newTasks.length > 0
      ? `Created ${newTasks.length} tasks for ${loopType.label} loop`
      : `No tasks created for ${loopType.label} loop`,
  };

  const states = readLoopStates();
  const idx = states.findIndex((s) => s.sessionId === sessionId);
  if (idx !== -1) {
    states[idx].loop.lastRunAt = now;
    states[idx].loop.nextRunAt = computeNextRun(state.loop.mode, now);
    states[idx].loop.history = [historyEntry, ...states[idx].loop.history].slice(0, 50);
    states[idx].updatedAt = now;
    writeLoopStates(states);
  }

  // Update session loop fields
  updateSession(sessionId, {
    lastRunAt: now,
    nextRunAt: computeNextRun(state.loop.mode, now),
    loopHistory: [historyEntry, ...(session.loopHistory ?? [])].slice(0, 50),
  } as Partial<AutopilotSession>);

  // Log
  appendLog(sessionId, {
    timestamp: now,
    level: newTasks.length > 0 ? "success" : "error",
    agent: "autopilot",
    message: historyEntry.message,
    source: "loop",
  });

  // Emit runtime event
  try {
    emitEvent("loop_executed", {
      sessionId,
      loopMode: state.loop.mode,
      tasksCreated: newTasks.length,
    });
  } catch { /* runtime events may not be available */ }

  return { tasksCreated: newTasks.length, message: historyEntry.message };
}

/**
 * Remove loop state for a session.
 */
export function deactivateLoop(sessionId: string): boolean {
  const states = readLoopStates().filter((s) => s.sessionId !== sessionId);
  writeLoopStates(states);

  updateSession(sessionId, {
    loopStatus: "inactive",
    nextRunAt: null,
  } as Partial<AutopilotSession>);

  return true;
}
