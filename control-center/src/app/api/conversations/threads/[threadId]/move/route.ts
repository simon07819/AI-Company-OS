import { NextRequest, NextResponse } from "next/server";
import { moveThreadToFolder } from "@/lib/conversationStore";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  try {
    const body = await req.json();
    const folderId = body?.folderId ?? null;
    const thread = moveThreadToFolder(threadId, folderId);
    if (!thread) return NextResponse.json({ ok: false, message: "Thread not found" }, { status: 404 });
    return NextResponse.json({ ok: true, thread });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
