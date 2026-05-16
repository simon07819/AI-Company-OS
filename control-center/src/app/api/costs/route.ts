import { NextResponse } from "next/server";
import { getCostSummary } from "@/lib/costTracker";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const summary = getCostSummary();
  return NextResponse.json({ ok: true, ...summary });
}
