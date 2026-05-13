import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/serverAuth";
import { getLongMission } from "@/lib/autopilot/autopilotExecutor";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { missionId: string } }) {
  const auth = requireUser(req);
  if (auth.response) return auth.response;

  const mission = getLongMission(params.missionId);
  if (!mission) return NextResponse.json({ ok: false, error: "mission not found" }, { status: 404 });

  return NextResponse.json({ ok: true, mission });
}
