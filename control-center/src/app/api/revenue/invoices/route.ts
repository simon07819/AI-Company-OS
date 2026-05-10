import { NextRequest, NextResponse } from "next/server";
import { createInvoice, listInvoices } from "@/lib/revenueSystem";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, invoices: listInvoices() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const invoice = createInvoice({
      proposalId: body.proposalId,
      clientId: body.clientId,
      missionId: body.missionId,
      amount: body.amount,
      dueDate: body.dueDate,
    });
    if (!invoice) {
      return NextResponse.json({ ok: false, message: "Invalid invoice input" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, invoice });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
