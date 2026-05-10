import fs from "fs";
import path from "path";
import { createWorkspaceForSession, updateWorkspaceAfterStep } from "./workspaceStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AutopilotPhase =
  | "idea"
  | "planning"
  | "architecture"
  | "frontend"
  | "backend"
  | "validation"
  | "build"
  | "runtime";

export type SessionStatus = "draft" | "running" | "paused" | "completed" | "failed";
export type TaskStatus = "queued" | "running" | "completed" | "blocked" | "failed";
export type LogLevel = "info" | "success" | "warning" | "error";

export interface AutopilotAgentAssignment {
  agentId: string;
  role: string;
  status: "available" | "active" | "done";
  provider: string;
}

export interface AutopilotTask {
  id: string;
  title: string;
  description: string;
  phase: AutopilotPhase;
  agent: string;
  status: TaskStatus;
  priority: number;
  progress: number;
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AutopilotLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  agent: string;
  message: string;
  source: string;
}

export interface AutopilotRuntime {
  status: "online" | "offline" | "unknown";
  provider: string;
  activeWorkers: number;
  lastEvent: string;
}

export interface AutopilotSession {
  sessionId: string;
  projectName: string;
  projectIdea: string;
  productType: string | null;
  template: string | null;
  stack: string | null;
  status: SessionStatus;
  currentPhase: AutopilotPhase;
  progress: number;
  assignedAgents: AutopilotAgentAssignment[];
  roadmap: string[];
  tasks: AutopilotTask[];
  logs: AutopilotLog[];
  runtime: AutopilotRuntime;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionInput {
  name?: string;
  idea?: string;
  market?: string;
  template?: string | null;
  stack?: string | null;
  agents?: string[];
  autonomy?: string | null;
  priorities?: string[];
}

// ─── Phase definitions ────────────────────────────────────────────────────────

export const AUTOPILOT_PHASES: { id: AutopilotPhase; label: string; agent: string; order: number }[] = [
  { id: "idea",         label: "Idea Analysis",       agent: "product_agent",   order: 0 },
  { id: "planning",     label: "Product Planning",    agent: "product_agent",   order: 1 },
  { id: "architecture", label: "Architecture Design", agent: "architect_agent", order: 2 },
  { id: "frontend",     label: "Frontend Tasks",      agent: "frontend_agent",  order: 3 },
  { id: "backend",      label: "Backend Tasks",        agent: "backend_agent",   order: 4 },
  { id: "validation",   label: "Validation",          agent: "qa_agent",        order: 5 },
  { id: "build",        label: "Build Preparation",    agent: "devops_agent",   order: 6 },
  { id: "runtime",      label: "Runtime Monitoring",   agent: "devops_agent",   order: 7 },
];

// ─── Persistence ──────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(process.cwd(), "..");
const DATA_DIR = path.join(REPO_ROOT, "data");
const SESSIONS_PATH = path.join(DATA_DIR, "autopilot-sessions.json");

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readSessionsFile(): AutopilotSession[] {
  ensureDataDir();
  if (!fs.existsSync(SESSIONS_PATH)) return [];
  try {
    const raw = fs.readFileSync(SESSIONS_PATH, "utf-8");
    return JSON.parse(raw) as AutopilotSession[];
  } catch {
    return [];
  }
}

function writeSessionsFile(sessions: AutopilotSession[]) {
  ensureDataDir();
  fs.writeFileSync(SESSIONS_PATH, JSON.stringify(sessions, null, 2) + "\n", "utf-8");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _taskId = 0;

function taskId(): string {
  return `AP-${String(++_taskId).padStart(3, "0")}`;
}

function logId(): string {
  return `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function sanitizeName(value: unknown): string {
  const raw = String(value ?? "").trim();
  const normalized = raw
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return normalized || `Project-${Date.now()}`;
}

function phaseForTaskOrder(index: number): AutopilotPhase {
  return AUTOPILOT_PHASES[Math.min(index, AUTOPILOT_PHASES.length - 1)].id;
}

function buildTasks(project: string, idea: string, agents: string[]): AutopilotTask[] {
  const now = new Date().toISOString();
  const selectedAgents = agents.length > 0 ? agents : AUTOPILOT_PHASES.map((p) => p.agent);

  const taskDefs: { phase: AutopilotPhase; title: string; description: string; priority: number }[] = [
    { phase: "idea",         title: `Analyze ICP and pain points for ${project}`,             description: `Identify target customers, core problems and value proposition for ${project}. Map jobs-to-be-done and user personas.`, priority: 1 },
    { phase: "idea",         title: "Validate market opportunity and competitive landscape",  description: "Research market size, existing solutions, differentiation opportunities. Score viability.", priority: 2 },
    { phase: "planning",     title: "Generate MVP roadmap and acceptance criteria",           description: "Define minimum viable product scope, key milestones, feature prioritization and success metrics.", priority: 1 },
    { phase: "planning",     title: "Define user stories and feature specifications",         description: "Write detailed user stories for core flows. Define acceptance criteria and edge cases.", priority: 2 },
    { phase: "architecture", title: "Define data model and API surface",                      description: "Design database schema, API endpoints, integration map. Document architecture decisions.", priority: 1 },
    { phase: "architecture", title: "Design module boundaries and service contracts",         description: "Define service interfaces, module responsibilities, and integration patterns between components.", priority: 2 },
    { phase: "frontend",     title: "Create dashboard and onboarding pages",                  description: "Build main dashboard view, user onboarding flow, and navigation structure with responsive design.", priority: 1 },
    { phase: "frontend",     title: "Build workspace UI and design system components",        description: "Implement workspace views, reusable design system components, and page layouts.", priority: 2 },
    { phase: "backend",      title: "Implement authentication and core API routes",            description: "Build auth module, core CRUD API endpoints, middleware and request validation.", priority: 1 },
    { phase: "backend",      title: "Create business logic services and database layer",       description: "Implement business logic services, Prisma schema, migrations and data access layer.", priority: 2 },
    { phase: "validation",   title: "Write unit and integration test suite",                   description: "Create comprehensive test suite covering API routes, services, and edge cases.", priority: 1 },
    { phase: "validation",   title: "Run smoke tests and validate API contracts",             description: "Execute smoke tests, validate API contracts, check error handling and security.", priority: 2 },
    { phase: "build",        title: "Prepare production build and env configuration",          description: "Configure production build, environment variables, and deployment manifest.", priority: 1 },
    { phase: "build",        title: "Create deployment plan and CI/CD pipeline",               description: "Set up CI/CD pipeline, Docker configuration, and staging/production deployment workflow.", priority: 2 },
    { phase: "runtime",      title: "Monitor NVIDIA inference and orchestration health",       description: "Set up runtime monitoring, health checks, and alerting for NVIDIA API integration.", priority: 1 },
    { phase: "runtime",      title: "Verify worker health and task queue throughput",         description: "Check worker pool status, task queue metrics, and overall system performance.", priority: 2 },
  ];

  return taskDefs.map((def, index) => {
    const phaseAgent = AUTOPILOT_PHASES.find((p) => p.id === def.phase)!.agent;
    const agent = selectedAgents.includes(phaseAgent) ? phaseAgent : selectedAgents[index % selectedAgents.length]!;
    return {
      id: taskId(),
      title: def.title,
      description: def.description,
      phase: def.phase,
      agent,
      status: "queued" as TaskStatus,
      priority: def.priority,
      progress: 0,
      dependencies: [] as string[],
      createdAt: now,
      updatedAt: now,
    };
  });
}

function buildRoadmap(project: string, idea: string): string[] {
  return [
    `${project}: validate target market and core value proposition`,
    "Design data model, API surface and integration architecture",
    "Build dashboard, onboarding and workspace UI",
    "Implement auth, core APIs and business logic services",
    "Run validation suite, prepare production build",
    `Autopilot brief: ${idea || "AI-generated SaaS product"}`,
  ];
}

function buildAgentAssignments(agents: string[]): AutopilotAgentAssignment[] {
  const ROLES: Record<string, string> = {
    product_agent:   "Product analysis, roadmap and user stories",
    architect_agent: "System architecture, API design and data model",
    frontend_agent:  "UI pages, components and design system",
    backend_agent:   "API routes, database and business logic",
    qa_agent:        "Validation, testing and quality assurance",
    devops_agent:    "Build, deployment and runtime monitoring",
  };

  const selected = agents.length > 0
    ? agents
    : Object.keys(ROLES);

  return selected.map((id) => ({
    agentId: id,
    role: ROLES[id] ?? "General purpose agent",
    status: "available" as const,
    provider: "NVIDIA API (Nemotron)",
  }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function listSessions(): AutopilotSession[] {
  return readSessionsFile().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getSession(sessionId: string): AutopilotSession | null {
  return readSessionsFile().find((s) => s.sessionId === sessionId) ?? null;
}

export function createSession(input: CreateSessionInput): AutopilotSession {
  const project = sanitizeName(input.name);
  const idea = input.idea?.trim() || `Create a SaaS product for ${project}`;
  const agents = input.agents ?? [];
  const now = new Date().toISOString();
  const firstPhase = AUTOPILOT_PHASES[0];

  const tasks = buildTasks(project, idea, agents);
  tasks[0].status = "running";
  tasks[0].progress = 10;

  const session: AutopilotSession = {
    sessionId: `ap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    projectName: project,
    projectIdea: idea,
    productType: input.template ?? null,
    template: input.template ?? null,
    stack: input.stack ?? null,
    status: "running",
    currentPhase: firstPhase.id,
    progress: 0,
    assignedAgents: buildAgentAssignments(agents),
    roadmap: buildRoadmap(project, idea),
    tasks,
    logs: [{
      id: logId(),
      timestamp: now,
      level: "info",
      agent: firstPhase.agent,
      message: `Autopilot started for ${project}: ${idea}`,
      source: "autopilot",
    }],
    runtime: {
      status: "online",
      provider: "NVIDIA API (Nemotron)",
      activeWorkers: 1,
      lastEvent: `Session created — ${firstPhase.agent} starting ${firstPhase.label}`,
    },
    createdAt: now,
    updatedAt: now,
  };

  const sessions = readSessionsFile();
  sessions.unshift(session);
  writeSessionsFile(sessions);

  // Create workspace on disk
  createWorkspaceForSession(session);

  return session;
}

export function updateSession(sessionId: string, patch: Partial<AutopilotSession>): AutopilotSession | null {
  const sessions = readSessionsFile();
  const index = sessions.findIndex((s) => s.sessionId === sessionId);
  if (index === -1) return null;

  sessions[index] = {
    ...sessions[index],
    ...patch,
    sessionId,
    updatedAt: new Date().toISOString(),
  };

  writeSessionsFile(sessions);
  return sessions[index];
}

export function appendLog(sessionId: string, log: Omit<AutopilotLog, "id">): AutopilotSession | null {
  const sessions = readSessionsFile();
  const index = sessions.findIndex((s) => s.sessionId === sessionId);
  if (index === -1) return null;

  const fullLog: AutopilotLog = { ...log, id: logId() };
  sessions[index].logs = [fullLog, ...sessions[index].logs].slice(0, 100);
  sessions[index].updatedAt = new Date().toISOString();

  writeSessionsFile(sessions);
  return sessions[index];
}

export function updateTask(sessionId: string, taskId: string, patch: Partial<AutopilotTask>): AutopilotSession | null {
  const sessions = readSessionsFile();
  const sessionIndex = sessions.findIndex((s) => s.sessionId === sessionId);
  if (sessionIndex === -1) return null;

  const taskIndex = sessions[sessionIndex].tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) return null;

  sessions[sessionIndex].tasks[taskIndex] = {
    ...sessions[sessionIndex].tasks[taskIndex],
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  // Recalculate progress
  const tasks = sessions[sessionIndex].tasks;
  const completed = tasks.filter((t) => t.status === "completed").length;
  sessions[sessionIndex].progress = Math.round((completed / Math.max(tasks.length, 1)) * 100);
  sessions[sessionIndex].updatedAt = new Date().toISOString();

  writeSessionsFile(sessions);
  return sessions[sessionIndex];
}

export function continueSession(sessionId: string): AutopilotSession | null {
  const session = getSession(sessionId);
  if (!session) return null;

  if (session.status === "paused") {
    const updated = updateSession(sessionId, { status: "running" });
    if (updated) {
      appendLog(sessionId, {
        timestamp: new Date().toISOString(),
        level: "info",
        agent: "autopilot",
        message: "Autopilot resumed",
        source: "control",
      });
    }
    return updated;
  }

  // Advance: complete running task, start next queued
  const tasks = session.tasks.map((t) => ({ ...t }));
  const runningIndex = tasks.findIndex((t) => t.status === "running");
  if (runningIndex >= 0) {
    tasks[runningIndex].status = "completed";
    tasks[runningIndex].progress = 100;
  }

  const nextIndex = tasks.findIndex((t) => t.status === "queued");
  if (nextIndex >= 0) {
    tasks[nextIndex].status = "running";
    tasks[nextIndex].progress = 10;
  }

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const progress = Math.round((completedCount / Math.max(tasks.length, 1)) * 100);
  const nextTask = nextIndex >= 0 ? tasks[nextIndex] : null;
  const nextPhase = nextTask ? nextTask.phase : session.currentPhase;
  const isComplete = completedCount === tasks.length;

  const updated = updateSession(sessionId, {
    tasks,
    currentPhase: nextPhase,
    progress,
    status: isComplete ? "completed" : "running",
  });

  if (updated) {
    appendLog(sessionId, {
      timestamp: new Date().toISOString(),
      level: nextIndex >= 0 ? "success" : "info",
      agent: nextTask?.agent ?? "autopilot",
      message: nextIndex >= 0 && nextTask
        ? `${nextTask.agent} starting: ${nextTask.title}`
        : "Autopilot reached final phase.",
      source: "autopilot",
    });
  }

  return updated;
}

export function pauseSession(sessionId: string): AutopilotSession | null {
  const updated = updateSession(sessionId, { status: "paused" });
  if (updated) {
    appendLog(sessionId, {
      timestamp: new Date().toISOString(),
      level: "warning",
      agent: "autopilot",
      message: "Autopilot paused",
      source: "control",
    });
  }
  return updated;
}

export function retryFailedTasks(sessionId: string): AutopilotSession | null {
  const session = getSession(sessionId);
  if (!session) return null;

  const tasks = session.tasks.map((t) => {
    if (t.status === "failed" || t.status === "blocked") {
      return { ...t, status: "queued" as TaskStatus, progress: 0, updatedAt: new Date().toISOString() };
    }
    return t;
  });

  const retried = session.tasks.filter((t) => t.status === "failed" || t.status === "blocked").length;
  const updated = updateSession(sessionId, { tasks, status: "running" });

  if (updated) {
    appendLog(sessionId, {
      timestamp: new Date().toISOString(),
      level: retried > 0 ? "info" : "warning",
      agent: "autopilot",
      message: retried > 0 ? `Retry triggered: ${retried} task${retried === 1 ? "" : "s"} requeued` : "No failed tasks to retry",
      source: "control",
    });
  }

  return updated;
}

// ─── Execution Loop ───────────────────────────────────────────────────────────

export type RunStepResult = {
  ok: boolean;
  task: AutopilotTask | null;
  log: AutopilotLog | null;
  completed: boolean;
  session: AutopilotSession | null;
};

/**
 * Execute a single autopilot step:
 * 1. Find the next task (running first, then queued)
 * 2. If none, mark session completed
 * 3. Log agent start, simulate NVIDIA runtime execution
 * 4. Mark task completed/failed, update progress/status/phase
 * 5. Log result
 */
export function runStep(sessionId: string): RunStepResult {
  const session = getSession(sessionId);
  if (!session) {
    return { ok: false, task: null, log: null, completed: false, session: null };
  }

  if (session.status !== "running") {
    return { ok: false, task: null, log: null, completed: false, session };
  }

  const now = new Date().toISOString();
  const tasks = session.tasks.map((t) => ({ ...t }));

  // Find the next task to execute
  let targetIndex = tasks.findIndex((t) => t.status === "running");
  if (targetIndex === -1) {
    targetIndex = tasks.findIndex((t) => t.status === "queued");
  }

  // No remaining tasks
  if (targetIndex === -1) {
    const allCompleted = tasks.every((t) => t.status === "completed");
    const currentStatus: string = session.status;
    if (allCompleted && currentStatus !== "completed") {
      const updated = updateSession(sessionId, {
        status: "completed",
        runtime: { ...session.runtime, lastEvent: "All tasks completed", activeWorkers: 0 },
      });
      const doneLog = appendLog(sessionId, {
        timestamp: now,
        level: "success",
        agent: "autopilot",
        message: "Autopilot completed — all tasks finished successfully.",
        source: "autopilot",
      });
      return { ok: true, task: null, log: doneLog?.logs[0] ?? null, completed: true, session: updated };
    }
    return { ok: false, task: null, log: null, completed: false, session: getSession(sessionId) };
  }

  const task = tasks[targetIndex];
  const agent = task.agent;
  const phaseInfo = AUTOPILOT_PHASES.find((p) => p.id === task.phase);

  // Mark task as running (if it was queued)
  tasks[targetIndex] = { ...task, status: "running", progress: 15, updatedAt: now };

  // Log: agent started
  appendLog(sessionId, {
    timestamp: now,
    level: "info",
    agent,
    message: `${agent} started task: ${task.title}`,
    source: "autopilot",
  });

  // Simulate NVIDIA runtime execution
  // In production this would call the real NVIDIA API / runner.ts
  // For now: deterministic success with realistic delay simulation
  const executionOk = simulateExecution(agent, task);

  // Update the task based on result
  if (executionOk) {
    tasks[targetIndex] = { ...tasks[targetIndex], status: "completed", progress: 100, updatedAt: new Date().toISOString() };
  } else {
    tasks[targetIndex] = { ...tasks[targetIndex], status: "failed", progress: 0, updatedAt: new Date().toISOString() };
  }

  // Recalculate progress
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const progress = Math.round((completedCount / Math.max(tasks.length, 1)) * 100);
  const allDone = tasks.every((t) => t.status === "completed" || t.status === "failed");
  const hasFailed = tasks.some((t) => t.status === "failed");

  // Update agent assignment status
  const assignedAgents = session.assignedAgents.map((a) => {
    const hasRunningTask = tasks.some((t) => t.agent === a.agentId && t.status === "running");
    const hasCompletedTask = tasks.some((t) => t.agent === a.agentId && t.status === "completed");
    const hasQueuedTask = tasks.some((t) => t.agent === a.agentId && t.status === "queued");
    return {
      ...a,
      status: hasRunningTask ? "active" as const : hasQueuedTask ? "available" as const : hasCompletedTask ? "done" as const : a.status,
    };
  });

  // Determine next phase
  const nextRunningTask = tasks.find((t) => t.status === "running");
  const nextQueuedTask = tasks.find((t) => t.status === "queued");
  const nextPhase = nextRunningTask?.phase ?? nextQueuedTask?.phase ?? task.phase;

  // Update runtime
  const activeWorkerCount = tasks.filter((t) => t.status === "running").length;

  const newStatus: SessionStatus = allDone
    ? (hasFailed ? "failed" : "completed")
    : "running";

  const updatedSession = updateSession(sessionId, {
    tasks,
    currentPhase: nextPhase as AutopilotPhase,
    progress,
    status: newStatus,
    assignedAgents,
    runtime: {
      status: "online",
      provider: "NVIDIA API (Nemotron)",
      activeWorkers: activeWorkerCount,
      lastEvent: executionOk
        ? `${agent} completed: ${task.title}`
        : `${agent} failed: ${task.title}`,
    },
  });

  // Log: result
  const resultLog = appendLog(sessionId, {
    timestamp: new Date().toISOString(),
    level: executionOk ? "success" : "error",
    agent,
    message: executionOk
      ? `${agent} completed: ${task.title} [${phaseInfo?.label ?? task.phase}]`
      : `${agent} failed: ${task.title} — will require retry`,
    source: executionOk ? "agent" : "agent",
  });

  // Update workspace files on disk
  const latestSession = getSession(sessionId);
  if (latestSession) {
    updateWorkspaceAfterStep(
      sessionId,
      latestSession.tasks,
      latestSession.logs,
      tasks[targetIndex],
    );
  }

  return {
    ok: true,
    task: tasks[targetIndex],
    log: resultLog?.logs[0] ?? null,
    completed: allDone,
    session: updatedSession ?? getSession(sessionId),
  };
}

/**
 * Simulate NVIDIA agent execution.
 * Returns true for success, false for failure.
 * Uses deterministic logic: 90% success rate, always fails on specific edge cases.
 */
function simulateExecution(agent: string, task: AutopilotTask): boolean {
  // Deterministic seed from task id for reproducibility
  const hash = task.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  // 92% success rate based on agent + task hash
  return (hash + agent.length) % 100 < 92;
}

export type RunAllResult = {
  ok: boolean;
  stepsExecuted: number;
  steps: RunStepResult[];
  completed: boolean;
  session: AutopilotSession | null;
};

const MAX_RUN_ALL_STEPS = 10;

/**
 * Execute multiple steps up to MAX_RUN_ALL_STEPS.
 * Stops when: session completes, a task fails, or limit reached.
 */
export function runAll(sessionId: string, maxSteps = MAX_RUN_ALL_STEPS): RunAllResult {
  const steps: RunStepResult[] = [];
  let stepsExecuted = 0;
  let session = getSession(sessionId);

  for (let i = 0; i < maxSteps; i++) {
    // Re-read session to get latest state
    session = getSession(sessionId);
    if (!session || (session.status !== "running" && session.status !== "paused")) break;

    // Resume if paused
    if (session.status === "paused") {
      updateSession(sessionId, { status: "running" });
      appendLog(sessionId, {
        timestamp: new Date().toISOString(),
        level: "info",
        agent: "autopilot",
        message: "Autopilot resumed for run-all execution.",
        source: "control",
      });
    }

    const result = runStep(sessionId);
    steps.push(result);
    stepsExecuted++;

    if (result.completed || !result.ok) break;
    if (result.task?.status === "failed") break;

    // Re-read after step
    session = getSession(sessionId);
    if (!session || session.status === "completed" || session.status === "failed") break;
  }

  session = getSession(sessionId);
  return {
    ok: stepsExecuted > 0,
    stepsExecuted,
    steps,
    completed: session?.status === "completed",
    session,
  };
}
