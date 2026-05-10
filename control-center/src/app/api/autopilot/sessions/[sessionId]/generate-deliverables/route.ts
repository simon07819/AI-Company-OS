import { NextRequest, NextResponse } from "next/server";
import { getSession, appendLog } from "@/lib/autopilotStore";
import { generateMissionDeliverables, listMissionDeliverables } from "@/lib/missionDeliverables";

export const dynamic = "force-dynamic";

export async function POST(
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

  if (session.missionType === "saas_project") {
    return NextResponse.json(
      { ok: false, message: "SaaS projects use the generate-project endpoint instead." },
      { status: 400 }
    );
  }

  const paths = generateMissionDeliverables(session);

  if (paths.length === 0) {
    return NextResponse.json(
      { ok: false, message: "Failed to generate deliverables. Workspace may not exist." },
      { status: 500 }
    );
  }

  appendLog(sessionId, {
    timestamp: new Date().toISOString(),
    level: "success",
    agent: "autopilot",
    message: `Mission deliverables generated manually: ${paths.length} files`,
    source: "deliverables",
  });

  const files = listMissionDeliverables(sessionId);

  return NextResponse.json({
    ok: true,
    message: `Generated ${paths.length} deliverable files.`,
    files,
    paths,
  });
}
