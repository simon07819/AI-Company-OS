import { NextResponse } from "next/server";
import { getThread } from "@/lib/conversationStore";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const thread = getThread(threadId);
  if (!thread) return NextResponse.json({ ok: false, message: "Thread not found" }, { status: 404 });
  return NextResponse.json({ ok: true, thread });
}
