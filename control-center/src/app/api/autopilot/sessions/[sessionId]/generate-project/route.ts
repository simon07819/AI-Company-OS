import { NextRequest, NextResponse } from "next/server";
import { getSession, appendLog } from "@/lib/autopilotStore";
import { generateProjectScaffold, projectScaffoldExists } from "@/lib/workspaceStore";

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

  if (projectScaffoldExists(sessionId)) {
    return NextResponse.json({
      ok: true,
      message: "Project scaffold already exists.",
      existing: true,
    });
  }

  const scaffoldPaths = generateProjectScaffold(session);

  if (scaffoldPaths.length === 0) {
    return NextResponse.json(
      { ok: false, message: "Failed to generate scaffold. Workspace may not exist." },
      { status: 500 }
    );
  }

  appendLog(sessionId, {
    timestamp: new Date().toISOString(),
    level: "success",
    agent: "autopilot",
    message: `SaaS project scaffold generated manually: ${scaffoldPaths.length} files in project/`,
    source: "scaffold",
  });

  const updatedSession = getSession(sessionId);
  return NextResponse.json({
    ok: true,
    message: `Generated ${scaffoldPaths.length} project files.`,
    files: scaffoldPaths,
    session: updatedSession,
  });
}
