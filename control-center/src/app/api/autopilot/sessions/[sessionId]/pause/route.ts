import { NextRequest, NextResponse } from "next/server";
import { pauseSession } from "@/lib/autopilotStore";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = pauseSession(sessionId);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Session not found." },
      { status: 404 }
    );
  }
  return NextResponse.json({
    ok: true,
    message: "Autopilot paused.",
    session,
  });
}
