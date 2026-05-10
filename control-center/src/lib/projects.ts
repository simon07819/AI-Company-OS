import fs from "fs";
import path from "path";

const PROJECTS_DIR = path.join(process.cwd(), "..", "projects");

export interface Task {
  id: number;
  title: string;
  status: string;
  priority?: string;
  created_at?: string;
  completed_at?: string;
  branch?: string;
  pr_url?: string;
}

export interface ProjectMeta {
  name: string;
  status?: string;
  project_priority?: string;
  mode?: string;
  created_at?: string;
  tasks_count?: number;
}

export interface Project {
  name: string;
  meta: ProjectMeta;
  tasks: Task[];
  roadmap: string | null;
  validationReport: string | null;
}

export interface GlobalStats {
  totalProjects: number;
  totalTasks: number;
  queued: number;
  completedReal: number;
  failed: number;
  archived: number;
  retrying: number;
  successRate: number;
}

function readProjectNames(): string[] {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  return fs.readdirSync(PROJECTS_DIR).filter((d) => {
    const stat = fs.statSync(path.join(PROJECTS_DIR, d));
    return stat.isDirectory();
  });
}

function readProjectMeta(projectName: string): ProjectMeta {
  const filePath = path.join(PROJECTS_DIR, projectName, "project.json");
  if (!fs.existsSync(filePath)) return { name: projectName };
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as ProjectMeta;
}

function readTasks(projectName: string): Task[] {
  const tasksDir = path.join(PROJECTS_DIR, projectName, "tasks");
  if (!fs.existsSync(tasksDir)) return [];
  const files = fs.readdirSync(tasksDir).filter((f) => f.endsWith(".json"));
  return files
    .map((f) => {
      try {
        const raw = fs.readFileSync(path.join(tasksDir, f), "utf-8");
        return JSON.parse(raw) as Task;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Task[];
}

function readTextFile(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

export function getAllProjects(): Project[] {
  const names = readProjectNames();
  return names.map((name) => ({
    name,
    meta: readProjectMeta(name),
    tasks: readTasks(name),
    roadmap: readTextFile(path.join(PROJECTS_DIR, name, "docs", "roadmap.md")),
    validationReport: readTextFile(
      path.join(PROJECTS_DIR, name, "validation_report.md")
    ),
  }));
}

export function getProject(projectName: string): Project | null {
  const names = readProjectNames();
  if (!names.includes(projectName)) return null;
  return {
    name: projectName,
    meta: readProjectMeta(projectName),
    tasks: readTasks(projectName),
    roadmap: readTextFile(
      path.join(PROJECTS_DIR, projectName, "docs", "roadmap.md")
    ),
    validationReport: readTextFile(
      path.join(PROJECTS_DIR, projectName, "validation_report.md")
    ),
  };
}

export function computeStats(projects: Project[]): GlobalStats {
  let totalTasks = 0;
  let queued = 0;
  let completedReal = 0;
  let failed = 0;
  let archived = 0;
  let retrying = 0;

  for (const p of projects) {
    for (const t of p.tasks) {
      totalTasks++;
      const s = t.status;
      if (s === "queued" || s === "pending") queued++;
      else if (s === "completed_real" || s === "completed") completedReal++;
      else if (s === "failed") failed++;
      else if (s === "archived") archived++;
      else if (s === "retrying") retrying++;
    }
  }

  const successRate =
    totalTasks > 0 ? Math.round((completedReal / totalTasks) * 100) : 0;

  return {
    totalProjects: projects.length,
    totalTasks,
    queued,
    completedReal,
    failed,
    archived,
    retrying,
    successRate,
  };
}
