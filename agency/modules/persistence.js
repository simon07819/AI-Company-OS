import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS_DIR = path.join(__dirname, "..", "projects");

export function projectDir(projectId) {
  return path.join(PROJECTS_DIR, projectId);
}

export async function initProject(projectId) {
  const dir = projectDir(projectId);
  await fs.mkdir(path.join(dir, "approved_prompts"), { recursive: true });
  await fs.mkdir(path.join(dir, "deliverables"), { recursive: true });
  return dir;
}

export async function saveJson(projectId, filename, data) {
  const dir = projectDir(projectId);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, filename);
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
  return file;
}

export async function loadJson(projectId, filename) {
  const file = path.join(projectDir(projectId), filename);
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveDeliverable(projectId, version, imageBuffer, ext = "png") {
  const dir = path.join(projectDir(projectId), "deliverables");
  await fs.mkdir(dir, { recursive: true });
  const filename = `v${version}.${ext}`;
  const file = path.join(dir, filename);
  await fs.writeFile(file, imageBuffer);
  return file;
}

export async function saveApprovedPrompt(projectId, version, promptData) {
  const dir = path.join(projectDir(projectId), "approved_prompts");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `v${version}.json`);
  await fs.writeFile(file, JSON.stringify(promptData, null, 2), "utf8");
  return file;
}

export async function loadLatestApprovedPrompt(projectId) {
  const dir = path.join(projectDir(projectId), "approved_prompts");
  try {
    const files = await fs.readdir(dir);
    const jsons = files.filter(f => f.endsWith(".json")).sort();
    if (!jsons.length) return null;
    const raw = await fs.readFile(path.join(dir, jsons.at(-1)), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function updateKpi(projectId, patch) {
  const existing = (await loadJson(projectId, "kpi.json")) ?? {
    projectId,
    createdAt: new Date().toISOString(),
    iterations: 0,
    approvalRate: 0,
    finalQaScores: null,
    timeToCompletionMs: 0,
    versionsGenerated: 0,
  };
  const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  await saveJson(projectId, "kpi.json", updated);
  return updated;
}

export async function listProjects() {
  try {
    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    return [];
  }
}
