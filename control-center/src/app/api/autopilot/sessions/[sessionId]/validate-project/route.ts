import { NextRequest, NextResponse } from "next/server";
import { getSession, appendLog } from "@/lib/autopilotStore";
import { validateGeneratedProject, getValidationResult } from "@/lib/projectValidator";
import { projectScaffoldExists } from "@/lib/workspaceStore";

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

  if (!projectScaffoldExists(sessionId)) {
    return NextResponse.json(
      { ok: false, message: "No project scaffold found. Generate one first." },
      { status: 400 }
    );
  }

  const result = validateGeneratedProject(sessionId);

  appendLog(sessionId, {
    timestamp: new Date().toISOString(),
    level: result.ok ? "success" : "warning",
    agent: "autopilot",
    message: `Project validation completed: score ${result.score}% — ${result.ok ? "Build-ready" : "Needs attention"}`,
    source: "validation",
  });

  return NextResponse.json({
    ok: true,
    message: result.ok
      ? `Project validated: ${result.score}% — Build-ready`
      : `Project validated: ${result.score}% — Needs attention`,
    validation: result,
    session: getSession(sessionId),
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const result = getValidationResult(sessionId);

  if (!result) {
    return NextResponse.json({
      ok: true,
      message: "No validation report found yet.",
      validation: null,
    });
  }

  return NextResponse.json({
    ok: true,
    message: `Last validation: ${result.score}%`,
    validation: result,
  });
}
