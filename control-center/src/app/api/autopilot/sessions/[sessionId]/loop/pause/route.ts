import { NextRequest, NextResponse } from "next/server";
import { pauseLoop } from "@/lib/loopScheduler";

export const dynamic = "force-dynamic";

/**
 * POST /api/autopilot/sessions/[sessionId]/loop/pause
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const state = pauseLoop(sessionId);
  if (!state) {
    return NextResponse.json({ ok: false, message: "No active loop found for session" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, loop: state });
}
