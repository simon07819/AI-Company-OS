import { NextRequest, NextResponse } from "next/server";
import { getOutputsForSession, getOutputsForProject, getAllOutputs, getOutputById, updateOutputStatus } from "@/lib/visibleOutputs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const outputId = url.searchParams.get("outputId") ?? undefined;
  const sessionId = url.searchParams.get("sessionId") ?? undefined;
  const projectId = url.searchParams.get("projectId") ?? undefined;

  if (outputId) {
    const output = getOutputById(outputId);
    if (!output) return NextResponse.json({ ok: false, message: "Output not found" }, { status: 404 });
    return NextResponse.json({ ok: true, output });
  }
  if (sessionId) {
    const outputs = getOutputsForSession(sessionId);
    return NextResponse.json({ ok: true, outputs });
  }
  if (projectId) {
    const outputs = getOutputsForProject(projectId);
    return NextResponse.json({ ok: true, outputs });
  }

  // No filter — return all
  const outputs = getAllOutputs();
  return NextResponse.json({ ok: true, outputs, total: outputs.length });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { outputId, status } = body;
    if (!outputId || !status) return NextResponse.json({ ok: false, message: "Missing outputId or status" }, { status: 400 });
    const updated = updateOutputStatus(outputId, status);
    if (!updated) return NextResponse.json({ ok: false, message: "Output not found" }, { status: 404 });
    return NextResponse.json({ ok: true, output: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
