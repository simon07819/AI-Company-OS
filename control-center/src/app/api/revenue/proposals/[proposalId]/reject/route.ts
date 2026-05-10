import { NextRequest, NextResponse } from "next/server";
import { rejectProposal } from "@/lib/revenueSystem";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  const { proposalId } = await params;
  const proposal = rejectProposal(proposalId);
  if (!proposal) {
    return NextResponse.json({ ok: false, message: "Proposal not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, proposal });
}
