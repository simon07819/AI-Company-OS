import fs from "fs";
import path from "path";
import { createWorkspaceForSession, updateWorkspaceAfterStep, generateAgentArtifact, generateProjectScaffold, projectScaffoldExists, writeAgentRun } from "./workspaceStore";
import { runNvidiaAdapter } from "./nvidiaAgentAdapter";
import { getMissionType, getDefaultMissionType, isSoftwareMission } from "./missionTypes";
import { generateMissionDeliverables } from "./missionDeliverables";
import { updateAgentState } from "./agentRuntime";
import { emitEvent } from "./runtimeEvents";

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
  missionType: string;
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
  missionType?: string | null;
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

function buildTasks(project: string, idea: string, agents: string[], missionTypeId: string): AutopilotTask[] {
  const now = new Date().toISOString();
  const missionType = getMissionType(missionTypeId);
  const phases = missionType?.defaultPhases ?? AUTOPILOT_PHASES.map((p) => ({ id: p.id, label: p.label, agent: p.agent }));
  const selectedAgents = agents.length > 0 ? agents : phases.map((p) => p.agent);

  // Mission-specific task definitions
  const MISSION_TASKS: Record<string, { phase: AutopilotPhase; title: string; description: string; priority: number }[]> = {
    saas_project: [
      { phase: "idea", title: `Analyze ICP and pain points for ${project}`, description: `Identify target customers, core problems and value proposition for ${project}. Map jobs-to-be-done and user personas.`, priority: 1 },
      { phase: "idea", title: "Validate market opportunity and competitive landscape", description: "Research market size, existing solutions, differentiation opportunities. Score viability.", priority: 2 },
      { phase: "planning", title: "Generate MVP roadmap and acceptance criteria", description: "Define minimum viable product scope, key milestones, feature prioritization and success metrics.", priority: 1 },
      { phase: "planning", title: "Define user stories and feature specifications", description: "Write detailed user stories for core flows. Define acceptance criteria and edge cases.", priority: 2 },
      { phase: "architecture", title: "Define data model and API surface", description: "Design database schema, API endpoints, integration map. Document architecture decisions.", priority: 1 },
      { phase: "architecture", title: "Design module boundaries and service contracts", description: "Define service interfaces, module responsibilities, and integration patterns between components.", priority: 2 },
      { phase: "frontend", title: "Create dashboard and onboarding pages", description: "Build main dashboard view, user onboarding flow, and navigation structure with responsive design.", priority: 1 },
      { phase: "frontend", title: "Build workspace UI and design system components", description: "Implement workspace views, reusable design system components, and page layouts.", priority: 2 },
      { phase: "backend", title: "Implement authentication and core API routes", description: "Build auth module, core CRUD API endpoints, middleware and request validation.", priority: 1 },
      { phase: "backend", title: "Create business logic services and database layer", description: "Implement business logic services, Prisma schema, migrations and data access layer.", priority: 2 },
      { phase: "validation", title: "Write unit and integration test suite", description: "Create comprehensive test suite covering API routes, services, and edge cases.", priority: 1 },
      { phase: "validation", title: "Run smoke tests and validate API contracts", description: "Execute smoke tests, validate API contracts, check error handling and security.", priority: 2 },
      { phase: "build", title: "Prepare production build and env configuration", description: "Configure production build, environment variables, and deployment manifest.", priority: 1 },
      { phase: "build", title: "Create deployment plan and CI/CD pipeline", description: "Set up CI/CD pipeline, Docker configuration, and staging/production deployment workflow.", priority: 2 },
      { phase: "runtime", title: "Monitor NVIDIA inference and orchestration health", description: "Set up runtime monitoring, health checks, and alerting for NVIDIA API integration.", priority: 1 },
      { phase: "runtime", title: "Verify worker health and task queue throughput", description: "Check worker pool status, task queue metrics, and overall system performance.", priority: 2 },
    ],
    website: [
      { phase: "idea", title: `Gather client brief for ${project}`, description: "Understand target audience, goals, key messages and brand requirements for the website.", priority: 1 },
      { phase: "idea", title: "Define site structure and sitemap", description: "Map pages, navigation flow and content hierarchy.", priority: 2 },
      { phase: "planning", title: "Plan page content and SEO strategy", description: "Define copy, keywords, meta tags and content for each page.", priority: 1 },
      { phase: "planning", title: "Choose design direction and responsive approach", description: "Select visual style, breakpoints and component patterns.", priority: 2 },
      { phase: "frontend", title: "Build landing page and hero section", description: "Create hero, features section, testimonials and CTA with responsive design.", priority: 1 },
      { phase: "frontend", title: "Build about, contact and blog pages", description: "Implement secondary pages with consistent design system.", priority: 2 },
      { phase: "validation", title: "Cross-browser and responsive testing", description: "Test on mobile, tablet and desktop across major browsers.", priority: 1 },
      { phase: "validation", title: "Accessibility and performance audit", description: "Run Lighthouse, check WCAG compliance and optimize Core Web Vitals.", priority: 2 },
      { phase: "build", title: "Deploy to hosting and configure domain", description: "Set up Vercel/Netlify deployment, DNS and SSL.", priority: 1 },
    ],
    branding_pack: [
      { phase: "idea", title: `Brand discovery for ${project}`, description: "Research brand values, personality, target audience and competitive positioning.", priority: 1 },
      { phase: "idea", title: "Define brand voice and messaging", description: "Articulate tone, key messages and value proposition.", priority: 2 },
      { phase: "planning", title: "Plan brand identity components", description: "Define logo variants, color palette, typography and iconography scope.", priority: 1 },
      { phase: "planning", title: "Create mood board and style direction", description: "Collect visual references and define aesthetic direction.", priority: 2 },
      { phase: "frontend", title: "Design logo and visual identity", description: "Create primary and secondary logos, favicon and app icons.", priority: 1 },
      { phase: "frontend", title: "Define color palette and typography system", description: "Select primary/secondary colors, heading and body fonts, spacing system.", priority: 2 },
      { phase: "validation", title: "Brand consistency review", description: "Check all elements align with brand strategy and visual coherence.", priority: 1 },
    ],
    flyer: [
      { phase: "idea", title: `Flyer brief for ${project}`, description: "Define purpose, audience, key message and call-to-action for the flyer.", priority: 1 },
      { phase: "planning", title: "Draft headline and body copy", description: "Write attention-grabbing headline, supporting text and CTA.", priority: 1 },
      { phase: "frontend", title: "Design flyer layout", description: "Create print-ready layout with visual hierarchy, imagery and typography.", priority: 1 },
      { phase: "validation", title: "Proof review and print check", description: "Verify copy accuracy, bleed, resolution and color mode.", priority: 1 },
    ],
    business_card: [
      { phase: "idea", title: `Card brief for ${project}`, description: "Define contact info, title, brand elements and card orientation.", priority: 1 },
      { phase: "planning", title: "Plan information hierarchy", description: "Prioritize name, title, phone, email, website and social handles.", priority: 1 },
      { phase: "frontend", title: "Design card layout", description: "Create front and back layout with brand-consistent styling.", priority: 1 },
      { phase: "validation", title: "Proof review", description: "Check spelling, alignment, print specs and brand compliance.", priority: 1 },
    ],
    ecommerce_store: [
      { phase: "idea", title: `Store concept for ${project}`, description: "Define product categories, target buyers, pricing strategy and brand positioning.", priority: 1 },
      { phase: "idea", title: "Research competitors and shipping logistics", description: "Analyze competing stores, shipping options and fulfillment strategy.", priority: 2 },
      { phase: "planning", title: "Plan product catalog and checkout flow", description: "Define product schema, cart UX and checkout steps.", priority: 1 },
      { phase: "planning", title: "Define payment and shipping integration", description: "Select payment provider, shipping API and tax handling approach.", priority: 2 },
      { phase: "architecture", title: "Design store data model and API", description: "Schema for products, orders, customers. REST API for cart and checkout.", priority: 1 },
      { phase: "frontend", title: "Build storefront and product pages", description: "Create product grid, detail page, cart drawer and checkout flow.", priority: 1 },
      { phase: "frontend", title: "Build account and order tracking pages", description: "Customer dashboard with order history, tracking and returns.", priority: 2 },
      { phase: "backend", title: "Implement cart, checkout and payment API", description: "Cart management, Stripe integration, order processing and webhook handling.", priority: 1 },
      { phase: "validation", title: "End-to-end checkout testing", description: "Test full purchase flow, payment processing and order confirmation.", priority: 1 },
      { phase: "build", title: "Deploy store and configure payment", description: "Production deployment, Stripe live mode and shipping integration.", priority: 1 },
    ],
    social_campaign: [
      { phase: "idea", title: `Campaign brief for ${project}`, description: "Define campaign goals, target audience, platforms and KPIs.", priority: 1 },
      { phase: "idea", title: "Research platform best practices", description: "Study format specs, posting times and engagement patterns per platform.", priority: 2 },
      { phase: "planning", title: "Create content calendar", description: "Plan post schedule, themes and content types across platforms.", priority: 1 },
      { phase: "planning", title: "Define creative formats and templates", description: "Specify post sizes, video lengths and caption styles per platform.", priority: 2 },
      { phase: "frontend", title: "Design post templates and creatives", description: "Create reusable templates for Instagram, LinkedIn, X and TikTok.", priority: 1 },
      { phase: "frontend", title: "Write captions and hashtag strategy", description: "Draft copy for each post, define hashtag sets and CTAs.", priority: 2 },
      { phase: "validation", title: "Brand and legal review", description: "Verify brand compliance, disclosures and legal requirements.", priority: 1 },
    ],
    automation_workflow: [
      { phase: "idea", title: `Workflow discovery for ${project}`, description: "Identify manual processes to automate, pain points and efficiency goals.", priority: 1 },
      { phase: "idea", title: "Map current process steps", description: "Document existing workflow, inputs, outputs and bottlenecks.", priority: 2 },
      { phase: "planning", title: "Define automation steps and triggers", description: "Specify trigger events, conditional logic and action sequence.", priority: 1 },
      { phase: "planning", title: "Select integration tools and APIs", description: "Choose webhooks, APIs and connectors for each step.", priority: 2 },
      { phase: "architecture", title: "Design integration architecture", description: "Map data flows, error handling, retry logic and monitoring.", priority: 1 },
      { phase: "backend", title: "Implement pipeline code", description: "Build automation steps, API connectors and data transformations.", priority: 1 },
      { phase: "backend", title: "Add error handling and logging", description: "Implement retry logic, dead letter queues and execution logs.", priority: 2 },
      { phase: "validation", title: "Test end-to-end flow", description: "Run test events through full pipeline, verify outputs and timing.", priority: 1 },
      { phase: "build", title: "Deploy and schedule automation", description: "Set up cron/trigger scheduling, monitoring and alerting.", priority: 1 },
    ],
  };

  // Filter tasks to only those whose phase exists in the mission's phases
  const taskDefs = MISSION_TASKS[missionTypeId] ?? MISSION_TASKS.saas_project;
  const missionPhaseIds = new Set(phases.map((p) => p.id));
  const filteredTasks = taskDefs.filter((t) => missionPhaseIds.has(t.phase));

  const rawTasks = filteredTasks.map((def, index) => {
    const phaseAgent = phases.find((p) => p.id === def.phase)?.agent ?? "product_agent";
    const agent = selectedAgents.includes(phaseAgent) ? phaseAgent : selectedAgents[index % selectedAgents.length] ?? "product_agent";
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

  return populateDependencies(rawTasks);
}

const PHASE_ORDER: AutopilotPhase[] = [
  "idea", "planning", "architecture", "frontend", "backend", "validation", "build", "runtime",
];

function populateDependencies(tasks: AutopilotTask[]): AutopilotTask[] {
  const byPhase = new Map<string, AutopilotTask[]>();
  for (const task of tasks) {
    if (!byPhase.has(task.phase)) byPhase.set(task.phase, []);
    byPhase.get(task.phase)!.push(task);
  }

  const lastIdOf = new Map<AutopilotPhase, string>();
  for (const phase of PHASE_ORDER) {
    const phaseTasks = byPhase.get(phase);
    if (phaseTasks && phaseTasks.length > 0) {
      lastIdOf.set(phase, phaseTasks[phaseTasks.length - 1].id);
    }
  }

  function getGateDeps(phase: AutopilotPhase): string[] {
    if (phase === "validation") {
      const deps: string[] = [];
      if (lastIdOf.has("frontend")) deps.push(lastIdOf.get("frontend")!);
      if (lastIdOf.has("backend")) deps.push(lastIdOf.get("backend")!);
      return deps;
    }
    const idx = PHASE_ORDER.indexOf(phase);
    for (let i = idx - 1; i >= 0; i--) {
      const prev = PHASE_ORDER[i];
      if (lastIdOf.has(prev as AutopilotPhase)) return [lastIdOf.get(prev as AutopilotPhase)!];
    }
    return [];
  }

  return tasks.map((task) => {
    const phaseGroup = byPhase.get(task.phase)!;
    const indexInPhase = phaseGroup.findIndex((t) => t.id === task.id);
    if (indexInPhase === 0) {
      return { ...task, dependencies: getGateDeps(task.phase as AutopilotPhase) };
    }
    return { ...task, dependencies: [phaseGroup[indexInPhase - 1].id] };
  });
}

function buildRoadmap(project: string, idea: string, missionTypeId: string): string[] {
  const ROADMAPS: Record<string, string[]> = {
    saas_project: [
      `${project}: validate target market and core value proposition`,
      "Design data model, API surface and integration architecture",
      "Build dashboard, onboarding and workspace UI",
      "Implement auth, core APIs and business logic services",
      "Run validation suite, prepare production build",
      `Autopilot brief: ${idea || "AI-generated SaaS product"}`,
    ],
    website: [
      `${project}: gather client brief and define site structure`,
      "Plan page content, SEO and responsive design",
      "Build landing page, about and contact pages",
      "Test cross-browser, deploy to hosting",
    ],
    branding_pack: [
      `${project}: brand discovery and personality definition`,
      "Plan brand identity: logo, colors, typography",
      "Design visual identity elements",
      "Review brand consistency",
    ],
    flyer: [
      `${project}: flyer brief and copy draft`,
      "Design print-ready flyer layout",
      "Proof review and print check",
    ],
    business_card: [
      `${project}: card brief and info hierarchy`,
      "Design front and back layout",
      "Proof review",
    ],
    ecommerce_store: [
      `${project}: store concept and catalog plan`,
      "Design store data model and checkout architecture",
      "Build storefront, cart and payment API",
      "End-to-end checkout testing and deployment",
    ],
    social_campaign: [
      `${project}: campaign brief and platform strategy`,
      "Create content calendar and creative templates",
      "Design post creatives and write captions",
      "Brand and legal review",
    ],
    automation_workflow: [
      `${project}: workflow discovery and process mapping`,
      "Define automation steps, triggers and integrations",
      "Implement pipeline and error handling",
      "Test end-to-end and deploy scheduling",
    ],
  };
  return ROADMAPS[missionTypeId] ?? ROADMAPS.saas_project;
}

function buildAgentAssignments(agents: string[], missionTypeId?: string): AutopilotAgentAssignment[] {
  const ROLES: Record<string, string> = {
    product_agent:   "Product analysis, roadmap and user stories",
    architect_agent: "System architecture, API design and data model",
    frontend_agent:  "UI pages, components and design system",
    backend_agent:   "API routes, database and business logic",
    qa_agent:        "Validation, testing and quality assurance",
    devops_agent:    "Build, deployment and runtime monitoring",
  };

  const missionAgents = missionTypeId ? (getMissionType(missionTypeId)?.recommendedAgents ?? Object.keys(ROLES)) : Object.keys(ROLES);
  const selected = agents.length > 0
    ? agents
    : missionAgents;

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
  const missionTypeId = input.missionType ?? "saas_project";
  const missionType = getMissionType(missionTypeId);
  const idea = input.idea?.trim() || `Create a ${missionType?.label ?? "SaaS project"} for ${project}`;
  const agents = input.agents ?? [];
  const now = new Date().toISOString();
  const phases = missionType?.defaultPhases ?? AUTOPILOT_PHASES.map((p) => ({ id: p.id, label: p.label, agent: p.agent }));
  const firstPhase = phases[0];

  const tasks = buildTasks(project, idea, agents, missionTypeId);
  tasks[0].status = "running";
  tasks[0].progress = 10;

  const session: AutopilotSession = {
    sessionId: `ap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    projectName: project,
    projectIdea: idea,
    productType: input.template ?? null,
    template: input.template ?? null,
    stack: input.stack ?? null,
    missionType: missionTypeId,
    status: "running",
    currentPhase: firstPhase.id,
    progress: 0,
    assignedAgents: buildAgentAssignments(agents, missionTypeId),
    roadmap: buildRoadmap(project, idea, missionTypeId),
    tasks,
    logs: [{
      id: logId(),
      timestamp: now,
      level: "info",
      agent: firstPhase.agent,
      message: `Autopilot started for ${project} [${missionType?.label ?? missionTypeId}]: ${idea}`,
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
  artifactPaths: string[];
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
export async function runStep(sessionId: string): Promise<RunStepResult> {
  const session = getSession(sessionId);
  if (!session) {
    return { ok: false, task: null, log: null, completed: false, artifactPaths: [], session: null };
  }

  if (session.status !== "running") {
    return { ok: false, task: null, log: null, completed: false, artifactPaths: [], session };
  }

  const now = new Date().toISOString();
  const tasks = session.tasks.map((t) => ({ ...t }));

  // Find the next task to execute
  let targetIndex = tasks.findIndex((t) => t.status === "running");
  if (targetIndex === -1) {
    // Apply dependency-aware scheduling: unblock satisfied tasks, block unsatisfied queued tasks
    const completedIds = new Set(tasks.filter((t) => t.status === "completed").map((t) => t.id));
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].status === "blocked" && tasks[i].dependencies.every((d) => completedIds.has(d))) {
        tasks[i] = { ...tasks[i], status: "queued", updatedAt: now };
      }
    }
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].status === "queued" && !tasks[i].dependencies.every((d) => completedIds.has(d))) {
        tasks[i] = { ...tasks[i], status: "blocked", updatedAt: now };
      }
    }
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
      return { ok: true, task: null, log: doneLog?.logs[0] ?? null, completed: true, artifactPaths: [], session: updated };
    }
    return { ok: false, task: null, log: null, completed: false, artifactPaths: [], session: getSession(sessionId) };
  }

  const task = tasks[targetIndex];
  const agent = task.agent;
  const phaseInfo = AUTOPILOT_PHASES.find((p) => p.id === task.phase);

  // Mark task as running (if it was queued)
  tasks[targetIndex] = { ...task, status: "running", progress: 15, updatedAt: now };

  // Update agent runtime state
  updateAgentState(agent, {
    status: "executing",
    currentTaskId: task.id,
    currentMissionId: sessionId,
    progress: 15,
    startedAt: now,
    retryCount: 0,
  });

  // Log: agent started
  appendLog(sessionId, {
    timestamp: now,
    level: "info",
    agent,
    message: `${agent} started task: ${task.title}`,
    source: "autopilot",
  });
  emitEvent("task.started", { taskTitle: task.title, phase: task.phase }, { agentId: agent, sessionId, taskId: task.id });

  // Run via NVIDIA adapter (falls back to simulation if key not configured)
  const adapterResult = await runNvidiaAdapter(session, task);
  const executionOk = adapterResult.mode === "nvidia"
    ? adapterResult.ok
    : simulateExecution(agent, task);
  const execNow = new Date().toISOString();

  // Write agent run output to workspace
  writeAgentRun(sessionId, task.id, adapterResult.output);

  // Log execution mode
  appendLog(sessionId, {
    timestamp: execNow,
    level: "info",
    agent,
    message: adapterResult.mode === "nvidia"
      ? `NVIDIA runtime — ${adapterResult.tokensUsed ?? "?"} tokens, ${adapterResult.durationMs}ms`
      : `Simulation fallback — NVIDIA_API_KEY not configured`,
    source: adapterResult.mode,
  });

  // Update the task based on result
  if (executionOk) {
    tasks[targetIndex] = { ...tasks[targetIndex], status: "completed", progress: 100, updatedAt: execNow };
    // Unblock dependent tasks
    const completedIds = new Set(tasks.filter((t) => t.status === "completed").map((t) => t.id));
    let unblocked = 0;
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].status === "blocked" && tasks[i].dependencies.every((d) => completedIds.has(d))) {
        tasks[i] = { ...tasks[i], status: "queued", updatedAt: execNow };
        unblocked++;
      }
    }
    updateAgentState(agent, { status: "completed", progress: 100, currentTaskId: null });
    emitEvent("task.completed", { taskTitle: task.title, phase: task.phase }, { agentId: agent, sessionId, taskId: task.id });
    if (unblocked > 0) {
      emitEvent("dependency.resolved", { unblocked, completedTaskId: task.id }, { agentId: agent, sessionId, taskId: task.id });
    }
  } else {
    tasks[targetIndex] = { ...tasks[targetIndex], status: "failed", progress: 0, updatedAt: execNow };
    // Cascade failure to dependent tasks
    const failedIds = new Set(tasks.filter((t) => t.status === "failed").map((t) => t.id));
    let cascadeChanged = true;
    let blockedCount = 0;
    while (cascadeChanged) {
      cascadeChanged = false;
      for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].status !== "blocked" && tasks[i].status !== "queued") continue;
        if (tasks[i].dependencies.some((d) => failedIds.has(d))) {
          tasks[i] = { ...tasks[i], status: "failed", updatedAt: execNow };
          failedIds.add(tasks[i].id);
          cascadeChanged = true;
          blockedCount++;
        }
      }
    }
    updateAgentState(agent, { status: "failed", progress: 0, currentTaskId: null });
    emitEvent("task.failed", { taskTitle: task.title, phase: task.phase, cascaded: blockedCount }, { agentId: agent, sessionId, taskId: task.id });
    if (blockedCount > 0) {
      emitEvent("task.blocked", { count: blockedCount, rootTaskId: task.id }, { agentId: agent, sessionId });
    }
    appendLog(sessionId, {
      timestamp: execNow,
      level: "warning",
      agent,
      message: `${agent} blocked: dependency chain failure from ${task.title}`,
      source: "runtime",
    });
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
    source: adapterResult.mode,
  });

  // Generate agent artifact on success
  let artifactPaths: string[] = [];
  if (executionOk) {
    const latestBeforeArtifact = getSession(sessionId);
    if (latestBeforeArtifact) {
      artifactPaths = generateAgentArtifact(latestBeforeArtifact, tasks[targetIndex]);
      if (artifactPaths.length > 0) {
        appendLog(sessionId, {
          timestamp: new Date().toISOString(),
          level: "info",
          agent,
          message: `Artifact generated: ${artifactPaths.join(", ")}`,
          source: "workspace",
        });
      }
    }
  }

  // Generate mission deliverables for non-SaaS missions on task completion
  if (executionOk && session.missionType !== "saas_project") {
    const delivSession = getSession(sessionId);
    if (delivSession) {
      const delivPaths = generateMissionDeliverables(delivSession);
      if (delivPaths.length > 0) {
        appendLog(sessionId, {
          timestamp: new Date().toISOString(),
          level: "info",
          agent,
          message: `Mission deliverables updated: ${delivPaths.length} files`,
          source: "deliverables",
        });
      }
    }
  }

  // Generate project scaffold on first frontend_agent completion
  let scaffoldGenerated = false;
  if (executionOk && agent === "frontend_agent" && !projectScaffoldExists(sessionId)) {
    const scaffoldSession = getSession(sessionId);
    if (scaffoldSession) {
      const scaffoldPaths = generateProjectScaffold(scaffoldSession);
      if (scaffoldPaths.length > 0) {
        scaffoldGenerated = true;
        appendLog(sessionId, {
          timestamp: new Date().toISOString(),
          level: "success",
          agent,
          message: `SaaS project scaffold generated: ${scaffoldPaths.length} files in project/`,
          source: "scaffold",
        });
      }
    }
  }

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
    artifactPaths,
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
 * Tracks agent runtime states and respects dependency ordering.
 * Stops when: session completes, a task fails, or limit reached.
 */
export async function runAll(sessionId: string, maxSteps = MAX_RUN_ALL_STEPS): Promise<RunAllResult> {
  const steps: RunStepResult[] = [];
  let stepsExecuted = 0;
  let session = getSession(sessionId);

  // Emit runtime health log at start
  if (session) {
    updateAgentState("autopilot", {
      status: "planning",
      currentMissionId: sessionId,
      currentTaskId: null,
      progress: session.progress,
    });
    appendLog(sessionId, {
      timestamp: new Date().toISOString(),
      level: "info",
      agent: "autopilot",
      message: `Runtime scheduler started — ${session.tasks.filter((t) => t.status === "queued" || t.status === "running").length} tasks queued`,
      source: "runtime",
    });
  }

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

    // Check for blocked tasks and emit a runtime health warning if all remaining are blocked
    const pending = session.tasks.filter((t) => t.status === "queued" || t.status === "running" || t.status === "blocked");
    const allBlocked = pending.length > 0 && pending.every((t) => t.status === "blocked");
    if (allBlocked) {
      appendLog(sessionId, {
        timestamp: new Date().toISOString(),
        level: "warning",
        agent: "autopilot",
        message: `Runtime health warning: ${pending.length} tasks blocked — dependency resolution stalled`,
        source: "runtime",
      });
      break;
    }

    const result = await runStep(sessionId);
    steps.push(result);
    stepsExecuted++;

    if (result.completed || !result.ok) break;
    if (result.task?.status === "failed") break;

    // Re-read after step
    session = getSession(sessionId);
    if (!session || session.status === "completed" || session.status === "failed") break;
  }

  session = getSession(sessionId);

  // Auto-generate project scaffold at 50% progress
  if (session && session.progress >= 50 && !projectScaffoldExists(sessionId)) {
    const scaffoldPaths = generateProjectScaffold(session);
    if (scaffoldPaths.length > 0) {
      appendLog(sessionId, {
        timestamp: new Date().toISOString(),
        level: "success",
        agent: "autopilot",
        message: `SaaS project scaffold generated at 50% progress: ${scaffoldPaths.length} files in project/`,
        source: "scaffold",
      });
    }
    session = getSession(sessionId);
  }

  return {
    ok: stepsExecuted > 0,
    stepsExecuted,
    steps,
    completed: session?.status === "completed",
    session,
  };
}
