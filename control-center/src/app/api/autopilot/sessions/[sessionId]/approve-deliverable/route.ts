import { NextRequest, NextResponse } from "next/server";
import { approveDeliverable } from "@/lib/deliverableReview";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const body = (await req.json()) as { path?: string };

  if (!body.path) {
    return NextResponse.json({ ok: false, message: "path is required." }, { status: 400 });
  }

  const report = approveDeliverable(sessionId, body.path);
  if (!report) {
    return NextResponse.json(
      { ok: false, message: "No review report found. Run review-deliverables first." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, report });
}
