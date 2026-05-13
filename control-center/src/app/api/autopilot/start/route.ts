import { NextRequest, NextResponse } from "next/server";
import { startAutopilot } from "@/lib/autopilot";
import { requireUser } from "@/lib/auth/serverAuth";
import { startLongMission } from "@/lib/autopilot/autopilotExecutor";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => ({}));
  const command = typeof body.command === "string" && body.command.trim()
    ? body.command.trim()
    : typeof body.prompt === "string" && body.prompt.trim()
      ? body.prompt.trim()
      : typeof body.idea === "string" && body.idea.trim()
        ? body.idea.trim()
        : "Mission longue CEO";

  const mission = startLongMission({
    command,
    parentMissionId: typeof body.parentMissionId === "string" ? body.parentMissionId : undefined,
    type: typeof body.type === "string" ? body.type : undefined,
  });

  if (body.legacySession === true) {
    const session = startAutopilot(body);
    return NextResponse.json({
      ok: true,
      message: "Autopilot legacy session started.",
      session,
      mission,
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Long mission started.",
    mission,
    session: mission,
  });
}
