import { NextResponse } from "next/server";
import { getTotalUnread } from "@/lib/conversationStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const count = getTotalUnread();
  return NextResponse.json({ ok: true, count });
}
