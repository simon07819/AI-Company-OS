import { NextRequest, NextResponse } from "next/server";
import { markInvoicePaid } from "@/lib/revenueSystem";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params;
  const invoice = markInvoicePaid(invoiceId);
  if (!invoice) {
    return NextResponse.json({ ok: false, message: "Invoice not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, invoice });
}
