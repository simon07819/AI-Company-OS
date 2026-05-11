import fs from "fs";
import path from "path";
import { type AgentId } from "./agentProfiles";

// ─── Paths ────────────────────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const QUESTIONS_PATH = path.join(DATA_DIR, "agent-questions.json");

// ─── Types ────────────────────────────────────────────────────────────────

export interface AgentQuestionOption {
  id: string;
  label: string;
}

export interface AgentAnswer {
  optionId: string | null;   // null if "Autre..." with free text
  freeText: string | null;   // non-null when user picked "Autre..."
  answeredAt: string;
}

export type QuestionStatus = "pending" | "answered" | "closed";

export interface AgentQuestion {
  id: string;
  agentId: AgentId;
  agentName: string;
  agentAvatar: string;
  agentColor: string;
  question: string;
  options: AgentQuestionOption[];
  missionId: string | null;
  threadId: string | null;
  taskId: string | null;
  status: QuestionStatus;
  answer: AgentAnswer | null;
  context: string;           // brief context for why the question was asked
  createdAt: string;
  updatedAt: string;
}

interface QuestionsData {
  questions: AgentQuestion[];
}

// ─── Persistence ──────────────────────────────────────────────────────────

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData(): QuestionsData {
  ensureDataDir();
  if (!fs.existsSync(QUESTIONS_PATH)) return { questions: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(QUESTIONS_PATH, "utf-8")) as Partial<QuestionsData>;
    return { questions: Array.isArray(parsed.questions) ? parsed.questions : [] };
  } catch {
    return { questions: [] };
  }
}

function writeData(data: QuestionsData) {
  ensureDataDir();
  fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// ─── Helpers ──────────────────────────────────────────────────────────────

let idCounter = Date.now();
function nextId(prefix: string): string {
  return `${prefix}-${(idCounter++).toString(36)}`;
}

function ensureAutreOption(options: AgentQuestionOption[]): AgentQuestionOption[] {
  const hasAutre = options.some((o) => o.id === "autre" || o.label.toLowerCase() === "autre…" || o.label.toLowerCase() === "autre...");
  if (hasAutre) return options;
  return [...options, { id: "autre", label: "Autre…" }];
}

// ─── Public API ───────────────────────────────────────────────────────────

export interface CreateQuestionInput {
  agentId: AgentId;
  agentName: string;
  agentAvatar: string;
  agentColor: string;
  question: string;
  options: string[];         // plain labels; "Autre…" is auto-appended if missing
  missionId?: string | null;
  threadId?: string | null;
  taskId?: string | null;
  context?: string;
}

export function createAgentQuestion(input: CreateQuestionInput): AgentQuestion {
  const data = readData();

  // Build options with ids; enforce max 5 choices + always "Autre…"
  const labels = input.options.slice(0, 5);
  const options: AgentQuestionOption[] = labels.map((label, i) => ({
    id: `opt-${i}`,
    label,
  }));
  const finalOptions = ensureAutreOption(options);

  const now = new Date().toISOString();
  const q: AgentQuestion = {
    id: nextId("q"),
    agentId: input.agentId,
    agentName: input.agentName,
    agentAvatar: input.agentAvatar,
    agentColor: input.agentColor,
    question: input.question,
    options: finalOptions,
    missionId: input.missionId ?? null,
    threadId: input.threadId ?? null,
    taskId: input.taskId ?? null,
    status: "pending",
    answer: null,
    context: input.context ?? "",
    createdAt: now,
    updatedAt: now,
  };

  data.questions.push(q);
  writeData(data);
  return q;
}

export function listOpenQuestions(options?: { missionId?: string; threadId?: string; agentId?: AgentId }): AgentQuestion[] {
  const data = readData();
  let qs = data.questions.filter((q) => q.status === "pending");
  if (options?.missionId) qs = qs.filter((q) => q.missionId === options.missionId);
  if (options?.threadId) qs = qs.filter((q) => q.threadId === options.threadId);
  if (options?.agentId) qs = qs.filter((q) => q.agentId === options.agentId);
  return qs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function listAllQuestions(options?: { missionId?: string; status?: QuestionStatus }): AgentQuestion[] {
  const data = readData();
  let qs = data.questions;
  if (options?.missionId) qs = qs.filter((q) => q.missionId === options.missionId);
  if (options?.status) qs = qs.filter((q) => q.status === options.status);
  return qs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function answerQuestion(questionId: string, optionId: string, freeText?: string): AgentQuestion | null {
  const data = readData();
  const idx = data.questions.findIndex((q) => q.id === questionId);
  if (idx === -1) return null;

  const q = data.questions[idx];
  if (q.status !== "pending") return null;

  const isAutre = optionId === "autre";
  const answer: AgentAnswer = {
    optionId: isAutre ? null : optionId,
    freeText: isAutre ? (freeText ?? "") : null,
    answeredAt: new Date().toISOString(),
  };

  data.questions[idx] = {
    ...q,
    status: "answered",
    answer,
    updatedAt: new Date().toISOString(),
  };

  writeData(data);
  return data.questions[idx];
}

export function closeQuestion(questionId: string): AgentQuestion | null {
  const data = readData();
  const idx = data.questions.findIndex((q) => q.id === questionId);
  if (idx === -1) return null;
  data.questions[idx].status = "closed";
  data.questions[idx].updatedAt = new Date().toISOString();
  writeData(data);
  return data.questions[idx];
}

export function getQuestionsForMission(missionId: string): AgentQuestion[] {
  return readData().questions.filter((q) => q.missionId === missionId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getQuestionsForThread(threadId: string): AgentQuestion[] {
  return readData().questions.filter((q) => q.threadId === threadId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getQuestion(questionId: string): AgentQuestion | null {
  return readData().questions.find((q) => q.id === questionId) ?? null;
}
