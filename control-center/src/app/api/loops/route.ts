import { NextRequest, NextResponse } from "next/server";
import { listLoopStates, runScheduler } from "@/lib/loopScheduler";

export const dynamic = "force-dynamic";

/**
 * GET /api/loops — List all loop states.
 */
export async function GET() {
  const states = listLoopStates();
  return NextResponse.json({
    ok: true,
    loops: states,
    count: states.length,
  });
}

/**
 * POST /api/loops — Run the scheduler (find and execute due loops).
 * Body: { action: "run" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action;

    if (action === "run") {
      const result = runScheduler();
      return NextResponse.json({
        ok: true,
        message: `Scheduler ran: ${result.executed} loop(s) executed`,
        ...result,
      });
    }

    return NextResponse.json(
      { ok: false, message: "Unknown action. Use { action: 'run' }" },
      { status: 400 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
