import { NextRequest, NextResponse } from "next/server";
import { resumeLoop } from "@/lib/loopScheduler";

export const dynamic = "force-dynamic";

/**
 * POST /api/autopilot/sessions/[sessionId]/loop/resume
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const state = resumeLoop(sessionId);
  if (!state) {
    return NextResponse.json({ ok: false, message: "No paused loop found for session" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, loop: state });
}
