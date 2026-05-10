import { NextResponse } from "next/server";
import { getAutopilotStatus } from "@/lib/autopilot";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getAutopilotStatus();
  return NextResponse.json({
    ok: true,
    message: session ? "Autopilot session loaded." : "No active Autopilot session.",
    session,
  });
}
