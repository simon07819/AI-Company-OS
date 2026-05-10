import { NextRequest, NextResponse } from "next/server";
import { loadReviewReport } from "@/lib/deliverableReview";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const report = loadReviewReport(sessionId);
  return NextResponse.json({ ok: true, report: report ?? null });
}
