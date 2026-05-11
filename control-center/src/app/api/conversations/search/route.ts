import { NextRequest, NextResponse } from "next/server";
import { searchThreads } from "@/lib/conversationStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const results = searchThreads(q);
  return NextResponse.json({ ok: true, threads: results });
}
