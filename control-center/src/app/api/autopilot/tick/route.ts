import { NextResponse } from "next/server";
import { tickAutopilotSession } from "@/lib/autopilot";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = tickAutopilotSession();
  return NextResponse.json({
    ok: Boolean(session),
    message: session ? "Autopilot advanced." : "No active Autopilot session.",
    session,
  }, { status: session ? 200 : 404 });
}
