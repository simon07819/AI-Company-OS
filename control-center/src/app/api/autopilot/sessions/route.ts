import { NextRequest, NextResponse } from "next/server";
import { listSessions, createSession } from "@/lib/autopilotStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessions = listSessions();
  return NextResponse.json({
    ok: true,
    message: `Loaded ${sessions.length} autopilot session${sessions.length === 1 ? "" : "s"}.`,
    sessions,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const session = createSession(body);
  return NextResponse.json({
    ok: true,
    message: "Autopilot session created.",
    session,
  });
}
