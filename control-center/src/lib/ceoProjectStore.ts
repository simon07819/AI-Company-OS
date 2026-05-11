import fs from "fs";
import path from "path";
import { archiveEntity, restoreEntity, softDeleteEntity } from "./archiveSystem";

// ─── Paths ────────────────────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const PROJECTS_PATH = path.join(DATA_DIR, "ceo-projects.json");

// ─── Types ────────────────────────────────────────────────────────────────

export type ProjectStatus = "starting" | "in_progress" | "review" | "delivered";

export interface CeoProject {
  id: string;
  name: string;
  missionType: string;
  status: ProjectStatus;
  sessionId: string | null;
  workspaceId: string | null;
  conversationId: string | null;
  uploadedFileIds: string[];
  progress: number;
  outputsCount: number;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  deletedAt?: string | null;
}

interface ProjectsData {
  projects: CeoProject[];
}

// ─── Persistence ──────────────────────────────────────────────────────────

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readData(): ProjectsData {
  ensureDataDir();
  if (!fs.existsSync(PROJECTS_PATH)) return { projects: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(PROJECTS_PATH, "utf-8")) as Partial<ProjectsData>;
    return { projects: Array.isArray(parsed.projects) ? parsed.projects : [] };
  } catch {
    return { projects: [] };
  }
}

function writeData(data: ProjectsData) {
  ensureDataDir();
  fs.writeFileSync(PROJECTS_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// ─── Helpers ──────────────────────────────────────────────────────────────

let idCounter = Date.now();
function nextId(): string {
  return `proj-${(idCounter++).toString(36)}`;
}

// ─── Public API ───────────────────────────────────────────────────────────

export interface CreateProjectInput {
  name: string;
  missionType: string;
  sessionId?: string | null;
  workspaceId?: string | null;
  conversationId?: string | null;
  uploadedFileIds?: string[];
}

export function createCeoProject(input: CreateProjectInput): CeoProject {
  const now = new Date().toISOString();
  const project: CeoProject = {
    id: nextId(),
    name: input.name,
    missionType: input.missionType,
    status: "starting",
    sessionId: input.sessionId ?? null,
    workspaceId: input.workspaceId ?? null,
    conversationId: input.conversationId ?? null,
    uploadedFileIds: input.uploadedFileIds ?? [],
    progress: 0,
    outputsCount: 0,
    lastActivity: now,
    createdAt: now,
    updatedAt: now,
  };

  const data = readData();
  data.projects.unshift(project);
  writeData(data);
  return project;
}

export function listCeoProjects(options?: { includeArchived?: boolean; includeDeleted?: boolean }): CeoProject[] {
  return readData().projects
    .filter((p) => options?.includeDeleted || !p.deletedAt)
    .filter((p) => options?.includeArchived || !p.archivedAt)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getCeoProject(projectId: string): CeoProject | null {
  return readData().projects.find((p) => p.id === projectId) ?? null;
}

export function getCeoProjectBySession(sessionId: string): CeoProject | null {
  return readData().projects.find((p) => p.sessionId === sessionId) ?? null;
}

export function updateCeoProject(projectId: string, updates: Partial<CeoProject>): CeoProject | null {
  const data = readData();
  const idx = data.projects.findIndex((p) => p.id === projectId);
  if (idx === -1) return null;
  data.projects[idx] = { ...data.projects[idx], ...updates, id: data.projects[idx].id, updatedAt: new Date().toISOString() };
  writeData(data);
  return data.projects[idx];
}

export function linkSessionToProject(projectId: string, sessionId: string): CeoProject | null {
  return updateCeoProject(projectId, { sessionId, status: "in_progress", progress: 10, lastActivity: new Date().toISOString() });
}

export function updateProjectProgress(projectId: string, progress: number, outputsCount?: number): CeoProject | null {
  const updates: Partial<CeoProject> = { progress, lastActivity: new Date().toISOString() };
  if (outputsCount !== undefined) updates.outputsCount = outputsCount;
  if (progress >= 100) updates.status = "delivered";
  else if (progress >= 80) updates.status = "review";
  else if (progress > 0) updates.status = "in_progress";
  return updateCeoProject(projectId, updates);
}

export function archiveCeoProject(projectId: string): CeoProject | null {
  const project = updateCeoProject(projectId, { archivedAt: new Date().toISOString() });
  if (project) archiveEntity({ entityType: "projects", entityId: project.id, snapshot: project, label: project.name });
  return project;
}

export function restoreCeoProject(projectId: string): CeoProject | null {
  const project = updateCeoProject(projectId, { archivedAt: null, deletedAt: null });
  if (project) restoreEntity("projects", project.id);
  return project;
}

export function softDeleteCeoProject(projectId: string): CeoProject | null {
  const project = updateCeoProject(projectId, { deletedAt: new Date().toISOString(), archivedAt: new Date().toISOString() });
  if (project) softDeleteEntity({ entityType: "projects", entityId: project.id, snapshot: project, label: project.name });
  return project;
}

export function duplicateCeoProject(projectId: string): CeoProject | null {
  const source = getCeoProject(projectId);
  if (!source) return null;
  const duplicate = createCeoProject({
    name: `${source.name} Copy`,
    missionType: source.missionType,
    sessionId: source.sessionId,
    workspaceId: source.workspaceId,
    conversationId: source.conversationId,
    uploadedFileIds: source.uploadedFileIds,
  });
  return updateCeoProject(duplicate.id, {
    status: source.status,
    progress: source.progress,
    outputsCount: source.outputsCount,
  });
}
