import { NextRequest, NextResponse } from "next/server";
import { getOutputsForSession, getOutputsForProject } from "@/lib/visibleOutputs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId") ?? undefined;
  const projectId = url.searchParams.get("projectId") ?? undefined;

  if (sessionId) {
    const outputs = getOutputsForSession(sessionId);
    return NextResponse.json({ ok: true, outputs });
  }
  if (projectId) {
    const outputs = getOutputsForProject(projectId);
    return NextResponse.json({ ok: true, outputs });
  }

  return NextResponse.json({ ok: false, message: "Provide sessionId or projectId" }, { status: 400 });
}
