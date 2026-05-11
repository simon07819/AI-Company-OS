import { NextRequest, NextResponse } from "next/server";
import { archiveRevenue, duplicateInvoice, markInvoicePaid, markInvoiceUnpaid, restoreRevenue, softDeleteRevenue, updateInvoice } from "@/lib/revenueSystem";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;
  const invoice = action === "archive" ? archiveRevenue("invoice", invoiceId)
    : action === "restore" ? restoreRevenue("invoice", invoiceId)
      : action === "duplicate" ? duplicateInvoice(invoiceId)
        : action === "mark_paid" ? markInvoicePaid(invoiceId)
          : action === "mark_unpaid" ? markInvoiceUnpaid(invoiceId)
            : updateInvoice(invoiceId, body);
  if (!invoice) return NextResponse.json({ ok: false, message: "Invoice not found" }, { status: 404 });
  return NextResponse.json({ ok: true, invoice });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const invoice = softDeleteRevenue("invoice", invoiceId);
  if (!invoice) return NextResponse.json({ ok: false, message: "Invoice not found" }, { status: 404 });
  return NextResponse.json({ ok: true, invoice });
}
