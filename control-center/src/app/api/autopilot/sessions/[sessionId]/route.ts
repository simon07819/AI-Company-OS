import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/autopilotStore";

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
    message: "Session loaded.",
    session,
  });
}
