import fs from "fs";
import path from "path";

// ─── Paths ────────────────────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const REVISIONS_PATH = path.join(DATA_DIR, "revisions.json");

// ─── Types ────────────────────────────────────────────────────────────────

export type RevisionStatus = "pending" | "in_progress" | "completed";

export interface Revision {
  id: string;
  outputId: string;
  sessionId: string | null;
  comment: string;
  direction: string;
  agentId: string;
  status: RevisionStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  previousPreview?: string;
  newPreview?: string;
}

interface RevisionsData {
  revisions: Revision[];
}

// ─── Persistence ──────────────────────────────────────────────────────────

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData(): RevisionsData {
  ensureDataDir();
  if (!fs.existsSync(REVISIONS_PATH)) return { revisions: [] };
  try {
    return JSON.parse(fs.readFileSync(REVISIONS_PATH, "utf-8")) as RevisionsData;
  } catch {
    return { revisions: [] };
  }
}

function writeData(data: RevisionsData) {
  ensureDataDir();
  fs.writeFileSync(REVISIONS_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

let idCounter = Date.now();
function nextId(): string {
  return `rev-${(idCounter++).toString(36)}`;
}

// ─── Public API ───────────────────────────────────────────────────────────

export function createRevision(outputId: string, comment: string, direction: string, agentId: string, sessionId?: string, previousPreview?: string): Revision {
  const now = new Date().toISOString();
  const revision: Revision = {
    id: nextId(),
    outputId,
    sessionId: sessionId ?? null,
    comment,
    direction,
    agentId,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    previousPreview,
  };

  const data = readData();
  data.revisions.unshift(revision);
  writeData(data);
  return revision;
}

export function getRevisionsForOutput(outputId: string): Revision[] {
  return readData().revisions.filter((r) => r.outputId === outputId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getRevisionsForSession(sessionId: string): Revision[] {
  return readData().revisions.filter((r) => r.sessionId === sessionId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAllRevisions(): Revision[] {
  return readData().revisions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getPendingRevisions(): Revision[] {
  return readData().revisions.filter((r) => r.status === "pending")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function updateRevisionStatus(revisionId: string, status: RevisionStatus, newPreview?: string): Revision | null {
  const data = readData();
  const idx = data.revisions.findIndex((r) => r.id === revisionId);
  if (idx === -1) return null;

  data.revisions[idx].status = status;
  data.revisions[idx].updatedAt = new Date().toISOString();
  if (status === "completed") {
    data.revisions[idx].completedAt = new Date().toISOString();
  }
  if (newPreview) {
    data.revisions[idx].newPreview = newPreview;
  }

  writeData(data);
  return data.revisions[idx];
}

export function getRevisionById(revisionId: string): Revision | null {
  return readData().revisions.find((r) => r.id === revisionId) ?? null;
}
