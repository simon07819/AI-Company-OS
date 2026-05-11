import { NextRequest, NextResponse } from "next/server";
import { rejectApproval } from "@/lib/approvalPreview";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  const { approvalId } = await params;
  try {
    const body = await req.json();
    const reason = body.reason ?? "No reason provided";
    const result = rejectApproval(approvalId, reason);
    if (!result) return NextResponse.json({ ok: false, message: "Approval not found" }, { status: 404 });
    return NextResponse.json({ ok: true, approval: result });
  } catch {
    const result = rejectApproval(approvalId, "No reason provided");
    if (!result) return NextResponse.json({ ok: false, message: "Approval not found" }, { status: 404 });
    return NextResponse.json({ ok: true, approval: result });
  }
}
