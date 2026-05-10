import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/autopilotStore";
import { listMissionDeliverables, missionDeliverablesExist } from "@/lib/missionDeliverables";

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

  const files = listMissionDeliverables(sessionId);
  const exists = missionDeliverablesExist(sessionId);

  return NextResponse.json({
    ok: true,
    missionType: session.missionType,
    exists,
    files,
    fileCount: files.length,
  });
}
