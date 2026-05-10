import { NextRequest, NextResponse } from "next/server";
import { createLead, listLeads } from "@/lib/clientCrm";

export const dynamic = "force-dynamic";

export async function GET() {
  const leads = listLeads();
  return NextResponse.json({ ok: true, leads });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const lead = createLead({
      name: body.name ?? "Unnamed Lead",
      email: body.email ?? "",
      company: body.company,
      source: body.source,
      estimatedValue: body.estimatedValue,
      notes: body.notes,
    });
    return NextResponse.json({ ok: true, lead });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
