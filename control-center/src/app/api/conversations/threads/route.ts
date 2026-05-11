import { NextRequest, NextResponse } from "next/server";
import { listThreads, createThread, findOrCreateDirectThread } from "@/lib/conversationStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const folderId = url.searchParams.get("folderId");
  const includeArchived = url.searchParams.get("includeArchived") === "true";
  const includeDeleted = url.searchParams.get("includeDeleted") === "true";
  const threads = listThreads({
    folderId: folderId === "null" ? null : folderId ?? undefined,
    includeArchived,
    includeDeleted,
  });
  return NextResponse.json({ ok: true, threads });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body?.directParticipant) {
      const thread = findOrCreateDirectThread(body.directParticipant);
      return NextResponse.json({ ok: true, thread });
    }
    const title = body?.title;
    if (!title) return NextResponse.json({ ok: false, message: "Missing title" }, { status: 400 });
    const thread = createThread({
      title,
      folderId: body?.folderId ?? null,
      participants: body?.participants ?? ["ceo"],
      linkedMissionId: body?.linkedMissionId ?? null,
      linkedWorkspaceId: body?.linkedWorkspaceId ?? null,
    });
    return NextResponse.json({ ok: true, thread });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
