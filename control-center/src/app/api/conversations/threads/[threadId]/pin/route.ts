import { NextRequest, NextResponse } from "next/server";
import { pinThread } from "@/lib/conversationStore";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const thread = pinThread(threadId, body?.pinned ?? true);
    if (!thread) return NextResponse.json({ ok: false, message: "Thread not found" }, { status: 404 });
    return NextResponse.json({ ok: true, thread });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
