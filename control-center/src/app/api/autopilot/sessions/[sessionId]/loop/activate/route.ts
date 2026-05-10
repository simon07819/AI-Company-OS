import { NextRequest, NextResponse } from "next/server";
import { activateLoop } from "@/lib/loopScheduler";

export const dynamic = "force-dynamic";

/**
 * POST /api/autopilot/sessions/[sessionId]/loop/activate
 * Body: { mode: "recurring_daily" | "recurring_weekly" | "monitoring" | "optimization_loop" }
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  try {
    const body = await _req.json();
    const mode = body?.mode;
    if (!mode) {
      return NextResponse.json({ ok: false, message: "Missing 'mode' field" }, { status: 400 });
    }

    const state = activateLoop(sessionId, mode);
    if (!state) {
      return NextResponse.json({
        ok: false,
        message: "Cannot activate loop. Check session exists and mission type is applicable.",
      }, { status: 400 });
    }

    return NextResponse.json({ ok: true, loop: state });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
