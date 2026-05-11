import { NextRequest, NextResponse } from "next/server";
import { runStep, getSession, updateSession, moveSessionToApproval } from "@/lib/autopilotStore";
import { generateVisibleOutputs, getOutputsForSession } from "@/lib/visibleOutputs";
import { getCeoProjectBySession, updateProjectProgress } from "@/lib/ceoProjectStore";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Session not found" }, { status: 404 });
  }

  // Ensure session is running
  if (session.status !== "running") {
    updateSession(sessionId, { status: "running" });
  }

  // Generate visible outputs if none exist yet
  const existingOutputs = getOutputsForSession(sessionId);
  if (existingOutputs.length === 0) {
    generateVisibleOutputs(sessionId, session.missionType || "saas_project");
  }

  // Execute first 3 steps automatically
  const stepResults = [];
  const maxSteps = 3;
  for (let i = 0; i < maxSteps; i++) {
    const result = await runStep(sessionId);
    stepResults.push({
      ok: result.ok,
      completed: result.completed,
      taskTitle: result.task?.title ?? null,
      agent: result.task?.agent ?? null,
    });
    if (result.completed || !result.ok) break;

    // Small delay between steps to allow persistence
    await new Promise((r) => setTimeout(r, 200));
  }

  // Update project progress
  const project = getCeoProjectBySession(sessionId);
  if (project) {
    const updatedSession = getSession(sessionId);
    const progress = updatedSession?.progress ?? 0;
    const outputs = getOutputsForSession(sessionId);
    updateProjectProgress(project.id, progress, outputs.length);
  }

  // Mark first outputs as in_progress → review based on steps completed
  const { updateOutputStatus } = await import("@/lib/visibleOutputs");
  const outputs = getOutputsForSession(sessionId);
  if (outputs.length > 0 && stepResults.filter((s) => s.ok).length >= 1) {
    updateOutputStatus(outputs[0].id, "review");
  }
  if (outputs.length > 1 && stepResults.filter((s) => s.ok).length >= 2) {
    updateOutputStatus(outputs[1].id, "in_progress");
  }

  const updatedSession = getSession(sessionId);
  if ((updatedSession?.progress ?? 0) >= 70 && updatedSession?.status === "running" && getOutputsForSession(sessionId).length > 0) {
    moveSessionToApproval(sessionId);
  }

  return NextResponse.json({
    ok: true,
    stepsExecuted: stepResults.filter((s) => s.ok).length,
    steps: stepResults,
    session: getSession(sessionId),
    outputsCount: getOutputsForSession(sessionId).length,
  });
}
