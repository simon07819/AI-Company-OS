import { NextRequest, NextResponse } from "next/server";
import { getAutopilotStatus } from "@/lib/autopilot";
import { requireUser } from "@/lib/auth/serverAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  const session = getAutopilotStatus();
  return NextResponse.json({
    ok: true,
    message: session ? "Autopilot session loaded." : "No active Autopilot session.",
    session,
  });
}
