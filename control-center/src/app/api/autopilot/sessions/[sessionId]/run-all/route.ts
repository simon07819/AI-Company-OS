import { NextRequest, NextResponse } from "next/server";
import { runAll } from "@/lib/autopilotStore";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const result = await runAll(sessionId);

  if (!result.session) {
    return NextResponse.json(
      { ok: false, message: "Session not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: result.ok,
    message: result.completed
      ? `Autopilot completed after ${result.stepsExecuted} step${result.stepsExecuted === 1 ? "" : "s"}.`
      : `Executed ${result.stepsExecuted} step${result.stepsExecuted === 1 ? "" : "s"}. Session ${result.session.status}.`,
    stepsExecuted: result.stepsExecuted,
    completed: result.completed,
    session: result.session,
  });
}
