import { NextRequest, NextResponse } from "next/server";
import { markThreadRead } from "@/lib/conversationStore";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  markThreadRead(threadId);
  return NextResponse.json({ ok: true });
}
