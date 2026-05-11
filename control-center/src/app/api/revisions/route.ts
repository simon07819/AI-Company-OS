import { NextRequest, NextResponse } from "next/server";
import { createRevision, getRevisionsForOutput, getRevisionsForSession, getAllRevisions, getPendingRevisions, updateRevisionStatus } from "@/lib/revisionSystem";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const outputId = url.searchParams.get("outputId") ?? undefined;
  const sessionId = url.searchParams.get("sessionId") ?? undefined;
  const pending = url.searchParams.get("pending") === "true";

  if (pending) {
    const revisions = getPendingRevisions();
    return NextResponse.json({ ok: true, revisions, count: revisions.length });
  }
  if (outputId) {
    const revisions = getRevisionsForOutput(outputId);
    return NextResponse.json({ ok: true, revisions });
  }
  if (sessionId) {
    const revisions = getRevisionsForSession(sessionId);
    return NextResponse.json({ ok: true, revisions });
  }

  const revisions = getAllRevisions();
  return NextResponse.json({ ok: true, revisions, total: revisions.length });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { outputId, comment, direction, agentId, sessionId, previousPreview } = body;
    if (!outputId || !comment) {
      return NextResponse.json({ ok: false, message: "Missing outputId or comment" }, { status: 400 });
    }
    const revision = createRevision(outputId, comment, direction ?? "", agentId ?? "unknown", sessionId, previousPreview);
    return NextResponse.json({ ok: true, revision });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { revisionId, status, newPreview } = body;
    if (!revisionId || !status) {
      return NextResponse.json({ ok: false, message: "Missing revisionId or status" }, { status: 400 });
    }
    const revision = updateRevisionStatus(revisionId, status, newPreview);
    if (!revision) return NextResponse.json({ ok: false, message: "Revision not found" }, { status: 404 });
    return NextResponse.json({ ok: true, revision });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
