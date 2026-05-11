import { NextRequest, NextResponse } from "next/server";
import { archiveRevenue, duplicateProposal, restoreRevenue, softDeleteRevenue, updateProposal } from "@/lib/revenueSystem";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;
  const proposal = action === "archive" ? archiveRevenue("proposal", proposalId)
    : action === "restore" ? restoreRevenue("proposal", proposalId)
      : action === "duplicate" ? duplicateProposal(proposalId)
        : updateProposal(proposalId, body);
  if (!proposal) return NextResponse.json({ ok: false, message: "Proposal not found" }, { status: 404 });
  return NextResponse.json({ ok: true, proposal });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  const proposal = softDeleteRevenue("proposal", proposalId);
  if (!proposal) return NextResponse.json({ ok: false, message: "Proposal not found" }, { status: 404 });
  return NextResponse.json({ ok: true, proposal });
}
