import { NextRequest, NextResponse } from "next/server";
import { approveApproval } from "@/lib/approvalPreview";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  const { approvalId } = await params;
  const result = approveApproval(approvalId);
  if (!result) return NextResponse.json({ ok: false, message: "Approval not found" }, { status: 404 });
  return NextResponse.json({ ok: true, approval: result });
}
