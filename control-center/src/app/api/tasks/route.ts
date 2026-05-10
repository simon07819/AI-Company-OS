import { NextRequest, NextResponse } from "next/server";
import { getAllProjects } from "@/lib/projects";
import type { Task } from "@/lib/projects";

export const dynamic = "force-dynamic";

export interface TaskWithProject extends Task {
  project: string;
  department?: string;
  description?: string;
  branch_name?: string;
  pr_url?: string;
  started_at?: string;
  failed_at?: string;
  completed_at?: string;
  error?: string;
  estimated_cost_usd?: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectFilter = searchParams.get("project") ?? null;
  const statusFilter = searchParams.get("status") ?? null;

  const projects = getAllProjects();

  const tasks: TaskWithProject[] = [];
  for (const proj of projects) {
    if (projectFilter && proj.name !== projectFilter) continue;
    for (const task of proj.tasks) {
      const t = task as TaskWithProject & Record<string, unknown>;
      tasks.push({
        ...t,
        project: proj.name,
      });
    }
  }

  const filtered = statusFilter
    ? tasks.filter((t) => t.status === statusFilter)
    : tasks;

  // Sort by id numerically when possible
  filtered.sort((a, b) => {
    const ai = Number(a.id) || 0;
    const bi = Number(b.id) || 0;
    return ai - bi;
  });

  const summary = {
    total: filtered.length,
    queued:        filtered.filter((t) => t.status === "queued").length,
    running:       filtered.filter((t) => t.status === "running").length,
    failed:        filtered.filter((t) => t.status === "failed").length,
    completed:     filtered.filter((t) => t.status === "completed_real" || t.status === "completed").length,
    archived:      filtered.filter((t) => t.status === "archived").length,
  };

  return NextResponse.json({ tasks: filtered, summary });
}
