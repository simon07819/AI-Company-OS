import { NextRequest, NextResponse } from "next/server";
import { createProposal, listProposals } from "@/lib/revenueSystem";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, proposals: listProposals() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const proposal = createProposal({
      title: body.title,
      leadId: body.leadId,
      clientId: body.clientId,
      missionId: body.missionId,
      missionType: body.missionType,
      complexity: body.complexity,
      progress: body.progress,
      amount: body.amount,
      status: body.status,
    });
    return NextResponse.json({ ok: true, proposal });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
