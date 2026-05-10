import { NextRequest, NextResponse } from "next/server";
import { getSession, updateTask } from "@/lib/autopilotStore";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Session not found." },
      { status: 404 }
    );
  }
  return NextResponse.json({
    ok: true,
    message: `Loaded ${session.tasks.length} tasks.`,
    tasks: session.tasks,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const body = await req.json().catch(() => ({}));
  const { taskId, ...patch } = body;
  if (!taskId) {
    return NextResponse.json(
      { ok: false, message: "taskId is required." },
      { status: 400 }
    );
  }
  const session = updateTask(sessionId, taskId, patch);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Session or task not found." },
      { status: 404 }
    );
  }
  return NextResponse.json({
    ok: true,
    message: "Task updated.",
    session,
  });
}
