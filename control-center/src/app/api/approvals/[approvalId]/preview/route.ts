import { NextRequest, NextResponse } from "next/server";
import { getApprovalPreview } from "@/lib/approvalPreview";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  const { approvalId } = await params;
  const preview = getApprovalPreview(approvalId);
  if (!preview) return NextResponse.json({ ok: false, message: "Approval not found" }, { status: 404 });
  return NextResponse.json({ ok: true, preview });
}
