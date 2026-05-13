import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/serverAuth";
import { resumeLongMission } from "@/lib/autopilot/autopilotExecutor";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => ({}));
  const missionId = typeof body.missionId === "string" ? body.missionId : "";
  if (!missionId) return NextResponse.json({ ok: false, error: "missionId required" }, { status: 400 });

  const mission = resumeLongMission(missionId);
  if (!mission) return NextResponse.json({ ok: false, error: "mission not found" }, { status: 404 });

  return NextResponse.json({ ok: true, mission });
}
