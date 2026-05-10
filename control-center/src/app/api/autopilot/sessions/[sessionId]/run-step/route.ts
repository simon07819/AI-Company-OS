import { NextRequest, NextResponse } from "next/server";
import { runStep } from "@/lib/autopilotStore";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const result = runStep(sessionId);

  if (!result.session) {
    return NextResponse.json(
      { ok: false, message: "Session not found." },
      { status: 404 }
    );
  }

  if (!result.ok && !result.task) {
    return NextResponse.json({
      ok: false,
      message: result.session.status !== "running"
        ? "Session is not in running state."
        : "No tasks remaining to execute.",
      session: result.session,
    });
  }

  return NextResponse.json({
    ok: result.ok,
    message: result.completed
      ? "Autopilot completed — all tasks finished."
      : result.task?.status === "failed"
        ? `Task ${result.task.id} failed.`
        : `Task ${result.task?.id} completed.`,
    task: result.task,
    log: result.log,
    completed: result.completed,
    session: result.session,
  });
}
