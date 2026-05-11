import { NextRequest, NextResponse } from "next/server";
import { toggleFavorite } from "@/lib/conversationStore";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const thread = toggleFavorite(threadId);
  if (!thread) return NextResponse.json({ ok: false, message: "Thread not found" }, { status: 404 });
  return NextResponse.json({ ok: true, thread });
}
