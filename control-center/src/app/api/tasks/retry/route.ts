import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const REPO_ROOT = path.resolve(process.cwd(), "..");
const PROJECT_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const TASK_ID_RE = /^[a-zA-Z0-9_-]{1,32}$/;

export async function POST(req: NextRequest) {
  let body: { project?: string; taskId?: string } = {};
  try {
    body = (await req.json()) as { project?: string; taskId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { project, taskId } = body;

  if (!project || !PROJECT_RE.test(project)) {
    return NextResponse.json({ ok: false, error: "Invalid project name" }, { status: 400 });
  }
  if (!taskId || !TASK_ID_RE.test(String(taskId))) {
    return NextResponse.json({ ok: false, error: "Invalid task ID" }, { status: 400 });
  }

  const taskPath = path.join(REPO_ROOT, "projects", project, "tasks", `${taskId}.json`);
  if (!fs.existsSync(taskPath)) {
    return NextResponse.json({ ok: false, error: "Task file not found" }, { status: 404 });
  }

  let task: Record<string, unknown>;
  try {
    task = JSON.parse(fs.readFileSync(taskPath, "utf-8")) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to read task file" }, { status: 500 });
  }

  if (task.status !== "failed" && task.status !== "archived") {
    return NextResponse.json(
      { ok: false, error: `Task status is '${String(task.status)}' — only failed or archived tasks can be retried` },
      { status: 409 }
    );
  }

  // Strip failure-specific fields before spreading
  const clean = { ...task };
  for (const key of ["error", "failed_at", "locked_by", "locked_at", "started_at"] as const) {
    delete (clean as Record<string, unknown>)[key];
  }

  const retried = {
    ...clean,
    status: "queued",
    retried_at: new Date().toISOString(),
    retry_count: ((task.retry_count as number) ?? 0) + 1,
  };

  try {
    fs.writeFileSync(taskPath, JSON.stringify(retried, null, 2) + "\n", "utf-8");
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to write task file" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, task: retried });
}
