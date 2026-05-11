import { NextRequest, NextResponse } from "next/server";
import { addMessage } from "@/lib/conversationStore";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  try {
    const body = await req.json();
    const text = body?.text;
    if (!text) return NextResponse.json({ ok: false, message: "Missing text" }, { status: 400 });
    const msg = await addMessage(threadId, "user", text, body?.metadata);
    if (!msg) return NextResponse.json({ ok: false, message: "Thread not found" }, { status: 404 });
    // Reload thread to include the auto-response
    const { getThread } = await import("@/lib/conversationStore");
    const thread = getThread(threadId);
    return NextResponse.json({ ok: true, thread });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
