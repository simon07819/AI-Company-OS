import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/autopilotStore";
import { reviewDeliverables } from "@/lib/deliverableReview";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Session not found." }, { status: 404 });
  }

  const report = reviewDeliverables(sessionId, session.projectName, session.missionType);
  if (!report) {
    return NextResponse.json(
      { ok: false, message: "Workspace not found. Run a step first." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, report });
}
