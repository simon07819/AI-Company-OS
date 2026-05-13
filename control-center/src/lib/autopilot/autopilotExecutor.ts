import type { AgentId, AgentRun } from "@/lib/agents/agentRegistry";
import { runAgent } from "@/lib/agents/agentRegistry";
import { detectPlaybookType, selectTeamPlaybook, type MissionPlaybookType } from "@/lib/mission-runtime/teamPlaybooks";
import { hasImageProvider } from "@/lib/providers/providerRegistry";
import { readRuntimeJson, writeRuntimeJson } from "@/lib/runtime/runtimeFileStore";

const STORE_FILE = "ceo-long-missions.json";
const MAX_STEPS_PER_RUN = 10;

export type LongMissionStatus =
  | "queued"
  | "planning"
  | "running"
  | "waiting_for_user"
  | "blocked"
  | "paused"
  | "reviewing"
  | "completed"
  | "failed"
  | "canceled";

export type LongSubtaskStatus = "queued" | "running" | "completed" | "blocked" | "failed" | "skipped";

export interface LongMissionEvent {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  taskId?: string;
}

export interface LongMissionCheckpoint {
  id: string;
  taskId?: string;
  phase: string;
  status: LongMissionStatus;
  progressPercent: number;
  summary: string;
  createdAt: string;
}

export interface LongMissionArtifactRef {
  artifactId: string;
  type: string;
  title: string;
  sourceType: string;
  providerUsed: string;
  createdAt: string;
}

export interface LongMissionSubtask {
  taskId: string;
  title: string;
  ownerAgent: AgentId;
  status: LongSubtaskStatus;
  input: string;
  output?: {
    summary: string;
    decisions: string[];
    issues: string[];
    providerUsed: string;
    durationMs: number;
  };
  dependencies: string[];
  retryCount: number;
  artifacts: LongMissionArtifactRef[];
  events: LongMissionEvent[];
}

export interface LongMission {
  missionId: string;
  parentMissionId?: string;
  command: string;
  type: MissionPlaybookType;
  playbookId: string;
  playbookName: string;
  status: LongMissionStatus;
  progressPercent: number;
  currentPhase: string;
  subtasks: LongMissionSubtask[];
  checkpoints: LongMissionCheckpoint[];
  nextActions: string[];
  blockers: string[];
  resumedFromCheckpoint?: string;
  providerUsed: string;
  sourceType: string;
  artifacts: LongMissionArtifactRef[];
  agents: AgentRun[];
  events: LongMissionEvent[];
  retryCount: number;
  maxStepsPerRun: number;
  startedAt?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface LongMissionStore {
  missions: LongMission[];
}

export interface StartLongMissionInput {
  command: string;
  parentMissionId?: string;
  type?: MissionPlaybookType;
}

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeText(value: string) {
  return value
    .replace(/(NVIDIA_API_KEY|SUPABASE_SERVICE|SERVICE_ROLE|SECRET|PRIVATE_KEY|API_KEY|TOKEN|PASSWORD)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .slice(0, 1200);
}

function readStore(): LongMissionStore {
  return readRuntimeJson<LongMissionStore>(STORE_FILE, { missions: [] });
}

function writeStore(store: LongMissionStore) {
  writeRuntimeJson(STORE_FILE, { missions: store.missions.slice(-100) });
}

function saveMission(mission: LongMission) {
  const store = readStore();
  const missions = store.missions.filter((item) => item.missionId !== mission.missionId);
  missions.push({ ...mission, updatedAt: now() });
  writeStore({ missions });
  return getLongMission(mission.missionId) ?? mission;
}

function event(type: string, message: string, taskId?: string): LongMissionEvent {
  return { id: id("event"), type, message: sanitizeText(message), taskId, createdAt: now() };
}

function checkpoint(mission: LongMission, summary: string, taskId?: string): LongMissionCheckpoint {
  return {
    id: id("checkpoint"),
    taskId,
    phase: mission.currentPhase,
    status: mission.status,
    progressPercent: mission.progressPercent,
    summary: sanitizeText(summary),
    createdAt: now(),
  };
}

function buildSubtasks(command: string, type: MissionPlaybookType): LongMissionSubtask[] {
  const playbook = selectTeamPlaybook(command, type);
  return playbook.agents.map((agentId, index) => {
    const step = playbook.steps[index] ?? playbook.steps.at(-1) ?? "execution";
    const taskId = `task-${String(index + 1).padStart(2, "0")}-${agentId}`;
    return {
      taskId,
      title: step,
      ownerAgent: agentId,
      status: "queued",
      input: sanitizeText(`${step}: ${command}`),
      dependencies: index === 0 ? [] : [`task-${String(index).padStart(2, "0")}-${playbook.agents[index - 1]}`],
      retryCount: 0,
      artifacts: [],
      events: [event("task_queued", `${agentId} queued for ${step}`, taskId)],
    };
  });
}

function missionProgress(subtasks: LongMissionSubtask[]) {
  if (subtasks.length === 0) return 0;
  const completed = subtasks.filter((task) => task.status === "completed" || task.status === "skipped").length;
  return Math.round((completed / subtasks.length) * 100);
}

function nextRunnableTask(mission: LongMission) {
  const completed = new Set(mission.subtasks.filter((task) => task.status === "completed" || task.status === "skipped").map((task) => task.taskId));
  return mission.subtasks.find((task) => task.status === "queued" && task.dependencies.every((dependency) => completed.has(dependency)));
}

function currentDeliverables(mission: LongMission) {
  return mission.subtasks
    .filter((task) => task.output)
    .map((task) => ({
      type: task.ownerAgent,
      title: task.title,
      content: task.output?.summary,
      sourceType: mission.sourceType,
      providerUsed: mission.providerUsed,
    }));
}

function buildAgentInput(mission: LongMission, task: LongMissionSubtask) {
  const imageProviderAvailable = hasImageProvider();
  const providerRequired = selectTeamPlaybook(mission.command, mission.type).providerRequirement;
  return {
    missionId: mission.missionId,
    missionType: mission.type,
    command: mission.command,
    sourceType: mission.sourceType,
    providerUsed: mission.providerUsed,
    imageProviderAvailable,
    localPrototypeRequested: mission.sourceType === "local_svg",
    deliverables: currentDeliverables(mission),
    attempt: task.retryCount,
    playbookId: mission.playbookId,
    playbookStepId: task.taskId,
    priorIssues: mission.blockers,
    memoryContext: `Autopilot long mission. Provider required: ${providerRequired.capability}/${providerRequired.required ? "required" : "optional"}.`,
  };
}

function updateMissionStatusAfterTask(mission: LongMission) {
  mission.progressPercent = missionProgress(mission.subtasks);
  const nextTask = nextRunnableTask(mission);
  if (nextTask) {
    mission.currentPhase = nextTask.title;
    mission.status = mission.status === "planning" ? "planning" : "running";
    mission.nextActions = [`Continuer: ${nextTask.title}`];
    return;
  }

  const failed = mission.subtasks.some((task) => task.status === "failed");
  const blocked = mission.subtasks.some((task) => task.status === "blocked");
  if (failed) {
    mission.status = "failed";
    mission.currentPhase = "failed";
    mission.nextActions = ["Voir les erreurs en mode expert"];
  } else if (blocked || mission.blockers.length > 0) {
    mission.status = "blocked";
    mission.currentPhase = "blocked";
    mission.nextActions = ["Résoudre le blocage puis reprendre"];
  } else {
    mission.status = "completed";
    mission.currentPhase = "completed";
    mission.progressPercent = 100;
    mission.completedAt = now();
    mission.nextActions = ["Mission terminée"];
  }
}

export function listLongMissions() {
  return readStore().missions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getLongMission(missionId: string) {
  return readStore().missions.find((mission) => mission.missionId === missionId) ?? null;
}

export function startLongMission(input: StartLongMissionInput): LongMission {
  const command = sanitizeText(input.command?.trim() || "Mission longue CEO");
  const type = input.type ?? detectPlaybookType(command);
  const playbook = selectTeamPlaybook(command, type);
  const createdAt = now();
  const sourceType = type === "logo" && !hasImageProvider() ? "none" : "local_storage";
  const providerUsed = type === "logo" && !hasImageProvider() ? "unavailable" : playbook.providerRequirement.providerUsed ?? "local_rules";
  const subtasks = buildSubtasks(command, type);
  const mission: LongMission = {
    missionId: id("long-mission"),
    parentMissionId: input.parentMissionId,
    command,
    type,
    playbookId: playbook.id,
    playbookName: playbook.name,
    status: "queued",
    progressPercent: 0,
    currentPhase: "queued",
    subtasks,
    checkpoints: [],
    nextActions: ["Démarrer la première sous-tâche"],
    blockers: [],
    providerUsed,
    sourceType,
    artifacts: [],
    agents: [],
    events: [event("mission_queued", `Long mission queued with ${playbook.name}`)],
    retryCount: 0,
    maxStepsPerRun: MAX_STEPS_PER_RUN,
    createdAt,
    updatedAt: createdAt,
  };
  mission.checkpoints.push(checkpoint(mission, "Mission longue créée."));
  return saveMission(mission);
}

export function stepLongMission(missionId: string, options: { maxSteps?: number } = {}) {
  const mission = getLongMission(missionId);
  if (!mission) return null;
  if (mission.status === "paused" || mission.status === "canceled" || mission.status === "completed" || mission.status === "failed") {
    mission.events.unshift(event("step_skipped", `Step skipped because mission is ${mission.status}.`));
    return saveMission(mission);
  }

  const maxSteps = Math.max(1, Math.min(options.maxSteps ?? 1, MAX_STEPS_PER_RUN));
  mission.startedAt = mission.startedAt ?? now();
  mission.status = mission.status === "queued" ? "planning" : "running";
  mission.events.unshift(event("autopilot_step", `Running up to ${maxSteps} step(s).`));

  let executed = 0;
  while (executed < maxSteps) {
    const task = nextRunnableTask(mission);
    if (!task) break;

    task.status = "running";
    task.events.unshift(event("task_started", `${task.ownerAgent} started ${task.title}.`, task.taskId));
    mission.currentPhase = task.title;

    const run = runAgent(task.ownerAgent, buildAgentInput(mission, task));
    mission.agents.push(run);
    task.output = {
      summary: sanitizeText(run.output.summary),
      decisions: run.output.decisions.map(sanitizeText),
      issues: run.output.issues.map(sanitizeText),
      providerUsed: run.providerUsed,
      durationMs: run.durationMs,
    };

    if (run.output.issues.length > 0 && task.retryCount < 2) {
      task.retryCount += 1;
      mission.retryCount += 1;
      task.status = "queued";
      task.events.unshift(event("task_retry", `Retry ${task.retryCount} requested for ${task.ownerAgent}.`, task.taskId));
      mission.events.unshift(event("retry", `${task.ownerAgent} requested retry: ${run.output.issues.join(", ")}`, task.taskId));
      break;
    }

    if (run.output.issues.length > 0) {
      task.status = "blocked";
      mission.blockers = Array.from(new Set([...mission.blockers, ...run.output.issues.map(sanitizeText)]));
      task.events.unshift(event("task_blocked", `${task.ownerAgent} blocked the mission.`, task.taskId));
    } else {
      task.status = "completed";
      task.events.unshift(event("task_completed", `${task.ownerAgent} completed ${task.title}.`, task.taskId));
    }

    mission.progressPercent = missionProgress(mission.subtasks);
    mission.checkpoints.unshift(checkpoint(mission, `${task.ownerAgent} completed ${task.title}.`, task.taskId));
    executed += 1;
    if (task.status === "blocked") break;
  }

  updateMissionStatusAfterTask(mission);
  mission.checkpoints.unshift(checkpoint(mission, `Autopilot step finished after ${executed} task(s).`));
  return saveMission(mission);
}

export function pauseLongMission(missionId: string) {
  const mission = getLongMission(missionId);
  if (!mission) return null;
  if (mission.status !== "completed" && mission.status !== "failed" && mission.status !== "canceled") {
    mission.status = "paused";
    mission.currentPhase = "paused";
    mission.nextActions = ["Reprendre la mission"];
    mission.events.unshift(event("mission_paused", "Mission paused by CEO."));
    mission.checkpoints.unshift(checkpoint(mission, "Mission paused."));
  }
  return saveMission(mission);
}

export function resumeLongMission(missionId: string) {
  const mission = getLongMission(missionId);
  if (!mission) return null;
  if (mission.status === "paused" || mission.status === "blocked" || mission.status === "waiting_for_user") {
    const latestCheckpoint = mission.checkpoints[0];
    mission.resumedFromCheckpoint = latestCheckpoint?.id;
    mission.status = "running";
    const nextTask = nextRunnableTask(mission);
    mission.currentPhase = nextTask?.title ?? "reviewing";
    mission.nextActions = [nextTask ? `Continuer: ${nextTask.title}` : "Finaliser la review"];
    mission.events.unshift(event("mission_resumed", latestCheckpoint ? `Resumed from ${latestCheckpoint.id}.` : "Mission resumed."));
    mission.checkpoints.unshift(checkpoint(mission, "Mission resumed."));
  }
  return saveMission(mission);
}

export function cancelLongMission(missionId: string) {
  const mission = getLongMission(missionId);
  if (!mission) return null;
  if (mission.status !== "completed" && mission.status !== "failed") {
    mission.status = "canceled";
    mission.currentPhase = "canceled";
    mission.nextActions = ["Mission annulée"];
    mission.events.unshift(event("mission_canceled", "Mission canceled by CEO."));
    mission.checkpoints.unshift(checkpoint(mission, "Mission canceled."));
    mission.completedAt = now();
  }
  return saveMission(mission);
}

