import { NextRequest, NextResponse } from "next/server";
import { getThread, renameThread, softDeleteThread } from "@/lib/conversationStore";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const body = await req.json().catch(() => ({}));
  const thread = body.title ? renameThread(threadId, body.title) : getThread(threadId);
  if (!thread) return NextResponse.json({ ok: false, message: "Thread not found" }, { status: 404 });
  return NextResponse.json({ ok: true, thread });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const thread = softDeleteThread(threadId);
  if (!thread) return NextResponse.json({ ok: false, message: "Thread not found" }, { status: 404 });
  return NextResponse.json({ ok: true, thread });
}
