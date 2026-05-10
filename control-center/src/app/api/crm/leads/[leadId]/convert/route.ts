import { NextRequest, NextResponse } from "next/server";
import { convertLeadToClient } from "@/lib/clientCrm";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const { leadId } = await params;
  const result = convertLeadToClient(leadId);
  if (!result) {
    return NextResponse.json({ ok: false, message: "Lead not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, client: result.client, lead: result.lead });
}
