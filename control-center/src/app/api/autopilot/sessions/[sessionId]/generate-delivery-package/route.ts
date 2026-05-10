import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/autopilotStore";
import { loadReviewReport } from "@/lib/deliverableReview";
import { generateDeliveryPackage } from "@/lib/deliveryPackage";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ ok: false, message: "Session not found." }, { status: 404 });
  }

  const review = loadReviewReport(sessionId);
  const pkg = generateDeliveryPackage(session, review);

  return NextResponse.json({ ok: true, package: pkg });
}
