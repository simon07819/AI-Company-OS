import { NextRequest, NextResponse } from "next/server";
import { tickAutopilotSession } from "@/lib/autopilot";
import { requireUser } from "@/lib/auth/serverAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  const session = tickAutopilotSession();
  return NextResponse.json({
    ok: Boolean(session),
    message: session ? "Autopilot advanced." : "No active Autopilot session.",
    session,
  }, { status: session ? 200 : 404 });
}
