import fs from "fs";
import path from "path";
import { sanitizeProjectName } from "@/lib/orchestrationBridge";

const REPO_ROOT = path.resolve(process.cwd(), "..");
const LOG_DIR = path.join(REPO_ROOT, "logs");
const SESSION_PATH = path.join(LOG_DIR, "autopilot_session.json");
const ACTIVITY_PATH = path.join(LOG_DIR, "agent_activity.jsonl");

export const AUTOPILOT_PHASES = [
  { id: "idea", label: "Idea Analysis", agent: "product_agent" },
  { id: "planning", label: "Product Planning", agent: "product_agent" },
  { id: "architecture", label: "Architecture Design", agent: "architect_agent" },
  { id: "frontend", label: "Frontend Tasks", agent: "frontend_agent" },
  { id: "backend", label: "Backend Tasks", agent: "backend_agent" },
  { id: "validation", label: "Validation", agent: "qa_agent" },
  { id: "build", label: "Build Preparation", agent: "devops_agent" },
  { id: "runtime", label: "Runtime Monitoring", agent: "nvidia_orchestrator" },
] as const;

export type AutopilotTask = {
  id: string;
  title: string;
  agent: string;
  phase: string;
  status: "queued" | "running" | "completed";
};

export type AutopilotLog = {
  timestamp: string;
  agent: string;
  message: string;
  phase: string;
};

export type AutopilotSession = {
  id: string;
  project: string;
  idea: string;
  startedAt: string;
  updatedAt: string;
  phaseIndex: number;
  currentPhase: string;
  activeAgent: string;
  currentStep: string;
  roadmap: string[];
  tasks: AutopilotTask[];
  logs: AutopilotLog[];
  progress: number;
  completed: boolean;
};

type LaunchInput = {
  name?: string;
  idea?: string;
  market?: string;
  agents?: string[];
  template?: string | null;
  stack?: string | null;
};

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function task(id: number, phase: string, agent: string, title: string): AutopilotTask {
  return { id: `AP-${String(id).padStart(3, "0")}`, phase, agent, title, status: "queued" };
}

function buildTasks(project: string): AutopilotTask[] {
  return [
    task(1, "Idea Analysis", "product_agent", `Clarify ICP, pain and promise for ${project}`),
    task(2, "Product Planning", "product_agent", "Generate MVP roadmap and acceptance criteria"),
    task(3, "Architecture Design", "architect_agent", "Define data model, API surface and integration map"),
    task(4, "Frontend Tasks", "frontend_agent", "Create dashboard, onboarding and CRM workspace tasks"),
    task(5, "Backend Tasks", "backend_agent", "Create auth, restaurant accounts, contacts and pipeline tasks"),
    task(6, "Validation", "qa_agent", "Queue smoke, API and UI validation tasks"),
    task(7, "Build Preparation", "devops_agent", "Prepare build, env checklist and deployment plan"),
    task(8, "Runtime Monitoring", "nvidia_orchestrator", "Monitor NVIDIA inference and orchestration health"),
  ];
}

function buildRoadmap(project: string, idea: string): string[] {
  return [
    `${project}: validate target restaurants and core CRM jobs-to-be-done`,
    "Design pipeline, contact, reservation and follow-up workflow",
    "Build restaurant workspace with dashboard, tasks and customer timeline",
    "Implement backend APIs, auth boundaries and project task queue",
    "Run validation, prepare build and monitor runtime execution",
    `Autopilot brief: ${idea || "AI-generated SaaS product"}`,
  ];
}

function appendActivity(session: AutopilotSession, message: string, status = "running") {
  ensureLogDir();
  const entry = {
    timestamp: new Date().toISOString(),
    project: session.project,
    task_id: session.tasks.find((t) => t.status === "running")?.id ?? "AUTOPILOT",
    task_title: session.currentStep,
    agent: session.activeAgent,
    status,
    message,
    event: "autopilot",
  };
  fs.appendFileSync(ACTIVITY_PATH, JSON.stringify(entry) + "\n", "utf-8");
}

function saveSession(session: AutopilotSession) {
  ensureLogDir();
  fs.writeFileSync(SESSION_PATH, JSON.stringify(session, null, 2) + "\n", "utf-8");
}

function normalizeSession(session: AutopilotSession): AutopilotSession {
  const phase = AUTOPILOT_PHASES[Math.min(session.phaseIndex, AUTOPILOT_PHASES.length - 1)];
  const completedCount = session.tasks.filter((t) => t.status === "completed").length;
  const running = session.tasks.find((t) => t.status === "running");
  return {
    ...session,
    currentPhase: phase.label,
    activeAgent: running?.agent ?? phase.agent,
    currentStep: running?.title ?? session.currentStep,
    progress: Math.round((completedCount / Math.max(session.tasks.length, 1)) * 100),
    completed: completedCount === session.tasks.length,
    updatedAt: new Date().toISOString(),
  };
}

export function readAutopilotSession(): AutopilotSession | null {
  if (!fs.existsSync(SESSION_PATH)) return null;
  try {
    return normalizeSession(JSON.parse(fs.readFileSync(SESSION_PATH, "utf-8")) as AutopilotSession);
  } catch {
    return null;
  }
}

export function startAutopilot(input: LaunchInput): AutopilotSession {
  const project = sanitizeProjectName(input.name);
  const idea = input.idea?.trim() || `Create a SaaS CRM for ${project}`;
  const now = new Date().toISOString();
  const firstPhase = AUTOPILOT_PHASES[0];
  const tasks = buildTasks(project);
  tasks[0].status = "running";

  const session = normalizeSession({
    id: `ap-${Date.now().toString(36)}`,
    project,
    idea,
    startedAt: now,
    updatedAt: now,
    phaseIndex: 0,
    currentPhase: firstPhase.label,
    activeAgent: firstPhase.agent,
    currentStep: tasks[0].title,
    roadmap: buildRoadmap(project, idea),
    tasks,
    logs: [{
      timestamp: now,
      agent: firstPhase.agent,
      phase: firstPhase.label,
      message: `Autopilot started for ${project}: ${idea}`,
    }],
    progress: 0,
    completed: false,
  });

  saveSession(session);
  appendActivity(session, `Autopilot started: ${idea}`);
  return session;
}

export function tickAutopilotSession(): AutopilotSession | null {
  const existing = readAutopilotSession();
  if (!existing || existing.completed) return existing;

  const tasks = existing.tasks.map((t) => ({ ...t }));
  const runningIndex = tasks.findIndex((t) => t.status === "running");
  if (runningIndex >= 0) {
    tasks[runningIndex].status = "completed";
  }
  const nextIndex = tasks.findIndex((t) => t.status === "queued");
  if (nextIndex >= 0) {
    tasks[nextIndex].status = "running";
  }

  const phaseIndex = nextIndex >= 0 ? Math.min(nextIndex, AUTOPILOT_PHASES.length - 1) : AUTOPILOT_PHASES.length - 1;
  const phase = AUTOPILOT_PHASES[phaseIndex];
  const nextTask = tasks[nextIndex] ?? tasks[tasks.length - 1];
  const log: AutopilotLog = {
    timestamp: new Date().toISOString(),
    agent: nextTask.agent,
    phase: phase.label,
    message: nextIndex >= 0
      ? `${nextTask.agent} started: ${nextTask.title}`
      : "Autopilot reached runtime monitoring.",
  };

  const session = normalizeSession({
    ...existing,
    tasks,
    phaseIndex,
    currentPhase: phase.label,
    activeAgent: nextTask.agent,
    currentStep: nextTask.title,
    logs: [log, ...existing.logs].slice(0, 40),
  });

  saveSession(session);
  appendActivity(session, log.message, session.completed ? "completed" : "running");
  return session;
}

export function getAutopilotStatus({ advance = true } = {}) {
  return advance ? tickAutopilotSession() : readAutopilotSession();
}
