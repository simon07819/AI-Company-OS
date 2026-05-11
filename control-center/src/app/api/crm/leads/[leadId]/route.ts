import { NextRequest, NextResponse } from "next/server";
import { archiveLead, restoreLead, softDeleteLead, updateLead } from "@/lib/clientCrm";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;
  const lead = action === "archive" ? archiveLead(leadId)
    : action === "restore" ? restoreLead(leadId)
      : updateLead(leadId, body);
  if (!lead) return NextResponse.json({ ok: false, message: "Lead not found" }, { status: 404 });
  return NextResponse.json({ ok: true, lead });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const lead = softDeleteLead(leadId);
  if (!lead) return NextResponse.json({ ok: false, message: "Lead not found" }, { status: 404 });
  return NextResponse.json({ ok: true, lead });
}
