import { NextResponse } from "next/server";
import { getPendingApprovals, getAllApprovals } from "@/lib/approvalPreview";

export const dynamic = "force-dynamic";

export async function GET() {
  const pending = getPendingApprovals();
  const all = getAllApprovals();
  return NextResponse.json({
    ok: true,
    pending,
    total: all.length,
    pendingCount: pending.length,
    approvedCount: all.filter((a) => a.status === "approved").length,
    rejectedCount: all.filter((a) => a.status === "rejected").length,
  });
}
