import { NextRequest, NextResponse } from "next/server";
import { continueSession } from "@/lib/autopilotStore";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = continueSession(sessionId);
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Session not found." },
      { status: 404 }
    );
  }
  return NextResponse.json({
    ok: true,
    message: session.status === "completed"
      ? "Autopilot completed all tasks."
      : "Autopilot advanced.",
    session,
  });
}
